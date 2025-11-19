import { FC, useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  Platform,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import Svg, { Circle, Ellipse, Path, G, Mask, Rect, Line, Defs, ClipPath } from 'react-native-svg';

// 웹 환경에서 document 사용을 위한 타입 선언
declare const document: {
  addEventListener: (event: string, handler: (e: any) => void) => void;
  removeEventListener: (event: string, handler: (e: any) => void) => void;
};

import { useApp } from '../../contexts/AppContext';
import NavigationBar from '../../components/NavigationBar';
import Header from '../../components/Header';
import { getRecordings, getUserFromStorage, Recording, getAudioUrl } from '../../services/api';

// API URL 가져오기 (웹 환경에서만 사용)
const getApiUrl = () => {
  // @ts-ignore
  return process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
};

// iPhone 15, 15 Pro 크기 기준
const screenWidth = 390;
const screenHeight = 844;

type ArchiveScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Archive'>;

const ArchiveScreen: FC = () => {
  const navigation = useNavigation<ArchiveScreenNavigationProp>();
  const { isOnboardingCompleted } = useApp();
  const [viewMode, setViewMode] = useState<'monthly' | 'all'>('monthly'); // 'monthly' 또는 'all'
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0); // 페이지 인덱스 (0, 1, 2)
  
  // 웨이브 애니메이션을 위한 offset 값
  const [waveOffset, setWaveOffset] = useState<number>(0);

  // 현재 월 계산
  const currentMonth = useMemo(() => {
    const now = new Date();
    return now.getMonth() + 1; // 1-12
  }, []);

  // 녹음 데이터 로드
  useEffect(() => {
    const loadRecordings = async () => {
      try {
        setLoading(true);
        const userInfo = getUserFromStorage();
        if (userInfo) {
          const response = await getRecordings({ 
            userId: userInfo.id,
            limit: 1000 // 충분히 많이 가져오기
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

  // 온보딩 완료 상태 확인
  useEffect(() => {
    if (!isOnboardingCompleted) {
      navigation.navigate('OnBoarding');
    }
  }, [isOnboardingCompleted, navigation]);

  // 월별 또는 전체 기록 필터링
  const filteredRecordings = useMemo(() => {
    if (viewMode === 'monthly') {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      
      return recordings.filter(rec => {
        const recDate = new Date(rec.recorded_at);
        return recDate.getFullYear() === currentYear && recDate.getMonth() + 1 === currentMonth;
      });
    }
    return recordings;
  }, [recordings, viewMode]);

  // 총 녹음 시간 계산 (초 단위) - 백그라운드에서 점진적으로 업데이트
  const [totalDuration, setTotalDuration] = useState<number>(0);

  useEffect(() => {
    // 화면은 즉시 표시하고, duration 계산은 백그라운드에서 처리
    if (filteredRecordings.length === 0) {
      setTotalDuration(0);
      return;
    }

    // 초기값 0으로 설정하여 화면이 즉시 표시되도록 함
    setTotalDuration(0);

    // 백그라운드에서 duration 계산 시작
    const calculateTotalDuration = async () => {
      // 웹 환경에서만 Audio API 사용 가능
      if (Platform.OS !== 'web') {
        return;
      }

      let totalSeconds = 0;
      const timeout = 5000; // 5초 타임아웃
      
      // 각 녹음의 duration을 병렬로 처리 (더 빠름)
      const durationPromises = filteredRecordings.map((recording) => {
        return new Promise<number>((resolve) => {
          try {
            // 오디오 URL 구성
            let fullUrl: string;
            if (recording.audio_url && recording.audio_url.startsWith('http')) {
              fullUrl = recording.audio_url;
            } else if (recording.audio_file) {
              fullUrl = getAudioUrl(recording.audio_file);
            } else {
              resolve(0);
              return;
            }
            
            // 오디오 파일의 duration 가져오기
            const audio = new (window as any).Audio(fullUrl);
            let resolved = false;
            let timeoutId: number | null = null;
            
            const cleanup = () => {
              if (!resolved) {
                resolved = true;
                if (timeoutId !== null) {
                  clearTimeout(timeoutId);
                  timeoutId = null;
                }
                audio.removeEventListener('loadedmetadata', onLoadedMetadata);
                audio.removeEventListener('error', onError);
                audio.removeEventListener('canplaythrough', onCanPlayThrough);
              }
            };
            
            const onLoadedMetadata = () => {
              if (!resolved && audio.duration && isFinite(audio.duration)) {
                cleanup();
                resolve(audio.duration);
              }
            };
            
            const onCanPlayThrough = () => {
              if (!resolved && audio.duration && isFinite(audio.duration)) {
                cleanup();
                resolve(audio.duration);
              }
            };
            
            const onError = () => {
              cleanup();
              resolve(0); // 에러 시 0 반환
            };
            
            audio.addEventListener('loadedmetadata', onLoadedMetadata);
            audio.addEventListener('canplaythrough', onCanPlayThrough);
            audio.addEventListener('error', onError);
            
            // 타임아웃 설정
            timeoutId = setTimeout(() => {
              if (!resolved) {
                cleanup();
                resolve(0); // 타임아웃 시 0 반환 (조용히 처리)
              }
            }, timeout) as unknown as number;
            
            audio.load();
          } catch (error) {
            resolve(0);
          }
        });
      });

      // 모든 duration을 병렬로 가져온 후 합산
      const durations = await Promise.all(durationPromises);
      totalSeconds = durations.reduce((sum, duration) => sum + duration, 0);
      
      // 점진적으로 업데이트
      setTotalDuration(totalSeconds);
    };

    // 백그라운드에서 실행 (화면 블로킹 없음)
    calculateTotalDuration();
  }, [filteredRecordings]);

  // 총 시간을 분 또는 초로 변환
  const totalTimeDisplay = useMemo(() => {
    const totalSeconds = Math.floor(totalDuration);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (minutes >= 1) {
      return `${minutes}분`;
    } else {
      return `${seconds}초`;
    }
  }, [totalDuration]);

  // 웨이브 애니메이션 시작
  useEffect(() => {
    if (currentPageIndex === 0) {
      const interval = setInterval(() => {
        setWaveOffset(prev => (prev + 2) % 120); // 0~119 사이클, 2배 빠르게
      }, 33); // 약 30fps (1000/30 ≈ 33ms)
      return () => clearInterval(interval);
    }
  }, [currentPageIndex]);

  // 웨이브 경로 생성 함수 (물결 높이 10px, 폭 60px - 두배)
  const createWavePath = (y: number, offset: number = 0): string => {
    const width = 393;
    const amplitude = 10; // 물결 높이
    const wavelength = 60; // 물결 하나의 폭 (두배)
    const points: string[] = [];
    
    for (let x = 0; x <= width; x += 2) {
      const waveX = (x + offset) % (wavelength * 2);
      const normalizedX = (waveX / (wavelength * 2)) * Math.PI * 2;
      const waveY = y + Math.sin(normalizedX) * amplitude;
      points.push(`${x},${waveY}`);
    }
    
    return `M ${points.join(' L ')}`;
  };

  // 위치별 기록 통계 계산 (상위 4개)
  const topLocations = useMemo(() => {
    const locationCounts: { [key: string]: number } = {};
    
    filteredRecordings.forEach(rec => {
      if (rec.district) {
        locationCounts[rec.district] = (locationCounts[rec.district] || 0) + 1;
      }
    });
    
    // 카운트 기준으로 정렬하고 상위 4개만 반환
    return Object.entries(locationCounts)
      .map(([district, count]) => ({ district, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [filteredRecordings]);

  // 감정별 기록 통계 계산 (상위 4개)
  const topEmotions = useMemo(() => {
    const emotionCounts: { [key: string]: number } = {};
    
    filteredRecordings.forEach(rec => {
      if (rec.emotion) {
        emotionCounts[rec.emotion] = (emotionCounts[rec.emotion] || 0) + 1;
      }
    });
    
    // 카운트 기준으로 정렬하고 상위 4개만 반환
    return Object.entries(emotionCounts)
      .map(([emotion, count]) => ({ emotion, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [filteredRecordings]);

  // 페이지 인덱스에 따른 표시할 데이터
  const displayData = useMemo(() => {
    if (currentPageIndex === 0) {
      return {
        question: `${currentMonth}월에는 얼마나\n기록을 남겼을까요?`,
        answer: `${totalTimeDisplay}\n남겼어요`,
      };
    } else if (currentPageIndex === 1) {
      return {
        question: `${currentMonth}월에 가장 많이 기록한\n4곳을 확인해보세요.`,
      };
    } else if (currentPageIndex === 2) {
      return {
        question: `${currentMonth}월에는 어떤 감정을\n많이 느꼈을까요?`,
      };
    }
    return {
      question: `${currentMonth}월에는 얼마나\n기록을 남겼을까요?`,
      answer: `${totalTimeDisplay}\n남겼어요`,
    };
  }, [currentMonth, totalTimeDisplay, currentPageIndex]);

  // 좌우 스와이프 제스처 처리 (RecordsScreen 참고)
  const handleTouchStart = (e: any) => {
    let startX: number;
    if (Platform.OS === 'web') {
      const touch = e.touches?.[0] || e.nativeEvent?.touches?.[0];
      if (!touch) return;
      startX = touch.clientX || touch.pageX;
    } else {
      const touch = e.nativeEvent.touches[0];
      if (!touch) return;
      startX = touch.pageX;
    }
    
    const handleTouchMove = (moveEvent: any) => {
      let currentX: number;
      if (Platform.OS === 'web') {
        const moveTouch = moveEvent.touches?.[0] || moveEvent.nativeEvent?.touches?.[0];
        if (!moveTouch) return;
        currentX = moveTouch.clientX || moveTouch.pageX;
      } else {
        const moveTouch = moveEvent.nativeEvent.touches[0];
        if (!moveTouch) return;
        currentX = moveTouch.pageX;
      }
      
      const deltaX = currentX - startX;
      
      if (Math.abs(deltaX) > 50) {
        if (deltaX > 0 && currentPageIndex > 0) {
          // 오른쪽으로 스와이프 - 이전 페이지
          setCurrentPageIndex(currentPageIndex - 1);
        } else if (deltaX < 0 && currentPageIndex < 2) {
          // 왼쪽으로 스와이프 - 다음 페이지
          setCurrentPageIndex(currentPageIndex + 1);
        }
        
        // 이벤트 리스너 제거
        if (Platform.OS === 'web' && typeof document !== 'undefined') {
          (document as any).removeEventListener('touchmove', handleTouchMove);
          (document as any).removeEventListener('touchend', handleTouchEnd);
        }
      }
    };
    
    const handleTouchEnd = () => {
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        (document as any).removeEventListener('touchmove', handleTouchMove);
        (document as any).removeEventListener('touchend', handleTouchEnd);
      }
    };
    
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      (document as any).addEventListener('touchmove', handleTouchMove);
      (document as any).addEventListener('touchend', handleTouchEnd);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* 배경 프레임 */}
      <View style={styles.frame} />

      {/* 상단 헤더 */}
      <Header currentScreen="Archive" />

      {/* 메인 콘텐츠 영역 */}
      <View 
        style={styles.contentContainer}
        onTouchStart={handleTouchStart}
      >
        {/* 월별/전체 탭 버튼 (세부 페이지처럼 절대 위치) */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, viewMode === 'monthly' && styles.tabButtonActive]}
            onPress={() => setViewMode('monthly')}
          >
            <Text style={[styles.tabButtonText, viewMode === 'monthly' && styles.tabButtonTextActive]}>
              월별
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, styles.tabButtonRight, viewMode === 'all' && styles.tabButtonActive]}
            onPress={() => setViewMode('all')}
          >
            <Text style={[styles.tabButtonText, viewMode === 'all' && styles.tabButtonTextActive]}>
              전체
            </Text>
          </TouchableOpacity>
        </View>

        {/* 페이지별 콘텐츠 */}
        {currentPageIndex === 0 ? (
          <>
            {/* 첫 번째 페이지: 질문 텍스트 */}
            <View style={styles.questionContainer}>
              <Text style={styles.questionText}>{displayData.question}</Text>
            </View>

            {/* 답변 텍스트 */}
            <View style={styles.answerContainer}>
              <Text style={styles.answerText}>{displayData.answer}</Text>
            </View>

            {/* 애니메이션 선들 */}
            <View style={styles.animationContainer}>
              <Svg width="393" height="90" viewBox="0 0 393 90" style={styles.animationSvg}>
                {/* 5개의 웨이브 선, 각각 15px 간격 */}
                <Path
                  d={createWavePath(2.5, waveOffset)}
                  stroke="#B780FF"
                  strokeWidth="5"
                  fill="none"
                  strokeLinecap="round"
                />
                <Path
                  d={createWavePath(22.5, waveOffset)}
                  stroke="#B780FF"
                  strokeWidth="5"
                  fill="none"
                  strokeLinecap="round"
                />
                <Path
                  d={createWavePath(42.5, waveOffset)}
                  stroke="#B780FF"
                  strokeWidth="5"
                  fill="none"
                  strokeLinecap="round"
                />
                <Path
                  d={createWavePath(62.5, waveOffset)}
                  stroke="#B780FF"
                  strokeWidth="5"
                  fill="none"
                  strokeLinecap="round"
                />
                <Path
                  d={createWavePath(82.5, waveOffset)}
                  stroke="#B780FF"
                  strokeWidth="5"
                  fill="none"
                  strokeLinecap="round"
                />
              </Svg>
            </View>
          </>
        ) : currentPageIndex === 1 ? (
          <>
            {/* 두 번째 페이지: 위치별 기록 통계 */}
            <View style={styles.questionContainer}>
              <Text style={styles.questionText}>{displayData.question}</Text>
            </View>

            {/* 위치별 기록 카드들 */}
            <View style={styles.locationCardsContainer}>
              {topLocations.length > 0 ? (
                topLocations.map((location, index) => {
                  const cardTop = 298 + (index * 108); // 첫 번째 카드: 298px, 이후 108px 간격
                  return (
                    <TouchableOpacity 
                      key={index} 
                      style={[styles.locationCard, { top: cardTop }]}
                      onPress={() => {
                        navigation.navigate('LocationDetail', { 
                          district: location.district, 
                          viewMode: viewMode 
                        });
                      }}
                    >
                      <View style={styles.locationCardContent}>
                        <Text style={styles.locationCardText}>
                          {location.district}에서 {location.count}회{'\n'}기록했어요
                        </Text>
                        {/* 카드 오른쪽 아이콘 영역 */}
                        {index === 0 ? (
                          // 첫 번째 카드: SVG 아이콘 (카드 내부 절대 위치)
                          <View style={styles.locationCardSvgContainer}>
                            <Svg width="169" height="73" viewBox="0 0 169 73" fill="none">
                              <Path d="M84.5 168C131.168 168 169 130.392 169 84C169 37.6081 131.168 0 84.5 0C37.8319 0 0 37.6081 0 84C0 130.392 37.8319 168 84.5 168Z" fill="#FED046"/>
                            </Svg>
                          </View>
                        ) : index === 1 ? (
                          // 두 번째 카드: SVG 아이콘 (카드 내부 절대 위치)
                          <View style={styles.locationCardSvgContainerSecond}>
                            <Svg width="215" height="96" viewBox="0 0 215 96" fill="none">
                              <Path d="M93.6055 22.4741C94.0093 18.1261 100.027 17.3421 101.532 21.4414L115.244 58.8099C116.219 61.4667 119.53 62.3586 121.708 60.5511L152.337 35.1281C155.697 32.3392 160.506 36.0403 158.671 40.0027L141.944 76.1226C140.755 78.6906 142.465 81.6624 145.283 81.9241L184.918 85.6051C189.266 86.0089 190.05 92.027 185.951 93.5313L148.582 107.244C145.925 108.219 145.033 111.53 146.841 113.707L172.264 144.336C175.053 147.696 171.352 152.506 167.389 150.671L131.269 133.944C128.701 132.755 125.73 134.465 125.468 137.283L121.787 176.918C121.383 181.265 115.365 182.05 113.861 177.95L100.148 140.582C99.1729 137.925 95.8621 137.033 93.6844 138.84L63.0558 164.263C59.6958 167.052 54.8859 163.351 56.7209 159.389L73.448 123.269C74.6373 120.701 72.9269 117.729 70.1089 117.467L30.4744 113.786C26.1265 113.383 25.3424 107.365 29.4418 105.86L66.8103 92.1474C69.4671 91.1725 70.359 87.8617 68.5515 85.6841L43.1285 55.0554C40.3396 51.6954 44.0406 46.8855 48.003 48.7205L84.123 65.4476C86.691 66.6369 89.6628 64.9265 89.9245 62.1085L93.6055 22.4741Z" fill="#EE47CA"/>
                            </Svg>
                          </View>
                        ) : index === 2 ? (
                          // 세 번째 카드: SVG 아이콘 (카드 내부 절대 위치)
                          <View style={styles.locationCardSvgContainerThird}>
                            <Svg width="179" height="74" viewBox="0 0 179 74" fill="none">
                              <Path d="M76.9188 9.14081C84.4208 3.69028 94.5792 3.69028 102.081 9.14081L162.038 52.7022C169.54 58.1527 172.679 67.814 169.814 76.6331L146.912 147.117C144.047 155.936 135.828 161.907 126.556 161.907H52.4445C43.1715 161.907 34.9531 155.936 32.0876 147.117L9.18605 76.6331C6.32054 67.814 9.45968 58.1527 16.9617 52.7022L76.9188 9.14081Z" fill="#5CC463"/>
                            </Svg>
                          </View>
                        ) : index === 3 ? (
                          // 네 번째 카드: SVG 아이콘 (카드 내부 절대 위치)
                          <View style={styles.locationCardSvgContainerFourth}>
                            <Svg width="83" height="64" viewBox="0 0 83 64" fill="none">
                              <Rect width="82.9126" height="179.789" rx="11.1845" fill="#47AFF4"/>
                            </Svg>
                          </View>
                        ) : (
                          // 다른 카드: 기존 원형 아이콘
                          <View style={styles.locationCardIcon}>
                            <View style={[styles.locationIconCircle, { backgroundColor: '#47AFF4' }]} />
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View style={styles.emptyLocationCard}>
                  <Text style={styles.emptyLocationText}>기록된 위치가 없습니다.</Text>
                </View>
              )}
            </View>
          </>
        ) : (
          <>
            {/* 세 번째 페이지: 감정별 기록 통계 */}
            <View style={styles.questionContainer}>
              <Text style={styles.questionText}>{displayData.question}</Text>
            </View>

            {/* 감정별 기록 카드들 */}
            <View style={styles.emotionCardsContainer}>
              {topEmotions.length > 0 ? (
                topEmotions.map((emotion, index) => {
                  // 2x2 그리드 배치
                  const row = Math.floor(index / 2); // 0 또는 1
                  const col = index % 2; // 0 또는 1
                  const cardTop = 298 + (row * 218); // 첫 번째 줄: 298px, 두 번째 줄: 516px
                  const cardLeft = 24 + (col * 180); // 첫 번째 열: 24px, 두 번째 열: 204px
                  
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.emotionCard, 
                        { top: cardTop, left: cardLeft },
                        emotion.emotion === '신남' && styles.emotionCardOverflowVisible
                      ]}
                      onPress={() => {
                        navigation.navigate('EmotionDetail', {
                          emotion: emotion.emotion,
                          viewMode: viewMode
                        });
                      }}
                    >
                      {/* 감정 SVG */}
                      <View style={[
                        styles.emotionCardIcon,
                        emotion.emotion === '신남' && styles.emotionCardIconOverflowVisible,
                        emotion.emotion === '보통' && styles.emotionCardIconNormal,
                        emotion.emotion === '놀람' && styles.emotionCardIconSurprise
                      ]}>
                        {emotion.emotion === '행복' || emotion.emotion === '기쁨' ? (
                          <Svg width="75" height="71" viewBox="0 0 75 71" fill="none">
                            <Ellipse cx="39.2355" cy="35.4998" rx="35.4998" ry="35.4998" fill="#FED046"/>
                            <Circle cx="21.1817" cy="27.4962" r="7.17973" fill="#F5F5F5"/>
                            <Circle cx="36.1514" cy="27.4962" r="7.17973" fill="#F5F5F5"/>
                            <Mask id={`mask0_emotion_${index}`} maskType="alpha" maskUnits="userSpaceOnUse" x="14" y="20" width="15" height="15">
                              <Circle cx="21.183" cy="27.4964" r="7.17973" fill="#F5F5F5"/>
                            </Mask>
                            <G mask={`url(#mask0_emotion_${index})`}>
                              <Circle cx="15.1948" cy="27.4969" r="7.18015" fill="#0A0A0A"/>
                            </G>
                            <Mask id={`mask1_emotion_${index}`} maskType="alpha" maskUnits="userSpaceOnUse" x="28" y="20" width="16" height="15">
                              <Circle cx="36.1515" cy="27.4964" r="7.17973" fill="#F5F5F5"/>
                            </Mask>
                            <G mask={`url(#mask1_emotion_${index})`}>
                              <Circle cx="30.1645" cy="27.4969" r="7.18015" fill="#0A0A0A"/>
                            </G>
                            <Circle cx="21.1817" cy="27.4962" r="7.17973" fill="#F5F5F5"/>
                            <Circle cx="36.1514" cy="27.4962" r="7.17973" fill="#F5F5F5"/>
                            <Mask id={`mask2_emotion_${index}`} maskType="alpha" maskUnits="userSpaceOnUse" x="14" y="20" width="15" height="15">
                              <Circle cx="21.183" cy="27.4964" r="7.17973" fill="#F5F5F5"/>
                            </Mask>
                            <G mask={`url(#mask2_emotion_${index})`}>
                              <Circle cx="15.1948" cy="27.4969" r="7.18015" fill="#0A0A0A"/>
                            </G>
                            <Mask id={`mask3_emotion_${index}`} maskType="alpha" maskUnits="userSpaceOnUse" x="28" y="20" width="16" height="15">
                              <Circle cx="36.1515" cy="27.4964" r="7.17973" fill="#F5F5F5"/>
                            </Mask>
                            <G mask={`url(#mask3_emotion_${index})`}>
                              <Circle cx="30.1645" cy="27.4969" r="7.18015" fill="#0A0A0A"/>
                            </G>
                            <Path d="M26.4052 34.6444C26.4052 36.7829 30.2545 36.8898 30.2545 34.6444" stroke="#0A0A0A" strokeWidth="1.00903" strokeLinecap="round"/>
                            <Path d="M23.8396 28.7642C23.8396 29.2463 23.6481 29.7087 23.3072 30.0496C22.9663 30.3904 22.504 30.582 22.0219 30.582C21.5398 30.582 21.0774 30.3904 20.7365 30.0496C20.3956 29.7087 20.2041 29.2463 20.2041 28.7642L22.0219 28.7642H23.8396Z" fill="#F5F5F5"/>
                            <Path d="M38.8084 28.7642C38.8084 29.2463 38.6169 29.7087 38.276 30.0496C37.9351 30.3904 37.4727 30.582 36.9906 30.582C36.5085 30.582 36.0462 30.3904 35.7053 30.0496C35.3644 29.7087 35.1729 29.2463 35.1729 28.7642L36.9906 28.7642H38.8084Z" fill="#F5F5F5"/>
                            <Circle cx="66.3289" cy="59.7889" r="8.40784" fill="#D3AB0C"/>
                            <Circle cx="8.40784" cy="59.7889" r="8.40784" fill="#D3AB0C"/>
                          </Svg>
                        ) : emotion.emotion === '놀람' ? (
                          <Svg width="77" height="80" viewBox="0 0 77 80" fill="none" style={{ overflow: 'visible' }}>
                            <Path d="M24.99 18.7465C28.8205 6.95762 45.4987 6.95762 49.3292 18.7465C51.0422 24.0187 55.9553 27.5883 61.4988 27.5883C73.8946 27.5883 79.0486 43.4502 69.02 50.7362C64.5352 53.9946 62.6586 59.7702 64.3716 65.0424C68.2021 76.8314 54.7091 86.6344 44.6808 79.3486C40.196 76.0902 34.1232 76.0902 29.6384 79.3486C19.6101 86.6344 6.11707 76.8314 9.94757 65.0424C11.6606 59.7702 9.78397 53.9946 5.29917 50.7362C-4.72913 43.4502 0.424768 27.5883 12.8204 27.5883C18.3639 27.5883 23.277 24.0187 24.99 18.7465Z" fill="#F99841"/>
                            <Path d="M44.0812 46.8416C40.422 46.8416 37.4556 43.8752 37.4556 40.2159C37.4556 36.5567 40.422 33.5903 44.0812 33.5903C47.7404 33.5903 50.7068 36.5567 50.7068 40.2159C50.7068 43.8752 47.7404 46.8416 44.0812 46.8416Z" fill="#F5F5F5"/>
                            <Path d="M30.2684 46.8416C26.6092 46.8416 23.6428 43.8752 23.6428 40.2159C23.6428 36.5567 26.6092 33.5903 30.2684 33.5903C33.9277 33.5903 36.894 36.5567 36.894 40.2159C36.894 43.8752 33.9277 46.8416 30.2684 46.8416Z" fill="#F5F5F5"/>
                            <Mask id={`mask0_surprise_${index}`} maskType="alpha" maskUnits="userSpaceOnUse" x="37" y="33" width="14" height="14">
                              <Path d="M44.0815 46.8411C40.4223 46.8411 37.4559 43.8747 37.4559 40.2155C37.4559 36.5563 40.4223 33.5899 44.0815 33.5899C47.7408 33.5899 50.7072 36.5563 50.7072 40.2155C50.7072 43.8747 47.7408 46.8411 44.0815 46.8411Z" fill="#F5F5F5"/>
                            </Mask>
                            <G mask={`url(#mask0_surprise_${index})`}>
                              <Path d="M49.6089 46.8419C45.9494 46.8419 42.9829 43.8753 42.9829 40.2159C42.9829 36.5565 45.9494 33.5899 49.6089 33.5899C53.2683 33.5899 56.2349 36.5565 56.2349 40.2159C56.2349 43.8753 53.2683 46.8419 49.6089 46.8419Z" fill="#0A0A0A"/>
                            </G>
                            <Mask id={`mask1_surprise_${index}`} maskType="alpha" maskUnits="userSpaceOnUse" x="23" y="33" width="14" height="14">
                              <Path d="M30.2686 46.8416C26.6093 46.8416 23.6429 43.8753 23.6429 40.216C23.6429 36.5568 26.6093 33.5904 30.2686 33.5904C33.9278 33.5904 36.8942 36.5568 36.8942 40.216C36.8942 43.8753 33.9278 46.8416 30.2686 46.8416Z" fill="#F5F5F5"/>
                            </Mask>
                            <G mask={`url(#mask1_surprise_${index})`}>
                              <Path d="M35.7938 46.8424C32.1344 46.8424 29.1678 43.8758 29.1678 40.2164C29.1678 36.557 32.1344 33.5904 35.7938 33.5904C39.4532 33.5904 42.4198 36.557 42.4198 40.2164C42.4198 43.8758 39.4532 46.8424 35.7938 46.8424Z" fill="#0A0A0A"/>
                            </G>
                            <Path d="M35.765 48.2132C35.283 46.4141 35.8138 44.7084 36.9512 44.4033C38.0888 44.0985 39.4023 45.3102 39.8844 47.1094L35.765 48.2132Z" fill="#0A0A0A"/>
                            <Mask id={`mask2_surprise_${index}`} maskType="luminance" maskUnits="userSpaceOnUse" x="35" y="44" width="5" height="5">
                              <Path d="M35.765 48.2132C35.283 46.4141 35.8138 44.7084 36.9512 44.4033C38.0888 44.0985 39.4023 45.3102 39.8844 47.1094L35.765 48.2132Z" fill="white"/>
                            </Mask>
                            <G mask={`url(#mask2_surprise_${index})`}>
                              <Path d="M35.765 48.2132L35.4238 48.3046L35.5152 48.6458L35.8565 48.5544L35.765 48.2132ZM39.8844 47.1094L39.9758 47.4506L40.317 47.3592L40.2256 47.018L39.8844 47.1094ZM35.765 48.2132L36.1062 48.1218C35.8798 47.2767 35.8962 46.4694 36.0881 45.853C36.2816 45.2316 36.6322 44.8546 37.0427 44.7445L36.9512 44.4033L36.8598 44.0621C36.1329 44.2571 35.6493 44.8855 35.4135 45.643C35.1761 46.4055 35.1682 47.3507 35.4238 48.3046L35.765 48.2132ZM36.9512 44.4033L37.0427 44.7445C37.4533 44.6345 37.9456 44.7856 38.424 45.227C38.8986 45.6648 39.3167 46.3557 39.5431 47.2008L39.8844 47.1094L40.2256 47.018C39.9699 46.0639 39.4902 45.2493 38.9031 44.7077C38.3199 44.1697 37.5868 43.8673 36.8598 44.0621L36.9512 44.4033ZM39.8844 47.1094L39.7929 46.7682L35.6736 47.872L35.765 48.2132L35.8565 48.5544L39.9758 47.4506L39.8844 47.1094Z" fill="black"/>
                            </G>
                            <Path d="M31.535 41.1866C31.535 41.6314 31.3583 42.058 31.0438 42.3725C30.7293 42.687 30.3027 42.8637 29.8579 42.8637C29.4132 42.8637 28.9866 42.687 28.6721 42.3725C28.3576 42.058 28.1809 41.6314 28.1809 41.1866H29.8579H31.535Z" fill="#F5F5F5"/>
                            <Path d="M45.3497 41.1866C45.3497 41.6314 45.173 42.058 44.8585 42.3725C44.544 42.687 44.1174 42.8637 43.6726 42.8637C43.2278 42.8637 42.8013 42.687 42.4868 42.3725C42.1723 42.058 41.9956 41.6314 41.9956 41.1866H43.6726H45.3497Z" fill="#F5F5F5"/>
                            <Path d="M58.9199 10.2453C58.7407 10.542 58.2902 10.462 58.2241 10.1218L56.9426 3.53162C56.5454 1.48882 58.3215 -0.316682 60.3706 0.0469182C62.4196 0.410418 63.4661 2.71682 62.3903 4.49822L58.9199 10.2453Z" fill="#FF8812"/>
                            <Path d="M61.5014 13.1141C61.0134 13.2442 60.6622 12.6512 61.0109 12.2858L69.3597 3.53593C71.1445 1.66543 74.2215 2.01663 75.5395 4.24123C76.8565 6.46573 75.6855 9.33323 73.1875 9.99913L61.5014 13.1141Z" fill="#FF8812"/>
                          </Svg>
                        ) : emotion.emotion === '신남' ? (
                          <Svg width="108" height="75" viewBox="0 0 108 75" fill="none" style={{ overflow: 'visible' }}>
                              <Path d="M101.873 9.56019C101.904 9.42533 102.096 9.42533 102.127 9.56019L102.837 12.7035C102.856 12.7908 102.957 12.8324 103.032 12.7845L105.757 11.064C105.874 10.9902 106.01 11.126 105.936 11.2429L104.215 13.9676C104.168 14.0434 104.209 14.1437 104.297 14.1634L107.44 14.8734C107.575 14.9039 107.575 15.0961 107.44 15.1265L104.297 15.8365C104.209 15.8563 104.168 15.9566 104.215 16.0323L105.936 18.757C106.01 18.8739 105.874 19.0098 105.757 18.936L103.032 17.2154C102.957 17.1676 102.856 17.2091 102.837 17.2965L102.127 20.4398C102.096 20.5746 101.904 20.5746 101.873 20.4398L101.164 17.2965C101.144 17.2091 101.043 17.1676 100.968 17.2154L98.243 18.936C98.1261 19.0098 97.9902 18.8739 98.0641 18.757L99.7846 16.0323C99.8325 15.9566 99.7909 15.8563 99.7035 15.8365L96.5603 15.1265C96.4254 15.0961 96.4254 14.9039 96.5603 14.8734L99.7035 14.1634C99.7909 14.1437 99.8325 14.0434 99.7846 13.9676L98.0641 11.2429C97.9902 11.126 98.1261 10.9902 98.243 11.064L100.968 12.7845C101.043 12.8324 101.144 12.7908 101.164 12.7035L101.873 9.56019Z" fill="#EE47CA"/>
                              <Path d="M11.283 58.1734C11.3353 57.9422 11.6647 57.9422 11.717 58.1734L12.9343 63.5626C12.9682 63.7124 13.1401 63.7836 13.27 63.7016L17.9415 60.7517C18.1419 60.6251 18.3749 60.8581 18.2483 61.0585L15.2984 65.73C15.2164 65.8599 15.2876 66.0319 15.4374 66.0657L20.8266 67.283C21.0578 67.3353 21.0578 67.6647 20.8266 67.717L15.4374 68.9343C15.2876 68.9682 15.2164 69.1401 15.2984 69.27L18.2483 73.9415C18.3749 74.1419 18.1419 74.3749 17.9415 74.2483L13.27 71.2984C13.1401 71.2164 12.9682 71.2876 12.9343 71.4374L11.717 76.8266C11.6647 77.0578 11.3353 77.0578 11.283 76.8266L10.0657 71.4374C10.0319 71.2876 9.85988 71.2164 9.73003 71.2984L5.05852 74.2483C4.8581 74.3749 4.62514 74.1419 4.7517 73.9415L7.70161 69.27C7.78363 69.1401 7.71241 68.9682 7.56258 68.9343L2.17342 67.717C1.94219 67.6647 1.94219 67.3353 2.17342 67.283L7.56258 66.0657C7.71241 66.0319 7.78363 65.8599 7.70161 65.73L4.7517 61.0585C4.62514 60.8581 4.8581 60.6251 5.05852 60.7517L9.73003 63.7016C9.85988 63.7836 10.0319 63.7124 10.0657 63.5626L11.283 58.1734Z" fill="#F58BDE"/>
                              <Path d="M55.6247 3.87474C55.8356 2.94194 57.1645 2.94194 57.3754 3.87474L62.2862 25.6157C62.4228 26.2201 63.1166 26.5074 63.6404 26.1765L82.4863 14.276C83.2948 13.7654 84.2345 14.7053 83.724 15.5138L71.8235 34.3596C71.4926 34.8834 71.7799 35.5772 72.3843 35.7139L94.1253 40.6247C95.058 40.8356 95.058 42.1644 94.1253 42.3753L72.3843 47.2861C71.7799 47.4228 71.4926 48.1166 71.8235 48.6404L83.724 67.4862C84.2345 68.2948 83.2948 69.2345 82.4863 68.724L63.6404 56.8235C63.1166 56.4926 62.4228 56.7799 62.2862 57.3843L57.3754 79.1253C57.1645 80.058 55.8356 80.058 55.6247 79.1253L50.7139 57.3843C50.5772 56.7799 49.8835 56.4926 49.3596 56.8235L30.5138 68.724C29.7053 69.2345 28.7655 68.2948 29.2761 67.4862L41.1766 48.6404C41.5075 48.1166 41.2201 47.4228 40.6157 47.2861L18.8748 42.3753C17.942 42.1644 17.942 40.8356 18.8748 40.6247L40.6157 35.7139C41.2201 35.5772 41.5075 34.8834 41.1766 34.3596L29.2761 15.5138C28.7655 14.7053 29.7053 13.7654 30.5138 14.276L49.3596 26.1765C49.8835 26.5074 50.5772 26.2201 50.7139 25.6157L55.6247 3.87474Z" fill="#EE47CA"/>
                              <Path d="M48.6321 41.6415C52.6927 41.6415 55.9845 38.3497 55.9845 34.2891C55.9845 30.2285 52.6927 26.9367 48.6321 26.9367C44.5714 26.9367 41.2797 30.2285 41.2797 34.2891C41.2797 38.3497 44.5714 41.6415 48.6321 41.6415Z" fill="#F5F5F5"/>
                              <Path d="M63.9619 41.6415C68.0225 41.6415 71.3143 38.3497 71.3143 34.2891C71.3143 30.2285 68.0225 26.9367 63.9619 26.9367C59.9013 26.9367 56.6095 30.2285 56.6095 34.2891C56.6095 38.3497 59.9013 41.6415 63.9619 41.6415Z" fill="#F5F5F5"/>
                              <Defs>
                                <Mask id={`mask0_excited_${index}`} maskType="alpha" maskUnits="userSpaceOnUse" x="41" y="26" width="15" height="16">
                                  <Path d="M48.6321 41.6415C52.6927 41.6415 55.9845 38.3497 55.9845 34.2891C55.9845 30.2285 52.6927 26.9367 48.6321 26.9367C44.5714 26.9367 41.2797 30.2285 41.2797 34.2891C41.2797 38.3497 44.5714 41.6415 48.6321 41.6415Z" fill="#F5F5F5"/>
                                </Mask>
                              </Defs>
                              <G mask={`url(#mask0_excited_${index})`}>
                                <Path d="M42.5005 41.6423C46.5614 41.6423 49.8534 38.3504 49.8534 34.2895C49.8534 30.2287 46.5614 26.9367 42.5005 26.9367C38.4397 26.9367 35.1477 30.2287 35.1477 34.2895C35.1477 38.3504 38.4397 41.6423 42.5005 41.6423Z" fill="#0A0A0A"/>
                              </G>
                              <Defs>
                                <Mask id={`mask1_excited_${index}`} maskType="alpha" maskUnits="userSpaceOnUse" x="56" y="26" width="16" height="16">
                                  <Path d="M63.9619 41.6415C68.0225 41.6415 71.3143 38.3497 71.3143 34.2891C71.3143 30.2285 68.0225 26.9367 63.9619 26.9367C59.9013 26.9367 56.6095 30.2285 56.6095 34.2891C56.6095 38.3497 59.9013 41.6415 63.9619 41.6415Z" fill="#F5F5F5"/>
                                </Mask>
                              </Defs>
                              <G mask={`url(#mask1_excited_${index})`}>
                                <Path d="M57.8304 41.6423C61.8912 41.6423 65.1832 38.3504 65.1832 34.2895C65.1832 30.2287 61.8912 26.9367 57.8304 26.9367C53.7695 26.9367 50.4775 30.2287 50.4775 34.2895C50.4775 38.3504 53.7695 41.6423 57.8304 41.6423Z" fill="#0A0A0A"/>
                              </G>
                              <Path d="M50.6966 35.3681C50.6966 35.8617 50.5004 36.3352 50.1513 36.6842C49.8022 37.0333 49.3287 37.2296 48.8351 37.2296C48.3415 37.2296 47.868 37.0333 47.5189 36.6842C47.1699 36.3352 46.9736 35.8617 46.9736 35.3681H48.8351H50.6966Z" fill="#F5F5F5"/>
                              <Path d="M66.0264 35.3681C66.0264 35.8617 65.8302 36.3352 65.4811 36.6842C65.132 37.0333 64.6586 37.2296 64.1649 37.2296C63.6713 37.2296 63.1979 37.0333 62.8488 36.6842C62.4997 36.3352 62.3035 35.8617 62.3035 35.3681H64.1649H66.0264Z" fill="#F5F5F5"/>
                              <Path d="M57.8425 40.6836C57.1947 42.6228 55.6757 43.863 54.4495 43.4535C53.2236 43.0439 52.7545 41.14 53.4021 39.2008V39.2005L57.8425 40.6834V40.6836Z" fill="#0A0A0A"/>
                              <Defs>
                                <Mask id={`mask2_excited_${index}`} maskType="luminance" maskUnits="userSpaceOnUse" x="53" y="39" width="5" height="5">
                                  <Path d="M57.8425 40.6836C57.1947 42.6228 55.6757 43.863 54.4495 43.4535C53.2236 43.0439 52.7545 41.14 53.4021 39.2008V39.2005L57.8425 40.6834V40.6836Z" fill="white"/>
                                </Mask>
                              </Defs>
                              <G mask={`url(#mask2_excited_${index})`}>
                                <Path d="M53.402 39.2005L53.5442 38.775L53.1186 38.6329L52.9765 39.0584L53.402 39.2005ZM57.8424 40.6833L58.2679 40.8255L58.4101 40.3997L57.9845 40.2576L57.8424 40.6833ZM57.8424 40.6836L57.4167 40.5414C57.1156 41.443 56.6178 42.162 56.0791 42.6018C55.5353 43.0457 55.0075 43.1668 54.5916 43.0279L54.4495 43.4534L54.3074 43.879C55.1177 44.1496 55.9625 43.8553 56.6467 43.2969C57.3359 42.734 57.9215 41.8631 58.2679 40.8255L57.8424 40.6836ZM54.4495 43.4534L54.5916 43.0279C54.176 42.8891 53.8267 42.4752 53.6589 41.7934C53.4925 41.1183 53.5264 40.2445 53.8275 39.3429L53.402 39.2007L52.9765 39.0586C52.6301 40.0962 52.5747 41.1441 52.7875 42.0081C52.9989 42.8654 53.4971 43.6083 54.3074 43.879L54.4495 43.4534ZM53.402 39.2007L53.8275 39.3429L53.8278 39.3426L53.402 39.2005L52.9765 39.0584V39.0586L53.402 39.2007ZM53.402 39.2005L53.2601 39.626L57.7003 41.1089L57.8424 40.6833L57.9845 40.2576L53.5442 38.775L53.402 39.2005ZM57.8424 40.6833L57.4169 40.5412L57.4167 40.5414L57.8424 40.6836L58.2679 40.8255L57.8424 40.6833Z" fill="black"/>
                              </G>
                            </Svg>
                        ) : emotion.emotion === '슬픔' ? (
                          <Svg width="75" height="71" viewBox="0 0 396 557" fill="none">
                            <Path d="M370.989 0H25.0106C11.1976 0 0 7.26344 0 16.2233V540.777C0 549.737 11.1976 557 25.0106 557H370.989C384.802 557 396 549.737 396 540.777V16.2233C396 7.26344 384.802 0 370.989 0Z" fill="#47AFF4"/>
                            <Path d="M101.777 133.678H125.919C134.755 133.678 141.919 140.842 141.919 149.678V321.6C141.919 330.437 134.755 337.6 125.919 337.6H117.777C108.94 337.6 101.777 330.437 101.777 321.6V133.678Z" fill="#F5F5F5"/>
                            <Path d="M141.233 162.815C171.005 162.815 195.141 138.68 195.141 108.908C195.141 79.1353 171.005 55 141.233 55C111.46 55 87.3252 79.1353 87.3252 108.908C87.3252 138.68 111.46 162.815 141.233 162.815Z" fill="#F5F5F5"/>
                            <Path d="M253.631 162.815C283.404 162.815 307.539 138.68 307.539 108.908C307.539 79.1353 283.404 55 253.631 55C223.859 55 199.724 79.1353 199.724 108.908C199.724 138.68 223.859 162.815 253.631 162.815Z" fill="#F5F5F5"/>
                            <Mask id={`mask0_sad_${index}`} maskType="alpha" maskUnits="userSpaceOnUse" x="87" y="55" width="109" height="108">
                              <Path d="M141.232 162.815C171.004 162.815 195.14 138.68 195.14 108.908C195.14 79.1353 171.004 55 141.232 55C111.46 55 87.3242 79.1353 87.3242 108.908C87.3242 138.68 111.46 162.815 141.232 162.815Z" fill="#F5F5F5"/>
                            </Mask>
                            <G mask={`url(#mask0_sad_${index})`}>
                              <Path d="M87.9108 55.0007C117.685 55.0007 141.822 79.1374 141.822 108.911C141.822 138.686 117.685 162.822 87.9108 162.822C58.1367 162.822 34 138.686 34 108.911C34 79.1374 58.1367 55.0007 87.9108 55.0007Z" fill="#0A0A0A"/>
                            </G>
                            <Mask id={`mask1_sad_${index}`} maskType="alpha" maskUnits="userSpaceOnUse" x="199" y="55" width="109" height="108">
                              <Path d="M253.631 162.815C283.404 162.815 307.539 138.68 307.539 108.908C307.539 79.1353 283.404 55 253.631 55C223.859 55 199.724 79.1353 199.724 108.908C199.724 138.68 223.859 162.815 253.631 162.815Z" fill="#F5F5F5"/>
                            </Mask>
                            <G mask={`url(#mask1_sad_${index})`}>
                              <Path d="M198.912 162.822C228.686 162.822 252.823 138.685 252.823 108.911C252.823 79.1367 228.686 55 198.912 55C169.138 55 145.001 79.1367 145.001 108.911C145.001 138.685 169.138 162.822 198.912 162.822Z" fill="#0A0A0A"/>
                            </G>
                            <Path d="M272.383 144.918H272.383C263.291 144.918 255.921 152.288 255.921 161.38V224.236C255.921 233.327 263.291 240.698 272.383 240.698H272.383C281.475 240.698 288.845 233.327 288.845 224.236V161.38C288.845 152.288 281.475 144.918 272.383 144.918Z" fill="#F5F5F5"/>
                            <Path d="M212.568 174.927C212.568 158.87 183.666 158.067 183.666 174.927" stroke="#0A0A0A" strokeWidth="8.02842" strokeLinecap="round"/>
                            <Path d="M145.111 120.03C145.111 123.65 143.673 127.121 141.113 129.681C138.554 132.24 135.082 133.678 131.463 133.678C127.843 133.678 124.371 132.24 121.812 129.681C119.252 127.121 117.814 123.65 117.814 120.03H131.463H145.111Z" fill="#F5F5F5"/>
                            <Path d="M255.922 120.03C255.922 123.65 254.484 127.121 251.924 129.681C249.365 132.24 245.893 133.678 242.273 133.678C238.654 133.678 235.182 132.24 232.622 129.681C230.063 127.121 228.625 123.65 228.625 120.03H242.273H255.922Z" fill="#F5F5F5"/>
                          </Svg>
                        ) : emotion.emotion === '화남' ? (
                          <Svg width="100" height="71" viewBox="0 0 118 86" fill="none">
                            <Path d="M74.0285 83.0289C73.3213 84.0478 71.8424 84.1247 71.0334 83.1845L28.3528 33.5867C27.3566 32.4291 28.0678 30.6288 29.5862 30.4646L112.951 21.4468C114.567 21.272 115.64 23.0781 114.713 24.4133L74.0285 83.0289Z" fill="#EE4947"/>
                            <Path d="M71.3399 43.7448C71.3399 44.7193 71.148 45.6842 70.7751 46.5845C70.4021 47.4848 69.8556 48.3028 69.1665 48.9919C68.4775 49.6809 67.6594 50.2275 66.7591 50.6004C65.8589 50.9733 64.8939 51.1653 63.9195 51.1653C62.945 51.1653 61.9801 50.9733 61.0798 50.6004C60.1795 50.2275 59.3615 49.6809 58.6724 48.9919C57.9834 48.3028 57.4368 47.4848 57.0639 46.5845C56.691 45.6842 56.499 44.7193 56.499 43.7448L63.9195 43.7448H71.3399Z" fill="#F5F5F5"/>
                            <Path d="M86.1502 43.7448C86.1502 44.7193 85.9583 45.6842 85.5854 46.5845C85.2124 47.4848 84.6659 48.3028 83.9768 48.9919C83.2878 49.6809 82.4697 50.2275 81.5694 50.6004C80.6692 50.9733 79.7042 51.1653 78.7298 51.1653C77.7553 51.1653 76.7904 50.9733 75.8901 50.6004C74.9898 50.2275 74.1718 49.6809 73.4827 48.9919C72.7937 48.3028 72.2471 47.4848 71.8742 46.5845C71.5013 45.6842 71.3093 44.7193 71.3093 43.7448L78.7298 43.7448H86.1502Z" fill="#F5F5F5"/>
                            <Path d="M68.548 43.8121C68.548 44.4216 68.428 45.0252 68.1947 45.5883C67.9614 46.1515 67.6196 46.6631 67.1886 47.0941C66.7575 47.5251 66.2459 47.867 65.6827 48.1003C65.1196 48.3335 64.516 48.4536 63.9065 48.4536C63.297 48.4536 62.6934 48.3335 62.1303 48.1003C61.5672 47.867 61.0555 47.5251 60.6245 47.0941C60.1935 46.6631 59.8516 46.1515 59.6183 45.5883C59.3851 45.0252 59.265 44.4216 59.265 43.8121L63.9065 43.8121H68.548Z" fill="#0A0A0A"/>
                            <Path d="M83.3252 43.8121C83.3252 44.4216 83.2052 45.0252 82.9719 45.5883C82.7387 46.1515 82.3968 46.6631 81.9658 47.0941C81.5348 47.5251 81.0231 47.867 80.46 48.1003C79.8968 48.3335 79.2933 48.4536 78.6837 48.4536C78.0742 48.4536 77.4706 48.3335 76.9075 48.1003C76.3444 47.867 75.8327 47.5251 75.4017 47.0941C74.9707 46.6631 74.6288 46.1515 74.3955 45.5883C74.1623 45.0252 74.0422 44.4216 74.0422 43.8121L78.6837 43.8121H83.3252Z" fill="#0A0A0A"/>
                            <Path d="M73.5195 52.8328C73.5195 50.6225 69.5411 50.512 69.5411 52.8328" stroke="#0A0A0A" strokeWidth="0.914581" strokeLinecap="round"/>
                            <Path d="M61.1427 45.4974C61.1427 45.9956 60.9447 46.4735 60.5924 46.8258C60.2401 47.1781 59.7622 47.3761 59.264 47.3761C58.7657 47.3761 58.2878 47.1781 57.9355 46.8258C57.5832 46.4735 57.3853 45.9956 57.3853 45.4974L59.264 45.4974H61.1427Z" fill="#F5F5F5"/>
                            <Path d="M76.6137 45.4974C76.6137 45.9956 76.4158 46.4735 76.0635 46.8258C75.7111 47.1781 75.2333 47.3761 74.735 47.3761C74.2368 47.3761 73.7589 47.1781 73.4066 46.8258C73.0543 46.4735 72.8563 45.9956 72.8563 45.4974L74.735 45.4974H76.6137Z" fill="#F5F5F5"/>
                            <Path d="M23.0093 26.0367C23.2766 26.921 22.3045 27.6638 21.5215 27.1737L9.61467 19.7207C9.02275 19.3501 8.98321 18.5024 9.53806 18.0784L17.3812 12.085C17.936 11.661 18.7436 11.9219 18.9456 12.5903L23.0093 26.0367Z" fill="#DE3400"/>
                            <Path d="M19.0145 31.4805C20.0224 31.2936 20.6255 32.5636 19.8436 33.2265L10.2884 41.3283C9.78744 41.753 9.02005 41.5878 8.73833 40.9945L5.97606 35.1775C5.69434 34.5842 6.05126 33.8851 6.697 33.7653L19.0145 31.4805Z" fill="#FF5154"/>
                            <Path d="M29.5991 22.8455C29.1685 23.8169 27.7204 23.5352 27.6854 22.4733L27.2035 7.84819C27.1823 7.20616 27.7633 6.71099 28.3939 6.83365L34.805 8.08079C35.4356 8.20344 35.7886 8.8803 35.5283 9.46758L29.5991 22.8455Z" fill="#FF5154"/>
                          </Svg>
                        ) : emotion.emotion === '보통' ? (
                          <Svg width="111" height="78" viewBox="0 0 111 71" fill="none">
                            <Path d="M61.5636 1.54608C62.8324 0.624249 64.5505 0.624246 65.8193 1.54607L98.3614 25.1893C99.6302 26.1111 100.161 27.7451 99.6765 29.2367L87.2465 67.4922C86.7619 68.9838 85.3719 69.9936 83.8036 69.9936H43.5793C42.011 69.9936 40.6211 68.9838 40.1364 67.4922L27.7065 29.2367C27.2218 27.7451 27.7527 26.1111 29.0215 25.1893L61.5636 1.54608Z" fill="#5CC463"/>
                            <Line x1="61.7787" y1="39.183" x2="65.6044" y2="39.183" stroke="#0A0A0A" strokeWidth="0.845631" strokeLinecap="round"/>
                            <Circle cx="56.5978" cy="28.5516" r="6.81884" fill="#F5F5F5"/>
                            <Circle cx="70.8151" cy="28.5516" r="6.81884" fill="#F5F5F5"/>
                            <Mask id={`mask0_normal_${index}`} maskType="alpha" maskUnits="userSpaceOnUse" x="49" y="21" width="15" height="15">
                              <Circle cx="56.5974" cy="28.5515" r="6.81884" fill="#F5F5F5"/>
                            </Mask>
                            <G mask={`url(#mask0_normal_${index})`}>
                              <Circle cx="50.9102" cy="28.5519" r="6.81924" fill="#0A0A0A"/>
                            </G>
                            <Mask id={`mask1_normal_${index}`} maskType="alpha" maskUnits="userSpaceOnUse" x="63" y="21" width="15" height="15">
                              <Circle cx="70.8163" cy="28.5515" r="6.81884" fill="#F5F5F5"/>
                            </Mask>
                            <G mask={`url(#mask1_normal_${index})`}>
                              <Circle cx="65.1303" cy="28.5519" r="6.81924" fill="#0A0A0A"/>
                            </G>
                            <Path d="M58.9192 29.5514C58.9192 30.0093 58.7373 30.4484 58.4136 30.7721C58.0898 31.0959 57.6507 31.2778 57.1928 31.2778C56.735 31.2778 56.2958 31.0959 55.9721 30.7721C55.6483 30.4484 55.4664 30.0093 55.4664 29.5514L57.1928 29.5514H58.9192Z" fill="#F5F5F5"/>
                            <Path d="M73.1365 29.5514C73.1365 30.0093 72.9546 30.4484 72.6308 30.7721C72.3071 31.0959 71.868 31.2778 71.4101 31.2778C70.9522 31.2778 70.5131 31.0959 70.1894 30.7721C69.8656 30.4484 69.6837 30.0093 69.6837 29.5514L71.4101 29.5514H73.1365Z" fill="#F5F5F5"/>
                            <Path d="M102.454 56.926C102.897 56.6041 103.497 56.6041 103.94 56.926L109.298 60.8193C109.741 61.1412 109.927 61.7117 109.758 62.2324L107.711 68.532C107.541 69.0527 107.056 69.4053 106.509 69.4053H99.8849C99.3373 69.4053 98.8521 69.0527 98.6829 68.532L96.636 62.2324C96.4668 61.7117 96.6522 61.1412 97.0951 60.8193L102.454 56.926Z" fill="#009F78"/>
                            <Path d="M9.05864 38.636C9.35559 37.9691 10.0482 37.5692 10.7743 37.6455L21.2404 38.7455C21.9665 38.8218 22.5608 39.357 22.7126 40.0711L24.9006 50.3649C25.0524 51.079 24.7271 51.8096 24.0949 52.1747L14.981 57.4366C14.3488 57.8016 13.5534 57.718 13.0108 57.2295L5.19013 50.1877C4.64758 49.6992 4.4813 48.9169 4.77824 48.25L9.05864 38.636Z" fill="#009F78"/>
                          </Svg>
                        ) : (
                          // 다른 감정들은 나중에 추가될 예정이므로 자리만 비워둠
                          <View style={styles.emotionPlaceholder}>
                            <Text style={styles.emotionPlaceholderText}>{emotion.emotion}</Text>
                          </View>
                        )}
                      </View>
                      {/* 감정 이름과 횟수 */}
                      <View style={styles.emotionCardTextContainer}>
                        <Text style={styles.emotionCardName}>{emotion.emotion}</Text>
                        <Text style={styles.emotionCardCount}>{emotion.count}회</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View style={styles.emptyEmotionCard}>
                  <Text style={styles.emptyEmotionText}>기록된 감정이 없습니다.</Text>
                </View>
              )}
            </View>
          </>
        )}
      </View>

      {/* 페이지바 (3개 점) */}
      <View style={styles.pageIndicatorContainer}>
        {[0, 1, 2].map((index) => {
          if (index === 0) {
            // 첫 번째 페이지
            return (
              <TouchableOpacity
                key={index}
                onPress={() => setCurrentPageIndex(index)}
                style={styles.pageIndicatorTouchable}
              >
                <Svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <Circle 
                    cx={7} 
                    cy={7} 
                    r={7} 
                    fill={currentPageIndex === index ? "#CECECE" : "#2C2C2C"}
                  />
                </Svg>
              </TouchableOpacity>
            );
          } else if (index === 2) {
            // 마지막 페이지 (타원)
            return (
              <TouchableOpacity
                key={index}
                onPress={() => setCurrentPageIndex(index)}
                style={styles.pageIndicatorTouchable}
              >
                <Svg width="15" height="14" viewBox="0 0 15 14" fill="none">
                  <Ellipse
                    cx={7.5}
                    cy={7}
                    rx={7.5}
                    ry={7}
                    fill={currentPageIndex === index ? "#CECECE" : "#2C2C2C"}
                  />
                </Svg>
              </TouchableOpacity>
            );
          } else {
            // 중간 페이지
            return (
              <TouchableOpacity
                key={index}
                onPress={() => setCurrentPageIndex(index)}
                style={styles.pageIndicatorTouchable}
              >
                <Svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <Circle 
                    cx={7} 
                    cy={7} 
                    r={7} 
                    fill={currentPageIndex === index ? "#CECECE" : "#2C2C2C"}
                  />
                </Svg>
              </TouchableOpacity>
            );
          }
        })}
      </View>

      {/* 하단 네비게이션 바 */}
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
    width: 390,
    height: 844,
    backgroundColor: '#0A0A0A',
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    overflow: 'visible',
  },
  tabContainer: {
    position: 'absolute',
    top: 118, // 헤더 아래 (세부 페이지와 동일)
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
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
  questionContainer: {
    position: 'absolute',
    top: 178, // 상단에서 178px
    left: 24,
  },
  questionText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 0.64,
    textAlign: 'left',
    lineHeight: 48,
    fontFamily: Platform.OS === 'web' ? 'Pretendard' : undefined,
  },
  answerContainer: {
    position: 'absolute',
    top: 333,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  answerText: {
    color: '#FFFFFF',
    fontSize: 50,
    fontWeight: '700',
    letterSpacing: 1,
    textAlign: 'center',
    fontFamily: Platform.OS === 'web' ? 'Pretendard' : undefined,
  },
  animationContainer: {
    position: 'absolute',
    top: 490, // 상단에서 470px
    left: 0,
    right: 0,
    height: 150, // 5px 선 5개 + 15px 간격 4개 = 25px + 60px = 85px (여유를 두어 90px)
    alignItems: 'center',
    justifyContent: 'center',
  },
  animationSvg: {
    width: '100%',
    height: '100%',
  },
  pageIndicatorContainer: {
    position: 'absolute',
    bottom: 92, // 네비게이션 바(bottom: 24, height: 58) 상단에서 10px 간격 = 24 + 58 + 10 = 92
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 15, // 인디케이터 간격
    zIndex: 1000, // 네비게이션 바와 같은 z-index로 고정
  },
  pageIndicatorTouchable: {
    width: 14,
    height: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationCardsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    width: '100%',
    minHeight: 400,
  },
  locationCard: {
    position: 'absolute',
    left: 24,
    width: 345,
    height: 96,
    backgroundColor: '#3A3A3A',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: 20,
    overflow: 'hidden', // 카드 밖으로 넘어가는 부분 가리기
  },
  emptyLocationCard: {
    position: 'absolute',
    top: 298,
    left: 24,
    width: 345,
    height: 96,
    backgroundColor: '#3A3A3A',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyLocationText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'web' ? 'Pretendard' : undefined,
  },
  locationCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingRight: 20,
  },
  locationCardText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.4,
    lineHeight: 30,
    fontFamily: Platform.OS === 'web' ? 'Pretendard' : undefined,
  },
  locationCardIcon: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationCardSvgContainer: {
    position: 'absolute',
    top: 23, // 카드 상단에서 23px 떨어진 위치
    right: 23, // 카드 오른쪽에서 23px 떨어진 위치
    width: 169,
    height: 73,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationCardSvgContainerSecond: {
    position: 'absolute',
    left: 121, //카드 왼쪽에서 131px 떨어진 위치
    width: 215,
    height: 96,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationCardSvgContainerThird: {
    position: 'absolute',
    top: 22, // 카드 상단에서 22px 떨어진 위치
    right: 18, // 카드 오른쪽에서 18px 떨어진 위치
    width: 179,
    height: 74,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationCardSvgContainerFourth: {
    position: 'absolute',
    top: 32, // 카드 상단에서 32px 떨어진 위치
    right: 66, // 카드 오른쪽에서 66px 떨어진 위치
    width: 83,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  emotionCardsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    width: '100%',
    minHeight: 500,
    overflow: 'visible',
  },
  emotionCard: {
    position: 'absolute',
    width: 165,
    height: 206,
    backgroundColor: '#3A3A3A',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 42,
  },
  emotionCardOverflowVisible: {
    overflow: 'visible',
  },
  emotionCardIcon: {
    width: 75,
    height: 71,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },
  emotionCardIconOverflowVisible: {
    overflow: 'visible',
    width: 108, // SVG 실제 크기에 맞춤
    height: 75,
    marginTop: -5, // 위로 3px 이동
  },
  emotionCardIconNormal: {
    left: -7,
  },
  emotionCardIconSurprise: {
    top: -5,
  },
  emotionCardImage: {
    width: 75,
    height: 71,
  },
  emotionCardTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emotionCardName: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '600',
    letterSpacing: 0.5,
    fontFamily: Platform.OS === 'web' ? 'Pretendard' : undefined,
  },
  emotionCardCount: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginLeft: 8,
    fontFamily: Platform.OS === 'web' ? 'Pretendard' : undefined,
  },
  emotionPlaceholder: {
    width: 75,
    height: 71,
    backgroundColor: '#2C2C2C',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emotionPlaceholderText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Platform.OS === 'web' ? 'Pretendard' : undefined,
  },
  emptyEmotionCard: {
    position: 'absolute',
    top: 298,
    left: 24,
    width: 345,
    height: 206,
    backgroundColor: '#3A3A3A',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyEmotionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'web' ? 'Pretendard' : undefined,
  },
});

export default ArchiveScreen;

