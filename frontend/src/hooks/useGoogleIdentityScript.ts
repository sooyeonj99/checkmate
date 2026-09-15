import { useEffect, useState } from 'react'

/** Google Identity Services(구글 로그인) 스크립트를 필요할 때만 동적으로 로드한다. */
export function useGoogleIdentityScript(enabled: boolean): boolean {
  const [ready, setReady] = useState(() => !!(window as any).google?.accounts?.id)

  useEffect(() => {
    if (!enabled || ready) return
    const existing = document.getElementById('google-identity-script') as HTMLScriptElement | null
    if (existing) {
      if ((window as any).google?.accounts?.id) { setReady(true); return }
      existing.addEventListener('load', () => setReady(true))
      return
    }
    const script = document.createElement('script')
    script.id = 'google-identity-script'
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => setReady(true)
    document.head.appendChild(script)
  }, [enabled, ready])

  return ready
}
