import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

export default function ResetPasswordPage() {
 const [searchParams] = useSearchParams()
 const token = searchParams.get('token') ?? ''
 const navigate = useNavigate()

 const [password, setPassword] = useState('')
 const [confirm, setConfirm] = useState('')
 const [showPw, setShowPw] = useState(false)
 const [showConfirm, setShowConfirm] = useState(false)
 const [loading, setLoading] = useState(false)
 const [error, setError] = useState('')
 const [done, setDone] = useState(false)

 const pwMatch = password === confirm || confirm === ''
 const canSubmit = password.length >= 8 && password === confirm && !loading

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault()
 if (!canSubmit) return
 setError('')
 setLoading(true)
 try {
 const res = await fetch('/api/v1/auth/reset-password', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ token, new_password: password }),
 })
 const data = await res.json()
 if (!res.ok) throw new Error(data.detail ?? '오류가 발생했습니다.')
 setDone(true)
 } catch (e: unknown) {
 setError(e instanceof Error ? e.message : '오류가 발생했습니다.')
 } finally {
 setLoading(false)
 }
 }

 return (
 <div className="verify-page">
 <div className="verify-card" style={{ maxWidth: 440 }}>
 {/* Logo */}
 <Link to="/" className="verify-logo">
 <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
 <path d="M12 2L3 7V12C3 16.97 6.84 21.61 12 23C17.16 21.61 21 16.97 21 12V7L12 2Z" fill="url(#rpg)" />
 <path d="M9 12L11 14L15 10" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
 <defs>
 <linearGradient id="rpg" x1="3" y1="2" x2="21" y2="23">
 <stop offset="0%" stopColor="#1e3a8a" />
 <stop offset="100%" stopColor="#2563eb" />
 </linearGradient>
 </defs>
 </svg>
 <span>CHECKMATE</span>
 </Link>

 {!token ? (
 /* 토큰 없음 */
 <>
 <div className="verify-icon error">
 <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
 <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
 </svg>
 </div>
 <h2 className="verify-title">잘못된 접근입니다</h2>
 <p className="verify-desc">비밀번호 재설정 이메일의 링크를 통해 접근해 주세요.</p>
 <Link to="/auth" className="verify-btn primary">로그인 화면으로</Link>
 </>
 ) : done ? (
 /* 완료 */
 <>
 <div className="verify-icon success">
 <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
 <polyline points="20 6 9 17 4 12"/>
 </svg>
 </div>
 <h2 className="verify-title">비밀번호 변경 완료!</h2>
 <p className="verify-desc">새 비밀번호로 로그인하실 수 있습니다.</p>
 <button
 type="button"
 className="verify-btn primary"
 onClick={() => navigate('/auth')}
 >
 로그인하기 →
 </button>
 </>
 ) : (
 /* 폼 */
 <>
 <div style={{ textAlign: 'center', marginBottom: 28 }}>
 <div style={{ fontSize: 40, marginBottom: 12 }}></div>
 <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>새 비밀번호 설정</h2>
 <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>새로 사용할 비밀번호를 입력해 주세요.</p>
 </div>

 <form onSubmit={handleSubmit} style={{ width: '100%' }}>
 {error && (
 <div className="auth-error-banner" style={{ marginBottom: 16 }}>{error}</div>
 )}

 <div className="auth-field">
 <label className="auth-label">새 비밀번호</label>
 <div className="auth-input-wrap">
 <input
 type={showPw ? 'text' : 'password'}
 className="auth-input"
 placeholder="8자 이상 입력하세요"
 value={password}
 onChange={e => setPassword(e.target.value)}
 required minLength={8} autoFocus
 />
 <button type="button" className="auth-pw-toggle" onClick={() => setShowPw(v => !v)}>
 {showPw ? '' : ''}
 </button>
 </div>
 {password.length > 0 && password.length < 8 && (
 <p className="auth-field-error">비밀번호는 8자 이상이어야 합니다.</p>
 )}
 </div>

 <div className="auth-field">
 <label className="auth-label">비밀번호 확인</label>
 <div className="auth-input-wrap">
 <input
 type={showConfirm ? 'text' : 'password'}
 className={`auth-input${confirm && !pwMatch ? ' auth-input-error' : ''}`}
 placeholder="비밀번호를 다시 입력하세요"
 value={confirm}
 onChange={e => setConfirm(e.target.value)}
 required
 />
 <button type="button" className="auth-pw-toggle" onClick={() => setShowConfirm(v => !v)}>
 {showConfirm ? '' : ''}
 </button>
 </div>
 {confirm && !pwMatch && (
 <p className="auth-field-error">비밀번호가 일치하지 않습니다.</p>
 )}
 </div>

 <button
 type="submit"
 className="auth-submit-btn"
 disabled={!canSubmit}
 style={{ marginTop: 8 }}
 >
 {loading ? '변경 중...' : '비밀번호 변경하기'}
 </button>
 </form>

 <p style={{ marginTop: 16, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
 <Link to="/auth" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
 ← 로그인으로 돌아가기
 </Link>
 </p>
 </>
 )}
 </div>
 </div>
 )
}
