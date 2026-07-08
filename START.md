# Checkmate 개발 환경 시작 가이드

VS Code에서 터미널을 **3개** 열고 순서대로 실행하세요.  
터미널 추가: 상단 메뉴 `Terminal` → `New Terminal` → 우측 `+` 버튼

---

## 1. 백엔드 (FastAPI)

```powershell
cd E:\checkmate\backend
.\venv\Scripts\uvicorn.exe app.main:app --host 0.0.0.0 --port 8000 --reload
```

- 주소: `http://localhost:8000`
- API 문서: `http://localhost:8000/docs`
- `--reload` : 코드 수정 시 자동 재시작

---

## 2. 웹 프론트엔드 (Vite + React)

```powershell
cd E:\checkmate\frontend
npm run dev
```

- 주소: `http://localhost:5173`
- 코드 수정 시 브라우저 자동 반영

---

## 3. 앱 (Expo Metro 번들러)

```powershell
cd E:\checkmate\mobile
$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-17.0.19.10-hotspot"
$env:ANDROID_HOME = "E:\Android\Sdk"
npx expo start --clear
```

- Metro 실행 후 **`a`** 키 → 안드로이드 에뮬레이터 자동 연결
- `--clear` : 캐시 초기화 (오류 날 때 유용)
- 코드 수정 후 **`r`** 키 → 앱 새로고침

---

## 안드로이드 에뮬레이터

**방법 A** — Metro 실행 중 `a` 키 누르기 (자동 실행)

**방법 B** — Android Studio 직접 실행
1. Android Studio 열기
2. 우측 `Device Manager` 클릭
3. `Pixel_8` 옆 ▶ 버튼 클릭

---

## 테스트 계정 (4종류)

| 구분 | 이메일 | 비밀번호 | user_type |
|------|--------|----------|-----------|
| 개인 사용자 | `personal@checkmate.com` | `test1234` | personal |
| 기업/법인 | `enterprise@checkmate.com` | `test1234` | enterprise |
| 프랜차이즈 본사 | `franchisor@checkmate.com` | `test1234` | franchisor |
| 가맹점주 | `franchisee@checkmate.com` | `test1234` | franchisee |
| 관리자 | `ghdiehddl@gmail.com` | (직접 가입) | personal + 관리자 권한 |

> **테스트 계정 서버에 생성하기**: `python create_test_accounts.py` (로컬 터미널에서 실행)

---

## 계정 유형별 접근 권한 & 사용 흐름

### 👤 개인 사용자 (`personal`)

**접근 가능 페이지:**
- 홈 / 서비스 소개 / 요금제
- 계약서 업로드 → 개인정보 검토 → AI 분석 → 결과
- 대시보드 (내 계약서 목록 · 검색)
- 분석 통계 `/stats`
- AI 계약서 생성기 `/generate`
- 계약서 비교 `/compare`
- 계약서 일괄 분석 `/bulk`
- 전자서명 요청 / 서명 페이지
- 내 정보 (닉네임·비밀번호 수정)
- AI 챗봇 (모바일)

**사용 흐름:**
```
회원가입 → 이메일 인증 → 로그인
→ 계약서 업로드 (PDF/이미지/Word)
→ 개인정보 마스킹 선택
→ AI 분석 (Gemini) → 등급(안전/주의/위험) + 위험 조항 확인
→ 대시보드에 저장 → 비교 / 통계 확인
→ 만료일 임박 시 이메일 알림 수신
```

---

### 🏢 기업/법인 (`enterprise`)

**개인 사용자 권한 모두 포함 +**
- 팀원 초대 (이메일 / SMS)
- 팀원 계약서 공동 관리
- 서명 템플릿 생성 · 편집
- 구독 서비스 관리 (넷플릭스, 쿠팡 등)

**사용 흐름:**
```
로그인 → 대시보드 → 팀원 초대 (이메일/SMS 발송)
→ 팀원 수락 → 팀 계약서 공동 관리
→ 서명 템플릿 생성 (서명 위치·필드 지정)
→ 계약서에 서명 요청 → 상대방 이메일/SMS로 서명 링크 발송
→ 서명 완료 문서 다운로드 (HTML + 인증서)
→ 구독/렌탈 계약 만료일 관리
```

---

### 🏪 프랜차이즈 본사 (`franchisor`)

**기업 권한 모두 포함 +**
- 프랜차이즈 대시보드 `/franchise`
- 가맹점 등록 · 관리 (활성/비활성)
- 가맹점 계약서 통합 조회
- 가맹점 초대 이메일 발송
- 근로자 개인정보 공유 동의 관리

**사용 흐름:**
```
로그인 → 프랜차이즈 메뉴
→ 가맹점 등록 (매장명 · 지역 입력)
→ 가맹점주 이메일로 초대 발송
→ 가맹점별 계약서 현황 일괄 확인
→ 근로자 동의 요청 → 수락/거절 처리
→ 이상 계약(위험 등급) 즉시 알림
```

---

### 🧑‍💼 가맹점주 (`franchisee`)

**개인 사용자 권한 모두 포함 +**
- 본사 초대 링크로 프랜차이즈 연결
- 본사 공유 계약서 열람
- 근로자 계약서 업로드 및 동의 관리

**사용 흐름:**
```
본사 초대 이메일 수신 → 링크 클릭 → 가입/로그인
→ 가맹점 연결 완료
→ 근로자 계약서 업로드 → AI 분석
→ 본사와 계약서 공유 (동의 후)
→ 만료일 알림 수신
```

---

### 🛡️ 관리자 (`ghdiehddl@gmail.com`)

**모든 권한 포함 +**
- 어드민 패널 `/admin` 전용 접근
- 전체 사용자 목록 · 활성/비활성 토글
- 서비스 전체 통계 (사용자 수 · 계약서 수 · 등급 분포)
- B2B API 키 생성 · 삭제 · 활성화 관리
- B2B 파트너사에 API 키 발급 → 파트너사는 `X-Api-Key` 헤더로 API 호출

**B2B 사용 흐름:**
```
관리자 로그인 → /admin → B2B API 키 관리 탭
→ 파트너사 이름 입력 → API 키 생성 (cm_xxxxx)
→ 파트너사에 키 전달
→ 파트너사: GET /api/v1/admin/b2b/health (X-Api-Key: cm_xxxxx)
→ 호출 수 자동 카운팅 · 관리자 패널에서 확인
```

---

## 모바일 앱 vs 웹 기능 비교

| 기능 | 웹 | 앱 |
|------|----|----|
| 계약서 업로드·분석 | ✅ | ✅ |
| 대시보드·검색 | ✅ | ✅ |
| AI 챗봇 | ✅ | ✅ |
| 전자서명 | ✅ | ✅ |
| 팀 관리 | ✅ | ✅ |
| 프랜차이즈 | ✅ | ✅ |
| 분석 통계 `/stats` | ✅ | ✅ (대시보드 내 카드) |
| 계약서 비교 `/compare` | ✅ | ❌ (미구현) |
| AI 계약서 생성 `/generate` | ✅ | ❌ (미구현) |
| 일괄 분석 `/bulk` | ✅ | ❌ (미구현) |
| 어드민 패널 `/admin` | ✅ | ❌ (미구현) |
| 다크 모드 | ❌ (미구현) | ✅ |
| 카메라 OCR | ❌ | 🔜 준비중 |
| 푸시 알림 | ❌ | ✅ |

---

## 서버 배포 (실서버 반영 방법)

```bash
# SSH 접속
ssh -i "E:\checkmate\checkmate-key.pem" root@101.79.25.139

# 서버에서
cd /var/www/checkmate
git pull origin main

# 프론트 변경 시
cd frontend && npm run build

# 백엔드 변경 시
systemctl restart checkmate-backend

# 둘 다 변경 시
cd /var/www/checkmate
git pull origin main
cd frontend && npm run build
systemctl restart checkmate-backend
```

---

## 자주 쓰는 명령어

| 상황 | 명령어 |
|------|--------|
| 앱 새로고침 | Metro 터미널에서 `r` |
| 앱 캐시 초기화 재시작 | Metro 종료 후 `npx expo start --clear` |
| 백엔드 포트 충돌 시 | `netstat -ano \| findstr :8000` 으로 PID 확인 후 작업 관리자에서 종료 |
| GitHub 푸시 | `cd E:\checkmate` → `git add .` → `git commit -m "메시지"` → `git push origin main` |
| 테스트 계정 생성 | `python create_test_accounts.py` (로컬 터미널, E:\checkmate에서) |
