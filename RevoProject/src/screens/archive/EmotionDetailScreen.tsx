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
  
  // 웨이브 애니메이션을 위한 offset 값 (각 원마다 다른 offset)
  const [waveOffsets, setWaveOffsets] = useState<{ [key: number]: number }>({});
  
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

  // 웨이브 경로 생성 함수 (물이 채워진 영역)
  const createWavePath = (offset: number, waterLevel: number, circleSize: number, waveSpeed: number): string => {
    const amplitude = 8; // 물결 높이
    const wavelength = 100; // 물결 폭
    const points: number[] = [];
    
    // 물의 높이 (waterLevel은 0~1 사이의 값, 0이면 맨 아래, 1이면 맨 위)
    const waterY = circleSize - (waterLevel * circleSize);
    
    for (let x = 0; x <= circleSize; x += 2) {
      const wave = Math.sin((x + offset) * (2 * Math.PI) / wavelength) * amplitude;
      const y = waterY + wave;
      points.push(x, y);
    }
    
    // 물을 채우기 위해 아래쪽도 추가
    points.push(circleSize, circleSize);
    points.push(0, circleSize);
    points.push(0, waterY);
    
    return `M ${points.join(' L ')} Z`;
  };

  // 웨이브 애니메이션 (각 원마다 다른 속도)
  useEffect(() => {
    const intervals: ReturnType<typeof setInterval>[] = [];
    
    emotionRecordings.forEach((recording) => {
      if (!recording.id) return;
      
      // 각 원마다 다른 속도 (0.5 ~ 2 사이)
      const speed = 0.5 + (recording.id % 15) / 10;
      
      const interval = setInterval(() => {
        setWaveOffsets(prev => ({
          ...prev,
          [recording.id!]: ((prev[recording.id!] || 0) + speed) % 200
        }));
      }, 16); // 약 60fps
      
      intervals.push(interval);
    });
    
    return () => {
      intervals.forEach(interval => clearInterval(interval));
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

  // 원형 + 물결 애니메이션 렌더링 (실제 물이 채워지는 것처럼)
  const renderWaveCircle = (recording: Recording | null, isCenter: boolean = false) => {
    if (!recording || !recording.id) return null;
    
    const emotionColor = getEmotionColor(recording.emotion || '');
    const circleSize = 231; // LocationDetailScreen의 캐릭터 크기와 동일
    
    // 각 원마다 다른 물의 높이 (0.3 ~ 0.9 사이, recording.id 기반)
    const waterLevel = 0.3 + ((recording.id % 7) / 10); // 0.3 ~ 0.9
    
    // 각 원마다 다른 웨이브 속도
    const waveSpeed = 0.5 + (recording.id % 15) / 10; // 0.5 ~ 2.0
    
    // 현재 웨이브 offset
    const currentOffset = waveOffsets[recording.id] || 0;
    
    return (
      <View style={[styles.waveCircleContainer, { width: circleSize, height: circleSize }]}>
        {/* 원형 배경 */}
        <View style={[styles.circleBackground, { backgroundColor: emotionColor, width: circleSize, height: circleSize, borderRadius: circleSize / 2 }]} />
        
        {/* 물결 애니메이션 (물이 채워진 영역) */}
        <View style={styles.waveAnimationContainer}>
          <Svg width={circleSize} height={circleSize} viewBox={`0 0 ${circleSize} ${circleSize}`} style={{ position: 'absolute', top: 0, left: 0 }}>
            <Defs>
              <ClipPath id={`waveClip_${recording.id}`}>
                <Circle cx={circleSize / 2} cy={circleSize / 2} r={circleSize / 2} />
              </ClipPath>
            </Defs>
            <G clipPath={`url(#waveClip_${recording.id})`}>
              {/* 물이 채워진 영역 (파란색 반투명) */}
              <Path
                d={createWavePath(currentOffset, waterLevel, circleSize, waveSpeed)}
                fill="#B780FF"
                fillOpacity="0.6"
              />
              {/* 물결 윗부분 강조선 */}
              <Path
                d={createWavePath(currentOffset, waterLevel, circleSize, waveSpeed)}
                stroke="#B780FF"
                strokeWidth="3"
                fill="none"
              />
            </G>
          </Svg>
        </View>
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
              {renderWaveCircle(prevRecording)}
            </View>
          )}
          
          {/* 현재 원 (가운데) */}
          {currentRecording && (
            <View style={styles.centerCircleContainer}>
              {renderWaveCircle(currentRecording, true)}
            </View>
          )}
          
          {/* 다음 원 (오른쪽) */}
          {nextRecording && (
            <View style={styles.sideCircleContainer}>
              {renderWaveCircle(nextRecording)}
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
  },
  sideCircleContainer: {
    width: 231,
    height: 231,
    flexShrink: 0,
    marginHorizontal: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerCircleContainer: {
    width: 231,
    height: 231,
    flexShrink: 0,
    marginHorizontal: 5,
    justifyContent: 'center',
    alignItems: 'center',
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
  waveAnimationContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emotionKeywordsContainer: {
    position: 'absolute',
    top: 576,
    left: 126,
    right: 0,
    alignItems: 'flex-start',
  },
  emotionKeywordsContent: {
    alignItems: 'flex-start',
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

