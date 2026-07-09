import { useState, useCallback } from 'react'

export interface AuthUser {
 id: number
 email: string
 username: string
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

export function useAuth() {
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

 const isLoggedIn = user !== null

 return { user, isLoggedIn, login, logout }
}
