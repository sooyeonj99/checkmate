import React, { useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, LayoutAnimation, UIManager, Platform, Alert,
  ActivityIndicator, Linking,
} from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import api from '../services/api'
import { colors } from '../theme/colors'
import { useAuth } from '../context/AuthContext'

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
  simpleExplanation?: string
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
  summary?: string
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
    simpleExplanation: c.simple_explanation ?? undefined,
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
    summary: data.summary ?? undefined,
    clauses,
  }
}

export default function ResultScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute<any>()
  const { logout, setPendingResult } = useAuth()
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
      const status = e?.response?.status
      if (status === 409) {
        setSaveState('saved')
      } else if (status === 401) {
        Alert.alert(
          '로그인 만료',
          '로그인이 만료되었습니다.\n로그인 후 자동으로 이 화면으로 돌아옵니다.',
          [
            {
              text: '로그인하기',
              onPress: () => {
                // 현재 결과 보존 후 로그아웃 → Auth 화면으로 이동
                if (rawResult && contractId) {
                  setPendingResult({ analysisResult: rawResult, contractId })
                }
                logout()
              },
            },
          ],
          { cancelable: false }
        )
      } else {
        setSaveState('saved')
        Alert.alert('알림', `저장 중 오류가 발생했습니다. (${status ?? '네트워크 오류'})`)
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
            navigation.getParent()?.navigate('대시보드')
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

        {/* AI 계약서 요약 */}
        {result.summary ? (
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryHeaderIcon}>ℹ</Text>
              <Text style={styles.summaryHeaderText}>AI 계약서 요약</Text>
            </View>
            <Text style={styles.summaryBody}>{result.summary}</Text>
          </View>
        ) : null}

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

        {/* 계약 전 체크리스트 */}
        <ChecklistSection contractType={result.contractType} />

        {/* 무료 법률 지원 기관 */}
        <AgencySection grade={result.grade} contractType={result.contractType} />

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  )
}

/* ── 대응 기관 섹션 ──────────────────────────────────── */
const AGENCIES_MOBILE = [
  {
    id: 'klac', icon: '🏛', name: '대한법률구조공단',
    desc: '무료 법률 상담 · 소송 지원 · 계약 분쟁 대리',
    phone: '132', url: 'https://www.klac.or.kr',
    tags: [] as string[], always: true,
  },
  {
    id: 'moel', icon: '👷', name: '고용노동부',
    desc: '임금체불 · 부당해고 · 근로계약 위반 신고',
    phone: '1350', url: 'https://minwon.moel.go.kr',
    tags: ['근로', '임금', '채용', '프리랜서', '알바', '용역'], always: false,
  },
  {
    id: 'ftc', icon: '⚖️', name: '공정거래위원회',
    desc: '불공정 약관 · 가맹점 분쟁 · 하도급 피해 신고',
    phone: '1372', url: 'https://www.ftc.go.kr',
    tags: ['가맹', '하도급', '대리점', '약관', '소비자', '유통'], always: false,
  },
  {
    id: 'kca', icon: '🛡️', name: '한국소비자원',
    desc: '소비자 계약 피해 · 환급 거부 · 위약금 분쟁',
    phone: '1372', url: 'https://www.kca.go.kr',
    tags: ['소비자', '렌탈', '구독', '방문판매', '학원', '헬스'], always: false,
  },
  {
    id: 'molit', icon: '🏠', name: '국토교통부 임대차 분쟁',
    desc: '전월세 분쟁 · 임대차 3법 위반 · 보증금 반환',
    phone: '1599-0001', url: 'https://www.molit.go.kr',
    tags: ['임대차', '전세', '월세', '주택', '상가', '임대'], always: false,
  },
]

const CHECKLIST_ITEMS: Record<string, { id: string; text: string }[]> = {
  근로: [
    { id: 'e1', text: '근로계약서를 서면으로 작성했나요?' },
    { id: 'e2', text: '임금 금액과 지급일이 명시되어 있나요?' },
    { id: 'e3', text: '근로시간(주 52시간 이내)이 기재되어 있나요?' },
    { id: 'e4', text: '포괄임금제 조항이 포함되어 있지 않나요?' },
    { id: 'e5', text: '경업금지 조항의 범위가 합리적인가요?' },
    { id: 'e6', text: '해고 사유와 절차가 명확하게 규정되어 있나요?' },
    { id: 'e7', text: '4대보험 가입이 명시되어 있나요?' },
  ],
  임대차: [
    { id: 'l1', text: '등기부등본으로 소유권을 확인했나요?' },
    { id: 'l2', text: '임대차 기간(시작일·종료일)이 명확한가요?' },
    { id: 'l3', text: '보증금 반환 조건이 명확하게 규정되어 있나요?' },
    { id: 'l4', text: '원상복구 범위가 합리적으로 제한되어 있나요?' },
    { id: 'l5', text: '임대차 신고(확정일자)를 완료했나요?' },
    { id: 'l6', text: '근저당 등 권리 제한이 없는지 확인했나요?' },
    { id: 'l7', text: '관리비 항목과 금액이 명시되어 있나요?' },
  ],
  프리랜서: [
    { id: 'f1', text: '업무 범위와 결과물 기준이 명시되어 있나요?' },
    { id: 'f2', text: '대금 지급 일정과 조건이 명확한가요?' },
    { id: 'f3', text: '지식재산권 귀속이 합리적으로 규정되어 있나요?' },
    { id: 'f4', text: '추가 업무 시 별도 보상 조항이 있나요?' },
    { id: 'f5', text: '납품 후 수정 횟수와 범위가 명시되어 있나요?' },
    { id: 'f6', text: '일방 해지 시 위약금이 균형 잡혀 있나요?' },
    { id: 'f7', text: '분쟁 해결 기관이 합리적으로 지정되어 있나요?' },
  ],
  기본: [
    { id: 'g1', text: '계약 당사자 정보가 정확하게 기재되어 있나요?' },
    { id: 'g2', text: '계약 기간과 효력 발생 조건이 명확한가요?' },
    { id: 'g3', text: '의무와 권리가 균형 있게 배분되어 있나요?' },
    { id: 'g4', text: '위약금·손해배상 조항이 과도하지 않나요?' },
    { id: 'g5', text: '자동 갱신 조항의 해지 기간을 확인했나요?' },
    { id: 'g6', text: '개인정보 처리 조항이 적법한가요?' },
    { id: 'g7', text: '모든 조항을 충분히 이해하고 서명하나요?' },
  ],
}

function ChecklistSection({ contractType }: { contractType?: string }) {
  const ct = (contractType ?? '').toLowerCase()
  const items = ct.includes('근로') ? CHECKLIST_ITEMS.근로
    : ct.includes('임대') ? CHECKLIST_ITEMS.임대차
    : ct.includes('프리랜서') || ct.includes('용역') ? CHECKLIST_ITEMS.프리랜서
    : CHECKLIST_ITEMS.기본

  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const total = items.length
  const done = Object.values(checked).filter(Boolean).length
  const toggle = (id: string) => setChecked(prev => ({ ...prev, [id]: !prev[id] }))

  return (
    <View style={checkStyles.wrap}>
      <View style={checkStyles.header}>
        <Text style={checkStyles.title}>계약 체결 전 체크리스트</Text>
        <View style={[checkStyles.badge, { backgroundColor: done === total ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)' }]}>
          <Text style={[checkStyles.badgeText, { color: done === total ? '#16a34a' : '#d97706' }]}>{done}/{total}</Text>
        </View>
      </View>
      {items.map((item) => (
        <TouchableOpacity key={item.id} onPress={() => toggle(item.id)} style={checkStyles.row}>
          <View style={[checkStyles.checkbox, checked[item.id] && checkStyles.checkboxChecked]}>
            {checked[item.id] && <Text style={checkStyles.checkmark}>✓</Text>}
          </View>
          <Text style={[checkStyles.itemText, checked[item.id] && checkStyles.itemTextDone]}>{item.text}</Text>
        </TouchableOpacity>
      ))}
      {done === total && (
        <Text style={checkStyles.allDone}>✅ 모든 항목 확인 완료! 안전하게 계약을 진행하세요.</Text>
      )}
    </View>
  )
}

const checkStyles = StyleSheet.create({
  wrap: { marginHorizontal: 16, marginBottom: 24, backgroundColor: colors.bgCard, borderRadius: 14, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontSize: 12, fontWeight: '700', color: colors.textMuted, letterSpacing: 1, textTransform: 'uppercase' },
  badge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'flex-start', padding: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: colors.border + '66', gap: 10 },
  checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 },
  checkboxChecked: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  checkmark: { color: '#fff', fontSize: 11, fontWeight: '800' },
  itemText: { flex: 1, fontSize: 13, color: colors.text, lineHeight: 20 },
  itemTextDone: { color: colors.textMuted, textDecorationLine: 'line-through' },
  allDone: { fontSize: 12, color: '#16a34a', fontWeight: '700', textAlign: 'center', padding: 12 },
})

function AgencySection({ grade, contractType }: { grade: string; contractType?: string }) {
  const ct = (contractType ?? '').toLowerCase()
  const sorted = [...AGENCIES_MOBILE].sort((a, b) => {
    if (a.always) return -1
    if (b.always) return 1
    const aM = a.tags.some(t => ct.includes(t))
    const bM = b.tags.some(t => ct.includes(t))
    if (aM && !bM) return -1
    if (!aM && bM) return 1
    return 0
  })

  return (
    <View style={agencyStyles.wrap}>
      <View style={agencyStyles.header}>
        <Text style={agencyStyles.headerTitle}>무료 법률 지원 기관</Text>
      </View>
      <Text style={agencyStyles.headerDesc}>
        계약 피해 발생 시 아래 기관에서 <Text style={{ fontWeight: '700' }}>무료</Text>로 도움받을 수 있습니다.
      </Text>

      {sorted.map(ag => {
        const isRelevant = ag.always || ag.tags.some(t => ct.includes(t))
        return (
          <View key={ag.id} style={[agencyStyles.card, isRelevant && agencyStyles.cardHighlight]}>
            <View style={agencyStyles.cardTop}>
              <Text style={agencyStyles.cardName}>{ag.name}</Text>
              {isRelevant && !ag.always && (
                <View style={agencyStyles.relevantBadge}>
                  <Text style={agencyStyles.relevantText}>관련</Text>
                </View>
              )}
            </View>
            <Text style={agencyStyles.cardDesc}>{ag.desc}</Text>
            <View style={agencyStyles.cardBtns}>
              <TouchableOpacity
                style={agencyStyles.webBtn}
                onPress={() => Linking.openURL(ag.url)}
              >
                <Text style={agencyStyles.webBtnText}>홈페이지 →</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={agencyStyles.phoneBtn}
                onPress={() => Linking.openURL(`tel:${ag.phone}`)}
              >
                <Text style={agencyStyles.phoneBtnText}>📞 {ag.phone}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )
      })}

      <View style={[agencyStyles.notice, { borderColor: grade === 'danger' ? '#ef444433' : '#f59e0b33', backgroundColor: grade === 'danger' ? '#ef44440a' : '#f59e0b0a' }]}>
        <Text style={agencyStyles.noticeText}>
          {grade === 'danger'
            ? '⚠️ 위험도가 높은 계약서입니다. 서명 전 반드시 전문가 검토를 권장합니다.'
            : '💡 체크메이트는 정보 제공 서비스로, 법률 자문을 대체하지 않습니다.'}
        </Text>
      </View>
    </View>
  )
}

const agencyStyles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    marginBottom: 16,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  headerIcon: { fontSize: 20 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  headerDesc: { fontSize: 13, color: colors.textMuted, lineHeight: 20, marginBottom: 16 },
  card: {
    backgroundColor: colors.bg,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
  },
  cardHighlight: {
    borderColor: colors.borderAccent,
    backgroundColor: 'rgba(37,99,235,0.04)',
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  cardIcon: { fontSize: 18 },
  cardName: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.text },
  relevantBadge: {
    backgroundColor: 'rgba(79,142,247,0.15)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  relevantText: { fontSize: 10, fontWeight: '700', color: colors.primary },
  cardDesc: { fontSize: 12, color: colors.textMuted, lineHeight: 18, marginBottom: 10 },
  cardBtns: { flexDirection: 'row', gap: 8 },
  webBtn: {
    backgroundColor: 'rgba(79,142,247,0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(79,142,247,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  webBtnText: { fontSize: 12, fontWeight: '600', color: colors.primary },
  phoneBtn: {
    backgroundColor: 'rgba(5,150,105,0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(5,150,105,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  phoneBtnText: { fontSize: 12, fontWeight: '600', color: '#059669' },
  notice: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginTop: 4,
  },
  noticeText: { fontSize: 13, color: colors.textMuted, lineHeight: 20 },
})

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

          {/* 원문 */}
          <View style={[styles.quoteBlock, { borderLeftColor: levelColor }]}>
            <Text style={styles.quoteLabel}>📄 계약서 원문</Text>
            <Text style={styles.quoteText}>"{clause.original}"</Text>
          </View>

          {/* 쉬운 설명 */}
          {clause.simpleExplanation ? (
            <View style={[styles.quoteBlock, { borderLeftColor: colors.primary, backgroundColor: 'rgba(79,142,247,0.05)' }]}>
              <Text style={[styles.quoteLabel, { color: colors.primary }]}>💬 쉽게 풀어보면</Text>
              <Text style={[styles.quoteText, { color: colors.text }]}>{clause.simpleExplanation}</Text>
            </View>
          ) : null}

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

  /* AI 요약 */
  summaryCard: {
    backgroundColor: 'rgba(79,142,247,0.07)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(79,142,247,0.22)',
    padding: 16,
    marginBottom: 16,
  },
  summaryHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10,
  },
  summaryHeaderIcon: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  summaryHeaderText: {
    color: colors.primary, fontSize: 11, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 1,
  },
  summaryBody: {
    color: colors.text, fontSize: 13, lineHeight: 21,
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
