# Checkmate 작업 인수인계 문서
_최종 업데이트: 2026-06-28_

---

## 프로젝트 개요
AI 기반 계약서 분석 서비스. 계약서(PDF/DOCX/JPG/PNG)를 업로드하면 Gemini AI가 위험 조항을 분석하고 점수/등급을 부여.

- **웹**: React 18 + Vite → GitHub Pages 배포 (`sooyeonj99.github.io/checkmate`)
- **백엔드**: FastAPI + Python + SQLite(개발) / PostgreSQL(프로덕션)
- **모바일**: React Native + Expo SDK 56

---

## 현재 브랜치 상태
- `main` → 웹 배포용 (GitHub Actions 자동 배포)
- `master` → 최신 작업 내용 (2026-06-28 push)
- **할 일**: `master`를 `main`에 merge해야 Actions 실행됨

```bash
git checkout main
git merge master
git push origin main
```

---

## 이번 세션에서 수정한 내용

### 버그 수정 완료
| 파일 | 수정 내용 |
|------|-----------|
| `mobile/src/services/api.ts` | baseURL에 `/api/v1` 추가, 에뮬레이터용 IP `10.0.2.2` 설정 |
| `mobile/src/screens/AuthScreen.tsx` | 로그인 JSON 방식으로 변경, 회원가입 `/auth/register`로 수정 |
| `mobile/src/screens/DashboardScreen.tsx` | 중복된 `/api/v1/` prefix 제거 |
| `mobile/src/screens/ResultScreen.tsx` | 중복된 `/api/v1/` prefix 제거 |
| `mobile/package.json` | AsyncStorage `^3.1.1` → `^1.23.1` (Expo Go 호환) |
| `backend/app/core/security.py` | passlib → bcrypt 직접 사용 (Python 3.12 호환) |
| `mobile/app.json` | `usesCleartextTraffic: true` 추가 |
| `backend/requirements-dev.txt` | 개발용 패키지 목록 신규 생성 |

### 미완료 — 다음 세션에서 할 것
- `mobile/src/screens/AuthScreen.tsx`의 로그인이 현재 임시 `fetch` 코드로 되어 있음
  → `npm install` 후 AsyncStorage 정상 작동 확인되면 axios 방식으로 되돌려야 함
- 실제 로그인 테스트 완료 필요
- master → main merge 필요

---

## 다음 PC에서 환경 설정 순서

### 1. 필수 설치
```
Node.js LTS: https://nodejs.org
Python 3.12: winget install Python.Python.3.12
Git: winget install Git.Git
Android Studio (모바일 테스트용)
```

### 2. 프로젝트 클론
```bash
git clone https://github.com/sooyeonj99/checkmate.git
cd checkmate
git checkout master   # 최신 작업 브랜치
```

### 3. 백엔드 실행
```bash
cd backend
py -3.12 -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 4. 모바일 앱 실행
```bash
# 새 터미널에서
$env:ANDROID_HOME = "C:\Users\[사용자명]\AppData\Local\Android\Sdk"   # 경로 확인 필요
$env:PATH += ";$env:ANDROID_HOME\platform-tools"
cd mobile
npm install
npx expo start --clear
```

### 5. Android Studio 에뮬레이터
- Expo 터미널에서 `a` 키 입력
- Expo Go에서 `exp://10.0.2.2:8081` 입력

### 6. 테스트 계정
- 이메일: `test@test.com`
- 비밀번호: `test1234`

---

## 주요 설정값

### backend/.env
```
SECRET_KEY=checkmate-dev-secret-key-2024
GEMINI_API_KEY=[현재 설정된 키]
UPLOAD_DIR=uploads
MAX_FILE_SIZE_MB=20
```
※ `.env`는 git에 포함되어 있으므로 clone 후 바로 사용 가능

### Android SDK 경로 (이 PC 기준)
- `E:\Android\Sdk` (다른 PC에서는 기본 경로 `C:\Users\[사용자명]\AppData\Local\Android\Sdk`)

---

## 앱 구조 요약

```
checkmate/
├── backend/          # FastAPI 서버
│   ├── app/
│   │   ├── api/v1/endpoints/  # auth, contracts, chat, users
│   │   ├── core/security.py   # bcrypt 직접 사용
│   │   ├── services/gemini_service.py  # Gemini AI 분석
│   │   └── main.py
│   ├── requirements-dev.txt   # 개발용 (psycopg2 제외)
│   └── checkmate.db           # SQLite DB (개발용)
├── frontend/         # React 웹앱 (GitHub Pages)
└── mobile/           # React Native + Expo
    ├── src/screens/  # Auth, Dashboard, Upload, Loading, Result
    └── src/services/api.ts  # baseURL: http://10.0.2.2:8000/api/v1
```

---

## Claude Code에게 전달할 메시지 (다른 PC에서 시작 시)

```
체크메이트 프로젝트야. GitHub에서 clone했어.
git checkout master 브랜치가 최신이야.
모바일 앱 로그인 버그 수정 중이었고:
- AsyncStorage를 1.23.1로 다운그레이드했음
- AuthScreen.tsx 로그인이 임시 fetch 코드로 되어있음 → axios로 되돌리고 테스트 필요
- 백엔드는 backend/venv로 실행, 에뮬레이터 Android Studio 사용
- HANDOFF.md 파일에 전체 맥락 있음
```
