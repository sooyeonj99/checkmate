import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

function formatTime(secs: number) {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const navigate = useNavigate()
  const { user, isLoggedIn, logout, secondsLeft } = useAuth()

  const isDanger  = secondsLeft < 60
  const isWarning = secondsLeft < 300

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

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

  return (
    <nav className="navbar" style={{ borderBottomColor: scrolled ? 'rgba(255,255,255,0.07)' : 'transparent' }}>
      <div className="container">
        <Link to="/" className="navbar-logo">
          <div className="logo-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L3 7V12C3 16.97 6.84 21.61 12 23C17.16 21.61 21 16.97 21 12V7L12 2Z" fill="white" fillOpacity="0.9"/>
              <path d="M9 12L11 14L15 10" stroke="#060d1f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="gradient-text">CHECKMATE</span>
        </Link>

        <ul className="navbar-links">
          <li><a href="#features">서비스 소개</a></li>
          <li><a href="#how-it-works">이용방법</a></li>
          <li><a href="#targets">대상</a></li>
          <li><Link to="/dashboard">대시보드</Link></li>
        </ul>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link to="/dashboard" className="navbar-dashboard-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
            </svg>
            <span>대시보드</span>
          </Link>

          {isLoggedIn && (
            <div
              title="마지막 활동으로부터 30분 후 자동 로그아웃"
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '4px 10px', borderRadius: 20,
                background: isDanger
                  ? 'rgba(239,68,68,0.12)'
                  : isWarning
                  ? 'rgba(245,158,11,0.1)'
                  : 'rgba(100,116,139,0.08)',
                border: `1px solid ${isDanger ? 'rgba(239,68,68,0.3)' : isWarning ? 'rgba(245,158,11,0.25)' : 'rgba(100,116,139,0.15)'}`,
                cursor: 'default',
              }}
            >
              <span style={{ fontSize: 11 }}>{isDanger ? '🔴' : isWarning ? '🟠' : '🔒'}</span>
              <span style={{
                fontSize: 12, fontWeight: 700,
                fontVariantNumeric: 'tabular-nums',
                color: isDanger ? '#ef4444' : isWarning ? '#f59e0b' : 'var(--text-muted)',
                letterSpacing: '0.05em',
              }}>
                {formatTime(secondsLeft)}
              </span>
            </div>
          )}

          {isLoggedIn ? (
            <div className="navbar-user-wrap" onClick={(e) => { e.stopPropagation(); setDropdownOpen((v) => !v) }}>
              <div className="navbar-user-btn">
                <div className="navbar-user-avatar">{user!.username.charAt(0).toUpperCase()}</div>
                <span className="navbar-user-name">{user!.username}</span>
                <span className="navbar-user-caret">▾</span>
              </div>
              {dropdownOpen && (
                <div className="navbar-dropdown">
                  <div className="navbar-dropdown-info">
                    <div className="navbar-dropdown-name">{user!.username}</div>
                    <div className="navbar-dropdown-email">{user!.email}</div>
                    <div style={{ marginTop: 6, fontSize: 11, color: isDanger ? '#ef4444' : isWarning ? '#f59e0b' : 'var(--text-muted)' }}>
                      {isDanger ? '⚠ 곧 자동 로그아웃됩니다' : isWarning ? `⏳ ${formatTime(secondsLeft)} 후 자동 로그아웃` : `🔒 ${formatTime(secondsLeft)} 후 자동 로그아웃`}
                    </div>
                  </div>
                  <div className="navbar-dropdown-divider" />
                  <Link to="/dashboard" className="navbar-dropdown-item" onClick={() => setDropdownOpen(false)}>
                    대시보드
                  </Link>
                  <Link to="/upload" className="navbar-dropdown-item" onClick={() => setDropdownOpen(false)}>
                    계약서 분석
                  </Link>
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
          ) : (
            <button className="navbar-cta" onClick={() => navigate('/auth')}>로그인 / 회원가입</button>
          )}
        </div>
      </div>
    </nav>
  )
}
