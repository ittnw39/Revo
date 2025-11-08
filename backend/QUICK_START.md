# 빠른 시작 가이드

## 🚀 5분만에 시작하기

### 1단계: 저장소 클론 (이미 완료)

```bash
cd backend
```

### 2단계: 환경 설정

#### Windows (PowerShell)
```powershell
# 가상환경 생성
python -m venv venv

# 가상환경 활성화
.\venv\Scripts\Activate.ps1

# 또는 CMD에서
venv\Scripts\activate.bat
```

#### Linux/Mac
```bash
# 가상환경 생성
python3 -m venv venv

# 가상환경 활성화
source venv/bin/activate
```

### 3단계: 의존성 설치

```bash
pip install -r requirements.txt
```

⏰ **예상 소요 시간**: 5-10분 (Whisper, PyTorch 다운로드 포함)

### 4단계: 환경변수 설정

```bash
python setup_env.py
```

또는 수동으로 `.env` 파일 생성:

```env
OPENAI_API_KEY=your_openai_api_key_here
```

> 💡 **팁**: OpenAI API 키가 없어도 기본 기능은 작동합니다!
> 키워드 추출이 간단한 방식으로 동작합니다.

### 5단계: 서버 실행

```bash
python app.py
```

서버가 실행되면:
```
Whisper 모델 로딩 중...
Whisper 모델 로드 완료!
데이터베이스 초기화 완료!
 * Running on http://0.0.0.0:5000
```

### 6단계: 테스트

브라우저에서 http://localhost:5000/api/health 접속

또는:

```bash
# 새 터미널에서
python test_api.py
```

---

## 📱 프론트엔드 연동

프론트엔드(Vercel)에서 API를 호출할 때:

```javascript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// 사용자 생성 예제
const response = await fetch(`${API_URL}/users`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: '홍길동' })
});
```

---

## 🐳 Docker로 실행 (선택)

### 단순 실행
```bash
docker build -t revo-backend .
docker run -p 5000:5000 -e OPENAI_API_KEY=your_key revo-backend
```

### Docker Compose 사용
```bash
# .env 파일 생성 후
docker-compose up -d
```

---

## ☁️ AWS 배포

### EC2 인스턴스에서

```bash
# 1. Docker 설치
sudo apt update
sudo apt install -y docker.io docker-compose

# 2. 코드 배포
git clone [your-repo]
cd backend

# 3. 환경변수 설정
echo "OPENAI_API_KEY=your_key" > .env

# 4. 실행
docker-compose up -d

# 5. 로그 확인
docker-compose logs -f
```

### 보안 그룹 설정
- 인바운드 규칙: TCP 5000 포트 오픈
- 프로덕션에서는 Nginx 리버스 프록시 사용 권장

---

## 🔧 일반적인 문제 해결

### 1. Whisper 모델 다운로드가 느려요
```bash
# 사전 다운로드
python -c "import whisper; whisper.load_model('base')"
```

### 2. CUDA/GPU 오류
```bash
# CPU 버전 사용 (requirements.txt 수정)
torch>=2.0.0+cpu
torchaudio>=2.0.0+cpu
```

### 3. 포트가 이미 사용 중
```bash
# app.py에서 포트 변경
app.run(host='0.0.0.0', port=8000, debug=True)
```

### 4. CORS 오류
```python
# app.py에서 CORS 설정 확인
CORS(app, origins=["http://localhost:3000", "https://your-vercel-app.vercel.app"])
```

---

## 📚 다음 단계

- [API 문서](API_DOCUMENTATION.md) - 모든 API 엔드포인트 상세 설명
- [README](README.md) - 전체 기능 및 배포 가이드

---

## 💡 개발 팁

### 개발 중 자동 재시작
```bash
# Flask 디버그 모드 (이미 활성화됨)
python app.py
```

### 데이터베이스 초기화
```bash
# 기존 DB 삭제하고 재시작
rm revo.db
python app.py
```

### API 테스트
- Postman 사용
- Thunder Client (VS Code 확장)
- curl 명령어

```bash
# curl 예제
curl http://localhost:5000/api/health
```

---

## 🎉 완료!

이제 프론트엔드에서 백엔드 API를 호출할 준비가 되었습니다!

문제가 있으면 이슈를 생성해주세요.

