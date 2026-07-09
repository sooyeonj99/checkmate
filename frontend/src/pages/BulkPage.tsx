import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'

interface BulkItem {
 filename: string
 contract_id: string
 status: 'queued' | 'analyzing' | 'done' | 'error'
 grade?: string
 score?: number
 error_msg?: string
}

export default function BulkPage() {
 const [items, setItems] = useState<BulkItem[]>([])
 const [uploading, setUploading] = useState(false)
 const [uploadMsg, setUploadMsg] = useState('')
 const [dragOver, setDragOver] = useState(false)
 const fileRef = useRef<HTMLInputElement>(null)
 const token = localStorage.getItem('cm_token')

 const gradeColor = (g?: string) =>
 g === '위험' ? '#ef4444' : g === '주의' ? '#f59e0b' : g === '안전' ? '#22c55e' : 'var(--text-muted)'

 const handleFiles = async (files: FileList | null) => {
 if (!files || files.length === 0) return
 if (files.length > 10) { setUploadMsg('최대 10개 파일만 업로드할 수 있습니다.'); return }

 setUploadMsg('')
 setUploading(true)

 const fd = new FormData()
 for (const file of Array.from(files)) fd.append('files', file)

 try {
 const res = await fetch('/api/v1/contracts/bulk-upload', {
 method: 'POST',
 headers: { Authorization: `Bearer ${token}` },
 body: fd,
 })
 if (res.ok) {
 const data = await res.json()
 const queued: BulkItem[] = data.items
 .filter((c: { status: string }) => c.status === 'uploaded')
 .map((c: { filename: string; contract_id: string }) => ({
 filename: c.filename,
 contract_id: c.contract_id,
 status: 'queued' as const,
 }))
 setItems(queued)
 setUploadMsg(`${data.success}/${data.total}개 파일이 업로드되었습니다.`)
 } else {
 const d = await res.json()
 setUploadMsg(d.detail || '업로드 실패')
 }
 } catch { setUploadMsg('서버 오류가 발생했습니다.') }
 setUploading(false)
 }

 const analyzeItem = async (idx: number) => {
 const item = items[idx]
 setItems(prev => prev.map((x, i) => i === idx ? { ...x, status: 'analyzing' } : x))
 try {
 const res = await fetch(`/api/v1/contracts/${item.contract_id}/analyze`, {
 method: 'POST',
 headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
 body: JSON.stringify({}),
 })
 if (res.ok) {
 const data = await res.json()
 setItems(prev => prev.map((x, i) => i === idx ? {
 ...x, status: 'done',
 grade: data.grade, score: data.score,
 } : x))
 } else {
 setItems(prev => prev.map((x, i) => i === idx ? { ...x, status: 'error', error_msg: '분석 실패' } : x))
 }
 } catch {
 setItems(prev => prev.map((x, i) => i === idx ? { ...x, status: 'error', error_msg: '서버 오류' } : x))
 }
 }

 const analyzeAll = () => {
 items.forEach((item, idx) => {
 if (item.status === 'queued') analyzeItem(idx)
 })
 }

 return (
 <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '0 0 60px' }}>
 <header style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', padding: '16px 32px', display: 'flex', alignItems: 'center', gap: 16 }}>
 <Link to="/dashboard" style={{
 display: 'inline-flex', alignItems: 'center', gap: 6,
 color: 'var(--accent)', fontSize: 13, textDecoration: 'none', fontWeight: 700,
 padding: '6px 14px', borderRadius: 10, background: 'rgba(90,63,192,0.08)',
 border: '1px solid rgba(90,63,192,0.18)',
 }}>← 대시보드</Link>
 <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', margin: 0, flex: 1 }}>계약서 일괄 분석</h1>
 <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>최대 10개</span>
 </header>

 <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>
 {/* 드래그 앤 드롭 영역 */}
 <div
 onDragOver={e => { e.preventDefault(); setDragOver(true) }}
 onDragLeave={() => setDragOver(false)}
 onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
 onClick={() => fileRef.current?.click()}
 style={{
 border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border)'}`,
 borderRadius: 16, padding: '48px 24px', textAlign: 'center', cursor: 'pointer',
 background: dragOver ? 'rgba(37,99,235,0.04)' : 'var(--bg-card)',
 transition: 'all 0.2s', marginBottom: 24,
 }}>
 <div style={{ fontSize: 40, marginBottom: 12 }}></div>
 <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
 계약서 파일을 드래그하거나 클릭해 선택하세요
 </div>
 <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>PDF, DOCX, TXT, JPG, PNG · 최대 10개 · 각 50MB</div>
 <input ref={fileRef} type="file" multiple accept=".pdf,.docx,.txt,.jpg,.jpeg,.png"
 style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />
 </div>

 {uploadMsg && (
 <div style={{ padding: '12px 16px', borderRadius: 10, marginBottom: 20, fontSize: 13, fontWeight: 600,
 background: uploadMsg.includes('실패') || uploadMsg.includes('오류') ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)',
 color: uploadMsg.includes('실패') || uploadMsg.includes('오류') ? '#ef4444' : '#16a34a',
 border: `1px solid ${uploadMsg.includes('실패') || uploadMsg.includes('오류') ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)'}`,
 }}>
 {uploadMsg}
 </div>
 )}

 {items.length > 0 && (
 <>
 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
 <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>업로드된 파일 ({items.length}개)</div>
 {items.some(x => x.status === 'queued') && (
 <button onClick={analyzeAll}
 style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
 전체 분석 시작
 </button>
 )}
 </div>
 <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
 {items.map((item, idx) => (
 <div key={idx} style={{
 background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px',
 display: 'flex', alignItems: 'center', gap: 16,
 }}>
 <div style={{ fontSize: 24, flexShrink: 0 }}>
 {item.status === 'done' ? '' : item.status === 'error' ? '' : item.status === 'analyzing' ? '⏳' : ''}
 </div>
 <div style={{ flex: 1, minWidth: 0 }}>
 <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
 {item.filename}
 </div>
 <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
 {item.status === 'queued' && '분석 대기 중'}
 {item.status === 'analyzing' && 'AI 분석 중...'}
 {item.status === 'done' && <span style={{ color: gradeColor(item.grade), fontWeight: 700 }}>{item.grade} · {item.score}점</span>}
 {item.status === 'error' && <span style={{ color: '#ef4444' }}>{item.error_msg}</span>}
 </div>
 </div>
 {item.status === 'queued' && (
 <button onClick={() => analyzeItem(idx)}
 style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--accent)', background: 'rgba(37,99,235,0.08)', color: 'var(--accent)', fontSize: 13, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
 분석
 </button>
 )}
 {item.status === 'analyzing' && (
 <div style={{ width: 24, height: 24, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
 )}
 </div>
 ))}
 </div>
 </>
 )}

 {items.length === 0 && !uploading && (
 <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
 <div style={{ fontSize: 13, marginBottom: 16 }}>여러 계약서를 한 번에 업로드해서 각각 AI 분석을 실행할 수 있습니다.</div>
 <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.8 }}>
 • 지원 형식: PDF, DOCX, TXT, JPG, PNG<br/>
 • 최대 10개 파일 동시 업로드<br/>
 • 업로드 후 파일별로 분석 실행
 </div>
 </div>
 )}
 </div>

 <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
 </div>
 )
}
