import React, { createContext, useContext, useState, useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

interface User {
  id: number
  email: string
  username: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (token: string, user: User) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const restore = async () => {
      try {
        const [storedToken, storedUser] = await Promise.all([
          AsyncStorage.getItem('cm_token'),
          AsyncStorage.getItem('cm_user'),
        ])
        if (storedToken && storedUser) {
          setToken(storedToken)
          setUser(JSON.parse(storedUser))
        }
      } catch {}
      setIsLoading(false)
    }
    restore()
  }, [])

  const login = async (t: string, u: User) => {
    await Promise.all([
      AsyncStorage.setItem('cm_token', t),
      AsyncStorage.setItem('cm_user', JSON.stringify(u)),
    ])
    setToken(t)
    setUser(u)
  }

  const logout = async () => {
    await Promise.all([
      AsyncStorage.removeItem('cm_token'),
      AsyncStorage.removeItem('cm_user'),
    ])
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
