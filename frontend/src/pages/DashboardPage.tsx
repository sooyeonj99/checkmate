import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { MOCK_RESULT_MAP } from '../data/mockResults'
import SigningModal from '../components/SigningModal'

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




/* ── Risk helpers ───────────────────────────────────── */
function gradeToRisk(grade: string): RiskLevel {
  if (grade === '위험') return 'danger'
  if (grade === '주의') return 'warn'
  return 'safe'
}

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

/* ── Signing types ──────────────────────────────────── */
interface SigningRecordOut {
  id: number
  type: string
  contract_name: string
  requestee_email: string | null
  status: string
  requester_name: string
  requestee_name: string | null
  created_at: string
  expires_at: string | null
  has_requester_signature: boolean
  has_requestee_signature: boolean
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

/* ── 구독 타입 ── */
interface SubItem {
  id: number; service_name: string; emoji: string; category: string
  monthly_fee: number; billing_cycle: string; billing_date: number
  start_date: string | null; end_date: string | null
  cancellation_penalty: number; notes: string | null
  used_months: number; total_paid: number
}

const CATEGORY_OPTIONS = ['동영상', '음악', '배달', '쇼핑', '게임', '클라우드', '렌탈/약정', '기타']
const POPULAR_SERVICES = [
  { name: 'Netflix', emoji: '🎬', category: '동영상' },
  { name: 'YouTube Premium', emoji: '▶️', category: '동영상' },
  { name: '쿠팡플레이', emoji: '🛒', category: '동영상' },
  { name: '배달의민족', emoji: '🍔', category: '배달' },
  { name: '쿠팡', emoji: '📦', category: '쇼핑' },
  { name: 'Spotify', emoji: '🎵', category: '음악' },
  { name: 'iCloud', emoji: '☁️', category: '클라우드' },
  { name: 'Google One', emoji: '🔵', category: '클라우드' },
]

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

  /* 전자서명 */
  const [showSignModal, setShowSignModal] = useState(false)
  const [signingTarget, setSigningTarget] = useState<{ id: string; name: string } | null>(null)
  const [sentRecords, setSentRecords] = useState<SigningRecordOut[]>([])
  const [receivedRecords, setReceivedRecords] = useState<SigningRecordOut[]>([])
  const [signingTab, setSigningTab] = useState<'sent' | 'received'>('sent')
  const [signToast, setSignToast] = useState('')

  /* 구독 관리 */
  const [subs, setSubs] = useState<SubItem[]>([])
  const [showSubModal, setShowSubModal] = useState(false)
  const [editingSub, setEditingSub] = useState<SubItem | null>(null)
  const [subForm, setSubForm] = useState({
    service_name: '', emoji: '📱', category: '기타',
    monthly_fee: '', billing_date: '1', billing_cycle: 'monthly',
    start_date: '', end_date: '', cancellation_penalty: '', notes: '',
  })

  const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('cm_token')}` })

  const fetchSubs = useCallback(async () => {
    const token = localStorage.getItem('cm_token')
    if (!token) return
    try {
      const res = await fetch('/api/v1/subscriptions', { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) setSubs(await res.json())
    } catch {}
  }, [])

  const openAddSub = () => {
    setEditingSub(null)
    setSubForm({ service_name: '', emoji: '📱', category: '기타', monthly_fee: '', billing_date: '1', billing_cycle: 'monthly', start_date: '', end_date: '', cancellation_penalty: '', notes: '' })
    setShowSubModal(true)
  }
  const openEditSub = (s: SubItem) => {
    setEditingSub(s)
    setSubForm({
      service_name: s.service_name, emoji: s.emoji, category: s.category,
      monthly_fee: String(s.monthly_fee), billing_date: String(s.billing_date),
      billing_cycle: s.billing_cycle, start_date: s.start_date ?? '',
      end_date: s.end_date ?? '', cancellation_penalty: String(s.cancellation_penalty),
      notes: s.notes ?? '',
    })
    setShowSubModal(true)
  }
  const saveSub = async () => {
    const body = {
      service_name: subForm.service_name, emoji: subForm.emoji, category: subForm.category,
      monthly_fee: Number(subForm.monthly_fee) || 0, billing_date: Number(subForm.billing_date) || 1,
      billing_cycle: subForm.billing_cycle,
      start_date: subForm.start_date || null, end_date: subForm.end_date || null,
      cancellation_penalty: Number(subForm.cancellation_penalty) || 0,
      notes: subForm.notes || null,
    }
    if (editingSub) {
      await fetch(`/api/v1/subscriptions/${editingSub.id}`, { method: 'PUT', headers: { ...authHeader(), 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    } else {
      await fetch('/api/v1/subscriptions', { method: 'POST', headers: { ...authHeader(), 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    }
    setShowSubModal(false)
    fetchSubs()
  }
  const deleteSub = async (id: number) => {
    if (!confirm('구독 항목을 삭제할까요?')) return
    await fetch(`/api/v1/subscriptions/${id}`, { method: 'DELETE', headers: authHeader() })
    fetchSubs()
  }

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

  const fetchSigningRecords = useCallback(async () => {
    const token = localStorage.getItem('cm_token')
    if (!token) return
    const headers = { Authorization: `Bearer ${token}` }
    const [sentRes, recvRes] = await Promise.all([
      fetch('/api/v1/signing/my-records', { headers }),
      fetch('/api/v1/signing/received', { headers }),
    ])
    if (sentRes.ok) setSentRecords(await sentRes.json())
    if (recvRes.ok) setReceivedRecords(await recvRes.json())
  }, [])

  useEffect(() => { fetchSaved(); fetchSubs(); fetchSigningRecords() }, [fetchSaved, fetchSubs, fetchSigningRecords])

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

  const savedAsContracts: Contract[] = savedContracts.map(item => ({
    id: String(item.id),
    name: item.filename,
    type: item.contract_type,
    typeEmoji: '',
    score: item.score,
    risk: gradeToRisk(item.grade),
    expiryDate: '',
    daysLeft: -1,
    status: gradeToRisk(item.grade),
    analyzedAt: item.saved_at ? item.saved_at.split('T')[0] : '',
  }))

  const empContracts = savedContracts.filter(c => c.contract_type === '근로계약서')
  const leaseContracts = savedContracts.filter(c => c.contract_type === '임대차계약서')
  const rentalContracts = savedContracts.filter(c => c.contract_type === '렌탈·약정계약')
  const otherEnterpriseContracts = savedContracts.filter(c =>
    !['근로계약서', '임대차계약서', '렌탈·약정계약'].includes(c.contract_type)
  )
  const enterpriseDangerCount = savedContracts.filter(c => c.grade === '위험').length

  const expiringContracts = savedAsContracts.filter((c) => c.daysLeft <= 30 && c.daysLeft > 0)

  const filtered = savedAsContracts
    .filter((c) => filter === 'all' || c.risk === filter)
    .sort((a, b) => {
      if (sortKey === 'score') return a.score - b.score
      if (sortKey === 'expiry') return a.daysLeft - b.daysLeft
      return b.analyzedAt.localeCompare(a.analyzedAt)
    })

  const totalCount = savedAsContracts.length
  const dangerCount = savedAsContracts.filter((c) => c.risk === 'danger').length
  const currentYearMonth = new Date().toISOString().slice(0, 7)
  const thisMonthCount = savedAsContracts.filter((c) =>
    c.analyzedAt.startsWith(currentYearMonth)
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
            {user?.user_type === 'enterprise' ? (<>
              <SummaryCard icon="📁" label="총 계약서" value={savedContracts.length} sub="저장된 분석 건수" accent="blue" />
              <SummaryCard icon="👷" label="근무인원 계약" value={empContracts.length} sub="근로계약서" accent="safe" />
              <SummaryCard icon="🏠" label="임대차 계약" value={leaseContracts.length} sub="임대차계약서" accent="warn" />
              <SummaryCard icon="⚠️" label="위험 계약" value={enterpriseDangerCount} sub="즉시 검토 필요" accent="danger" />
            </>) : (<>
              <SummaryCard icon="📁" label="전체 계약" value={totalCount} sub="누적 분석 건수" accent="blue" />
              <SummaryCard icon="⚠️" label="위험 계약" value={dangerCount} sub="즉시 검토 필요" accent="danger" />
              <SummaryCard icon="📊" label="이번 달 분석" value={thisMonthCount} sub="2026년 6월 기준" accent="safe" />
              <SummaryCard icon="⏰" label="만료 임박" value={expiringContracts.length} sub="30일 이내 만료" accent="warn" />
            </>)}
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
                          className="saved-view-btn"
                          style={{ background: 'rgba(37,99,235,0.1)', color: 'var(--accent)', border: '1px solid rgba(37,99,235,0.2)' }}
                          onClick={() => { setSigningTarget({ id: String(item.id), name: item.filename }); setShowSignModal(true) }}
                        >
                          전자서명
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

          {/* ── 전자서명 내역 ── */}
          <div className="saved-contracts-section" style={{ marginTop: 28 }}>
            <div className="saved-contracts-header">
              <div>
                <h2 className="dash-title" style={{ fontSize: 18, marginBottom: 4 }}>전자서명 내역</h2>
                <p className="dash-subtitle" style={{ fontSize: 13 }}>보낸 서명 요청 및 받은 서명 요청을 확인합니다</p>
              </div>
            </div>
            {/* 탭 */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              {(['sent', 'received'] as const).map((t) => (
                <button key={t} onClick={() => setSigningTab(t)} style={{
                  padding: '8px 20px', borderRadius: 20, border: 'none', cursor: 'pointer',
                  fontWeight: 700, fontSize: 13,
                  background: signingTab === t ? 'var(--accent)' : 'var(--bg)',
                  color: signingTab === t ? '#fff' : 'var(--text-muted)',
                }}>
                  {t === 'sent' ? `보낸 요청 (${sentRecords.length})` : `받은 요청 (${receivedRecords.length})`}
                </button>
              ))}
            </div>
            {(() => {
              const records = signingTab === 'sent' ? sentRecords : receivedRecords
              if (records.length === 0) return (
                <div className="saved-empty">
                  <span style={{ fontSize: 32 }}>✍️</span>
                  <p>{signingTab === 'sent' ? '보낸 서명 요청이 없습니다.' : '받은 서명 요청이 없습니다.'}</p>
                </div>
              )
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {records.map((r) => {
                    const statusColor = r.status === 'signed' ? '#16a34a' : r.status === 'expired' ? '#94a3b8' : '#d97706'
                    const statusText = r.status === 'signed' ? '서명 완료' : r.status === 'expired' ? '만료됨' : '서명 대기'
                    return (
                      <div key={r.id} style={{
                        display: 'flex', alignItems: 'center', gap: 14,
                        background: 'var(--bg-card)', border: '1px solid var(--border)',
                        borderRadius: 12, padding: '14px 18px',
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            📄 {r.contract_name}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            {signingTab === 'sent'
                              ? `→ ${r.requestee_email || '본인 서명'}`
                              : `← ${r.requester_name}님의 요청`}
                            {' · '}{new Date(r.created_at).toLocaleDateString('ko-KR')}
                          </div>
                        </div>
                        <span style={{
                          padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                          background: `${statusColor}18`, color: statusColor,
                          whiteSpace: 'nowrap',
                        }}>
                          {statusText}
                        </span>
                        {r.status === 'signed' && (
                          <button
                            onClick={async () => {
                              const token = localStorage.getItem('cm_token')
                              const res = await fetch(`/api/v1/signing/${r.id}/certificate`, {
                                headers: { Authorization: `Bearer ${token}` },
                              })
                              if (res.ok) {
                                const html = await res.text()
                                const w = window.open('', '_blank')
                                w?.document.write(html)
                                w?.document.close()
                              }
                            }}
                            style={{
                              padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)',
                              background: 'var(--bg)', color: 'var(--text)', fontSize: 12,
                              cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 600,
                            }}
                          >
                            인증서 보기
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </div>

          {/* ── 기업 전용: 계약 유형별 현황 ── */}
          {user?.user_type === 'enterprise' && (
            <div style={{ marginTop: 8 }}>
              {[
                { label: '근무인원 계약 관리', icon: '👷', contracts: empContracts, color: '#3b82f6', desc: '근로계약서, 고용계약서' },
                { label: '임대차 계약 관리', icon: '🏠', contracts: leaseContracts, color: '#8b5cf6', desc: '사무실, 창고, 매장 임대 계약' },
                { label: '렌탈·약정 관리', icon: '🔒', contracts: rentalContracts, color: '#f59e0b', desc: '장비, 차량, 설비 렌탈 계약' },
                { label: '기타 계약', icon: '📝', contracts: otherEnterpriseContracts, color: '#64748b', desc: '용역계약, 구매계약 외 기타' },
              ].map(({ label, icon, contracts, color, desc }) => (
                <div key={label} className="saved-contracts-section" style={{ marginTop: 24 }}>
                  <div className="saved-contracts-header">
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <h2 className="dash-title" style={{ fontSize: 18, marginBottom: 0, color }}>{icon} {label}</h2>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', background: 'var(--bg)', padding: '2px 8px', borderRadius: 10, border: '1px solid var(--border)' }}>{contracts.length}건</span>
                      </div>
                      <p className="dash-subtitle" style={{ fontSize: 13 }}>{desc}</p>
                    </div>
                    <button className="btn-primary" style={{ fontSize: 13, padding: '8px 16px' }} onClick={() => navigate('/upload')}>
                      + 새 분석
                    </button>
                  </div>
                  {contracts.length === 0 ? (
                    <div className="saved-empty">
                      <span style={{ fontSize: 32 }}>{icon}</span>
                      <p>저장된 {label}이 없습니다.</p>
                      <p style={{ fontSize: 13 }}>계약서를 분석한 후 결과 저장을 선택하면 여기에 표시됩니다.</p>
                    </div>
                  ) : (
                    <div className="saved-grid">
                      {contracts.map((item) => {
                        const gradeColor =
                          item.grade === '위험' ? 'var(--risk-high)' :
                          item.grade === '주의' ? 'var(--risk-mid)' : 'var(--risk-safe)'
                        return (
                          <div key={item.id} className="saved-card">
                            <div className="saved-card-top">
                              <div className="saved-card-type">{item.contract_type}</div>
                              <span className="saved-card-grade" style={{ color: gradeColor }}>{item.grade}</span>
                            </div>
                            <div className="saved-card-name">{item.filename}</div>
                            <div className="saved-card-score" style={{ color: gradeColor }}>위험도 <strong>{item.score}</strong>점</div>
                            <div className="saved-card-counts">
                              <span className="saved-count danger">{item.danger_count} 위험</span>
                              <span className="saved-count warn">{item.warn_count} 주의</span>
                              <span className="saved-count safe">{item.safe_count} 안전</span>
                            </div>
                            <div className="saved-card-date">
                              {new Date(item.saved_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })} 저장
                            </div>
                            <div className="saved-card-actions">
                              <button className="saved-view-btn" onClick={() => handleViewSaved(item)}>결과 보기</button>
                              <button className="saved-view-btn"
                                style={{ background: 'rgba(37,99,235,0.1)', color: 'var(--accent)', border: '1px solid rgba(37,99,235,0.2)' }}
                                onClick={() => { setSigningTarget({ id: String(item.id), name: item.filename }); setShowSignModal(true) }}>
                                전자서명
                              </button>
                              <button className="saved-delete-btn" onClick={() => handleDeleteSaved(item.id)} disabled={deletingId === item.id}>
                                {deletingId === item.id ? '삭제 중...' : '삭제'}
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              ))}

              {/* 종료된 계약 관리 - 준비중 */}
              <div className="saved-contracts-section" style={{ marginTop: 24, opacity: 0.65 }}>
                <div className="saved-contracts-header">
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <h2 className="dash-title" style={{ fontSize: 18, marginBottom: 0 }}>📅 종료된 계약 관리</h2>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: 'rgba(37,99,235,0.1)', color: 'var(--accent)' }}>준비중</span>
                    </div>
                    <p className="dash-subtitle" style={{ fontSize: 13 }}>계약 종료일 추적, 갱신 알림, 아카이브 관리</p>
                  </div>
                </div>
                <div className="saved-empty" style={{ padding: '32px 0' }}>
                  <span style={{ fontSize: 32 }}>🔜</span>
                  <p>종료된 계약 관리 기능은 곧 출시됩니다.</p>
                  <p style={{ fontSize: 13 }}>계약 만료일 추적 및 자동 갱신 알림 기능이 추가될 예정입니다.</p>
                </div>
              </div>
            </div>
          )}

          {/* ── 구독·렌탈 관리 섹션 (개인 사용자만) ── */}
          {user?.user_type !== 'enterprise' && (<>
          <div className="sub-detail-section">
            <div className="sub-detail-section-header">
              <div>
                <h2 className="dash-title" style={{ fontSize: 18, marginBottom: 4 }}>구독·렌탈 관리</h2>
                <p className="dash-subtitle" style={{ fontSize: 13 }}>이용 중인 구독/렌탈 서비스를 추가하고 지출 현황을 파악하세요</p>
              </div>
              <button className="btn-primary" style={{ fontSize: 13, padding: '8px 16px' }} onClick={openAddSub}>
                + 구독 추가
              </button>
            </div>

            {subs.length === 0 ? (
              <div className="saved-empty" style={{ padding: '32px 0' }}>
                <span style={{ fontSize: 32 }}>📋</span>
                <p>등록된 구독/렌탈 서비스가 없습니다.</p>
                <p style={{ fontSize: 13 }}>넷플릭스, 쿠팡, 렌탈 계약 등을 추가하면 지출 현황을 한눈에 파악할 수 있습니다.</p>
              </div>
            ) : (
              <div className="sub-detail-grid">
                {subs.map((s) => (
                  <div key={s.id} className="sub-detail-card">
                    <div className="sub-detail-header">
                      <span style={{ fontSize: 24 }}>{s.emoji}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="sub-detail-name">{s.service_name}</div>
                        <div className="sub-detail-type">{s.category}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => openEditSub(s)} style={{ fontSize: 12, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer', color: 'var(--text)' }}>수정</button>
                        <button onClick={() => deleteSub(s.id)} style={{ fontSize: 12, padding: '4px 8px', borderRadius: 6, border: '1px solid rgba(217,64,64,0.3)', background: 'transparent', cursor: 'pointer', color: 'var(--risk-high)' }}>삭제</button>
                      </div>
                    </div>
                    <div className="sub-detail-metrics" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
                      {[
                        { label: '월 이용료', value: `${s.monthly_fee.toLocaleString('ko-KR')}원` },
                        { label: '결제일', value: `매월 ${s.billing_date}일` },
                        { label: '이용 기간', value: s.used_months ? `${s.used_months}개월` : s.start_date ?? '-' },
                        { label: '총 지출', value: s.total_paid ? `${s.total_paid.toLocaleString('ko-KR')}원` : '-', accent: true },
                        ...(s.cancellation_penalty ? [{ label: '해지 위약금', value: `${s.cancellation_penalty.toLocaleString('ko-KR')}원`, danger: true }] : []),
                      ].map((m: any) => (
                        <div key={m.label} style={{ background: 'var(--bg)', borderRadius: 8, padding: '8px 10px' }}>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>{m.label}</div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: m.danger ? 'var(--risk-high)' : m.accent ? 'var(--accent)' : 'var(--text)' }}>{m.value}</div>
                        </div>
                      ))}
                    </div>
                    {s.notes && <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: 8 }}>{s.notes}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── 구독 추가/수정 모달 ── */}
          {showSubModal && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
              <div style={{ background: 'var(--bg-card)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, color: 'var(--text)' }}>{editingSub ? '구독 수정' : '구독 추가'}</h2>

                {/* 빠른 선택 */}
                {!editingSub && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>자주 쓰는 서비스</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {POPULAR_SERVICES.map(p => (
                        <button key={p.name} onClick={() => setSubForm(f => ({ ...f, service_name: p.name, emoji: p.emoji, category: p.category }))}
                          style={{ fontSize: 12, padding: '4px 10px', borderRadius: 20, border: '1px solid var(--border)', background: subForm.service_name === p.name ? 'var(--accent)' : 'var(--bg)', color: subForm.service_name === p.name ? '#fff' : 'var(--text)', cursor: 'pointer' }}>
                          {p.emoji} {p.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {[
                  { label: '서비스 이름 *', key: 'service_name', placeholder: '예: Netflix' },
                  { label: '이모지', key: 'emoji', placeholder: '📱' },
                  { label: '월 이용료 (원)', key: 'monthly_fee', placeholder: '13500', type: 'number' },
                  { label: '결제일 (매월 N일)', key: 'billing_date', placeholder: '1', type: 'number' },
                  { label: '시작일 (YYYY-MM-DD)', key: 'start_date', placeholder: '2024-01-01' },
                  { label: '종료일 (없으면 비워두기)', key: 'end_date', placeholder: '무기한' },
                  { label: '해지 위약금 (원)', key: 'cancellation_penalty', placeholder: '0', type: 'number' },
                  { label: '메모', key: 'notes', placeholder: '특이사항 입력' },
                ].map(({ label, key, placeholder, type }) => (
                  <div key={key} style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
                    <input
                      type={type ?? 'text'}
                      value={(subForm as any)[key]}
                      onChange={e => setSubForm(f => ({ ...f, [key]: e.target.value }))}
                      placeholder={placeholder}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 14, boxSizing: 'border-box' }}
                    />
                  </div>
                ))}

                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>카테고리</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {CATEGORY_OPTIONS.map(c => (
                      <button key={c} onClick={() => setSubForm(f => ({ ...f, category: c }))}
                        style={{ fontSize: 12, padding: '4px 10px', borderRadius: 20, border: '1px solid var(--border)', background: subForm.category === c ? 'var(--accent)' : 'var(--bg)', color: subForm.category === c ? '#fff' : 'var(--text)', cursor: 'pointer' }}>
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setShowSubModal(false)} style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', fontSize: 14, cursor: 'pointer' }}>취소</button>
                  <button onClick={saveSub} disabled={!subForm.service_name} style={{ flex: 2, padding: '12px', borderRadius: 12, background: subForm.service_name ? 'var(--accent)' : 'var(--border)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', border: 'none' }}>
                    {editingSub ? '수정 완료' : '추가 완료'}
                  </button>
                </div>
              </div>
            </div>
          )}

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
                     f === 'danger' ? `위험 ${savedAsContracts.filter(c => c.risk === 'danger').length}` :
                     f === 'warn'   ? `주의 ${savedAsContracts.filter(c => c.risk === 'warn').length}` :
                                     `안전 ${savedAsContracts.filter(c => c.risk === 'safe').length}`}
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
                  {filtered.map((c) => {
                    const savedItem = savedContracts.find(s => String(s.id) === c.id)
                    return (
                      <ContractRow
                        key={c.id}
                        contract={c}
                        onView={savedItem ? () => handleViewSaved(savedItem) : undefined}
                      />
                    )
                  })}
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

          </>)}

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

      {/* ── 전자서명 모달 ── */}
      {showSignModal && signingTarget && (
        <SigningModal
          contractId={signingTarget.id}
          contractName={signingTarget.name}
          onClose={() => { setShowSignModal(false); setSigningTarget(null) }}
          onDone={(msg) => {
            setShowSignModal(false)
            setSigningTarget(null)
            setSignToast(msg)
            fetchSigningRecords()
            setTimeout(() => setSignToast(''), 4000)
          }}
        />
      )}

      {/* ── 서명 완료 토스트 ── */}
      {signToast && (
        <div style={{
          position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
          background: '#16a34a', color: '#fff', borderRadius: 12,
          padding: '14px 24px', fontWeight: 700, fontSize: 15,
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)', zIndex: 9999,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          ✓ {signToast}
        </div>
      )}
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

/* ── Contract row ───────────────────────────────────── */
function ContractRow({ contract: c, onView }: { contract: Contract; onView?: () => void }) {
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
          {c.expiryDate ? (
            <>
              <span className={`dash-expiry-date${isExpiringSoon ? ' urgent' : ''}`}>
                {c.expiryDate}
              </span>
              <span className={`dash-days-left${isExpiringSoon ? ' urgent' : ''}`}>
                {daysLeftLabel(c.daysLeft)}
              </span>
            </>
          ) : (
            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>-</span>
          )}
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
          onClick={() => onView ? onView() : navigate('/result', { state: { directResult: MOCK_RESULT_MAP[c.id] } })}
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
