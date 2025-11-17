import { FC, useEffect, useState, useMemo, useRef, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  Platform,
  Animated,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import Svg, { Circle, Path, ClipPath, Defs, G, Rect } from 'react-native-svg';

import { useApp } from '../../contexts/AppContext';
import NavigationBar from '../../components/NavigationBar';
import Header from '../../components/Header';
import { getRecordings, getUserFromStorage, Recording } from '../../services/api';

// 웹 환경에서 document 사용을 위한 타입 선언
declare const document: {
  addEventListener: (event: string, handler: (e: any) => void) => void;
  removeEventListener: (event: string, handler: (e: any) => void) => void;
  getElementById: (id: string) => HTMLElement | null;
} | undefined;

// iPhone 15, 15 Pro 크기 기준
const screenWidth = 390;
const screenHeight = 844;

type EmotionDetailScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'EmotionDetail'>;
type EmotionDetailScreenRouteProp = RouteProp<RootStackParamList, 'EmotionDetail'>;

// 감정 색상 가져오기 함수 (컴포넌트 외부로 이동 - 클로저 문제 방지)
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

// HEX 색상을 RGB로 변환 (컴포넌트 외부로 이동 - 함수 참조 안정화)
const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
};

// RGB를 HEX로 변환 (컴포넌트 외부로 이동 - 함수 참조 안정화)
const rgbToHex = (r: number, g: number, b: number): string => {
  return `#${[r, g, b].map(x => {
    const hex = Math.round(x).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('')}`;
};

// 색상과 그레이를 블렌딩하는 함수 (grayPercent: 0~1) (컴포넌트 외부로 이동 - 함수 참조 안정화)
const blendWithGray = (color: string, grayPercent: number): string => {
  const rgb = hexToRgb(color);
  const grayValue = 128; // 중간 그레이 (50%)
  
  const blendedR = rgb.r * (1 - grayPercent) + grayValue * grayPercent;
  const blendedG = rgb.g * (1 - grayPercent) + grayValue * grayPercent;
  const blendedB = rgb.b * (1 - grayPercent) + grayValue * grayPercent;
  
  return rgbToHex(blendedR, blendedG, blendedB);
};

// 행복 감정의 물결 색상 배열 (4개 이상이면 4개 색상 순환) (컴포넌트 외부로 이동 - 함수 참조 안정화)
const getHappyWaveColor = (index: number): string => {
  const happyColors = ['#FFD630', '#AFA680', '#C7B468', '#DFC350'];
  return happyColors[index % happyColors.length];
};

// 다른 감정의 물결 색상 배열 (원본 색상 + 그레이 15%, 30%, 45% 블렌딩, 총 5개) (컴포넌트 외부로 이동 - 함수 참조 안정화)
const getEmotionWaveColors = (emotion: string): string[] => {
  const baseColor = getEmotionColor(emotion);
  return [
    baseColor, // 원본 색상
    blendWithGray(baseColor, 0.15), // 15% 그레이
    blendWithGray(baseColor, 0.30), // 30% 그레이
    blendWithGray(baseColor, 0.45), // 45% 그레이
    baseColor, // 원본 색상 (5번째)
  ];
};

// 모든 감정에서 공유하는 물결 높이 배열 (높이가 아예 없는 건 없음, 최소 10 이상) (컴포넌트 외부로 이동 - 참조 안정화)
const WAVE_HEIGHTS = [10, 30, 50, 70]; // percentage 값들

// 웨이브 원 컴포넌트 (각 원이 독립적으로 애니메이션)
interface WaveCircleProps {
  recording: Recording;
  index: number;
  position: 'prev' | 'current' | 'next';
  getEmotionColor: (emotion: string) => string;
  getHappyWaveColor: (index: number) => string;
  getEmotionWaveColors: (emotion: string) => string[];
  waveHeights: number[];
}

const WaveCircle = memo<WaveCircleProps>(({ 
  recording, 
  index, 
  position,
  getEmotionColor,
  getHappyWaveColor,
  getEmotionWaveColors,
  waveHeights
}) => {
  // 초기 오프셋만 계산 (애니메이션은 부모에서 통합 관리)
  const initialOffset = recording.id ? (recording.id % 60) * 4 : 0;
  
  const emotionColor = getEmotionColor(recording.emotion || '');
  const circleSize = 231;
  
  // 행복 감정인 경우 특별 처리
  const isHappy = recording.emotion === '행복' || recording.emotion === '기쁨';
  let waveColor: string;
  if (isHappy) {
    waveColor = getHappyWaveColor(index);
  } else {
    const emotionColors = getEmotionWaveColors(recording.emotion || '');
    const colorIndex = recording.id ? recording.id % emotionColors.length : index % emotionColors.length;
    waveColor = emotionColors[colorIndex];
  }
  
  // 각 기록마다 고정된 높이 선택
  const seed = recording.id * 7919;
  const randomIndex = seed % waveHeights.length;
  const waveHeight = waveHeights[randomIndex];
  
  // 물의 높이에 따른 위치 계산
  const viewBoxSize = 400;
  const circleRadius = 192;
  const circleCenterY = viewBoxSize / 2;
  const circleBottom = circleCenterY + circleRadius;
  const circleHeight = circleRadius * 2;
  
  const waterHeight = (circleHeight * waveHeight) / 100;
  const waterTopY = circleBottom - waterHeight;
  const waveY = waterTopY;
  
  // 웨이브 경로 생성 (초기값만 사용, 이후는 부모에서 통합 애니메이션으로 업데이트)
  const wavePath = createWavePath(waveY, initialOffset, viewBoxSize);
  const waveFillPath = createWaveFillPath(waveY, initialOffset, viewBoxSize, circleBottom);
  
  return (
    <View style={[styles.waveCircleContainer, { width: circleSize, height: circleSize }]}>
      <Svg 
        width={circleSize} 
        height={circleSize} 
        viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`} 
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        <Defs>
          <ClipPath id={`circleClip_${recording.id}`}>
            <Circle cx={viewBoxSize / 2} cy={viewBoxSize / 2} r={circleRadius} />
          </ClipPath>
        </Defs>
        
        <Circle cx={viewBoxSize / 2} cy={viewBoxSize / 2} r={circleRadius} fill="#0A0A0A" />
        
        <G clipPath={`url(#circleClip_${recording.id})`}>
          <Path
            id={`wave-fill-${recording.id}`}
            d={waveFillPath}
            fill={waveColor}
            fillOpacity="0.6"
          />
          
          <Path
            id={`wave-path-${recording.id}`}
            d={wavePath}
            stroke={emotionColor}
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
          />
        </G>
        
        <Circle 
          cx={viewBoxSize / 2} 
          cy={viewBoxSize / 2} 
          r={circleRadius} 
          fill="none"
          stroke={emotionColor}
          strokeWidth="6"
        />
      </Svg>
    </View>
  );
}, (prevProps, nextProps) => {
  // recording.id와 다른 props만 비교 (waveOffset은 각 컴포넌트 내부에서 관리)
  return (
    prevProps.recording.id === nextProps.recording.id &&
    prevProps.index === nextProps.index &&
    prevProps.position === nextProps.position
  );
});

WaveCircle.displayName = 'WaveCircle';

// 웨이브 경로 생성 함수 (컴포넌트 외부로 이동)
const createWavePath = (y: number, offset: number = 0, width: number = 400): string => {
  const amplitude = 10;
  const wavelength = 160;
  const points: string[] = [];
  
  for (let x = 0; x <= width; x += 2) {
    const waveX = (x + offset) % (wavelength * 2);
    const normalizedX = (waveX / (wavelength * 2)) * Math.PI * 2;
    const waveY = y + Math.sin(normalizedX) * amplitude;
    points.push(`${x},${waveY}`);
  }
  
  return `M ${points.join(' L ')}`;
};

const createWaveFillPath = (y: number, offset: number = 0, width: number = 400, bottomY: number = 400): string => {
  const amplitude = 10;
  const wavelength = 160;
  const points: string[] = [];
  
  for (let x = 0; x <= width; x += 2) {
    const waveX = (x + offset) % (wavelength * 2);
    const normalizedX = (waveX / (wavelength * 2)) * Math.PI * 2;
    const waveY = y + Math.sin(normalizedX) * amplitude;
    points.push(`${x},${waveY}`);
  }
  
  return `M ${points.join(' L ')} L ${width},${bottomY} L 0,${bottomY} Z`;
};

const EmotionDetailScreen: FC = () => {
  const navigation = useNavigation<EmotionDetailScreenNavigationProp>();
  const route = useRoute<EmotionDetailScreenRouteProp>();
  const { isOnboardingCompleted } = useApp();
  
  const emotion = route.params?.emotion || '';
  const viewMode = route.params?.viewMode || 'monthly';
  
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const isGestureDetectedRef = useRef<boolean>(false);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const isAnimatingRef = useRef<boolean>(false);
  
  // 전역 웨이브 애니메이션 (모든 원을 한번에 업데이트)
  const globalWaveOffsetRef = useRef<number>(0);
  const animationFrameIdRef = useRef<number | null>(null);
  
  // 현재 슬라이드의 recording ID들을 ref로 저장 (리렌더링 방지)
  const currentRecordingsRef = useRef<{ prev: number | null; current: number | null; next: number | null }>({
    prev: null,
    current: null,
    next: null,
  });
  
  // emotionRecordings를 ref로 저장 (클로저 문제 방지)
  const emotionRecordingsRef = useRef<Recording[]>([]);
  
  // 현재 월 계산
  const currentMonth = useMemo(() => {
    const now = new Date();
    return now.getMonth() + 1; // 1-12
  }, []);

  // recordings의 ID 배열만 비교하여 실제 변경 여부 확인 (참조 동일성 문제 해결)
  const recordingIds = useMemo(() => 
    recordings.map(r => r.id).filter((id): id is number => id !== undefined).join(','), 
    [recordings]
  );

  // 해당 감정의 기록만 필터링
  const emotionRecordings = useMemo(() => {
    let filtered = recordings.filter(rec => rec.emotion === emotion);
    
    // 월별 모드인 경우 현재 월의 기록만 필터링
    if (viewMode === 'monthly') {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      
      filtered = filtered.filter(rec => {
        const recDate = new Date(rec.recorded_at);
        return recDate.getFullYear() === currentYear && recDate.getMonth() + 1 === currentMonth;
      });
    }
    
    // ref에 저장 (리렌더링 방지)
    emotionRecordingsRef.current = filtered;
    
    return filtered;
  }, [recordingIds, emotion, viewMode]); // recordingIds를 의존성으로 사용하여 실제 내용 변경 시에만 재계산


  // 현재 슬라이드의 기록 데이터 (무한 슬라이드)
  const currentRecording = useMemo(() => {
    if (emotionRecordings.length === 0) return null;
    const index = currentSlideIndex % emotionRecordings.length;
    return emotionRecordings[index];
  }, [emotionRecordings, currentSlideIndex]);

  // 이전 기록 (왼쪽 원)
  const prevRecording = useMemo(() => {
    if (emotionRecordings.length <= 1) return null;
    const prevIndex = (currentSlideIndex - 1 + emotionRecordings.length) % emotionRecordings.length;
    return emotionRecordings[prevIndex];
  }, [emotionRecordings, currentSlideIndex]);

  // 다음 기록 (오른쪽 원)
  const nextRecording = useMemo(() => {
    if (emotionRecordings.length <= 1) return null;
    const nextIndex = (currentSlideIndex + 1) % emotionRecordings.length;
    return emotionRecordings[nextIndex];
  }, [emotionRecordings, currentSlideIndex]);

  // findIndex 결과를 메모이제이션 (리렌더링 방지)
  const recordingIndices = useMemo(() => {
    const indices: { [key: number]: number } = {};
    emotionRecordings.forEach((rec, index) => {
      if (rec.id) {
        indices[rec.id] = index;
      }
    });
    return indices;
  }, [emotionRecordings]);

  // 현재 슬라이드의 recording ID 업데이트 (리렌더링 없이)
  useEffect(() => {
    currentRecordingsRef.current = {
      prev: prevRecording?.id || null,
      current: currentRecording?.id || null,
      next: nextRecording?.id || null,
    };
  }, [prevRecording?.id, currentRecording?.id, nextRecording?.id]);
  
  // 현재 슬라이드의 원만 애니메이션 (prev, current, next만 업데이트, 리렌더링 없음)
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    
    let lastTime = Date.now();
    
    const animate = () => {
      const currentTime = Date.now();
      const deltaTime = currentTime - lastTime;
      
      // 속도 조절: 2배 빠르게 (deltaTime / 33 * 2)
      globalWaveOffsetRef.current = (globalWaveOffsetRef.current + (deltaTime / 33) * 2) % 240;
      
      // 현재 슬라이드의 원들만 업데이트 (ref에서 ID 가져오기)
      const recordingIds = [
        currentRecordingsRef.current.prev,
        currentRecordingsRef.current.current,
        currentRecordingsRef.current.next,
      ].filter((id): id is number => id !== null);
      
      recordingIds.forEach((recId) => {
        const wavePathElement = (document as any).getElementById(`wave-path-${recId}`);
        const waveFillElement = (document as any).getElementById(`wave-fill-${recId}`);
        
        if (wavePathElement && waveFillElement) {
          // recording 정보는 ref에서 찾기 (리렌더링 방지)
          const rec = emotionRecordingsRef.current.find(r => r.id === recId);
          if (!rec) return;
          
          const emotionColor = getEmotionColor(rec.emotion || '');
          const viewBoxSize = 400;
          const circleRadius = 192;
          const circleCenterY = viewBoxSize / 2;
          const circleBottom = circleCenterY + circleRadius;
          const circleHeight = circleRadius * 2;
          
          const seed = recId * 7919;
          const randomIndex = seed % WAVE_HEIGHTS.length;
          const waveHeight = WAVE_HEIGHTS[randomIndex];
          const waterHeight = (circleHeight * waveHeight) / 100;
          const waterTopY = circleBottom - waterHeight;
          const waveY = waterTopY;
          
          // 각 원마다 다른 초기 오프셋 적용
          const initialOffset = recId ? (recId % 60) * 4 : 0;
          const currentWaveOffset = (globalWaveOffsetRef.current + initialOffset) % 240;
          
          const wavePath = createWavePath(waveY, currentWaveOffset, viewBoxSize);
          const waveFillPath = createWaveFillPath(waveY, currentWaveOffset, viewBoxSize, circleBottom);
          
          wavePathElement.setAttribute('d', wavePath);
          waveFillElement.setAttribute('d', waveFillPath);
        }
      });
      
      lastTime = currentTime;
      animationFrameIdRef.current = requestAnimationFrame(animate);
    };
    
    animationFrameIdRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrameIdRef.current !== null) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
    };
  }, []); // 의존성 배열 비움 - 리렌더링 없이 ref만 사용

  // 녹음 데이터 로드
  useEffect(() => {
    const loadRecordings = async () => {
      try {
        setLoading(true);
        const userInfo = getUserFromStorage();
        if (userInfo) {
          const response = await getRecordings({ 
            userId: userInfo.id,
            limit: 1000
          });
          if (response.success) {
            // 배열이 실제로 변경되었을 때만 업데이트 (참조 동일성 문제 방지)
            setRecordings(prev => {
              const prevIds = prev.map(r => r.id).filter((id): id is number => id !== undefined).join(',');
              const newIds = response.recordings.map(r => r.id).filter((id): id is number => id !== undefined).join(',');
              
              // ID 배열이 같으면 이전 참조 유지
              if (prevIds === newIds) {
                return prev;
              }
              
              return response.recordings;
            });
          }
        }
      } catch (error) {
        console.error('녹음 데이터 로드 오류:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isOnboardingCompleted) {
      loadRecordings();
    }
  }, [isOnboardingCompleted]);

  // 좌우 스와이프 제스처 처리 (무한 슬라이드) - LocationDetailScreen과 동일
  const handleTouchStart = (e: any) => {
    if (emotionRecordings.length <= 1) return;
    
    isGestureDetectedRef.current = false;
    
    let startX: number;
    if (Platform.OS === 'web') {
      const touch = e.touches?.[0] || e.nativeEvent?.touches?.[0] || (e.clientX !== undefined ? e : null);
      if (!touch) return;
      startX = touch.clientX || touch.pageX || e.clientX;
    } else {
      const touch = e.nativeEvent.touches[0];
      if (!touch) return;
      startX = touch.pageX;
    }
    
    const handleTouchMove = (moveEvent: any) => {
      let currentX: number;
      if (Platform.OS === 'web') {
        const moveTouch = moveEvent.touches?.[0] || moveEvent.nativeEvent?.touches?.[0] || (moveEvent.clientX !== undefined ? moveEvent : null);
        if (!moveTouch) return;
        currentX = moveTouch.clientX || moveTouch.pageX || moveEvent.clientX;
      } else {
        const moveTouch = moveEvent.nativeEvent.touches[0];
        if (!moveTouch) return;
        currentX = moveTouch.pageX;
      }
      
      const deltaX = currentX - startX;
      
      if (Math.abs(deltaX) > 50 && !isAnimatingRef.current) {
        isGestureDetectedRef.current = true;
        isAnimatingRef.current = true;
        
        const direction = deltaX > 0 ? 1 : -1; // 1: 오른쪽(이전), -1: 왼쪽(다음)
        const targetX = direction * 231; // 원형 크기만큼 이동
        
        // 애니메이션 실행
        Animated.timing(slideAnim, {
          toValue: targetX,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          // 애니메이션 완료 후 인덱스 업데이트
          if (direction > 0) {
            // 오른쪽으로 스와이프 - 이전 기록 (무한 슬라이드)
            setCurrentSlideIndex((prev) => (prev - 1 + emotionRecordings.length) % emotionRecordings.length);
          } else {
            // 왼쪽으로 스와이프 - 다음 기록 (무한 슬라이드)
            setCurrentSlideIndex((prev) => (prev + 1) % emotionRecordings.length);
          }
          
          // 위치 리셋
          slideAnim.setValue(0);
          isAnimatingRef.current = false;
        });
        
        // 이벤트 리스너 제거
        if (Platform.OS === 'web') {
          if (typeof document !== 'undefined') {
            (document as any).removeEventListener('touchmove', handleTouchMove);
            (document as any).removeEventListener('touchend', handleTouchEnd);
            (document as any).removeEventListener('mousemove', handleTouchMove);
            (document as any).removeEventListener('mouseup', handleTouchEnd);
          }
        }
      }
    };
    
    const handleTouchEnd = () => {
      setTimeout(() => {
        isGestureDetectedRef.current = false;
      }, 100);
      
      if (Platform.OS === 'web') {
        if (typeof document !== 'undefined') {
          (document as any).removeEventListener('touchmove', handleTouchMove);
          (document as any).removeEventListener('touchend', handleTouchEnd);
          (document as any).removeEventListener('mousemove', handleTouchMove);
          (document as any).removeEventListener('mouseup', handleTouchEnd);
        }
      }
    };
    
    if (Platform.OS === 'web') {
      if (typeof document !== 'undefined') {
        (document as any).addEventListener('touchmove', handleTouchMove);
        (document as any).addEventListener('touchend', handleTouchEnd);
        (document as any).addEventListener('mousemove', handleTouchMove);
        (document as any).addEventListener('mouseup', handleTouchEnd);
      }
    }
  };


  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>로딩 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
      
      <View style={styles.frame} />
      <Header currentScreen="Archive" />

      {/* 월별/전체 탭 버튼과 뒤로가기 버튼 */}
      <View style={styles.headerContainer}>
        {/* 뒤로가기 버튼 (왼쪽) */}
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Svg width="15" height="28" viewBox="0 0 15 28" fill="none">
            <Path d="M14 27L0.999999 14L14 0.999998" stroke="#F5F5F5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </Svg>
        </TouchableOpacity>
        
        {/* 월별/전체 탭 버튼 (ArchiveScreen과 동일) */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, viewMode === 'monthly' && styles.tabButtonActive]}
            onPress={() => {
              // 탭 변경은 나중에 구현
            }}
          >
            <Text style={[styles.tabButtonText, viewMode === 'monthly' && styles.tabButtonTextActive]}>
              월별
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, styles.tabButtonRight, viewMode === 'all' && styles.tabButtonActive]}
            onPress={() => {
              // 탭 변경은 나중에 구현
            }}
          >
            <Text style={[styles.tabButtonText, viewMode === 'all' && styles.tabButtonTextActive]}>
              전체
            </Text>
          </TouchableOpacity>
        </View>

        
        {/* 오른쪽 여백 (레이아웃 균형) */}
        <View style={styles.headerSpacer} />
      </View>

      {/* 질문 텍스트 */}
      <View style={styles.questionContainer}>
        <Text style={styles.questionText}>
          {currentMonth}월에는{'\n'}수많은 {emotion}을 느꼈어요
        </Text>
      </View>

      {/* 슬라이드 위치/전체 개수 */}
      {emotionRecordings.length > 0 && (
        <View style={styles.slideInfoContainer}>
          <Text style={styles.slideInfoText}>
            {(currentSlideIndex % emotionRecordings.length) + 1}/{emotionRecordings.length}
          </Text>
        </View>
      )}

      {/* 원형 + 물결 애니메이션 슬라이드 영역 */}
      <View 
        style={styles.slideContainer}
        onTouchStart={handleTouchStart}
      >
        <Animated.View
          style={[
            styles.slideContent,
            {
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          {/* 이전 원 (왼쪽) */}
          {prevRecording && prevRecording.id !== undefined && (
            <View style={styles.sideCircleContainer}>
              <WaveCircle
                recording={prevRecording}
                index={recordingIndices[prevRecording.id] ?? 0}
                position="prev"
                getEmotionColor={getEmotionColor}
                getHappyWaveColor={getHappyWaveColor}
                getEmotionWaveColors={getEmotionWaveColors}
                waveHeights={WAVE_HEIGHTS}
              />
            </View>
          )}
          
          {/* 현재 원 (가운데) */}
          {currentRecording && currentRecording.id !== undefined && (
            <View style={styles.centerCircleContainer}>
              <WaveCircle
                recording={currentRecording}
                index={recordingIndices[currentRecording.id] ?? 0}
                position="current"
                getEmotionColor={getEmotionColor}
                getHappyWaveColor={getHappyWaveColor}
                getEmotionWaveColors={getEmotionWaveColors}
                waveHeights={WAVE_HEIGHTS}
              />
            </View>
          )}
          
          {/* 다음 원 (오른쪽) */}
          {nextRecording && nextRecording.id !== undefined && (
            <View style={styles.sideCircleContainer}>
              <WaveCircle
                recording={nextRecording}
                index={recordingIndices[nextRecording.id] ?? 0}
                position="next"
                getEmotionColor={getEmotionColor}
                getHappyWaveColor={getHappyWaveColor}
                getEmotionWaveColors={getEmotionWaveColors}
                waveHeights={WAVE_HEIGHTS}
              />
            </View>
          )}
        </Animated.View>
      </View>

      {/* 키워드 2개 */}
      {currentRecording && (
        <View style={styles.emotionKeywordsContainer}>
          <View style={styles.emotionKeywordsContent}>
            {/* 키워드 태그들 */}
            {currentRecording.keywords && currentRecording.keywords.length > 0 && (
              <>
                <View style={[styles.keywordTag, { backgroundColor: getEmotionColor(currentRecording.emotion || '') }]}>
                  <Text style={styles.keywordTagText}>
                    {currentRecording.keywords[0]}
                  </Text>
                </View>
                {currentRecording.keywords.length > 1 && (
                  <View style={[styles.keywordTag, { backgroundColor: getEmotionColor(currentRecording.emotion || '') }]}>
                    <Text style={styles.keywordTagText}>
                      {currentRecording.keywords[1]}
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      )}

      <NavigationBar 
        onNavigateToRecords={() => navigation.navigate('Records')} 
        onNavigateToRecording={() => navigation.navigate('Recording')} 
        onNavigateToProfile={() => navigation.navigate('Profile')}
        onNavigateToFeed={() => navigation.navigate('Feed')}
        onNavigateToArchive={() => navigation.navigate('Archive')}
        currentPage="Archive" 
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
  },
  frame: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: screenWidth,
    height: screenHeight,
    backgroundColor: '#0A0A0A',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 20,
  },
  headerContainer: {
    position: 'absolute',
    top: 118,
    left: 24,
    right: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    marginTop: 0,
    alignSelf: 'center',
  },
  tabButton: {
    paddingHorizontal: 32,
    paddingVertical: 5,
    borderRadius: 50,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#B780FF',
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  tabButtonRight: {
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    borderTopRightRadius: 50,
    borderBottomRightRadius: 50,
    borderLeftWidth: 0,
  },
  tabButtonActive: {
    backgroundColor: '#B780FF',
    borderColor: '#B780FF',
  },
  tabButtonText: {
    color: '#F5F5F5',
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: 0.44,
    fontFamily: Platform.OS === 'web' ? 'Pretendard' : undefined,
  },
  tabButtonTextActive: {
    color: '#000000',
  },
  backButton: {
    width: 15,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSpacer: {
    width: 15,
    height: 28,
  },
  questionContainer: {
    position: 'absolute',
    top: 178,
    left: 24,
    right: 24,
  },
  questionText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 0.64,
    lineHeight: 48,
    textAlign: 'left',
    fontFamily: Platform.OS === 'web' ? 'Pretendard' : undefined,
  },
  slideInfoContainer: {
    position: 'absolute',
    top: 287,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  slideInfoText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: 0.4,
    fontFamily: Platform.OS === 'web' ? 'Pretendard' : undefined,
  },
  slideContainer: {
    position: 'absolute',
    top: 338,
    left: 0,
    right: 0,
    height: 231,
    overflow: 'visible',
  },
  slideContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 231,
    gap: 0,
  },
  sideCircleContainer: {
    width: 231,
    height: 231,
    flexShrink: 0,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 0,
    marginRight: 0,
  },
  centerCircleContainer: {
    width: 231,
    height: 231,
    flexShrink: 0,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 0,
    marginRight: 0,
  },
  waveCircleContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  circleBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  emotionKeywordsContainer: {
    position: 'absolute',
    top: 586,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  emotionKeywordsContent: {
    alignItems: 'center',
    maxWidth: screenWidth - 48,
  },
  emotionTag: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  keywordTag: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  emotionTagText: {
    fontSize: 28,
    fontWeight: '600',
    color: '#000000',
    fontFamily: Platform.OS === 'web' ? 'Pretendard' : undefined,
  },
  keywordTagText: {
    fontSize: 28,
    fontWeight: '600',
    color: '#000000',
    fontFamily: Platform.OS === 'web' ? 'Pretendard' : undefined,
  },
});

export default EmotionDetailScreen;

