import React, { useState, useEffect, useRef } from 'react'
import { View, Text, StyleSheet, Animated, Alert } from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import api from '../services/api'
import { colors } from '../theme/colors'
import { useAuth } from '../context/AuthContext'

const STEPS = [
  { label: '업로드 완료', sub: '파일을 수신했습니다', duration: 2000 },
  { label: '텍스트 추출 중', sub: 'OCR 엔진이 계약서를 읽고 있습니다', duration: 8000 },
  { label: '위험 조항 분석 중', sub: 'AI가 각 조항의 위험도를 판단 중입니다 (최대 2분)', duration: 80000 },
  { label: '리포트 생성 중', sub: '분석 결과를 정리하고 있습니다', duration: 5000 },
]

export default function LoadingScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute<any>()
  const { contractId, selectedIds, userType } = route.params ?? {}
  const { user } = useAuth()

  const [stepIndex, setStepIndex] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const progressAnim = useRef(new Animated.Value(0)).current
  const pulseAnim = useRef(new Animated.Value(1)).current

  // Pulse animation
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start()
  }, [])

  // Progress animation
  useEffect(() => {
    const targets = [18, 45, 78, 97]
    Animated.timing(progressAnim, {
      toValue: targets[stepIndex] ?? 97,
      duration: 800,
      useNativeDriver: false,
    }).start()
  }, [stepIndex])

  // Step advancement
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []
    let total = 0
    STEPS.forEach((step, i) => {
      if (i === 0) return
      total += STEPS[i - 1].duration
      timers.push(setTimeout(() => setStepIndex(i), total))
    })
    return () => timers.forEach(clearTimeout)
  }, [])

  // Elapsed counter
  useEffect(() => {
    const id = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(id)
  }, [])

  // API call — navigate only on success
  const resultRef = useRef<any>(null)
  const hasError = useRef(false)
  const apiDone = useRef(false)
  const minAnimDone = useRef(false)

  const tryNavigate = () => {
    if (apiDone.current && minAnimDone.current && !hasError.current) {
      navigation.replace('Result', { analysisResult: resultRef.current, contractId })
    }
  }

  // 최소 2초 대기 후 바로 이동 가능
  useEffect(() => {
    const timer = setTimeout(() => {
      minAnimDone.current = true
      tryNavigate()
    }, 2000)
    return () => clearTimeout(timer)
  }, [])

  // WebSocket — 분석 완료 실시간 수신
  useEffect(() => {
    if (!user?.id || !contractId) return
    const WS_BASE = 'ws://101.79.25.139/api/v1/ws'
    const ws = new WebSocket(`${WS_BASE}/${user.id}`)
    ws.onmessage = (e: WebSocketMessageEvent) => {
      try {
        const msg = JSON.parse(e.data)
        if (msg.type === 'analysis_done' && msg.contract_id === contractId) {
          apiDone.current = true
          tryNavigate()
        }
      } catch {}
    }
    return () => ws.close()
  }, [user?.id, contractId])

  useEffect(() => {
    if (!contractId) {
      navigation.getParent()?.navigate('대시보드')
      return
    }
    api.post(
      `/contracts/${contractId}/analyze`,
      {
        ...(selectedIds != null ? { selected_ids: selectedIds } : {}),
        ...(userType ? { user_type: userType } : {}),
      },
      { timeout: 120000 }
    )
      .then(({ data }) => { resultRef.current = data })
      .catch((e: any) => {
        hasError.current = true
        const isTimeout = e?.code === 'ECONNABORTED' || e?.message?.includes('timeout')
        const msg = isTimeout
          ? 'AI 분석 시간이 초과되었습니다. (최대 2분)\n잠시 후 다시 시도해주세요.'
          : (e?.response?.data?.detail ?? '분석 중 오류가 발생했습니다.\n백엔드 서버가 실행 중인지 확인해 주세요.')
        Alert.alert('분석 실패', msg, [
          { text: '돌아가기', onPress: () => navigation.getParent()?.navigate('대시보드') },
        ])
      })
      .finally(() => { apiDone.current = true; tryNavigate() })
  }, [])

  return (
    <View style={styles.root}>
      <View style={styles.bgGlow} />

      {/* Logo */}
      <Text style={styles.logo}>CHECKMATE</Text>

      {/* Pulse ring */}
      <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulseAnim }] }]}>
        <View style={styles.innerRing}>
          <Text style={styles.shieldIcon}>✓</Text>
          <Text style={styles.progressPct}>
            {Math.round((progressAnim as any)._value ?? 0)}%
          </Text>
          <Text style={styles.progressLabel}>분석 진행</Text>
        </View>
      </Animated.View>

      {/* Step dots */}
      <View style={styles.stepsRow}>
        {STEPS.map((_, i) => (
          <React.Fragment key={i}>
            <View style={[
              styles.stepDot,
              i < stepIndex && styles.stepDotDone,
              i === stepIndex && styles.stepDotActive,
            ]}>
              <Text style={styles.stepDotText}>{i < stepIndex ? '✓' : i + 1}</Text>
            </View>
            {i < STEPS.length - 1 && (
              <View style={[styles.stepConnector, i < stepIndex && styles.stepConnectorDone]} />
            )}
          </React.Fragment>
        ))}
      </View>

      {/* Current step message */}
      <Text style={styles.stepLabel}>{STEPS[stepIndex]?.label}</Text>
      <Text style={styles.stepSub}>{STEPS[stepIndex]?.sub}</Text>

      {/* Time info */}
      <View style={styles.timeBox}>
        <View style={styles.timeItem}>
          <Text style={styles.timeValue}>{elapsed}s</Text>
          <Text style={styles.timeLabel}>경과 시간</Text>
        </View>
        <View style={styles.timeDivider} />
        <View style={styles.timeItem}>
          <Text style={[styles.timeValue, { color: colors.safe }]}>
            {stepIndex + 1}/{STEPS.length}
          </Text>
          <Text style={styles.timeLabel}>현재 단계</Text>
        </View>
      </View>

      <Text style={styles.privacy}>🔒 분석 완료 후 파일이 즉시 삭제됩니다</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 24 },
  bgGlow: {
    position: 'absolute', width: 300, height: 300, borderRadius: 150,
    backgroundColor: 'rgba(79,142,247,0.08)', top: '20%',
  },
  logo: { color: colors.primary, fontSize: 16, fontWeight: '800', letterSpacing: 2, marginBottom: 40 },
  pulseRing: {
    width: 180, height: 180, borderRadius: 90,
    borderWidth: 2, borderColor: 'rgba(79,142,247,0.3)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 36,
  },
  innerRing: {
    width: 150, height: 150, borderRadius: 75,
    backgroundColor: 'rgba(79,142,247,0.1)',
    borderWidth: 1, borderColor: 'rgba(79,142,247,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  shieldIcon: { color: colors.primary, fontSize: 28, marginBottom: 4 },
  progressPct: { color: colors.text, fontSize: 26, fontWeight: '800' },
  progressLabel: { color: colors.textMuted, fontSize: 12 },
  stepsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  stepDot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.bgCard,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  stepDotActive: { borderColor: colors.primary, backgroundColor: 'rgba(79,142,247,0.2)' },
  stepDotDone: { backgroundColor: colors.primary, borderColor: colors.primary },
  stepDotText: { color: colors.text, fontSize: 11, fontWeight: '700' },
  stepConnector: { width: 24, height: 1, backgroundColor: colors.border },
  stepConnectorDone: { backgroundColor: colors.primary },
  stepLabel: { color: colors.text, fontSize: 17, fontWeight: '700', marginBottom: 6 },
  stepSub: { color: colors.textMuted, fontSize: 13, textAlign: 'center', marginBottom: 32 },
  timeBox: {
    flexDirection: 'row',
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 20,
    width: '100%',
    justifyContent: 'space-around',
  },
  timeItem: { alignItems: 'center' },
  timeValue: { color: colors.primary, fontSize: 18, fontWeight: '700' },
  timeLabel: { color: colors.textMuted, fontSize: 11, marginTop: 3 },
  timeDivider: { width: 1, backgroundColor: colors.border },
  privacy: { color: colors.textMuted, fontSize: 12 },
})
