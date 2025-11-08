# 🚀 시작하기 - RevoProject 백엔드

환영합니다! 이 가이드는 RevoProject 백엔드를 빠르게 시작하는 방법을 안내합니다.

---

## 📖 문서 가이드

처음 시작하시나요? 아래 순서대로 문서를 읽어보세요:

### 1️⃣ 빠른 시작 (5분)
📄 **[QUICK_START.md](QUICK_START.md)**
- 환경 설정
- 의존성 설치
- 서버 실행
- 간단한 테스트

👉 **지금 바로 시작하세요!**

---

### 2️⃣ API 사용법
📄 **[API_DOCUMENTATION.md](API_DOCUMENTATION.md)**
- 모든 API 엔드포인트 설명
- 요청/응답 예제
- 에러 처리
- 프론트엔드 연동 예제

---

### 3️⃣ 배포하기
📄 **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)**
- AWS EC2 인스턴스 생성
- Docker 배포
- Vercel 프론트엔드 연결
- SSL 인증서 설정
- 모니터링 및 유지보수

---

### 4️⃣ 프로젝트 구조
📄 **[PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)**
- 파일 구조 설명
- 아키텍처 다이어그램
- 데이터베이스 스키마
- 개발 워크플로우

---

### 5️⃣ 전체 개요
📄 **[README.md](README.md)**
- 프로젝트 소개
- 주요 기능
- 기술 스택
- 종합 가이드

---

## ⚡ 30초 만에 시작하기

```bash
# 1. 가상환경 생성 및 활성화
python -m venv venv
.\venv\Scripts\Activate.ps1  # Windows PowerShell

# 2. 의존성 설치
pip install -r requirements.txt

# 3. 환경변수 설정 (선택)
python setup_env.py

# 4. 서버 실행
python app.py
```

브라우저에서 http://localhost:5000/api/health 접속!

---

## 🎯 주요 기능

### ✅ 음성 녹음 및 텍스트 변환
사용자가 녹음한 음성을 자동으로 텍스트로 변환 (OpenAI Whisper)

### ✅ AI 기반 분석
ChatGPT를 활용하여 키워드 추출 및 감정 분석 (6가지 감정)

### ✅ 데이터베이스 저장
SQLite를 사용하여 사용자와 녹음 기록을 영구 저장

### ✅ RESTful API
프론트엔드와 쉽게 연동할 수 있는 REST API 제공

### ✅ 소셜 기능
좋아요, 피드, 감정 통계 등의 기능

---

## 🗄️ 데이터 구조

```
사용자 (User)
    - id: 고유 ID
    - name: 이름 (unique)
    |
    | 일대다 관계
    ▼
녹음 (Recording)
    - id: 고유 ID
    - user_id: 사용자 ID
    - content: STT 텍스트
    - keywords: 키워드 (쉼표 구분)
    - audio_file: 파일명
    - recorded_at: 녹음 일시
    - emotion: 감정 (기쁨/화남/슬픔/당황/놀람/신남)
    - highlight_time: 하이라이트 구간
    - likes: 좋아요 수
```

---

## 🔗 프론트엔드 연동

### React/Next.js 예제

```javascript
// 1. 환경변수 설정 (.env.local)
NEXT_PUBLIC_API_URL=http://localhost:5000/api

// 2. API 호출 (frontend_examples.js 참고)
import { createOrGetUser, uploadRecording, getRecordings } from '@/lib/api';

// 사용자 생성
const { user } = await createOrGetUser('홍길동');

// 녹음 업로드
const { recording } = await uploadRecording(audioBlob, user.id);

// 피드 조회
const { recordings } = await getRecordings({ limit: 50 });
```

📄 **[frontend_examples.js](frontend_examples.js)** - 완전한 예제 코드

---

## 🐳 Docker로 실행

```bash
# 빌드
docker build -t revo-backend .

# 실행
docker run -p 5000:5000 -e OPENAI_API_KEY=your_key revo-backend

# 또는 Docker Compose
docker-compose up -d
```

---

## 🧪 테스트

```bash
# API 테스트 스크립트
python test_api.py

# 또는 수동 테스트
curl http://localhost:5000/api/health
```

---

## 📊 API 엔드포인트 미리보기

| 기능 | 메서드 | 경로 |
|------|--------|------|
| 헬스체크 | GET | `/api/health` |
| 사용자 생성 | POST | `/api/users` |
| 녹음 업로드 | POST | `/api/recordings` |
| 피드 조회 | GET | `/api/recordings` |
| 오디오 재생 | GET | `/api/audio/{filename}` |
| 좋아요 | POST | `/api/recordings/{id}/like` |
| 감정 통계 | GET | `/api/emotions/stats` |

👉 **전체 API 문서**: [API_DOCUMENTATION.md](API_DOCUMENTATION.md)

---

## 🛠️ 기술 스택

- **프레임워크**: Flask 3.0
- **데이터베이스**: SQLite (SQLAlchemy ORM)
- **STT**: OpenAI Whisper
- **AI 분석**: ChatGPT (GPT-3.5-turbo)
- **배포**: Docker, AWS EC2
- **프론트엔드**: Vercel (React/Next.js)

---

## 🔑 환경 설정

### 필수 환경변수

`.env` 파일 생성:
```env
OPENAI_API_KEY=your_openai_api_key_here
```

**발급 방법**: https://platform.openai.com/api-keys

> 💡 **참고**: API 키 없이도 기본 기능은 작동합니다!
> 간단한 키워드 추출 방식으로 폴백됩니다.

---

## 📁 프로젝트 구조

```
backend/
├── app.py                    # 메인 Flask 앱
├── models.py                 # DB 모델
├── services.py               # ChatGPT 서비스
├── requirements.txt          # 의존성
├── Dockerfile                # Docker 이미지
├── docker-compose.yml        # Docker Compose
│
├── 📖 문서
│   ├── START_HERE.md         # 이 문서
│   ├── QUICK_START.md        # 빠른 시작
│   ├── API_DOCUMENTATION.md  # API 문서
│   ├── DEPLOYMENT_GUIDE.md   # 배포 가이드
│   └── PROJECT_STRUCTURE.md  # 프로젝트 구조
│
├── 🔧 유틸리티
│   ├── setup_env.py          # 환경 설정 도우미
│   ├── test_api.py           # API 테스트
│   └── frontend_examples.js  # 프론트엔드 예제
│
└── 📦 데이터
    ├── uploads/              # 녹음 파일
    └── revo.db              # SQLite DB
```

---

## 🎓 학습 경로

### 1단계: 로컬에서 실행
1. [QUICK_START.md](QUICK_START.md) 따라하기
2. `python test_api.py`로 테스트
3. Postman으로 API 호출해보기

### 2단계: 프론트엔드 연동
1. [frontend_examples.js](frontend_examples.js) 복사
2. React에서 API 호출
3. 녹음 → 업로드 → 피드 표시 구현

### 3단계: 배포
1. [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) 참고
2. AWS EC2 인스턴스 생성
3. Docker로 배포
4. Vercel과 연결

---

## ❓ 자주 묻는 질문 (FAQ)

### Q: OpenAI API 키가 없으면 사용할 수 없나요?
**A**: 아니요! 키가 없어도 기본 키워드 추출 방식으로 작동합니다.

### Q: 데이터베이스를 변경할 수 있나요?
**A**: 네! SQLAlchemy를 사용하므로 PostgreSQL, MySQL 등으로 쉽게 변경 가능합니다.

### Q: 프로덕션 환경에서 주의할 점은?
**A**: CORS 설정, HTTPS, Rate Limiting, 파일 저장소(S3) 등을 고려하세요. [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)를 참고하세요.

### Q: 녹음 파일 크기 제한은?
**A**: 현재 50MB입니다. `app.py`의 `MAX_FILE_SIZE`에서 변경 가능합니다.

---

## 🔥 빠른 명령어 모음

```bash
# 서버 실행
python app.py

# 테스트
python test_api.py

# 환경 설정
python setup_env.py

# Docker 실행
docker-compose up -d

# Docker 로그 보기
docker-compose logs -f

# DB 초기화
rm revo.db ; python app.py
```

---

## 🤝 도움이 필요하신가요?

1. 📖 **문서 확인**: 위의 문서 가이드 참고
2. 🐛 **이슈 생성**: GitHub Issues
3. 💬 **질문하기**: Discussions

---

## ✅ 체크리스트

시작하기 전에 확인하세요:

- [ ] Python 3.11 이상 설치됨
- [ ] pip가 정상 작동함
- [ ] 가상환경 생성 및 활성화
- [ ] requirements.txt 설치 완료
- [ ] .env 파일 생성 (선택)
- [ ] 서버가 5000 포트에서 실행됨
- [ ] `/api/health`가 정상 응답

---

## 🎉 시작하세요!

준비되셨나요? 지금 바로 시작하세요!

👉 **[QUICK_START.md](QUICK_START.md)로 이동**

---

**행운을 빕니다!** 🚀

문제가 있으면 언제든지 질문해주세요.

