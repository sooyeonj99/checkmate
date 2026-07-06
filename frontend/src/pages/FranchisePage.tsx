import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../utils/apiFetch'

async function apiJson(path: string, init?: RequestInit) {
  const res = await apiFetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail ?? '오류가 발생했습니다.')
  return data
}

interface StoreOut {
  id: number
  franchisee_email: string
  store_name: string
  region: string | null
  status: 'pending' | 'active'
  invited_at: string
  joined_at: string | null
  franchisee_username: string | null
  contract_count: number
  danger_count: number
  warn_count: number
}

interface DashboardOut {
  total_stores: number
  active_stores: number
  pending_stores: number
  total_contracts: number
  danger_contracts: number
  warn_contracts: number
  safe_contracts: number
  stores: StoreOut[]
}

interface ContractOut {
  id: number
  filename: string
  contract_type: string
  grade: string
  score: number
  danger_count: number
  warn_count: number
  safe_count: number
  saved_at: string
}

const GRADE_COLOR: Record<string, string> = {
  '위험': '#dc2626',
  '주의': '#d97706',
  '안전': '#16a34a',
}

export default function FranchisePage() {
  const { user, isLoggedIn } = useAuth()
  const navigate = useNavigate()
  const [dashboard, setDashboard] = useState<DashboardOut | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedStore, setSelectedStore] = useState<StoreOut | null>(null)
  const [storeContracts, setStoreContracts] = useState<ContractOut[]>([])
  const [contractsLoading, setContractsLoading] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteStoreName, setInviteStoreName] = useState('')
  const [inviteRegion, setInviteRegion] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [inviteDone, setInviteDone] = useState(false)
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'pending'>('all')

  useEffect(() => {
    if (!isLoggedIn) { navigate('/auth'); return }
    if (user?.user_type !== 'franchisor') { navigate('/dashboard'); return }
  }, [isLoggedIn, user, navigate])

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiJson('/api/v1/franchise/dashboard')
      setDashboard(data)
    } catch (e: any) {
      setError(e.message ?? '데이터를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadDashboard() }, [loadDashboard])

  const loadStoreContracts = async (store: StoreOut) => {
    setSelectedStore(store)
    setContractsLoading(true)
    try {
      const data = await apiJson(`/api/v1/franchise/stores/${store.id}/contracts`)
      setStoreContracts(data)
    } catch {
      setStoreContracts([])
    } finally {
      setContractsLoading(false)
    }
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviteLoading(true)
    setInviteError('')
    try {
      await apiJson('/api/v1/franchise/invite', {
        method: 'POST',
        body: JSON.stringify({ franchisee_email: inviteEmail, store_name: inviteStoreName, region: inviteRegion || null }),
      })
      setInviteDone(true)
      loadDashboard()
    } catch (e: any) {
      setInviteError(e.message ?? '초대 실패')
    } finally {
      setInviteLoading(false)
    }
  }

  const handleDeleteStore = async (storeId: number) => {
    if (!confirm('이 가맹점을 삭제하시겠습니까?')) return
    try {
      await apiJson(`/api/v1/franchise/stores/${storeId}`, { method: 'DELETE' })
      if (selectedStore?.id === storeId) setSelectedStore(null)
      loadDashboard()
    } catch (e: any) {
      alert(e.message ?? '삭제 실패')
    }
  }

  const filteredStores = dashboard?.stores.filter(s =>
    filterStatus === 'all' ? true : s.status === filterStatus
  ) ?? []

  if (loading) {
    return (
      <div className="franchise-loading">
        <div className="franchise-spinner" />
        <p>데이터 불러오는 중...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="franchise-loading">
        <p style={{ color: '#dc2626' }}>{error}</p>
        <button className="fr-btn" onClick={loadDashboard}>다시 시도</button>
      </div>
    )
  }

  return (
    <div className="franchise-page">
      {/* 헤더 */}
      <header className="franchise-header">
        <div className="franchise-header-inner">
          <div>
            <Link to="/dashboard" className="franchise-back">← 대시보드</Link>
            <h1 className="franchise-title">프랜차이즈 관리</h1>
            <p className="franchise-subtitle">{user?.username} 본사 · 가맹점 계약 통합 현황</p>
          </div>
          <button className="fr-btn fr-btn-primary" onClick={() => { setShowInviteModal(true); setInviteDone(false); setInviteError(''); setInviteEmail(''); setInviteStoreName(''); setInviteRegion('') }}>
            + 가맹점 초대
          </button>
        </div>
      </header>

      <div className="franchise-body">
        {/* 통계 카드 */}
        <div className="franchise-stats">
          <div className="fr-stat-card">
            <div className="fr-stat-num">{dashboard?.total_stores ?? 0}</div>
            <div className="fr-stat-label">전체 가맹점</div>
          </div>
          <div className="fr-stat-card">
            <div className="fr-stat-num" style={{ color: '#16a34a' }}>{dashboard?.active_stores ?? 0}</div>
            <div className="fr-stat-label">가입 완료</div>
          </div>
          <div className="fr-stat-card">
            <div className="fr-stat-num" style={{ color: '#6b7280' }}>{dashboard?.pending_stores ?? 0}</div>
            <div className="fr-stat-label">초대 대기</div>
          </div>
          <div className="fr-stat-card">
            <div className="fr-stat-num">{dashboard?.total_contracts ?? 0}</div>
            <div className="fr-stat-label">전체 계약서</div>
          </div>
          <div className="fr-stat-card">
            <div className="fr-stat-num" style={{ color: '#dc2626' }}>{dashboard?.danger_contracts ?? 0}</div>
            <div className="fr-stat-label">위험 계약</div>
          </div>
          <div className="fr-stat-card">
            <div className="fr-stat-num" style={{ color: '#d97706' }}>{dashboard?.warn_contracts ?? 0}</div>
            <div className="fr-stat-label">주의 계약</div>
          </div>
        </div>

        <div className="franchise-content">
          {/* 가맹점 목록 */}
          <div className="franchise-stores-panel">
            <div className="fr-panel-header">
              <span className="fr-panel-title">가맹점 목록</span>
              <div className="fr-filter-tabs">
                {(['all', 'active', 'pending'] as const).map(f => (
                  <button key={f} className={`fr-filter-tab${filterStatus === f ? ' active' : ''}`} onClick={() => setFilterStatus(f)}>
                    {f === 'all' ? '전체' : f === 'active' ? '가입완료' : '대기중'}
                  </button>
                ))}
              </div>
            </div>

            {filteredStores.length === 0 ? (
              <div className="fr-empty">
                <p>가맹점이 없습니다.</p>
                <button className="fr-btn fr-btn-primary" onClick={() => setShowInviteModal(true)}>첫 가맹점 초대하기</button>
              </div>
            ) : (
              <div className="fr-store-list">
                {filteredStores.map(store => (
                  <div
                    key={store.id}
                    className={`fr-store-card${selectedStore?.id === store.id ? ' selected' : ''}`}
                    onClick={() => loadStoreContracts(store)}
                  >
                    <div className="fr-store-top">
                      <div>
                        <div className="fr-store-name">{store.store_name}</div>
                        {store.region && <div className="fr-store-region">{store.region}</div>}
                      </div>
                      <span className={`fr-status-badge ${store.status}`}>
                        {store.status === 'active' ? '가입완료' : '대기중'}
                      </span>
                    </div>
                    <div className="fr-store-info">
                      <span>{store.franchisee_username ?? store.franchisee_email}</span>
                      <span>계약서 {store.contract_count}건</span>
                      {store.danger_count > 0 && (
                        <span style={{ color: '#dc2626', fontWeight: 700 }}>위험 {store.danger_count}</span>
                      )}
                    </div>
                    <button
                      className="fr-delete-btn"
                      onClick={(e) => { e.stopPropagation(); handleDeleteStore(store.id) }}
                      title="가맹점 삭제"
                    >✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 계약서 패널 */}
          <div className="franchise-contracts-panel">
            {!selectedStore ? (
              <div className="fr-empty fr-empty-contracts">
                <p style={{ fontSize: 32 }}>📋</p>
                <p>가맹점을 선택하면<br/>계약서 목록이 표시됩니다.</p>
              </div>
            ) : (
              <>
                <div className="fr-panel-header">
                  <span className="fr-panel-title">{selectedStore.store_name} 계약서</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>총 {storeContracts.length}건</span>
                </div>
                {contractsLoading ? (
                  <div className="franchise-loading"><div className="franchise-spinner" /></div>
                ) : storeContracts.length === 0 ? (
                  <div className="fr-empty"><p>저장된 계약서가 없습니다.</p></div>
                ) : (
                  <div className="fr-contract-list">
                    {storeContracts.map(c => (
                      <div key={c.id} className="fr-contract-card">
                        <div className="fr-contract-top">
                          <span className="fr-contract-name">{c.filename}</span>
                          <span className="fr-grade-badge" style={{ background: GRADE_COLOR[c.grade] + '20', color: GRADE_COLOR[c.grade] }}>
                            {c.grade}
                          </span>
                        </div>
                        <div className="fr-contract-meta">
                          <span>{c.contract_type}</span>
                          <span>점수 {c.score}</span>
                          <span style={{ color: '#dc2626' }}>위험 {c.danger_count}</span>
                          <span style={{ color: '#d97706' }}>주의 {c.warn_count}</span>
                          <span style={{ color: '#16a34a' }}>안전 {c.safe_count}</span>
                        </div>
                        <div className="fr-contract-date">{new Date(c.saved_at).toLocaleDateString('ko-KR')}</div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* 초대 모달 */}
      {showInviteModal && (
        <div className="fr-modal-overlay" onClick={() => setShowInviteModal(false)}>
          <div className="fr-modal" onClick={e => e.stopPropagation()}>
            <div className="fr-modal-header">
              <h3>가맹점 초대</h3>
              <button className="fr-modal-close" onClick={() => setShowInviteModal(false)}>✕</button>
            </div>
            {inviteDone ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📧</div>
                <p style={{ fontWeight: 700, marginBottom: 8 }}>초대 이메일을 발송했습니다!</p>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>가맹점주가 이메일의 링크를 클릭하면 자동으로 연결됩니다.</p>
                <button className="fr-btn fr-btn-primary" onClick={() => setShowInviteModal(false)}>확인</button>
              </div>
            ) : (
              <form onSubmit={handleInvite}>
                {inviteError && <div className="fr-modal-error">{inviteError}</div>}
                <div className="fr-modal-field">
                  <label>가맹점명 *</label>
                  <input type="text" value={inviteStoreName} onChange={e => setInviteStoreName(e.target.value)} placeholder="예: 강남점" required />
                </div>
                <div className="fr-modal-field">
                  <label>지역</label>
                  <input type="text" value={inviteRegion} onChange={e => setInviteRegion(e.target.value)} placeholder="예: 서울 강남구" />
                </div>
                <div className="fr-modal-field">
                  <label>가맹점주 이메일 *</label>
                  <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="franchisee@email.com" required />
                </div>
                <div className="fr-modal-actions">
                  <button type="button" className="fr-btn" onClick={() => setShowInviteModal(false)}>취소</button>
                  <button type="submit" className="fr-btn fr-btn-primary" disabled={inviteLoading}>
                    {inviteLoading ? '발송 중...' : '초대 이메일 발송'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
