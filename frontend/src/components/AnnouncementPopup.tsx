import { useEffect, useState } from 'react'

export interface PopupData {
  id: number
  title: string
  body: string
  image_url?: string | null
  link_url?: string | null
  button_text: string
  width: number
  height?: number | null
  position: string
  updated_at?: string | null
}

const DISMISS_KEY = 'cm_popup_dismissed_v2'
const CELLS = [
  'top-left', 'top', 'top-right',
  'left', 'center', 'right',
  'bottom-left', 'bottom', 'bottom-right',
]

type DismissMap = Record<string, { version: string; until: string }>

function readDismissed(): DismissMap {
  try { return JSON.parse(localStorage.getItem(DISMISS_KEY) || '{}') } catch { return {} }
}

function isDismissedToday(p: PopupData): boolean {
  const d = readDismissed()[String(p.id)]
  return !!d && d.version === (p.updated_at ?? '') && new Date(d.until) > new Date()
}

function dismissForToday(p: PopupData) {
  try {
    const until = new Date()
    until.setHours(23, 59, 59, 999)
    const d = readDismissed()
    d[String(p.id)] = { version: p.updated_at ?? '', until: until.toISOString() }
    localStorage.setItem(DISMISS_KEY, JSON.stringify(d))
  } catch {}
}

export function PopupCard({ popup, onClose, onHideToday }: {
  popup: PopupData
  onClose?: () => void
  onHideToday?: () => void
}) {
  return (
    <div className="popup-card" style={{ width: popup.width, height: popup.height || 'auto' }}>
      {popup.image_url && (
        popup.link_url ? (
          <a href={popup.link_url} target="_blank" rel="noreferrer">
            <img src={popup.image_url} alt={popup.title} className="popup-image" />
          </a>
        ) : (
          <img src={popup.image_url} alt={popup.title} className="popup-image" />
        )
      )}
      {(popup.title || popup.body || popup.link_url) && (
        <div className="popup-content">
          {popup.title && <h3 className="popup-title">{popup.title}</h3>}
          {popup.body && <p className="popup-body">{popup.body}</p>}
          {popup.link_url && (
            <a href={popup.link_url} target="_blank" rel="noreferrer" className="popup-cta">
              {popup.button_text}
            </a>
          )}
        </div>
      )}
      <div className="popup-footer">
        <button type="button" onClick={onHideToday} className="popup-footer-btn">오늘 하루 안 보기</button>
        <span className="popup-footer-divider" />
        <button type="button" onClick={onClose} className="popup-footer-btn">닫기</button>
      </div>
    </div>
  )
}

export function PopupLayer({ popups, onClose, onHideToday }: {
  popups: PopupData[]
  onClose: (p: PopupData) => void
  onHideToday: (p: PopupData) => void
}) {
  if (popups.length === 0) return null
  const cellOf = (pos: string) => (CELLS.includes(pos) ? pos : 'center')
  return (
    <div className="popup-layer">
      {CELLS.map((cell) => {
        const items = popups.filter((p) => cellOf(p.position) === cell)
        if (items.length === 0) return null
        return (
          <div key={cell} className={`popup-cell popup-cell-${cell}`}>
            {items.map((p) => (
              <PopupCard key={p.id} popup={p} onClose={() => onClose(p)} onHideToday={() => onHideToday(p)} />
            ))}
          </div>
        )
      })}
    </div>
  )
}

export default function AnnouncementPopup() {
  const [popups, setPopups] = useState<PopupData[]>([])

  useEffect(() => {
    fetch('/api/v1/popup')
      .then((res) => res.json())
      .then((data: PopupData[]) => {
        if (Array.isArray(data)) setPopups(data.filter((p) => !isDismissedToday(p)))
      })
      .catch(() => {})
  }, [])

  const remove = (p: PopupData) => setPopups((prev) => prev.filter((x) => x.id !== p.id))

  return (
    <PopupLayer
      popups={popups}
      onClose={remove}
      onHideToday={(p) => { dismissForToday(p); remove(p) }}
    />
  )
}
