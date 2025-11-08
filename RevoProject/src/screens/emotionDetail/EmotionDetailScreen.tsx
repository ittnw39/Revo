import { FC, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import NavigationBar from '../../components/NavigationBar';
import Header from '../../components/Header';

import { useApp } from '../../contexts/AppContext';

// iPhone 15, 15 Pro 크기 기준
const screenWidth = 390;
const screenHeight = 844;

type EmotionDetailScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'EmotionDetail'>;

const EmotionDetailScreen: FC = () => {
  const navigation = useNavigation<EmotionDetailScreenNavigationProp>();
  const { isOnboardingCompleted } = useApp();
  
  // 온보딩 완료 상태 확인
  useEffect(() => {
    if (!isOnboardingCompleted) {
      navigation.navigate('OnBoarding');
    }
  }, [isOnboardingCompleted, navigation]);
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* 배경 프레임 */}
      <View style={styles.frame} />

      {/* 상단 헤더 */}
      <Header />

      {/* 제목 섹션 */}
      <View style={styles.titleContainer}>
        <Text style={styles.dateText}>7월 26일</Text>
        <Text style={styles.subtitleText}>내가 올린 기록</Text>
      </View>

      {/* 사용자 정보 섹션 */}
      <View style={styles.userInfoContainer}>
        <View style={styles.userInfoLeft}>
          <View style={styles.userProfileImage} />
          <Text style={styles.userName}>홍시천사</Text>
        </View>
        <TouchableOpacity style={styles.deleteButton}>
          <Text style={styles.deleteButtonText}>삭제하기</Text>
        </TouchableOpacity>
      </View>

      {/* 감정 표현 영역 */}
      <View style={styles.emotionExpressionContainer}>
        {/* 큰 원형 배경 */}
        <View style={styles.emotionBackground} />
        
        {/* 캐릭터 얼굴 SVG */}
        <View style={styles.characterContainer}>
          <svg width="247" height="135" viewBox="0 0 248 140" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="60.4719" cy="60.4719" r="60.4719" fill="#F5F5F5"/>
            <circle cx="186.556" cy="60.4719" r="60.4719" fill="#F5F5F5"/>
            <mask id="mask0_3250_4286" style={{maskType:'alpha'}} maskUnits="userSpaceOnUse" x="-1" y="0" width="122" height="121">
              <circle cx="60.4714" cy="60.4719" r="60.4719" fill="#F5F5F5"/>
            </mask>
            <g mask="url(#mask0_3250_4286)">
              <circle cx="10.0421" cy="60.4755" r="60.4755" fill="#0A0A0A"/>
            </g>
            <mask id="mask1_3250_4286" style={{maskType:'alpha'}} maskUnits="userSpaceOnUse" x="126" y="0" width="122" height="121">
              <circle cx="186.556" cy="60.4719" r="60.4719" fill="#F5F5F5"/>
            </mask>
            <g mask="url(#mask1_3250_4286)">
              <circle cx="136.126" cy="60.4755" r="60.4755" fill="#0A0A0A"/>
            </g>
            <path d="M104.47 120.681C104.47 138.693 136.891 139.593 136.891 120.681" stroke="#0A0A0A" strokeWidth="9.00602" strokeLinecap="round"/>
            <path d="M82.8549 71.1472C82.8549 75.2077 81.2418 79.1019 78.3706 81.9731C75.4994 84.8444 71.6051 86.4574 67.5446 86.4574C63.4841 86.4574 59.5899 84.8444 56.7186 81.9731C53.8474 79.1019 52.2344 75.2077 52.2344 71.1472L67.5446 71.1472H82.8549Z" fill="#F5F5F5"/>
            <path d="M208.94 71.1472C208.94 75.2077 207.327 79.1019 204.456 81.9731C201.584 84.8444 197.69 86.4574 193.63 86.4574C189.569 86.4574 185.675 84.8444 182.804 81.9731C179.932 79.1019 178.319 75.2077 178.319 71.1472L193.63 71.1472H208.94Z" fill="#F5F5F5"/>
          </svg>
        </View>
      </View>

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
    overflow: 'hidden',
  },
  frame: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 390,
    height: 844,
    backgroundColor: '#000000',
  },
  titleContainer: {
    position: 'absolute',
    left: 24,
    top: 118,
  },
  dateText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 0.64,
    marginBottom: 4,
  },
  subtitleText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 0.64,
  },
  userInfoContainer: {
    position: 'absolute',
    left: 24,
    top: 222,
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
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 0.4,
    flex: 1,
  },
  deleteButton: {
    backgroundColor: '#B780FF',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 50,
  },
  deleteButtonText: {
    color: '#000000',
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  emotionExpressionContainer: {
    position: 'absolute',
    left: -102,
    top: 318,
    width: 598,
    height: 600,
    overflow: 'hidden',
  },
  emotionBackground: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 598,
    height: 600,
    borderRadius: 299,
    backgroundColor: '#FFD630',
  },
  characterContainer: {
    position: 'absolute',
    left: 149,
    top: 171,
    right: 202,
    width: 247,
    height: 135,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default EmotionDetailScreen;
