# RevoProject API 문서

## 베이스 URL
```
http://localhost:5000/api
```

프로덕션: `https://your-domain.com/api`

## 인증
현재 버전은 인증이 없습니다. 이름 기반으로 사용자를 구분합니다.

---

## 1. 헬스체크

서버 상태를 확인합니다.

### Request
```http
GET /api/health
```

### Response
```json
{
  "status": "ok",
  "message": "서버가 정상적으로 실행 중입니다.",
  "timestamp": "2024-01-01T00:00:00.000000"
}
```

---

## 2. 사용자 관리

### 2.1 사용자 생성 또는 조회

이름으로 사용자를 생성하거나 기존 사용자를 조회합니다.

#### Request
```http
POST /api/users
Content-Type: application/json

{
  "name": "홍길동"
}
```

#### Response (새 사용자)
```json
{
  "success": true,
  "message": "새 사용자가 생성되었습니다.",
  "user": {
    "id": 1,
    "name": "홍길동",
    "created_at": "2024-01-01T00:00:00.000000",
    "recording_count": 0
  }
}
```

#### Response (기존 사용자)
```json
{
  "success": true,
  "message": "기존 사용자를 찾았습니다.",
  "user": {
    "id": 1,
    "name": "홍길동",
    "created_at": "2024-01-01T00:00:00.000000",
    "recording_count": 5
  }
}
```

### 2.2 모든 사용자 조회

#### Request
```http
GET /api/users
```

#### Response
```json
{
  "success": true,
  "users": [
    {
      "id": 1,
      "name": "홍길동",
      "created_at": "2024-01-01T00:00:00.000000",
      "recording_count": 5
    },
    {
      "id": 2,
      "name": "김철수",
      "created_at": "2024-01-02T00:00:00.000000",
      "recording_count": 3
    }
  ]
}
```

### 2.3 특정 사용자 조회

#### Request
```http
GET /api/users/{user_id}
```

#### Response
```json
{
  "success": true,
  "user": {
    "id": 1,
    "name": "홍길동",
    "created_at": "2024-01-01T00:00:00.000000",
    "recording_count": 5
  }
}
```

---

## 3. 녹음 관리

### 3.1 녹음 업로드 및 분석

음성 파일을 업로드하고 자동으로 STT, 키워드 추출, 감정 분석을 수행합니다.

#### Request
```http
POST /api/recordings
Content-Type: multipart/form-data

audio: [오디오 파일]
user_id: 1
highlight_time: "1:30" (선택)
```

#### 지원 형식
- wav
- mp3
- m4a
- ogg
- webm

#### 최대 파일 크기
50MB

#### Response
```json
{
  "success": true,
  "message": "녹음이 저장되었습니다.",
  "recording": {
    "id": 1,
    "user_id": 1,
    "user_name": "홍길동",
    "content": "오늘 정말 기분이 좋았어요. 친구들과 즐거운 시간을 보냈습니다.",
    "keywords": ["기분", "좋다", "친구", "즐겁다", "시간"],
    "audio_file": "uuid_filename.mp3",
    "audio_url": "/api/audio/uuid_filename.mp3",
    "recorded_at": "2024-01-01T12:30:00.000000",
    "emotion": "기쁨",
    "highlight_time": "1:30",
    "likes": 0,
    "created_at": "2024-01-01T12:30:00.000000",
    "updated_at": "2024-01-01T12:30:00.000000"
  }
}
```

#### 감정 종류
- 기쁨
- 화남
- 슬픔
- 당황
- 놀람
- 신남

### 3.2 녹음 목록 조회 (피드)

모든 사용자의 녹음을 최신순으로 조회합니다.

#### Request
```http
GET /api/recordings?user_id={user_id}&limit={limit}
```

#### Query Parameters
| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|---------|------|------|--------|------|
| user_id | integer | 선택 | - | 특정 사용자만 필터링 |
| limit | integer | 선택 | 50 | 가져올 개수 제한 |

#### Response
```json
{
  "success": true,
  "count": 10,
  "recordings": [
    {
      "id": 10,
      "user_id": 2,
      "user_name": "김철수",
      "content": "...",
      "keywords": ["..."],
      "audio_file": "...",
      "audio_url": "/api/audio/...",
      "recorded_at": "2024-01-03T10:00:00.000000",
      "emotion": "신남",
      "highlight_time": null,
      "likes": 5,
      "created_at": "2024-01-03T10:00:00.000000",
      "updated_at": "2024-01-03T10:00:00.000000"
    },
    // ... 더 많은 녹음들
  ]
}
```

### 3.3 특정 녹음 조회

#### Request
```http
GET /api/recordings/{recording_id}
```

#### Response
```json
{
  "success": true,
  "recording": {
    "id": 1,
    "user_id": 1,
    "user_name": "홍길동",
    "content": "...",
    "keywords": ["..."],
    "audio_file": "...",
    "audio_url": "/api/audio/...",
    "recorded_at": "2024-01-01T12:30:00.000000",
    "emotion": "기쁨",
    "highlight_time": "1:30",
    "likes": 3,
    "created_at": "2024-01-01T12:30:00.000000",
    "updated_at": "2024-01-01T12:30:00.000000"
  }
}
```

### 3.4 녹음 삭제

#### Request
```http
DELETE /api/recordings/{recording_id}
```

#### Response
```json
{
  "success": true,
  "message": "녹음이 삭제되었습니다."
}
```

### 3.5 좋아요 추가

#### Request
```http
POST /api/recordings/{recording_id}/like
```

#### Response
```json
{
  "success": true,
  "likes": 6
}
```

### 3.6 좋아요 취소

#### Request
```http
POST /api/recordings/{recording_id}/unlike
```

#### Response
```json
{
  "success": true,
  "likes": 5
}
```

---

## 4. 오디오 파일

### 4.1 오디오 파일 재생/다운로드

녹음된 오디오 파일을 재생하거나 다운로드합니다.

#### Request
```http
GET /api/audio/{filename}
```

#### Response
오디오 파일 스트림 (Content-Type에 따라 브라우저에서 자동 재생)

---

## 5. 통계

### 5.1 감정별 통계

#### Request
```http
GET /api/emotions/stats?user_id={user_id}
```

#### Query Parameters
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| user_id | integer | 선택 | 특정 사용자만 통계 |

#### Response
```json
{
  "success": true,
  "total": 20,
  "emotions": {
    "기쁨": 5,
    "화남": 2,
    "슬픔": 3,
    "당황": 4,
    "놀람": 3,
    "신남": 3
  }
}
```

---

## 오류 응답

### 400 Bad Request
```json
{
  "error": "오디오 파일이 없습니다."
}
```

### 404 Not Found
```json
{
  "error": "사용자를 찾을 수 없습니다."
}
```

### 500 Internal Server Error
```json
{
  "error": "처리 중 오류가 발생했습니다.",
  "message": "상세 오류 메시지"
}
```

---

## 프론트엔드 연동 예제

### React 예제

```javascript
// 사용자 생성
const createUser = async (name) => {
  const response = await fetch('http://localhost:5000/api/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name }),
  });
  return response.json();
};

// 녹음 업로드
const uploadRecording = async (audioBlob, userId, highlightTime) => {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.webm');
  formData.append('user_id', userId);
  if (highlightTime) {
    formData.append('highlight_time', highlightTime);
  }

  const response = await fetch('http://localhost:5000/api/recordings', {
    method: 'POST',
    body: formData,
  });
  return response.json();
};

// 피드 조회
const getFeed = async (limit = 50) => {
  const response = await fetch(
    `http://localhost:5000/api/recordings?limit=${limit}`
  );
  return response.json();
};

// 좋아요
const likeRecording = async (recordingId) => {
  const response = await fetch(
    `http://localhost:5000/api/recordings/${recordingId}/like`,
    { method: 'POST' }
  );
  return response.json();
};
```

---

## CORS 설정

백엔드는 모든 도메인에서의 요청을 허용합니다 (개발 편의).
프로덕션에서는 특정 도메인만 허용하도록 변경하세요.

```python
# app.py에서 수정
from flask_cors import CORS

# 특정 도메인만 허용
CORS(app, origins=["https://your-frontend-domain.com"])
```

