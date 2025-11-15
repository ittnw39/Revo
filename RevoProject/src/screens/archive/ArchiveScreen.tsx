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
import Svg, { Circle, Ellipse, Path, G, Mask } from 'react-native-svg';

// 웹 환경에서 document 사용을 위한 타입 선언
declare const document: {
  addEventListener: (event: string, handler: (e: any) => void) => void;
  removeEventListener: (event: string, handler: (e: any) => void) => void;
};

import { useApp } from '../../contexts/AppContext';
import NavigationBar from '../../components/NavigationBar';
import Header from '../../components/Header';
import { getRecordings, getUserFromStorage, Recording } from '../../services/api';

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

  // 총 녹음 시간 계산 (분 단위)
  // 실제로는 audio_file의 duration을 사용해야 하지만, 현재는 기록 개수로 임시 계산
  // TODO: 실제 오디오 파일 duration 정보를 사용하도록 수정 필요
  const totalMinutes = useMemo(() => {
    // 임시로 기록 개수 * 평균 1분으로 계산 (실제로는 오디오 파일 duration 합계 사용)
    return filteredRecordings.length; // 임시: 기록 개수 = 분
  }, [filteredRecordings]);

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
        answer: `${totalMinutes}분\n남겼어요`,
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
      answer: `${totalMinutes}분\n남겼어요`,
    };
  }, [currentMonth, totalMinutes, currentPageIndex]);

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
        {/* 월별/전체 탭 버튼 */}
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

            {/* 파도 배경 이미지 */}
            <View style={styles.waveContainer}>
              {/* 파도 SVG - 5개의 곡선 파도 */}
              <Svg width="393" height="200" viewBox="0 0 393 200" style={styles.waveSvg}>
                {/* 파도 1 - 곡선 형태 */}
                <Path
                  d="M-124 41 Q100 35, 300 41 T724 41 T1148 41 T1572 41 T1720 41"
                  stroke="#B780FF"
                  strokeWidth="2"
                  strokeLinecap="round"
                  fill="none"
                />
                {/* 파도 2 */}
                <Path
                  d="M-124 59 Q100 53, 300 59 T724 59 T1148 59 T1572 59 T1720 59"
                  stroke="#B780FF"
                  strokeWidth="2"
                  strokeLinecap="round"
                  fill="none"
                />
                {/* 파도 3 */}
                <Path
                  d="M-124 77 Q100 71, 300 77 T724 77 T1148 77 T1572 77 T1720 77"
                  stroke="#B780FF"
                  strokeWidth="2"
                  strokeLinecap="round"
                  fill="none"
                />
                {/* 파도 4 */}
                <Path
                  d="M-124 95 Q100 89, 300 95 T724 95 T1148 95 T1572 95 T1720 95"
                  stroke="#B780FF"
                  strokeWidth="2"
                  strokeLinecap="round"
                  fill="none"
                />
                {/* 파도 5 */}
                <Path
                  d="M-124 113 Q100 107, 300 113 T724 113 T1148 113 T1572 113 T1720 113"
                  stroke="#B780FF"
                  strokeWidth="2"
                  strokeLinecap="round"
                  fill="none"
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
                    <View key={index} style={[styles.locationCard, { top: cardTop }]}>
                      <View style={styles.locationCardContent}>
                        <Text style={styles.locationCardText}>
                          {location.district}에서 {location.count}회{'\n'}기록했어요
                        </Text>
                        {/* 카드 오른쪽 아이콘 영역 */}
                        <View style={styles.locationCardIcon}>
                          {/* 각 카드별로 다른 아이콘 (임시로 원형으로 표시) */}
                          <View style={[styles.locationIconCircle, { backgroundColor: index === 0 ? '#FED046' : index === 1 ? '#EE47CA' : index === 2 ? '#5CC463' : '#47AFF4' }]} />
                        </View>
                      </View>
                    </View>
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
                    <View key={index} style={[styles.emotionCard, { top: cardTop, left: cardLeft }]}>
                      {/* 감정 SVG */}
                      <View style={styles.emotionCardIcon}>
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
                          <Svg width="75" height="71" viewBox="30 25 75 80" fill="none" preserveAspectRatio="xMidYMid meet">
                            <Path d="M54.8304 37.4541C58.6609 25.6652 75.3391 25.6652 79.1696 37.4541C80.8826 42.7263 85.7957 46.2959 91.3392 46.2959C103.735 46.2959 108.889 62.1578 98.8604 69.4438C94.3756 72.7022 92.499 78.4778 94.212 83.75C98.0425 95.539 84.5495 105.342 74.5212 98.0562C70.0364 94.7978 63.9636 94.7978 59.4788 98.0562C49.4505 105.342 35.9575 95.539 39.788 83.75C41.501 78.4778 39.6244 72.7022 35.1396 69.4438C25.1113 62.1578 30.2652 46.2959 42.6608 46.2959C48.2043 46.2959 53.1174 42.7263 54.8304 37.4541Z" fill="#F99841"/>
                            <Circle cx="6.62561" cy="6.62561" r="6.62561" transform="matrix(-1 0 0 1 80.5472 52.2979)" fill="#F5F5F5"/>
                            <Circle cx="6.62561" cy="6.62561" r="6.62561" transform="matrix(-1 0 0 1 66.7345 52.2979)" fill="#F5F5F5"/>
                            <Mask id={`mask0_surprise_${index}`} maskType="alpha" maskUnits="userSpaceOnUse" x="67" y="52" width="14" height="14">
                              <Circle cx="6.62561" cy="6.62561" r="6.62561" transform="matrix(-1 0 0 1 80.5476 52.2975)" fill="#F5F5F5"/>
                            </Mask>
                            <G mask={`url(#mask0_surprise_${index})`}>
                              <Circle cx="6.62599" cy="6.62599" r="6.62599" transform="matrix(-1 0 0 1 86.0753 52.2975)" fill="#0A0A0A"/>
                            </G>
                            <Mask id={`mask1_surprise_${index}`} maskType="alpha" maskUnits="userSpaceOnUse" x="53" y="52" width="14" height="14">
                              <Circle cx="6.62561" cy="6.62561" r="6.62561" transform="matrix(-1 0 0 1 66.7346 52.298)" fill="#F5F5F5"/>
                            </Mask>
                            <G mask={`url(#mask1_surprise_${index})`}>
                              <Circle cx="6.62599" cy="6.62599" r="6.62599" transform="matrix(-1 0 0 1 72.2603 52.298)" fill="#0A0A0A"/>
                            </G>
                            <Mask id={`path-8-inside-1_surprise_${index}`} fill="white">
                              <Path d="M65.6055 66.9208C65.1235 65.1217 65.6543 63.416 66.7917 63.1109C67.9293 62.8061 69.2428 64.0178 69.7249 65.817L65.6055 66.9208Z"/>
                            </Mask>
                            <Path d="M65.6055 66.9208C65.1235 65.1217 65.6543 63.416 66.7917 63.1109C67.9293 62.8061 69.2428 64.0178 69.7249 65.817L65.6055 66.9208Z" fill="#0A0A0A"/>
                            <Path d="M65.6055 66.9208L65.2643 67.0122L65.3557 67.3534L65.697 67.262L65.6055 66.9208ZM66.7917 63.1109L66.7003 62.7697L66.7002 62.7697L66.7917 63.1109ZM69.7249 65.817L69.8163 66.1582L70.1575 66.0668L70.0661 65.7256L69.7249 65.817ZM65.6055 66.9208L65.9467 66.8294C65.7203 65.9843 65.7367 65.177 65.9286 64.5606C66.1221 63.9392 66.4727 63.5622 66.8832 63.4521L66.7917 63.1109L66.7002 62.7697C65.9733 62.9647 65.4898 63.5931 65.254 64.3506C65.0166 65.1131 65.0087 66.0583 65.2643 67.0122L65.6055 66.9208ZM66.7917 63.1109L66.8831 63.4521C67.2937 63.3421 67.7861 63.4932 68.2645 63.9346C68.7391 64.3724 69.1572 65.0633 69.3836 65.9084L69.7249 65.817L70.0661 65.7256C69.8104 64.7715 69.3307 63.9569 68.7436 63.4153C68.1604 62.8773 67.4273 62.5749 66.7003 62.7697L66.7917 63.1109ZM69.7249 65.817L69.6334 65.4758L65.5141 66.5796L65.6055 66.9208L65.697 67.262L69.8163 66.1582L69.7249 65.817Z" fill="black" mask={`url(#path-8-inside-1_surprise_${index})`}/>
                            <Path d="M61.3755 59.8942C61.3755 60.339 61.1988 60.7656 60.8843 61.0801C60.5698 61.3946 60.1432 61.5713 59.6984 61.5713C59.2537 61.5713 58.8271 61.3946 58.5126 61.0801C58.1981 60.7656 58.0214 60.339 58.0214 59.8942L59.6984 59.8942H61.3755Z" fill="#F5F5F5"/>
                            <Path d="M75.1902 59.8942C75.1902 60.339 75.0135 60.7656 74.699 61.0801C74.3845 61.3946 73.9579 61.5713 73.5131 61.5713C73.0683 61.5713 72.6418 61.3946 72.3273 61.0801C72.0128 60.7656 71.8361 60.339 71.8361 59.8942L73.5131 59.8942H75.1902Z" fill="#F5F5F5"/>
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
                    </View>
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
    paddingTop: 118, // 헤더 아래부터 시작
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
  waveContainer: {
    position: 'absolute',
    bottom: 200, // 네비게이션 바 위쪽
    left: 0,
    right: 0,
    height: 200,
    overflow: 'hidden',
  },
  waveSvg: {
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
  emotionCardIcon: {
    width: 75,
    height: 71,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
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

