import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

type Status = 'loading' | 'success' | 'error' | 'no-token'

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<Status>(token ? 'loading' : 'no-token')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) return

    fetch(`/api/v1/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.detail ?? '인증 실패')
        setMessage(data.message ?? '인증이 완료되었습니다.')
        setStatus('success')
      })
      .catch((e: Error) => {
        setMessage(e.message)
        setStatus('error')
      })
  }, [token])

  return (
    <div className="verify-page">
      <div className="verify-card">
        {/* Logo */}
        <Link to="/" className="verify-logo">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L3 7V12C3 16.97 6.84 21.61 12 23C17.16 21.61 21 16.97 21 12V7L12 2Z"
              fill="url(#vg)" />
            <path d="M9 12L11 14L15 10" stroke="white" strokeWidth="2.2"
              strokeLinecap="round" strokeLinejoin="round" />
            <defs>
              <linearGradient id="vg" x1="3" y1="2" x2="21" y2="23">
                <stop offset="0%" stopColor="#1e3a8a" />
                <stop offset="100%" stopColor="#2563eb" />
              </linearGradient>
            </defs>
          </svg>
          <span>CHECKMATE</span>
        </Link>

        {/* 로딩 */}
        {status === 'loading' && (
          <>
            <div className="verify-spinner" />
            <h2 className="verify-title">이메일 인증 중...</h2>
            <p className="verify-desc">잠시만 기다려 주세요.</p>
          </>
        )}

        {/* 성공 */}
        {status === 'success' && (
          <>
            <div className="verify-icon success">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 className="verify-title">인증 완료!</h2>
            <p className="verify-desc">{message}</p>
            <Link to="/auth" className="verify-btn primary">
              로그인하기 →
            </Link>
          </>
        )}

        {/* 오류 */}
        {status === 'error' && (
          <>
            <div className="verify-icon error">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </div>
            <h2 className="verify-title">인증 실패</h2>
            <p className="verify-desc">{message}</p>
            <div className="verify-actions">
              <Link to="/auth" className="verify-btn primary">
                다시 로그인
              </Link>
              <p className="verify-hint">
                링크가 만료된 경우 로그인 화면에서<br/>
                <strong>인증 메일 재발송</strong>을 이용해 주세요.
              </p>
            </div>
          </>
        )}

        {/* 토큰 없음 */}
        {status === 'no-token' && (
          <>
            <div className="verify-icon error">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h2 className="verify-title">잘못된 접근입니다</h2>
            <p className="verify-desc">유효한 인증 링크를 통해 접근해 주세요.</p>
            <Link to="/auth" className="verify-btn primary">
              로그인 화면으로
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
