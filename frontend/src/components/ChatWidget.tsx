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

const WELCOME = '안녕하세요! Checkmate AI 상담사입니다. 계약서 관련 궁금한 점을 무엇이든 물어보세요. 😊'

export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', content: WELCOME },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  async function send() {
    const text = input.trim()
    if (!text || loading) return

    const history = messages.map((m) => ({ role: m.role, content: m.content }))
    const next: Message[] = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/v1/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail ?? `서버 오류 (${res.status})`)
      }

      const data = await res.json()
      setMessages([...next, { role: 'model', content: data.reply }])
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '알 수 없는 오류'
      const isNetwork = msg.includes('fetch') || msg.includes('Failed')
      setMessages([
        ...next,
        {
          role: 'model',
          content: isNetwork
            ? '백엔드 서버에 연결할 수 없습니다. 로컬에서 백엔드를 실행한 후 다시 시도해 주세요.'
            : `오류: ${msg}`,
        },
      ])
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

  return (
    <>
      {/* Chat window */}
      {open && (
        <div className="chat-window">
          <div className="chat-header">
            <ChatLogo size={36} />
            <div>
              <div className="chat-header-title">CHECKMATE AI</div>
              <div className="chat-header-sub">계약서 상담 전문 AI</div>
            </div>
            <button className="chat-close-btn" onClick={() => setOpen(false)} aria-label="닫기">✕</button>
          </div>

          <div className="chat-messages">
            {messages.map((m, i) => (
              <div key={i} className={`chat-msg ${m.role}`}>
                {m.role === 'model' && <ChatLogo />}
                <div className="chat-bubble">{m.content}</div>
              </div>
            ))}
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

          <div className="chat-input-row">
            <input
              ref={inputRef}
              className="chat-input"
              placeholder="계약서 관련 질문을 입력하세요..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              disabled={loading}
            />
            <button
              className="chat-send-btn"
              onClick={send}
              disabled={loading || !input.trim()}
              aria-label="전송"
            >
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
