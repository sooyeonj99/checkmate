import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, RefreshControl,
} from 'react-native'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import { colors } from '../theme/colors'

interface SavedContract {
  id: number
  contract_id: string
  filename: string
  contract_type: string
  score: number
  grade: string
  danger_count: number
  warn_count: number
  safe_count: number
  analysis_time: string
  saved_at: string
}

export default function DashboardScreen() {
  const { user } = useAuth()
  const navigation = useNavigation<any>()
  const isEnterprise = user?.user_type === 'enterprise'

  const [saved, setSaved] = useState<SavedContract[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const fetchSaved = useCallback(async () => {
    try {
      const { data } = await api.get('/contracts/saved')
      setSaved(data)
    } catch {
      // 네트워크 오류 시 빈 목록 유지
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  // 화면 포커스 시마다 새로고침 (저장 후 돌아왔을 때)
  useFocusEffect(useCallback(() => {
    setLoading(true)
    fetchSaved()
  }, [fetchSaved]))

  const handleRefresh = () => {
    setRefreshing(true)
    fetchSaved()
  }

  const handleDelete = (item: SavedContract) => {
    Alert.alert(
      '삭제 확인',
      `"${item.filename}" 분석 결과를 삭제할까요?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제', style: 'destructive',
          onPress: async () => {
            setDeletingId(item.id)
            try {
              await api.delete(`/contracts/saved/${item.id}`)
              setSaved((prev) => prev.filter((c) => c.id !== item.id))
            } catch {
              Alert.alert('오류', '삭제 중 문제가 발생했습니다.')
            } finally {
              setDeletingId(null)
            }
          },
        },
      ]
    )
  }

  const handleView = async (item: SavedContract) => {
    try {
      const { data } = await api.get(`/contracts/saved/${item.id}`)
      navigation.navigate('Result', { analysisResult: data, isSaved: true })
    } catch {
      Alert.alert('오류', '결과를 불러올 수 없습니다.')
    }
  }

  const handleLogout = () => {
    navigation.navigate('Profile' as any)
  }

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.logoText}>CHECKMATE</Text>
          <Text style={styles.greeting}>안녕하세요, {user?.username}님</Text>
        </View>
        <TouchableOpacity style={styles.avatar} onPress={() => navigation.navigate('Profile' as any)}>
          <Text style={styles.avatarText}>
            {user?.username?.charAt(0).toUpperCase() ?? '?'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
      >
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

        {/* 저장된 AI 분석 결과 */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>저장된 AI 분석 결과</Text>
          {saved.length > 0 && (
            <Text style={styles.sectionCount}>{saved.length}건</Text>
          )}
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>불러오는 중...</Text>
          </View>
        ) : saved.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>저장된 분석 결과가 없습니다</Text>
            <Text style={styles.emptySub}>계약서 분석 후 결과 저장을 선택하면{'\n'}여기서 다시 확인할 수 있습니다</Text>
          </View>
        ) : (
          saved.map((item) => {
            const gradeColor =
              item.grade === '위험' ? colors.danger :
              item.grade === '주의' ? colors.warn : colors.safe
            const date = new Date(item.saved_at).toLocaleDateString('ko-KR', {
              year: 'numeric', month: 'long', day: 'numeric',
            })
            return (
              <View key={item.id} style={styles.savedCard}>
                <View style={styles.savedCardTop}>
                  <View style={styles.savedTypeBadge}>
                    <Text style={styles.savedTypeText}>{item.contract_type}</Text>
                  </View>
                  <Text style={[styles.savedGrade, { color: gradeColor }]}>{item.grade}</Text>
                </View>

                <Text style={styles.savedFilename} numberOfLines={2}>{item.filename}</Text>

                <View style={styles.savedScoreRow}>
                  <Text style={styles.savedScoreLabel}>위험도 </Text>
                  <Text style={[styles.savedScoreNum, { color: gradeColor }]}>{item.score}점</Text>
                </View>

                <View style={styles.savedCounts}>
                  <View style={[styles.countBadge, { backgroundColor: 'rgba(239,68,68,0.1)' }]}>
                    <Text style={[styles.countText, { color: colors.danger }]}>{item.danger_count} 위험</Text>
                  </View>
                  <View style={[styles.countBadge, { backgroundColor: 'rgba(245,158,11,0.1)' }]}>
                    <Text style={[styles.countText, { color: colors.warn }]}>{item.warn_count} 주의</Text>
                  </View>
                  <View style={[styles.countBadge, { backgroundColor: 'rgba(34,197,94,0.1)' }]}>
                    <Text style={[styles.countText, { color: colors.safe }]}>{item.safe_count} 안전</Text>
                  </View>
                </View>

                <Text style={styles.savedDate}>{date} 저장</Text>

                <View style={styles.savedActions}>
                  <TouchableOpacity style={styles.viewBtn} onPress={() => handleView(item)}>
                    <Text style={styles.viewBtnText}>결과 보기</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDelete(item)}
                    disabled={deletingId === item.id}
                  >
                    {deletingId === item.id
                      ? <ActivityIndicator size="small" color={colors.danger} />
                      : <Text style={styles.deleteBtnText}>삭제</Text>
                    }
                  </TouchableOpacity>
                </View>
              </View>
            )
          })
        )}

        {/* 서비스 특징 */}
        <Text style={[styles.sectionTitle, { marginTop: 28 }]}>
          {isEnterprise ? '기업 전용 기능' : '서비스 특징'}
        </Text>
        {(isEnterprise ? FEATURES_ENTERPRISE : FEATURES_PERSONAL).map((f) => (
          <View key={f.title} style={[styles.featureCard, f.comingSoon && styles.featureCardDim]}>
            <Text style={styles.featureIcon}>{f.icon}</Text>
            <View style={styles.featureText}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                {f.comingSoon && (
                  <View style={styles.comingSoonBadge}>
                    <Text style={styles.comingSoonText}>준비중</Text>
                  </View>
                )}
              </View>
              <Text style={styles.featureSub}>{f.sub}</Text>
            </View>
          </View>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  )
}

const FEATURES_PERSONAL = [
  { icon: '🔍', title: 'AI 위험 조항 탐지', sub: 'Gemini AI가 불리한 조항을 자동으로 찾아드립니다', comingSoon: false },
  { icon: '🔒', title: '개인정보 마스킹', sub: '계약서 내 개인정보를 자동으로 보호합니다', comingSoon: false },
  { icon: '📋', title: '판례 기반 대안 제시', sub: '법적 근거를 바탕으로 수정 제안을 드립니다', comingSoon: false },
  { icon: '⚡', title: '빠른 분석', sub: '평균 30초 이내에 분석 결과를 받아보세요', comingSoon: false },
]

const FEATURES_ENTERPRISE = [
  { icon: '🔍', title: 'AI 위험 조항 탐지', sub: 'Gemini AI가 불리한 조항을 자동으로 찾아드립니다', comingSoon: false },
  { icon: '👥', title: '팀 관리', sub: '멤버 초대 및 역할 기반 접근 권한 설정', comingSoon: true },
  { icon: '📊', title: '대량 분석', sub: '여러 계약서를 동시에 일괄 분석', comingSoon: true },
  { icon: '📑', title: '리포트 다운로드', sub: 'PDF 형식의 상세 분석 리포트 출력', comingSoon: true },
]

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 20,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  logoText: { color: colors.primary, fontWeight: '800', fontSize: 16, letterSpacing: 1.5 },
  greeting: { color: colors.textSecondary, fontSize: 13, marginTop: 2 },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  scroll: { flex: 1 },
  scrollContent: { padding: 20 },
  analyzeCard: {
    backgroundColor: colors.bgCard, borderRadius: 16, padding: 24,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center', marginBottom: 28,
  },
  analyzeCardIcon: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: 'rgba(79,142,247,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  analyzeCardIconText: { fontSize: 32 },
  analyzeCardTitle: { color: colors.text, fontSize: 20, fontWeight: '700', marginBottom: 8 },
  analyzeCardSub: { color: colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  analyzeCardBtn: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 28 },
  analyzeCardBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { color: colors.textMuted, fontSize: 12, fontWeight: '600', letterSpacing: 1 },
  sectionCount: {
    backgroundColor: 'rgba(79,142,247,0.15)', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 2,
    color: colors.primary, fontSize: 12, fontWeight: '700',
  },
  loadingBox: { alignItems: 'center', paddingVertical: 32, gap: 10 },
  loadingText: { color: colors.textMuted, fontSize: 13 },
  emptyBox: {
    backgroundColor: colors.bgCard, borderRadius: 14, borderWidth: 1,
    borderColor: colors.border, borderStyle: 'dashed',
    padding: 32, alignItems: 'center', gap: 8, marginBottom: 8,
  },
  emptyIcon: { fontSize: 36 },
  emptyTitle: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
  emptySub: { color: colors.textMuted, fontSize: 12, textAlign: 'center', lineHeight: 18 },
  savedCard: {
    backgroundColor: colors.bgCard, borderRadius: 14, borderWidth: 1,
    borderColor: colors.border, padding: 16, marginBottom: 12,
  },
  savedCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  savedTypeBadge: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
  },
  savedTypeText: { color: colors.textMuted, fontSize: 11 },
  savedGrade: { fontSize: 12, fontWeight: '700' },
  savedFilename: { color: colors.text, fontSize: 14, fontWeight: '600', marginBottom: 8, lineHeight: 20 },
  savedScoreRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 8 },
  savedScoreLabel: { color: colors.textMuted, fontSize: 12 },
  savedScoreNum: { fontSize: 20, fontWeight: '800' },
  savedCounts: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  countBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  countText: { fontSize: 11, fontWeight: '600' },
  savedDate: { color: colors.textMuted, fontSize: 11, marginBottom: 12 },
  savedActions: { flexDirection: 'row', gap: 8 },
  viewBtn: {
    flex: 1, backgroundColor: colors.primary, borderRadius: 9,
    paddingVertical: 10, alignItems: 'center',
  },
  viewBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  deleteBtn: {
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)',
    borderRadius: 9, paddingVertical: 10, paddingHorizontal: 18, alignItems: 'center',
  },
  deleteBtnText: { color: colors.danger, fontWeight: '600', fontSize: 13 },
  featureCard: {
    flexDirection: 'row', backgroundColor: colors.bgCard, borderRadius: 12,
    padding: 16, marginBottom: 10, borderWidth: 1, borderColor: colors.border, alignItems: 'center',
  },
  featureCardDim: { opacity: 0.55 },
  featureIcon: { fontSize: 24, marginRight: 14 },
  featureText: { flex: 1 },
  featureTitle: { color: colors.text, fontSize: 14, fontWeight: '600', marginBottom: 3 },
  featureSub: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },
  comingSoonBadge: {
    backgroundColor: 'rgba(37,99,235,0.1)', borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  comingSoonText: { color: colors.primary, fontSize: 10, fontWeight: '700' },
})
