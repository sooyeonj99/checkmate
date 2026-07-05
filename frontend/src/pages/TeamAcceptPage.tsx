import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function TeamAcceptPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { isLoggedIn } = useAuth()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [msg, setMsg] = useState('')
  const token = params.get('token')

  useEffect(() => {
    if (!token) { setStatus('error'); setMsg('초대 링크가 올바르지 않습니다.'); return }
    if (!isLoggedIn) {
      navigate(`/auth?redirect=/team/accept?token=${token}`)
      return
    }
    const authToken = localStorage.getItem('cm_token')
    fetch(`/api/v1/team/accept?token=${token}`, { headers: { Authorization: `Bearer ${authToken}` } })
      .then(async res => {
        if (res.ok) { setStatus('success'); setMsg('팀에 합류했습니다!') }
        else { const d = await res.json(); setStatus('error'); setMsg(d.detail || '오류가 발생했습니다.') }
      })
      .catch(() => { setStatus('error'); setMsg('네트워크 오류가 발생했습니다.') })
  }, [token, isLoggedIn, navigate])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-page)' }}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 20, padding: '40px 32px', textAlign: 'center', maxWidth: 400, width: '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
        {status === 'loading' && <><div style={{ fontSize: 40, marginBottom: 16 }}>⏳</div><p style={{ color: 'var(--text)' }}>처리 중...</p></>}
        {status === 'success' && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <h2 style={{ color: 'var(--text)', marginBottom: 8 }}>팀 합류 완료</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>{msg}</p>
            <button onClick={() => navigate('/dashboard')} style={{ padding: '12px 28px', borderRadius: 12, background: 'var(--accent)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
              대시보드로 이동
            </button>
          </>
        )}
        {status === 'error' && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
            <h2 style={{ color: 'var(--text)', marginBottom: 8 }}>오류</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>{msg}</p>
            <button onClick={() => navigate('/')} style={{ padding: '12px 28px', borderRadius: 12, background: 'var(--accent)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
              홈으로 이동
            </button>
          </>
        )}
      </div>
    </div>
  )
}
