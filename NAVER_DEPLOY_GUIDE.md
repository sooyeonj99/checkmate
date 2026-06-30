# 네이버 클라우드 Checkmate 배포 가이드
> 가입 완료 후 실서버 배포까지 — 단계별 복사·붙여넣기 가이드

---

## 현재 상태 확인
- [x] 네이버 클라우드 가입 완료
- [x] 크레딧 100,000원 발급
- [ ] 결제 수단 등록 (필수 — 크레딧만으로도 2개월 이상 무료)
- [ ] 서버 생성부터 시작

---

## STEP 1 — 결제 수단 등록

1. 콘솔 우측 상단 **계정명 클릭** → **결제수단 관리**
2. **신용카드 등록** (실제 청구는 크레딧 소진 후 발생)
3. 등록 완료 후 다시 **콘솔 메인**으로 이동

---

## STEP 2 — VPC 생성

**콘솔 → Services → Networking → VPC**

1. **VPC 생성** 클릭
2. 설정값:
   - VPC 이름: `checkmate-vpc`
   - IP 주소 범위: `10.0.0.0/16`
3. **생성** 클릭 → 완료될 때까지 대기 (30초)

---

## STEP 3 — Subnet 생성

**VPC → Subnet Management → Subnet 생성**

1. 설정값:
   - Subnet 이름: `checkmate-subnet`
   - VPC: `checkmate-vpc` 선택
   - IP 주소 범위: `10.0.0.0/24`
   - Zone: **KR-1** (아무거나 선택)
   - Internet Gateway 전용 여부: **Y (Public)**
2. **생성** 클릭

---

## STEP 4 — ACG (방화벽) 설정

**VPC → Network ACG → ACG 생성**

1. ACG 이름: `checkmate-acg`
2. VPC: `checkmate-vpc` 선택 → 생성

**생성 후 → ACG 이름 클릭 → Inbound 규칙 추가**

| 프로토콜 | 허용 포트 | 접근 소스 | 비고 |
|---|---|---|---|
| TCP | 22 | 0.0.0.0/0 | SSH 접속 |
| TCP | 80 | 0.0.0.0/0 | HTTP |
| TCP | 443 | 0.0.0.0/0 | HTTPS |
| TCP | 8000 | 0.0.0.0/0 | FastAPI (임시, 나중에 닫아도 됨) |

각 행 입력 후 **추가** 클릭 → 최종 **적용** 클릭

---

## STEP 5 — SSH 키 페어 생성

**Compute → Server → 서버 생성 전에 먼저**

**Compute → Key Pair → 키 페어 생성**

1. 키 페어 이름: `checkmate-key`
2. **생성** 클릭
3. **`.pem` 파일 자동 다운로드됨** → 절대 잃어버리지 말 것!
   - 저장 위치 예: `C:\Users\사용자명\Downloads\checkmate-key.pem`

---

## STEP 6 — 서버 생성

**Compute → Server → 서버 생성**

### 6-1. 서버 이미지 선택
- OS: **Ubuntu Server 22.04 LTS** 선택

### 6-2. 서버 설정
| 항목 | 선택값 |
|---|---|
| 서버 타입 | Compact |
| vCPU | **2vCPU** |
| RAM | **4GB** |
| 스토리지 | SSD 50GB (기본값) |

> 예상 비용: 약 38,000~42,000원/월 (크레딧으로 약 2.5개월 무료)

### 6-3. 서버 환경 설정
- VPC: `checkmate-vpc`
- Subnet: `checkmate-subnet`
- ACG: `checkmate-acg`
- 인증키: `checkmate-key`

### 6-4. 서버 이름
- 서버 이름: `checkmate-server`

**최종 서버 생성** 클릭 → 상태가 `running`이 될 때까지 대기 (2~3분)

---

## STEP 7 — 공인 IP 할당

**Compute → Server → Public IP → 공인 IP 신청**

1. **공인 IP 신청** 클릭
2. 적용 서버: `checkmate-server` 선택
3. **신청** 클릭
4. 할당된 IP 확인 (예: `123.456.789.000`) → **이 IP가 서버 주소입니다**

---

## STEP 8 — SSH 접속

### Windows (PowerShell)

```powershell
# .pem 파일 권한 설정 (처음 한 번만)
icacls "C:\Users\사용자명\Downloads\checkmate-key.pem" /inheritance:r /grant:r "%username%:R"

# 서버 접속
ssh -i "C:\Users\사용자명\Downloads\checkmate-key.pem" root@여기에_공인IP_입력
```

> 처음 접속 시 `Are you sure you want to continue connecting?` → `yes` 입력

### 접속 성공 화면
```
Welcome to Ubuntu 22.04 LTS
root@checkmate-server:~#
```

---

## STEP 9 — 서버 초기 설정

아래 명령어를 서버 터미널에서 **순서대로** 실행:

```bash
# 패키지 업데이트
apt update && apt upgrade -y

# 필수 패키지 설치
apt install -y git curl wget unzip nginx certbot python3-certbot-nginx

# 방화벽 설정
ufw allow 22
ufw allow 80
ufw allow 443
ufw allow 8000
ufw enable
# y 입력 후 엔터
```

---

## STEP 10 — Python 3.11 설치

```bash
# Python 3.11 설치
add-apt-repository ppa:deadsnakes/python3.11 -y
apt update
apt install -y python3.11 python3.11-venv python3.11-distutils

# pip 설치
curl -sS https://bootstrap.pypa.io/get-pip.py | python3.11

# 버전 확인
python3.11 --version
```

---

## STEP 11 — Node.js 설치

```bash
# Node.js 20 LTS 설치
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# 버전 확인
node --version    # v20.x.x 나오면 성공
npm --version
```

---

## STEP 12 — 프로젝트 클론

```bash
# 작업 디렉토리로 이동
cd /var/www

# GitHub에서 프로젝트 클론
git clone https://github.com/sooyeonj99/checkmate.git
cd checkmate

# 구조 확인
ls
# backend/  frontend/  mobile/  ...
```

---

## STEP 13 — 백엔드 환경 설정

```bash
cd /var/www/checkmate/backend

# Python 가상환경 생성
python3.11 -m venv venv
source venv/bin/activate

# 패키지 설치
pip install -r requirements.txt

# spaCy 모델 설치
python -m spacy download ko_core_news_sm
python -m spacy download en_core_web_sm
```

### .env 파일 생성

```bash
# .env 파일 만들기
nano /var/www/checkmate/backend/.env
```

아래 내용 입력 후 `Ctrl+X` → `Y` → `Enter` 저장:

```env
GEMINI_API_KEY=여기에_구글_Gemini_API_키_입력
SECRET_KEY=아무_랜덤_문자열_32자_이상_입력
UPLOAD_DIR=/var/www/checkmate/backend/uploads
DATABASE_URL=sqlite:///./checkmate.db
```

> Gemini API 키: https://aistudio.google.com/app/apikey 에서 발급

---

## STEP 14 — 프론트엔드 빌드

```bash
cd /var/www/checkmate/frontend

# 패키지 설치
npm install

# .env.production 생성 (API 주소 서버 IP로 변경)
echo "VITE_API_BASE=http://공인IP:8000/api/v1" > .env.production

# 빌드
npm run build
# dist/ 폴더가 생성됨
```

---

## STEP 15 — systemd 서비스 등록 (백엔드 자동 실행)

```bash
# 서비스 파일 생성
nano /etc/systemd/system/checkmate-backend.service
```

아래 내용 입력:

```ini
[Unit]
Description=Checkmate FastAPI Backend
After=network.target

[Service]
User=root
WorkingDirectory=/var/www/checkmate/backend
Environment="PATH=/var/www/checkmate/backend/venv/bin"
ExecStart=/var/www/checkmate/backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

저장 후 (`Ctrl+X` → `Y` → `Enter`):

```bash
# 서비스 활성화 & 시작
systemctl daemon-reload
systemctl enable checkmate-backend
systemctl start checkmate-backend

# 동작 확인
systemctl status checkmate-backend
# Active: active (running) 이면 성공
```

---

## STEP 16 — nginx 설정

```bash
# nginx 설정 파일 생성
nano /etc/nginx/sites-available/checkmate
```

아래 내용 입력 (공인IP를 도메인 있으면 도메인으로, 없으면 IP 그대로):

```nginx
server {
    listen 80;
    server_name 공인IP입력;  # 또는 도메인 (예: checkmate.com)

    # 프론트엔드 (React 빌드 결과물)
    location /checkmate/ {
        alias /var/www/checkmate/frontend/dist/;
        index index.html;
        try_files $uri $uri/ /checkmate/index.html;
    }

    # 백엔드 API 프록시
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 300;
        proxy_send_timeout 300;
        client_max_body_size 50M;
    }

    location / {
        return 301 /checkmate/;
    }
}
```

```bash
# 설정 활성화
ln -s /etc/nginx/sites-available/checkmate /etc/nginx/sites-enabled/

# 기본 설정 비활성화 (충돌 방지)
rm -f /etc/nginx/sites-enabled/default

# 설정 검증
nginx -t
# successful 나오면 OK

# nginx 재시작
systemctl restart nginx
systemctl enable nginx
```

---

## STEP 17 — 접속 테스트

브라우저에서 아래 주소 접속:

```
http://공인IP/checkmate/
```

**정상 접속되면 배포 성공!**

API 테스트:
```
http://공인IP/api/v1/health
→ {"status": "ok"} 가 나오면 백엔드 정상
```

---

## STEP 18 — HTTPS 설정 (도메인 있는 경우)

> 도메인 없이 IP만으로는 HTTPS 불가. 도메인 구매 후 진행.

### 18-1. 도메인 DNS 설정
도메인 관리 페이지에서 **A 레코드** 추가:
- 호스트: `@` 또는 `www`
- 값: 네이버 클라우드 공인 IP

### 18-2. Let's Encrypt 인증서 발급

```bash
# nginx용 certbot으로 자동 발급
certbot --nginx -d 도메인주소 -d www.도메인주소

# 이메일 입력
# 약관 동의: A
# 뉴스레터: N
# 자동으로 nginx 설정도 업데이트됨
```

### 18-3. 자동 갱신 확인

```bash
# 갱신 테스트
certbot renew --dry-run
# success 나오면 자동 갱신 활성화 완료
```

---

## STEP 19 — 앱(Expo) 서버 주소 변경

서버 배포 완료 후, `mobile/src/services/api.ts` 에서 주소 변경:

```typescript
// 기존 (로컬)
const BASE_URL = 'http://localhost:8000/api/v1'

// 변경 (서버)
const BASE_URL = 'https://도메인주소/api/v1'
// 또는 IP만 있는 경우
const BASE_URL = 'http://공인IP:8000/api/v1'
```

변경 후 `npm run build` (Expo 앱 재빌드 필요).

---

## 문제 해결

### 백엔드가 안 켜질 때
```bash
# 로그 확인
journalctl -u checkmate-backend -n 50
```

### nginx 오류
```bash
# nginx 로그 확인
tail -f /var/log/nginx/error.log
```

### DB 권한 오류
```bash
chmod 755 /var/www/checkmate/backend
chmod 644 /var/www/checkmate/backend/checkmate.db
```

### 업로드 디렉토리 생성
```bash
mkdir -p /var/www/checkmate/backend/uploads
chmod 755 /var/www/checkmate/backend/uploads
```

---

## 월 예상 비용

| 항목 | 비용 |
|---|---|
| Compact 서버 (2vCPU/4GB) | 약 38,000원/월 |
| 공인 IP | 약 3,000원/월 |
| 합계 | **약 41,000원/월** |
| 크레딧 지속 기간 | **약 2.4개월 무료** |

---

## 완료 체크리스트

- [ ] STEP 1: 결제 수단 등록
- [ ] STEP 2: VPC 생성
- [ ] STEP 3: Subnet 생성
- [ ] STEP 4: ACG (방화벽) 설정
- [ ] STEP 5: SSH 키 페어 생성
- [ ] STEP 6: 서버 생성 (Ubuntu 22.04, 2vCPU/4GB)
- [ ] STEP 7: 공인 IP 할당
- [ ] STEP 8: SSH 접속 확인
- [ ] STEP 9: 서버 초기 설정
- [ ] STEP 10: Python 3.11 설치
- [ ] STEP 11: Node.js 설치
- [ ] STEP 12: 프로젝트 클론
- [ ] STEP 13: 백엔드 .env 설정
- [ ] STEP 14: 프론트엔드 빌드
- [ ] STEP 15: systemd 서비스 등록
- [ ] STEP 16: nginx 설정
- [ ] STEP 17: 접속 테스트 ✅
- [ ] STEP 18: HTTPS 설정 (도메인 있는 경우)
- [ ] STEP 19: 앱 API 주소 변경
