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
import Svg, { Path } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import NavigationBar from '../../components/NavigationBar';
import Header from '../../components/Header';
import PageIndicator from '../../components/PageIndicator';
import ToggleButton from '../../components/ToggleButton';

import { useApp } from '../../contexts/AppContext';

// 웹 환경에서 document 사용을 위한 타입 선언
declare const document: {
  addEventListener: (event: string, handler: (e: any) => void) => void;
  removeEventListener: (event: string, handler: (e: any) => void) => void;
};

// 웹 환경에서 localStorage 사용을 위한 타입 선언
declare const localStorage: {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

// iPhone 15, 15 Pro 크기 기준
const screenWidth = 393;
const screenHeight = 852;

type SettingsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Settings'>;

const SettingsScreen: FC = () => {
  const navigation = useNavigation<SettingsScreenNavigationProp>();
  const { 
    isOnboardingCompleted, 
    setLastVisitedScreen, 
    settingsView, 
    setSettingsView, 
    accessibilityStep, 
    setAccessibilityStep,
    setOnboardingCompleted
  } = useApp();
  const [selectedFontSize, setSelectedFontSize] = useState(20); // 선택된 글자 크기
  const [darkMode, setDarkMode] = useState(true); // 다크모드 설정
  const [screenRead, setScreenRead] = useState(false); // 화면 읽기 설정
  const [highlight, setHighlight] = useState(true); // 하이라이트 설정
  // 제스처 설정은 Context에서 관리하지 않고 로컬 상태로 관리
  const [gesture, setGesture] = useState(false); // 제스처 설정
  const [showGestureMenu, setShowGestureMenu] = useState(false); // 제스처 메뉴 표시 여부
  const [selectedGestureAction, setSelectedGestureAction] = useState<string>(''); // 선택된 제스처 액션
  const [showActionSelector, setShowActionSelector] = useState(false); // 액션 선택기 표시 여부
  const [currentGestureType, setCurrentGestureType] = useState<string>(''); // 현재 선택된 제스처 타입
  const [gestureActions, setGestureActions] = useState<{[key: string]: string}>({
    doubleTap: '없음',
    tripleTap: '없음', 
    longPress: '없음',
    newGesture: '없음'
  }); // 제스처별 선택된 액션 저장
  const [privacyStep, setPrivacyStep] = useState(0); // 프라이버시 단계 (0: 소음제거, 1: 목소리 증폭)
  const [noiseReduction, setNoiseReduction] = useState(false); // 소음제거 설정
  const [voiceAmplification, setVoiceAmplification] = useState(false); // 목소리 증폭 설정
  const [notificationStep, setNotificationStep] = useState(0); // 알림 단계 (0: 알림설정, 1: 기록 알림)
  const [notifications, setNotifications] = useState(false); // 알림 설정
  const [recordNotifications, setRecordNotifications] = useState(false); // 기록 알림 설정
  const [showDaySelector, setShowDaySelector] = useState(false); // 요일 선택기 표시 여부
  const [selectedDays, setSelectedDays] = useState<string[]>([]); // 선택된 요일들
  
  // 온보딩 완료 상태 확인 및 마지막 방문 화면 업데이트
  useEffect(() => {
    if (!isOnboardingCompleted) {
      navigation.navigate('OnBoarding');
    } else {
      // 설정 화면 진입 시 마지막 방문 화면을 Settings로 설정
      setLastVisitedScreen('Settings');
    }
  }, [isOnboardingCompleted, navigation, setLastVisitedScreen]);
  
  // 웹 환경에서 스와이프 핸들러
  const handleTouchStart = (e: any) => {
    const touch = e.touches[0];
    const startX = touch.clientX;
    
    const handleTouchMove = (moveEvent: any) => {
      const moveTouch = moveEvent.touches[0];
      const currentX = moveTouch.clientX;
      const deltaX = currentX - startX;
      
      if (Math.abs(deltaX) > 50) {
        if (settingsView === 'accessibility') {
          if (deltaX > 0 && accessibilityStep > 0) {
            // 오른쪽으로 스와이프 - 이전 단계
            setAccessibilityStep(accessibilityStep - 1);
          } else if (deltaX < 0 && accessibilityStep < 4) {
            // 왼쪽으로 스와이프 - 다음 단계
            setAccessibilityStep(accessibilityStep + 1);
          }
        } else if (settingsView === 'privacy') {
          if (deltaX > 0 && privacyStep > 0) {
            // 오른쪽으로 스와이프 - 이전 단계
            setPrivacyStep(privacyStep - 1);
          } else if (deltaX < 0 && privacyStep < 1) {
            // 왼쪽으로 스와이프 - 다음 단계
            setPrivacyStep(privacyStep + 1);
          }
        } else if (settingsView === 'notifications') {
          if (deltaX > 0 && notificationStep > 0) {
            // 오른쪽으로 스와이프 - 이전 단계
            setNotificationStep(notificationStep - 1);
          } else if (deltaX < 0 && notificationStep < 1) {
            // 왼쪽으로 스와이프 - 다음 단계
            setNotificationStep(notificationStep + 1);
          }
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
      {settingsView === 'accessibility' && (
        <View style={styles.accessibilityHeader}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => {
              if (accessibilityStep === 4 && showGestureMenu) {
                setShowGestureMenu(false);
              } else {
                setSettingsView('main');
              }
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="28" viewBox="0 0 15 28" fill="none">
              <path d="M14 27L0.999999 14L14 0.999998" stroke="#F5F5F5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </TouchableOpacity>
          <Text style={styles.accessibilityTitle}>
            {accessibilityStep === 4 && showGestureMenu ? '제스처 설정' : '접근성'}
          </Text>
          <View style={styles.headerSpacer} />
        </View>
      )}

      {/* 프라이버시 화면 헤더 */}
      {settingsView === 'privacy' && (
        <View style={styles.accessibilityHeader}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => setSettingsView('main')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="28" viewBox="0 0 15 28" fill="none">
              <path d="M14 27L0.999999 14L14 0.999998" stroke="#F5F5F5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </TouchableOpacity>
          <Text style={styles.accessibilityTitle}>프라이버시</Text>
          <View style={styles.headerSpacer} />
        </View>
      )}

      {/* 알림/리마인더 화면 헤더 */}
      {settingsView === 'notifications' && (
        <View style={styles.accessibilityHeader}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => {
              if (showDaySelector) {
                setShowDaySelector(false);
              } else {
                setSettingsView('main');
              }
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="28" viewBox="0 0 15 28" fill="none">
              <path d="M14 27L0.999999 14L14 0.999998" stroke="#F5F5F5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </TouchableOpacity>
          <Text style={styles.accessibilityTitle}>
            알림/리마인더
          </Text>
          <View style={styles.headerSpacer} />
        </View>
      )}

      {/* 기타 화면 헤더 */}
      {settingsView === 'etc' && (
        <View style={styles.accessibilityHeader}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => setSettingsView('main')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="28" viewBox="0 0 15 28" fill="none">
              <path d="M14 27L0.999999 14L14 0.999998" stroke="#F5F5F5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </TouchableOpacity>
          <Text style={styles.accessibilityTitle}>
            기타
          </Text>
          <View style={styles.headerSpacer} />
        </View>
      )}

      {settingsView === 'main' ? (
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
                onPress={() => setSettingsView('accessibility')}
            >
              <Text style={styles.settingItemText}>접근성</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.settingItem, { top: 81 }]}
              onPress={() => setSettingsView('privacy')}
            >
              <Text style={styles.settingItemText}>프라이버시</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.settingItem, { top: 162 }]}
              onPress={() => setSettingsView('notifications')}
            >
              <Text style={styles.settingItemText}>알림/리마인더</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.settingItem, { top: 243 }]}>
              <Text style={styles.settingItemText}>친구설정</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.settingItem, { top: 324 }]}
              onPress={() => setSettingsView('etc')}
            >
              <Text style={styles.settingItemText}>기타</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.logoutItem}
              onPress={() => {
                setOnboardingCompleted(false);
                navigation.navigate('OnBoarding');
              }}
            >
              <Text style={styles.logoutText}>로그아웃</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : settingsView === 'accessibility' ? (
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
                {!showGestureMenu ? (
                  <>
                    <Text style={styles.gestureTitle}>제스처 설정</Text>
                    <Text style={styles.gestureDescription}>
                     간단한 동작으로 주요{'\n'}기능을 실행할 수 있어요
                    </Text>
                    
                    
                    <ToggleButton 
                      isOn={gesture} 
                      onToggle={(isOn) => {
                        setGesture(isOn);
                        if (isOn) {
                          setShowGestureMenu(true);
                        } else {
                          setShowGestureMenu(false);
                        }
                      }} 
                      top={324}
                    />
                  </>
                ) : null}
              </>
            )}
          </View>
          
          {/* 페이지바 - 제스처 메뉴가 표시될 때는 숨김 */}
          {!showGestureMenu && (
            <PageIndicator 
              currentPage={accessibilityStep} 
              totalPages={5} 
              top={753}
            />
          )}
        </>
      ) : settingsView === 'privacy' ? (
        <>
          {/* 프라이버시 화면 */}
          <View 
            style={styles.accessibilityContainer}
            onTouchStart={handleTouchStart}
          >
            {privacyStep === 0 && (
              <>
                <Text style={styles.darkModeTitle}>소음제거</Text>
                <Text style={styles.darkModeDescription}>
                외부 소음을 줄여,{'\n'}내 기록을 지켜줘요
                </Text>
                
                <ToggleButton 
                  isOn={noiseReduction} 
                  onToggle={setNoiseReduction} 
                  top={324}
                />
              </>
            )}
            
            {privacyStep === 1 && (
              <>
                <Text style={styles.darkModeTitle}>목소리 증폭</Text>
                <Text style={styles.darkModeDescription}>
                잡음을 줄이고, 내 목소리만{'\n'}선명하게 기록해요
                </Text>
                
                <ToggleButton 
                  isOn={voiceAmplification} 
                  onToggle={setVoiceAmplification} 
                  top={324}
                />
              </>
            )}
          </View>
        
          {/* 페이지바 */}
          <PageIndicator 
            currentPage={privacyStep} 
            totalPages={2} 
            top={753}
          />
        </>
      ) : settingsView === 'notifications' ? (
        <>
          {/* 알림/리마인더 화면 */}
          <View 
            style={styles.accessibilityContainer}
            onTouchStart={handleTouchStart}
          >
            {notificationStep === 0 && (
              <>
                <Text style={styles.darkModeTitle}>알림설정</Text>
                <Text style={styles.darkModeDescription}>
                  소셜 알림을{'\n'}받아볼 수 있어요
                </Text>
                
                <ToggleButton 
                  isOn={notifications} 
                  onToggle={setNotifications} 
                  top={324}
                />
              </>
            )}
            
            {notificationStep === 1 && !showDaySelector && (
              <>
                <Text style={styles.darkModeTitle}>기록 알림</Text>
                <Text style={styles.darkModeDescription}>
                  생활 패턴에 맞춰{'\n'}기록 시간을 알려드려요
                </Text>
                
                <ToggleButton 
                  isOn={recordNotifications} 
                  onToggle={(isOn) => {
                    setRecordNotifications(isOn);
                    if (isOn) {
                      setShowDaySelector(true);
                    } else {
                      setShowDaySelector(false);
                    }
                  }} 
                  top={324}
                />
              </>
            )}

          </View>
          
          {/* 페이지바 - 요일 선택기가 표시될 때는 숨김 */}
          {!showDaySelector && (
            <PageIndicator 
              currentPage={notificationStep} 
              totalPages={2} 
              top={753}
            />
          )}
        </>
      ) : settingsView === 'etc' ? (
        <>
          {/* 기타 화면 */}
          <View style={[styles.accessibilityContainer, { top: 198 }]}>
            {/* 고객센터 카드 */}
            <TouchableOpacity style={styles.etcCard}>
              <Text style={styles.etcCardTitle}>고객센터</Text>
              <Text style={styles.etcCardDescription}>
                궁금한 점이나 불편 사항을{'\n'}언제든지 문의하세요
              </Text>
              <View style={styles.etcCardIcon}>
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="28" viewBox="0 0 15 28" fill="none">
                  <path d="M1 1L14 14L1 27" stroke="#F5F5F5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </View>
            </TouchableOpacity>

            {/* 이용백서 카드 */}
            <TouchableOpacity style={[styles.etcCard, { top: 262 }]}>
              <Text style={styles.etcCardTitle}>이용백서</Text>
              <Text style={styles.etcCardDescription}>
                앱의 주요 기능과 사용{'\n'}방법을 한눈에 확인할 수{'\n'}있어요
              </Text>
              <View style={styles.etcCardIcon}>
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="28" viewBox="0 0 15 28" fill="none">
                  <path d="M1 1L14 14L1 27" stroke="#F5F5F5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </View>
            </TouchableOpacity>
          </View>
        </>
      ) : null}

      {/* 요일 선택기 - 알림 컨테이너 밖으로 이동 */}
      {settingsView === 'notifications' && notificationStep === 1 && showDaySelector && (
        <View style={styles.daySelectorContainer}>
          {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => (
            <TouchableOpacity
              key={day}
              style={styles.daySelectorItem}
              onPress={() => {
                if (selectedDays.includes(day)) {
                  setSelectedDays(selectedDays.filter(d => d !== day));
                } else {
                  setSelectedDays([...selectedDays, day]);
                }
              }}
            >
              <Text style={styles.daySelectorText}>{day}</Text>
              <View style={styles.daySelectorIcon}>
                {selectedDays.includes(day) && (
                  <Svg width="15" height="28" viewBox="0 0 15 28" fill="none">
                    <Path d="M1 1L14 14L1 27" stroke="#F5F5F5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </Svg>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* 제스처 메뉴 - 접근성 컨테이너 밖으로 이동 */}
      {settingsView === 'accessibility' && accessibilityStep === 4 && showGestureMenu && (
        <View style={styles.gestureMenuContainer}>
          <TouchableOpacity 
            style={[styles.gestureMenuItem, { height: 145 }]}
            onPress={() => {
              setCurrentGestureType('doubleTap');
              setShowActionSelector(true);
            }}
          >
            <Text style={styles.gestureMenuText}>두 번 탭</Text>
            <View style={styles.gestureActionContainer}>
              <Text style={[
                styles.gestureMenuAction, 
                gestureActions.doubleTap !== '없음' && {
                  color: '#B780FF',
                  fontWeight: '700'
                }
              ]}>
                {gestureActions.doubleTap}
              </Text>
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="28" viewBox="0 0 15 28" fill="none">
                <path d="M1 1L14 14L1 27" stroke="#F5F5F5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.gestureMenuItem, { height: 145 }]}
            onPress={() => {
              setCurrentGestureType('tripleTap');
              setShowActionSelector(true);
            }}
          >
            <Text style={styles.gestureMenuText}>세 번 탭</Text>
            <View style={styles.gestureActionContainer}>
              <Text style={[
                styles.gestureMenuAction, 
                gestureActions.tripleTap !== '없음' && {
                  color: '#B780FF',
                  fontWeight: '700'
                }
              ]}>
                {gestureActions.tripleTap}
              </Text>
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="28" viewBox="0 0 15 28" fill="none">
                <path d="M1 1L14 14L1 27" stroke="#F5F5F5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.gestureMenuItem, { height: 145 }]}
            onPress={() => {
              setCurrentGestureType('longPress');
              setShowActionSelector(true);
            }}
          >
            <Text style={styles.gestureMenuText}>길게 누르기</Text>
            <View style={styles.gestureActionContainer}>
              <Text style={[
                styles.gestureMenuAction, 
                gestureActions.longPress !== '없음' && {
                  color: '#B780FF',
                  fontWeight: '700'
                }
              ]}>
                {gestureActions.longPress}
              </Text>
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="28" viewBox="0 0 15 28" fill="none">
                <path d="M1 1L14 14L1 27" stroke="#F5F5F5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.gestureMenuItem, { height: 145 }]}
            onPress={() => {
              // 새로운 제스처 생성 기능 구현
              console.log('새로운 제스처 생성');
            }}
          >
            <Text style={styles.gestureMenuText}>새로운 제스처 생성</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 액션 선택기 */}
      {showActionSelector && (
        <View style={styles.actionSelectorContainer}>
          <View style={styles.actionSelectorHeader}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => {
                setShowActionSelector(false);
                setCurrentGestureType('');
              }}
            >
              <svg width="15" height="28" viewBox="0 0 15 28" fill="none">
                <path d="M14 27L0.999999 14L14 0.999998" stroke="#F5F5F5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </TouchableOpacity>
            <Text style={styles.actionSelectorTitle}>제스처 설정</Text>
            <View style={styles.spacer} />
          </View>

          <View style={styles.actionListContainer}>
            {['없음', '녹음 시작', '녹음 종료', '내기록 이동', '피드 이동', '아카이브 이동', '설정창 이동'].map((action, index) => (
              <TouchableOpacity 
                key={action}
                style={[
                  styles.actionItem,
                  gestureActions[currentGestureType] === action && styles.selectedActionItem
                ]}
                onPress={() => {
                  setGestureActions(prev => ({
                    ...prev,
                    [currentGestureType]: action
                  }));
                  // 액션 선택 후 액션 선택기를 닫지 않고 유지
                  // setShowActionSelector(false);
                  // setCurrentGestureType('');
                }}
              >
                <Text style={[
                  styles.actionText,
                  gestureActions[currentGestureType] === action && styles.selectedActionText
                ]}>
                  {action}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
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
  // 제스처 상세 설정 스타일
  gestureDetailContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#000000',
  },
  gestureDetailHeader: {
    position: 'absolute',
    left: 16,
    top: 118,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gestureDetailTitle: {
    fontSize: 40,
    fontWeight: '700',
    color: '#F5F5F5',
    letterSpacing: 0.8,
    lineHeight: 60,
    flex: 1,
    textAlign: 'center',
  },
  spacer: {
    width: 15,
  },
  gestureMenuHeader: {
    position: 'absolute',
    left: 16,
    top: 118,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gestureMenuTitle: {
    fontSize: 40,
    fontWeight: '700',
    color: '#F5F5F5',
    letterSpacing: 0.8,
    lineHeight: 60,
    flex: 1,
    textAlign: 'center',
  },
  gestureMenuContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 198,
  },
  gestureMenuItem: {
    backgroundColor: '#3A3A3A',
    borderWidth: 1,
    borderColor: '#555555',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 0,
  },
  gestureMenuText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#F5F5F5',
    letterSpacing: 0.56,
    lineHeight: 42,
  },
  gestureActionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gestureMenuAction: {
    fontSize: 28,
    fontWeight: '700',
    color: '#F5F5F5',
    letterSpacing: 0.56,
    lineHeight: 42,
  },
  selectedAction: {
    color: '#B780FF',
    fontWeight: '700',
  },
  // 선택된 액션 표시 스타일
  selectedActionsContainer: {
    marginTop: 20,
    marginBottom: 20,
  },
  selectedActionItem: {
    height: 81,
    backgroundColor: '#B780FF',
    borderWidth: 1,
    borderColor: '#555555',
    marginHorizontal: 0,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  gestureTypeText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#F5F5F5',
  },
  selectedActionText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#F5F5F5',
    letterSpacing: 0.56,
    lineHeight: 42,
  },
  // 액션 선택기 스타일
  actionSelectorContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#000000',
  },
  actionSelectorHeader: {
    position: 'absolute',
    left: 16,
    top: 118,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionSelectorTitle: {
    fontSize: 40,
    fontWeight: '700',
    color: '#F5F5F5',
    letterSpacing: 0.8,
    lineHeight: 60,
    flex: 1,
    textAlign: 'center',
  },
  actionListContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 198,
  },
  actionItem: {
    height: 81,
    backgroundColor: '#3A3A3A',
    borderWidth: 1,
    borderColor: '#555555',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  actionText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#F5F5F5',
    letterSpacing: 0.56,
    lineHeight: 42,
  },
  // 요일 선택기 스타일
  daySelectorContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 198,
  },
  daySelectorItem: {
    height: 81,
    backgroundColor: '#3A3A3A',
    borderWidth: 1,
    borderColor: '#555555',
    width: 393,
    alignSelf: 'center',
    marginBottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  daySelectorText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#F5F5F5',
    letterSpacing: 0.56,
  },
  daySelectorIcon: {
    width: 15,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // 기타 화면 스타일
  etcCard: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 262,
    backgroundColor: '#3A3A3A',
    borderWidth: 1,
    borderColor: '#555555',
    marginHorizontal: 0,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  etcCardTitle: {
    fontSize: 40,
    fontWeight: '700',
    color: '#F5F5F5',
    letterSpacing: 0.8,
    marginBottom: 16,
  },
  etcCardDescription: {
    fontSize: 28,
    fontWeight: '500',
    color: '#F5F5F5',
    letterSpacing: 0.56,
    lineHeight: 42,
  },
  etcCardIcon: {
    position: 'absolute',
    right: 48,
    top: 32,
    width: 15,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default SettingsScreen;
