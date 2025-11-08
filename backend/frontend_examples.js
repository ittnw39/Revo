/**
 * 프론트엔드 연동 예제 코드 (React/Next.js)
 * 
 * 사용법:
 * 1. 이 파일을 프론트엔드 프로젝트의 lib/ 또는 utils/ 폴더에 복사
 * 2. API_URL을 환경변수로 설정
 * 3. 필요한 함수를 import하여 사용
 */

// ===== 설정 =====
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// ===== 에러 핸들링 =====
class APIError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

const handleResponse = async (response) => {
  if (!response.ok) {
    const error = await response.json();
    throw new APIError(error.error || '오류가 발생했습니다.', response.status);
  }
  return response.json();
};

// ===== 사용자 API =====

/**
 * 사용자 생성 또는 조회
 * @param {string} name - 사용자 이름
 * @returns {Promise<{success: boolean, user: Object}>}
 */
export const createOrGetUser = async (name) => {
  const response = await fetch(`${API_URL}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  return handleResponse(response);
};

/**
 * 모든 사용자 조회
 * @returns {Promise<{success: boolean, users: Array}>}
 */
export const getAllUsers = async () => {
  const response = await fetch(`${API_URL}/users`);
  return handleResponse(response);
};

/**
 * 특정 사용자 조회
 * @param {number} userId - 사용자 ID
 * @returns {Promise<{success: boolean, user: Object}>}
 */
export const getUser = async (userId) => {
  const response = await fetch(`${API_URL}/users/${userId}`);
  return handleResponse(response);
};

// ===== 녹음 API =====

/**
 * 녹음 업로드 및 분석
 * @param {Blob} audioBlob - 오디오 Blob 객체
 * @param {number} userId - 사용자 ID
 * @param {string} highlightTime - 하이라이트 구간 (선택, 예: "1:30")
 * @returns {Promise<{success: boolean, recording: Object}>}
 */
export const uploadRecording = async (audioBlob, userId, highlightTime = null) => {
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
  return handleResponse(response);
};

/**
 * 녹음 목록 조회 (피드)
 * @param {Object} options - 옵션
 * @param {number} options.userId - 특정 사용자만 필터링 (선택)
 * @param {number} options.limit - 개수 제한 (기본: 50)
 * @returns {Promise<{success: boolean, count: number, recordings: Array}>}
 */
export const getRecordings = async ({ userId = null, limit = 50 } = {}) => {
  const params = new URLSearchParams();
  if (userId) params.append('user_id', userId);
  params.append('limit', limit);

  const response = await fetch(`${API_URL}/recordings?${params}`);
  return handleResponse(response);
};

/**
 * 특정 녹음 조회
 * @param {number} recordingId - 녹음 ID
 * @returns {Promise<{success: boolean, recording: Object}>}
 */
export const getRecording = async (recordingId) => {
  const response = await fetch(`${API_URL}/recordings/${recordingId}`);
  return handleResponse(response);
};

/**
 * 녹음 삭제
 * @param {number} recordingId - 녹음 ID
 * @returns {Promise<{success: boolean, message: string}>}
 */
export const deleteRecording = async (recordingId) => {
  const response = await fetch(`${API_URL}/recordings/${recordingId}`, {
    method: 'DELETE',
  });
  return handleResponse(response);
};

/**
 * 좋아요 추가
 * @param {number} recordingId - 녹음 ID
 * @returns {Promise<{success: boolean, likes: number}>}
 */
export const likeRecording = async (recordingId) => {
  const response = await fetch(`${API_URL}/recordings/${recordingId}/like`, {
    method: 'POST',
  });
  return handleResponse(response);
};

/**
 * 좋아요 취소
 * @param {number} recordingId - 녹음 ID
 * @returns {Promise<{success: boolean, likes: number}>}
 */
export const unlikeRecording = async (recordingId) => {
  const response = await fetch(`${API_URL}/recordings/${recordingId}/unlike`, {
    method: 'POST',
  });
  return handleResponse(response);
};

// ===== 오디오 파일 =====

/**
 * 오디오 파일 URL 가져오기
 * @param {string} filename - 파일명
 * @returns {string} 오디오 파일 URL
 */
export const getAudioUrl = (filename) => {
  return `${API_URL}/audio/${filename}`;
};

// ===== 통계 API =====

/**
 * 감정별 통계 조회
 * @param {number} userId - 특정 사용자만 통계 (선택)
 * @returns {Promise<{success: boolean, total: number, emotions: Object}>}
 */
export const getEmotionStats = async (userId = null) => {
  const params = userId ? `?user_id=${userId}` : '';
  const response = await fetch(`${API_URL}/emotions/stats${params}`);
  return handleResponse(response);
};

// ===== 헬스체크 =====

/**
 * 서버 상태 확인
 * @returns {Promise<{status: string, message: string, timestamp: string}>}
 */
export const healthCheck = async () => {
  const response = await fetch(`${API_URL}/health`);
  return handleResponse(response);
};

// ===== 음성 녹음 유틸리티 =====

/**
 * 브라우저에서 음성 녹음
 * @returns {Object} 녹음 제어 객체
 */
export const createRecorder = () => {
  let mediaRecorder = null;
  let audioChunks = [];

  return {
    /**
     * 녹음 시작
     */
    start: async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = (event) => {
          audioChunks.push(event.data);
        };

        mediaRecorder.start();
        console.log('녹음 시작');
      } catch (error) {
        console.error('녹음 시작 실패:', error);
        throw error;
      }
    },

    /**
     * 녹음 중지
     * @returns {Promise<Blob>} 녹음된 오디오 Blob
     */
    stop: () => {
      return new Promise((resolve) => {
        if (!mediaRecorder) {
          resolve(null);
          return;
        }

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
          console.log('녹음 완료:', audioBlob.size, 'bytes');
          
          // 스트림 정리
          mediaRecorder.stream.getTracks().forEach(track => track.stop());
          
          resolve(audioBlob);
        };

        mediaRecorder.stop();
      });
    },

    /**
     * 녹음 상태 확인
     */
    get state() {
      return mediaRecorder ? mediaRecorder.state : 'inactive';
    }
  };
};

// ===== React Hook 예제 =====

/**
 * 사용자 관리 커스텀 훅 예제
 * 
 * 사용법:
 * const { user, loading, error, loginUser } = useUser();
 */
export const useUserExample = () => {
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  const loginUser = async (name) => {
    setLoading(true);
    setError(null);
    try {
      const result = await createOrGetUser(name);
      setUser(result.user);
      // localStorage에 저장
      localStorage.setItem('userId', result.user.id);
      localStorage.setItem('userName', result.user.name);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const logoutUser = () => {
    setUser(null);
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
  };

  // 초기 로드 시 localStorage에서 복구
  React.useEffect(() => {
    const userId = localStorage.getItem('userId');
    const userName = localStorage.getItem('userName');
    if (userId && userName) {
      setUser({ id: parseInt(userId), name: userName });
    }
  }, []);

  return { user, loading, error, loginUser, logoutUser };
};

/**
 * 녹음 목록 관리 커스텀 훅 예제
 * 
 * 사용법:
 * const { recordings, loading, error, refresh } = useRecordings();
 */
export const useRecordingsExample = (userId = null, limit = 50) => {
  const [recordings, setRecordings] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  const fetchRecordings = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getRecordings({ userId, limit });
      setRecordings(result.recordings);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchRecordings();
  }, [userId, limit]);

  return { recordings, loading, error, refresh: fetchRecordings };
};

// ===== 전체 워크플로우 예제 =====

/**
 * 완전한 녹음 프로세스 예제
 */
export const recordingWorkflowExample = async () => {
  try {
    // 1. 사용자 생성/조회
    const { user } = await createOrGetUser('홍길동');
    console.log('사용자:', user);

    // 2. 녹음 시작
    const recorder = createRecorder();
    await recorder.start();
    
    console.log('3초 동안 녹음 중...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 3. 녹음 중지
    const audioBlob = await recorder.stop();

    // 4. 업로드 및 분석
    console.log('업로드 및 분석 중...');
    const { recording } = await uploadRecording(audioBlob, user.id, '0:02');
    
    console.log('녹음 완료:', recording);
    console.log('- 내용:', recording.content);
    console.log('- 키워드:', recording.keywords);
    console.log('- 감정:', recording.emotion);

    // 5. 피드 조회
    const { recordings } = await getRecordings({ limit: 10 });
    console.log('최근 녹음 10개:', recordings);

    return recording;
  } catch (error) {
    console.error('워크플로우 오류:', error);
    throw error;
  }
};

// ===== Export =====
export default {
  // 사용자
  createOrGetUser,
  getAllUsers,
  getUser,
  
  // 녹음
  uploadRecording,
  getRecordings,
  getRecording,
  deleteRecording,
  likeRecording,
  unlikeRecording,
  
  // 오디오
  getAudioUrl,
  
  // 통계
  getEmotionStats,
  
  // 유틸
  healthCheck,
  createRecorder,
  
  // 예제
  recordingWorkflowExample,
};

