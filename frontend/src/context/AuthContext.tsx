import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

export interface AuthUser {
  id: number
  email: string
  username: string
}

interface AuthContextType {
  user: AuthUser | null
  isLoggedIn: boolean
  login: (token: string, userData: AuthUser) => void
  logout: () => void
}

const TOKEN_KEY = 'cm_token'
const USER_KEY = 'cm_user'

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

  const login = useCallback((token: string, userData: AuthUser) => {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USER_KEY, JSON.stringify(userData))
    setUser(userData)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setUser(null)
  }, [])

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
