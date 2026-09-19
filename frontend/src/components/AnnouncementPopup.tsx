import { useEffect, useState, type CSSProperties } from 'react'

interface PopupData {
  enabled: boolean
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

const DISMISS_KEY = 'cm_popup_dismissed'

function isDismissedToday(version: string | null | undefined): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY)
    if (!raw) return false
    const parsed = JSON.parse(raw) as { version: string; until: string }
    if (parsed.version !== (version ?? '')) return false
    return new Date(parsed.until) > new Date()
  } catch {
    return false
  }
}

function dismissForToday(version: string | null | undefined) {
  try {
    const until = new Date()
    until.setHours(23, 59, 59, 999)
    localStorage.setItem(DISMISS_KEY, JSON.stringify({ version: version ?? '', until: until.toISOString() }))
  } catch {}
}

export default function AnnouncementPopup() {
  const [popup, setPopup] = useState<PopupData | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    fetch('/api/v1/popup')
      .then((res) => res.json())
      .then((data: PopupData) => {
        if (!data.enabled) return
        if (isDismissedToday(data.updated_at)) return
        setPopup(data)
        setVisible(true)
      })
      .catch(() => {})
  }, [])

  if (!visible || !popup) return null

  const close = () => setVisible(false)
  const hideToday = () => { dismissForToday(popup.updated_at); setVisible(false) }

  const overlayStyle: CSSProperties =
    popup.position === 'top' ? { alignItems: 'flex-start', paddingTop: 60 } :
    popup.position === 'bottom' ? { alignItems: 'flex-end', paddingBottom: 40 } :
    { alignItems: 'center' }

  return (
    <div className="popup-overlay" style={overlayStyle} onClick={close}>
      <div
        className="popup-card"
        style={{ width: popup.width, height: popup.height || 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        {popup.image_url && (
          popup.link_url ? (
            <a href={popup.link_url} target="_blank" rel="noreferrer">
              <img src={popup.image_url} alt={popup.title} className="popup-image" />
            </a>
          ) : (
            <img src={popup.image_url} alt={popup.title} className="popup-image" />
          )
        )}
        {(popup.title || popup.body) && (
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
          <button type="button" onClick={hideToday} className="popup-footer-btn">오늘 하루 안 보기</button>
          <span className="popup-footer-divider" />
          <button type="button" onClick={close} className="popup-footer-btn">닫기</button>
        </div>
      </div>
    </div>
  )
}
