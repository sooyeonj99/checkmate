import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.core.config import settings

router = APIRouter(prefix="/business", tags=["사업자"])

WEIGHTS = [1, 3, 7, 1, 3, 7, 1, 3, 5]


def validate_checksum(digits: str) -> bool:
    nums = [int(d) for d in digits]
    total = sum(nums[i] * WEIGHTS[i] for i in range(9))
    total += (nums[8] * 5) // 10
    return (10 - (total % 10)) % 10 == nums[9]


class BusinessCheckRequest(BaseModel):
    business_number: str


class BusinessCheckResponse(BaseModel):
    valid_checksum: bool
    status: str
    status_text: str
    b_no: str


@router.post("/check", response_model=BusinessCheckResponse)
async def check_business_number(req: BusinessCheckRequest):
    digits = req.business_number.replace("-", "").replace(" ", "")
    if len(digits) != 10 or not digits.isdigit():
        raise HTTPException(status_code=400, detail="사업자등록번호는 10자리 숫자여야 합니다.")

    if not validate_checksum(digits):
        return BusinessCheckResponse(
            valid_checksum=False,
            status="invalid_checksum",
            status_text="유효하지 않은 사업자등록번호입니다. 번호를 다시 확인해 주세요.",
            b_no=digits,
        )

    if not settings.NTS_API_KEY:
        return BusinessCheckResponse(
            valid_checksum=True,
            status="checksum_only",
            status_text="형식 유효 (국세청 실시간 조회 미설정)",
            b_no=digits,
        )

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(
                "https://api.odcloud.kr/api/nts-businessman/v1/status",
                params={"serviceKey": settings.NTS_API_KEY, "returnType": "JSON"},
                json={"b_no": [digits]},
            )
            data = resp.json()

        if data.get("status_code") == "OK" and data.get("data"):
            item = data["data"][0]
            stt_cd = item.get("b_stt_cd", "")

            if stt_cd == "01":
                status = "active"
                tax = item.get("tax_type", "")
                status_text = f"정상 영업 중{(' · ' + tax) if tax else ''}"
            elif stt_cd == "02":
                status = "suspended"
                status_text = "휴업 사업자"
            elif stt_cd == "03":
                end = item.get("end_dt", "")
                status = "closed"
                status_text = f"폐업 사업자{(' (폐업일: ' + end + ')') if end else ''}"
            else:
                status = "unknown"
                status_text = item.get("b_stt", "") or "조회 결과 없음"

            return BusinessCheckResponse(
                valid_checksum=True,
                status=status,
                status_text=status_text,
                b_no=digits,
            )

        return BusinessCheckResponse(
            valid_checksum=True,
            status="not_found",
            status_text="국세청에 등록되지 않은 번호입니다.",
            b_no=digits,
        )

    except Exception:
        return BusinessCheckResponse(
            valid_checksum=True,
            status="api_error",
            status_text="국세청 API 조회 실패 (잠시 후 재시도)",
            b_no=digits,
        )
