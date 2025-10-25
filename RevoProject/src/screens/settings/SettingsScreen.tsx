import { FC, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import NavigationBar from '../../components/NavigationBar';
import Header from '../../components/Header';
import PageIndicator from '../../components/PageIndicator';
import ToggleButton from '../../components/ToggleButton';

// 웹 환경에서 localStorage 사용을 위한 타입 선언
declare const localStorage: {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

// 웹 환경에서 document 사용을 위한 타입 선언
declare const document: {
  addEventListener: (event: string, handler: (e: any) => void) => void;
  removeEventListener: (event: string, handler: (e: any) => void) => void;
};

// iPhone 15, 15 Pro 크기 기준
const screenWidth = 393;
const screenHeight = 852;

type SettingsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Settings'>;

const SettingsScreen: FC = () => {
  const navigation = useNavigation<SettingsScreenNavigationProp>();
  const [currentView, setCurrentView] = useState<'main' | 'accessibility'>('main');
  const [accessibilityStep, setAccessibilityStep] = useState(0); // 0: 다크모드, 1: 글자크기, 2: 화면읽기, 3: 하이라이트, 4: 제스처설정
  const [selectedFontSize, setSelectedFontSize] = useState(20); // 선택된 글자 크기
  const [darkMode, setDarkMode] = useState(true); // 다크모드 설정
  const [screenRead, setScreenRead] = useState(false); // 화면 읽기 설정
  const [highlight, setHighlight] = useState(true); // 하이라이트 설정
  const [gesture, setGesture] = useState(false); // 제스처 설정
  
  // 웹 환경에서 스와이프 핸들러
  const handleTouchStart = (e: any) => {
    const touch = e.touches[0];
    const startX = touch.clientX;
    
    const handleTouchMove = (moveEvent: any) => {
      const moveTouch = moveEvent.touches[0];
      const currentX = moveTouch.clientX;
      const deltaX = currentX - startX;
      
      if (Math.abs(deltaX) > 50) {
        if (deltaX > 0 && accessibilityStep > 0) {
          // 오른쪽으로 스와이프 - 이전 단계
          setAccessibilityStep(accessibilityStep - 1);
        } else if (deltaX < 0 && accessibilityStep < 4) {
          // 왼쪽으로 스와이프 - 다음 단계
          setAccessibilityStep(accessibilityStep + 1);
        }
        
        // 이벤트 리스너 제거
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      }
    };
    
    const handleTouchEnd = () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
    
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);
  };
  
  // 로컬스토리지에서 온보딩 완료 상태 확인
  useEffect(() => {
    const isOnboardingCompleted = localStorage.getItem('onboardingCompleted');
    if (isOnboardingCompleted !== 'true') {
      // 온보딩이 완료되지 않은 경우 온보딩 화면으로 이동
      navigation.navigate('OnBoarding');
    }
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* 배경 프레임 */}
      <View style={styles.frame} />

      {/* 상단 헤더 */}
      <Header 
        currentScreen="Settings" 
        onSettingsPress={() => navigation.goBack()}
      />

      {/* 접근성 화면 헤더 */}
      {currentView === 'accessibility' && (
        <View style={styles.accessibilityHeader}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => setCurrentView('main')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="28" viewBox="0 0 15 28" fill="none">
              <path d="M14 27L0.999999 14L14 0.999998" stroke="#F5F5F5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </TouchableOpacity>
          <Text style={styles.accessibilityTitle}>접근성</Text>
          <View style={styles.headerSpacer} />
        </View>
      )}

      {currentView === 'main' ? (
        <>
          {/* 사용자 정보 */}
          <View style={styles.userInfoContainer}>
            <Text style={styles.userInfoText}>D+197</Text>
            <Text style={styles.userInfoSubText}>홍시천사 여행자</Text>
          </View>

          {/* 설정 메뉴 리스트 */}
          <View style={styles.settingsList}>
            <TouchableOpacity 
              style={[styles.settingItem, { top: 0 }]}
              onPress={() => setCurrentView('accessibility')}
            >
              <Text style={styles.settingItemText}>접근성</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.settingItem, { top: 81 }]}>
              <Text style={styles.settingItemText}>프라이버시</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.settingItem, { top: 162 }]}>
              <Text style={styles.settingItemText}>알림/리마인더</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.settingItem, { top: 243 }]}>
              <Text style={styles.settingItemText}>친구설정</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.settingItem, { top: 324 }]}>
              <Text style={styles.settingItemText}>기타</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.logoutItem}>
              <Text style={styles.logoutText}>로그아웃</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <>
          {/* 접근성 화면 */}
          <View 
            style={styles.accessibilityContainer}
            onTouchStart={handleTouchStart}
          >
            {accessibilityStep === 0 && (
              <>
                <Text style={styles.darkModeTitle}>다크모드</Text>
                <Text style={styles.darkModeDescription}>
                  화면 밝기를 줄여{'\n'}눈의 피로를 덜어줘요
                </Text>
                
                <ToggleButton 
                  isOn={darkMode} 
                  onToggle={setDarkMode} 
                  top={324}
                />
              </>
            )}
            
            {accessibilityStep === 1 && (
              <>
                <Text style={styles.fontSizeTitle}>글자 크기</Text>
                <Text style={styles.fontSizeDescription}>
                  원하는 글자 크기를{'\n'}선택하세요
                </Text>
                
                {/* 글자 크기 선택 - 스크롤 가능 */}
                <ScrollView 
                  style={styles.fontSizeScrollContainer}
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.fontSizeContainer}>
                    {[12, 14, 16, 18, 20, 22, 24, 26, 28, 30].map((size, index) => (
                      <TouchableOpacity 
                        key={size}
                        style={[
                          styles.fontSizeOption, 
                          { 
                            top: index * 81,
                            backgroundColor: size === selectedFontSize ? '#B780FF' : '#3A3A3A'
                          }
                        ]}
                        onPress={() => setSelectedFontSize(size)}
                      >
                        <Text style={[styles.fontSizeText, { fontSize: size }]}>가</Text>
                        <Text style={styles.fontSizeLabel}>{size}pt</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </>
            )}
            
            {accessibilityStep === 2 && (
              <>
                <Text style={styles.screenReadTitle}>화면 읽기</Text>
                <Text style={styles.screenReadDescription}>
                  화면의 내용을 음성으로{'\n'}안내해주는 기능이에요
                </Text>
                
                <ToggleButton 
                  isOn={screenRead} 
                  onToggle={setScreenRead} 
                  top={324}
                />
              </>
            )}
            
            {accessibilityStep === 3 && (
              <>
                <Text style={styles.highlightTitle}>하이라이트</Text>
                <Text style={styles.highlightDescription}>
                  기록에서 하이라이트를{'\n'}설정할 수 있어요
                </Text>
                
                <ToggleButton 
                  isOn={highlight} 
                  onToggle={setHighlight} 
                  top={324}
                />
              </>
            )}
            
            {accessibilityStep === 4 && (
              <>
                <Text style={styles.gestureTitle}>제스처 설정</Text>
                <Text style={styles.gestureDescription}>
                 간단한 동작으로 주요{'\n'}기능을 실행할 수 있어요
                </Text>
                
                <ToggleButton 
                  isOn={gesture} 
                  onToggle={setGesture} 
                  top={324}
                />
              </>
            )}
          </View>
          
          {/* 페이지바 */}
          <PageIndicator 
            currentPage={accessibilityStep} 
            totalPages={5} 
            top={753}
          />
        </>
      )}

      {/* 하단 네비게이션 바 */}
      <NavigationBar 
        onNavigateToRecords={() => navigation.navigate('Records')} 
        onNavigateToRecording={() => navigation.navigate('Recording')} 
        onNavigateToProfile={() => navigation.navigate('Profile')}
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
    width: 393,
    height: 852,
    backgroundColor: '#000000',
  },
  userInfoContainer: {
    position: 'absolute',
    left: 24,
    top: 118,
  },
  userInfoText: {
    color: '#F5F5F5',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.56,
    lineHeight: 42,
    marginBottom: 0,
  },
  userInfoSubText: {
    color: '#F5F5F5',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.56,
    lineHeight: 42,
  },
  settingsList: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 234,
  },
  settingItem: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 81,
    backgroundColor: '#3A3A3A',
    borderWidth: 1,
    borderColor: '#555555',
    justifyContent: 'center',
    paddingLeft: 24,
  },
  settingItemText: {
    color: '#F5F5F5',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.56,
    lineHeight: 42,
  },
  logoutItem: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 405,
    height: 81,
    backgroundColor: '#3A3A3A',
    borderWidth: 1,
    borderColor: '#555555',
    justifyContent: 'center',
    paddingLeft: 24,
  },
  logoutText: {
    color: '#F5F5F5',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.56,
    lineHeight: 42,
  },
  // 접근성 화면 스타일
  accessibilityContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 118,
  },
  accessibilityTitle: {
    color: '#F5F5F5',
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: 0.8,
    lineHeight: 60,
    textAlign: 'center',
    flex: 1,
  },
  darkModeTitle: {
    position: 'absolute',
    left: 48,
    top: 112,
    color: '#F5F5F5',
    fontSize: 60,
    fontWeight: '700',
    letterSpacing: 1.2,
    lineHeight: 90,
  },
  darkModeDescription: {
    position: 'absolute',
    left: 48,
    top: 208,
    color: '#F5F5F5',
    fontSize: 28,
    fontWeight: '500',
    letterSpacing: 0.56,
    lineHeight: 42,
  },
  accessibilityHeader: {
    position: 'absolute',
    left: 16,
    top: 118,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  // 글자 크기 화면 스타일
  fontSizeTitle: {
    position: 'absolute',
    left: 48,
    top: 112,
    color: '#F5F5F5',
    fontSize: 60,
    fontWeight: '700',
    letterSpacing: 1.2,
    lineHeight: 90,
  },
  fontSizeDescription: {
    position: 'absolute',
    left: 48,
    top: 208,
    color: '#F5F5F5',
    fontSize: 28,
    fontWeight: '500',
    letterSpacing: 0.56,
    lineHeight: 42,
  },
  fontSizeScrollContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 324,
    height: 400, // 스크롤 영역 높이
  },
  fontSizeContainer: {
    height: 950, // 10개 옵션(810px) + 마지막 옵션이 페이지바 위로 올라올 여백(190px)
  },
  fontSizeOption: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 81,
    backgroundColor: '#3A3A3A',
    borderWidth: 1,
    borderColor: '#555555',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 48,
  },
  fontSizeText: {
    color: '#F5F5F5',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.4,
    lineHeight: 30,
  },
  fontSizeLabel: {
    color: '#F5F5F5',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.4,
    lineHeight: 30,
  },
  // 화면 읽기 화면 스타일
  screenReadTitle: {
    position: 'absolute',
    left: 48,
    top: 112,
    color: '#F5F5F5',
    fontSize: 60,
    fontWeight: '700',
    letterSpacing: 1.2,
    lineHeight: 90,
  },
  screenReadDescription: {
    position: 'absolute',
    left: 48,
    top: 208,
    color: '#F5F5F5',
    fontSize: 28,
    fontWeight: '500',
    letterSpacing: 0.56,
    lineHeight: 42,
  },
  // 하이라이트 화면 스타일
  highlightTitle: {
    position: 'absolute',
    left: 48,
    top: 112,
    color: '#F5F5F5',
    fontSize: 60,
    fontWeight: '700',
    letterSpacing: 1.2,
    lineHeight: 90,
  },
  highlightDescription: {
    position: 'absolute',
    left: 48,
    top: 208,
    color: '#F5F5F5',
    fontSize: 28,
    fontWeight: '500',
    letterSpacing: 0.56,
    lineHeight: 42,
  },
  // 제스처 설정 화면 스타일
  gestureTitle: {
    position: 'absolute',
    left: 48,
    top: 112,
    color: '#F5F5F5',
    fontSize: 60,
    fontWeight: '700',
    letterSpacing: 1.2,
    lineHeight: 90,
  },
  gestureDescription: {
    position: 'absolute',
    left: 48,
    top: 208,
    color: '#F5F5F5',
    fontSize: 28,
    fontWeight: '500',
    letterSpacing: 0.56,
    lineHeight: 42,
  },
});

export default SettingsScreen;
