import React, { useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, LayoutAnimation, UIManager, Platform, Alert,
  ActivityIndicator,
} from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import api from '../services/api'
import { colors } from '../theme/colors'

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

interface Clause {
  id: number
  level: 'danger' | 'warn' | 'safe'
  title: string
  article: string
  desc: string
  original: string
  problem?: string
  suggestion: string
  lawRef: string
}

interface AnalysisResult {
  contractName: string
  score: number
  grade: 'danger' | 'warn' | 'safe'
  dangerCount: number
  warnCount: number
  safeCount: number
  analysisTime: string
  contractType: string
  contractText: string
  clauses: Clause[]
}

function transformApiResult(data: any): AnalysisResult {
  const filtered = (data.clauses ?? []).filter(
    (c: any) => c.risk === 'danger' || c.risk === 'warn'
  )
  const clauses: Clause[] = filtered.map((c: any, i: number) => ({
    id: i + 1,
    level: c.risk as 'danger' | 'warn',
    title: c.title ?? '',
    article: c.article ?? '',
    desc: c.description ?? '',
    original: c.original ?? '',
    suggestion: c.suggestion ?? '',
    lawRef: c.law_ref ?? '',
  }))
  const grade = data.grade === '위험' ? 'danger' : data.grade === '주의' ? 'warn' : 'safe'
  return {
    contractName: data.filename ?? '계약서',
    score: data.score ?? 0,
    grade,
    dangerCount: data.danger_count ?? 0,
    warnCount: data.warn_count ?? 0,
    safeCount: data.safe_count ?? 0,
    analysisTime: data.analysis_time ?? '',
    contractType: data.contract_type ?? '',
    contractText: data.contract_text ?? '',
    clauses,
  }
}

export default function ResultScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute<any>()
  const rawResult = route.params?.analysisResult
  const contractId = route.params?.contractId as string | undefined
  const isSavedParam = route.params?.isSaved === true
  const isMock = !rawResult

  const result: AnalysisResult = rawResult ? transformApiResult(rawResult) : MOCK_RESULT

  const [openId, setOpenId] = useState<number | null>(1)
  const [saveState, setSaveState] = useState<'pending' | 'saved'>(
    (isMock || isSavedParam) ? 'saved' : 'pending'
  )
  const [saving, setSaving] = useState(false)

  const scoreColor = result.score >= 61 ? colors.danger : result.score >= 31 ? colors.warn : colors.safe
  const gradeLabel = result.grade === 'danger' ? '⚠ 위험' : result.grade === 'warn' ? '⚡ 주의' : '✓ 안전'

  const toggle = (id: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setOpenId((prev) => (prev === id ? null : id))
  }

  const handleSave = useCallback(async () => {
    if (!contractId || !rawResult) { setSaveState('saved'); return }
    setSaving(true)
    try {
      await api.post(`/contracts/${contractId}/save`, rawResult)
      setSaveState('saved')
      Alert.alert('저장 완료', '분석 결과가 대시보드에 저장되었습니다.')
    } catch (e: any) {
      if (e?.response?.status === 409) {
        setSaveState('saved')
      } else {
        setSaveState('saved')
        Alert.alert('알림', '저장 중 오류가 발생했지만 결과는 확인할 수 있습니다.')
      }
    } finally {
      setSaving(false)
    }
  }, [contractId, rawResult])

  const handleDiscard = useCallback(() => {
    Alert.alert(
      '저장 안 함',
      '결과를 저장하지 않으면 다시 볼 수 없습니다. 계속하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '저장 안 함',
          style: 'destructive',
          onPress: async () => {
            if (contractId) {
              api.delete(`/contracts/${contractId}`).catch(() => {})
            }
            navigation.navigate('Main', { screen: 'Dashboard' } as any)
          },
        },
      ]
    )
  }, [contractId, navigation])

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.getParent()?.navigate('대시보드')} style={styles.backBtn}>
          <Text style={styles.backText}>대시보드</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>분석 결과</Text>
        <TouchableOpacity onPress={() => navigation.replace('Upload' as any)} style={styles.newBtn}>
          <Text style={styles.newText}>새 분석</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>분석 완료</Text>
        <Text style={styles.contractName} numberOfLines={2}>{result.contractName}</Text>

        {/* Score card */}
        <View style={styles.scoreCard}>
          <View style={styles.scoreLeft}>
            <Text style={[styles.scoreNum, { color: scoreColor }]}>{result.score}</Text>
            <View style={[styles.gradeBadge, { backgroundColor: `${scoreColor}22` }]}>
              <Text style={[styles.gradeText, { color: scoreColor }]}>{gradeLabel}</Text>
            </View>
            <Text style={styles.scoreSummary}>
              {result.dangerCount}개 위험 · {result.warnCount}개 주의 · {result.safeCount}개 안전
            </Text>
          </View>
          <View style={styles.scoreRight}>
            <View style={styles.metricGrid}>
              {[
                { label: '위험 조항', value: `${result.dangerCount}개`, color: colors.danger },
                { label: '주의 조항', value: `${result.warnCount}개`, color: colors.warn },
                { label: '안전 조항', value: `${result.safeCount}개`, color: colors.safe },
                { label: '분석 소요', value: result.analysisTime, color: colors.textSecondary },
              ].map((m) => (
                <View key={m.label} style={styles.metricItem}>
                  <Text style={styles.metricLabel}>{m.label}</Text>
                  <Text style={[styles.metricValue, { color: m.color }]}>{m.value}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* 저장 배너 */}
        {saveState === 'pending' && (
          <View style={styles.saveBanner}>
            <Text style={styles.saveBannerTitle}>분석 결과를 저장할까요?</Text>
            <Text style={styles.saveBannerSub}>저장하면 대시보드에서 언제든지 다시 확인할 수 있습니다.</Text>
            <View style={styles.saveBannerBtns}>
              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.5 }]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.saveBtnText}>결과 저장</Text>
                }
              </TouchableOpacity>
              <TouchableOpacity style={styles.discardBtn} onPress={handleDiscard}>
                <Text style={styles.discardBtnText}>저장 안 함</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {saveState === 'saved' && !isMock && !isSavedParam && (
          <View style={styles.savedNotice}>
            <Text style={styles.savedNoticeText}>✓ 대시보드에 저장되었습니다</Text>
          </View>
        )}

        {/* 원본 계약서 요약 */}
        {result.contractText ? (
          <>
            <Text style={styles.sectionTitle}>원본 계약서 요약</Text>
            <View style={styles.contractTextCard}>
              {result.contractType ? (
                <View style={styles.contractTypeBadge}>
                  <Text style={styles.contractTypeText}>{result.contractType}</Text>
                </View>
              ) : null}
              <Text style={styles.contractTextBody} numberOfLines={12}>
                {result.contractText}
              </Text>
              <Text style={styles.maskingNote}>
                🔒 개인정보는 분석 전 자동 마스킹 처리되었습니다
              </Text>
            </View>
          </>
        ) : null}

        {/* Clauses */}
        <Text style={styles.sectionTitle}>위험 조항 상세 분석</Text>
        {result.clauses.length === 0 ? (
          <View style={styles.noClauseBox}>
            <Text style={styles.noClauseIcon}>✓</Text>
            <Text style={styles.noClauseTitle}>위험·주의 조항이 발견되지 않았습니다</Text>
            <Text style={styles.noClauseSub}>이 계약서는 전반적으로 안전합니다</Text>
          </View>
        ) : result.clauses.map((clause) => (
          <ClauseItem
            key={clause.id}
            clause={clause}
            isOpen={openId === clause.id}
            onToggle={() => toggle(clause.id)}
          />
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  )
}

function ClauseItem({
  clause, isOpen, onToggle,
}: { clause: Clause; isOpen: boolean; onToggle: () => void }) {
  const levelColor = clause.level === 'danger' ? colors.danger : colors.warn
  const levelBg = clause.level === 'danger' ? colors.dangerBg : colors.warnBg

  return (
    <View style={[styles.clauseCard, { borderColor: `${levelColor}33` }]}>
      <TouchableOpacity style={styles.clauseHead} onPress={onToggle} activeOpacity={0.7}>
        <View style={[styles.clauseBadge, { backgroundColor: levelBg }]}>
          <Text style={[styles.clauseBadgeText, { color: levelColor }]}>
            {clause.level === 'danger' ? '위험' : '주의'}
          </Text>
        </View>
        <Text style={styles.clauseTitle} numberOfLines={1}>{clause.title}</Text>
        <Text style={styles.clauseArticle}>{clause.article}</Text>
        <Text style={styles.clauseChevron}>{isOpen ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {isOpen && (
        <View style={styles.clauseBody}>
          <Text style={styles.clauseDesc}>{clause.desc}</Text>
          <View style={[styles.quoteBlock, { borderLeftColor: levelColor }]}>
            <Text style={styles.quoteLabel}>계약서 원문</Text>
            <Text style={styles.quoteText}>"{clause.original}"</Text>
          </View>
          {clause.problem && (
            <View style={styles.problemRow}>
              <Text style={styles.problemText}>⚠ 문제점: {clause.problem}</Text>
            </View>
          )}
          <View style={[styles.quoteBlock, { borderLeftColor: colors.safe }]}>
            <Text style={[styles.quoteLabel, { color: colors.safe }]}>판례 및 법적 기준 대안</Text>
            <Text style={styles.quoteText}>"{clause.suggestion}"</Text>
          </View>
          {clause.lawRef && (
            <Text style={styles.lawRef}>📌 법적 근거: {clause.lawRef}</Text>
          )}
        </View>
      )}
    </View>
  )
}

const MOCK_RESULT: AnalysisResult = {
  contractName: '분석 결과 없음',
  score: 0, grade: 'safe',
  dangerCount: 0, warnCount: 0, safeCount: 0,
  analysisTime: '-', contractType: '', contractText: '', clauses: [],
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { width: 64 },
  backText: { color: colors.primary, fontSize: 13 },
  headerTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  newBtn: { width: 64, alignItems: 'flex-end' },
  newText: { color: colors.primary, fontSize: 13 },
  content: { padding: 16 },
  eyebrow: { color: colors.primary, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  contractName: { color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: 16 },
  scoreCard: {
    backgroundColor: colors.bgCard, borderRadius: 16, borderWidth: 1, borderColor: colors.border,
    padding: 16, marginBottom: 16, flexDirection: 'row', gap: 12,
  },
  scoreLeft: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scoreNum: { fontSize: 52, fontWeight: '900' },
  gradeBadge: { borderRadius: 8, paddingVertical: 4, paddingHorizontal: 10, marginBottom: 6 },
  gradeText: { fontSize: 13, fontWeight: '700' },
  scoreSummary: { color: colors.textMuted, fontSize: 11, textAlign: 'center' },
  scoreRight: { flex: 1 },
  metricGrid: { flexWrap: 'wrap', flexDirection: 'row', gap: 8 },
  metricItem: {
    width: '47%', backgroundColor: colors.bg, borderRadius: 10,
    borderWidth: 1, borderColor: colors.border, padding: 10,
  },
  metricLabel: { color: colors.textMuted, fontSize: 10, marginBottom: 3 },
  metricValue: { fontSize: 15, fontWeight: '700' },
  // 저장 배너
  saveBanner: {
    backgroundColor: 'rgba(79,142,247,0.08)', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(79,142,247,0.25)',
    padding: 16, marginBottom: 20,
  },
  saveBannerTitle: { color: colors.text, fontSize: 15, fontWeight: '700', marginBottom: 4 },
  saveBannerSub: { color: colors.textMuted, fontSize: 13, marginBottom: 14 },
  saveBannerBtns: { flexDirection: 'row', gap: 10 },
  saveBtn: {
    flex: 1, backgroundColor: colors.primary, borderRadius: 10,
    paddingVertical: 12, alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  discardBtn: {
    flex: 1, borderRadius: 10, borderWidth: 1, borderColor: colors.border,
    paddingVertical: 12, alignItems: 'center',
  },
  discardBtnText: { color: colors.textMuted, fontWeight: '600', fontSize: 14 },
  savedNotice: {
    backgroundColor: 'rgba(34,197,94,0.08)', borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)',
    padding: 12, marginBottom: 16, alignItems: 'center',
  },
  savedNoticeText: { color: colors.safe, fontSize: 13, fontWeight: '600' },
  sectionTitle: { color: colors.textMuted, fontSize: 11, fontWeight: '600', letterSpacing: 1, marginBottom: 10 },
  clauseCard: {
    backgroundColor: colors.bgCard, borderRadius: 12, borderWidth: 1,
    marginBottom: 10, overflow: 'hidden',
  },
  clauseHead: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 8 },
  clauseBadge: { borderRadius: 6, paddingVertical: 3, paddingHorizontal: 8 },
  clauseBadgeText: { fontSize: 11, fontWeight: '700' },
  clauseTitle: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '600' },
  clauseArticle: { color: colors.textMuted, fontSize: 12 },
  clauseChevron: { color: colors.textMuted, fontSize: 11 },
  clauseBody: { padding: 14, paddingTop: 0, borderTopWidth: 1, borderTopColor: colors.border },
  clauseDesc: { color: colors.textSecondary, fontSize: 13, lineHeight: 20, marginBottom: 12 },
  quoteBlock: {
    borderLeftWidth: 3, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 12, marginBottom: 10,
  },
  quoteLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '600', marginBottom: 5 },
  quoteText: { color: colors.textSecondary, fontSize: 13, lineHeight: 19 },
  problemRow: { backgroundColor: colors.dangerBg, borderRadius: 8, padding: 10, marginBottom: 10 },
  problemText: { color: colors.danger, fontSize: 12, lineHeight: 18 },
  lawRef: { color: colors.textMuted, fontSize: 11, lineHeight: 17 },

  /* 원본 계약서 요약 */
  contractTextCard: {
    backgroundColor: colors.bgCard, borderRadius: 12, borderWidth: 1,
    borderColor: colors.border, padding: 16, marginBottom: 20,
  },
  contractTypeBadge: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(37,99,235,0.1)',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 10,
  },
  contractTypeText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  contractTextBody: {
    color: colors.textSecondary, fontSize: 12, lineHeight: 20,
  },
  maskingNote: {
    marginTop: 12, color: colors.safe, fontSize: 11, fontWeight: '600',
  },

  /* 위험 조항 없음 */
  noClauseBox: {
    backgroundColor: colors.bgCard, borderRadius: 14, borderWidth: 1,
    borderColor: 'rgba(46,139,46,0.25)', padding: 28,
    alignItems: 'center', gap: 8, marginBottom: 16,
  },
  noClauseIcon: { fontSize: 32, color: colors.safe },
  noClauseTitle: { color: colors.safe, fontSize: 15, fontWeight: '700' },
  noClauseSub: { color: colors.textMuted, fontSize: 12 },
})
