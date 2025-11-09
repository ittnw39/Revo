/**
 * RevoProject API 서비스
 * 백엔드 API와 통신하는 모든 함수들을 정의
 */

// API 기본 URL 설정
// @ts-ignore - 환경변수는 빌드 타임에 주입됨
const API_URL = typeof process !== 'undefined' && process.env?.REACT_APP_API_URL 
  ? process.env.REACT_APP_API_URL 
  : 'http://localhost:5000/api';

// ===== 타입 정의 =====

export interface User {
  id: number;
  name: string;
  created_at: string;
  recording_count: number;
}

export interface Recording {
  id: number;
  user_id: number;
  user_name: string;
  content: string;
  keywords: string[];
  audio_file: string;
  audio_url: string;
  recorded_at: string;
  emotion: string;
  highlight_time: string | null;
  likes: number;
  created_at: string;
  updated_at: string;
}

export interface EmotionStats {
  total: number;
  emotions: {
    [key: string]: number;
  };
}

// ===== 에러 처리 =====

class APIError extends Error {
  constructor(public message: string, public status: number) {
    super(message);
    this.name = 'APIError';
  }
}

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: '알 수 없는 오류가 발생했습니다.' }));
    const errorMessage = error.message || error.error || '오류가 발생했습니다.';
    console.error('API 오류:', errorMessage, error);
    throw new APIError(errorMessage, response.status);
  }
  return response.json();
};

// ===== 사용자 API =====

/**
 * 사용자 생성 또는 조회
 * @param name - 사용자 이름
 * @returns 사용자 정보 및 성공 여부
 */
export const createOrGetUser = async (name: string): Promise<{ success: boolean; message: string; user: User }> => {
  try {
    const response = await fetch(`${API_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    return handleResponse(response);
  } catch (error) {
    console.error('createOrGetUser error:', error);
    throw error;
  }
};

/**
 * 모든 사용자 조회
 */
export const getAllUsers = async (): Promise<{ success: boolean; users: User[] }> => {
  try {
    const response = await fetch(`${API_URL}/users`);
    return handleResponse(response);
  } catch (error) {
    console.error('getAllUsers error:', error);
    throw error;
  }
};

/**
 * 특정 사용자 조회
 * @param userId - 사용자 ID
 */
export const getUser = async (userId: number): Promise<{ success: boolean; user: User }> => {
  try {
    const response = await fetch(`${API_URL}/users/${userId}`);
    return handleResponse(response);
  } catch (error) {
    console.error('getUser error:', error);
    throw error;
  }
};

// ===== 녹음 API =====

/**
 * 녹음 업로드 및 분석
 * @param audioBlob - 오디오 Blob 객체
 * @param userId - 사용자 ID
 * @param transcript - 프론트엔드에서 인식한 텍스트 (선택, 있으면 우선 사용)
 * @param highlightTime - 하이라이트 구간 (선택)
 */
export const uploadRecording = async (
  audioBlob: Blob,
  userId: number,
  transcript?: string,
  highlightTime?: string
): Promise<{ success: boolean; message: string; recording: Recording }> => {
  try {
    const formData = new FormData();
    // @ts-ignore - React Native FormData 타입 문제
    formData.append('audio', audioBlob, 'recording.webm');
    formData.append('user_id', userId.toString());
    if (transcript) {
      formData.append('transcript', transcript);
    }
    if (highlightTime) {
      formData.append('highlight_time', highlightTime);
    }

    const response = await fetch(`${API_URL}/recordings`, {
      method: 'POST',
      body: formData,
    });
    return handleResponse(response);
  } catch (error) {
    console.error('uploadRecording error:', error);
    throw error;
  }
};

/**
 * 녹음 목록 조회 (피드)
 * @param options - 조회 옵션 (userId, limit)
 */
export const getRecordings = async (options?: {
  userId?: number;
  limit?: number;
}): Promise<{ success: boolean; count: number; recordings: Recording[] }> => {
  try {
    const params = new URLSearchParams();
    if (options?.userId) params.append('user_id', options.userId.toString());
    if (options?.limit) params.append('limit', options.limit.toString());

    const response = await fetch(`${API_URL}/recordings?${params}`);
    return handleResponse(response);
  } catch (error) {
    console.error('getRecordings error:', error);
    throw error;
  }
};

/**
 * 특정 녹음 조회
 * @param recordingId - 녹음 ID
 */
export const getRecording = async (recordingId: number): Promise<{ success: boolean; recording: Recording }> => {
  try {
    const response = await fetch(`${API_URL}/recordings/${recordingId}`);
    return handleResponse(response);
  } catch (error) {
    console.error('getRecording error:', error);
    throw error;
  }
};

/**
 * 녹음 삭제
 * @param recordingId - 녹음 ID
 */
export const deleteRecording = async (recordingId: number): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await fetch(`${API_URL}/recordings/${recordingId}`, {
      method: 'DELETE',
    });
    return handleResponse(response);
  } catch (error) {
    console.error('deleteRecording error:', error);
    throw error;
  }
};

/**
 * 좋아요 추가
 * @param recordingId - 녹음 ID
 */
export const likeRecording = async (recordingId: number): Promise<{ success: boolean; likes: number }> => {
  try {
    const response = await fetch(`${API_URL}/recordings/${recordingId}/like`, {
      method: 'POST',
    });
    return handleResponse(response);
  } catch (error) {
    console.error('likeRecording error:', error);
    throw error;
  }
};

/**
 * 좋아요 취소
 * @param recordingId - 녹음 ID
 */
export const unlikeRecording = async (recordingId: number): Promise<{ success: boolean; likes: number }> => {
  try {
    const response = await fetch(`${API_URL}/recordings/${recordingId}/unlike`, {
      method: 'POST',
    });
    return handleResponse(response);
  } catch (error) {
    console.error('unlikeRecording error:', error);
    throw error;
  }
};

/**
 * 녹음 정보 업데이트 (하이라이트 시간 등)
 * @param recordingId - 녹음 ID
 * @param highlightTime - 하이라이트 구간 (예: "1:30")
 */
export const updateRecording = async (
  recordingId: number,
  highlightTime?: string
): Promise<{ success: boolean; message: string; recording: Recording }> => {
  try {
    const body: any = {};
    if (highlightTime !== undefined) {
      body.highlight_time = highlightTime;
    }

    const response = await fetch(`${API_URL}/recordings/${recordingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return handleResponse(response);
  } catch (error) {
    console.error('updateRecording error:', error);
    throw error;
  }
};

// ===== 오디오 파일 =====

/**
 * 오디오 파일 URL 가져오기
 * @param filename - 파일명
 */
export const getAudioUrl = (filename: string): string => {
  return `${API_URL}/audio/${filename}`;
};

// ===== 통계 API =====

/**
 * 감정별 통계 조회
 * @param userId - 특정 사용자만 통계 (선택)
 */
export const getEmotionStats = async (userId?: number): Promise<{ success: boolean; stats: EmotionStats }> => {
  try {
    const params = userId ? `?user_id=${userId}` : '';
    const response = await fetch(`${API_URL}/emotions/stats${params}`);
    return handleResponse(response);
  } catch (error) {
    console.error('getEmotionStats error:', error);
    throw error;
  }
};

// ===== 헬스체크 =====

/**
 * 서버 상태 확인
 */
export const healthCheck = async (): Promise<{ status: string; message: string; timestamp: string }> => {
  try {
    const response = await fetch(`${API_URL}/health`);
    return handleResponse(response);
  } catch (error) {
    console.error('healthCheck error:', error);
    throw error;
  }
};

// ===== 로컬 스토리지 유틸리티 =====

/**
 * 사용자 정보를 로컬 스토리지에 저장
 */
export const saveUserToStorage = (user: User): void => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('userId', user.id.toString());
      window.localStorage.setItem('userName', user.name);
      window.localStorage.setItem('userCreatedAt', user.created_at);
    }
  } catch (error) {
    console.error('saveUserToStorage error:', error);
  }
};

/**
 * 로컬 스토리지에서 사용자 정보 가져오기
 */
export const getUserFromStorage = (): { id: number; name: string } | null => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const userId = window.localStorage.getItem('userId');
      const userName = window.localStorage.getItem('userName');
      
      if (userId && userName) {
        return {
          id: parseInt(userId, 10),
          name: userName,
        };
      }
    }
    return null;
  } catch (error) {
    console.error('getUserFromStorage error:', error);
    return null;
  }
};

/**
 * 로컬 스토리지에서 사용자 정보 삭제
 */
export const removeUserFromStorage = (): void => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem('userId');
      window.localStorage.removeItem('userName');
      window.localStorage.removeItem('userCreatedAt');
    }
  } catch (error) {
    console.error('removeUserFromStorage error:', error);
  }
};

// ===== Export all =====
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
  updateRecording,
  
  // 오디오
  getAudioUrl,
  
  // 통계
  getEmotionStats,
  
  // 유틸
  healthCheck,
  saveUserToStorage,
  getUserFromStorage,
  removeUserFromStorage,
};

