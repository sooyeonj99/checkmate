import { useCallback, useEffect, useState } from 'react'
import { PopupCard, PopupLayer, type PopupData } from './AnnouncementPopup'

interface PopupItem {
  id: number
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

type Draft = Omit<PopupItem, 'id'> & { id: number | null }

const EMPTY: Draft = {
  id: null, enabled: false, title: '', body: '', image_url: null, link_url: null,
  button_text: '자세히 보기', width: 420, height: null, position: 'center',
}

const EXAMPLES: Omit<Draft, 'id' | 'enabled'>[] = [
  {
    title: '오픈 기념 이벤트', body: 'RespectCheck 오픈을 기념해 모든 계약서 분석을 무료로 제공합니다.\n지금 바로 첫 계약서를 분석해 보세요.',
    image_url: null, link_url: '/', button_text: '지금 분석하기', width: 420, height: null, position: 'center',
  },
  {
    title: '서비스 점검 안내', body: '9월 30일 새벽 2시~4시 서비스 점검이 진행됩니다.\n이용에 참고해 주세요.',
    image_url: null, link_url: null, button_text: '자세히 보기', width: 360, height: null, position: 'top-right',
  },
]

const POSITIONS: { value: string; label: string }[] = [
  { value: 'top-left', label: '좌상단' }, { value: 'top', label: '상단' }, { value: 'top-right', label: '우상단' },
  { value: 'left', label: '좌측' }, { value: 'center', label: '중앙' }, { value: 'right', label: '우측' },
  { value: 'bottom-left', label: '좌하단' }, { value: 'bottom', label: '하단' }, { value: 'bottom-right', label: '우하단' },
]

const card = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 24px', marginBottom: 20 } as const
const input = { width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 14, boxSizing: 'border-box' } as const
const label = { fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 6, display: 'block' } as const
const btn = { padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13, fontWeight: 600, cursor: 'pointer' } as const

export default function PopupAdminTab({ token, showToast }: { token: string | null; showToast: (m: string) => void }) {
  const [list, setList] = useState<PopupItem[]>([])
  const [draft, setDraft] = useState<Draft | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [screenPreview, setScreenPreview] = useState<PopupData[] | null>(null)
  const auth = { Authorization: `Bearer ${token}` }

  const load = useCallback(async () => {
    const res = await fetch('/api/v1/admin/popups', { headers: auth })
    if (res.ok) setList(await res.json())
  }, [])

  useEffect(() => { load() }, [load])

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d))

  const toPreview = (d: Draft): PopupData => ({
    id: d.id ?? -1, title: d.title, body: d.body, image_url: d.image_url, link_url: d.link_url,
    button_text: d.button_text || '자세히 보기', width: d.width, height: d.height, position: d.position,
  })

  const save = async () => {
    if (!draft) return
    setSaving(true)
    const { id, ...rest } = draft
    const res = await fetch(id ? `/api/v1/admin/popups/${id}` : '/api/v1/admin/popups', {
      method: id ? 'PUT' : 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...rest, image_url: rest.image_url || null, link_url: rest.link_url || null, height: rest.height || null }),
    })
    setSaving(false)
    if (res.ok) {
      const saved: PopupItem = await res.json()
      setDraft({ ...saved })
      showToast('팝업이 저장되었습니다.')
      load()
    } else {
      showToast('저장에 실패했습니다.')
    }
  }

  const toggle = async (p: PopupItem) => {
    const { id, ...rest } = p
    await fetch(`/api/v1/admin/popups/${id}`, {
      method: 'PUT', headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...rest, enabled: !p.enabled }),
    })
    if (draft?.id === id) setDraft({ ...draft, enabled: !p.enabled })
    load()
  }

  const remove = async (p: PopupItem) => {
    if (!confirm(`"${p.title || '제목 없음'}" 팝업을 삭제할까요?`)) return
    await fetch(`/api/v1/admin/popups/${p.id}`, { method: 'DELETE', headers: auth })
    if (draft?.id === p.id) setDraft(null)
    showToast('팝업이 삭제되었습니다.')
    load()
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
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ flex: 1, fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>등록된 팝업 ({list.length})</div>
          <button style={{ ...btn, background: 'var(--accent)', color: '#fff', border: 'none' }} onClick={() => setDraft({ ...EMPTY })}>+ 새 팝업</button>
          {list.some((p) => p.enabled) && (
            <button style={{ ...btn, marginLeft: 8 }} onClick={() => setScreenPreview(list.filter((p) => p.enabled).map((p) => toPreview(p)))}>
              게시 중인 팝업 전체 미리보기
            </button>
          )}
        </div>
        {list.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 14, padding: '12px 0' }}>등록된 팝업이 없습니다. "새 팝업"을 눌러 만들어 보세요.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {list.map((p) => (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10,
                border: `1px solid ${draft?.id === p.id ? 'var(--accent)' : 'var(--border)'}`, background: 'var(--bg)',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title || '(제목 없음)'}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{POSITIONS.find((x) => x.value === p.position)?.label ?? p.position} · {p.width}px</div>
                </div>
                <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: p.enabled ? 'rgba(22,163,74,0.1)' : 'rgba(100,116,139,0.1)', color: p.enabled ? '#16a34a' : '#64748b' }}>
                  {p.enabled ? '게시 중' : '숨김'}
                </span>
                <button style={btn} onClick={() => toggle(p)}>{p.enabled ? '숨기기' : '게시'}</button>
                <button style={btn} onClick={() => setDraft({ ...p })}>편집</button>
                <button style={{ ...btn, color: '#dc2626', borderColor: 'rgba(239,68,68,0.3)' }} onClick={() => remove(p)}>삭제</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {draft && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20, alignItems: 'start' }}>
          <div>
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14, gap: 8, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{draft.id ? '팝업 편집' : '새 팝업'}</div>
                {EXAMPLES.map((ex, i) => (
                  <button key={i} type="button" style={btn} onClick={() => setDraft((d) => ({ ...(d as Draft), ...ex }))}>예시 {i + 1} 채우기</button>
                ))}
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 14 }}>
                <input type="checkbox" checked={draft.enabled} onChange={(e) => set('enabled', e.target.checked)} style={{ width: 18, height: 18 }} />
                홈페이지에 게시
              </label>
              <div style={{ marginBottom: 14 }}>
                <span style={label}>제목</span>
                <input style={input} value={draft.title} onChange={(e) => set('title', e.target.value)} maxLength={200} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <span style={label}>내용</span>
                <textarea style={{ ...input, minHeight: 100, resize: 'vertical' }} value={draft.body} onChange={(e) => set('body', e.target.value)} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <span style={label}>이미지 (jpg, png, webp, gif / 5MB 이하)</span>
                <input type="file" accept=".jpg,.jpeg,.png,.webp,.gif" disabled={uploading}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = '' }} />
                {uploading && <span style={{ marginLeft: 10, fontSize: 12, color: 'var(--text-muted)' }}>업로드 중...</span>}
                {draft.image_url && (
                  <button type="button" onClick={() => set('image_url', null)}
                    style={{ ...btn, marginTop: 8, display: 'block', color: '#dc2626', borderColor: 'rgba(239,68,68,0.3)' }}>이미지 제거</button>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 14 }}>
                <div>
                  <span style={label}>링크 URL (선택)</span>
                  <input style={input} value={draft.link_url ?? ''} onChange={(e) => set('link_url', e.target.value)} placeholder="https://..." />
                </div>
                <div>
                  <span style={label}>버튼 문구</span>
                  <input style={input} value={draft.button_text} onChange={(e) => set('button_text', e.target.value)} maxLength={50} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14 }}>
                <div>
                  <span style={label}>가로 (px)</span>
                  <input type="number" min={200} max={1000} style={input} value={draft.width} onChange={(e) => set('width', Number(e.target.value) || 420)} />
                </div>
                <div>
                  <span style={label}>세로 (px, 비우면 자동)</span>
                  <input type="number" min={100} max={1000} style={input} value={draft.height ?? ''} onChange={(e) => set('height', e.target.value ? Number(e.target.value) : null)} />
                </div>
              </div>
              <div style={{ marginTop: 14 }}>
                <span style={label}>위치</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, maxWidth: 300 }}>
                  {POSITIONS.map((p) => (
                    <button key={p.value} type="button" onClick={() => set('position', p.value)} style={{
                      ...btn, padding: '10px 4px',
                      background: draft.position === p.value ? 'var(--accent)' : 'var(--bg)',
                      color: draft.position === p.value ? '#fff' : 'var(--text)',
                    }}>{p.label}</button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={save} disabled={saving}
                style={{ padding: '12px 32px', borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
                {saving ? '저장 중...' : '저장'}
              </button>
              <button style={{ ...btn, padding: '12px 20px' }} onClick={() => setScreenPreview([toPreview(draft)])}>실제 화면 위치로 미리보기</button>
              <button style={{ ...btn, padding: '12px 20px' }} onClick={() => setDraft(null)}>닫기</button>
            </div>
          </div>

          <div style={{ ...card, background: 'var(--bg)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 12 }}>미리보기 (실시간)</div>
            <div style={{ overflowX: 'auto', display: 'flex', justifyContent: 'center' }}>
              <PopupCard popup={toPreview(draft)} />
            </div>
          </div>
        </div>
      )}

      {screenPreview && (
        <>
          <PopupLayer popups={screenPreview} onClose={() => setScreenPreview(null)} onHideToday={() => setScreenPreview(null)} />
          <div style={{ position: 'fixed', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 10001, background: '#1e293b', color: '#fff', padding: '8px 18px', borderRadius: 20, fontSize: 13, fontWeight: 600 }}>
            미리보기 화면입니다 — "닫기"를 누르면 종료됩니다
          </div>
        </>
      )}
    </div>
  )
}
