import React, { useState, useEffect } from 'react'
import {
  View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Modal, FlatList,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useTheme } from '../context/ThemeContext'
import api from '../services/api'

interface SavedItem { id: number; filename: string; grade: string; score: number }
interface ClauseDiff { article: string; title_a: string; title_b: string; risk_a: string; risk_b: string; changed: boolean }
interface CompareResult {
  filename_a: string; filename_b: string
  score_a: number; score_b: number; grade_a: string; grade_b: string
  clause_diffs: ClauseDiff[]; ai_verdict: string
}

function ContractPicker({
  label, contracts, selected, onSelect, bg, card, text, muted, border,
}: {
  label: string; contracts: SavedItem[]; selected: number | null
  onSelect: (id: number) => void; bg: string; card: string; text: string; muted: string; border: string
}) {
  const [open, setOpen] = useState(false)
  const current = contracts.find(c => c.id === selected)

  return (
    <>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        style={{ backgroundColor: card, borderRadius: 14, borderWidth: 1, borderColor: selected ? '#2563eb' : border, padding: 14 }}
      >
        <Text style={{ fontSize: 12, color: muted, marginBottom: 6 }}>계약서 {label}</Text>
        <Text style={{ fontSize: 14, color: current ? text : muted, fontWeight: current ? '700' : '400' }}>
          {current ? `${current.filename} (${current.grade} ${current.score}점)` : '선택하세요'}
        </Text>
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: card, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%' }}>
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: border, flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: text }}>계약서 {label} 선택</Text>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <Text style={{ color: muted, fontSize: 20 }}>✕</Text>
              </TouchableOpacity>
            </View>
            {contracts.length === 0 ? (
              <Text style={{ padding: 24, textAlign: 'center', color: muted }}>저장된 계약서가 없습니다.</Text>
            ) : (
              <FlatList
                data={contracts}
                keyExtractor={c => String(c.id)}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => { onSelect(item.id); setOpen(false) }}
                    style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: text }} numberOfLines={2}>{item.filename}</Text>
                      <Text style={{ fontSize: 12, color: muted, marginTop: 2 }}>{item.grade} · {item.score}점</Text>
                    </View>
                    {item.id === selected && <Text style={{ color: '#2563eb', fontSize: 18 }}>✓</Text>}
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </>
  )
}

export default function CompareScreen() {
  const navigation = useNavigation()
  const { isDark } = useTheme()

  const [contracts, setContracts] = useState<SavedItem[]>([])
  const [selectedA, setSelectedA] = useState<number | null>(null)
  const [selectedB, setSelectedB] = useState<number | null>(null)
  const [result, setResult] = useState<CompareResult | null>(null)
  const [loading, setLoading] = useState(false)

  const bg = isDark ? '#0f1117' : '#f7f6f3'
  const card = isDark ? '#1a1d27' : '#fff'
  const text = isDark ? '#e8e6e1' : '#1a1917'
  const muted = isDark ? '#6b6860' : '#a09e99'
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.09)'

  useEffect(() => {
    api.get('/contracts/saved').then(r => setContracts(r.data)).catch(() => {})
  }, [])

  const gradeColor = (g: string) => g === '위험' ? '#ef4444' : g === '주의' ? '#f59e0b' : '#22c55e'

  const compare = async () => {
    if (!selectedA || !selectedB || selectedA === selectedB) {
      Alert.alert('선택 필요', '서로 다른 계약서 두 개를 선택하세요.'); return
    }
    setLoading(true); setResult(null)
    try {
      const res = await api.post('/contracts/compare', { saved_id_a: selectedA, saved_id_b: selectedB })
      setResult(res.data)
    } catch { Alert.alert('오류', '비교 분석 중 오류가 발생했습니다.') }
    finally { setLoading(false) }
  }

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <View style={{ backgroundColor: card, borderBottomWidth: 1, borderBottomColor: border, paddingTop: 52, paddingBottom: 16, paddingHorizontal: 20 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: 12 }}>
          <Text style={{ color: '#2563eb', fontSize: 14 }}>← 뒤로</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: '800', color: text }}>계약서 비교</Text>
        <Text style={{ fontSize: 13, color: muted, marginTop: 4 }}>두 계약서를 AI로 비교 분석합니다</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
        <ContractPicker label="A" contracts={contracts} selected={selectedA} onSelect={setSelectedA}
          bg={bg} card={card} text={text} muted={muted} border={border} />
        <ContractPicker label="B" contracts={contracts} selected={selectedB} onSelect={setSelectedB}
          bg={bg} card={card} text={text} muted={muted} border={border} />

        <TouchableOpacity
          onPress={compare}
          disabled={loading || !selectedA || !selectedB}
          style={{
            backgroundColor: selectedA && selectedB ? '#2563eb' : (isDark ? '#2a2d3e' : '#e5e7eb'),
            borderRadius: 14, padding: 16, alignItems: 'center', opacity: loading ? 0.7 : 1,
          }}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={{ color: selectedA && selectedB ? '#fff' : muted, fontWeight: '800', fontSize: 16 }}>비교 분석 시작</Text>
          }
        </TouchableOpacity>

        {result && (
          <>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              {[{ name: result.filename_a, grade: result.grade_a, score: result.score_a },
                { name: result.filename_b, grade: result.grade_b, score: result.score_b }].map((item, i) => (
                <React.Fragment key={i}>
                  <View style={{ flex: 1, backgroundColor: card, borderRadius: 14, borderWidth: 1, borderColor: border, padding: 16, alignItems: 'center' }}>
                    <Text style={{ fontSize: 11, color: muted, marginBottom: 4 }}>계약서 {i === 0 ? 'A' : 'B'}</Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: text, textAlign: 'center', marginBottom: 8 }} numberOfLines={2}>{item.name}</Text>
                    <Text style={{ fontSize: 32, fontWeight: '900', color: gradeColor(item.grade) }}>{item.score}</Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: gradeColor(item.grade) }}>{item.grade}</Text>
                  </View>
                  {i === 0 && <Text style={{ fontSize: 20, fontWeight: '800', color: muted }}>VS</Text>}
                </React.Fragment>
              ))}
            </View>

            <View style={{ backgroundColor: 'rgba(37,99,235,0.08)', borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(37,99,235,0.2)', padding: 18 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#2563eb', marginBottom: 8 }}>AI 분석 의견</Text>
              <Text style={{ fontSize: 14, color: text, lineHeight: 22 }}>{result.ai_verdict}</Text>
            </View>

            {result.clause_diffs.map((diff, i) => (
              <View key={i} style={{ backgroundColor: diff.changed ? 'rgba(245,158,11,0.06)' : card, borderRadius: 12, borderWidth: 1, borderColor: diff.changed ? 'rgba(245,158,11,0.25)' : border, padding: 14 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: muted }}>{diff.article}</Text>
                  {diff.changed && <Text style={{ fontSize: 14 }}>⚠️</Text>}
                </View>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {[{ label: 'A', title: diff.title_a, risk: diff.risk_a }, { label: 'B', title: diff.title_b, risk: diff.risk_b }].map(s => (
                    <View key={s.label} style={{ flex: 1 }}>
                      <Text style={{ fontSize: 10, color: muted, marginBottom: 4 }}>계약서 {s.label}</Text>
                      <Text style={{ fontSize: 13, color: text, marginBottom: 4 }}>{s.title}</Text>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: s.risk === 'danger' ? '#ef4444' : s.risk === 'warn' ? '#f59e0b' : '#22c55e' }}>{s.risk}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  )
}
