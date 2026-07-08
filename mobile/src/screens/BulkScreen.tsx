import React, { useState } from 'react'
import {
  View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert,
} from 'react-native'
import * as DocumentPicker from 'expo-document-picker'
import { useNavigation } from '@react-navigation/native'
import { useTheme } from '../context/ThemeContext'
import api from '../services/api'

interface BulkItem {
  filename: string; contract_id: string
  status: 'queued' | 'analyzing' | 'done' | 'error'
  grade?: string; score?: number; error_msg?: string
}

export default function BulkScreen() {
  const navigation = useNavigation()
  const { isDark } = useTheme()

  const [items, setItems] = useState<BulkItem[]>([])
  const [uploading, setUploading] = useState(false)
  const [msg, setMsg] = useState('')

  const bg = isDark ? '#0f1117' : '#f7f6f3'
  const card = isDark ? '#1a1d27' : '#fff'
  const text = isDark ? '#e8e6e1' : '#1a1917'
  const muted = isDark ? '#6b6860' : '#a09e99'
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.09)'
  const gradeColor = (g?: string) => g === '위험' ? '#ef4444' : g === '주의' ? '#f59e0b' : '#22c55e'

  const pickFiles = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*', multiple: true })
    if (result.canceled) return
    if (result.assets.length > 10) { Alert.alert('최대 10개', '한 번에 최대 10개 파일을 선택할 수 있습니다.'); return }

    setUploading(true); setMsg('')
    const fd = new FormData()
    for (const f of result.assets) {
      fd.append('files', { uri: f.uri, name: f.name, type: f.mimeType ?? 'application/octet-stream' } as any)
    }
    try {
      const res = await api.post('/contracts/bulk-upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      const queued: BulkItem[] = res.data.items
        .filter((c: any) => c.status === 'uploaded')
        .map((c: any) => ({ filename: c.filename, contract_id: c.contract_id, status: 'queued' as const }))
      setItems(queued)
      setMsg(`${res.data.success}/${res.data.total}개 파일 업로드 완료`)
    } catch { setMsg('업로드 실패') }
    setUploading(false)
  }

  const analyzeOne = async (idx: number) => {
    const item = items[idx]
    setItems(p => p.map((x, i) => i === idx ? { ...x, status: 'analyzing' } : x))
    try {
      const res = await api.post(`/contracts/${item.contract_id}/analyze`, {})
      setItems(p => p.map((x, i) => i === idx ? { ...x, status: 'done', grade: res.data.grade, score: res.data.score } : x))
    } catch {
      setItems(p => p.map((x, i) => i === idx ? { ...x, status: 'error', error_msg: '분석 실패' } : x))
    }
  }

  const analyzeAll = () => items.forEach((_, i) => { if (items[i].status === 'queued') analyzeOne(i) })

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <View style={{ backgroundColor: card, borderBottomWidth: 1, borderBottomColor: border, paddingTop: 52, paddingBottom: 16, paddingHorizontal: 20 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: 12 }}>
          <Text style={{ color: '#2563eb', fontSize: 14 }}>← 뒤로</Text>
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ fontSize: 20, fontWeight: '800', color: text }}>계약서 일괄 분석</Text>
            <Text style={{ fontSize: 13, color: muted, marginTop: 4 }}>최대 10개 파일 동시 분석</Text>
          </View>
          {items.some(x => x.status === 'queued') && (
            <TouchableOpacity onPress={analyzeAll} style={{ backgroundColor: '#2563eb', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 }}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>전체 분석</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
        {/* 업로드 버튼 */}
        <TouchableOpacity
          onPress={pickFiles}
          disabled={uploading}
          style={{ backgroundColor: card, borderRadius: 16, borderWidth: 2, borderColor: '#2563eb', borderStyle: 'dashed', padding: 36, alignItems: 'center' }}
        >
          {uploading ? <ActivityIndicator color="#2563eb" /> : (
            <>
              <Text style={{ fontSize: 36, marginBottom: 10 }}>📁</Text>
              <Text style={{ fontSize: 15, fontWeight: '700', color: text, marginBottom: 6 }}>파일 선택하기</Text>
              <Text style={{ fontSize: 12, color: muted }}>PDF, DOCX, TXT, JPG, PNG · 최대 10개</Text>
            </>
          )}
        </TouchableOpacity>

        {msg !== '' && (
          <View style={{ backgroundColor: msg.includes('실패') ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: msg.includes('실패') ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)' }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: msg.includes('실패') ? '#ef4444' : '#16a34a' }}>{msg}</Text>
          </View>
        )}

        {/* 파일 목록 */}
        {items.map((item, idx) => (
          <View key={idx} style={{ backgroundColor: card, borderRadius: 12, borderWidth: 1, borderColor: border, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <Text style={{ fontSize: 24 }}>
              {item.status === 'done' ? '✅' : item.status === 'error' ? '❌' : item.status === 'analyzing' ? '⏳' : '📄'}
            </Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: text }} numberOfLines={1}>{item.filename}</Text>
              <Text style={{ fontSize: 12, color: muted, marginTop: 3 }}>
                {item.status === 'queued' && '분석 대기 중'}
                {item.status === 'analyzing' && 'AI 분석 중...'}
                {item.status === 'done' && <Text style={{ color: gradeColor(item.grade), fontWeight: '700' }}>{item.grade} · {item.score}점</Text>}
                {item.status === 'error' && <Text style={{ color: '#ef4444' }}>{item.error_msg}</Text>}
              </Text>
            </View>
            {item.status === 'queued' && (
              <TouchableOpacity onPress={() => analyzeOne(idx)} style={{ backgroundColor: 'rgba(37,99,235,0.1)', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#2563eb' }}>
                <Text style={{ color: '#2563eb', fontWeight: '700', fontSize: 13 }}>분석</Text>
              </TouchableOpacity>
            )}
            {item.status === 'analyzing' && <ActivityIndicator color="#2563eb" />}
          </View>
        ))}

        {items.length === 0 && !uploading && (
          <Text style={{ textAlign: 'center', color: muted, fontSize: 13, marginTop: 20 }}>
            여러 계약서를 한 번에 선택해서 각각 AI 분석을 실행할 수 있습니다.
          </Text>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  )
}
