import { useState } from 'react'
import { Link } from 'react-router-dom'

const CONTRACT_TYPES = [
  '근로계약서', '임대차계약서', '용역계약서', '매매계약서', '프리랜서계약서', '비밀유지계약서', '기타',
]

export default function GeneratePage() {
  const [description, setDescription] = useState('')
  const [contractType, setContractType] = useState('')
  const [result, setResult] = useState<{ contract_text: string; contract_type: string; suggested_title: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const token = localStorage.getItem('cm_token')

  const generate = async () => {
    if (!description.trim()) { setError('계약서 내용을 설명해 주세요.'); return }
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/v1/contracts/generate', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, contract_type: contractType || undefined }),
      })
      if (res.ok) setResult(await res.json())
      else { const d = await res.json(); setError(d.detail || '생성 실패') }
    } catch { setError('서버 오류가 발생했습니다.') }
    setLoading(false)
  }

  const copyText = () => {
    if (!result) return
    navigator.clipboard.writeText(result.contract_text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadText = () => {
    if (!result) return
    const blob = new Blob([result.contract_text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${result.suggested_title || '계약서'}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '0 0 60px' }}>
      <header style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', padding: '16px 32px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <Link to="/dashboard" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          color: 'var(--accent)', fontSize: 13, textDecoration: 'none', fontWeight: 700,
          padding: '6px 14px', borderRadius: 10, background: 'rgba(90,63,192,0.08)',
          border: '1px solid rgba(90,63,192,0.18)',
        }}>← 대시보드</Link>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', margin: 0, flex: 1 }}>AI 계약서 생성기</h1>
        <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: 'rgba(37,99,235,0.1)', color: 'var(--accent)' }}>Gemini AI</span>
      </header>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>
        {/* 안내 */}
        <div style={{ background: 'rgba(37,99,235,0.05)', border: '1.5px solid rgba(37,99,235,0.15)', borderRadius: 14, padding: '16px 20px', marginBottom: 28, fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          계약서의 목적, 당사자, 주요 조건을 자유롭게 설명하면 AI가 초안을 생성합니다.
          생성된 계약서는 참고용이며, 법률 전문가 검토를 권장합니다.
        </div>

        {/* 입력 영역 */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '24px', marginBottom: 20 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 8, display: 'block' }}>계약서 유형 (선택)</label>
            <select value={contractType} onChange={e => setContractType(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 14 }}>
              <option value="">자동 감지</option>
              {CONTRACT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 8, display: 'block' }}>
              계약서 내용 설명
              <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8 }}>당사자, 목적, 주요 조건 등을 자세히 설명할수록 좋습니다</span>
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="예) A회사와 B회사 간의 소프트웨어 개발 용역 계약서입니다. 개발 기간은 6개월, 총 계약금은 3000만원이며 계약금 30%, 중도금 40%, 잔금 30% 구조입니다. 지적재산권은 A회사에 귀속됩니다."
              rows={8}
              style={{ width: '100%', padding: '14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 14, lineHeight: 1.6, resize: 'vertical', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {error && <div style={{ color: '#ef4444', fontSize: 13, marginBottom: 16, fontWeight: 600 }}>{error}</div>}

        <button onClick={generate} disabled={loading || !description.trim()}
          style={{
            width: '100%', padding: '14px', borderRadius: 12, border: 'none',
            background: description.trim() ? 'var(--accent)' : 'var(--border)',
            color: '#fff', fontWeight: 700, fontSize: 16, cursor: 'pointer', marginBottom: 32,
            opacity: loading ? 0.7 : 1,
          }}>
          {loading ? 'AI가 계약서를 생성하는 중...' : 'AI로 계약서 생성하기'}
        </button>

        {/* 결과 */}
        {result && (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{result.suggested_title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{result.contract_type}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={copyText}
                  style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
                  {copied ? '복사됨!' : '복사'}
                </button>
                <button onClick={downloadText}
                  style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 700 }}>
                  다운로드
                </button>
              </div>
            </div>
            <div style={{ padding: '20px 24px', maxHeight: 560, overflowY: 'auto' }}>
              <pre style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.8, whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}>
                {result.contract_text}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
