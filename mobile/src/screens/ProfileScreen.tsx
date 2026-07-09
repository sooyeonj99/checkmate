import React, { useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView,
  Modal, TextInput, ActivityIndicator,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../App'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { lightColors, darkColors } from '../theme/colors'
import api from '../services/api'

type ModalType = 'none' | 'editProfile' | 'changePassword'

export default function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const { user, token, login, logout } = useAuth()
  const { theme, setTheme, isDark } = useTheme()
  const c = isDark ? darkColors : lightColors
  const styles = makeStyles(c)
  const isEnterprise = user?.user_type === 'enterprise'

  const [modalType, setModalType] = useState<ModalType>('none')
  const [saving, setSaving] = useState(false)

  // 프로필 수정
  const [editName, setEditName] = useState(user?.username ?? '')
  const [editPhone, setEditPhone] = useState('')

  // 비밀번호 변경
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [newPwConfirm, setNewPwConfirm] = useState('')
  const [pwStep, setPwStep] = useState<'verify' | 'change'>('verify')

  const handleLogout = () => {
    Alert.alert('로그아웃', '로그아웃 하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: logout },
    ])
  }

  const openEditProfile = () => {
    setEditName(user?.username ?? '')
    setEditPhone('')
    setModalType('editProfile')
  }

  const handleSaveProfile = async () => {
    if (!editName.trim()) { Alert.alert('오류', '이름을 입력해주세요.'); return }
    setSaving(true)
    try {
      const body: any = { username: editName.trim() }
      if (editPhone.trim()) body.phone_number = editPhone.trim()
      await api.put('/users/profile', body)
      const { data: updatedUser } = await api.get('/users/me')
      if (token) await login(token, updatedUser)
      setModalType('none')
      Alert.alert('저장 완료', '프로필이 업데이트되었습니다.')
    } catch (e: any) {
      Alert.alert('오류', e?.response?.data?.detail ?? '저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const openChangePassword = () => {
    setCurrentPw(''); setNewPw(''); setNewPwConfirm('')
    setPwStep('verify')
    setModalType('changePassword')
  }

  const handleVerifyPassword = async () => {
    if (!currentPw) { Alert.alert('오류', '현재 비밀번호를 입력해주세요.'); return }
    setSaving(true)
    try {
      await api.post('/users/verify-password', { password: currentPw })
      setPwStep('change')
    } catch {
      Alert.alert('오류', '현재 비밀번호가 올바르지 않습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (newPw.length < 8) { Alert.alert('오류', '비밀번호는 8자 이상이어야 합니다.'); return }
    if (newPw !== newPwConfirm) { Alert.alert('오류', '새 비밀번호가 일치하지 않습니다.'); return }
    setSaving(true)
    try {
      await api.put('/users/profile', { new_password: newPw })
      setModalType('none')
      Alert.alert('변경 완료', '비밀번호가 성공적으로 변경되었습니다.')
    } catch (e: any) {
      Alert.alert('오류', e?.response?.data?.detail ?? '변경 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.root}>
      {/* 프로필 수정 모달 */}
      <Modal visible={modalType === 'editProfile'} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>프로필 수정</Text>
            <Text style={styles.inputLabel}>이름</Text>
            <TextInput
              style={styles.input}
              value={editName}
              onChangeText={setEditName}
              placeholder="이름을 입력하세요"
              placeholderTextColor={c.textMuted}
            />
            <Text style={styles.inputLabel}>전화번호 (선택)</Text>
            <TextInput
              style={styles.input}
              value={editPhone}
              onChangeText={setEditPhone}
              placeholder="010-0000-0000"
              placeholderTextColor={c.textMuted}
              keyboardType="phone-pad"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalType('none')}>
                <Text style={styles.cancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProfile} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>저장</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 비밀번호 변경 모달 */}
      <Modal visible={modalType === 'changePassword'} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>
              {pwStep === 'verify' ? '비밀번호 확인' : '새 비밀번호 설정'}
            </Text>
            {pwStep === 'verify' ? (
              <>
                <Text style={styles.modalSub}>현재 비밀번호를 입력해주세요</Text>
                <TextInput
                  style={styles.input}
                  value={currentPw}
                  onChangeText={setCurrentPw}
                  placeholder="현재 비밀번호"
                  placeholderTextColor={c.textMuted}
                  secureTextEntry
                />
                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalType('none')}>
                    <Text style={styles.cancelText}>취소</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={handleVerifyPassword} disabled={saving}>
                    {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>확인</Text>}
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.inputLabel}>새 비밀번호 (8자 이상)</Text>
                <TextInput
                  style={styles.input}
                  value={newPw}
                  onChangeText={setNewPw}
                  placeholder="새 비밀번호"
                  placeholderTextColor={c.textMuted}
                  secureTextEntry
                />
                <Text style={styles.inputLabel}>새 비밀번호 확인</Text>
                <TextInput
                  style={styles.input}
                  value={newPwConfirm}
                  onChangeText={setNewPwConfirm}
                  placeholder="새 비밀번호 재입력"
                  placeholderTextColor={c.textMuted}
                  secureTextEntry
                />
                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalType('none')}>
                    <Text style={styles.cancelText}>취소</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={handleChangePassword} disabled={saving}>
                    {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>변경</Text>}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      <View style={styles.header}>
        <Text style={styles.headerTitle}>마이페이지</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* 프로필 카드 */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.username?.charAt(0).toUpperCase() ?? '?'}</Text>
          </View>
          <Text style={styles.username}>{user?.username}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={[styles.typeBadge, isEnterprise && styles.typeBadgeEnterprise]}>
            <Text style={[styles.typeBadgeText, isEnterprise && styles.typeBadgeTextEnterprise]}>
              {isEnterprise ? '기업/법인' : '개인 사용자'}
            </Text>
          </View>
        </View>

        {/* 계정 관리 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>계정 관리</Text>
          <View style={styles.menuCard}>
            <MenuRow label="프로필 수정" desc="이름 · 전화번호 변경" onPress={openEditProfile} styles={styles} />
            <MenuRow label="비밀번호 변경" desc="현재 비밀번호 확인 후 변경" onPress={openChangePassword} last styles={styles} />
          </View>
        </View>

        {/* 서비스 기능 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>서비스 기능</Text>
          <View style={styles.menuCard}>
            <MenuRow label="서명 템플릿 편집" desc="전자서명 서식 관리" onPress={() => navigation.navigate('TemplateEditor')} styles={styles} />
            {isEnterprise && (
              <MenuRow label="프랜차이즈 관리" desc="가맹점 현황 및 계약 관리" onPress={() => navigation.navigate('Franchise')} last styles={styles} />
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>화면 설정</Text>
          <View style={styles.menuCard}>
            {(['system', 'light', 'dark'] as const).map((t, i, arr) => (
              <TouchableOpacity
                key={t}
                style={[styles.menuRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}
                onPress={() => setTheme(t)}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.menuLabel}>
                    {t === 'system' ? '시스템 설정 따르기' : t === 'light' ? '라이트 모드' : '다크 모드'}
                  </Text>
                  <Text style={styles.menuDesc}>
                    {t === 'system' ? '기기 설정에 따라 자동 전환' : t === 'light' ? '항상 밝은 화면' : '항상 어두운 화면'}
                  </Text>
                </View>
                {theme === t && (
                  <Text style={{ color: c.primary, fontWeight: '700', fontSize: 15 }}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 계정 정보 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>계정 정보</Text>
          <View style={styles.infoCard}>
            <InfoRow label="이메일" value={user?.email ?? '-'} styles={styles} />
            <InfoRow label="사용자명" value={user?.username ?? '-'} styles={styles} />
            <InfoRow label="계정 유형" value={isEnterprise ? '기업/법인' : '개인 사용자'} last styles={styles} />
          </View>
        </View>

        {/* 플랜 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>현재 플랜</Text>
          <View style={[styles.planCard, isEnterprise && styles.planCardEnterprise]}>
            <Text style={styles.planName}>{isEnterprise ? '기업 플랜' : '개인 플랜'}</Text>
            <Text style={styles.planDesc}>
              {isEnterprise
                ? '계약서 분석 · 팀 관리 · 대량 분석 · 리포트 다운로드'
                : '계약서 분석 · 저장 관리 · AI 챗봇'}
            </Text>
          </View>
        </View>

        {/* 기능 목록 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>이용 가능한 기능</Text>
          {FEATURES_PERSONAL.map((f) => (
            <FeatureRow key={f.title} {...f} available styles={styles} c={c} />
          ))}
          {isEnterprise && FEATURES_ENTERPRISE.map((f) => (
            <FeatureRow key={f.title} {...f} available styles={styles} c={c} />
          ))}
          {!isEnterprise && FEATURES_ENTERPRISE.map((f) => (
            <FeatureRow key={f.title} {...f} available={false} styles={styles} c={c} />
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

type S = ReturnType<typeof makeStyles>
type C = typeof lightColors

function MenuRow({ label, desc, onPress, last, styles }: { label: string; desc: string; onPress: () => void; last?: boolean; styles: S }) {
  return (
    <TouchableOpacity style={[styles.menuRow, last && { borderBottomWidth: 0 }]} onPress={onPress} activeOpacity={0.7}>
      <View style={{ flex: 1 }}>
        <Text style={styles.menuLabel}>{label}</Text>
        <Text style={styles.menuDesc}>{desc}</Text>
      </View>
      <Text style={styles.menuArrow}>›</Text>
    </TouchableOpacity>
  )
}

function InfoRow({ label, value, last, styles }: { label: string; value: string; last?: boolean; styles: S }) {
  return (
    <View style={[styles.infoRow, last && { borderBottomWidth: 0 }]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  )
}

function FeatureRow({ title, desc, available, styles, c }: { title: string; desc: string; available: boolean; styles: S; c: C }) {
  return (
    <View style={[styles.featureRow, !available && styles.featureRowDisabled]}>
      <View style={[styles.featureDot, { backgroundColor: available ? c.safe : c.textMuted }]} />
      <View style={styles.featureContent}>
        <Text style={[styles.featureTitle, !available && styles.featureTitleDisabled]}>{title}</Text>
        <Text style={styles.featureDesc}>{desc}</Text>
      </View>
      <Text style={available ? styles.featureCheck : styles.featureLock}>
        {available ? '✓' : '잠금'}
      </Text>
    </View>
  )
}

const FEATURES_PERSONAL = [
  { title: 'AI 계약서 분석', desc: 'Gemini AI 위험 조항 탐지' },
  { title: '분석 결과 저장', desc: '대시보드에서 이력 관리' },
  { title: 'AI 챗봇', desc: '계약 관련 질문 답변' },
]

const FEATURES_ENTERPRISE = [
  { title: '팀 관리', desc: '멤버 초대 및 권한 설정' },
  { title: '대량 분석', desc: '여러 계약서 일괄 분석' },
  { title: '리포트 다운로드', desc: 'PDF 형식 분석 리포트 출력' },
]

function makeStyles(c: typeof lightColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg },
    header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: c.border, backgroundColor: c.navBg },
    headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
    content: { padding: 20 },
    profileCard: { backgroundColor: c.bgCard, borderRadius: 20, borderWidth: 1, borderColor: c.border, padding: 28, alignItems: 'center', marginBottom: 24 },
    avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
    avatarText: { color: '#fff', fontSize: 30, fontWeight: '800' },
    username: { color: c.text, fontSize: 20, fontWeight: '700', marginBottom: 4 },
    email: { color: c.textMuted, fontSize: 13, marginBottom: 12 },
    typeBadge: { backgroundColor: c.bgInput, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5, borderWidth: 1, borderColor: c.border },
    typeBadgeEnterprise: { backgroundColor: 'rgba(37,99,235,0.08)', borderColor: c.borderAccent },
    typeBadgeText: { color: c.textSecondary, fontSize: 13, fontWeight: '600' },
    typeBadgeTextEnterprise: { color: c.primary },
    section: { marginBottom: 24 },
    sectionTitle: { color: c.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 10, textTransform: 'uppercase' },
    menuCard: { backgroundColor: c.bgCard, borderRadius: 14, borderWidth: 1, borderColor: c.border, overflow: 'hidden' },
    menuRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: c.border },
    menuLabel: { color: c.text, fontSize: 14, fontWeight: '600', marginBottom: 2 },
    menuDesc: { color: c.textMuted, fontSize: 12 },
    menuArrow: { color: c.textMuted, fontSize: 22, fontWeight: '300' },
    infoCard: { backgroundColor: c.bgCard, borderRadius: 14, borderWidth: 1, borderColor: c.border, overflow: 'hidden' },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: c.border },
    infoLabel: { color: c.textSecondary, fontSize: 14 },
    infoValue: { color: c.text, fontSize: 14, fontWeight: '600' },
    planCard: { backgroundColor: c.bgCard, borderRadius: 14, borderWidth: 1, borderColor: c.border, padding: 16 },
    planCardEnterprise: { backgroundColor: 'rgba(37,99,235,0.04)', borderColor: c.borderAccent },
    planName: { color: c.text, fontSize: 15, fontWeight: '700', marginBottom: 4 },
    planDesc: { color: c.textMuted, fontSize: 12, lineHeight: 17 },
    featureRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.bgCard, borderRadius: 12, borderWidth: 1, borderColor: c.border, padding: 14, marginBottom: 8, gap: 12 },
    featureRowDisabled: { opacity: 0.45 },
    featureDot: { width: 8, height: 8, borderRadius: 4 },
    featureContent: { flex: 1 },
    featureTitle: { color: c.text, fontSize: 14, fontWeight: '600', marginBottom: 2 },
    featureTitleDisabled: { color: c.textMuted },
    featureDesc: { color: c.textMuted, fontSize: 12 },
    featureCheck: { color: c.safe, fontSize: 16, fontWeight: '700' },
    featureLock: { color: c.textMuted, fontSize: 11, fontWeight: '600' },
    logoutBtn: { borderWidth: 1, borderColor: 'rgba(217,64,64,0.3)', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 16 },
    logoutText: { color: c.danger, fontSize: 15, fontWeight: '600' },
    version: { textAlign: 'center', color: c.textMuted, fontSize: 12 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalBox: { backgroundColor: c.bgCard, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, borderWidth: 1, borderColor: c.border },
    modalTitle: { color: c.text, fontSize: 18, fontWeight: '700', marginBottom: 4 },
    modalSub: { color: c.textMuted, fontSize: 13, marginBottom: 16 },
    inputLabel: { color: c.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 12 },
    input: { borderWidth: 1, borderColor: c.border, borderRadius: 10, padding: 14, color: c.text, fontSize: 15, backgroundColor: c.bgInput },
    modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
    cancelBtn: { flex: 1, borderWidth: 1, borderColor: c.border, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
    cancelText: { color: c.textMuted, fontWeight: '600', fontSize: 15 },
    saveBtn: { flex: 1, backgroundColor: c.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
    saveText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  })
}
