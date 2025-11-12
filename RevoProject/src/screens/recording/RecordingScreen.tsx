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

// 웹 환경 전용 타입 선언
declare const window: Window;
declare const navigator: Navigator;

// iPhone 15, 15 Pro 크기 기준
const screenWidth = 390;
const screenHeight = 844;

type RecordingScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Recording'>;

const RecordingScreen: FC = () => {
  const navigation = useNavigation<RecordingScreenNavigationProp>();
  const { isOnboardingCompleted } = useApp();

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
  
  // 화면 상태
  const [showKeywords, setShowKeywords] = useState(false);
  const [showHighlight, setShowHighlight] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [highlightTime, setHighlightTime] = useState<string>('');
  
  // 하이라이트 드래그 관련
  const [highlightPosition, setHighlightPosition] = useState<number>(0); // 0-100 (퍼센트)
  const [showHighlightMarker, setShowHighlightMarker] = useState(false); // 하이라이트 마커 표시 여부
  const [highlightTimeInput, setHighlightTimeInput] = useState<string>(''); // 시간 입력 (MM:SS 형식)
  const highlightBarRef = useRef<View | null>(null);
  const isDraggingRef = useRef<boolean>(false); // ref로 드래그 상태 관리 (클로저 문제 해결)
  const [isDragging, setIsDragging] = useState(false);
  const barLayoutRef = useRef<{ x: number; width: number } | null>(null); // 바의 좌표 저장 (예시 코드처럼)

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
  
  // 온보딩 완료 상태 확인
  useEffect(() => {
    if (!isOnboardingCompleted) {
      navigation.navigate('OnBoarding');
    }
  }, [isOnboardingCompleted, navigation]);

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

  // 웨이브 애니메이션은 CSS로 처리되므로 별도 정리 불필요

  // 마우스/터치 이동 및 종료 이벤트 리스너 (예시 코드처럼 useEffect 사용)
  useEffect(() => {
    if (Platform.OS !== 'web') return; // 웹에서만 사용
    
    const handleMouseMove = (e: any) => {
      if (isDraggingRef.current) {
        handleMove(e.clientX);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      isDraggingRef.current = false;
    };

    const handleTouchMove = (e: any) => {
      if (isDraggingRef.current && e.touches && e.touches.length > 0) {
        handleMove(e.touches[0].clientX);
      }
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
      isDraggingRef.current = false;
    };

    if (isDragging) {
      // @ts-ignore - 웹 환경에서만 사용
      const doc = typeof window !== 'undefined' ? window.document : null;
      if (doc) {
        // @ts-ignore
        doc.addEventListener('mousemove', handleMouseMove);
        // @ts-ignore
        doc.addEventListener('mouseup', handleMouseUp);
        // @ts-ignore
        doc.addEventListener('touchmove', handleTouchMove);
        // @ts-ignore
        doc.addEventListener('touchend', handleTouchEnd);
      }
    }

    return () => {
      // @ts-ignore - 웹 환경에서만 사용
      const doc = typeof window !== 'undefined' ? window.document : null;
      if (doc) {
        // @ts-ignore
        doc.removeEventListener('mousemove', handleMouseMove);
        // @ts-ignore
        doc.removeEventListener('mouseup', handleMouseUp);
        // @ts-ignore
        doc.removeEventListener('touchmove', handleTouchMove);
        // @ts-ignore
        doc.removeEventListener('touchend', handleTouchEnd);
      }
    };
  }, [isDragging]);

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
      // 프론트엔드에서 인식한 텍스트를 함께 전송
      const response = await uploadRecording(audioBlob, user.id, frontendTranscript);
      if (response.success) {
        setRecordingData(response.recording);
        // 키워드 화면으로 이동
        setShowKeywords(true);
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
    // 하이라이트 화면 진입 시 마커 숨김 및 상태 초기화
    setShowHighlightMarker(false);
    setHighlightTime('');
    setHighlightPosition(0);
    setHighlightTimeInput('');
    setIsDragging(false);
    isDraggingRef.current = false; // ref도 초기화
  };

  // 마커 위치 업데이트 함수 (예시 코드의 updateMarkerPosition과 유사)
  const updateMarkerPosition = (position: number) => {
    if (!result) return;
    const time = positionToTime(position);
    // 상태를 동시에 업데이트하여 깜빡임 방지
    setHighlightPosition(position);
    setHighlightTime(time);
  };

  // 시간을 위치로 변환 (분, 초 입력값을 퍼센트로 변환)
  const timeToPosition = (minutes: number, seconds: number): number => {
    if (!result) return 0;
    const totalSeconds = Math.floor(result.duration);
    const targetSeconds = minutes * 60 + seconds;
    if (targetSeconds < 0 || targetSeconds > totalSeconds) return 0;
    return (targetSeconds / totalSeconds) * 100;
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
    const totalSeconds = Math.floor(result.duration);
    const totalMins = Math.floor(totalSeconds / 60);
    const totalSecs = totalSeconds % 60;
    
    // 입력값이 녹음 길이를 넘지 않도록 제한
    if (mins > totalMins || (mins === totalMins && secs > totalSecs)) {
      return;
    }
    
    const position = timeToPosition(mins, secs);
    updateMarkerPosition(position);
    setShowHighlightMarker(true);
  };

  // 하이라이트 위치를 시간으로 변환 (MM:SS 형식)
  const positionToTime = (position: number): string => {
    if (!result) return '00:00';
    const totalSeconds = Math.floor(result.duration);
    const targetSeconds = Math.floor((position / 100) * totalSeconds);
    const mins = Math.floor(targetSeconds / 60);
    const secs = targetSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 바 클릭/터치 위치 계산 (barLayoutRef 사용, 예시 코드처럼)
  const handleMove = (clientX: number) => {
    if (!result || !barLayoutRef.current) return;
    
    const relativeX = clientX - barLayoutRef.current.x;
    let position = (relativeX / barLayoutRef.current.width) * 100;
    position = Math.max(0, Math.min(100, position));
    updateMarkerPosition(position);
  };

  // 바 클릭 시 하이라이트 마커 표시 및 드래그 시작 (예시 코드처럼)
  const handleBarClick = (event: any) => {
    if (!result || !highlightBarRef.current) return;
    
    // 터치/마우스 위치 가져오기 (touches 배열 사용)
    let touchX: number;
    if (Platform.OS === 'web') {
      touchX = (event as any).clientX || (event.nativeEvent as any).clientX || 0;
    } else {
      // 모바일: touches 배열 사용
      const touches = event.nativeEvent?.touches || [];
      if (touches.length > 0) {
        touchX = touches[0].pageX || touches[0].locationX || 0;
      } else {
        touchX = event.nativeEvent.pageX || event.nativeEvent.locationX || 0;
      }
    }
    
    // 바의 좌표를 한 번만 측정하고 저장 (예시 코드처럼)
    if (Platform.OS === 'web') {
      // @ts-ignore - 웹 환경에서만 사용
      const element = highlightBarRef.current as any;
      if (element && typeof element.getBoundingClientRect === 'function') {
        const rect = element.getBoundingClientRect();
        barLayoutRef.current = { x: rect.left, width: rect.width };
        
        // 즉시 마커 표시 및 위치 업데이트 (예시 코드처럼)
        setShowHighlightMarker(true);
        handleMove(touchX);
        
        // 드래그 시작
        setIsDragging(true);
        isDraggingRef.current = true;
      }
    } else {
      // 모바일: measure() 사용 (비동기)
      // @ts-ignore - measure는 React Native의 메서드
      highlightBarRef.current.measure((fx: number, fy: number, width: number, height: number, px: number, py: number) => {
        barLayoutRef.current = { x: px, width: width };
        
        // 즉시 마커 표시 및 위치 업데이트
        setShowHighlightMarker(true);
        handleMove(touchX);
        
        // 드래그 시작
        setIsDragging(true);
        isDraggingRef.current = true;
      });
    }
  };

  // 하이라이트 드래그 시작 (마커를 직접 드래그할 때, 예시 코드처럼)
  const handleHighlightDragStart = (event: any) => {
    event.stopPropagation?.();
    if (event.nativeEvent) {
      event.nativeEvent.stopPropagation?.();
    }
    
    if (!highlightBarRef.current) return;
    
    // 바의 좌표 저장 (예시 코드처럼)
    if (Platform.OS === 'web') {
      // @ts-ignore - 웹 환경에서만 사용
      const element = highlightBarRef.current as any;
      if (element && typeof element.getBoundingClientRect === 'function') {
        const rect = element.getBoundingClientRect();
        barLayoutRef.current = { x: rect.left, width: rect.width };
      }
    } else {
      // 모바일: measure() 사용 (비동기)
      // @ts-ignore - measure는 React Native의 메서드
      highlightBarRef.current.measure((fx: number, fy: number, width: number, height: number, px: number, py: number) => {
        barLayoutRef.current = { x: px, width: width };
      });
    }
    
    setIsDragging(true);
    isDraggingRef.current = true;
    handleHighlightDrag(event);
  };

  // 하이라이트 드래그 중
  const handleHighlightDrag = (event: any) => {
    if (!result) return;
    
    // 터치/마우스 위치 가져오기 (touches 배열 사용)
    let touchX: number;
    if (Platform.OS === 'web') {
      touchX = (event as any).clientX || (event.nativeEvent as any).clientX || 0;
    } else {
      // 모바일: touches 배열 사용
      const touches = event.nativeEvent?.touches || [];
      if (touches.length > 0) {
        touchX = touches[0].pageX || touches[0].locationX || 0;
      } else {
        touchX = event.nativeEvent.pageX || event.nativeEvent.locationX || 0;
      }
    }
    
    // 위치 계산 및 업데이트
    handleMove(touchX);
  };

  // 하이라이트 드래그 종료
  const handleHighlightDragEnd = () => {
    setIsDragging(false);
    isDraggingRef.current = false; // ref도 업데이트
  };

  // 하이라이트 설정 완료
  const handleHighlightSave = async () => {
    if (!recordingData) return;

    // 하이라이트 마커가 표시되어 있으면 시간 저장, 없으면 빈 문자열
    const finalHighlightTime = showHighlightMarker ? (highlightTime || positionToTime(highlightPosition)) : '';

    try {
      const response = await updateRecording(recordingData.id, finalHighlightTime);
      if (response.success) {
        setRecordingData(response.recording);
        setShowHighlight(false);
        setShowSaved(true);
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
  const handleFinalSave = () => {
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
        {isRecording && Platform.OS === 'web' && typeof window !== 'undefined' && (window as any).document ? (
          // 녹음 중: 웨이브 애니메이션 (기본 바와 같은 위치)
          <View style={styles.waveWrapper}>
            {/* 첫 번째 패턴 */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="6291"
              height="303"
              viewBox="-2882 -25 6291 82"
              fill="none"
              // @ts-ignore - 웹 전용 className
              className="wave-animated-line"
              style={{ 
                display: 'block',
                position: 'absolute',
                left: '-2881px',
                top: -149, // 웨이브 path y=57.622를 기본 바 y=2.5에 맞춤 (정확한 계산)
              }}
            >
              <path
                d="M-2882 57.622L-2860.6 43.852C-2839.21 30.081 -2796.41 2.54 -2753.62 2.54C-2710.81 2.54 -2668.02 30.081 -2625.22 30.081C-2582.43 30.081 -2539.64 2.54 -2496.84 2.54C-2454.04 2.54 -2411.24 30.081 -2368.45 30.081C-2325.65 30.081 -2282.86 2.54 -2240.07 2.54C-2197.26 2.54 -2154.47 30.081 -2111.67 30.081C-2068.88 30.081 -2026.08 2.54 -1983.29 2.54C-1940.49 2.54 -1897.69 30.081 -1854.9 30.081C-1812.1 30.081 -1769.31 2.54 -1726.51 2.54C-1683.72 2.54 -1640.91 30.081 -1598.12 30.081C-1555.32 30.081 -1512.53 2.54 -1469.74 2.54C-1426.94 2.54 -1384.15 30.081 -1341.34 30.081C-1298.55 30.081 -1255.75 2.54 -1212.96 2.54C-1170.17 2.54 -1127.37 30.081 -1084.57 30.081C-1041.77 30.081 -998.978 2.54 -956.184 2.54C-913.39 2.54 -870.596 30.081 -827.79 30.081C-784.996 30.081 -742.202 2.54 -699.408 2.54C-656.614 2.54 -613.82 30.081 -571.025 30.081C-528.22 30.081 -485.426 2.54 -442.632 2.54C-399.837 2.54 -357.043 30.081 -314.249 30.081C-271.444 30.081 -228.65 2.54 -185.855 2.54C-143.061 2.54 -100.267 30.081 -57.4728 30.081C-14.6786 30.081 28.1264 2.54 70.9205 2.54C113.715 2.54 156.509 30.081 199.303 30.081C242.097 30.081 284.903 2.54 327.697 2.54C370.491 2.54 413.285 30.081 456.08 30.081C498.874 30.081 541.679 2.54 584.473 2.54C627.267 2.54 670.061 30.081 712.856 30.081C755.65 30.081 798.444 2.54 841.249 2.54C884.043 2.54 926.838 30.081 969.632 30.081C1012.43 30.081 1055.22 2.54 1098.03 2.54C1140.82 2.54 1183.61 30.081 1226.41 30.081C1269.2 30.081 1312 2.54 1354.79 2.54C1397.6 2.54 1440.39 30.081 1483.18 30.081C1525.98 30.081 1568.77 2.54 1611.57 2.54C1654.37 2.54 1697.17 30.081 1739.96 30.081C1782.75 30.081 1825.55 2.54 1868.34 2.54C1911.15 2.54 1953.94 30.081 1996.74 30.081C2039.53 30.081 2082.33 2.54 2125.12 2.54C2167.91 2.54 2210.72 30.081 2253.51 30.081C2296.31 30.081 2339.1 2.54 2381.9 2.54C2424.69 2.54 2467.49 30.081 2510.29 30.081C2553.08 30.081 2595.88 2.54 2638.67 2.54C2681.47 2.54 2724.26 30.081 2767.07 30.081C2809.86 30.081 2852.65 2.54 2895.45 2.54C2938.24 2.54 2981.04 30.081 3023.84 30.081C3066.64 30.081 3109.43 2.54 3152.22 2.54C3195.02 2.54 3237.81 30.081 3280.62 30.081C3323.41 30.081 3366.21 2.54 3387.6 -11.23L3409 -25"
                stroke="#B780FF"
                strokeWidth="5"
                fill="none"
              />
            </svg>
            {/* 두 번째 패턴 (연속을 위해) */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="6291"
              height="303"
              viewBox="-2882 -25 6291 82"
              fill="none"
              // @ts-ignore - 웹 전용 className
              className="wave-animated-line"
              style={{ 
                display: 'block',
                position: 'absolute',
                left: '3409px',
                top: -149, // 웨이브 path y=57.622를 기본 바 y=2.5에 맞춤
              }}
            >
              <path
                d="M-2882 57.622L-2860.6 43.852C-2839.21 30.081 -2796.41 2.54 -2753.62 2.54C-2710.81 2.54 -2668.02 30.081 -2625.22 30.081C-2582.43 30.081 -2539.64 2.54 -2496.84 2.54C-2454.04 2.54 -2411.24 30.081 -2368.45 30.081C-2325.65 30.081 -2282.86 2.54 -2240.07 2.54C-2197.26 2.54 -2154.47 30.081 -2111.67 30.081C-2068.88 30.081 -2026.08 2.54 -1983.29 2.54C-1940.49 2.54 -1897.69 30.081 -1854.9 30.081C-1812.1 30.081 -1769.31 2.54 -1726.51 2.54C-1683.72 2.54 -1640.91 30.081 -1598.12 30.081C-1555.32 30.081 -1512.53 2.54 -1469.74 2.54C-1426.94 2.54 -1384.15 30.081 -1341.34 30.081C-1298.55 30.081 -1255.75 2.54 -1212.96 2.54C-1170.17 2.54 -1127.37 30.081 -1084.57 30.081C-1041.77 30.081 -998.978 2.54 -956.184 2.54C-913.39 2.54 -870.596 30.081 -827.79 30.081C-784.996 30.081 -742.202 2.54 -699.408 2.54C-656.614 2.54 -613.82 30.081 -571.025 30.081C-528.22 30.081 -485.426 2.54 -442.632 2.54C-399.837 2.54 -357.043 30.081 -314.249 30.081C-271.444 30.081 -228.65 2.54 -185.855 2.54C-143.061 2.54 -100.267 30.081 -57.4728 30.081C-14.6786 30.081 28.1264 2.54 70.9205 2.54C113.715 2.54 156.509 30.081 199.303 30.081C242.097 30.081 284.903 2.54 327.697 2.54C370.491 2.54 413.285 30.081 456.08 30.081C498.874 30.081 541.679 2.54 584.473 2.54C627.267 2.54 670.061 30.081 712.856 30.081C755.65 30.081 798.444 2.54 841.249 2.54C884.043 2.54 926.838 30.081 969.632 30.081C1012.43 30.081 1055.22 2.54 1098.03 2.54C1140.82 2.54 1183.61 30.081 1226.41 30.081C1269.2 30.081 1312 2.54 1354.79 2.54C1397.6 2.54 1440.39 30.081 1483.18 30.081C1525.98 30.081 1568.77 2.54 1611.57 2.54C1654.37 2.54 1697.17 30.081 1739.96 30.081C1782.75 30.081 1825.55 2.54 1868.34 2.54C1911.15 2.54 1953.94 30.081 1996.74 30.081C2039.53 30.081 2082.33 2.54 2125.12 2.54C2167.91 2.54 2210.72 30.081 2253.51 30.081C2296.31 30.081 2339.1 2.54 2381.9 2.54C2424.69 2.54 2467.49 30.081 2510.29 30.081C2553.08 30.081 2595.88 2.54 2638.67 2.54C2681.47 2.54 2724.26 30.081 2767.07 30.081C2809.86 30.081 2852.65 2.54 2895.45 2.54C2938.24 2.54 2981.04 30.081 3023.84 30.081C3066.64 30.081 3109.43 2.54 3152.22 2.54C3195.02 2.54 3237.81 30.081 3280.62 30.081C3323.41 30.081 3366.21 2.54 3387.6 -11.23L3409 -25"
                stroke="#B780FF"
                strokeWidth="5"
                fill="none"
              />
            </svg>
          </View>
        ) : (
          // 녹음 전: 정적 바
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
            style={styles.nextButton}
            onPress={handleUploadRecording}
            disabled={isUploading}
          >
            <Text style={styles.nextButtonText}>
              다음
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
            
            {/* 키워드 태그들 */}
            {recordingData.keywords && recordingData.keywords.length > 0 ? (
              recordingData.keywords.map((word, index) => (
                <View key={index} style={[styles.emotionKeywordTag, { backgroundColor: getEmotionColor(recordingData.emotion) }]}>
                  <Text style={styles.emotionKeywordText}>{word}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.noKeywordsText}>키워드가 없습니다.</Text>
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
              value={highlightTimeInput || (showHighlightMarker ? (highlightTime || positionToTime(highlightPosition)) : formatTime(Math.floor(result?.duration || 0)))}
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
          
          {/* 재생 바 (기본 녹음 화면과 같은 위치) */}
          <View 
            ref={highlightBarRef}
            style={styles.highlightWaveContainer}
            onTouchStart={(e) => {
              if (Platform.OS !== 'web') {
                // 모바일: 터치 시작
                if (showHighlightMarker) {
                  handleHighlightDragStart(e);
                } else {
                  handleBarClick(e);
                }
              }
            }}
            {...(Platform.OS === 'web' ? {
              // @ts-ignore - 웹 전용 마우스 이벤트 (예시 코드처럼 onMouseDown만 사용)
              onMouseDown: (e: any) => {
                if (showHighlightMarker) {
                  handleHighlightDragStart(e);
                } else {
                  handleBarClick(e);
                }
              },
            } : {})}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={screenWidth}
              height="5"
              viewBox={`0 0 ${screenWidth} 5`}
              fill="none"
            >
              <path
                d={`M0 2.5H${screenWidth}`}
                stroke="#B780FF"
                strokeWidth="5"
              />
            </svg>
            
            {/* 하이라이트 마커 (드래그 가능) - 바를 클릭했을 때만 표시 */}
            {showHighlightMarker && (
              <View 
                style={[
                  styles.highlightMarkerContainer,
                  {
                    left: `${highlightPosition}%`,
                    transform: [{ translateX: -19.0022 }], // 마커 중심 정렬 (반지름 값)
                  }
                ]}
                  {...(Platform.OS === 'web' ? {
                    // @ts-ignore - 웹 전용 마우스 이벤트 (예시 코드처럼 onMouseDown만 사용)
                    onMouseDown: (e: any) => {
                      e.stopPropagation();
                      handleHighlightDragStart(e);
                    },
                  } : {
                    // 모바일: 터치 이벤트
                    onTouchStart: (e: any) => {
                      e.stopPropagation();
                      handleHighlightDragStart(e);
                    },
                  })}
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
            )}
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
                      <svg xmlns="http://www.w3.org/2000/svg" width="248" height="121" viewBox="0 0 248 121" fill="none">
                        {/* 왼쪽 눈 */}
                        <circle cx="60.4724" cy="60.472" r="60.4719" fill="#F5F5F5"/>
                        {/* 오른쪽 눈 */}
                        <circle cx="186.556" cy="60.472" r="60.4719" fill="#F5F5F5"/>
                        
                        {/* 왼쪽 눈 동공 마스크 */}
                        <mask id="mask0_1330_24" style={{maskType:"alpha"}} maskUnits="userSpaceOnUse" x="0" y="0" width="121" height="121">
                          <circle cx="60.4719" cy="60.4719" r="60.4719" fill="#F5F5F5"/>
                        </mask>
                        <g mask="url(#mask0_1330_24)">
                          <circle cx="10.0428" cy="60.4755" r="60.4755" fill="#0A0A0A"/>
                        </g>
                        
                        {/* 오른쪽 눈 동공 마스크 */}
                        <mask id="mask1_1330_24" style={{maskType:"alpha"}} maskUnits="userSpaceOnUse" x="126" y="0" width="122" height="121">
                          <circle cx="186.557" cy="60.4719" r="60.4719" fill="#F5F5F5"/>
                        </mask>
                        <g mask="url(#mask1_1330_24)">
                          <circle cx="136.126" cy="60.4755" r="60.4755" fill="#0A0A0A"/>
                        </g>
                        
                        {/* 왼쪽 눈 하이라이트 */}
                        <path d="M82.8553 71.1475C82.8553 75.208 81.2423 79.1023 78.3711 81.9735C75.4999 84.8447 71.6056 86.4578 67.5451 86.4578C63.4846 86.4578 59.5904 84.8447 56.7191 81.9735C53.8479 79.1023 52.2349 75.2081 52.2349 71.1475L67.5451 71.1475H82.8553Z" fill="#F5F5F5"/>
                        
                        {/* 오른쪽 눈 하이라이트 */}
                        <path d="M208.94 71.1475C208.94 75.208 207.327 79.1023 204.456 81.9735C201.585 84.8447 197.691 86.4578 193.63 86.4578C189.57 86.4578 185.675 84.8447 182.804 81.9735C179.933 79.1023 178.32 75.2081 178.32 71.1475L193.63 71.1475H208.94Z" fill="#F5F5F5"/>
                      </svg>
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
            </View>
            
            {/* 두 번째 화면: 상세 정보 화면 */}
            <View style={styles.savedBottomScreen}>
              {/* 사용자 정보 영역 - 이름과 업로드 버튼 */}
              <View style={styles.savedUserContainer}>
                <View style={styles.savedUserAvatar}>
                  <Text style={styles.savedUserAvatarText}>
                    {recordingData.user_name.charAt(0)}
                  </Text>
                </View>
                <Text style={styles.savedUserName}>{recordingData.user_name}</Text>
                <TouchableOpacity style={styles.uploadButton}>
                  <Text style={styles.uploadButtonText}>업로드</Text>
                </TouchableOpacity>
              </View>
              
              {/* 감정과 녹음 내용 (인라인으로 표시) */}
              <View style={styles.savedContentContainer}>
                <View style={styles.savedContentTextContainer}>
                  <Text style={styles.savedNormalText}>오늘은 </Text>
                  <View style={[styles.savedEmotionTagInline, { backgroundColor: getEmotionColor(recordingData.emotion) }]}>
                    <Text style={styles.savedEmotionTextInline}>{recordingData.emotion}</Text>
                  </View>
                </View>
                {/* 녹음 내용 (키워드 하이라이트 포함) */}
                {renderHighlightedTextContent(recordingData.content, recordingData.keywords || [], recordingData.emotion)}
              </View>
              
              {/* 재생 바 - 두 번째 화면 하단에서 238 떨어진 위치 */}
              <View style={styles.savedWaveContainer}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width={screenWidth}
                  height="5"
                  viewBox={`0 0 ${screenWidth} 5`}
                  fill="none"
                >
                  <path
                    d={`M0 2.5H${screenWidth}`}
                    stroke="#B780FF"
                    strokeWidth="5"
                  />
                </svg>
                
                {/* 하이라이트 마커 (있으면 표시) - 녹음 본 길이로 계산 */}
                {recordingData.highlight_time && result && (() => {
                  const highlightSeconds = parseHighlightTime(recordingData.highlight_time);
                  const totalSeconds = Math.max(result.duration, 1);
                  const percentage = (highlightSeconds / totalSeconds) * 100;
                  return (
                    <View 
                      style={[
                        styles.savedHighlightMarker,
                        {
                          left: `${percentage}%`,
                          transform: [{ translateX: -19.0022 }],
                        }
                      ]}
                    >
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
    backgroundColor: '#000000',
    position: 'relative',
  },
  frame: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 390,
    height: 844,
    backgroundColor: '#000000',
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
    height: 303, // 웨이브 전체 높이 (위아래 잘림 방지)
    overflow: 'visible', // 웨이브가 보이도록 visible로 변경
  },
  waveWrapper: {
    width: 393,
    height: 303, // 웨이브 SVG 높이 (overflow로 위아래만 보이게)
    // overflow: 'hidden',
    position: 'relative',
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
    width: 108,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    flexDirection: 'row',
  },
  nextButtonText: {
    color: '#0B0B0C',
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: 0.44,
    lineHeight: 22,
    textAlign: 'center',
    fontFamily: Platform.OS === 'web' ? 'Pretendard' : undefined,
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
    backgroundColor: '#000000',
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
    top: -16.5, // 바 중앙에 위치 (바 top: 603, 바 높이: 5, 마커 높이: 38.004, 따라서 (38.004-5)/2 = 16.5)
    zIndex: 10,
    width: 38.004,
    height: 38.004,
  },
  highlightMarker: {
    width: 38.004,
    height: 38.004,
    flexShrink: 0,
  },
  highlightWaveContainer: {
    position: 'absolute',
    top: 603, // 기본 녹음 화면의 waveContainer와 동일한 위치
    left: 0,
    right: 0,
    width: screenWidth, // 화면 너비에 맞춤
    height: 5, // 기본 바 높이와 동일
    flexShrink: 0,
    overflow: 'visible', // 마커가 보이도록
    alignSelf: 'center', // 화면 중앙 정렬
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
    backgroundColor: '#000000',
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
  characterCircleBackground: {
    position: 'absolute',
    width: 598,
    height: 598,
    borderRadius: 299,
    backgroundColor: '#FED046',
    left: 0,
    top: 0,
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
    paddingTop: 9,
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
    marginRight: 10,
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
    backgroundColor: '#000000',
    overflow: 'hidden', // 넘치는 내용 숨김
  },
  savedContentContainer: {
    paddingHorizontal: 24,
    paddingTop: 54, // 사용자 정보 영역과의 간격
  },
  savedContentTextContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
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
    top: -16.5, // 바 중앙에 위치
    zIndex: 10,
    width: 38.004,
    height: 38.004,
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
