import { Link, useNavigate } from 'react-router-dom'

export default function ComingSoonPage() {
  const navigate = useNavigate()

  return (
    <div className="coming-soon-page">
      <div className="coming-soon-bg" />

      <div className="coming-soon-card">
        <div className="coming-soon-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L3 7V12C3 16.97 6.84 21.61 12 23C17.16 21.61 21 16.97 21 12V7L12 2Z"
              fill="url(#cs-grad)" />
            <path d="M9 12L11 14L15 10" stroke="white" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" />
            <defs>
              <linearGradient id="cs-grad" x1="3" y1="2" x2="21" y2="23">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#1d4ed8" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <div className="coming-soon-badge">곧 출시 예정</div>

        <h1 className="coming-soon-title">소셜 로그인 준비 중입니다</h1>

        <p className="coming-soon-desc">
          카카오, 구글 소셜 로그인 기능을 준비하고 있습니다.<br />
          현재는 <strong>이메일 회원가입</strong>을 이용해 주세요.
        </p>

        <div className="coming-soon-features">
          <div className="coming-soon-feature">
            <span className="coming-soon-feature-icon">💛</span>
            <span>카카오 로그인</span>
          </div>
          <div className="coming-soon-feature">
            <span className="coming-soon-feature-icon">🔵</span>
            <span>구글 로그인</span>
          </div>
          <div className="coming-soon-feature">
            <span className="coming-soon-feature-icon">🍎</span>
            <span>애플 로그인</span>
          </div>
        </div>

        <div className="coming-soon-actions">
          <button
            className="coming-soon-btn primary"
            onClick={() => navigate('/auth')}
          >
            이메일로 가입하기
          </button>
          <button
            className="coming-soon-btn secondary"
            onClick={() => navigate(-1)}
          >
            돌아가기
          </button>
        </div>

        <Link to="/" className="coming-soon-home">
          홈으로 이동 →
        </Link>
      </div>
    </div>
  )
}
