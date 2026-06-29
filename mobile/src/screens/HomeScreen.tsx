import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useAuth } from '../context/AuthContext'
import { colors } from '../theme/colors'

export default function HomeScreen() {
  const navigation = useNavigation<any>()
  const { user } = useAuth()

  const features = [
    { icon: '🔍', title: 'AI 위험 조항 탐지', desc: 'Gemini AI가 불리한 조항을 자동으로 찾아드립니다' },
    { icon: '🔒', title: '개인정보 자동 마스킹', desc: '계약서 내 개인정보를 분석 전 자동으로 보호합니다' },
    { icon: '📋', title: '판례 기반 대안 제시', desc: '법적 근거를 바탕으로 수정 제안을 드립니다' },
    { icon: '🖼️', title: '이미지 계약서 지원', desc: 'JPG·PNG 사진도 AI가 텍스트로 인식 후 분석합니다' },
  ]

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {/* 헤더 */}
      <View style={styles.hero}>
        <View style={styles.logoRow}>
          <View style={styles.logoIcon}><Text style={styles.logoCheck}>✓</Text></View>
          <Text style={styles.logoText}>CHECKMATE</Text>
        </View>
        <Text style={styles.heroTitle}>
          안녕하세요, {user?.username}님{'\n'}
          <Text style={{ color: colors.primary }}>계약서를 분석</Text>해드릴게요
        </Text>
        <Text style={styles.heroSub}>AI가 위험 조항을 30초 안에 찾아드립니다</Text>
      </View>

      {/* 빠른 시작 */}
      <TouchableOpacity
        style={styles.ctaBtn}
        onPress={() => navigation.navigate('분석하기')}
        activeOpacity={0.85}
      >
        <Text style={styles.ctaIcon}>📄</Text>
        <View style={styles.ctaText}>
          <Text style={styles.ctaTitle}>계약서 분석 시작</Text>
          <Text style={styles.ctaSub}>PDF · DOCX · JPG · PNG · 여러 장 동시 가능</Text>
        </View>
        <Text style={styles.ctaArrow}>→</Text>
      </TouchableOpacity>

      {/* 대시보드 바로가기 */}
      <TouchableOpacity
        style={styles.dashBtn}
        onPress={() => navigation.navigate('대시보드')}
        activeOpacity={0.85}
      >
        <Text style={styles.dashIcon}>📊</Text>
        <View style={styles.ctaText}>
          <Text style={[styles.ctaTitle, { color: colors.text }]}>저장된 분석 결과 보기</Text>
          <Text style={styles.ctaSub}>대시보드에서 이전 분석을 확인하세요</Text>
        </View>
        <Text style={[styles.ctaArrow, { color: colors.textMuted }]}>→</Text>
      </TouchableOpacity>

      {/* 서비스 특징 */}
      <Text style={styles.sectionTitle}>서비스 특징</Text>
      {features.map(f => (
        <View key={f.title} style={styles.featureCard}>
          <Text style={styles.featureIcon}>{f.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.featureTitle}>{f.title}</Text>
            <Text style={styles.featureDesc}>{f.desc}</Text>
          </View>
        </View>
      ))}

      {/* 안전 안내 */}
      <View style={styles.safeCard}>
        <Text style={styles.safeTitle}>🔒 개인정보 보호</Text>
        <Text style={styles.safeDesc}>
          업로드된 파일은 분석 후 즉시 삭제됩니다.{'\n'}
          계약 내용은 저장·공유·AI 학습에 사용되지 않습니다.
        </Text>
      </View>

      <View style={{ height: 24 }} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20 },
  hero: { alignItems: 'center', paddingVertical: 28 },
  logoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  logoIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  logoCheck: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  logoText: { fontSize: 22, fontWeight: '800', color: colors.primary, letterSpacing: 2 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: colors.text, textAlign: 'center', lineHeight: 32, marginBottom: 8 },
  heroSub: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: colors.primary, borderRadius: 16, padding: 20, marginBottom: 12,
  },
  ctaIcon: { fontSize: 28 },
  ctaText: { flex: 1 },
  ctaTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 3 },
  ctaSub: { color: 'rgba(255,255,255,0.75)', fontSize: 12 },
  ctaArrow: { color: 'rgba(255,255,255,0.8)', fontSize: 20, fontWeight: '300' },
  dashBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: colors.bgCard, borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: colors.border, marginBottom: 28,
  },
  dashIcon: { fontSize: 28 },
  sectionTitle: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 12 },
  featureCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 14,
    backgroundColor: colors.bgCard, borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: colors.border, marginBottom: 10,
  },
  featureIcon: { fontSize: 24 },
  featureTitle: { color: colors.text, fontSize: 14, fontWeight: '700', marginBottom: 3 },
  featureDesc: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },
  safeCard: {
    backgroundColor: 'rgba(46,139,46,0.06)', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(46,139,46,0.2)', padding: 16, marginTop: 8,
  },
  safeTitle: { color: colors.safe, fontSize: 13, fontWeight: '700', marginBottom: 6 },
  safeDesc: { color: colors.textSecondary, fontSize: 12, lineHeight: 18 },
})
