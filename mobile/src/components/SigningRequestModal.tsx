import React, { useRef, useState } from 'react'
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native'
import { WebView } from 'react-native-webview'
import { colors } from '../theme/colors'
import api from '../services/api'

const SIGNATURE_HTML = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #f8fafc; display: flex; flex-direction: column; height: 100vh; }
  #canvas { border: 2px dashed #cbd5e1; border-radius: 10px;
    background: #fff; cursor: crosshair; touch-action: none;
    width: 100%; flex: 1; display: block; }
  #toolbar { padding: 8px; display: flex; gap: 8px; background: #f8fafc; }
  button { padding: 8px 14px; border-radius: 8px; border: none; cursor: pointer; font-size: 12px; font-weight: 700; }
  #clearBtn { background: #f1f5f9; color: #475569; }
  #saveBtn { background: #1e3a8a; color: #fff; flex: 1; }
  #hint { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%);
    color: #cbd5e1; font-size: 13px; pointer-events: none; text-align: center; }
</style>
</head>
<body>
<div style="flex:1;position:relative;padding:8px;display:flex;flex-direction:column;">
  <canvas id="canvas"></canvas>
  <p id="hint">여기에 내 서명을 그리세요</p>
</div>
<div id="toolbar">
  <button id="clearBtn" onclick="clear()">초기화</button>
  <button id="saveBtn" onclick="save()">서명 저장</button>
</div>
<script>
  const canvas = document.getElementById('canvas')
  const hint = document.getElementById('hint')
  const ctx = canvas.getContext('2d')
  let drawing = false, hasStroke = false
  function resize() {
    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    canvas.width = rect.width * dpr; canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr); ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.strokeStyle = '#1e293b'
  }
  function pos(e) {
    const r = canvas.getBoundingClientRect()
    const src = e.touches ? e.touches[0] : e
    return [src.clientX - r.left, src.clientY - r.top]
  }
  canvas.addEventListener('mousedown', e => { drawing = true; ctx.beginPath(); ctx.moveTo(...pos(e)) })
  canvas.addEventListener('mousemove', e => { if (!drawing) return; hasStroke = true; hint.style.display = 'none'; ctx.lineTo(...pos(e)); ctx.stroke() })
  canvas.addEventListener('mouseup', () => drawing = false)
  canvas.addEventListener('touchstart', e => { e.preventDefault(); drawing = true; ctx.beginPath(); ctx.moveTo(...pos(e)) }, { passive: false })
  canvas.addEventListener('touchmove', e => { e.preventDefault(); if (!drawing) return; hasStroke = true; hint.style.display = 'none'; ctx.lineTo(...pos(e)); ctx.stroke() }, { passive: false })
  canvas.addEventListener('touchend', () => drawing = false)
  function clear() { ctx.clearRect(0, 0, canvas.width, canvas.height); hasStroke = false; hint.style.display = '' }
  function save() {
    if (!hasStroke) { window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', msg: '서명을 먼저 그려주세요.' })); return }
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'signature', data: canvas.toDataURL('image/png') }))
  }
  window.addEventListener('resize', resize); resize()
</script>
</body>
</html>`

interface Props {
  visible: boolean
  contractId: string
  contractName: string
  onClose: () => void
  onDone: (msg: string) => void
}

export default function SigningRequestModal({ visible, contractId, contractName, onClose, onDone }: Props) {
  const [contactType, setContactType] = useState<'email' | 'phone'>('email')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [showSigPad, setShowSigPad] = useState(false)
  const [mySig, setMySig] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const formatPhone = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 11)
    if (d.length <= 3) return d
    if (d.length <= 7) return `${d.slice(0, 3)}-${d.slice(3)}`
    return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`
  }

  const reset = () => {
    setContactType('email'); setEmail(''); setPhone('')
    setMessage(''); setShowSigPad(false); setMySig(null); setLoading(false)
  }

  const handleClose = () => { reset(); onClose() }

  const canSubmit = contactType === 'email'
    ? email.includes('@')
    : phone.replace(/\D/g, '').length >= 10

  const handleSubmit = async () => {
    if (!canSubmit) return
    setLoading(true)
    try {
      const body: Record<string, string | null> = {
        contract_id: contractId,
        contract_name: contractName,
        message: message.trim() || null,
        my_signature: mySig || null,
      }
      if (contactType === 'email') body.requestee_email = email.trim()
      else body.requestee_phone = phone.replace(/\D/g, '')

      await api.post('/signing/request', body)
      const target = contactType === 'email' ? email : phone
      reset()
      onDone(contactType === 'email'
        ? `${target}으로 서명 요청 메일을 발송했습니다.`
        : `${target}으로 서명 요청 SMS를 발송했습니다.`)
    } catch (e: any) {
      const msg = e?.response?.data?.detail ?? '서명 요청 중 오류가 발생했습니다.'
      alert(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleWebViewMessage = (e: any) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data)
      if (msg.type === 'error') alert(msg.msg)
      if (msg.type === 'signature') { setMySig(msg.data); setShowSigPad(false) }
    } catch {}
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={styles.sheet}>
          {/* 핸들 */}
          <View style={styles.handle} />

          {/* 헤더 */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>서명 요청 보내기</Text>
              <Text style={styles.subtitle} numberOfLines={1}>{contractName}</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

            {/* 이메일 / 전화번호 토글 */}
            <View style={styles.toggleRow}>
              {(['email', 'phone'] as const).map((ct) => (
                <TouchableOpacity
                  key={ct}
                  style={[styles.toggleBtn, contactType === ct && styles.toggleBtnActive]}
                  onPress={() => setContactType(ct)}
                >
                  <Text style={[styles.toggleBtnText, contactType === ct && styles.toggleBtnTextActive]}>
                    {ct === 'email' ? '📧 이메일' : '📱 전화번호'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* 연락처 입력 */}
            <Text style={styles.label}>
              {contactType === 'email' ? '상대방 이메일 *' : '상대방 전화번호 *'}
            </Text>
            {contactType === 'email' ? (
              <TextInput
                style={styles.input}
                placeholder="counterparty@email.com"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            ) : (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="010-0000-0000"
                  placeholderTextColor={colors.textMuted}
                  value={phone}
                  onChangeText={(v) => setPhone(formatPhone(v))}
                  keyboardType="phone-pad"
                  maxLength={13}
                />
                <Text style={styles.hint}>
                  앱 설치 사용자: 푸시 알림 · 미설치 사용자: 앱 다운로드 링크 SMS 발송
                </Text>
              </>
            )}

            {/* 메시지 */}
            <Text style={[styles.label, { marginTop: 14 }]}>전달 메시지 (선택)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="상대방에게 전달할 메시지를 입력하세요..."
              placeholderTextColor={colors.textMuted}
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            {/* 내 서명 (선택) */}
            <TouchableOpacity
              style={styles.sigToggleBtn}
              onPress={() => setShowSigPad(!showSigPad)}
            >
              <Text style={styles.sigToggleBtnText}>
                {mySig ? '✅ 내 서명 완료 (탭해서 다시 서명)' : `✏️ 내 서명 추가 (선택)`}
              </Text>
            </TouchableOpacity>

            {showSigPad && (
              <View style={styles.sigPadWrap}>
                <WebView
                  source={{ html: SIGNATURE_HTML }}
                  style={styles.sigPad}
                  onMessage={handleWebViewMessage}
                  scrollEnabled={false}
                  javaScriptEnabled
                />
              </View>
            )}

            {/* 발송 버튼 */}
            <TouchableOpacity
              style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={!canSubmit || loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.submitBtnText}>
                    {contactType === 'email' ? '서명 요청 메일 발송' : '서명 요청 SMS 발송'}
                  </Text>
              }
            </TouchableOpacity>

            <View style={{ height: 32 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingBottom: 20,
    maxHeight: '92%',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.border, alignSelf: 'center', marginTop: 12, marginBottom: 4,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 18,
  },
  title: { color: colors.text, fontSize: 17, fontWeight: '800' },
  subtitle: { color: colors.textMuted, fontSize: 12, marginTop: 3, maxWidth: 260 },
  closeBtn: { padding: 4 },
  closeBtnText: { color: colors.textMuted, fontSize: 18 },
  scroll: { flex: 1 },
  toggleRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  toggleBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    backgroundColor: colors.bg, borderWidth: 1.5, borderColor: colors.border,
    alignItems: 'center',
  },
  toggleBtnActive: { backgroundColor: 'rgba(37,99,235,0.1)', borderColor: colors.primary },
  toggleBtnText: { color: colors.textSecondary, fontWeight: '700', fontSize: 13 },
  toggleBtnTextActive: { color: colors.primary },
  label: { color: colors.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: {
    backgroundColor: colors.bg, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 10, padding: 12, color: colors.text, fontSize: 14,
    marginBottom: 4,
  },
  textArea: { height: 80, marginBottom: 0 },
  hint: { color: colors.textMuted, fontSize: 11, marginTop: 4, marginBottom: 4, lineHeight: 16 },
  sigToggleBtn: {
    marginTop: 14, padding: 12, borderRadius: 10, borderWidth: 1.5,
    borderColor: colors.border, borderStyle: 'dashed', alignItems: 'center',
  },
  sigToggleBtnText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  sigPadWrap: {
    marginTop: 10, height: 200, borderRadius: 12,
    overflow: 'hidden', borderWidth: 1, borderColor: colors.border,
  },
  sigPad: { flex: 1 },
  submitBtn: {
    marginTop: 20, backgroundColor: colors.primary, borderRadius: 12,
    paddingVertical: 15, alignItems: 'center',
  },
  submitBtnDisabled: { backgroundColor: colors.border },
  submitBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
})
