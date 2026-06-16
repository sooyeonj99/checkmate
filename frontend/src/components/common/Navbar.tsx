import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

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
        </ul>

        <button className="navbar-cta" onClick={() => navigate('/upload')}>무료 체험하기</button>
      </div>
    </nav>
  )
}
