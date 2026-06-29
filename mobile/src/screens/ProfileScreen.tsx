import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native'
import { useAuth } from '../context/AuthContext'
import { colors } from '../theme/colors'

export default function ProfileScreen() {
  const { user, logout } = useAuth()

  const handleLogout = () => {
    Alert.alert('로그아웃', '로그아웃 하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: logout },
    ])
  }

  const isEnterprise = user?.user_type === 'enterprise'

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>마이페이지</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* 프로필 카드 */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.username?.charAt(0).toUpperCase() ?? '?'}
            </Text>
          </View>
          <Text style={styles.username}>{user?.username}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={[styles.typeBadge, isEnterprise && styles.typeBadgeEnterprise]}>
            <Text style={[styles.typeBadgeText, isEnterprise && styles.typeBadgeTextEnterprise]}>
              {isEnterprise ? '🏢 기업/법인' : '👤 개인 사용자'}
            </Text>
          </View>
        </View>

        {/* 계정 정보 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>계정 정보</Text>
          <View style={styles.infoCard}>
            <InfoRow label="이메일" value={user?.email ?? '-'} />
            <InfoRow label="사용자명" value={user?.username ?? '-'} />
            <InfoRow label="계정 유형" value={isEnterprise ? '기업/법인' : '개인 사용자'} />
          </View>
        </View>

        {/* 플랜 정보 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>현재 플랜</Text>
          <View style={[styles.planCard, isEnterprise && styles.planCardEnterprise]}>
            <Text style={styles.planIcon}>{isEnterprise ? '🏢' : '👤'}</Text>
            <View style={styles.planInfo}>
              <Text style={styles.planName}>{isEnterprise ? '기업 플랜' : '개인 플랜'}</Text>
              <Text style={styles.planDesc}>
                {isEnterprise
                  ? '계약서 분석 · 팀 관리 · 대량 분석 · 리포트 다운로드'
                  : '계약서 분석 · 저장 관리 · AI 챗봇'}
              </Text>
            </View>
          </View>
        </View>

        {/* 기능 목록 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>이용 가능한 기능</Text>
          {FEATURES_PERSONAL.map((f) => (
            <FeatureRow key={f.title} {...f} available />
          ))}
          {isEnterprise && FEATURES_ENTERPRISE.map((f) => (
            <FeatureRow key={f.title} {...f} available />
          ))}
          {!isEnterprise && FEATURES_ENTERPRISE.map((f) => (
            <FeatureRow key={f.title} {...f} available={false} />
          ))}
        </View>

        {/* 로그아웃 */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>로그아웃</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Checkmate v1.0.0</Text>
        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  )
}

function FeatureRow({ icon, title, desc, available }: {
  icon: string; title: string; desc: string; available: boolean
}) {
  return (
    <View style={[styles.featureRow, !available && styles.featureRowDisabled]}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <View style={styles.featureContent}>
        <Text style={[styles.featureTitle, !available && styles.featureTitleDisabled]}>{title}</Text>
        <Text style={styles.featureDesc}>{desc}</Text>
      </View>
      <Text style={available ? styles.featureCheck : styles.featureLock}>
        {available ? '✓' : '🔒'}
      </Text>
    </View>
  )
}

const FEATURES_PERSONAL = [
  { icon: '📄', title: 'AI 계약서 분석', desc: 'Gemini AI 위험 조항 탐지' },
  { icon: '💾', title: '분석 결과 저장', desc: '대시보드에서 이력 관리' },
  { icon: '🤖', title: 'AI 챗봇', desc: '계약 관련 질문 답변' },
]

const FEATURES_ENTERPRISE = [
  { icon: '👥', title: '팀 관리', desc: '멤버 초대 및 권한 설정' },
  { icon: '📊', title: '대량 분석', desc: '여러 계약서 일괄 분석' },
  { icon: '📑', title: '리포트 다운로드', desc: 'PDF 형식 분석 리포트 출력' },
]

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.navBg,
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  content: { padding: 20 },

  profileCard: {
    backgroundColor: colors.bgCard,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 28,
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  avatarText: { color: '#fff', fontSize: 30, fontWeight: '800' },
  username: { color: colors.text, fontSize: 20, fontWeight: '700', marginBottom: 4 },
  email: { color: colors.textMuted, fontSize: 13, marginBottom: 12 },
  typeBadge: {
    backgroundColor: colors.bgInput,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeBadgeEnterprise: {
    backgroundColor: 'rgba(37,99,235,0.08)',
    borderColor: colors.borderAccent,
  },
  typeBadgeText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  typeBadgeTextEnterprise: { color: colors.primary },

  section: { marginBottom: 24 },
  sectionTitle: {
    color: colors.textMuted, fontSize: 11, fontWeight: '700',
    letterSpacing: 1, marginBottom: 10, textTransform: 'uppercase',
  },

  infoCard: {
    backgroundColor: colors.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: { color: colors.textSecondary, fontSize: 14 },
  infoValue: { color: colors.text, fontSize: 14, fontWeight: '600' },

  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 14,
  },
  planCardEnterprise: {
    backgroundColor: 'rgba(37,99,235,0.04)',
    borderColor: colors.borderAccent,
  },
  planIcon: { fontSize: 32 },
  planInfo: { flex: 1 },
  planName: { color: colors.text, fontSize: 15, fontWeight: '700', marginBottom: 3 },
  planDesc: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },

  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  featureRowDisabled: { opacity: 0.45 },
  featureIcon: { fontSize: 22 },
  featureContent: { flex: 1 },
  featureTitle: { color: colors.text, fontSize: 14, fontWeight: '600', marginBottom: 2 },
  featureTitleDisabled: { color: colors.textMuted },
  featureDesc: { color: colors.textMuted, fontSize: 12 },
  featureCheck: { color: colors.safe, fontSize: 16, fontWeight: '700' },
  featureLock: { fontSize: 14 },

  logoutBtn: {
    borderWidth: 1,
    borderColor: 'rgba(217,64,64,0.3)',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  logoutText: { color: colors.danger, fontSize: 15, fontWeight: '600' },
  version: { textAlign: 'center', color: colors.textMuted, fontSize: 12 },
})
