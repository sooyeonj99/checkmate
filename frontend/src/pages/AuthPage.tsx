import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

type Tab = 'login' | 'signup' | 'find-id' | 'forgot-password'

/* ── JSON 안전 파싱 헬퍼 ──────────────────────────────
   GitHub Pages 등 백엔드 없는 환경에서 HTML이 반환될 때
   JSON 파싱 오류 대신 알아볼 수 있는 메시지를 표시한다. */
async function safeJson(res: Response): Promise<any> {
  const ct = res.headers.get('content-type') ?? ''
  if (!ct.includes('application/json')) {
    throw new Error('서버에 연결할 수 없습니다.\n백엔드 서버가 실행 중인지 확인해 주세요.')
  }
  return res.json()
}

/* GitHub Pages 여부 감지 */
const IS_GITHUB_PAGES = window.location.hostname.endsWith('github.io')

/* 데모 계정 (GitHub Pages 전용) */
const DEMO_EMAIL = 'test@test.com'
const DEMO_PASSWORD = '12345678ab'
const DEMO_USER = { id: 1, email: DEMO_EMAIL, username: 'test', user_type: 'personal' as const }

export default function AuthPage() {
  const [tab, setTab] = useState<Tab>('login')
  const navigate = useNavigate()

  const isSubView = tab === 'find-id' || tab === 'forgot-password'

  return (
    <div className="auth-page">
      <div className="auth-bg" />
      <div className="auth-grid" />

      <Link to="/" className="auth-logo">
        <div className="auth-logo-icon">♟</div>
        <span>체크메이트</span>
      </Link>

      <div className="auth-card">
        {/* GitHub Pages 데모 안내 배너 */}
        {IS_GITHUB_PAGES && !isSubView && (
          <div className="auth-deploy-banner">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>
              <strong>데모 모드</strong>입니다. 테스트 계정으로 로그인해 기능을 체험할 수 있습니다.<br/>
              <span style={{ opacity: 0.8, fontSize: 12 }}>이메일: test@test.com &nbsp;/&nbsp; 비밀번호: 12345678ab</span>
            </span>
          </div>
        )}

        {/* 서브뷰(아이디찾기/비밀번호찾기)일 때는 탭 숨김 */}
        {!isSubView && (
          <div className="auth-tabs">
            <button className={`auth-tab${tab === 'login' ? ' active' : ''}`} onClick={() => setTab('login')}>
              로그인
            </button>
            <button className={`auth-tab${tab === 'signup' ? ' active' : ''}`} onClick={() => setTab('signup')}>
              회원가입
            </button>
          </div>
        )}

        {tab === 'login' && (
          <LoginForm
            onSuccess={() => navigate('/dashboard')}
            onFindId={() => setTab('find-id')}
            onForgotPassword={() => setTab('forgot-password')}
          />
        )}
        {tab === 'signup' && <SignupForm onSwitchToLogin={() => setTab('login')} />}
        {tab === 'find-id' && <FindIdForm onBack={() => setTab('login')} />}
        {tab === 'forgot-password' && <ForgotPasswordForm onBack={() => setTab('login')} />}
      </div>

      <p className="auth-footer-note">
        서비스를 이용하면 <Link to="/terms" className="auth-link">이용약관</Link> 및{' '}
        <Link to="/privacy" className="auth-link">개인정보처리방침</Link>에 동의한 것으로 간주합니다.
      </p>
    </div>
  )
}

/* ── 로그인 폼 ── */
function LoginForm({ onSuccess, onFindId, onForgotPassword }: {
  onSuccess: () => void
  onFindId: () => void
  onForgotPassword: () => void
}) {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [needsVerification, setNeedsVerification] = useState(false)
  const [resendDone, setResendDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setNeedsVerification(false)
    setLoading(true)

    /* ── GitHub Pages 데모 로그인 ── */
    if (IS_GITHUB_PAGES) {
      await new Promise((r) => setTimeout(r, 600)) // 로그인 중 UX
      if (email === DEMO_EMAIL && password === DEMO_PASSWORD) {
        login('demo-token', DEMO_USER)
        onSuccess()
      } else {
        setError(`데모 모드에서는 테스트 계정만 사용할 수 있습니다.\n(test@test.com / 12345678ab)`)
      }
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await safeJson(res)
      if (!res.ok) {
        if (res.status === 403) setNeedsVerification(true)
        throw new Error(data.detail ?? '로그인 실패')
      }
      login(data.access_token, data.user)
      onSuccess()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '로그인 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    try {
      const res = await fetch('/api/v1/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      await safeJson(res)
      setResendDone(true)
      setNeedsVerification(false)
      setError('인증 메일을 재발송했습니다. 메일함을 확인해 주세요.')
    } catch {
      setError('재발송 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.')
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      {error && (
        <div className={`auth-error-banner${needsVerification ? ' auth-error-verify' : ''}`}>
          {error.split('\n').map((line, i) => <div key={i}>{line}</div>)}
          {needsVerification && !resendDone && (
            <button type="button" className="auth-resend-btn" onClick={handleResend}>
              인증 메일 재발송
            </button>
          )}
        </div>
      )}

      <div className="auth-field">
        <label className="auth-label">이메일</label>
        <input type="email" className="auth-input" placeholder="example@email.com"
          value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
      </div>

      <div className="auth-field">
        <div className="auth-label-row">
          <label className="auth-label">비밀번호</label>
        </div>
        <div className="auth-input-wrap">
          <input type={showPw ? 'text' : 'password'} className="auth-input"
            placeholder="비밀번호를 입력하세요" value={password}
            onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
          <button type="button" className="auth-pw-toggle" onClick={() => setShowPw((v) => !v)}>
            {showPw ? '🙈' : '👁'}
          </button>
        </div>
      </div>

      <button type="submit" className="auth-submit-btn" disabled={loading}>
        {loading ? '로그인 중...' : '로그인'}
      </button>

      {/* 아이디/비밀번호 찾기 */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 12 }}>
        <button type="button" className="auth-find-link" onClick={onFindId}>아이디 찾기</button>
        <span style={{ color: 'var(--border)', fontSize: 13 }}>|</span>
        <button type="button" className="auth-find-link" onClick={onForgotPassword}>비밀번호 찾기</button>
      </div>

      <div className="auth-divider"><span>또는 소셜 계정으로 계속하기</span></div>
      <SocialButtons />
    </form>
  )
}

/* ── 회원가입 폼 ── */
function SignupForm({ onSwitchToLogin }: { onSwitchToLogin: () => void }) {
  const [userType, setUserType] = useState<'personal' | 'enterprise'>('personal')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [businessNumber, setBusinessNumber] = useState('')
  const [bizStatus, setBizStatus] = useState<null | { status: string; status_text: string }>(null)
  const [bizChecking, setBizChecking] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [agreePrivacy, setAgreePrivacy] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [sentEmail, setSentEmail] = useState('')

  const formatPhone = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 11)
    if (digits.length <= 3) return digits
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
  }

  const formatBusinessNumber = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 10)
    if (digits.length <= 3) return digits
    if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`
    return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`
  }

  const isBusinessNumberValid = businessNumber.replace(/\D/g, '').length === 10

  const checkBusinessNumber = async (formatted: string) => {
    const digits = formatted.replace(/\D/g, '')
    if (digits.length !== 10) return
    setBizChecking(true)
    setBizStatus(null)
    try {
      const res = await fetch('/api/v1/business/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_number: digits }),
      })
      const data = await res.json()
      setBizStatus({ status: data.status, status_text: data.status_text })
    } catch {
      setBizStatus({ status: 'api_error', status_text: '조회 중 오류가 발생했습니다.' })
    } finally {
      setBizChecking(false)
    }
  }

  const allAgreed = agreeTerms && agreePrivacy
  const pwMatch = password === confirm || confirm === ''

  const handleAllAgree = () => {
    const next = !allAgreed
    setAgreeTerms(next)
    setAgreePrivacy(next)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!allAgreed || !pwMatch) return
    if (userType === 'enterprise' && !isBusinessNumberValid) {
      setError('사업자등록번호를 올바르게 입력해 주세요. (10자리)')
      return
    }
    setError('')
    setLoading(true)
    try {
      const body: Record<string, string> = { email, username, password, user_type: userType }
      if (userType === 'enterprise') body.business_number = businessNumber.replace(/\D/g, '')
      const phoneDigits = phoneNumber.replace(/\D/g, '')
      if (phoneDigits.length >= 10) body.phone_number = phoneDigits
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await safeJson(res)
      if (!res.ok) throw new Error(data.detail ?? '회원가입 실패')
      setSentEmail(email)
      setEmailSent(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '회원가입 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  /* GitHub Pages 데모 모드: 회원가입 불가 안내 */
  if (IS_GITHUB_PAGES) {
    return (
      <div className="auth-email-sent">
        <div className="auth-email-sent-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <h3 className="auth-email-sent-title">데모 모드</h3>
        <p className="auth-email-sent-desc">
          현재 데모 환경에서는 회원가입을 지원하지 않습니다.<br/>
          테스트 계정으로 로그인해 기능을 체험해 보세요.
        </p>
        <div className="auth-email-sent-tip">
          test@test.com &nbsp;/&nbsp; 12345678ab
        </div>
        <button type="button" className="auth-submit-btn" style={{ marginTop: 8 }} onClick={onSwitchToLogin}>
          로그인 화면으로
        </button>
      </div>
    )
  }

  if (emailSent) {
    return (
      <div className="auth-email-sent">
        <div className="auth-email-sent-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.5">
            <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
          </svg>
        </div>
        <h3 className="auth-email-sent-title">이메일을 확인해 주세요</h3>
        <p className="auth-email-sent-desc">
          <strong>{sentEmail}</strong>으로 인증 메일을 보냈습니다.<br />
          메일함에서 <strong>이메일 인증하기</strong> 버튼을 클릭하면<br />
          로그인할 수 있습니다.
        </p>
        <div className="auth-email-sent-tip">
          메일이 보이지 않으면 스팸 폴더를 확인해 주세요.
        </div>
        <button type="button" className="auth-submit-btn" style={{ marginTop: 8 }} onClick={onSwitchToLogin}>
          로그인 화면으로 이동
        </button>
      </div>
    )
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      {error && (
        <div className="auth-error-banner">
          {error.split('\n').map((line, i) => <div key={i}>{line}</div>)}
        </div>
      )}

      {/* 계정 유형 선택 */}
      <div className="auth-field">
        <label className="auth-label">계정 유형</label>
        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <button
            type="button"
            onClick={() => setUserType('personal')}
            style={{
              flex: 1, padding: '12px 8px', borderRadius: 10,
              border: `1.5px solid ${userType === 'personal' ? 'var(--accent)' : 'var(--border)'}`,
              background: userType === 'personal' ? 'rgba(37,99,235,0.06)' : 'var(--bg-input)',
              cursor: 'pointer', textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 22, marginBottom: 4 }}>👤</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: userType === 'personal' ? 'var(--accent)' : 'var(--text-primary)' }}>개인 사용자</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>계약서 분석 · AI 챗봇</div>
          </button>
          <button
            type="button"
            onClick={() => setUserType('enterprise')}
            style={{
              flex: 1, padding: '12px 8px', borderRadius: 10,
              border: `1.5px solid ${userType === 'enterprise' ? 'var(--accent)' : 'var(--border)'}`,
              background: userType === 'enterprise' ? 'rgba(37,99,235,0.06)' : 'var(--bg-input)',
              cursor: 'pointer', textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 22, marginBottom: 4 }}>🏢</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: userType === 'enterprise' ? 'var(--accent)' : 'var(--text-primary)' }}>기업/법인</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>팀 관리 · 대량 분석</div>
          </button>
        </div>
      </div>

      <div className="auth-field">
        <label className="auth-label">이름 (닉네임)</label>
        <input type="text" className="auth-input" placeholder="홍길동"
          value={username} onChange={(e) => setUsername(e.target.value)} required autoComplete="name" />
      </div>

      <div className="auth-field">
        <label className="auth-label">이메일</label>
        <input type="email" className="auth-input" placeholder="example@email.com"
          value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
      </div>

      <div className="auth-field">
        <label className="auth-label">전화번호 <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>(선택 — 전자서명 수신용)</span></label>
        <input type="tel" className="auth-input" placeholder="010-0000-0000"
          value={phoneNumber} onChange={(e) => setPhoneNumber(formatPhone(e.target.value))} maxLength={13} autoComplete="tel" />
      </div>

      <div className="auth-field">
        <label className="auth-label">비밀번호</label>
        <div className="auth-input-wrap">
          <input type={showPw ? 'text' : 'password'} className="auth-input"
            placeholder="8자 이상 입력하세요" value={password}
            onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
          <button type="button" className="auth-pw-toggle" onClick={() => setShowPw((v) => !v)}>
            {showPw ? '🙈' : '👁'}
          </button>
        </div>
      </div>

      <div className="auth-field">
        <label className="auth-label">비밀번호 확인</label>
        <div className="auth-input-wrap">
          <input type={showConfirm ? 'text' : 'password'}
            className={`auth-input${confirm && !pwMatch ? ' auth-input-error' : ''}`}
            placeholder="비밀번호를 다시 입력하세요" value={confirm}
            onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" />
          <button type="button" className="auth-pw-toggle" onClick={() => setShowConfirm((v) => !v)}>
            {showConfirm ? '🙈' : '👁'}
          </button>
        </div>
        {confirm && !pwMatch && <p className="auth-field-error">비밀번호가 일치하지 않습니다.</p>}
      </div>

      {userType === 'enterprise' && (
        <div className="auth-field">
          <label className="auth-label">사업자등록번호</label>
          <input
            type="text"
            className={`auth-input${bizStatus && bizStatus.status === 'invalid_checksum' ? ' auth-input-error' : ''}`}
            placeholder="000-00-00000"
            value={businessNumber}
            onChange={(e) => {
              const formatted = formatBusinessNumber(e.target.value)
              setBusinessNumber(formatted)
              setBizStatus(null)
              if (formatted.replace(/\D/g, '').length === 10) checkBusinessNumber(formatted)
            }}
            required={userType === 'enterprise'}
            maxLength={12}
            autoComplete="off"
          />
          {bizChecking && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>국세청 조회 중...</p>
          )}
          {bizStatus && !bizChecking && (() => {
            const colorMap: Record<string, string> = {
              active: '#16a34a',
              checksum_only: '#2563eb',
              closed: '#dc2626',
              suspended: '#d97706',
              invalid_checksum: '#dc2626',
              not_found: '#dc2626',
              api_error: '#d97706',
              unknown: '#6b7280',
            }
            const iconMap: Record<string, string> = {
              active: '✓',
              checksum_only: '✓',
              closed: '✗',
              suspended: '⚠',
              invalid_checksum: '✗',
              not_found: '✗',
              api_error: '⚠',
              unknown: '?',
            }
            const color = colorMap[bizStatus.status] ?? '#6b7280'
            const icon = iconMap[bizStatus.status] ?? '?'
            return (
              <p style={{ fontSize: 12, color, marginTop: 4, fontWeight: 600 }}>
                {icon} {bizStatus.status_text}
              </p>
            )
          })()}
        </div>
      )}

      <div className="auth-agree-box">
        <label className="auth-check-row auth-check-all">
          <input type="checkbox" checked={allAgreed} onChange={handleAllAgree} />
          <span className="auth-checkmark" />
          <span className="auth-check-label auth-check-all-label">전체 동의</span>
        </label>
        <div className="auth-agree-divider" />
        <label className="auth-check-row">
          <input type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} />
          <span className="auth-checkmark" />
          <span className="auth-check-label"><Link to="/terms" target="_blank" className="auth-link">[필수] 이용약관</Link>에 동의합니다</span>
        </label>
        <label className="auth-check-row">
          <input type="checkbox" checked={agreePrivacy} onChange={(e) => setAgreePrivacy(e.target.checked)} />
          <span className="auth-checkmark" />
          <span className="auth-check-label"><Link to="/privacy" target="_blank" className="auth-link">[필수] 개인정보처리방침</Link>에 동의합니다</span>
        </label>
      </div>

      <button type="submit" className="auth-submit-btn"
        disabled={
          !allAgreed || !pwMatch || loading ||
          (userType === 'enterprise' && (
            !isBusinessNumberValid ||
            bizChecking ||
            bizStatus?.status === 'invalid_checksum' ||
            bizStatus?.status === 'closed' ||
            bizStatus?.status === 'not_found'
          ))
        }>
        {loading ? '가입 중...' : '회원가입'}
      </button>

      <div className="auth-divider"><span>또는 소셜 계정으로 시작하기</span></div>
      <SocialButtons />
    </form>
  )
}

/* ── 아이디 찾기 폼 ── */
function FindIdForm({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/v1/auth/find-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await safeJson(res)
      if (!res.ok) throw new Error(data.detail ?? '오류가 발생했습니다.')
      setDone(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-form">
      {/* 헤더 */}
      <div style={{ marginBottom: 24 }}>
        <button type="button" onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 16 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          로그인으로 돌아가기
        </button>
        <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>아이디 찾기</h3>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>가입 시 사용한 이메일을 입력하면 계정 정보를 보내드립니다.</p>
      </div>

      {done ? (
        <div className="auth-email-sent">
          <div className="auth-email-sent-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.5">
              <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
            </svg>
          </div>
          <h3 className="auth-email-sent-title">메일을 확인해 주세요</h3>
          <p className="auth-email-sent-desc">
            <strong>{email}</strong>으로<br/>아이디(닉네임) 정보를 발송했습니다.
          </p>
          <div className="auth-email-sent-tip">메일이 보이지 않으면 스팸 폴더를 확인해 주세요.</div>
          <button type="button" className="auth-submit-btn" style={{ marginTop: 8 }} onClick={onBack}>
            로그인으로 이동
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {error && <div className="auth-error-banner">{error}</div>}
          <div className="auth-field">
            <label className="auth-label">가입 이메일</label>
            <input type="email" className="auth-input" placeholder="example@email.com"
              value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
          </div>
          <button type="submit" className="auth-submit-btn" disabled={loading} style={{ marginTop: 4 }}>
            {loading ? '전송 중...' : '아이디 찾기'}
          </button>
        </form>
      )}
    </div>
  )
}

/* ── 비밀번호 찾기 폼 ── */
function ForgotPasswordForm({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/v1/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await safeJson(res)
      if (!res.ok) throw new Error(data.detail ?? '오류가 발생했습니다.')
      setDone(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-form">
      {/* 헤더 */}
      <div style={{ marginBottom: 24 }}>
        <button type="button" onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 16 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          로그인으로 돌아가기
        </button>
        <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>비밀번호 찾기</h3>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>이메일로 비밀번호 재설정 링크를 보내드립니다. (유효시간 1시간)</p>
      </div>

      {done ? (
        <div className="auth-email-sent">
          <div className="auth-email-sent-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.5">
              <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
            </svg>
          </div>
          <h3 className="auth-email-sent-title">재설정 링크를 발송했습니다</h3>
          <p className="auth-email-sent-desc">
            <strong>{email}</strong>으로<br/>비밀번호 재설정 링크를 보냈습니다.<br/>링크는 <strong>1시간</strong> 동안 유효합니다.
          </p>
          <div className="auth-email-sent-tip">메일이 보이지 않으면 스팸 폴더를 확인해 주세요.</div>
          <button type="button" className="auth-submit-btn" style={{ marginTop: 8 }} onClick={onBack}>
            로그인으로 이동
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {error && <div className="auth-error-banner">{error}</div>}
          <div className="auth-field">
            <label className="auth-label">가입 이메일</label>
            <input type="email" className="auth-input" placeholder="example@email.com"
              value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
          </div>
          <button type="submit" className="auth-submit-btn" disabled={loading} style={{ marginTop: 4 }}>
            {loading ? '전송 중...' : '비밀번호 재설정 메일 받기'}
          </button>
        </form>
      )}
    </div>
  )
}

/* ── 소셜 버튼 (공통) ── */
function SocialButtons() {
  const navigate = useNavigate()
  const goComingSoon = () => navigate('/coming-soon')

  return (
    <div className="auth-social-btns">
      <button type="button" className="auth-social-btn auth-kakao" onClick={goComingSoon}>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M9 1.5C4.858 1.5 1.5 4.134 1.5 7.379c0 2.093 1.393 3.933 3.504 5.004l-.894 3.268c-.08.29.254.52.504.348l3.807-2.518A8.97 8.97 0 009 13.258c4.142 0 7.5-2.634 7.5-5.879C16.5 4.134 13.142 1.5 9 1.5z" fill="currentColor"/>
        </svg>
        카카오로 계속하기
      </button>
      <button type="button" className="auth-social-btn auth-google" onClick={goComingSoon}>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
          <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.859-3.048.859-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
          <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
          <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
        </svg>
        Google로 계속하기
      </button>
    </div>
  )
}
