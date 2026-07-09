import { Link } from 'react-router-dom'
import Navbar from '../components/common/Navbar'

interface SiteLink {
  label: string
  path: string
  desc: string
  auth?: boolean
  badge?: 'new' | 'enterprise' | 'admin' | 'coming'
}

interface SiteSection {
  title: string
  icon: string
  color: string
  links: SiteLink[]
}

const SECTIONS: SiteSection[] = [
  {
    title: '메인',
    icon: '🏠',
    color: '#2563eb',
    links: [
      { label: '홈', path: '/', desc: '서비스 소개 및 랜딩 페이지' },
      { label: '서비스 소개', path: '/#features', desc: 'AI 계약서 분석 기능 안내' },
      { label: '요금제', path: '/#bm', desc: '구독 플랜 및 가격 안내' },
      { label: '사이트맵', path: '/sitemap', desc: '모든 페이지 구조 한눈에 보기' },
    ],
  },
  {
    title: '계약서 분석',
    icon: '📄',
    color: '#7c3aed',
    links: [
      { label: '파일 업로드', path: '/upload', desc: 'PDF · 이미지 · Word 파일 업로드', auth: true },
      { label: '개인정보 검토', path: '/masking', desc: 'AI 분석 전 마스킹 항목 선택', auth: true },
      { label: 'AI 분석 중', path: '/loading', desc: 'Gemini AI 계약서 분석 진행', auth: true },
      { label: '분석 결과', path: '/result', desc: '위험 조항 · 등급 · 기관 연결', auth: true },
      { label: '계약서 일괄 분석', path: '/bulk', desc: '최대 10개 파일 동시 업로드 및 분석', auth: true, badge: 'new' },
    ],
  },
  {
    title: 'AI 고급 기능',
    icon: '✨',
    color: '#f59e0b',
    links: [
      { label: 'AI 계약서 생성기', path: '/generate', desc: '설명만 입력하면 AI가 계약서 초안 자동 생성', auth: true, badge: 'new' },
      { label: '계약서 비교', path: '/compare', desc: '두 계약서를 나란히 비교 · 조항별 차이 분석', auth: true, badge: 'new' },
      { label: '분석 통계', path: '/stats', desc: '월별 분석 추이 · 위험도 분포 · 만료 임박 현황', auth: true, badge: 'new' },
    ],
  },
  {
    title: '대시보드 / 계정',
    icon: '⚙️',
    color: '#0891b2',
    links: [
      { label: '대시보드', path: '/dashboard', desc: '저장된 계약서 관리 · 검색 · 퀵액션', auth: true },
      { label: '계약서 검색', path: '/dashboard', desc: '파일명 · 유형 · 조항 내용 실시간 검색 (대시보드 내)', auth: true, badge: 'new' },
      { label: '내 정보', path: '/profile', desc: '닉네임 · 전화번호 · 비밀번호 수정', auth: true },
      { label: '로그인 / 회원가입', path: '/auth', desc: '이메일 로그인 및 신규 가입' },
      { label: '비밀번호 찾기', path: '/auth', desc: '이메일로 임시 비밀번호 발송', badge: 'new' },
      { label: '이메일 인증', path: '/verify-email', desc: '회원가입 후 이메일 주소 인증' },
    ],
  },
  {
    title: '전자서명',
    icon: '✍️',
    color: '#059669',
    links: [
      { label: '서명 요청', path: '/dashboard', desc: '계약 상대방에게 전자서명 요청', auth: true },
      { label: '서명 페이지', path: '/sign/:token', desc: '이메일 · SMS 링크로 접속하는 서명 화면' },
      { label: '계약서 템플릿 편집', path: '/template-editor', desc: '서명 위치 지정 · 필드 설정 · 재사용', auth: true },
      { label: '서명 완료 문서', path: '/dashboard', desc: '서명된 계약서 HTML 다운로드 · 인증서 발급', auth: true },
    ],
  },
  {
    title: '팀 관리',
    icon: '👥',
    color: '#7c3aed',
    links: [
      { label: '팀원 초대 (이메일)', path: '/dashboard', desc: '이메일로 팀원 초대 및 권한 설정', auth: true, badge: 'enterprise' },
      { label: '팀원 초대 (SMS)', path: '/dashboard', desc: '핸드폰 번호로 초대 링크 문자 발송', auth: true, badge: 'enterprise' },
      { label: '팀 가입', path: '/team/accept', desc: '초대 링크를 통한 팀 합류' },
    ],
  },
  {
    title: '프랜차이즈',
    icon: '🏪',
    color: '#16a34a',
    links: [
      { label: '프랜차이즈 관리', path: '/franchise', desc: '본사 전용 가맹점 계약 통합 대시보드', auth: true, badge: 'enterprise' },
      { label: '가맹점 초대', path: '/franchise', desc: '가맹점주 이메일 초대 및 연결', auth: true, badge: 'enterprise' },
      { label: '가맹점 참여', path: '/franchise/accept', desc: '초대 링크를 통한 가맹점 연결', auth: true },
      { label: '근로자 동의 관리', path: '/franchise', desc: '계약서 공유 동의 요청 · 수락 · 거절 처리', auth: true, badge: 'enterprise' },
    ],
  },
  {
    title: '알림 / 만료 관리',
    icon: '🔔',
    color: '#dc2626',
    links: [
      { label: '계약 만료일 설정', path: '/dashboard', desc: '계약서별 만료일 직접 등록 (대시보드 내)', auth: true },
      { label: '만료 임박 알림', path: '/dashboard', desc: '30일 · 7일 · 3일 · 1일 전 이메일 + 푸시 자동 발송', auth: true, badge: 'new' },
      { label: '만료 현황', path: '/stats', desc: '7일 이내 만료 계약서 목록 (통계 페이지)', auth: true, badge: 'new' },
    ],
  },
  {
    title: '어드민',
    icon: '🛡️',
    color: '#dc2626',
    links: [
      { label: '어드민 패널', path: '/admin', desc: '전체 사용자 관리 · 서비스 통계 확인', auth: true, badge: 'admin' },
      { label: 'B2B API 키 관리', path: '/admin', desc: 'B2B 파트너사용 API 키 생성 · 삭제 · 호출 수 확인', auth: true, badge: 'admin' },
    ],
  },
  {
    title: '구독 / 렌탈 관리',
    icon: '💳',
    color: '#0284c7',
    links: [
      { label: '구독 서비스 관리', path: '/dashboard', desc: '넷플릭스 · 쿠팡 등 구독료 · 결제일 · 총지출 추적', auth: true },
      { label: '구독 만료 추적', path: '/dashboard', desc: '렌탈 · 약정 계약 만료일 관리', auth: true },
    ],
  },
  {
    title: '법률 / 정책',
    icon: '📋',
    color: '#64748b',
    links: [
      { label: '이용약관', path: '/terms', desc: '서비스 이용 조건 및 규정' },
      { label: '개인정보처리방침', path: '/privacy', desc: '개인정보 수집 · 이용 · 보관 정책' },
    ],
  },
]

const BADGE_STYLE: Record<string, { label: string; bg: string; color: string }> = {
  new:        { label: 'NEW', bg: 'rgba(37,99,235,0.12)', color: '#2563eb' },
  enterprise: { label: '기업', bg: 'rgba(124,58,237,0.12)', color: '#7c3aed' },
  admin:      { label: '관리자', bg: 'rgba(220,38,38,0.12)', color: '#dc2626' },
  coming:     { label: '준비중', bg: 'rgba(100,116,139,0.12)', color: '#64748b' },
}

export default function SitemapPage() {
  return (
    <>
      <Navbar />
      <div className="sitemap-page">
        <div className="container">
          <div className="sitemap-header">
            <h1 className="sitemap-title">사이트맵</h1>
            <p className="sitemap-subtitle">체크메이트의 모든 페이지와 기능을 한눈에 확인하세요</p>

            {/* 뱃지 범례 */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 20, flexWrap: 'wrap' }}>
              {Object.entries(BADGE_STYLE).map(([key, b]) => (
                <span key={key} style={{
                  padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                  background: b.bg, color: b.color, border: `1px solid ${b.color}30`,
                }}>
                  {b.label}
                </span>
              ))}
              <span style={{ fontSize: 12, color: 'var(--text-muted)', alignSelf: 'center' }}>
                — 뱃지 설명: NEW=신규 구현, 기업=기업 계정 전용, 관리자=관리자 전용, 준비중=개발 예정
              </span>
            </div>
          </div>

          <div className="sitemap-grid">
            {SECTIONS.map((section) => (
              <div key={section.title} className="sitemap-section">
                <div className="sitemap-section-title" style={{ color: section.color }}>
                  <span>{section.icon}</span>
                  <span>{section.title}</span>
                </div>
                <ul className="sitemap-list">
                  {section.links.map((link) => {
                    const badge = link.badge ? BADGE_STYLE[link.badge] : null
                    return (
                      <li key={link.path + link.label} className="sitemap-item">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <Link
                            to={link.path.startsWith('/#') ? '/' : link.path.includes(':') ? '/dashboard' : link.path}
                            onClick={link.path.startsWith('/#') ? () => {
                              const id = link.path.replace('/#', '')
                              setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 100)
                            } : undefined}
                            className="sitemap-link"
                          >
                            <span className="sitemap-link-label">{link.label}</span>
                          </Link>
                          {link.auth && (
                            <span className="sitemap-auth-badge">로그인 필요</span>
                          )}
                          {badge && (
                            <span style={{
                              padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                              background: badge.bg, color: badge.color,
                              border: `1px solid ${badge.color}30`,
                              whiteSpace: 'nowrap',
                            }}>
                              {badge.label}
                            </span>
                          )}
                        </div>
                        <p className="sitemap-link-desc">{link.desc}</p>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>

          {/* 앱 전용 기능 안내 */}
          <div style={{
            marginTop: 48, padding: '24px 28px',
            background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16,
          }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', marginBottom: 16 }}>
              📱 모바일 앱 전용 기능
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
              {[
                { icon: '🌙', label: '다크 모드', desc: '라이트 / 다크 / 시스템 설정 연동', badge: 'new' },
                { icon: '🤖', label: 'AI 챗봇', desc: '계약서 관련 질문 즉시 답변' },
                { icon: '🔔', label: '푸시 알림', desc: '만료 · 서명 요청 실시간 알림' },
                { icon: '📸', label: '카메라 OCR', desc: '실물 계약서 촬영 후 텍스트 추출', badge: 'coming' },
              ].map(f => {
                const b = f.badge ? BADGE_STYLE[f.badge] : null
                return (
                  <div key={f.label} style={{
                    display: 'flex', gap: 12, alignItems: 'flex-start',
                    padding: '14px 16px', background: 'var(--bg)', borderRadius: 12,
                    border: '1px solid var(--border)',
                  }}>
                    <span style={{ fontSize: 22, flexShrink: 0 }}>{f.icon}</span>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{f.label}</span>
                        {b && (
                          <span style={{ padding: '1px 7px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: b.bg, color: b.color }}>
                            {b.label}
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{f.desc}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
