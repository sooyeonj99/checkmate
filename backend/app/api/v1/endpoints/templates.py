import secrets
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, BackgroundTasks
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.api.v1.endpoints.users import get_current_user
from app.db.session import get_db
from app.models.signing import SigningRecord
from app.models.user import User
from app.services.email_service import send_signing_request_email
from app.services.push_service import send_push_signing_request

router = APIRouter(prefix="/templates", tags=["계약서 템플릿"])

# ── 기본 제공 템플릿 ────────────────────────────────────────────────────

DEFAULT_TEMPLATES = [
    {
        "id": "tpl-labor",
        "name": "표준 근로계약서",
        "type": "근로계약서",
        "description": "고용노동부 표준 근로계약서 양식",
        "icon": "👷",
        "variables": [
            {"key": "company",      "label": "사업장명",       "placeholder": "예) (주)체크메이트"},
            {"key": "employer",     "label": "대표자(사용자)", "placeholder": "예) 홍길동"},
            {"key": "worker",       "label": "근로자 성명",    "placeholder": "예) 김철수"},
            {"key": "work_place",   "label": "근무장소",       "placeholder": "예) 서울시 강남구 테헤란로"},
            {"key": "work_content", "label": "업무내용",       "placeholder": "예) 사무직 / 영업직"},
            {"key": "start_date",   "label": "근로 시작일",    "placeholder": "예) 2026년 7월 1일"},
            {"key": "end_date",     "label": "근로 종료일",    "placeholder": "예) 2027년 6월 30일 (무기계약 시: 기간의 정함이 없음)"},
            {"key": "work_hours",   "label": "근무시간",       "placeholder": "예) 09:00 ~ 18:00 (휴게 1시간)"},
            {"key": "work_days",    "label": "근무요일",       "placeholder": "예) 월 ~ 금"},
            {"key": "wage_type",    "label": "급여 형태",      "placeholder": "예) 월급 / 시급"},
            {"key": "wage_amount",  "label": "급여액",         "placeholder": "예) 3,000,000"},
            {"key": "wage_day",     "label": "급여 지급일",    "placeholder": "예) 25"},
            {"key": "signing_date", "label": "계약일",         "placeholder": "예) 2026년 7월 4일"},
        ],
        "content": """<!DOCTYPE html>
<html lang="ko"><head><meta charset="utf-8"/>
<style>
  body{font-family:'Malgun Gothic','Apple SD Gothic Neo',sans-serif;font-size:14px;color:#1e293b;line-height:1.8;padding:40px;max-width:800px;margin:0 auto}
  h1{text-align:center;font-size:20px;font-weight:900;margin-bottom:8px;letter-spacing:2px}
  .subtitle{text-align:center;font-size:12px;color:#64748b;margin-bottom:32px}
  h3{font-size:14px;font-weight:700;border-bottom:1px solid #e2e8f0;padding-bottom:6px;margin-top:24px;color:#1e3a8a}
  p{margin:6px 0}
  .sig-area{margin-top:48px;display:grid;grid-template-columns:1fr 1fr;gap:40px}
  .sig-box{border-top:2px solid #1e293b;padding-top:16px}
  .sig-label{font-weight:700;font-size:13px;color:#64748b;margin-bottom:8px}
  .sig-line{border-bottom:1px solid #cbd5e1;height:60px;margin-bottom:8px}
  .watermark{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-30deg);font-size:80px;color:rgba(30,58,138,0.05);pointer-events:none;white-space:nowrap}
</style></head>
<body>
<div class="watermark">CHECKMATE</div>
<h1>표 준 근 로 계 약 서</h1>
<div class="subtitle">고용노동부 고시 표준 양식</div>

<p><strong>{{company}}</strong>(이하 "사용자"라 함)와 <strong>{{worker}}</strong>(이하 "근로자"라 함)은 다음과 같이 근로계약을 체결한다.</p>

<h3>제1조 (근로계약기간)</h3>
<p>근로계약기간은 <strong>{{start_date}}</strong>부터 <strong>{{end_date}}</strong>까지로 한다.</p>

<h3>제2조 (근무장소)</h3>
<p>{{work_place}}</p>

<h3>제3조 (업무내용)</h3>
<p>{{work_content}}</p>

<h3>제4조 (소정근로시간)</h3>
<p>소정근로시간은 <strong>{{work_hours}}</strong>으로 한다. (휴게시간 1시간 포함)</p>
<p>근무일 : <strong>{{work_days}}</strong></p>

<h3>제5조 (임금)</h3>
<p>{{wage_type}} : <strong>{{wage_amount}}원</strong></p>
<p>임금지급일 : 매월 <strong>{{wage_day}}일</strong> (휴일인 경우 전일 지급)</p>
<p>지급방법 : 근로자 본인 명의 통장에 입금</p>

<h3>제6조 (연차유급휴가)</h3>
<p>연차유급휴가는 근로기준법에서 정하는 바에 따라 부여한다.</p>

<h3>제7조 (사회보험 적용여부)</h3>
<p>☑ 고용보험&nbsp;&nbsp;&nbsp;☑ 산재보험&nbsp;&nbsp;&nbsp;☑ 국민연금&nbsp;&nbsp;&nbsp;☑ 건강보험</p>

<h3>제8조 (근로계약서 교부)</h3>
<p>사용자는 근로계약을 체결함과 동시에 본 계약서를 사본하여 근로자에게 교부한다.</p>

<h3>제9조 (기 타)</h3>
<p>이 계약에서 정하지 아니한 사항은 근로기준법령에 의한다.</p>

<p style="margin-top:40px;text-align:center"><strong>{{signing_date}}</strong></p>

<div class="sig-area">
  <div class="sig-box">
    <div class="sig-label">사용자 (갑)</div>
    <p>사업장명 : {{company}}</p>
    <p>대표자 : {{employer}}</p>
    <div class="sig-line"></div>
    <p style="font-size:12px;color:#94a3b8;text-align:center">전자서명</p>
  </div>
  <div class="sig-box">
    <div class="sig-label">근로자 (을)</div>
    <p>성명 : {{worker}}</p>
    <br/>
    <div class="sig-line"></div>
    <p style="font-size:12px;color:#94a3b8;text-align:center">전자서명</p>
  </div>
</div>
</body></html>"""
    },
    {
        "id": "tpl-lease",
        "name": "부동산 임대차계약서",
        "type": "임대차계약서",
        "description": "사무실·창고·매장 임대 표준 계약서",
        "icon": "🏢",
        "variables": [
            {"key": "property_address", "label": "부동산 소재지",  "placeholder": "예) 서울시 강남구 테헤란로 123, 5층"},
            {"key": "property_type",    "label": "부동산 종류",    "placeholder": "예) 사무실 / 창고 / 상가"},
            {"key": "area",             "label": "면적",           "placeholder": "예) 전용 50㎡"},
            {"key": "landlord",         "label": "임대인 성명",    "placeholder": "예) 이영희"},
            {"key": "tenant",           "label": "임차인 성명",    "placeholder": "예) (주)체크메이트 대표 홍길동"},
            {"key": "deposit",          "label": "보증금",         "placeholder": "예) 50,000,000"},
            {"key": "monthly_rent",     "label": "월 임대료",      "placeholder": "예) 1,500,000 (없으면 0)"},
            {"key": "rent_day",         "label": "임대료 납부일",  "placeholder": "예) 매월 25일"},
            {"key": "lease_start",      "label": "임대 시작일",    "placeholder": "예) 2026년 8월 1일"},
            {"key": "lease_end",        "label": "임대 종료일",    "placeholder": "예) 2028년 7월 31일"},
            {"key": "signing_date",     "label": "계약일",         "placeholder": "예) 2026년 7월 4일"},
        ],
        "content": """<!DOCTYPE html>
<html lang="ko"><head><meta charset="utf-8"/>
<style>
  body{font-family:'Malgun Gothic','Apple SD Gothic Neo',sans-serif;font-size:14px;color:#1e293b;line-height:1.8;padding:40px;max-width:800px;margin:0 auto}
  h1{text-align:center;font-size:20px;font-weight:900;margin-bottom:8px;letter-spacing:2px}
  .subtitle{text-align:center;font-size:12px;color:#64748b;margin-bottom:32px}
  h3{font-size:14px;font-weight:700;border-bottom:1px solid #e2e8f0;padding-bottom:6px;margin-top:24px;color:#1e3a8a}
  p{margin:6px 0}
  .info-table{width:100%;border-collapse:collapse;margin:16px 0}
  .info-table td{border:1px solid #e2e8f0;padding:8px 12px;font-size:13px}
  .info-table td:first-child{background:#f8fafc;font-weight:700;width:130px;color:#475569}
  .sig-area{margin-top:48px;display:grid;grid-template-columns:1fr 1fr;gap:40px}
  .sig-box{border-top:2px solid #1e293b;padding-top:16px}
  .sig-label{font-weight:700;font-size:13px;color:#64748b;margin-bottom:8px}
  .sig-line{border-bottom:1px solid #cbd5e1;height:60px;margin-bottom:8px}
  .watermark{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-30deg);font-size:80px;color:rgba(30,58,138,0.05);pointer-events:none;white-space:nowrap}
</style></head>
<body>
<div class="watermark">CHECKMATE</div>
<h1>부동산 임대차계약서</h1>
<div class="subtitle">임대인과 임차인은 아래 표시 부동산에 대하여 다음과 같이 임대차 계약을 체결한다.</div>

<h3>【부동산의 표시】</h3>
<table class="info-table">
  <tr><td>소재지</td><td><strong>{{property_address}}</strong></td></tr>
  <tr><td>종류</td><td>{{property_type}}</td></tr>
  <tr><td>면적</td><td>{{area}}</td></tr>
</table>

<h3>제1조 (임대차 목적)</h3>
<p>임대인은 위 부동산을 임차인에게 임대하고, 임차인은 이를 임차한다.</p>

<h3>제2조 (보증금 및 차임)</h3>
<p>보증금 : <strong>금 {{deposit}}원정</strong></p>
<p>월 임대료 : <strong>금 {{monthly_rent}}원정</strong></p>
<p>임대료 납부일 : <strong>{{rent_day}}</strong></p>

<h3>제3조 (임대차 기간)</h3>
<p>임대차 기간은 <strong>{{lease_start}}</strong>부터 <strong>{{lease_end}}</strong>까지로 한다.</p>

<h3>제4조 (사용 목적)</h3>
<p>임차인은 위 부동산을 업무용 {{property_type}}으로만 사용한다.</p>

<h3>제5조 (계약의 해지)</h3>
<p>임차인이 임대인에게 중도 해지를 요청할 경우, 2개월 전 서면으로 통보하여야 한다.</p>

<h3>제6조 (원상복구)</h3>
<p>임차인은 계약 종료 시 부동산을 원상복구하여 반환한다.</p>

<h3>제7조 (특약사항)</h3>
<p>① 임차인은 임대인의 동의 없이 전대(재임대)하지 못한다.</p>
<p>② 임대인은 임차인의 동의 없이 계약기간 중 임대료를 인상하지 않는다.</p>

<p style="margin-top:40px;text-align:center"><strong>{{signing_date}}</strong></p>

<div class="sig-area">
  <div class="sig-box">
    <div class="sig-label">임대인 (갑)</div>
    <p>성명 : {{landlord}}</p>
    <br/>
    <div class="sig-line"></div>
    <p style="font-size:12px;color:#94a3b8;text-align:center">전자서명</p>
  </div>
  <div class="sig-box">
    <div class="sig-label">임차인 (을)</div>
    <p>성명 : {{tenant}}</p>
    <br/>
    <div class="sig-line"></div>
    <p style="font-size:12px;color:#94a3b8;text-align:center">전자서명</p>
  </div>
</div>
</body></html>"""
    },
    {
        "id": "tpl-service",
        "name": "업무위탁(용역)계약서",
        "type": "용역계약서",
        "description": "프리랜서·외주 업무 위탁 표준 계약서",
        "icon": "📋",
        "variables": [
            {"key": "client",         "label": "위탁자(갑) 상호",  "placeholder": "예) (주)체크메이트"},
            {"key": "client_rep",     "label": "위탁자 대표자",    "placeholder": "예) 홍길동"},
            {"key": "contractor",     "label": "수탁자(을) 성명",  "placeholder": "예) 김프리랜서"},
            {"key": "work_content",   "label": "위탁 업무 내용",   "placeholder": "예) 웹사이트 디자인 및 개발"},
            {"key": "deliverables",   "label": "납품물",           "placeholder": "예) 완성된 웹사이트 소스코드, 디자인 파일"},
            {"key": "start_date",     "label": "계약 시작일",      "placeholder": "예) 2026년 7월 15일"},
            {"key": "end_date",       "label": "계약 종료일",      "placeholder": "예) 2026년 9월 30일"},
            {"key": "total_amount",   "label": "총 용역 대가",     "placeholder": "예) 5,000,000"},
            {"key": "payment_terms",  "label": "대금 지급 조건",   "placeholder": "예) 착수금 30% 계약 시, 잔금 70% 납품 후 14일 이내"},
            {"key": "signing_date",   "label": "계약일",           "placeholder": "예) 2026년 7월 4일"},
        ],
        "content": """<!DOCTYPE html>
<html lang="ko"><head><meta charset="utf-8"/>
<style>
  body{font-family:'Malgun Gothic','Apple SD Gothic Neo',sans-serif;font-size:14px;color:#1e293b;line-height:1.8;padding:40px;max-width:800px;margin:0 auto}
  h1{text-align:center;font-size:20px;font-weight:900;margin-bottom:8px;letter-spacing:2px}
  .subtitle{text-align:center;font-size:12px;color:#64748b;margin-bottom:32px}
  h3{font-size:14px;font-weight:700;border-bottom:1px solid #e2e8f0;padding-bottom:6px;margin-top:24px;color:#1e3a8a}
  p{margin:6px 0}
  .sig-area{margin-top:48px;display:grid;grid-template-columns:1fr 1fr;gap:40px}
  .sig-box{border-top:2px solid #1e293b;padding-top:16px}
  .sig-label{font-weight:700;font-size:13px;color:#64748b;margin-bottom:8px}
  .sig-line{border-bottom:1px solid #cbd5e1;height:60px;margin-bottom:8px}
  .watermark{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-30deg);font-size:80px;color:rgba(30,58,138,0.05);pointer-events:none;white-space:nowrap}
</style></head>
<body>
<div class="watermark">CHECKMATE</div>
<h1>업 무 위 탁 계 약 서</h1>
<div class="subtitle">위탁자(갑)와 수탁자(을)는 아래와 같이 업무위탁계약을 체결한다.</div>

<p><strong>{{client}}</strong>(이하 "갑"이라 함)와 <strong>{{contractor}}</strong>(이하 "을"이라 함)은 다음과 같이 업무위탁계약을 체결한다.</p>

<h3>제1조 (위탁업무의 내용)</h3>
<p>갑은 을에게 다음의 업무를 위탁하고 을은 이를 수탁한다.</p>
<p><strong>위탁 업무 : {{work_content}}</strong></p>
<p>납품물 : {{deliverables}}</p>

<h3>제2조 (계약기간)</h3>
<p>계약기간은 <strong>{{start_date}}</strong>부터 <strong>{{end_date}}</strong>까지로 한다.</p>

<h3>제3조 (용역 대가)</h3>
<p>갑은 을에게 본 계약의 대가로 총 <strong>금 {{total_amount}}원정</strong>을 지급한다.</p>
<p>지급 조건 : {{payment_terms}}</p>

<h3>제4조 (업무 이행)</h3>
<p>을은 선량한 관리자의 주의의무를 다하여 위탁업무를 성실히 이행하여야 한다.</p>

<h3>제5조 (비밀유지)</h3>
<p>을은 본 계약 이행 중 취득한 갑의 기술·영업상 비밀을 제3자에게 누설하지 않는다.</p>
<p>본 조의 의무는 계약 종료 후 3년간 유효하다.</p>

<h3>제6조 (지식재산권)</h3>
<p>본 계약에 의해 을이 작성한 납품물에 대한 저작권 등 지식재산권은 대가 지급 완료 즉시 갑에게 귀속된다.</p>

<h3>제7조 (계약 해제)</h3>
<p>당사자 일방이 본 계약을 위반하여 상당한 기간을 정하여 이행을 최고하였음에도 이행하지 아니한 경우 계약을 해제할 수 있다.</p>

<h3>제8조 (분쟁 해결)</h3>
<p>본 계약과 관련한 분쟁은 갑의 주소지를 관할하는 법원을 전속 관할로 한다.</p>

<p style="margin-top:40px;text-align:center"><strong>{{signing_date}}</strong></p>

<div class="sig-area">
  <div class="sig-box">
    <div class="sig-label">위탁자 (갑)</div>
    <p>상호 : {{client}}</p>
    <p>대표자 : {{client_rep}}</p>
    <div class="sig-line"></div>
    <p style="font-size:12px;color:#94a3b8;text-align:center">전자서명</p>
  </div>
  <div class="sig-box">
    <div class="sig-label">수탁자 (을)</div>
    <p>성명 : {{contractor}}</p>
    <br/>
    <div class="sig-line"></div>
    <p style="font-size:12px;color:#94a3b8;text-align:center">전자서명</p>
  </div>
</div>
</body></html>"""
    },
]


# ── Schemas ──────────────────────────────────────────────────────────────

class TemplateVariable(BaseModel):
    key: str
    label: str
    placeholder: str


class TemplateOut(BaseModel):
    id: str
    name: str
    type: str
    description: str
    icon: str
    variables: list[dict]


class TemplateSendRequest(BaseModel):
    template_id: str
    contract_name: str
    contract_html: str   # 변수 치환 완료된 HTML
    requestee_email: EmailStr
    message: Optional[str] = None
    my_signature: Optional[str] = None


# ── Endpoints ────────────────────────────────────────────────────────────

@router.get("", response_model=list[TemplateOut])
def list_templates(current_user: User = Depends(get_current_user)):
    return [
        TemplateOut(
            id=t["id"],
            name=t["name"],
            type=t["type"],
            description=t["description"],
            icon=t["icon"],
            variables=t["variables"],
        )
        for t in DEFAULT_TEMPLATES
    ]


@router.get("/{template_id}/content")
def get_template_content(
    template_id: str,
    current_user: User = Depends(get_current_user),
):
    tpl = next((t for t in DEFAULT_TEMPLATES if t["id"] == template_id), None)
    if not tpl:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="템플릿을 찾을 수 없습니다.")
    return {"id": tpl["id"], "content": tpl["content"], "variables": tpl["variables"]}


@router.post("/send")
def send_template_contract(
    body: TemplateSendRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if body.my_signature and len(body.my_signature.encode()) > 300_000:
        from fastapi import HTTPException
        raise HTTPException(status_code=413, detail="서명 이미지가 너무 큽니다.")

    token = secrets.token_urlsafe(32)
    expires = datetime.now() + timedelta(days=14)   # 템플릿 계약서는 14일 유효

    record = SigningRecord(
        type="request",
        contract_id=f"tpl_{body.template_id}_{int(datetime.now().timestamp())}",
        contract_name=body.contract_name,
        requester_id=current_user.id,
        requester_email=current_user.email,
        requester_name=current_user.username,
        requestee_email=str(body.requestee_email),
        message=body.message,
        token=token,
        status="pending",
        requester_signature=body.my_signature,
        requester_signed_at=datetime.now() if body.my_signature else None,
        expires_at=expires,
        contract_html=body.contract_html,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    # 수신자에게 이메일 발송
    background_tasks.add_task(
        send_signing_request_email,
        str(body.requestee_email),
        current_user.username,
        body.contract_name,
        token,
        body.message,
    )

    # 수신자가 앱 사용자라면 푸시 알림
    requestee_user = db.query(User).filter(User.email == str(body.requestee_email)).first()
    if requestee_user and requestee_user.push_token:
        background_tasks.add_task(
            send_push_signing_request,
            requestee_user.push_token,
            current_user.username,
            body.contract_name,
            token,
        )

    return {"success": True, "token": token, "expires_at": expires.isoformat()}
