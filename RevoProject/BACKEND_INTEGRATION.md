# 백엔드 연동 가이드

## 📋 개요

RevoProject 프론트엔드와 백엔드를 연결하는 방법을 설명합니다.

---

## 🔧 환경 설정

### 1. 환경변수 파일 생성

프로젝트 루트에 `.env` 파일을 생성하세요:

```env
# 백엔드 API URL
REACT_APP_API_URL=http://localhost:5000/api
```

### 2. 환경에 따른 설정

#### 로컬 개발
```env
REACT_APP_API_URL=http://localhost:5000/api
```

#### AWS EC2 배포 (프로덕션)
```env
REACT_APP_API_URL=http://your-ec2-ip:5000/api
```

또는 도메인 사용 시:
```env
REACT_APP_API_URL=https://api.your-domain.com/api
```

---

## 🚀 백엔드 서버 실행

프론트엔드를 실행하기 전에 백엔드 서버를 먼저 실행해야 합니다.

### PowerShell (Windows)
```powershell
# backend 폴더로 이동
cd ..\backend

# 가상환경 활성화
.\venv\Scripts\Activate.ps1

# 서버 실행
python app.py
```

### CMD (Windows)
```cmd
cd ..\backend
venv\Scripts\activate.bat
python app.py
```

서버가 정상적으로 실행되면 http://localhost:5000 에서 실행됩니다.

---

## 🎯 API 서비스 사용법

### 1. API 서비스 Import

```typescript
import { 
  createOrGetUser, 
  uploadRecording, 
  getRecordings,
  saveUserToStorage,
  getUserFromStorage 
} from '../services/api';
```

### 2. 사용자 생성/조회

```typescript
// 온보딩에서 사용자 이름 입력 후
const handleNameSubmit = async () => {
  try {
    const response = await createOrGetUser(name);
    
    if (response.success) {
      // 로컬 스토리지에 저장
      saveUserToStorage(response.user);
      
      // 기존 사용자 체크
      if (response.message.includes('기존')) {
        console.log('기존 사용자입니다');
        // 온보딩 건너뛰기
      } else {
        console.log('새 사용자입니다');
        // 온보딩 진행
      }
    }
  } catch (error) {
    console.error('오류:', error);
  }
};
```

### 3. 녹음 업로드

```typescript
// 녹음 완료 후
const handleUploadRecording = async (audioBlob: Blob, userId: number) => {
  try {
    const response = await uploadRecording(audioBlob, userId);
    
    if (response.success) {
      console.log('녹음 저장 완료:', response.recording);
      console.log('- 내용:', response.recording.content);
      console.log('- 키워드:', response.recording.keywords);
      console.log('- 감정:', response.recording.emotion);
    }
  } catch (error) {
    console.error('업로드 오류:', error);
  }
};
```

### 4. 피드 조회

```typescript
// 전체 피드 조회
const loadFeed = async () => {
  try {
    const response = await getRecordings({ limit: 50 });
    
    if (response.success) {
      console.log('녹음 수:', response.count);
      console.log('녹음 목록:', response.recordings);
    }
  } catch (error) {
    console.error('조회 오류:', error);
  }
};

// 특정 사용자만 조회
const loadUserRecordings = async (userId: number) => {
  try {
    const response = await getRecordings({ userId, limit: 50 });
    
    if (response.success) {
      console.log('내 녹음:', response.recordings);
    }
  } catch (error) {
    console.error('조회 오류:', error);
  }
};
```

### 5. 오디오 재생

```typescript
import { getAudioUrl } from '../services/api';

// 오디오 URL 가져오기
const audioUrl = getAudioUrl(recording.audio_file);

// React Native에서 재생
<Audio.Sound source={{ uri: audioUrl }} />

// 웹에서 재생
<audio src={audioUrl} controls />
```

---

## 📱 온보딩 화면 연동

`OnBoardingScreen2.tsx`가 이미 백엔드와 연동되어 있습니다:

### 동작 방식

1. **이름 입력**
   - 사용자가 이름을 입력하고 "다음" 버튼 클릭
   - `createOrGetUser(name)` API 호출

2. **기존 사용자 체크**
   - 기존 사용자면 → 7단계(완료 화면)로 바로 이동
   - 새 사용자면 → 2단계부터 순서대로 진행

3. **로컬 스토리지 저장**
   - 사용자 정보를 자동으로 localStorage에 저장
   - 앱 재시작 시에도 사용자 정보 유지

### 코드 흐름

```typescript
// 1. 사용자 이름 입력
const [name, setName] = useState('');

// 2. 다음 버튼 클릭 시
const handleNameSubmit = async () => {
  // 백엔드 API 호출
  const response = await createOrGetUser(name);
  
  // 로컬 스토리지에 저장
  saveUserToStorage(response.user);
  
  // 기존 사용자 체크
  if (response.message.includes('기존')) {
    setCurrentStep(7); // 마지막 단계로 이동
  } else {
    setCurrentStep(2); // 다음 단계로 진행
  }
};
```

---

## 🔍 디버깅

### API 연결 확인

브라우저 콘솔에서 확인:

```javascript
// API 서버 헬스체크
fetch('http://localhost:5000/api/health')
  .then(res => res.json())
  .then(data => console.log('백엔드 상태:', data));
```

### 네트워크 오류

CORS 오류가 발생하면:
1. 백엔드 서버가 실행 중인지 확인
2. 백엔드의 `app.py`에서 CORS 설정 확인:
   ```python
   CORS(app)  # 모든 도메인 허용
   ```

### 로컬 스토리지 확인

브라우저 개발자 도구 → Application → Local Storage에서 확인:
- `userId`: 사용자 ID
- `userName`: 사용자 이름

---

## 📊 데이터 구조

### User (사용자)
```typescript
{
  id: number;
  name: string;
  created_at: string;
  recording_count: number;
}
```

### Recording (녹음)
```typescript
{
  id: number;
  user_id: number;
  user_name: string;
  content: string;                // STT 텍스트
  keywords: string[];             // 키워드 배열
  audio_file: string;             // 파일명
  audio_url: string;              // 재생 URL
  recorded_at: string;            // 녹음 일시
  emotion: string;                // 감정 (6가지)
  highlight_time: string | null;  // 하이라이트
  likes: number;                  // 좋아요 수
  created_at: string;
  updated_at: string;
}
```

### Emotion (감정 종류)
- 기쁨
- 화남
- 슬픔
- 당황
- 놀람
- 신남

---

## ✅ 체크리스트

백엔드 연동 전에 확인하세요:

- [ ] 백엔드 서버 실행 중 (http://localhost:5000)
- [ ] `.env` 파일 생성 및 `REACT_APP_API_URL` 설정
- [ ] `src/services/api.ts` 파일 존재
- [ ] 프론트엔드 실행 시 API 호출 성공

---

## 🚨 문제 해결

### 1. API 호출 실패

**증상**: `Failed to fetch` 오류

**해결**:
1. 백엔드 서버가 실행 중인지 확인
2. API URL이 올바른지 확인 (.env 파일)
3. CORS 설정 확인

### 2. 사용자 정보 저장 안됨

**증상**: 새로고침 시 사용자 정보 사라짐

**해결**:
1. `saveUserToStorage()` 호출 확인
2. localStorage 사용 가능 여부 확인 (브라우저)

### 3. 녹음 업로드 실패

**증상**: 업로드 중 오류 발생

**해결**:
1. 파일 크기 확인 (최대 50MB)
2. 파일 형식 확인 (webm, mp3, wav 등)
3. 네트워크 연결 확인

---

## 📚 추가 자료

- [백엔드 API 문서](../backend/API_DOCUMENTATION.md)
- [백엔드 배포 가이드](../backend/DEPLOYMENT_GUIDE.md)
- [백엔드 빠른 시작](../backend/QUICK_START.md)

---

## 🎉 완료!

이제 프론트엔드와 백엔드가 연결되었습니다!

온보딩 화면에서 이름을 입력하면 자동으로 백엔드와 통신하여 사용자를 생성하고 관리합니다.

