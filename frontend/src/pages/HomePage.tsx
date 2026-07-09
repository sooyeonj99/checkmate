import { Link } from 'react-router-dom'
import Navbar from '../components/common/Navbar'

/* ── Hero ─────────────────────────────────────────── */
function HeroSection() {
  return (
    <section className="hero" id="upload">
      <div className="hero-bg" />
      <div className="hero-grid" />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '800px' }}>
        <div className="hero-badge">계약 리스크 관리 플랫폼</div>

        <h1>
          계약서의 함정,<br />
          <span className="gradient-text">AI가 찾아드립니다</span>
        </h1>

        <p className="hero-slogan">
          <strong>서명 전 30초</strong>로 위험 조항을 찾고,<br />
          구독·렌탈 계약은 대시보드로 한눈에 관리하세요.
        </p>

        <div className="hero-actions hero-actions-lg">
          <Link to="/upload" className="btn-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
            </svg>
            무료로 계약서 분석하기
          </Link>
        </div>

        <div className="hero-stats">
          <div className="hero-stat">
            <div className="hero-stat-value">98.3%</div>
            <div className="hero-stat-label">분석 정확도</div>
          </div>
          <div className="hero-stat">
            <div className="hero-stat-value">30초</div>
            <div className="hero-stat-label">평균 분석 시간</div>
          </div>
          <div className="hero-stat">
            <div className="hero-stat-value">94%</div>
            <div className="hero-stat-label">위험 조항 발견율</div>
          </div>
          <div className="hero-stat">
            <div className="hero-stat-value">₩0</div>
            <div className="hero-stat-label">시작 비용</div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── Pain Point ─────────────────────────────────────── */
function PainPointSection() {
  return (
    <section className="section pain-section">
      <div className="container">
        <div className="section-header" style={{ textAlign: 'center' }}>
          <div className="section-tag">PROBLEM</div>
          <h2 className="section-title">
            계약서, 읽어도<br />
            <span className="gradient-text">모르면 손해입니다</span>
          </h2>
        </div>
        <div className="pain-grid">
          {[
            { stat: '78%', desc: '계약서를 제대로 읽지 않고 서명하는 직장인 비율', src: '고용노동부 실태조사' },
            { stat: '연 4.2조', desc: '계약서 분쟁으로 발생하는 사회적 손실 추정액', src: '법무부 통계' },
            { stat: '평균 150만원', desc: '변호사 계약서 검토 비용 (1건 기준)', src: '대한변협' },
            { stat: '30초', desc: 'Checkmate AI가 동일한 검토를 완료하는 시간', src: 'Checkmate', accent: true },
          ].map((p) => (
            <div key={p.stat} className={`pain-card${p.accent ? ' accent' : ''}`}>
              <div className="pain-stat">{p.stat}</div>
              <p className="pain-desc">{p.desc}</p>
              <div className="pain-src">출처: {p.src}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── Features ──────────────────────────────────────── */
const FEATURES = [
  {
    icon: '🔍',
    color: 'rgba(239,68,68,0.15)',
    title: 'AI 위험 조항 분석',
    desc: '수백만 건의 계약 분쟁 데이터로 학습한 AI가 위험 / 주의 / 안전 3단계로 조항을 분류합니다.',
    badge: { text: 'AI 핵심 기능', color: 'var(--risk-high)', bg: 'var(--risk-high-bg)' },
    demo: (
      <div className="risk-demo">
        {[
          { label: '위험', color: '#ef4444', width: '40%', count: 3 },
          { label: '주의', color: '#f59e0b', width: '25%', count: 5 },
          { label: '안전', color: '#10b981', width: '60%', count: 12 },
        ].map(({ label, color, width, count }) => (
          <div key={label} className="risk-bar-row">
            <span className="risk-label" style={{ color }}>{label}</span>
            <div className="risk-bar-track">
              <div className="risk-bar-fill" style={{ width, background: color }} />
            </div>
            <span className="risk-count">{count}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: '📊',
    color: 'rgba(245,158,11,0.15)',
    title: '위험도 점수 산출',
    desc: '계약 전체를 0~100점으로 수치화합니다. 점수가 높을수록 위험한 계약입니다.',
    badge: { text: '0~100점 수치화', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    demo: (
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 16 }}>
        <div style={{ position: 'relative', width: 64, height: 64, flexShrink: 0 }}>
          <svg viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)', width: 64, height: 64 }}>
            <circle cx="18" cy="18" r="14" fill="none" stroke="var(--bg-input)" strokeWidth="4"/>
            <circle cx="18" cy="18" r="14" fill="none" stroke="#f59e0b" strokeWidth="4"
              strokeDasharray={`${0.62 * 87.96} 87.96`} strokeLinecap="round"/>
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#f59e0b' }}>62</div>
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b', marginBottom: 4 }}>주의 필요</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>62점 / 100점<br/>서명 전 검토 권장</div>
        </div>
      </div>
    ),
  },
  {
    icon: '✏️',
    color: 'rgba(16,185,129,0.15)',
    title: '조항별 수정 제안',
    desc: '위험 조항마다 법률 전문가 수준의 수정 문구를 즉시 생성합니다. 협상 시 바로 활용 가능합니다.',
    badge: { text: '즉시 적용 가능', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
    demo: null,
  },
  {
    icon: '📁',
    color: 'rgba(79,142,247,0.15)',
    title: '계약 이력 대시보드',
    desc: '분석한 모든 계약서를 대시보드에서 관리합니다. 만료 임박 알림, 구독·렌탈 현황도 한눈에 확인.',
    badge: { text: '반복 사용 핵심', color: 'var(--accent)', bg: 'rgba(37,99,235,0.08)' },
    demo: null,
  },
  {
    icon: '🔒',
    color: 'rgba(139,92,246,0.15)',
    title: '구독·렌탈 비용 관리',
    desc: '이용 중인 구독·렌탈 계약의 월 요금, 총 납부액, 해지 위약금을 자동으로 계산합니다.',
    badge: { text: '위약금 즉시 산출', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
    demo: null,
  },
  {
    icon: '📋',
    color: 'rgba(245,158,11,0.15)',
    title: '분석 리포트 출력',
    desc: '조항별 위험도, 점수, 수정 제안을 정리한 리포트를 화면에서 바로 확인하고 활용하세요.',
    badge: { text: '공유 가능', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    demo: null,
  },
]

function FeaturesSection() {
  return (
    <section className="section features" id="features">
      <div className="container">
        <div className="section-header">
          <div className="section-tag">FEATURES</div>
          <h2 className="section-title">
            단순 분석을 넘어<br />
            <span className="gradient-text">계약 리스크 관리 플랫폼</span>
          </h2>
          <p className="section-desc">
            계약서 검토부터 이력 관리·구독 비용 추적까지, 계약의 모든 단계를 지원합니다
          </p>
        </div>

        <div className="features-grid">
          {FEATURES.map((f) => (
            <div key={f.title} className="feature-card">
              <div className="feature-icon" style={{ background: f.color }}>{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
              {f.badge && (
                <div className="feature-badge" style={{ color: f.badge.color, background: f.badge.bg }}>
                  {f.badge.text}
                </div>
              )}
              {f.demo}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── How it works ──────────────────────────────────── */
const STEPS = [
  {
    title: '계약서 업로드',
    desc: 'PDF 파일이나 계약서 사진을 업로드하세요. OCR이 자동으로 텍스트를 추출합니다.',
  },
  {
    title: 'AI 실시간 분석',
    desc: '30초 내로 모든 조항을 위험 / 주의 / 안전으로 분류하고 위험도 점수를 산출합니다.',
  },
  {
    title: '리포트 확인 및 활용',
    desc: '위험 조항과 수정 제안을 확인하고 협상에 바로 활용하세요. 불리한 계약에서 나를 지켜줍니다.',
  },
]

function HowItWorksSection() {
  return (
    <section className="section how-it-works" id="how-it-works">
      <div className="container">
        <div>
          <div className="section-tag">HOW IT WORKS</div>
          <h2 className="section-title">
            3단계로 끝나는<br />
            <span className="gradient-text">계약서 검토</span>
          </h2>
          <p className="section-desc" style={{ marginBottom: 48 }}>
            복잡한 법률 지식 없이도 30초 만에 계약서의 위험을 파악하세요.
          </p>

          <div className="steps">
            {STEPS.map((step, i) => (
              <div key={step.title} className="step">
                <div className="step-num">{i + 1}</div>
                <div className="step-content">
                  <h3>{step.title}</h3>
                  <p>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="report-preview">
          <div className="report-preview-header">
            <div className="report-title-group">
              <span className="report-icon">📄</span>
              <div>
                <div className="report-file-name">프리랜서_용역계약서.pdf</div>
                <div className="report-file-type">분석 완료 · 2026.06.16</div>
              </div>
            </div>
            <div className="score-ring-wrapper">
              <div className="score-circle">
                <span className="score-value">73</span>
              </div>
              <div className="score-label-group">
                <div className="score-label">⚠ 위험</div>
                <div className="score-sub">위험도 73점</div>
              </div>
            </div>
          </div>

          <div className="clause-list">
            <div className="clause-item" style={{ background: 'var(--risk-high-bg)', border: '1px solid rgba(239,68,68,0.15)' }}>
              <div className="clause-dot" style={{ background: 'var(--risk-high)' }} />
              <div className="clause-text">
                <div>
                  <span className="clause-tag" style={{ background: 'var(--risk-high-bg)', color: 'var(--risk-high)' }}>위험</span>
                  제11조 지식재산권 귀속
                </div>
                <div className="clause-desc">작업 결과물의 모든 권리가 발주자에게 귀속되며, 저작인격권 행사가 제한됩니다.</div>
              </div>
            </div>
            <div className="clause-item" style={{ background: 'var(--risk-mid-bg)', border: '1px solid rgba(245,158,11,0.15)' }}>
              <div className="clause-dot" style={{ background: 'var(--risk-mid)' }} />
              <div className="clause-text">
                <div>
                  <span className="clause-tag" style={{ background: 'var(--risk-mid-bg)', color: 'var(--risk-mid)' }}>주의</span>
                  제6조 대금 지급 기일
                </div>
                <div className="clause-desc">납품 후 60일 이내 지급 조건. 업계 표준(30일) 대비 불리합니다.</div>
              </div>
            </div>
            <div className="clause-item" style={{ background: 'var(--risk-safe-bg)', border: '1px solid rgba(16,185,129,0.15)' }}>
              <div className="clause-dot" style={{ background: 'var(--risk-safe)' }} />
              <div className="clause-text">
                <div>
                  <span className="clause-tag" style={{ background: 'var(--risk-safe-bg)', color: 'var(--risk-safe)' }}>안전</span>
                  제4조 작업 범위
                </div>
                <div className="clause-desc">작업 범위가 명확하게 정의되어 있습니다.</div>
              </div>
            </div>
          </div>

          <div className="report-suggestion">
            <strong>✨ AI 수정 제안 · 제11조</strong>
            "본 계약에 따라 제작된 결과물의 저작재산권은 잔금 지급 완료 시 발주자에게 이전하며, 수급인의 저작인격권은 침해되지 아니한다."
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── Subscription Management ───────────────────────── */
function SubscriptionSection() {
  return (
    <section className="section sub-mgmt-section" id="subscription">
      <div className="container">
        <div className="sub-mgmt-inner">
          <div className="sub-mgmt-left">
            <div className="section-tag">구독·렌탈 관리</div>
            <h2 className="section-title">
              장기 약정 계약,<br />
              <span className="gradient-text">이제 제대로 파악하세요</span>
            </h2>
            <p className="section-desc" style={{ marginBottom: 32 }}>
              구독·렌탈·장기계약의 이용 현황과<br />
              중도 해지 위약금을 한눈에 확인합니다.
            </p>
            <div className="sub-mgmt-items">
              {[
                { icon: '📅', title: '이용 기간 추적', desc: '계약 시작부터 오늘까지 정확한 이용 기간' },
                { icon: '⏱️', title: '잔여 기간 확인', desc: '계약 종료까지 남은 일수 실시간 표시' },
                { icon: '💰', title: '누적 납부 금액', desc: '지금까지 지불한 총액을 자동 계산' },
                { icon: '🚫', title: '중도해지 위약금', desc: '지금 해지 시 발생하는 위약금 즉시 산출' },
              ].map((item) => (
                <div key={item.title} className="sub-mgmt-item">
                  <span className="sub-mgmt-item-icon">{item.icon}</span>
                  <div>
                    <div className="sub-mgmt-item-title">{item.title}</div>
                    <div className="sub-mgmt-item-desc">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="sub-mgmt-right">
            <div className="sub-mock-card">
              <div className="sub-mock-header">
                <span style={{ fontSize: 20 }}>🔒</span>
                <div>
                  <div className="sub-mock-name">정수기 렌탈 서비스</div>
                  <div className="sub-mock-type">렌탈·약정계약 · 10년</div>
                </div>
                <span className="dash-status-badge danger" style={{ marginLeft: 'auto' }}>⚠ 위험</span>
              </div>
              <div className="sub-mock-metrics">
                <div className="sub-mock-metric">
                  <div className="sub-mock-metric-label">이용 기간</div>
                  <div className="sub-mock-metric-value">7년 0개월</div>
                </div>
                <div className="sub-mock-metric">
                  <div className="sub-mock-metric-label">잔여 기간</div>
                  <div className="sub-mock-metric-value">3년 0개월</div>
                </div>
                <div className="sub-mock-metric">
                  <div className="sub-mock-metric-label">월 이용료</div>
                  <div className="sub-mock-metric-value">35,000원</div>
                </div>
                <div className="sub-mock-metric">
                  <div className="sub-mock-metric-label">사용한 개월수</div>
                  <div className="sub-mock-metric-value">84개월</div>
                </div>
              </div>
              <div className="sub-mock-totals">
                <div className="sub-mock-total-row">
                  <span className="sub-mock-total-label">💰 총 납부 금액</span>
                  <span className="sub-mock-total-value">2,940,000원</span>
                </div>
                <div className="sub-mock-total-row penalty">
                  <span className="sub-mock-total-label">🚫 지금 해지 시 위약금</span>
                  <span className="sub-mock-total-value" style={{ color: 'var(--risk-high)' }}>1,260,000원</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}


/* ── Competition ───────────────────────────────────── */
function CompetitionSection() {
  const rows = [
    { feature: '분석 속도', checkmate: '30초', lawyer: '3~7일', others: '1~2일' },
    { feature: '비용(1건)', checkmate: '무료', lawyer: '50~150만원', others: '건당 과금' },
    { feature: '조항별 수정 제안', checkmate: '✓', lawyer: '✓', others: '✗' },
    { feature: '구독·렌탈 관리', checkmate: '✓', lawyer: '✗', others: '✗' },
    { feature: '계약 이력 대시보드', checkmate: '✓', lawyer: '✗', others: '일부' },
    { feature: '24시간 이용', checkmate: '✓', lawyer: '✗', others: '✓' },
  ]

  return (
    <section className="section competition-section" id="competition">
      <div className="container">
        <div className="section-header" style={{ textAlign: 'center' }}>
          <div className="section-tag">WHY CHECKMATE</div>
          <h2 className="section-title">
            기존 서비스와<br />
            <span className="gradient-text">무엇이 다른가요?</span>
          </h2>
        </div>

        <div className="comp-table-wrap">
          <table className="comp-table">
            <thead>
              <tr>
                <th>항목</th>
                <th className="comp-us">✅ Checkmate</th>
                <th>법률 사무소</th>
                <th>유사 앱</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.feature}>
                  <td>{r.feature}</td>
                  <td className="comp-us comp-highlight">{r.checkmate}</td>
                  <td>{r.lawyer}</td>
                  <td>{r.others}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="comp-diff-grid">
          {[
            { icon: '⚡', title: '속도', desc: '법률 사무소 대비 100배 빠른 30초 분석' },
            { icon: '💸', title: '비용', desc: '변호사 검토비 150만원 → 월 9,900원 구독' },
            { icon: '🔄', title: '반복 사용', desc: '계약 대시보드로 매월 돌아오는 구조' },
            { icon: '🏢', title: 'B2B 확장', desc: '개인 → 소상공인 → 기업 SaaS로 성장' },
          ].map((d) => (
            <div key={d.title} className="comp-diff-card">
              <div className="comp-diff-icon">{d.icon}</div>
              <div className="comp-diff-title">{d.title}</div>
              <div className="comp-diff-desc">{d.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── Targets ───────────────────────────────────────── */
const TARGETS = [
  { emoji: '💻', title: '프리랜서', desc: '용역·외주 계약의 대금, IP 귀속 조항 분석', concern: '저작권 분쟁', pay: '계약 1건당 수입의 10~30% 손실 방지' },
  { emoji: '👷', title: '직장인', desc: '근로계약서의 포괄임금, 경업금지 조항 검토', concern: '임금 체불', pay: '부당 조항 협상 근거 확보' },
  { emoji: '🏪', title: '소상공인', desc: '가맹·입점·공급 계약의 불공정 조항 탐지', concern: '불공정 계약', pay: '법무팀 없이 전문 수준 검토' },
  { emoji: '📱', title: '구독 이용자', desc: '구독·렌탈 계약 이용 현황과 위약금 관리', concern: '숨은 위약금', pay: '해지 전 위약금 미리 파악' },
  { emoji: '🎓', title: '사회초년생', desc: '첫 계약서를 위한 쉬운 AI 해설과 수정 제안', concern: '계약 미숙', pay: '변호사 비용 없이 안전한 계약' },
]

function TargetsSection() {
  return (
    <section className="section targets" id="targets">
      <div className="container">
        <div className="section-header" style={{ textAlign: 'center' }}>
          <div className="section-tag">WHO WE HELP</div>
          <h2 className="section-title">
            이런 분들이<br />
            <span className="gradient-text">Checkmate를 씁니다</span>
          </h2>
          <p className="section-desc" style={{ margin: '0 auto' }}>
            계약서 앞에서 혼자가 아니어도 됩니다
          </p>
        </div>

        <div className="target-grid">
          {TARGETS.map((t) => (
            <div key={t.title} className="target-card">
              <div className="target-emoji">{t.emoji}</div>
              <h3>{t.title}</h3>
              <p>{t.desc}</p>
              <div className="target-pay">{t.pay}</div>
              <span className="target-concern">{t.concern} 방지</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── CTA Banner ────────────────────────────────────── */
function CTASection() {
  return (
    <section className="cta-banner">
      <div className="cta-banner-bg" />
      <div className="container" style={{ position: 'relative' }}>
        <div className="section-tag" style={{ margin: '0 auto 20px' }}>지금 바로 시작</div>
        <h2 className="section-title" style={{ margin: '0 auto 16px' }}>
          서명하기 전,<br />
          <span className="gradient-text">30초만 투자하세요</span>
        </h2>
        <p>무료로 첫 계약서를 분석해 드립니다. 회원가입 없이 바로 시작 가능합니다.</p>
        <div className="cta-actions">
          <Link to="/upload" className="btn-primary" style={{ fontSize: 16, padding: '16px 36px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
            </svg>
            무료로 계약서 분석하기
          </Link>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 20, marginBottom: 0 }}>
          신용카드 불필요 · 회원가입 불필요 · 즉시 분석
        </p>
      </div>
    </section>
  )
}

/* ── Footer ────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-inner">
          <div className="footer-logo">
            <div className="logo-icon" style={{ width: 28, height: 28, borderRadius: 8, fontSize: 14, background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 12px var(--accent-glow)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L3 7V12C3 16.97 6.84 21.61 12 23C17.16 21.61 21 16.97 21 12V7L12 2Z" fill="white" fillOpacity="0.9"/>
                <path d="M9 12L11 14L15 10" stroke="#060d1f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="gradient-text">CHECKMATE</span>
          </div>

          <ul className="footer-links">
            <li><a href="#features">서비스 소개</a></li>
            <li><a href="#">문의하기</a></li>
            <li><Link to="/sitemap">사이트맵</Link></li>
          </ul>

          <p className="footer-copy">© 2026 Checkmate. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

/* ── Page ──────────────────────────────────────────── */
export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <PainPointSection />
        <FeaturesSection />
        <HowItWorksSection />
        <SubscriptionSection />
        <CompetitionSection />
        <TargetsSection />
        <CTASection />
      </main>
      <Footer />
    </>
  )
}
