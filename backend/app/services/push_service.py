"""Expo Push Notification 서비스 — Firebase 설정 없이 Expo API로 발송"""
import httpx


EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


async def send_push(token: str, title: str, body: str, data: dict | None = None) -> None:
    if not token or not token.startswith("ExponentPushToken"):
        return
    payload = {"to": token, "title": title, "body": body, "sound": "default"}
    if data:
        payload["data"] = data
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(EXPO_PUSH_URL, json=payload)
    except Exception as e:
        print(f"[PUSH] 발송 실패: {e}")


async def send_push_signing_request(token: str, requester_name: str, contract_name: str, sign_token: str) -> None:
    await send_push(
        token,
        title=f"{requester_name}님의 서명 요청",
        body=f"'{contract_name}' 계약서 서명을 요청했습니다.",
        data={"type": "signing_request", "token": sign_token},
    )


async def send_push_signing_complete(token: str, signer_name: str, contract_name: str) -> None:
    await send_push(
        token,
        title="서명 완료",
        body=f"{signer_name}님이 '{contract_name}'에 서명을 완료했습니다.",
        data={"type": "signing_complete"},
    )
