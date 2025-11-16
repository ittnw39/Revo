import { FC, useEffect, useState, useMemo, useRef } from 'react';
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
import Svg, { Circle, Path, ClipPath, Defs, G } from 'react-native-svg';

import { useApp } from '../../contexts/AppContext';
import NavigationBar from '../../components/NavigationBar';
import Header from '../../components/Header';
import { getRecordings, getUserFromStorage, Recording } from '../../services/api';

// 웹 환경에서 document 사용을 위한 타입 선언
declare const document: {
  addEventListener: (event: string, handler: (e: any) => void) => void;
  removeEventListener: (event: string, handler: (e: any) => void) => void;
};

// iPhone 15, 15 Pro 크기 기준
const screenWidth = 390;
const screenHeight = 844;

type EmotionDetailScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'EmotionDetail'>;
type EmotionDetailScreenRouteProp = RouteProp<RootStackParamList, 'EmotionDetail'>;

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
  
  // 물결 애니메이션을 위한 Animated 값들 (각 원마다 다른 애니메이션)
  const waveAnimations = useRef<{ [key: number]: Animated.Value }>({});
  
  // 현재 월 계산
  const currentMonth = useMemo(() => {
    const now = new Date();
    return now.getMonth() + 1; // 1-12
  }, []);

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
    
    return filtered;
  }, [recordings, emotion, viewMode]);

  // 모든 감정에서 공유하는 물결 높이 배열 (높이가 아예 없는 건 없음, 최소 10 이상)
  const waveHeights = [10, 30, 50, 70]; // percentage 값들

  // 각 기록의 높이를 미리 계산 (인덱스 기반으로 중복 방지)
  const recordingHeights = useMemo(() => {
    const heights: { [key: number]: number } = {};
    emotionRecordings.forEach((rec, index) => {
      if (!rec.id) return;
      if (index < waveHeights.length) {
        // 첫 4개는 중복 없이 할당
        heights[rec.id] = waveHeights[index];
      } else {
        // 5번째부터는 랜덤 (recording.id를 시드로 사용)
        const randomIndex = rec.id % waveHeights.length;
        heights[rec.id] = waveHeights[randomIndex];
      }
    });
    return heights;
  }, [emotionRecordings]);

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

  // 감정 색상 가져오기 함수
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

  // HEX 색상을 RGB로 변환
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

  // RGB를 HEX로 변환
  const rgbToHex = (r: number, g: number, b: number): string => {
    return `#${[r, g, b].map(x => {
      const hex = Math.round(x).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('')}`;
  };

  // 색상과 그레이를 블렌딩하는 함수 (grayPercent: 0~1)
  const blendWithGray = (color: string, grayPercent: number): string => {
    const rgb = hexToRgb(color);
    const grayValue = 128; // 중간 그레이 (50%)
    
    const blendedR = rgb.r * (1 - grayPercent) + grayValue * grayPercent;
    const blendedG = rgb.g * (1 - grayPercent) + grayValue * grayPercent;
    const blendedB = rgb.b * (1 - grayPercent) + grayValue * grayPercent;
    
    return rgbToHex(blendedR, blendedG, blendedB);
  };

  // 행복 감정의 물결 색상 배열 (4개 이상이면 4개 색상 순환)
  const getHappyWaveColor = (index: number): string => {
    const happyColors = ['#FFD630', '#AFA680', '#C7B468', '#DFC350'];
    return happyColors[index % happyColors.length];
  };

  // 다른 감정의 물결 색상 배열 (원본 색상 + 그레이 15%, 30%, 45% 블렌딩, 총 5개)
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


  // 물결 경로 배열 (예시 코드의 animate values - 원본 그대로 사용)
  const wavePaths = [
    'M0,150 C60,138 110,142 180,152 C240,160 290,156 400,148 L400,400 L0,400 Z',
    'M0,152 C70,164 120,158 190,148 C250,140 300,145 400,155 L400,400 L0,400 Z',
    'M0,148 C55,142 115,155 175,162 C245,168 295,150 400,152 L400,400 L0,400 Z',
    'M0,154 C65,160 125,145 185,150 C255,155 305,165 400,150 L400,400 L0,400 Z',
  ];

  // 물결 경로 테두리 배열 (fill 없는 버전)
  const waveBorderPaths = [
    'M0,150 C60,138 110,142 180,152 C240,160 290,156 400,148',
    'M0,152 C70,164 120,158 190,148 C250,140 300,145 400,155',
    'M0,148 C55,142 115,155 175,162 C245,168 295,150 400,152',
    'M0,154 C65,160 125,145 185,150 C255,155 305,165 400,150',
  ];

  // 현재 경로 인덱스 가져오기 함수 (Animated.Value 기반)
  const getCurrentPathIndex = (animValue: Animated.Value, pathCount: number): number => {
    // Animated.Value를 동기적으로 읽을 수 없으므로, 애니메이션 리스너로 업데이트
    // 하지만 렌더링 시에는 애니메이션 값의 정수 부분을 사용
    return 0; // 기본값, 실제로는 애니메이션 리스너로 업데이트됨
  };

  // 물결 애니메이션 (Animated.loop와 Animated.timing 사용으로 부드러운 전환)
  useEffect(() => {
    const pathCount = wavePaths.length; // 4
    const animationDuration = 3500; // 3.5초
    const animations: Animated.CompositeAnimation[] = [];
    
    emotionRecordings.forEach((recording) => {
      if (!recording.id) return;
      
      // 각 원마다 Animated.Value 생성 (없으면 생성)
      if (!waveAnimations.current[recording.id]) {
        waveAnimations.current[recording.id] = new Animated.Value(0);
      }
      
      const animValue = waveAnimations.current[recording.id];
      
      // 0 → 4 반복 애니메이션 (각 경로당 1씩 증가)
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(animValue, {
            toValue: pathCount,
            duration: animationDuration,
            useNativeDriver: false, // path d 속성은 native driver 미지원
          }),
          Animated.timing(animValue, {
            toValue: 0,
            duration: 0, // 즉시 리셋
            useNativeDriver: false,
          }),
        ])
      );
      
      animation.start();
      animations.push(animation);
    });
    
    return () => {
      // 모든 애니메이션 정지
      animations.forEach(anim => anim.stop());
      Object.values(waveAnimations.current).forEach(animValue => {
        animValue.stopAnimation();
      });
    };
  }, [emotionRecordings]);

  // 애니메이션 값 리스너로 경로 인덱스 업데이트
  const [wavePathIndices, setWavePathIndices] = useState<{ [key: number]: number }>({});
  
  useEffect(() => {
    const listeners: { [key: number]: string } = {};
    
    emotionRecordings.forEach((recording) => {
      if (!recording.id) return;
      
      const animValue = waveAnimations.current[recording.id];
      if (!animValue) return;
      
      const listenerId = animValue.addListener(({ value }) => {
        const pathIndex = Math.floor(value) % wavePaths.length;
        setWavePathIndices(prev => {
          if (prev[recording.id!] !== pathIndex) {
            return { ...prev, [recording.id!]: pathIndex };
          }
          return prev;
        });
      });
      
      listeners[recording.id] = listenerId;
    });
    
    return () => {
      emotionRecordings.forEach((recording) => {
        if (!recording.id) return;
        const animValue = waveAnimations.current[recording.id];
        const listenerId = listeners[recording.id];
        if (animValue && listenerId) {
          animValue.removeListener(listenerId);
        }
      });
    };
  }, [emotionRecordings]);

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
            setRecordings(response.recordings);
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

  // 원형 렌더링 (물결 애니메이션 포함)
  const renderWaveCircle = (recording: Recording | null, isCenter: boolean = false, index: number = 0) => {
    if (!recording || !recording.id) return null;
    
    const emotionColor = getEmotionColor(recording.emotion || '');
    const circleSize = 231; // LocationDetailScreen의 캐릭터 크기와 동일
    const radius = (circleSize / 2) - 2;
    
    // 행복 감정인 경우 특별 처리
    const isHappy = recording.emotion === '행복' || recording.emotion === '기쁨';
    let waveColor: string;
    if (isHappy) {
      waveColor = getHappyWaveColor(index);
    } else {
      // 다른 감정: 색상 배열에서 순환
      const emotionColors = getEmotionWaveColors(recording.emotion || '');
      waveColor = emotionColors[index % emotionColors.length];
    }
    
    // 모든 감정에서 공유하는 물결 높이 사용 (미리 계산된 높이 사용)
    const waveHeight = recording.id && recordingHeights[recording.id] 
      ? recordingHeights[recording.id] 
      : waveHeights[0];
    
    // 현재 물결 경로 인덱스 (Animated.Value 기반)
    const currentPathIndex = wavePathIndices[recording.id] || 0;
    const currentWavePath = wavePaths[currentPathIndex];
    const currentBorderPath = waveBorderPaths[currentPathIndex];
    
    // 물의 높이에 따른 transform (예시 코드: translate(0, ${300 - (percentage * 28)}))
    // 원본: viewBox 300, percentage * 28
    // viewBox를 400으로 설정하고 비율 조정
    const viewBoxSize = 400; // 경로가 400까지 가므로
    // 원본 코드: viewBox 300, r 142 (300/2 - 8)
    // 새 코드: viewBox 400, r = 142 * (400/300) = 189.33, 또는 400/2 - 8 = 192
    const circleRadius = 192; // viewBox 400 기준
    
    // 물의 높이 계산: percentage는 5~16 사이의 값
    // 원본: translate(0, ${300 - (percentage * 28)})
    // 예: percentage=8이면 300-224=76, percentage=10이면 300-280=20
    // viewBox 400으로 스케일링: (400/300) * (300 - percentage * 28) = 400 - percentage * (400/300) * 28
    const scaleFactor = viewBoxSize / 300; // 400/300 = 1.333...
    const translateY = viewBoxSize - (waveHeight * 28 * scaleFactor);
    
    // translateY가 너무 작거나 크면 물결이 안 보일 수 있으므로 범위 보장
    // 원의 중심이 200이고 반지름이 192이므로, 물결이 원 안에 보이려면 적절한 범위 필요
    const minTranslateY = 50; // 최소 Y 위치 (물결이 보이도록)
    const maxTranslateY = viewBoxSize - 100; // 최대 Y 위치 (물결이 원 안에 있도록)
    const finalTranslateY = Math.max(Math.min(translateY, maxTranslateY), minTranslateY);
    
    return (
      <View style={[styles.waveCircleContainer, { width: circleSize, height: circleSize }]}>
        <Svg width={circleSize} height={circleSize} viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`} style={{ position: 'absolute', top: 0, left: 0 }}>
          <Defs>
            <ClipPath id={`circleClip_${recording.id}`}>
              {/* 원의 중심을 viewBox 중앙에 맞춤 (400x400 기준) */}
              <Circle cx={viewBoxSize / 2} cy={viewBoxSize / 2} r={circleRadius} />
            </ClipPath>
          </Defs>
          
          {/* 원형 배경 (검은색) */}
          <Circle cx={viewBoxSize / 2} cy={viewBoxSize / 2} r={circleRadius} fill="#0A0A0A" />
          
          {/* 물결 애니메이션 (ClipPath 적용) */}
          <G clipPath={`url(#circleClip_${recording.id})`}>
            {/* 물이 채워진 영역 */}
            <Path
              d={currentWavePath}
              fill={waveColor}
              fillOpacity="0.6"
              transform={`translate(0, ${finalTranslateY})`}
            />
            
            {/* 물결 테두리 (감정 색상) */}
            <Path
              d={currentBorderPath}
              fill="none"
              stroke={emotionColor}
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
              transform={`translate(0, ${finalTranslateY})`}
            />
          </G>
          
          {/* 원형 테두리 (감정 색상) - 맨 위에 그리기 */}
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
          {prevRecording && (
            <View style={styles.sideCircleContainer}>
              {renderWaveCircle(prevRecording, false, emotionRecordings.findIndex(r => r.id === prevRecording.id))}
            </View>
          )}
          
          {/* 현재 원 (가운데) */}
          {currentRecording && (
            <View style={styles.centerCircleContainer}>
              {renderWaveCircle(currentRecording, true, emotionRecordings.findIndex(r => r.id === currentRecording.id))}
            </View>
          )}
          
          {/* 다음 원 (오른쪽) */}
          {nextRecording && (
            <View style={styles.sideCircleContainer}>
              {renderWaveCircle(nextRecording, false, emotionRecordings.findIndex(r => r.id === nextRecording.id))}
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

