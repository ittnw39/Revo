import { FC, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Image,
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
import { getUser, getUserFromStorage, User } from '../../services/api';

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
const screenWidth = 390;
const screenHeight = 844;

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
  const [showFriendManagement, setShowFriendManagement] = useState(false); // 친구 관리 화면 표시 여부
  const [friendManagementTitle, setFriendManagementTitle] = useState(''); // 친구 관리 화면 제목
  const [friendPageIndex, setFriendPageIndex] = useState(0); // 친구 관리 화면 페이지 인덱스
  const [userName, setUserName] = useState<string>(''); // 사용자 닉네임
  const [userCreatedAt, setUserCreatedAt] = useState<string>(''); // 사용자 생성 날짜
  
  // 디데이 계산 함수 (한국 시간 기준)
  const calculateDaysSinceCreation = (createdAt: string): string => {
    try {
      // 백엔드에서 받은 ISO 문자열을 Date 객체로 변환 (시간대 정보 포함)
      const createdDate = new Date(createdAt);
      
      // 한국 시간 기준 오늘 날짜 계산 (UTC+9)
      const now = new Date();
      const kstOffset = 9 * 60; // 한국 시간대 오프셋 (분 단위)
      const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
      const kstNow = new Date(utc + (kstOffset * 60000));
      
      // 날짜만 비교하기 위해 시간을 0으로 설정
      const today = new Date(kstNow);
      today.setHours(0, 0, 0, 0);
      
      const createdDateOnly = new Date(createdDate);
      createdDateOnly.setHours(0, 0, 0, 0);
      
      const diffTime = today.getTime() - createdDateOnly.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      return `D+${diffDays}`;
    } catch (error) {
      console.error('디데이 계산 오류:', error);
      return 'D+0';
    }
  };

  // 사용자 정보 로드
  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        const userInfo = getUserFromStorage();
        if (userInfo) {
          setUserName(userInfo.name);
          
          // API에서 최신 사용자 정보 가져오기 (created_at 포함)
          try {
            const response = await getUser(userInfo.id);
            if (response.success && response.user) {
              setUserName(response.user.name);
              setUserCreatedAt(response.user.created_at);
            }
          } catch (error) {
            console.log('API에서 사용자 정보 가져오기 실패, 로컬 스토리지 확인:', error);
            // 로컬 스토리지에서 created_at 확인
            if (typeof window !== 'undefined' && window.localStorage) {
              const storedCreatedAt = window.localStorage.getItem('userCreatedAt');
              if (storedCreatedAt) {
                setUserCreatedAt(storedCreatedAt);
              }
            }
          }
        }
      } catch (error) {
        console.error('사용자 정보 로드 오류:', error);
      }
    };
    
    if (isOnboardingCompleted) {
      loadUserInfo();
    }
  }, [isOnboardingCompleted]);

  // 온보딩 완료 상태 확인
  useEffect(() => {
    if (!isOnboardingCompleted) {
      navigation.navigate('OnBoarding');
    }
    // 설정 화면은 마지막 방문 화면으로 저장하지 않음 (새로고침 시 설정 화면으로 가지 않도록)
  }, [isOnboardingCompleted, navigation]);

  // 설정 화면 진입 시 또는 설정 뷰 변경 시 각 step을 첫 페이지(0)로 초기화
  useEffect(() => {
    // 설정 화면이 마운트될 때 accessibilityStep 초기화
    setAccessibilityStep(0);
    setPrivacyStep(0);
    setNotificationStep(0);
    setShowGestureMenu(false);
    setShowDaySelector(false);
    setShowFriendManagement(false);
  }, []);

  // settingsView가 변경될 때 해당 step을 0으로 초기화
  useEffect(() => {
    if (settingsView === 'accessibility') {
      setAccessibilityStep(0);
      setShowGestureMenu(false);
    } else if (settingsView === 'privacy') {
      setPrivacyStep(0);
    } else if (settingsView === 'notifications') {
      setNotificationStep(0);
      setShowDaySelector(false);
    } else if (settingsView === 'friends') {
      setShowFriendManagement(false);
      setFriendPageIndex(0);
    } else if (settingsView === 'main') {
      // 메인으로 돌아갈 때 모든 step 초기화
      setAccessibilityStep(0);
      setPrivacyStep(0);
      setNotificationStep(0);
      setShowGestureMenu(false);
      setShowDaySelector(false);
      setShowFriendManagement(false);
    }
  }, [settingsView]);
  
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
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
      
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

      {/* 친구 설정 화면 헤더 */}
      {settingsView === 'friends' && !showFriendManagement && (
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
            친구 설정
          </Text>
          <View style={styles.headerSpacer} />
        </View>
      )}

      {/* 친구 관리 화면 헤더 */}
      {settingsView === 'friends' && showFriendManagement && (
        <View style={styles.friendManagementHeader}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => setShowFriendManagement(false)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="28" viewBox="0 0 15 28" fill="none">
              <path d="M14 27L0.999999 14L14 0.999998" stroke="#F5F5F5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </TouchableOpacity>
          {/* 검색창을 헤더 위치에 배치 */}
          <View style={styles.headerSearchBox}>
            <View style={[styles.searchIcon, { position: 'absolute', left: 12 }]}>
              <Svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <Path d="M9.16667 15.8333C12.8486 15.8333 15.8333 12.8486 15.8333 9.16667C15.8333 5.48477 12.8486 2.5 9.16667 2.5C5.48477 2.5 2.5 5.48477 2.5 9.16667C2.5 12.8486 5.48477 15.8333 9.16667 15.8333Z" stroke="#A7A7A7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <Path d="M17.5 17.5L13.875 13.875" stroke="#A7A7A7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </Svg>
            </View>
            <Text style={styles.searchPlaceholder}>검색</Text>
          </View>
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
            <Text style={styles.userInfoText}>
              {userCreatedAt ? calculateDaysSinceCreation(userCreatedAt) : 'D+0'}
            </Text>
            <Text style={styles.userInfoSubText}>
              {userName ? `${userName} 여행자` : '사용자'}
            </Text>
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
            
            <TouchableOpacity 
              style={[styles.settingItem, { top: 243 }]}
              onPress={() => setSettingsView('friends')}
            >
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
              onPageChange={setAccessibilityStep}
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
            onPageChange={setPrivacyStep}
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
              onPageChange={setNotificationStep}
            />
          )}
        </>
      ) : settingsView === 'friends' ? (
        <>
          {!showFriendManagement ? (
            <>
              {/* 친구 설정 화면 */}
              <View style={[styles.accessibilityContainer, { top: 198 }]}>
                {/* 친구 차단 관리 카드 */}
                <TouchableOpacity 
                  style={styles.etcCard}
                  onPress={() => {
                    setFriendManagementTitle('친구 차단 관리');
                    setShowFriendManagement(true);
                  }}
                >
                  <Text style={styles.etcCardTitle}>친구 차단 관리</Text>
                  <Text style={styles.etcCardDescription}>
                    원하지 않는 친구를{'\n'}차단하고 관리할 수{'\n'}있어요
                  </Text>
                  <View style={styles.etcCardIcon}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="28" viewBox="0 0 15 28" fill="none">
                      <path d="M1 1L14 14L1 27" stroke="#F5F5F5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </View>
                </TouchableOpacity>

                {/* 숨김 친구 관리 카드 */}
                <TouchableOpacity 
                  style={[styles.etcCard, { top: 262 }]}
                  onPress={() => {
                    setFriendManagementTitle('숨김 친구 관리');
                    setShowFriendManagement(true);
                  }}
                >
                  <Text style={styles.etcCardTitle}>숨김 친구 관리</Text>
                  <Text style={styles.etcCardDescription}>
                    목록에서 숨긴 친구를{'\n'}확인하고 관리할 수{'\n'}있어요
                  </Text>
                  <View style={styles.etcCardIcon}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="28" viewBox="0 0 15 28" fill="none">
                      <path d="M1 1L14 14L1 27" stroke="#F5F5F5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </View>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              {/* 친구 관리 화면 - 친구 목록 */}
              <View style={styles.friendManagementContainer}>
                {/* 친구 카드 그리드 */}
                <ScrollView 
                  style={styles.friendGridContainer}
                  contentContainerStyle={styles.friendGridContent}
                >
                  {/* 친구 카드들 - 2열 그리드 */}
                  {[0, 1, 2, 3].map((friendId, index) => (
                    <View key={friendId} style={[
                      styles.friendCard,
                      index % 2 === 0 ? styles.friendCardLeft : styles.friendCardRight
                    ]}>
                      {/* 프로필 이미지 영역 */}
                      {friendId === 0 ? (
                        <View style={styles.addFriendIconContainer}>
                          <Text style={styles.addFriendText}>+</Text>
                        </View>
                      ) : (
                        <View style={styles.friendCardImageContainer}>
                          <Image 
                            source={require('../../../profileImage.png')}
                            style={styles.friendCardImage}
                            resizeMode="cover"
                          />
                        </View>
                      )}
                      
                      {/* 친구 이름 */}
                      {friendId !== 0 && (
                        <View style={styles.friendCardContent}>
                          <Text style={styles.friendCardName}>친구 {friendId}</Text>
                          <TouchableOpacity style={styles.blockButton}>
                            <Text style={styles.blockButtonText}>차단하기</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  ))}
                </ScrollView>

                {/* 페이지바 - 3페이지로 표시 */}
                <PageIndicator 
                  currentPage={friendPageIndex} 
                  totalPages={3}
                  onPageChange={setFriendPageIndex}
                />
              </View>
            </>
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
                <View style={styles.daySelectorIconRotate}>
                  <Svg width="15" height="28" viewBox="0 0 15 28" fill="none">
                    <Path d="M1 1L14 14L1 27" stroke="#F5F5F5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </Svg>
                </View>
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
        onNavigateToFeed={() => navigation.navigate('Feed')}
        onNavigateToArchive={() => navigation.navigate('Archive')}
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
    overflow: 'hidden',
  },
  frame: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 390,
    height: 844,
    backgroundColor: '#0A0A0A',
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
  daySelectorIconRotate: {
    width: 15,
    height: 28,
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
  // 친구 관리 화면 스타일
  friendManagementHeader: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 118,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 24,
    paddingRight: 24,
  },
  headerSearchBox: {
    flex: 1,
    height: 40,
    backgroundColor: '#D9D9D9',
    borderRadius: 20,
    paddingLeft: 52,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 24,
    position: 'relative',
  },
  friendManagementContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 198, // 헤더 바로 아래 (118 + 40)
    bottom: 0,
  },
  searchContainer: {
    position: 'absolute',
    left: 24,
    right: 24,
    top: 0,
    height: 40,
  },
  searchBox: {
    flex: 1,
    height: 40,
    backgroundColor: '#D9D9D9',
    borderRadius: 20,
    paddingLeft: 52,
    paddingRight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  searchPlaceholder: {
    fontSize: 18,
    fontWeight: '700',
    color: '#A7A7A7',
    letterSpacing: 0.25,
    flex: 1,
    marginLeft: 12,
  },
  searchIcon: {
    width: 20,
    height: 20,
    position: 'absolute',
    left: 12,
  },
  backButtonIcon: {
    width: 15,
    height: 28,
    position: 'absolute',
    right: 12,
    transform: [{ rotate: '270deg' }],
  },
  friendGridContainer: {
    position: 'absolute',
    left: 24,
    right: 24,
    top: 0,
    bottom: 92,
  },
  friendGridContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingBottom: 20,
  },
  friendCard: {
    width: 166,
    height: 250,
    backgroundColor: '#3A3A3A',
    borderRadius: 20,
    marginBottom: 9,
    position: 'relative',
  },
  friendCardLeft: {
    marginRight: 9,
  },
  friendCardRight: {
    marginLeft: 0,
  },
  friendCardImageContainer: {
    position: 'absolute',
    left: 33,
    top: 24,
    width: 99,
    height: 99,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendCardImage: {
    width: 99,
    height: 99,
    borderRadius: 49.5, // 원형으로 만들기 위해 너비/2
    overflow: 'hidden',
  },
  addFriendIconContainer: {
    position: 'absolute',
    left: '50%',
    top: 68, // 시각적으로 중앙에 위치하도록 미세 조정
    width: 99,
    height: 99,
    marginLeft: -49.5, // 너비의 절반 (99 / 2)
    alignItems: 'center',
    justifyContent: 'center',
  },
  addFriendText: {
    fontSize: 100,
    fontWeight: '700',
    color: '#F5F5F5',
  },
  friendCardContent: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 135,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendCardName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#F5F5F5',
    letterSpacing: 0.48,
    lineHeight: 36,
    marginBottom: 12,
  },
  blockButton: {
    backgroundColor: '#B780FF',
    borderWidth: 1,
    borderColor: '#B780FF',
    borderRadius: 50,
    paddingHorizontal: 12,
    paddingVertical: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockButtonText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
    letterSpacing: 0.48,
    paddingBottom: 2,
  },
});

export default SettingsScreen;
