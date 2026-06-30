import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Switch,
} from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import api from '../services/api'
import { colors } from '../theme/colors'

interface PiiEntity {
  id: number
  type: string
  label: string
  start: number
  end: number
  original: string
}

const TYPE_COLORS: Record<string, string> = {
  KR_PHONE:        '#ef4444',
  EMAIL:           '#f97316',
  KR_RESIDENT_ID:  '#dc2626',
  KR_BANK_ACCOUNT: '#e11d48',
  KR_BUSINESS_REG: '#7c3aed',
  KR_ADDRESS:      '#2563eb',
  PERSON:          '#059669',
  ORGANIZATION:    '#0891b2',
  LOCATION:        '#0284c7',
  CREDIT_CARD:     '#db2777',
  IP_ADDRESS:      '#6b7280',
  KR_DRIVER_LIC:   '#ca8a04',
  KR_PASSPORT:     '#b45309',
  KR_VEHICLE:      '#15803d',
}

function getColor(type: string) {
  return TYPE_COLORS[type] ?? '#64748b'
}

/* 텍스트 세그먼트 분리 */
function buildSegments(text: string, entities: PiiEntity[]) {
  const sorted = [...entities].sort((a, b) => a.start - b.start)
  const segs: { text: string; entity?: PiiEntity }[] = []
  let cursor = 0
  for (const e of sorted) {
    if (e.start > cursor) segs.push({ text: text.slice(cursor, e.start) })
    segs.push({ text: text.slice(e.start, e.end), entity: e })
    cursor = e.end
  }
  if (cursor < text.length) segs.push({ text: text.slice(cursor) })
  return segs
}

export default function MaskingReviewScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute<any>()
  const { contractId, filename, contractType } = route.params ?? {}

  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [entities, setEntities] = useState<PiiEntity[]>([])
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set())
  const [imageOnly, setImageOnly] = useState(false)
  const [fromOcr, setFromOcr] = useState(false)
  const [tab, setTab] = useState<'text' | 'list'>('list')

  const isImageFile = /\.(jpg|jpeg|png)$/i.test(filename || '')

  useEffect(() => {
    if (!contractId) { navigation.goBack(); return }

    api.get(`/contracts/${contractId}/preview`)
      .then(({ data }) => {
        setImageOnly(data.image_only)
        setFromOcr(data.from_ocr ?? false)
        setText(data.text ?? '')
        const ents: PiiEntity[] = data.entities ?? []
        setEntities(ents)
        setCheckedIds(new Set(ents.map(e => e.id)))
      })
      .catch(() => {
        Alert.alert('알림', '미리보기를 불러오지 못했습니다. 바로 분석합니다.')
        navigation.replace('Loading', { contractId, filename, selectedIds: null })
      })
      .finally(() => setLoading(false))
  }, [contractId])

  const toggle = useCallback((id: number) => {
    setCheckedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const handleStart = () => {
    navigation.replace('Loading', {
      contractId,
      filename,
      selectedIds: entities.length > 0 ? Array.from(checkedIds) : null,
    })
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>
          {isImageFile ? 'AI가 이미지에서 텍스트 추출 중...' : '개인정보 감지 중...'}
        </Text>
        {isImageFile && (
          <Text style={[styles.loadingText, { fontSize: 12, marginTop: 4, opacity: 0.6 }]}>
            이미지 OCR은 10~20초 소요됩니다
          </Text>
        )}
      </View>
    )
  }

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>마스킹 검토</Text>
        <TouchableOpacity onPress={handleStart} style={styles.startBtn}>
          <Text style={styles.startBtnText}>분석 시작</Text>
        </TouchableOpacity>
      </View>

      {/* 진행 단계 표시 */}
      <View style={styles.stepsRow}>
        {['업로드', '마스킹 검토', 'AI 분석'].map((label, i) => (
          <React.Fragment key={label}>
            <View style={styles.stepItem}>
              <View style={[styles.stepDot, i <= 1 && styles.stepDotActive]}>
                <Text style={styles.stepDotText}>{i === 0 ? '✓' : i + 1}</Text>
              </View>
              <Text style={[styles.stepLabel, i === 1 && styles.stepLabelActive]}>{label}</Text>
            </View>
            {i < 2 && <View style={[styles.stepLine, i === 0 && styles.stepLineDone]} />}
          </React.Fragment>
        ))}
      </View>

      {imageOnly ? (
        /* 이미지 OCR 불가 안내 */
        <View style={styles.imageOnlyBox}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>🖼️</Text>
          <Text style={styles.imageOnlyTitle}>이미지 텍스트 추출 불가</Text>
          <Text style={styles.imageOnlyDesc}>
            Gemini API 키가 없거나 OCR에 실패했습니다.{'\n'}
            AI가 이미지를 직접 보면서 분석합니다.
          </Text>
          <TouchableOpacity style={styles.bigStartBtn} onPress={handleStart}>
            <Text style={styles.bigStartBtnText}>AI 분석 시작하기 →</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* OCR 안내 배너 */}
          {fromOcr && (
            <View style={{
              marginHorizontal: 16, marginTop: 12, padding: 12,
              backgroundColor: 'rgba(6,195,255,0.08)',
              borderRadius: 10, borderLeftWidth: 3, borderLeftColor: '#06c3ff',
              flexDirection: 'row', alignItems: 'flex-start', gap: 8,
            }}>
              <Text style={{ fontSize: 18 }}>📸</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#06c3ff', fontWeight: '700', fontSize: 13 }}>
                  이미지 AI OCR 완료
                </Text>
                <Text style={{ color: '#06c3ff', fontSize: 12, marginTop: 2, opacity: 0.85 }}>
                  자동 인식이므로 일부 오류가 있을 수 있습니다. 내용 확인 후 마스킹을 선택하세요.
                </Text>
              </View>
            </View>
          )}
          {/* 탭 */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tabBtn, tab === 'list' && styles.tabBtnActive]}
              onPress={() => setTab('list')}
            >
              <Text style={[styles.tabBtnText, tab === 'list' && styles.tabBtnTextActive]}>
                항목 선택 ({entities.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabBtn, tab === 'text' && styles.tabBtnActive]}
              onPress={() => setTab('text')}
            >
              <Text style={[styles.tabBtnText, tab === 'text' && styles.tabBtnTextActive]}>
                텍스트 미리보기
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            {tab === 'list' ? (
              /* 엔티티 목록 */
              <>
                <View style={styles.listHeader}>
                  <Text style={styles.listHeaderText}>
                    {checkedIds.size}/{entities.length}개 마스킹 선택
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => setCheckedIds(new Set(entities.map(e => e.id)))}
                      style={styles.smallBtn}
                    >
                      <Text style={styles.smallBtnText}>전체 선택</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setCheckedIds(new Set())}
                      style={styles.smallBtn}
                    >
                      <Text style={styles.smallBtnText}>전체 해제</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {entities.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Text style={{ fontSize: 36, marginBottom: 12 }}>✅</Text>
                    <Text style={styles.emptyTitle}>감지된 개인정보 없음</Text>
                    <Text style={styles.emptyDesc}>바로 AI 분석을 진행하세요</Text>
                  </View>
                ) : (
                  entities.map(e => {
                    const checked = checkedIds.has(e.id)
                    const color = getColor(e.type)
                    return (
                      <TouchableOpacity
                        key={e.id}
                        onPress={() => toggle(e.id)}
                        style={[
                          styles.entityCard,
                          checked && { borderColor: color + '60', backgroundColor: color + '0A' },
                        ]}
                        activeOpacity={0.7}
                      >
                        <View style={[
                          styles.checkbox,
                          checked && { backgroundColor: color, borderColor: color },
                        ]}>
                          {checked && (
                            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>✓</Text>
                          )}
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={[styles.labelBadge, { backgroundColor: color + '20' }]}>
                            <Text style={[styles.labelBadgeText, { color }]}>{e.label}</Text>
                          </View>
                          <Text style={styles.originalText} numberOfLines={1}>{e.original}</Text>
                        </View>
                        <Switch
                          value={checked}
                          onValueChange={() => toggle(e.id)}
                          thumbColor={checked ? color : colors.textMuted}
                          trackColor={{ false: colors.border, true: color + '60' }}
                        />
                      </TouchableOpacity>
                    )
                  })
                )}
              </>
            ) : (
              /* 텍스트 미리보기 */
              <View style={styles.textPreviewBox}>
                <Text style={styles.textPreviewNote}>
                  강조된 부분이 감지된 개인정보입니다 (항목 선택 탭에서 마스킹 선택)
                </Text>
                <Text style={styles.textContent}>
                  {buildSegments(text, entities).map((seg, i) => (
                    seg.entity ? (
                      <Text
                        key={i}
                        style={[
                          styles.highlightedSpan,
                          {
                            color: getColor(seg.entity.type),
                            backgroundColor: getColor(seg.entity.type) + '18',
                            textDecorationLine: checkedIds.has(seg.entity.id) ? 'none' : 'line-through',
                          },
                        ]}
                      >
                        {seg.text}
                      </Text>
                    ) : (
                      <Text key={i} style={styles.normalSpan}>{seg.text}</Text>
                    )
                  ))}
                </Text>
              </View>
            )}

            {/* 마스킹 요약 */}
            <View style={styles.summaryBox}>
              <Text style={styles.summaryText}>
                총 <Text style={{ color: colors.primary, fontWeight: '700' }}>{entities.length}</Text>개 감지 ·{' '}
                <Text style={{ color: colors.primary, fontWeight: '700' }}>{checkedIds.size}</Text>개 마스킹 예정
              </Text>
            </View>

            <TouchableOpacity style={styles.analyzeBtn} onPress={handleStart}>
              <Text style={styles.analyzeBtnText}>AI 분석 시작 →</Text>
            </TouchableOpacity>
            <View style={{ height: 40 }} />
          </ScrollView>
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: colors.bg },
  loadingText: { color: colors.textMuted, fontSize: 14 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { padding: 4 },
  backBtnText: { color: colors.textSecondary, fontSize: 14 },
  headerTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  startBtn: {
    backgroundColor: colors.primary, borderRadius: 9,
    paddingVertical: 8, paddingHorizontal: 16,
  },
  startBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  stepsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, paddingHorizontal: 20, gap: 0,
  },
  stepItem: { alignItems: 'center', gap: 4 },
  stepDot: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: colors.bgCard, borderWidth: 1,
    borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
  },
  stepDotActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  stepDotText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  stepLabel: { color: colors.textMuted, fontSize: 10 },
  stepLabelActive: { color: colors.primary, fontWeight: '700' },
  stepLine: { width: 40, height: 1, backgroundColor: colors.border, marginBottom: 14 },
  stepLineDone: { backgroundColor: colors.primary },
  tabRow: {
    flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  tabBtn: {
    flex: 1, paddingVertical: 12, alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabBtnActive: { borderBottomColor: colors.primary },
  tabBtnText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  tabBtnTextActive: { color: colors.primary },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  listHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 12,
  },
  listHeaderText: { color: colors.textMuted, fontSize: 12 },
  smallBtn: {
    paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8,
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border,
  },
  smallBtnText: { color: colors.textSecondary, fontSize: 11 },
  entityCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.bgCard, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border,
    padding: 12, marginBottom: 8,
  },
  checkbox: {
    width: 20, height: 20, borderRadius: 5,
    borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  labelBadge: {
    alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 10, marginBottom: 4,
  },
  labelBadgeText: { fontSize: 11, fontWeight: '700' },
  originalText: { color: colors.text, fontSize: 13, fontWeight: '500' },
  emptyBox: {
    alignItems: 'center', paddingVertical: 40,
    backgroundColor: colors.bgCard, borderRadius: 14,
    borderWidth: 1, borderColor: colors.border,
  },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: '700', marginBottom: 6 },
  emptyDesc: { color: colors.textMuted, fontSize: 13 },
  textPreviewBox: {
    backgroundColor: colors.bgCard, borderRadius: 14,
    borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 16,
  },
  textPreviewNote: {
    color: colors.textMuted, fontSize: 11, marginBottom: 12,
    lineHeight: 16, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 10,
  },
  textContent: { lineHeight: 24 },
  highlightedSpan: {
    fontWeight: '700', borderRadius: 3, paddingHorizontal: 2,
  },
  normalSpan: { color: colors.text, fontSize: 13 },
  summaryBox: {
    marginTop: 16, padding: '12px 16px' as any,
    backgroundColor: 'rgba(79,142,247,0.08)',
    borderRadius: 10, borderWidth: 1,
    borderColor: 'rgba(79,142,247,0.2)',
    paddingVertical: 12, paddingHorizontal: 16,
    marginBottom: 12,
  },
  summaryText: { color: colors.textSecondary, fontSize: 13, textAlign: 'center' },
  analyzeBtn: {
    backgroundColor: colors.primary, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  analyzeBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  imageOnlyBox: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32,
  },
  imageOnlyTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 8 },
  imageOnlyDesc: { color: colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  bigStartBtn: {
    backgroundColor: colors.primary, borderRadius: 14,
    paddingVertical: 16, paddingHorizontal: 40,
  },
  bigStartBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
})
