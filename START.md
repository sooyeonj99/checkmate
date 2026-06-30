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

## 테스트 계정

| 구분 | 이메일 | 비밀번호 |
|------|--------|----------|
| 개인 사용자 | `personal@checkmate.com` | `test1234` |
| 사업자 | `enterprise@checkmate.com` | `test1234` |

---

## 자주 쓰는 명령어

| 상황 | 명령어 |
|------|--------|
| 앱 새로고침 | Metro 터미널에서 `r` |
| 앱 캐시 초기화 재시작 | Metro 종료 후 `npx expo start --clear` |
| 백엔드 포트 충돌 시 | 터미널에서 `netstat -ano \| findstr :8000` 으로 PID 확인 후 작업 관리자에서 종료 |
| GitHub 푸시 | `cd E:\checkmate` → `git add .` → `git commit -m "메시지"` → `git push origin main` |
