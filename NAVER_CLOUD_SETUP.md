# 네이버 클라우드 서버 세팅 가이드
## Checkmate 배포 — 처음부터 끝까지

---

## 1단계: 네이버 클라우드 가입 & 서버 생성

### 1-1. 가입 & 결제수단 등록

1. 네이버 클라우드 플랫폼 (cloud.naver.com) 접속 → 회원가입
2. 콘솔 진입 → 우측 상단 계정 → **결제수단 관리** → 카드 등록
3. 신규 가입 시 **크레딧 10만원** 제공 (약 2개월 무료)

---

### 1-2. 서버 생성

**콘솔 → Services → Compute → Server → 서버 생성**

| 항목 | 선택값 |
|------|--------|
| 서버 환경 | VPC 환경 |
| OS 이미지 | Ubuntu Server 22.04 LTS |
| 서버 타입 | Compact 2 (2vCPU / 4GB RAM) |
| 스토리지 | SSD 50GB |
| 예상 비용 | 약 40,000원/월 |

> **TIP:** Classic이 아닌 반드시 **VPC 환경** 선택

---

### 1-3. 인증키 생성 (SSH 접속용)

```
서버 생성 화면 → 인증키 설정 → "새 인증키 생성"
이름: checkmate-key
→ 생성 클릭 → checkmate-key.pem 파일 자동 다운로드
```

> ⚠️ .pem 파일은 한 번만 다운로드됩니다. 반드시 안전한 곳에 보관하세요.

---

### 1-4. ACG (방화벽) 포트 설정

**콘솔 → VPC → ACG → 서버에 연결된 ACG → 인바운드 규칙 수정**

아래 포트를 모두 추가:

| 프로토콜 | 포트 | 접근 소스 | 용도 |
|---------|------|----------|------|
| TCP | 22 | 0.0.0.0/0 | SSH 접속 |
| TCP | 80 | 0.0.0.0/0 | HTTP (웹사이트) |
| TCP | 443 | 0.0.0.0/0 | HTTPS |
| TCP | 8000 | 0.0.0.0/0 | FastAPI 백엔드 |

---

### 1-5. 공인 IP 할당

```
콘솔 → VPC → Public IP → IP 신청 버튼 클릭
→ 생성된 IP 선택 → "서버에 연결" 클릭 → 서버 선택
```

이 IP 주소가 외부에서 접속하는 서버 주소입니다.  
예: 123.456.789.0

---

## 2단계: SSH 접속

### Windows — PuTTY 사용

**① .pem → .ppk 키 변환 (PuTTYgen)**

```
PuTTYgen 프로그램 실행
→ Load 버튼 → checkmate-key.pem 선택
→ Save private key 버튼 → checkmate-key.ppk 저장
```

**② PuTTY로 서버 접속**

```
Host Name: [서버 공인IP]
Port: 22
Connection → SSH → Auth → Credentials
  → Private key file: checkmate-key.ppk 선택
Open 버튼 클릭
login as: root
```

### Mac / Linux — 터미널 사용

```bash
chmod 400 checkmate-key.pem
ssh -i checkmate-key.pem root@[서버공인IP]
```

---

## 3단계: 서버 기본 환경 설정

SSH 접속 후 아래 명령어를 순서대로 실행합니다.

### 3-1. 시스템 업데이트

```bash
apt update && apt upgrade -y
```

### 3-2. Python 3.11 설치

```bash
apt install -y python3.11 python3.11-venv python3-pip
python3.11 --version
# 출력 확인: Python 3.11.x
```

### 3-3. Node.js 18 설치

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs
node --version
# 출력 확인: v18.x.x
npm --version
```

### 3-4. nginx 설치

```bash
apt install -y nginx
systemctl enable nginx
systemctl start nginx
```

### 3-5. Git 설치

```bash
apt install -y git
```

### 3-6. 한국어 인코딩 설정 (cp949 오류 방지)

```bash
apt install -y language-pack-ko
locale-gen ko_KR.UTF-8
update-locale LANG=ko_KR.UTF-8
echo 'export LANG=ko_KR.UTF-8' >> ~/.bashrc
source ~/.bashrc
```

---

## 4단계: 코드 배포

### 4-1. GitHub에서 코드 클론

```bash
cd /var/www
git clone https://github.com/sooyeonj99/checkmate.git
cd checkmate
```

### 4-2. 백엔드 가상환경 & 패키지 설치

```bash
cd /var/www/checkmate/backend
python3.11 -m venv venv
source venv/bin/activate

pip install --upgrade pip
pip install -r requirements.txt

# spaCy 한국어 모델 설치
python -m spacy download ko_core_news_sm
python -m spacy download en_core_web_sm
```

### 4-3. 환경변수 파일 생성

```bash
nano /var/www/checkmate/backend/.env
```

아래 내용을 복사해서 붙여넣기 (값은 실제로 수정):

```
GEMINI_API_KEY=여기에_구글_Gemini_API_키_입력
SECRET_KEY=checkmate_prod_2026_랜덤한긴문자열
UPLOAD_DIR=/var/www/checkmate/backend/uploads
MAX_FILE_SIZE_MB=20
ALLOWED_ORIGINS=http://[서버공인IP],https://[서버공인IP]
```

저장: Ctrl+X → Y → Enter

### 4-4. 필요한 폴더 생성 & DB 초기화

```bash
mkdir -p /var/www/checkmate/backend/uploads
mkdir -p /var/www/checkmate/backend/masked_data

cd /var/www/checkmate/backend
source venv/bin/activate
python -c "
from app.db.base import Base
from app.db.session import engine
Base.metadata.create_all(engine)
print('DB 초기화 완료')
"
```

### 4-5. 프론트엔드 빌드

```bash
cd /var/www/checkmate/frontend
npm install
npm run build
# dist/ 폴더가 생성되면 성공
ls dist/
```

---

## 5단계: systemd 서비스 등록 (자동 시작)

서버가 재시작돼도 FastAPI가 자동으로 켜지도록 설정합니다.

```bash
nano /etc/systemd/system/checkmate.service
```

아래 내용 붙여넣기:

```ini
[Unit]
Description=Checkmate FastAPI Backend
After=network.target

[Service]
User=root
WorkingDirectory=/var/www/checkmate/backend
Environment="PATH=/var/www/checkmate/backend/venv/bin"
EnvironmentFile=/var/www/checkmate/backend/.env
ExecStart=/var/www/checkmate/backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2
Restart=always
RestartSec=3
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

저장: Ctrl+X → Y → Enter

```bash
# 서비스 등록 & 시작
systemctl daemon-reload
systemctl enable checkmate
systemctl start checkmate

# 상태 확인 — "active (running)" 이 보이면 성공
systemctl status checkmate
```

---

## 6단계: nginx 설정 (리버스 프록시)

```bash
nano /etc/nginx/sites-available/checkmate
```

아래 내용 붙여넣기 ([서버공인IP] 부분을 실제 IP로 교체):

```nginx
server {
    listen 80;
    server_name [서버공인IP];

    # React 프론트엔드 정적 파일
    location /checkmate/ {
        alias /var/www/checkmate/frontend/dist/;
        try_files $uri $uri/ /checkmate/index.html;
        index index.html;
    }

    # 루트 접속 시 /checkmate/로 이동
    location = / {
        return 301 /checkmate/;
    }

    # API 요청을 FastAPI로 전달
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 180s;
        client_max_body_size 50M;
    }
}
```

```bash
# 설정 활성화
ln -s /etc/nginx/sites-available/checkmate /etc/nginx/sites-enabled/

# 설정 문법 확인
nginx -t
# "test is successful" 이 보이면 성공

# nginx 재시작
systemctl reload nginx
```

---

## 7단계: 동작 확인

```bash
# FastAPI 로그 실시간 보기
journalctl -u checkmate -f

# nginx 접속 로그
tail -f /var/log/nginx/access.log

# API 직접 테스트
curl http://localhost:8000/api/v1/health

# 다른 터미널에서 외부 접속 테스트
curl http://[서버공인IP]/api/v1/health
```

브라우저에서 아래 주소로 접속 확인:

```
http://[서버공인IP]/checkmate/
```

---

## 8단계: 도메인 + HTTPS 설정 (선택 — 강력 추천)

도메인이 있다면 무료 SSL(HTTPS)을 설정할 수 있습니다.

**① 도메인 DNS 설정**

도메인 구매 사이트에서 A 레코드를 서버 공인IP로 설정:
```
A 레코드: @ → [서버공인IP]
A 레코드: www → [서버공인IP]
```

**② certbot으로 무료 SSL 발급**

```bash
apt install -y certbot python3-certbot-nginx

# 도메인 소유 확인 후 자동으로 HTTPS 설정
certbot --nginx -d yourdomain.com -d www.yourdomain.com

# 자동 갱신 테스트
certbot renew --dry-run
```

**③ nginx 설정 업데이트 (도메인 적용)**

```bash
nano /etc/nginx/sites-available/checkmate
# server_name [서버공인IP]; → server_name yourdomain.com www.yourdomain.com; 으로 변경
systemctl reload nginx
```

---

## 이후 코드 업데이트 방법

GitHub에 새 코드를 push한 후 서버에서:

```bash
cd /var/www/checkmate

# 최신 코드 받기
git pull origin main

# 백엔드 재시작
systemctl restart checkmate

# 프론트엔드 재빌드 (프론트 변경이 있을 때만)
cd frontend
npm run build

# nginx 재로드
systemctl reload nginx
```

---

## 문제 해결 (트러블슈팅)

### 백엔드가 실행이 안 될 때
```bash
journalctl -u checkmate -n 50 --no-pager
# 오류 메시지 확인 후 조치
```

### nginx 502 Bad Gateway 오류
```bash
# FastAPI가 실행 중인지 확인
systemctl status checkmate

# 포트 확인
ss -tlnp | grep 8000
```

### 파일 업로드가 안 될 때
```bash
# 업로드 폴더 권한 확인
ls -la /var/www/checkmate/backend/uploads
chmod 755 /var/www/checkmate/backend/uploads
```

### pip install 오류 (빌드 도구 없음)
```bash
apt install -y build-essential libssl-dev libffi-dev python3-dev
```

### spaCy 모델 설치 오류
```bash
source /var/www/checkmate/backend/venv/bin/activate
pip install spacy --upgrade
python -m spacy download ko_core_news_sm
```

---

## 예상 비용 정리

| 항목 | 월 비용 |
|------|--------|
| 서버 Compact 2 (2vCPU/4GB) | 약 40,000원 |
| 공인 IP | 약 1,600원 |
| 스토리지 50GB | 포함 |
| **합계** | **약 42,000원/월** |
| 신규 가입 크레딧 적용 | **약 2개월 무료** |

---

## 체크리스트

따라하면서 완료된 항목에 체크하세요:

- [ ] 1. 네이버 클라우드 가입 & 결제수단 등록
- [ ] 2. VPC 서버 생성 (Ubuntu 22.04, Compact 2)
- [ ] 3. 인증키 (.pem) 생성 및 보관
- [ ] 4. ACG 포트 설정 (22, 80, 443, 8000)
- [ ] 5. 공인 IP 할당 및 서버 연결
- [ ] 6. SSH 접속 성공
- [ ] 7. 시스템 업데이트 완료
- [ ] 8. Python 3.11, Node.js 18, nginx, git 설치 완료
- [ ] 9. GitHub 코드 클론
- [ ] 10. 백엔드 가상환경 & 패키지 설치
- [ ] 11. .env 파일 작성 (GEMINI_API_KEY 입력)
- [ ] 12. DB 초기화 완료
- [ ] 13. 프론트엔드 빌드 완료
- [ ] 14. systemd 서비스 등록 & 실행
- [ ] 15. nginx 설정 완료
- [ ] 16. 브라우저에서 http://[공인IP]/checkmate/ 접속 확인
- [ ] 17. (선택) 도메인 + HTTPS 설정
