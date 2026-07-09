import { useState, useEffect } from 'react'

interface TemplateVariable {
 key: string
 label: string
 placeholder: string
}

interface Template {
 id: string
 name: string
 type: string
 description: string
 icon: string
 variables: TemplateVariable[]
}

interface Props {
 onClose: () => void
 onDone: (msg: string) => void
}

type Step = 'select' | 'fill' | 'preview' | 'send'

export default function TemplateModal({ onClose, onDone }: Props) {
 const [templates, setTemplates] = useState<Template[]>([])
 const [loading, setLoading] = useState(true)
 const [step, setStep] = useState<Step>('select')
 const [selected, setSelected] = useState<Template | null>(null)
 const [templateContent, setTemplateContent] = useState('')
 const [values, setValues] = useState<Record<string, string>>({})
 const [recipientEmail, setRecipientEmail] = useState('')
 const [message, setMessage] = useState('')
 const [sending, setSending] = useState(false)
 const [sendError, setSendError] = useState('')

 useEffect(() => {
 const token = localStorage.getItem('cm_token')
 fetch('/api/v1/templates', { headers: { Authorization: `Bearer ${token}` } })
 .then(r => r.json())
 .then(data => { setTemplates(data); setLoading(false) })
 .catch(() => setLoading(false))
 }, [])

 const handleSelectTemplate = async (tpl: Template) => {
 setSelected(tpl)
 setValues({})
 const token = localStorage.getItem('cm_token')
 try {
 const res = await fetch(`/api/v1/templates/${tpl.id}/content`, {
 headers: { Authorization: `Bearer ${token}` },
 })
 const data = await res.json()
 setTemplateContent(data.content)
 } catch {
 setTemplateContent('')
 }
 setStep('fill')
 }

 const filledHtml = () => {
 let html = templateContent
 if (selected) {
 for (const v of selected.variables) {
 const val = values[v.key] || `[${v.label}]`
 html = html.split(`{{${v.key}}}`).join(val)
 }
 }
 return html
 }

 const allFilled = () => {
 if (!selected) return false
 return selected.variables.every(v => (values[v.key] || '').trim() !== '')
 }

 const handleSend = async () => {
 if (!selected || !recipientEmail) return
 setSending(true)
 setSendError('')
 try {
 const token = localStorage.getItem('cm_token')
 const res = await fetch('/api/v1/templates/send', {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 Authorization: `Bearer ${token}`,
 },
 body: JSON.stringify({
 template_id: selected.id,
 contract_name: selected.name,
 contract_html: filledHtml(),
 requestee_email: recipientEmail,
 message: message || null,
 }),
 })
 if (!res.ok) {
 const err = await res.json()
 throw new Error(err.detail ?? '발송 실패')
 }
 onDone(`${recipientEmail}에게 계약서를 발송했습니다.`)
 } catch (e: unknown) {
 setSendError(e instanceof Error ? e.message : '발송 중 오류가 발생했습니다.')
 } finally {
 setSending(false)
 }
 }

 return (
 <div style={{
 position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
 zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center',
 padding: 20,
 }}>
 <div style={{
 background: 'var(--bg-card)', border: '1px solid var(--border)',
 borderRadius: 20, width: '100%',
 maxWidth: step === 'preview' ? 800 : 560,
 maxHeight: '92vh', overflow: 'hidden',
 display: 'flex', flexDirection: 'column',
 }}>
 {/* Header */}
 <div style={{
 display: 'flex', alignItems: 'center', justifyContent: 'space-between',
 padding: '20px 24px', borderBottom: '1px solid var(--border)',
 flexShrink: 0,
 }}>
 <div>
 <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>
 계약서 템플릿 발송
 </h2>
 <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
 {step === 'select' && '템플릿을 선택하세요'}
 {step === 'fill' && `${selected?.icon} ${selected?.name} — 항목 입력`}
 {step === 'preview' && '계약서 미리보기'}
 {step === 'send' && '수신자 정보 입력'}
 </p>
 </div>
 <button onClick={onClose} style={{
 background: 'none', border: 'none', cursor: 'pointer',
 color: 'var(--text-muted)', fontSize: 20, lineHeight: 1,
 }}></button>
 </div>

 {/* Step indicator */}
 <div style={{
 display: 'flex', gap: 0, flexShrink: 0,
 borderBottom: '1px solid var(--border)',
 padding: '0 24px',
 }}>
 {(['select', 'fill', 'preview', 'send'] as Step[]).map((s, i) => {
 const labels = ['템플릿 선택', '내용 입력', '미리보기', '발송']
 const done = ['select', 'fill', 'preview', 'send'].indexOf(step) > i
 const active = step === s
 return (
 <div key={s} style={{
 flex: 1, textAlign: 'center', padding: '10px 4px',
 fontSize: 12, fontWeight: active ? 700 : 500,
 color: active ? 'var(--accent)' : done ? '#16a34a' : 'var(--text-muted)',
 borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
 transition: 'all 0.2s',
 }}>
 {done ? '' : ''}{labels[i]}
 </div>
 )
 })}
 </div>

 {/* Body */}
 <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>

 {/* Step 1: Select */}
 {step === 'select' && (
 <div>
 {loading ? (
 <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>불러오는 중...</p>
 ) : (
 <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
 {templates.map(tpl => (
 <button
 key={tpl.id}
 onClick={() => handleSelectTemplate(tpl)}
 style={{
 display: 'flex', alignItems: 'center', gap: 16,
 background: 'var(--bg)', border: '1.5px solid var(--border)',
 borderRadius: 14, padding: '16px 20px', cursor: 'pointer',
 textAlign: 'left', transition: 'border-color 0.15s',
 }}
 onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
 onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
 >
 <span style={{ fontSize: 32, flexShrink: 0 }}>{tpl.icon}</span>
 <div>
 <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 3 }}>
 {tpl.name}
 </div>
 <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{tpl.description}</div>
 <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 4, fontWeight: 600 }}>
 입력 항목 {tpl.variables.length}개
 </div>
 </div>
 <div style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: 18 }}>›</div>
 </button>
 ))}
 </div>
 )}
 </div>
 )}

 {/* Step 2: Fill variables */}
 {step === 'fill' && selected && (
 <div>
 <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
 계약서의 빈칸을 채워주세요. 모든 항목을 입력해야 미리보기가 가능합니다.
 </p>
 <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
 {selected.variables.map(v => (
 <div key={v.key}>
 <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', display: 'block', marginBottom: 5 }}>
 {v.label} <span style={{ color: 'var(--risk-high)' }}>*</span>
 </label>
 <input
 type="text"
 value={values[v.key] || ''}
 onChange={e => setValues(prev => ({ ...prev, [v.key]: e.target.value }))}
 placeholder={v.placeholder}
 style={{
 width: '100%', padding: '10px 12px', borderRadius: 10, boxSizing: 'border-box',
 border: `1.5px solid ${values[v.key] ? 'var(--accent)' : 'var(--border)'}`,
 background: 'var(--bg)', color: 'var(--text)', fontSize: 14,
 outline: 'none',
 }}
 />
 </div>
 ))}
 </div>
 </div>
 )}

 {/* Step 3: Preview */}
 {step === 'preview' && (
 <div>
 <iframe
 srcDoc={filledHtml()}
 style={{
 width: '100%', height: 500, border: 'none',
 borderRadius: 10, background: '#fff',
 }}
 title="계약서 미리보기"
 sandbox="allow-same-origin"
 />
 </div>
 )}

 {/* Step 4: Send */}
 {step === 'send' && (
 <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
 <div style={{
 background: 'rgba(37,99,235,0.07)', border: '1px solid rgba(37,99,235,0.2)',
 borderRadius: 12, padding: '14px 18px', fontSize: 13,
 color: 'var(--accent)', fontWeight: 600,
 }}>
 {selected?.name} — 계약서가 준비되었습니다.<br/>
 <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>
 수신자에게 서명 요청 이메일이 발송됩니다. (유효기간 14일)
 </span>
 </div>

 <div>
 <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', display: 'block', marginBottom: 5 }}>
 수신자 이메일 <span style={{ color: 'var(--risk-high)' }}>*</span>
 </label>
 <input
 type="email" required
 value={recipientEmail}
 onChange={e => setRecipientEmail(e.target.value)}
 placeholder="recipient@example.com"
 style={{
 width: '100%', padding: '11px 14px', borderRadius: 10, boxSizing: 'border-box',
 border: '1.5px solid var(--border)', background: 'var(--bg)',
 color: 'var(--text)', fontSize: 14,
 }}
 />
 </div>

 <div>
 <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', display: 'block', marginBottom: 5 }}>
 메시지 (선택)
 </label>
 <textarea
 value={message}
 onChange={e => setMessage(e.target.value)}
 placeholder="수신자에게 전달할 메시지를 입력하세요. (계약 검토 요청, 서명 안내 등)"
 rows={4}
 style={{
 width: '100%', padding: '11px 14px', borderRadius: 10, boxSizing: 'border-box',
 border: '1.5px solid var(--border)', background: 'var(--bg)',
 color: 'var(--text)', fontSize: 14, resize: 'vertical',
 }}
 />
 </div>

 {sendError && (
 <div style={{
 background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
 borderRadius: 10, padding: '12px 16px', fontSize: 13,
 color: '#dc2626', fontWeight: 600,
 }}>
 {sendError}
 </div>
 )}
 </div>
 )}
 </div>

 {/* Footer buttons */}
 <div style={{
 display: 'flex', gap: 10, padding: '16px 24px',
 borderTop: '1px solid var(--border)', flexShrink: 0,
 }}>
 {step !== 'select' && (
 <button
 onClick={() => {
 if (step === 'fill') setStep('select')
 else if (step === 'preview') setStep('fill')
 else if (step === 'send') setStep('preview')
 }}
 style={{
 flex: 1, padding: '12px', borderRadius: 12,
 border: '1.5px solid var(--border)', background: 'transparent',
 color: 'var(--text)', fontSize: 14, cursor: 'pointer', fontWeight: 600,
 }}
 >
 ← 이전
 </button>
 )}

 {step === 'select' && (
 <button onClick={onClose} style={{
 flex: 1, padding: '12px', borderRadius: 12,
 border: '1.5px solid var(--border)', background: 'transparent',
 color: 'var(--text)', fontSize: 14, cursor: 'pointer', fontWeight: 600,
 }}>
 취소
 </button>
 )}

 {step === 'fill' && (
 <button
 onClick={() => setStep('preview')}
 disabled={!allFilled()}
 style={{
 flex: 2, padding: '12px', borderRadius: 12, border: 'none',
 background: allFilled() ? 'var(--accent)' : 'var(--border)',
 color: '#fff', fontSize: 14, fontWeight: 700,
 cursor: allFilled() ? 'pointer' : 'not-allowed',
 }}
 >
 미리보기 →
 </button>
 )}

 {step === 'preview' && (
 <button
 onClick={() => setStep('send')}
 style={{
 flex: 2, padding: '12px', borderRadius: 12, border: 'none',
 background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 700,
 cursor: 'pointer',
 }}
 >
 이 계약서로 발송하기 →
 </button>
 )}

 {step === 'send' && (
 <button
 onClick={handleSend}
 disabled={!recipientEmail || sending}
 style={{
 flex: 2, padding: '12px', borderRadius: 12, border: 'none',
 background: recipientEmail ? '#1e3a8a' : 'var(--border)',
 color: '#fff', fontSize: 14, fontWeight: 700,
 cursor: recipientEmail ? 'pointer' : 'not-allowed',
 }}
 >
 {sending ? '발송 중...' : ' 계약서 발송하기'}
 </button>
 )}
 </div>
 </div>
 </div>
 )
}
