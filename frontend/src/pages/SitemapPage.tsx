import { Link } from 'react-router-dom'
import Navbar from '../components/common/Navbar'

interface SiteSection {
  title: string
  icon: string
  links: { label: string; path: string; desc: string; auth?: boolean }[]
}

const SECTIONS: SiteSection[] = [
  {
    title: '메인',
    icon: '🏠',
    links: [
      { label: '홈', path: '/', desc: '서비스 소개 및 랜딩 페이지' },
      { label: '서비스 소개', path: '/#features', desc: 'AI 계약서 분석 기능 안내' },
      { label: '요금제', path: '/#bm', desc: '구독 플랜 및 가격 안내' },
      { label: '성장 로드맵', path: '/#roadmap', desc: '서비스 개발 예정 기능 로드맵' },
    ],
  },
  {
    title: '계약서 분석',
    icon: '📄',
    links: [
      { label: '파일 업로드', path: '/upload', desc: 'PDF · 이미지 · Word 파일 업로드', auth: true },
      { label: '개인정보 검토', path: '/masking', desc: 'AI 분석 전 마스킹 항목 선택', auth: true },
      { label: 'AI 분석 중', path: '/loading', desc: 'Gemini AI 계약서 분석 진행', auth: true },
      { label: '분석 결과', path: '/result', desc: '위험 조항 · 등급 · 기관 연결', auth: true },
    ],
  },
  {
    title: '대시보드 / 계정',
    icon: '⚙️',
    links: [
      { label: '대시보드', path: '/dashboard', desc: '저장된 계약서 관리 · 팀 초대', auth: true },
      { label: '내 정보', path: '/profile', desc: '닉네임 · 전화번호 · 비밀번호 수정', auth: true },
      { label: '로그인 / 회원가입', path: '/auth', desc: '이메일 로그인 및 신규 가입' },
    ],
  },
  {
    title: '전자서명',
    icon: '✍️',
    links: [
      { label: '서명 요청', path: '/dashboard', desc: '계약 상대방에게 전자서명 요청', auth: true },
      { label: '서명 페이지', path: '/sign/:token', desc: '이메일 · SMS 링크로 접속하는 서명 화면' },
      { label: '계약서 템플릿', path: '/template-editor', desc: '자주 쓰는 계약서 직접 작성 · 관리', auth: true },
    ],
  },
  {
    title: '팀 관리',
    icon: '👥',
    links: [
      { label: '팀원 초대', path: '/dashboard', desc: '이메일 · SMS로 팀원 초대 (기업 계정)', auth: true },
      { label: '팀 가입', path: '/team/accept', desc: '초대 링크를 통한 팀 합류' },
    ],
  },
  {
    title: '프랜차이즈',
    icon: '🏪',
    links: [
      { label: '프랜차이즈 관리', path: '/franchise', desc: '본사 전용 가맹점 계약 통합 대시보드', auth: true },
      { label: '가맹점 참여', path: '/franchise/accept', desc: '초대 링크를 통한 가맹점 연결', auth: true },
    ],
  },
  {
    title: '법률 / 정책',
    icon: '📋',
    links: [
      { label: '이용약관', path: '/terms', desc: '서비스 이용 조건 및 규정' },
      { label: '개인정보처리방침', path: '/privacy', desc: '개인정보 수집 · 이용 · 보관 정책' },
    ],
  },
]

export default function SitemapPage() {
  return (
    <>
      <Navbar />
      <div className="sitemap-page">
        <div className="container">
          <div className="sitemap-header">
            <h1 className="sitemap-title">사이트맵</h1>
            <p className="sitemap-subtitle">체크메이트의 모든 페이지를 한눈에 확인하세요</p>
          </div>

          <div className="sitemap-grid">
            {SECTIONS.map((section) => (
              <div key={section.title} className="sitemap-section">
                <div className="sitemap-section-title">
                  <span>{section.icon}</span>
                  <span>{section.title}</span>
                </div>
                <ul className="sitemap-list">
                  {section.links.map((link) => (
                    <li key={link.path + link.label} className="sitemap-item">
                      <Link
                        to={link.path.startsWith('/#') ? '/' : link.path}
                        onClick={link.path.startsWith('/#') ? () => {
                          const id = link.path.replace('/#', '')
                          setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 100)
                        } : undefined}
                        className="sitemap-link"
                      >
                        <span className="sitemap-link-label">{link.label}</span>
                        {link.auth && <span className="sitemap-auth-badge">로그인 필요</span>}
                      </Link>
                      <p className="sitemap-link-desc">{link.desc}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
