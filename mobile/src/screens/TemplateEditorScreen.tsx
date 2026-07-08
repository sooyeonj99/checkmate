import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList,
  ActivityIndicator, RefreshControl, Alert, Modal, TextInput,
} from 'react-native'
import { colors } from '../theme/colors'
import api from '../services/api'

interface Template {
  id: number
  name: string
  description: string
  fields: TemplateField[]
  created_at: string
}

interface TemplateField {
  id: string
  label: string
  type: 'text' | 'date' | 'signature'
  required: boolean
}

const FIELD_TYPES: { type: TemplateField['type']; label: string; icon: string }[] = [
  { type: 'text', label: '텍스트', icon: '✏️' },
  { type: 'date', label: '날짜', icon: '📅' },
  { type: 'signature', label: '서명', icon: '✍️' },
]

export default function TemplateEditorScreen() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [createVisible, setCreateVisible] = useState(false)
  const [editTarget, setEditTarget] = useState<Template | null>(null)

  const [tplName, setTplName] = useState('')
  const [tplDesc, setTplDesc] = useState('')
  const [fields, setFields] = useState<TemplateField[]>([])
  const [saving, setSaving] = useState(false)

  const loadTemplates = useCallback(async () => {
    try {
      const { data } = await api.get('/signing/templates')
      setTemplates(data)
    } catch {
      // API 미지원 시 빈 배열
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { loadTemplates() }, [loadTemplates])

  const openCreate = () => {
    setTplName(''); setTplDesc('')
    setFields([{ id: Date.now().toString(), label: '서명자 이름', type: 'text', required: true }])
    setEditTarget(null)
    setCreateVisible(true)
  }

  const openEdit = (tpl: Template) => {
    setTplName(tpl.name); setTplDesc(tpl.description)
    setFields(tpl.fields)
    setEditTarget(tpl)
    setCreateVisible(true)
  }

  const addField = (type: TemplateField['type']) => {
    const labels: Record<TemplateField['type'], string> = {
      text: '텍스트 필드',
      date: '날짜',
      signature: '서명',
    }
    setFields(prev => [...prev, {
      id: Date.now().toString(),
      label: labels[type],
      type,
      required: false,
    }])
  }

  const updateField = (id: string, label: string) => {
    setFields(prev => prev.map(f => f.id === id ? { ...f, label } : f))
  }

  const toggleRequired = (id: string) => {
    setFields(prev => prev.map(f => f.id === id ? { ...f, required: !f.required } : f))
  }

  const removeField = (id: string) => {
    setFields(prev => prev.filter(f => f.id !== id))
  }

  const handleSave = async () => {
    if (!tplName.trim()) { Alert.alert('오류', '템플릿 이름을 입력해주세요.'); return }
    if (fields.length === 0) { Alert.alert('오류', '필드를 하나 이상 추가해주세요.'); return }
    setSaving(true)
    try {
      const body = { name: tplName.trim(), description: tplDesc.trim(), fields }
      if (editTarget) {
        await api.put(`/signing/templates/${editTarget.id}`, body)
      } else {
        await api.post('/signing/templates', body)
      }
      setCreateVisible(false)
      loadTemplates()
    } catch (e: any) {
      Alert.alert('오류', e?.response?.data?.detail ?? '저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (tpl: Template) => {
    Alert.alert('삭제 확인', `"${tpl.name}" 템플릿을 삭제하시겠습니까?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제', style: 'destructive', onPress: async () => {
          try {
            await api.delete(`/signing/templates/${tpl.id}`)
            loadTemplates()
          } catch {
            Alert.alert('오류', '삭제에 실패했습니다.')
          }
        },
      },
    ])
  }

  return (
    <View style={styles.root}>
      {/* 템플릿 생성/수정 모달 */}
      <Modal visible={createVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>{editTarget ? '템플릿 수정' : '새 템플릿'}</Text>

              <Text style={styles.inputLabel}>템플릿 이름 *</Text>
              <TextInput
                style={styles.input}
                value={tplName}
                onChangeText={setTplName}
                placeholder="예: 근로계약서 표준 서식"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.inputLabel}>설명 (선택)</Text>
              <TextInput
                style={[styles.input, { height: 70 }]}
                value={tplDesc}
                onChangeText={setTplDesc}
                placeholder="템플릿 용도를 간단히 설명해주세요"
                placeholderTextColor={colors.textMuted}
                multiline
              />

              <Text style={styles.inputLabel}>필드 목록</Text>
              {fields.map((f, i) => (
                <View key={f.id} style={styles.fieldRow}>
                  <View style={styles.fieldTypeTag}>
                    <Text style={styles.fieldTypeIcon}>
                      {FIELD_TYPES.find(t => t.type === f.type)?.icon ?? '📝'}
                    </Text>
                  </View>
                  <TextInput
                    style={styles.fieldInput}
                    value={f.label}
                    onChangeText={(v) => updateField(f.id, v)}
                    placeholder="필드 이름"
                    placeholderTextColor={colors.textMuted}
                  />
                  <TouchableOpacity
                    style={[styles.requiredToggle, f.required && styles.requiredToggleOn]}
                    onPress={() => toggleRequired(f.id)}
                  >
                    <Text style={[styles.requiredToggleText, f.required && styles.requiredToggleTextOn]}>
                      {f.required ? '필수' : '선택'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => removeField(f.id)}>
                    <Text style={styles.removeField}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}

              <Text style={styles.addFieldTitle}>필드 추가</Text>
              <View style={styles.addFieldRow}>
                {FIELD_TYPES.map(({ type, label, icon }) => (
                  <TouchableOpacity key={type} style={styles.addFieldBtn} onPress={() => addField(type)}>
                    <Text style={styles.addFieldIcon}>{icon}</Text>
                    <Text style={styles.addFieldLabel}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setCreateVisible(false)}>
                  <Text style={styles.cancelText}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                  {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>저장</Text>}
                </TouchableOpacity>
              </View>
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      <View style={styles.header}>
        <Text style={styles.headerTitle}>서명 템플릿 편집</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
          <Text style={styles.addBtnText}>+ 새 템플릿</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadTemplates() }} tintColor={colors.primary} />}
      >
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : templates.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📝</Text>
            <Text style={styles.emptyTitle}>서명 템플릿이 없습니다</Text>
            <Text style={styles.emptyDesc}>
              전자서명 시 반복적으로 사용할{'\n'}서식을 미리 만들어두세요.
            </Text>
            <TouchableOpacity style={styles.emptyCreateBtn} onPress={openCreate}>
              <Text style={styles.emptyCreateText}>첫 번째 템플릿 만들기</Text>
            </TouchableOpacity>
          </View>
        ) : (
          templates.map(tpl => (
            <TemplateCard key={tpl.id} template={tpl} onEdit={() => openEdit(tpl)} onDelete={() => handleDelete(tpl)} />
          ))
        )}
        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  )
}

function TemplateCard({ template, onEdit, onDelete }: { template: Template; onEdit: () => void; onDelete: () => void }) {
  return (
    <View style={styles.tplCard}>
      <View style={styles.tplHeader}>
        <Text style={styles.tplName}>{template.name}</Text>
        <View style={styles.tplActions}>
          <TouchableOpacity style={styles.tplEditBtn} onPress={onEdit}>
            <Text style={styles.tplEditText}>편집</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tplDeleteBtn} onPress={onDelete}>
            <Text style={styles.tplDeleteText}>삭제</Text>
          </TouchableOpacity>
        </View>
      </View>
      {template.description ? <Text style={styles.tplDesc}>{template.description}</Text> : null}
      <View style={styles.fieldTags}>
        {template.fields.slice(0, 4).map(f => (
          <View key={f.id} style={styles.fieldTag}>
            <Text style={styles.fieldTagText}>
              {FIELD_TYPES.find(t => t.type === f.type)?.icon} {f.label}
              {f.required ? ' *' : ''}
            </Text>
          </View>
        ))}
        {template.fields.length > 4 && (
          <View style={styles.fieldTag}>
            <Text style={styles.fieldTagText}>+{template.fields.length - 4}개</Text>
          </View>
        )}
      </View>
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
  tplCard: {
    backgroundColor: colors.bgCard, borderRadius: 14, borderWidth: 1,
    borderColor: colors.border, padding: 16, marginBottom: 12,
  },
  tplHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  tplName: { color: colors.text, fontSize: 15, fontWeight: '700', flex: 1 },
  tplActions: { flexDirection: 'row', gap: 6 },
  tplEditBtn: { borderWidth: 1, borderColor: colors.borderAccent, borderRadius: 8, paddingVertical: 4, paddingHorizontal: 10 },
  tplEditText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  tplDeleteBtn: { borderWidth: 1, borderColor: 'rgba(217,64,64,0.3)', borderRadius: 8, paddingVertical: 4, paddingHorizontal: 10 },
  tplDeleteText: { color: colors.danger, fontSize: 12, fontWeight: '700' },
  tplDesc: { color: colors.textMuted, fontSize: 13, marginBottom: 10 },
  fieldTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  fieldTag: { backgroundColor: colors.bgInput, borderRadius: 8, borderWidth: 1, borderColor: colors.border, paddingVertical: 4, paddingHorizontal: 8 },
  fieldTagText: { color: colors.textSecondary, fontSize: 11 },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 52, marginBottom: 16 },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 8 },
  emptyDesc: { color: colors.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  emptyCreateBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 24 },
  emptyCreateText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: colors.bgCard, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, paddingBottom: 0, borderWidth: 1, borderColor: colors.border,
    maxHeight: '90%',
  },
  modalTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 4 },
  inputLabel: { color: colors.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 14 },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    padding: 14, color: colors.text, fontSize: 15, backgroundColor: colors.bgInput,
  },
  fieldRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8,
  },
  fieldTypeTag: {
    width: 36, height: 36, borderRadius: 8, backgroundColor: colors.bgInput,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
  },
  fieldTypeIcon: { fontSize: 16 },
  fieldInput: {
    flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 8,
    paddingVertical: 8, paddingHorizontal: 10, color: colors.text, fontSize: 14,
    backgroundColor: colors.bgInput,
  },
  requiredToggle: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 6,
    paddingVertical: 5, paddingHorizontal: 8,
  },
  requiredToggleOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  requiredToggleText: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  requiredToggleTextOn: { color: '#fff' },
  removeField: { color: colors.danger, fontSize: 18, paddingHorizontal: 4 },
  addFieldTitle: { color: colors.textMuted, fontSize: 12, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  addFieldRow: { flexDirection: 'row', gap: 8 },
  addFieldBtn: {
    flex: 1, backgroundColor: colors.bgInput, borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, paddingVertical: 10, alignItems: 'center', gap: 4,
  },
  addFieldIcon: { fontSize: 20 },
  addFieldLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: '600' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn: {
    flex: 1, borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, paddingVertical: 14, alignItems: 'center',
  },
  cancelText: { color: colors.textMuted, fontWeight: '600', fontSize: 15 },
  saveBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 15 },
})
