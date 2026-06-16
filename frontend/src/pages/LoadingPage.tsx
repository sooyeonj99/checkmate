import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'

/* ── Step definitions ──────────────────────────────── */
interface Step {
  label: string
  sub: string
  targetProgress: number
  duration: number // ms until next step
}

const STEPS: Step[] = [
  {
    label: '업로드 완료',
    sub: '파일을 성공적으로 수신했습니다',
    targetProgress: 18,
    duration: 1800,
  },
  {
    label: '텍스트 추출 중',
    sub: 'OCR 엔진이 계약서 내용을 읽고 있습니다',
    targetProgress: 45,
    duration: 2600,
  },
  {
    label: '위험 조항 분석 중',
    sub: 'AI가 각 조항의 위험도를 판단하고 있습니다',
    targetProgress: 78,
    duration: 3200,
  },
  {
    label: '리포트 생성 중',
    sub: '수정 제안과 위험도 점수를 정리하고 있습니다',
    targetProgress: 97,
    duration: 2000,
  },
]

const RING_R = 108
const CIRCUMFERENCE = 2 * Math.PI * RING_R // ≈ 678.6

/* ── Smooth progress animation hook ───────────────── */
function useSmoothProgress(target: number, duration: number): number {
  const [value, setValue] = useState(0)
  const rafRef = useRef<number | null>(null)
  const startRef = useRef<number | null>(null)
  const fromRef = useRef(0)

  useEffect(() => {
    fromRef.current = value
    startRef.current = null

    const animate = (now: number) => {
      if (!startRef.current) startRef.current = now
      const elapsed = now - startRef.current
      const t = Math.min(elapsed / duration, 1)
      // ease-out-cubic
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(fromRef.current + (target - fromRef.current) * eased)
      if (t < 1) {
        rafRef.current = requestAnimationFrame(animate)
      }
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target])

  return value
}

/* ── Countdown hook ────────────────────────────────── */
function useCountdown(from: number) {
  const [seconds, setSeconds] = useState(from)

  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => Math.max(s - 1, 0)), 1000)
    return () => clearInterval(id)
  }, [])

  return seconds
}

/* ── Components ────────────────────────────────────── */
function Logo() {
  return (
    <Link to="/" className="loading-logo">
      <div className="loading-logo-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2L3 7V12C3 16.97 6.84 21.61 12 23C17.16 21.61 21 16.97 21 12V7L12 2Z"
            fill="white"
            fillOpacity="0.95"
          />
          <path
            d="M9 12L11 14L15 10"
            stroke="#060d1f"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <span className="loading-logo-text gradient-text">CHECKMATE</span>
    </Link>
  )
}

interface RingProps {
  progress: number
}

function ProgressRing({ progress }: RingProps) {
  const offset = CIRCUMFERENCE * (1 - progress / 100)

  return (
    <div className="loading-ring-container">
      {/* Outer dashed rotating ring */}
      <svg
        className="loading-ring-outer"
        viewBox="0 0 292 292"
        style={{ position: 'absolute', inset: -16, width: '100%', height: '100%' }}
      >
        <circle
          cx="146" cy="146" r="138"
          fill="none"
          stroke="rgba(79,142,247,0.18)"
          strokeWidth="1"
          strokeDasharray="3 10"
        />
      </svg>

      {/* Inner counter-rotating ring */}
      <svg
        className="loading-ring-outer-rev"
        viewBox="0 0 272 272"
        style={{ position: 'absolute', inset: -6, width: '100%', height: '100%' }}
      >
        <circle
          cx="136" cy="136" r="128"
          fill="none"
          stroke="rgba(79,142,247,0.1)"
          strokeWidth="1"
          strokeDasharray="2 16"
        />
      </svg>

      {/* Main SVG */}
      <svg viewBox="0 0 260 260" width="260" height="260" style={{ display: 'block' }}>
        <defs>
          <linearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4f8ef7" />
            <stop offset="100%" stopColor="#06c3ff" />
          </linearGradient>
          <filter id="arc-glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* Track */}
        <circle
          cx="130" cy="130" r={RING_R}
          fill="none"
          stroke="rgba(255,255,255,0.04)"
          strokeWidth="10"
        />

        {/* Subtle inner fill glow */}
        <circle
          cx="130" cy="130" r={RING_R - 6}
          fill="none"
          stroke="rgba(79,142,247,0.06)"
          strokeWidth="1"
        />

        {/* Progress arc */}
        <circle
          cx="130" cy="130" r={RING_R}
          fill="none"
          stroke="url(#arcGrad)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          transform="rotate(-90 130 130)"
          filter="url(#arc-glow)"
          style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.4,0,0.2,1)' }}
        />

        {/* Arc end dot */}
        {progress > 2 && (
          <circle
            cx={130 + RING_R * Math.cos((progress / 100 * 360 - 90) * (Math.PI / 180))}
            cy={130 + RING_R * Math.sin((progress / 100 * 360 - 90) * (Math.PI / 180))}
            r="6"
            fill="#06c3ff"
            style={{ filter: 'drop-shadow(0 0 6px #06c3ff)' }}
          />
        )}
      </svg>

      {/* Orbiting dots */}
      <div className="loading-orbit-dot" />
      <div className="loading-orbit-dot" />
      <div className="loading-orbit-dot" />

      {/* Center glow */}
      <div className="loading-center-glow" />

      {/* Center content */}
      <div className="loading-center-content">
        <div className="loading-center-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2L3 7V12C3 16.97 6.84 21.61 12 23C17.16 21.61 21 16.97 21 12V7L12 2Z"
              fill="white" fillOpacity="0.95"
            />
            <path d="M9 12L11 14L15 10" stroke="#060d1f" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div className="loading-center-pct">{Math.round(progress)}%</div>
        <div className="loading-center-label">분석 진행</div>
      </div>
    </div>
  )
}

interface StepsRowProps {
  currentStep: number
}

function StepsRow({ currentStep }: StepsRowProps) {
  return (
    <div className="loading-steps-row">
      {STEPS.map((step, i) => {
        const done   = i < currentStep
        const active = i === currentStep
        return (
          <div key={step.label} className="loading-step-item">
            <div
              className={`loading-step-dot ${done ? 'done' : active ? 'active' : ''}`}
              title={step.label}
            >
              {done ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                i + 1
              )}
            </div>
            {i < STEPS.length - 1 && (
              <div className={`loading-step-connector ${done ? 'done' : ''}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

interface MsgAreaProps {
  step: Step
  stepIndex: number
  msgKey: number
}

function MsgArea({ step, stepIndex, msgKey }: MsgAreaProps) {
  const isLast = stepIndex === STEPS.length - 1
  const isFirst = stepIndex === 0

  return (
    <div className="loading-msg-area">
      <div key={`title-${msgKey}`} className="loading-msg-title">
        {isFirst ? (
          <>
            <span style={{ color: 'var(--risk-safe)', marginRight: 8 }}>✓</span>
            {step.label}
          </>
        ) : (
          <>
            {step.label}
            {!isLast && (
              <span className="typing-dots" style={{ marginLeft: 6 }}>
                <span /><span /><span />
              </span>
            )}
          </>
        )}
      </div>
      <div key={`sub-${msgKey}`} className="loading-msg-sub">{step.sub}</div>
    </div>
  )
}

/* ── Page ──────────────────────────────────────────── */
export default function LoadingPage() {
  const navigate = useNavigate()
  const [stepIndex, setStepIndex] = useState(0)
  const [msgKey, setMsgKey] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const countdown = useCountdown(30)

  const currentStep = STEPS[stepIndex]
  const smoothProgress = useSmoothProgress(currentStep.targetProgress, 800)

  // Advance through steps
  const scheduleNext = useCallback((idx: number) => {
    const step = STEPS[idx]
    const timerId = setTimeout(() => {
      const next = idx + 1
      if (next < STEPS.length) {
        setStepIndex(next)
        setMsgKey((k) => k + 1)
        scheduleNext(next)
      } else {
        // All steps done → navigate to result
        setTimeout(() => navigate('/result'), 800)
      }
    }, step.duration)
    return timerId
  }, [navigate])

  useEffect(() => {
    const timerId = scheduleNext(0)
    return () => clearTimeout(timerId)
  }, [scheduleNext])

  // Elapsed counter
  useEffect(() => {
    const id = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="loading-page">
      <div className="loading-bg-grid" />
      <div className="loading-bg-glow" />

      {/* Logo */}
      <Logo />

      {/* Ring */}
      <ProgressRing progress={smoothProgress} />

      {/* Step dots */}
      <StepsRow currentStep={stepIndex} />

      {/* Message */}
      <MsgArea step={currentStep} stepIndex={stepIndex} msgKey={msgKey} />

      {/* Time info */}
      <div className="loading-time-box">
        <div className="loading-time-item">
          <div className="loading-time-value gradient-text">{elapsed}s</div>
          <div className="loading-time-label">경과 시간</div>
        </div>
        <div className="loading-time-divider" />
        <div className="loading-time-item">
          <div className="loading-time-value" style={{ color: 'var(--text-secondary)' }}>
            {countdown > 0 ? `약 ${countdown}초` : '완료 중...'}
          </div>
          <div className="loading-time-label">예상 잔여 시간</div>
        </div>
        <div className="loading-time-divider" />
        <div className="loading-time-item">
          <div className="loading-time-value" style={{ color: 'var(--risk-safe)' }}>
            {stepIndex + 1}/{STEPS.length}
          </div>
          <div className="loading-time-label">현재 단계</div>
        </div>
      </div>

      {/* Privacy */}
      <div className="loading-privacy">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0110 0v4"/>
        </svg>
        분석이 완료되면 업로드된 파일은 서버에서 즉시 삭제됩니다
      </div>
    </div>
  )
}
