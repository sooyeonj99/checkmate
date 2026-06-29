import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { MOCK_RESULT_MAP } from '../data/mockResults'

/* ── Saved contract types (API) ─────────────────────── */
interface SavedContractItem {
  id: number
  contract_id: string
  filename: string
  contract_type: string
  score: number
  grade: string
  danger_count: number
  warn_count: number
  safe_count: number
  analysis_time: string
  saved_at: string
}

/* ── Types ──────────────────────────────────────────── */
type RiskLevel = 'danger' | 'warn' | 'safe'
type ContractStatus = 'danger' | 'warn' | 'safe'

interface Contract {
  id: string
  name: string
  type: string
  typeEmoji: string
  score: number
  risk: RiskLevel
  expiryDate: string
  daysLeft: number
  status: ContractStatus
  analyzedAt: string
}

interface SubscriptionDetail {
  id: string
  name: string
  typeEmoji: string
  type: string
  billingType: 'monthly' | 'annual'
  startDate: string
  endDate: string
  usedMonths: number
  remainingMonths: number
  totalPaid: number
  status: ContractStatus
  // 월 결제 전용
  monthlyFee?: number
  nextBillingDate?: string
  // 년 결제 전용
  annualFee?: number
  monthlyUsage?: number
  terminationPenalty?: number
}

/* ── Mock data ──────────────────────────────────────── */
const MOCK_CONTRACTS: Contract[] = [
  {
    id: '1',
    name: '(주)테크스타트 근로계약서',
    type: '근로계약서',
    typeEmoji: '👷',
    score: 72,
    risk: 'danger',
    expiryDate: '2026-07-20',
    daysLeft: 30,
    status: 'danger',
    analyzedAt: '2026-06-15',
  },
  {
    id: '3',
    name: '영상 편집 프리랜서 계약서',
    type: '프리랜서 계약서',
    typeEmoji: '💻',
    score: 78,
    risk: 'danger',
    expiryDate: '2026-08-31',
    daysLeft: 72,
    status: 'danger',
    analyzedAt: '2026-06-08',
  },
  {
    id: '4',
    name: '정수기 렌탈 서비스 이용계약서',
    type: '렌탈·약정계약',
    typeEmoji: '🔒',
    score: 76,
    risk: 'danger',
    expiryDate: '2029-06-20',
    daysLeft: 1092,
    status: 'danger',
    analyzedAt: '2026-06-05',
  },
  {
    id: '5',
    name: 'Adobe Creative Cloud 구독 약관',
    type: '구독·이용약관',
    typeEmoji: '📋',
    score: 18,
    risk: 'safe',
    expiryDate: '2027-01-05',
    daysLeft: 199,
    status: 'safe',
    analyzedAt: '2026-05-28',
  },
]

/* ── Subscription mock data ─────────────────────────── */
const SUBSCRIPTION_DETAILS: SubscriptionDetail[] = [
  {
    id: '4',
    name: '정수기 렌탈 서비스',
    typeEmoji: '🔒',
    type: '렌탈·약정계약',
    billingType: 'monthly',
    startDate: '2019-06-20',
    endDate: '2029-06-20',
    usedMonths: 84,
    remainingMonths: 36,
    totalPaid: 2940000,
    terminationPenalty: 1260000,
    status: 'danger',
    monthlyFee: 35000,
    nextBillingDate: '매월 20일',
  },
  {
    id: '5',
    name: 'Adobe Creative Cloud',
    typeEmoji: '📋',
    type: '구독·이용약관',
    billingType: 'annual',
    startDate: '2026-01-05',
    endDate: '2027-01-05',
    usedMonths: 5,
    remainingMonths: 7,
    totalPaid: 325000,
    status: 'safe',
    annualFee: 780000,
    nextBillingDate: '2027-01-05',
    terminationPenalty: 227500,
  },
]

/* ── Risk helpers ───────────────────────────────────── */
function scoreColor(score: number) {
  if (score >= 61) return 'var(--risk-high)'
  if (score >= 31) return 'var(--risk-mid)'
  return 'var(--risk-safe)'
}

function daysLeftLabel(days: number) {
  if (days <= 0) return '만료됨'
  if (days === 1) return '오늘 만료'
  return `${days}일 후`
}

/* ── Sub-components ─────────────────────────────────── */
function SummaryCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: string
  label: string
  value: string | number
  sub?: string
  accent?: 'danger' | 'warn' | 'safe' | 'blue'
}) {
  const accentColor =
    accent === 'danger' ? 'var(--risk-high)' :
    accent === 'warn'   ? 'var(--risk-mid)' :
    accent === 'safe'   ? 'var(--risk-safe)' :
    'var(--accent-bright)'

  return (
    <div className="dash-summary-card">
      <div className="dash-summary-icon" style={{ color: accentColor }}>
        {icon}
      </div>
      <div className="dash-summary-value" style={{ color: accentColor }}>
        {value}
      </div>
      <div className="dash-summary-label">{label}</div>
      {sub && <div className="dash-summary-sub">{sub}</div>}
    </div>
  )
}

/* ── Main Page ──────────────────────────────────────── */
export default function DashboardPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [filter, setFilter] = useState<'all' | RiskLevel>('all')
  const [sortKey, setSortKey] = useState<'score' | 'expiry' | 'analyzed'>('analyzed')
  const [dismissedBanner, setDismissedBanner] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  /* 저장된 계약서 */
  const [savedContracts, setSavedContracts] = useState<SavedContractItem[]>([])
  const [savedLoading, setSavedLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const fetchSaved = useCallback(async () => {
    const token = localStorage.getItem('cm_token')
    if (!token) { setSavedLoading(false); return }
    try {
      const res = await fetch('/api/v1/contracts/saved', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) setSavedContracts(await res.json())
    } finally {
      setSavedLoading(false)
    }
  }, [])

  useEffect(() => { fetchSaved() }, [fetchSaved])

  const handleDeleteSaved = useCallback(async (id: number) => {
    if (!confirm('이 분석 결과를 삭제할까요?')) return
    setDeletingId(id)
    const token = localStorage.getItem('cm_token')
    try {
      await fetch(`/api/v1/contracts/saved/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      setSavedContracts((prev) => prev.filter((c) => c.id !== id))
    } finally {
      setDeletingId(null)
    }
  }, [])

  const handleViewSaved = useCallback(async (item: SavedContractItem) => {
    const token = localStorage.getItem('cm_token')
    const res = await fetch(`/api/v1/contracts/saved/${item.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      const analysisResult = await res.json()
      navigate('/result', { state: { analysisResult, isSaved: true } })
    }
  }, [navigate])

  useEffect(() => {
    if (!dropdownOpen) return
    const close = () => setDropdownOpen(false)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [dropdownOpen])

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const expiringContracts = MOCK_CONTRACTS.filter((c) => c.daysLeft <= 30 && c.daysLeft > 0)

  const filtered = MOCK_CONTRACTS
    .filter((c) => filter === 'all' || c.risk === filter)
    .sort((a, b) => {
      if (sortKey === 'score') return a.score - b.score
      if (sortKey === 'expiry') return a.daysLeft - b.daysLeft
      return b.analyzedAt.localeCompare(a.analyzedAt)
    })

  const totalCount = MOCK_CONTRACTS.length
  const dangerCount = MOCK_CONTRACTS.filter((c) => c.risk === 'danger').length
  const thisMonthCount = MOCK_CONTRACTS.filter((c) =>
    c.analyzedAt.startsWith('2026-06')
  ).length

  return (
    <div className="dash-page">
      {/* ── Topbar ── */}
      <header className="dash-topbar">
        <Link to="/" className="dash-logo">
          <div className="dash-logo-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L3 7V12C3 16.97 6.84 21.61 12 23C17.16 21.61 21 16.97 21 12V7L12 2Z" fill="white" fillOpacity="0.9"/>
              <path d="M9 12L11 14L15 10" stroke="#060d1f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="gradient-text">CHECKMATE</span>
        </Link>

        <nav className="dash-topbar-nav">
          <span className="dash-topbar-nav-item active">내 계약서</span>
          <Link to="/" className="dash-topbar-nav-item">서비스 소개</Link>
        </nav>

        <div className="dash-topbar-right">
          <button className="dash-new-btn" onClick={() => navigate('/upload')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            새 계약서 분석
          </button>
          <div
            className="navbar-user-wrap"
            onClick={(e) => { e.stopPropagation(); setDropdownOpen((v) => !v) }}
          >
            <div className="navbar-user-btn">
              <div className="navbar-user-avatar">
                {user?.username.charAt(0).toUpperCase() ?? '?'}
              </div>
              <span className="navbar-user-name">{user?.username}</span>
              <span className="navbar-user-caret">▾</span>
            </div>
            {dropdownOpen && (
              <div className="navbar-dropdown">
                <div className="navbar-dropdown-info">
                  <div className="navbar-dropdown-name">{user?.username}</div>
                  <div className="navbar-dropdown-email">{user?.email}</div>
                  <div style={{
                    marginTop: 4, fontSize: 11, fontWeight: 700,
                    color: user?.user_type === 'enterprise' ? 'var(--accent)' : '#2e8b2e',
                  }}>
                    {user?.user_type === 'enterprise' ? '🏢 기업/법인' : '👤 개인 사용자'}
                  </div>
                </div>
                <div className="navbar-dropdown-divider" />
                <Link to="/dashboard" className="navbar-dropdown-item" onClick={() => setDropdownOpen(false)}>
                  대시보드
                </Link>
                <Link to="/upload" className="navbar-dropdown-item" onClick={() => setDropdownOpen(false)}>
                  계약서 분석
                </Link>
                <div className="navbar-dropdown-divider" />
                <button className="navbar-dropdown-item logout" onClick={handleLogout}>
                  로그아웃
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="dash-main">
        <div className="dash-container">

          {/* ── Page heading ── */}
          <div className="dash-heading">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <h1 className="dash-title" style={{ marginBottom: 0 }}>내 계약 대시보드</h1>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                  background: user?.user_type === 'enterprise' ? 'rgba(37,99,235,0.12)' : 'rgba(46,139,46,0.12)',
                  color: user?.user_type === 'enterprise' ? 'var(--accent)' : '#2e8b2e',
                  border: `1px solid ${user?.user_type === 'enterprise' ? 'rgba(37,99,235,0.25)' : 'rgba(46,139,46,0.25)'}`,
                }}>
                  {user?.user_type === 'enterprise' ? '🏢 기업/법인' : '👤 개인'}
                </span>
              </div>
              <p className="dash-subtitle">분석된 계약서를 한눈에 관리하세요</p>
            </div>
            <button className="btn-primary dash-new-btn-lg" onClick={() => navigate('/upload')}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              새 계약서 분석하기
            </button>
          </div>

          {/* ── Summary cards ── */}
          <div className="dash-summary-grid">
            <SummaryCard icon="📁" label="전체 계약" value={totalCount} sub="누적 분석 건수" accent="blue" />
            <SummaryCard icon="⚠️" label="위험 계약" value={dangerCount} sub="즉시 검토 필요" accent="danger" />
            <SummaryCard icon="📊" label="이번 달 분석" value={thisMonthCount} sub="2026년 6월 기준" accent="safe" />
            <SummaryCard icon="⏰" label="만료 임박" value={expiringContracts.length} sub="30일 이내 만료" accent="warn" />
          </div>

          {/* ── 저장된 AI 분석 결과 ── */}
          <div className="saved-contracts-section">
            <div className="saved-contracts-header">
              <div>
                <h2 className="dash-title" style={{ fontSize: 18, marginBottom: 4 }}>저장된 AI 분석 결과</h2>
                <p className="dash-subtitle" style={{ fontSize: 13 }}>결과 저장을 완료한 계약서를 여기서 다시 확인하거나 삭제할 수 있습니다</p>
              </div>
              <button className="btn-primary" style={{ fontSize: 13, padding: '8px 16px' }} onClick={() => navigate('/upload')}>
                + 새 분석
              </button>
            </div>

            {savedLoading ? (
              <div className="saved-loading">불러오는 중...</div>
            ) : savedContracts.length === 0 ? (
              <div className="saved-empty">
                <span style={{ fontSize: 32 }}>📋</span>
                <p>저장된 분석 결과가 없습니다.</p>
                <p style={{ fontSize: 13 }}>계약서를 분석한 후 결과 저장을 선택하면 여기에 표시됩니다.</p>
              </div>
            ) : (
              <div className="saved-grid">
                {savedContracts.map((item) => {
                  const gradeColor =
                    item.grade === '위험' ? 'var(--risk-high)' :
                    item.grade === '주의' ? 'var(--risk-mid)' :
                    'var(--risk-safe)'
                  return (
                    <div key={item.id} className="saved-card">
                      <div className="saved-card-top">
                        <div className="saved-card-type">{item.contract_type}</div>
                        <span className="saved-card-grade" style={{ color: gradeColor }}>{item.grade}</span>
                      </div>
                      <div className="saved-card-name">{item.filename}</div>
                      <div className="saved-card-score" style={{ color: gradeColor }}>
                        위험도 <strong>{item.score}</strong>점
                      </div>
                      <div className="saved-card-counts">
                        <span className="saved-count danger">{item.danger_count} 위험</span>
                        <span className="saved-count warn">{item.warn_count} 주의</span>
                        <span className="saved-count safe">{item.safe_count} 안전</span>
                      </div>
                      <div className="saved-card-date">
                        {new Date(item.saved_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })} 저장
                      </div>
                      <div className="saved-card-actions">
                        <button className="saved-view-btn" onClick={() => handleViewSaved(item)}>
                          결과 보기
                        </button>
                        <button
                          className="saved-delete-btn"
                          onClick={() => handleDeleteSaved(item.id)}
                          disabled={deletingId === item.id}
                        >
                          {deletingId === item.id ? '삭제 중...' : '삭제'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── Subscription/Rental section ── */}
          <div className="sub-detail-section">
            <div className="sub-detail-section-header">
              <div>
                <h2 className="dash-title" style={{ fontSize: 18, marginBottom: 4 }}>구독·렌탈 현황</h2>
                <p className="dash-subtitle" style={{ fontSize: 13 }}>장기 약정 계약의 이용 현황과 위약금을 한눈에 파악하세요</p>
              </div>
            </div>
            <div className="sub-detail-grid">
              {SUBSCRIPTION_DETAILS.map((s) => (
                <SubscriptionCard key={s.id} data={s} />
              ))}
            </div>
          </div>

          {/* ── Expiry alert banner ── */}
          <div style={{ height: 24 }} />
          {!dismissedBanner && expiringContracts.length > 0 && (
            <div className="dash-alert-banner">
              <div className="dash-alert-left">
                <span className="dash-alert-icon">🔔</span>
                <div>
                  <p className="dash-alert-title">만료 임박 계약서가 {expiringContracts.length}건 있습니다</p>
                  <p className="dash-alert-desc">
                    {expiringContracts.map((c) => (
                      <span key={c.id} className="dash-alert-chip">
                        {c.typeEmoji} {c.name} <em>{daysLeftLabel(c.daysLeft)}</em>
                      </span>
                    ))}
                  </p>
                </div>
              </div>
              <button className="dash-alert-close" onClick={() => setDismissedBanner(true)} aria-label="닫기">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
          )}

          {/* ── Table card ── */}
          <div className="dash-table-card">
            {/* Toolbar */}
            <div className="dash-toolbar">
              <div className="dash-filter-tabs">
                {(['all', 'danger', 'warn', 'safe'] as const).map((f) => (
                  <button
                    key={f}
                    className={`dash-filter-tab${filter === f ? ' active' : ''} ${f !== 'all' ? f : ''}`}
                    onClick={() => setFilter(f)}
                  >
                    {f === 'all' ? `전체 ${totalCount}` :
                     f === 'danger' ? `위험 ${MOCK_CONTRACTS.filter(c => c.risk === 'danger').length}` :
                     f === 'warn'   ? `주의 ${MOCK_CONTRACTS.filter(c => c.risk === 'warn').length}` :
                                     `안전 ${MOCK_CONTRACTS.filter(c => c.risk === 'safe').length}`}
                  </button>
                ))}
              </div>

              <div className="dash-sort-wrap">
                <span className="dash-sort-label">정렬</span>
                <select
                  className="dash-sort-select"
                  value={sortKey}
                  onChange={(e) => setSortKey(e.target.value as typeof sortKey)}
                >
                  <option value="analyzed">분석일 순</option>
                  <option value="score">위험도 순</option>
                  <option value="expiry">만료일 순</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="dash-table-wrap">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>계약서 이름</th>
                    <th>유형</th>
                    <th>위험도 점수</th>
                    <th>만료일</th>
                    <th>상태</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <ContractRow key={c.id} contract={c} />
                  ))}
                </tbody>
              </table>

              {filtered.length === 0 && (
                <div className="dash-empty">
                  <span className="dash-empty-icon">📂</span>
                  <p>해당 조건의 계약서가 없습니다</p>
                </div>
              )}
            </div>
          </div>

          {/* ── 사용자 유형별 기능 섹션 ── */}
          <div style={{ marginTop: 32 }}>
            <div style={{ marginBottom: 16 }}>
              <h2 className="dash-title" style={{ fontSize: 18, marginBottom: 4 }}>
                {user?.user_type === 'enterprise' ? '🏢 기업 전용 기능' : '👤 내 플랜 기능'}
              </h2>
              <p className="dash-subtitle" style={{ fontSize: 13 }}>
                {user?.user_type === 'enterprise'
                  ? '기업/법인 전용 고급 기능을 사용하세요'
                  : '개인 사용자 기본 기능 목록입니다'}
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
              {(user?.user_type === 'enterprise' ? ENTERPRISE_FEATURES : PERSONAL_FEATURES).map((f) => (
                <div key={f.title} style={{
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderRadius: 14, padding: '18px 20px',
                  opacity: f.comingSoon ? 0.55 : 1,
                  display: 'flex', flexDirection: 'column', gap: 8,
                }}>
                  <div style={{ fontSize: 26 }}>{f.icon}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 700, color: 'var(--text)', fontSize: 14 }}>{f.title}</span>
                    {f.comingSoon && (
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10,
                        background: 'rgba(37,99,235,0.1)', color: 'var(--accent)',
                      }}>준비중</span>
                    )}
                  </div>
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 12, lineHeight: 1.5 }}>{f.sub}</p>
                </div>
              ))}
            </div>
          </div>

          <div style={{ height: 40 }} />
        </div>
      </main>
    </div>
  )
}

const PERSONAL_FEATURES = [
  { icon: '🔍', title: 'AI 위험 조항 탐지', sub: 'Gemini AI가 불리한 조항을 자동으로 찾아드립니다', comingSoon: false },
  { icon: '🔒', title: '개인정보 마스킹', sub: '계약서 내 개인정보를 자동으로 보호합니다', comingSoon: false },
  { icon: '📋', title: '판례 기반 대안 제시', sub: '법적 근거를 바탕으로 수정 제안을 드립니다', comingSoon: false },
  { icon: '⚡', title: '빠른 분석', sub: '평균 30초 이내에 분석 결과를 받아보세요', comingSoon: false },
]

const ENTERPRISE_FEATURES = [
  { icon: '🔍', title: 'AI 위험 조항 탐지', sub: 'Gemini AI가 불리한 조항을 자동으로 찾아드립니다', comingSoon: false },
  { icon: '👥', title: '팀 관리', sub: '멤버 초대 및 역할 기반 접근 권한 설정', comingSoon: true },
  { icon: '📊', title: '대량 분석', sub: '여러 계약서를 동시에 일괄 분석', comingSoon: true },
  { icon: '📑', title: '리포트 다운로드', sub: 'PDF 형식의 상세 분석 리포트 출력', comingSoon: true },
  { icon: '🔐', title: '계약서 보안 저장', sub: '암호화된 계약서 클라우드 저장소', comingSoon: true },
  { icon: '📈', title: '분석 리포트', sub: '월간/분기별 계약 위험 분석 리포트', comingSoon: true },
]

/* ── Subscription card ──────────────────────────────── */
function SubscriptionCard({ data: s }: { data: SubscriptionDetail }) {
  const fmt = (n: number) => n.toLocaleString('ko-KR') + '원'
  const statusLabel = s.status === 'danger' ? '⚠ 위험' : s.status === 'warn' ? '△ 주의' : '✓ 안전'
  const isMonthly = s.billingType === 'monthly'

  const metrics = isMonthly
    ? [
        { label: '1개월 요금', value: fmt(s.monthlyFee ?? 0) },
        { label: '사용한 개월수', value: `${s.usedMonths}개월` },
        { label: '현재까지 낸 요금', value: fmt(s.totalPaid), cls: 'accent' },
        { label: '해지 위약금', value: s.terminationPenalty ? fmt(s.terminationPenalty) : '-', cls: s.terminationPenalty ? 'danger' : undefined },
      ]
    : [
        { label: '년 이용료', value: fmt(s.annualFee ?? 0) },
        { label: '결제 예정일', value: s.nextBillingDate ?? '-' },
        { label: '총 납부 금액', value: fmt(s.totalPaid), cls: 'accent' },
        { label: '해지 위약금', value: fmt(s.terminationPenalty ?? 0), cls: 'danger' },
      ]

  return (
    <div className="sub-detail-card">
      <div className="sub-detail-header">
        <span style={{ fontSize: 22 }}>{s.typeEmoji}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="sub-detail-name">{s.name}</div>
          <div className="sub-detail-type">{s.type}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <span className={`sub-billing-badge ${isMonthly ? 'monthly' : 'annual'}`}>
            {isMonthly ? '월 결제' : '년 결제'}
          </span>
          <span className={`dash-status-badge ${s.status}`}>{statusLabel}</span>
        </div>
      </div>

      <div className="sub-detail-period">
        <div className="sub-detail-period-dates">
          <span>{s.startDate}</span>
          <span>{s.endDate}</span>
        </div>
        <span className="sub-detail-period-bar">
          <span
            className="sub-detail-period-fill"
            style={{ width: `${(s.usedMonths / (s.usedMonths + s.remainingMonths)) * 100}%` }}
          />
        </span>
        <div className="sub-detail-period-info">
          <span>이용 <strong>{s.usedMonths}개월</strong></span>
          <span className="sub-detail-period-divider" />
          <span>잔여 <strong>{s.remainingMonths}개월</strong></span>
        </div>
      </div>

      <div className="sub-detail-metrics">
        {metrics.map((m) => (
          <div key={m.label} className="sub-detail-metric">
            <div className="sub-detail-metric-label">{m.label}</div>
            <div className={`sub-detail-metric-value${m.cls ? ` ${m.cls}` : ''}`}>{m.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Contract row ───────────────────────────────────── */
function ContractRow({ contract: c }: { contract: Contract }) {
  const navigate = useNavigate()

  const isExpiringSoon = c.daysLeft <= 30 && c.daysLeft > 0

  return (
    <tr className={`dash-row${isExpiringSoon ? ' expiring' : ''}`}>
      {/* 이름 */}
      <td className="dash-cell-name">
        <div>
          <p className="dash-contract-name">{c.name}</p>
          <p className="dash-contract-date">분석일 {c.analyzedAt}</p>
        </div>
      </td>

      {/* 유형 */}
      <td>
        <span className="dash-type-chip">{c.type}</span>
      </td>

      {/* 위험도 점수 */}
      <td>
        <div className="dash-score-cell">
          <span className="dash-score-num" style={{ color: scoreColor(c.score) }}>
            {c.score}
          </span>
          <div className="dash-score-bar-track">
            <div
              className="dash-score-bar-fill"
              style={{
                width: `${c.score}%`,
                background: scoreColor(c.score),
              }}
            />
          </div>
        </div>
      </td>

      {/* 만료일 */}
      <td>
        <div className="dash-expiry-cell">
          <span className={`dash-expiry-date${isExpiringSoon ? ' urgent' : ''}`}>
            {c.expiryDate}
          </span>
          <span className={`dash-days-left${isExpiringSoon ? ' urgent' : ''}`}>
            {daysLeftLabel(c.daysLeft)}
          </span>
        </div>
      </td>

      {/* 상태 뱃지 */}
      <td>
        <span className={`dash-status-badge ${c.status}`}>
          {c.status === 'danger' ? '⚠ 위험' :
           c.status === 'warn'   ? '△ 주의' :
                                   '✓ 안전'}
        </span>
      </td>

      {/* 결과 보기 */}
      <td className="dash-cell-action">
        <button
          className="dash-view-btn"
          onClick={() => navigate('/result', { state: { directResult: MOCK_RESULT_MAP[c.id] } })}
        >
          <span className="dash-view-btn-text">결과 보기</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M5 12h14M13 6l6 6-6 6"/>
          </svg>
        </button>
      </td>
    </tr>
  )
}
