import { useState, useRef, useEffect } from 'react'

function ChatLogo({ size = 24 }: { size?: number }) {
  return (
    <div className="chat-avatar-logo" style={{ width: size, height: size }}>
      <svg width={size * 0.56} height={size * 0.56} viewBox="0 0 24 24" fill="none">
        <path d="M12 2L3 7V12C3 16.97 6.84 21.61 12 23C17.16 21.61 21 16.97 21 12V7L12 2Z" fill="white" fillOpacity="0.9"/>
        <path d="M9 12L11 14L15 10" stroke="#1e3a8a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
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
            <ChatLogo size={28} />
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
        {open ? '✕' : '💬'}
      </button>
    </>
  )
}
