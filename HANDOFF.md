# Checkmate 작업 인수인계 문서
_최종 업데이트: 2026-07-10 (세션 16 완료)_

---

## 프로젝트 개요
AI 기반 계약서 분석 서비스. 계약서(PDF/DOCX/JPG/PNG)를 업로드하면 Gemini AI가 위험 조항을 분석하고 점수/등급을 부여.

- **GitHub**: https://github.com/sooyeonj99/checkmate (main 브랜치)
- **실서버**: http://101.79.25.139 (네이버 클라우드 VPS)
- **백엔드**: FastAPI + Python 3.12 + SQLite
- **프론트엔드**: React 18 + TypeScript + Vite
- **AI**: Google Gemini (gemini-2.5-flash, temperature=0)

---

## 현재 상태 (2026-07-10 기준)
- 최신 커밋: `b056a8d` — 이모지 복원 + 서명/버튼 기능 패치
- 서버 배포: 완료 (http://101.79.25.139)
- 주요 기능 현황:
  - ✅ 계약서 업로드 및 AI 분석
  - ✅ 대시보드 (저장된 계약서 관리)
  - ✅ 분석 통계 페이지 (StatsPage)
  - ✅ 전자서명 요청/자기서명
  - ✅ 서명된 문서에 계약서 내용 + 서명 표시
  - ✅ 계약서 템플릿 생성/발송
  - ✅ Gemini 점수 고정 (temperature=0)
  - ✅ 대시보드 버튼 1줄 레이아웃

---

## 서버 정보

| 항목 | 값 |
|---|---|
| IP | 101.79.25.139 |
| OS | Ubuntu 22.04 LTS |
| SSH 키 | checkmate-key.pem (프로젝트 루트에 있음 — git에서 제외됨) |
| SSH 명령 | `ssh -i "checkmate-key.pem" root@101.79.25.139` |
| 서버 경로 | `/var/www/checkmate/` |
| 백엔드 서비스 | `systemctl restart checkmate-backend` |
| systemd 서비스 파일 | `/etc/systemd/system/checkmate-backend.service` |

**서버 배포 명령 (SSH 접속 후):**
```bash
cd /var/www/checkmate && git pull
cd /var/www/checkmate/frontend && npm run build
systemctl restart checkmate-backend
```

---

## Git에 없는 중요 파일 (다른 PC로 반드시 복사)

### 1. `checkmate-key.pem` (SSH 키)
- 현재 위치: `E:\checkmate\checkmate-key.pem`
- 없으면 서버 SSH 접속 불가
- 다른 PC로 복사 후 권한 설정 필요 (Windows: icacls로 현재 사용자만 읽기 권한)

### 2. `backend/.env` (환경변수 / API 키)
- 현재 위치: `E:\checkmate\backend\.env`
- 서버 위치: `/var/www/checkmate/backend/.env`
- 없으면 Gemini 분석, 이메일 발송, JWT 인증 모두 불가
- 내용 (직접 생성 또는 기존 파일 복사):
```
GEMINI_API_KEY=...           # Google AI Studio에서 발급
SECRET_KEY=...               # JWT 서명용 시크릿 키
EMAIL_USER=...               # Gmail 주소 (이메일 발송용)
EMAIL_PASSWORD=...           # Gmail 앱 비밀번호
DATABASE_URL=sqlite:///./checkmate.db
UPLOAD_DIR=uploads
MAX_FILE_SIZE_MB=20
```

---

## 다른 PC에서 시작하는 방법

### 필수 설치
```
Node.js LTS:   winget install OpenJS.NodeJS.LTS
Python 3.12:   winget install Python.Python.3.12
Git:           winget install Git.Git
VS Code:       winget install Microsoft.VisualStudioCode
Claude Code:   npm install -g @anthropic-ai/claude-code
```

### 프로젝트 클론
```powershell
git clone https://github.com/sooyeonj99/checkmate.git E:\checkmate
cd E:\checkmate
```

### .env 파일 복사
- 기존 PC의 `E:\checkmate\backend\.env` 를 새 PC의 같은 위치에 복사

### checkmate-key.pem 복사
- 기존 PC의 `E:\checkmate\checkmate-key.pem` 을 새 PC의 같은 위치에 복사
- PowerShell에서 권한 설정:
```powershell
icacls "E:\checkmate\checkmate-key.pem" /inheritance:r /grant:r "${env:USERNAME}:(R)"
```

### Claude Code 메모리 복사 (이전 대화 컨텍스트 유지)
기존 PC의 Claude Code 메모리를 새 PC에 복사하면 이전 대화 내용을 기억합니다:
- 복사 원본: `C:\Users\[기존PC사용자명]\.claude\projects\e--checkmate\memory\`
- 복사 대상: `C:\Users\[새PC사용자명]\.claude\projects\e--checkmate\memory\`
- 폴더가 없으면 먼저 생성 후 복사

### 로컬 개발 서버 실행 (선택사항 — 서버가 있으므로 필수 아님)
```powershell
# 백엔드
cd E:\checkmate\backend
py -3.12 -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# 프론트엔드 (별도 터미널)
cd E:\checkmate\frontend
npm install
npm run dev
```

---

## Claude Code에게 전달할 첫 메시지

새 PC에서 Claude Code 실행 후 아래 메시지를 그대로 붙여넣기:

```
체크메이트 프로젝트야. HANDOFF.md 읽고 이어서 작업해줘.

현재 상태 (2026-07-10):
- GitHub main 브랜치 최신 커밋: b056a8d (이모지 복원 + 서명 기능 패치)
- 실서버: http://101.79.25.139 (네이버 클라우드, systemd 서비스 운영 중)
- 백엔드: FastAPI + SQLite, /var/www/checkmate/backend/
- 프론트엔드: React+Vite 빌드, /var/www/checkmate/frontend/dist/
- SSH: ssh -i "E:\checkmate\checkmate-key.pem" root@101.79.25.139

서버 업데이트 명령:
① cd /var/www/checkmate && git pull
② cd /var/www/checkmate/frontend && npm run build
③ systemctl restart checkmate-backend
```

---

## 프로젝트 구조

```
E:\checkmate\
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/   # auth, contracts, signing, stats, templates, users, admin
│   │   ├── models/             # user, saved_contract, signing, user_template, team
│   │   ├── services/
│   │   │   └── gemini_service.py   # temperature=0 (고정 점수)
│   │   └── main.py             # _migrate_db() — 컬럼 마이그레이션
│   ├── .env                    # API 키 (git 제외)
│   ├── checkmate.db            # SQLite DB
│   └── requirements-dev.txt
├── frontend/
│   ├── src/
│   │   ├── pages/              # Dashboard, Result, Stats, Signing, Template 등
│   │   ├── components/         # SigningModal, SignaturePad, TemplateModal 등
│   │   └── index.css           # 전역 스타일
│   └── dist/                   # 빌드 결과물
├── checkmate-key.pem           # SSH 키 (git 제외)
├── HANDOFF.md                  # 이 파일
└── CHAT_LOG.md                 # 대화 로그
```

---

## 주요 API 엔드포인트 (prefix: /api/v1)

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | /auth/login | 로그인 |
| POST | /auth/register | 회원가입 |
| POST | /contracts/upload | 파일 업로드 |
| POST | /contracts/{id}/analyze | AI 분석 |
| POST | /contracts/{id}/save | 대시보드 저장 |
| GET | /contracts/saved | 저장 목록 |
| GET | /contracts/saved/{id}/report | 리포트 HTML |
| POST | /signing/request | 서명 요청 발송 |
| POST | /signing/self-sign | 자기 서명 |
| GET | /signing/signed-doc/{token} | 서명된 문서 보기 |
| GET | /stats/me | 분석 통계 |
| GET/POST | /templates | 계약서 템플릿 |
| POST | /templates/send | 템플릿 발송 |

---

## DB 마이그레이션 방식
- Alembic 사용 안 함
- `backend/app/main.py` → `_migrate_db()` 함수에서 `ALTER TABLE ADD COLUMN` 방식으로 관리
- 새 컬럼 추가 시 이 함수에 추가하면 서버 재시작 시 자동 적용

---

## 테스트 계정
- 이메일: `test@test.com` / 비밀번호: `test1234`
- 관리자: `ghdiehddl@gmail.com`

---

## 보안 주의사항
- `checkmate-key.pem` — git 커밋 금지 (.gitignore에 포함됨)
- `backend/.env` — git 커밋 금지 (.gitignore에 포함됨)
- `create_test_accounts.py` — root 비밀번호 포함, git 커밋 금지
