import React, { useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, ScrollView,
} from 'react-native'
import * as DocumentPicker from 'expo-document-picker'
import { useNavigation } from '@react-navigation/native'
import api from '../services/api'
import { colors } from '../theme/colors'

const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
]

const ALLOWED_EXTS = ['.pdf', '.docx', '.jpg', '.jpeg', '.png']

export default function UploadScreen() {
  const navigation = useNavigation<any>()
  const [file, setFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null)
  const [uploading, setUploading] = useState(false)

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ALLOWED_TYPES,
        copyToCacheDirectory: true,
      })
      if (!result.canceled && result.assets.length > 0) {
        setFile(result.assets[0])
      }
    } catch {
      Alert.alert('오류', '파일을 선택할 수 없습니다.')
    }
  }

  const handleUpload = async () => {
    if (!file) {
      Alert.alert('파일 없음', '분석할 계약서 파일을 선택해주세요.')
      return
    }

    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!ext || !ALLOWED_EXTS.includes(`.${ext}`)) {
      Alert.alert('지원하지 않는 형식', 'PDF, DOCX, JPG, PNG 파일만 지원합니다.')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType ?? 'application/octet-stream',
      } as any)

      const { data: uploadData } = await api.post('/contracts/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      navigation.navigate('Loading', {
        contractId: uploadData.contract_id,
        filename: file.name,
      })
    } catch (e: any) {
      const msg = e?.response?.data?.detail ?? '업로드에 실패했습니다. 다시 시도해주세요.'
      Alert.alert('업로드 실패', msg)
    } finally {
      setUploading(false)
    }
  }

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>계약서 업로드</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Drop Zone */}
        <TouchableOpacity
          style={[styles.dropZone, file && styles.dropZoneSelected]}
          onPress={pickFile}
          activeOpacity={0.8}
        >
          <Text style={styles.dropIcon}>{file ? '📄' : '📁'}</Text>
          {file ? (
            <>
              <Text style={styles.fileName} numberOfLines={2}>{file.name}</Text>
              <Text style={styles.fileSize}>
                {file.size ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : ''}
              </Text>
              <Text style={styles.changeFile}>파일 변경하기</Text>
            </>
          ) : (
            <>
              <Text style={styles.dropTitle}>파일을 선택하세요</Text>
              <Text style={styles.dropSub}>PDF · DOCX · JPG · PNG</Text>
              <Text style={styles.dropSub}>최대 20MB</Text>
            </>
          )}
        </TouchableOpacity>

        {/* 지원 형식 */}
        <View style={styles.formatRow}>
          {['PDF', 'DOCX', 'JPG', 'PNG'].map((f) => (
            <View key={f} style={styles.formatChip}>
              <Text style={styles.formatText}>{f}</Text>
            </View>
          ))}
        </View>

        {/* 안내 */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>🔒 개인정보 보호</Text>
          <Text style={styles.infoText}>
            업로드된 계약서는 분석 후 즉시 삭제됩니다.{'\n'}
            개인정보는 AI 분석 전에 자동으로 마스킹 처리됩니다.
          </Text>
        </View>

        {/* 분석 시작 버튼 */}
        <TouchableOpacity
          style={[styles.analyzeBtn, (!file || uploading) && styles.analyzeBtnDisabled]}
          onPress={handleUpload}
          disabled={!file || uploading}
          activeOpacity={0.85}
        >
          {uploading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.analyzeBtnText}>AI 분석 시작</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { width: 60 },
  backText: { color: colors.primary, fontSize: 14 },
  headerTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  content: { padding: 20 },
  dropZone: {
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    marginBottom: 16,
  },
  dropZoneSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(79,142,247,0.06)',
  },
  dropIcon: { fontSize: 48, marginBottom: 12 },
  dropTitle: { color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: 6 },
  dropSub: { color: colors.textMuted, fontSize: 13, marginBottom: 2 },
  fileName: { color: colors.text, fontSize: 15, fontWeight: '600', textAlign: 'center', marginBottom: 4 },
  fileSize: { color: colors.textMuted, fontSize: 13, marginBottom: 10 },
  changeFile: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  formatRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  formatChip: {
    backgroundColor: 'rgba(79,142,247,0.12)',
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  formatText: { color: colors.primary, fontSize: 12, fontWeight: '600' },
  infoCard: {
    backgroundColor: 'rgba(34,197,94,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.2)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  infoTitle: { color: colors.safe, fontSize: 13, fontWeight: '700', marginBottom: 6 },
  infoText: { color: colors.textSecondary, fontSize: 12, lineHeight: 18 },
  analyzeBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: 'center',
  },
  analyzeBtnDisabled: { opacity: 0.4 },
  analyzeBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
