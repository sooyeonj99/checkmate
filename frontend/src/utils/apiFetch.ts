// 모든 인증 API 호출에 사용. 401 응답 시 자동 로그아웃 + 로그인 이동.
let _logoutFn: (() => void) | null = null

export function registerLogout(fn: () => void) {
  _logoutFn = fn
}

export async function apiFetch(input: RequestInfo, init: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem('cm_token')
  const headers = new Headers(init.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const res = await fetch(input, { ...init, headers })

  if (res.status === 401) {
    _logoutFn?.()
    const redirect = encodeURIComponent(window.location.pathname + window.location.search)
    window.location.href = `/checkmate/auth?reason=token&redirect=${redirect}`
  }

  return res
}
