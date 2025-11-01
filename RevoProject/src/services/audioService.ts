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
  const SpeechRecognitionConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (!SpeechRecognitionConstructor) {
    onError(new Error('브라우저가 음성 인식을 지원하지 않습니다. Chrome 또는 Edge를 사용해주세요.'));
    return null;
  }

  const recognition = new SpeechRecognitionConstructor();
  recognition.lang = 'ko-KR'; // 한국어 설정
  recognition.continuous = true; // 연속 인식
  recognition.interimResults = true; // 중간 결과도 받기

  let finalTranscript = '';

  recognition.onresult = (event: SpeechRecognitionEvent) => {
    let interimTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const transcript = result[0].transcript;
      if (result.isFinal) {
        finalTranscript += transcript + ' ';
      } else {
        interimTranscript += transcript;
      }
    }

    // 최종 결과 전달
    if (finalTranscript.trim()) {
      onResult(finalTranscript.trim());
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
 */
export const startAudioRecording = async (): Promise<{
  mediaRecorder: MediaRecorder;
  chunks: Blob[];
  stream: MediaStream;
}> => {
  // 웹 환경 체크
  if (typeof window === 'undefined' || !navigator.mediaDevices) {
    throw new Error('웹 환경에서만 사용 가능합니다.');
  }

  const chunks: Blob[] = [];

  // 마이크 접근 요청
  const audioStream = await navigator.mediaDevices!.getUserMedia({ audio: true });

  // MediaRecorder 생성
  const MediaRecorderConstructor = (window as any).MediaRecorder;
  if (!MediaRecorderConstructor) {
    throw new Error('MediaRecorder를 지원하지 않는 브라우저입니다.');
  }
  
  const mediaRecorder = new MediaRecorderConstructor(audioStream, {
    mimeType: 'audio/webm;codecs=opus'
  });

  mediaRecorder.ondataavailable = (event: BlobEvent) => {
    if (event.data.size > 0) {
      chunks.push(event.data);
    }
  };

  // 녹음 시작
  mediaRecorder.start();

  return { mediaRecorder, chunks, stream: audioStream };
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

