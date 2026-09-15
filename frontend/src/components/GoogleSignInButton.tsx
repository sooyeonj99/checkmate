import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useGoogleIdentityScript } from '../hooks/useGoogleIdentityScript'

/** 어디서든 넣을 수 있는 독립형 구글 로그인/가입 버튼. 클라이언트 ID 미설정 시 아무것도 렌더링하지 않는다. */
export default function GoogleSignInButton({ redirectTo = '/dashboard' }: { redirectTo?: string }) {
  const navigate = useNavigate()
  const { login } = useAuth()
  const googleClientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID as string | undefined
  const gisReady = useGoogleIdentityScript(!!googleClientId)
  const btnRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!gisReady || !googleClientId || !btnRef.current) return
    const w = window as any

    const handleCredential = async (response: { credential: string }) => {
      try {
        const res = await fetch('/api/v1/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credential: response.credential }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.detail ?? '구글 로그인에 실패했습니다.')
        login(data.access_token, data.user)
        navigate(redirectTo)
      } catch (e) {
        alert(e instanceof Error ? e.message : '구글 로그인 중 오류가 발생했습니다.')
      }
    }

    w.google.accounts.id.initialize({ client_id: googleClientId, callback: handleCredential })
    w.google.accounts.id.renderButton(btnRef.current, {
      type: 'standard', theme: 'outline', size: 'large', shape: 'pill',
      width: 320, text: 'continue_with', logo_alignment: 'left',
    })
  }, [gisReady, googleClientId, redirectTo, login, navigate])

  if (!googleClientId) return null
  return <div ref={btnRef} style={{ display: 'flex', justifyContent: 'center', minHeight: 40 }} />
}
