/* ── 대시보드 각 계약서 상세 분석 결과 ─────────────────────
   ResultPage의 AnalysisResult 타입과 동일한 구조
   score: HIGH = 위험, LOW = 안전 (ResultPage 기준)
──────────────────────────────────────────────────────────── */

export interface ProblemTag {
  text: string
  level: 'danger' | 'warn'
}

export interface Clause {
  id: number
  level: 'danger' | 'warn'
  title: string
  article: string
  desc: string
  original: string
  problem?: string
  suggestion: string
  lawRef: string
}

export interface AnalysisResult {
  contractName: string
  contractMeta: string
  analysisDate: string
  totalClauses: number
  score: number
  grade: 'danger' | 'warn' | 'safe'
  dangerCount: number
  warnCount: number
  safeCount: number
  analysisTime: string
  problemTags: ProblemTag[]
  clauses: Clause[]
}

/* ── 1. 근로계약서 ──────────────────────────────────────── */
const employmentResult: AnalysisResult = {
  contractName: '(주)테크스타트 근로계약서',
  contractMeta: '사용자 (주)테크스타트 · 입사일 2026.07.01 · 정규직',
  analysisDate: '2026. 06. 15',
  totalClauses: 12,
  score: 72,
  grade: 'danger',
  dangerCount: 3,
  warnCount: 2,
  safeCount: 7,
  analysisTime: '24초',
  problemTags: [
    { text: '포괄임금제로 야근수당 없음', level: 'danger' },
    { text: '퇴직 후 2년 취업 제한', level: 'danger' },
    { text: '의무재직 위반 시 손해배상', level: 'danger' },
    { text: '수습기간 임금 감액', level: 'warn' },
    { text: '업무 범위 무제한', level: 'warn' },
  ],
  clauses: [
    {
      id: 1, level: 'danger', title: '포괄임금제 조항', article: '제4조',
      desc: '연장·야간·휴일 근로수당을 월 급여에 포함시키는 포괄임금 약정입니다. 실제 야근을 해도 추가 수당이 지급되지 않아 장시간 근로 시 큰 손해가 발생합니다.',
      original: '월 급여에는 연장·야간·휴일 근로수당이 포함되어 있으며, 실제 초과근무 시에도 별도 수당을 지급하지 아니한다.',
      problem: '대법원은 실제 초과근무가 발생하는 업무에 포괄임금제 적용 시 무효로 판단 (2016다48785)',
      suggestion: '연장·야간·휴일 근로는 근로기준법 제56조에 따라 통상임금의 50%를 가산하여 별도 지급한다.',
      lawRef: '근로기준법 제56조 · 대법원 2016다48785 판결',
    },
    {
      id: 2, level: 'danger', title: '경업금지(취업제한) 조항', article: '제11조',
      desc: '퇴직 후 2년간 동종업계 취업 및 창업을 금지하는 조항입니다. 범위·기간이 합리적이지 않으면 법적으로 무효입니다.',
      original: '근로자는 퇴직 후 2년간 동종·유사 업종의 타 회사에 취업하거나 창업할 수 없으며, 위반 시 위약금을 지급한다.',
      problem: '기간(2년) + 동종업계 전체 금지 → 헌법상 직업선택의 자유 침해, 법원 무효 판결 다수',
      suggestion: '경업금지는 핵심 영업비밀 직무에 한하며, 기간은 6개월 이내, 금지 기간 동안 통상임금 50% 이상의 보상을 지급한다.',
      lawRef: '헌법 제15조 · 부정경쟁방지법 제2조 · 대법원 2010다82199 판결',
    },
    {
      id: 3, level: 'danger', title: '의무 재직 기간 손해배상', article: '제10조',
      desc: '입사 후 1년 내 퇴직 시 교육·훈련 비용 전액을 배상하도록 합니다. 근로자의 자유로운 퇴직권을 사실상 박탈합니다.',
      original: '근로자는 입사일로부터 1년 이내 퇴직 시 회사가 지출한 교육훈련비, 채용 비용 등 일체를 배상하여야 한다.',
      problem: '근로기준법 제20조 위반 소지 — 실제 손해 입증 없이 전액 청구는 무효',
      suggestion: '실제 지출·입증된 교육훈련비에 한해 재직 기간 비례 감액 후 반환 요청 가능. 자발적 퇴직에만 적용.',
      lawRef: '근로기준법 제20조 (위약 예정의 금지) · 대법원 2004다13589 판결',
    },
    {
      id: 4, level: 'warn', title: '수습 기간 임금 감액', article: '제3조',
      desc: '3개월 수습 기간 동안 최저임금의 90%를 지급합니다. 정상 업무를 수행하는 경우 부당한 감액이 될 수 있습니다.',
      original: '입사 후 3개월은 수습 기간으로 하며, 이 기간 임금은 최저임금의 90%를 적용한다.',
      suggestion: '수습 감액은 단순 반복 업무가 아닌 기술 습득이 필요한 직종에 한하며, 정상 업무 투입 즉시 정규 급여를 지급한다.',
      lawRef: '최저임금법 제5조 제2항 · 고용노동부 고시',
    },
    {
      id: 5, level: 'warn', title: '업무 범위 무제한 지시', article: '제2조',
      desc: '"회사가 지시하는 모든 업무"로 포괄 규정하여 채용 공고와 다른 업무, 부서 배치 등에 이의를 제기하기 어렵습니다.',
      original: '근로자는 회사가 지시하는 모든 업무를 성실히 수행하여야 한다.',
      suggestion: '담당 업무를 구체적으로 명시하고, 업무 변경 시 근로자와 사전 서면 합의한다.',
      lawRef: '근로기준법 제17조 (근로조건의 명시) · 제23조',
    },
  ],
}

/* ── 2. 임대차계약서 (마포구) ───────────────────────────── */
const leaseResult: AnalysisResult = {
  contractName: '마포구 합정동 월세 임대차계약서',
  contractMeta: '임대인 ○○○ · 보증금 5,000만 원 · 월세 80만 원 · 계약 기간 2026.07 – 2028.06',
  analysisDate: '2026. 06. 10',
  totalClauses: 11,
  score: 54,
  grade: 'warn',
  dangerCount: 1,
  warnCount: 3,
  safeCount: 7,
  analysisTime: '21초',
  problemTags: [
    { text: '보증금 반환 기한 미명시', level: 'danger' },
    { text: '자연마모도 임차인 부담', level: 'warn' },
    { text: '임대료 인상 조항 불명확', level: 'warn' },
    { text: '즉시 해지 위반 조항', level: 'warn' },
  ],
  clauses: [
    {
      id: 1, level: 'danger', title: '보증금 반환 시기 미명시', article: '제9조',
      desc: '보증금 반환 기한이 "퇴거 후"로만 명시되어 정확한 반환 시점이 불분명합니다. 원상복구 비용을 이유로 반환을 장기 지연할 수 있습니다.',
      original: '갑은 을의 퇴거 후 보증금을 반환한다. 단, 미납 임대료, 원상복구 비용 등을 공제할 수 있다.',
      problem: '반환 기한 미명시 + 공제 항목 무제한 → 보증금 장기 미반환 위험',
      suggestion: '갑은 을의 퇴거일로부터 14일 이내에 보증금을 반환한다. 공제 항목은 미납 임대료 및 을의 귀책 파손 비용에 한하며 서면으로 고지한다.',
      lawRef: '주택임대차보호법 제3조의2 · 민법 제654조',
    },
    {
      id: 2, level: 'warn', title: '원상복구 범위 과다', article: '제7조',
      desc: '자연마모·노후화로 인한 사항까지 임차인 부담으로 규정합니다. 법적으로는 임대인 부담이 원칙입니다.',
      original: '을은 계약 종료 시 자연 마모, 노후화로 인한 사항도 포함하여 입주 당시 상태로 원상복구하여야 한다.',
      suggestion: '을은 고의·과실로 발생한 파손에 한하여 원상복구 의무를 진다. 자연마모 및 노후화 수선은 갑이 부담한다.',
      lawRef: '민법 제623조 · 국토교통부 원상복구 가이드라인',
    },
    {
      id: 3, level: 'warn', title: '임대료 인상 한도 미명시', article: '제4조',
      desc: '계약 갱신 시 임대료 인상에 대한 상한 조항이 없습니다. 주택임대차보호법 5% 상한을 명시적으로 적용받지 않을 수 있습니다.',
      original: '갱신 계약의 임대료는 임대인과 임차인이 협의하여 결정한다.',
      suggestion: '임대료 인상은 주택임대차보호법 제7조에 따라 직전 임대료의 5%를 초과할 수 없다.',
      lawRef: '주택임대차보호법 제7조 · 시행령 제2조',
    },
    {
      id: 4, level: 'warn', title: '전대 위반 즉시 해지 조항', article: '제6조',
      desc: '무단 전대 위반 시 임대인이 즉시 계약을 해지할 수 있습니다. 시정 기회 없이 즉시 해지되는 것은 과도합니다.',
      original: '을은 갑의 동의 없이 전대할 수 없으며, 위반 시 갑은 즉시 계약을 해지할 수 있다.',
      suggestion: '위반 시 갑은 상당 기간을 정하여 시정을 요구하고, 미이행 시 계약을 해지할 수 있다.',
      lawRef: '민법 제629조 · 주택임대차보호법 제3조',
    },
  ],
}

/* ── 3. 프리랜서 계약서 ─────────────────────────────────── */
const freelanceResult: AnalysisResult = {
  contractName: '영상 편집 프리랜서 계약서',
  contractMeta: '발주사 ○○미디어 · 계약 기간 2026.09.01 – 2026.08.31',
  analysisDate: '2026. 06. 08',
  totalClauses: 11,
  score: 78,
  grade: 'danger',
  dangerCount: 3,
  warnCount: 2,
  safeCount: 6,
  analysisTime: '27초',
  problemTags: [
    { text: '저작권 전부 무상 양도', level: 'danger' },
    { text: '대금 지급 지연 합법화', level: 'danger' },
    { text: '일방적 계약 해지', level: 'danger' },
    { text: '수정 요청 무제한', level: 'warn' },
    { text: '비밀유지 영구 의무', level: 'warn' },
  ],
  clauses: [
    {
      id: 1, level: 'danger', title: '저작권 전부 무상 양도', article: '제7조',
      desc: '완성본·중간 산출물 포함 모든 결과물의 저작권이 납품 즉시 발주사에 귀속됩니다. 포트폴리오 활용조차 불가능해집니다.',
      original: '본 계약에 따라 제작된 모든 결과물의 저작권 일체는 납품 즉시 발주사에 무상으로 귀속되며, 수급인은 어떠한 권리도 주장할 수 없다.',
      problem: '중간 산출물까지 포함, 무상 전부 양도 — 포트폴리오 활용·재사용 원천 차단',
      suggestion: '완성된 최종 결과물에 한하여 이용을 허락하며, 저작인격권은 수급인이 보유한다. 포트폴리오 활용은 발주사 동의 하에 허용한다.',
      lawRef: '저작권법 제9조 · 제45조 · 공정거래위원회 불공정약관 심사지침',
    },
    {
      id: 2, level: 'danger', title: '대금 지급 지연 합법화', article: '제4조',
      desc: '"발주사 내부 사정에 따라 지급이 지연될 수 있다"는 단 한 문장이 법정 지급 기한을 무력화합니다.',
      original: '용역 대금은 납품 후 발주사의 내부 결재 완료 시점으로부터 60일 이내에 지급한다. 단, 발주사의 내부 사정에 따라 지급이 지연될 수 있다.',
      problem: '"내부 사정" 예외 조항이 하도급법 지급 기한 규정을 사실상 무력화',
      suggestion: '용역 대금은 납품 확인일로부터 30일 이내에 지급한다. 지연 시 연 12% 지연이자를 가산한다.',
      lawRef: '하도급법 제13조 · 상법 제54조 · 프리랜서 표준계약서 제5조',
    },
    {
      id: 3, level: 'danger', title: '발주사 일방적 계약 해지', article: '제10조',
      desc: '발주사에게만 일방적 해지권을 부여하고, 위약금 없이 계약을 종료할 수 있게 합니다.',
      original: '발주사는 사업 내부 사정에 의해 언제든지 서면 통보로 계약을 해지할 수 있으며, 이 경우 기납품 부분 대금만을 지급한다.',
      problem: '수급인에게 해지권 없음 + 중단 손실 보전 조항 전무',
      suggestion: '양 당사자는 30일 전 서면 통보로 해지할 수 있다. 발주사 귀책 해지 시 기납품 대금 외 잔여 계약금의 30%를 위약금으로 지급한다.',
      lawRef: '민법 제543조 · 공정거래위원회 표준 하도급 계약서 제12조',
    },
    {
      id: 4, level: 'warn', title: '수정 요청 무제한', article: '제5조',
      desc: '납품 후 최종 승인 전까지 수정 횟수 제한이 없어 무한 수정을 요구할 수 있는 구조입니다.',
      original: '발주사는 납품 후 최종 승인 전까지 수정을 요청할 수 있으며, 수급인은 이에 응해야 한다.',
      suggestion: '수정 요청은 납품일로부터 14일 이내, 최대 2회로 한정한다. 추가 수정은 별도 견적으로 진행한다.',
      lawRef: '프리랜서 표준계약서(문화체육관광부) 제6조',
    },
    {
      id: 5, level: 'warn', title: '비밀유지 영구 의무', article: '제8조',
      desc: '"모든 정보"를 "영구적"으로 비밀로 유지해야 합니다. 포트폴리오 활용, 유사 업무 수행까지 제한될 수 있습니다.',
      original: '수급인은 본 계약과 관련하여 알게 된 모든 정보를 영구적으로 제3자에게 공개하거나 이용할 수 없다.',
      suggestion: '계약 종료 후 2년간 발주사가 "영업비밀"로 지정·고지한 정보에 한하여 비밀 유지 의무를 진다.',
      lawRef: '부정경쟁방지법 제2조 · 민법 제103조',
    },
  ],
}

/* ── 4. 렌탈 서비스 계약서 (ResultPage RESULT와 동일) ──── */
const rentalResult: AnalysisResult = {
  contractName: '정수기 렌탈 서비스 이용계약서',
  contractMeta: '공급사 ○○렌탈 · 월 렌탈료 39,900원 · 약정 60개월',
  analysisDate: '2026. 06. 05',
  totalClauses: 11,
  score: 76,
  grade: 'danger',
  dangerCount: 3,
  warnCount: 3,
  safeCount: 5,
  analysisTime: '22초',
  problemTags: [
    { text: '중도 해지 위약금 수백만 원', level: 'danger' },
    { text: '해지 미통보 시 자동 1년 연장', level: 'danger' },
    { text: '렌탈료 일방 인상 가능', level: 'danger' },
    { text: '약정 기간 계약일부터 기산', level: 'warn' },
    { text: '제품 임의 교체 가능', level: 'warn' },
    { text: '소유권 이전에 추가 수수료', level: 'warn' },
  ],
  clauses: [
    {
      id: 1, level: 'danger', title: '중도 해지 위약금', article: '제9조',
      desc: '"잔여 약정 렌탈료의 40%"는 합리적으로 보이지만, 5년 약정 1년 시점 해지 시 잔여 48개월×39,900원×40% ≈ 77만 원을 위약금으로 납부해야 합니다.',
      original: '계약 기간 중 중도 해지 시 잔여 약정 렌탈료의 40%에 해당하는 금액을 위약금으로 납부하여야 한다.',
      problem: '"40%"가 합리적으로 보이나 잔여 기간이 길수록 실제 금액은 수십~수백만 원',
      suggestion: '중도 해지 위약금은 구간별 감소 방식으로 산정하며, 계약 체결 시 예상 위약금 금액을 서면으로 고지하여야 한다.',
      lawRef: '소비자기본법 제19조 · 공정거래위원회 렌탈 표준약관 제14조 · 약관규제법 제8조',
    },
    {
      id: 2, level: 'danger', title: '자동 연장 조항', article: '제8조',
      desc: '만료 45일 전까지 해지 의사를 통보하지 않으면 동일 조건으로 1년 자동 연장됩니다. 만료일을 잊으면 원치 않는 1년을 더 사용하게 됩니다.',
      original: '계약 만료일 45일 전까지 서면으로 해지 의사를 통보하지 않을 경우, 동일 조건으로 1년간 자동 연장된다.',
      problem: '통보 기한(45일) 놓치면 추가 1년 약정 자동 체결. 사전 고지 의무 없음.',
      suggestion: '자동 연장 시 만료 60일 전 이메일·문자로 고지 의무를 부과한다. 고지 없이 자동 연장된 경우 위약금 없이 해지할 수 있다.',
      lawRef: '전자상거래법 제21조 · 공정거래위원회 구독경제 가이드라인',
    },
    {
      id: 3, level: 'danger', title: '렌탈료 일방 인상', article: '제5조',
      desc: '"물가지수 변동 및 비용 상승 시 조정 가능"이라는 한 문장이 매년 인상의 근거가 됩니다. 상한선이 없어 5년간 실제 납부 금액이 크게 달라질 수 있습니다.',
      original: '회사는 소비자 물가지수 변동 및 원자재·서비스 비용 상승에 따라 렌탈료를 조정할 수 있으며, 변경 30일 전 고지한다.',
      problem: '인상 상한선 없음. 고지 후 소비자가 거부하면 위약금 내고 해지해야 하는 구조',
      suggestion: '렌탈료 인상은 연 1회, 소비자물가지수 상승률 이내로 제한한다. 인상 시 소비자는 위약금 없이 60일 이내 해지할 수 있다.',
      lawRef: '약관규제법 제10조 · 공정거래위원회 표준약관 제8조',
    },
    {
      id: 4, level: 'warn', title: '약정 기간 기산점', article: '제3조',
      desc: '약정 기간이 "계약 체결일"부터 시작됩니다. 설치까지 2~3주 걸려도 그날부터 카운트되어 실제 사용 기간이 줄어듭니다.',
      original: '약정 기간은 계약 체결일로부터 기산하며, 계약 기간 동안 렌탈료가 부과된다.',
      suggestion: '약정 기간은 제품 설치 완료일로부터 기산하며, 설치 지연이 회사 귀책인 경우 지연 기간만큼 렌탈료를 감면한다.',
      lawRef: '소비자분쟁해결기준 (렌탈 분야)',
    },
    {
      id: 5, level: 'warn', title: '제품 임의 교체', article: '제7조',
      desc: '"동급 사양"으로 임의 교체 가능합니다. 내가 선택한 브랜드·기능의 제품이 다른 제품으로 바뀔 수 있으며, 거부 시 위약금이 발생합니다.',
      original: '회사는 서비스 운영상 필요한 경우 동급 사양의 제품으로 교체할 수 있으며, 소비자는 이에 동의한다.',
      suggestion: '"동급 사양" 기준을 구체적으로 명시하고, 교체 시 소비자 사전 동의를 받아야 한다.',
      lawRef: '민법 제390조 · 소비자기본법 제19조',
    },
    {
      id: 6, level: 'warn', title: '소유권 이전 추가 수수료', article: '제11조',
      desc: '60개월 렌탈료를 모두 납부해도 소유권이 자동 이전되지 않습니다. 별도 신청 및 수수료를 내야 내 것이 됩니다.',
      original: '약정 기간 만료 후 소비자가 소유권 이전을 신청하고 이전 수수료를 납부한 경우에 한하여 소유권이 이전된다.',
      suggestion: '약정 기간 만료 시 별도 절차·수수료 없이 소유권이 자동으로 소비자에게 이전된다.',
      lawRef: '소비자분쟁해결기준 (가전제품 렌탈 분야)',
    },
  ],
}

/* ── 5. Adobe Creative Cloud 구독 약관 ─────────────────── */
const adobeResult: AnalysisResult = {
  contractName: 'Adobe Creative Cloud 구독 약관',
  contractMeta: 'Adobe Inc. · 연간 구독 · 월 결제',
  analysisDate: '2026. 05. 28',
  totalClauses: 10,
  score: 18,
  grade: 'safe',
  dangerCount: 0,
  warnCount: 2,
  safeCount: 8,
  analysisTime: '19초',
  problemTags: [
    { text: '연간 약정 중도 해지 수수료', level: 'warn' },
    { text: '약관 자동 변경 가능', level: 'warn' },
  ],
  clauses: [
    {
      id: 1, level: 'warn', title: '연간 약정 중도 해지 수수료', article: '제8조',
      desc: '연간 플랜 가입 후 첫 14일 이후 해지하면 잔여 기간 요금의 50%를 위약금으로 납부해야 합니다. 장기 약정 시 주의가 필요합니다.',
      original: '연간 약정 플랜을 구매일로부터 14일 이후 취소하는 경우, 잔여 약정 기간 요금의 50%에 해당하는 조기 종료 수수료가 부과됩니다.',
      suggestion: '연간 플랜 가입 전 월별 결제 옵션과 비용을 비교하고, 첫 14일 내 취소 정책을 활용하세요.',
      lawRef: '전자상거래법 제17조 (청약철회) · 공정거래위원회 구독경제 가이드라인',
    },
    {
      id: 2, level: 'warn', title: '약관 자동 변경 조항', article: '제3조',
      desc: 'Adobe는 사전 통지 후 약관을 변경할 수 있으며, 계속 사용 시 변경 약관에 동의한 것으로 간주됩니다.',
      original: 'Adobe는 본 약관을 수정할 권리가 있으며, 변경 사항은 Adobe.com에 게시되며 게시 30일 후 효력이 발생합니다. 서비스 계속 이용 시 변경 약관에 동의한 것으로 봅니다.',
      suggestion: '변경 시 이메일 등으로 직접 고지받는 방법을 설정하고, 약관 변경 알림을 주기적으로 확인하세요.',
      lawRef: '약관규제법 제3조 (약관의 명시·설명의무) · 제6조',
    },
  ],
}

/* ── 6. 사무실 임대차 재계약서 ─────────────────────────── */
const officeLeaseResult: AnalysisResult = {
  contractName: '사무실 임대차 재계약서',
  contractMeta: '임대인 ○○빌딩 · 보증금 5,000만 원 · 월 임대료 150만 원 · 계약 기간 2026.06 – 2028.05',
  analysisDate: '2026. 05. 20',
  totalClauses: 11,
  score: 23,
  grade: 'safe',
  dangerCount: 0,
  warnCount: 1,
  safeCount: 10,
  analysisTime: '18초',
  problemTags: [
    { text: '관리비 항목 불명확', level: 'warn' },
  ],
  clauses: [
    {
      id: 1, level: 'warn', title: '관리비 항목 불명확', article: '제5조',
      desc: '관리비 항목이 "공동 관리비 일체"로 포괄 규정되어 있어 예상치 못한 비용이 청구될 수 있습니다.',
      original: '을은 월 임대료 외에 공동 관리비 일체를 별도로 납부하여야 하며, 관리비는 실비 기준으로 산정한다.',
      suggestion: '관리비 항목(청소비, 전기료 공용 부분, 경비비 등)을 계약서에 항목별로 명시하고 월 예상 금액을 고지한다.',
      lawRef: '상가건물 임대차보호법 제10조의8 · 민법 제618조',
    },
  ],
}

/* ── 결과 맵 (계약 ID → 분석 결과) ─────────────────────── */
export const MOCK_RESULT_MAP: Record<string, AnalysisResult> = {
  '1': employmentResult,
  '2': leaseResult,
  '3': freelanceResult,
  '4': rentalResult,
  '5': adobeResult,
  '6': officeLeaseResult,
}
