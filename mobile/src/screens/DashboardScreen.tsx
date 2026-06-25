import React from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useAuth } from '../context/AuthContext'
import { colors } from '../theme/colors'

export default function DashboardScreen() {
  const { user, logout } = useAuth()
  const navigation = useNavigation<any>()

  const handleLogout = () => {
    Alert.alert('로그아웃', '로그아웃 하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: logout },
    ])
  }

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.logoText}>CHECKMATE</Text>
          <Text style={styles.greeting}>안녕하세요, {user?.username}님</Text>
        </View>
        <TouchableOpacity style={styles.avatar} onPress={handleLogout}>
          <Text style={styles.avatarText}>
            {user?.username?.charAt(0).toUpperCase() ?? '?'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* 분석 시작 카드 */}
        <TouchableOpacity
          style={styles.analyzeCard}
          onPress={() => navigation.navigate('Upload')}
          activeOpacity={0.85}
        >
          <View style={styles.analyzeCardIcon}>
            <Text style={styles.analyzeCardIconText}>📄</Text>
          </View>
          <Text style={styles.analyzeCardTitle}>계약서 분석 시작</Text>
          <Text style={styles.analyzeCardSub}>
            PDF 또는 DOCX 파일을 업로드하여{'\n'}AI 분석을 받아보세요
          </Text>
          <View style={styles.analyzeCardBtn}>
            <Text style={styles.analyzeCardBtnText}>파일 업로드 →</Text>
          </View>
        </TouchableOpacity>

        {/* 서비스 소개 */}
        <Text style={styles.sectionTitle}>서비스 특징</Text>
        {FEATURES.map((f) => (
          <View key={f.title} style={styles.featureCard}>
            <Text style={styles.featureIcon}>{f.icon}</Text>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>{f.title}</Text>
              <Text style={styles.featureSub}>{f.sub}</Text>
            </View>
          </View>
        ))}

        {/* 하단 여백 */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  )
}

const FEATURES = [
  { icon: '🔍', title: 'AI 위험 조항 탐지', sub: 'Gemini AI가 불리한 조항을 자동으로 찾아드립니다' },
  { icon: '🔒', title: '개인정보 마스킹', sub: '계약서 내 개인정보를 자동으로 보호합니다' },
  { icon: '📋', title: '판례 기반 대안 제시', sub: '법적 근거를 바탕으로 수정 제안을 드립니다' },
  { icon: '⚡', title: '빠른 분석', sub: '평균 30초 이내에 분석 결과를 받아보세요' },
]

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  logoText: { color: colors.primary, fontWeight: '800', fontSize: 16, letterSpacing: 1.5 },
  greeting: { color: colors.textSecondary, fontSize: 13, marginTop: 2 },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  scroll: { flex: 1 },
  scrollContent: { padding: 20 },
  analyzeCard: {
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    marginBottom: 28,
  },
  analyzeCardIcon: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: 'rgba(79,142,247,0.15)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  analyzeCardIconText: { fontSize: 32 },
  analyzeCardTitle: { color: colors.text, fontSize: 20, fontWeight: '700', marginBottom: 8 },
  analyzeCardSub: { color: colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  analyzeCardBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 28,
  },
  analyzeCardBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  sectionTitle: { color: colors.textMuted, fontSize: 12, fontWeight: '600', letterSpacing: 1, marginBottom: 12 },
  featureCard: {
    flexDirection: 'row',
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  featureIcon: { fontSize: 24, marginRight: 14 },
  featureText: { flex: 1 },
  featureTitle: { color: colors.text, fontSize: 14, fontWeight: '600', marginBottom: 3 },
  featureSub: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },
})
