import React, { useEffect, useRef, useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator, Alert,
} from 'react-native'
import { WebView } from 'react-native-webview'
import { useRoute, useNavigation } from '@react-navigation/native'
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
  #toolbar { padding: 10px; display: flex; gap: 8px; background: #f8fafc; }
  button { padding: 8px 16px; border-radius: 8px; border: none; cursor: pointer; font-size: 13px; font-weight: 700; }
  #clearBtn { background: #f1f5f9; color: #475569; }
  #saveBtn { background: #1e3a8a; color: #fff; flex: 1; }
  #hint { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%);
    color: #cbd5e1; font-size: 14px; pointer-events: none; text-align: center; }
</style>
</head>
<body>
<div style="flex:1;position:relative;padding:10px;display:flex;flex-direction:column;">
  <canvas id="canvas"></canvas>
  <p id="hint">여기에 서명하세요</p>
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
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#1e293b'
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
    const data = canvas.toDataURL('image/png')
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'signature', data }))
  }

  window.addEventListener('resize', resize)
  resize()
</script>
</body>
</html>`

type RouteParams = { token: string }

export default function SigningScreen() {
  const route = useRoute()
  const navigation = useNavigation()
  const { token } = route.params as RouteParams

  const [info, setInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [signerName, setSignerName] = useState('')
  const [sigData, setSigData] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get(`/signing/public/${token}`)
      .then(res => setInfo(res.data))
      .catch(() => setError('서명 링크를 찾을 수 없거나 만료되었습니다.'))
      .finally(() => setLoading(false))
  }, [token])

  const handleWebViewMessage = (e: any) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data)
      if (msg.type === 'error') Alert.alert('알림', msg.msg)
      if (msg.type === 'signature') setSigData(msg.data)
    } catch {}
  }

  const handleSubmit = async () => {
    if (!signerName.trim()) { Alert.alert('알림', '서명자 이름을 입력해주세요.'); return }
    if (!sigData) { Alert.alert('알림', '서명을 먼저 그려주세요.'); return }
    setSubmitting(true)
    try {
      await api.post(`/signing/public/${token}/sign`, {
        signature_data: sigData,
        signer_name: signerName.trim(),
      })
      setDone(true)
    } catch (e: any) {
      const detail = e?.response?.data?.detail ?? '서명 제출 중 오류가 발생했습니다.'
      Alert.alert('오류', detail)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.primary} size="large" />
      <Text style={styles.loadingText}>서명 정보 불러오는 중...</Text>
    </View>
  )

  if (error) return (
    <View style={styles.center}>
      <Text style={styles.errorIcon}>⚠️</Text>
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backBtnText}>돌아가기</Text>
      </TouchableOpacity>
    </View>
  )

  if (info?.is_expired || info?.status === 'expired') return (
    <View style={styles.center}>
      <Text style={styles.errorIcon}>⏰</Text>
      <Text style={styles.errorText}>서명 링크가 만료되었습니다.</Text>
      <Text style={styles.errorSub}>발송자에게 새 서명 요청을 보내달라고 요청해주세요.</Text>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backBtnText}>돌아가기</Text>
      </TouchableOpacity>
    </View>
  )

  if (info?.status === 'signed' || done) return (
    <View style={styles.center}>
      <Text style={styles.doneIcon}>✅</Text>
      <Text style={styles.doneTitle}>서명이 완료되었습니다</Text>
      <Text style={styles.doneSub}>
        {done
          ? '서명이 저장되었으며, 양측에 완료 알림이 발송됩니다.'
          : '이미 서명이 완료된 문서입니다.'}
      </Text>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backBtnText}>돌아가기</Text>
      </TouchableOpacity>
    </View>
  )

  return (
    <View style={styles.root}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBack}>
          <Text style={styles.headerBackText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>전자서명</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} keyboardShouldPersistTaps="handled">
        {/* 계약서 정보 */}
        <View style={styles.infoCard}>
          <View style={styles.infoBadge}>
            <Text style={styles.infoBadgeText}>📄 서명 요청</Text>
          </View>
          <Text style={styles.contractName}>{info?.contract_name}</Text>
          <Text style={styles.infoFrom}>{info?.requester_name}님이 서명을 요청했습니다</Text>
          {info?.message ? (
            <View style={styles.messageBubble}>
              <Text style={styles.messageText}>{info.message}</Text>
            </View>
          ) : null}
        </View>

        {/* 서명자 이름 */}
        <Text style={styles.label}>서명자 이름 *</Text>
        <TextInput
          style={styles.input}
          placeholder="실명을 입력하세요"
          placeholderTextColor={colors.textMuted}
          value={signerName}
          onChangeText={setSignerName}
          autoCapitalize="words"
        />

        {/* 서명 패드 */}
        <Text style={styles.label}>서명 *</Text>
        <View style={styles.sigPadWrap}>
          {sigData ? (
            <View style={styles.sigDone}>
              <Text style={styles.sigDoneIcon}>✓</Text>
              <Text style={styles.sigDoneText}>서명이 저장되었습니다</Text>
              <TouchableOpacity onPress={() => setSigData(null)} style={styles.sigRedo}>
                <Text style={styles.sigRedoText}>다시 서명</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <WebView
              style={styles.webView}
              source={{ html: SIGNATURE_HTML }}
              onMessage={handleWebViewMessage}
              scrollEnabled={false}
              overScrollMode="never"
              bounces={false}
            />
          )}
        </View>

        {/* 제출 버튼 */}
        <TouchableOpacity
          style={[styles.submitBtn, (!signerName || !sigData || submitting) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!signerName || !sigData || submitting}
        >
          {submitting
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.submitText}>서명 완료 제출</Text>
          }
        </TouchableOpacity>

        <Text style={styles.notice}>
          서명 제출 시 양측에 완료 이메일이 발송됩니다.{'\n'}
          서명은 7일 이내에 완료해야 합니다.
        </Text>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 32 },
  loadingText: { color: colors.textMuted, marginTop: 16, fontSize: 14 },
  errorIcon: { fontSize: 48, marginBottom: 16 },
  errorText: { color: colors.text, fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  errorSub: { color: colors.textMuted, fontSize: 13, textAlign: 'center', marginBottom: 24 },
  doneIcon: { fontSize: 56, marginBottom: 16 },
  doneTitle: { color: '#16a34a', fontSize: 20, fontWeight: '800', marginBottom: 8 },
  doneSub: { color: colors.textMuted, fontSize: 14, textAlign: 'center', marginBottom: 28 },
  backBtn: { backgroundColor: colors.primary, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 },
  backBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 14,
    backgroundColor: colors.bgCard, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerBack: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerBackText: { fontSize: 18, color: colors.textMuted },
  headerTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
  body: { flex: 1 },
  bodyContent: { padding: 20 },
  infoCard: {
    backgroundColor: colors.bgCard, borderRadius: 16,
    padding: 20, marginBottom: 24,
    borderWidth: 1, borderColor: colors.border,
  },
  infoBadge: {
    backgroundColor: 'rgba(37,99,235,0.1)', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 10,
  },
  infoBadgeText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  contractName: { color: colors.text, fontSize: 16, fontWeight: '800', marginBottom: 6 },
  infoFrom: { color: colors.textMuted, fontSize: 13, marginBottom: 4 },
  messageBubble: {
    backgroundColor: 'rgba(37,99,235,0.06)', borderLeftWidth: 3, borderLeftColor: colors.primary,
    borderRadius: 8, padding: 12, marginTop: 12,
  },
  messageText: { color: colors.textSecondary, fontSize: 13, lineHeight: 20 },
  label: { color: colors.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 4 },
  input: {
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, padding: 14, color: colors.text, fontSize: 15, marginBottom: 20,
  },
  sigPadWrap: { height: 240, borderRadius: 12, overflow: 'hidden', marginBottom: 20, borderWidth: 1, borderColor: colors.border },
  webView: { flex: 1 },
  sigDone: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(22,163,74,0.06)',
  },
  sigDoneIcon: { fontSize: 36, marginBottom: 8, color: '#16a34a' },
  sigDoneText: { color: '#16a34a', fontWeight: '700', fontSize: 15, marginBottom: 16 },
  sigRedo: { backgroundColor: colors.bgCard, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.border },
  sigRedoText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  submitBtn: {
    backgroundColor: colors.primary, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginBottom: 16,
  },
  submitBtnDisabled: { opacity: 0.45 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  notice: { color: colors.textMuted, fontSize: 12, textAlign: 'center', lineHeight: 18 },
})
