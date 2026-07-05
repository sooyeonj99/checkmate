import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native'
import { WebView } from 'react-native-webview'
import { useRoute, useNavigation } from '@react-navigation/native'
import { colors } from '../theme/colors'
import api from '../services/api'

type RouteParams = { recordId: number; contractName: string }

export default function SignedDocScreen() {
  const route = useRoute()
  const navigation = useNavigation()
  const { recordId, contractName } = route.params as RouteParams

  const [html, setHtml] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get(`/signing/${recordId}/signed-doc`)
      .then(res => setHtml(res.data))
      .catch(() => setError('서명 문서를 불러올 수 없습니다.'))
      .finally(() => setLoading(false))
  }, [recordId])

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.primary} size="large" />
      <Text style={styles.loadingText}>서명 문서 불러오는 중...</Text>
    </View>
  )

  if (error) return (
    <View style={styles.center}>
      <Text style={styles.errorIcon}>⚠️</Text>
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backBtnText}>돌아가기</Text>
      </TouchableOpacity>
    </View>
  )

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backIcon}>
          <Text style={styles.backIconText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{contractName}</Text>
      </View>
      <WebView
        source={{ html: html! }}
        style={styles.webview}
        javaScriptEnabled
        originWhitelist={['*']}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: colors.bgCard,
  },
  backIcon: { padding: 4, marginRight: 10 },
  backIconText: { color: colors.primary, fontSize: 20, fontWeight: '700' },
  title: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '700' },
  webview: { flex: 1 },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { color: colors.textMuted, fontSize: 14, marginTop: 12 },
  errorIcon: { fontSize: 40, marginBottom: 12 },
  errorText: { color: colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 22 },
  backBtn: {
    marginTop: 20, backgroundColor: colors.primary,
    borderRadius: 10, paddingVertical: 12, paddingHorizontal: 28,
  },
  backBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
})
