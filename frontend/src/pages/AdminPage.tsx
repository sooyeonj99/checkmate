import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface UserItem {
  id: number
  email: string
  username: string
  user_type: string
  is_active: boolean
  is_verified: boolean
  created_at: string
  contract_count: number
}

interface AdminStats {
  total_users: number
  personal_users: number
  enterprise_users: number
  total_contracts: number
  total_signings: number
  avg_score: number
  danger_count: number
  warn_count: number
  safe_count: number
}

interface ApiKeyItem {
  key: string
  name: string
  created_at: string
  calls: number
}

interface TrendPoint {
  date: string
  signups: number
  analyses: number
}

const ADMIN_EMAIL = 'ghdiehddl@gmail.com'

export default function AdminPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState<'stats' | 'users' | 'keys'>('stats')
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [users, setUsers] = useState<UserItem[]>([])
  const [keys, setKeys] = useState<ApiKeyItem[]>([])
  const [trends, setTrends] = useState<TrendPoint[]>([])
  const [trendDays, setTrendDays] = useState(30)
  const [newKeyName, setNewKeyName] = useState('')
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')

  const token = sessionStorage.getItem('cm_token')
  const headers = { Authorization: `Bearer ${token}` }

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const fetchStats = useCallback(async () => {
    const res = await fetch('/api/v1/admin/stats', { headers })
    if (res.ok) setStats(await res.json())
  }, [])

  const fetchUsers = useCallback(async () => {
    const res = await fetch('/api/v1/admin/users?limit=100', { headers })
    if (res.ok) setUsers(await res.json())
  }, [])

  const fetchKeys = useCallback(async () => {
    const res = await fetch('/api/v1/admin/api-keys', { headers })
    if (res.ok) setKeys(await res.json())
  }, [])

  const fetchTrends = useCallback(async (days: number) => {
    const res = await fetch(`/api/v1/admin/trends?days=${days}`, { headers })
    if (res.ok) setTrends(await res.json())
  }, [])

  useEffect(() => {
    if (!user || user.email !== ADMIN_EMAIL) return
    Promise.all([fetchStats(), fetchUsers(), fetchKeys(), fetchTrends(trendDays)]).finally(() => setLoading(false))
  }, [user, fetchStats, fetchUsers, fetchKeys, fetchTrends])

  useEffect(() => {
    if (!user || user.email !== ADMIN_EMAIL || loading) return
    fetchTrends(trendDays)
  }, [trendDays])

  const toggleUser = async (userId: number) => {
    await fetch(`/api/v1/admin/users/${userId}/toggle-active`, { method: 'PATCH', headers })
    fetchUsers()
    showToast('사용자 상태가 변경되었습니다.')
  }

  const createKey = async () => {
    if (!newKeyName.trim()) return
    const res = await fetch('/api/v1/admin/api-keys', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newKeyName }),
    })
    if (res.ok) {
      setNewKeyName('')
      fetchKeys()
      showToast('API 키가 생성되었습니다.')
    }
  }

  const deleteKey = async (key: string) => {
    if (!confirm('이 API 키를 삭제할까요?')) return
    await fetch(`/api/v1/admin/api-keys/${encodeURIComponent(key)}`, { method: 'DELETE', headers })
    fetchKeys()
    showToast('API 키가 삭제되었습니다.')
  }

  if (!user || user.email !== ADMIN_EMAIL) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>관리자 전용 페이지</div>
          <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 24 }}>접근 권한이 없습니다.</div>
          <Link to="/dashboard" style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 14 }}>← 대시보드로</Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '0 0 60px' }}>
      {/* Header */}
      <header style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', padding: '16px 32px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <Link to="/dashboard" style={{ color: 'var(--text-muted)', fontSize: 13, textDecoration: 'none' }}>← 대시보드</Link>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', margin: 0 }}>어드민 패널</h1>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>ghdiehddl@gmail.com 전용</div>
        </div>
        <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: 'rgba(239,68,68,0.1)', color: '#dc2626' }}>관리자</span>
      </header>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 24px' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
          {(['stats', 'users', 'keys'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '10px 22px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14,
              background: tab === t ? 'var(--accent)' : 'var(--bg-card)',
              color: tab === t ? '#fff' : 'var(--text-muted)',
              boxShadow: tab === t ? '0 2px 8px rgba(37,99,235,0.2)' : 'none',
            }}>
              {t === 'stats' ? '전체 통계' : t === 'users' ? `사용자 (${users.length})` : 'B2B API 키'}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>불러오는 중...</div>
        ) : tab === 'stats' && stats ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16, marginBottom: 24 }}>
              {[
                { label: '총 사용자', value: stats.total_users, color: 'var(--accent)' },
                { label: '개인 계정', value: stats.personal_users, color: '#10b981' },
                { label: '기업 계정', value: stats.enterprise_users, color: '#8b5cf6' },
                { label: '총 계약서', value: stats.total_contracts, color: '#f59e0b' },
                { label: '전자서명', value: stats.total_signings, color: '#06b6d4' },
                { label: '평균 점수', value: `${stats.avg_score}점`, color: '#f43f5e' },
              ].map(s => (
                <div key={s.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '24px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: 30, fontWeight: 800, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)', marginTop: 6 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* 위험도 분포 */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '24px' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>전체 계약서 위험도 분포</div>
              {stats.total_contracts > 0 ? (
                <>
                  <div style={{ display: 'flex', height: 32, borderRadius: 10, overflow: 'hidden', gap: 2, marginBottom: 12 }}>
                    {stats.danger_count > 0 && <div style={{ flex: stats.danger_count, background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#fff', fontWeight: 700 }}>{stats.danger_count}</div>}
                    {stats.warn_count > 0 && <div style={{ flex: stats.warn_count, background: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#fff', fontWeight: 700 }}>{stats.warn_count}</div>}
                    {stats.safe_count > 0 && <div style={{ flex: stats.safe_count, background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#fff', fontWeight: 700 }}>{stats.safe_count}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 20 }}>
                    {[['#ef4444', '위험', stats.danger_count], ['#f59e0b', '주의', stats.warn_count], ['#22c55e', '안전', stats.safe_count]].map(([color, label, count]) => (
                      <div key={String(label)} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)' }}>
                        <div style={{ width: 12, height: 12, borderRadius: 3, background: String(color) }} />
                        {label}: {count}건
                      </div>
                    ))}
                  </div>
                </>
              ) : <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>분석된 계약서가 없습니다.</div>}
            </div>

            {/* 기간별 추이 (가입자 수 / 분석량) */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '24px', marginTop: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>기간별 추이 (가입자 · 분석량)</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[7, 30, 90].map(d => (
                    <button key={d} onClick={() => setTrendDays(d)} style={{
                      fontSize: 11, padding: '4px 10px', borderRadius: 8, cursor: 'pointer',
                      border: `1px solid ${trendDays === d ? 'var(--accent)' : 'var(--border)'}`,
                      background: trendDays === d ? 'rgba(37,99,235,0.1)' : 'var(--bg)',
                      color: trendDays === d ? 'var(--accent)' : 'var(--text-muted)',
                      fontWeight: trendDays === d ? 700 : 400,
                    }}>{d}일</button>
                  ))}
                </div>
              </div>

              {trends.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>데이터가 없습니다.</div>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: 16, marginBottom: 14, fontSize: 12, color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--accent)' }} />
                      신규 가입 (총 {trends.reduce((a, t) => a + t.signups, 0)}명)
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 3, background: '#f59e0b' }} />
                      계약서 분석 (총 {trends.reduce((a, t) => a + t.analyses, 0)}건)
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: trendDays > 30 ? 1 : 3, height: 120, overflowX: 'auto' }}>
                    {(() => {
                      const maxVal = Math.max(1, ...trends.map(t => Math.max(t.signups, t.analyses)))
                      return trends.map(t => (
                        <div key={t.date} title={`${t.date} · 가입 ${t.signups}명 · 분석 ${t.analyses}건`}
                          style={{ display: 'flex', alignItems: 'flex-end', gap: 1, height: '100%', flex: '1 0 auto', minWidth: trendDays > 30 ? 2 : 6 }}>
                          <div style={{ flex: 1, height: `${(t.signups / maxVal) * 100}%`, minHeight: t.signups > 0 ? 2 : 0, background: 'var(--accent)', borderRadius: '2px 2px 0 0' }} />
                          <div style={{ flex: 1, height: `${(t.analyses / maxVal) * 100}%`, minHeight: t.analyses > 0 ? 2 : 0, background: '#f59e0b', borderRadius: '2px 2px 0 0' }} />
                        </div>
                      ))
                    })()}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>
                    <span>{trends[0]?.date}</span>
                    <span>{trends[trends.length - 1]?.date}</span>
                  </div>
                </>
              )}
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)' }}>
                매출 지표는 제공하지 않습니다 — 현재 결제/구독 과금 시스템이 연결되어 있지 않습니다.
              </div>
            </div>
          </>
        ) : tab === 'users' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {users.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>사용자가 없습니다.</div>
            ) : users.map(u => (
              <div key={u.id} style={{
                display: 'flex', alignItems: 'center', gap: 16,
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 12, padding: '16px 20px',
                opacity: u.is_active ? 1 : 0.55,
              }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(37,99,235,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18, color: 'var(--accent)', flexShrink: 0 }}>
                  {u.username.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{u.username}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {u.email} · {u.user_type} · 계약서 {u.contract_count}건
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
                  <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: u.is_active ? 'rgba(22,163,74,0.1)' : 'rgba(100,116,139,0.1)', color: u.is_active ? '#16a34a' : '#64748b' }}>
                    {u.is_active ? '활성' : '비활성'}
                  </span>
                  {u.email !== ADMIN_EMAIL && (
                    <button onClick={() => toggleUser(u.id)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                      {u.is_active ? '비활성화' : '활성화'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* API 키 생성 */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 24px', marginBottom: 20 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>새 API 키 생성</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <input value={newKeyName} onChange={e => setNewKeyName(e.target.value)}
                  placeholder="API 키 이름 (예: 파트너사A)"
                  onKeyDown={e => e.key === 'Enter' && createKey()}
                  style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 14 }} />
                <button onClick={createKey} disabled={!newKeyName.trim()}
                  style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                  생성
                </button>
              </div>
            </div>
            {/* API 키 목록 */}
            {keys.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>생성된 API 키가 없습니다.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {keys.map(k => (
                  <div key={k.key} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 4 }}>{k.name}</div>
                      <div style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{k.key}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{new Date(k.created_at).toLocaleDateString('ko-KR')} 생성 · {k.calls}회 호출</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <button onClick={() => { navigator.clipboard.writeText(k.key); showToast('키가 복사되었습니다.') }}
                        style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 12, cursor: 'pointer' }}>
                        복사
                      </button>
                      <button onClick={() => deleteKey(k.key)}
                        style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.06)', color: '#dc2626', fontSize: 12, cursor: 'pointer' }}>
                        삭제
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {toast && (
        <div style={{ position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)', background: '#1e293b', color: '#fff', padding: '12px 24px', borderRadius: 12, fontSize: 14, fontWeight: 600, zIndex: 9999, boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
          {toast}
        </div>
      )}
    </div>
  )
}
