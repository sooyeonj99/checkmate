import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import api from '../services/api'

interface PiiEntity {
  id: number
  type: string
  label: string
  start: number
  end: number
  original: string
}

interface CustomMask {
  start: number
  end: number
  label: string
}

interface MissingField {
  id: number
  label: string
  hint: string
}

const TYPE_COLOR: Record<string, string> = {
  KR_PHONE:        '#ef4444',
  EMAIL:           '#f97316',
  KR_RESIDENT_ID:  '#dc2626',
  KR_BANK_ACCOUNT: '#e11d48',
  KR_BUSINESS_REG: '#7c3aed',
  KR_ADDRESS:      '#2563eb',
  PERSON:          '#059669',
  ORGANIZATION:    '#0891b2',
  LOCATION:        '#0284c7',
  CREDIT_CARD:     '#db2777',
  IP_ADDRESS:      '#6b7280',
  KR_ALIEN_ID:     '#b91c1c',
  KR_CORP_REG:     '#9333ea',
  KR_DRIVER_LIC:   '#ca8a04',
  KR_PASSPORT:     '#b45309',
  KR_VEHICLE:      '#15803d',
  CUSTOM:          '#7c3aed',
}

function getColor(type: string) {
  return TYPE_COLOR[type] ?? '#64748b'
}

/* ── 텍스트 하이라이트 + 직접 선택 마스킹 ── */
function HighlightedText({
  text,
  entities,
  checkedIds,
  onToggle,
  onAddCustom,
}: {
  text: string
  entities: PiiEntity[]
  checkedIds: Set<number>
  onToggle: (id: number) => void
  onAddCustom: (start: number, end: number, selectedText: string) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [popup, setPopup] = useState<{ x: number; y: number; start: number; end: number; text: string } | null>(null)

  const sorted = [...entities].sort((a, b) => a.start - b.start)
  const segments: { text: string; entity?: PiiEntity; charStart: number }[] = []
  let cursor = 0

  for (const e of sorted) {
    if (e.start > cursor) {
      segments.push({ text: text.slice(cursor, e.start), charStart: cursor })
    }
    segments.push({ text: text.slice(e.start, e.end), entity: e, charStart: e.start })
    cursor = e.end
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), charStart: cursor })

  /* DOM selection → char position 변환 */
  const findCharPos = useCallback((node: Node, offset: number): number => {
    let el: Element | null =
      node.nodeType === Node.TEXT_NODE ? (node as Text).parentElement : (node as Element)
    while (el && !el.hasAttribute('data-cs')) {
      el = el.parentElement
    }
    if (!el) return 0
    return parseInt(el.getAttribute('data-cs') || '0') + offset
  }, [])

  const handleMouseUp = useCallback(() => {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed) { setPopup(null); return }
    const selectedText = sel.toString()
    if (!selectedText.trim()) { setPopup(null); return }
    if (!containerRef.current?.contains(sel.anchorNode)) { setPopup(null); return }

    try {
      const range = sel.getRangeAt(0)
      let startChar = findCharPos(range.startContainer, range.startOffset)
      let endChar = findCharPos(range.endContainer, range.endOffset)
      if (startChar > endChar) [startChar, endChar] = [endChar, startChar]
      if (endChar <= startChar) { setPopup(null); return }

      /* 기존 엔티티와 겹치면 불가 */
      const overlaps = entities.some(e => !(endChar <= e.start || startChar >= e.end))
      if (overlaps) { setPopup(null); return }

      const rect = range.getBoundingClientRect()
      setPopup({
        x: rect.left + rect.width / 2,
        y: rect.bottom + 8,
        start: startChar,
        end: endChar,
        text: selectedText,
      })
    } catch {
      setPopup(null)
    }
  }, [entities, findCharPos])

  /* 팝업 외부 클릭 시 닫기 */
  useEffect(() => {
    const handler = () => setPopup(null)
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleAddMask = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!popup) return
    onAddCustom(popup.start, popup.end, popup.text)
    setPopup(null)
    window.getSelection()?.removeAllRanges()
  }

  return (
    <>
      <div
        ref={containerRef}
        onMouseUp={handleMouseUp}
        style={{
          fontFamily: 'monospace', fontSize: 13, lineHeight: 1.8,
          color: 'var(--text)', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
          userSelect: 'text',
        }}
      >
        {segments.map((seg, i) => {
          if (!seg.entity) {
            return (
              <span key={i} data-cs={seg.charStart}>
                {seg.text}
              </span>
            )
          }
          const e = seg.entity
          const checked = checkedIds.has(e.id)
          const color = getColor(e.type)
          const isCustom = e.type === 'CUSTOM'
          return (
            <span
              key={i}
              data-cs={seg.charStart}
              title={`${e.label}${isCustom ? ' (직접 선택)' : ''} — 클릭하여 마스킹 ${checked ? '해제' : '선택'}`}
              onClick={() => onToggle(e.id)}
              style={{
                background: checked ? `${color}28` : 'rgba(100,116,139,0.12)',
                border: `1.5px ${checked ? 'solid' : 'dashed'} ${checked ? color : '#64748b'}`,
                borderRadius: 4,
                padding: '0 3px',
                cursor: 'pointer',
                color: checked ? color : 'var(--text-muted)',
                fontWeight: checked ? 700 : 400,
                textDecoration: checked ? 'none' : 'line-through',
                transition: 'all 0.15s',
                display: 'inline',
              }}
            >
              {seg.text}
            </span>
          )
        })}
      </div>

      {/* 선택 마스킹 팝업 */}
      {popup && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            left: popup.x,
            top: popup.y,
            transform: 'translateX(-50%)',
            zIndex: 9999,
            background: '#1e3a8a',
            color: '#fff',
            borderRadius: 10,
            padding: '8px 14px',
            fontSize: 13,
            fontWeight: 600,
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ opacity: 0.8, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            "{popup.text.length > 20 ? popup.text.slice(0, 20) + '…' : popup.text}"
          </span>
          <button
            onClick={handleAddMask}
            style={{
              background: '#fff', color: '#1e3a8a',
              border: 'none', borderRadius: 6,
              padding: '4px 10px', fontWeight: 700,
              fontSize: 12, cursor: 'pointer',
            }}
          >
            + 마스킹 추가
          </button>
        </div>
      )}
    </>
  )
}

/* ── 엔티티 목록 패널 ── */
function EntityList({
  entities,
  checkedIds,
  onToggle,
  onCheckAll,
  onUncheckAll,
  onRemoveCustom,
}: {
  entities: PiiEntity[]
  checkedIds: Set<number>
  onToggle: (id: number) => void
  onCheckAll: () => void
  onUncheckAll: () => void
  onRemoveCustom: (id: number) => void
}) {
  if (entities.length === 0) {
    return (
      <div style={{
        padding: '32px 20px', textAlign: 'center',
        background: 'var(--bg-card)', borderRadius: 14,
        border: '1px solid var(--border)',
      }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
        <p style={{ color: 'var(--text)', fontWeight: 700, marginBottom: 6 }}>
          개인정보가 감지되지 않았습니다
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          텍스트를 드래그해서 직접 마스킹할 부분을 선택하세요
        </p>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          {checkedIds.size}/{entities.length}개 마스킹 선택됨
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={onCheckAll} style={{
            fontSize: 11, padding: '4px 10px', borderRadius: 8,
            border: '1px solid var(--border)', background: 'var(--bg)',
            color: 'var(--text)', cursor: 'pointer',
          }}>전체 선택</button>
          <button onClick={onUncheckAll} style={{
            fontSize: 11, padding: '4px 10px', borderRadius: 8,
            border: '1px solid var(--border)', background: 'var(--bg)',
            color: 'var(--text)', cursor: 'pointer',
          }}>전체 해제</button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {entities.map(e => {
          const checked = checkedIds.has(e.id)
          const color = getColor(e.type)
          const isCustom = e.type === 'CUSTOM'
          return (
            <div
              key={e.id}
              onClick={() => onToggle(e.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px',
                background: checked ? `${color}10` : 'var(--bg-card)',
                border: `1px solid ${checked ? color + '40' : 'var(--border)'}`,
                borderRadius: 10, cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <div style={{
                width: 18, height: 18, borderRadius: 4,
                border: `2px solid ${checked ? color : 'var(--border)'}`,
                background: checked ? color : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                {checked && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '1px 7px',
                    borderRadius: 10, background: `${color}20`, color,
                  }}>{e.label}</span>
                  <span style={{
                    fontSize: 13, color: 'var(--text)',
                    fontWeight: 500, overflow: 'hidden',
                    textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{e.original}</span>
                </div>
              </div>
              {isCustom && (
                <button
                  onClick={(ev) => { ev.stopPropagation(); onRemoveCustom(e.id) }}
                  title="삭제"
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-muted)', fontSize: 16, lineHeight: 1,
                    padding: '0 2px', flexShrink: 0,
                  }}
                >×</button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Page ── */
export default function MaskingPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { contractId, filename, contractType } = (location.state as any) || {}

  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [entities, setEntities] = useState<PiiEntity[]>([])
  const [customEntities, setCustomEntities] = useState<PiiEntity[]>([])
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set())
  const [imageOnly, setImageOnly] = useState(false)
  const [fromOcr, setFromOcr] = useState(false)
  const [error, setError] = useState('')
  const nextCustomId = useRef(-1)
  const [missingFields, setMissingFields] = useState<MissingField[]>([])
  const [filledValues, setFilledValues] = useState<Record<number, string>>({})

  const isImageFile = /\.(jpg|jpeg|png)$/i.test(filename || '')

  useEffect(() => {
    if (!contractId) { navigate('/upload'); return }

    api.get(`/contracts/${contractId}/preview`)
      .then(({ data }) => {
        setImageOnly(data.image_only)
        setFromOcr(data.from_ocr ?? false)
        setText(data.text ?? '')
        setEntities(data.entities ?? [])
        setCheckedIds(new Set((data.entities ?? []).map((e: PiiEntity) => e.id)))
        if (data.missing_fields && data.missing_fields.length > 0) {
          setMissingFields(data.missing_fields)
        }
      })
      .catch(() => setError('미리보기를 불러오지 못했습니다. 바로 분석을 진행합니다.'))
      .finally(() => setLoading(false))
  }, [contractId, navigate])

  const toggle = useCallback((id: number) => {
    setCheckedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const handleAddCustom = useCallback((start: number, end: number, selectedText: string) => {
    const id = nextCustomId.current--
    const newEntity: PiiEntity = {
      id,
      type: 'CUSTOM',
      label: '<직접선택>',
      start,
      end,
      original: selectedText.length > 30 ? selectedText.slice(0, 30) + '…' : selectedText,
    }
    setCustomEntities(prev => [...prev, newEntity])
    setCheckedIds(prev => new Set([...prev, id]))
  }, [])

  const handleRemoveCustom = useCallback((id: number) => {
    setCustomEntities(prev => prev.filter(e => e.id !== id))
    setCheckedIds(prev => { const next = new Set(prev); next.delete(id); return next })
  }, [])

  const allEntities = [...entities, ...customEntities].sort((a, b) => a.start - b.start)

  // 빈칸 채우기: 사용자 입력값으로 [빈칸N] 마커 치환한 완성 텍스트
  const completedText = useMemo(() => {
    if (missingFields.length === 0) return text
    let t = text
    for (const field of missingFields) {
      t = t.split(`[빈칸${field.id}]`).join(filledValues[field.id] || `[빈칸${field.id}]`)
    }
    return t
  }, [text, missingFields, filledValues])

  const allFilled = missingFields.every(f => (filledValues[f.id] || '').trim() !== '')

  const handleStart = () => {
    const autoIds = entities.length > 0
      ? Array.from(checkedIds).filter(id => id > 0)
      : null

    const customChecked = customEntities.filter(e => checkedIds.has(e.id))
    const customMasks: CustomMask[] | null = customChecked.length > 0
      ? customChecked.map(e => ({ start: e.start, end: e.end, label: e.label }))
      : null

    navigate('/loading', {
      state: {
        contractId,
        filename,
        contractType,
        selectedIds: autoIds,
        customMasks,
        ocrTextOverride: missingFields.length > 0 ? completedText : undefined,
      },
    })
  }

  if (!contractId) return null

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      {/* Topbar */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 28px', borderBottom: '1px solid var(--border)',
        background: 'var(--bg-card)',
      }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8, background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L3 7V12C3 16.97 6.84 21.61 12 23C17.16 21.61 21 16.97 21 12V7L12 2Z" fill="white" fillOpacity="0.9"/>
              <path d="M9 12L11 14L15 10" stroke="#060d1f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: 1.5, color: 'var(--accent)' }}>CHECKMATE</span>
        </Link>

        {/* Progress steps */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
          {['파일 업로드', '마스킹 검토', 'AI 분석'].map((label, i) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                width: 22, height: 22, borderRadius: 11, display: 'inline-flex',
                alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11,
                background: i === 0 ? 'var(--accent)' : i === 1 ? 'var(--accent)' : 'var(--border)',
                color: i < 2 ? '#fff' : 'var(--text-muted)',
              }}>
                {i === 0 ? '✓' : i + 1}
              </span>
              <span style={{ color: i === 1 ? 'var(--text)' : 'var(--text-muted)', fontWeight: i === 1 ? 700 : 400 }}>
                {label}
              </span>
              {i < 2 && <span style={{ color: 'var(--border)', margin: '0 4px' }}>›</span>}
            </div>
          ))}
        </div>

        <button
          onClick={handleStart}
          style={{
            background: 'var(--accent)', color: '#fff', border: 'none',
            borderRadius: 10, padding: '10px 20px', fontWeight: 700,
            fontSize: 14, cursor: 'pointer',
          }}
        >
          분석 시작 →
        </button>
      </header>

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
        {/* Heading */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>
            개인정보 마스킹 검토
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            AI가 감지한 개인정보를 확인하고, 마스킹할 항목을 직접 선택하세요.
            체크된 항목만 <strong style={{ color: 'var(--accent)' }}>&lt;레이블&gt;</strong>로 가려진 채 분석됩니다.
            <span style={{ marginLeft: 8, color: '#7c3aed', fontWeight: 600 }}>
              💡 텍스트를 드래그하면 원하는 부분을 직접 마스킹할 수 있습니다
            </span>
          </p>
          {filename && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              marginTop: 10, padding: '4px 12px',
              background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)',
              borderRadius: 20, fontSize: 12, color: 'var(--accent)',
            }}>
              📄 {filename}
            </div>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', paddingTop: 80 }}>
            <div style={{
              width: 40, height: 40, border: '3px solid var(--border)',
              borderTopColor: 'var(--accent)', borderRadius: '50%',
              animation: 'spin 0.8s linear infinite', margin: '0 auto 16px',
            }} />
            <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
              {isImageFile ? 'AI가 이미지에서 텍스트 추출 중...' : '개인정보 감지 중...'}
            </p>
            {isImageFile && (
              <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 6 }}>
                이미지 OCR은 10~20초 소요될 수 있습니다
              </p>
            )}
          </div>
        ) : error ? (
          <div style={{
            padding: '20px 24px', background: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.3)', borderRadius: 12,
            color: '#f59e0b', marginBottom: 20,
          }}>
            ⚠ {error}
          </div>
        ) : imageOnly ? (
          <div style={{
            textAlign: 'center', padding: '60px 24px',
            background: 'var(--bg-card)', borderRadius: 16,
            border: '1px solid var(--border)',
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🖼️</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
              이미지 텍스트 추출 불가
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 8 }}>
              Gemini API 키가 없거나 OCR에 실패했습니다.<br/>
              AI가 이미지를 직접 보면서 분석 및 개인정보 처리를 함께 진행합니다.
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 24 }}>
              💡 PDF나 DOCX 파일로 변환하면 마스킹 검토 기능을 사용할 수 있습니다
            </p>
            <button onClick={handleStart} style={{
              background: 'var(--accent)', color: '#fff', border: 'none',
              borderRadius: 12, padding: '14px 32px', fontWeight: 700,
              fontSize: 15, cursor: 'pointer',
            }}>
              AI 분석 시작하기 →
            </button>
          </div>
        ) : (
          <>
          {fromOcr && (
            <div style={{
              padding: '12px 18px', marginBottom: 16,
              background: 'rgba(6,195,255,0.07)',
              border: '1px solid rgba(6,195,255,0.25)',
              borderRadius: 12, fontSize: 13,
              color: '#06c3ff',
              display: 'flex', alignItems: 'flex-start', gap: 10,
            }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>📸</span>
              <div>
                <strong>이미지에서 AI OCR로 텍스트를 추출했습니다.</strong><br/>
                <span style={{ opacity: 0.85 }}>
                  자동 인식이므로 일부 오류가 있을 수 있습니다. 내용을 확인 후 마스킹을 선택해 분석을 진행하세요.
                </span>
              </div>
            </div>
          )}

          {/* ── 빈칸 채우기 섹션 (OCR이 읽지 못한 부분) ── */}
          {missingFields.length > 0 && (
            <div style={{
              marginBottom: 20,
              background: 'var(--bg-card)',
              border: '2px solid rgba(245,158,11,0.4)',
              borderRadius: 16,
              padding: '20px 24px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <span style={{ fontSize: 22 }}>✍️</span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)' }}>
                    OCR이 읽지 못한 빈칸을 채워주세요
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    직접 입력하면 분석 정확도가 높아집니다. 모르면 비워도 됩니다.
                  </div>
                </div>
                {allFilled && (
                  <span style={{
                    marginLeft: 'auto', fontSize: 12, fontWeight: 700,
                    color: '#16a34a', background: 'rgba(22,163,74,0.1)',
                    padding: '3px 10px', borderRadius: 20,
                  }}>✓ 모두 입력됨</span>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
                {missingFields.map(field => (
                  <div key={field.id}>
                    <label style={{
                      fontSize: 12, fontWeight: 700, color: 'var(--text)',
                      display: 'block', marginBottom: 5,
                    }}>
                      {field.label}
                      <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 4 }}>
                        (빈칸{field.id})
                      </span>
                    </label>
                    <input
                      type="text"
                      value={filledValues[field.id] || ''}
                      onChange={e => setFilledValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                      placeholder={field.hint}
                      style={{
                        width: '100%', padding: '9px 12px', borderRadius: 10,
                        border: `1.5px solid ${filledValues[field.id] ? 'rgba(22,163,74,0.5)' : 'rgba(245,158,11,0.4)'}`,
                        background: 'var(--bg)', color: 'var(--text)', fontSize: 13,
                        boxSizing: 'border-box', outline: 'none',
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24, alignItems: 'start' }}>
            {/* 텍스트 미리보기 */}
            <div style={{
              background: 'var(--bg-card)', borderRadius: 16,
              border: '1px solid var(--border)', overflow: 'hidden',
            }}>
              <div style={{
                padding: '14px 20px', borderBottom: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>
                  {fromOcr ? '📸 OCR 추출 텍스트' : '계약서 미리보기'}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  강조된 텍스트 클릭 선택/해제 · <span style={{ color: '#7c3aed' }}>드래그로 직접 선택</span>
                </span>
              </div>
              <div style={{ padding: '20px', maxHeight: 600, overflowY: 'auto' }}>
                {text ? (
                  <HighlightedText
                    text={text}
                    entities={allEntities}
                    checkedIds={checkedIds}
                    onToggle={toggle}
                    onAddCustom={handleAddCustom}
                  />
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>텍스트를 불러올 수 없습니다.</p>
                )}
              </div>
            </div>

            {/* 엔티티 패널 */}
            <div style={{ position: 'sticky', top: 24 }}>
              <div style={{
                background: 'var(--bg-card)', borderRadius: 16,
                border: '1px solid var(--border)', padding: '20px', marginBottom: 16,
              }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
                  감지된 개인정보
                </h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
                  체크 항목만 마스킹되어 AI에 전달됩니다
                </p>
                <EntityList
                  entities={allEntities}
                  checkedIds={checkedIds}
                  onToggle={toggle}
                  onCheckAll={() => setCheckedIds(new Set(allEntities.map(e => e.id)))}
                  onUncheckAll={() => setCheckedIds(new Set())}
                  onRemoveCustom={handleRemoveCustom}
                />
              </div>

              {/* 마스킹 요약 */}
              <div style={{
                background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.2)',
                borderRadius: 12, padding: '14px 16px', marginBottom: 16, fontSize: 13,
              }}>
                <div style={{ fontWeight: 700, color: 'var(--accent)', marginBottom: 6 }}>마스킹 요약</div>
                <div style={{ color: 'var(--text-muted)' }}>
                  AI 감지 {entities.length}개 + 직접 선택 {customEntities.length}개
                  <br/>
                  <strong style={{ color: 'var(--accent)' }}>{checkedIds.size}개</strong> 마스킹 예정
                </div>
              </div>

              <button
                onClick={handleStart}
                style={{
                  width: '100%', padding: '14px', borderRadius: 12,
                  background: 'var(--accent)', color: '#fff',
                  border: 'none', fontWeight: 700, fontSize: 15,
                  cursor: 'pointer', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: 8,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                AI 분석 시작
              </button>

              <button
                onClick={() => navigate('/upload')}
                style={{
                  width: '100%', marginTop: 8, padding: '12px',
                  borderRadius: 12, border: '1px solid var(--border)',
                  background: 'transparent', color: 'var(--text-muted)',
                  fontSize: 13, cursor: 'pointer',
                }}
              >
                ← 파일 다시 선택
              </button>
            </div>
          </div>
          </>
        )}
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
