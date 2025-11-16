import { FC, useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';

import { useApp } from '../../contexts/AppContext';
import NavigationBar from '../../components/NavigationBar';
import Header from '../../components/Header';
import DeleteConfirmModal from '../../components/DeleteConfirmModal';
import { getUserFromStorage, getUser, getRecordings, Recording, deleteRecording } from '../../services/api';

// iPhone 15, 15 Pro 크기 기준
const screenWidth = 390;
const screenHeight = 844;

type ProfileScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Profile'>;

const ProfileScreen: FC = () => {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const { isOnboardingCompleted } = useApp();
  const [userName, setUserName] = useState<string>('');
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [recordingCount, setRecordingCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // 감정별 색상 매핑
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

  // 날짜 포맷팅
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}월 ${day}일`;
  };
  
  // 사용자 정보 및 녹음 기록 로드
  useEffect(() => {
    const loadUserInfoAndRecordings = async () => {
      try {
        setLoading(true);
        // 로컬 스토리지에서 사용자 정보 가져오기
        const userInfo = getUserFromStorage();
        if (userInfo) {
          setUserName(userInfo.name);
          
          // 최신 정보를 위해 API에서도 가져오기 (선택사항)
          try {
            const response = await getUser(userInfo.id);
            if (response.success && response.user) {
              setUserName(response.user.name);
              setRecordingCount(response.user.recording_count || 0);
            }
          } catch (error) {
            console.log('API에서 사용자 정보 가져오기 실패, 로컬 스토리지 사용:', error);
          }

          // 사용자의 녹음 기록 가져오기
          try {
            const recordingsResponse = await getRecordings({
              userId: userInfo.id,
              limit: 50, // 최대 50개까지
            });
            if (recordingsResponse.success) {
              setRecordings(recordingsResponse.recordings);
            }
          } catch (error) {
            console.error('녹음 기록 로드 오류:', error);
          }
        }
        setLoading(false);
      } catch (error) {
        console.error('사용자 정보 로드 오류:', error);
        setLoading(false);
      }
    };
    
    loadUserInfoAndRecordings();
  }, []);
  
  // 온보딩 완료 상태 확인
  useEffect(() => {
    if (!isOnboardingCompleted) {
      navigation.navigate('OnBoarding');
    }
  }, [isOnboardingCompleted, navigation]);

  // 장시간 누름 시작 핸들러
  const handleLongPressStart = (recording: Recording) => {
    setSelectedRecording(recording);
    longPressTimerRef.current = setTimeout(() => {
      setShowDeleteModal(true);
    }, 1000); // 1초 후 삭제 모달 표시
  };

  // 장시간 누름 종료 핸들러
  const handleLongPressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // 일반 클릭 핸들러 (내기록 화면으로 이동)
  const handleCardPress = () => {
    // 타이머가 실행 중이면 취소하고 내기록 화면으로 이동하지 않음
    if (longPressTimerRef.current) {
      handleLongPressEnd();
      return;
    }
    // 타이머가 실행되지 않았으면 내기록 화면으로 이동
    navigation.navigate('Records');
  };

  // 녹음 삭제 함수
  const handleDeleteRecording = async () => {
    if (!selectedRecording) return;

    try {
      const response = await deleteRecording(selectedRecording.id);
      if (response.success) {
        // 녹음 목록에서 삭제
        setRecordings(prev => prev.filter(r => r.id !== selectedRecording.id));
        // 기록 개수 감소
        setRecordingCount(prev => Math.max(0, prev - 1));
        // 선택된 녹음 초기화
        setSelectedRecording(null);
        // 모달 닫기
        setShowDeleteModal(false);
      }
    } catch (error) {
      console.error('녹음 삭제 오류:', error);
      setShowDeleteModal(false);
    }
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
      
      {/* 배경 프레임 */}
      <View style={styles.frame} />

      {/* 상단 헤더 */}
      <Header />

      {/* 프로필 이미지 */}
      <View style={styles.profileImageContainer}>
        <View style={styles.profileImage}>
          <Text style={styles.profileText}>{userName ? userName.charAt(0) : ''}</Text>
        </View>
      </View>

      {/* 사용자명 */}
      <View style={styles.userNameContainer}>
        <Text style={styles.userName}>{userName}</Text>
      </View>

      {/* 프로필 편집 버튼 */}
      <TouchableOpacity style={styles.editButton}>
        <Text style={styles.editButtonText}>프로필 편집</Text>
      </TouchableOpacity>

      {/* 통계 섹션 */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{recordingCount}</Text>
          <Text style={styles.statLabel}>게시물</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>팔로워</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>팔로잉</Text>
        </View>
      </View>

      {/* 기록 모음 제목 */}
      <View style={styles.recordsTitleContainer}>
        <Text style={styles.recordsTitle}>기록 모음</Text>
      </View>

      {/* 감정 기록 카드들 */}
      {recordings.length > 0 ? (
        <ScrollView 
          style={styles.emotionCardsContainer}
          horizontal={true}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.emotionCardsContent}
        >
          {recordings.map((recording) => (
            <TouchableOpacity
              key={recording.id}
              style={[styles.emotionCard, { backgroundColor: getEmotionColor(recording.emotion) }]}
              onPress={handleCardPress}
              onPressIn={() => handleLongPressStart(recording)}
              onPressOut={handleLongPressEnd}
            >
              <Text style={styles.emotionDate}>{formatDate(recording.recorded_at)}</Text>
              <Text style={styles.emotionText}>{recording.emotion}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        !loading && (
          <View style={styles.emotionCardsContainer}>
            <Text style={styles.emptyText}>기록이 없습니다</Text>
          </View>
        )
      )}

      {/* 하단 네비게이션 바 */}
      <NavigationBar 
        onNavigateToRecords={() => navigation.navigate('Records')} 
        onNavigateToRecording={() => navigation.navigate('Recording')} 
        onNavigateToProfile={() => navigation.navigate('Profile')}
        onNavigateToFeed={() => navigation.navigate('Feed')}
        onNavigateToArchive={() => navigation.navigate('Archive')}
        currentPage="Profile"
      />

      {/* 삭제 확인 모달 */}
      <DeleteConfirmModal
        visible={showDeleteModal}
        onConfirm={handleDeleteRecording}
        onCancel={() => {
          setShowDeleteModal(false);
          setSelectedRecording(null);
        }}
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
  profileImageContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 126,
    alignItems: 'center',
  },
  profileImage: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: '#C4C4C4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileText: {
    color: '#FFFFFF',
    fontSize: 40,
    fontWeight: '600',
  },
  userNameContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 270,
    transform: [{ translateY: -16 }],
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 0.64,
    textAlign: 'center',
  },
  editButton: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 320,
    transform: [{ translateY: -11 }],
  },
  editButtonText: {
    color: '#B780FF',
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: 0.44,
    textAlign: 'center',
  },
  statsContainer: {
    position: 'absolute',
    left: 24,
    top: 354,
    width: 345,
    height: 100,
    backgroundColor: '#3A3A3A',
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNumber: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: 0.44,
    marginBottom: 8,
  },
  statLabel: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  statDivider: {
    width: 1,
    height: 60,
    backgroundColor: '#FFFFFF',
    opacity: 0.2,
  },
  recordsTitleContainer: {
    position: 'absolute',
    left: 24,
    top: 526.5,
    transform: [{ translateY: -11 }],
  },
  recordsTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: 0.44,
  },
  emotionCardsContainer: {
    position: 'absolute',
    left: 24,
    top: 559,
    width: 345,
    height: 168,
  },
  emotionCardsContent: {
    flexDirection: 'row',
    gap: 8,
  },
  emotionCard: {
    width: 150,
    height: 150,
    borderRadius: 20,
    paddingTop: 20,
    paddingBottom: 82,
    paddingLeft: 22,
    alignItems: 'flex-start',
    position: 'relative',
  },
  emptyText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 0.4,
    textAlign: 'center',
    opacity: 0.5,
    fontFamily: Platform.OS === 'web' ? 'Pretendard' : undefined,
  },
  emotionDate: {
    color: '#000000',
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: 0.44,
    marginBottom: 4,
    textAlign: 'left',
    fontFamily: Platform.OS === 'web' ? 'Pretendard' : undefined,
  },
  emotionText: {
    color: '#000000',
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: 0.44,
    textAlign: 'left',
    fontFamily: Platform.OS === 'web' ? 'Pretendard' : undefined,
  },
  emotionIcon: {
    position: 'absolute',
    right: 8,
    bottom: 8,
  },
});

export default ProfileScreen;
