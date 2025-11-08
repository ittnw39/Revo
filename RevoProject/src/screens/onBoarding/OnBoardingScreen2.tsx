import React, { FC, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Animated,
  Platform,
  Easing,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import AngryCharacter from '../../components/characters/AngryCharacter';
import NormalCharacter from '../../components/characters/NormalCharacter';
import ExciteCharacter from '../../components/characters/ExciteCharacter';

import { useApp } from '../../contexts/AppContext';
import { createOrGetUser, saveUserToStorage, getUserFromStorage } from '../../services/api';

// localStorage 타입 선언 (웹 환경용)
declare const localStorage: {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

// iPhone 15, 15 Pro 크기 기준
const screenWidth = 390;
const screenHeight = 844;

type OnBoardingScreen2NavigationProp = NativeStackNavigationProp<RootStackParamList, 'OnBoarding'>;

const OnBoardingScreen2: FC = () => {
  const navigation = useNavigation<OnBoardingScreen2NavigationProp>();
  const { setOnboardingCompleted } = useApp();
  const [name, setName] = useState('');
  const [currentStep, setCurrentStep] = useState(1); // 1: 이름, 2: 녹음설정, 3: 음성설정, 4: 제스처설정, 5: GPS설정, 6: 알람설정, 7: 설정완료
  const [recordingEnabled, setRecordingEnabled] = useState<boolean | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean | null>(null);
  const [gestureEnabled, setGestureEnabled] = useState<boolean | null>(null);
  const [gpsEnabled, setGpsEnabled] = useState<boolean | null>(null);
  const [alarmEnabled, setAlarmEnabled] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);

  // 온보딩 2 로드 시 기존 설정 초기화
  useEffect(() => {
    const clearOnboardingData = () => {
      try {
        // 웹 환경에서는 localStorage 사용
        if (Platform.OS === 'web') {
          localStorage.removeItem('onboardingStep');
          localStorage.removeItem('recordingEnabled');
          localStorage.removeItem('voiceEnabled');
          localStorage.removeItem('gestureEnabled');
          localStorage.removeItem('gpsEnabled');
          localStorage.removeItem('alarmEnabled');
        }
      } catch (error) {
        console.log('Error clearing onboarding data:', error);
      }
    };
    
    clearOnboardingData();
  }, []);

  // 단계가 변경될 때마다 저장
  useEffect(() => {
    const saveStep = () => {
      try {
        if (Platform.OS === 'web') {
    localStorage.setItem('onboardingStep', currentStep.toString());
        }
      } catch (error) {
        console.log('Error saving onboarding step:', error);
      }
    };
    
    saveStep();
  }, [currentStep]);

  // 캐릭터 애니메이션을 위한 Animated.Value들
  const happyRotation = new Animated.Value(0);
  const sadRotation = new Animated.Value(0);
  const embarrassedRotation = new Animated.Value(0);
  const angryRotation = new Animated.Value(0);
  const normalRotation = new Animated.Value(0);
  const exciteRotation = new Animated.Value(0);

  const totalSteps = 7;
  const progressWidth = (currentStep / totalSteps) * 316;

  // 캐릭터 회전 애니메이션 함수들 - 연속적으로 반시계방향과 시계방향으로 왔다갔다 하는 애니메이션 (최대 10도)
  const createRotationAnimation = (animatedValue: Animated.Value, direction: 'clockwise' | 'counterclockwise', duration: number) => {
    // 초기값을 0으로 설정
    animatedValue.setValue(0);
    
    return Animated.loop(
      Animated.sequence([
        // 시계방향으로 회전 (10도)
      Animated.timing(animatedValue, {
          toValue: 0.1,
        duration: duration,
        useNativeDriver: true,
          easing: Easing.linear,
        }),
        // 반시계방향으로 회전 (-10도)
        Animated.timing(animatedValue, {
          toValue: -0.1,
          duration: duration,
          useNativeDriver: true,
          easing: Easing.linear,
        })
      ])
    );
  };

  // 설정완료 화면에서만 애니메이션 시작
  useEffect(() => {
    if (currentStep === 7) {
      // 각 캐릭터마다 다른 타이밍으로 애니메이션
      // Happy 캐릭터는 원본 -> 시계 -> 원본 -> 반시계 -> 원본 -> 시계 반복
      happyRotation.setValue(0);
      const happyAnim = Animated.loop(
        Animated.sequence([
          // 원본에서 시계방향 10도로
          Animated.timing(happyRotation, {
            toValue: 0.1,
            duration: 500,
            useNativeDriver: true,
            easing: Easing.linear,
          }),
          // 시계방향 10도에서 원본으로
          Animated.timing(happyRotation, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
            easing: Easing.linear,
          }),
          // 원본에서 반시계방향 -10도로
          Animated.timing(happyRotation, {
            toValue: -0.1,
            duration: 500,
            useNativeDriver: true,
            easing: Easing.linear,
          }),
          // 반시계방향 -10도에서 원본으로
          Animated.timing(happyRotation, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
            easing: Easing.linear,
          })
        ])
      );
      // Sad 캐릭터는 원본 각도 -> 시계방향 10도 -> 원본 각도로 반복
      sadRotation.setValue(0);
      const sadAnim = Animated.loop(
        Animated.sequence([
          Animated.timing(sadRotation, {
            toValue: 0.1, // 시계방향 10도
            duration: 700,
            useNativeDriver: true,
            easing: Easing.linear,
          }),
          Animated.timing(sadRotation, {
            toValue: 0, // 원본 각도로 복귀
            duration: 700,
            useNativeDriver: true,
            easing: Easing.linear,
          })
        ])
      );
      // Embarrassed 캐릭터는 원본 -> 시계 -> 원본 -> 반시계 -> 원본 반복
      embarrassedRotation.setValue(0);
      const embarrassedAnim = Animated.loop(
        Animated.sequence([
          // 원본에서 시계방향 10도로
          Animated.timing(embarrassedRotation, {
            toValue: 0.1,
            duration: 550,
            useNativeDriver: true,
            easing: Easing.linear,
          }),
          // 시계방향 10도에서 원본으로
          Animated.timing(embarrassedRotation, {
            toValue: 0,
            duration: 550,
            useNativeDriver: true,
            easing: Easing.linear,
          }),
          // 원본에서 반시계방향 -10도로
          Animated.timing(embarrassedRotation, {
            toValue: -0.1,
            duration: 550,
            useNativeDriver: true,
            easing: Easing.linear,
          }),
          // 반시계방향 -10도에서 원본으로 (속도 2배)
          Animated.timing(embarrassedRotation, {
            toValue: 0,
            duration: 275, // 550ms의 절반 (2배 빠름)
            useNativeDriver: true,
            easing: Easing.linear,
          })
        ])
      );
      // Angry 캐릭터는 원본 -> 시계 -> 원본 -> 반시계 -> 원본 반복
      angryRotation.setValue(0);
      const angryAnim = Animated.loop(
        Animated.sequence([
          // 원본에서 시계방향 10도로
          Animated.timing(angryRotation, {
            toValue: 0.1,
            duration: 650,
            useNativeDriver: true,
            easing: Easing.linear,
          }),
          // 시계방향 10도에서 원본으로
          Animated.timing(angryRotation, {
            toValue: 0,
            duration: 650,
            useNativeDriver: true,
            easing: Easing.linear,
          }),
          // 원본에서 반시계방향 -10도로
          Animated.timing(angryRotation, {
            toValue: -0.1,
            duration: 650,
            useNativeDriver: true,
            easing: Easing.linear,
          }),
          // 반시계방향 -10도에서 원본으로 (속도 2배)
          Animated.timing(angryRotation, {
            toValue: 0,
            duration: 325, // 650ms의 절반 (2배 빠름)
            useNativeDriver: true,
            easing: Easing.linear,
          })
        ])
      );
      // Normal 캐릭터는 원본 -> 시계 -> 원본 -> 반시계 -> 원본 반복
      normalRotation.setValue(0);
      const normalAnim = Animated.loop(
        Animated.sequence([
          // 원본에서 시계방향 10도로
          Animated.timing(normalRotation, {
            toValue: 0.1,
            duration: 600,
            useNativeDriver: true,
            easing: Easing.linear,
          }),
          // 시계방향 10도에서 원본으로
          Animated.timing(normalRotation, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
            easing: Easing.linear,
          }),
          // 원본에서 반시계방향 -10도로
          Animated.timing(normalRotation, {
            toValue: -0.1,
            duration: 600,
            useNativeDriver: true,
            easing: Easing.linear,
          }),
          // 반시계방향 -10도에서 원본으로
          Animated.timing(normalRotation, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
            easing: Easing.linear,
          })
        ])
      );
      // Excite 캐릭터는 원본 -> 반시계 -> 원본 -> 시계 -> 원본 반복
      exciteRotation.setValue(0);
      const exciteAnim = Animated.loop(
        Animated.sequence([
          // 원본에서 반시계방향 -10도로
          Animated.timing(exciteRotation, {
            toValue: -0.1,
            duration: 580,
            useNativeDriver: true,
            easing: Easing.linear,
          }),
          // 반시계방향 -10도에서 원본으로 (속도 2배)
          Animated.timing(exciteRotation, {
            toValue: 0,
            duration: 290, // 580ms의 절반 (2배 빠름)
            useNativeDriver: true,
            easing: Easing.linear,
          }),
          // 원본에서 시계방향 10도로
          Animated.timing(exciteRotation, {
            toValue: 0.1,
            duration: 580,
            useNativeDriver: true,
            easing: Easing.linear,
          }),
          // 시계방향 10도에서 원본으로
          Animated.timing(exciteRotation, {
            toValue: 0,
            duration: 580,
            useNativeDriver: true,
            easing: Easing.linear,
          })
        ])
      );

      // 모든 애니메이션 시작
      happyAnim.start();
      sadAnim.start();
      embarrassedAnim.start();
      angryAnim.start();
      normalAnim.start();
      exciteAnim.start();

      // 컴포넌트 언마운트 시 애니메이션 정리
      return () => {
        happyAnim.stop();
        sadAnim.stop();
        embarrassedAnim.stop();
        angryAnim.stop();
        normalAnim.stop();
        exciteAnim.stop();
      };
    }
  }, [currentStep]);

  // 사용자 이름 처리 함수
  const handleNameSubmit = async () => {
    if (!name.trim()) {
      if (Platform.OS === 'web') {
        window.alert('이름을 입력해주세요.');
      } else {
        Alert.alert('알림', '이름을 입력해주세요.');
      }
      return;
    }

    setIsLoading(true);
    try {
      // 백엔드 API 호출하여 사용자 생성 또는 조회
      const response = await createOrGetUser(name.trim());
      
      if (response.success) {
        // 사용자 정보를 로컬 스토리지에 저장
        saveUserToStorage(response.user);
        setUserId(response.user.id);

        // 기존 사용자면 마지막 단계로 바로 이동
        if (response.message.includes('기존')) {
          console.log('기존 사용자:', response.user.name);
          setCurrentStep(7); // 마지막 단계로 바로 이동
        } else {
          console.log('새 사용자:', response.user.name);
          // 새 사용자면 다음 단계로 진행
          setTimeout(() => {
            setCurrentStep(currentStep + 1);
          }, 300);
        }
      }
    } catch (error) {
      console.error('사용자 생성/조회 오류:', error);
      if (Platform.OS === 'web') {
        window.alert('오류가 발생했습니다. 다시 시도해주세요.');
      } else {
        Alert.alert('오류', '오류가 발생했습니다. 다시 시도해주세요.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleNavigateToRecording = () => {
    if (currentStep === 1) {
      // 첫 단계에서는 이름 처리
      handleNameSubmit();
    } else if (currentStep < totalSteps) {
      // 색 변화를 보여주기 위해 잠시 대기 후 다음 단계로 진행
      setTimeout(() => {
        setCurrentStep(currentStep + 1);
      }, 300);
    } else {
      // 온보딩 완료 시 저장소 정리
      const clearOnboardingData = () => {
        try {
          if (Platform.OS === 'web') {
            localStorage.removeItem('onboardingStep');
          }
        } catch (error) {
          console.log('Error clearing onboarding data:', error);
        }
      };
      
      clearOnboardingData();
      // Context를 통해 온보딩 완료 상태 설정
      setOnboardingCompleted(true);
      navigation.navigate('Recording');
    }
  };

  const handleGoBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* 배경 프레임 */}
      <View style={styles.frame} />

      {/* 진행바 */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: progressWidth }]} />
        </View>
      </View>

      {/* 뒤로가기 버튼 */}
      <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="28" viewBox="0 0 15 28" fill="none">
          <path d="M14 27L0.999999 14L14 0.999998" stroke="#F5F5F5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </TouchableOpacity>

      {/* 단계별 콘텐츠 */}
      {currentStep === 1 && (
        <>
          {/* 메인 텍스트 */}
          <View style={styles.mainTextContainer}>
            <Text style={styles.mainText}>안녕하세요 👋</Text>
            <Text style={styles.subText}>뭐라고 불러드릴까요?</Text>
          </View>

          {/* 이름 입력 */}
          <View style={styles.nameContainer}>
            <TextInput
              style={[
                styles.nameText, 
                { 
                  width: Math.max(80, name.length * 50 + 30),
                  maxWidth: screenWidth - 120,
                  ...(Platform.OS === 'web' ? { outline: 'none' } : {})
                }
              ]}
              value={name}
              onChangeText={setName}
              placeholder=""
              placeholderTextColor="#888"
              maxLength={10}
              autoFocus={true}
              editable={!isLoading}
              underlineColorAndroid="transparent"
            />
            <Text style={styles.nameText}> 님</Text>
          </View>
        </>
      )}

      {currentStep === 2 && (
        <>
          {/* 녹음 설정 화면 */}
          <View style={styles.recordingIconContainer}>
            <svg xmlns="http://www.w3.org/2000/svg" width="75" height="75" viewBox="0 0 75 75" fill="none">
              <path d="M18.4247 26.0274V23.274C18.4247 12.8147 27.2121 4 37.6986 4C48.1851 4 56.0548 12.8147 56.0548 23.274V26.0274M18.4247 26.0274C14.9542 26.0274 12 28.9906 12 32.4521V63.6575C12 67.119 14.9542 70.0822 18.4247 70.0822H56.0548C59.5253 70.0822 62.4794 67.119 62.4794 63.6575V32.4521C62.4794 28.9906 59.5253 26.0274 56.0548 26.0274M18.4247 26.0274H56.0548M37.6986 41.6301C41.1691 41.6301 43.2055 44.5933 43.2055 48.0548C43.2055 51.5162 41.1691 54.4795 37.6986 54.4795C34.2282 54.4795 31.274 51.5162 31.274 48.0548C31.274 44.5933 34.2282 41.6301 37.6986 41.6301Z" stroke="#B780FF" strokeWidth="5"/>
              <path d="M12 32.4521C12 28.9186 14.9542 26.0275 18.4247 26.0275H56.0548C59.5253 26.0275 62.4795 28.9186 62.4795 32.4521V64.5754C62.4795 68.109 59.5253 71.0001 56.0548 71.0001H18.4247C14.9542 71.0001 12 68.109 12 64.5754V32.4521Z" fill="#B780FF"/>
              <ellipse cx="37.2398" cy="48.9726" rx="7.80137" ry="7.34247" fill="#0A0A0A"/>
            </svg>
          </View>

          {/* 메인 텍스트 */}
          <View style={styles.recordingTextContainer}>
            <Text style={styles.recordingMainText}>녹음 중, 내 소중한</Text>
            <Text style={styles.recordingSubText}>프라이버시를 보호해보세요</Text>
          </View>

          {/* 설정 옵션 */}
          <TouchableOpacity 
            style={[styles.settingOption, styles.settingOptionTop, recordingEnabled === true && styles.settingOptionActive]}
            onPress={() => {
              setRecordingEnabled(true);
              handleNavigateToRecording();
            }}
          >
            <Text style={[styles.settingOptionText, recordingEnabled === true && styles.settingOptionTextActive]}>켜기</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.settingOption, styles.settingOptionBottom, recordingEnabled === false && styles.settingOptionActive]}
            onPress={() => {
              setRecordingEnabled(false);
              handleNavigateToRecording();
            }}
          >
            <Text style={[styles.settingOptionText, recordingEnabled === false && styles.settingOptionTextActive]}>끄기</Text>
          </TouchableOpacity>

          {/* 설명 텍스트 */}
          <Text style={styles.descriptionText}>세부사항은 설정에서 변경 가능</Text>
        </>
      )}

      {/* 음성 설정 화면 */}
      {currentStep === 3 && (
        <>
          {/* 음성 아이콘 */}
          <View style={styles.recordingIconContainer}>
            <svg xmlns="http://www.w3.org/2000/svg" width="75" height="75" viewBox="0 0 75 75" fill="none">
              <path d="M37.0302 20.0135C37.0302 18.775 35.6141 18.0701 34.6259 18.8168L20.4164 29.5539C20.156 29.7507 19.8385 29.8571 19.5121 29.8571H4.5C3.67157 29.8571 3 30.5287 3 31.3571V47.6429C3 48.4713 3.67157 49.1429 4.5 49.1429H19.5121C19.8385 49.1429 20.156 49.2493 20.4164 49.4461L34.6259 60.1832C35.6141 60.9299 37.0302 60.225 37.0302 58.9865V20.0135Z" fill="#B780FF"/>
              <path d="M66.199 25.0357C72.1873 34.4649 72.7056 46.877 67.0093 57.9821M53.2351 30.6607C58.2897 36.5202 58.8535 44.6526 54.0454 51.5536M34.6259 60.1832L20.4164 49.4461C20.156 49.2493 19.8385 49.1429 19.5121 49.1429H4.5C3.67157 49.1429 3 48.4713 3 47.6429V31.3571C3 30.5287 3.67157 29.8571 4.5 29.8571H19.5121C19.8385 29.8571 20.156 29.7507 20.4164 29.5539L34.6259 18.8168C35.6141 18.0701 37.0302 18.775 37.0302 20.0135V58.9865C37.0302 60.225 35.6141 60.9299 34.6259 60.1832Z" stroke="#B780FF" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </View>

          {/* 메인 텍스트 */}
          <View style={styles.recordingTextContainer}>
            <Text style={styles.recordingMainText}>앱의 내용을</Text>
            <Text style={styles.recordingSubText}>음성으로 들어보세요</Text>
          </View>

          {/* 설정 옵션 */}
          <TouchableOpacity 
            style={[styles.settingOption, styles.settingOptionTop, voiceEnabled === true && styles.settingOptionActive]}
            onPress={() => {
              setVoiceEnabled(true);
              handleNavigateToRecording();
            }}
          >
            <Text style={[styles.settingOptionText, voiceEnabled === true && styles.settingOptionTextActive]}>켜기</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.settingOption, styles.settingOptionBottom, voiceEnabled === false && styles.settingOptionActive]}
            onPress={() => {
              setVoiceEnabled(false);
              handleNavigateToRecording();
            }}
          >
            <Text style={[styles.settingOptionText, voiceEnabled === false && styles.settingOptionTextActive]}>끄기</Text>
          </TouchableOpacity>

          {/* 설명 텍스트 */}
          <Text style={styles.descriptionText}>세부사항은 설정에서 변경 가능</Text>
        </>
      )}

      {/* 제스처 설정 화면 */}
      {currentStep === 4 && (
        <>
          {/* 제스처 아이콘 */}
          <View style={styles.recordingIconContainer}>
            <svg xmlns="http://www.w3.org/2000/svg" width="75" height="75" viewBox="0 0 75 75" fill="none">
              <path d="M16.2646 21.709C19.8539 18.2531 23.4766 21.8301 23.4766 21.8301L37.6133 36.4766C37.6133 36.4766 45.1067 26.1859 53.998 26.2344C57.8056 26.2554 63.3494 30.2703 68.4443 34.8545C76.3474 41.9655 76.1289 54.0425 69.1611 62.1123C63.432 68.7475 54.2825 71.3062 45.9609 68.6006L42.6543 67.5254C42.6543 67.5254 29.1212 63.4822 24.6592 60.6035C21.9953 58.8848 22.0707 56.9895 22.5635 55.7412C22.9506 54.7606 24.0034 54.3145 25.0557 54.248L38.0586 53.4268L16.123 28.9121C16.123 28.9121 12.6755 25.1648 16.2646 21.709ZM20.2754 6C26.382 6 32.4936 8.17998 36.4062 12.8125C37.2968 13.8673 37.164 15.4441 36.1094 16.335C35.0546 17.2257 33.4768 17.0928 32.5859 16.0381C29.848 12.7967 25.2976 11 20.2754 11C11.647 11.0002 5.00015 17.6664 5 26.2754C5.00007 31.7105 7.93961 36.8034 12.1719 39.5947C13.3242 40.355 13.642 41.9051 12.8818 43.0576C12.1216 44.2099 10.5714 44.5285 9.41895 43.7686C3.83789 40.0876 6.84827e-05 33.4548 0 26.2754C0.000153016 14.9093 8.88121 6.00018 20.2754 6Z" fill="#B780FF"/>
            </svg>
          </View>

          {/* 메인 텍스트 */}
          <View style={styles.recordingTextContainer}>
            <Text style={styles.recordingMainText}>간단한 제스처로</Text>
            <Text style={styles.recordingSubText}>편리하게 사용해보세요</Text>
        </View>

          {/* 설정 옵션 */}
          <TouchableOpacity 
            style={[styles.settingOption, styles.settingOptionTop, gestureEnabled === true && styles.settingOptionActive]}
            onPress={() => {
              setGestureEnabled(true);
              handleNavigateToRecording();
            }}
          >
            <Text style={[styles.settingOptionText, gestureEnabled === true && styles.settingOptionTextActive]}>켜기</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.settingOption, styles.settingOptionBottom, gestureEnabled === false && styles.settingOptionActive]}
            onPress={() => {
              setGestureEnabled(false);
              handleNavigateToRecording();
            }}
          >
            <Text style={[styles.settingOptionText, gestureEnabled === false && styles.settingOptionTextActive]}>끄기</Text>
          </TouchableOpacity>

        {/* 설명 텍스트 */}
          <Text style={styles.descriptionText}>더 많은 제스처는 설정에서 확인해보세요</Text>
        </>
      )}

      {/* GPS 설정 화면 */}
      {currentStep === 5 && (
        <>
          {/* GPS 아이콘 */}
          <View style={styles.recordingIconContainer}>
            <svg xmlns="http://www.w3.org/2000/svg" width="75" height="75" viewBox="0 0 75 75" fill="none">
              <path d="M63.0371 26.4105C59.8271 11.9731 47.5072 5.47314 36.6852 5.47314C36.6852 5.47314 36.6852 5.47314 36.6546 5.47314C25.8632 5.47314 13.5127 11.9419 10.3028 26.3793C6.72601 42.5042 16.3863 56.1603 25.1295 64.754C28.37 67.9415 32.5276 69.5352 36.6852 69.5352C40.8428 69.5352 45.0004 67.9415 48.2103 64.754C56.9535 56.1603 66.6138 42.5354 63.0371 26.4105ZM36.6852 42.0667C31.3659 42.0667 27.0555 37.6604 27.0555 32.223C27.0555 26.7855 31.3659 22.3793 36.6852 22.3793C42.0045 22.3793 46.3149 26.7855 46.3149 32.223C46.3149 37.6604 42.0045 42.0667 36.6852 42.0667Z" fill="#B780FF"/>
            </svg>
          </View>

          {/* 메인 텍스트 */}
          <View style={styles.recordingTextContainer}>
            <Text style={styles.recordingMainText}>GPS 기능을 통해</Text>
            <Text style={styles.recordingSubText}>내 위치를 기록해보세요</Text>
          </View>

          {/* 설정 옵션 */}
          <TouchableOpacity 
            style={[styles.settingOption, styles.settingOptionTop, gpsEnabled === true && styles.settingOptionActive]}
            onPress={() => {
              setGpsEnabled(true);
              handleNavigateToRecording();
            }}
          >
            <Text style={[styles.settingOptionText, gpsEnabled === true && styles.settingOptionTextActive]}>켜기</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.settingOption, styles.settingOptionBottom, gpsEnabled === false && styles.settingOptionActive]}
            onPress={() => {
              setGpsEnabled(false);
              handleNavigateToRecording();
            }}
          >
            <Text style={[styles.settingOptionText, gpsEnabled === false && styles.settingOptionTextActive]}>끄기</Text>
          </TouchableOpacity>

          {/* 설명 텍스트 */}
          <Text style={styles.descriptionText}>세부사항은 설정에서 변경 가능</Text>
        </>
      )}

      {/* 알람 설정 화면 */}
      {currentStep === 6 && (
        <>
          {/* 알람 아이콘 */}
          <View style={styles.recordingIconContainer}>
            <svg xmlns="http://www.w3.org/2000/svg" width="75" height="75" viewBox="0 0 75 75" fill="none">
              <path d="M10.7767 56.9999H63.2267C64.6841 56.9999 65.5103 54.639 64.6522 53.2863C62.6652 50.154 60.735 45.5369 60.735 39.969L60.8204 32.3531C60.8204 17.2464 50.1557 5 37 5C24.0353 5 13.5254 17.0687 13.5254 31.9561L13.4399 39.969C13.4399 45.4989 11.4408 50.091 9.36951 53.222C8.47689 54.5713 9.30107 56.9999 10.7767 56.9999Z" fill="#B780FF"/>
              <path d="M27.6667 67.6666C30.1435 69.7396 33.4143 71 37 71C40.5857 71 43.8565 69.7396 46.3333 67.6666M10.7767 56.9999C9.30107 56.9999 8.47689 54.5713 9.36951 53.222C11.4408 50.091 13.4399 45.4989 13.4399 39.969L13.5254 31.9561C13.5254 17.0687 24.0353 5 37 5C50.1557 5 60.8204 17.2464 60.8204 32.3531L60.735 39.969C60.735 45.5369 62.6652 50.154 64.6522 53.2863C65.5103 54.639 64.6841 56.9999 63.2267 56.9999H10.7767Z" stroke="#B780FF" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </View>

          {/* 메인 텍스트 */}
          <View style={styles.recordingTextContainer}>
            <Text style={styles.recordingMainText}>꾸준한 기록을 위해</Text>
            <Text style={styles.recordingSubText}>알람이 꼭 필요해요!</Text>
        </View>

          {/* 설정 옵션 */}
          <TouchableOpacity 
            style={[styles.settingOption, styles.settingOptionTop, alarmEnabled === true && styles.settingOptionActive]}
            onPress={() => {
              setAlarmEnabled(true);
              handleNavigateToRecording();
            }}
          >
            <Text style={[styles.settingOptionText, alarmEnabled === true && styles.settingOptionTextActive]}>켜기</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.settingOption, styles.settingOptionBottom, alarmEnabled === false && styles.settingOptionActive]}
            onPress={() => {
              setAlarmEnabled(false);
              handleNavigateToRecording();
            }}
          >
            <Text style={[styles.settingOptionText, alarmEnabled === false && styles.settingOptionTextActive]}>끄기</Text>
          </TouchableOpacity>

        {/* 설명 텍스트 */}
          <Text style={styles.descriptionText}>세부사항은 설정에서 변경 가능</Text>
        </>
      )}

      {/* 설정완료 화면 */}
      {currentStep === 7 && (
        <>
          {/* 캐릭터들 */}
          <Animated.View 
            style={[
              styles.happyCharacter,
              {
                transform: [{
                  rotate: happyRotation.interpolate({
                    inputRange: [-0.1, 0.1],
                    outputRange: ['-10deg', '10deg']
                  })
                }]
              }
            ]}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="189" height="196" viewBox="0 0 189 196" fill="none">
              <circle cx="94.7008" cy="97.7008" r="81.7008" fill="#FED046"/>
              <circle cx="53.1473" cy="79.2802" r="16.5238" fill="#F5F5F5"/>
              <circle cx="87.6014" cy="79.2802" r="16.5238" fill="#F5F5F5"/>
              <mask id="mask0_294_321" style={{maskType:"alpha"}} maskUnits="userSpaceOnUse" x="36" y="62" width="34" height="34">
                <circle cx="53.1478" cy="79.2802" r="16.5238" fill="#F5F5F5"/>
              </mask>
              <g mask="url(#mask0_294_321)">
                <circle cx="39.3699" cy="79.2812" r="16.5247" fill="#0A0A0A"/>
              </g>
              <mask id="mask1_294_321" style={{maskType:"alpha"}} maskUnits="userSpaceOnUse" x="71" y="62" width="34" height="34">
                <circle cx="87.6009" cy="79.2802" r="16.5238" fill="#F5F5F5"/>
              </mask>
              <g mask="url(#mask1_294_321)">
                <circle cx="73.8201" cy="79.2812" r="16.5247" fill="#0A0A0A"/>
              </g>
              <circle cx="53.1473" cy="79.2802" r="16.5238" fill="#F5F5F5"/>
              <circle cx="87.6014" cy="79.2802" r="16.5238" fill="#F5F5F5"/>
              <mask id="mask2_294_321" style={{maskType:"alpha"}} maskUnits="userSpaceOnUse" x="36" y="62" width="34" height="34">
                <circle cx="53.1478" cy="79.2802" r="16.5238" fill="#F5F5F5"/>
              </mask>
              <g mask="url(#mask2_294_321)">
                <circle cx="39.3699" cy="79.2812" r="16.5247" fill="#0A0A0A"/>
              </g>
              <mask id="mask3_294_321" style={{maskType:"alpha"}} maskUnits="userSpaceOnUse" x="71" y="62" width="34" height="34">
                <circle cx="87.6009" cy="79.2802" r="16.5238" fill="#F5F5F5"/>
              </mask>
              <g mask="url(#mask3_294_321)">
                <circle cx="73.8201" cy="79.2812" r="16.5247" fill="#0A0A0A"/>
              </g>
              <path d="M65.1714 95.7321C65.1714 100.654 74.0305 100.9 74.0305 95.7321" stroke="#0A0A0A" strokeWidth="2.57207" strokeLinecap="round"/>
              <path d="M59.2644 82.1974C59.2644 83.3069 58.8237 84.371 58.0391 85.1556C57.2545 85.9401 56.1905 86.3809 55.0809 86.3809C53.9714 86.3809 52.9073 85.9401 52.1228 85.1556C51.3382 84.371 50.8975 83.3069 50.8975 82.1974L55.0809 82.1974H59.2644Z" fill="#F5F5F5"/>
              <path d="M93.7175 82.1974C93.7175 83.3069 93.2768 84.371 92.4922 85.1556C91.7077 85.9401 90.6436 86.3809 89.5341 86.3809C88.4245 86.3809 87.3605 85.9401 86.5759 85.1556C85.7913 84.371 85.3506 83.3069 85.3506 82.1974L89.5341 82.1974H93.7175Z" fill="#F5F5F5"/>
            </svg>
          </Animated.View>
          <Animated.View 
            style={[
              styles.sadCharacter,
              {
                transform: [{
                  rotate: sadRotation.interpolate({
                    inputRange: [0, 0.1],
                    outputRange: ['0deg', '10deg']
                  })
                }]
              }
            ]}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="256" height="336" viewBox="0 0 256 336" fill="none">
              <rect x="93.1836" y="70.6285" width="86.8259" height="188.275" rx="6.10517" transform="rotate(4.95818 93.1836 70.6285)" fill="#47AFF4"/>
              <circle cx="116.979" cy="95.1211" r="16.4608" transform="rotate(4.95818 116.979 95.1211)" fill="#F5F5F5"/>
              <circle cx="151.171" cy="98.0874" r="16.4608" transform="rotate(4.95818 151.171 98.0874)" fill="#F5F5F5"/>
              <mask id="mask0_294_430" style={{maskType:"alpha"}} maskUnits="userSpaceOnUse" x="100" y="78" width="34" height="34">
                <circle cx="116.979" cy="95.1211" r="16.4608" transform="rotate(4.95818 116.979 95.1211)" fill="#F5F5F5"/>
              </mask>
              <g mask="url(#mask0_294_430)">
                <circle cx="129.679" cy="96.224" r="16.4618" transform="rotate(4.95818 129.679 96.224)" fill="#0A0A0A"/>
              </g>
              <mask id="mask1_294_430" style={{maskType:"alpha"}} maskUnits="userSpaceOnUse" x="134" y="81" width="34" height="34">
                <circle cx="151.171" cy="98.0873" r="16.4608" transform="rotate(4.95818 151.171 98.0873)" fill="#F5F5F5"/>
              </mask>
              <g mask="url(#mask1_294_430)">
                <circle cx="162.896" cy="99.1054" r="16.4618" transform="rotate(4.95818 162.896 99.1054)" fill="#0A0A0A"/>
              </g>
              <rect x="104.321" y="101.615" width="12.2575" height="62.268" rx="6.12874" transform="rotate(4.95818 104.321 101.615)" fill="#F5F5F5"/>
              <rect x="150.918" y="109.103" width="10.0535" height="29.2466" rx="5.02676" transform="rotate(4.95818 150.918 109.103)" fill="#F5F5F5"/>
              <path d="M136.937 117.087C137.361 112.203 128.59 111.196 128.145 116.325" stroke="#0A0A0A" strokeWidth="2.72931" strokeLinecap="round"/>
              <path d="M117.865 98.6069C117.77 99.708 117.241 100.726 116.395 101.437C115.549 102.148 114.454 102.494 113.353 102.399C112.252 102.303 111.234 101.774 110.523 100.928C109.812 100.082 109.466 98.9876 109.562 97.8865L113.714 98.2467L117.865 98.6069Z" fill="#F5F5F5"/>
              <path d="M151.574 101.532C151.479 102.633 150.949 103.651 150.103 104.362C149.257 105.073 148.163 105.419 147.062 105.323C145.961 105.228 144.943 104.699 144.232 103.853C143.52 103.006 143.175 101.912 143.27 100.811L147.422 101.171L151.574 101.532Z" fill="#F5F5F5"/>
            </svg>
          </Animated.View>
          <Animated.View 
            style={[
              styles.embarrassedCharacter,
              {
                transform: [{
                  rotate: embarrassedRotation.interpolate({
                    inputRange: [-0.1, 0.1],
                    outputRange: ['-10deg', '10deg']
                  })
                }]
              }
            ]}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="142" height="144" viewBox="0 0 142 144" fill="none">
              <path d="M58.19 40.4322C62.3251 27.7058 80.3294 27.7058 84.4645 40.4322C86.3137 46.1236 91.6174 49.9769 97.6017 49.9769C110.983 49.9769 116.547 67.1001 105.721 74.9654C100.88 78.4828 98.8537 84.7177 100.703 90.4091C104.838 103.135 90.2721 113.718 79.4465 105.853C74.6051 102.335 68.0494 102.335 63.208 105.853C52.3824 113.718 37.8165 103.135 41.9516 90.4091C43.8008 84.7177 41.775 78.4828 36.9336 74.9654C26.1079 67.1001 31.6716 49.9769 45.0528 49.9769C51.0371 49.9769 56.3408 46.1236 58.19 40.4322Z" fill="#F99841"/>
              <circle cx="7.15242" cy="7.15242" r="7.15242" transform="matrix(-1 0 0 1 85.9521 56.4558)" fill="#F5F5F5"/>
              <circle cx="7.15242" cy="7.15242" r="7.15242" transform="matrix(-1 0 0 1 71.0386 56.4558)" fill="#F5F5F5"/>
              <mask id="mask0_597_17" style={{maskType:"alpha"}} maskUnits="userSpaceOnUse" x="71" y="56" width="15" height="15">
                <circle cx="7.15242" cy="7.15242" r="7.15242" transform="matrix(-1 0 0 1 85.9521 56.4559)" fill="#F5F5F5"/>
              </mask>
              <g mask="url(#mask0_597_17)">
                <circle cx="7.15284" cy="7.15284" r="7.15284" transform="matrix(-1 0 0 1 91.917 56.4559)" fill="#0A0A0A"/>
              </g>
              <mask id="mask1_597_17" style={{maskType:"alpha"}} maskUnits="userSpaceOnUse" x="56" y="56" width="16" height="15">
                <circle cx="7.15242" cy="7.15242" r="7.15242" transform="matrix(-1 0 0 1 71.0381 56.4558)" fill="#F5F5F5"/>
              </mask>
              <g mask="url(#mask1_597_17)">
                <circle cx="7.15284" cy="7.15284" r="7.15284" transform="matrix(-1 0 0 1 77.0029 56.4558)" fill="#0A0A0A"/>
              </g>
              <mask id="path-8-inside-1_597_17" fill="white">
                <path d="M69.8204 72.2423C69.3 70.3 69.8732 68.4581 71.1012 68.129C72.3292 67.8002 73.7467 69.1086 74.2671 71.0508L69.8204 72.2423Z"/>
              </mask>
              <path d="M69.8204 72.2423C69.3 70.3 69.8732 68.4581 71.1012 68.129C72.3292 67.8002 73.7467 69.1086 74.2671 71.0508L69.8204 72.2423Z" fill="#0A0A0A"/>
              <path d="M69.8204 72.2423L69.3989 72.3552L69.5118 72.7768L69.9334 72.6638L69.8204 72.2423ZM71.1012 68.129L70.9884 67.7074L70.9883 67.7074L71.1012 68.129ZM74.2671 71.0508L74.3801 71.4724L74.8016 71.3594L74.6887 70.9378L74.2671 71.0508ZM69.8204 72.2423L70.242 72.1293C69.9998 71.2254 70.0182 70.3645 70.2219 69.7104C70.4275 69.05 70.7957 68.6627 71.2142 68.5506L71.1012 68.129L70.9883 67.7074C70.1787 67.9243 69.6464 68.6225 69.3885 69.4509C69.1286 70.2856 69.1206 71.3168 69.3989 72.3552L69.8204 72.2423ZM71.1012 68.129L71.2141 68.5506C71.6326 68.4386 72.1452 68.5899 72.6535 69.059C73.1569 69.5237 73.6033 70.2599 73.8455 71.1637L74.2671 71.0508L74.6887 70.9378C74.4104 69.8995 73.8879 69.0105 73.2455 68.4176C72.6079 67.8291 71.7978 67.4907 70.9884 67.7074L71.1012 68.129ZM74.2671 71.0508L74.1541 70.6292L69.7075 71.8207L69.8204 72.2423L69.9334 72.6638L74.3801 71.4724L74.2671 71.0508Z" fill="black" mask="url(#path-8-inside-1_597_17)"/>
              <path d="M65.2555 64.6578C65.2555 65.138 65.0647 65.5986 64.7251 65.9382C64.3855 66.2778 63.9249 66.4686 63.4446 66.4686C62.9644 66.4686 62.5038 66.2778 62.1642 65.9382C61.8246 65.5986 61.6338 65.138 61.6338 64.6578L63.4446 64.6578H65.2555Z" fill="#F5F5F5"/>
              <path d="M80.1681 64.6578C80.1681 65.138 79.9773 65.5986 79.6377 65.9382C79.2981 66.2778 78.8375 66.4686 78.3572 66.4686C77.877 66.4686 77.4164 66.2778 77.0768 65.9382C76.7372 65.5986 76.5464 65.138 76.5464 64.6578L78.3572 64.6578H80.1681Z" fill="#F5F5F5"/>
            </svg>
          </Animated.View>
          <Animated.View 
            style={[
              styles.angryCharacter,
              {
                transform: [{
                  rotate: angryRotation.interpolate({
                    inputRange: [-0.1, 0.1],
                    outputRange: ['-10deg', '10deg']
                  })
                }]
              }
            ]}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="159" height="129" viewBox="0 0 159 129" fill="none">
              <path d="M94.3922 107.339C93.5668 109.484 90.9382 110.272 89.0688 108.935L9.0199 51.688C6.71784 50.0417 7.20711 46.4884 9.86845 45.5255L128.458 2.6195C131.29 1.59483 134.015 4.37489 132.933 7.18575L94.3922 107.339Z" fill="#EE4947"/>
              <path d="M75.4754 49.0919C75.8298 50.5437 75.8947 52.0511 75.6665 53.528C75.4383 55.0049 74.9214 56.4224 74.1454 57.6995C73.3694 58.9767 72.3495 60.0884 71.1438 60.9714C69.9381 61.8544 68.5703 62.4912 67.1185 62.8455C65.6667 63.1999 64.1593 63.2648 62.6824 63.0366C61.2055 62.8084 59.788 62.2916 58.5109 61.5155C57.2338 60.7395 56.122 59.7196 55.239 58.5139C54.356 57.3082 53.7192 55.9404 53.3649 54.4886L64.4201 51.7903L75.4754 49.0919Z" fill="#F5F5F5"/>
              <path d="M97.5389 43.7073C97.8933 45.1591 97.9582 46.6664 97.73 48.1433C97.5018 49.6202 96.9849 51.0377 96.2089 52.3149C95.4329 53.592 94.4129 54.7038 93.2072 55.5868C92.0016 56.4697 90.6338 57.1066 89.182 57.4609C87.7302 57.8153 86.2228 57.8802 84.7459 57.652C83.269 57.4238 81.8515 56.9069 80.5744 56.1309C79.2972 55.3549 78.1854 54.3349 77.3025 53.1292C76.4195 51.9236 75.7827 50.5558 75.4283 49.104L86.4836 46.4056L97.5389 43.7073Z" fill="#F5F5F5"/>
              <path d="M71.3379 50.2078C71.5595 51.1159 71.6001 52.0587 71.4574 52.9825C71.3146 53.9063 70.9913 54.793 70.5059 55.5918C70.0205 56.3907 69.3826 57.0861 68.6284 57.6384C67.8742 58.1907 67.0187 58.589 66.1106 58.8107C65.2025 59.0323 64.2596 59.073 63.3358 58.9302C62.412 58.7875 61.5254 58.4642 60.7265 57.9788C59.9277 57.4934 59.2322 56.8554 58.6799 56.1012C58.1276 55.3471 57.7293 54.4915 57.5076 53.5834L64.4228 51.8956L71.3379 50.2078Z" fill="#0A0A0A"/>
              <path d="M93.3525 44.8347C93.5742 45.7428 93.6148 46.6857 93.472 47.6095C93.3293 48.5333 93.006 49.4199 92.5206 50.2188C92.0352 51.0176 91.3972 51.7131 90.643 52.2654C89.8889 52.8177 89.0333 53.216 88.1252 53.4376C87.2171 53.6593 86.2743 53.6999 85.3504 53.5572C84.4266 53.4144 83.54 53.0911 82.7412 52.6057C81.9423 52.1203 81.2469 51.4823 80.6946 50.7282C80.1423 49.974 79.7439 49.1185 79.5223 48.2104L86.4374 46.5225L93.3525 44.8347Z" fill="#0A0A0A"/>
              <path d="M82.0244 61.8391C81.2207 58.5462 75.2533 59.8282 76.0972 63.2858" stroke="#0A0A0A" strokeWidth="1.69479" strokeLinecap="round"/>
              <path d="M60.9173 55.4112C61.0985 56.1536 60.9774 56.9375 60.5806 57.5905C60.1838 58.2435 59.5439 58.7122 58.8015 58.8934C58.0592 59.0746 57.2753 58.9534 56.6223 58.5567C55.9692 58.1599 55.5006 57.5199 55.3194 56.7776L58.1184 56.0944L60.9173 55.4112Z" fill="#F5F5F5"/>
              <path d="M83.9667 49.785C84.1478 50.5274 84.0267 51.3113 83.6299 51.9643C83.2331 52.6173 82.5932 53.086 81.8509 53.2672C81.1085 53.4483 80.3246 53.3272 79.6716 52.9304C79.0186 52.5336 78.5499 51.8937 78.3687 51.1514L81.1677 50.4682L83.9667 49.785Z" fill="#F5F5F5"/>
            </svg>
          </Animated.View>
          <Animated.View 
            style={[
              styles.normalCharacter,
              {
                transform: [{
                  rotate: normalRotation.interpolate({
                    inputRange: [-0.1, 0.1],
                    outputRange: ['-10deg', '10deg']
                  })
                }]
              }
            ]}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="115" height="115" viewBox="0 0 115 115" fill="none">
              <path d="M54.1543 2.43076C56.1493 0.981338 58.8507 0.981336 60.8457 2.43076L108.84 37.3008C110.835 38.7502 111.67 41.3194 110.908 43.6646L92.5756 100.085C91.8136 102.431 89.6281 104.018 87.1622 104.018H27.8378C25.3719 104.018 23.1864 102.431 22.4244 100.085L4.09218 43.6646C3.33017 41.3194 4.16494 38.7502 6.15991 37.3008L54.1543 2.43076Z" fill="#5CC463"/>
              <line x1="54.6936" y1="58.1935" x2="60.3063" y2="58.1935" stroke="#0A0A0A" strokeWidth="1.32962" strokeLinecap="round"/>
              <circle cx="46.9573" cy="42.4301" r="10.1336" fill="#F5F5F5"/>
              <circle cx="68.0867" cy="42.4301" r="10.1336" fill="#F5F5F5"/>
              <mask id="mask0_597_126" style={{maskType:"alpha"}} maskUnits="userSpaceOnUse" x="36" y="32" width="22" height="21">
                <circle cx="46.9568" cy="42.43" r="10.1336" fill="#F5F5F5"/>
              </mask>
              <g mask="url(#mask0_597_126)">
                <circle cx="38.5053" cy="42.4306" r="10.1342" fill="#0A0A0A"/>
              </g>
              <mask id="mask1_597_126" style={{maskType:"alpha"}} maskUnits="userSpaceOnUse" x="57" y="32" width="22" height="21">
                <circle cx="68.0862" cy="42.4302" r="10.1336" fill="#F5F5F5"/>
              </mask>
              <g mask="url(#mask1_597_126)">
                <circle cx="59.6352" cy="42.4307" r="10.1342" fill="#0A0A0A"/>
              </g>
              <path d="M50.4071 43.9173C50.4071 44.5977 50.1368 45.2503 49.6557 45.7315C49.1745 46.2126 48.5219 46.4829 47.8415 46.4829C47.1611 46.4829 46.5085 46.2126 46.0273 45.7315C45.5462 45.2503 45.2759 44.5977 45.2759 43.9173L47.8415 43.9173H50.4071Z" fill="#F5F5F5"/>
              <path d="M71.535 43.9173C71.535 44.5977 71.2647 45.2503 70.7836 45.7315C70.3024 46.2126 69.6499 46.4829 68.9694 46.4829C68.289 46.4829 67.6364 46.2126 67.1553 45.7315C66.6741 45.2503 66.4038 44.5977 66.4038 43.9173L68.9694 43.9173H71.535Z" fill="#F5F5F5"/>
            </svg>
          </Animated.View>
          <Animated.View 
            style={[
              styles.exciteCharacter,
              {
                transform: [{
                  rotate: exciteRotation.interpolate({
                    inputRange: [-0.1, 0.1],
                    outputRange: ['-10deg', '10deg']
                  })
                }]
              }
            ]}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="235" height="249" viewBox="0 0 235 249" fill="none">
              <path d="M135.103 49.8102C135.984 48.055 138.633 48.7122 138.592 50.6758L137.632 96.4413C137.605 97.7139 138.846 98.6297 140.054 98.2292L183.504 83.8251C185.368 83.2071 186.777 85.5452 185.36 86.9045L152.319 118.587C151.401 119.468 151.63 120.993 152.768 121.564L193.677 142.102C195.432 142.984 194.775 145.633 192.812 145.592L147.046 144.631C145.774 144.605 144.858 145.846 145.258 147.054L159.662 190.504C160.28 192.368 157.942 193.777 156.583 192.359L124.901 159.319C124.02 158.401 122.495 158.63 121.924 159.768L101.385 200.677C100.504 202.432 97.8545 201.775 97.8957 199.812L98.856 154.046C98.8827 152.773 97.6419 151.858 96.4337 152.258L52.9834 166.662C51.1191 167.28 49.7104 164.942 51.128 163.583L84.1682 131.901C85.0869 131.02 84.8571 129.495 83.7196 128.924L42.8103 108.385C41.0551 107.504 41.7123 104.854 43.6759 104.896L89.4414 105.856C90.714 105.883 91.6298 104.642 91.2293 103.434L76.8252 59.9833C76.2072 58.119 78.5453 56.7103 79.9046 58.1279L111.587 91.1681C112.468 92.0868 113.993 91.857 114.564 90.7195L135.103 49.8102Z" fill="#EE47CA"/>
              <circle cx="106.561" cy="107.088" r="15.1001" transform="rotate(13.9307 106.561 107.088)" fill="#F5F5F5"/>
              <circle cx="137.12" cy="114.667" r="15.1001" transform="rotate(13.9307 137.12 114.667)" fill="#F5F5F5"/>
              <mask id="mask0_294_818" style={{maskType:"alpha"}} maskUnits="userSpaceOnUse" x="91" y="91" width="31" height="32">
                <circle cx="106.561" cy="107.088" r="15.1001" transform="rotate(13.9307 106.561 107.088)" fill="#F5F5F5"/>
              </mask>
              <g mask="url(#mask0_294_818)">
                <circle cx="94.3392" cy="104.057" r="15.101" transform="rotate(13.9307 94.3392 104.057)" fill="#0A0A0A"/>
              </g>
              <mask id="mask1_294_818" style={{maskType:"alpha"}} maskUnits="userSpaceOnUse" x="122" y="99" width="31" height="31">
                <circle cx="137.119" cy="114.667" r="15.1001" transform="rotate(13.9307 137.119 114.667)" fill="#F5F5F5"/>
              </mask>
              <g mask="url(#mask1_294_818)">
                <circle cx="124.897" cy="111.636" r="15.101" transform="rotate(13.9307 124.897 111.636)" fill="#0A0A0A"/>
              </g>
              <path d="M110.143 110.259C109.899 111.243 109.274 112.09 108.406 112.614C107.537 113.137 106.497 113.294 105.512 113.05C104.528 112.805 103.681 112.18 103.158 111.312C102.635 110.443 102.478 109.403 102.722 108.419L106.433 109.339L110.143 110.259Z" fill="#F5F5F5"/>
              <path d="M140.7 117.839C140.455 118.823 139.83 119.67 138.962 120.193C138.093 120.716 137.053 120.873 136.069 120.629C135.084 120.385 134.238 119.76 133.714 118.891C133.191 118.023 133.034 116.982 133.278 115.998L136.989 116.918L140.7 117.839Z" fill="#F5F5F5"/>
              <mask id="path-10-inside-1_294_818" fill="white">
                <path d="M121.76 124.388C119.51 127.934 115.868 129.655 113.627 128.232C111.385 126.81 111.392 122.782 113.642 119.237L121.76 124.388Z"/>
              </mask>
              <path d="M121.76 124.388C119.51 127.934 115.868 129.655 113.627 128.232C111.385 126.81 111.392 122.782 113.642 119.237L121.76 124.388Z" fill="#0A0A0A"/>
              <path d="M121.76 124.388L122.538 124.882L123.032 124.104L122.254 123.61L121.76 124.388ZM113.627 128.232L113.133 129.01L113.133 129.01L113.627 128.232ZM113.642 119.237L114.136 118.459L113.358 117.965L112.864 118.743L113.642 119.237ZM121.76 124.388L120.982 123.894C119.936 125.543 118.588 126.73 117.297 127.34C115.993 127.956 114.881 127.937 114.121 127.454L113.627 128.232L113.133 129.01C114.615 129.951 116.444 129.781 118.084 129.006C119.737 128.225 121.334 126.779 122.538 124.882L121.76 124.388ZM113.627 128.232L114.121 127.454C113.361 126.972 112.869 125.974 112.872 124.532C112.874 123.104 113.374 121.379 114.42 119.731L113.642 119.237L112.864 118.743C111.66 120.64 111.032 122.702 111.029 124.529C111.026 126.343 111.652 128.07 113.133 129.01L113.627 128.232ZM113.642 119.237L113.148 120.015L121.266 125.166L121.76 124.388L122.254 123.61L114.136 118.459L113.642 119.237Z" fill="black" mask="url(#path-10-inside-1_294_818)"/>
            </svg>
          </Animated.View>

          {/* 메인 텍스트 */}
          <View style={styles.completionTextContainer}>
            <Text style={styles.completionMainText}>설정이 완료되었습니다</Text>
            <Text style={styles.completionSubText}>Revo와 매일 기록해요!</Text>
      </View>

      {/* 시작하기 버튼 */}
      <TouchableOpacity 
        style={styles.startButton}
        onPress={handleNavigateToRecording}
      >
        <Text style={styles.startButtonText}>시작하기</Text>
      </TouchableOpacity>
        </>
      )}

      {/* 다음 버튼 - 이름 설정 화면에서만 표시 */}
      {currentStep === 1 && (
        <TouchableOpacity 
          style={[styles.nextButton, (isLoading || !name.trim()) && styles.nextButtonDisabled]}
          onPress={handleNavigateToRecording}
          disabled={isLoading || !name.trim()}
        >
          <Text style={styles.nextButtonText}>
            {isLoading ? '확인 중...' : '다음'}
          </Text>
        </TouchableOpacity>
      )}

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
    width: 390,
    height: 844,
    backgroundColor: '#000000',
  },
  progressContainer: {
    position: 'absolute',
    left: 53,
    top: 60,
    width: 316,
    height: 6,
  },
  progressBar: {
    width: 316,
    height: 6,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
  },
  progressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: 6,
    backgroundColor: '#B780FF',
    borderRadius: 20,
  },
  backButton: {
    position: 'absolute',
    left: 24, // 6.11% of 393px
    top: 50, // 5.87% of 852px
    width: 15,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainTextContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    transform: [{ translateY: -131 }],
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  mainText: {
    color: '#F5F5F5',
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: 0.25,
    textAlign: 'center',
    fontFamily: 'Noto Sans',
    fontStyle: 'normal',
    lineHeight: undefined,
    marginBottom: 0,
  },
  subText: {
    color: '#F5F5F5',
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: 0.25,
    textAlign: 'center',
    fontFamily: 'Noto Sans',
    fontStyle: 'normal',
    lineHeight: undefined,
  },
  nameContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    transform: [{ translateY: -26 }],
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  nameInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nameText: {
    color: '#F5F5F5',
    fontSize: 60,
    fontWeight: '700',
    textAlign: 'center',
    borderWidth: 0,
    borderColor: 'transparent',
  },
  nextButton: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 763,
    height: 49,
    backgroundColor: '#B780FF',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  nextButtonDisabled: {
    backgroundColor: '#555555',
    opacity: 0.5,
  },
  nextButtonText: {
    color: '#000000',
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: 0.48,
    textAlign: 'center',
  },
  recordingIconContainer: {
    position: 'absolute',
    left: '50%',
    top: 239,
    transform: [{ translateX: -37.5 }],
    width: 75,
    height: 75,
  },
  recordingTextContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 350,
    alignItems: 'center',
    paddingHorizontal: 20,
    width: '100%',
  },
  recordingMainText: {
    color: '#F5F5F5',
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: 0.25,
    textAlign: 'center',
    fontFamily: 'Noto Sans',
    fontStyle: 'normal',
    lineHeight: undefined,
    marginBottom: 0,
  },
  recordingSubText: {
    color: '#F5F5F5',
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: 0.25,
    textAlign: 'center',
    fontFamily: 'Noto Sans',
    fontStyle: 'normal',
    lineHeight: undefined,
  },
  settingOption: {
    position: 'absolute',
    left: '50%',
    transform: [{ translateX: -196.5 }], // 393px / 2
    width: 393,
    height: 136,
    backgroundColor: '#3A3A3A',
    borderWidth: 1,
    borderColor: '#555555',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingOptionTop: {
    top: 507,
  },
  settingOptionBottom: {
    top: 643,
    height: 135,
  },
  settingOptionActive: {
    backgroundColor: '#B780FF',
  },
  settingOptionText: {
    color: '#F5F5F5',
    fontSize: 60,
    fontWeight: '700',
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  settingOptionTextActive: {
    color: '#F5F5F5',
  },
  descriptionText: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 450,
    color: '#F5F5F5',
    fontSize: 18,
    fontWeight: '500',
    letterSpacing: 0.36,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  // 설정완료 화면 캐릭터들
  happyCharacter: {
    position: 'absolute',
    left: 244,
    top: 149,
    width: 189,
    height: 196,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sadCharacter: {
    position: 'absolute',
    right: 217,
    top: 44,
    width: 256,
    height: 336,
  },
  embarrassedCharacter: {
    position: 'absolute',
    left: 153,
    top: 55,
    width: 144.655,
    height: 144.655,
    alignItems: 'center',
    justifyContent: 'center',
  },
  angryCharacter: {
    position: 'absolute',
    left: 70,
    top: 460,
    width: 222,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  normalCharacter: {
    position: 'absolute',
    left: 13,
    top: 607,
    width: 115,
    height: 115,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exciteCharacter: {
    position: 'absolute',
    left: 208,
    top: 510,
    width: 235,
    height: 249,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 설정완료 화면 텍스트
  completionTextContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    fontSize: 28,
    bottom: 418,
    alignItems: 'center',
    width: '100%',
    fontFamily: 'Noto Sans',
    
  },
  completionMainText: {
    color: '#F5F5F5',
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: 0.25,
    textAlign: 'center',
    fontFamily: 'Noto Sans',
    fontStyle: 'normal',
    lineHeight: undefined,
    marginBottom: 0,
  },
  completionSubText: {
    color: '#F5F5F5',
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: 0.25,
    textAlign: 'center',
    fontFamily: 'Noto Sans',
    fontStyle: 'normal',
    lineHeight: undefined,
  },
  // 시작하기 버튼
  startButton: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 763,
    height: 49,
    backgroundColor: '#B780FF',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  startButtonText: {
    color: '#000000',
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: 0.48,
    textAlign: 'center',
  },
});

export default OnBoardingScreen2;
