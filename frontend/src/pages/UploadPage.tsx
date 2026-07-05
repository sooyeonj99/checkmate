import { useState, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Navbar from '../components/common/Navbar'
import api from '../services/api'

/* ── Types ─────────────────────────────────────────── */
type ContractType = 'employment' | 'lease' | 'freelance' | 'subscription' | 'rental' | 'other'

interface FileInfo {
  file: File
  name: string
  sizeLabel: string
  ext: string
}

const CONTRACT_TYPES: { id: ContractType; emoji: string; label: string; wide?: boolean }[] = [
  { id: 'rental',       emoji: '🔒', label: '렌탈·약정계약' },
  { id: 'subscription', emoji: '📋', label: '구독·이용약관' },
  { id: 'employment',   emoji: '👷', label: '근로계약서' },
  { id: 'freelance',    emoji: '💻', label: '프리랜서 계약서' },
  { id: 'lease',        emoji: '🏠', label: '임대차계약서' },
  { id: 'other',        emoji: '📝', label: '기타 계약서', wide: true },
]

const ACCEPT_TYPES = '.pdf,.jpg,.jpeg,.png,.hwp,.docx'

/* ── Utils ─────────────────────────────────────────── */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function truncateFilename(name: string, maxLen = 24): string {
  if (name.length <= maxLen) return name
  const dot = name.lastIndexOf('.')
  if (dot > 0) {
    const ext = name.slice(dot)                        // ".docx"
    const base = name.slice(0, Math.max(maxLen - ext.length - 3, 6))
    return `${base}...${ext}`
  }
  return `${name.slice(0, maxLen - 3)}...`
}

function getExt(name: string): string {
  return name.split('.').pop()?.toUpperCase() ?? 'FILE'
}

function getFileIconStyle(ext: string): { emoji: string; bg: string } {
  switch (ext) {
    case 'PDF':  return { emoji: '📄', bg: 'rgba(239,68,68,0.12)' }
    case 'JPG':
    case 'JPEG':
    case 'PNG':  return { emoji: '🖼️', bg: 'rgba(79,142,247,0.12)' }
    case 'HWP':  return { emoji: '📝', bg: 'rgba(6,195,255,0.12)' }
    case 'DOCX': return { emoji: '📘', bg: 'rgba(99,102,241,0.12)' }
    default:     return { emoji: '📎', bg: 'rgba(148,163,184,0.12)' }
  }
}

/* ── Sub-components ────────────────────────────────── */
function ProgressSteps({ hasFile, hasType }: { hasFile: boolean; hasType: boolean }) {
  const steps = ['파일 선택', '유형 선택', '분석 시작']
  const doneCount = hasFile ? (hasType ? 2 : 1) : 0

  return (
    <div className="upload-progress">
      {steps.map((label, i) => {
        const done = i < doneCount
        const active = i === doneCount
        return (
          <div key={label} style={{ display: 'flex', alignItems: 'center', flex: i < 2 ? '1' : undefined }}>
            <div className="upload-progress-step">
              <div className={`progress-circle ${done ? 'done' : active ? 'active' : ''}`}>
                {done
                  ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                  : i + 1
                }
              </div>
              <span className={`progress-label ${done ? 'done' : active ? 'active' : ''}`}>{label}</span>
            </div>
            {i < 2 && <div className={`progress-line ${done ? 'done' : ''}`} />}
          </div>
        )
      })}
    </div>
  )
}

function DropZone({ onFiles }: { onFiles: (files: File[]) => void }) {
  const [drag, setDrag] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDrag(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length) onFiles(files)
  }, [onFiles])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length) onFiles(files)
    e.target.value = ''
  }

  return (
    <div
      className={`drop-zone${drag ? ' drag-active' : ''}`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
      onDragEnter={(e) => { e.preventDefault(); setDrag(true) }}
      onDragLeave={() => setDrag(false)}
      onDrop={handleDrop}
    >
      <input ref={inputRef} type="file" accept={ACCEPT_TYPES} multiple style={{ display: 'none' }} onChange={handleChange} />
      <div className="drop-zone-icon">{drag ? '📂' : '📁'}</div>
      <h2>{drag ? '파일을 놓아주세요' : '계약서를 드래그&드롭 하거나'}</h2>
      {!drag && <p className="drop-zone-sub">클릭하여 파일을 선택하세요 · <strong>여러 장</strong> 동시 선택 가능</p>}
      <div className="drop-zone-divider"><span>지원 형식</span></div>
      <div className="format-list">
        {['PDF', 'JPG', 'PNG', 'HWP', 'DOCX'].map((fmt) => (
          <span key={fmt} className="format-chip">
            {fmt === 'PDF' && '🔴'}{(fmt === 'JPG' || fmt === 'PNG') && '🔵'}{fmt === 'HWP' && '🟢'}{fmt === 'DOCX' && '🟣'}
            {fmt}
          </span>
        ))}
        <span className="format-chip" style={{ color: 'var(--text-muted)' }}>최대 20MB/개</span>
      </div>
    </div>
  )
}

function FileListPreview({ files, onRemove, onAddMore }: {
  files: FileInfo[]
  onRemove: (idx: number) => void
  onAddMore: (newFiles: File[]) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const added = Array.from(e.target.files ?? [])
    if (added.length) onAddMore(added)
    e.target.value = ''
  }
  return (
    <div className="file-preview-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontWeight: 700, color: 'var(--text)', fontSize: 14 }}>
          📋 선택된 파일 <span style={{ color: 'var(--accent)' }}>{files.length}장</span>
        </span>
        <button
          onClick={() => inputRef.current?.click()}
          style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 8, padding: '4px 10px', cursor: 'pointer' }}
        >+ 파일 추가</button>
        <input ref={inputRef} type="file" accept={ACCEPT_TYPES} multiple style={{ display: 'none' }} onChange={handleChange} />
      </div>
      {files.map((info, idx) => {
        const { emoji, bg } = getFileIconStyle(info.ext)
        return (
          <div key={idx} className="file-preview-top" style={{ marginBottom: 8, background: 'var(--bg)', borderRadius: 10, padding: '10px 12px' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginRight: 4, minWidth: 18 }}>{idx + 1}</div>
            <div className="file-type-icon" style={{ background: bg, width: 32, height: 32, fontSize: 16 }}>{emoji}</div>
            <div className="file-meta">
              <div className="file-name" title={info.name}>{truncateFilename(info.name, 28)}</div>
              <div className="file-size">{info.ext} · {info.sizeLabel}</div>
            </div>
            <button className="file-remove-btn" onClick={() => onRemove(idx)} title="제거">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        )
      })}
      <div className="file-change-zone" onClick={() => inputRef.current?.click()} style={{ marginTop: 8 }}>
        <p>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }}>
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
          </svg>
          파일 추가하기
        </p>
      </div>
    </div>
  )
}


function PrivacyNotice() {
  return (
    <div className="privacy-notice">
      <span className="privacy-icon">🔒</span>
      <div className="privacy-text">
        <strong>개인정보 보호 안내</strong><br />
        업로드된 파일은 분석 완료 즉시 서버에서 자동 삭제됩니다. 계약 내용은 저장·공유되지 않으며, AI 학습에도 사용되지 않습니다.
      </div>
    </div>
  )
}

function StartButton({ hasFile, loading, onClick }: { hasFile: boolean; loading: boolean; onClick: () => void }) {
  return (
    <div className="submit-section">
      <button
        className={`submit-btn${loading ? ' loading' : ''}`}
        disabled={!hasFile || loading}
        onClick={onClick}
      >
        {loading ? (
          <>
            <div className="spinner" />
            업로드 중...
          </>
        ) : (
          <>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <span style={{ lineHeight: 1.3 }}>
              AI 분석 시작하기
              {hasFile && (
                <span style={{ display: 'block', fontSize: 11, opacity: 0.75, fontWeight: 400, marginTop: 2 }}>
                  계약서 유형 선택하기 →
                </span>
              )}
            </span>
          </>
        )}
      </button>
      {!hasFile && !loading && (
        <p className="submit-helper">파일을 먼저 선택해주세요</p>
      )}
    </div>
  )
}

/* ── Contract Type Modal ────────────────────────────── */
interface ContractTypeModalProps {
  contractType: ContractType | null
  onSelect: (t: ContractType) => void
  onMasking: () => void
  onDirectAnalyze: () => void
  onClose: () => void
  loading: boolean
}

function ContractTypeModal({
  contractType, onSelect, onMasking, onDirectAnalyze, onClose, loading,
}: ContractTypeModalProps) {
  return (
    <div className="ctype-modal-overlay" onClick={() => { if (!loading) onClose() }}>
      <div className="ctype-modal-card" onClick={e => e.stopPropagation()}>

        <div className="ctype-modal-header">
          <div>
            <h2 className="ctype-modal-title">계약서 유형 선택</h2>
            <p className="ctype-modal-sub">분석할 계약서의 유형을 선택하고 분석 방식을 고르세요</p>
          </div>
          <button className="ctype-modal-close" onClick={onClose} disabled={loading}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="contract-type-grid" style={{ marginBottom: 24 }}>
          {CONTRACT_TYPES.map(({ id, emoji, label, wide }) => (
            <button
              key={id}
              className={`contract-type-btn${wide ? ' wide' : ''}${contractType === id ? ' selected' : ''}`}
              onClick={() => onSelect(id)}
              disabled={loading}
            >
              <span className="contract-type-emoji">{emoji}</span>
              <span className="contract-type-label">{label}</span>
              {contractType === id && (
                <svg style={{ marginLeft: 'auto' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              )}
            </button>
          ))}
        </div>

        <div className="ctype-modal-divider">
          <span>분석 방식 선택</span>
        </div>

        <div className="ctype-modal-actions">
          <button
            className={`ctype-action-btn ctype-btn-masking${!contractType || loading ? ' disabled' : ''}`}
            disabled={!contractType || loading}
            onClick={onMasking}
          >
            <div className="ctype-action-icon">✏️</div>
            <div className="ctype-action-text">
              <span className="ctype-action-title">글씨 추출하기</span>
              <span className="ctype-action-desc">OCR로 텍스트 추출 후 마스킹 선택</span>
            </div>
          </button>
          <button
            className={`ctype-action-btn ctype-btn-analyze${!contractType || loading ? ' disabled' : ''}`}
            disabled={!contractType || loading}
            onClick={onDirectAnalyze}
          >
            <div className="ctype-action-icon">🔍</div>
            <div className="ctype-action-text">
              <span className="ctype-action-title">업로드 문서 분석하기</span>
              <span className="ctype-action-desc">바로 AI 위험 조항 분석 시작</span>
            </div>
          </button>
        </div>

        {!contractType && (
          <p className="ctype-modal-helper">먼저 계약서 유형을 선택해주세요</p>
        )}
      </div>
    </div>
  )
}

/* ── Page ──────────────────────────────────────────── */
export default function UploadPage() {
  const navigate = useNavigate()
  const [fileList, setFileList] = useState<FileInfo[]>([])
  const [contractType, setContractType] = useState<ContractType | null>(null)
  const [showTypeModal, setShowTypeModal] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const toFileInfo = (f: File): FileInfo => ({
    file: f, name: f.name, sizeLabel: formatSize(f.size), ext: getExt(f.name),
  })

  const handleFiles = useCallback((files: File[]) => {
    setUploadError(null)
    setFileList(prev => {
      const existingNames = new Set(prev.map(f => f.name))
      const newOnes = files.filter(f => !existingNames.has(f.name)).map(toFileInfo)
      return [...prev, ...newOnes]
    })
  }, [])

  const handleRemove = (idx: number) => setFileList(prev => prev.filter((_, i) => i !== idx))

  const uploadFiles = async () => {
    const formData = new FormData()
    fileList.forEach(fi => formData.append('files', fi.file))
    formData.append('contract_type', contractType ?? 'other')
    const { data } = await api.post('/contracts/upload', formData)
    return { contractId: data.contract_id, filename: data.filename }
  }

  const handleMasking = async () => {
    if (!contractType) return
    setAnalyzing(true)
    setUploadError(null)
    try {
      const result = await uploadFiles()
      navigate('/masking', { state: { contractId: result.contractId, filename: result.filename, contractType } })
    } catch {
      navigate('/loading', { state: { useMock: true, filename: fileList[0]?.name ?? '계약서', contractType } })
    } finally {
      setAnalyzing(false)
    }
  }

  const handleDirectAnalyze = async () => {
    if (!contractType) return
    setAnalyzing(true)
    setUploadError(null)
    try {
      const result = await uploadFiles()
      navigate('/loading', { state: { contractId: result.contractId, contractType } })
    } catch {
      navigate('/loading', { state: { useMock: true, filename: fileList[0]?.name ?? '계약서', contractType } })
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <>
      <Navbar />

      <main className="upload-page">
        <div className="upload-page-bg" />
        <div className="container" style={{ position: 'relative' }}>

          {/* Breadcrumb */}
          <div className="upload-breadcrumb">
            <Link to="/">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12l9-9 9 9M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9"/>
              </svg>
              홈
            </Link>
            <span className="upload-breadcrumb-sep">›</span>
            <span className="upload-breadcrumb-current">계약서 업로드</span>
          </div>

          {/* Header */}
          <div className="upload-page-header">
            <h1>계약서를 <span className="gradient-text">업로드</span>하세요</h1>
            <p>PDF, 이미지, HWP, DOCX 파일을 업로드하면 AI가 30초 안에 위험 조항을 찾아드립니다. <strong>여러 장 동시 업로드</strong> 가능합니다.</p>
          </div>

          {/* Progress */}
          <ProgressSteps hasFile={fileList.length > 0} hasType={!!contractType} />

          {/* Main Layout */}
          <div className="upload-layout">

            {/* Left: Drop Zone or File List */}
            <div>
              {fileList.length > 0
                ? <FileListPreview files={fileList} onRemove={handleRemove} onAddMore={handleFiles} />
                : <DropZone onFiles={handleFiles} />
              }
            </div>

            {/* Right: Privacy notice + CTA button */}
            <div className="upload-right-panel">
              <PrivacyNotice />
              <StartButton
                hasFile={fileList.length > 0}
                loading={analyzing}
                onClick={() => setShowTypeModal(true)}
              />
              {uploadError && (
                <div style={{
                  marginTop: 12, padding: '12px 16px',
                  background: 'var(--risk-high-bg)', border: '1px solid rgba(217,64,64,0.2)',
                  borderRadius: 'var(--radius-md)', color: 'var(--risk-high)',
                  fontSize: 13, lineHeight: 1.5,
                }}>
                  ⚠ {uploadError}
                </div>
              )}
            </div>

          </div>
        </div>
      </main>

      {/* Contract Type Selection Modal */}
      {showTypeModal && (
        <ContractTypeModal
          contractType={contractType}
          onSelect={setContractType}
          onMasking={handleMasking}
          onDirectAnalyze={handleDirectAnalyze}
          onClose={() => { if (!analyzing) setShowTypeModal(false) }}
          loading={analyzing}
        />
      )}
    </>
  )
}
