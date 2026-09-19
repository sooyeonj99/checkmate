import { useEffect, useState } from 'react'

interface PopupForm {
  enabled: boolean
  title: string
  body: string
  image_url: string | null
  link_url: string | null
  button_text: string
  width: number
  height: number | null
  position: string
}

const EMPTY: PopupForm = {
  enabled: false, title: '', body: '', image_url: null, link_url: null,
  button_text: '자세히 보기', width: 420, height: null, position: 'center',
}

const card = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 24px', marginBottom: 20 } as const
const input = { width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 14, boxSizing: 'border-box' } as const
const label = { fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 6, display: 'block' } as const

export default function PopupAdminTab({ token, showToast }: { token: string | null; showToast: (m: string) => void }) {
  const [form, setForm] = useState<PopupForm>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const auth = { Authorization: `Bearer ${token}` }

  useEffect(() => {
    fetch('/api/v1/admin/popup', { headers: auth })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setForm({ ...EMPTY, ...d }) })
      .catch(() => {})
  }, [])

  const set = <K extends keyof PopupForm>(k: K, v: PopupForm[K]) => setForm((f) => ({ ...f, [k]: v }))

  const save = async () => {
    setSaving(true)
    const res = await fetch('/api/v1/admin/popup', {
      method: 'PUT',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        image_url: form.image_url || null,
        link_url: form.link_url || null,
        height: form.height || null,
      }),
    })
    setSaving(false)
    showToast(res.ok ? '팝업 설정이 저장되었습니다.' : '저장에 실패했습니다.')
  }

  const upload = async (file: File) => {
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/v1/admin/popup/image', { method: 'POST', headers: auth, body: fd })
    setUploading(false)
    if (res.ok) {
      const { url } = await res.json()
      set('image_url', url)
      showToast('이미지가 업로드되었습니다. 저장을 눌러 적용하세요.')
    } else {
      const err = await res.json().catch(() => null)
      showToast(err?.detail || '업로드에 실패했습니다.')
    }
  }

  return (
    <div>
      <div style={card}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>
          <input type="checkbox" checked={form.enabled} onChange={(e) => set('enabled', e.target.checked)} style={{ width: 18, height: 18 }} />
          홈페이지에 팝업 표시
        </label>
      </div>

      <div style={card}>
        <div style={{ marginBottom: 14 }}>
          <span style={label}>제목</span>
          <input style={input} value={form.title} onChange={(e) => set('title', e.target.value)} maxLength={200} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <span style={label}>내용</span>
          <textarea style={{ ...input, minHeight: 110, resize: 'vertical' }} value={form.body} onChange={(e) => set('body', e.target.value)} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <span style={label}>이미지 (jpg, png, webp, gif / 5MB 이하)</span>
          <input type="file" accept=".jpg,.jpeg,.png,.webp,.gif" disabled={uploading}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f) }} />
          {uploading && <span style={{ marginLeft: 10, fontSize: 12, color: 'var(--text-muted)' }}>업로드 중...</span>}
          {form.image_url && (
            <div style={{ marginTop: 10 }}>
              <img src={form.image_url} alt="미리보기" style={{ maxWidth: 240, borderRadius: 10, border: '1px solid var(--border)', display: 'block' }} />
              <button type="button" onClick={() => set('image_url', null)}
                style={{ marginTop: 8, padding: '5px 12px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.06)', color: '#dc2626', fontSize: 12, cursor: 'pointer' }}>
                이미지 제거
              </button>
            </div>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          <div>
            <span style={label}>링크 URL (선택)</span>
            <input style={input} value={form.link_url ?? ''} onChange={(e) => set('link_url', e.target.value)} placeholder="https://..." />
          </div>
          <div>
            <span style={label}>버튼 문구</span>
            <input style={input} value={form.button_text} onChange={(e) => set('button_text', e.target.value)} maxLength={50} />
          </div>
        </div>
      </div>

      <div style={card}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
          <div>
            <span style={label}>가로 크기 (px)</span>
            <input type="number" min={200} max={1000} style={input} value={form.width} onChange={(e) => set('width', Number(e.target.value) || 420)} />
          </div>
          <div>
            <span style={label}>세로 크기 (px, 비우면 자동)</span>
            <input type="number" min={100} max={1000} style={input} value={form.height ?? ''} onChange={(e) => set('height', e.target.value ? Number(e.target.value) : null)} />
          </div>
          <div>
            <span style={label}>위치</span>
            <select style={input} value={form.position} onChange={(e) => set('position', e.target.value)}>
              <option value="top">상단</option>
              <option value="center">중앙</option>
              <option value="bottom">하단</option>
            </select>
          </div>
        </div>
      </div>

      <button onClick={save} disabled={saving}
        style={{ padding: '12px 32px', borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
        {saving ? '저장 중...' : '저장'}
      </button>
    </div>
  )
}
