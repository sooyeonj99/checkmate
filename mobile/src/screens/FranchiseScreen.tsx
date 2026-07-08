import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, RefreshControl, Alert, Modal, TextInput,
} from 'react-native'
import { colors } from '../theme/colors'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

interface Store {
  id: number
  name: string
  location: string
  contract_count: number
  status: 'active' | 'inactive'
  created_at: string
}

export default function FranchiseScreen() {
  const { user } = useAuth()
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [addVisible, setAddVisible] = useState(false)
  const [newName, setNewName] = useState('')
  const [newLocation, setNewLocation] = useState('')
  const [saving, setSaving] = useState(false)

  const loadStores = useCallback(async () => {
    try {
      const { data } = await api.get('/franchise/stores')
      setStores(data)
    } catch {
      // 미지원 시 빈 배열 유지
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { loadStores() }, [loadStores])

  const handleAddStore = async () => {
    if (!newName.trim()) { Alert.alert('오류', '가맹점 이름을 입력해주세요.'); return }
    setSaving(true)
    try {
      await api.post('/franchise/stores', { store_name: newName.trim(), region: newLocation.trim() })
      setAddVisible(false)
      setNewName(''); setNewLocation('')
      loadStores()
    } catch (e: any) {
      Alert.alert('오류', e?.response?.data?.detail ?? '추가 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleStatus = async (store: Store) => {
    const next = store.status === 'active' ? 'inactive' : 'active'
    Alert.alert(
      next === 'inactive' ? '가맹점 비활성화' : '가맹점 활성화',
      `"${store.name}"을(를) ${next === 'inactive' ? '비활성화' : '활성화'}하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '확인', onPress: async () => {
            try {
              await api.patch(`/franchise/stores/${store.id}`, { status: next })
              loadStores()
            } catch {
              Alert.alert('오류', '상태 변경에 실패했습니다.')
            }
          },
        },
      ]
    )
  }

  if (user?.user_type !== 'enterprise') {
    return (
      <View style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>프랜차이즈 관리</Text>
        </View>
        <View style={styles.accessDenied}>
          <Text style={styles.accessDeniedIcon}>🏢</Text>
          <Text style={styles.accessDeniedTitle}>기업 계정 전용 기능</Text>
          <Text style={styles.accessDeniedDesc}>
            프랜차이즈 관리 기능은{'\n'}기업/법인 계정에서만 사용할 수 있습니다.
          </Text>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.root}>
      <Modal visible={addVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>가맹점 추가</Text>
            <Text style={styles.inputLabel}>가맹점 이름 *</Text>
            <TextInput
              style={styles.input}
              value={newName}
              onChangeText={setNewName}
              placeholder="가맹점명을 입력하세요"
              placeholderTextColor={colors.textMuted}
            />
            <Text style={styles.inputLabel}>위치 (선택)</Text>
            <TextInput
              style={styles.input}
              value={newLocation}
              onChangeText={setNewLocation}
              placeholder="서울시 강남구 테헤란로 123"
              placeholderTextColor={colors.textMuted}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setAddVisible(false)}>
                <Text style={styles.cancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleAddStore} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>추가</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.header}>
        <Text style={styles.headerTitle}>프랜차이즈 관리</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => { setNewName(''); setNewLocation(''); setAddVisible(true) }}>
          <Text style={styles.addBtnText}>+ 가맹점 추가</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadStores() }} tintColor={colors.primary} />}
      >
        {/* 요약 카드 */}
        <View style={styles.summaryRow}>
          <SummaryCard label="전체 가맹점" value={stores.length} color={colors.primary} />
          <SummaryCard label="활성" value={stores.filter(s => s.status === 'active').length} color={colors.safe} />
          <SummaryCard label="비활성" value={stores.filter(s => s.status === 'inactive').length} color={colors.textMuted} />
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : stores.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🏪</Text>
            <Text style={styles.emptyTitle}>등록된 가맹점이 없습니다</Text>
            <Text style={styles.emptyDesc}>위의 "가맹점 추가" 버튼으로 가맹점을 등록하세요.</Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>가맹점 목록</Text>
            {stores.map(store => (
              <StoreCard key={store.id} store={store} onToggle={() => handleToggleStatus(store)} />
            ))}
          </>
        )}
        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  )
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.summaryCard}>
      <Text style={[styles.summaryValue, { color }]}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  )
}

function StoreCard({ store, onToggle }: { store: Store; onToggle: () => void }) {
  const isActive = store.status === 'active'
  return (
    <View style={styles.storeCard}>
      <View style={[styles.storeStatusDot, { backgroundColor: isActive ? colors.safe : colors.textMuted }]} />
      <View style={styles.storeInfo}>
        <Text style={styles.storeName}>{store.name}</Text>
        {store.location ? <Text style={styles.storeLocation}>{store.location}</Text> : null}
        <View style={styles.storeMeta}>
          <Text style={styles.storeMetaText}>계약서 {store.contract_count}건</Text>
          <Text style={styles.storeMetaSep}>·</Text>
          <Text style={[styles.storeMetaText, { color: isActive ? colors.safe : colors.textMuted }]}>
            {isActive ? '운영중' : '비활성'}
          </Text>
        </View>
      </View>
      <TouchableOpacity style={styles.toggleBtn} onPress={onToggle}>
        <Text style={styles.toggleBtnText}>{isActive ? '비활성화' : '활성화'}</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: colors.navBg,
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  addBtn: { backgroundColor: colors.primary, borderRadius: 20, paddingVertical: 7, paddingHorizontal: 14 },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  content: { padding: 20 },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  summaryCard: {
    flex: 1, backgroundColor: colors.bgCard, borderRadius: 14,
    borderWidth: 1, borderColor: colors.border, padding: 16, alignItems: 'center',
  },
  summaryValue: { fontSize: 26, fontWeight: '800', marginBottom: 4 },
  summaryLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  sectionTitle: {
    color: colors.textMuted, fontSize: 11, fontWeight: '700',
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10,
  },
  storeCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.bgCard, borderRadius: 14,
    borderWidth: 1, borderColor: colors.border,
    padding: 16, marginBottom: 10,
  },
  storeStatusDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  storeInfo: { flex: 1 },
  storeName: { color: colors.text, fontSize: 15, fontWeight: '700', marginBottom: 2 },
  storeLocation: { color: colors.textMuted, fontSize: 12, marginBottom: 4 },
  storeMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  storeMetaText: { color: colors.textSecondary, fontSize: 12 },
  storeMetaSep: { color: colors.textMuted, fontSize: 12 },
  toggleBtn: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 8,
    paddingVertical: 6, paddingHorizontal: 10,
  },
  toggleBtnText: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
  accessDenied: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  accessDeniedIcon: { fontSize: 60, marginBottom: 16 },
  accessDeniedTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 8 },
  accessDeniedDesc: { color: colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 22 },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 52, marginBottom: 16 },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 8 },
  emptyDesc: { color: colors.textMuted, fontSize: 13, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: colors.bgCard, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, borderWidth: 1, borderColor: colors.border,
  },
  modalTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 16 },
  inputLabel: { color: colors.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    padding: 14, color: colors.text, fontSize: 15, backgroundColor: colors.bgInput,
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn: {
    flex: 1, borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, paddingVertical: 14, alignItems: 'center',
  },
  cancelText: { color: colors.textMuted, fontWeight: '600', fontSize: 15 },
  saveBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 15 },
})
