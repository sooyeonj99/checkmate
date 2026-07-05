import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Navbar from '../components/common/Navbar'

interface SigBox { x: number; y: number; w: number; h: number }

const DEFAULT_BOX: SigBox = { x: 5, y: 82, w: 40, h: 10 }

export default function TemplateEditorPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id?: string }>()
  const isEdit = !!id

  const [step, setStep] = useState<'upload' | 'position' | 'saving'>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [name, setName] = useState('')
  const [sigBox, setSigBox] = useState<SigBox>(DEFAULT_BOX)
  const [dragging, setDragging] = useState(false)
  const [dragMode, setDragMode] = useState<'draw' | 'move'>('draw')
  const [dragStart, setDragStart] = useState<{ mx: number; my: number; bx: number; by: number } | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // 편집 모드: 기존 템플릿 파일 로드
  useEffect(() => {
    if (!isEdit || !id) return
    const token = localStorage.getItem('cm_token')
    fetch(`/api/v1/templates/user/${id}/file`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setPreviewUrl(d.data_url))
      .catch(() => {})
    fetch(`/api/v1/templates/user`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then((list: any[]) => {
        const tpl = list.find(t => String(t.id) === id)
        if (tpl) {
          setName(tpl.name)
          setSigBox({ x: tpl.sig1_x, y: tpl.sig1_y, w: tpl.sig1_w, h: tpl.sig1_h })
          setStep('position')
        }
      })
      .catch(() => {})
  }, [id, isEdit])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setName(prev => prev || f.name.replace(/\.[^.]+$/, ''))
    const url = URL.createObjectURL(f)
    setPreviewUrl(url)
    setStep('position')
    e.target.value = ''
  }

  const getPct = useCallback((clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return { px: 0, py: 0 }
    return {
      px: Math.max(0, Math.min(100, (clientX - rect.left) / rect.width * 100)),
      py: Math.max(0, Math.min(100, (clientY - rect.top) / rect.height * 100)),
    }
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const { px, py } = getPct(e.clientX, e.clientY)
    // 서명 박스 내부 클릭 → move, 외부 → draw
    const inside =
      px >= sigBox.x && px <= sigBox.x + sigBox.w &&
      py >= sigBox.y && py <= sigBox.y + sigBox.h
    if (inside) {
      setDragMode('move')
      setDragStart({ mx: px, my: py, bx: sigBox.x, by: sigBox.y })
    } else {
      setDragMode('draw')
      setDragStart({ mx: px, my: py, bx: px, by: py })
      setSigBox({ x: px, y: py, w: 0, h: 0 })
    }
    setDragging(true)
  }, [sigBox, getPct])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging || !dragStart) return
    e.preventDefault()
    const { px, py } = getPct(e.clientX, e.clientY)
    if (dragMode === 'draw') {
      const x = Math.min(dragStart.mx, px)
      const y = Math.min(dragStart.my, py)
      const w = Math.abs(px - dragStart.mx)
      const h = Math.abs(py - dragStart.my)
      setSigBox({ x, y, w, h })
    } else {
      const dx = px - dragStart.mx
      const dy = py - dragStart.my
      const newX = Math.max(0, Math.min(100 - sigBox.w, dragStart.bx + dx))
      const newY = Math.max(0, Math.min(100 - sigBox.h, dragStart.by + dy))
      setSigBox(prev => ({ ...prev, x: newX, y: newY }))
    }
  }, [dragging, dragStart, dragMode, sigBox.w, sigBox.h, getPct])

  const handleMouseUp = useCallback(() => {
    setDragging(false)
    setDragStart(null)
  }, [])

  const handleSave = async () => {
    if (!name.trim()) { setError('템플릿 이름을 입력해주세요.'); return }
    if (sigBox.w < 5 || sigBox.h < 2) { setError('서명 위치를 더 크게 그려주세요.'); return }
    setSaving(true)
    setError('')
    try {
      const token = localStorage.getItem('cm_token')
      const formData = new FormData()
      formData.append('name', name)
      formData.append('sig1_x', String(sigBox.x))
      formData.append('sig1_y', String(sigBox.y))
      formData.append('sig1_w', String(sigBox.w))
      formData.append('sig1_h', String(sigBox.h))

      if (isEdit && !file) {
        // position 업데이트만
        formData.append('name', name)
        const res = await fetch(`/api/v1/templates/user/${id}`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        })
        if (!res.ok) throw new Error((await res.json()).detail ?? '수정 실패')
      } else {
        if (!file) { setError('파일을 선택해주세요.'); return }
        formData.append('file', file)
        const res = await fetch('/api/v1/templates/user', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        })
        if (!res.ok) throw new Error((await res.json()).detail ?? '저장 실패')
      }
      navigate('/dashboard', { state: { tab: 'templates', saved: true } })
    } catch (e: any) {
      setError(e.message ?? '저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Navbar />
      <main style={{ minHeight: '100vh', background: 'var(--bg)', padding: '32px 16px' }}>
        <div className="container" style={{ maxWidth: 860 }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
            <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14 }}>
              ← 대시보드
            </button>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>
              {isEdit ? '서명 위치 수정' : '계약서 템플릿 만들기'}
            </h1>
          </div>

          {step === 'upload' && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: '48px 40px', textAlign: 'center' }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>📄</div>
              <h2 style={{ margin: '0 0 10px', fontSize: 20, color: 'var(--text)' }}>계약서 파일을 업로드하세요</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 32 }}>JPG, PNG, PDF 형식 지원 · 최대 10MB</p>
              <input ref={inputRef} type="file" accept=".jpg,.jpeg,.png,.pdf" style={{ display: 'none' }} onChange={handleFileChange} />
              <button
                onClick={() => inputRef.current?.click()}
                style={{
                  padding: '14px 36px', background: 'var(--accent)', color: '#fff',
                  border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer',
                }}
              >
                파일 선택
              </button>
            </div>
          )}

          {step === 'position' && previewUrl && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 24, alignItems: 'start' }}>

              {/* 문서 미리보기 + 서명 위치 드래그 */}
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', fontSize: 13, color: 'var(--text-muted)' }}>
                  <strong style={{ color: 'var(--text)' }}>서명 위치를 드래그해서 지정하세요</strong>
                  &nbsp;·&nbsp; 박스 내부를 드래그하면 이동, 외부 드래그하면 새로 그리기
                </div>
                <div
                  ref={containerRef}
                  style={{ position: 'relative', cursor: dragging ? (dragMode === 'move' ? 'grabbing' : 'crosshair') : 'crosshair', userSelect: 'none' }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                >
                  <img
                    src={previewUrl}
                    alt="계약서"
                    style={{ width: '100%', display: 'block', pointerEvents: 'none' }}
                    draggable={false}
                  />
                  {/* 서명 위치 박스 */}
                  {sigBox.w > 0 && sigBox.h > 0 && (
                    <div style={{
                      position: 'absolute',
                      left: `${sigBox.x}%`,
                      top: `${sigBox.y}%`,
                      width: `${sigBox.w}%`,
                      height: `${sigBox.h}%`,
                      border: '2px dashed #2563eb',
                      background: 'rgba(37,99,235,0.12)',
                      boxSizing: 'border-box',
                      borderRadius: 4,
                      pointerEvents: 'none',
                    }}>
                      <span style={{
                        position: 'absolute', top: '50%', left: '50%',
                        transform: 'translate(-50%,-50%)',
                        fontSize: 11, fontWeight: 700, color: '#2563eb',
                        whiteSpace: 'nowrap', pointerEvents: 'none',
                      }}>
                        ✍ 서명 위치
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* 오른쪽 패널 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', display: 'block', marginBottom: 8 }}>
                    템플릿 이름
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="예) 표준근로계약서 2026"
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      padding: '10px 14px', borderRadius: 10,
                      border: '1.5px solid var(--border)', background: 'var(--bg-input)',
                      color: 'var(--text)', fontSize: 14,
                    }}
                  />
                </div>

                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>서명 위치 정보</div>
                  {sigBox.w > 0 && sigBox.h > 0 ? (
                    <>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 2 }}>
                        <div>왼쪽: <strong>{sigBox.x.toFixed(1)}%</strong></div>
                        <div>위: <strong>{sigBox.y.toFixed(1)}%</strong></div>
                        <div>너비: <strong>{sigBox.w.toFixed(1)}%</strong></div>
                        <div>높이: <strong>{sigBox.h.toFixed(1)}%</strong></div>
                      </div>
                      <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(22,163,74,0.08)', borderRadius: 8, fontSize: 12, color: '#16a34a', fontWeight: 600 }}>
                        ✓ 서명 위치 설정됨
                      </div>
                    </>
                  ) : (
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
                      문서 위에서 드래그해서 서명 받을 위치를 그려주세요
                    </p>
                  )}
                </div>

                {!isEdit && (
                  <button
                    onClick={() => { setStep('upload'); setPreviewUrl(''); setFile(null) }}
                    style={{
                      padding: '10px', borderRadius: 10, border: '1.5px solid var(--border)',
                      background: 'none', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer',
                    }}
                  >
                    다른 파일 선택
                  </button>
                )}

                {error && (
                  <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, color: '#dc2626', fontSize: 13 }}>
                    {error}
                  </div>
                )}

                <button
                  onClick={handleSave}
                  disabled={saving || sigBox.w < 2}
                  style={{
                    padding: '14px', borderRadius: 12, border: 'none',
                    background: saving || sigBox.w < 2 ? 'var(--bg-input)' : 'var(--accent)',
                    color: saving || sigBox.w < 2 ? 'var(--text-muted)' : '#fff',
                    fontSize: 15, fontWeight: 700, cursor: saving || sigBox.w < 2 ? 'not-allowed' : 'pointer',
                  }}
                >
                  {saving ? '저장 중...' : isEdit ? '서명 위치 업데이트' : '템플릿 저장'}
                </button>
              </div>
            </div>
          )}

        </div>
      </main>
    </>
  )
}
