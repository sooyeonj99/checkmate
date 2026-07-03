import { useState } from 'react'
import SignaturePad from './SignaturePad'

interface Props {
  contractId: string
  contractName: string
  defaultTab?: 'self' | 'request'
  onClose: () => void
  onDone: (msg: string) => void
}

type Tab = 'self' | 'request'

export default function SigningModal({ contractId, contractName, defaultTab, onClose, onDone }: Props) {
  const [tab, setTab] = useState<Tab>(defaultTab ?? 'self')

  // 내가 서명
  const [selfSig, setSelfSig] = useState('')
  const [selfLoading, setSelfLoading] = useState(false)

  // 서명 요청
  const [reqSig, setReqSig] = useState('')
  const [reqEmail, setReqEmail] = useState('')
  const [reqMsg, setReqMsg] = useState('')
  const [reqLoading, setReqLoading] = useState(false)

  const token = localStorage.getItem('cm_token')

  const handleSelfSign = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selfSig) return
    setSelfLoading(true)
    try {
      const res = await fetch('/api/v1/signing/self-sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ contract_id: contractId, contract_name: contractName, signature_data: selfSig }),
      })
      if (!res.ok) throw new Error()
      onDone('서명이 저장되었습니다.')
    } catch {
      alert('서명 저장 중 오류가 발생했습니다.')
    } finally {
      setSelfLoading(false)
    }
  }

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reqEmail) return
    setReqLoading(true)
    try {
      const res = await fetch('/api/v1/signing/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          contract_id: contractId,
          contract_name: contractName,
          requestee_email: reqEmail,
          message: reqMsg || null,
          my_signature: reqSig || null,
        }),
      })
      if (!res.ok) throw new Error()
      onDone(`${reqEmail}으로 서명 요청 메일을 발송했습니다.`)
    } catch {
      alert('서명 요청 중 오류가 발생했습니다.')
    } finally {
      setReqLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px',
    }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: 20,
        width: '100%', maxWidth: 520,
        maxHeight: '90vh', overflowY: 'auto',
        padding: '32px 28px',
        border: '1px solid var(--border)',
      }}>
        {/* 헤더 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>전자서명</h3>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>{contractName}</p>
          </div>
          <button type="button" onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--text-muted)', padding: '0 4px' }}>
            ✕
          </button>
        </div>

        {/* 탭 */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {(['self', 'request'] as Tab[]).map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)}
              style={{
                flex: 1, padding: '10px 8px', borderRadius: 10, border: 'none',
                cursor: 'pointer', fontWeight: 700, fontSize: 14,
                background: tab === t ? 'var(--accent)' : 'var(--bg-input)',
                color: tab === t ? '#fff' : 'var(--text-secondary)',
                transition: 'all 0.15s',
              }}>
              {t === 'self' ? '✍️ 내가 서명' : '📨 서명 요청'}
            </button>
          ))}
        </div>

        {/* 내가 서명 */}
        {tab === 'self' && (
          <form onSubmit={handleSelfSign}>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
              계약서에 대한 내 서명을 저장합니다. 법적 효력은 없으나 서명 기록이 보관됩니다.
            </p>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 8 }}>
                서명
              </label>
              <SignaturePad onSave={setSelfSig} height={150} />
            </div>
            <button type="submit"
              disabled={!selfSig || selfLoading}
              style={{
                width: '100%', padding: '14px', borderRadius: 12, border: 'none',
                background: selfSig ? 'var(--accent)' : 'var(--bg-input)',
                color: selfSig ? '#fff' : 'var(--text-muted)',
                fontWeight: 700, fontSize: 15, cursor: selfSig ? 'pointer' : 'not-allowed',
              }}>
              {selfLoading ? '저장 중...' : '서명 저장'}
            </button>
          </form>
        )}

        {/* 서명 요청 */}
        {tab === 'request' && (
          <form onSubmit={handleRequest}>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
              상대방 이메일로 서명 요청 링크를 발송합니다. 상대방이 링크를 열어 서명하면 이메일로 알림을 드립니다.
            </p>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 6 }}>
                상대방 이메일 *
              </label>
              <input type="email" required value={reqEmail} onChange={(e) => setReqEmail(e.target.value)}
                placeholder="counterparty@email.com"
                style={{
                  width: '100%', padding: '11px 14px', borderRadius: 10, boxSizing: 'border-box',
                  border: '1.5px solid var(--border)', background: 'var(--bg-input)',
                  color: 'var(--text)', fontSize: 14,
                }} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 6 }}>
                전달 메시지 (선택)
              </label>
              <textarea value={reqMsg} onChange={(e) => setReqMsg(e.target.value)}
                placeholder="상대방에게 전달할 메시지를 입력하세요..."
                rows={3}
                style={{
                  width: '100%', padding: '11px 14px', borderRadius: 10, boxSizing: 'border-box',
                  border: '1.5px solid var(--border)', background: 'var(--bg-input)',
                  color: 'var(--text)', fontSize: 14, resize: 'vertical',
                }} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 6 }}>
                내 서명 (선택 — 요청 전 미리 서명)
              </label>
              <SignaturePad onSave={setReqSig} height={130} />
            </div>

            <button type="submit"
              disabled={!reqEmail || reqLoading}
              style={{
                width: '100%', padding: '14px', borderRadius: 12, border: 'none',
                background: reqEmail ? 'var(--accent)' : 'var(--bg-input)',
                color: reqEmail ? '#fff' : 'var(--text-muted)',
                fontWeight: 700, fontSize: 15, cursor: reqEmail ? 'pointer' : 'not-allowed',
              }}>
              {reqLoading ? '발송 중...' : '서명 요청 메일 발송'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
