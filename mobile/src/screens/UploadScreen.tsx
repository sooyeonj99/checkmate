import React, { useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, ScrollView, ActionSheetIOS, Platform,
} from 'react-native'
import * as DocumentPicker from 'expo-document-picker'
import * as ImagePicker from 'expo-image-picker'
import { useNavigation } from '@react-navigation/native'
import api from '../services/api'
import { colors } from '../theme/colors'

interface FileAsset {
  uri: string
  name: string
  size?: number
  mimeType?: string
}

const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
]

export default function UploadScreen() {
  const navigation = useNavigation<any>()
  const [files, setFiles] = useState<FileAsset[]>([])
  const [uploading, setUploading] = useState(false)

  const pickFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ALLOWED_TYPES,
        copyToCacheDirectory: true,
        multiple: true,
      })
      if (!result.canceled && result.assets.length > 0) {
        setFiles(prev => {
          const existingNames = new Set(prev.map(f => f.name))
          const newOnes = result.assets
            .filter(a => !existingNames.has(a.name))
            .map(a => ({ uri: a.uri, name: a.name, size: a.size ?? undefined, mimeType: a.mimeType ?? undefined }))
          return [...prev, ...newOnes]
        })
      }
    } catch {
      Alert.alert('오류', '파일을 선택할 수 없습니다.')
    }
  }

  const takePicture = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('권한 필요', '카메라 접근 권한이 필요합니다.\n설정에서 카메라 권한을 허용해주세요.')
      return
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: false,
    })

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0]
      const filename = asset.fileName ?? `photo_${Date.now()}.jpg`

      setFiles(prev => [...prev, {
        uri: asset.uri,
        name: filename,
        size: asset.fileSize ?? undefined,
        mimeType: asset.mimeType ?? 'image/jpeg',
      }])

      Alert.alert(
        '사진 추가',
        '추가로 촬영하시겠습니까?',
        [
          { text: '완료', style: 'cancel' },
          { text: '추가 촬영', onPress: takePicture },
        ]
      )
    }
  }

  const showAddOptions = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['취소', '파일 선택', '사진 촬영'], cancelButtonIndex: 0 },
        (idx) => { if (idx === 1) pickFiles(); else if (idx === 2) takePicture() }
      )
    } else {
      Alert.alert('추가', '추가 방법을 선택하세요', [
        { text: '파일 선택', onPress: pickFiles },
        { text: '사진 촬영', onPress: takePicture },
        { text: '취소', style: 'cancel' },
      ])
    }
  }

  const removeFile = (idx: number) => setFiles(prev => prev.filter((_, i) => i !== idx))

  const handleUpload = async () => {
    if (!files.length) {
      Alert.alert('파일 없음', '분석할 계약서 파일을 선택해주세요.')
      return
    }
    setUploading(true)
    try {
      const formData = new FormData()
      files.forEach(f => {
        formData.append('files', { uri: f.uri, name: f.name, type: f.mimeType ?? 'application/octet-stream' } as any)
      })

      const { data: uploadData } = await api.post('/contracts/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      navigation.navigate('MaskingReview', {
        contractId: uploadData.contract_id,
        filename: uploadData.filename,
        contractType: uploadData.contract_type,
      } as any)
    } catch (e: any) {
      const msg = e?.response?.data?.detail ?? '업로드에 실패했습니다.'
      Alert.alert('업로드 실패', msg)
    } finally {
      setUploading(false)
    }
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.getParent()?.navigate('홈')} style={styles.backBtn}>
          <Text style={styles.backText}>← 홈</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>계약서 업로드</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {files.length === 0 ? (
          /* 초기 선택 화면 */
          <View style={styles.choiceArea}>
            <Text style={styles.choiceTitle}>계약서를 업로드하거나{'\n'}사진으로 촬영하세요</Text>
            <View style={styles.choiceRow}>
              <TouchableOpacity style={styles.choiceBtn} onPress={pickFiles} activeOpacity={0.8}>
                <Text style={styles.choiceBtnIcon}>📁</Text>
                <Text style={styles.choiceBtnLabel}>파일 업로드</Text>
                <Text style={styles.choiceBtnSub}>PDF · DOCX · JPG · PNG</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.choiceBtn, styles.choiceBtnCamera]} onPress={takePicture} activeOpacity={0.8}>
                <Text style={styles.choiceBtnIcon}>📷</Text>
                <Text style={styles.choiceBtnLabel}>사진 촬영</Text>
                <Text style={styles.choiceBtnSub}>계약서를 직접 촬영</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.choiceNote}>여러 장 추가 가능 · 최대 20MB</Text>
          </View>
        ) : (
          /* 파일 목록 */
          <View style={styles.fileListCard}>
            <View style={styles.fileListHeader}>
              <Text style={styles.fileListTitle}>
                선택된 파일 <Text style={{ color: colors.primary }}>{files.length}장</Text>
              </Text>
              <TouchableOpacity onPress={showAddOptions} style={styles.addMoreBtn}>
                <Text style={styles.addMoreText}>+ 추가</Text>
              </TouchableOpacity>
            </View>
            {files.map((f, idx) => (
              <View key={idx} style={styles.fileRow}>
                <Text style={styles.fileRowNum}>{idx + 1}</Text>
                <Text style={styles.fileRowIcon}>
                  {f.name.match(/\.(jpg|jpeg|png)$/i) ? '🖼️' : f.name.endsWith('.pdf') ? '📄' : '📝'}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fileRowName} numberOfLines={1}>{f.name}</Text>
                  <Text style={styles.fileRowSize}>
                    {f.size ? `${(f.size / 1024 / 1024).toFixed(2)} MB` : ''}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => removeFile(idx)} style={styles.fileRowRemove}>
                  <Text style={{ color: colors.danger, fontSize: 18 }}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
            {/* 추가 버튼 행 */}
            <View style={styles.addBtnRow}>
              <TouchableOpacity style={styles.addRowBtn} onPress={pickFiles}>
                <Text style={styles.addRowBtnText}>파일 선택</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.addRowBtn, styles.addRowBtnCamera]} onPress={takePicture}>
                <Text style={[styles.addRowBtnText, { color: colors.primary }]}>사진 촬영</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

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
          <Text style={styles.infoTitle}>개인정보 보호</Text>
          <Text style={styles.infoText}>
            업로드된 계약서는 분석 후 즉시 삭제됩니다.{'\n'}
            개인정보는 AI 분석 전에 자동으로 마스킹 처리됩니다.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.analyzeBtn, (!files.length || uploading) && styles.analyzeBtnDisabled]}
          onPress={handleUpload}
          disabled={!files.length || uploading}
          activeOpacity={0.85}
        >
          {uploading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.analyzeBtnText}>
                AI 분석 시작{files.length > 1 ? ` (${files.length}장)` : ''}
              </Text>
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

  choiceArea: { alignItems: 'center', marginBottom: 20 },
  choiceTitle: {
    color: colors.text, fontSize: 17, fontWeight: '700',
    textAlign: 'center', lineHeight: 26, marginBottom: 24,
  },
  choiceRow: { flexDirection: 'row', gap: 14, marginBottom: 14 },
  choiceBtn: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 28,
    alignItems: 'center',
    gap: 8,
  },
  choiceBtnCamera: {
    borderColor: colors.borderAccent,
    backgroundColor: 'rgba(37,99,235,0.04)',
  },
  choiceBtnIcon: { fontSize: 36 },
  choiceBtnLabel: { color: colors.text, fontSize: 15, fontWeight: '700' },
  choiceBtnSub: { color: colors.textMuted, fontSize: 12 },
  choiceNote: { color: colors.textMuted, fontSize: 12 },

  fileListCard: {
    backgroundColor: colors.bgCard, borderRadius: 16, borderWidth: 1,
    borderColor: colors.border, padding: 16, marginBottom: 16,
  },
  fileListHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 12,
  },
  fileListTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  addMoreBtn: {
    backgroundColor: 'rgba(37,99,235,0.1)', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  addMoreText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  fileRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border,
  },
  fileRowNum: { color: colors.textMuted, fontSize: 12, width: 18, textAlign: 'center' },
  fileRowIcon: { fontSize: 20 },
  fileRowName: { color: colors.text, fontSize: 13, fontWeight: '600' },
  fileRowSize: { color: colors.textMuted, fontSize: 11, marginTop: 1 },
  fileRowRemove: { paddingHorizontal: 8, paddingVertical: 4 },

  addBtnRow: {
    flexDirection: 'row', gap: 10, marginTop: 12,
    paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border,
  },
  addRowBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', backgroundColor: colors.bgInput,
  },
  addRowBtnCamera: {
    borderColor: colors.borderAccent,
    backgroundColor: 'rgba(37,99,235,0.06)',
  },
  addRowBtnText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },

  formatRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  formatChip: {
    backgroundColor: 'rgba(79,142,247,0.12)',
    borderRadius: 8, paddingVertical: 5, paddingHorizontal: 12,
  },
  formatText: { color: colors.primary, fontSize: 12, fontWeight: '600' },

  infoCard: {
    backgroundColor: 'rgba(34,197,94,0.08)',
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)',
    borderRadius: 12, padding: 16, marginBottom: 24,
  },
  infoTitle: { color: colors.safe, fontSize: 13, fontWeight: '700', marginBottom: 6 },
  infoText: { color: colors.textSecondary, fontSize: 12, lineHeight: 18 },

  analyzeBtn: {
    backgroundColor: colors.primary, borderRadius: 14,
    paddingVertical: 17, alignItems: 'center',
  },
  analyzeBtnDisabled: { opacity: 0.4 },
  analyzeBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
