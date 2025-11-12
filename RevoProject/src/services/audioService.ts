/**
 * 오디오 녹음 및 STT 처리 서비스 (브라우저 내장 Web Speech API 사용)
 * 백엔드 서버 없이 클라이언트에서 직접 처리
 */

// 웹 환경 타입 선언
declare const window: Window;
declare const navigator: Navigator;

export interface AudioProcessResult {
  success: boolean;
  transcript: string;
  keywords: string[];
  duration: number;
  timestamp: string;
}

export interface RecordingState {
  isRecording: boolean;
  isProcessing: boolean;
  duration: number;
  audioBlob: Blob | null;
}

/**
 * iOS Safari 감지
 */
const isIOS = (): boolean => {
  if (typeof window === 'undefined') return false;
  const nav = navigator as any;
  return /iPad|iPhone|iPod/.test(nav.userAgent || '') ||
    (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1);
};

/**
 * 지원되는 MIME 타입 확인
 */
const getSupportedMimeType = (): string | null => {
  if (typeof window === 'undefined' || !(window as any).MediaRecorder) {
    return null;
  }

  const MediaRecorder = (window as any).MediaRecorder;
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/aac',
    'audio/ogg;codecs=opus',
    'audio/ogg',
    'audio/wav',
  ];

  for (const type of types) {
    if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(type)) {
      console.log('지원되는 MIME 타입:', type);
      return type;
    }
  }

  // iOS Safari는 기본적으로 지원하지만 isTypeSupported가 false를 반환할 수 있음
  if (isIOS()) {
    return 'audio/mp4'; // iOS 기본 지원
  }

  return 'audio/webm'; // 기본값
};

/**
 * 텍스트에서 키워드 추출
 */
const extractKeywords = (text: string, topicKeywords?: string[]): string[] => {
  // 한국어 불용어 제거
  const stopWords = new Set([
    '이', '가', '을', '를', '은', '는', '의', '와', '과', '도', '로', '으로',
    '에서', '에게', '께', '한', '한다', '하다', '되는', '되다', '있다', '없다',
    '그', '그것', '이것', '저것', '그런', '이런', '저런', '그렇게', '이렇게',
    '잘', '좀', '더', '매우', '너무', '정말', '진짜', '그냥', '아주', '그리고',
    '하지만', '그러나', '또한', '또', '그래서', '그러므로', '때문에', '하므로'
  ]);

  // 문장 부호 제거 및 단어 추출
  const words = text
    .replace(/[^\w\s가-힣]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length >= 2 && /[가-힣]/.test(word))
    .filter(word => !stopWords.has(word));

  // 주제 키워드 필터링
  let filteredWords = words;
  if (topicKeywords && topicKeywords.length > 0) {
    const topicSet = new Set(topicKeywords);
    filteredWords = words.filter(word => topicSet.has(word));
  }

  // 빈도수 계산
  const wordCounts = new Map<string, number>();
  filteredWords.forEach(word => {
    wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
  });

  // 빈도수 순으로 정렬 (상위 10개)
  const sortedWords = Array.from(wordCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);

  return sortedWords;
};

/**
 * Web Speech API를 사용한 실시간 음성 인식
 */
export const startSpeechRecognition = (
  onResult: (transcript: string) => void,
  onError: (error: Error) => void
): SpeechRecognition | null => {
  // 웹 환경 체크
  if (typeof window === 'undefined') {
    onError(new Error('웹 환경에서만 사용 가능합니다.'));
    return null;
  }

  // 브라우저 호환성 확인
  const SpeechRecognitionConstructor = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
  
  if (!SpeechRecognitionConstructor) {
    onError(new Error('브라우저가 음성 인식을 지원하지 않습니다. Chrome 또는 Edge를 사용해주세요.'));
    return null;
  }

  // HTTPS 또는 localhost 체크
  const location = (window as any).location;
  const isSecureContext = location?.protocol === 'https:' || 
                          location?.hostname === 'localhost' || 
                          location?.hostname === '127.0.0.1';
  
  if (!isSecureContext) {
    onError(new Error('음성 인식은 HTTPS 또는 localhost에서만 작동합니다.'));
    return null;
  }

  const recognition = new SpeechRecognitionConstructor();
  recognition.lang = 'ko-KR'; // 한국어 설정
  recognition.continuous = true; // 연속 인식
  recognition.interimResults = true; // 중간 결과도 받기

  let finalTranscript = '';

  recognition.onresult = (event: SpeechRecognitionEvent) => {
    let interimTranscript = '';
    let newFinalText = '';

    // 새로운 결과만 처리 (event.resultIndex부터)
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const transcript = result[0].transcript;
      
      if (result.isFinal) {
        // 최종 결과는 finalTranscript에 누적
        newFinalText += transcript + ' ';
      } else {
        // 중간 결과는 현재 임시 결과로 표시
        interimTranscript += transcript;
      }
    }

    // 새로운 최종 결과가 있으면 누적
    if (newFinalText) {
      finalTranscript += newFinalText;
    }

    // 실시간으로 최종 + 중간 결과 합쳐서 전달
    const fullTranscript = (finalTranscript + interimTranscript).trim();
    if (fullTranscript) {
      onResult(fullTranscript);
    }
  };

  recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
    onError(new Error(`음성 인식 오류: ${event.error}`));
  };

  recognition.onend = () => {
    // 인식 종료 시 최종 결과 전달
    if (finalTranscript.trim()) {
      onResult(finalTranscript.trim());
    }
  };

  recognition.start();
  return recognition;
};

/**
 * MediaRecorder를 사용한 오디오 녹음 (Promise 기반)
 * iOS Safari 호환성 개선
 */
export const startAudioRecording = async (): Promise<{
  mediaRecorder: MediaRecorder;
  chunks: Blob[];
  stream: MediaStream;
  mimeType: string;
}> => {
  // 웹 환경 체크
  if (typeof window === 'undefined' || !navigator.mediaDevices) {
    throw new Error('웹 환경에서만 사용 가능합니다.');
  }

  const chunks: Blob[] = [];

  // 마이크 접근 요청 (iOS에서는 사용자 제스처 내에서만 작동)
  let audioStream: MediaStream;
  try {
    audioStream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      } 
    });
  } catch (error: any) {
    console.error('getUserMedia 오류:', error);
    throw new Error(`마이크 접근에 실패했습니다: ${error.message || error.name}`);
  }

  // MediaRecorder 생성
  const MediaRecorderConstructor = (window as any).MediaRecorder;
  if (!MediaRecorderConstructor) {
    throw new Error('MediaRecorder를 지원하지 않는 브라우저입니다.');
  }

  // 지원되는 MIME 타입 확인
  const mimeType = getSupportedMimeType();
  if (!mimeType) {
    throw new Error('지원되는 오디오 형식을 찾을 수 없습니다.');
  }

  console.log('사용할 MIME 타입:', mimeType);
  console.log('iOS 여부:', isIOS());

  // MediaRecorder 옵션
  const options: any = {};
  
  // iOS Safari 호환성을 위한 설정
  if (isIOS()) {
    // iOS는 특정 옵션만 지원
    options.mimeType = mimeType;
  } else {
    options.mimeType = mimeType;
    // timeslice를 설정하여 주기적으로 데이터 수집 (안정성 향상)
    options.audioBitsPerSecond = 128000;
  }

  let mediaRecorder: MediaRecorder;
  try {
    mediaRecorder = new MediaRecorderConstructor(audioStream, options);
  } catch (error: any) {
    console.error('MediaRecorder 생성 오류:', error);
    // 옵션 없이 재시도
    try {
      mediaRecorder = new MediaRecorderConstructor(audioStream);
      console.log('기본 옵션으로 MediaRecorder 생성 성공');
    } catch (retryError: any) {
      console.error('MediaRecorder 생성 재시도 실패:', retryError);
      audioStream.getTracks().forEach(track => track.stop());
      throw new Error(`MediaRecorder 생성 실패: ${retryError.message || retryError.name}`);
    }
  }

  // 상태 확인
  console.log('MediaRecorder 상태:', mediaRecorder.state);
  console.log('MediaRecorder MIME 타입:', (mediaRecorder as any).mimeType || '기본값');

  mediaRecorder.ondataavailable = (event: BlobEvent) => {
    if (event.data && event.data.size > 0) {
      console.log('오디오 데이터 수집:', event.data.size, 'bytes, 타입:', event.data.type);
      chunks.push(event.data);
    }
  };

  // iOS에서는 onerror, onstart가 없을 수 있음
  try {
    (mediaRecorder as any).onerror = (event: any) => {
      console.error('MediaRecorder 오류:', event.error || event);
    };
    (mediaRecorder as any).onstart = () => {
      console.log('MediaRecorder 녹음 시작됨');
    };
    (mediaRecorder as any).onstop = () => {
      console.log('MediaRecorder 녹음 중지됨, 총 청크 수:', chunks.length);
    };
  } catch (e) {
    // iOS에서 지원하지 않을 수 있음
    console.log('MediaRecorder 이벤트 핸들러 설정 실패 (무시 가능):', e);
  }

  // 녹음 시작 (iOS에서는 timeslice를 사용하지 않음)
  try {
    if (isIOS()) {
      // iOS는 timeslice 없이 시작
      mediaRecorder.start();
    } else {
      // 다른 브라우저는 1초마다 데이터 수집
      mediaRecorder.start(1000);
    }
    console.log('녹음 시작 명령 완료, 상태:', mediaRecorder.state);
  } catch (error: any) {
    console.error('녹음 시작 오류:', error);
    audioStream.getTracks().forEach(track => track.stop());
    throw new Error(`녹음 시작 실패: ${error.message || error.name}`);
  }

  return { mediaRecorder, chunks, stream: audioStream, mimeType };
};

/**
 * 녹음 중지 및 처리
 * 실시간 인식에서 받은 transcript를 사용하여 키워드 추출
 */
export const processRecordingResult = (
  transcript: string,
  startTime: number
): AudioProcessResult => {
  const duration = (Date.now() - startTime) / 1000;
  const keywords = extractKeywords(transcript);

  return {
    success: true,
    transcript,
    keywords,
    duration,
    timestamp: new Date().toISOString(),
  };
};
