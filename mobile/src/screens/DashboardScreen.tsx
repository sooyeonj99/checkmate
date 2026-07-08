import React, { useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, RefreshControl, TextInput, Modal,
} from 'react-native'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import { colors } from '../theme/colors'
import SigningRequestModal from '../components/SigningRequestModal'

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
  expiry_date?: string | null
}

interface SigningRecord {
  id: number
  type: string
  token: string
  contract_name: string
  requestee_email: string | null
  status: string
  requester_name: string
  created_at: string
}

type GradeFilter = 'all' | '위험' | '주의' | '안전'
type SortKey = 'analyzed' | 'score' | 'expiry'
type DashTab = 'contracts' | 'signing'
type SigTab = 'sent' | 'received'

export default function DashboardScreen() {
  const { user } = useAuth()
  const navigation = useNavigation<any>()
  const isEnterprise = user?.user_type === 'enterprise'

  const [saved, setSaved] = useState<SavedContract[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [sentRecords, setSentRecords] = useState<SigningRecord[]>([])
  const [receivedRecords, setReceivedRecords] = useState<SigningRecord[]>([])
  const [signingModalVisible, setSigningModalVisible] = useState(false)
  const [signingTarget, setSigningTarget] = useState<SavedContract | null>(null)

  // 필터/정렬/탭
  const [dashTab, setDashTab] = useState<DashTab>('contracts')
  const [sigTab, setSigTab] = useState<SigTab>('received')
  const [filter, setFilter] = useState<GradeFilter>('all')
  const [sortKey, setSortKey] = useState<SortKey>('analyzed')

  // 만료일 설정 모달
  const [expiryModalId, setExpiryModalId] = useState<number | null>(null)
  const [expiryInput, setExpiryInput] = useState('')
  const [expirySaving, setExpirySaving] = useState(false)

  // 검색
  const [searchQ, setSearchQ] = useState('')

  // 통계 요약
  const [stats, setStats] = useState<{ total_analyzed: number; avg_score: number; grade_breakdown: Record<string, number> } | null>(null)

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await api.get('/stats/me?months=6')
      setStats(data)
    } catch {}
  }, [])

  const fetchSaved = useCallback(async () => {
    try {
      const { data } = await api.get('/contracts/saved')
      setSaved(data)
    } catch {
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  const fetchSigningRecords = useCallback(async () => {
    try {
      const [sentRes, recvRes] = await Promise.all([
        api.get('/signing/my-records'),
        api.get('/signing/received'),
      ])
      setSentRecords(sentRes.data)
      setReceivedRecords(recvRes.data)
    } catch {}
  }, [])

  useFocusEffect(useCallback(() => {
    setLoading(true)
    fetchSaved()
    fetchSigningRecords()
    fetchStats()
  }, [fetchSaved, fetchSigningRecords, fetchStats]))

  const handleRefresh = () => {
    setRefreshing(true)
    fetchSaved()
    fetchSigningRecords()
  }

  const handleDelete = (item: SavedContract) => {
    Alert.alert('삭제 확인', `"${item.filename}" 분석 결과를 삭제할까요?`, [
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
    ])
  }

  const handleView = async (item: SavedContract) => {
    try {
      const { data } = await api.get(`/contracts/saved/${item.id}`)
      navigation.navigate('분석하기', {
        screen: 'Result',
        params: { analysisResult: data, isSaved: true },
      })
    } catch {
      Alert.alert('오류', '결과를 불러올 수 없습니다.')
    }
  }

  const handleSaveExpiry = async () => {
    if (!expiryModalId) return
    setExpirySaving(true)
    try {
      await api.put(`/contracts/saved/${expiryModalId}/expiry`, {
        expiry_date: expiryInput || null,
        expiry_notice_days: 7,
      })
      setSaved(prev => prev.map(c =>
        c.id === expiryModalId ? { ...c, expiry_date: expiryInput || null } : c
      ))
      setExpiryModalId(null)
      setExpiryInput('')
    } catch {
      Alert.alert('오류', '만료일 저장에 실패했습니다.')
    } finally {
      setExpirySaving(false)
    }
  }

  // 필터 + 검색 + 정렬 적용
  const filteredSaved = saved
    .filter(c => filter === 'all' || c.grade === filter)
    .filter(c => !searchQ || c.filename.toLowerCase().includes(searchQ.toLowerCase()) || c.contract_type.toLowerCase().includes(searchQ.toLowerCase()))
    .sort((a, b) => {
      if (sortKey === 'score') return b.score - a.score
      if (sortKey === 'expiry') {
        if (!a.expiry_date && !b.expiry_date) return 0
        if (!a.expiry_date) return 1
        if (!b.expiry_date) return -1
        return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime()
      }
      return new Date(b.saved_at).getTime() - new Date(a.saved_at).getTime()
    })

  const enterpriseDanger = saved.filter(c => c.grade === '위험').length

  const renderContractCard = (item: SavedContract) => {
    const gradeColor =
      item.grade === '위험' ? colors.danger :
      item.grade === '주의' ? colors.warn : colors.safe
    const date = new Date(item.saved_at).toLocaleDateString('ko-KR', {
      year: 'numeric', month: 'long', day: 'numeric',
    })
    const expiryLabel = item.expiry_date
      ? (() => {
          const diff = Math.ceil((new Date(item.expiry_date).getTime() - Date.now()) / 86400000)
          const label = new Date(item.expiry_date).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
          return diff <= 0 ? `만료됨 (${label})` : diff <= 7 ? `D-${diff} 만료 임박! (${label})` : `만료일: ${label}`
        })()
      : null
    const expiryUrgent = item.expiry_date
      ? Math.ceil((new Date(item.expiry_date).getTime() - Date.now()) / 86400000) <= 7
      : false

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
        <View style={styles.dateExpiryRow}>
          <Text style={styles.savedDate}>{date} 저장</Text>
          {expiryLabel && (
            <Text style={[styles.expiryLabel, expiryUrgent && styles.expiryUrgent]}>{expiryLabel}</Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.expirySetBtn}
          onPress={() => {
            setExpiryModalId(item.id)
            setExpiryInput(item.expiry_date ? item.expiry_date.slice(0, 10) : '')
          }}
        >
          <Text style={styles.expirySetBtnText}>
            {item.expiry_date ? '만료일 수정' : '만료일 설정'}
          </Text>
        </TouchableOpacity>
        <View style={styles.savedActions}>
          <TouchableOpacity style={styles.viewBtn} onPress={() => handleView(item)}>
            <Text style={styles.viewBtnText}>결과 보기</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewBtn, { backgroundColor: 'rgba(37,99,235,0.12)', flex: 0.7 }]}
            onPress={() => navigation.navigate('ReportDoc' as any, { savedId: item.id, filename: item.filename })}
          >
            <Text style={[styles.viewBtnText, { color: colors.primary }]}>리포트</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewBtn, styles.signBtn]}
            onPress={() => { setSigningTarget(item); setSigningModalVisible(true) }}
          >
            <Text style={styles.signBtnText}>서명</Text>
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
  }

  const renderSigningRecord = (rec: SigningRecord, isSent: boolean) => {
    const isPending = rec.status === 'pending'
    const isSigned = rec.status === 'signed'
    const statusColor = isSigned ? '#16a34a' : isPending ? '#d97706' : '#94a3b8'
    const statusText = isSigned ? '서명 완료' : isPending ? '서명 대기' : '만료됨'
    return (
      <View key={rec.id} style={styles.sigRecordCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.sigRecordName} numberOfLines={1}>{rec.contract_name}</Text>
          <Text style={styles.sigRecordFrom}>
            {isSent
              ? (rec.requestee_email ? `→ ${rec.requestee_email}` : '자기 서명')
              : `${rec.requester_name}님의 요청`}
          </Text>
          <Text style={styles.sigRecordDate}>
            {new Date(rec.created_at).toLocaleDateString('ko-KR')}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 8 }}>
          <View style={[styles.sigStatusBadge, { backgroundColor: `${statusColor}18` }]}>
            <Text style={[styles.sigStatusText, { color: statusColor }]}>{statusText}</Text>
          </View>
          {!isSent && isPending && (
            <TouchableOpacity
              style={styles.signNowBtn}
              onPress={() => navigation.navigate('Signing' as any, { token: rec.token })}
            >
              <Text style={styles.signNowBtnText}>서명하기</Text>
            </TouchableOpacity>
          )}
          {isSigned && (
            <TouchableOpacity
              style={[styles.signNowBtn, { backgroundColor: '#16a34a' }]}
              onPress={() => navigation.navigate('SignedDoc' as any, { recordId: rec.id, contractName: rec.contract_name })}
            >
              <Text style={styles.signNowBtnText}>문서 보기</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    )
  }

  return (
    <View style={styles.root}>
      {/* 만료일 설정 모달 */}
      <Modal visible={expiryModalId !== null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>만료일 설정</Text>
            <Text style={styles.modalSub}>형식: YYYY-MM-DD (예: 2026-12-31)</Text>
            <TextInput
              style={styles.modalInput}
              value={expiryInput}
              onChangeText={setExpiryInput}
              placeholder="2026-12-31"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              maxLength={10}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => { setExpiryModalId(null); setExpiryInput('') }}
              >
                <Text style={styles.modalCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveExpiry}
                disabled={expirySaving}
              >
                {expirySaving
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.modalSaveText}>저장</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 서명 요청 모달 */}
      {signingTarget && (
        <SigningRequestModal
          visible={signingModalVisible}
          contractId={String(signingTarget.id)}
          contractName={signingTarget.filename}
          onClose={() => { setSigningModalVisible(false); setSigningTarget(null) }}
          onDone={(msg) => {
            setSigningModalVisible(false); setSigningTarget(null)
            Alert.alert('발송 완료', msg)
            fetchSigningRecords()
          }}
        />
      )}

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.logoText}>CHECKMATE</Text>
          <Text style={styles.greeting}>안녕하세요, {user?.username}님</Text>
        </View>
        <TouchableOpacity style={styles.avatar} onPress={() => navigation.navigate('마이페이지')}>
          <Text style={styles.avatarText}>{user?.username?.charAt(0).toUpperCase() ?? '?'}</Text>
        </TouchableOpacity>
      </View>

      {/* 검색 바 */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgInput, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ color: colors.textMuted, fontSize: 15, marginRight: 8 }}>🔍</Text>
          <TextInput
            value={searchQ}
            onChangeText={setSearchQ}
            placeholder="계약서 검색..."
            placeholderTextColor={colors.textMuted}
            style={{ flex: 1, fontSize: 14, color: colors.text, padding: 0 }}
          />
          {searchQ.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQ('')}>
              <Text style={{ color: colors.textMuted, fontSize: 18 }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 통계 요약 (검색 중이 아닐 때만) */}
      {!searchQ && stats && (
        <View style={{ flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 16 }}>
          {[
            { label: '총 분석', value: stats.total_analyzed, color: colors.primary },
            { label: '위험', value: stats.grade_breakdown?.['위험'] ?? 0, color: colors.danger },
            { label: '주의', value: stats.grade_breakdown?.['주의'] ?? 0, color: colors.warn },
            { label: '안전', value: stats.grade_breakdown?.['안전'] ?? 0, color: colors.safe },
          ].map(s => (
            <View key={s.label} style={{ flex: 1, backgroundColor: colors.bgCard, borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: s.color }}>{s.value}</Text>
              <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>{s.label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* 대시보드 탭 */}
      <View style={styles.dashTabRow}>
        {(['contracts', 'signing'] as DashTab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.dashTab, dashTab === tab && styles.dashTabActive]}
            onPress={() => setDashTab(tab)}
          >
            <Text style={[styles.dashTabText, dashTab === tab && styles.dashTabTextActive]}>
              {tab === 'contracts' ? `계약 목록 (${saved.length})` : `서명 기록 (${sentRecords.length + receivedRecords.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
      >
        {dashTab === 'contracts' ? (
          <>
            {/* 기업 통계 */}
            {isEnterprise && (
              <View style={styles.enterpriseStatsRow}>
                {[
                  { label: '총 계약', value: saved.length, color: colors.primary },
                  { label: '근로계약', value: saved.filter(c => c.contract_type === '근로계약서').length, color: colors.safe },
                  { label: '임대차', value: saved.filter(c => c.contract_type === '임대차계약서').length, color: '#8b5cf6' },
                  { label: '위험', value: enterpriseDanger, color: colors.danger },
                ].map(({ label, value, color }) => (
                  <View key={label} style={styles.enterpriseStatCard}>
                    <Text style={[styles.enterpriseStatValue, { color }]}>{value}</Text>
                    <Text style={styles.enterpriseStatLabel}>{label}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* 필터 칩 */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
              {(['all', '위험', '주의', '안전'] as GradeFilter[]).map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[styles.filterChip, filter === f && styles.filterChipActive]}
                  onPress={() => setFilter(f)}
                >
                  <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>
                    {f === 'all' ? '전체' : f}
                  </Text>
                </TouchableOpacity>
              ))}
              <View style={{ width: 1, height: 28, backgroundColor: colors.border, marginHorizontal: 8, alignSelf: 'center' }} />
              {([['analyzed', '최신순'], ['score', '점수순'], ['expiry', '만료일순']] as [SortKey, string][]).map(([key, label]) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.filterChip, sortKey === key && styles.sortChipActive]}
                  onPress={() => setSortKey(key)}
                >
                  <Text style={[styles.filterChipText, sortKey === key && styles.sortChipTextActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* 계약 목록 */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>저장된 AI 분석 결과</Text>
              {filteredSaved.length > 0 && (
                <Text style={styles.sectionCount}>{filteredSaved.length}건</Text>
              )}
            </View>
            {loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color={colors.primary} />
                <Text style={styles.loadingText}>불러오는 중...</Text>
              </View>
            ) : filteredSaved.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyIcon}>📋</Text>
                <Text style={styles.emptyTitle}>{filter !== 'all' ? `${filter} 등급 계약이 없습니다` : '저장된 분석 결과가 없습니다'}</Text>
                <Text style={styles.emptySub}>계약서 분석 후 결과를 저장해보세요</Text>
              </View>
            ) : (
              filteredSaved.map(renderContractCard)
            )}
          </>
        ) : (
          <>
            {/* 서명 기록 서브탭 */}
            <View style={styles.sigTabRow}>
              {(['received', 'sent'] as SigTab[]).map((tab) => (
                <TouchableOpacity
                  key={tab}
                  style={[styles.sigTab, sigTab === tab && styles.sigTabActive]}
                  onPress={() => setSigTab(tab)}
                >
                  <Text style={[styles.sigTabText, sigTab === tab && styles.sigTabTextActive]}>
                    {tab === 'received' ? `받은 요청 (${receivedRecords.length})` : `보낸 요청 (${sentRecords.length})`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {sigTab === 'received' ? (
              receivedRecords.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyIcon}>✉️</Text>
                  <Text style={styles.emptyTitle}>받은 서명 요청이 없습니다</Text>
                </View>
              ) : receivedRecords.map((r) => renderSigningRecord(r, false))
            ) : (
              sentRecords.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyIcon}>📤</Text>
                  <Text style={styles.emptyTitle}>보낸 서명 요청이 없습니다</Text>
                </View>
              ) : sentRecords.map((r) => renderSigningRecord(r, true))
            )}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  logoText: { color: colors.primary, fontWeight: '800', fontSize: 16, letterSpacing: 1.5 },
  greeting: { color: colors.textSecondary, fontSize: 13, marginTop: 2 },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  dashTabRow: {
    flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  dashTab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  dashTabActive: { borderBottomWidth: 2, borderBottomColor: colors.primary },
  dashTabText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  dashTabTextActive: { color: colors.primary },
  filterRow: { flexGrow: 0, marginBottom: 16, marginTop: 4 },
  filterChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: colors.border, marginRight: 8,
    backgroundColor: colors.bgCard,
  },
  filterChipActive: { backgroundColor: colors.danger, borderColor: colors.danger },
  filterChipText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  filterChipTextActive: { color: '#fff' },
  sortChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  sortChipTextActive: { color: '#fff' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { color: colors.textMuted, fontSize: 12, fontWeight: '600', letterSpacing: 1 },
  sectionCount: {
    backgroundColor: 'rgba(79,142,247,0.15)', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 2, color: colors.primary, fontSize: 12, fontWeight: '700',
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
  savedTypeBadge: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  savedTypeText: { color: colors.textMuted, fontSize: 11 },
  savedGrade: { fontSize: 12, fontWeight: '700' },
  savedFilename: { color: colors.text, fontSize: 14, fontWeight: '600', marginBottom: 8, lineHeight: 20 },
  savedScoreRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 8 },
  savedScoreLabel: { color: colors.textMuted, fontSize: 12 },
  savedScoreNum: { fontSize: 20, fontWeight: '800' },
  savedCounts: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  countBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  countText: { fontSize: 11, fontWeight: '600' },
  dateExpiryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  savedDate: { color: colors.textMuted, fontSize: 11 },
  expiryLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
  expiryUrgent: { color: colors.danger },
  expirySetBtn: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 8,
    paddingVertical: 5, alignItems: 'center', marginBottom: 10,
  },
  expirySetBtnText: { color: colors.textMuted, fontSize: 12 },
  savedActions: { flexDirection: 'row', gap: 8 },
  viewBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 9, paddingVertical: 10, alignItems: 'center' },
  viewBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  deleteBtn: {
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)',
    borderRadius: 9, paddingVertical: 10, paddingHorizontal: 14, alignItems: 'center',
  },
  deleteBtnText: { color: colors.danger, fontWeight: '600', fontSize: 13 },
  enterpriseStatsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  enterpriseStatCard: {
    flex: 1, backgroundColor: colors.bgCard, borderRadius: 12, padding: 12,
    alignItems: 'center', borderWidth: 1, borderColor: colors.border,
  },
  enterpriseStatValue: { fontSize: 22, fontWeight: '800', marginBottom: 3 },
  enterpriseStatLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: '600' },
  signBtn: { backgroundColor: 'rgba(37,99,235,0.1)', flex: 0.7 },
  signBtnText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  sigTabRow: { flexDirection: 'row', marginBottom: 16, gap: 8 },
  sigTab: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center',
    backgroundColor: colors.bgCard,
  },
  sigTabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  sigTabText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  sigTabTextActive: { color: '#fff' },
  sigRecordCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bgCard, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border,
    padding: 14, marginBottom: 8,
  },
  sigRecordName: { color: colors.text, fontWeight: '700', fontSize: 14, marginBottom: 3 },
  sigRecordFrom: { color: colors.textMuted, fontSize: 12, marginBottom: 2 },
  sigRecordDate: { color: colors.textMuted, fontSize: 11 },
  sigStatusBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  sigStatusText: { fontSize: 11, fontWeight: '700' },
  signNowBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  signNowBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center',
  },
  modalBox: {
    backgroundColor: colors.bgCard, borderRadius: 16, padding: 24,
    width: '80%', borderWidth: 1, borderColor: colors.border,
  },
  modalTitle: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  modalSub: { color: colors.textMuted, fontSize: 12, marginBottom: 14 },
  modalInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    padding: 12, color: colors.text, fontSize: 15, marginBottom: 16,
  },
  modalActions: { flexDirection: 'row', gap: 10 },
  modalCancelBtn: {
    flex: 1, borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, paddingVertical: 12, alignItems: 'center',
  },
  modalCancelText: { color: colors.textMuted, fontWeight: '600' },
  modalSaveBtn: {
    flex: 1, backgroundColor: colors.primary,
    borderRadius: 10, paddingVertical: 12, alignItems: 'center',
  },
  modalSaveText: { color: '#fff', fontWeight: '700' },
})
