import { FC, useEffect, useState, useRef } from 'react';
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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';

import { useApp } from '../../contexts/AppContext';
import NavigationBar from '../../components/NavigationBar';
import Header from '../../components/Header';
import {
  startSpeechRecognition,
  startAudioRecording,
  processRecordingResult,
  AudioProcessResult,
} from '../../services/audioService';

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
  const [recordingTime, setRecordingTime] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [result, setResult] = useState<AudioProcessResult | null>(null);
  
  // 키워드 화면 상태
  const [showKeywords, setShowKeywords] = useState(false);
  const [emotionResult, setEmotionResult] = useState<{
    mainEmotion: string;
    emotionWords: {
      [key: string]: string[];
    };
  } | null>(null);

  // 참조
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
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
        const { mediaRecorder, chunks, stream } = await startAudioRecording();
        
        mediaRecorderRef.current = mediaRecorder;
        streamRef.current = stream;
        chunksRef.current = chunks;

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

    // 오디오 분석 정리 (현재 사용 안 함)

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

    // 처리 완료 대기 (음성 인식 결과가 완전히 들어올 때까지)
    setTimeout(() => {
      const finalTranscript = transcriptRef.current || transcript;
      const result = processRecordingResult(finalTranscript, startTimeRef.current);
      setResult(result);
      setIsProcessing(false);
    }, 500);
  };

  // 시간 포맷팅 (초 -> mm:ss)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
      {result && (
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
            onPress={() => {
              // 임시 더미 데이터로 키워드 화면 표시 (피그마 디자인 확인용)
              setEmotionResult({
                mainEmotion: '기쁨',
                emotionWords: {
                  '기쁨': ['행복', '오리너구리', '동물원', '역북동'],
                  '슬픔': [],
                  '분노': [],
                  '보통': [],
                  '신남': [],
                  '당황': [],
                },
              });
              setShowKeywords(true);
            }}
          >
            <Text style={styles.nextButtonText}>다음</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 키워드 화면 */}
      {showKeywords && emotionResult && (
        <View style={styles.keywordsScreen}>
          {/* 배경 프레임 */}
          <View style={styles.frame} />
          
          {/* 상단 헤더 */}
          <Header />
          
          {/* 제목 (날짜 위치와 동일) */}
          <View style={styles.dateContainer}>
            <Text style={styles.keywordsTitle}>이런 키워드가 들렸어요</Text>
          </View>
          
          {/* 키워드 태그들 (세로 배치, 스크롤 가능) */}
          <ScrollView 
            style={styles.keywordsTagsContainer}
            contentContainerStyle={styles.keywordsTagsContent}
            showsVerticalScrollIndicator={false}
          >
            {Object.entries(emotionResult.emotionWords).map(([emotion, words]) => 
              words.map((word, index) => (
                <View key={`${emotion}-${index}`} style={styles.emotionKeywordTag}>
                  <Text style={styles.emotionKeywordText}>{word}</Text>
                </View>
              ))
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
                setEmotionResult(null);
              }}
            >
              <Text style={styles.backButtonText}>뒤로가기</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.keywordsNextButton}
              onPress={() => {
                // TODO: 다음 화면으로 이동
                console.log('키워드 화면 다음 버튼 클릭');
              }}
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

      {/* 하단 네비게이션 바 */}
      {!showKeywords && (
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
    width: 108,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  backButtonText: {
    color: '#0B0B0C',
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: 0.44,
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
  },
  keywordsNextButtonText: {
    color: '#0B0B0C',
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: 0.44,
    textAlign: 'center',
    fontFamily: Platform.OS === 'web' ? 'Pretendard' : undefined,
  },
});

export default RecordingScreen;
