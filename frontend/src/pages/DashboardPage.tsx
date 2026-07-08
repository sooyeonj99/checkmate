import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { MOCK_RESULT_MAP } from '../data/mockResults'
import SigningModal from '../components/SigningModal'
import TemplateModal from '../components/TemplateModal'

interface SearchResult {
  id: number
  filename: string
  contract_type: string
  score: number
  grade: string
  saved_at: string
  match_snippet: string
}

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
  const [signingDefaultTab, setSigningDefaultTab] = useState<'self' | 'request'>('self')
  const [sentRecords, setSentRecords] = useState<SigningRecordOut[]>([])
  const [receivedRecords, setReceivedRecords] = useState<SigningRecordOut[]>([])
  const [signingTab, setSigningTab] = useState<'sent' | 'received'>('sent')
  const [signToast, setSignToast] = useState('')

  /* 만료일 */
  interface ExpiringItem { id: number; filename: string; contract_type: string; expiry_date: string; days_left: number; expired: boolean }
  const [expiringContracts, setExpiringContracts] = useState<ExpiringItem[]>([])
  const [expiryEditId, setExpiryEditId] = useState<number | null>(null)
  const [expiryDate, setExpiryDate] = useState('')
  const fetchExpiring = useCallback(async () => {
    const token = localStorage.getItem('cm_token')
    if (!token) return
    try {
      const res = await fetch('/api/v1/contracts/expiring', { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) setExpiringContracts(await res.json())
    } catch {}
  }, [])
  const handleSetExpiry = async (savedId: number) => {
    if (!expiryDate) return
    const token = localStorage.getItem('cm_token')
    await fetch(`/api/v1/contracts/saved/${savedId}/expiry`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ expiry_date: expiryDate }),
    })
    setExpiryEditId(null); setExpiryDate(''); fetchExpiring()
  }

  /* 팀 관리 */
  interface TeamMemberItem { id: number; member_email: string; role: string; status: string; invite_method?: string; member_phone?: string | null; invited_at: string; joined_at: string | null; username: string | null }
  const [teamMembers, setTeamMembers] = useState<TeamMemberItem[]>([])
  const [inviteMethod, setInviteMethod] = useState<'email' | 'sms'>('email')
  const [inviteEmail, setInviteEmail] = useState('')
  const [invitePhone, setInvitePhone] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [inviting, setInviting] = useState(false)
  const [inviteMsg, setInviteMsg] = useState('')
  const [inviteMsgType, setInviteMsgType] = useState<'success' | 'error'>('success')
  const [copiedLink, setCopiedLink] = useState('')

  const fetchTeamMembers = useCallback(async () => {
    const token = localStorage.getItem('cm_token')
    if (!token) return
    try {
      const res = await fetch('/api/v1/team/members', { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) setTeamMembers(await res.json())
    } catch {}
  }, [])

  const handleInvite = async () => {
    const value = inviteMethod === 'email' ? inviteEmail : invitePhone
    if (!value) return
    setInviting(true)
    setCopiedLink('')
    const token = localStorage.getItem('cm_token')
    try {
      if (inviteMethod === 'email') {
        const res = await fetch('/api/v1/team/invite', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
        })
        const data = await res.json()
        if (res.ok) { setInviteMsg('초대 메일이 발송되었습니다.'); setInviteMsgType('success'); setInviteEmail(''); fetchTeamMembers() }
        else { setInviteMsg(data.detail || '오류가 발생했습니다.'); setInviteMsgType('error') }
      } else {
        const res = await fetch('/api/v1/team/invite/sms', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: invitePhone, role: inviteRole }),
        })
        const data = await res.json()
        if (res.ok) {
          if (data.sms_sent) {
            setInviteMsg('초대 문자가 발송되었습니다.'); setInviteMsgType('success')
          } else {
            setInviteMsg('SMS 미설정 — 아래 링크를 복사해서 직접 공유하세요.'); setInviteMsgType('success')
            setCopiedLink(data.invite_link)
          }
          setInvitePhone(''); fetchTeamMembers()
        } else { setInviteMsg(data.detail || '오류가 발생했습니다.'); setInviteMsgType('error') }
      }
    } catch { setInviteMsg('오류가 발생했습니다.'); setInviteMsgType('error') }
    setInviting(false)
    if (!copiedLink) setTimeout(() => setInviteMsg(''), 4000)
  }
  const handleRemoveMember = async (id: number) => {
    if (!confirm('이 팀원을 삭제할까요?')) return
    const token = localStorage.getItem('cm_token')
    await fetch(`/api/v1/team/members/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    fetchTeamMembers()
  }

  /* B2B 대시보드 통계 */
  interface B2BStats { total_contracts: number; this_month: number; danger_count: number; warn_count: number; safe_count: number; team_members: number; contract_types: Record<string, number> }
  const [b2bStats, setB2bStats] = useState<B2BStats | null>(null)
  const fetchB2BStats = useCallback(async () => {
    const token = localStorage.getItem('cm_token')
    if (!token) return
    try {
      const [savedRes, teamRes] = await Promise.all([
        fetch('/api/v1/contracts/saved', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/v1/team/members', { headers: { Authorization: `Bearer ${token}` } }),
      ])
      if (savedRes.ok) {
        const contracts: SavedContractItem[] = await savedRes.json()
        const teamList: TeamMemberItem[] = teamRes.ok ? await teamRes.json() : []
        const ym = new Date().toISOString().slice(0, 7)
        const typeMap: Record<string, number> = {}
        contracts.forEach(c => { typeMap[c.contract_type] = (typeMap[c.contract_type] || 0) + 1 })
        setB2bStats({
          total_contracts: contracts.length,
          this_month: contracts.filter(c => c.saved_at?.startsWith(ym)).length,
          danger_count: contracts.filter(c => c.grade === '위험').length,
          warn_count: contracts.filter(c => c.grade === '주의').length,
          safe_count: contracts.filter(c => c.grade === '안전').length,
          team_members: teamList.filter(m => m.status === 'active').length,
          contract_types: typeMap,
        })
      }
    } catch {}
  }, [])

  /* 계약서 템플릿 */
  const [showTemplateModal, setShowTemplateModal] = useState(false)

  /* 검색 */
  const [searchQ, setSearchQ] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setSearchResults([]); return }
    setSearchLoading(true)
    const token = localStorage.getItem('cm_token')
    try {
      const res = await fetch(`/api/v1/search/contracts?q=${encodeURIComponent(q)}&limit=10`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) setSearchResults(await res.json())
    } catch {}
    setSearchLoading(false)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => doSearch(searchQ), 350)
    return () => clearTimeout(t)
  }, [searchQ, doSearch])

  useEffect(() => {
    if (!searchOpen) return
    const close = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false)
    }
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [searchOpen])

  /* 커스텀 템플릿 */
  interface UserTemplateItem { id: number; name: string; content_type: string; file_ext: string | null; created_at: string }
  const [userTemplates, setUserTemplates] = useState<UserTemplateItem[]>([])
  const fetchUserTemplates = useCallback(async () => {
    const token = localStorage.getItem('cm_token')
    if (!token) return
    try {
      const res = await fetch('/api/v1/templates/user', { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) setUserTemplates(await res.json())
    } catch {}
  }, [])

  const deleteUserTemplate = async (id: number) => {
    if (!confirm('이 템플릿을 삭제할까요?')) return
    const token = localStorage.getItem('cm_token')
    await fetch(`/api/v1/templates/user/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    fetchUserTemplates()
  }

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

  useEffect(() => {
    fetchSaved(); fetchSubs(); fetchSigningRecords(); fetchUserTemplates(); fetchExpiring()
    if (user?.user_type === 'enterprise') { fetchTeamMembers(); fetchB2BStats() }
  }, [fetchSaved, fetchSubs, fetchSigningRecords, fetchUserTemplates, fetchExpiring, fetchTeamMembers, fetchB2BStats, user?.user_type])

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

  const expiringLocalContracts = savedAsContracts.filter((c) => c.daysLeft <= 30 && c.daysLeft > 0)

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
                {user?.user_type === 'franchisor' && (
                  <Link to="/franchise" className="navbar-dropdown-item" onClick={() => setDropdownOpen(false)}>
                    프랜차이즈 관리
                  </Link>
                )}
                <Link to="/profile" className="navbar-dropdown-item" onClick={() => setDropdownOpen(false)}>
                  내 정보
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

          {/* ── 프랜차이즈 본사 배너 ── */}
          {user?.user_type === 'franchisor' && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 20px', borderRadius: 14, marginBottom: 20,
              background: 'rgba(37,99,235,0.06)', border: '1.5px solid rgba(37,99,235,0.2)',
            }}>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--accent)', marginBottom: 2 }}>🏪 프랜차이즈 본사 계정</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>가맹점 계약서 현황을 통합 관리하세요</div>
              </div>
              <button className="btn-primary" style={{ padding: '10px 18px', fontSize: 13 }} onClick={() => navigate('/franchise')}>
                프랜차이즈 관리 →
              </button>
            </div>
          )}
          {user?.user_type === 'franchisee' && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 20px', borderRadius: 14, marginBottom: 20,
              background: 'rgba(22,163,74,0.06)', border: '1.5px solid rgba(22,163,74,0.2)',
            }}>
              <span style={{ fontSize: 20 }}>🛒</span>
              <div style={{ fontSize: 13, color: '#15803d', fontWeight: 600 }}>가맹점주 계정 — 분석한 계약서는 본사에서도 확인할 수 있습니다.</div>
            </div>
          )}

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
                  {user?.user_type === 'enterprise' ? '🏢 기업/법인' : user?.user_type === 'franchisor' ? '🏪 프랜차이즈 본사' : user?.user_type === 'franchisee' ? '🛒 가맹점주' : '👤 개인'}
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

          {/* ── 검색 바 ── */}
          <div ref={searchRef} style={{ position: 'relative', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 16px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
              <input
                value={searchQ}
                onChange={e => { setSearchQ(e.target.value); setSearchOpen(true) }}
                onFocus={() => setSearchOpen(true)}
                placeholder="계약서 검색... (파일명, 유형, 조항 내용)"
                style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', color: 'var(--text)', fontSize: 14 }}
              />
              {searchLoading && <div style={{ width: 16, height: 16, border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />}
            </div>
            {searchOpen && searchQ && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', marginTop: 4, maxHeight: 360, overflowY: 'auto' }}>
                {searchResults.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
                    {searchLoading ? '검색 중...' : '검색 결과가 없습니다.'}
                  </div>
                ) : searchResults.map(r => {
                  const gc = r.grade === '위험' ? '#ef4444' : r.grade === '주의' ? '#f59e0b' : '#22c55e'
                  return (
                    <div key={r.id} onClick={() => { handleViewSaved({ id: r.id, contract_id: '', filename: r.filename, contract_type: r.contract_type, score: r.score, grade: r.grade, danger_count: 0, warn_count: 0, safe_count: 0, analysis_time: '', saved_at: r.saved_at }); setSearchOpen(false); setSearchQ('') }}
                      style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'center' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.filename}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.match_snippet}</div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: gc, flexShrink: 0 }}>{r.grade}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── 퀵 액션 ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
            {[
              { icon: '📊', label: '분석 통계', to: '/stats', color: '#8b5cf6' },
              { icon: '⚖️', label: '계약서 비교', to: '/compare', color: '#3b82f6' },
              { icon: '✨', label: 'AI 생성기', to: '/generate', color: '#f59e0b' },
              { icon: '📦', label: '일괄 분석', to: '/bulk', color: '#10b981' },
              ...(user?.email === 'ghdiehddl@gmail.com' ? [{ icon: '🛡️', label: '어드민', to: '/admin', color: '#ef4444' }] : []),
            ].map(a => (
              <Link key={a.to} to={a.to} style={{ textDecoration: 'none' }}>
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', transition: 'border-color 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = a.color)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
                  <span style={{ fontSize: 22 }}>{a.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{a.label}</span>
                </div>
              </Link>
            ))}
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
              <SummaryCard icon="⏰" label="만료 임박" value={expiringLocalContracts.length} sub="30일 이내 만료" accent="warn" />
            </>)}
          </div>

          {/* ── 만료 임박 알림 배너 ── */}
          {expiringContracts.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              {expiringContracts.map(e => (
                <div key={e.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                  borderRadius: 12, marginBottom: 8, border: '1px solid',
                  borderColor: e.expired ? '#ef4444' : e.days_left <= 3 ? '#f59e0b' : '#3b82f6',
                  background: e.expired ? 'rgba(239,68,68,0.06)' : e.days_left <= 3 ? 'rgba(245,158,11,0.06)' : 'rgba(59,130,246,0.06)',
                }}>
                  <span style={{ fontSize: 20 }}>{e.expired ? '🔴' : e.days_left <= 3 ? '🟠' : '🔵'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{e.filename}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {e.expired ? `만료됨 (${e.expiry_date})` : `만료까지 ${e.days_left}일 (${e.expiry_date})`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

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
                          onClick={async () => {
                            const token = localStorage.getItem('cm_token')
                            const res = await fetch(`/api/v1/contracts/saved/${item.id}/report`, { headers: { Authorization: `Bearer ${token}` } })
                            if (res.ok) { const html = await res.text(); const w = window.open('', '_blank'); w?.document.write(html); w?.document.close() }
                          }}
                        >
                          📄 리포트
                        </button>
                        <button
                          className="saved-view-btn"
                          style={{ background: 'rgba(37,99,235,0.1)', color: 'var(--accent)', border: '1px solid rgba(37,99,235,0.2)' }}
                          onClick={() => {
                            setSigningDefaultTab(user?.user_type === 'enterprise' ? 'request' : 'self')
                            setSigningTarget({ id: String(item.id), name: item.filename })
                            setShowSignModal(true)
                          }}
                        >
                          {user?.user_type === 'enterprise' ? '계약서 보내기' : '전자서명'}
                        </button>
                        <button
                          className="saved-view-btn"
                          style={{ background: 'rgba(100,116,139,0.1)', color: 'var(--text-muted)', border: '1px solid var(--border)', fontSize: 11 }}
                          onClick={() => { setExpiryEditId(expiryEditId === item.id ? null : item.id); setExpiryDate('') }}
                        >
                          📅 만료일
                        </button>
                        <button
                          className="saved-delete-btn"
                          onClick={() => handleDeleteSaved(item.id)}
                          disabled={deletingId === item.id}
                        >
                          {deletingId === item.id ? '삭제 중...' : '삭제'}
                        </button>
                      </div>
                      {expiryEditId === item.id && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
                          <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)}
                            style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text)', fontSize: 13 }} />
                          <button onClick={() => handleSetExpiry(item.id)}
                            style={{ padding: '8px 14px', borderRadius: 8, background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                            저장
                          </button>
                        </div>
                      )}
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
                          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                            <button
                              onClick={async () => {
                                const token = localStorage.getItem('cm_token')
                                const res = await fetch(`/api/v1/signing/${r.id}/signed-doc`, {
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
                                padding: '6px 12px', borderRadius: 8,
                                border: '1px solid rgba(37,99,235,0.35)',
                                background: 'rgba(37,99,235,0.08)', color: 'var(--accent)',
                                fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 700,
                              }}
                            >
                              📄 서명된 문서
                            </button>
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
                                background: 'var(--bg)', color: 'var(--text-muted)', fontSize: 12,
                                cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 600,
                              }}
                            >
                              인증서
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </div>

          {/* ── 기업 전용: B2B SaaS 대시보드 ── */}
          {user?.user_type === 'enterprise' && b2bStats && (
            <div className="saved-contracts-section" style={{ marginTop: 28 }}>
              <div className="saved-contracts-header" style={{ marginBottom: 20 }}>
                <div>
                  <h2 className="dash-title" style={{ fontSize: 18, marginBottom: 4 }}>📊 기업 분석 현황</h2>
                  <p className="dash-subtitle" style={{ fontSize: 13 }}>이번 달 계약 분석 통계 및 위험도 분포</p>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 14, marginBottom: 20 }}>
                {[
                  { icon: '📁', label: '총 계약서', value: b2bStats.total_contracts, color: 'var(--accent)' },
                  { icon: '📅', label: '이번 달 분석', value: b2bStats.this_month, color: '#10b981' },
                  { icon: '⚠️', label: '위험', value: b2bStats.danger_count, color: 'var(--risk-high)' },
                  { icon: '△', label: '주의', value: b2bStats.warn_count, color: 'var(--risk-mid)' },
                  { icon: '✓', label: '안전', value: b2bStats.safe_count, color: 'var(--risk-safe)' },
                  { icon: '👥', label: '활성 팀원', value: b2bStats.team_members, color: '#8b5cf6' },
                ].map(s => (
                  <div key={s.label} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 14px', textAlign: 'center' }}>
                    <div style={{ fontSize: 22, marginBottom: 6 }}>{s.icon}</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{s.label}</div>
                  </div>
                ))}
              </div>
              {/* 계약 유형 분포 */}
              {Object.keys(b2bStats.contract_types).length > 0 && (
                <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>계약 유형 분포</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {Object.entries(b2bStats.contract_types).sort(([,a],[,b]) => b - a).map(([type, count]) => {
                      const pct = Math.round((count / b2bStats.total_contracts) * 100)
                      return (
                        <div key={type}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: 13, color: 'var(--text)' }}>{type}</span>
                            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>{count}건 ({pct}%)</span>
                          </div>
                          <div style={{ height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: 'var(--accent)', borderRadius: 4, transition: 'width 0.6s ease' }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              {/* 위험도 분포 바 */}
              {b2bStats.total_contracts > 0 && (
                <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px', marginTop: 14 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>위험도 분포</div>
                  <div style={{ display: 'flex', height: 24, borderRadius: 8, overflow: 'hidden', gap: 2 }}>
                    {b2bStats.danger_count > 0 && <div style={{ flex: b2bStats.danger_count, background: 'var(--risk-high)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff', fontWeight: 700 }}>{b2bStats.danger_count}</div>}
                    {b2bStats.warn_count > 0 && <div style={{ flex: b2bStats.warn_count, background: 'var(--risk-mid)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff', fontWeight: 700 }}>{b2bStats.warn_count}</div>}
                    {b2bStats.safe_count > 0 && <div style={{ flex: b2bStats.safe_count, background: 'var(--risk-safe)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff', fontWeight: 700 }}>{b2bStats.safe_count}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                    {[['var(--risk-high)', '위험'], ['var(--risk-mid)', '주의'], ['var(--risk-safe)', '안전']].map(([color, label]) => (
                      <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-muted)' }}>
                        <div style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
                        {label}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── 기업 전용: 팀 관리 ── */}
          {user?.user_type === 'enterprise' && (
            <div className="saved-contracts-section" style={{ marginTop: 28 }}>
              <div className="saved-contracts-header">
                <div>
                  <h2 className="dash-title" style={{ fontSize: 18, marginBottom: 4 }}>👥 팀 관리</h2>
                  <p className="dash-subtitle" style={{ fontSize: 13 }}>팀원을 초대하고 계약서 분석 권한을 부여하세요</p>
                </div>
              </div>
              {/* 초대 폼 */}
              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px', marginBottom: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>새 팀원 초대</div>
                {/* 초대 방법 탭 */}
                <div style={{ display: 'flex', gap: 0, marginBottom: 14, border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', width: 'fit-content' }}>
                  {(['email', 'sms'] as const).map(m => (
                    <button key={m} onClick={() => { setInviteMethod(m); setInviteMsg(''); setCopiedLink('') }}
                      style={{ padding: '8px 20px', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
                        background: inviteMethod === m ? 'var(--accent)' : 'var(--bg-input)',
                        color: inviteMethod === m ? '#fff' : 'var(--text-muted)' }}>
                      {m === 'email' ? '이메일' : '핸드폰 번호'}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {inviteMethod === 'email' ? (
                    <input type="email" placeholder="초대할 이메일 주소"
                      value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                      style={{ flex: '1 1 220px', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text)', fontSize: 14 }} />
                  ) : (
                    <input type="tel" placeholder="010-1234-5678"
                      value={invitePhone} onChange={e => setInvitePhone(e.target.value)}
                      style={{ flex: '1 1 220px', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text)', fontSize: 14 }} />
                  )}
                  <select value={inviteRole} onChange={e => setInviteRole(e.target.value)}
                    style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text)', fontSize: 14 }}>
                    <option value="member">멤버</option>
                    <option value="admin">관리자</option>
                  </select>
                  <button onClick={handleInvite}
                    disabled={inviting || (inviteMethod === 'email' ? !inviteEmail : !invitePhone)}
                    style={{ padding: '10px 20px', borderRadius: 10, border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap',
                      background: (inviteMethod === 'email' ? inviteEmail : invitePhone) ? 'var(--accent)' : 'var(--border)', color: '#fff' }}>
                    {inviting ? '발송 중...' : inviteMethod === 'email' ? '초대 메일 보내기' : '초대 문자 보내기'}
                  </button>
                </div>
                {inviteMsg && (
                  <div style={{ marginTop: 10, fontSize: 13, color: inviteMsgType === 'success' ? '#16a34a' : 'var(--risk-high)', fontWeight: 600 }}>
                    {inviteMsg}
                  </div>
                )}
                {copiedLink && (
                  <div style={{ marginTop: 10, background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 10, padding: '10px 14px' }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>초대 링크 — 직접 복사해서 문자/카카오로 공유하세요</div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: 'var(--accent)', wordBreak: 'break-all', flex: 1 }}>{copiedLink}</span>
                      <button onClick={() => { navigator.clipboard.writeText(copiedLink); setInviteMsg('링크가 복사되었습니다.') }}
                        style={{ padding: '5px 12px', borderRadius: 7, background: 'var(--accent)', color: '#fff', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        복사
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {/* 팀원 목록 */}
              {teamMembers.length === 0 ? (
                <div className="saved-empty">
                  <span style={{ fontSize: 32 }}>👥</span>
                  <p>아직 초대된 팀원이 없습니다.</p>
                  <p style={{ fontSize: 13 }}>이메일로 팀원을 초대하면 계약서 분석 기능을 공유할 수 있습니다.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {teamMembers.map(m => (
                    <div key={m.id} style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      background: 'var(--bg)', border: '1px solid var(--border)',
                      borderRadius: 12, padding: '14px 18px',
                    }}>
                      <div style={{ width: 38, height: 38, borderRadius: '50%', background: m.status === 'active' ? 'rgba(37,99,235,0.12)' : 'rgba(100,116,139,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, color: m.status === 'active' ? 'var(--accent)' : 'var(--text-muted)', flexShrink: 0 }}>
                        {(m.username || m.member_email).charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {m.username || (m.invite_method === 'sms' ? m.member_phone : m.member_email)}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {m.invite_method === 'sms'
                            ? `📱 ${m.member_phone}`
                            : `✉️ ${m.member_email}`
                          } · {m.role === 'admin' ? '관리자' : '멤버'} · {m.status === 'active' ? '활성' : '초대 대기중'}
                        </div>
                      </div>
                      <span style={{
                        padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                        background: m.status === 'active' ? 'rgba(22,163,74,0.1)' : 'rgba(245,158,11,0.1)',
                        color: m.status === 'active' ? '#16a34a' : '#d97706',
                        whiteSpace: 'nowrap',
                      }}>
                        {m.status === 'active' ? '✓ 활성' : '⏳ 대기'}
                      </span>
                      <button onClick={() => handleRemoveMember(m.id)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.06)', color: '#dc2626', fontSize: 12, cursor: 'pointer', flexShrink: 0 }}>
                        삭제
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── 기업 전용: 계약서 템플릿 발송 ── */}
          {user?.user_type === 'enterprise' && (
            <div className="saved-contracts-section" style={{ marginTop: 28 }}>
              <div className="saved-contracts-header">
                <div>
                  <h2 className="dash-title" style={{ fontSize: 18, marginBottom: 4 }}>📑 계약서 템플릿 발송</h2>
                  <p className="dash-subtitle" style={{ fontSize: 13 }}>
                    미리 준비된 계약서 양식에 내용을 채워 상대방에게 바로 발송하고 전자서명을 받으세요
                  </p>
                </div>
                <button
                  className="btn-primary"
                  style={{ fontSize: 13, padding: '8px 18px' }}
                  onClick={() => setShowTemplateModal(true)}
                >
                  📝 템플릿으로 계약서 보내기
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                {[
                  { icon: '👷', name: '표준 근로계약서', desc: '고용노동부 표준 양식', color: '#3b82f6' },
                  { icon: '🏢', name: '부동산 임대차계약서', desc: '사무실·창고·매장 임대', color: '#8b5cf6' },
                  { icon: '📋', name: '업무위탁(용역)계약서', desc: '프리랜서·외주 업무 위탁', color: '#10b981' },
                ].map(t => (
                  <div key={t.name} style={{
                    background: 'var(--bg)', border: '1px solid var(--border)',
                    borderRadius: 14, padding: '18px 16px',
                    display: 'flex', flexDirection: 'column', gap: 8,
                  }}>
                    <span style={{ fontSize: 28 }}>{t.icon}</span>
                    <div style={{ fontWeight: 700, fontSize: 14, color: t.color }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.desc}</div>
                    <button
                      onClick={() => setShowTemplateModal(true)}
                      style={{
                        marginTop: 'auto', padding: '7px 12px', borderRadius: 8,
                        border: `1.5px solid ${t.color}30`, background: `${t.color}10`,
                        color: t.color, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                      }}
                    >
                      이 양식 사용하기
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── 기업 전용: 내 커스텀 템플릿 ── */}
          {user?.user_type === 'enterprise' && (
            <div className="saved-contracts-section" style={{ marginTop: 28 }}>
              <div className="saved-contracts-header">
                <div>
                  <h2 className="dash-title" style={{ fontSize: 18, marginBottom: 4 }}>📁 내 계약서 템플릿</h2>
                  <p className="dash-subtitle" style={{ fontSize: 13 }}>
                    계약서 파일을 업로드하고 서명 받을 위치를 지정해 저장하면, 다음에 바로 재사용할 수 있습니다
                  </p>
                </div>
                <button
                  className="btn-primary"
                  style={{ fontSize: 13, padding: '8px 18px' }}
                  onClick={() => navigate('/template-editor')}
                >
                  + 새 템플릿 만들기
                </button>
              </div>
              {userTemplates.length === 0 ? (
                <div className="saved-empty">
                  <span style={{ fontSize: 32 }}>📂</span>
                  <p>저장된 템플릿이 없습니다.</p>
                  <p style={{ fontSize: 13 }}>계약서 파일을 업로드하고 서명 위치를 지정해 템플릿으로 저장하세요.</p>
                  <button
                    onClick={() => navigate('/template-editor')}
                    style={{
                      marginTop: 12, padding: '10px 24px', borderRadius: 10,
                      background: 'var(--accent)', color: '#fff', border: 'none',
                      fontWeight: 700, fontSize: 14, cursor: 'pointer',
                    }}
                  >
                    첫 번째 템플릿 만들기
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
                  {userTemplates.map(t => (
                    <div key={t.id} style={{
                      background: 'var(--bg)', border: '1px solid var(--border)',
                      borderRadius: 14, padding: '18px 16px',
                      display: 'flex', flexDirection: 'column', gap: 10,
                    }}>
                      <div style={{ fontSize: 28 }}>
                        {t.content_type === 'image' ? '🖼️' : t.file_ext === '.pdf' ? '📄' : '📝'}
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {new Date(t.created_at).toLocaleDateString('ko-KR')} 저장
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                        <button
                          onClick={() => navigate(`/template-editor/${t.id}`)}
                          style={{
                            flex: 1, padding: '7px', borderRadius: 8,
                            border: '1.5px solid var(--accent)', background: 'rgba(37,99,235,0.08)',
                            color: 'var(--accent)', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                          }}
                        >
                          위치 수정
                        </button>
                        <button
                          onClick={() => deleteUserTemplate(t.id)}
                          style={{
                            padding: '7px 10px', borderRadius: 8,
                            border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.06)',
                            color: '#dc2626', fontSize: 12, cursor: 'pointer',
                          }}
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

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
                                onClick={() => { setSigningDefaultTab('request'); setSigningTarget({ id: String(item.id), name: item.filename }); setShowSignModal(true) }}>
                                계약서 보내기
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
          {!dismissedBanner && expiringLocalContracts.length > 0 && (
            <div className="dash-alert-banner">
              <div className="dash-alert-left">
                <span className="dash-alert-icon">🔔</span>
                <div>
                  <p className="dash-alert-title">만료 임박 계약서가 {expiringLocalContracts.length}건 있습니다</p>
                  <p className="dash-alert-desc">
                    {expiringLocalContracts.map((c) => (
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

      {/* ── 계약서 템플릿 모달 ── */}
      {showTemplateModal && (
        <TemplateModal
          onClose={() => setShowTemplateModal(false)}
          onDone={(msg) => {
            setShowTemplateModal(false)
            setSignToast(msg)
            fetchSigningRecords()
            setTimeout(() => setSignToast(''), 5000)
          }}
        />
      )}

      {/* ── 전자서명 모달 ── */}
      {showSignModal && signingTarget && (
        <SigningModal
          contractId={signingTarget.id}
          contractName={signingTarget.name}
          defaultTab={signingDefaultTab}
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
  { icon: '👥', title: '팀 관리', sub: '멤버 초대 및 역할 기반 접근 권한 설정', comingSoon: false },
  { icon: '📊', title: 'B2B 분석 대시보드', sub: '계약 유형 분포·위험도 통계 실시간 확인', comingSoon: false },
  { icon: '📑', title: 'PDF 리포트 다운로드', sub: '계약서별 상세 분석 리포트 출력', comingSoon: false },
  { icon: '📅', title: '계약 만료일 추적', sub: '만료 임박 알림 및 갱신 관리', comingSoon: false },
  { icon: '🔐', title: '계약서 보안 저장', sub: '암호화된 계약서 클라우드 저장소', comingSoon: true },
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
