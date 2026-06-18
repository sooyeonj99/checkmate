import { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'

/* ── Types ─────────────────────────────────────────── */
type RiskLevel = 'danger' | 'warn' | 'safe'

interface ProblemTag {
  text: string
  level: 'danger' | 'warn'
}

interface Clause {
  id: number
  level: 'danger' | 'warn'
  title: string
  article: string
  desc: string
  original: string
  problem?: string
  suggestion: string
  lawRef: string
}

interface AnalysisResult {
  contractName: string
  contractMeta: string
  analysisDate: string
  totalClauses: number
  score: number
  grade: RiskLevel
  dangerCount: number
  warnCount: number
  safeCount: number
  analysisTime: string
  problemTags: ProblemTag[]
  clauses: Clause[]
}

/* ── 백엔드 응답 → 프론트 형식 변환 ─────────────────── */
function gradeFromKorean(grade: string): RiskLevel {
  if (grade === '위험') return 'danger'
  if (grade === '주의') return 'warn'
  return 'safe'
}

function transformApiResult(data: any): AnalysisResult {
  const filtered = (data.clauses ?? []).filter(
    (c: any) => c.risk === 'danger' || c.risk === 'warn'
  )
  const clauses: Clause[] = filtered.map((c: any, i: number) => ({
    id: i + 1,
    level: c.risk as 'danger' | 'warn',
    title: c.title ?? '',
    article: c.article ?? '',
    desc: c.description ?? '',
    original: c.original ?? '',
    suggestion: c.suggestion ?? '',
    lawRef: c.law_ref ?? '',
  }))

  const problemTags: ProblemTag[] = clauses.map((c) => ({
    text: c.title,
    level: c.level,
  }))

  const grade = gradeFromKorean(data.grade ?? '')

  return {
    contractName: data.filename ?? '계약서',
    contractMeta: data.contract_type ?? '',
    analysisDate: (data.analyzed_at ?? '').slice(0, 10).replace(/-/g, '. '),
    totalClauses: (data.clauses ?? []).length,
    score: data.score ?? 0,
    grade,
    dangerCount: data.danger_count ?? 0,
    warnCount: data.warn_count ?? 0,
    safeCount: data.safe_count ?? 0,
    analysisTime: data.analysis_time ?? '',
    problemTags,
    clauses,
  }
}

/* ── Mock data (백엔드 미연결 시 표시) ─────────────── */
const RESULT: AnalysisResult = {
  contractName: '프리랜서 영상 편집 용역계약서',
  contractMeta: '발주사 ○○○ · 계약 기간 2026.07.01 – 2026.12.31',
  analysisDate: '2026. 06. 17',
  totalClauses: 13,
  score: 78,
  grade: 'danger',
  dangerCount: 5,
  warnCount: 2,
  safeCount: 4,
  analysisTime: '28초',
  problemTags: [
    { text: '저작권 귀속 불명확', level: 'danger' },
    { text: '대금 지급 조건 불리', level: 'danger' },
    { text: '일방적 계약 해지', level: 'danger' },
    { text: '과도한 손해배상', level: 'danger' },
    { text: '비밀유지 범위 무제한', level: 'danger' },
    { text: '수정 요청 횟수 제한 없음', level: 'warn' },
    { text: '분쟁 관할 법원 불리', level: 'warn' },
  ],
  clauses: [
    {
      id: 1, level: 'danger', title: '저작권 및 지식재산권 귀속', article: '제7조',
      desc: '계약 완료 후 결과물의 저작권을 자동으로 발주사에 전부 이전하는 조항입니다. 중간 산출물 및 2차 저작물 이용 권한까지 포함되어 있어 추가 수익을 원천 차단합니다.',
      original: '본 계약에 따라 제작된 모든 결과물(완성본 및 중간 산출물 포함)의 저작권, 저작인접권 및 기타 지식재산권 일체는 납품 즉시 발주사에 무상으로 귀속되며, 수급인은 이에 대한 어떠한 권리도 주장할 수 없다.',
      problem: '중간 산출물까지 포함, 무상 이전, 어떠한 권리도 주장 불가 — 과도한 권리 박탈',
      suggestion: '완성된 최종 결과물에 한하여 발주사에 이용 허락하며, 저작인격권은 수급인이 보유한다. 결과물의 2차적 저작물 작성 권한은 별도 합의에 의한다.',
      lawRef: '저작권법 제9조 (업무상저작물) · 제45조 (저작재산권 양도) · 공정거래위원회 불공정약관 심사지침 제7조',
    },
    {
      id: 2, level: 'danger', title: '대금 지급 및 정산 조건', article: '제4조',
      desc: '대금 지급 시기를 \'발주사 내부 결재 완료 후\'로 명시하여 지급 시기가 발주사 재량에 달려 있습니다. 법정 지급 기한을 준수하지 않을 소지가 있습니다.',
      original: '용역 대금은 최종 결과물 납품 후 발주사의 내부 검수 및 결재 절차 완료 시점으로부터 60일 이내에 지급한다. 단, 발주사의 내부 사정에 따라 지급이 지연될 수 있다.',
      problem: '\'내부 사정에 따라 지연 가능\' 조항이 하도급법 지급 기한(60일) 규정을 무력화',
      suggestion: '용역 대금은 최종 납품 확인일로부터 30일 이내에 지급한다. 지급이 지연될 경우 지연 일수에 연 12%의 지연이자를 가산하여 지급한다.',
      lawRef: '하도급법 제13조 (하도급대금 지급) · 상법 제54조 (지연이자) · 프리랜서 표준계약서 제5조',
    },
    {
      id: 3, level: 'danger', title: '계약 해지 및 해제', article: '제10조',
      desc: '발주사에게만 일방적 해지권을 부여하고 위약금 없이 계약을 종료할 수 있게 하는 불공정 조항입니다.',
      original: '발주사는 사업 내부 사정에 의해 계약을 언제든지 서면 통보로 해지할 수 있으며, 이 경우 기납품 부분에 대한 대금만을 지급한다.',
      problem: '수급인에게 해지권 없음 + 중단 시 손실 보전 조항 전무',
      suggestion: '양 당사자는 30일 전 서면 통보로 계약을 해지할 수 있다. 발주사의 귀책 해지 시 기납품 대금 외 잔여 계약금의 30%를 위약금으로 지급한다.',
      lawRef: '민법 제543조 (해지·해제권) · 공정거래위원회 표준 하도급 계약서 제12조',
    },
    {
      id: 4, level: 'danger', title: '손해배상 및 위약금', article: '제11조',
      desc: '수급인의 손해배상 범위를 계약금액의 300%로 설정한 과도한 위약금 조항입니다. 불공정약관 심사 기준상 무효 가능성이 높습니다.',
      original: '수급인의 귀책사유로 납기를 초과하거나 결과물 하자 발생 시, 계약금액의 300%에 해당하는 손해배상액을 발주사에 지급한다.',
      problem: '300%는 통상적 기준(10~20%) 대비 비상식적 수준. 약관법상 무효 소지',
      suggestion: '납기 지연 시 지연 1일당 계약금액의 0.1%(최대 10%)를 지체상금으로 지급한다. 고의·중과실이 아닌 경우 책임을 계약금액 이내로 제한한다.',
      lawRef: '약관의 규제에 관한 법률 제8조 (손해배상액 예정 조항) · 대법원 2016다227258 판결',
    },
    {
      id: 5, level: 'danger', title: '비밀유지 의무', article: '제8조',
      desc: '비밀유지 대상을 \'본 계약과 관련된 모든 정보\'로 포괄 정의하고 기간도 \'영구적\'으로 설정하여 포트폴리오 활용 및 유사 업무 수행까지 제한될 수 있습니다.',
      original: '수급인은 본 계약과 관련하여 알게 된 모든 정보를 영구적으로 제3자에게 공개하거나 이용할 수 없다.',
      problem: '\'모든 정보\' + \'영구적\' 조합으로 포트폴리오 활용, 유사 업무 수행까지 제한될 수 있음',
      suggestion: '수급인은 계약 기간 및 종료 후 2년간 발주사가 \'영업비밀\'로 지정·고지한 정보에 한하여 제3자 공개를 금지한다. 포트폴리오 활용은 발주사 사전 동의 하에 허용한다.',
      lawRef: '부정경쟁방지법 제2조 제2호 (영업비밀 정의) · 민법 제103조 (반사회적 법률행위)',
    },
    {
      id: 6, level: 'warn', title: '수정 및 검수 조건', article: '제5조',
      desc: '수정 요청 횟수 제한이 없어 납품 후 무제한 수정을 요구할 수 있는 구조입니다. 명확한 횟수 및 범위 합의가 필요합니다.',
      original: '발주사는 납품 후 최종 승인 전까지 결과물에 대한 수정을 요청할 수 있으며, 수급인은 이에 응해야 한다.',
      suggestion: '수정 요청은 납품일로부터 14일 이내, 최대 2회로 한정한다. 추가 수정은 별도 견적으로 진행한다.',
      lawRef: '프리랜서 표준계약서(문화체육관광부) 제6조',
    },
    {
      id: 7, level: 'warn', title: '분쟁 해결 및 관할 법원', article: '제13조',
      desc: '분쟁 발생 시 관할 법원을 발주사 소재지 법원(서울중앙지방법원)으로 일방 지정하여 수급인이 지방 거주 시 소송 부담이 커집니다.',
      original: '본 계약과 관련된 분쟁은 발주사 소재지 관할 법원을 제1심 법원으로 한다.',
      suggestion: '분쟁 발생 시 먼저 조정을 시도하고, 합의 불성립 시 민사소송법에 따른 관할 법원으로 한다.',
      lawRef: '민사소송법 제24조 (합의관할) · 약관규제법 제14조',
    },
  ],
}

/* ── Helpers ───────────────────────────────────────── */
function scoreColor(score: number): string {
  if (score >= 61) return 'var(--risk-high)'
  if (score >= 31) return 'var(--risk-mid)'
  return 'var(--risk-safe)'
}

function gradeLabel(grade: RiskLevel): string {
  return grade === 'danger' ? '⚠ 위험' : grade === 'warn' ? '⚡ 주의' : '✓ 안전'
}

/* ── ResultNav ─────────────────────────────────────── */
function ResultNav({ date }: { date: string }) {
  return (
    <nav className="result-nav">
      <div className="result-nav-inner">
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <Link to="/" className="result-nav-logo">
            <div className="logo-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L3 7V12C3 16.97 6.84 21.61 12 23C17.16 21.61 21 16.97 21 12V7L12 2Z" fill="white" fillOpacity="0.95"/>
                <path d="M9 12L11 14L15 10" stroke="#060d1f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="gradient-text">CHECKMATE</span>
          </Link>
          <span style={{ color: 'var(--border)', fontSize: 16 }}>|</span>
          <Link to="/upload" className="result-nav-back">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
            새 계약서 분석
          </Link>
        </div>

        <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          {date}
        </div>

        <div className="result-nav-actions">
          <button className="result-share-btn" onClick={() => navigator.clipboard?.writeText(window.location.href)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
            공유
          </button>
          <button className="result-download-btn" onClick={() => window.print()}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
            </svg>
            PDF 다운로드
          </button>
        </div>
      </div>
    </nav>
  )
}

/* ── ScoreSection ──────────────────────────────────── */
function ScoreSection({ result }: { result: AnalysisResult }) {
  const { score, grade, dangerCount, warnCount, safeCount, analysisTime, totalClauses, problemTags } = result
  const color = scoreColor(score)

  return (
    <div className="score-section">
      <div className="score-top-row">
        {/* Left: big score */}
        <div className="score-left">
          <div className="score-number" style={{ color }}>{score}</div>
          <div className={`score-grade-badge ${grade}`}>{gradeLabel(grade)}</div>
          <div className="score-summary">
            {dangerCount}개 위험 · {warnCount}개 주의 · {safeCount}개 안전
            <span style={{ margin: '0 6px', opacity: 0.3 }}>·</span>
            총 {totalClauses}개 조항
          </div>
        </div>

        {/* Right: spectrum bar */}
        <div className="score-right">
          <div className="spectrum-label">위험도 스펙트럼</div>
          <div className="spectrum-bar-track">
            <div className="spectrum-needle" style={{ left: `${score}%` }} />
          </div>
          <div className="spectrum-ticks">
            <span>0 안전</span>
            <span>50 주의</span>
            <span>100 위험</span>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="result-metric-grid">
        <div className="result-metric">
          <div className="result-metric-label">위험 조항</div>
          <div className="result-metric-value" style={{ color: 'var(--risk-high)' }}>{dangerCount}개</div>
        </div>
        <div className="result-metric">
          <div className="result-metric-label">주의 조항</div>
          <div className="result-metric-value" style={{ color: 'var(--risk-mid)' }}>{warnCount}개</div>
        </div>
        <div className="result-metric">
          <div className="result-metric-label">안전 조항</div>
          <div className="result-metric-value" style={{ color: 'var(--risk-safe)' }}>{safeCount}개</div>
        </div>
        <div className="result-metric">
          <div className="result-metric-label">분석 소요</div>
          <div className="result-metric-value" style={{ color: 'var(--text-secondary)' }}>{analysisTime}</div>
        </div>
      </div>

      {/* Problem tags */}
      <div className="section-eyebrow">탐지된 문제 유형</div>
      <div className="problem-tag-row">
        {problemTags.map((tag) => (
          <span key={tag.text} className={`problem-tag ${tag.level}`}>{tag.text}</span>
        ))}
      </div>
    </div>
  )
}

/* ── ClauseItem ────────────────────────────────────── */
interface ClauseItemProps {
  clause: Clause
  isOpen: boolean
  onToggle: () => void
}

function ClauseItem({ clause, isOpen, onToggle }: ClauseItemProps) {
  const bodyRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!bodyRef.current || !innerRef.current) return
    bodyRef.current.style.maxHeight = isOpen
      ? `${innerRef.current.scrollHeight}px`
      : '0px'
  }, [isOpen])

  return (
    <div className={`result-clause${isOpen ? ' open' : ''} ${clause.level}-clause`}>
      <button className="result-clause-head" onClick={onToggle}>
        <span className={`result-clause-badge ${clause.level}`}>
          {clause.level === 'danger' ? '위험' : '주의'}
        </span>
        <span className="result-clause-title">{clause.title}</span>
        <span className="result-clause-article">{clause.article}</span>
        <svg
          className="result-clause-chevron"
          width="18" height="18" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      <div className="result-clause-body" ref={bodyRef}>
        <div className="result-clause-body-inner" ref={innerRef}>
          <p className="result-clause-desc">{clause.desc}</p>

          {/* Original */}
          <div className="result-quote-block original">
            <div className="result-quote-label orig">계약서 원문</div>
            <div className="result-quote-text">"{clause.original}"</div>
          </div>

          {/* Problem */}
          {clause.problem && (
            <div className="result-problem-text">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0, marginTop: 2 }}>
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              문제점: {clause.problem}
            </div>
          )}

          {/* Suggestion */}
          <div className="result-quote-block suggest">
            <div className="result-quote-label sugg">AI 수정 제안 문구</div>
            <div className="result-quote-text">"{clause.suggestion}"</div>
          </div>

          {/* Law ref */}
          <div className="result-law-ref">
            📌 법적 근거: {clause.lawRef}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── ClauseList ────────────────────────────────────── */
function ClauseList({ clauses }: { clauses: Clause[] }) {
  const [openId, setOpenId] = useState<number | null>(1)

  const toggle = (id: number) =>
    setOpenId((prev) => (prev === id ? null : id))

  return (
    <div className="result-clause-list">
      {clauses.map((c) => (
        <ClauseItem
          key={c.id}
          clause={c}
          isOpen={openId === c.id}
          onToggle={() => toggle(c.id)}
        />
      ))}
    </div>
  )
}

/* ── ExpertCard ────────────────────────────────────── */
function ExpertCard({ grade }: { grade: RiskLevel }) {
  const isHigh = grade === 'danger'
  const links = [
    { icon: '🏛', label: '대한법률구조공단 (무료)', href: 'https://www.klac.or.kr' },
    { icon: '📞', label: '법률상담 132', href: 'tel:132' },
    { icon: '📋', label: '공정거래위원회 약관심사', href: 'https://www.ftc.go.kr' },
    { icon: '👥', label: '프리랜서유니온 법률지원', href: '#' },
  ]

  return (
    <div className="expert-section">
      <div className="expert-title">
        {isHigh ? '⚠ 이 계약서는 위험도가 높습니다' : '이 계약서는 주의가 필요합니다'}
      </div>
      <p className="expert-desc">
        체결 전 전문가 검토를 권장합니다. 아래 기관에서 무료 또는 저렴한 법률 상담을 받을 수 있습니다.
      </p>
      <div className="expert-chips">
        {links.map(({ icon, label, href }) => (
          <a key={label} className="expert-chip" href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noreferrer">
            <span>{icon}</span>
            {label}
            {href.startsWith('http') && (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.5 }}>
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/>
              </svg>
            )}
          </a>
        ))}
      </div>
    </div>
  )
}

/* ── ContractTextView ──────────────────────────────── */
const CONTRACT_HTML = `
<p><strong>제1조 (목적)</strong><br>본 계약은 발주사(이하 "갑")와 수급인(이하 "을") 간의 영상 편집 용역에 관한 권리와 의무를 정함을 목적으로 한다.</p>
<p><strong>제2조 (용역의 내용)</strong><br>을은 갑이 요청한 유튜브 채널용 쇼츠 영상 편집 용역을 수행한다. (월 20편, 편당 최대 60초)</p>
<p><strong>제3조 (계약 기간)</strong><br>본 계약의 유효 기간은 2026년 7월 1일부터 2026년 12월 31일까지로 한다.</p>
<p><strong>제4조 (대금 지급)</strong><br><span class="hl-danger">용역 대금은 최종 결과물 납품 후 발주사의 내부 검수 및 결재 절차 완료 시점으로부터 60일 이내에 지급한다. 단, 발주사의 내부 사정에 따라 지급이 지연될 수 있다.</span></p>
<p><strong>제5조 (검수 및 수정)</strong><br><span class="hl-warn">발주사는 납품 후 최종 승인 전까지 결과물에 대한 수정을 요청할 수 있으며, 수급인은 이에 응해야 한다.</span></p>
<p><strong>제6조 (납기)</strong><br>을은 매월 말일까지 해당 월 분량을 납품하여야 한다.</p>
<p><strong>제7조 (저작권 귀속)</strong><br><span class="hl-danger">본 계약에 따라 제작된 모든 결과물(완성본 및 중간 산출물 포함)의 저작권, 저작인접권 및 기타 지식재산권 일체는 납품 즉시 발주사에 무상으로 귀속되며, 수급인은 이에 대한 어떠한 권리도 주장할 수 없다.</span></p>
<p><strong>제8조 (비밀유지)</strong><br><span class="hl-danger">수급인은 본 계약과 관련하여 알게 된 모든 정보를 영구적으로 제3자에게 공개하거나 이용할 수 없다.</span></p>
<p><strong>제9조 (4대보험 및 세금)</strong><br>을은 개인사업자로서 세금 신고 및 4대보험 처리를 직접 책임진다.</p>
<p><strong>제10조 (계약 해지)</strong><br><span class="hl-danger">발주사는 사업 내부 사정에 의해 계약을 언제든지 서면 통보로 해지할 수 있으며, 이 경우 기납품 부분에 대한 대금만을 지급한다.</span></p>
<p><strong>제11조 (손해배상)</strong><br><span class="hl-danger">수급인의 귀책사유로 납기를 초과하거나 결과물 하자 발생 시, 계약금액의 300%에 해당하는 손해배상액을 발주사에 지급한다.</span></p>
<p><strong>제12조 (준거법)</strong><br>본 계약은 대한민국 법률에 따라 해석된다.</p>
<p><strong>제13조 (관할 법원)</strong><br><span class="hl-warn">본 계약과 관련된 분쟁은 발주사 소재지 관할 법원을 제1심 법원으로 한다.</span></p>
`

function ContractTextView() {
  return (
    <div className="contract-text-card">
      <div className="section-eyebrow" style={{ marginBottom: 16 }}>영상 편집 용역계약서 전문</div>
      {/* NOTE: dangerouslySetInnerHTML is safe here — content is controlled static data.
          Production should sanitize with DOMPurify if rendering user-uploaded text. */}
      <div
        className="contract-text-scroll"
        dangerouslySetInnerHTML={{ __html: CONTRACT_HTML }}
      />
      <div className="contract-text-legend">
        <div className="legend-chip">
          <div className="legend-dot-sq" style={{ background: 'rgba(239,68,68,0.3)' }} />
          위험 조항
        </div>
        <div className="legend-chip">
          <div className="legend-dot-sq" style={{ background: 'rgba(245,158,11,0.25)' }} />
          주의 조항
        </div>
      </div>
    </div>
  )
}

/* ── Page ──────────────────────────────────────────── */
export default function ResultPage() {
  const location = useLocation()
  const rawResult = (location.state as any)?.analysisResult
  const result: AnalysisResult = rawResult ? transformApiResult(rawResult) : RESULT

  const [activeTab, setActiveTab] = useState<'result' | 'contract'>('result')

  return (
    <div className="result-page">
      <ResultNav date={result.analysisDate} />

      <div className="result-content">
        {/* Title block */}
        <div className="result-eyebrow">분석 완료</div>
        <h1 className="result-contract-name">{result.contractName}</h1>
        <p className="result-contract-meta">
          {result.contractMeta}
          <span>·</span>
          총 {result.totalClauses}개 조항
        </p>

        {/* Tab bar */}
        <div className="result-tabs">
          <button
            className={`result-tab-btn${activeTab === 'result' ? ' active' : ''}`}
            onClick={() => setActiveTab('result')}
          >
            분석 결과
          </button>
          <button
            className={`result-tab-btn${activeTab === 'contract' ? ' active' : ''}`}
            onClick={() => setActiveTab('contract')}
          >
            계약서 원문
          </button>
        </div>

        {/* Tab content */}
        {activeTab === 'result' ? (
          <>
            <ScoreSection result={result} />

            <div className="section-eyebrow" style={{ marginTop: 32 }}>위험 조항 상세 분석</div>
            <ClauseList clauses={result.clauses} />

            <div className="section-eyebrow">전문가 연계</div>
            <ExpertCard grade={result.grade} />
          </>
        ) : (
          <ContractTextView />
        )}

        {/* Footer */}
        <div className="result-footer">
          <strong>CHECKMATE</strong> — "누구나 이해할 수 있게, 누구도 피해 보지 않게"<br />
          본 리포트는 AI 분석 결과이며 법적 효력이 없습니다. 중요한 계약은 반드시 법률 전문가 검토를 받으시기 바랍니다.
        </div>
      </div>
    </div>
  )
}
