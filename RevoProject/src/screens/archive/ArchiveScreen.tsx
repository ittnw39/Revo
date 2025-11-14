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
import Svg, { Circle, Ellipse } from 'react-native-svg';

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

  // 페이지 인덱스에 따른 표시할 데이터
  const displayData = useMemo(() => {
    // 페이지별로 다른 데이터를 표시할 수 있도록 (현재는 동일)
    return {
      question: `${currentMonth}월에는 얼마나\n기록을 남겼을까요?`,
      answer: `${totalMinutes}분 남겼어요`,
    };
  }, [currentMonth, totalMinutes]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* 배경 프레임 */}
      <View style={styles.frame} />

      {/* 상단 헤더 */}
      <Header currentScreen="Archive" />

      {/* 메인 콘텐츠 영역 */}
      <View style={styles.contentContainer}>
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

        {/* 질문 텍스트 */}
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
            <path
              d="M-124 41 Q100 35, 300 41 T724 41 T1148 41 T1572 41 T1720 41"
              stroke="#B780FF"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
            />
            {/* 파도 2 */}
            <path
              d="M-124 59 Q100 53, 300 59 T724 59 T1148 59 T1572 59 T1720 59"
              stroke="#B780FF"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
            />
            {/* 파도 3 */}
            <path
              d="M-124 77 Q100 71, 300 77 T724 77 T1148 77 T1572 77 T1720 77"
              stroke="#B780FF"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
            />
            {/* 파도 4 */}
            <path
              d="M-124 95 Q100 89, 300 95 T724 95 T1148 95 T1572 95 T1720 95"
              stroke="#B780FF"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
            />
            {/* 파도 5 */}
            <path
              d="M-124 113 Q100 107, 300 113 T724 113 T1148 113 T1572 113 T1720 113"
              stroke="#B780FF"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
            />
          </Svg>
        </View>
      </View>

      {/* 페이지바 (3개 점) */}
      <View style={styles.pageIndicatorContainer}>
        <Svg width="75" height="14" viewBox="0 0 75 14" fill="none">
          {[0, 1, 2].map((index) => {
            if (index === 0) {
              // 첫 번째 페이지
              return (
                <Circle 
                  key={index} 
                  cx={7} 
                  cy={7} 
                  r={7} 
                  fill={currentPageIndex === index ? "#2C2C2C" : "#CECECE"}
                />
              );
            } else if (index === 2) {
              // 마지막 페이지 (타원)
              return (
                <Ellipse
                  key={index}
                  cx={67.5}
                  cy={7}
                  rx={7.5}
                  ry={7}
                  fill={currentPageIndex === index ? "#2C2C2C" : "#CECECE"}
                />
              );
            } else {
              // 중간 페이지
              return (
                <Circle 
                  key={index} 
                  cx={37} 
                  cy={7} 
                  r={7} 
                  fill={currentPageIndex === index ? "#2C2C2C" : "#CECECE"}
                />
              );
            }
          })}
        </Svg>
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
    top: 60,
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
    top: 393,
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
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
});

export default ArchiveScreen;

