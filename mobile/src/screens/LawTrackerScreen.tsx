import React, { useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, TextInput } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useTheme } from '../context/ThemeContext'

const SAMPLE_LAWS = [
  { id: 1, name: '근로기준법', date: '2024-10-01', type: '개정', summary: '연장근로 한도 및 휴가 규정 변경', relevance: '근로계약서' },
  { id: 2, name: '주택임대차보호법', date: '2024-07-15', type: '개정', summary: '계약갱신청구권 및 전월세 상한제 조항 수정', relevance: '임대차계약서' },
  { id: 3, name: '전자상거래법', date: '2024-09-20', type: '개정', summary: '온라인 플랫폼 사업자 의무 강화', relevance: '서비스이용계약' },
  { id: 4, name: '하도급거래공정화법', date: '2024-06-01', type: '개정', summary: '서면 계약 의무화 범위 확대', relevance: '하도급계약서' },
]

export default function LawTrackerScreen() {
  const navigation = useNavigation()
  const { isDark } = useTheme()
  const [keyword, setKeyword] = useState('')

  const bg = isDark ? '#0f1117' : '#f7f6f3'
  const card = isDark ? '#1a1d27' : '#fff'
  const text = isDark ? '#e8e6e1' : '#1a1917'
  const muted = isDark ? '#6b6860' : '#a09e99'
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.09)'
  const inputBg = isDark ? '#1e2130' : '#f0ede8'

  const filtered = SAMPLE_LAWS.filter(l =>
    !keyword || l.name.includes(keyword) || l.relevance.includes(keyword)
  )

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <View style={{ backgroundColor: card, borderBottomWidth: 1, borderBottomColor: border, paddingTop: 52, paddingBottom: 16, paddingHorizontal: 20 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: 12 }}>
          <Text style={{ color: '#2563eb', fontSize: 14 }}>← 뒤로</Text>
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: text }}>⚖️ 법령 변경 추적</Text>
          <View style={{ backgroundColor: 'rgba(245,158,11,0.15)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)' }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: '#f59e0b' }}>준비중</Text>
          </View>
        </View>
        <Text style={{ fontSize: 13, color: muted, marginTop: 4 }}>계약 관련 법령 개정을 자동 추적합니다</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
        {/* 준비중 배너 */}
        <View style={{ backgroundColor: 'rgba(37,99,235,0.07)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(37,99,235,0.18)', padding: 18 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#2563eb', marginBottom: 6 }}>🔔 법제처 API 연동 예정</Text>
          <Text style={{ fontSize: 13, color: muted, lineHeight: 20 }}>
            현재 샘플 데이터입니다. 정식 오픈 시 실시간 법령 개정 알림과 계약서 영향도 분석이 제공됩니다.
          </Text>
        </View>

        {/* 검색 */}
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: inputBg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: border }}>
          <Text style={{ color: muted, fontSize: 15, marginRight: 8 }}>🔍</Text>
          <TextInput
            value={keyword}
            onChangeText={setKeyword}
            placeholder="법령명 또는 계약서 유형..."
            placeholderTextColor={muted}
            style={{ flex: 1, fontSize: 14, color: text, padding: 0 }}
          />
        </View>

        {/* 법령 목록 */}
        {filtered.map(law => (
          <View key={law.id} style={{ backgroundColor: card, borderRadius: 14, borderWidth: 1, borderColor: border, padding: 18 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: text, marginBottom: 4 }}>{law.name}</Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <View style={{ backgroundColor: 'rgba(37,99,235,0.1)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#2563eb' }}>{law.type}</Text>
                  </View>
                  <View style={{ backgroundColor: 'rgba(124,58,237,0.1)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#7c3aed' }}>{law.relevance}</Text>
                  </View>
                </View>
              </View>
              <Text style={{ fontSize: 12, color: muted }}>{law.date.slice(0, 7)}</Text>
            </View>
            <Text style={{ fontSize: 13, color: muted, lineHeight: 20 }}>{law.summary}</Text>
          </View>
        ))}

        {/* 예정 기능 */}
        <View style={{ backgroundColor: card, borderRadius: 14, borderWidth: 1, borderColor: border, padding: 18 }}>
          <Text style={{ fontSize: 14, fontWeight: '800', color: text, marginBottom: 14 }}>📋 정식 오픈 예정 기능</Text>
          {[
            { icon: '🔔', title: '실시간 알림', desc: '분석한 계약서와 관련 법령 개정 시 즉시 알림' },
            { icon: '📊', title: '영향도 분석', desc: '내 계약서에 개정 법령이 미치는 영향 AI 분석' },
            { icon: '📅', title: '시행일 추적', desc: '개정 예정 법령의 시행일 캘린더 등록' },
          ].map(f => (
            <View key={f.title} style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
              <Text style={{ fontSize: 20 }}>{f.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: text, marginBottom: 2 }}>{f.title}</Text>
                <Text style={{ fontSize: 12, color: muted, lineHeight: 18 }}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  )
}
