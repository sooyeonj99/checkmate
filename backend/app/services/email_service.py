"""이메일 발송 서비스 (SMTP)"""
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import settings


def _send_smtp(to_email: str, subject: str, html_body: str) -> None:
    """동기 SMTP 발송 — BackgroundTasks에서 호출"""
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        # SMTP 미설정 시 콘솔에 출력 (개발 환경)
        print(f"\n{'='*60}")
        print(f"[EMAIL 발송 시뮬레이션]")
        print(f"  수신: {to_email}")
        print(f"  제목: {subject}")
        print(f"  * SMTP 설정 후 실제 발송됩니다 (.env 참조)")
        print(f"{'='*60}\n")
        return

    from_addr = settings.SMTP_FROM or settings.SMTP_USER

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"CHECKMATE <{from_addr}>"
    msg["To"] = to_email
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    ctx = ssl.create_default_context()
    try:
        if settings.SMTP_SSL:
            with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, context=ctx) as server:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(from_addr, to_email, msg.as_string())
        else:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                server.ehlo()
                server.starttls(context=ctx)
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(from_addr, to_email, msg.as_string())
        print(f"[EMAIL] 발송 완료 → {to_email}")
    except Exception as e:
        print(f"[EMAIL] 발송 실패: {e}")


def send_verification_email(to_email: str, username: str, token: str) -> None:
    verify_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"
    subject = "[CHECKMATE] 이메일 인증을 완료해 주세요"
    html = f"""<!DOCTYPE html>
<html lang="ko">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f0f4ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

    <!-- 헤더 -->
    <div style="background:linear-gradient(135deg,#1e3a8a 0%,#2563eb 100%);padding:32px 40px;text-align:center;">
      <div style="display:inline-flex;align-items:center;gap:10px;">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L3 7V12C3 16.97 6.84 21.61 12 23C17.16 21.61 21 16.97 21 12V7L12 2Z" fill="white" fill-opacity="0.95"/>
          <path d="M9 12L11 14L15 10" stroke="#1e3a8a" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span style="color:#fff;font-size:20px;font-weight:800;letter-spacing:1.5px;">CHECKMATE</span>
      </div>
      <p style="color:rgba(255,255,255,0.75);font-size:13px;margin:8px 0 0;">AI 계약서 분석 서비스</p>
    </div>

    <!-- 본문 -->
    <div style="padding:40px;">
      <h2 style="margin:0 0 16px;font-size:22px;color:#1e3a8a;font-weight:700;">안녕하세요, {username}님! 👋</h2>
      <p style="color:#475569;font-size:15px;line-height:1.75;margin:0 0 32px;">
        CHECKMATE에 가입해 주셔서 감사합니다.<br/>
        아래 버튼을 클릭해 <strong>이메일 인증을 완료</strong>하시면<br/>
        모든 서비스를 이용하실 수 있습니다.
      </p>

      <!-- 인증 버튼 -->
      <div style="text-align:center;margin:0 0 32px;">
        <a href="{verify_url}"
           style="display:inline-block;padding:16px 40px;
                  background:linear-gradient(135deg,#1e3a8a,#2563eb);
                  color:#fff;text-decoration:none;border-radius:12px;
                  font-weight:700;font-size:16px;
                  box-shadow:0 4px 16px rgba(37,99,235,0.35);">
          이메일 인증하기 →
        </a>
      </div>

      <!-- 링크 -->
      <div style="background:#f8faff;border-radius:10px;padding:16px;margin-bottom:24px;">
        <p style="color:#64748b;font-size:12px;margin:0 0 6px;">버튼이 작동하지 않으면 아래 링크를 복사해 주세요:</p>
        <a href="{verify_url}" style="color:#2563eb;font-size:12px;word-break:break-all;">{verify_url}</a>
      </div>

      <!-- 안내 -->
      <div style="border-top:1px solid #e2e8f0;padding-top:20px;">
        <p style="color:#94a3b8;font-size:12px;line-height:1.6;margin:0;">
          ⏰ 이 링크는 <strong>24시간</strong> 후 만료됩니다.<br/>
          🔒 본인이 가입하지 않으셨다면 이 메일을 무시해 주세요.<br/>
          📧 문의: support@checkmate.kr
        </p>
      </div>
    </div>

    <!-- 푸터 -->
    <div style="background:#f8faff;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0;">
      <p style="margin:0;font-size:12px;color:#94a3b8;">ⓒ 2026 CHECKMATE · AI 계약서 분석 서비스</p>
    </div>
  </div>
</body>
</html>"""
    _send_smtp(to_email, subject, html)


def send_find_id_email(to_email: str, username: str) -> None:
    subject = "[CHECKMATE] 아이디(닉네임) 확인 안내"
    html = f"""<!DOCTYPE html>
<html lang="ko">
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f0f4ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#1e3a8a 0%,#2563eb 100%);padding:32px 40px;text-align:center;">
      <span style="color:#fff;font-size:20px;font-weight:800;letter-spacing:1.5px;">CHECKMATE</span>
      <p style="color:rgba(255,255,255,0.75);font-size:13px;margin:8px 0 0;">AI 계약서 분석 서비스</p>
    </div>
    <div style="padding:40px;">
      <h2 style="margin:0 0 16px;font-size:22px;color:#1e3a8a;font-weight:700;">아이디 확인</h2>
      <p style="color:#475569;font-size:15px;line-height:1.75;margin:0 0 24px;">
        요청하신 계정 정보를 안내해 드립니다.
      </p>
      <div style="background:#eff6ff;border-radius:12px;padding:20px 24px;margin-bottom:28px;border:1px solid #bfdbfe;">
        <div style="font-size:12px;color:#64748b;margin-bottom:6px;">가입된 이메일</div>
        <div style="font-size:16px;font-weight:700;color:#1e3a8a;">{to_email}</div>
        <div style="margin-top:14px;padding-top:14px;border-top:1px solid #bfdbfe;">
          <div style="font-size:12px;color:#64748b;margin-bottom:6px;">닉네임</div>
          <div style="font-size:16px;font-weight:700;color:#1e3a8a;">{username}</div>
        </div>
      </div>
      <p style="color:#475569;font-size:14px;line-height:1.75;margin:0 0 24px;">
        위 이메일로 로그인하실 수 있습니다.<br/>
        비밀번호가 기억나지 않으시면 <strong>비밀번호 찾기</strong>를 이용해 주세요.
      </p>
      <div style="border-top:1px solid #e2e8f0;padding-top:20px;">
        <p style="color:#94a3b8;font-size:12px;line-height:1.6;margin:0;">
          🔒 본인이 요청하지 않으셨다면 이 메일을 무시해 주세요.<br/>
          📧 문의: support@checkmate.kr
        </p>
      </div>
    </div>
    <div style="background:#f8faff;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0;">
      <p style="margin:0;font-size:12px;color:#94a3b8;">ⓒ 2026 CHECKMATE · AI 계약서 분석 서비스</p>
    </div>
  </div>
</body>
</html>"""
    _send_smtp(to_email, subject, html)


def send_password_reset_email(to_email: str, username: str, token: str) -> None:
    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
    subject = "[CHECKMATE] 비밀번호 재설정 안내"
    html = f"""<!DOCTYPE html>
<html lang="ko">
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f0f4ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#1e3a8a 0%,#2563eb 100%);padding:32px 40px;text-align:center;">
      <span style="color:#fff;font-size:20px;font-weight:800;letter-spacing:1.5px;">CHECKMATE</span>
      <p style="color:rgba(255,255,255,0.75);font-size:13px;margin:8px 0 0;">AI 계약서 분석 서비스</p>
    </div>
    <div style="padding:40px;">
      <h2 style="margin:0 0 16px;font-size:22px;color:#1e3a8a;font-weight:700;">안녕하세요, {username}님!</h2>
      <p style="color:#475569;font-size:15px;line-height:1.75;margin:0 0 32px;">
        비밀번호 재설정 요청이 접수되었습니다.<br/>
        아래 버튼을 클릭하여 새 비밀번호를 설정해 주세요.
      </p>
      <div style="text-align:center;margin:0 0 32px;">
        <a href="{reset_url}"
           style="display:inline-block;padding:16px 40px;
                  background:linear-gradient(135deg,#1e3a8a,#2563eb);
                  color:#fff;text-decoration:none;border-radius:12px;
                  font-weight:700;font-size:16px;
                  box-shadow:0 4px 16px rgba(37,99,235,0.35);">
          비밀번호 재설정하기 →
        </a>
      </div>
      <div style="background:#f8faff;border-radius:10px;padding:16px;margin-bottom:24px;">
        <p style="color:#64748b;font-size:12px;margin:0 0 6px;">버튼이 작동하지 않으면 아래 링크를 복사해 주세요:</p>
        <a href="{reset_url}" style="color:#2563eb;font-size:12px;word-break:break-all;">{reset_url}</a>
      </div>
      <div style="border-top:1px solid #e2e8f0;padding-top:20px;">
        <p style="color:#94a3b8;font-size:12px;line-height:1.6;margin:0;">
          ⏰ 이 링크는 <strong>1시간</strong> 후 만료됩니다.<br/>
          🔒 본인이 요청하지 않으셨다면 이 메일을 무시해 주세요.<br/>
          📧 문의: support@checkmate.kr
        </p>
      </div>
    </div>
    <div style="background:#f8faff;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0;">
      <p style="margin:0;font-size:12px;color:#94a3b8;">ⓒ 2026 CHECKMATE · AI 계약서 분석 서비스</p>
    </div>
  </div>
</body>
</html>"""
    _send_smtp(to_email, subject, html)


def send_signing_request_email(
    to_email: str,
    requester_name: str,
    contract_name: str,
    token: str,
    message: str | None = None,
) -> None:
    sign_url = f"{settings.FRONTEND_URL}/sign/{token}"
    subject = f"[CHECKMATE] {requester_name}님이 계약서 서명을 요청했습니다"
    msg_block = f"""
      <div style="background:#f8faff;border-left:4px solid #2563eb;border-radius:0 10px 10px 0;
                  padding:14px 18px;margin:16px 0 28px;font-size:14px;color:#334155;line-height:1.7;">
        {message}
      </div>""" if message else ""

    html = f"""<!DOCTYPE html>
<html lang="ko">
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f0f4ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#1e3a8a 0%,#2563eb 100%);padding:32px 40px;text-align:center;">
      <span style="color:#fff;font-size:20px;font-weight:800;letter-spacing:1.5px;">CHECKMATE</span>
      <p style="color:rgba(255,255,255,0.75);font-size:13px;margin:8px 0 0;">AI 계약서 분석 서비스</p>
    </div>
    <div style="padding:40px;">
      <h2 style="margin:0 0 10px;font-size:20px;color:#1e3a8a;font-weight:700;">서명 요청이 도착했습니다</h2>
      <p style="color:#475569;font-size:15px;line-height:1.75;margin:0 0 6px;">
        <strong>{requester_name}</strong>님이 아래 계약서에 서명을 요청했습니다.
      </p>
      <div style="background:#eff6ff;border-radius:10px;padding:12px 18px;margin:16px 0;font-weight:700;color:#1e3a8a;font-size:15px;">
        📄 {contract_name}
      </div>
      {msg_block}
      <div style="text-align:center;margin:0 0 28px;">
        <a href="{sign_url}"
           style="display:inline-block;padding:16px 40px;
                  background:linear-gradient(135deg,#1e3a8a,#2563eb);
                  color:#fff;text-decoration:none;border-radius:12px;
                  font-weight:700;font-size:16px;">
          계약서 확인 및 서명하기 →
        </a>
      </div>
      <div style="background:#f8faff;border-radius:10px;padding:16px;margin-bottom:24px;">
        <p style="color:#64748b;font-size:12px;margin:0 0 6px;">버튼이 작동하지 않으면 아래 링크를 복사하세요:</p>
        <a href="{sign_url}" style="color:#2563eb;font-size:12px;word-break:break-all;">{sign_url}</a>
      </div>
      <div style="border-top:1px solid #e2e8f0;padding-top:18px;">
        <p style="color:#94a3b8;font-size:12px;line-height:1.6;margin:0;">
          ⏰ 이 링크는 <strong>7일</strong> 후 만료됩니다.<br/>
          🔒 본인이 요청받지 않았다면 이 메일을 무시해 주세요.
        </p>
      </div>
    </div>
    <div style="background:#f8faff;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0;">
      <p style="margin:0;font-size:12px;color:#94a3b8;">ⓒ 2026 CHECKMATE · AI 계약서 분석 서비스</p>
    </div>
  </div>
</body>
</html>"""
    _send_smtp(to_email, subject, html)


def send_expiry_alert_email(
    to_email: str,
    username: str,
    filename: str,
    expiry_date: str,
    days_left: int,
) -> None:
    urgency_color = "#dc2626" if days_left <= 3 else "#d97706" if days_left <= 7 else "#2563eb"
    urgency_label = "오늘 만료" if days_left == 0 else f"{days_left}일 후 만료"
    subject = f"[CHECKMATE] ⚠️ '{filename}' 계약 만료 {days_left}일 전"
    html = f"""<!DOCTYPE html>
<html lang="ko">
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f0f4ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:{urgency_color};padding:28px 40px;text-align:center;">
      <span style="color:#fff;font-size:20px;font-weight:800;letter-spacing:1.5px;">CHECKMATE</span>
      <p style="color:rgba(255,255,255,0.85);font-size:13px;margin:8px 0 0;">계약 만료 알림</p>
    </div>
    <div style="padding:40px;">
      <h2 style="margin:0 0 16px;font-size:22px;color:#0f172a;font-weight:700;">안녕하세요, {username}님!</h2>
      <div style="background:#fef9ec;border:1px solid #fcd34d;border-radius:12px;padding:20px 24px;margin-bottom:28px;">
        <div style="font-size:13px;color:#92400e;font-weight:700;margin-bottom:8px;">⏰ {urgency_label}</div>
        <div style="font-size:17px;font-weight:700;color:#0f172a;margin-bottom:4px;">📄 {filename}</div>
        <div style="font-size:14px;color:#64748b;">만료일: {expiry_date}</div>
      </div>
      <p style="color:#475569;font-size:14px;line-height:1.75;margin:0 0 24px;">
        위 계약의 만료일이 다가오고 있습니다.<br/>
        계약 갱신 또는 연장 여부를 확인해 주세요.
      </p>
      <div style="text-align:center;margin-bottom:28px;">
        <a href="{settings.FRONTEND_URL}/dashboard"
           style="display:inline-block;padding:14px 36px;background:{urgency_color};
                  color:#fff;text-decoration:none;border-radius:12px;font-weight:700;font-size:15px;">
          대시보드에서 확인하기 →
        </a>
      </div>
      <div style="border-top:1px solid #e2e8f0;padding-top:18px;">
        <p style="color:#94a3b8;font-size:12px;line-height:1.6;margin:0;">
          📧 문의: support@checkmate.kr · 수신 거부는 마이페이지에서 설정하실 수 있습니다.
        </p>
      </div>
    </div>
    <div style="background:#f8faff;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0;">
      <p style="margin:0;font-size:12px;color:#94a3b8;">ⓒ 2026 CHECKMATE · AI 계약서 분석 서비스</p>
    </div>
  </div>
</body>
</html>"""
    _send_smtp(to_email, subject, html)


def send_signing_complete_email(
    to_email: str,
    requester_name: str,
    requestee_name: str,
    contract_name: str,
) -> None:
    subject = f"[CHECKMATE] {contract_name} 서명이 완료되었습니다"
    html = f"""<!DOCTYPE html>
<html lang="ko">
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f0f4ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#1e3a8a 0%,#2563eb 100%);padding:32px 40px;text-align:center;">
      <span style="color:#fff;font-size:20px;font-weight:800;letter-spacing:1.5px;">CHECKMATE</span>
    </div>
    <div style="padding:40px;">
      <h2 style="margin:0 0 10px;font-size:20px;color:#16a34a;font-weight:700;">✓ 서명이 완료되었습니다</h2>
      <p style="color:#475569;font-size:15px;line-height:1.75;margin:0 0 16px;">
        <strong>{requestee_name}</strong>님이 아래 계약서에 서명을 완료했습니다.
      </p>
      <div style="background:#eff6ff;border-radius:10px;padding:12px 18px;margin:16px 0;font-weight:700;color:#1e3a8a;font-size:15px;">
        📄 {contract_name}
      </div>
      <p style="color:#64748b;font-size:14px;line-height:1.7;margin:0;">
        대시보드 → 전자서명 메뉴에서 서명 내역을 확인할 수 있습니다.
      </p>
    </div>
    <div style="background:#f8faff;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0;">
      <p style="margin:0;font-size:12px;color:#94a3b8;">ⓒ 2026 CHECKMATE</p>
    </div>
  </div>
</body>
</html>"""
    _send_smtp(to_email, subject, html)
