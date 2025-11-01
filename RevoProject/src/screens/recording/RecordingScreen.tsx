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
const screenWidth = 393;
const screenHeight = 852;

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

  // 참조
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transcriptRef = useRef<string>('');
  
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
              transform: translateX(-408px);
            }
          }
          .wave-animated-line {
            animation: waveSlide 2s linear infinite;
          }
        `;
        doc.head.appendChild(style);
      }
    }
  }, []);

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
          // 녹음 중: 물결 애니메이션
          <View style={styles.waveWrapper}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="816"
              height="5"
              viewBox="0 0 816 5"
              fill="none"
              // @ts-ignore - 웹 전용 className
              className="wave-animated-line"
              style={{ display: 'block' }}
            >
              <path
                d="M-14.8986 2.5H393.101M393.101 2.5H801.101"
                stroke="#B780FF"
                strokeWidth="5"
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
          {/* 녹음 바 영역 표시용 (향후 구현) */}
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
              // 다음 화면으로 이동 (향후 구현)
              console.log('다음 버튼 클릭');
            }}
          >
            <Text style={styles.nextButtonText}>다음</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 하단 네비게이션 바 */}
      <NavigationBar 
        onNavigateToRecords={() => navigation.navigate('Records')} 
        onNavigateToRecording={() => navigation.navigate('Recording')} 
        onNavigateToProfile={() => navigation.navigate('Profile')} 
        currentPage="Recording" 
      />

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
    width: 393,
    height: 852,
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
    width: 408,
    height: 5,
    overflow: 'hidden',
  },
  waveWrapper: {
    width: 408,
    height: 5,
    overflow: 'hidden',
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
    top: 656,
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
    top: 539.5,
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
    left: -10,
    top: 614,
    width: 408,
    height: 264,
    borderWidth: 5,
    borderColor: '#B780FF',
    borderStyle: 'solid',
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
});

export default RecordingScreen;
