import { useState, useEffect, useCallback } from 'react'
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
}

function getColor(type: string) {
  return TYPE_COLOR[type] ?? '#64748b'
}

/* ── 텍스트에 하이라이트 렌더링 ── */
function HighlightedText({
  text,
  entities,
  checkedIds,
  onToggle,
}: {
  text: string
  entities: PiiEntity[]
  checkedIds: Set<number>
  onToggle: (id: number) => void
}) {
  const sorted = [...entities].sort((a, b) => a.start - b.start)
  const segments: { text: string; entity?: PiiEntity }[] = []
  let cursor = 0

  for (const e of sorted) {
    if (e.start > cursor) segments.push({ text: text.slice(cursor, e.start) })
    segments.push({ text: text.slice(e.start, e.end), entity: e })
    cursor = e.end
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor) })

  return (
    <div style={{
      fontFamily: 'monospace', fontSize: 13, lineHeight: 1.8,
      color: 'var(--text)', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
    }}>
      {segments.map((seg, i) => {
        if (!seg.entity) return <span key={i}>{seg.text}</span>
        const e = seg.entity
        const checked = checkedIds.has(e.id)
        const color = getColor(e.type)
        return (
          <span
            key={i}
            title={`${e.label} — 클릭하여 마스킹 ${checked ? '해제' : '선택'}`}
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
  )
}

/* ── 엔티티 목록 패널 ── */
function EntityList({
  entities,
  checkedIds,
  onToggle,
  onCheckAll,
  onUncheckAll,
}: {
  entities: PiiEntity[]
  checkedIds: Set<number>
  onToggle: (id: number) => void
  onCheckAll: () => void
  onUncheckAll: () => void
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
          바로 AI 분석을 진행할 수 있습니다
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
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set())
  const [imageOnly, setImageOnly] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!contractId) { navigate('/upload'); return }

    api.get(`/contracts/${contractId}/preview`)
      .then(({ data }) => {
        setImageOnly(data.image_only)
        setText(data.text ?? '')
        setEntities(data.entities ?? [])
        // 기본값: 전체 선택
        setCheckedIds(new Set((data.entities ?? []).map((e: PiiEntity) => e.id)))
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

  const handleStart = () => {
    navigate('/loading', {
      state: {
        contractId,
        filename,
        contractType,
        selectedIds: entities.length > 0 ? Array.from(checkedIds) : null,
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
            <p style={{ color: 'var(--text-muted)' }}>개인정보 감지 중...</p>
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
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>이미지 파일은 AI가 직접 분석합니다</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>
              이미지는 텍스트 추출 전이므로 마스킹 미리보기를 지원하지 않습니다.<br/>
              AI가 분석하면서 개인정보를 함께 처리합니다.
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
                <span style={{ fontWeight: 700, fontSize: 14 }}>계약서 미리보기</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  강조된 텍스트를 클릭해 마스킹 선택/해제
                </span>
              </div>
              <div style={{ padding: '20px', maxHeight: 600, overflowY: 'auto' }}>
                {text ? (
                  <HighlightedText
                    text={text}
                    entities={entities}
                    checkedIds={checkedIds}
                    onToggle={toggle}
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
                  entities={entities}
                  checkedIds={checkedIds}
                  onToggle={toggle}
                  onCheckAll={() => setCheckedIds(new Set(entities.map(e => e.id)))}
                  onUncheckAll={() => setCheckedIds(new Set())}
                />
              </div>

              {/* 마스킹 요약 */}
              <div style={{
                background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.2)',
                borderRadius: 12, padding: '14px 16px', marginBottom: 16, fontSize: 13,
              }}>
                <div style={{ fontWeight: 700, color: 'var(--accent)', marginBottom: 6 }}>마스킹 요약</div>
                <div style={{ color: 'var(--text-muted)' }}>
                  총 {entities.length}개 감지 · <strong style={{ color: 'var(--accent)' }}>{checkedIds.size}개</strong> 마스킹 예정
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
        )}
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
