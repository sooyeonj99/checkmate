import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import SignaturePad from '../components/SignaturePad'

interface SigningInfo {
  id: number
  contract_name: string
  requester_name: string
  message: string | null
  status: string
  is_expired: boolean
  requester_signed: boolean
}

export default function SigningPage() {
  const { token } = useParams<{ token: string }>()
  const [info, setInfo] = useState<SigningInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [sigData, setSigData] = useState('')
  const [signerName, setSignerName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!token) return
    fetch(`/api/v1/signing/public/${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.detail) setError(d.detail)
        else setInfo(d)
      })
      .catch(() => setError('서명 정보를 불러올 수 없습니다.'))
      .finally(() => setLoading(false))
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sigData || !signerName.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/v1/signing/public/${token}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signature_data: sigData, signer_name: signerName }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail ?? '서명 실패')
      setDone(true)
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : '서명 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '40px 16px',
    }}>
      {/* 로고 */}
      <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 40 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'linear-gradient(135deg, #1e3a8a, #2563eb)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18,
        }}>♟</div>
        <span style={{ fontWeight: 800, fontSize: 18, color: 'var(--text)', letterSpacing: 1 }}>CHECKMATE</span>
      </Link>

      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 20,
        padding: '36px 32px',
        width: '100%', maxWidth: 540,
      }}>

        {loading && (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 15 }}>불러오는 중...</p>
        )}

        {error && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <h2 style={{ color: 'var(--text)', marginBottom: 8 }}>서명 링크 오류</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>{error}</p>
          </div>
        )}

        {info && !done && (
          <>
            {/* 상태 확인 */}
            {info.is_expired && (
              <div style={{
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 12, padding: '14px 18px', marginBottom: 24,
                color: '#dc2626', fontSize: 14, fontWeight: 600,
              }}>
                이 서명 링크는 만료되었습니다.
              </div>
            )}
            {info.status === 'signed' && (
              <div style={{
                background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.3)',
                borderRadius: 12, padding: '14px 18px', marginBottom: 24,
                color: '#16a34a', fontSize: 14, fontWeight: 600,
              }}>
                ✓ 이미 서명이 완료된 문서입니다.
              </div>
            )}

            {/* 계약서 정보 */}
            <div style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: 1 }}>
                서명 요청
              </p>
              <h2 style={{ margin: '0 0 10px', fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>
                {info.contract_name}
              </h2>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)' }}>
                <strong>{info.requester_name}</strong>님이 서명을 요청했습니다.
                {info.requester_signed && (
                  <span style={{ marginLeft: 8, color: '#16a34a', fontSize: 12, fontWeight: 700 }}>
                    ✓ 요청자 서명 완료
                  </span>
                )}
              </p>
              {info.message && (
                <div style={{
                  marginTop: 14, background: 'var(--bg-input)',
                  borderRadius: 10, padding: '12px 16px',
                  fontSize: 14, color: 'var(--text)', lineHeight: 1.7,
                  borderLeft: '3px solid var(--accent)',
                }}>
                  {info.message}
                </div>
              )}
            </div>

            {!info.is_expired && info.status !== 'signed' && (
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 8 }}>
                    서명자 이름 *
                  </label>
                  <input
                    type="text" required
                    value={signerName} onChange={(e) => setSignerName(e.target.value)}
                    placeholder="홍길동"
                    style={{
                      width: '100%', padding: '11px 14px', borderRadius: 10, boxSizing: 'border-box',
                      border: '1.5px solid var(--border)', background: 'var(--bg-input)',
                      color: 'var(--text)', fontSize: 14,
                    }}
                  />
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 8 }}>
                    서명 *
                  </label>
                  <SignaturePad onSave={setSigData} height={160} />
                </div>

                <button type="submit"
                  disabled={!sigData || !signerName.trim() || submitting}
                  style={{
                    width: '100%', padding: '15px', borderRadius: 12, border: 'none',
                    background: sigData && signerName ? '#1e3a8a' : 'var(--bg-input)',
                    color: sigData && signerName ? '#fff' : 'var(--text-muted)',
                    fontWeight: 700, fontSize: 16,
                    cursor: sigData && signerName ? 'pointer' : 'not-allowed',
                  }}>
                  {submitting ? '서명 중...' : '서명 완료'}
                </button>

                <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 14 }}>
                  서명 완료 시 요청자에게 이메일로 알림이 발송됩니다.
                </p>
              </form>
            )}
          </>
        )}

        {done && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 64, marginBottom: 20 }}>✅</div>
            <h2 style={{ color: 'var(--text)', marginBottom: 10 }}>서명이 완료되었습니다</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 15, lineHeight: 1.7 }}>
              서명 기록이 저장되었으며<br/>요청자에게 완료 알림이 발송되었습니다.
            </p>
          </div>
        )}
      </div>

      <p style={{ marginTop: 32, fontSize: 12, color: 'var(--text-muted)' }}>
        ⓒ 2026 CHECKMATE — AI 계약서 분석 서비스
      </p>
    </div>
  )
}
