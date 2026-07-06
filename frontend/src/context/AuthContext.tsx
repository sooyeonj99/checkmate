import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import { registerLogout } from '../utils/apiFetch'

export interface AuthUser {
  id: number
  email: string
  username: string
  user_type: 'personal' | 'enterprise'
}

interface AuthContextType {
  user: AuthUser | null
  isLoggedIn: boolean
  login: (token: string, userData: AuthUser) => void
  logout: () => void
}

const TOKEN_KEY = 'cm_token'
const USER_KEY = 'cm_user'
const EXPIRY_KEY = 'cm_token_expiry'

const TOKEN_LIFETIME_MS = 23 * 60 * 60 * 1000 // 23시간 (서버 24시간보다 1시간 일찍)

function readUser(): AuthUser | null {
  try {
    // 저장된 만료 시간이 지났으면 즉시 클리어
    const expiry = localStorage.getItem(EXPIRY_KEY)
    if (expiry && Date.now() > Number(expiry)) {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
      localStorage.removeItem(EXPIRY_KEY)
      return null
    }
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(readUser)

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    localStorage.removeItem(EXPIRY_KEY)
    setUser(null)
  }, [])

  const login = useCallback((token: string, userData: AuthUser) => {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USER_KEY, JSON.stringify(userData))
    localStorage.setItem(EXPIRY_KEY, String(Date.now() + TOKEN_LIFETIME_MS))
    setUser(userData)
  }, [])

  // apiFetch 모듈에 logout 함수 등록 (401 자동 로그아웃용)
  useEffect(() => {
    registerLogout(logout)
  }, [logout])

  // 앱이 포커스될 때마다 토큰 만료 여부 확인
  useEffect(() => {
    const checkExpiry = () => {
      const expiry = localStorage.getItem(EXPIRY_KEY)
      if (expiry && Date.now() > Number(expiry)) {
        logout()
        window.location.href = '/checkmate/auth?expired=1'
      }
    }
    window.addEventListener('focus', checkExpiry)
    // 1분마다 백그라운드 체크
    const interval = setInterval(checkExpiry, 60_000)
    return () => {
      window.removeEventListener('focus', checkExpiry)
      clearInterval(interval)
    }
  }, [logout])

  return (
    <AuthContext.Provider value={{ user, isLoggedIn: user !== null, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
