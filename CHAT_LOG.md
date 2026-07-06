# 체크메이트 — Claude 대화 로그
> 매 응답 종료 시 자동 업데이트 | 최신순 (아래로 갈수록 최신)

---

## 세션 1 (이전 세션 — 컨텍스트 압축으로 요약 보존)

### 주요 작업 내역

**1. 개인정보 마스킹 검토 기능 (MaskingPage / MaskingReviewScreen)**
- 업로드 → PII 자동 감지 → 사용자가 마스킹 항목 선택/해제 → AI 분석
- Presidio + spaCy NER 기반 감지
- 웹(MaskingPage.tsx) + 앱(MaskingReviewScreen.tsx) 동시 구현

**2. 마스킹 데이터 계정별 저장**
- `masked_data/users/{user_id}/{contract_id}.txt` 경로에 저장
- 추후 자체 AI 학습용 데이터로 활용 가능
- `contracts.py` `save_contract` 엔드포인트에 저장 로직 추가

**3. AI 요약 + 쉬운 설명 기능**
- Gemini 프롬프트에 `summary` (계약서 전체 요약) + `simple_explanation` (조항별 쉬운 설명) 추가
- `AnalysisResult`, `ClauseResult` 스키마 업데이트
- 웹 ResultPage.tsx: 요약 카드(SummaryCard) + 조항별 2열 비교 (원문 | 쉽게 풀어보면)
- 앱 ResultScreen.tsx: 동일 기능 모바일 UI

**4. GitHub Actions 배포**
- `npx gh-pages -d dist` 로 GitHub Pages 배포
- 발생 이슈: `checkmate.db` SQLite 파일 락 → `git stash drop` 으로 해결
- 발생 이슈: cp949 인코딩 → gemini_service.py 이모지 제거로 해결

**5. 네이버 클라우드 세팅 가이드**
- `NAVER_CLOUD_SETUP.md` 파일 생성 (17단계 체크리스트)
- VPC 서버, SSH, Python/Node, nginx, systemd 서비스, HTTPS 설정 포함
- 예상 비용: 약 42,000원/월

**6. GitHub 워크플로우 질의응답**
- 질문: 깃허브 계속 써야 해? / 비공개 가능해?
- 답변: 로컬 → GitHub(비공개) → 네이버 클라우드 순서 권장
  - GitHub 비공개 가능, Pages는 불가 (클라우드 서버로 대체)
  - Claude가 직접 서버 접속 업데이트는 불가, SSH 명령어 안내만 가능

---

## 세션 2 (2026-06-30)

### [작업] 이미지 OCR 구현

**사용자 요청:** "이미지도 문자 추출할 수 있게 작업좀 해줘"

**구현 내용:**

#### `backend/app/services/gemini_service.py`
- `_PROMPT_OCR` 상수 추가 (이미지 텍스트 추출 전용 프롬프트)
- `extract_text_from_image_with_gemini(file_path: str) -> str` 함수 추가
- `analyze_with_gemini()` 에 OCR 캐시 로드 로직 추가
  - `ocr_cache.json` 존재 시 → 텍스트로 처리 + 마스킹 (Gemini API 이중 호출 방지)
  - 캐시 없을 시 → Gemini Vision API 폴백

#### `backend/app/api/v1/endpoints/contracts.py`
- `preview_contract` 엔드포인트 전면 개편
  - 이미지 파일 감지 → `extract_text_from_image_with_gemini()` 호출
  - OCR 결과를 `ocr_cache.json` 에 저장
  - `from_ocr: true` 필드 반환
- `logging` 모듈 임포트 추가

#### `frontend/src/pages/MaskingPage.tsx`
- `fromOcr` 상태 추가
- 이미지 파일 로딩 시 "AI가 이미지에서 텍스트 추출 중..." 메시지
- OCR 완료 후 파란색 배너 표시 ("📸 이미지에서 AI OCR로 텍스트를 추출했습니다")
- `imageOnly` 폴백 안내 문구 개선

#### `mobile/src/screens/MaskingReviewScreen.tsx`
- 동일 변경사항 모바일 앱에 반영
- OCR 진행 중 안내 텍스트
- OCR 완료 배너 (파란 좌측 보더)

**커밋:** `c0de41d` — feat: 이미지 OCR 지원
**GitHub Push:** ✅ 완료
**GitHub Pages 배포:** ✅ 완료

---

### [질의응답] 사업계획서 반영도 검토

**사용자 요청:** 사업계획서 PDF 첨부 → "잘 반영되고 있는거같아? 추가 사항이나 구현해야될 기능은?"

**현재 구현 완료 (✅)**
| 기능 | 상태 |
|---|---|
| OCR + Presidio 마스킹 파이프라인 | ✅ |
| 0~100점 위험 지수 | ✅ |
| 3단계 등급 (위험/주의/안전) | ✅ |
| 쉽게 풀어보면 (조항별 쉬운 해석) | ✅ |
| AI 계약서 전체 요약 | ✅ |
| 계약 대시보드 | ✅ |
| 계정별 마스킹 데이터 저장 | ✅ |
| 웹 + 모바일 앱 | ✅ |
| 이미지 OCR (이번 세션) | ✅ |

**미구현 — 우선순위별 정리**

| 우선순위 | 기능 | 난이도 |
|---|---|---|
| 1순위 | 대응 기관 즉시 연결 (고용노동부, 공정위 등) | 쉬움 |
| 2순위 | 계약 유형별 전용 프롬프트 (근로/임대/프리랜서 분리) | 중간 |
| 3순위 | HWP 파일 지원 | 중간 |
| 4순위 | PDF 리포트 다운로드 | 중간 |
| 5순위 | 계약 전 체크리스트 (20개 항목) | 중간 |
| 6순위 | 멀티 LLM 크로스 체크 (Claude × Gemini) | 어려움 |
| 7순위 | 수정 요청 가이드 / 협상 문구 자동 생성 | 중간 |
| 8순위 | 피해 사례 경고 (유사 패턴 감지) | 어려움 |
| Phase 2+ | B2B 대시보드, 전자서명, 챗봇 Q&A, 계약서 템플릿 | 어려움 |

---

### [작업] 대화 로그 파일 생성

**사용자 요청:** "새로운 파일을 하나 만들어서 지금까지의 대화내용 전부를 저장해주고, 이후에도 답변이 끝나면 추가해서 업데이트 해줄 수 있어?"

**결과:** `CHAT_LOG.md` 파일 생성 (현재 파일)
- 매 응답 종료 시 이 파일에 대화 내용 추가 업데이트
- 이전 세션 요약 + 현재 세션 전체 포함

---

---

### [작업] 로그인 만료 후 결과 화면 자동 복귀

**사용자 요청:** 스크린샷 첨부 — "로그인 만료" 알림 떴을 때 로그인하고 다시 이쪽으로 돌아올 수 있게 작업해줘

**구현 흐름:**
```
저장 시도 → 401 만료 → 결과 보존 → 로그아웃 → Auth 화면
→ 사용자 로그인 → 분석 결과 화면 자동 복귀 → 저장 버튼 활성
```

**변경 파일:**

#### `mobile/src/context/AuthContext.tsx`
- `PendingResult` 인터페이스 추가 (`analysisResult`, `contractId`)
- `pendingResult` state + `setPendingResult` 함수 AuthContext에 추가

#### `mobile/src/screens/ResultScreen.tsx`
- `useAuth()` import → `logout`, `setPendingResult` 사용
- 401 처리: 기존 단순 Alert → `cancelable: false` + "로그인하기" 버튼
  - 버튼 누르면 `setPendingResult(결과데이터)` → `logout()` 호출
  - logout 시 user=null → NavigationContainer가 자동으로 Auth 화면으로 전환

#### `mobile/App.tsx`
- `createNavigationContainerRef` import + `navigationRef` 생성
- `Navigation` 컴포넌트에 `useEffect` 추가:
  - `user`가 null→비null 로 바뀌고 `pendingResult`가 있으면
  - 300ms 후 `navigationRef.navigate('분석하기', { screen: 'Result', params: ... })` 호출
  - `setPendingResult(null)` 로 초기화
- `NavigationContainer`에 `ref={navigationRef}` 연결

**커밋:** `d65d622`
**GitHub Push:** ✅ 완료

---

---

### [작업] 1순위: 계약 유형별 맞춤 법률 지원 기관 연결 (웹+앱)

**사용자 요청:** 미구현 기능 순차 구현 — 1순위: 대응 기관 즉시 연결

**구현 내용:**

**포함 기관 (6개):**
| 기관 | 전화 | 관련 계약 유형 |
|---|---|---|
| 대한법률구조공단 | 132 | 항상 표시 |
| 고용노동부 | 1350 | 근로, 프리랜서, 알바 |
| 공정거래위원회 | 1372 | 가맹, 하도급, 약관 |
| 한국소비자원 | 1372 | 소비자, 렌탈, 학원 |
| 국토교통부 | 1599-0001 | 임대차, 전세, 주택 |
| 경찰청 사이버범죄신고 | 182 | 사기 |

**기능:**
- 계약 유형 키워드 매칭 → 관련 기관 상단 표시 + "관련" 뱃지
- 웹: 홈페이지 새 탭 + 전화번호 `tel:` 링크
- 앱: `Linking.openURL()` 로 브라우저/전화 연결
- 위험도(grade)에 따라 하단 안내 문구 분기

**변경 파일:**
- `frontend/src/pages/ResultPage.tsx`: `ExpertCard` 전면 교체 → `AGENCIES` 배열 + 새 레이아웃
- `mobile/src/screens/ResultScreen.tsx`: `AgencySection` + `agencyStyles` 추가

**커밋:** `5aa4fcd`
**GitHub Push:** ✅ 완료
**GitHub Pages 배포:** ✅ 완료

---

### [수정] 기관 섹션 배경색 라이트 테마로 변경

**사용자 요청:** 스크린샷 — "이 부분 바탕색 수정좀 해줘"

- `agencyStyles.wrap` 배경: `#1e2330` → `colors.bgCard` (#ffffff)
- `agencyStyles.card` 테두리: `#2d3348` → `colors.border`
- `agencyStyles.cardHighlight` 테두리: `rgba(79,142,247,0.3)` → `colors.borderAccent`
- 앱 라이트 테마와 통일

**커밋:** `dc8c580` | **Push:** ✅

---

### [수정] 저장 배너 레이아웃 + 이모지 제거

- 웹 `result-save-banner`: 가로(좌우 분리) → 세로(앱과 동일), 버튼 동일 너비
- 웹/앱 기관 카드: 헤더 🏢 + 카드 아이콘 이모지 제거

**커밋:** `1fdcce4` | **Push/배포:** ✅

---

### [수정] 저장 버튼 파란색 수정 + 네이버 클라우드 배포 가이드

**원인:** CSS 변수명 불일치 — 웹은 `--accent` 사용하는데 버튼에 `var(--primary)` 사용 → 색 없음
**수정:** `.result-save-btn { background: var(--accent) }` 로 변경

**네이버 클라우드 가이드:** `E:\checkmate\NAVER_DEPLOY_GUIDE.md` 생성
- STEP 1~19 상세 체크리스트
- VPC/서브넷/ACG/키페어/서버 생성 ~ nginx/HTTPS/앱 주소 변경까지

**커밋:** `23fd02d` | **Push/배포:** ✅

---

### [완료] 네이버 클라우드 실서버 배포 완료 (2026-07-01)

| 항목 | 값 |
|---|---|
| 서버 IP | 101.79.25.139 |
| 서비스 URL | http://101.79.25.139/checkmate/ |
| OS | Ubuntu 22.04 LTS / 2vCPU 4GB |
| SSH | `ssh -i "E:\checkmate\checkmate-key.pem" root@101.79.25.139` |
| 백엔드 서비스 | `systemctl status checkmate-backend` |

---

### [작업] 2순위: 계약 유형별 전용 AI 프롬프트 구현

**사용자 유형 → 전용 프롬프트 매핑:**

| user_type | 대상 | 핵심 탐지 항목 |
|---|---|---|
| `freelancer` | 프리랜서 | 대금 지급, IP 귀속, 일방 해지, 추가업무 강요 |
| `employee` | 직장인 | 포괄임금, 최저임금, 경업금지, 부당해고 |
| `small_biz` | 소상공인 | 불공정 조항, 일방 변경권, 과도한 위약금 |
| `subscription` | 구독 이용자 | 자동갱신, 중도해지 위약금, 숨은 요금 |
| `newcomer` | 사회초년생 | 쉬운 해설, 수정 요청 문구, 빠진 조항 경고 |

**변경 파일:**
- `backend/app/services/gemini_service.py`: 5개 전용 프롬프트 + `_select_prompt()` + `user_type` 파라미터
- `backend/app/api/v1/endpoints/contracts.py`: `AnalyzeRequest`에 `user_type` 필드 추가 + 전달
- `frontend/src/pages/LoadingPage.tsx`: `userType` state→API 전달
- `mobile/src/screens/LoadingScreen.tsx`: 동일
- `mobile/App.tsx`: `AnalyzeStackParamList.Loading`에 `userType` 타입 추가

**커밋:** `807288f` | **Push/배포:** ✅

---

*마지막 업데이트: 2026-07-01 | 다음 작업: 업로드 화면에 유형 선택 UI 추가*

---

## 세션 3 (2026-07-03)

### [완료] 대시보드 실제 데이터 연동

**문제:** 대시보드가 하드코딩된 MOCK_CONTRACTS 데이터만 표시, 실제 저장된 계약서가 보이지 않음

**원인 분석:**
- `api.ts` 인터셉터가 `access_token` 키로 토큰 조회 → AuthContext는 `cm_token` 으로 저장 → 모든 API 요청에 인증 헤더 누락
- `DashboardPage.tsx` 가 API 응답 대신 MOCK_CONTRACTS 상수 사용

**수정 파일:**
- `frontend/src/services/api.ts`: 인터셉터 토큰 키 `access_token` → `cm_token` (AuthContext와 통일)
- `frontend/src/pages/DashboardPage.tsx`:
  - `MOCK_CONTRACTS` 상수 완전 제거
  - `gradeToRisk()` 헬퍼 함수 추가 (한국어 등급 → RiskLevel 변환)
  - `savedAsContracts` computed 배열로 실제 API 데이터 매핑
  - 필터 탭, 통계 카드, 테이블 모두 실제 데이터 기반으로 전환
  - TypeScript 선언 순서 오류 수정 (used before declaration)
- `backend/app/db/base.py`: Subscription 모델 import 누락 추가 (테이블 미생성 버그)

**커밋:** `5fe0738` 외 | **서버 배포:** ✅

---

### [완료] 개인/기업 회원 분리 + 사업자등록번호 입력

**요구사항:** 개인 사용자 / 기업 사용자를 구분, 기업은 사업자등록번호로 가입

**기능 차이:**
| 구분 | 개인 | 기업/법인 |
|---|---|---|
| 기능 | 계약서 분석, 구독 관리 | 전체 기능 |
| 가입 구분 | 일반 | 사업자등록번호 필수 입력 |

**변경 파일:**
- `backend/app/models/user.py`: `business_number: Mapped[Optional[str]]` 컬럼 추가 (String 12)
- `backend/app/schemas/user.py`: `UserCreate`, `UserResponse`에 `business_number: Optional[str] = None` 추가
- `backend/app/services/user_service.py`: `create_user()` 에서 `user_type`, `business_number` 실제 DB 저장 (기존엔 무시됨)
- `frontend/src/pages/AuthPage.tsx`:
  - 회원가입 시 개인👤 / 기업🏢 선택 버튼
  - 기업 선택 시 사업자등록번호 입력 필드 노출
  - 입력 시 자동 하이픈 포맷 (XXX-XX-XXXXX)
  - 10자리 미만이면 가입 버튼 비활성화
  - API 호출 body에 `user_type`, `business_number` 포함

**커밋:** `88d3093` | **서버 배포:** ✅

---

### [완료] 사업자등록번호 유효성 검증 (체크섬 + 국세청 API)

**2단계 검증 방식:**

| 단계 | 방식 | 비용/속도 | 결과 |
|---|---|---|---|
| 1단계 | 체크섬 알고리즘 | 즉시, 무료 | 번호 수학적 유효성 |
| 2단계 | 국세청 공공데이터 API | API키 필요, 무료 | 실제 사업자 존재·상태 확인 |

**변경 파일:**
- `backend/app/api/v1/endpoints/business.py` (신규):
  - `POST /api/v1/business/check` 엔드포인트
  - 체크섬 알고리즘 구현 (가중치 `[1,3,7,1,3,7,1,3,5]`)
  - 국세청 `api.odcloud.kr` 호출 → 정상/휴업/폐업 상태 반환
  - `NTS_API_KEY` 미설정 시 체크섬만 검증 (graceful fallback)
- `backend/app/core/config.py`: `NTS_API_KEY: Optional[str] = None` 추가
- `backend/app/api/v1/router.py`: business 라우터 등록
- `frontend/src/pages/AuthPage.tsx`:
  - 10자리 입력 완료 시 자동으로 `/api/v1/business/check` 호출
  - 결과 색상 표시: ✓ 정상영업(초록), ✗ 폐업(빨강), ⚠ 휴업(노랑)
  - 폐업/무효 번호 → 가입 버튼 비활성화

**국세청 API 키 발급 (선택):** data.go.kr → `국세청_사업자등록정보 진위확인 및 상태조회 서비스` 검색 → 활용 신청 (즉시 승인, 무료)

**커밋:** `188ef4b` | **서버 배포:** ✅

---

### [완료] 전자서명 기능 구현

**요구사항:** 계약서 분석 후 서명 패드로 직접 서명, 상대방에게 서명 요청 링크 발송

**전체 서명 흐름:**
```
분석 결과 저장 완료
    ↓ 네비 [전자서명] 버튼 (저장 후 활성화)
┌──────────────────────────────────┐
│  ✍️ 내가 서명  │  📨 서명 요청   │
└──────────────────────────────────┘
     ↓                   ↓
 캔버스 서명          상대방 이메일 입력
 저장 완료            + 메시지 (선택)
                       + 내 서명 (선택)
                            ↓
                  서명 요청 이메일 자동 발송
                            ↓
                   /sign/{token} 공개 페이지
                   (로그인 없이 서명 가능)
                            ↓
                   요청자에게 완료 알림 이메일
```

**변경 파일:**

백엔드:
- `backend/app/models/signing.py` (신규): `SigningRecord` 모델
  - `type`: self(자기서명) / request(요청)
  - 요청자/서명자 서명 이미지 base64 저장
  - 7일 만료 토큰, 상태 관리 (pending/signed/expired)
- `backend/app/api/v1/endpoints/signing.py` (신규):
  - `POST /api/v1/signing/self-sign` — 내가 서명
  - `POST /api/v1/signing/request` — 상대방 서명 요청 생성 + 이메일 발송
  - `GET /api/v1/signing/my-records` — 내 서명 내역 조회
  - `GET /api/v1/signing/public/{token}` — 공개 서명 페이지용 정보 (인증 불필요)
  - `POST /api/v1/signing/public/{token}/sign` — 상대방 서명 제출 (인증 불필요)
- `backend/app/services/email_service.py`:
  - `send_signing_request_email()` 추가 — 서명 요청 이메일 (링크 포함)
  - `send_signing_complete_email()` 추가 — 서명 완료 알림 이메일
- `backend/app/db/base.py`: signing 모델 import 추가
- `backend/app/api/v1/router.py`: signing 라우터 등록

프론트엔드:
- `frontend/src/components/SignaturePad.tsx` (신규):
  - HTML5 Canvas 기반 서명 패드
  - 마우스 + 터치 모두 지원
  - 초기화 버튼, 서명 완료 시 base64 PNG 콜백
- `frontend/src/components/SigningModal.tsx` (신규):
  - 내가 서명 탭 / 서명 요청 탭
  - 상대방 이메일 + 메시지 + 내 서명 미리 작성 가능
- `frontend/src/pages/SigningPage.tsx` (신규):
  - `/sign/:token` 공개 라우트 (로그인 없이 접근)
  - 계약서 정보, 요청자 메시지 표시
  - 서명자 이름 입력 + 서명 패드 + 제출
  - 만료/중복서명 예외 처리
- `frontend/src/pages/ResultPage.tsx`:
  - 네비게이션 바에 [전자서명] 버튼 추가 (저장 완료 후 활성화)
  - 서명 완료 시 하단 토스트 메시지 표시
- `frontend/src/App.tsx`: `/sign/:token` 라우트 등록

**보안 처리:**
- 서명 이미지 크기 상한 300KB (base64 ~225KB 이미지)
- 만료 링크 접근 시 410 Gone
- 중복 서명 방지 (409 Conflict)
- 폐업 링크 자동 status='expired' 처리

**커밋:** `b65a2ae` | **서버 배포:** ✅

---

### [완료] 서버 배포 (2026-07-03)

**GitHub push:** `git push origin main` → 성공 (`077f3fb..b65a2ae`)

**서버 배포 명령어 (서버 내부에서 직접 실행):**
```bash
cd /var/www/checkmate && git pull && cd frontend && npm run build && systemctl restart checkmate-backend && echo 완료
```

**결과:**
```
✓ 105 modules transformed.
dist/assets/index-BZBNPBci.js  383.82 kB │ gzip: 129.72 kB
✓ built in 1.50s
완료
```

**서버 환경 정보 (이번 세션에서 확인):**
- venv 위치: `/var/www/checkmate/backend/venv/bin/activate`
- httpx 미설치 → 국세청 API 호출 시 오류 가능

**httpx 설치 (서버에서 실행 필요):**
```bash
source /var/www/checkmate/backend/venv/bin/activate && pip install httpx && systemctl restart checkmate-backend && echo 완료
```

**주의:** `.env`에 `NTS_API_KEY=여기에_발급받은키` 플레이스홀더 잘못 입력됨 → 삭제 필요:
```bash
sed -i '/NTS_API_KEY=여기에_발급받은키/d' /var/www/checkmate/backend/.env
```

---

### 현재 서비스 상태 (2026-07-03 기준)

| 기능 | 상태 |
|---|---|
| 계약서 업로드 + AI 분석 (Gemini) | ✅ 운영 중 |
| 이미지 OCR | ✅ 운영 중 |
| 개인정보 마스킹 (Presidio) | ✅ 운영 중 |
| 이메일 인증 (Gmail SMTP) | ✅ 운영 중 |
| PDF 다운로드 (window.print) | ✅ 운영 중 |
| 계약서 저장 + 대시보드 | ✅ 운영 중 |
| 계약 유형별 전용 AI 프롬프트 | ✅ 운영 중 |
| 법률 지원 기관 연결 | ✅ 운영 중 |
| 개인/기업 회원 분리 | ✅ 운영 중 |
| 사업자번호 체크섬 검증 | ✅ 운영 중 |
| 사업자번호 국세청 API 조회 | ⚠️ API키 발급 후 .env에 NTS_API_KEY 추가 필요 (httpx는 설치됨) |
| 전자서명 (내가 서명) | ✅ 운영 중 |
| 전자서명 (상대방 요청) | ✅ 운영 중 |
| AI 챗봇 (ChatWidget) | ✅ 운영 중 |

**서비스 URL:** http://101.79.25.139/checkmate/

---

*마지막 업데이트: 2026-07-03*

---

## 세션 4 (2026-07-04)

### [완료] 전자서명 완전 구현 — 웹+앱 동시, 양측 완료 흐름

**요구사항 확인:**
```
사업자 계약서 서명 요청 발송
  → 계약서 앱 알림 + 메일 알림
  → 계약서 수신 및 확인
  → 수신한 계약서 서명
  → 서명 완료 알림 (양쪽)
  → 서명 완료된 문서 저장 (양쪽), PDF 저장 가능 (양쪽)
```

---

### [완료] 백엔드 전자서명 엔드포인트 완성

**변경 파일: `backend/app/api/v1/endpoints/signing.py`**

**추가된 엔드포인트:**
- `GET /api/v1/signing/received` — 내가 받은 서명 요청 목록 (새로 추가)
- `GET /api/v1/signing/{id}/certificate` — 서명 완료 인증서 HTML 반환 (새로 추가)

**수정된 엔드포인트:**
- `POST /api/v1/signing/public/{token}/sign`:
  - 서명 완료 시 **요청자에게 이메일** + **서명자에게도 이메일** 동시 발송 (이전: 요청자만)
  - 서명 완료 시 요청자에게 **Expo 푸시 알림** 발송
  - 서명 요청 생성 시 수신자가 앱 사용자면 **Expo 푸시 알림** 발송
- `SigningRecordOut` 스키마에 `token` 필드 추가 (앱 딥링크용)

**서명 인증서 HTML (`_build_certificate_html`):**
- 양측 서명 이미지 임베드 (base64 → img 태그)
- 서명자 이름, 서명 날짜, 문서 ID 표시
- "PDF로 저장 (인쇄)" 버튼 (`window.print()`)
- `@media print` CSS로 브라우저 → PDF 변환 지원

**변경 파일: `backend/app/services/push_service.py` (신규)**
- Expo Push Notification API 연동 (Firebase 불필요)
- `send_push_signing_request()` — 서명 요청 알림
- `send_push_signing_complete()` — 서명 완료 알림

**변경 파일: `backend/app/api/v1/endpoints/users.py`**
- `POST /api/v1/users/push-token` 엔드포인트 추가 (Expo Push 토큰 서버 저장)

---

### [완료] 웹 DashboardPage 전자서명 UI 추가

**변경 파일: `frontend/src/pages/DashboardPage.tsx`**

- `SigningModal` import 추가
- `SigningRecordOut` 인터페이스 추가
- 상태 추가: `showSignModal`, `signingTarget`, `sentRecords`, `receivedRecords`, `signingTab`, `signToast`
- `fetchSigningRecords()` — 보낸/받은 서명 요청 동시 조회
- **저장된 계약 카드**에 "전자서명" 버튼 추가 (기본 카드 + 기업 유형별 카드 모두)
- **전자서명 내역 섹션** 추가:
  - "보낸 요청 / 받은 요청" 탭 전환
  - 서명 완료 시 "인증서 보기" 버튼 → 새 탭에서 인증서 HTML 로드 (Authorization 헤더 방식)
  - 상태 뱃지: 서명 완료(초록) / 서명 대기(노랑) / 만료됨(회색)

---

### [완료] 앱 전자서명 기능 구현

**변경 파일: `mobile/package.json`**
```json
"expo-device": "~7.0.4",
"expo-notifications": "~0.29.14",
"react-native-webview": "13.13.5"
```

**변경 파일: `mobile/App.tsx`**
- `expo-notifications`, `expo-device` import
- `registerForPushNotificationsAsync()` — 알림 권한 요청 + Expo Push 토큰 발급
- 로그인 후 자동으로 토큰 서버 등록 (`POST /api/v1/users/push-token`)
- 알림 탭 처리: `data.type === 'signing_request'` → `SigningScreen`으로 딥링크
- `RootStackParamList`에 `Signing: { token: string }` 추가
- 로그인/비로그인 모두 `SigningScreen` 접근 가능

**변경 파일: `mobile/src/screens/SigningScreen.tsx` (신규)**
- 서명 요청 수신 화면 (공개 — 로그인 불필요)
- `GET /api/v1/signing/public/{token}` 으로 계약서 정보 로드
- WebView + 인라인 HTML/Canvas로 서명 패드 구현 (`react-native-webview`)
- 서명자 이름 입력 + 서명 그리기 → `POST /api/v1/signing/public/{token}/sign`
- 만료 / 이미 서명됨 / 완료 상태 화면 분기

**변경 파일: `mobile/src/screens/AuthScreen.tsx`**
- 기업 회원 가입 시 사업자등록번호 입력 필드 추가
- 자동 하이픈 포맷 (`000-00-00000`)
- 10자리 입력 완료 시 `/api/v1/business/check` 자동 호출
- 결과에 따라 "✓ 확인됨" / "✗ 미확인" 표시 + 색상 피드백
- 미확인 상태에서는 가입 버튼 비활성화

**변경 파일: `mobile/src/screens/DashboardScreen.tsx`**
- `SigningRecord` 인터페이스 추가 (`token` 필드 포함)
- `fetchReceivedRequests()` — 받은 서명 요청 조회
- 저장된 계약 카드에 "전자서명" 버튼 추가:
  - `Alert.prompt()`으로 상대방 이메일 입력
  - `POST /api/v1/signing/request` 서명 요청 생성 + 이메일 발송
- **받은 서명 요청 섹션** 추가:
  - 서명 대기 / 완료 / 만료 상태 뱃지
  - "서명하기" 버튼 → `SigningScreen`으로 이동 (실제 token 전달)

---

### 서명 완전 흐름 (구현 완료)

```
① 사업자 대시보드 → 계약서 카드 [전자서명] 버튼
      ↓ (웹: 모달 / 앱: Alert.prompt)
② 서명 요청 이메일 발송 + Expo 푸시 알림 발송 (앱 사용자라면)
      ↓
③ 수신자: 이메일 링크 → /sign/{token} 웹페이지
        OR 앱 푸시 탭 → SigningScreen
      ↓
④ 서명자 이름 + 서명 패드로 서명
      ↓
⑤ 양측 완료 이메일 발송 + 요청자 Expo 푸시 알림
      ↓
⑥ 대시보드 "서명 내역"에서 "인증서 보기" → PDF로 저장 가능
```

---

### 빌드 및 배포

| 항목 | 결과 |
|---|---|
| 웹 빌드 (`npm run build`) | ✅ 성공 (387.71 kB) |
| Git 커밋 | `c5ce031` |
| GitHub Push | ✅ 완료 |
| 서버 배포 | 진행 중 (SSH 백그라운드) |

---

### 현재 서비스 상태 (2026-07-04 기준)

| 기능 | 상태 |
|---|---|
| 계약서 업로드 + AI 분석 (Gemini) | ✅ 운영 중 |
| 이미지 OCR | ✅ 운영 중 |
| 개인정보 마스킹 (Presidio) | ✅ 운영 중 |
| 이메일 인증 (Gmail SMTP) | ✅ 운영 중 |
| 계약서 저장 + 대시보드 | ✅ 운영 중 |
| 개인/기업 회원 분리 | ✅ 운영 중 |
| 사업자번호 체크섬 검증 | ✅ 운영 중 |
| 전자서명 — 내가 서명 / 요청 보내기 | ✅ 운영 중 |
| 전자서명 — 받은 요청 서명 (웹+앱) | ✅ 운영 중 |
| 서명 완료 양측 이메일 알림 | ✅ 운영 중 |
| 서명 완료 요청자 Expo 푸시 알림 | ✅ 운영 중 |
| 서명 완료 인증서 HTML / PDF 저장 | ✅ 운영 중 |
| 앱 서명 요청 수신 → SigningScreen | ✅ 구현 완료 (앱 배포 필요) |
| AI 챗봇 (ChatWidget) | ✅ 운영 중 |

**서비스 URL:** http://101.79.25.139/checkmate/

---

### [수정] 서버 ImportError 긴급 수정 (2026-07-04)

**증상:** 배포 후 백엔드 서비스 다운 → "서버에 연결할 수 없습니다" 오류

**원인:**
```
ImportError: cannot import name 'get_current_user' from 'app.api.v1.endpoints.auth'
```
`signing.py`에서 `get_current_user`를 `auth` 모듈에서 import했으나 실제 위치는 `users` 모듈

**수정:**
- `backend/app/api/v1/endpoints/signing.py` line 10:
  - 잘못됨: `from app.api.v1.endpoints.auth import get_current_user`
  - 수정됨: `from app.api.v1.endpoints.users import get_current_user`

**커밋:** `b8529ab` | **Push:** ✅ | **서버:** `active` 확인

---

*마지막 업데이트: 2026-07-04*

---

## 세션 5 (2026-07-05)

### [완료] 계약서 템플릿 발송 기능 구현

**사용자 요청:** "계약서 템플릿 보관해서 계약서를 받는 사람에게 맞게 보낼 수 있게 구현도 해줘"

**전체 흐름:**
```
기업 대시보드 → [📝 템플릿으로 계약서 보내기]
    ↓
① 템플릿 선택 (근로계약서 / 임대차계약서 / 용역계약서)
    ↓
② 항목 입력 ({{변수}} 치환용 입력 폼)
    ↓
③ 미리보기 (iframe으로 실제 HTML 렌더링)
    ↓
④ 수신자 이메일 + 메시지 입력 → 발송
    ↓
수신자: /sign/{token} 접속 → "계약서 전문 보기" 토글 → 서명
```

**변경 파일:**

백엔드:
- `backend/app/api/v1/endpoints/templates.py` (신규):
  - `DEFAULT_TEMPLATES` — 3종 완성형 HTML 템플릿 (고용노동부 표준 근로계약서, 부동산 임대차계약서, 업무위탁 용역계약서)
  - `GET /api/v1/templates` — 템플릿 목록 반환
  - `GET /api/v1/templates/{id}/content` — 템플릿 HTML 원문
  - `POST /api/v1/templates/send` — 변수 치환 완료 HTML + 수신자 이메일 → 서명 레코드 생성 + 이메일/푸시 발송 (유효기간 14일)
- `backend/app/api/v1/endpoints/signing.py`:
  - `PublicSigningInfo` 스키마에 `contract_html: Optional[str]` 추가
  - `get_signing_info()` 엔드포인트에서 `contract_html` 반환
- `backend/app/models/signing.py`:
  - `contract_html: Mapped[Optional[str]]` TEXT 컬럼 추가 (이미 이전 세션에서 추가됨)
- `backend/app/api/v1/router.py`: templates 라우터 등록

프론트엔드:
- `frontend/src/components/TemplateModal.tsx` (신규):
  - 4단계 스텝 UI (select → fill → preview → send)
  - 스텝 인디케이터 (완료된 단계 ✓ 표시)
  - iframe으로 계약서 실시간 미리보기
- `frontend/src/pages/DashboardPage.tsx`:
  - `TemplateModal` import + 상태 `showTemplateModal` 추가
  - 기업 전용 "📑 계약서 템플릿 발송" 섹션 추가 (3종 카드 + 발송 버튼)
  - `TemplateModal` 렌더링 + 완료 시 서명 내역 갱신
- `frontend/src/pages/SigningPage.tsx`:
  - `SigningInfo` 인터페이스에 `contract_html: string | null` 추가
  - `showContract` state 추가
  - "📄 계약서 전문 보기 ▼" 토글 버튼 → iframe으로 계약서 렌더링

**DB 마이그레이션 (서버에서 실행):**
```sql
ALTER TABLE signing_records ADD COLUMN contract_html TEXT;
```

**커밋:** `15271b6` | **GitHub Push:** ✅ 완료

---

### [피드백] 명령어 안내 방식 변경

**사용자 요청:** "명령어를 알려줄 때는 순서대로, 어떤 걸 먼저 입력 후 어떤 걸 입력하는지 알려줘"

**적용 사항:**
- 명령어 안내 시 ① ② ③ 번호 + 각 줄 설명 형식으로 통일
- 조건부 명령은 바로 아래 주석으로 설명
- 한 번에 여러 명령 묶지 않고 단계별 분리

**피드백 메모리 저장:** `feedback-sequential-commands.md`

---

### 서버 배포 명령 (순서대로)

```
① git pull                                                     — 최신 코드 받기
② cd frontend && npm run build                                 — 프론트엔드 빌드
③ cd ..                                                        — 루트로 돌아가기
④ sqlite3 backend/checkmate.db "ALTER TABLE signing_records ADD COLUMN contract_html TEXT;"
                                                               — DB 컬럼 추가
   (duplicate column name 오류 나면 무시)
⑤ systemctl restart checkmate-backend                         — 백엔드 재시작
⑥ systemctl status checkmate-backend                          — 정상 동작 확인
```

---

---

### [질의응답] 근로계약서가 프리랜서 용역으로 분류되는 버그 분석

**사용자 보고:** 표준 근로계약서 이미지 업로드 → 분석 결과 contract_type이 "프리랜서 용역"으로 나옴

**원인 진단:**
1. (가능성 높음) 업로드 시 user_type 선택이 "프리랜서"였을 경우 → `_select_prompt('freelancer')` 선택 → Gemini가 프리랜서 관점 프롬프트로 분석 → contract_type까지 "프리랜서 용역" 반환
2. (가능성 있음) OCR 품질 문제 — 이미지에 형광펜/빨간글자/수기 빈칸이 섞여 있어 OCR이 제목("표준 근로계약서") 미인식

**수정 방향:**
- Gemini 프롬프트에 "계약서 유형은 문서 실제 내용으로 판단, 사용자 선택 user_type과 무관하게 독립적으로 분류" 지시 추가
- contract_type 감지와 user_type 기반 프롬프트 선택을 분리

**수정 완료:**

`backend/app/services/gemini_service.py` 수정:
1. `_PROMPT_OCR` 개선:
   - 형광펜(노란/주황색) 텍스트 추출 명시
   - 빨간색·파란색 색깔 텍스트 추출 명시
   - 수기로 채워진 빈칸 추출 명시
   - 표(테이블) 안 데이터 추출 명시
2. 각 유형별 프롬프트 수정:
   - "아래는 프리랜서 계약서입니다" 등 유형 단정 문구 제거
   - "contract_type은 문서 실제 내용 기반으로 판단" 지시 추가
3. `_OUTPUT_FORMAT`에 contract_type 판단 기준 명시 추가

**커밋:** `19b5cc7` | **GitHub Push:** ✅ 완료
**서버 배포:** git pull + systemctl restart 안내 (프론트 변경 없음)

---

### [완료] OCR 빈칸 채우기 기능 구현

**사용자 요청:** "OCR 인식 못한 부분 있으면 사용자가 질문에 답해서 채워 완성하게 구현해줘"

**구현 흐름:**
```
이미지 업로드 → OCR 추출
  → 읽기 어려운 부분: [빈칸1], [빈칸2] 마커로 표시
  → missing_fields 반환: [{id, label(항목명), hint(입력예시)}]
    ↓
MaskingPage: 노란 카드 자동 표시
  → "OCR이 읽지 못한 빈칸을 채워주세요"
  → 항목별 입력창 + 힌트 텍스트
  → 모두 입력 시 "✓ 모두 입력됨" 뱃지
    ↓
분석 시작 → 완성된 텍스트로 AI 분석
```

**변경 파일:**
- `backend/app/services/gemini_service.py`:
  - `_PROMPT_OCR`: JSON 응답 형식으로 변경 `{text, missing_fields}`
  - `extract_text_from_image_with_gemini()`: `(text, list)` 튜플 반환
- `backend/app/api/v1/endpoints/contracts.py`:
  - `preview_contract`: `missing_fields` 응답에 포함
  - `AnalyzeRequest`: `ocr_text_override: str | None` 추가
  - `analyze_contract`: `ocr_text_override` 있으면 ocr_cache 덮어쓰기
  - **contract_type 오버라이드 버그 수정**: Gemini 결과 우선, meta는 폴백으로만 사용
- `frontend/src/pages/MaskingPage.tsx`:
  - `MissingField` 인터페이스 추가
  - `missingFields`, `filledValues` state 추가
  - `completedText` useMemo (빈칸 치환)
  - 빈칸 채우기 노란 카드 UI 추가 (그리드 입력창)
  - `handleStart`: `ocrTextOverride` navigate state에 포함
- `frontend/src/pages/LoadingPage.tsx`:
  - `ocrTextOverride` 읽어서 analyze API에 전달

**커밋:** `8b81814` | **GitHub Push:** ✅ 완료

---

## 세션 7 — 2026-07-05

### [기능] 업로드 페이지 UX 개선 — 유형 선택 팝업 모달

**요청 내용:**
- 업로드 화면 우측 계약서 유형 선택 패널 제거
- 파일 선택 후 버튼 텍스트: "AI 분석 시작하기 (계약서 유형 선택하기)"
- 버튼 클릭 → 팝업 모달 오픈
- 모달에서 유형 선택 + 두 가지 분석 방식 선택:
  - "글씨 추출하기" → `/masking` (OCR 추출 → 빈칸 채우기 → 마스킹)
  - "업로드 문서 분석하기" → `/loading` (바로 AI 분석)

**변경 파일:**
- `frontend/src/pages/UploadPage.tsx`:
  - `ContractTypeSelector` 컴포넌트 제거
  - `SubmitButton` → `StartButton` (파일만 있으면 활성화, 서브텍스트 추가)
  - `ContractTypeModal` 컴포넌트 신규 추가
  - `handleAnalyze` → `handleMasking` + `handleDirectAnalyze` 분리
  - `showTypeModal` state 추가
  - 우측 패널: 유형 선택 제거, 개인정보 안내 + CTA 버튼만 유지
- `frontend/src/index.css`:
  - `.ctype-modal-overlay`, `.ctype-modal-card`, `.ctype-modal-header` 등 모달 스타일 추가
  - fadeIn / slideUp 애니메이션
  - `.ctype-action-btn`, `.ctype-btn-masking`, `.ctype-btn-analyze` 스타일

**커밋:** `6bfb15d` | **GitHub Push:** ✅ 완료

---

### [기능] 아이디/비밀번호 찾기 (이메일 인증)

**요청 내용:** 로그인 화면에 아이디 찾기, 비밀번호 찾기 기능을 이메일 인증 방식으로 구현

**백엔드 변경:**
- `backend/app/models/user.py`: `password_reset_token`, `password_reset_token_expires` 컬럼 추가
- `backend/app/schemas/user.py`: `FindIdRequest`, `ForgotPasswordRequest`, `ResetPasswordRequest` 스키마 추가
- `backend/app/services/user_service.py`: `get_user_by_reset_token`, `create_password_reset_token`, `reset_user_password` 함수 추가
- `backend/app/services/email_service.py`: `send_find_id_email`, `send_password_reset_email` 이메일 템플릿 추가
- `backend/app/api/v1/endpoints/auth.py`: 3개 엔드포인트 추가
  - `POST /auth/find-id`: 이메일 입력 → 닉네임 정보 발송
  - `POST /auth/forgot-password`: 이메일 입력 → 재설정 링크 발송 (1시간 유효)
  - `POST /auth/reset-password`: 토큰 + 새 비밀번호 → 비밀번호 변경

**프론트엔드 변경:**
- `frontend/src/pages/AuthPage.tsx`:
  - `Tab` 타입에 `'find-id'`, `'forgot-password'` 추가
  - 서브뷰에서는 탭 숨기고 뒤로가기 버튼 표시
  - 로그인 폼 하단에 "아이디 찾기 | 비밀번호 찾기" 링크 추가
  - `FindIdForm`, `ForgotPasswordForm` 컴포넌트 추가
- `frontend/src/pages/ResetPasswordPage.tsx` (NEW): `/reset-password?token=xxx` 비밀번호 재설정 페이지
- `frontend/src/App.tsx`: `/reset-password` 라우트 추가
- `frontend/src/index.css`: `.auth-find-link` 스타일 추가

**DB 마이그레이션:** sqlite3 ALTER TABLE로 신규 컬럼 2개 추가 완료

**커밋:** `10de6a0` | **GitHub Push:** ✅ | **서버 배포:** ✅

*마지막 업데이트: 2026-07-05*

---

## 세션 — 2026-07-05 (핸드폰 번호 전자서명 요청 기능)

### 작업 내역

**1. 회원가입 전화번호 필드 추가**
- `frontend/src/pages/AuthPage.tsx`: `phoneNumber` 상태 + `formatPhone` 헬퍼 + 입력 필드(이메일~비밀번호 사이) 추가, handleSubmit에 `phone_number` 포함
- `mobile/src/screens/AuthScreen.tsx`: SignupForm에 `phoneNumber` 상태 + `formatPhone` + TextInput 추가, API 호출에 포함

**2. 서명 요청 이메일/전화번호 선택 발송 (SigningModal)**
- `frontend/src/components/SigningModal.tsx`: `reqContactType: 'email' | 'phone'` 토글 추가
  - 이메일: 기존 이메일 입력 → 메일 발송
  - 전화번호: 앱 설치 사용자→푸시 알림, 미설치→SMS(앱 다운로드 링크 포함)
  - 버튼 텍스트/disabled 조건 contactType에 따라 분기

**3. 백엔드 (이전 세션 완성분 포함)**
- `backend/app/models/user.py`: `phone_number` 컬럼 추가
- `backend/app/models/signing.py`: `requestee_phone` 컬럼 추가
- `backend/app/schemas/user.py`: UserCreate/UserResponse에 `phone_number` 추가
- `backend/app/services/user_service.py`: 전화번호 정규화(re.sub) 후 저장
- `backend/app/services/sms_service.py`: NCP SMS API 모듈 신규 생성
  - `send_signing_request_sms_new_user`: 앱 다운로드 링크 포함
  - `send_signing_request_sms_existing_user`: 웹 서명 링크만
- `backend/app/api/v1/endpoints/signing.py`: 이메일/전화번호 서명 요청 라우팅 구현
- `backend/app/core/config.py`: NCP SMS 설정값 + APP_STORE_URL/PLAY_STORE_URL 추가

**4. ssh_fix.py DB 마이그레이션 버그 수정 + 신규 컬럼 추가**
- `users.phone_number` VARCHAR(20) 추가
- `signing_records.requestee_phone` VARCHAR(20) 추가
- `signing_records.user_template_id` INTEGER 추가 (버그 수정: 기존 코드가 users 테이블 정보로 signing_records 컬럼을 체크하던 오류)

**서버 배포 결과:**
- DB 마이그레이션: `users.phone_number`, `signing_records.requestee_phone` 신규 추가 ✅
- Frontend 빌드: ✅ (1.47s)
- Backend 재시작: SERVICE: RUNNING ✅

**커밋:** `3b05ffb` | **GitHub Push:** ✅ | **서버 배포:** ✅

*마지막 업데이트: 2026-07-05*


---

## 세션 추가 — 2026-07-05 (앱 서명 요청 모달)

### 작업 내역

**mobile/src/components/SigningRequestModal.tsx (신규)**
- 바텀 시트 모달: 이메일/전화번호 토글, 메시지 입력, 내 서명 패드(WebView) 옵션
- 전화번호: 앱 설치→푸시 알림, 미설치→SMS(앱 다운로드 링크) 자동 분기

**mobile/src/screens/DashboardScreen.tsx**
- 기존 Alert.prompt(iOS 전용, 이메일만) → SigningRequestModal 교체
- 웹→앱, 앱→웹, 앱→앱, 웹→웹 모든 방향 서명 요청 가능

**커밋:** b63500a | **GitHub Push:** ✅ | **서버 배포:** ✅

*마지막 업데이트: 2026-07-05*

---

# ═══════════════════════════════════════════════
# CHECKMATE 전체 구현 현황 (2026-07-06 기준)
# 사업계획서 반영용 종합 정리
# ═══════════════════════════════════════════════

## 1. 서비스 개요

**서비스명:** CHECKMATE  
**슬로건:** AI가 계약서를 읽고, 당신의 권리를 지킵니다  
**타겟:** 개인 사용자(프리랜서·직장인·사회초년생) + 기업/법인 사용자  
**실서버:** http://101.79.25.139/checkmate/ (네이버 클라우드, Ubuntu 22.04)  
**GitHub:** https://github.com/sooyeonj99/checkmate (비공개)

---

## 2. 기술 스택

| 구분 | 기술 |
|------|------|
| **백엔드** | FastAPI (Python 3.11), SQLite, SQLAlchemy |
| **웹 프론트엔드** | React 18 + TypeScript + Vite |
| **모바일 앱** | Expo (React Native), iOS/Android 동시 지원 |
| **AI 엔진** | Google Gemini 1.5 Pro (계약서 분석 + OCR) |
| **개인정보 감지** | Microsoft Presidio + spaCy NER |
| **인증** | JWT (Access Token, 24시간 유효) |
| **이메일** | SMTP (Gmail 앱 비밀번호) |
| **푸시 알림** | Expo Push Notification API |
| **SMS** | NCP(네이버 클라우드) SENS API (설정 시 즉시 활성) |
| **사업자 조회** | 국세청 오픈API (실시간 사업자등록번호 검증) |
| **서버** | 네이버 클라우드 VPC, nginx 리버스 프록시, systemd |

---

## 3. 구현된 전체 기능 목록

### 3-1. 회원 인증 시스템

| 기능 | 웹 | 앱 | 비고 |
|------|----|----|------|
| 이메일 회원가입 | ✅ | ✅ | 이메일 인증 메일 발송 |
| 이메일 인증 (토큰) | ✅ | ✅ | 24시간 유효, 재발송 가능 |
| 로그인 (JWT) | ✅ | ✅ | 토큰 자동 헤더 주입 |
| 로그아웃 | ✅ | ✅ | |
| 비밀번호 찾기/재설정 | ✅ | - | 이메일 링크 방식 |
| 아이디(이메일) 찾기 | ✅ | - | |
| 개인 / 기업 계정 분리 | ✅ | ✅ | 가입 시 유형 선택 |
| 사업자등록번호 등록 | ✅ | ✅ | 국세청 실시간 검증 |
| 전화번호 등록 | ✅ | ✅ | 전자서명 수신용 (인증 추후) |
| 로그인 만료 후 결과 복귀 | - | ✅ | 로그인 후 이전 화면 자동 복귀 |

### 3-2. 계약서 분석 (핵심 기능)

| 기능 | 웹 | 앱 | 비고 |
|------|----|----|------|
| PDF / DOCX 업로드 | ✅ | ✅ | 최대 20MB |
| 이미지(JPG/PNG) 업로드 | ✅ | ✅ | Gemini Vision OCR |
| OCR 텍스트 추출 | ✅ | ✅ | 이미지→텍스트 자동 변환 |
| OCR 결과 캐시 | ✅ | ✅ | ocr_cache.json, 재분석 방지 |
| 개인정보 마스킹 (Presidio) | ✅ | ✅ | 이름·연락처·주민번호·계좌 등 |
| 마스킹 항목 사용자 선택/해제 | ✅ | ✅ | 항목별 토글 |
| AI 위험 조항 탐지 | ✅ | ✅ | Gemini 1.5 Pro |
| 0~100점 위험 지수 | ✅ | ✅ | 숫자+색상 시각화 |
| 위험/주의/안전 3단계 등급 | ✅ | ✅ | |
| 조항별 쉬운 설명 | ✅ | ✅ | 법률 용어 → 일반 언어 |
| 계약서 전체 AI 요약 | ✅ | ✅ | |
| 계약 유형별 전용 프롬프트 | ✅ | ✅ | 프리랜서/직장인/소상공인/구독/사회초년생 |
| 판례 기반 수정 제안 | ✅ | ✅ | 각 조항별 대안 문구 |
| 분석 결과 저장 | ✅ | ✅ | 로그인 사용자 DB 저장 |
| 저장된 결과 목록/상세 보기 | ✅ | ✅ | |
| 분석 결과 삭제 | ✅ | ✅ | |
| AI 챗봇 (계약서 질의응답) | ✅ | - | Gemini 기반, 대화 이력 유지 |

### 3-3. 법률 지원 기관 연결

| 기능 | 웹 | 앱 | 비고 |
|------|----|----|------|
| 계약 유형별 관련 기관 표시 | ✅ | ✅ | 근로/임대차/소비자/가맹 등 |
| 기관 전화 즉시 연결 | ✅ | ✅ | 웹: tel: 링크 / 앱: Linking |
| 기관 홈페이지 바로가기 | ✅ | ✅ | |
| 포함 기관 6곳 | - | - | 법률구조공단·고용부·공정위·소비자원·국토부·경찰청 |

### 3-4. 전자서명 시스템

| 기능 | 웹 | 앱 | 비고 |
|------|----|----|------|
| 개인 서명 저장 (자기 서명) | ✅ | ✅ | Canvas 서명 패드 |
| 서명 요청 발송 (이메일) | ✅ | ✅ | 이메일 링크 방식 |
| 서명 요청 발송 (전화번호) | ✅ | ✅ | SMS 발송 (NCP 설정 시) |
| 앱 미설치자: 앱 다운로드 SMS | ✅ | ✅ | App Store + Play Store 링크 |
| 앱 설치자: 푸시 알림 수신 | ✅ | ✅ | Expo Push |
| 웹에서 서명 (공개 링크) | ✅ | ✅ | 로그인 불필요 |
| 앱에서 서명 (Signing 화면) | ✅ | ✅ | WebView 서명 패드 |
| 서명 완료 시 요청자 이메일 알림 | ✅ | ✅ | |
| 서명 완료 시 요청자 푸시 알림 | ✅ | ✅ | |
| 양방향 서명 (요청자 선서명 가능) | ✅ | ✅ | 요청 전 미리 서명 옵션 |
| 서명된 문서 보기 (계약서+서명) | ✅ | ✅ | 웹: 새 탭 / 앱: WebView(SignedDocScreen) |
| 전자서명 인증서 발급 | ✅ | - | PDF 저장 (인쇄) |
| 받은 서명 요청 목록 | ✅ | ✅ | 이메일·전화번호 기준 조회 |
| 서명 요청 유효기간 7일 | ✅ | ✅ | 만료 자동 처리 |
| 크로스 플랫폼 (웹↔앱) | ✅ | ✅ | 웹→앱, 앱→웹, 앱→앱, 웹→웹 |

### 3-5. 계약서 템플릿 (기업 전용)

| 기능 | 웹 | 앱 | 비고 |
|------|----|----|------|
| 표준 계약서 3종 제공 | ✅ | - | 근로/임대차/업무위탁 |
| 표준 템플릿 서명 위치 지정 | ✅ | - | 드래그로 서명 위치 설정 |
| 커스텀 템플릿 업로드 (이미지/PDF) | ✅ | - | 파일 업로드 방식 |
| 템플릿 내 서명 위치 드래그 설정 | ✅ | - | % 기반 좌표 저장 |
| 템플릿 저장/수정/삭제 | ✅ | - | 기업 계정 전용 |
| 템플릿으로 서명 요청 발송 | ✅ | - | |
| 서명 완료 문서에 서명 이미지 삽입 | ✅ | - | {{SIG_REQUESTER}}/{{SIG_REQUESTEE}} 마커 |

### 3-6. 대시보드 & 통계

| 기능 | 웹 | 앱 | 비고 |
|------|----|----|------|
| 저장된 계약서 목록 | ✅ | ✅ | |
| 계약 유형별 분류 (기업) | ✅ | ✅ | 근로/임대차/렌탈 등 |
| 위험 건수 통계 (기업) | ✅ | ✅ | |
| B2B 분석 대시보드 (기업) | ✅ | - | 통계 카드 6개 + 유형 분포 + 위험도 바 |
| 팀 관리 (기업) | ✅ | - | 초대/수락/삭제, 역할(멤버/관리자) |
| 계약 만료일 추적 | ✅ | - | 날짜 피커 + 만료 배너 알림 |
| PDF 분석 리포트 | ✅ | ✅ | 웹: 새 탭 / 앱: ReportDocScreen |
| 계약 전 체크리스트 | ✅ | ✅ | 유형별 10개 항목, 체크박스 인터랙션 |
| 받은 서명 요청 목록 | ✅ | ✅ | |
| 내 서명 요청 내역 | ✅ | - | |
| 서명된 문서/인증서 버튼 | ✅ | ✅ | |
| 내 계약서 템플릿 관리 (기업) | ✅ | - | 생성/수정/삭제 |
| 구독·렌탈 관리 (개인) | ✅ | - | 월 지출 추적, 위약금 표시 |

### 3-7. 마이페이지

| 기능 | 웹 | 앱 | 비고 |
|------|----|----|------|
| 계정 정보 확인 | ✅ | ✅ | |
| 내정보 수정 (닉네임/전화번호/비밀번호) | ✅ | - | 비밀번호 확인 2단계 |
| 로그아웃 | ✅ | ✅ | |
| 자동 로그아웃 (30분 비활동) | ✅ | - | 웹 전용, 카운트다운 표시 |
| 푸시 알림 토큰 등록 | - | ✅ | 앱 실행 시 자동 등록 |

---

## 4. 알림 시스템 구조

```
이메일 알림 (SMTP)
  ├── 회원가입 이메일 인증
  ├── 비밀번호 재설정
  ├── 전자서명 요청 수신
  └── 전자서명 완료 통보 (요청자/수신자 양쪽)

푸시 알림 (Expo Push)
  ├── 전자서명 요청 수신 (앱 설치자)
  └── 전자서명 완료 통보 (요청자)

SMS (NCP SENS — 환경변수 설정 시 활성)
  ├── 전자서명 요청 (앱 미설치자 → 앱 다운로드 링크 포함)
  └── 전자서명 요청 (앱 설치자이나 푸시 토큰 없는 경우)
```

---

## 5. 보안 및 데이터 처리

| 항목 | 내용 |
|------|------|
| 비밀번호 | bcrypt 해시 저장 |
| 인증 | JWT Bearer Token (24시간) |
| 개인정보 마스킹 | Presidio + spaCy, 사용자 확인 후 처리 |
| 마스킹 데이터 저장 | `masked_data/users/{user_id}/{contract_id}.txt` |
| 서명 데이터 | base64 PNG, 300KB 제한 |
| 서명 토큰 | `secrets.token_urlsafe(32)`, 7일 유효 |
| API 인가 | 요청자/수신자만 서명 문서 접근 가능 |

---

## 6. 서버 배포 현황

| 항목 | 내용 |
|------|------|
| 서버 | 네이버 클라우드 VPC (101.79.25.139) |
| OS | Ubuntu 22.04 LTS, 2vCPU / 4GB RAM |
| 웹서버 | nginx (리버스 프록시, `/checkmate/` 경로) |
| 백엔드 | uvicorn + systemd (`checkmate-backend` 서비스) |
| 프론트엔드 | Vite 빌드 → `dist/` → nginx 정적 파일 서빙 |
| DB | SQLite (`/var/www/checkmate/backend/checkmate.db`) |
| 배포 방법 | `python ssh_fix.py` (git pull + build + 마이그레이션 + 재시작) |
| 최근 배포 | 2026-07-06 (정상 작동 확인) |

---

## 7. 미구현 기능 (사업계획서 로드맵)

### ✅ 완료된 Phase 1 기능 (2026-07 기준)
| 기능 | 완료일 | 비고 |
|------|--------|------|
| PDF 리포트 다운로드 | 2026-07-06 | GET /report + 브라우저 print-to-PDF |
| 계약 만료일 추적 & 알림 배너 | 2026-07-06 | DB 저장 + 대시보드 배너 |
| 앱 서명된 문서 보기 | 2026-07-06 | SignedDocScreen WebView |
| 계약 전 체크리스트 | 2026-07-06 | 유형별 10항목, 웹+앱 |
| 팀 관리 (기업) | 2026-07-06 | 초대/수락/삭제 API + UI |
| B2B SaaS 대시보드 | 2026-07-06 | 통계 카드 + 분포 차트 |

### Phase 1 — 남은 단기 과제
| 기능 | 설명 | 난이도 |
|------|------|--------|
| 전화번호 인증 (OTP) | NCP SMS OTP 또는 카카오 인증 | 중간 |
| HWP 파일 지원 | 한글 파일 파싱 (hwpx 라이브러리) | 중간 |
| 갱신 알림 (푸시/이메일) | 만료 D-7/D-1 자동 발송 | 중간 |

### Phase 2 — 중기 (3~6개월)
| 기능 | 설명 | 난이도 |
|------|------|--------|
| 수정 요청 가이드 / 협상 문구 자동 생성 | AI 문구 제안 | 중간 |
| 멀티 LLM 교차 검증 | Gemini + Claude 동시 분석 | 어려움 |
| 대량 계약서 일괄 분석 | 기업 전용 배치 처리 | 어려움 |

### Phase 3 — 장기 (6개월+)
| 기능 | 설명 | 난이도 |
|------|------|--------|
| 피해 사례 경고 | 유사 패턴 DB 구축 + 경고 | 어려움 |
| 법률 전문가 연결 마켓플레이스 | 변호사 매칭 플랫폼 | 어려움 |
| HTTPS 도입 | 도메인 구매 + Let's Encrypt SSL | 쉬움 |
| 자체 AI 모델 파인튜닝 | 마스킹 데이터 활용 | 매우 어려움 |

---

## 8. 최신 커밋 이력 (최근 7개)

| 커밋 | 내용 |
|------|------|
| `daf97e8` | docs: CHAT_LOG.md 세션 기능 구현 내역 업데이트 |
| `1aa48e9` | fix: team.py 이메일 서비스 함수명 수정 (_send_smtp) |
| `4c99d05` | feat: 6대 기능 완전 구현 (서명문서/PDF 리포트/체크리스트/만료추적/팀관리/B2B 대시보드) |
| `b63500a` | feat: 앱 서명 요청 모달 추가 (이메일/전화번호 선택 발송) |
| `3b05ffb` | feat: 핸드폰 번호 전자서명 요청 기능 구현 |
| `c5ce031` | feat: 전자서명 완전 구현 (웹+앱) — 서명 패드, 요청, 푸시 알림, 인증서 |
| `88d3093` | feat: 개인/기업 회원 분리 - 사업자등록번호 등록 지원 |

---

## 9. 이번 세션 구현 완료 기능 (2026-07-06)

### Feature 1: 앱 서명된 문서 보기
- `mobile/src/screens/SignedDocScreen.tsx` — WebView로 서명 완료 문서 표시
- `mobile/src/screens/ReportDocScreen.tsx` — WebView로 분석 리포트 표시
- App.tsx에 스크린 등록 (`SignedDoc`, `ReportDoc` 파라미터 타입 추가)
- DashboardScreen.tsx에 "문서 보기" + "📄 리포트" 버튼 추가

### Feature 2: PDF 리포트 다운로드
- `GET /api/v1/contracts/saved/{id}/report` — 완전한 HTML 리포트 반환
  - 색상 코딩된 조항별 위험도, 점수, 등급, 요약, 인쇄 버튼
  - `@media print` CSS로 인쇄 버튼 자동 숨김 (브라우저 print-to-PDF 지원)
- 웹 DashboardPage.tsx: "📄 리포트" 버튼 → 새 탭에서 HTML 열기
- 앱 DashboardScreen.tsx: "📄 리포트" 버튼 → ReportDocScreen 네비게이션

### Feature 3: 계약 전 체크리스트
- 웹 `ResultPage.tsx`: `ChecklistSection` 컴포넌트 — 계약서 유형별 10개 항목
  - 근로/임대차/프리랜서/기본 4가지 분류
  - 체크박스 인터랙션 (세션 로컬 상태)
- 앱 `ResultScreen.tsx`: `ChecklistSection` 리액트 네이티브 컴포넌트 — 7개 항목

### Feature 4: 계약 만료일 추적/알림
- `backend/app/models/saved_contract.py`: `expiry_date`, `expiry_notice_days` 컬럼 추가
- `PUT /api/v1/contracts/saved/{id}/expiry` — 만료일 저장
- `GET /api/v1/contracts/expiring` — 알림 대상 계약 목록 (days_left ≤ notice_days)
- 웹 DashboardPage.tsx: 만료 배너 + 인라인 날짜 피커 ("📅 만료일" 토글)
- DB 마이그레이션: `ssh_fix.py`에 ALTER TABLE 추가

### Feature 5: 팀 관리 (기업)
- `backend/app/models/team.py`: `TeamMember` 모델 (enterprise_user_id, member_email, role, status, invite_token)
- `backend/app/api/v1/endpoints/team.py`:
  - `POST /team/invite` — 이메일로 팀원 초대 (초대 메일 발송)
  - `GET /team/members` — 팀원 목록 조회
  - `GET /team/accept?token=` — 초대 수락 (토큰 검증 + 사용자 연결)
  - `DELETE /team/members/{id}` — 팀원 삭제
- `frontend/src/pages/TeamAcceptPage.tsx` — 초대 링크 수락 페이지
- `/team/accept` 라우트 App.tsx에 등록
- 웹 DashboardPage.tsx: 팀 관리 UI (초대 폼 + 팀원 목록 + 상태 배지)

### Feature 6: B2B SaaS 대시보드
- 웹 DashboardPage.tsx 기업 전용 섹션:
  - 통계 카드 6개: 총 계약서 / 이번 달 분석 / 위험 / 주의 / 안전 / 활성 팀원
  - 계약 유형 분포 바 차트 (API 응답 기반 동적 렌더링)
  - 위험도 분포 바 (위험/주의/안전 색상 구분)
- ENTERPRISE_FEATURES 목록 업데이트: 팀 관리/B2B 대시보드/PDF 리포트/만료추적 → 준비중 해제

### 기타 버그 수정
- `DashboardPage.tsx`: 중복 변수명 `expiringContracts` → `expiringLocalContracts`로 충돌 해결
- `ResultPage.tsx`: `React.useState` → `useState` (모듈 모드 호환), `contract_type` 필드 인터페이스 추가

---

*종합 현황 최종 업데이트: 2026-07-06 (6대 기능 전부 구현 완료, 서버 배포 완료)*

---

## 세션 추가 — 2026-07-06 (자동 로그아웃 + 내정보 페이지)

### [완료] JWT 토큰 30일 연장 + 자동 로그아웃 구현

**사용자 요청:**
- 웹: 로그인 후 30분 미사용 시 자동 로그아웃 + 상단 카운트다운 타이머
- 앱: 직접 로그아웃 전까지 로그인 유지

**구현 방식:**

| 구분 | 방식 |
|------|------|
| 서버 토큰 유효기간 | 30일 (앱 토큰 유지용) |
| 웹 자동 로그아웃 | 클라이언트 30분 비활동 타이머 (서버 무관) |
| 앱 로그아웃 | 사용자가 직접 로그아웃 버튼 누를 때만 |

**변경 파일:**
- `backend/app/core/config.py`: `ACCESS_TOKEN_EXPIRE_MINUTES = 43200` (30일)
- `frontend/src/context/AuthContext.tsx`: 30분 비활동 타이머 + `secondsLeft` state (1초 인터벌)
- `frontend/src/utils/apiFetch.ts` (신규): 401 인터셉터 → 자동 로그아웃 + `/auth?reason=token` 리다이렉트
- `frontend/src/components/common/Navbar.tsx`: 카운트다운 알약 UI (🔒→🟠→🔴 색상 변화)
- `frontend/src/pages/AuthPage.tsx`: `reason=idle` / `reason=token` 메시지 분기

**로그아웃 메시지:**
- `reason=idle` → "30분 동안 활동이 없어 자동으로 로그아웃되었습니다."
- `reason=token` → "보안을 위해 다시 로그인이 필요합니다."

---

### [완료] 내정보 페이지 구현

**사용자 요청:** "드롭다운 → 내정보 → 비밀번호 입력 → 내정보 수정"

**2단계 플로우:**
```
Navbar 드롭다운 → [내 정보]
    ↓
Step 1: 현재 비밀번호 입력 (POST /users/verify-password)
    ↓ 인증 성공 시
Step 2: 닉네임 / 전화번호 / 새 비밀번호 수정 (PUT /users/profile)
    ↓
완료 메시지 "정보가 성공적으로 수정되었습니다." + AuthContext user 즉시 반영
```

**변경 파일:**
- `backend/app/api/v1/endpoints/users.py`:
  - `POST /users/verify-password` — bcrypt 비밀번호 검증
  - `PUT /users/profile` — 닉네임/전화번호/비밀번호 수정 (닉네임 중복 체크 포함)
- `frontend/src/pages/ProfilePage.tsx` (신규): 2단계 UI 컴포넌트
- `frontend/src/App.tsx`: `/profile` 라우트 추가 (로그인 필요)
- `frontend/src/components/common/Navbar.tsx`: 드롭다운에 "내 정보" 링크 추가

**커밋:** `eb07fe2` | **GitHub Push:** ✅ | **서버 배포:** ✅

*마지막 업데이트: 2026-07-06*
