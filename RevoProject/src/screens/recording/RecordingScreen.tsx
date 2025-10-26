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

import { useApp } from '../../contexts/AppContext';
// Ellipse196 SVG를 코드로 대체
import NavigationBar from '../../components/NavigationBar';
import Header from '../../components/Header';
// JPG 이미지 대신 기본 프로필 이미지 사용

// iPhone 15, 15 Pro 크기 기준
const screenWidth = 393;
const screenHeight = 852;

type RecordingScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Recording'>;

const RecordingScreen: FC = () => {
  const navigation = useNavigation<RecordingScreenNavigationProp>();
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

      {/* 날짜 텍스트 */}
      <View style={styles.dateContainer}>
        <Text style={styles.dateText}>7월 7일</Text>
      </View>

      {/* 메인 텍스트 */}
      <View style={styles.mainTextContainer}>
        <Text style={styles.mainText}>녹음을 시작하세요</Text>
      </View>

      {/* 녹음 버튼 */}
      <View style={styles.recordingButtonContainer}>
        <TouchableOpacity style={styles.recordingButton}>
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" fill="none">
            <circle cx="32" cy="32" r="32" fill="#B780FF"/>
          </svg>
          <View style={styles.recordingIconContainer}>
            <svg width="25" height="29" viewBox="0 0 29 33" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M14.5017 2C13.0664 2 11.6898 2.52377 10.6749 3.4561C9.6599 4.38842 9.08971 5.65292 9.08971 6.97143V13.6C9.08971 14.9185 9.6599 16.183 10.6749 17.1153C11.6898 18.0477 13.0664 18.5714 14.5017 18.5714C15.9371 18.5714 17.3137 18.0477 18.3286 17.1153C19.3436 16.183 19.9138 14.9185 19.9138 13.6V6.97143C19.9138 5.65292 19.3436 4.38842 18.3286 3.4561C17.3137 2.52377 15.9371 2 14.5017 2Z" fill="black"/>
              <path d="M1.99994 15.2571C2.43704 18.0159 3.94082 20.5379 6.23618 22.3618C8.53154 24.1856 11.465 25.1893 14.4999 25.1893M14.4999 25.1893C17.5349 25.1893 20.4683 24.1856 22.7637 22.3618C25.0591 20.5379 26.5628 18.0159 26.9999 15.2571M14.4999 25.1893V31M14.5017 2C13.0664 2 11.6898 2.52377 10.6749 3.4561C9.6599 4.38842 9.08971 5.65292 9.08971 6.97143V13.6C9.08971 14.9185 9.6599 16.183 10.6749 17.1153C11.6898 18.0477 13.0664 18.5714 14.5017 18.5714C15.9371 18.5714 17.3137 18.0477 18.3286 17.1153C19.3436 16.183 19.9138 14.9185 19.9138 13.6V6.97143C19.9138 5.65292 19.3436 4.38842 18.3286 3.4561C17.3137 2.52377 15.9371 2 14.5017 2Z" stroke="black" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 15.5938C2.4371 18.2935 3.94088 20.7616 6.23624 22.5465C8.5316 24.3313 11.4651 25.3136 14.5 25.3136M14.5 25.3136C17.5349 25.3136 20.4684 24.3313 22.7638 22.5465C25.0591 20.7616 26.5629 18.2935 27 15.5938M14.5 25.3136V31" stroke="black" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </View>
        </TouchableOpacity>
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
    top: 182,
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
    top: 246,
  },
  mainText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 0.64,
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
  recordingIconContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -12.5 }, { translateY: -14.5 }], // 25x29 아이콘의 절반
  },
});

export default RecordingScreen;

