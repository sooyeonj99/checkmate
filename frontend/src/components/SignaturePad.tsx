import { useRef, useEffect, useState, useCallback } from 'react'

interface Props {
 onSave: (dataUrl: string) => void
 height?: number
}

export default function SignaturePad({ onSave, height = 160 }: Props) {
 const canvasRef = useRef<HTMLCanvasElement>(null)
 const drawing = useRef(false)
 const lastPos = useRef({ x: 0, y: 0 })
 const [isEmpty, setIsEmpty] = useState(true)

 const getPos = (e: MouseEvent | Touch, canvas: HTMLCanvasElement) => {
 const rect = canvas.getBoundingClientRect()
 return {
 x: (('clientX' in e ? e.clientX : 0) - rect.left) * (canvas.width / rect.width),
 y: (('clientY' in e ? e.clientY : 0) - rect.top) * (canvas.height / rect.height),
 }
 }

 const startDraw = useCallback((e: MouseEvent | TouchEvent) => {
 e.preventDefault()
 const canvas = canvasRef.current
 if (!canvas) return
 drawing.current = true
 const pos = getPos('touches' in e ? e.touches[0] : e as MouseEvent, canvas)
 lastPos.current = pos
 setIsEmpty(false)
 }, [])

 const draw = useCallback((e: MouseEvent | TouchEvent) => {
 e.preventDefault()
 if (!drawing.current) return
 const canvas = canvasRef.current
 const ctx = canvas?.getContext('2d')
 if (!canvas || !ctx) return
 const pos = getPos('touches' in e ? e.touches[0] : e as MouseEvent, canvas)
 ctx.beginPath()
 ctx.moveTo(lastPos.current.x, lastPos.current.y)
 ctx.lineTo(pos.x, pos.y)
 ctx.stroke()
 lastPos.current = pos
 }, [])

 const stopDraw = useCallback(() => {
 if (!drawing.current) return
 drawing.current = false
 const canvas = canvasRef.current
 if (canvas) onSave(canvas.toDataURL('image/png'))
 }, [onSave])

 const clear = useCallback((e: React.MouseEvent) => {
 e.preventDefault()
 const canvas = canvasRef.current
 const ctx = canvas?.getContext('2d')
 if (!canvas || !ctx) return
 ctx.clearRect(0, 0, canvas.width, canvas.height)
 setIsEmpty(true)
 onSave('')
 }, [onSave])

 useEffect(() => {
 const canvas = canvasRef.current
 if (!canvas) return
 const ctx = canvas.getContext('2d')
 if (!ctx) return

 ctx.strokeStyle = '#1e3a8a'
 ctx.lineWidth = 2.5
 ctx.lineCap = 'round'
 ctx.lineJoin = 'round'

 canvas.addEventListener('mousedown', startDraw)
 canvas.addEventListener('mousemove', draw)
 canvas.addEventListener('mouseup', stopDraw)
 canvas.addEventListener('mouseleave', stopDraw)
 canvas.addEventListener('touchstart', startDraw, { passive: false })
 canvas.addEventListener('touchmove', draw, { passive: false })
 canvas.addEventListener('touchend', stopDraw)

 return () => {
 canvas.removeEventListener('mousedown', startDraw)
 canvas.removeEventListener('mousemove', draw)
 canvas.removeEventListener('mouseup', stopDraw)
 canvas.removeEventListener('mouseleave', stopDraw)
 canvas.removeEventListener('touchstart', startDraw)
 canvas.removeEventListener('touchmove', draw)
 canvas.removeEventListener('touchend', stopDraw)
 }
 }, [startDraw, draw, stopDraw])

 return (
 <div style={{ position: 'relative', userSelect: 'none' }}>
 <canvas
 ref={canvasRef}
 width={920}
 height={height * 2}
 style={{
 border: '1.5px solid var(--border)',
 borderRadius: 12,
 cursor: 'crosshair',
 display: 'block',
 width: '100%',
 height,
 touchAction: 'none',
 background: 'white',
 }}
 />
 <button
 type="button"
 onClick={clear}
 style={{
 position: 'absolute', top: 8, right: 10,
 background: 'none', border: 'none',
 cursor: 'pointer', fontSize: 12,
 color: 'var(--text-muted)',
 }}
 >
 초기화
 </button>
 {isEmpty && (
 <div style={{
 position: 'absolute', top: '50%', left: '50%',
 transform: 'translate(-50%, -50%)',
 color: 'var(--text-muted)', fontSize: 13,
 pointerEvents: 'none', textAlign: 'center',
 }}>
 여기에 서명하세요 (마우스 / 터치)
 </div>
 )}
 </div>
 )
}
