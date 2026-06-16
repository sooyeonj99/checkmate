import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

type Tab = 'login' | 'signup'

export default function AuthPage() {
  const [tab, setTab] = useState<Tab>('login')
  const navigate = useNavigate()

  return (
    <div className="auth-page">
      <div className="auth-bg" />
      <div className="auth-grid" />

      {/* Logo */}
      <Link to="/" className="auth-logo">
        <div className="auth-logo-icon">♟</div>
        <span>체크메이트</span>
      </Link>

      <div className="auth-card">
        {/* Tab switcher */}
        <div className="auth-tabs">
          <button
            className={`auth-tab${tab === 'login' ? ' active' : ''}`}
            onClick={() => setTab('login')}
          >
            로그인
          </button>
          <button
            className={`auth-tab${tab === 'signup' ? ' active' : ''}`}
            onClick={() => setTab('signup')}
          >
            회원가입
          </button>
        </div>

        {tab === 'login' ? (
          <LoginForm onSuccess={() => navigate('/')} />
        ) : (
          <SignupForm onSuccess={() => setTab('login')} />
        )}
      </div>

      <p className="auth-footer-note">
        계약서를 업로드하면 <Link to="/" className="auth-link">이용약관</Link> 및{' '}
        <Link to="/" className="auth-link">개인정보처리방침</Link>에 동의한 것으로 간주합니다.
      </p>
    </div>
  )
}

/* ── 로그인 폼 ── */
function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSuccess()
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <div className="auth-field">
        <label className="auth-label">이메일</label>
        <input
          type="email"
          className="auth-input"
          placeholder="example@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
      </div>

      <div className="auth-field">
        <div className="auth-label-row">
          <label className="auth-label">비밀번호</label>
          <Link to="/auth/reset" className="auth-link auth-forgot">비밀번호 찾기</Link>
        </div>
        <div className="auth-input-wrap">
          <input
            type={showPw ? 'text' : 'password'}
            className="auth-input"
            placeholder="비밀번호를 입력하세요"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          <button
            type="button"
            className="auth-pw-toggle"
            onClick={() => setShowPw((v) => !v)}
            aria-label={showPw ? '비밀번호 숨기기' : '비밀번호 보기'}
          >
            {showPw ? '🙈' : '👁'}
          </button>
        </div>
      </div>

      <button type="submit" className="auth-submit-btn">
        로그인
      </button>

      <div className="auth-divider">
        <span>또는 소셜 계정으로 계속하기</span>
      </div>

      <div className="auth-social-btns">
        <button type="button" className="auth-social-btn auth-kakao">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path
              d="M9 1.5C4.858 1.5 1.5 4.134 1.5 7.379c0 2.093 1.393 3.933 3.504 5.004l-.894 3.268c-.08.29.254.52.504.348l3.807-2.518A8.97 8.97 0 009 13.258c4.142 0 7.5-2.634 7.5-5.879C16.5 4.134 13.142 1.5 9 1.5z"
              fill="currentColor"
            />
          </svg>
          카카오로 계속하기
        </button>

        <button type="button" className="auth-social-btn auth-google">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.859-3.048.859-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          Google로 계속하기
        </button>
      </div>
    </form>
  )
}

/* ── 회원가입 폼 ── */
function SignupForm({ onSuccess }: { onSuccess: () => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [agreePrivacy, setAgreePrivacy] = useState(false)

  const allAgreed = agreeTerms && agreePrivacy
  const pwMatch = password === confirm || confirm === ''

  const handleAllAgree = () => {
    const next = !allAgreed
    setAgreeTerms(next)
    setAgreePrivacy(next)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!allAgreed) return
    onSuccess()
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <div className="auth-field">
        <label className="auth-label">이름</label>
        <input
          type="text"
          className="auth-input"
          placeholder="홍길동"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoComplete="name"
        />
      </div>

      <div className="auth-field">
        <label className="auth-label">이메일</label>
        <input
          type="email"
          className="auth-input"
          placeholder="example@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
      </div>

      <div className="auth-field">
        <label className="auth-label">비밀번호</label>
        <div className="auth-input-wrap">
          <input
            type={showPw ? 'text' : 'password'}
            className="auth-input"
            placeholder="8자 이상 입력하세요"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
          <button
            type="button"
            className="auth-pw-toggle"
            onClick={() => setShowPw((v) => !v)}
            aria-label={showPw ? '비밀번호 숨기기' : '비밀번호 보기'}
          >
            {showPw ? '🙈' : '👁'}
          </button>
        </div>
      </div>

      <div className="auth-field">
        <label className="auth-label">비밀번호 확인</label>
        <div className="auth-input-wrap">
          <input
            type={showConfirm ? 'text' : 'password'}
            className={`auth-input${confirm && !pwMatch ? ' auth-input-error' : ''}`}
            placeholder="비밀번호를 다시 입력하세요"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            autoComplete="new-password"
          />
          <button
            type="button"
            className="auth-pw-toggle"
            onClick={() => setShowConfirm((v) => !v)}
            aria-label={showConfirm ? '비밀번호 숨기기' : '비밀번호 보기'}
          >
            {showConfirm ? '🙈' : '👁'}
          </button>
        </div>
        {confirm && !pwMatch && (
          <p className="auth-field-error">비밀번호가 일치하지 않습니다.</p>
        )}
      </div>

      {/* 약관 동의 */}
      <div className="auth-agree-box">
        <label className="auth-check-row auth-check-all">
          <input
            type="checkbox"
            checked={allAgreed}
            onChange={handleAllAgree}
          />
          <span className="auth-checkmark" />
          <span className="auth-check-label auth-check-all-label">전체 동의</span>
        </label>

        <div className="auth-agree-divider" />

        <label className="auth-check-row">
          <input
            type="checkbox"
            checked={agreeTerms}
            onChange={(e) => setAgreeTerms(e.target.checked)}
          />
          <span className="auth-checkmark" />
          <span className="auth-check-label">
            <Link to="/" className="auth-link">[필수] 이용약관</Link>에 동의합니다
          </span>
        </label>

        <label className="auth-check-row">
          <input
            type="checkbox"
            checked={agreePrivacy}
            onChange={(e) => setAgreePrivacy(e.target.checked)}
          />
          <span className="auth-checkmark" />
          <span className="auth-check-label">
            <Link to="/" className="auth-link">[필수] 개인정보 처리방침</Link>에 동의합니다
          </span>
        </label>
      </div>

      <button
        type="submit"
        className="auth-submit-btn"
        disabled={!allAgreed || !pwMatch}
      >
        회원가입
      </button>

      <div className="auth-divider">
        <span>또는 소셜 계정으로 시작하기</span>
      </div>

      <div className="auth-social-btns">
        <button type="button" className="auth-social-btn auth-kakao">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path
              d="M9 1.5C4.858 1.5 1.5 4.134 1.5 7.379c0 2.093 1.393 3.933 3.504 5.004l-.894 3.268c-.08.29.254.52.504.348l3.807-2.518A8.97 8.97 0 009 13.258c4.142 0 7.5-2.634 7.5-5.879C16.5 4.134 13.142 1.5 9 1.5z"
              fill="currentColor"
            />
          </svg>
          카카오로 시작하기
        </button>

        <button type="button" className="auth-social-btn auth-google">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.859-3.048.859-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          Google로 시작하기
        </button>
      </div>
    </form>
  )
}
