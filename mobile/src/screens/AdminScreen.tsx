import React, { useState, useEffect } from 'react'
import {
  View, Text, TouchableOpacity, ScrollView, ActivityIndicator,
  TextInput, Alert,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

const ADMIN_EMAIL = 'ghdiehddl@gmail.com'

interface AdminStats {
  total_users: number; personal_users: number; enterprise_users: number
  franchisor_users: number; franchisee_users: number
  total_contracts: number; total_signings: number; total_api_keys: number
  avg_score: number; danger_count: number; warn_count: number; safe_count: number
}
interface UserItem { id: number; email: string; username: string; user_type: string; is_active: boolean; contract_count: number }
interface ApiKeyItem { key: string; name: string; calls: number; is_active: boolean }

export default function AdminScreen() {
  const navigation = useNavigation()
  const { isDark } = useTheme()
  const { user } = useAuth()

  const [tab, setTab] = useState<'stats' | 'users' | 'keys'>('stats')
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [users, setUsers] = useState<UserItem[]>([])
  const [keys, setKeys] = useState<ApiKeyItem[]>([])
  const [newKeyName, setNewKeyName] = useState('')
  const [loading, setLoading] = useState(false)

  const bg = isDark ? '#0f1117' : '#f7f6f3'
  const card = isDark ? '#1a1d27' : '#fff'
  const text = isDark ? '#e8e6e1' : '#1a1917'
  const muted = isDark ? '#6b6860' : '#a09e99'
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.09)'
  const inputBg = isDark ? '#1e2130' : '#f0ede8'

  if (user?.email !== ADMIN_EMAIL) {
    return (
      <View style={{ flex: 1, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ fontSize: 40, marginBottom: 16 }}>🛡️</Text>
        <Text style={{ fontSize: 18, fontWeight: '800', color: text, textAlign: 'center' }}>관리자 전용 페이지</Text>
        <Text style={{ fontSize: 14, color: muted, textAlign: 'center', marginTop: 8 }}>ghdiehddl@gmail.com 계정만 접근 가능합니다.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 24, backgroundColor: '#2563eb', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 }}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>뒤로</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const fetchStats = async () => {
    setLoading(true)
    try {
      const [s, u, k] = await Promise.all([api.get('/admin/stats'), api.get('/admin/users'), api.get('/admin/api-keys')])
      setStats(s.data); setUsers(u.data); setKeys(k.data)
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { fetchStats() }, [])

  const toggleUser = async (id: number) => {
    await api.patch(`/admin/users/${id}/toggle-active`)
    setUsers(p => p.map(u => u.id === id ? { ...u, is_active: !u.is_active } : u))
  }

  const createKey = async () => {
    if (!newKeyName.trim()) { Alert.alert('이름 필요', 'API 키 이름을 입력하세요.'); return }
    const res = await api.post('/admin/api-keys', { name: newKeyName.trim() })
    setKeys(p => [res.data, ...p])
    setNewKeyName('')
    Alert.alert('생성 완료', `키: ${res.data.key}`)
  }

  const deleteKey = (key: string) => {
    Alert.alert('삭제 확인', 'API 키를 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: async () => {
        await api.delete(`/admin/api-keys/${key}`)
        setKeys(p => p.filter(k => k.key !== key))
      }},
    ])
  }

  const TABS = [{ id: 'stats', label: '📊 통계' }, { id: 'users', label: '👥 사용자' }, { id: 'keys', label: '🔑 API 키' }] as const

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <View style={{ backgroundColor: card, borderBottomWidth: 1, borderBottomColor: border, paddingTop: 52, paddingBottom: 0, paddingHorizontal: 20 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: 12 }}>
          <Text style={{ color: '#2563eb', fontSize: 14 }}>← 뒤로</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: '800', color: text, marginBottom: 16 }}>🛡️ 어드민 패널</Text>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {TABS.map(t => (
            <TouchableOpacity key={t.id} onPress={() => setTab(t.id)} style={{
              flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2,
              borderBottomColor: tab === t.id ? '#2563eb' : 'transparent',
            }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: tab === t.id ? '#2563eb' : muted }}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#2563eb" size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>

          {/* 통계 탭 */}
          {tab === 'stats' && stats && (
            <>
              <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                {[
                  { label: '전체 사용자', value: stats.total_users, color: '#2563eb' },
                  { label: '전체 계약서', value: stats.total_contracts, color: '#7c3aed' },
                  { label: '전자서명', value: stats.total_signings, color: '#059669' },
                  { label: 'B2B API 키', value: stats.total_api_keys, color: '#f59e0b' },
                ].map(s => (
                  <View key={s.label} style={{ flex: 1, minWidth: '45%', backgroundColor: card, borderRadius: 14, borderWidth: 1, borderColor: border, padding: 16, alignItems: 'center' }}>
                    <Text style={{ fontSize: 28, fontWeight: '900', color: s.color }}>{s.value}</Text>
                    <Text style={{ fontSize: 12, color: muted, marginTop: 4 }}>{s.label}</Text>
                  </View>
                ))}
              </View>
              <View style={{ backgroundColor: card, borderRadius: 14, borderWidth: 1, borderColor: border, padding: 16 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: text, marginBottom: 12 }}>계정 유형 분포</Text>
                {[
                  { label: '개인', value: stats.personal_users },
                  { label: '기업', value: stats.enterprise_users },
                  { label: '프랜차이즈 본사', value: stats.franchisor_users },
                  { label: '가맹점주', value: stats.franchisee_users },
                ].map(r => (
                  <View key={r.label} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: border }}>
                    <Text style={{ fontSize: 13, color: text }}>{r.label}</Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#2563eb' }}>{r.value}명</Text>
                  </View>
                ))}
              </View>
              <View style={{ backgroundColor: card, borderRadius: 14, borderWidth: 1, borderColor: border, padding: 16 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: text, marginBottom: 12 }}>위험도 분포</Text>
                {[
                  { label: '위험', value: stats.danger_count, color: '#ef4444' },
                  { label: '주의', value: stats.warn_count, color: '#f59e0b' },
                  { label: '안전', value: stats.safe_count, color: '#22c55e' },
                ].map(r => (
                  <View key={r.label} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: border }}>
                    <Text style={{ fontSize: 13, color: r.color, fontWeight: '700' }}>{r.label}</Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: text }}>{r.value}건</Text>
                  </View>
                ))}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 10 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: muted }}>평균 점수</Text>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#2563eb' }}>{stats.avg_score}점</Text>
                </View>
              </View>
            </>
          )}

          {/* 사용자 탭 */}
          {tab === 'users' && users.map(u => (
            <View key={u.id} style={{ backgroundColor: card, borderRadius: 12, borderWidth: 1, borderColor: border, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>{u.username.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: text }}>{u.username}</Text>
                <Text style={{ fontSize: 12, color: muted }}>{u.email}</Text>
                <Text style={{ fontSize: 11, color: muted, marginTop: 2 }}>{u.user_type} · 계약서 {u.contract_count}개</Text>
              </View>
              <TouchableOpacity onPress={() => toggleUser(u.id)} style={{
                backgroundColor: u.is_active ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6,
                borderWidth: 1, borderColor: u.is_active ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)',
              }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: u.is_active ? '#22c55e' : '#ef4444' }}>
                  {u.is_active ? '활성' : '비활성'}
                </Text>
              </TouchableOpacity>
            </View>
          ))}

          {/* API 키 탭 */}
          {tab === 'keys' && (
            <>
              <View style={{ backgroundColor: card, borderRadius: 14, borderWidth: 1, borderColor: border, padding: 16, gap: 12 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: text }}>새 API 키 생성</Text>
                <TextInput
                  value={newKeyName}
                  onChangeText={setNewKeyName}
                  placeholder="파트너사 이름"
                  placeholderTextColor={muted}
                  style={{ backgroundColor: inputBg, borderRadius: 10, padding: 12, fontSize: 14, color: text, borderWidth: 1, borderColor: border }}
                />
                <TouchableOpacity onPress={createKey} style={{ backgroundColor: '#2563eb', borderRadius: 10, padding: 12, alignItems: 'center' }}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>생성</Text>
                </TouchableOpacity>
              </View>
              {keys.map(k => (
                <View key={k.key} style={{ backgroundColor: card, borderRadius: 12, borderWidth: 1, borderColor: border, padding: 16 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: text, marginBottom: 4 }}>{k.name}</Text>
                      <Text style={{ fontSize: 11, color: muted, fontFamily: 'monospace' }} numberOfLines={1}>{k.key}</Text>
                      <Text style={{ fontSize: 12, color: muted, marginTop: 4 }}>호출 {k.calls}회</Text>
                    </View>
                    <TouchableOpacity onPress={() => deleteKey(k.key)} style={{ backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}>
                      <Text style={{ color: '#ef4444', fontWeight: '700', fontSize: 12 }}>삭제</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  )
}
