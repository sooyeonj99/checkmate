import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

interface StatsData {
  total_analyzed: number
  total_saved: number
  avg_score: number
  grade_breakdown: { 위험: number; 주의: number; 안전: number }
  type_breakdown: Record<string, number>
  monthly_trend: { month: string; count: number; avg_score: number }[]
  expiring_soon: { id: number; filename: string; expiry_date: string; days_left: number }[]
  signing_sent: number
  signing_received: number
  signing_completed: number
}

export default function StatsPage() {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [months, setMonths] = useState(6)
  const [loading, setLoading] = useState(true)
  const token = localStorage.getItem('cm_token')

  useEffect(() => {
    setLoading(true)
    setStats(null)
    fetch(`/api/v1/stats/me?months=${months}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(data => {
        if (data && typeof data === 'object' && 'total_analyzed' in data) setStats(data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [months])

  const gradeColor = (g: string) =>
    g === '위험' ? '#ef4444' : g === '주의' ? '#f59e0b' : '#22c55e'

  const maxCount = stats?.monthly_trend?.length ? Math.max(...stats.monthly_trend.map(m => m.count), 1) : 1

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '0 0 60px' }}>
      <header style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', padding: '16px 32px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <Link to="/dashboard" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          color: 'var(--accent)', fontSize: 13, textDecoration: 'none', fontWeight: 700,
          padding: '6px 14px', borderRadius: 10, background: 'rgba(90,63,192,0.08)',
          border: '1px solid rgba(90,63,192,0.18)',
        }}>← 대시보드</Link>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', margin: 0, flex: 1 }}>분석 통계</h1>
        <div style={{ display: 'flex', gap: 4 }}>
          {[3, 6, 12].map(m => (
            <button key={m} onClick={() => setMonths(m)} style={{
              padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
              background: months === m ? 'var(--accent)' : 'var(--bg)',
              color: months === m ? '#fff' : 'var(--text-muted)',
            }}>{m}개월</button>
          ))}
        </div>
      </header>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>불러오는 중...</div>
        ) : !stats ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>통계를 불러올 수 없습니다.</div>
        ) : (
          <>
            {/* 요약 카드 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 16, marginBottom: 28 }}>
              {[
                { label: '총 분석', value: stats.total_analyzed, icon: '🔍', color: 'var(--accent)' },
                { label: '저장된 계약', value: stats.total_saved, icon: '💾', color: '#10b981' },
                { label: '평균 위험도', value: `${stats.avg_score}점`, icon: '📊', color: '#f59e0b' },
                { label: '서명 보냄', value: stats.signing_sent, icon: '✉️', color: '#8b5cf6' },
                { label: '서명 완료', value: stats.signing_completed, icon: '✅', color: '#22c55e' },
              ].map(s => (
                <div key={s.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: 26, marginBottom: 8 }}>{s.icon}</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* 위험도 분포 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 24px' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>위험도 분포</div>
                {Object.entries(stats.grade_breakdown).map(([grade, count]) => {
                  const total = Object.values(stats.grade_breakdown).reduce((a, b) => a + b, 0) || 1
                  const pct = Math.round((count / total) * 100)
                  return (
                    <div key={grade} style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: gradeColor(grade) }}>{grade}</span>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{count}건 ({pct}%)</span>
                      </div>
                      <div style={{ height: 10, background: 'var(--border)', borderRadius: 5, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: gradeColor(grade), borderRadius: 5, transition: 'width 0.6s ease' }} />
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* 계약 유형 */}
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 24px' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>계약서 유형</div>
                {Object.keys(stats.type_breakdown).length === 0 ? (
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>데이터가 없습니다.</div>
                ) : Object.entries(stats.type_breakdown).sort(([, a], [, b]) => b - a).slice(0, 5).map(([type, count]) => {
                  const total = Object.values(stats.type_breakdown).reduce((a, b) => a + b, 0) || 1
                  const pct = Math.round((count / total) * 100)
                  return (
                    <div key={type} style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginRight: 8 }}>{type}</span>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>{count}건</span>
                      </div>
                      <div style={{ height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: 'var(--accent)', borderRadius: 4 }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 월별 트렌드 바 차트 */}
            {stats.monthly_trend.length > 0 && (
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 24px', marginBottom: 24 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 20 }}>월별 분석 추이 (최근 {months}개월)</div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 120 }}>
                  {stats.monthly_trend.map(m => {
                    const h = Math.round((m.count / maxCount) * 100)
                    return (
                      <div key={m.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)' }}>{m.count}</div>
                        <div style={{ width: '100%', height: `${Math.max(h, 4)}%`, background: 'var(--accent)', borderRadius: 6, transition: 'height 0.6s ease', minHeight: 4 }} />
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
                          {m.month.slice(5)}월
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 만료 임박 */}
            {stats.expiring_soon.length > 0 && (
              <div style={{ background: 'var(--bg-card)', border: '1.5px solid rgba(245,158,11,0.3)', borderRadius: 14, padding: '20px 24px' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#d97706', marginBottom: 14 }}>⏰ 만료 임박 계약서 (7일 이내)</div>
                {stats.expiring_soon.map(e => (
                  <div key={e.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>{e.filename}</div>
                    <div style={{ fontSize: 12, color: e.days_left <= 3 ? '#ef4444' : '#f59e0b', fontWeight: 700 }}>
                      {e.days_left === 0 ? '오늘 만료' : `${e.days_left}일 후 만료`} · {e.expiry_date}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
