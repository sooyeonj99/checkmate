import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, Share,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useTheme } from '../context/ThemeContext'
import api from '../services/api'

const CONTRACT_TEMPLATES = [
  { type: '근로계약서', icon: '👷', desc: '월급, 근무시간, 계약기간을 알려주세요.' },
  { type: '임대차계약서', icon: '🏠', desc: '임대인, 임차인, 보증금, 월세, 기간을 입력해주세요.' },
  { type: '프리랜서 계약서', icon: '💻', desc: '업무 범위, 납기일, 금액, 지급 조건을 알려주세요.' },
  { type: '용역계약서', icon: '🔧', desc: '용역 내용, 금액, 이행 기간을 입력해주세요.' },
  { type: '물품공급계약서', icon: '📦', desc: '공급 품목, 수량, 단가, 납기를 알려주세요.' },
  { type: '비밀유지계약서', icon: '🔒', desc: '기밀 정보 범위와 보호 기간을 알려주세요.' },
  { type: '동업계약서', icon: '🤝', desc: '지분 비율, 역할 분담, 수익 배분을 입력해주세요.' },
  { type: '전대차계약서', icon: '🏢', desc: '전대 조건, 기간, 임대료를 알려주세요.' },
]

export default function GenerateScreen() {
  const navigation = useNavigation()
  const { isDark } = useTheme()

  const [description, setDescription] = useState('')
  const [contractType, setContractType] = useState('')
  const [result, setResult] = useState<{ contract_text: string; suggested_title: string; contract_type: string } | null>(null)
  const [loading, setLoading] = useState(false)

  const selectTemplate = (tpl: typeof CONTRACT_TEMPLATES[0]) => {
    setContractType(tpl.type)
    setDescription(prev => prev || tpl.desc)
  }

  const generate = async () => {
    if (!description.trim()) { Alert.alert('입력 필요', '계약서 내용을 설명해주세요.'); return }
    setLoading(true)
    setResult(null)
    try {
      const res = await api.post('/contracts/generate', {
        description: description.trim(),
        contract_type: contractType.trim() || undefined,
      })
      setResult(res.data)
    } catch {
      Alert.alert('오류', 'AI 생성 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const shareResult = async () => {
    if (!result) return
    await Share.share({ message: `${result.suggested_title}\n\n${result.contract_text}`, title: result.suggested_title })
  }

  const bg = isDark ? '#0f1117' : '#f7f6f3'
  const card = isDark ? '#1a1d27' : '#fff'
  const text = isDark ? '#e8e6e1' : '#1a1917'
  const muted = isDark ? '#6b6860' : '#a09e99'
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.09)'
  const inputBg = isDark ? '#1e2130' : '#f0ede8'

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      {/* 헤더 */}
      <View style={{ backgroundColor: card, borderBottomWidth: 1, borderBottomColor: border, paddingTop: 52, paddingBottom: 16, paddingHorizontal: 20 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: 12 }}>
          <Text style={{ color: '#2563eb', fontSize: 14 }}>← 뒤로</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: '800', color: text }}>AI 계약서 생성기</Text>
        <Text style={{ fontSize: 13, color: muted, marginTop: 4 }}>설명만 입력하면 AI가 계약서를 작성합니다</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 16 }}>
        {/* 표준 계약서 유형 */}
        <View>
          <Text style={{ fontSize: 13, fontWeight: '700', color: text, marginBottom: 10 }}>표준 계약서 선택</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {CONTRACT_TEMPLATES.map(tpl => (
              <TouchableOpacity
                key={tpl.type}
                onPress={() => selectTemplate(tpl)}
                style={{
                  paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20,
                  borderWidth: 1.5,
                  backgroundColor: contractType === tpl.type ? '#2563eb' : card,
                  borderColor: contractType === tpl.type ? '#2563eb' : border,
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                }}
              >
                <Text style={{ fontSize: 14 }}>{tpl.icon}</Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: contractType === tpl.type ? '#fff' : text }}>{tpl.type}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 계약 유형 직접 입력 */}
        <View>
          <Text style={{ fontSize: 13, fontWeight: '700', color: text, marginBottom: 8 }}>계약 유형 (직접 입력)</Text>
          <TextInput
            value={contractType}
            onChangeText={setContractType}
            placeholder="예: 근로계약서, 임대차계약서, 프리랜서 계약"
            placeholderTextColor={muted}
            style={{
              backgroundColor: inputBg, borderRadius: 12, padding: 14,
              fontSize: 14, color: text, borderWidth: 1, borderColor: border,
            }}
          />
        </View>

        {/* 설명 입력 */}
        <View>
          <Text style={{ fontSize: 13, fontWeight: '700', color: text, marginBottom: 8 }}>계약 내용 설명 *</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder={'예: 월급 300만원, 주 5일 근무, 계약기간 1년인 정규직 근로계약서를 작성해줘. 연차는 15일이고 퇴직금 포함.'}
            placeholderTextColor={muted}
            multiline
            numberOfLines={6}
            style={{
              backgroundColor: inputBg, borderRadius: 12, padding: 14,
              fontSize: 14, color: text, borderWidth: 1, borderColor: border,
              minHeight: 140, textAlignVertical: 'top',
            }}
          />
        </View>

        <TouchableOpacity
          onPress={generate}
          disabled={loading}
          style={{
            backgroundColor: '#2563eb', borderRadius: 14, padding: 16,
            alignItems: 'center', opacity: loading ? 0.7 : 1,
          }}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>✨ AI 계약서 생성</Text>
          }
        </TouchableOpacity>

        {/* 결과 */}
        {result && (
          <View style={{ backgroundColor: card, borderRadius: 16, borderWidth: 1, borderColor: border, overflow: 'hidden' }}>
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: text }}>{result.suggested_title}</Text>
                <Text style={{ fontSize: 12, color: '#2563eb', fontWeight: '700', marginTop: 4 }}>{result.contract_type}</Text>
              </View>
              <TouchableOpacity onPress={shareResult} style={{ backgroundColor: 'rgba(37,99,235,0.1)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 }}>
                <Text style={{ color: '#2563eb', fontWeight: '700', fontSize: 13 }}>공유</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              <Text style={{ padding: 16, fontSize: 13, color: text, lineHeight: 22 }}>{result.contract_text}</Text>
            </ScrollView>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  )
}
