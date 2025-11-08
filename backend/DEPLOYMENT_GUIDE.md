# 배포 가이드

## 📋 개요

이 가이드는 RevoProject 백엔드를 AWS EC2에 Docker로 배포하고, Vercel에 배포된 프론트엔드와 연결하는 방법을 설명합니다.

---

## 🔧 1단계: AWS EC2 인스턴스 생성

### 1.1 인스턴스 설정
- **AMI**: Ubuntu Server 22.04 LTS
- **인스턴스 타입**: t2.medium 이상 (Whisper 모델 실행용)
- **스토리지**: 20GB 이상
- **보안 그룹**: 
  - SSH (22): 내 IP
  - Custom TCP (5000): Anywhere (또는 프론트엔드 도메인만)
  - HTTP (80): Anywhere (Nginx 사용 시)
  - HTTPS (443): Anywhere (Nginx + SSL 사용 시)

### 1.2 키 페어 생성
- `.pem` 파일 다운로드 및 안전한 위치에 저장

### 1.3 SSH 접속
```bash
# Windows (PowerShell)
ssh -i "your-key.pem" ubuntu@your-ec2-ip

# 키 권한 설정 (필요시)
icacls "your-key.pem" /inheritance:r
icacls "your-key.pem" /grant:r "%username%":"(R)"
```

---

## 🐳 2단계: EC2에 Docker 설치

```bash
# 시스템 업데이트
sudo apt update
sudo apt upgrade -y

# Docker 설치
sudo apt install -y docker.io docker-compose

# Docker 서비스 시작 및 자동 시작 설정
sudo systemctl start docker
sudo systemctl enable docker

# 현재 사용자를 docker 그룹에 추가
sudo usermod -aG docker $USER

# 재로그인 (또는 재부팅)
exit
# 다시 SSH 접속
```

### Docker 설치 확인
```bash
docker --version
docker-compose --version
```

---

## 📦 3단계: 코드 배포

### 3.1 Git 저장소 클론
```bash
cd ~
git clone https://github.com/your-username/your-repo.git
cd your-repo/backend
```

### 3.2 환경변수 설정
```bash
# .env 파일 생성
nano .env
```

`.env` 파일 내용:
```env
OPENAI_API_KEY=your_actual_openai_api_key_here
```

저장: `Ctrl + O`, `Enter`, `Ctrl + X`

---

## 🚀 4단계: Docker로 실행

### 4.1 Docker 이미지 빌드
```bash
docker build -t revo-backend .
```

### 4.2 Docker Compose로 실행
```bash
docker-compose up -d
```

### 4.3 로그 확인
```bash
# 실시간 로그 보기
docker-compose logs -f

# 최근 로그 보기
docker-compose logs --tail=100
```

### 4.4 상태 확인
```bash
# 컨테이너 상태
docker-compose ps

# 서버 헬스체크
curl http://localhost:5000/api/health
```

---

## 🌐 5단계: 프론트엔드 연결 (Vercel)

### 5.1 백엔드 URL 확인
```bash
# EC2 퍼블릭 IP 확인
curl ifconfig.me
```

백엔드 URL: `http://your-ec2-ip:5000/api`

### 5.2 Vercel 환경변수 설정

Vercel 프로젝트 설정 → Environment Variables:

```
NEXT_PUBLIC_API_URL=http://your-ec2-ip:5000/api
```

또는 프로덕션에서:
```
NEXT_PUBLIC_API_URL=https://api.your-domain.com/api
```

### 5.3 프론트엔드 코드 예제

```javascript
// config/api.js
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const createUser = async (name) => {
  const response = await fetch(`${API_URL}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  return response.json();
};

export const uploadRecording = async (audioBlob, userId, highlightTime) => {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.webm');
  formData.append('user_id', userId);
  if (highlightTime) {
    formData.append('highlight_time', highlightTime);
  }

  const response = await fetch(`${API_URL}/recordings`, {
    method: 'POST',
    body: formData,
  });
  return response.json();
};

export const getFeed = async (limit = 50) => {
  const response = await fetch(`${API_URL}/recordings?limit=${limit}`);
  return response.json();
};
```

---

## 🔒 6단계: 프로덕션 보안 설정 (선택)

### 6.1 Nginx 리버스 프록시 설정

```bash
# Nginx 설치
sudo apt install -y nginx

# 설정 파일 생성
sudo nano /etc/nginx/sites-available/revo
```

설정 내용:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location /api {
        proxy_pass http://localhost:5000/api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

활성화:
```bash
sudo ln -s /etc/nginx/sites-available/revo /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 6.2 SSL 인증서 (Let's Encrypt)

```bash
# Certbot 설치
sudo apt install -y certbot python3-certbot-nginx

# SSL 인증서 발급
sudo certbot --nginx -d your-domain.com

# 자동 갱신 테스트
sudo certbot renew --dry-run
```

### 6.3 CORS 설정 업데이트

`app.py` 수정:
```python
# 특정 도메인만 허용
CORS(app, origins=[
    "https://your-vercel-app.vercel.app",
    "https://your-custom-domain.com"
])
```

재배포:
```bash
docker-compose down
docker-compose up -d --build
```

---

## 📊 7단계: 모니터링 및 유지보수

### 7.1 로그 관리
```bash
# 로그 파일 크기 제한 (docker-compose.yml)
services:
  backend:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### 7.2 자동 재시작 설정
```bash
# docker-compose.yml에 이미 설정됨
restart: unless-stopped
```

### 7.3 백업 스크립트
```bash
# backup.sh
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
cp revo.db backups/revo_${DATE}.db
cp -r uploads backups/uploads_${DATE}
# 7일 이상 된 백업 삭제
find backups/ -name "*.db" -mtime +7 -delete
```

실행:
```bash
chmod +x backup.sh
# 크론탭에 추가 (매일 새벽 2시)
crontab -e
# 0 2 * * * /home/ubuntu/your-repo/backend/backup.sh
```

---

## 🔄 8단계: 업데이트 및 재배포

### 코드 업데이트
```bash
cd ~/your-repo/backend
git pull origin main

# Docker 이미지 재빌드 및 재시작
docker-compose down
docker-compose up -d --build
```

### 무중단 배포 (고급)
```bash
# 새 이미지 빌드
docker-compose build

# 점진적 업데이트
docker-compose up -d --no-deps --build backend
```

---

## ⚠️ 문제 해결

### 1. 컨테이너가 시작되지 않음
```bash
docker-compose logs
docker-compose ps
```

### 2. 메모리 부족
```bash
# 인스턴스 타입 업그레이드 (t2.small → t2.medium)
# 또는 스왑 메모리 추가
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### 3. 디스크 공간 부족
```bash
# Docker 정리
docker system prune -a

# 오래된 로그 삭제
docker-compose logs --tail=0
```

### 4. API 연결 안됨
```bash
# 방화벽 확인
sudo ufw status

# 포트 확인
sudo netstat -tlnp | grep 5000

# CORS 헤더 확인
curl -H "Origin: https://your-frontend.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: X-Requested-With" \
  -X OPTIONS \
  http://your-ec2-ip:5000/api/health -v
```

---

## 📈 성능 최적화

### 1. Gunicorn 워커 수 조정
```dockerfile
# Dockerfile
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "--timeout", "300", "app:app"]
# workers = (2 x CPU cores) + 1
```

### 2. 데이터베이스 최적화
```python
# PostgreSQL로 변경 (선택)
# docker-compose.yml에 PostgreSQL 추가
```

### 3. 캐싱 추가
```python
# Redis 캐싱 (선택)
# 자주 조회되는 데이터 캐싱
```

---

## ✅ 체크리스트

배포 전:
- [ ] OpenAI API 키 준비
- [ ] EC2 인스턴스 생성 및 보안 그룹 설정
- [ ] 도메인 설정 (선택)

배포 중:
- [ ] Docker 설치 완료
- [ ] 코드 클론 및 .env 설정
- [ ] Docker Compose 실행
- [ ] 헬스체크 확인

배포 후:
- [ ] Vercel 환경변수 설정
- [ ] 프론트엔드에서 API 연결 테스트
- [ ] SSL 인증서 설정 (선택)
- [ ] 백업 스크립트 설정

---

## 📞 지원

문제가 발생하면:
1. 로그 확인: `docker-compose logs -f`
2. 헬스체크: `curl http://localhost:5000/api/health`
3. 이슈 생성

---

**완료!** 🎉

이제 프론트엔드(Vercel)와 백엔드(AWS EC2)가 연결되었습니다!

