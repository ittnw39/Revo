# RevoProject 백엔드 서버

감정 기반 음성 녹음 및 분석 백엔드 API

## 주요 기능

- 🎤 **음성 녹음 및 저장**: 사용자 음성 파일 업로드
- 🗣️ **STT (Speech-to-Text)**: OpenAI Whisper를 사용한 음성-텍스트 변환
- 🤖 **AI 분석**: ChatGPT를 활용한 키워드 추출 및 감정 분석
- 📊 **데이터베이스**: SQLite 기반 데이터 저장
- 👥 **사용자 관리**: 이름 기반 간단한 사용자 시스템
- ❤️ **소셜 기능**: 좋아요, 피드 기능

## 데이터베이스 구조

### 사용자 (User)
- id: 고유 ID
- name: 사용자 이름 (unique)
- created_at: 생성 일시

### 녹음 (Recording)
- id: 고유 ID
- user_id: 사용자 ID (외래키)
- content: STT 변환된 텍스트
- keywords: 추출된 키워드들 (쉼표 구분)
- audio_file: 녹음 파일명
- recorded_at: 녹음 일시
- emotion: 감정 (기쁨, 화남, 슬픔, 당황, 놀람, 신남)
- highlight_time: 하이라이트 구간 (예: "1:30")
- likes: 좋아요 수
- created_at: 생성 일시
- updated_at: 수정 일시

## 설치 방법

### 1. 의존성 설치

```bash
# 가상환경 생성 (권장)
python -m venv venv

# 가상환경 활성화 (Windows)
venv\Scripts\activate

# 가상환경 활성화 (Linux/Mac)
source venv/bin/activate

# 의존성 설치
pip install -r requirements.txt
```

### 2. 환경변수 설정

`.env` 파일을 생성하고 다음 내용을 입력:

```env
OPENAI_API_KEY=your_openai_api_key_here
```

또는 자동 설정 도우미 사용:
```bash
python setup_env.py
```

OpenAI API 키는 https://platform.openai.com/api-keys 에서 발급받을 수 있습니다.

> 💡 **참고**: API 키가 없어도 기본 기능은 작동합니다!

### 3. 서버 실행

```bash
python app.py
```

서버는 `http://localhost:5000`에서 실행됩니다.

## API 엔드포인트

### 헬스체크
```
GET /api/health
```

### 사용자 관리

#### 사용자 생성/조회
```
POST /api/users
Content-Type: application/json

{
  "name": "사용자이름"
}
```

#### 모든 사용자 조회
```
GET /api/users
```

#### 특정 사용자 조회
```
GET /api/users/{user_id}
```

### 녹음 관리

#### 녹음 업로드 및 분석
```
POST /api/recordings
Content-Type: multipart/form-data

- audio: 오디오 파일 (wav, mp3, m4a, ogg, webm)
- user_id: 사용자 ID
- highlight_time: 하이라이트 구간 (선택, 예: "1:30")
```

응답:
```json
{
  "success": true,
  "message": "녹음이 저장되었습니다.",
  "recording": {
    "id": 1,
    "user_id": 1,
    "user_name": "홍길동",
    "content": "변환된 텍스트",
    "keywords": ["키워드1", "키워드2"],
    "audio_file": "uuid_filename.mp3",
    "audio_url": "/api/audio/uuid_filename.mp3",
    "recorded_at": "2024-01-01T00:00:00",
    "emotion": "기쁨",
    "highlight_time": "1:30",
    "likes": 0
  }
}
```

#### 녹음 목록 조회 (피드)
```
GET /api/recordings?user_id={user_id}&limit={limit}

Query Parameters:
- user_id (선택): 특정 사용자만 필터링
- limit (선택): 개수 제한 (기본 50)
```

#### 특정 녹음 조회
```
GET /api/recordings/{recording_id}
```

#### 녹음 삭제
```
DELETE /api/recordings/{recording_id}
```

#### 좋아요 추가
```
POST /api/recordings/{recording_id}/like
```

#### 좋아요 취소
```
POST /api/recordings/{recording_id}/unlike
```

### 오디오 파일

#### 오디오 파일 재생/다운로드
```
GET /api/audio/{filename}
```

### 통계

#### 감정별 통계
```
GET /api/emotions/stats?user_id={user_id}

Query Parameters:
- user_id (선택): 특정 사용자만 통계
```

응답:
```json
{
  "success": true,
  "total": 10,
  "emotions": {
    "기쁨": 3,
    "화남": 1,
    "슬픔": 2,
    "당황": 1,
    "놀람": 2,
    "신남": 1
  }
}
```

## Docker 배포

### Dockerfile로 이미지 빌드

```bash
docker build -t revo-backend .
```

### Docker 컨테이너 실행

```bash
docker run -d -p 5000:5000 -e OPENAI_API_KEY=your_key_here revo-backend
```

### Docker Compose 사용

```bash
docker-compose up -d
```

## AWS 배포 가이드

### 1. EC2 인스턴스 생성
- Ubuntu 22.04 LTS 선택
- 보안그룹: 5000 포트 오픈

### 2. Docker 설치

```bash
sudo apt update
sudo apt install docker.io docker-compose -y
sudo systemctl start docker
sudo systemctl enable docker
```

### 3. 배포

```bash
# 코드 클론
git clone [your-repo]
cd backend

# 환경변수 설정
echo "OPENAI_API_KEY=your_key" > .env

# Docker 실행
docker-compose up -d
```

## 주의사항

- Whisper 모델은 처음 실행 시 자동으로 다운로드됩니다 (약 150MB)
- 오디오 파일은 `uploads/` 폴더에 저장됩니다
- 데이터베이스는 `revo.db` SQLite 파일로 저장됩니다
- 최대 파일 크기: 50MB
- OpenAI API 키가 없으면 간단한 키워드 추출 방식이 사용됩니다

## 개발 모드

```bash
# 디버그 모드로 실행
python app.py
```

## 프로덕션 모드

```bash
# gunicorn 설치
pip install gunicorn

# gunicorn으로 실행
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

## 기술 스택

- **Flask**: 웹 프레임워크
- **SQLAlchemy**: ORM
- **SQLite**: 데이터베이스
- **OpenAI Whisper**: STT
- **OpenAI GPT-3.5**: 텍스트 분석
- **Docker**: 컨테이너화
