import { useState, useRef, useEffect, useCallback } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

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
  contractHtml?: string
}

/* ── 계약서 원문 텍스트 → 하이라이트 HTML 변환 ────────── */
function buildContractHtml(rawText: string, clauses: any[]): string {
  if (!rawText) return ''

  // HTML 이스케이프
  let html = rawText
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // 각 조항 원문을 위험도에 맞게 하이라이트
  for (const c of clauses) {
    const orig: string = (c.original ?? '').trim()
    if (orig.length < 6) continue
    const escaped = orig
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const cls = c.risk === 'danger' ? 'ct-hl-danger' : c.risk === 'warn' ? 'ct-hl-warn' : ''
    if (!cls) continue
    try {
      html = html.replace(
        new RegExp(escaped.replace(/\s+/g, '\\s+'), 'g'),
        `<mark class="${cls}">$&</mark>`,
      )
    } catch { /* 정규식 오류 무시 */ }
  }

  // 빈 줄로 단락 분리
  return html
    .split(/\n{2,}/)
    .filter(Boolean)
    .map((p) => `<p>${p.replace(/\n/g, '<br/>')}</p>`)
    .join('\n')
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
    contractHtml: buildContractHtml(data.contract_text ?? '', data.clauses ?? []),
  }
}

/* ── Mock data (베타 테스트 시 표시 — 렌탈/구독 서비스 계약서 샘플) ── */
const RESULT: AnalysisResult = {
  contractName: '가전제품 렌탈 서비스 이용계약서',
  contractMeta: '공급사 ○○렌탈 · 월 렌탈료 39,900원 · 약정 60개월',
  analysisDate: '2026. 06. 20',
  totalClauses: 11,
  score: 76,
  grade: 'danger',
  dangerCount: 3,
  warnCount: 3,
  safeCount: 5,
  analysisTime: '22초',
  problemTags: [
    { text: '중도 해지 위약금 수백만 원', level: 'danger' },
    { text: '해지 미통보 시 자동 1년 연장', level: 'danger' },
    { text: '렌탈료 일방 인상 가능', level: 'danger' },
    { text: '약정 기간 계약일부터 기산', level: 'warn' },
    { text: '제품 임의 교체 가능', level: 'warn' },
    { text: '소유권 이전에 추가 수수료', level: 'warn' },
  ],
  clauses: [
    {
      id: 1, level: 'danger', title: '중도 해지 위약금', article: '제9조',
      desc: '"잔여 약정 렌탈료의 40%"라는 표현이 합리적으로 보이지만, 5년 약정 1년 시점에 해지하면 잔여 48개월×39,900원×40% ≈ 77만 원을 위약금으로 내야 합니다. 직접 계산해보지 않으면 알 수 없습니다.',
      original: '계약 기간 중 중도 해지 시 잔여 약정 렌탈료의 40%에 해당하는 금액을 위약금으로 납부하여야 한다.',
      problem: '"40%"라는 숫자가 합리적으로 느껴지나 잔여 기간이 길수록 실제 금액은 수십~수백만 원에 달함',
      suggestion: '중도 해지 위약금은 잔여 약정 기간에 따라 구간별로 감소하는 방식으로 산정하며, 계약 체결 시 예상 위약금 금액을 소비자에게 서면으로 고지하여야 한다.',
      lawRef: '소비자기본법 제19조 (사업자의 의무) · 공정거래위원회 렌탈 표준약관 제14조 · 약관규제법 제8조',
    },
    {
      id: 2, level: 'danger', title: '자동 연장 조항', article: '제8조',
      desc: '계약 만료 45일 전까지 해지 의사를 통보하지 않으면 동일 조건으로 1년 자동 연장됩니다. 만료일을 잊거나 통보 기간(45일)을 놓치면 원치 않는 1년을 더 사용하게 됩니다.',
      original: '계약 만료일 45일 전까지 서면으로 해지 의사를 통보하지 않을 경우, 동일 조건으로 1년간 자동 연장된다.',
      problem: '소비자가 만료일과 통보 기한을 정확히 계산하지 않으면 자동으로 추가 1년 약정에 묶임. 사전 안내 의무 없음.',
      suggestion: '자동 연장 시 회사는 계약 만료 60일 전 이메일·문자로 만료일 및 해지 신청 기한을 소비자에게 고지하여야 한다. 고지 없이 자동 연장된 경우 소비자는 위약금 없이 해지할 수 있다.',
      lawRef: '전자상거래법 제21조 (금지행위) · 공정거래위원회 구독경제 가이드라인 · 약관규제법 제6조',
    },
    {
      id: 3, level: 'danger', title: '렌탈료 일방 인상', article: '제5조',
      desc: '"소비자 물가지수 변동 및 제반 비용 상승에 따라 조정할 수 있다"는 한 문장이 매년 렌탈료 인상의 근거가 됩니다. 인상 폭 상한선이 없어 5년간 실제 납부 금액이 크게 달라질 수 있습니다.',
      original: '회사는 소비자 물가지수 변동 및 원자재·서비스 비용 상승에 따라 렌탈료를 조정할 수 있으며, 변경 30일 전 고지한다.',
      problem: '인상 상한선 없음. 고지 후 소비자가 거부하면 위약금을 내고 해지해야 하는 구조',
      suggestion: '렌탈료 인상은 연 1회, 직전 연도 소비자물가지수 상승률 이내로 제한한다. 인상 시 소비자는 위약금 없이 60일 이내 계약을 해지할 수 있다.',
      lawRef: '약관규제법 제10조 (소비자에게 불리한 조항) · 공정거래위원회 표준약관 제8조 · 소비자기본법 제20조',
    },
    {
      id: 4, level: 'warn', title: '약정 기간 기산점', article: '제3조',
      desc: '약정 기간이 "계약 체결일"부터 시작됩니다. 설치까지 2~3주 걸리는 경우 실제 제품을 사용하지도 않았는데 약정 기간이 줄어들고, 60개월 렌탈료는 모두 납부해야 합니다.',
      original: '약정 기간은 계약 체결일로부터 기산하며, 계약 기간 동안 렌탈료가 부과된다.',
      suggestion: '약정 기간은 제품 설치 완료일로부터 기산하며, 설치 지연이 회사 귀책인 경우 지연 기간만큼 약정 기간을 연장하거나 렌탈료를 감면한다.',
      lawRef: '민법 제656조 (임대차의 기간) · 소비자분쟁해결기준 (렌탈 분야)',
    },
    {
      id: 5, level: 'warn', title: '제품 임의 교체', article: '제7조',
      desc: '회사가 "동급 사양의 제품"으로 임의 교체할 수 있습니다. 소비자가 선택한 특정 브랜드·색상·기능의 제품이 다른 제품으로 교체될 수 있으며, 거부 시 해지 위약금이 발생합니다.',
      original: '회사는 서비스 운영상 필요한 경우 동급 사양의 제품으로 교체할 수 있으며, 소비자는 이에 동의한다.',
      suggestion: '"동급 사양"의 기준을 구체적으로 명시하고, 제품 교체 시 소비자의 사전 동의를 받아야 한다. 소비자가 교체에 동의하지 않는 경우 위약금 없이 계약을 해지할 수 있다.',
      lawRef: '민법 제390조 (채무불이행) · 소비자기본법 제19조 · 공정거래위원회 렌탈 표준약관',
    },
    {
      id: 6, level: 'warn', title: '소유권 이전 추가 수수료', article: '제11조',
      desc: '60개월 렌탈료를 모두 납부해도 소유권이 자동 이전되지 않습니다. 별도 "소유권 이전 신청"을 하고 수수료를 납부해야 내 것이 됩니다. 이 사실을 모르고 그냥 두면 소유권이 회사에 남습니다.',
      original: '약정 기간 만료 후 소비자가 소유권 이전을 신청하고 이전 수수료를 납부한 경우에 한하여 소유권이 이전된다.',
      suggestion: '약정 기간 만료 시 별도 절차 없이 소유권이 자동으로 소비자에게 이전된다. 이전 수수료는 별도로 청구하지 아니한다.',
      lawRef: '민법 제186조 (부동산물권변동) · 소비자분쟁해결기준 (가전제품 렌탈 분야)',
    },
  ],
  contractHtml: `
<p><strong>가전제품 렌탈 서비스 이용계약서</strong></p>
<p>공급사 ○○렌탈(이하 "회사")과 소비자는 아래와 같이 가전제품 렌탈 서비스 이용 계약을 체결합니다.</p>

<p><strong>제1조 (계약의 목적)</strong><br/>
본 계약은 회사가 소비자에게 제공하는 가전제품 렌탈 서비스의 이용 조건과 당사자 간 권리·의무를 정함을 목적으로 합니다.</p>

<p><strong>제2조 (계약의 구성)</strong><br/>
본 계약은 이용계약서, 별도 상품설명서, 렌탈 이용 안내문으로 구성되며, 상호 보완적으로 적용됩니다.</p>

<p><strong>제3조 (약정 기간 및 렌탈료)</strong><br/>
<mark class="ct-hl-warn">약정 기간은 계약 체결일로부터 기산하며, 계약 기간 동안 렌탈료가 부과된다.</mark> 월 렌탈료는 39,900원이며 약정 기간은 60개월로 합니다.</p>

<p><strong>제4조 (렌탈료 납부)</strong><br/>
렌탈료는 매월 지정된 결제일에 자동이체 또는 카드 청구 방식으로 납부합니다. 연체 시 미납 렌탈료의 연 15%에 해당하는 연체료가 부과됩니다.</p>

<p><strong>제5조 (렌탈료 조정)</strong><br/>
<mark class="ct-hl-danger">회사는 소비자 물가지수 변동 및 원자재·서비스 비용 상승에 따라 렌탈료를 조정할 수 있으며, 변경 30일 전 고지한다.</mark></p>

<p><strong>제6조 (설치 및 A/S)</strong><br/>
제품 설치는 계약 체결 후 7영업일 이내에 진행하며, 정기 점검 및 필터 교체 서비스를 분기별로 제공합니다. A/S는 회사가 지정한 서비스 센터를 통해 처리합니다.</p>

<p><strong>제7조 (제품 관리 및 교체)</strong><br/>
소비자는 선량한 관리자의 주의로 제품을 사용하여야 하며, 소비자의 고의·과실로 인한 파손은 소비자가 수리 비용을 부담합니다.<br/>
<mark class="ct-hl-warn">회사는 서비스 운영상 필요한 경우 동급 사양의 제품으로 교체할 수 있으며, 소비자는 이에 동의한다.</mark></p>

<p><strong>제8조 (계약 갱신 및 해지)</strong><br/>
<mark class="ct-hl-danger">계약 만료일 45일 전까지 서면으로 해지 의사를 통보하지 않을 경우, 동일 조건으로 1년간 자동 연장된다.</mark> 해지 의사 표시는 고객센터 방문, 우편, 내용증명 중 하나의 방법으로 하여야 합니다.</p>

<p><strong>제9조 (중도 해지 위약금)</strong><br/>
<mark class="ct-hl-danger">계약 기간 중 중도 해지 시 잔여 약정 렌탈료의 40%에 해당하는 금액을 위약금으로 납부하여야 한다.</mark> 위약금은 해지 신청일로부터 30일 이내에 납부하여야 합니다.</p>

<p><strong>제10조 (회사의 의무)</strong><br/>
회사는 렌탈 제품의 정상 작동을 보장하고, 제품 결함 발생 시 7일 이내 수리 또는 동급 제품으로 교환합니다. 회사의 귀책으로 인한 서비스 중단 시 렌탈료를 감면합니다.</p>

<p><strong>제11조 (소유권 이전)</strong><br/>
<mark class="ct-hl-warn">약정 기간 만료 후 소비자가 소유권 이전을 신청하고 이전 수수료를 납부한 경우에 한하여 소유권이 이전된다.</mark> 소유권 이전 수수료는 제품 기준가의 5%로 합니다.</p>
`,
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
function ResultNav({ date, onPdf }: { date: string; onPdf?: () => void }) {
  const navigate = useNavigate()
  return (
    <nav className="result-nav">
      <div className="result-nav-inner">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
          {/* 대시보드 버튼 */}
          <button className="result-nav-back" onClick={() => navigate('/dashboard')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
            </svg>
            대시보드
          </button>
          {/* 새 분석 버튼 */}
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
          <button
            className="result-download-btn"
            onClick={onPdf}
            disabled={!onPdf}
            title={!onPdf ? '결과를 저장해야 PDF를 받을 수 있습니다' : undefined}
            style={!onPdf ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
          >
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
            <div className="result-quote-label sugg">판례 및 법적 기준 대안</div>
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
    { icon: '🏛', label: '대한법률구조공단', href: 'https://www.klac.or.kr' },
    { icon: '📞', label: '법률상담 132', href: 'tel:132' },
    { icon: '📋', label: '공정거래위원회 약관심사', href: 'https://www.ftc.go.kr' },
  ]

  return (
    <div className="expert-section">
      <div className="expert-title">
        {isHigh ? '⚠ 이 계약서는 위험도가 높습니다' : '이 계약서는 주의가 필요합니다'}
      </div>
      <p className="expert-desc">
        계약서 관련 도움을 받을 수 있는 공공 기관 정보입니다.
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
function ContractTextView({ contractName, html }: { contractName: string; html: string }) {
  if (!html) {
    return (
      <div className="contract-text-card">
        <div className="section-eyebrow" style={{ marginBottom: 16 }}>{contractName} 전문</div>
        <div className="contract-text-empty">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.3, marginBottom: 12 }}>
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
          </svg>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-muted)' }}>
            계약서 원문을 표시하려면 PDF 또는 DOCX 파일을 업로드하세요.<br/>
            이미지(JPG/PNG)로 분석한 경우 원문이 제공되지 않습니다.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="contract-text-card">
      <div className="section-eyebrow" style={{ marginBottom: 16 }}>{contractName} 전문</div>
      <div
        className="contract-text-scroll"
        dangerouslySetInnerHTML={{ __html: html }}
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
  const navigate = useNavigate()
  const directResult = (location.state as any)?.directResult as AnalysisResult | undefined
  const rawResult = (location.state as any)?.analysisResult
  const contractId = (location.state as any)?.contractId as string | undefined
  const isMock = (location.state as any)?.isMock || (!directResult && !rawResult)
  const isSaved = (location.state as any)?.isSaved === true   // 대시보드에서 열었을 때
  const result: AnalysisResult = directResult ?? (rawResult ? transformApiResult(rawResult) : RESULT)

  const [activeTab, setActiveTab] = useState<'result' | 'contract'>('result')
  const [saveState, setSaveState] = useState<'pending' | 'saved' | 'discarded'>(
    (isMock || isSaved) ? 'saved' : 'pending'
  )
  const [saving, setSaving] = useState(false)

  /* 결과 저장 */
  const handleSave = useCallback(async () => {
    if (!contractId || !rawResult) { setSaveState('saved'); return }
    setSaving(true)
    try {
      const token = localStorage.getItem('cm_token')
      await fetch(`/api/v1/contracts/${contractId}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(rawResult),
      })
      setSaveState('saved')
    } catch {
      setSaveState('saved')   // 실패해도 PDF는 허용
    } finally {
      setSaving(false)
    }
  }, [contractId, rawResult])

  /* 저장 안 함 → 파일 삭제 후 대시보드 */
  const handleDiscard = useCallback(async () => {
    if (contractId) {
      const token = localStorage.getItem('cm_token')
      fetch(`/api/v1/contracts/${contractId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {})
    }
    navigate('/dashboard')
  }, [contractId, navigate])

  /* PDF: 모든 조항 펼침 → 인쇄 → 복원 */
  const handlePdf = useCallback(() => {
    document.body.classList.add('print-expand')
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.print()
        document.body.classList.remove('print-expand')
      })
    })
  }, [])

  return (
    <div className="result-page">
      <ResultNav date={result.analysisDate} onPdf={saveState === 'saved' ? handlePdf : undefined} />

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

            <div className="section-eyebrow">관련 기관 정보</div>
            <ExpertCard grade={result.grade} />
          </>
        ) : (
          <ContractTextView
            contractName={result.contractName}
            html={result.contractHtml ?? ''}
          />
        )}

        {/* 저장 여부 선택 배너 */}
        {saveState === 'pending' && (
          <div className="result-save-banner">
            <div className="result-save-banner-text">
              <span className="result-save-banner-title">분석 결과를 저장할까요?</span>
              <span className="result-save-banner-sub">저장하면 대시보드에서 언제든지 다시 확인할 수 있습니다.</span>
            </div>
            <div className="result-save-banner-actions">
              <button
                className="result-save-btn"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? '저장 중...' : '결과 저장'}
              </button>
              <button
                className="result-discard-btn"
                onClick={handleDiscard}
              >
                저장 안 함
              </button>
            </div>
          </div>
        )}

        {saveState === 'saved' && (
          <div className="result-saved-notice">
            대시보드에 저장되었습니다. PDF 다운로드가 활성화되었습니다.
          </div>
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
