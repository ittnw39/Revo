import React, { FC, useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  Platform,
  Modal,
  ScrollView,
  Alert,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';

import { useApp } from '../../contexts/AppContext';
import NavigationBar from '../../components/NavigationBar';
import Header from '../../components/Header';
import HappyCharacter from '../../components/characters/HappyCharacter';
import {
  startSpeechRecognition,
  startAudioRecording,
  processRecordingResult,
  AudioProcessResult,
} from '../../services/audioService';
import {
  uploadRecording,
  updateRecording,
  getUserFromStorage,
  Recording,
} from '../../services/api';
import Svg, { Path } from 'react-native-svg';

// 웹 환경 전용 타입 선언
declare const window: Window;
declare const navigator: Navigator & {
  geolocation?: {
    getCurrentPosition: (
      success: (position: { coords: { latitude: number; longitude: number } }) => void,
      error: (error: any) => void,
      options?: { timeout?: number; enableHighAccuracy?: boolean }
    ) => void;
  };
};

// iPhone 15, 15 Pro 크기 기준
const screenWidth = 390;
const screenHeight = 844;
const TOUCH_AREA_HEIGHT = 44; // 터치 가능한 영역
const TIMELINE_WIDTH = 393; // 하이라이트 타임라인 너비 (하이라이트 수정 화면과 동일)
const TIMELINE_HEIGHT = 5; // 하이라이트 타임라인 높이
const MARKER_SIZE = 38; // 하이라이트 마커 크기

type RecordingScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Recording'>;

const RecordingScreen: FC = () => {
  const navigation = useNavigation<RecordingScreenNavigationProp>();
  // 눈 애니메이션 상태 (1초마다 변경)
  const [eyeAnimationState, setEyeAnimationState] = useState<number>(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setEyeAnimationState(prev => (prev === 0 ? 1 : 0));
    }, 1000); // 1초마다 변경
    
    return () => clearInterval(interval);
  }, []);

  // 웨이브 애니메이션을 위한 offset 값
  const [waveOffset, setWaveOffset] = useState<number>(0);
  const { isOnboardingCompleted, refreshArchiveDuration } = useApp();

  // 녹음 상태
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [result, setResult] = useState<AudioProcessResult | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  
  // 백엔드에서 받은 녹음 데이터
  const [recordingData, setRecordingData] = useState<Recording | null>(null);
  
  // 위치 정보
  const [currentDistrict, setCurrentDistrict] = useState<string | null>(null);
  
  // 화면 상태
  const [showKeywords, setShowKeywords] = useState(false);
  const [showHighlight, setShowHighlight] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [highlightTime, setHighlightTime] = useState<string>('');
  
  // 하이라이트 드래그 관련
  const [highlightTimeSeconds, setHighlightTimeSeconds] = useState<number>(0); // 하이라이트 시간 (초)
  const [showHighlightMarker, setShowHighlightMarker] = useState(false); // 하이라이트 마커 표시 여부
  const [highlightTimeInput, setHighlightTimeInput] = useState<string>(''); // 시간 입력 (MM:SS 형식)
  const highlightBarRef = useRef<View | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const [isDragging, setIsDragging] = useState(false);

  // 참조
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mimeTypeRef = useRef<string>('audio/webm'); // 기본값
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transcriptRef = useRef<string>('');
  // 오디오 분석 ref 제거 (웨이브는 CSS 애니메이션 사용)
  
  // GPS 위치 가져오기 및 동(구) 추출
  const getCurrentLocation = async (): Promise<string | null> => {
    return new Promise((resolve) => {
      if (Platform.OS === 'web') {
        if (!navigator.geolocation) {
          console.warn('Geolocation을 지원하지 않습니다.');
          resolve(null);
          return;
        }
        
        navigator.geolocation.getCurrentPosition(
          async (position: { coords: { latitude: number; longitude: number } }) => {
            try {
              const { latitude, longitude } = position.coords;
              console.log('위치 정보:', latitude, longitude);
              
              // OpenStreetMap Nominatim API를 사용한 역지오코딩 (무료)
              try {
                const response = await fetch(
                  `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1&accept-language=ko`,
                  {
                    headers: {
                      'User-Agent': 'RevoProject/1.0'
                    }
                  }
                );
                
                if (response.ok) {
                  const data = await response.json();
                  const address = data.address;
                  
                  if (address) {
                    // 한국 주소 형식: 동 또는 구 추출
                    // address.quarter (동) 또는 address.city_district (구) 또는 address.suburb (구)
                    const district = address.quarter || address.city_district || address.suburb || address.neighbourhood || null;
                    
                    if (district) {
                      // "성북동" 또는 "강남구" 형식으로 반환
                      resolve(district);
                      return;
                    }
                  }
                }
              } catch (error) {
                console.error('역지오코딩 API 오류:', error);
              }
              
              // 실패한 경우 null 반환
              resolve(null);
            } catch (error) {
              console.error('위치 정보 가져오기 오류:', error);
              resolve(null);
            }
          },
          (error: any) => {
            console.error('GPS 오류:', error);
            resolve(null);
          },
          { timeout: 10000, enableHighAccuracy: true }
        );
      } else {
        // React Native 환경에서는 react-native-geolocation-service 등 사용 필요
        resolve(null);
      }
    });
  };

  // 온보딩 완료 상태 확인
  useEffect(() => {
    if (!isOnboardingCompleted) {
      navigation.navigate('OnBoarding');
    }
  }, [isOnboardingCompleted, navigation]);
  
  // 녹음 시작 시 위치 정보 가져오기
  useEffect(() => {
    if (isRecording) {
      getCurrentLocation().then((district) => {
        setCurrentDistrict(district);
      });
    }
  }, [isRecording]);

  // 새로고침 시 화면 상태 복원
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      try {
        const savedState = window.localStorage.getItem('recordingScreenState');
        const savedRecordingData = window.localStorage.getItem('recordingData');
        
        if (savedState) {
          const state = JSON.parse(savedState);
          setShowKeywords(state.showKeywords || false);
          setShowHighlight(state.showHighlight || false);
          setShowSaved(state.showSaved || false);
          setHighlightTime(state.highlightTime || '');
        }
        
        if (savedRecordingData) {
          const data = JSON.parse(savedRecordingData);
          setRecordingData(data);
        }
      } catch (error) {
        console.error('상태 복원 오류:', error);
      }
    }
  }, []);

  // 화면 상태 변경 시 localStorage에 저장
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      try {
        const state = {
          showKeywords,
          showHighlight,
          showSaved,
          highlightTime,
        };
        window.localStorage.setItem('recordingScreenState', JSON.stringify(state));
      } catch (error) {
        console.error('상태 저장 오류:', error);
      }
    }
  }, [showKeywords, showHighlight, showSaved, highlightTime]);

  // recordingData 변경 시 localStorage에 저장
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage && recordingData) {
      try {
        window.localStorage.setItem('recordingData', JSON.stringify(recordingData));
      } catch (error) {
        console.error('녹음 데이터 저장 오류:', error);
      }
    }
  }, [recordingData]);

  // 웹 전용 CSS 애니메이션 인젝션
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const doc = (window as any).document as Document | undefined;
      if (doc && !doc.getElementById('wave-animation-style')) {
        const style = doc.createElement('style') as HTMLElement;
        style.id = 'wave-animation-style';
        style.textContent = `
          @keyframes waveSlide {
            0% {
              transform: translateX(0);
            }
            100% {
              transform: translateX(-6291px);
            }
          }
          @keyframes waveSlideSecond {
            0% {
              transform: translateX(0);
            }
            100% {
              transform: translateX(-6291px);
            }
          }
          .wave-animated-line {
            animation: waveSlide 20s linear infinite;
            will-change: transform;
          }
        `;
        doc.head.appendChild(style);
      }
    }
  }, []);

  // 웨이브 애니메이션 시작
  useEffect(() => {
    if (isRecording) {
      const interval = setInterval(() => {
        setWaveOffset(prev => (prev + 4) % 240); // 0~239 사이클, 4배 빠르게 (속도 2배)
      }, 33); // 약 30fps (1000/30 ≈ 33ms)
      return () => clearInterval(interval);
    } else {
      setWaveOffset(0); // 녹음 중지 시 초기화
    }
  }, [isRecording]);

  // 웨이브 경로 생성 함수 (물결 높이 10px, 폭 120px - 네배)
  const createWavePath = (y: number, offset: number = 0): string => {
    const width = 393;
    const amplitude = 10; // 물결 높이
    const wavelength = 120; // 물결 하나의 폭 (네배)
    const points: string[] = [];
    
    for (let x = 0; x <= width; x += 2) {
      const waveX = (x + offset) % (wavelength * 2);
      const normalizedX = (waveX / (wavelength * 2)) * Math.PI * 2;
      const waveY = y + Math.sin(normalizedX) * amplitude;
      points.push(`${x},${waveY}`);
    }
    
    return `M ${points.join(' L ')}`;
  };


  // 날짜 표시
  const getCurrentDate = () => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    return `${month}월 ${day}일`;
  };

  // 녹음 시작
  const handleStartRecording = async () => {
    // 웹 환경 체크
    if (Platform.OS !== 'web') {
      Alert.alert('알림', '웹 환경에서만 녹음이 가능합니다.');
      return;
    }

    // 브라우저 호환성 체크
    if (typeof window === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      Alert.alert('알림', '이 브라우저는 녹음 기능을 지원하지 않습니다. Chrome 또는 Edge를 사용해주세요.');
      return;
    }

    try {
      // 초기화
      transcriptRef.current = '';
      chunksRef.current = [];
      setTranscript('');
      setResult(null);
      startTimeRef.current = Date.now();
      setRecordingTime(0);

      // 실시간 음성 인식 시작
      const recognition = startSpeechRecognition(
        (text) => {
          transcriptRef.current = text;
          setTranscript(text);
        },
        (error) => {
          console.error('음성 인식 오류:', error);
          Alert.alert('오류', error.message);
          handleStopRecording();
        }
      );

      if (!recognition) {
        return;
      }

      recognitionRef.current = recognition;

      // 오디오 녹음 시작 (비동기)
      try {
        const { mediaRecorder, chunks, stream, mimeType } = await startAudioRecording();
        
        mediaRecorderRef.current = mediaRecorder;
        streamRef.current = stream;
        chunksRef.current = chunks;
        mimeTypeRef.current = mimeType; // MIME 타입 저장

        // 녹음 상태 업데이트
        console.log('녹음 시작 - 상태 업데이트 전:', isRecording);
        setIsRecording(true);
        console.log('녹음 시작 - 상태 업데이트 후 (즉시 확인 불가, 리렌더링 필요)');

        // 타이머 시작
        timerRef.current = setInterval(() => {
          setRecordingTime((prev) => prev + 1);
        }, 1000);
      } catch (audioError: any) {
        // 오디오 녹음 실패 시
        console.error('오디오 녹음 시작 오류:', audioError);
        Alert.alert('오류', audioError.message || '마이크 접근에 실패했습니다.');
        recognition.stop();
        return;
      }

    } catch (error) {
      console.error('녹음 시작 오류:', error);
      Alert.alert('오류', '녹음을 시작할 수 없습니다.');
    }
  };

  // 녹음 중지
  const handleStopRecording = () => {
    if (!isRecording) return;

    // 음성 인식 중지
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    // 오디오 녹음 중지
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    // 스트림 중지
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      streamRef.current = null;
    }

    // 타이머 중지
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setIsRecording(false);
    setIsProcessing(true);

    // 오디오 Blob 생성 대기
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.onstop = () => {
        // 저장된 MIME 타입 사용 (iOS 호환성)
        const mimeType = mimeTypeRef.current || 'audio/webm';
        console.log('오디오 Blob 생성, MIME 타입:', mimeType, '청크 수:', chunksRef.current.length);
        const audioBlob = new Blob(chunksRef.current, { type: mimeType, lastModified: Date.now() });
        console.log('생성된 Blob 크기:', audioBlob.size, 'bytes');
        setAudioBlob(audioBlob);

    // 처리 완료 대기 (음성 인식 결과가 완전히 들어올 때까지)
    setTimeout(() => {
      const finalTranscript = transcriptRef.current || transcript;
      const result = processRecordingResult(finalTranscript, startTimeRef.current);
      setResult(result);
      setIsProcessing(false);
    }, 500);
      };
    } else {
      setIsProcessing(false);
    }
  };

  // 시간 포맷팅 (초 -> mm:ss)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 백엔드로 녹음 업로드 (녹음 완료 화면에서 다음 버튼 클릭 시)
  const handleUploadRecording = async () => {
    if (!audioBlob || !result) {
      Alert.alert('오류', '녹음 데이터가 없습니다.');
      return;
    }

    const user = getUserFromStorage();
    if (!user) {
      Alert.alert('오류', '사용자 정보를 찾을 수 없습니다.');
      return;
    }

    // 프론트엔드에서 인식한 텍스트 가져오기
    const frontendTranscript = result.transcript || transcript || transcriptRef.current || '';
    console.log('[업로드] 프론트엔드 인식 텍스트:', frontendTranscript);

    setIsUploading(true);
    try {
      // 위치 정보 가져오기 (없으면 null)
      const district = currentDistrict || await getCurrentLocation();
      
      // 프론트엔드에서 인식한 텍스트와 위치 정보를 함께 전송
      const response = await uploadRecording(audioBlob, user.id, frontendTranscript, undefined, district || undefined);
      if (response.success) {
        setRecordingData(response.recording);
        // 키워드 화면으로 이동
        setShowKeywords(true);
        // 총 녹음 시간 새로고침
        refreshArchiveDuration();
      }
    } catch (error: any) {
      console.error('업로드 오류:', error);
      Alert.alert('오류', error.message || '녹음 업로드에 실패했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

  // 키워드 화면에서 다음 버튼 (하이라이트 설정 화면으로)
  const handleKeywordsNext = () => {
    setShowKeywords(false);
    setShowHighlight(true);
    // 하이라이트 화면 진입 시 0초에 마커 표시 (저장 완료 화면과 동일하게)
    setHighlightTimeSeconds(0);
    setHighlightTime(formatHighlightTime(0));
    setShowHighlightMarker(true);
    setHighlightTimeInput('');
    setIsDragging(false);
    isDraggingRef.current = false; // ref도 초기화
  };


  // 시간 입력 핸들러 (MM:SS 형식)
  const handleTimeInputChange = (text: string) => {
    // 숫자와 콜론만 허용
    let formattedText = text.replace(/[^0-9:]/g, '');
    
    // 콜론은 하나만 허용
    const colonCount = (formattedText.match(/:/g) || []).length;
    if (colonCount > 1) {
      formattedText = formattedText.replace(/:/g, '').replace(/(\d{2})(\d{2})/, '$1:$2');
    }
    
    // MM:SS 형식으로 자동 포맷팅
    if (formattedText.length <= 2 && !formattedText.includes(':')) {
      // 숫자만 입력 중
      setHighlightTimeInput(formattedText);
    } else if (formattedText.includes(':')) {
      const parts = formattedText.split(':');
      const mins = parts[0].slice(0, 2);
      const secs = parts[1] ? parts[1].slice(0, 2) : '';
      const formatted = `${mins}${secs ? ':' + secs : ''}`;
      setHighlightTimeInput(formatted);
      
      // 분과 초가 모두 입력되면 마커 위치 업데이트
      if (mins && secs && secs.length === 2) {
        const minsNum = parseInt(mins) || 0;
        const secsNum = parseInt(secs) || 0;
        if (secsNum <= 59) {
          handleTimeInput(minsNum.toString(), secsNum.toString());
        }
      }
    } else {
      // 3자리 이상 숫자 입력 시 자동으로 콜론 추가
      if (formattedText.length >= 3) {
        formattedText = formattedText.slice(0, 4).replace(/(\d{2})(\d{0,2})/, '$1:$2');
      }
      setHighlightTimeInput(formattedText);
      
      // MM:SS 형식이 완성되면 마커 위치 업데이트
      if (formattedText.length === 5 && formattedText.includes(':')) {
        const parts = formattedText.split(':');
        const mins = parseInt(parts[0]) || 0;
        const secs = parseInt(parts[1]) || 0;
        if (secs <= 59) {
          handleTimeInput(mins.toString(), secs.toString());
        }
      }
    }
  };

  // 시간 입력 핸들러
  const handleTimeInput = (minutes: string, seconds: string) => {
    if (!result) return;
    const mins = parseInt(minutes) || 0;
    const secs = parseInt(seconds) || 0;
    const totalSeconds = result.duration;
    const totalMins = Math.floor(totalSeconds / 60);
    const totalSecs = Math.ceil(totalSeconds % 60);
    
    // 입력값이 녹음 길이를 넘지 않도록 제한
    if (mins > totalMins || (mins === totalMins && secs > totalSecs)) {
      return;
    }
    
    const targetSeconds = mins * 60 + secs;
    setHighlightTimeSeconds(targetSeconds);
    setHighlightTime(formatHighlightTime(targetSeconds));
    setShowHighlightMarker(true);
  };

  // 하이라이트 시간을 "MM:SS" 형식으로 변환
  const formatHighlightTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // 초를 "MM:SS" 형식으로 변환 (저장용 - 정수로 내림)
  const secondsToTimeString = (seconds: number): string => {
    const flooredSeconds = Math.floor(seconds); // 저장할 때 내림 처리 (3.9초면 3초로)
    const mins = Math.floor(flooredSeconds / 60);
    const secs = flooredSeconds % 60;
    return `${mins}:${secs}`;
  };

  // 마커 위치 계산 (픽셀) - 마커가 화면 밖으로 나가지 않도록 범위 조정
  const getMarkerPosition = (): number => {
    if (!result || result.duration === 0) return MARKER_SIZE / 2;
    const totalSeconds = result.duration;
    // 실제 사용 가능한 너비 = 전체 너비 - 마커 크기 (양쪽 여유)
    const usableWidth = TIMELINE_WIDTH - MARKER_SIZE;
    // 마커 중심 위치 = 왼쪽 여유 + (시간 비율 * 사용 가능한 너비)
    return MARKER_SIZE / 2 + (highlightTimeSeconds / totalSeconds) * usableWidth;
  };

  // 위치에서 시간 계산 (0.01초 단위로 부드럽게) - 마커 범위 고려
  const updateTimeFromPosition = (clientX: number) => {
    if (!result || !highlightBarRef.current || result.duration === 0) return;
    
    const usableWidth = TIMELINE_WIDTH - MARKER_SIZE;
    const minX = MARKER_SIZE / 2;
    const maxX = TIMELINE_WIDTH - MARKER_SIZE / 2;
    
    if (Platform.OS === 'web') {
      const element = highlightBarRef.current as any;
      if (element && typeof element.getBoundingClientRect === 'function') {
        const rect = element.getBoundingClientRect();
        const relativeX = clientX - rect.left;
        const clampedX = Math.max(minX, Math.min(maxX, relativeX));
        const totalSeconds = result.duration;
        // 사용 가능한 범위 내에서 시간 계산
        const normalizedX = (clampedX - minX) / usableWidth;
        const newTime = Math.round(normalizedX * totalSeconds * 100) / 100;
        setHighlightTimeSeconds(newTime);
        setHighlightTime(formatHighlightTime(newTime));
      }
    } else {
      (highlightBarRef.current as any).measure((fx: number, fy: number, width: number, height: number, px: number, py: number) => {
        const relativeX = clientX - px;
        const clampedX = Math.max(minX, Math.min(maxX, relativeX));
        const totalSeconds = result.duration;
        // 사용 가능한 범위 내에서 시간 계산
        const normalizedX = (clampedX - minX) / usableWidth;
        const newTime = Math.round(normalizedX * totalSeconds * 100) / 100;
        setHighlightTimeSeconds(newTime);
        setHighlightTime(formatHighlightTime(newTime));
      });
    }
  };

  // 통합 포인터 다운 핸들러 (마우스 + 터치)
  const handlePointerDown = (e: any) => {
    if (!result) return;
    e.preventDefault?.();
    setIsDragging(true);
    isDraggingRef.current = true;
    setShowHighlightMarker(true);
    
    // 초기 위치
    const clientX = e.clientX || e.touches?.[0]?.clientX || e.nativeEvent?.touches?.[0]?.pageX;
    if (clientX !== undefined) {
      updateTimeFromPosition(clientX);
    }
    
    // 전역 이벤트 리스너
    const handleMove = (moveEvent: any) => {
      if (!isDraggingRef.current) return;
      moveEvent.preventDefault?.();
      const x = moveEvent.clientX || moveEvent.touches?.[0]?.clientX;
      if (x !== undefined) {
        updateTimeFromPosition(x);
      }
    };
    
    const handleEnd = () => {
      setIsDragging(false);
      isDraggingRef.current = false;
      if (typeof window !== 'undefined' && window.document) {
        const doc = window.document as any;
        doc.removeEventListener('mousemove', handleMove);
        doc.removeEventListener('mouseup', handleEnd);
        doc.removeEventListener('touchmove', handleMove);
        doc.removeEventListener('touchend', handleEnd);
      }
    };
    
    if (typeof window !== 'undefined' && window.document) {
      const doc = window.document as any;
      doc.addEventListener('mousemove', handleMove);
      doc.addEventListener('mouseup', handleEnd);
      doc.addEventListener('touchmove', handleMove, { passive: false });
      doc.addEventListener('touchend', handleEnd);
    }
  };


  // 하이라이트 설정 완료
  const handleHighlightSave = async () => {
    if (!recordingData) return;

    // 하이라이트 마커가 표시되어 있으면 시간 저장, 없으면 빈 문자열
    const finalHighlightTime = showHighlightMarker ? secondsToTimeString(highlightTimeSeconds) : '';

    try {
      const response = await updateRecording(recordingData.id, finalHighlightTime);
      if (response.success) {
        setRecordingData(response.recording);
        setShowHighlight(false);
        setShowSaved(true);
        // 총 녹음 시간 새로고침
        refreshArchiveDuration();
      }
    } catch (error: any) {
      console.error('하이라이트 업데이트 오류:', error);
      Alert.alert('오류', '하이라이트 저장에 실패했습니다.');
    }
  };

  // 하이라이트 시간 파싱 (MM:SS -> 초)
  const parseHighlightTime = (timeStr: string): number => {
    if (!timeStr) return 0;
    const parts = timeStr.split(':');
    if (parts.length === 2) {
      return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    }
    return 0;
  };

  // 감정에 따른 색상 매핑 (6개: 행복, 놀람, 화남, 슬픔, 신남, 보통)
  const getEmotionColor = (emotion: string): string => {
    const emotionColorMap: { [key: string]: string } = {
      '행복': '#FED046',
      '슬픔': '#47AFF4',
      '놀람': '#F99841',
      '신남': '#EE47CA',
      '화남': '#EE4947',
      '보통': '#5CC463',
    };
    return emotionColorMap[emotion] || '#FED046';
  };

  // 키워드 강조를 위한 텍스트 렌더링 (컨테이너 포함)
  const renderHighlightedText = (text: string, keywords: string[], emotion?: string) => {
    if (!keywords || keywords.length === 0) {
      return (
        <View style={styles.savedContentContainer}>
          <Text style={styles.savedContentText}>{text}</Text>
        </View>
      );
    }

    // 감정에 따른 색상 가져오기
    const emotionColor = emotion ? getEmotionColor(emotion) : '#FED046';

    // 텍스트에서 키워드를 찾아서 하이라이트
    // 키워드를 길이 순으로 정렬 (긴 키워드부터 매칭)
    const sortedKeywords = [...keywords].filter(k => k && k.trim()).sort((a, b) => b.length - a.length);
    
    if (sortedKeywords.length === 0) {
      return (
        <View style={styles.savedContentContainer}>
          <Text style={styles.savedContentText}>{text}</Text>
        </View>
      );
    }

    // 텍스트를 키워드 기준으로 분할
    const parts: Array<{ text: string; isKeyword: boolean }> = [];
    let remainingText = text;
    
    // 각 키워드의 위치를 찾아서 정렬
    const matches: Array<{ keyword: string; index: number }> = [];
    sortedKeywords.forEach(keyword => {
      const trimmedKeyword = keyword.trim();
      if (!trimmedKeyword) return;
      
      let searchIndex = 0;
      while (true) {
        const index = remainingText.indexOf(trimmedKeyword, searchIndex);
        if (index === -1) break;
        matches.push({ keyword: trimmedKeyword, index });
        searchIndex = index + 1;
      }
    });
    
    // 인덱스 순으로 정렬
    matches.sort((a, b) => a.index - b.index);
    
    // 겹치는 매치 제거 (긴 키워드 우선)
    const nonOverlappingMatches: Array<{ keyword: string; index: number }> = [];
    let lastEnd = -1;
    
    matches.forEach(match => {
      const matchEnd = match.index + match.keyword.length;
      if (match.index >= lastEnd) {
        nonOverlappingMatches.push(match);
        lastEnd = matchEnd;
      }
    });
    
    // 텍스트를 키워드와 일반 텍스트로 분할
    let currentIndex = 0;
    nonOverlappingMatches.forEach(match => {
      // 키워드 이전의 일반 텍스트
      if (match.index > currentIndex) {
        const normalText = remainingText.substring(currentIndex, match.index);
        if (normalText) {
          parts.push({ text: normalText, isKeyword: false });
        }
      }
      
      // 키워드
      parts.push({ text: match.keyword, isKeyword: true });
      currentIndex = match.index + match.keyword.length;
    });
    
    // 마지막 남은 텍스트
    if (currentIndex < remainingText.length) {
      const normalText = remainingText.substring(currentIndex);
      if (normalText) {
        parts.push({ text: normalText, isKeyword: false });
      }
    }
    
    // 매칭이 없으면 전체 텍스트 반환
    if (parts.length === 0) {
      parts.push({ text: remainingText, isKeyword: false });
    }

    return (
      <View style={styles.savedContentContainer}>
        <View style={styles.savedContentTextContainer}>
          {parts.map((part, index) => {
            if (part.isKeyword) {
              return (
                <View key={index} style={[styles.savedKeywordTagInline, { backgroundColor: emotionColor }]}>
                  <Text style={styles.savedKeywordTextInline}>{part.text}</Text>
                </View>
              );
            } else {
              // 일반 텍스트는 그대로 표시
              return (
                <Text key={index} style={styles.savedNormalText}>{part.text}</Text>
              );
            }
          })}
        </View>
      </View>
    );
  };

  // 키워드 강조를 위한 텍스트 렌더링 (컨테이너 없이 내용만)
  const renderHighlightedTextContent = (text: string, keywords: string[], emotion?: string) => {
    if (!keywords || keywords.length === 0) {
      return (
        <View style={styles.savedContentTextContainer}>
          <Text style={styles.savedContentText}>{text}</Text>
        </View>
      );
    }

    // 감정에 따른 색상 가져오기
    const emotionColor = emotion ? getEmotionColor(emotion) : '#FED046';

    // 텍스트에서 키워드를 찾아서 하이라이트
    // 키워드를 길이 순으로 정렬 (긴 키워드부터 매칭)
    const sortedKeywords = [...keywords].filter(k => k && k.trim()).sort((a, b) => b.length - a.length);
    
    if (sortedKeywords.length === 0) {
      return (
        <View style={styles.savedContentTextContainer}>
          <Text style={styles.savedContentText}>{text}</Text>
        </View>
      );
    }

    // 텍스트를 키워드 기준으로 분할
    const parts: Array<{ text: string; isKeyword: boolean }> = [];
    let remainingText = text;
    
    // 각 키워드의 위치를 찾아서 정렬
    const matches: Array<{ keyword: string; index: number }> = [];
    sortedKeywords.forEach(keyword => {
      const trimmedKeyword = keyword.trim();
      if (!trimmedKeyword) return;
      
      let searchIndex = 0;
      while (true) {
        const index = remainingText.indexOf(trimmedKeyword, searchIndex);
        if (index === -1) break;
        matches.push({ keyword: trimmedKeyword, index });
        searchIndex = index + 1;
      }
    });
    
    // 인덱스 순으로 정렬
    matches.sort((a, b) => a.index - b.index);
    
    // 겹치는 매치 제거 (긴 키워드 우선)
    const nonOverlappingMatches: Array<{ keyword: string; index: number }> = [];
    let lastEnd = -1;
    
    matches.forEach(match => {
      const matchEnd = match.index + match.keyword.length;
      if (match.index >= lastEnd) {
        nonOverlappingMatches.push(match);
        lastEnd = matchEnd;
      }
    });
    
    // 텍스트를 키워드와 일반 텍스트로 분할
    let currentIndex = 0;
    nonOverlappingMatches.forEach(match => {
      // 키워드 이전의 일반 텍스트
      if (match.index > currentIndex) {
        const normalText = remainingText.substring(currentIndex, match.index);
        if (normalText) {
          parts.push({ text: normalText, isKeyword: false });
        }
      }
      
      // 키워드
      parts.push({ text: match.keyword, isKeyword: true });
      currentIndex = match.index + match.keyword.length;
    });
    
    // 마지막 남은 텍스트
    if (currentIndex < remainingText.length) {
      const normalText = remainingText.substring(currentIndex);
      if (normalText) {
        parts.push({ text: normalText, isKeyword: false });
      }
    }
    
    // 매칭이 없으면 전체 텍스트 반환
    if (parts.length === 0) {
      parts.push({ text: remainingText, isKeyword: false });
    }

    return (
      <View style={styles.savedContentTextContainer}>
        {parts.map((part, index) => {
          if (part.isKeyword) {
            return (
              <View key={index} style={[styles.savedKeywordTagInline, { backgroundColor: emotionColor }]}>
                <Text style={styles.savedKeywordTextInline}>{part.text}</Text>
              </View>
            );
          } else {
            // 일반 텍스트는 그대로 표시
            return (
              <Text key={index} style={styles.savedNormalText}>{part.text}</Text>
            );
          }
        })}
      </View>
    );
  };

  // 저장 완료 화면에서 저장 버튼
  // 업로드 버튼 핸들러 (is_uploaded = true)
  const handleUpload = async () => {
    if (!recordingData) return;

    try {
      const response = await updateRecording(recordingData.id, undefined, true);
      if (response.success) {
        // 업로드 완료 후 피드 화면으로 이동
        navigation.navigate('Feed', { recordingId: recordingData.id });
        // 상태 초기화
        handleFinalSave();
      }
    } catch (error: any) {
      console.error('업로드 저장 오류:', error);
      Alert.alert('오류', '업로드 저장에 실패했습니다.');
    }
  };

  // 저장 버튼 핸들러 (is_uploaded = false)
  const handleFinalSave = async () => {
    if (recordingData) {
      try {
        // 드래그로 변경된 하이라이트 시간이 있으면 저장
        const finalHighlightTime = isDragging && highlightTimeSeconds > 0 
          ? secondsToTimeString(highlightTimeSeconds) 
          : recordingData.highlight_time || '';
        
        // 저장 시 is_uploaded를 false로 설정하고 하이라이트 시간 업데이트
        await updateRecording(recordingData.id, finalHighlightTime, false);
      } catch (error: any) {
        console.error('저장 오류:', error);
        // 저장 실패해도 화면은 초기화 (이미 서버에 저장되어 있을 수 있음)
      }
    }

    // 모든 상태 초기화
    setResult(null);
    setAudioBlob(null);
    setRecordingData(null);
    setTranscript('');
    setRecordingTime(0);
    setHighlightTime('');
    setShowKeywords(false);
    setShowHighlight(false);
    setShowSaved(false);
    
    // localStorage에서 상태 제거
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem('recordingScreenState');
      window.localStorage.removeItem('recordingData');
    }
  };

  // generateWaveformPath 함수 제거 (고정 웨이브 SVG 사용)
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* 배경 프레임 */}
      <View style={styles.frame} />

      {/* 상단 헤더 */}
      <Header />

      {/* 날짜 텍스트 */}
      <View style={styles.dateContainer}>
        <Text style={styles.dateText}>{getCurrentDate()}</Text>
      </View>

      {/* 메인 텍스트 */}
      <View style={styles.mainTextContainer}>
        <Text style={styles.mainText}>
          {result 
            ? '녹음이 완료되었습니다'
            : isRecording && transcript 
            ? transcript 
            : isProcessing 
            ? '처리 중...' 
            : '녹음을 시작하세요'}
        </Text>
      </View>

      {/* 녹음 시간 표시 */}
      {isRecording && !result && (
        <View style={styles.timeContainer}>
          <Text style={styles.timeText}>{formatTime(recordingTime)}</Text>
        </View>
      )}
      
      {/* 녹음 완료 후 시간 표시 */}
      {result && (
        <View style={styles.completedTimeContainer}>
          <Text style={styles.completedTimeText}>{formatTime(Math.floor(result.duration))}</Text>
        </View>
      )}

      {/* 녹음 재생바 */}
      {!result && (
        <View style={styles.waveContainer}>
          {isRecording ? (
            // 녹음 중: 웨이브 애니메이션 (아카이브와 동일한 방식)
            <Svg width="393" height="25" viewBox="0 -10 393 25">
              <Path
                d={createWavePath(2.5, waveOffset)}
                stroke="#B780FF"
                strokeWidth="5"
                fill="none"
                strokeLinecap="round"
              />
            </Svg>
          ) : (
            // 녹음 전: 정적 바
            <Svg width="393" height="5" viewBox="0 0 393 5" fill="none">
              <Path
                d="M0 2.5H393"
                stroke="#B780FF"
                strokeWidth="5"
                strokeLinecap="round"
              />
            </Svg>
          )}
        </View>
      )}

      {/* 녹음 완료 후 재생바 영역 */}
      {result && !showKeywords && !showHighlight && !showSaved && (
        <View style={styles.completedWaveContainer}>
          {/* 기본 바 (초기 화면과 동일) */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="408"
            height="5"
            viewBox="0 0 408 5"
            fill="none"
          >
            <path
              d="M-14.8986 2.5H393.101"
              stroke="#B780FF"
              strokeWidth="5"
            />
          </svg>
        </View>
      )}

      {/* 녹음 버튼 */}
      {!result && (
      <View style={styles.recordingButtonContainer}>
          <TouchableOpacity
            style={[styles.recordingButton, isRecording && styles.recordingButtonActive]}
            onPress={isRecording ? handleStopRecording : handleStartRecording}
            disabled={isProcessing}
          >
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" fill="none">
            <circle cx="32" cy="32" r="32" fill="#B780FF" />
          </svg>
          <View style={styles.recordingIconContainer}>
            {(() => {
              console.log('버튼 아이콘 렌더링 - isRecording:', isRecording);
              return isRecording ? (
                // 정지 버튼 (녹음 완료 버튼)
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="24" height="24" rx="3" fill="#0A0A0A"/>
                </svg>
              ) : (
                // 녹음 아이콘
            <svg width="25" height="29" viewBox="0 0 29 33" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M14.5017 2C13.0664 2 11.6898 2.52377 10.6749 3.4561C9.6599 4.38842 9.08971 5.65292 9.08971 6.97143V13.6C9.08971 14.9185 9.6599 16.183 10.6749 17.1153C11.6898 18.0477 13.0664 18.5714 14.5017 18.5714C15.9371 18.5714 17.3137 18.0477 18.3286 17.1153C19.3436 16.183 19.9138 14.9185 19.9138 13.6V6.97143C19.9138 5.65292 19.3436 4.38842 18.3286 3.4561C17.3137 2.52377 15.9371 2 14.5017 2Z" fill="black"/>
              <path d="M1.99994 15.2571C2.43704 18.0159 3.94082 20.5379 6.23618 22.3618C8.53154 24.1856 11.465 25.1893 14.4999 25.1893M14.4999 25.1893C17.5349 25.1893 20.4683 24.1856 22.7637 22.3618C25.0591 20.5379 26.5628 18.0159 26.9999 15.2571M14.4999 25.1893V31M14.5017 2C13.0664 2 11.6898 2.52377 10.6749 3.4561C9.6599 4.38842 9.08971 5.65292 9.08971 6.97143V13.6C9.08971 14.9185 9.6599 16.183 10.6749 17.1153C11.6898 18.0477 13.0664 18.5714 14.5017 18.5714C15.9371 18.5714 17.3137 18.0477 18.3286 17.1153C19.3436 16.183 19.9138 14.9185 19.9138 13.6V6.97143C19.9138 5.65292 19.3436 4.38842 18.3286 3.4561C17.3137 2.52377 15.9371 2 14.5017 2Z" stroke="black" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 15.5938C2.4371 18.2935 3.94088 20.7616 6.23624 22.5465C8.5316 24.3313 11.4651 25.3136 14.5 25.3136M14.5 25.3136C17.5349 25.3136 20.4684 24.3313 22.7638 22.5465C25.0591 20.7616 26.5629 18.2935 27 15.5938M14.5 25.3136V31" stroke="black" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
              );
            })()}
          </View>
        </TouchableOpacity>
      </View>
      )}

      {/* 녹음 완료 버튼들 */}
      {result && (
        <View style={styles.completedButtonsContainer}>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setResult(null);
              setTranscript('');
              setRecordingTime(0);
            }}
          >
            <Text style={styles.retryButtonText}>다시 녹음</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.nextButton, isUploading && styles.nextButtonDisabled]}
            onPress={isUploading ? undefined : handleUploadRecording}
            disabled={isUploading}
            activeOpacity={isUploading ? 1 : 0.7}
          >
            <Text style={styles.nextButtonText} numberOfLines={1}>
              {isUploading ? '분석 중' : '다음'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 키워드 화면 */}
      {showKeywords && recordingData && (
        <View style={styles.keywordsScreen}>
          {/* 배경 프레임 */}
          <View style={styles.frame} />
          
          {/* 상단 헤더 */}
          <Header />
          
          {/* 제목 (날짜 위치와 동일) */}
          <View style={styles.dateContainer}>
            <Text style={styles.keywordsTitle}>이런 키워드가 들렸어요</Text>
          </View>
          
          {/* 감정과 키워드 태그들 (세로 배치, 스크롤 가능) */}
          <ScrollView 
            style={styles.keywordsTagsContainer}
            contentContainerStyle={styles.keywordsTagsContent}
            showsVerticalScrollIndicator={false}
          >
            {/* 감정 태그 (첫 번째) */}
            <View style={[styles.emotionKeywordTag, { backgroundColor: getEmotionColor(recordingData.emotion) }]}>
              <Text style={styles.emotionKeywordText}>{recordingData.emotion}</Text>
            </View>
            
            {/* 키워드 태그들 (최대 2개) */}
            {recordingData.keywords && recordingData.keywords.length > 0 ? (
              recordingData.keywords.slice(0, 2).map((word, index) => (
                <View key={index} style={[styles.emotionKeywordTag, { backgroundColor: getEmotionColor(recordingData.emotion) }]}>
                  <Text style={styles.emotionKeywordText}>{word}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.noKeywordsText}>키워드가 없습니다.</Text>
            )}
            
            {/* 장소 태그 */}
            {recordingData.district && (
              <View style={[styles.emotionKeywordTag, { backgroundColor: getEmotionColor(recordingData.emotion) }]}>
                <Text style={styles.emotionKeywordText}>{recordingData.district}</Text>
              </View>
            )}
          </ScrollView>
          
          {/* 시간 표시 */}
          {result && (
            <View style={styles.keywordsTimeContainer}>
              <Text style={styles.keywordsTimeText}>
                {formatTime(Math.floor(result.duration))}
              </Text>
            </View>
          )}
          
          {/* 재생 바 */}
          <View style={styles.keywordsWaveContainer}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="408"
              height="5"
              viewBox="0 0 408 5"
              fill="none"
            >
              <path
                d="M-14.8986 2.5H393.101"
                stroke="#B780FF"
                strokeWidth="5"
              />
            </svg>
          </View>
          
          {/* 버튼들 */}
          <View style={styles.keywordsButtonsContainer}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                setShowKeywords(false);
              }}
            >
              <Text style={styles.backButtonText}>뒤로가기</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.keywordsNextButton}
              onPress={handleKeywordsNext}
            >
              <Text style={styles.keywordsNextButtonText}>다음</Text>
            </TouchableOpacity>
          </View>
          
          {/* 하단 네비게이션 바 */}
          <NavigationBar 
            onNavigateToRecords={() => navigation.navigate('Records')} 
            onNavigateToRecording={() => navigation.navigate('Recording')} 
            onNavigateToProfile={() => navigation.navigate('Profile')}
            onNavigateToFeed={() => navigation.navigate('Feed')}
            onNavigateToArchive={() => navigation.navigate('Archive')}
            currentPage="Recording" 
          />
        </View>
      )}

      {/* 하이라이트 설정 화면 */}
      {showHighlight && recordingData && (
        <View style={styles.highlightScreen}>
          {/* 배경 프레임 */}
          <View style={styles.frame} />
          
          {/* 상단 헤더 */}
          <Header />
          
          {/* 제목 */}
          <View style={styles.dateContainer}>
            <Text style={styles.highlightTitle}>꾹 누르거나 시간을 입력해</Text>
            <Text style={styles.highlightTitle}>하이라이트를 설정하세요</Text>
          </View>
          
          {/* 시간 입력 (MM:SS 형식) */}
          <View style={styles.highlightTimeContainer}>
            <TextInput
              style={styles.highlightTimeInput}
              value={highlightTimeInput || (showHighlightMarker ? highlightTime : formatTime(Math.floor(result?.duration || 0)))}
              onChangeText={handleTimeInputChange}
              placeholder={formatTime(Math.floor(result?.duration || 0))}
              placeholderTextColor="#666"
              keyboardType="number-pad"
              maxLength={5}
              onFocus={() => {
                // 포커스 시 현재 시간으로 초기화
                if (showHighlightMarker && highlightTime) {
                  setHighlightTimeInput(highlightTime);
                } else {
                  setHighlightTimeInput('');
                }
              }}
              onBlur={() => {
                // 포커스 해제 시 입력값이 없으면 현재 시간으로 복원
                if (!highlightTimeInput) {
                  setHighlightTimeInput('');
                }
              }}
            />
          </View>
          
          {/* 재생 바 (하이라이트 수정 화면과 동일한 구조) */}
          <View style={styles.highlightTimelineContainer}>
            <View 
              ref={highlightBarRef}
              style={styles.highlightTouchableArea}
              {...(Platform.OS === 'web' ? {
                // @ts-ignore - 웹 전용 이벤트
                onMouseDown: handlePointerDown,
                onTouchStart: handlePointerDown,
              } : {
                onTouchStart: handlePointerDown,
              })}
            >
              {/* 실제 보이는 얇은 바 */}
              <View style={styles.highlightTimelineBar} />
              
              {/* 하이라이트 마커 (드래그 가능) - 바를 클릭했을 때만 표시 */}
              {showHighlightMarker && result && (() => {
                const totalSeconds = Math.max(result.duration, 1);
                // 마커가 화면 밖으로 나가지 않도록 범위 조정
                const usableWidth = TIMELINE_WIDTH - MARKER_SIZE;
                const markerPosition = MARKER_SIZE / 2 + (highlightTimeSeconds / totalSeconds) * usableWidth;
                
                return (
                  <View 
                    style={[
                      styles.highlightMarkerContainer,
                      {
                        left: markerPosition - MARKER_SIZE / 2, // 마커 중심 정렬
                      }
                    ]}
                  >
                  <View style={styles.highlightMarker}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="38" height="38" viewBox="0 0 38 38" fill="none">
                      <circle cx="19.0022" cy="19.0022" r="19.0022" fill="#FFD630"/>
                      <g filter="url(#filter0_d_266_160)">
                        <path d="M17.5744 9.5735C18.0234 8.19153 19.9785 8.19153 20.4276 9.5735L21.7668 13.6954C21.9677 14.3134 22.5436 14.7318 23.1934 14.7318H27.5274C28.9805 14.7318 29.5847 16.5913 28.4091 17.4454L24.9028 19.9928C24.3771 20.3748 24.1571 21.0519 24.3579 21.6699L25.6972 25.7918C26.1462 27.1737 24.5645 28.3229 23.3889 27.4688L19.8827 24.9214C19.3569 24.5394 18.645 24.5394 18.1193 24.9214L14.613 27.4688C13.4375 28.3229 11.8557 27.1737 12.3048 25.7918L13.644 21.6699C13.8448 21.0518 13.6249 20.3748 13.0991 19.9928L9.59285 17.4454C8.41728 16.5913 9.02145 14.7318 10.4745 14.7318H14.8085C15.4584 14.7318 16.0343 14.3134 16.2351 13.6954L17.5744 9.5735Z" fill="#0C0B0D"/>
                      </g>
                      <defs>
                        <filter id="filter0_d_266_160" x="4.97168" y="7.53705" width="28.0586" height="27.225" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                          <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
                          <feOffset dy="3"/>
                          <feGaussianBlur stdDeviation="2"/>
                          <feComposite in2="hardAlpha" operator="out"/>
                          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/>
                          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_266_160"/>
                          <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_266_160" result="shape"/>
                        </filter>
                      </defs>
                    </svg>
                  </View>
                </View>
                );
              })()}
            </View>
          </View>
          
          {/* 버튼들 */}
          <View style={styles.highlightButtonsContainer}>
            <TouchableOpacity
              style={styles.skipButton}
              onPress={async () => {
                // 건너뛰기: 하이라이트 없이 저장
                if (recordingData) {
                  try {
                    const response = await updateRecording(recordingData.id, '');
                    if (response.success) {
                      setRecordingData(response.recording);
                    }
                  } catch (error: any) {
                    console.error('건너뛰기 저장 오류:', error);
                  }
                }
                setShowHighlight(false);
                setShowSaved(true);
                // 총 녹음 시간 새로고침
                refreshArchiveDuration();
              }}
            >
              <Text style={styles.skipButtonText}>건너뛰기</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.highlightNextButton}
              onPress={handleHighlightSave}
            >
              <Text style={styles.highlightNextButtonText}>다음</Text>
            </TouchableOpacity>
          </View>

      {/* 하단 네비게이션 바 */}
          <NavigationBar 
            onNavigateToRecords={() => navigation.navigate('Records')} 
            onNavigateToRecording={() => navigation.navigate('Recording')} 
            onNavigateToProfile={() => navigation.navigate('Profile')}
            onNavigateToFeed={() => navigation.navigate('Feed')}
            onNavigateToArchive={() => navigation.navigate('Archive')}
            currentPage="Recording" 
          />
        </View>
      )}

      {/* 저장 완료 화면 */}
      {showSaved && recordingData && (
        <View style={styles.savedScreen}>
          {/* 배경 프레임 */}
          <View style={styles.frame} />
          
          {/* 고정된 헤더 */}
          <Header />
          
          {/* 스크롤 가능한 내용 - 헤더 아래부터 */}
          <ScrollView
            style={styles.savedScrollView}
            contentContainerStyle={styles.savedScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* 첫 번째 화면: 캐릭터 화면 */}
            <View style={styles.savedTopScreen}>
              {/* 제목 */}
              <View style={styles.dateContainer}>
                <Text style={styles.savedTitle}>
                  {new Date(recordingData.recorded_at).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' }).replace('월', '월 ').replace('일', '일')}
                </Text>
                <Text style={styles.savedTitle}>녹음이 완료 되었어요</Text>
              </View>
              
              {/* 감정 캐릭터 (행복/기쁨) */}
              {(recordingData.emotion === '행복' || recordingData.emotion === '기쁨') && (
                <View style={styles.emotionCharacterContainer}>
                  {/* 노란색 원형 배경 */}
                  <View style={styles.characterCircleBackground} />
                  {/* 큰 캐릭터 전용 SVG */}
                  <View style={styles.characterWrapper}>
                    <View style={styles.characterEyesContainer}>
                      {eyeAnimationState === 0 ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="337" height="138" viewBox="0 0 337 138" fill="none">
                          <circle cx="105.472" cy="69.472" r="60.4719" fill="#F5F5F5"/>
                          <circle cx="231.556" cy="69.472" r="60.4719" fill="#F5F5F5"/>
                          <mask id="mask0_396_61_recording" style={{maskType:"alpha"}} maskUnits="userSpaceOnUse" x="45" y="9" width="121" height="121">
                            <circle cx="105.472" cy="69.4719" r="60.4719" fill="#F5F5F5"/>
                          </mask>
                          <g mask="url(#mask0_396_61_recording)">
                            <circle cx="55.0428" cy="69.4754" r="60.4755" fill="#0A0A0A"/>
                          </g>
                          <mask id="mask1_396_61_recording" style={{maskType:"alpha"}} maskUnits="userSpaceOnUse" x="171" y="9" width="122" height="121">
                            <circle cx="231.557" cy="69.4719" r="60.4719" fill="#F5F5F5"/>
                          </mask>
                          <g mask="url(#mask1_396_61_recording)">
                            <circle cx="181.126" cy="69.4754" r="60.4755" fill="#0A0A0A"/>
                          </g>
                          <path d="M127.855 80.1475C127.855 84.208 126.242 88.1023 123.371 90.9735C120.5 93.8447 116.606 95.4578 112.545 95.4578C108.485 95.4578 104.59 93.8447 101.719 90.9735C98.8479 88.1023 97.2349 84.2081 97.2349 80.1475L112.545 80.1475H127.855Z" fill="#F5F5F5"/>
                          <path d="M253.94 80.1475C253.94 84.208 252.327 88.1023 249.456 90.9735C246.585 93.8447 242.691 95.4578 238.63 95.4578C234.57 95.4578 230.675 93.8447 227.804 90.9735C224.933 88.1023 223.32 84.2081 223.32 80.1475L238.63 80.1475H253.94Z" fill="#F5F5F5"/>
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="337" height="138" viewBox="0 0 337 138" fill="none">
                          <circle cx="105.472" cy="69.472" r="60.4719" fill="#F5F5F5"/>
                          <circle cx="231.556" cy="69.472" r="60.4719" fill="#F5F5F5"/>
                          <mask id="mask0_396_110_recording" style={{maskType:"alpha"}} maskUnits="userSpaceOnUse" x="45" y="9" width="121" height="121">
                            <circle cx="105.472" cy="69.4719" r="60.4719" fill="#F5F5F5"/>
                          </mask>
                          <g mask="url(#mask0_396_110_recording)">
                            <circle cx="60.4755" cy="60.4755" r="60.4755" transform="matrix(-1 0 0 1 214.288 9)" fill="#0A0A0A"/>
                          </g>
                          <mask id="mask1_396_110_recording" style={{maskType:"alpha"}} maskUnits="userSpaceOnUse" x="171" y="9" width="122" height="121">
                            <circle cx="231.557" cy="69.4719" r="60.4719" fill="#F5F5F5"/>
                          </mask>
                          <g mask="url(#mask1_396_110_recording)">
                            <circle cx="60.4755" cy="60.4755" r="60.4755" transform="matrix(-1 0 0 1 344.289 9)" fill="#0A0A0A"/>
                          </g>
                          <path d="M81.0001 80.1475C81.0001 84.208 82.6132 88.1023 85.4844 90.9735C88.3556 93.8447 92.2498 95.4578 96.3104 95.4578C100.371 95.4578 104.265 93.8447 107.136 90.9735C110.008 88.1023 111.621 84.2081 111.621 80.1475L96.3104 80.1475H81.0001Z" fill="#F5F5F5"/>
                          <path d="M211 80.1475C211 84.208 212.613 88.1023 215.484 90.9735C218.356 93.8447 222.25 95.4578 226.31 95.4578C230.371 95.4578 234.265 93.8447 237.136 90.9735C240.008 88.1023 241.621 84.2081 241.621 80.1475L226.31 80.1475H211Z" fill="#F5F5F5"/>
                        </svg>
                      )}
                    </View>
                    {/* 입 - 화면 기준 top: 291.68 */}
                    <View style={styles.characterMouthContainer}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="42" height="23" viewBox="0 0 42 23" fill="none">
                        <path 
                          d="M4.50293 4.50299C4.50293 22.515 36.9246 23.4156 36.9246 4.50299" 
                          stroke="#0A0A0A" 
                          strokeWidth="9.00602" 
                          strokeLinecap="round"
                        />
                      </svg>
                    </View>
                  </View>
                </View>
              )}
              
              {/* 감정 캐릭터 (슬픔) */}
              {recordingData.emotion === '슬픔' && (
                <View style={styles.sadEmotionCharacterContainer}>
                  {/* 슬픔 색상 사각형 배경 */}
                  <View style={[styles.sadCharacterBackground, { backgroundColor: getEmotionColor('슬픔') }]} />
                  {/* 슬픔 캐릭터 SVG */}
                  <View style={styles.sadCharacterWrapper}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="393" height="534" viewBox="0 0 393 534" fill="none" style={{ width: '100%', height: '100%' }}>
                      {/* 슬픔 캐릭터 SVG - 배경 rect는 제외하고 캐릭터만 (배경은 별도 렌더링) */}
                      {/* 원들 */}
                      <circle cx="140.233" cy="108.908" r="53.9077" fill="#F5F5F5"/>
                      <circle cx="252.631" cy="108.908" r="53.9077" fill="#F5F5F5"/>
                      {/* path를 원들 다음에 배치하여 원보다 높은 z-index */}
                      <path d="M100.777 133.678H124.919C133.755 133.678 140.919 140.842 140.919 149.678V321.6C140.919 330.437 133.755 337.6 124.919 337.6H116.777C107.94 337.6 100.777 330.437 100.777 321.6V133.678Z" fill="#F5F5F5"/>
                      <mask id="mask0_sad_recording" style={{maskType:"alpha"}} maskUnits="userSpaceOnUse" x="86" y="55" width="109" height="108">
                        <circle cx="140.232" cy="108.908" r="53.9077" fill="#F5F5F5"/>
                      </mask>
                      <g mask="url(#mask0_sad_recording)">
                        {eyeAnimationState === 0 ? (
                          <circle cx="95.8028" cy="108.911" r="53.9108" fill="#0A0A0A"/>
                        ) : (
                          <circle cx="60.4755" cy="60.4755" r="53.9108" transform="matrix(-1 0 0 1 251.658 48.4355)" fill="#0A0A0A"/>
                        )}
                      </g>
                      <mask id="mask1_sad_recording" style={{maskType:"alpha"}} maskUnits="userSpaceOnUse" x="198" y="55" width="109" height="108">
                        <circle cx="252.631" cy="108.908" r="53.9077" fill="#F5F5F5"/>
                      </mask>
                      <g mask="url(#mask1_sad_recording)">
                        {eyeAnimationState === 0 ? (
                          <circle cx="204.988" cy="108.911" r="53.9108" fill="#0A0A0A"/>
                        ) : (
                          <circle cx="60.4755" cy="60.4755" r="53.9108" transform="matrix(-1 0 0 1 365.659 48.4355)" fill="#0A0A0A"/>
                        )}
                      </g>
                      {/* rect를 검은 원들 다음에 배치하여 가장 높은 z-index */}
                      <rect x="254.921" y="144.918" width="32.9243" height="95.7798" rx="16.4621" fill="#F5F5F5"/>
                      <path d="M211.568 174.927C211.568 158.87 182.666 158.067 182.666 174.927" stroke="#0A0A0A" strokeWidth="8.02842" strokeLinecap="round"/>
                      <path d="M153.88 120.03C153.88 123.65 152.44 127.121 149.88 129.681C147.32 132.241 143.83 133.678 140.23 133.678C136.61 133.678 133.14 132.241 130.58 129.681C128.02 127.121 126.58 123.65 126.58 120.03L140.23 120.03H153.88Z" fill="#F5F5F5"/>
                      <path d="M266.28 120.03C266.28 123.65 264.84 127.121 262.28 129.681C259.72 132.24 256.25 133.678 252.63 133.678C249.01 133.678 245.54 132.24 242.98 129.681C240.42 127.121 238.98 123.65 238.98 120.03L252.63 120.03H266.28Z" fill="#F5F5F5"/>
                    </svg>
                  </View>
                </View>
              )}
              
              {/* 감정 캐릭터 (신남) */}
              {recordingData.emotion === '신남' && (
                <View style={styles.excitedEmotionCharacterContainer}>
                  {/* 신남 캐릭터 SVG (별 모양 배경 포함) */}
                  <View style={styles.excitedCharacterWrapper}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="640" height="640" viewBox="0 0 640 640" fill="none" style={{ width: '100%', height: '100%' }}>
                      <path d="M315.663 17.6931C316.625 13.4338 322.694 13.4338 323.657 17.6931L365.107 201.195C365.73 203.956 368.898 205.268 371.291 203.757L530.357 103.311C534.049 100.98 538.34 105.271 536.009 108.963L435.563 268.029C434.052 270.422 435.364 273.589 438.124 274.213L621.627 315.663C625.886 316.625 625.886 322.694 621.627 323.657L438.124 365.107C435.364 365.73 434.052 368.898 435.563 371.291L536.009 530.357C538.34 534.049 534.049 538.34 530.357 536.009L371.291 435.563C368.898 434.052 365.73 435.364 365.107 438.124L323.657 621.627C322.694 625.886 316.625 625.886 315.663 621.627L274.213 438.124C273.589 435.364 270.422 434.052 268.029 435.563L108.963 536.009C105.271 538.34 100.98 534.049 103.311 530.357L203.757 371.291C205.268 368.898 203.956 365.73 201.195 365.107L17.6931 323.657C13.4338 322.694 13.4338 316.625 17.6931 315.663L201.195 274.213C203.956 273.589 205.268 270.422 203.757 268.029L103.311 108.963C100.98 105.271 105.271 100.98 108.963 103.311L268.029 203.757C270.422 205.268 273.589 203.956 274.213 201.195L315.663 17.6931Z" fill={getEmotionColor('신남')}/>
                      <circle cx="260.594" cy="263.941" r="56.5281" fill="#F5F5F5"/>
                      <circle cx="378.455" cy="263.941" r="56.5281" fill="#F5F5F5"/>
                      <mask id="mask0_excited_recording" style={{maskType:"alpha"}} maskUnits="userSpaceOnUse" x="204" y="207" width="114" height="114">
                        <circle cx="260.594" cy="263.941" r="56.5281" fill="#F5F5F5"/>
                      </mask>
                      <g mask="url(#mask0_excited_recording)">
                        {eyeAnimationState === 0 ? (
                          <circle cx="210.164" cy="263.944" r="56.5314" fill="#0A0A0A"/>
                        ) : (
                          <circle cx="60.4755" cy="60.4755" r="56.5314" transform="matrix(-1 0 0 1 369.41 203.4685)" fill="#0A0A0A"/>
                        )}
                      </g>
                      <mask id="mask1_excited_recording" style={{maskType:"alpha"}} maskUnits="userSpaceOnUse" x="321" y="207" width="114" height="114">
                        <circle cx="378.455" cy="263.941" r="56.5281" fill="#F5F5F5"/>
                      </mask>
                      <g mask="url(#mask1_excited_recording)">
                        {eyeAnimationState === 0 ? (
                          <circle cx="328.025" cy="263.944" r="56.5314" fill="#0A0A0A"/>
                        ) : (
                          <circle cx="60.4755" cy="60.4755" r="56.5314" transform="matrix(-1 0 0 1 491.188 203.4685)" fill="#0A0A0A"/>
                        )}
                      </g>
                      {eyeAnimationState === 0 ? (
                        <>
                          <path d="M282.977 274.6165C282.977 278.4115 281.364 282.5713 278.493 285.4425C275.622 288.3137 271.728 289.9268 267.667 289.9268C263.607 289.9268 259.712 288.3137 256.841 285.4425C253.9699 282.5713 252.3569 278.6771 252.3569 274.6165L267.667 274.6165H282.977Z" fill="#F5F5F5"/>
                          <path d="M400.839 274.6165C400.839 278.4115 399.227 282.5713 396.356 285.4425C393.485 288.3137 389.591 289.9268 385.53 289.9268C381.47 289.9268 377.575 288.3137 374.704 285.4425C371.833 282.5713 370.22 278.6771 370.22 274.6165L385.53 274.6165H400.839Z" fill="#F5F5F5"/>
                        </>
                      ) : (
                        <>
                          <path d="M236.122 274.6165C236.122 278.4115 237.7352 282.5713 240.6064 285.4425C243.4776 288.3137 247.3718 289.9268 251.4324 289.9268C255.493 289.9268 259.387 288.3137 262.258 285.4425C265.13 282.5713 266.743 278.6771 266.743 274.6165L251.4324 274.6165H236.122Z" fill="#F5F5F5"/>
                          <path d="M357.899 274.6165C357.899 278.4115 359.5122 282.5713 362.3834 285.4425C365.2546 288.3137 369.1488 289.9268 373.2094 289.9268C377.27 289.9268 381.1642 288.3137 384.0354 285.4425C386.9066 282.5713 388.5196 278.6771 388.5196 274.6165L373.2094 274.6165H357.899Z" fill="#F5F5F5"/>
                        </>
                      )}
                      <mask id="path-10-inside-1_excited_recording" fill="white">
                        <path d="M331.686 313.371C326.698 328.308 314.998 337.86 305.554 334.707C296.11 331.553 292.497 316.887 297.485 301.95L297.485 301.948L331.686 313.369L331.686 313.371Z"/>
                      </mask>
                      <path d="M331.686 313.371C326.698 328.308 314.998 337.86 305.554 334.707C296.11 331.553 292.497 316.887 297.485 301.95L297.485 301.948L331.686 313.369L331.686 313.371Z" fill="#0A0A0A"/>
                      <path d="M331.686 313.371L333.629 314.02L333.629 314.02L331.686 313.371ZM305.554 334.707L304.905 336.65L304.905 336.65L305.554 334.707ZM297.485 301.95L295.542 301.301L295.542 301.301L297.485 301.95ZM297.485 301.948L298.134 300.005L296.191 299.356L295.542 301.299L297.485 301.948ZM331.686 313.369L333.63 314.018L334.278 312.075L332.335 311.426L331.686 313.369ZM331.686 313.371L329.743 312.722C327.352 319.88 323.38 325.656 318.995 329.236C314.587 332.836 310.024 334.04 306.203 332.764L305.554 334.707L304.905 336.65C310.528 338.528 316.537 336.532 321.587 332.41C326.659 328.268 331.031 321.798 333.629 314.02L331.686 313.371ZM305.554 334.707L306.203 332.764C302.382 331.488 299.458 327.784 298.096 322.257C296.742 316.761 297.037 309.757 299.428 302.599L297.485 301.95L295.542 301.301C292.944 309.08 292.551 316.878 294.118 323.237C295.677 329.567 299.282 334.772 304.905 336.65L305.554 334.707ZM297.485 301.95L299.428 302.599L299.429 302.597L297.485 301.948L295.542 301.299L295.542 301.301L297.485 301.95ZM297.485 301.948L296.836 303.891L331.038 315.312L331.686 313.369L332.335 311.426L298.134 300.005L297.485 301.948ZM331.686 313.369L329.743 312.72L329.743 312.722L331.686 313.371L333.629 314.02L333.63 314.018L331.686 313.369Z" fill="black" mask="url(#path-10-inside-1_excited_recording)"/>
                    </svg>
                  </View>
                </View>
              )}
              
              {/* 감정 캐릭터 (놀람) */}
              {recordingData.emotion === '놀람' && (
                <View style={styles.surpriseEmotionCharacterContainer}>
                  {/* 놀람 캐릭터 SVG 전체 */}
                  <View style={styles.surpriseCharacterWrapper}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="711" height="676" viewBox="104 112 711 676" fill="none">
                      <g clipPath="url(#clip0_1373_1361_surprise_recording)">
                        <path d="M356.24 212.801C388.742 112.771 530.258 112.771 562.76 212.801C577.295 257.536 618.983 287.824 666.02 287.824C771.198 287.824 814.929 422.414 729.838 484.236C691.784 511.883 675.861 560.89 690.396 605.625C722.898 705.655 608.409 788.836 523.318 727.014C485.264 699.367 433.736 699.367 395.682 727.014C310.591 788.836 196.102 705.655 228.604 605.625C243.139 560.89 227.216 511.883 189.162 484.236C104.071 422.414 147.802 287.824 252.98 287.824C300.017 287.824 341.705 257.536 356.24 212.801Z" fill="#F99841"/>
                        <mask id="path-2-inside-1_surprise_recording" fill="white">
                          <path d="M459.853 419.084C455.762 403.817 460.271 389.344 469.923 386.758C479.576 384.171 490.717 394.451 494.807 409.718L494.808 409.719L459.853 419.085L459.853 419.084Z"/>
                        </mask>
                        <path d="M459.853 419.084C455.762 403.817 460.271 389.344 469.923 386.758C479.576 384.171 490.717 394.451 494.807 409.718L494.808 409.719L459.853 419.085L459.853 419.084Z" fill="#0A0A0A"/>
                        <path d="M469.923 386.758L469.035 383.444L469.035 383.444L469.923 386.758ZM494.808 409.719L495.695 413.032L499.009 412.144L498.121 408.831L494.808 409.719ZM459.853 419.085L456.54 419.973L457.427 423.286L460.741 422.398L459.853 419.085ZM459.853 419.084L463.167 418.196C461.263 411.092 461.409 404.326 463.01 399.186C464.626 393.997 467.521 390.953 470.811 390.071L469.923 386.758L469.035 383.444C462.673 385.149 458.488 390.635 456.459 397.146C454.416 403.705 454.352 411.81 456.539 419.972L459.853 419.084ZM469.923 386.758L470.811 390.071C474.101 389.19 478.13 390.379 482.125 394.064C486.081 397.715 489.59 403.501 491.494 410.606L494.807 409.718L498.121 408.83C495.934 400.668 491.827 393.681 486.777 389.022C481.765 384.397 475.398 381.739 469.035 383.444L469.923 386.758ZM494.807 409.718L491.494 410.606L491.494 410.607L494.808 409.719L498.121 408.831L498.121 408.83L494.807 409.718ZM494.808 409.719L493.92 406.405L458.965 415.771L459.853 419.085L460.741 422.398L495.695 413.032L494.808 409.719ZM459.853 419.085L463.167 418.197L463.167 418.196L459.853 419.084L456.539 419.972L456.54 419.973L459.853 419.085Z" fill="black" mask="url(#path-2-inside-1_surprise_recording)"/>
                        <circle cx="55.9859" cy="55.9859" r="55.9859" transform="matrix(-1 0 0 1 585.338 295.333)" fill="#F5F5F5"/>
                        <circle cx="55.9859" cy="55.9859" r="55.9859" transform="matrix(-1 0 0 1 468.607 295.332)" fill="#F5F5F5"/>
                        <mask id="mask0_1373_1361_surprise_recording" style={{maskType:"alpha"}} maskUnits="userSpaceOnUse" x="473" y="295" width="113" height="113">
                          <circle cx="55.9859" cy="55.9859" r="55.9859" transform="matrix(-1 0 0 1 585.338 295.332)" fill="#F5F5F5"/>
                        </mask>
                        <g mask="url(#mask0_1373_1361_surprise_recording)">
                          {eyeAnimationState === 0 ? (
                            <circle cx="55.9891" cy="55.9891" r="55.9891" transform="matrix(-1 0 0 1 632.03 295.332)" fill="#0A0A0A"/>
                          ) : (
                            <circle cx="55.9891" cy="55.9891" r="55.9891" transform="matrix(-1 0 0 1 538.646 295.332)" fill="#0A0A0A"/>
                          )}
                        </g>
                        <mask id="mask1_1373_1361_surprise_recording" style={{maskType:"alpha"}} maskUnits="userSpaceOnUse" x="356" y="295" width="113" height="113">
                          <circle cx="55.9859" cy="55.9859" r="55.9859" transform="matrix(-1 0 0 1 468.607 295.332)" fill="#F5F5F5"/>
                        </mask>
                        <g mask="url(#mask1_1373_1361_surprise_recording)">
                          {eyeAnimationState === 0 ? (
                            <circle cx="55.9891" cy="55.9891" r="55.9891" transform="matrix(-1 0 0 1 515.3 295.332)" fill="#0A0A0A"/>
                          ) : (
                            <circle cx="55.9891" cy="55.9891" r="55.9891" transform="matrix(-1 0 0 1 421.914 295.332)" fill="#0A0A0A"/>
                          )}
                        </g>
                        <path d="M515.629 361.202C515.629 364.961 517.123 368.566 519.781 371.225C522.439 373.883 526.045 375.376 529.804 375.376C533.563 375.376 537.169 373.883 539.827 371.225C542.485 368.566 543.978 364.961 543.978 361.202L529.804 361.202H515.629Z" fill="#F5F5F5"/>
                        <path d="M425.247 361.202C425.247 364.961 423.753 368.566 421.095 371.225C418.437 373.883 414.832 375.376 411.072 375.376C407.313 375.376 403.708 373.883 401.050 371.225C398.392 368.566 396.898 364.961 396.898 361.202L411.072 361.202H425.247Z" fill="#F5F5F5"/>
                      </g>
                      <defs>
                        <clipPath id="clip0_1373_1361_surprise_recording">
                          <rect x="104" y="112" width="711" height="676" fill="white"/>
                        </clipPath>
                      </defs>
                    </svg>
                  </View>
                </View>
              )}
              
              {/* 감정 캐릭터 (보통) */}
              {recordingData.emotion === '보통' && (
                <View style={styles.normalEmotionCharacterContainer}>
                  <View style={styles.normalCharacterWrapper}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="632" height="632" viewBox="0 0 632 632" fill="none">
                      <path d="M295.13 15.1627C307.575 6.12142 324.425 6.12142 336.87 15.1627L595.664 203.188C608.108 212.229 613.316 228.255 608.562 242.884L509.712 547.116C504.958 561.745 491.326 571.649 475.944 571.649H156.056C140.674 571.649 127.042 561.745 122.288 547.116L23.4377 242.884C18.6844 228.255 23.8916 212.229 36.3358 203.188L295.13 15.1627Z" fill={getEmotionColor('보통')}/>
                      <line x1="301.071" y1="319.318" x2="330.929" y2="319.318" stroke="#0A0A0A" strokeWidth="8.29396" strokeLinecap="round"/>
                      <circle cx="55.7063" cy="55.7063" r="55.7063" transform="matrix(-1 0 0 1 429.988 177.291)" fill="#F5F5F5"/>
                      <circle cx="55.7063" cy="55.7063" r="55.7063" transform="matrix(-1 0 0 1 313.84 177.291)" fill="#F5F5F5"/>
                      <mask id="mask0_1373_1493_recording" style={{maskType:"alpha"}} maskUnits="userSpaceOnUse" x="318" y="177" width="112" height="112">
                        <circle cx="55.7063" cy="55.7063" r="55.7063" transform="matrix(-1 0 0 1 429.988 177.291)" fill="#F5F5F5"/>
                      </mask>
                      <g mask="url(#mask0_1373_1493_recording)">
                        {eyeAnimationState === 0 ? (
                          <circle cx="55.7095" cy="55.7095" r="55.7095" transform="matrix(-1 0 0 1 476.447 177.291)" fill="#0A0A0A"/>
                        ) : (
                          <circle cx="55.7095" cy="55.7095" r="55.7095" transform="matrix(-1 0 0 1 383.529 177.291)" fill="#0A0A0A"/>
                        )}
                      </g>
                      <mask id="mask1_1373_1493_recording" style={{maskType:"alpha"}} maskUnits="userSpaceOnUse" x="202" y="177" width="112" height="112">
                        <circle cx="55.7063" cy="55.7063" r="55.7063" transform="matrix(-1 0 0 1 313.84 177.291)" fill="#F5F5F5"/>
                      </mask>
                      <g mask="url(#mask1_1373_1493_recording)">
                        {eyeAnimationState === 0 ? (
                          <circle cx="55.7095" cy="55.7095" r="55.7095" transform="matrix(-1 0 0 1 360.299 177.291)" fill="#0A0A0A"/>
                        ) : (
                          <circle cx="55.7095" cy="55.7095" r="55.7095" transform="matrix(-1 0 0 1 267.381 177.291)" fill="#0A0A0A"/>
                        )}
                      </g>
                      <path d="M360.663 242.831C360.663 246.572 362.149 250.159 364.794 252.804C367.439 255.449 371.026 256.935 374.766 256.935C378.507 256.935 382.094 255.449 384.739 252.804C387.384 250.159 388.87 246.572 388.87 242.831L374.766 242.831H360.663Z" fill="#F5F5F5"/>
                      <path d="M244.514 242.831C244.514 246.572 246 250.159 248.645 252.804C251.29 255.449 254.877 256.935 258.618 256.935C262.358 256.935 265.945 255.449 268.59 252.804C271.235 250.159 272.721 246.572 272.721 242.831L258.618 242.831H244.514Z" fill="#F5F5F5"/>
                    </svg>
                  </View>
                </View>
              )}
              
              {/* 감정 캐릭터 (화남) */}
              {recordingData.emotion === '화남' && (
                <View style={styles.angryEmotionCharacterContainer}>
                  <View style={styles.angryCharacterWrapper}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="791" height="557" viewBox="0 0 791 557" fill="none">
                      <path d="M419.629 535.046C412.208 545.738 396.689 546.544 388.2 536.679L24.6902 114.256C14.2364 102.108 21.6991 83.2169 37.633 81.4933L747.652 4.68908C764.609 2.85486 775.864 21.8074 766.139 35.8185L419.629 535.046Z" fill={getEmotionColor('화남')}/>
                      <path d="M412.686 268.128C412.686 248.933 378.136 247.973 378.136 268.128" stroke="#0A0A0A" strokeWidth="9.59736" strokeLinecap="round"/>
                      <g clipPath="url(#clip0_1373_1507_angry_recording)">
                        {eyeAnimationState === 0 ? (
                          // 기본 눈 (큰 눈)
                          <>
                            <path d="M396.885 188.442C396.885 196.905 395.218 205.285 391.98 213.104C388.741 220.922 383.994 228.026 378.01 234.01C372.026 239.994 364.922 244.741 357.104 247.98C349.285 251.218 340.905 252.885 332.442 252.885C323.98 252.885 315.6 251.218 307.781 247.98C299.963 244.741 292.859 239.994 286.875 234.01C280.891 228.026 276.144 220.922 272.905 213.104C269.667 205.285 268 196.905 268 188.442L332.442 188.442H396.885Z" fill="#F5F5F5"/>
                            <path d="M525.488 188.442C525.488 196.905 523.822 205.285 520.583 213.104C517.345 220.922 512.598 228.026 506.614 234.01C500.63 239.994 493.526 244.741 485.707 247.98C477.889 251.218 469.509 252.885 461.046 252.885C452.583 252.885 444.203 251.218 436.385 247.98C428.566 244.741 421.462 239.994 415.478 234.01C409.494 228.026 404.747 220.922 401.509 213.104C398.27 205.285 396.604 196.905 396.604 188.442L461.046 188.442H525.488Z" fill="#F5F5F5"/>
                            <path d="M372.622 189.025C372.622 194.318 371.579 199.56 369.553 204.45C367.528 209.341 364.559 213.784 360.815 217.527C357.072 221.27 352.629 224.24 347.738 226.265C342.848 228.291 337.606 229.334 332.313 229.334C327.019 229.334 321.778 228.291 316.887 226.265C311.997 224.24 307.553 221.27 303.81 217.527C300.067 213.784 297.098 209.341 295.072 204.45C293.047 199.56 292.004 194.318 292.004 189.025L332.313 189.025H372.622Z" fill="#0A0A0A"/>
                            <path d="M500.945 189.025C500.945 194.318 499.903 199.56 497.877 204.45C495.851 209.341 492.882 213.784 489.139 217.527C485.396 221.27 480.953 224.24 476.062 226.265C471.172 228.291 465.93 229.334 460.637 229.334C455.343 229.334 450.101 228.291 445.211 226.265C440.32 224.24 435.877 221.27 432.134 217.527C428.391 213.784 425.422 209.341 423.396 204.45C421.37 199.56 420.328 194.318 420.328 189.025L460.637 189.025H500.945Z" fill="#0A0A0A"/>
                            <path d="M308.308 203.658C308.308 207.985 306.589 212.135 303.53 215.195C300.47 218.254 296.32 219.973 291.993 219.973C287.666 219.973 283.516 218.254 280.456 215.195C277.396 212.135 275.677 207.985 275.677 203.658L291.993 203.658H308.308Z" fill="#F5F5F5"/>
                            <path d="M442.671 203.658C442.671 207.985 440.952 212.135 437.892 215.195C434.833 218.254 430.683 219.973 426.356 219.973C422.028 219.973 417.878 218.254 414.819 215.195C411.759 212.135 410.04 207.985 410.04 203.658L426.356 203.658H442.671Z" fill="#F5F5F5"/>
                          </>
                        ) : (
                          // 깜빡이는 눈 (작은 눈)
                          <>
                            <path d="M140.885 19.4425C140.885 27.9052 139.218 36.285 135.98 44.1035C132.741 51.9221 127.994 59.0261 122.01 65.0102C116.026 70.9942 108.922 75.741 101.104 78.9795C93.285 82.2181 84.9052 83.8849 76.4425 83.8849C67.9798 83.8849 59.5999 82.2181 51.7814 78.9795C43.9629 75.741 36.8588 70.9942 30.8748 65.0102C24.8907 59.0261 20.1439 51.9221 16.9054 44.1035C13.6669 36.285 12 27.9052 12 19.4425L76.4425 19.4425H140.885Z" fill="#F5F5F5" transform="translate(256 169)"/>
                            <path d="M269.489 19.4425C269.489 27.9052 267.822 36.285 264.583 44.1035C261.345 51.9221 256.598 59.0261 250.614 65.0102C244.63 70.9942 237.526 75.741 229.707 78.9795C221.889 82.2181 213.509 83.8849 205.046 83.8849C196.584 83.8849 188.204 82.2181 180.385 78.9795C172.567 75.741 165.463 70.9942 159.479 65.0102C153.494 59.0261 148.748 51.9221 145.509 44.1035C142.271 36.285 140.604 27.9052 140.604 19.4425L205.046 19.4425H269.489Z" fill="#F5F5F5" transform="translate(256 169)"/>
                            <path d="M138.944 20.0247C138.944 25.3182 137.902 30.5598 135.876 35.4503C133.85 40.3408 130.881 44.7844 127.138 48.5274C123.395 52.2704 118.951 55.2396 114.061 57.2653C109.17 59.291 103.929 60.3336 98.6353 60.3336C93.3419 60.3336 88.1003 59.291 83.2098 57.2653C78.3193 55.2396 73.8756 52.2704 70.1326 48.5274C66.3896 44.7844 63.4205 40.3408 61.3947 35.4503C59.369 30.5598 58.3264 25.3182 58.3264 20.0247L98.6353 20.0247H138.944Z" fill="#0A0A0A" transform="translate(256 169)"/>
                            <path d="M266.905 20.0247C266.905 25.3182 265.863 30.5598 263.837 35.4503C261.811 40.3408 258.842 44.7844 255.099 48.5274C251.356 52.2704 246.913 55.2396 242.022 57.2653C237.132 59.291 231.89 60.3336 226.596 60.3336C221.303 60.3336 216.061 59.291 211.171 57.2653C206.28 55.2396 201.837 52.2704 198.094 48.5274C194.351 44.7844 191.382 40.3408 189.356 35.4503C187.33 30.5598 186.288 25.3182 186.288 20.0247L226.596 20.0247H266.905Z" fill="#0A0A0A" transform="translate(256 169)"/>
                            <path d="M74.631 34.6578C74.631 38.9849 72.9121 43.1348 69.8523 46.1946C66.7926 49.2543 62.6426 50.9733 58.3155 50.9733C53.9884 50.9733 49.8385 49.2543 46.7787 46.1946C43.719 43.1348 42 38.9849 42 34.6578L58.3155 34.6578H74.631Z" fill="#F5F5F5" transform="translate(256 169)"/>
                            <path d="M208.631 34.6578C208.631 38.9849 206.912 43.1348 203.852 46.1946C200.793 49.2543 196.643 50.9733 192.316 50.9733C187.988 50.9733 183.838 49.2543 180.779 46.1946C177.719 43.1348 176 38.9849 176 34.6578L192.316 34.6578H208.631Z" fill="#F5F5F5" transform="translate(256 169)"/>
                          </>
                        )}
                      </g>
                      <defs>
                        <clipPath id="clip0_1373_1507_angry_recording">
                          <rect width="279" height="92" fill="white" transform="translate(256 169)"/>
                        </clipPath>
                      </defs>
                    </svg>
                  </View>
                </View>
              )}
            </View>
            
            {/* 두 번째 화면: 상세 정보 화면 */}
            <View style={styles.savedBottomScreen}>
              {/* 하이라이트 시간 초기화 (녹음 완료 화면 진입 시) */}
              {(() => {
                if (recordingData.highlight_time && result && highlightTimeSeconds === 0) {
                  const initialHighlightSeconds = parseHighlightTime(recordingData.highlight_time);
                  setHighlightTimeSeconds(initialHighlightSeconds);
                }
                return null;
              })()}
              {/* 사용자 정보 영역 - 이름과 업로드 버튼 */}
              <View style={styles.savedUserContainer}>
                <View style={styles.savedUserAvatar}>
                  <Text style={styles.savedUserAvatarText}>
                    {recordingData.user_name.charAt(0)}
                  </Text>
                </View>
                <Text style={styles.savedUserName}>{recordingData.user_name}</Text>
                <TouchableOpacity style={styles.uploadButton} onPress={handleUpload}>
                  <Text style={styles.uploadButtonText}>업로드</Text>
                </TouchableOpacity>
              </View>
              
              {/* 감정과 키워드 (인라인으로 표시) */}
              <View style={styles.savedContentContainer}>
                <View style={styles.savedContentTextContainer}>
                  <Text style={styles.savedNormalText}>오늘은 </Text>
                  <View style={[styles.savedEmotionTagInline, { backgroundColor: getEmotionColor(recordingData.emotion) }]}>
                    <Text style={styles.savedEmotionTextInline}>{recordingData.emotion}</Text>
                  </View>
                </View>
                {/* 키워드만 표시 (최대 2개) */}
                {recordingData.keywords && recordingData.keywords.length > 0 && (
                  <View style={styles.savedKeywordsContainer}>
                    {recordingData.keywords.slice(0, 2).map((keyword, index) => (
                      <View 
                        key={index} 
                        style={[styles.savedKeywordTagInline, { backgroundColor: getEmotionColor(recordingData.emotion) }]}
                      >
                        <Text style={styles.savedKeywordTextInline}>{keyword}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {/* 위치 정보 표시 (키워드처럼 배경색 추가) */}
                {recordingData.district && (
                  <View style={styles.locationContainer}>
                    <View style={[styles.locationTag, { backgroundColor: getEmotionColor(recordingData.emotion) }]}>
                      <Text style={styles.locationText}>{recordingData.district}</Text>
                    </View>
                    <Text style={styles.savedNormalText}>에서</Text>
                  </View>
                )}
              </View>
              
              {/* 재생 바 - 두 번째 화면 하단에서 238 떨어진 위치 */}
              <View 
                ref={highlightBarRef}
                style={styles.savedTouchableArea}
                {...(Platform.OS === 'web' ? {
                  // @ts-ignore - 웹 전용 이벤트
                  onMouseDown: handlePointerDown,
                  onTouchStart: handlePointerDown,
                } : {
                  onTouchStart: handlePointerDown,
                })}
              >
                {/* 실제 보이는 얇은 바 */}
                <View style={styles.savedWaveBar} />
                
                {/* 하이라이트 마커 (있으면 표시) - 드래그 가능 */}
                {recordingData.highlight_time && result && (() => {
                  // 드래그 중이면 highlightTimeSeconds 사용, 아니면 저장된 highlight_time 사용
                  const currentHighlightSeconds = isDragging ? highlightTimeSeconds : parseHighlightTime(recordingData.highlight_time);
                  const totalSeconds = Math.max(result.duration, 1);
                  // 마커가 화면 밖으로 나가지 않도록 범위 조정
                  const usableWidth = TIMELINE_WIDTH - MARKER_SIZE;
                  const markerPosition = MARKER_SIZE / 2 + (currentHighlightSeconds / totalSeconds) * usableWidth;
                  
                  return (
                    <View 
                      style={[
                        styles.savedHighlightMarker,
                        {
                          left: markerPosition - MARKER_SIZE / 2, // 마커 중심 정렬
                        }
                      ]}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="38" height="38" viewBox="0 0 38 38" fill="none" style={{ pointerEvents: 'none' }}>
                        <circle cx="19.0022" cy="19.0022" r="19.0022" fill="#FFD630"/>
                        <g filter="url(#filter0_d_266_160)">
                          <path d="M17.5744 9.5735C18.0234 8.19153 19.9785 8.19153 20.4276 9.5735L21.7668 13.6954C21.9677 14.3134 22.5436 14.7318 23.1934 14.7318H27.5274C28.9805 14.7318 29.5847 16.5913 28.4091 17.4454L24.9028 19.9928C24.3771 20.3748 24.1571 21.0519 24.3579 21.6699L25.6972 25.7918C26.1462 27.1737 24.5645 28.3229 23.3889 27.4688L19.8827 24.9214C19.3569 24.5394 18.645 24.5394 18.1193 24.9214L14.613 27.4688C13.4375 28.3229 11.8557 27.1737 12.3048 25.7918L13.644 21.6699C13.8448 21.0518 13.6249 20.3748 13.0991 19.9928L9.59285 17.4454C8.41728 16.5913 9.02145 14.7318 10.4745 14.7318H14.8085C15.4584 14.7318 16.0343 14.3134 16.2351 13.6954L17.5744 9.5735Z" fill="#0C0B0D"/>
                        </g>
                        <defs>
                          <filter id="filter0_d_266_160" x="4.97168" y="7.53705" width="28.0586" height="27.225" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                            <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
                            <feOffset dy="3"/>
                            <feGaussianBlur stdDeviation="2"/>
                            <feComposite in2="hardAlpha" operator="out"/>
                            <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/>
                            <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_266_160"/>
                            <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_266_160" result="shape"/>
                          </filter>
                        </defs>
                      </svg>
                    </View>
                  );
                })()}
              </View>
              
              {/* 저장 버튼 - 첫 화면 탑부터 1526, 두 번째 화면 하단에서 132 */}
              <View style={styles.savedButtonContainer}>
                <TouchableOpacity
                  style={styles.savedButton}
                  onPress={handleFinalSave}
                >
                  <Text style={styles.savedButtonText}>저장</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
          
          {/* 하단 네비게이션 바 */}
          <NavigationBar 
            onNavigateToRecords={() => navigation.navigate('Records')} 
            onNavigateToRecording={() => navigation.navigate('Recording')} 
            onNavigateToProfile={() => navigation.navigate('Profile')}
            onNavigateToFeed={() => navigation.navigate('Feed')}
            onNavigateToArchive={() => navigation.navigate('Archive')}
            currentPage="Recording" 
          />
        </View>
      )}

      {/* 하단 네비게이션 바 */}
      {!showKeywords && !showHighlight && !showSaved && (
        <NavigationBar 
          onNavigateToRecords={() => navigation.navigate('Records')} 
          onNavigateToRecording={() => navigation.navigate('Recording')} 
          onNavigateToProfile={() => navigation.navigate('Profile')} 
          onNavigateToFeed={() => navigation.navigate('Feed')}
          onNavigateToArchive={() => navigation.navigate('Archive')}
          currentPage="Recording" 
        />
      )}

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    width: screenWidth,
    height: screenHeight,
    backgroundColor: '#0A0A0A',
    position: 'relative',
  },
  frame: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 390,
    height: 844,
    backgroundColor: '#0A0A0A',
  },
  dateContainer: {
    position: 'absolute',
    left: 24,
    top: 158,
  },
  dateText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 0.64,
  },
  mainTextContainer: {
    position: 'absolute',
    left: 24,
    top: 222,
  },
  mainText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 0.64,
  },
  timeContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 523,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeText: {
    color: '#F5F5F5',
    fontSize: 28,
    fontWeight: '600',
    letterSpacing: 0.56,
    textAlign: 'center',
    fontFamily: Platform.OS === 'web' ? 'Pretendard' : undefined,
  },
  waveContainer: {
    position: 'absolute',
    top: 603,
    width: 393,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible', // 웨이브 애니메이션을 위해 overflow 허용
  },
  transcriptContainer: {
    position: 'absolute',
    left: 24,
    right: 24,
    top: 380,
    maxHeight: 200,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
  },
  transcriptScroll: {
    maxHeight: 200,
  },
  transcriptText: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 24,
  },
  recordingButtonContainer: {
    position: 'absolute',
    left: '50%',
    top: 652,
    transform: [{ translateX: -32 }],
  },
  recordingButton: {
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  recordingButtonActive: {
    // 녹음 중 애니메이션 효과를 위한 스타일
  },
  recordingIconContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -12 }, { translateY: -12 }], // 24x24 아이콘의 절반
  },
  // 모달 스타일
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#1C1C1C',
    borderRadius: 20,
    padding: 24,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  resultSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#B780FF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  resultScroll: {
    maxHeight: 150,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
  },
  resultText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
  },
  keywordsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  keywordTag: {
    backgroundColor: '#B780FF',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  keywordText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  noKeywordsText: {
    color: '#999999',
    fontSize: 14,
    fontStyle: 'italic',
  },
  infoSection: {
    marginBottom: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  infoText: {
    color: '#999999',
    fontSize: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButton: {
    backgroundColor: '#B780FF',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  completedTimeContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 523, // 초기 화면 timeContainer와 동일한 위치
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedTimeText: {
    color: '#F5F5F5',
    fontSize: 28,
    fontWeight: '600',
    letterSpacing: 0.56,
    textAlign: 'center',
    fontFamily: Platform.OS === 'web' ? 'Pretendard' : undefined,
  },
  completedWaveContainer: {
    position: 'absolute',
    top: 603, // 초기 화면과 동일한 위치
    width: 393,
    height: 5,
    overflow: 'hidden',
  },
  completedButtonsContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 674,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryButton: {
    backgroundColor: '#F5F5F5',
    borderRadius: 50,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    flexDirection: 'row',
  },
  retryButtonText: {
    color: '#0B0B0C',
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: 0.44,
    lineHeight: 22,
    textAlign: 'center',
    fontFamily: Platform.OS === 'web' ? 'Pretendard' : undefined,
  },
  nextButton: {
    backgroundColor: '#B780FF',
    borderRadius: 50,
    paddingHorizontal: 32,
    paddingVertical: 10,
    minWidth: 108,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    flexDirection: 'row',
  },
  nextButtonDisabled: {
    backgroundColor: '#A7A7A7',
  },
  nextButtonText: {
    color: '#0B0B0C',
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: 0.44,
    lineHeight: 22,
    textAlign: 'center',
    fontFamily: Platform.OS === 'web' ? 'Pretendard' : undefined,
    flexShrink: 0,
  },
  // 키워드 화면 스타일
  keywordsScreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: screenWidth,
    height: screenHeight,
    backgroundColor: '#000000',
  },
  keywordsTitle: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 0.64,
    fontFamily: Platform.OS === 'web' ? 'Pretendard' : undefined,
  },
  keywordsTagsContainer: {
    position: 'absolute',
    left: 24,
    top: 230,
    right: 24,
    maxHeight: 290, // 시간 표시 위까지의 높이 (539.5 - 230 - 약간의 여유)
  },
  keywordsTagsContent: {
    flexDirection: 'column',
  },
  emotionKeywordTag: {
    backgroundColor: '#FFD630',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start', // 내용에 맞게 너비 조정
    marginBottom: 10, // 태그 간 간격
  },
  emotionKeywordText: {
    color: '#000000',
    fontSize: 32,
    fontWeight: '600',
    letterSpacing: 1.28,
    textAlign: 'center',
    fontFamily: Platform.OS === 'web' ? 'Pretendard' : undefined,
  },
  keywordsTimeContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 539.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keywordsTimeText: {
    color: '#F5F5F5',
    fontSize: 28,
    fontWeight: '600',
    letterSpacing: 0.56,
    textAlign: 'center',
    fontFamily: Platform.OS === 'web' ? 'Pretendard' : undefined,
  },
  keywordsWaveContainer: {
    position: 'absolute',
    top: 603,
    width: 393,
    height: 5,
    overflow: 'hidden',
  },
  keywordsButtonsContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 674,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    backgroundColor: '#F5F5F5',
    borderRadius: 50,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    flexDirection: 'row',
  },
  backButtonText: {
    color: '#0B0B0C',
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: 0.44,
    lineHeight: 22,
    textAlign: 'center',
    fontFamily: Platform.OS === 'web' ? 'Pretendard' : undefined,
  },
  keywordsNextButton: {
    backgroundColor: '#B780FF',
    borderRadius: 50,
    paddingHorizontal: 32,
    paddingVertical: 10,
    width: 108,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    flexDirection: 'row',
  },
  keywordsNextButtonText: {
    color: '#0B0B0C',
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: 0.44,
    lineHeight: 22,
    textAlign: 'center',
    fontFamily: Platform.OS === 'web' ? 'Pretendard' : undefined,
  },
  // 하이라이트 설정 화면 스타일
  highlightScreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: screenWidth,
    height: screenHeight,
    backgroundColor: '#0A0A0A',
  },
  highlightTitle: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 0.64,
    fontFamily: Platform.OS === 'web' ? 'Pretendard' : undefined,
  },
  highlightMarkerContainer: {
    position: 'absolute',
    top: (TOUCH_AREA_HEIGHT - MARKER_SIZE) / 2, // 터치 영역 중앙에 위치
    width: MARKER_SIZE,
    height: MARKER_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none', // 마커는 터치 안받음
  },
  highlightMarker: {
    width: MARKER_SIZE,
    height: MARKER_SIZE,
    flexShrink: 0,
  },
  // 하이라이트 타임라인 컨테이너 (하이라이트 수정 화면과 동일)
  highlightTimelineContainer: {
    position: 'absolute',
    left: 0,
    top: 603,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 핵심: 터치 가능한 큰 영역! (하이라이트 수정 화면과 동일)
  highlightTouchableArea: {
    width: TIMELINE_WIDTH,
    height: TOUCH_AREA_HEIGHT, // 44px!
    justifyContent: 'center',
    position: 'relative',
    cursor: 'pointer',
  },
  // 실제 보이는 얇은 바 (하이라이트 수정 화면과 동일)
  highlightTimelineBar: {
    width: TIMELINE_WIDTH,
    height: TIMELINE_HEIGHT, // 5px
    backgroundColor: '#B780FF',
    position: 'absolute',
    alignSelf: 'center',
  },
  highlightTimeContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateY: -40 }],
  },
  highlightTimeInput: {
    color: '#F5F5F5',
    fontSize: 80,
    fontWeight: '600',
    letterSpacing: 1.6,
    textAlign: 'center',
    fontFamily: Platform.OS === 'web' ? 'Pretendard' : undefined,
    minWidth: 200,
    padding: 0,
    borderWidth: 0,
  },
  highlightButtonsContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 674,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipButton: {
    backgroundColor: '#F5F5F5',
    borderRadius: 50,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    flexDirection: 'row',
  },
  skipButtonText: {
    color: '#0B0B0C',
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: 0.44,
    lineHeight: 22,
    textAlign: 'center',
    fontFamily: Platform.OS === 'web' ? 'Pretendard' : undefined,
  },
  highlightNextButton: {
    backgroundColor: '#B780FF',
    borderRadius: 50,
    paddingHorizontal: 32,
    paddingVertical: 10,
    width: 108,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    flexDirection: 'row',
  },
  highlightNextButtonText: {
    color: '#0B0B0C',
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: 0.44,
    lineHeight: 22,
    textAlign: 'center',
    fontFamily: Platform.OS === 'web' ? 'Pretendard' : undefined,
  },
  // 저장 완료 화면 스타일
  savedScreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: screenWidth,
    height: screenHeight,
    backgroundColor: '#0A0A0A',
  },
  savedTitle: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 0.64,
    fontFamily: Platform.OS === 'web' ? 'Pretendard' : undefined,
  },
  emotionCharacterContainer: {
    position: 'absolute',
    left: -102,
    top: 318,
    width: 598,
    height: 598,
  },
  sadEmotionCharacterContainer: {
    position: 'absolute',
    left: -1, // Figma 기준: left: -1px
    top: 318,
    width: 598,
    height: 856.632, // 슬픔일 때 높이 증가
    overflow: 'hidden',
  },
  characterCircleBackground: {
    position: 'absolute',
    width: 598,
    height: 598,
    borderRadius: 299,
    backgroundColor: '#FED046',
    left: 0,
    top: 0,
  },
  sadCharacterBackground: {
    position: 'absolute',
    left: 0, // Figma 기준: left: -1px (container 기준으로는 0)
    top: 0,
    width: 395.049,
    height: 856.632,
    borderRadius: 24.95,
    backgroundColor: '#47AFF4',
  },
  characterWrapper: {
    position: 'absolute',
    left: 104.25,
    top: 162, // 화면 기준 top: 480이 되도록 (480 - 318 = 162)
    width: 337,
    height: 138,
  },
  characterEyesContainer: {
    width: 337,
    height: 138,
    paddingRight: 44.971,
    paddingBottom: 8.056,
    paddingLeft: 45,
    justifyContent: 'center',
    alignItems: 'center',
  },
  characterMouthContainer: {
    position: 'absolute',
    // 화면 기준 top: 291.68
    // emotionCharacterContainer 기준: 291.68 - 318 = -26.32
    // characterWrapper 기준: -26.32 - 162 = -188.32
    // 하지만 입이 characterWrapper 내부에 있으므로, characterWrapper 기준으로 계산
    // Figma에서 입의 위치: left: 151.22, top: 609.68 (캐릭터 컨테이너 기준)
    // characterWrapper는 left: 104.25, top: 162 (emotionCharacterContainer 기준)
    // 따라서 입의 위치: left: 151.22 - 104.25 = 46.97
    // top: 291.68 - 318 - 162 = -188.32 (음수이므로 절대 위치로 설정)
    left: 149.22, // 151.22 - 104.25
    top: 129.68, // 화면 기준 291.68에서 characterWrapper의 상대 위치 계산
    width: 42,
    height: 23,
  },
  sadCharacterWrapper: {
    position: 'absolute',
    top: 55, // Figma 기준: top: 373px - container top 318px = 55px
    width: 393, // SVG viewBox width
    height: 534, // SVG viewBox height
    justifyContent: 'center',
    alignItems: 'center',
  },
  excitedEmotionCharacterContainer: {
    position: 'absolute',
    left: -21, // 더 왼쪽으로 이동 (슬픔 캐릭터 left: -1보다 20px 더 왼쪽)
    top: 298, // 더 위로 이동 (기존 318에서 20px 위로)
    width: 598,
    height: 640, // 신남일 때 높이 (640 viewBox)
    overflow: 'hidden',
  },
  excitedCharacterWrapper: {
    position: 'absolute',
    left: -188, // 더 왼쪽으로 이동
    top: -10, // 더 위로 이동
    width: 640, // SVG viewBox width
    height: 640, // SVG viewBox height
    justifyContent: 'center',
    alignItems: 'center',
  },
  surpriseEmotionCharacterContainer: {
    position: 'absolute',
    left: -102,
    top: 298, // 놀람 캐릭터만 top: 280 적용
    width: 598,
    height: 598,
    overflow: 'hidden',
  },
  surpriseCharacterWrapper: {
    position: 'absolute',
    top: 0,
    left: -138,
    width: 628,
    height: 658,
    justifyContent: 'center',
    alignItems: 'center',
  },
  angryEmotionCharacterContainer: {
    position: 'absolute',
    left: -199,
    top: 332,
    width: 791,
    height: 557,
    overflow: 'hidden',
  },
  angryCharacterWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 791,
    height: 557,
    justifyContent: 'center',
    alignItems: 'center',
  },
  normalEmotionCharacterContainer: {
    position: 'absolute',
    left: -48,
    top: 294,
    width: 632,
    height: 632,
    overflow: 'hidden',
  },
  normalCharacterWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 632,
    height: 632,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emotionCharacter: {
    width: 598,
    height: 598,
    position: 'relative',
  },
  characterCircle: {
    width: 598,
    height: 598,
    borderRadius: 299,
    backgroundColor: '#FFD630',
    justifyContent: 'center',
    alignItems: 'center',
  },
  characterEmoji: {
    fontSize: 200,
  },
  savedUserContainer: {
    paddingHorizontal: 24.25,
    paddingTop: 118, // 헤더 아래부터 시작
    flexDirection: 'row',
    alignItems: 'center',
  },
  savedEmotionContainer: {
    paddingHorizontal: 24.25,
    paddingTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  savedEmotionTag: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedEmotionTagText: {
    color: '#000000',
    fontSize: 32,
    fontWeight: '600',
    letterSpacing: 1.28,
    fontFamily: Platform.OS === 'web' ? 'Pretendard' : undefined,
  },
  savedUserAvatar: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#C4C4C4', // 프로필 스크린과 동일한 배경색
    justifyContent: 'center',
    alignItems: 'center',
  },
  savedUserAvatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
  savedUserName: {
    color: '#F5F5F5',
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 0.4,
    textAlign: 'center',
    flex: 1, // 나머지 공간 차지
    marginRight: 157, // 업로드 버튼과의 간격
    fontFamily: Platform.OS === 'web' ? 'Pretendard' : undefined,
  },
  uploadButton: {
    backgroundColor: '#B780FF',
    borderRadius: 50,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  uploadButtonText: {
    color: '#0B0B0C',
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  savedScrollView: {
    flex: 1,
    // marginTop: Platform.OS === 'ios' ? 84 : 40, // 헤더 높이만큼 여유 공간 (헤더가 absolute이므로)
  },
  savedScrollContent: {
    // paddingBottom: 16, // 총 높이 1704px (844 + 844 + 16)
  },
  savedTopScreen: {
    width: '100%',
    height: 844, // 첫 번째 화면 높이 (정확히 844px)
    position: 'relative',
  },
  savedBottomScreen: {
    width: '100%',
    height: 844, // 두 번째 화면 높이 (정확히 844px)
    position: 'relative',
    backgroundColor: '#0A0A0A',
    overflow: 'hidden', // 넘치는 내용 숨김
  },
  savedContentContainer: {
    paddingHorizontal: 24,
    paddingTop: 30, // 사용자 정보 영역과의 간격 (내기록 화면과 동일)
  },
  savedContentTextContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  savedKeywordsContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginTop: 10,
    gap: 8,
  },
  locationContainer: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationTag: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginRight: 8,
  },
  locationText: {
    color: '#000000',
    fontSize: 40,
    fontWeight: '600',
    letterSpacing: 1.6,
    fontFamily: Platform.OS === 'web' ? 'Pretendard' : undefined,
  },
  savedContentText: {
    color: '#FFFFFF',
    fontSize: 40,
    fontWeight: '600',
    letterSpacing: 1.6,
    lineHeight: 56,
    fontFamily: Platform.OS === 'web' ? 'Pretendard' : undefined,
  },
  savedKeywordTagInline: {
    backgroundColor: '#FFD630',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginHorizontal: 2,
    marginVertical: 2,
  },
  savedKeywordTextInline: {
    color: '#000000',
    fontSize: 40,
    fontWeight: '600',
    letterSpacing: 1.6,
    fontFamily: Platform.OS === 'web' ? 'Pretendard' : undefined,
  },
  savedNormalText: {
    color: '#FFFFFF',
    fontSize: 40,
    fontWeight: '600',
    letterSpacing: 1.6,
    marginHorizontal: 2,
    fontFamily: Platform.OS === 'web' ? 'Pretendard' : undefined,
  },
  savedEmotionTagInline: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginHorizontal: 2,
    marginVertical: 2,
  },
  savedEmotionTextInline: {
    color: '#000000',
    fontSize: 40,
    fontWeight: '600',
    letterSpacing: 1.6,
    fontFamily: Platform.OS === 'web' ? 'Pretendard' : undefined,
  },
  savedHighlightMarker: {
    position: 'absolute',
    top: (TOUCH_AREA_HEIGHT - MARKER_SIZE) / 2, // 터치 영역 중앙에 위치 (하이라이트 설정 화면과 동일)
    width: MARKER_SIZE,
    height: MARKER_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none', // 마커는 터치 안받음
  },
  savedTouchableArea: {
    position: 'absolute',
    bottom: 238 - (TOUCH_AREA_HEIGHT - TIMELINE_HEIGHT) / 2, // 터치 영역 중앙 정렬
    left: '50%',
    transform: [{ translateX: -TIMELINE_WIDTH / 2 }], // 중앙 정렬
    width: TIMELINE_WIDTH,
    height: TOUCH_AREA_HEIGHT, // 44px 터치 영역
    justifyContent: 'center',
    cursor: 'pointer',
  },
  savedWaveBar: {
    width: TIMELINE_WIDTH,
    height: TIMELINE_HEIGHT, // 5px
    backgroundColor: '#B780FF',
    position: 'absolute',
    alignSelf: 'center',
  },
  savedWaveContainer: {
    position: 'absolute',
    bottom: 238, // 두 번째 화면 하단에서 238 떨어진 위치
    left: 0,
    right: 0,
    width: screenWidth,
    height: 5,
    alignItems: 'center',
  },
  savedButtonContainer: {
    position: 'absolute',
    bottom: 132, // 두 번째 화면 하단에서 132 떨어진 위치
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedButton: {
    backgroundColor: '#B780FF',
    borderRadius: 50,
    paddingHorizontal: 32,
    paddingVertical: 10,
    width: 108,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedButtonText: {
    color: '#0B0B0C',
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: 0.44,
    textAlign: 'center',
    fontFamily: Platform.OS === 'web' ? 'Pretendard' : undefined,
  },
});

export default RecordingScreen;
