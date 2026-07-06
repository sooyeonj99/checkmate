import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react'
import { registerLogout } from '../utils/apiFetch'

export interface AuthUser {
  id: number
  email: string
  username: string
  user_type: 'personal' | 'enterprise' | 'franchisor' | 'franchisee'
}

interface AuthContextType {
  user: AuthUser | null
  isLoggedIn: boolean
  secondsLeft: number   // 자동 로그아웃까지 남은 초 (웹 전용)
  login: (token: string, userData: AuthUser) => void
  logout: () => void
}

const TOKEN_KEY = 'cm_token'
const USER_KEY  = 'cm_user'

const INACTIVITY_MS = 30 * 60 * 1000   // 30분 미사용 시 자동 로그아웃

function readUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(readUser)
  const [secondsLeft, setSecondsLeft] = useState(INACTIVITY_MS / 1000)
  const lastActivityRef = useRef(Date.now())

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setUser(null)
    setSecondsLeft(INACTIVITY_MS / 1000)
  }, [])

  const login = useCallback((token: string, userData: AuthUser) => {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USER_KEY, JSON.stringify(userData))
    lastActivityRef.current = Date.now()
    setSecondsLeft(INACTIVITY_MS / 1000)
    setUser(userData)
  }, [])

  // apiFetch 모듈에 logout 등록 (401 자동 처리용)
  useEffect(() => {
    registerLogout(logout)
  }, [logout])

  // 활동 감지 → 타이머 리셋
  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now()
  }, [])

  useEffect(() => {
    if (!user) return
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click']
    events.forEach(e => window.addEventListener(e, resetActivity, { passive: true }))
    return () => events.forEach(e => window.removeEventListener(e, resetActivity))
  }, [user, resetActivity])

  // 1초마다 남은 시간 계산 + 만료 시 로그아웃
  useEffect(() => {
    if (!user) return
    const tick = setInterval(() => {
      const remaining = Math.max(0, INACTIVITY_MS - (Date.now() - lastActivityRef.current))
      const secs = Math.floor(remaining / 1000)
      setSecondsLeft(secs)
      if (secs === 0) {
        logout()
        window.location.href = '/checkmate/auth?reason=idle'
      }
    }, 1000)
    return () => clearInterval(tick)
  }, [user, logout])

  return (
    <AuthContext.Provider value={{ user, isLoggedIn: user !== null, secondsLeft, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
