# 프로젝트 구조

## 📁 파일 구조

```
backend/
├── app.py                    # 메인 Flask 애플리케이션
├── models.py                 # 데이터베이스 모델 (User, Recording)
├── services.py               # 외부 서비스 (ChatGPT API)
├── requirements.txt          # Python 의존성
├── Dockerfile                # Docker 이미지 설정
├── docker-compose.yml        # Docker Compose 설정
├── .env                      # 환경변수 (생성 필요)
├── .gitignore               # Git 제외 파일
│
├── README.md                 # 프로젝트 개요 및 전체 가이드
├── QUICK_START.md           # 빠른 시작 가이드
├── API_DOCUMENTATION.md     # API 상세 문서
├── DEPLOYMENT_GUIDE.md      # 배포 가이드 (AWS, Vercel)
├── PROJECT_STRUCTURE.md     # 이 문서
│
├── setup_env.py             # 환경 설정 도우미
├── test_api.py              # API 테스트 스크립트
│
├── uploads/                 # 업로드된 오디오 파일
│   └── [*.mp3, *.wav, ...]
│
└── revo.db                  # SQLite 데이터베이스
```

---

## 🏗️ 아키텍처

```
┌─────────────────┐
│   프론트엔드     │
│   (Vercel)      │
│   React/Next.js │
└────────┬────────┘
         │ HTTP/REST
         ▼
┌─────────────────┐
│   Flask API     │
│   (AWS EC2)     │
└────────┬────────┘
         │
    ┌────┴────┬────────┬──────────┐
    ▼         ▼        ▼          ▼
┌────────┐ ┌────┐  ┌──────┐  ┌────────┐
│SQLite  │ │STT │  │ GPT  │  │uploads/│
│(revo.db)│ │    │  │ API  │  │ files  │
└────────┘ └────┘  └──────┘  └────────┘
```

---

## 📊 데이터베이스 스키마

### User (사용자)
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**관계**: User → Recording (1:N)

### Recording (녹음)
```sql
CREATE TABLE recordings (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,           -- STT 텍스트
    keywords VARCHAR(500),            -- 쉼표 구분 키워드
    audio_file VARCHAR(255) NOT NULL, -- 파일명
    recorded_at DATETIME NOT NULL,
    emotion ENUM NOT NULL,            -- 감정 (6가지)
    highlight_time VARCHAR(20),       -- 하이라이트 구간
    likes INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### Emotion (감정) - Enum
- 기쁨 (JOY)
- 화남 (ANGER)
- 슬픔 (SADNESS)
- 당황 (CONFUSION)
- 놀람 (SURPRISE)
- 신남 (EXCITEMENT)

---

## 🔄 데이터 플로우

### 1. 사용자 온보딩
```
프론트엔드 → POST /api/users (name)
    → User 생성 또는 조회
    → user_id 반환
    → localStorage에 저장
```

### 2. 녹음 업로드 및 처리
```
프론트엔드 → 음성 녹음 (WebAPI)
    ↓
프론트엔드 → POST /api/recordings (audio, user_id)
    ↓
백엔드:
    1. 파일 저장 (uploads/)
    2. STT 처리 (Whisper)
    3. GPT 분석 (키워드 + 감정)
    4. DB 저장 (Recording)
    5. 응답 반환
    ↓
프론트엔드 → 결과 표시
```

### 3. 피드 조회
```
프론트엔드 → GET /api/recordings?limit=50
    ↓
백엔드 → DB 조회 (최신순)
    ↓
프론트엔드 → 녹음 목록 표시
```

### 4. 오디오 재생
```
프론트엔드 → GET /api/audio/{filename}
    ↓
백엔드 → 파일 스트리밍
    ↓
프론트엔드 → <audio> 태그로 재생
```

---

## 🎯 핵심 모듈 설명

### app.py
Flask 애플리케이션의 메인 엔트리포인트
- API 라우팅
- 요청/응답 처리
- 에러 핸들링
- CORS 설정

**주요 라우트**:
- `/api/health` - 헬스체크
- `/api/users` - 사용자 관리
- `/api/recordings` - 녹음 관리
- `/api/audio/<filename>` - 파일 서빙
- `/api/emotions/stats` - 통계

### models.py
SQLAlchemy ORM 모델 정의
- `User` 클래스
- `Recording` 클래스
- `EmotionType` Enum
- 관계 설정 (FK, backref)

**핵심 메서드**:
- `to_dict()` - JSON 직렬화

### services.py
외부 서비스 통합
- `analyze_text_with_gpt()` - GPT API 호출
- `extract_keywords_simple()` - 폴백 키워드 추출

**처리 과정**:
1. 텍스트를 GPT에 전송
2. JSON 응답 파싱
3. 키워드 + 감정 추출
4. 실패 시 간단한 추출 방식 사용

---

## 🔌 API 엔드포인트 요약

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/health` | 헬스체크 |
| POST | `/api/users` | 사용자 생성/조회 |
| GET | `/api/users` | 모든 사용자 조회 |
| GET | `/api/users/{id}` | 특정 사용자 조회 |
| POST | `/api/recordings` | 녹음 업로드 |
| GET | `/api/recordings` | 녹음 목록 조회 |
| GET | `/api/recordings/{id}` | 특정 녹음 조회 |
| DELETE | `/api/recordings/{id}` | 녹음 삭제 |
| POST | `/api/recordings/{id}/like` | 좋아요 추가 |
| POST | `/api/recordings/{id}/unlike` | 좋아요 취소 |
| GET | `/api/audio/{filename}` | 오디오 재생 |
| GET | `/api/emotions/stats` | 감정 통계 |

---

## 🔧 환경변수

### 필수
- `OPENAI_API_KEY` - OpenAI API 키

### 선택 (기본값 사용)
- `FLASK_ENV` - 환경 (development/production)
- `DATABASE_URL` - 데이터베이스 URL
- `PORT` - 서버 포트 (기본: 5000)

---

## 🐳 Docker 설정

### Dockerfile
- 베이스: `python:3.11-slim`
- ffmpeg 설치 (Whisper 의존성)
- Gunicorn으로 실행 (4 workers)
- 타임아웃: 300초 (STT 처리용)

### docker-compose.yml
- 포트 매핑: 5000:5000
- 볼륨: uploads, revo.db
- 재시작 정책: unless-stopped
- 헬스체크: 30초마다

---

## 📝 개발 워크플로우

### 1. 로컬 개발
```bash
# 가상환경 활성화
source venv/bin/activate  # Linux/Mac
.\venv\Scripts\Activate.ps1  # Windows

# 서버 실행 (디버그 모드)
python app.py

# 자동 재시작 활성화 (코드 변경 시)
# Flask debug=True가 이미 설정됨
```

### 2. 테스트
```bash
# API 테스트
python test_api.py

# 수동 테스트
curl http://localhost:5000/api/health
```

### 3. 커밋
```bash
git add .
git commit -m "feat: 새 기능 추가"
git push origin main
```

### 4. 배포
```bash
# EC2에서
cd ~/your-repo/backend
git pull
docker-compose down
docker-compose up -d --build
```

---

## 🚀 프로덕션 고려사항

### 성능
- [ ] Gunicorn 워커 수 조정
- [ ] PostgreSQL로 마이그레이션 (SQLite → PostgreSQL)
- [ ] Redis 캐싱 추가
- [ ] CDN으로 오디오 파일 서빙

### 보안
- [ ] CORS 특정 도메인만 허용
- [ ] Rate Limiting 추가
- [ ] API 키 인증 추가
- [ ] HTTPS 강제 (Nginx + Let's Encrypt)
- [ ] 파일 업로드 크기 제한 강화

### 모니터링
- [ ] 로깅 (CloudWatch, ELK)
- [ ] 에러 트래킹 (Sentry)
- [ ] 성능 모니터링 (New Relic, Datadog)
- [ ] 헬스체크 자동화

### 확장성
- [ ] 로드 밸런서 (ALB)
- [ ] 오토 스케일링
- [ ] S3로 파일 저장
- [ ] RDS로 데이터베이스 분리

---

## 📚 추가 자료

- [Flask 공식 문서](https://flask.palletsprojects.com/)
- [SQLAlchemy 문서](https://docs.sqlalchemy.org/)
- [OpenAI Whisper](https://github.com/openai/whisper)
- [OpenAI API 문서](https://platform.openai.com/docs/)
- [Docker 문서](https://docs.docker.com/)

---

## 🤝 기여 가이드

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 라이선스

이 프로젝트는 MIT 라이선스를 따릅니다.

