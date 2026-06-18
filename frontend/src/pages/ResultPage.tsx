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

/* ── Mock data (베타 테스트 시 표시 — 근로계약서 샘플) ── */
const RESULT: AnalysisResult = {
  contractName: '○○ 주식회사 근로계약서',
  contractMeta: '사용자 ○○ 주식회사 · 입사일 2026.07.01 · 정규직',
  analysisDate: '2026. 06. 19',
  totalClauses: 12,
  score: 74,
  grade: 'danger',
  dangerCount: 3,
  warnCount: 3,
  safeCount: 6,
  analysisTime: '24초',
  problemTags: [
    { text: '포괄임금제로 야근수당 없음', level: 'danger' },
    { text: '의무재직 위반 시 손해배상', level: 'danger' },
    { text: '퇴직 후 2년 취업 제한', level: 'danger' },
    { text: '수습기간 임금 감액', level: 'warn' },
    { text: '업무 범위 무제한', level: 'warn' },
    { text: '개인정보 광범위 수집', level: 'warn' },
  ],
  clauses: [
    {
      id: 1, level: 'danger', title: '포괄임금제 조항', article: '제4조',
      desc: '연장·야간·휴일 근로수당을 월 급여에 포함시키는 포괄임금 약정입니다. 실제 초과근무를 해도 별도 수당이 지급되지 않아 장시간 근로 시 큰 손해가 발생합니다.',
      original: '월 급여 ○○○만 원에는 연장근로수당, 야간근로수당, 휴일근로수당이 포함되어 있으며, 실제 초과근무 시에도 별도 수당을 지급하지 아니한다.',
      problem: '대법원은 실제 초과근무가 발생하는 업무에 포괄임금제 적용 시 무효로 판단 (대법원 2016다48785)',
      suggestion: '연장·야간·휴일 근로는 근로기준법 제56조에 따라 통상임금의 50%를 가산하여 별도 지급한다. 불가피한 경우 사전 합의된 고정 연장근로 시간(주 12시간 한도)만 포괄 산정한다.',
      lawRef: '근로기준법 제56조 (연장·야간·휴일 근로 가산수당) · 대법원 2016다48785 판결',
    },
    {
      id: 2, level: 'danger', title: '의무 재직 기간 손해배상', article: '제10조',
      desc: '입사 후 1년 내 퇴직 시 회사가 지출한 교육·훈련 비용 전액을 배상하도록 규정하고 있습니다. 근로자의 자유로운 퇴직권을 사실상 박탈하는 조항입니다.',
      original: '근로자는 입사일로부터 1년 이내 퇴직 시 회사가 지출한 교육훈련비, 채용 비용 등 일체를 배상하여야 한다.',
      problem: '근로기준법은 근로자의 손해배상액 예정을 금지 — 실제 손해 입증 없이 전액 청구는 무효 소지',
      suggestion: '회사가 실제로 지출하고 입증 가능한 교육훈련비에 한하여, 재직 기간에 비례하여 감액된 금액을 반환 요청할 수 있다. 단, 반환 조건은 근로자가 자발적으로 퇴직하는 경우에만 적용한다.',
      lawRef: '근로기준법 제20조 (위약 예정의 금지) · 제24조 · 대법원 2004다13589 판결',
    },
    {
      id: 3, level: 'danger', title: '경업금지(취업제한) 조항', article: '제11조',
      desc: '퇴직 후 2년간 동종업계 취업 및 창업을 금지하는 조항입니다. 생계와 직결되는 직업 선택의 자유를 과도하게 제한하며, 범위·기간이 합리적이지 않으면 법적으로 무효입니다.',
      original: '근로자는 퇴직 후 2년간 동종·유사 업종의 타 회사에 취업하거나 창업할 수 없으며, 위반 시 위약금 ○○○만 원을 지급한다.',
      problem: '기간(2년) + 범위(동종 전체) + 지역 제한 없음 → 헌법상 직업선택의 자유 침해, 법원 무효 판결 다수',
      suggestion: '경업금지 의무는 회사의 핵심 영업비밀에 직접 접근한 직무에 한하며, 기간은 6개월 이내, 지역은 회사 영업 지역으로 한정한다. 금지 기간 동안 통상임금 50% 이상의 보상을 지급한다.',
      lawRef: '헌법 제15조 (직업선택의 자유) · 부정경쟁방지법 제2조 · 대법원 2010다82199 판결',
    },
    {
      id: 4, level: 'warn', title: '수습 기간 임금 감액', article: '제3조',
      desc: '3개월 수습 기간 동안 최저임금의 90%를 지급하는 조항입니다. 법적으로는 허용되나, 수습 여부와 관계없이 정상 업무를 수행하는 경우 부당한 감액이 될 수 있습니다.',
      original: '입사 후 3개월은 수습 기간으로 하며, 이 기간 동안 임금은 최저임금의 90%를 적용한다.',
      suggestion: '수습 기간은 최대 3개월로 하되, 수습 감액(최저임금 90%)은 단순 반복 업무가 아닌 기술 습득이 필요한 직종에 한하여 적용하며, 정상 업무 투입 즉시 정규 급여를 지급한다.',
      lawRef: '최저임금법 제5조 제2항 (수습 근로자 감액 적용) · 고용노동부 고시',
    },
    {
      id: 5, level: 'warn', title: '업무 범위 무제한 지시', article: '제2조',
      desc: '담당 업무를 "회사가 지시하는 모든 업무"로 포괄 규정하여 채용 공고와 다른 업무, 전혀 다른 부서 배치 등에 이의를 제기하기 어렵게 됩니다.',
      original: '근로자는 회사가 지시하는 모든 업무를 성실히 수행하여야 한다.',
      suggestion: '근로자의 담당 업무는 [직무명: ○○ 업무]로 하며, 업무 변경이 필요한 경우 근로자와 사전 협의하여 서면으로 합의한다.',
      lawRef: '근로기준법 제17조 (근로조건의 명시) · 제23조 (해고 등의 제한)',
    },
    {
      id: 6, level: 'warn', title: '개인정보 광범위 수집 동의', article: '제12조',
      desc: '재직 중 및 퇴직 후에도 개인정보 이용에 동의하도록 규정하고 있으며, 수집 목적과 보유 기간이 불명확합니다.',
      original: '근로자는 회사의 인사·노무 관리 목적으로 개인정보를 수집·이용하는 것에 동의하며, 이는 퇴직 후에도 유효하다.',
      suggestion: '개인정보 수집 항목, 이용 목적, 보유 기간을 별도 동의서에 명시한다. 퇴직 후 개인정보는 관련 법령이 정한 기간 경과 후 즉시 파기한다.',
      lawRef: '개인정보 보호법 제15조 (개인정보의 수집·이용) · 제16조 (개인정보의 수집 제한)',
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
<p><strong>제1조 (목적)</strong><br>본 계약은 ○○ 주식회사(이하 "회사")와 근로자 간의 근로관계에 관한 사항을 정함을 목적으로 한다.</p>
<p><strong>제2조 (업무 내용)</strong><br><span class="hl-warn">근로자는 회사가 지시하는 모든 업무를 성실히 수행하여야 한다.</span></p>
<p><strong>제3조 (수습 기간)</strong><br>입사일로부터 3개월은 수습 기간으로 하며, <span class="hl-warn">이 기간 동안 임금은 최저임금의 90%를 적용한다.</span></p>
<p><strong>제4조 (임금)</strong><br><span class="hl-danger">월 급여 ○○○만 원에는 연장근로수당, 야간근로수당, 휴일근로수당이 포함되어 있으며, 실제 초과근무 시에도 별도 수당을 지급하지 아니한다.</span></p>
<p><strong>제5조 (근로 시간)</strong><br>근로 시간은 주 40시간을 원칙으로 하되, 업무 상황에 따라 연장근로가 발생할 수 있다.</p>
<p><strong>제6조 (연차 및 휴가)</strong><br>근로기준법이 정하는 바에 따라 연차 유급휴가를 부여한다.</p>
<p><strong>제7조 (복무 규정)</strong><br>근로자는 회사의 취업규칙 및 내부 규정을 준수하여야 한다.</p>
<p><strong>제8조 (비밀유지)</strong><br>근로자는 재직 중 및 퇴직 후에도 회사의 영업비밀 및 기밀 정보를 외부에 유출하여서는 아니 된다.</p>
<p><strong>제9조 (지식재산권)</strong><br>근로자가 재직 중 직무와 관련하여 창작한 발명, 저작물 등의 지식재산권은 회사에 귀속된다.</p>
<p><strong>제10조 (의무 재직 및 손해배상)</strong><br><span class="hl-danger">근로자는 입사일로부터 1년 이내 퇴직 시 회사가 지출한 교육훈련비, 채용 비용 등 일체를 배상하여야 한다.</span></p>
<p><strong>제11조 (경업금지)</strong><br><span class="hl-danger">근로자는 퇴직 후 2년간 동종·유사 업종의 타 회사에 취업하거나 창업할 수 없으며, 위반 시 위약금 ○○○만 원을 지급한다.</span></p>
<p><strong>제12조 (개인정보 수집·이용 동의)</strong><br><span class="hl-warn">근로자는 회사의 인사·노무 관리 목적으로 개인정보를 수집·이용하는 것에 동의하며, 이는 퇴직 후에도 유효하다.</span></p>
`

function ContractTextView() {
  return (
    <div className="contract-text-card">
      <div className="section-eyebrow" style={{ marginBottom: 16 }}>근로계약서 전문</div>
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
  const isMock = (location.state as any)?.isMock || !rawResult
  const result: AnalysisResult = rawResult ? transformApiResult(rawResult) : RESULT

  const [activeTab, setActiveTab] = useState<'result' | 'contract'>('result')

  return (
    <div className="result-page">
      <ResultNav date={result.analysisDate} />

      {/* 베타 테스트 배너 */}
      {isMock && (
        <div style={{
          background: 'rgba(79,142,247,0.08)',
          borderBottom: '1px solid rgba(79,142,247,0.2)',
          padding: '10px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          fontSize: 13,
          color: 'rgba(79,142,247,0.95)',
        }}>
          <span>🧪</span>
          <span>
            <strong>베타 테스트 버전</strong> · 현재 샘플 분석 결과를 표시하고 있습니다.
            실제 AI 분석은 서비스 정식 출시 후 이용 가능합니다.
          </span>
        </div>
      )}

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
