import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MOCK_RESULT_MAP } from '../data/mockResults'

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
    expiryDate: '2031-06-20',
    daysLeft: 1826,
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
  const [filter, setFilter] = useState<'all' | RiskLevel>('all')
  const [sortKey, setSortKey] = useState<'score' | 'expiry' | 'analyzed'>('analyzed')
  const [dismissedBanner, setDismissedBanner] = useState(false)

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
          <div className="dash-avatar">J</div>
        </div>
      </header>

      <main className="dash-main">
        <div className="dash-container">

          {/* ── Page heading ── */}
          <div className="dash-heading">
            <div>
              <h1 className="dash-title">내 계약 대시보드</h1>
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

          {/* ── Expiry alert banner ── */}
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

        </div>
      </main>
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
        <span className="dash-contract-emoji">{c.typeEmoji}</span>
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
