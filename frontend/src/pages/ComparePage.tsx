import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

interface SavedItem {
  id: number
  filename: string
  contract_type: string
  score: number
  grade: string
  saved_at: string
}

interface CompareClause {
  article: string
  title_a: string
  title_b: string
  risk_a: string
  risk_b: string
  changed: boolean
}

interface CompareResult {
  filename_a: string
  filename_b: string
  score_a: number
  score_b: number
  grade_a: string
  grade_b: string
  clause_diffs: CompareClause[]
  ai_verdict: string
  summary: string
}

export default function ComparePage() {
  const [contracts, setContracts] = useState<SavedItem[]>([])
  const [selectedA, setSelectedA] = useState<number | null>(null)
  const [selectedB, setSelectedB] = useState<number | null>(null)
  const [result, setResult] = useState<CompareResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const token = localStorage.getItem('cm_token')

  useEffect(() => {
    fetch('/api/v1/contracts/saved', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(setContracts).catch(() => {})
  }, [])

  const compare = async () => {
    if (!selectedA || !selectedB || selectedA === selectedB) {
      setError('서로 다른 계약서 두 개를 선택하세요.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/v1/contracts/compare', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ saved_id_a: selectedA, saved_id_b: selectedB }),
      })
      if (res.ok) setResult(await res.json())
      else { const d = await res.json(); setError(d.detail || '비교 실패') }
    } catch { setError('서버 오류가 발생했습니다.') }
    setLoading(false)
  }

  const gradeColor = (g: string) =>
    g === '위험' ? '#ef4444' : g === '주의' ? '#f59e0b' : '#22c55e'

  const riskColor = (r: string) =>
    r === 'danger' ? '#ef4444' : r === 'warn' ? '#f59e0b' : '#22c55e'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '0 0 60px' }}>
      <header style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', padding: '16px 32px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <Link to="/dashboard" style={{ color: 'var(--text-muted)', fontSize: 13, textDecoration: 'none' }}>← 대시보드</Link>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', margin: 0, flex: 1 }}>계약서 비교</h1>
      </header>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 24px' }}>
        {/* 선택 영역 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
          {(['A', 'B'] as const).map(side => {
            const selected = side === 'A' ? selectedA : selectedB
            const setSelected = side === 'A' ? setSelectedA : setSelectedB
            return (
              <div key={side} style={{ background: 'var(--bg-card)', border: `2px solid ${selected ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 14, padding: '20px' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 12 }}>계약서 {side}</div>
                {contracts.length === 0 ? (
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>저장된 계약서가 없습니다.</div>
                ) : (
                  <select value={selected ?? ''} onChange={e => setSelected(Number(e.target.value) || null)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 14 }}>
                    <option value="">선택하세요</option>
                    {contracts.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.filename} ({c.grade} {c.score}점)
                      </option>
                    ))}
                  </select>
                )}
                {selected && (() => {
                  const c = contracts.find(x => x.id === selected)
                  return c ? (
                    <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 10, background: 'var(--bg)', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{c.filename}</div>
                      <div style={{ fontSize: 12, color: gradeColor(c.grade), fontWeight: 700, marginTop: 4 }}>
                        {c.grade} · {c.score}점
                      </div>
                    </div>
                  ) : null
                })()}
              </div>
            )
          })}
        </div>

        {error && <div style={{ color: '#ef4444', fontSize: 13, marginBottom: 16, fontWeight: 600 }}>{error}</div>}

        <button onClick={compare} disabled={loading || !selectedA || !selectedB}
          style={{
            width: '100%', padding: '14px', borderRadius: 12, border: 'none',
            background: selectedA && selectedB ? 'var(--accent)' : 'var(--border)',
            color: '#fff', fontWeight: 700, fontSize: 16, cursor: 'pointer', marginBottom: 32,
            opacity: loading ? 0.7 : 1,
          }}>
          {loading ? 'AI가 비교 중...' : '비교 분석 시작'}
        </button>

        {/* 결과 */}
        {result && (
          <>
            {/* 스코어 비교 헤더 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 16, marginBottom: 24, alignItems: 'center' }}>
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>계약서 A</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{result.filename_a}</div>
                <div style={{ fontSize: 36, fontWeight: 900, color: gradeColor(result.grade_a) }}>{result.score_a}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: gradeColor(result.grade_a) }}>{result.grade_a}</div>
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-muted)' }}>VS</div>
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>계약서 B</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{result.filename_b}</div>
                <div style={{ fontSize: 36, fontWeight: 900, color: gradeColor(result.grade_b) }}>{result.score_b}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: gradeColor(result.grade_b) }}>{result.grade_b}</div>
              </div>
            </div>

            {/* AI 분석 의견 */}
            <div style={{ background: 'rgba(37,99,235,0.04)', border: '1.5px solid rgba(37,99,235,0.2)', borderRadius: 14, padding: '20px 24px', marginBottom: 24 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)', marginBottom: 10 }}>AI 분석 의견</div>
              <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{result.ai_verdict}</div>
            </div>

            {/* 조항별 비교 */}
            {result.clause_diffs.length > 0 && (
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>조항별 비교</div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg)' }}>
                        <th style={{ padding: '10px 16px', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>조항</th>
                        <th style={{ padding: '10px 16px', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>계약서 A</th>
                        <th style={{ padding: '10px 16px', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>계약서 B</th>
                        <th style={{ padding: '10px 16px', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>변경</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.clause_diffs.map((c, i) => (
                        <tr key={i} style={{ background: c.changed ? 'rgba(245,158,11,0.04)' : 'transparent', borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-muted)' }}>{c.article}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontSize: 13, color: 'var(--text)', marginBottom: 3 }}>{c.title_a}</div>
                            <span style={{ fontSize: 11, fontWeight: 700, color: riskColor(c.risk_a) }}>{c.risk_a}</span>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontSize: 13, color: 'var(--text)', marginBottom: 3 }}>{c.title_b}</div>
                            <span style={{ fontSize: 11, fontWeight: 700, color: riskColor(c.risk_b) }}>{c.risk_b}</span>
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            {c.changed ? <span style={{ fontSize: 18 }}>⚠️</span> : <span style={{ fontSize: 16, color: '#22c55e' }}>✓</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
