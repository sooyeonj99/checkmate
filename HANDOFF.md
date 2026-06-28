# Checkmate 작업 인수인계 문서
_최종 업데이트: 2026-06-29_

---

## 프로젝트 개요
AI 기반 계약서 분석 서비스. 계약서(PDF/DOCX/JPG/PNG)를 업로드하면 Gemini AI가 위험 조항을 분석하고 점수/등급을 부여.

- **웹**: React 18 + Vite → GitHub Pages 배포 (`sooyeonj99.github.io/checkmate`)
- **백엔드**: FastAPI + Python 3.12 + SQLite(개발) / PostgreSQL(프로덕션)
- **모바일**: React Native + Expo SDK 56 → `npx expo run:android` 방식 (Expo Go 사용 안 함)

---

## 현재 상태 (2026-06-29 기준)
- ✅ 백엔드 정상 실행
- ✅ 웹 앱 정상 실행 (localhost:3000/checkmate/)
- ✅ 모바일 앱 빌드 성공 및 에뮬레이터 설치 완료
- ✅ 로그인 정상 작동 확인 (test@test.com / test1234)
- ✅ AuthScreen.tsx 임시 fetch 코드 → axios로 정리 완료

---

## 다음 PC에서 환경 설정 순서

### 1. 필수 설치
```
Node.js LTS:       winget install OpenJS.NodeJS.LTS
Python 3.12:       winget install Python.Python.3.12
Git:               winget install Git.Git
JDK 17:            winget install Microsoft.OpenJDK.17
Android Studio:    https://developer.android.com/studio
```

### 2. 프로젝트 클론
```bash
git clone https://github.com/sooyeonj99/checkmate.git
cd checkmate
```

### 3. 터미널 1 — 백엔드 실행
```powershell
(Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned)
cd backend
py -3.12 -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 4. 터미널 2 — 모바일 앱 빌드 및 실행
```powershell
# JAVA_HOME 설정 (JDK 17 경로 확인 후)
$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-17.0.19.10-hotspot"
$env:PATH = "$env:JAVA_HOME\bin;" + $env:PATH

# Android SDK 경로 설정 (설치 위치에 따라 변경)
$env:ANDROID_HOME = "C:\Users\[사용자명]\AppData\Local\Android\Sdk"
$env:PATH += ";$env:ANDROID_HOME\platform-tools"

cd mobile
npm install
npx expo run:android   # 첫 빌드 5~10분 소요
```

### 5. 터미널 3 — 웹 프론트엔드 실행
```powershell
cd frontend
npm install
npm run dev
# → http://localhost:3000/checkmate/ 에서 확인
```

### 6. Android Studio 에뮬레이터
- Android Studio 실행 → Device Manager → 에뮬레이터 ▶ 버튼
- `npx expo run:android` 실행 전에 에뮬레이터가 먼저 켜져 있어야 함
- 에뮬레이터 없으면: Device Manager → Create Device → Pixel 8 → API 35

---

## 이 PC 환경 (E:\checkmate 기준)
- Android SDK: `E:\Android\Sdk`
- JDK 17: `C:\Program Files\Microsoft\jdk-17.0.19.10-hotspot`
- Python venv: `backend\venv` (Python 3.12)

---

## 테스트 계정
- 이메일: `test@test.com`
- 비밀번호: `test1234`

---

## 주요 설정값

### backend/.env (git에 포함, clone 후 바로 사용 가능)
```
SECRET_KEY=checkmate-dev-secret-key-2024
GEMINI_API_KEY=[설정된 키]
UPLOAD_DIR=uploads
MAX_FILE_SIZE_MB=20
```

### 모바일 API 설정
- `mobile/src/services/api.ts` → `API_BASE_URL = 'http://10.0.2.2:8000'` (에뮬레이터용)
- 실제 기기 사용 시 PC의 실제 IP로 변경 필요

---

## 앱 구조

```
checkmate/
├── backend/              # FastAPI 서버 (포트 8000)
│   ├── app/
│   │   ├── api/v1/endpoints/  # auth, contracts, chat, users
│   │   ├── core/security.py   # bcrypt 직접 사용 (passlib 제거)
│   │   └── services/gemini_service.py
│   ├── requirements-dev.txt   # 개발용 (psycopg2 제외)
│   └── checkmate.db           # SQLite DB (테스트 계정 포함)
├── frontend/             # React 웹앱 (포트 3000)
│   └── src/pages/        # Home, Auth, Dashboard, Upload, Loading, Result 등
└── mobile/               # React Native + Expo SDK 56
    ├── src/screens/      # Auth, Dashboard, Upload, Loading, Result
    ├── src/services/api.ts  # baseURL: http://10.0.2.2:8000/api/v1
    └── android/          # 빌드 생성 폴더 (.gitignore에 포함)
```

---

## API 엔드포인트 (prefix: /api/v1)
| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | /auth/login | JSON {email, password} |
| POST | /auth/register | JSON {username, email, password} |
| POST | /contracts/upload | 파일 업로드 |
| POST | /contracts/{id}/analyze | AI 분석 |
| POST | /contracts/{id}/save | 대시보드 저장 |
| GET | /contracts/saved | 저장 목록 |
| DELETE | /contracts/saved/{id} | 저장 삭제 |
| POST | /chat | Gemini 챗봇 |

---

## Claude Code에게 전달할 메시지 (다른 PC에서 시작 시)

```
체크메이트 프로젝트야. HANDOFF.md 읽고 이어서 작업해줘.
현재 상태: 웹+앱+백엔드 모두 정상 작동 확인됨.
- 웹: npm run dev (localhost:3000/checkmate/)
- 앱: npx expo run:android (에뮬레이터에 직접 설치 방식)
- 백엔드: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
