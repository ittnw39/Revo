# RevoProject 백엔드 서버

## 기능
- 오디오 파일 업로드 및 처리
- STT (Speech-to-Text): OpenAI Whisper 모델 사용
- 키워드 추출: 주제별 키워드 필터링 지원
- CORS 지원: 프론트엔드와 통신 가능

## 설치 방법

```bash
# 가상환경 생성 (권장)
python -m venv venv

# 가상환경 활성화
# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate

# 의존성 설치
pip install -r requirements.txt
```

## 실행 방법

```bash
python app.py
```

서버는 `http://localhost:5000`에서 실행됩니다.

## API 엔드포인트

### 1. 건강 상태 확인
```
GET /api/health
```

### 2. 오디오 업로드 및 처리
```
POST /api/upload-audio
Content-Type: multipart/form-data

파라미터:
- audio: 오디오 파일 (wav, mp3, m4a, ogg, webm)
- topic_keywords (선택): 주제 키워드 배열 (JSON 문자열)

응답:
{
  "success": true,
  "file_id": "uuid_filename.ext",
  "transcript": "변환된 텍스트",
  "keywords": ["키워드1", "키워드2", ...],
  "duration": 10.5,
  "language": "ko",
  "timestamp": "2024-01-01T00:00:00"
}
```

### 3. 오디오 파일 삭제
```
DELETE /api/audio/<file_id>
```

## 주의사항
- Whisper 모델은 처음 실행 시 다운로드됩니다 (약 150MB)
- 오디오 파일은 `uploads/` 폴더에 저장됩니다
- 최대 파일 크기: 50MB

