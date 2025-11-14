import React, { FC, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';

import NavigationBar from '../../components/NavigationBar';
import Header from '../../components/Header';
import { updateRecording, Recording, getRecording, getAudioUrl } from '../../services/api';

type HighlightEditScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'HighlightEdit'>;
type HighlightEditScreenRouteProp = RouteProp<RootStackParamList, 'HighlightEdit'>;

const screenWidth = Dimensions.get('window').width;
const screenHeight = Dimensions.get('window').height;
const TIMELINE_WIDTH = 393;
const TIMELINE_HEIGHT = 5;
const TOUCH_AREA_HEIGHT = 44;
const MARKER_SIZE = 38;

const HighlightEditScreen: FC = () => {
  const navigation = useNavigation<HighlightEditScreenNavigationProp>();
  const route = useRoute<HighlightEditScreenRouteProp>();
  const [recording, setRecording] = useState<Recording | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [highlightTime, setHighlightTime] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  
  const timelineRef = useRef<any>(null);
  const isDraggingRef = useRef<boolean>(false);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const parseHighlightTime = (timeString: string | null): number => {
    if (!timeString) return 0;
    const parts = timeString.split(':');
    if (parts.length === 2) {
      return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    }
    return 0;
  };

  const secondsToTimeString = (seconds: number): string => {
    const roundedSeconds = Math.round(seconds); // 저장할 때만 반올림
    const mins = Math.floor(roundedSeconds / 60);
    const secs = roundedSeconds % 60;
    return `${mins}:${secs}`;
  };

  useEffect(() => {
    const loadRecording = async () => {
      if (route.params?.recordingId) {
        try {
          const response = await getRecording(route.params.recordingId);
          if (response.success && response.recording) {
            setRecording(response.recording);
            const existingHighlight = parseHighlightTime(response.recording.highlight_time);
            setHighlightTime(existingHighlight);
            
            if (response.recording.audio_file) {
              try {
                const Audio = (window as any).Audio;
                if (Audio) {
                  const audioUrl = getAudioUrl(response.recording.audio_file);
                  const audio = new Audio(audioUrl);
                  audio.addEventListener('loadedmetadata', () => {
                    setAudioDuration(Math.floor(audio.duration));
                  });
                  audio.addEventListener('error', () => {
                    setAudioDuration(60);
                  });
                  audio.load();
                } else {
                  setAudioDuration(60);
                }
              } catch (error) {
                setAudioDuration(60);
              }
            } else {
              setAudioDuration(60);
            }
          }
        } catch (error) {
          console.error('녹음 정보 로드 오류:', error);
        }
      }
    };
    loadRecording();
  }, [route.params?.recordingId]);

  const getMarkerPosition = (): number => {
    if (audioDuration === 0) return 0;
    return (highlightTime / audioDuration) * TIMELINE_WIDTH;
  };

  const updateTimeFromPosition = (clientX: number) => {
    if (!timelineRef.current || audioDuration === 0) return;
    
    if (Platform.OS === 'web') {
      const element = timelineRef.current as any;
      if (element && typeof element.getBoundingClientRect === 'function') {
        const rect = element.getBoundingClientRect();
        const relativeX = clientX - rect.left;
        const clampedX = Math.max(0, Math.min(TIMELINE_WIDTH, relativeX));
        // 0.01초 단위로 계산 (소수점 2자리)
        const newTime = Math.round(((clampedX / TIMELINE_WIDTH) * audioDuration) * 100) / 100;
        setHighlightTime(newTime);
      }
    } else {
      (timelineRef.current as any).measure((fx: number, fy: number, width: number, height: number, px: number, py: number) => {
        const relativeX = clientX - px;
        const clampedX = Math.max(0, Math.min(TIMELINE_WIDTH, relativeX));
        // 0.01초 단위로 계산 (소수점 2자리)
        const newTime = Math.round(((clampedX / TIMELINE_WIDTH) * audioDuration) * 100) / 100;
        setHighlightTime(newTime);
      });
    }
  };

  // 통합 포인터 다운 핸들러 (마우스 + 터치)
  const handlePointerDown = (e: any) => {
    e.preventDefault?.();
    setIsDragging(true);
    isDraggingRef.current = true;
    
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

  const handleSave = async () => {
    if (!recording) return;
    try {
      const timeString = secondsToTimeString(highlightTime);
      const response = await updateRecording(recording.id, timeString);
      if (response.success) {
        const recordingDate = new Date(recording.recorded_at);
        navigation.navigate('Records', { 
          initialDate: recordingDate.toISOString().split('T')[0]
        });
      }
    } catch (error) {
      console.error('하이라이트 저장 오류:', error);
    }
  };

  const handleUpload = async () => {
    if (!recording) return;
    try {
      const timeString = secondsToTimeString(highlightTime);
      const response = await updateRecording(recording.id, timeString, true);
      if (response.success) {
        const recordingDate = new Date(recording.recorded_at);
        navigation.navigate('Records', { 
          initialDate: recordingDate.toISOString().split('T')[0]
        });
      }
    } catch (error) {
      console.error('하이라이트 업로드 오류:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      <View style={styles.frame} />
      <Header currentScreen="Records" />

      <View style={styles.userInfoContainer}>
        <View style={styles.userInfoLeft}>
          <View style={styles.userProfileImage}>
            <Text style={styles.userProfileText}>
              {recording?.user_name?.charAt(0) || 'U'}
            </Text>
          </View>
          <Text style={styles.userName}>{recording?.user_name || ''}</Text>
        </View>
        <TouchableOpacity style={styles.uploadButton} onPress={handleUpload}>
          <Text style={styles.uploadButtonText}>업로드</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.instructionContainer}>
        <Text style={styles.instructionText}>꾹 누르거나 시간을 입력해</Text>
        <Text style={styles.instructionText}>하이라이트를 수정하세요</Text>
      </View>

      <View style={styles.timeDisplayContainer}>
        <Text style={styles.timeDisplayText}>{formatTime(highlightTime)}</Text>
      </View>

      <View style={styles.timelineContainer}>
        <View 
          ref={timelineRef}
          style={styles.touchableArea}
          {...(Platform.OS === 'web' ? {
            // @ts-ignore - 웹 전용 이벤트
            onMouseDown: handlePointerDown,
            onTouchStart: handlePointerDown,
          } : {
            onTouchStart: handlePointerDown,
          })}
        >
          <View style={styles.timelineBar} />
          
          <View
            style={[
              styles.markerContainer,
              { left: getMarkerPosition() - MARKER_SIZE / 2 },
            ]}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width={MARKER_SIZE} height={MARKER_SIZE} viewBox="0 0 38 38" fill="none">
              <circle cx="19.0022" cy="19.0022" r="19.0022" fill="#FFD630"/>
              <g filter="url(#filter0_d_1_4550)">
                <path d="M17.5745 9.5735C18.0235 8.19153 19.9787 8.19153 20.4277 9.5735L21.767 13.6954C21.9678 14.3134 22.5437 14.7318 23.1935 14.7318H27.5275C28.9806 14.7318 29.5848 16.5913 28.4092 17.4454L24.9029 19.9928C24.3772 20.3748 24.1572 21.0519 24.358 21.6699L25.6973 25.7918C26.1463 27.1737 24.5646 28.3229 23.3891 27.4688L19.8828 24.9214C19.357 24.5394 18.6452 24.5394 18.1194 24.9214L14.6131 27.4688C13.4376 28.3229 11.8559 27.1737 12.3049 25.7918L13.6442 21.6699C13.845 21.0518 13.625 20.3748 13.0993 19.9928L9.59298 17.4454C8.4174 16.5913 9.02157 14.7318 10.4747 14.7318H14.8087C15.4585 14.7318 16.0344 14.3134 16.2352 13.6954L17.5745 9.5735Z" fill="#0C0B0D"/>
              </g>
              <defs>
                <filter id="filter0_d_1_4550" x="4.9718" y="7.53705" width="28.0586" height="27.225" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                  <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                  <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
                  <feOffset dy="3"/>
                  <feGaussianBlur stdDeviation="2"/>
                  <feComposite in2="hardAlpha" operator="out"/>
                  <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/>
                  <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_1_4550"/>
                  <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_1_4550" result="shape"/>
                </filter>
              </defs>
            </svg>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>완료</Text>
      </TouchableOpacity>

      <NavigationBar 
        onNavigateToRecords={() => navigation.navigate('Records')} 
        onNavigateToRecording={() => navigation.navigate('Recording')} 
        onNavigateToProfile={() => navigation.navigate('Profile')}
        onNavigateToFeed={() => navigation.navigate('Feed')}
        onNavigateToArchive={() => navigation.navigate('Archive')}
        currentPage="Records" 
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    width: screenWidth,
    height: screenHeight,
    backgroundColor: '#0A0A0A',
    position: 'relative',
    overflow: 'visible',
  },
  frame: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: screenWidth,
    height: 844,
    backgroundColor: '#0A0A0A',
  },
  userInfoContainer: {
    position: 'absolute',
    left: 24,
    top: 118,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userProfileImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#C4C4C4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userProfileText: {
    color: '#000000',
    fontSize: 20,
    fontWeight: '600',
  },
  userName: {
    color: '#F5F5F5',
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 0.4,
    flex: 1,
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
  instructionContainer: {
    position: 'absolute',
    left: 24,
    top: 186,
    right: 24,
    alignItems: 'center',
  },
  instructionText: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: 0.64,
    textAlign: 'center',
    lineHeight: 48,
  },
  timeDisplayContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 379,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeDisplayText: {
    color: '#FFFFFF',
    fontSize: 80,
    fontFamily: Platform.OS === 'web' ? 'Pretendard' : undefined,
    fontWeight: '600',
    letterSpacing: 1.6,
    textAlign: 'center',
  },
  timelineContainer: {
    position: 'absolute',
    left: 0,
    top: 594,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  touchableArea: {
    width: TIMELINE_WIDTH,
    height: TOUCH_AREA_HEIGHT,
    justifyContent: 'center',
    position: 'relative',
    cursor: 'pointer',
  },
  timelineBar: {
    width: TIMELINE_WIDTH,
    height: TIMELINE_HEIGHT,
    backgroundColor: '#B780FF',
    position: 'absolute',
    alignSelf: 'center',
  },
  markerContainer: {
    position: 'absolute',
    top: (TOUCH_AREA_HEIGHT - MARKER_SIZE) / 2,
    width: MARKER_SIZE,
    height: MARKER_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  saveButton: {
    position: 'absolute',
    left: '50%',
    top: 674,
    backgroundColor: '#B780FF',
    borderRadius: 50,
    paddingHorizontal: 32,
    paddingVertical: 10,
    transform: [{ translateX: -54 }],
  },
  saveButtonText: {
    color: '#0B0B0C',
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: 0.44,
  },
});

export default HighlightEditScreen;