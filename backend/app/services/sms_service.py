"""NCP (Naver Cloud Platform) SMS 발송 서비스.

NCP_ACCESS_KEY, NCP_SECRET_KEY, NCP_SMS_SERVICE_ID, NCP_SMS_SENDER 가
.env 에 설정되어 있어야 작동합니다. 미설정 시 로그만 출력하고 넘어갑니다.
"""
import base64
import hashlib
import hmac
import json
import time
import re
import requests

from app.core.config import settings


def _normalize_phone(phone: str) -> str:
    """010-1234-5678 → 01012345678 (국내 번호 기준)"""
    digits = re.sub(r"\D", "", phone)
    # +82 로 시작하면 앞자리 제거 후 0 붙이기
    if digits.startswith("82") and len(digits) == 12:
        digits = "0" + digits[2:]
    return digits


def _ncp_signature(method: str, uri: str, timestamp: str) -> str:
    message = f"{method} {uri}\n{timestamp}\n{settings.NCP_ACCESS_KEY}"
    secret = settings.NCP_SECRET_KEY.encode("utf-8")
    sig = hmac.new(secret, message.encode("utf-8"), hashlib.sha256).digest()
    return base64.b64encode(sig).decode("utf-8")


def _send_sms(to_phone: str, content: str) -> bool:
    """NCP SMS API 호출. 성공 여부 반환."""
    if not all([settings.NCP_ACCESS_KEY, settings.NCP_SECRET_KEY,
                settings.NCP_SMS_SERVICE_ID, settings.NCP_SMS_SENDER]):
        print(f"[SMS SKIP - no NCP credentials] → {to_phone}: {content[:80]}")
        return False

    normalized = _normalize_phone(to_phone)
    timestamp = str(int(time.time() * 1000))
    uri = f"/sms/v2/services/{settings.NCP_SMS_SERVICE_ID}/messages"
    url = f"https://sens.apigw.ntruss.com{uri}"

    headers = {
        "Content-Type": "application/json; charset=utf-8",
        "x-ncp-apigw-timestamp": timestamp,
        "x-ncp-iam-access-key": settings.NCP_ACCESS_KEY,
        "x-ncp-apigw-signature-v2": _ncp_signature("POST", uri, timestamp),
    }
    body = {
        "type": "SMS",
        "contentType": "COMM",
        "countryCode": "82",
        "from": _normalize_phone(settings.NCP_SMS_SENDER),
        "messages": [{"to": normalized, "content": content}],
    }

    try:
        res = requests.post(url, headers=headers, data=json.dumps(body), timeout=10)
        if res.status_code in (200, 202):
            return True
        print(f"[SMS ERROR] {res.status_code} {res.text[:200]}")
        return False
    except Exception as e:
        print(f"[SMS EXCEPTION] {e}")
        return False


def send_signing_request_sms_new_user(phone: str, requester_name: str, contract_name: str, token: str) -> None:
    """앱 미가입자에게 서명 요청 SMS (앱 다운로드 + 웹 서명 링크 포함)."""
    signing_url = f"{settings.FRONTEND_URL}/sign/{token}"
    content = (
        f"[CHECKMATE] {requester_name}님이 '{contract_name}' 전자서명을 요청했습니다.\n"
        f"✍ 서명하기: {signing_url}\n"
        f"📱 앱 다운로드(iOS): {settings.APP_STORE_URL}\n"
        f"📱 앱 다운로드(Android): {settings.PLAY_STORE_URL}"
    )
    _send_sms(phone, content)


def send_signing_request_sms_existing_user(phone: str, requester_name: str, contract_name: str, token: str) -> None:
    """앱 가입자(푸시 토큰 없음) 에게 서명 요청 SMS."""
    signing_url = f"{settings.FRONTEND_URL}/sign/{token}"
    content = (
        f"[CHECKMATE] {requester_name}님이 '{contract_name}' 전자서명을 요청했습니다.\n"
        f"앱을 실행하거나 아래 링크에서 서명해주세요.\n"
        f"✍ 서명하기: {signing_url}"
    )
    _send_sms(phone, content)
