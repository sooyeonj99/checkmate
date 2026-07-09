import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../utils/apiFetch'

type Step = 'verify' | 'edit'

export default function ProfilePage() {
 const navigate = useNavigate()
 const { user, login } = useAuth()

 const [step, setStep] = useState<Step>('verify')

 // Step 1 — 비밀번호 확인
 const [password, setPassword] = useState('')
 const [verifyError, setVerifyError] = useState('')
 const [verifying, setVerifying] = useState(false)

 // Step 2 — 정보 수정
 const [username, setUsername] = useState(user?.username ?? '')
 const [phone, setPhone] = useState('')
 const [newPassword, setNewPassword] = useState('')
 const [newPasswordConfirm, setNewPasswordConfirm] = useState('')
 const [editError, setEditError] = useState('')
 const [editMsg, setEditMsg] = useState('')
 const [saving, setSaving] = useState(false)

 const handleVerify = async () => {
 if (!password) { setVerifyError('비밀번호를 입력해주세요.'); return }
 setVerifying(true); setVerifyError('')
 try {
 const res = await apiFetch('/api/v1/users/verify-password', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ password }),
 })
 if (res.ok) {
 // 현재 전화번호 로드
 const meRes = await apiFetch('/api/v1/users/me')
 if (meRes.ok) {
 const me = await meRes.json()
 setPhone(me.phone_number ?? '')
 setUsername(me.username ?? '')
 }
 setStep('edit')
 } else {
 const d = await res.json()
 setVerifyError(d.detail ?? '비밀번호가 올바르지 않습니다.')
 }
 } catch {
 setVerifyError('오류가 발생했습니다. 다시 시도해주세요.')
 } finally {
 setVerifying(false)
 }
 }

 const handleSave = async () => {
 setEditError('')
 if (newPassword && newPassword !== newPasswordConfirm) {
 setEditError('새 비밀번호가 일치하지 않습니다.')
 return
 }
 if (newPassword && newPassword.length < 8) {
 setEditError('비밀번호는 8자 이상이어야 합니다.')
 return
 }
 setSaving(true)
 try {
 const body: Record<string, string> = { username, phone_number: phone }
 if (newPassword) body.new_password = newPassword

 const res = await apiFetch('/api/v1/users/profile', {
 method: 'PUT',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify(body),
 })
 const data = await res.json()
 if (res.ok) {
 // AuthContext의 user 정보 업데이트 (토큰은 그대로 유지)
 const token = localStorage.getItem('cm_token') ?? ''
 login(token, data.user)
 setEditMsg('정보가 성공적으로 수정되었습니다.')
 setNewPassword(''); setNewPasswordConfirm('')
 setTimeout(() => setEditMsg(''), 4000)
 } else {
 setEditError(data.detail ?? '수정 중 오류가 발생했습니다.')
 }
 } catch {
 setEditError('오류가 발생했습니다.')
 } finally {
 setSaving(false)
 }
 }

 return (
 <div style={{
 minHeight: '100vh', background: 'var(--bg-page)',
 display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
 }}>
 <div style={{ width: '100%', maxWidth: 460 }}>

 {/* 뒤로가기 */}
 <button
 onClick={() => navigate(-1)}
 style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6 }}
 >
 ← 뒤로
 </button>

 <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: '36px 32px' }}>

 {/* 헤더 */}
 <div style={{ textAlign: 'center', marginBottom: 32 }}>
 <div style={{
 width: 64, height: 64, borderRadius: '50%',
 background: 'rgba(37,99,235,0.12)', border: '2px solid rgba(37,99,235,0.25)',
 display: 'flex', alignItems: 'center', justifyContent: 'center',
 fontSize: 28, fontWeight: 800, color: 'var(--accent)',
 margin: '0 auto 14px',
 }}>
 {user?.username.charAt(0).toUpperCase()}
 </div>
 <h1 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>
 {step === 'verify' ? '내 정보 수정' : user?.username}
 </h1>
 <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
 {step === 'verify'
 ? '보안을 위해 현재 비밀번호를 먼저 확인합니다'
 : user?.email}
 </p>
 </div>

 {/* Step 1: 비밀번호 확인 */}
 {step === 'verify' && (
 <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
 <div>
 <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 6 }}>
 현재 비밀번호
 </label>
 <input
 type="password"
 value={password}
 onChange={e => setPassword(e.target.value)}
 onKeyDown={e => e.key === 'Enter' && handleVerify()}
 placeholder="비밀번호 입력"
 autoFocus
 style={{
 width: '100%', boxSizing: 'border-box',
 padding: '12px 16px', borderRadius: 12,
 border: `1.5px solid ${verifyError ? 'rgba(239,68,68,0.5)' : 'var(--border)'}`,
 background: 'var(--bg-input)', color: 'var(--text)', fontSize: 15,
 }}
 />
 {verifyError && (
 <p style={{ margin: '6px 0 0', fontSize: 12, color: '#ef4444' }}>{verifyError}</p>
 )}
 </div>

 <button
 onClick={handleVerify}
 disabled={verifying}
 style={{
 padding: '14px', borderRadius: 12, border: 'none',
 background: 'var(--accent)', color: '#fff',
 fontSize: 15, fontWeight: 700, cursor: verifying ? 'not-allowed' : 'pointer',
 opacity: verifying ? 0.7 : 1,
 }}
 >
 {verifying ? '확인 중...' : '확인'}
 </button>
 </div>
 )}

 {/* Step 2: 정보 수정 */}
 {step === 'edit' && (
 <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

 {/* 이메일 (수정 불가) */}
 <div>
 <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
 이메일 <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>(변경 불가)</span>
 </label>
 <div style={{
 padding: '12px 16px', borderRadius: 12,
 border: '1.5px solid var(--border)', background: 'rgba(100,116,139,0.05)',
 color: 'var(--text-muted)', fontSize: 14,
 }}>
 {user?.email}
 </div>
 </div>

 {/* 닉네임 */}
 <div>
 <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 6 }}>
 닉네임
 </label>
 <input
 type="text"
 value={username}
 onChange={e => setUsername(e.target.value)}
 placeholder="닉네임"
 style={{
 width: '100%', boxSizing: 'border-box',
 padding: '12px 16px', borderRadius: 12,
 border: '1.5px solid var(--border)',
 background: 'var(--bg-input)', color: 'var(--text)', fontSize: 15,
 }}
 />
 </div>

 {/* 전화번호 */}
 <div>
 <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 6 }}>
 전화번호 <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>(선택)</span>
 </label>
 <input
 type="tel"
 value={phone}
 onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
 placeholder="010xxxxxxxx"
 maxLength={11}
 style={{
 width: '100%', boxSizing: 'border-box',
 padding: '12px 16px', borderRadius: 12,
 border: '1.5px solid var(--border)',
 background: 'var(--bg-input)', color: 'var(--text)', fontSize: 15,
 }}
 />
 </div>

 {/* 구분선 */}
 <div style={{ borderTop: '1px solid var(--border)', paddingTop: 18 }}>
 <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>
 비밀번호 변경 <span style={{ fontWeight: 400, fontSize: 11, color: 'var(--text-muted)' }}>(변경하지 않으려면 비워두세요)</span>
 </div>

 <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
 <input
 type="password"
 value={newPassword}
 onChange={e => setNewPassword(e.target.value)}
 placeholder="새 비밀번호 (8자 이상)"
 style={{
 width: '100%', boxSizing: 'border-box',
 padding: '12px 16px', borderRadius: 12,
 border: '1.5px solid var(--border)',
 background: 'var(--bg-input)', color: 'var(--text)', fontSize: 15,
 }}
 />
 <input
 type="password"
 value={newPasswordConfirm}
 onChange={e => setNewPasswordConfirm(e.target.value)}
 placeholder="새 비밀번호 확인"
 style={{
 width: '100%', boxSizing: 'border-box',
 padding: '12px 16px', borderRadius: 12,
 border: `1.5px solid ${newPasswordConfirm && newPassword !== newPasswordConfirm ? 'rgba(239,68,68,0.5)' : 'var(--border)'}`,
 background: 'var(--bg-input)', color: 'var(--text)', fontSize: 15,
 }}
 />
 {newPasswordConfirm && newPassword !== newPasswordConfirm && (
 <p style={{ margin: 0, fontSize: 12, color: '#ef4444' }}>비밀번호가 일치하지 않습니다.</p>
 )}
 </div>
 </div>

 {/* 에러 / 성공 */}
 {editError && (
 <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#dc2626', fontSize: 13 }}>
 {editError}
 </div>
 )}
 {editMsg && (
 <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.2)', color: '#16a34a', fontSize: 13, fontWeight: 600 }}>
 {editMsg}
 </div>
 )}

 {/* 저장 버튼 */}
 <button
 onClick={handleSave}
 disabled={saving}
 style={{
 padding: '14px', borderRadius: 12, border: 'none',
 background: 'var(--accent)', color: '#fff',
 fontSize: 15, fontWeight: 700,
 cursor: saving ? 'not-allowed' : 'pointer',
 opacity: saving ? 0.7 : 1,
 }}
 >
 {saving ? '저장 중...' : '수정 완료'}
 </button>

 <button
 onClick={() => { setStep('verify'); setPassword('') }}
 style={{
 padding: '10px', borderRadius: 12,
 border: '1px solid var(--border)', background: 'transparent',
 color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer',
 }}
 >
 비밀번호 재확인
 </button>
 </div>
 )}

 </div>
 </div>
 </div>
 )
}
