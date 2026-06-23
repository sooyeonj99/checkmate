import { useState, useRef, useEffect } from 'react'

function ChatLogo({ size = 32 }: { size?: number }) {
  const id = 'cg' + size
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none"
      style={{ flexShrink: 0, borderRadius: 8, marginBottom: 2 }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>
      <rect width="36" height="36" rx="9" fill={`url(#${id})`} />
      <path d="M18 7L8 12.5V18C8 24.08 12.34 29.72 18 31.5C23.66 29.72 28 24.08 28 18V12.5L18 7Z"
        fill="white" fillOpacity="0.92" />
      <path d="M14 18L17 21L23 15" stroke="#1e3a8a" strokeWidth="2.4"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

interface Message {
  role: 'user' | 'model'
  content: string
}

/* ── 빠른 질문 버튼 ── */
const QUICK_QUESTIONS = [
  { label: '📋 근로계약서 주의사항', text: '근로계약서에서 주의해야 할 조항은 뭔가요?' },
  { label: '💻 프리랜서 계약 위험', text: '프리랜서 계약서에서 조심해야 할 내용이 뭐가 있나요?' },
  { label: '🔒 렌탈 위약금 계산', text: '렌탈 계약 중도 해지 시 위약금은 어떻게 계산되나요?' },
  { label: '🔄 자동 갱신 조항', text: '구독 계약의 자동 갱신 조항이 위험한 이유가 뭔가요?' },
  { label: '⚠️ 포괄임금제란', text: '포괄임금제가 뭔가요? 근로자에게 불리한가요?' },
  { label: '📝 계약서 수정 요청', text: '계약서에 불리한 조항이 있을 때 수정 요청할 수 있나요?' },
]

/* ── 키워드 기반 기본 응답 ── */
const FAQ: { keywords: string[]; answer: string }[] = [
  {
    keywords: ['근로계약서', '근로 계약', '포괄임금', '임금', '연장근로'],
    answer: `📋 **근로계약서 주요 주의사항**

1. **포괄임금제** — 연장·야간·휴일 수당을 월급에 포함시키는 조항. 실제 초과근무 수당을 못 받을 수 있어요.

2. **경업금지 조항** — 퇴사 후 경쟁사 취업을 금지하는 조항. 기간·범위가 지나치게 넓으면 무효가 될 수 있어요.

3. **임의 해지 조항** — 회사가 아무 이유 없이 해고할 수 있다는 조항은 근로기준법 위반이에요.

4. **계약 기간 미명시** — 계약직인지 정규직인지 명확히 확인하세요.

💡 **체크포인트**: 임금 명세, 근무시간, 휴가 일수가 모두 명시돼 있는지 확인하세요!

⚠️ 구체적인 법적 판단은 전문 노무사·변호사와 상담하세요.`,
  },
  {
    keywords: ['포괄임금'],
    answer: `⚠️ **포괄임금제란?**

연장근로·야간근로·휴일근로 수당을 별도 계산하지 않고 월 급여에 미리 포함시키는 제도예요.

**근로자에게 불리한 이유:**
- 실제 초과근무를 많이 해도 추가 수당을 못 받을 수 있어요
- 대법원은 업무 특성상 근로시간 산정이 어려운 경우에만 유효하다고 봐요

**계약서에 이런 문구가 있으면 주의하세요:**
> "제수당 일체를 포함하여 월 OOO원을 지급한다"

💡 실제 초과근무 시간을 기록해두는 게 나중에 분쟁 시 도움이 돼요.`,
  },
  {
    keywords: ['프리랜서', '외주', '용역', '저작권', '대금'],
    answer: `💻 **프리랜서 계약서 핵심 체크리스트**

1. **대금 지급 조건** — 납품 후 며칠 이내 지급인지, 지연 시 지연이자 조항이 있는지 확인

2. **저작권 귀속** — "작업 결과물의 저작권은 갑에게 귀속한다"는 조항은 포트폴리오 사용도 불가!

3. **수정 범위** — 무제한 수정 요구 방지를 위해 수정 횟수와 범위를 명시해야 해요

4. **비밀유지 기간** — 계약 종료 후 비밀유지 기간이 너무 길면 다른 일을 못할 수도 있어요

5. **계약 해지 조건** — 클라이언트가 일방적으로 계약을 취소할 경우 기성금 지급 여부 확인

💡 **대금 미지급 시**: 내용증명 발송 → 소액심판 청구 순서로 대응하세요.`,
  },
  {
    keywords: ['렌탈', '위약금', '해지', '중도해지', '약정'],
    answer: `🔒 **렌탈·약정 계약 위약금 계산법**

일반적으로 렌탈 계약 위약금은:

**잔여 기간 × 월 이용료 × 위약금 비율**

예시) 월 35,000원 / 잔여 36개월 / 위약금율 100%
→ 36 × 35,000 = **1,260,000원**

**계약서에서 꼭 확인하세요:**
- 위약금 계산 기준 (잔여 금액의 몇 %)
- 중도 해지 가능 시점 (보통 절반 이상 사용 후)
- 기기 반납 조건 및 택배비 부담 주체

💡 **Checkmate 팁**: 대시보드에서 지금 해지 시 위약금을 실시간으로 확인할 수 있어요!`,
  },
  {
    keywords: ['자동갱신', '자동 갱신', '구독', '갱신'],
    answer: `🔄 **자동 갱신 조항 주의사항**

**자동 갱신이 위험한 이유:**
- 해지 의사를 기간 내 통보하지 않으면 자동으로 재계약됨
- 보통 만료 30~60일 전에 해지 신청을 해야 함
- 갱신 후 즉시 해지하면 또 위약금 발생

**계약서에서 확인할 문구:**
> "계약 만료 OO일 전까지 해지 통보 없으면 동일 조건으로 자동 연장"

**대응 방법:**
- 계약 만료일을 캘린더에 꼭 등록하세요
- 해지 신청은 만료 45~60일 전에 여유있게 하세요
- 해지 신청 증거(이메일, 문자)를 보관하세요

💡 **Checkmate 대시보드**에서 만료 30일 전 자동 알림을 받을 수 있어요!`,
  },
  {
    keywords: ['수정', '협상', '불리', '바꿀', '변경'],
    answer: `📝 **불리한 계약 조항 수정 요청 방법**

**할 수 있습니다!** 계약서는 합의 문서이므로 양측이 동의하면 수정 가능해요.

**수정 요청 절차:**
1. 문제 조항을 특정하고 이유를 구체적으로 설명
2. 대안 문구를 직접 제안 (예: "30일" → "15일")
3. 서면(이메일)으로 요청해 기록을 남기세요
4. 협의된 내용은 계약서에 반드시 반영하고 서명

**수정이 어려울 때:**
- 해당 조항 삭제 요청
- 특약 사항으로 예외 조건 추가
- 최악의 경우 계약 체결을 거부할 권리가 있어요

💡 Checkmate로 계약서를 분석하면 어떤 조항이 불리한지 자동으로 파악할 수 있어요!`,
  },
  {
    keywords: ['체크메이트', 'checkmate', '서비스', '이용', '사용법', '어떻게'],
    answer: `✅ **Checkmate 이용 방법**

**3단계로 계약서를 분석할 수 있어요:**

1️⃣ **업로드** — PDF, JPG, PNG, HWP, DOCX 파일 지원 (최대 20MB)

2️⃣ **계약 유형 선택** — 근로계약서 / 프리랜서 / 구독·이용약관 / 렌탈·약정 / 임대차 / 기타

3️⃣ **결과 확인** — 위험도 점수, 위험 조항 태그, 수정 제안 제공

**대시보드 기능:**
- 분석한 계약서 이력 관리
- 만료일 알림
- 구독·렌탈 비용 및 위약금 현황

📎 우측 상단 **"무료 체험하기"** 버튼으로 바로 시작해보세요!`,
  },
]

function getLocalAnswer(text: string): string | null {
  const lower = text.toLowerCase()
  for (const faq of FAQ) {
    if (faq.keywords.some((k) => lower.includes(k))) {
      return faq.answer
    }
  }
  return null
}

const WELCOME = `안녕하세요! 👋 Checkmate AI 상담사입니다.
계약서 관련 궁금한 점을 도와드릴게요.

아래 자주 묻는 질문을 선택하거나, 직접 입력해 주세요!`

export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', content: WELCOME },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showQuick, setShowQuick] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  async function send(text: string = input.trim()) {
    if (!text || loading) return
    setShowQuick(false)

    const history = messages.map((m) => ({ role: m.role, content: m.content }))
    const next: Message[] = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setInput('')
    setLoading(true)

    // 로컬 FAQ 먼저 확인
    const localAnswer = getLocalAnswer(text)

    try {
      const res = await fetch('/api/v1/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history }),
        signal: AbortSignal.timeout(8000),
      })

      if (!res.ok) throw new Error('api_error')
      const data = await res.json()
      setMessages([...next, { role: 'model', content: data.reply }])
    } catch {
      // Gemini 실패 시 로컬 응답 사용
      const fallback = localAnswer
        ?? `죄송해요, 현재 AI 연결이 원활하지 않습니다.\n\n아래 자주 묻는 질문 버튼을 이용하거나, 잠시 후 다시 시도해 주세요. 😊`
      setMessages([...next, { role: 'model', content: fallback }])
      if (!localAnswer) setShowQuick(true)
    } finally {
      setLoading(false)
    }
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  function reset() {
    setMessages([{ role: 'model', content: WELCOME }])
    setShowQuick(true)
    setInput('')
  }

  return (
    <>
      {open && (
        <div className="chat-window">
          {/* Header */}
          <div className="chat-header">
            <ChatLogo size={36} />
            <div>
              <div className="chat-header-title">CHECKMATE AI</div>
              <div className="chat-header-sub">계약서 상담 전문 AI</div>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
              <button className="chat-close-btn" onClick={reset} title="대화 초기화">↺</button>
              <button className="chat-close-btn" onClick={() => setOpen(false)} aria-label="닫기">✕</button>
            </div>
          </div>

          {/* Messages */}
          <div className="chat-messages">
            {messages.map((m, i) => (
              <div key={i} className={`chat-msg ${m.role}`}>
                {m.role === 'model' && <ChatLogo />}
                <div className="chat-bubble">{m.content}</div>
              </div>
            ))}

            {/* 빠른 질문 버튼 */}
            {showQuick && !loading && (
              <div className="chat-quick-wrap">
                {QUICK_QUESTIONS.map((q) => (
                  <button key={q.text} className="chat-quick-btn" onClick={() => send(q.text)}>
                    {q.label}
                  </button>
                ))}
              </div>
            )}

            {loading && (
              <div className="chat-msg model">
                <ChatLogo />
                <div className="chat-bubble chat-typing">
                  <span /><span /><span />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="chat-input-row">
            <input
              ref={inputRef}
              className="chat-input"
              placeholder="질문을 입력하세요..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              disabled={loading}
            />
            <button className="chat-send-btn" onClick={() => send()} disabled={loading || !input.trim()} aria-label="전송">
              ➤
            </button>
          </div>
          <div className="chat-disclaimer">AI 답변은 참고용이며 법적 효력이 없습니다.</div>
        </div>
      )}

      {/* Floating button */}
      <button
        className={`chat-float-btn${open ? ' active' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-label="AI 상담"
      >
        {open ? '✕' : <ChatLogo size={28} />}
      </button>
    </>
  )
}
