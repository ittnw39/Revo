import React, { FC, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import Header from '../../components/Header';
import HappyCharacter from '../../components/characters/HappyCharacter';
import SadCharacter from '../../components/characters/SadCharacter';
import EmbarrassedCharacter from '../../components/characters/EmbarrassedCharacter';
import AngryCharacter from '../../components/characters/AngryCharacter';
import NormalCharacter from '../../components/characters/NormalCharacter';
import ExciteCharacter from '../../components/characters/ExciteCharacter';
import RevText from '../../components/characters/RevText';

// iPhone 15, 15 Pro 크기 기준
const screenWidth = 393;
const screenHeight = 852;









type OnBoardingScreen1NavigationProp = NativeStackNavigationProp<RootStackParamList, 'OnBoarding'>;

const OnBoardingScreen1: FC = () => {
  const navigation = useNavigation<OnBoardingScreen1NavigationProp>();
  
  // 로컬스토리지에서 온보딩 완료 상태 확인
  useEffect(() => {
    const isOnboardingCompleted = localStorage.getItem('onboardingCompleted');
    if (isOnboardingCompleted === 'true') {
      // 온보딩이 완료된 경우 메인 화면으로 이동
      navigation.navigate('Recording');
    }
  }, [navigation]);
  
  // 해피 캐릭터 애니메이션 상태
  const [isHappyPressed, setIsHappyPressed] = useState(false);
  const bounceAnim = new Animated.Value(0);
  const scaleYAnim = new Animated.Value(1);
  const scaleXAnim = new Animated.Value(1);

  // 엠브레스드 캐릭터 애니메이션 상태
  const [isEmbarrassedPressed, setIsEmbarrassedPressed] = useState(false);
  const embarrassedBounceAnim = new Animated.Value(0);
  const embarrassedScaleYAnim = new Animated.Value(1);
  const embarrassedScaleXAnim = new Animated.Value(1);
  const embarrassedRotateAnim = new Animated.Value(-9);

  // 노말 캐릭터 애니메이션 상태
  const [isNormalPressed, setIsNormalPressed] = useState(false);
  const normalBounceAnim = new Animated.Value(0);
  const normalScaleAnim = new Animated.Value(1);

  // 새드 캐릭터 애니메이션 상태
  const [isSadPressed, setIsSadPressed] = useState(false);
  const sadBounceAnim = new Animated.Value(0);
  const sadScaleYAnim = new Animated.Value(1);

  // 앵그리 캐릭터 애니메이션 상태
  const [isAngryPressed, setIsAngryPressed] = useState(false);
  const angryBounceAnim = new Animated.Value(0);
  const angryScaleXAnim = new Animated.Value(1.03);
  const angryScaleYAnim = new Animated.Value(0.97);

  // 익사이트 캐릭터 애니메이션 상태
  const [isExcitePressed, setIsExcitePressed] = useState(false);
  const exciteBounceAnim = new Animated.Value(0);
  const exciteRotateAnim = new Animated.Value(0);
  const exciteScaleAnim = new Animated.Value(0.95);

  useEffect(() => {
    // 해피 캐릭터는 즉시 시작 (0초 지연)
    const startBounceAnimation = () => {
      // 1.4초 애니메이션 시퀀스
      Animated.sequence([
        // 시작: 살짝 찌그러짐 (anticipation)
        Animated.parallel([
          Animated.timing(scaleYAnim, {
            toValue: 0.96,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(scaleXAnim, {
            toValue: 1.02,
            duration: 100,
            useNativeDriver: true,
          }),
        ]),
        // 도약 준비
        Animated.parallel([
          Animated.timing(scaleYAnim, {
            toValue: 0.92,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(scaleXAnim, {
            toValue: 1.04,
            duration: 100,
            useNativeDriver: true,
          }),
        ]),
        // 점프: 위로 올라가면서 늘어남 (stretch)
        Animated.parallel([
          Animated.timing(bounceAnim, {
            toValue: -8,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(scaleYAnim, {
            toValue: 1.04,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(scaleXAnim, {
            toValue: 0.98,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
        // 계속 상승
        Animated.parallel([
          Animated.timing(bounceAnim, {
            toValue: -35,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(scaleYAnim, {
            toValue: 1.06,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(scaleXAnim, {
            toValue: 0.97,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
        // 공중 정점
        Animated.parallel([
          Animated.timing(bounceAnim, {
            toValue: -45,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(scaleYAnim, {
            toValue: 1.01,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(scaleXAnim, {
            toValue: 0.99,
            duration: 100,
            useNativeDriver: true,
          }),
        ]),
        // 하강 시작: 다시 늘어남
        Animated.parallel([
          Animated.timing(bounceAnim, {
            toValue: -35,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(scaleYAnim, {
            toValue: 1.05,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(scaleXAnim, {
            toValue: 0.98,
            duration: 100,
            useNativeDriver: true,
          }),
        ]),
        // 착지 직전
        Animated.parallel([
          Animated.timing(bounceAnim, {
            toValue: -8,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(scaleYAnim, {
            toValue: 1.07,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(scaleXAnim, {
            toValue: 0.96,
            duration: 100,
            useNativeDriver: true,
          }),
        ]),
        // 착지: 찌그러짐 (squash)
        Animated.parallel([
          Animated.timing(bounceAnim, {
            toValue: 0,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(scaleYAnim, {
            toValue: 0.88,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(scaleXAnim, {
            toValue: 1.08,
            duration: 50,
            useNativeDriver: true,
          }),
        ]),
        // 착지 충격 흡수
        Animated.parallel([
          Animated.timing(scaleYAnim, {
            toValue: 0.94,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(scaleXAnim, {
            toValue: 1.03,
            duration: 100,
            useNativeDriver: true,
          }),
        ]),
        // 복귀: 통통 튀어오름
        Animated.parallel([
          Animated.timing(scaleYAnim, {
            toValue: 1.02,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(scaleXAnim, {
            toValue: 0.99,
            duration: 100,
            useNativeDriver: true,
          }),
        ]),
        // 정상 상태로
        Animated.parallel([
          Animated.timing(scaleYAnim, {
            toValue: 0.99,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(scaleXAnim, {
            toValue: 1.01,
            duration: 100,
            useNativeDriver: true,
          }),
        ]),
        // 다음 점프 준비
        Animated.parallel([
          Animated.timing(scaleYAnim, {
            toValue: 0.96,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(scaleXAnim, {
            toValue: 1.02,
            duration: 100,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    };

    // 1.3초마다 점프 애니메이션 실행 (다른 주기)
    const interval = setInterval(startBounceAnimation, 1300);
    
    // 첫 애니메이션 시작 (즉시)
    startBounceAnimation();

    return () => {
      clearInterval(interval);
    };
  }, []);

  // 엠브레스드 캐릭터 애니메이션 (0.2초 지연)
  useEffect(() => {
    const startEmbarrassedAnimation = () => {
      // 1.4초 애니메이션 시퀀스 (회전 포함)
      Animated.sequence([
        // 시작: 살짝 찌그러짐 (anticipation) + 회전
        Animated.parallel([
          Animated.timing(embarrassedScaleYAnim, {
            toValue: 0.96,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(embarrassedScaleXAnim, {
            toValue: 1.02,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(embarrassedRotateAnim, {
            toValue: -9,
            duration: 100,
            useNativeDriver: true,
          }),
        ]),
        // 도약 준비
        Animated.parallel([
          Animated.timing(embarrassedScaleYAnim, {
            toValue: 0.92,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(embarrassedScaleXAnim, {
            toValue: 1.04,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(embarrassedRotateAnim, {
            toValue: -7,
            duration: 100,
            useNativeDriver: true,
          }),
        ]),
        // 점프: 위로 올라가면서 늘어남 (stretch) + 회전
        Animated.parallel([
          Animated.timing(embarrassedBounceAnim, {
            toValue: -8,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(embarrassedScaleYAnim, {
            toValue: 1.04,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(embarrassedScaleXAnim, {
            toValue: 0.98,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(embarrassedRotateAnim, {
            toValue: -5,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
        // 계속 상승
        Animated.parallel([
          Animated.timing(embarrassedBounceAnim, {
            toValue: -35,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(embarrassedScaleYAnim, {
            toValue: 1.06,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(embarrassedScaleXAnim, {
            toValue: 0.97,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(embarrassedRotateAnim, {
            toValue: -3,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
        // 공중 정점
        Animated.parallel([
          Animated.timing(embarrassedBounceAnim, {
            toValue: -45,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(embarrassedScaleYAnim, {
            toValue: 1.01,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(embarrassedScaleXAnim, {
            toValue: 0.99,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(embarrassedRotateAnim, {
            toValue: -2,
            duration: 100,
            useNativeDriver: true,
          }),
        ]),
        // 하강 시작: 다시 늘어남
        Animated.parallel([
          Animated.timing(embarrassedBounceAnim, {
            toValue: -35,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(embarrassedScaleYAnim, {
            toValue: 1.05,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(embarrassedScaleXAnim, {
            toValue: 0.98,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(embarrassedRotateAnim, {
            toValue: -1,
            duration: 100,
            useNativeDriver: true,
          }),
        ]),
        // 착지 직전
        Animated.parallel([
          Animated.timing(embarrassedBounceAnim, {
            toValue: -8,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(embarrassedScaleYAnim, {
            toValue: 1.07,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(embarrassedScaleXAnim, {
            toValue: 0.96,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(embarrassedRotateAnim, {
            toValue: 0,
            duration: 100,
            useNativeDriver: true,
          }),
        ]),
        // 착지: 찌그러짐 (squash) + 수평으로 회전
        Animated.parallel([
          Animated.timing(embarrassedBounceAnim, {
            toValue: 0,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(embarrassedScaleYAnim, {
            toValue: 0.88,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(embarrassedScaleXAnim, {
            toValue: 1.08,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(embarrassedRotateAnim, {
            toValue: 0,
            duration: 50,
            useNativeDriver: true,
          }),
        ]),
        // 착지 충격 흡수
        Animated.parallel([
          Animated.timing(embarrassedScaleYAnim, {
            toValue: 0.94,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(embarrassedScaleXAnim, {
            toValue: 1.03,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(embarrassedRotateAnim, {
            toValue: -2,
            duration: 100,
            useNativeDriver: true,
          }),
        ]),
        // 복귀: 통통 튀어오름
        Animated.parallel([
          Animated.timing(embarrassedScaleYAnim, {
            toValue: 1.02,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(embarrassedScaleXAnim, {
            toValue: 0.99,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(embarrassedRotateAnim, {
            toValue: -6,
            duration: 100,
            useNativeDriver: true,
          }),
        ]),
        // 정상 상태로
        Animated.parallel([
          Animated.timing(embarrassedScaleYAnim, {
            toValue: 0.99,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(embarrassedScaleXAnim, {
            toValue: 1.01,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(embarrassedRotateAnim, {
            toValue: -8,
            duration: 100,
            useNativeDriver: true,
          }),
        ]),
        // 다음 점프 준비
        Animated.parallel([
          Animated.timing(embarrassedScaleYAnim, {
            toValue: 0.96,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(embarrassedScaleXAnim, {
            toValue: 1.02,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(embarrassedRotateAnim, {
            toValue: -9,
            duration: 100,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    };

    // 1.7초마다 점프 애니메이션 실행 (다른 주기)
    const interval = setInterval(startEmbarrassedAnimation, 1700);
    
    // 첫 애니메이션 시작 (0.2초 지연)
    setTimeout(startEmbarrassedAnimation, 200);

    return () => {
      clearInterval(interval);
    };
  }, []);

  // 노말 캐릭터 애니메이션 (0.4초 지연)
  useEffect(() => {
    const startNormalAnimation = () => {
      // 1.4초 애니메이션 시퀀스
      Animated.sequence([
        // 시작: 살짝 찌그러짐 (anticipation)
        Animated.timing(normalScaleAnim, {
          toValue: 0.98,
          duration: 100,
          useNativeDriver: true,
        }),
        // 도약 준비
        Animated.timing(normalScaleAnim, {
          toValue: 0.96,
          duration: 100,
          useNativeDriver: true,
        }),
        // 점프: 위로 올라가면서 커짐
        Animated.parallel([
          Animated.timing(normalBounceAnim, {
            toValue: -8,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(normalScaleAnim, {
            toValue: 1.02,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
        // 계속 상승
        Animated.parallel([
          Animated.timing(normalBounceAnim, {
            toValue: -35,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(normalScaleAnim, {
            toValue: 1.04,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
        // 공중 정점
        Animated.parallel([
          Animated.timing(normalBounceAnim, {
            toValue: -45,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(normalScaleAnim, {
            toValue: 1.0,
            duration: 100,
            useNativeDriver: true,
          }),
        ]),
        // 하강 시작
        Animated.parallel([
          Animated.timing(normalBounceAnim, {
            toValue: -35,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(normalScaleAnim, {
            toValue: 1.02,
            duration: 100,
            useNativeDriver: true,
          }),
        ]),
        // 착지 직전
        Animated.parallel([
          Animated.timing(normalBounceAnim, {
            toValue: -8,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(normalScaleAnim, {
            toValue: 1.03,
            duration: 100,
            useNativeDriver: true,
          }),
        ]),
        // 착지: 작아짐
        Animated.parallel([
          Animated.timing(normalBounceAnim, {
            toValue: 0,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(normalScaleAnim, {
            toValue: 0.92,
            duration: 50,
            useNativeDriver: true,
          }),
        ]),
        // 착지 충격 흡수
        Animated.timing(normalScaleAnim, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        // 복귀: 커지면서 복귀
        Animated.timing(normalScaleAnim, {
          toValue: 1.01,
          duration: 100,
          useNativeDriver: true,
        }),
        // 정상 상태로
        Animated.timing(normalScaleAnim, {
          toValue: 1.0,
          duration: 100,
          useNativeDriver: true,
        }),
        // 다음 점프 준비
        Animated.timing(normalScaleAnim, {
          toValue: 0.98,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    };

    // 1.5초마다 점프 애니메이션 실행 (다른 주기)
    const interval = setInterval(startNormalAnimation, 1500);
    
    // 첫 애니메이션 시작 (0.4초 지연)
    setTimeout(startNormalAnimation, 400);

    return () => {
      clearInterval(interval);
    };
  }, []);

  // 새드 캐릭터 애니메이션 (0.6초 지연)
  useEffect(() => {
    const startSadAnimation = () => {
      // 1.4초 애니메이션 시퀀스 (Y축 스케일만 사용)
      Animated.sequence([
        // 시작: 살짝 찌그러짐 (anticipation)
        Animated.timing(sadScaleYAnim, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        // 도약 준비
        Animated.timing(sadScaleYAnim, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        // 점프: 위로 올라가면서 길어짐
        Animated.parallel([
          Animated.timing(sadBounceAnim, {
            toValue: -8,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(sadScaleYAnim, {
            toValue: 1.05,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
        // 계속 상승: 길어진 상태 유지
        Animated.parallel([
          Animated.timing(sadBounceAnim, {
            toValue: -35,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(sadScaleYAnim, {
            toValue: 1.08,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
        // 공중 정점: 길어진 상태
        Animated.parallel([
          Animated.timing(sadBounceAnim, {
            toValue: -45,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(sadScaleYAnim, {
            toValue: 1.06,
            duration: 100,
            useNativeDriver: true,
          }),
        ]),
        // 하강 시작: 여전히 길어짐
        Animated.parallel([
          Animated.timing(sadBounceAnim, {
            toValue: -35,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(sadScaleYAnim, {
            toValue: 1.08,
            duration: 100,
            useNativeDriver: true,
          }),
        ]),
        // 착지 직전: 길어진 상태
        Animated.parallel([
          Animated.timing(sadBounceAnim, {
            toValue: -8,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(sadScaleYAnim, {
            toValue: 1.05,
            duration: 100,
            useNativeDriver: true,
          }),
        ]),
        // 착지: 급격히 줄어듦
        Animated.parallel([
          Animated.timing(sadBounceAnim, {
            toValue: 0,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(sadScaleYAnim, {
            toValue: 0.92,
            duration: 50,
            useNativeDriver: true,
          }),
        ]),
        // 착지 후 복귀
        Animated.timing(sadScaleYAnim, {
          toValue: 1.0,
          duration: 100,
          useNativeDriver: true,
        }),
        // 다음 점프 준비
        Animated.timing(sadScaleYAnim, {
          toValue: 1.0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    };

    // 1.8초마다 점프 애니메이션 실행 (다른 주기)
    const interval = setInterval(startSadAnimation, 1800);
    
    // 첫 애니메이션 시작 (0.6초 지연)
    setTimeout(startSadAnimation, 600);

    return () => {
      clearInterval(interval);
    };
  }, []);

  // 앵그리 캐릭터 애니메이션 (0.8초 지연)
  useEffect(() => {
    const startAngryAnimation = () => {
      // 1.4초 애니메이션 시퀀스 (가로로 퍼지는 효과)
      Animated.sequence([
        // 시작: 점프 준비 상태로 시작
        Animated.parallel([
          Animated.timing(angryScaleXAnim, {
            toValue: 1.03,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(angryScaleYAnim, {
            toValue: 0.97,
            duration: 100,
            useNativeDriver: true,
          }),
        ]),
        // 점프: 위로 올라가면서 가로로 퍼지고 세로로 납작
        Animated.parallel([
          Animated.timing(angryBounceAnim, {
            toValue: -8,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(angryScaleXAnim, {
            toValue: 1.08,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(angryScaleYAnim, {
            toValue: 0.94,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
        // 계속 상승: 가로로 퍼진 상태 유지
        Animated.parallel([
          Animated.timing(angryBounceAnim, {
            toValue: -35,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(angryScaleXAnim, {
            toValue: 1.12,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(angryScaleYAnim, {
            toValue: 0.90,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
        // 공중 정점: 가로로 퍼진 상태
        Animated.parallel([
          Animated.timing(angryBounceAnim, {
            toValue: -45,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(angryScaleXAnim, {
            toValue: 1.10,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(angryScaleYAnim, {
            toValue: 0.92,
            duration: 100,
            useNativeDriver: true,
          }),
        ]),
        // 하강 시작: 여전히 퍼짐
        Animated.parallel([
          Animated.timing(angryBounceAnim, {
            toValue: -35,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(angryScaleXAnim, {
            toValue: 1.12,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(angryScaleYAnim, {
            toValue: 0.90,
            duration: 100,
            useNativeDriver: true,
          }),
        ]),
        // 착지 직전: 서서히 원래 크기로
        Animated.parallel([
          Animated.timing(angryBounceAnim, {
            toValue: -8,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(angryScaleXAnim, {
            toValue: 1.06,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(angryScaleYAnim, {
            toValue: 0.95,
            duration: 100,
            useNativeDriver: true,
          }),
        ]),
        // 착지: 거의 원래 크기
        Animated.parallel([
          Animated.timing(angryBounceAnim, {
            toValue: 0,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(angryScaleXAnim, {
            toValue: 1.02,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(angryScaleYAnim, {
            toValue: 0.98,
            duration: 50,
            useNativeDriver: true,
          }),
        ]),
        // 착지 후 살짝 오버슈팅
        Animated.parallel([
          Animated.timing(angryScaleXAnim, {
            toValue: 0.98,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(angryScaleYAnim, {
            toValue: 1.01,
            duration: 100,
            useNativeDriver: true,
          }),
        ]),
        // 정상 상태로 부드럽게 복귀
        Animated.parallel([
          Animated.timing(angryScaleXAnim, {
            toValue: 1.0,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(angryScaleYAnim, {
            toValue: 1.0,
            duration: 100,
            useNativeDriver: true,
          }),
        ]),
        // 다음 점프 준비로 자연스럽게 전환
        Animated.parallel([
          Animated.timing(angryScaleXAnim, {
            toValue: 1.03,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(angryScaleYAnim, {
            toValue: 0.97,
            duration: 100,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    };

    // 1.6초마다 점프 애니메이션 실행 (다른 주기)
    const interval = setInterval(startAngryAnimation, 1600);
    
    // 첫 애니메이션 시작 (0.8초 지연)
    setTimeout(startAngryAnimation, 800);

    return () => {
      clearInterval(interval);
    };
  }, []);

  // 익사이트 캐릭터 애니메이션 (1.0초 지연)
  useEffect(() => {
    const startExciteAnimation = () => {
      // 1.0초 애니메이션 시퀀스 (회전과 스케일)
      Animated.sequence([
        // 시작: 도약 준비 상태로 시작
        Animated.parallel([
          Animated.timing(exciteScaleAnim, {
            toValue: 0.95,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(exciteRotateAnim, {
            toValue: 0,
            duration: 100,
            useNativeDriver: true,
          }),
        ]),
        // 점프: 위로 올라가면서 왼쪽으로 회전하고 커짐
        Animated.parallel([
          Animated.timing(exciteBounceAnim, {
            toValue: -15,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(exciteRotateAnim, {
            toValue: -15,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(exciteScaleAnim, {
            toValue: 1.08,
            duration: 150,
            useNativeDriver: true,
          }),
        ]),
        // 계속 상승: 왼쪽으로 회전하며 커진 상태
        Animated.parallel([
          Animated.timing(exciteBounceAnim, {
            toValue: -55,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(exciteRotateAnim, {
            toValue: -30,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(exciteScaleAnim, {
            toValue: 1.15,
            duration: 150,
            useNativeDriver: true,
          }),
        ]),
        // 공중 정점: 최대 왼쪽 회전과 크기
        Animated.parallel([
          Animated.timing(exciteBounceAnim, {
            toValue: -70,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(exciteRotateAnim, {
            toValue: -35,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(exciteScaleAnim, {
            toValue: 1.18,
            duration: 100,
            useNativeDriver: true,
          }),
        ]),
        // 하강 시작: 오른쪽으로 역회전하며 크기 유지
        Animated.parallel([
          Animated.timing(exciteBounceAnim, {
            toValue: -55,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(exciteRotateAnim, {
            toValue: -20,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(exciteScaleAnim, {
            toValue: 1.15,
            duration: 100,
            useNativeDriver: true,
          }),
        ]),
        // 착지 직전: 계속 역회전하며 작아지기 시작
        Animated.parallel([
          Animated.timing(exciteBounceAnim, {
            toValue: -15,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(exciteRotateAnim, {
            toValue: -5,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(exciteScaleAnim, {
            toValue: 1.05,
            duration: 50,
            useNativeDriver: true,
          }),
        ]),
        // 착지: 원래 각도로 복귀하고 작아짐
        Animated.parallel([
          Animated.timing(exciteBounceAnim, {
            toValue: 0,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(exciteRotateAnim, {
            toValue: 0,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(exciteScaleAnim, {
            toValue: 0.92,
            duration: 50,
            useNativeDriver: true,
          }),
        ]),
        // 바로 다음 점프 준비
        Animated.timing(exciteScaleAnim, {
          toValue: 0.94,
          duration: 100,
          useNativeDriver: true,
        }),
        // 다음 점프 준비 완료
        Animated.timing(exciteScaleAnim, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    };

    // 1.2초마다 점프 애니메이션 실행 (다른 주기)
    const interval = setInterval(startExciteAnimation, 1200);
    
    // 첫 애니메이션 시작 (1.0초 지연)
    setTimeout(startExciteAnimation, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const handleNavigateToOnBoarding2 = () => {
    navigation.navigate('OnBoarding2');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* 배경 프레임 */}
      <View style={styles.frame} />

      {/* 상단 헤더 - 온보딩에서는 숨김 */}
      <Header hideOnOnboarding={true} />

      {/* 캐릭터들 그룹 */}
      <View style={styles.charactersGroup}>
        <View style={styles.character1}>
          <Animated.View 
            style={[
              styles.sadCharacterWrapper,
              {
                transform: [
                  { translateY: sadBounceAnim },
                  { scaleY: sadScaleYAnim },
                ],
              },
            ]}
          >
          <SadCharacter width={41} height={89} />
          </Animated.View>
        </View>
        <View style={styles.character2}>
                 <Animated.View 
                   style={[
                     styles.embarrassedCharacterWrapper,
                     {
                       transform: [
                         { translateY: embarrassedBounceAnim },
                         { scaleY: embarrassedScaleYAnim },
                         { scaleX: embarrassedScaleXAnim },
                         { rotate: embarrassedRotateAnim.interpolate({
                           inputRange: [-360, 360],
                           outputRange: ['-360deg', '360deg'],
                         }) },
                       ],
                     },
                   ]}
                 >
          <EmbarrassedCharacter width={142} height={142} />
                 </Animated.View>
        </View>
        <View style={styles.character3}>
          <Animated.View 
            style={[
              styles.happyCharacterWrapper,
              {
                transform: [
                  { translateY: bounceAnim },
                  { scaleY: scaleYAnim },
                  { scaleX: scaleXAnim },
                ],
              },
            ]}
          >
          <HappyCharacter width={108} height={108} />
          </Animated.View>
        </View>
        <View style={styles.character4}>
          <Animated.View 
            style={[
              styles.exciteCharacterWrapper,
              {
                transform: [
                  { translateY: exciteBounceAnim },
                  { rotate: exciteRotateAnim.interpolate({
                    inputRange: [-360, 360],
                    outputRange: ['-360deg', '360deg'],
                  }) },
                  { scale: exciteScaleAnim },
                ],
              },
            ]}
          >
            <ExciteCharacter width={107.10901975631714} height={107.10901975631714} />
          </Animated.View>
        </View>
        <View style={styles.character5}>
          <Animated.View 
            style={[
              styles.normalCharacterWrapper,
              {
                transform: [
                  { translateY: normalBounceAnim },
                  { scale: normalScaleAnim },
                ],
              },
            ]}
          >
          <NormalCharacter width={77} height={77} />
          </Animated.View>
        </View>

        <View style={styles.character6}>
          <Animated.View 
            style={[
              styles.angryCharacterWrapper,
              {
                transform: [
                  { translateY: angryBounceAnim },
                  { scaleX: angryScaleXAnim },
                  { scaleY: angryScaleYAnim },
                ],
              },
            ]}
          >
            <AngryCharacter width={86} height={61} />
          </Animated.View>
        </View>
      </View>

      {/* Rev_O 로고 그룹 - Figma 정확한 위치 */}
      <View style={styles.logoGroup}>
        {/* Layer_1 - Rev 텍스트 (134, 439) */}
        <View style={styles.logoText}>
          <RevText width={84.24} height={37.26} />
        </View>
        
        {/* Ellipse 329 - 큰 원 (229.94, 444.58) */}
        <View style={styles.logoEllipse329}>
          <svg width="31" height="31" viewBox="0 0 31 31" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="15.5" cy="15.5" r="13.5" stroke="url(#paint0_linear_3250_8011)" strokeWidth="2.40745"/>
            <g filter="url(#filter0_d_3250_8010)">
              <circle cx="15.5" cy="15.5" r="10" fill="url(#paint1_linear_3250_8010)"/>
              <circle cx="15.5" cy="15.5" r="10" stroke="url(#paint2_linear_3250_8010)" strokeWidth="0.160497"/>
            </g>
            <defs>
              <filter id="filter0_d_3250_8010" x="2.5" y="2.5" width="26" height="26" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
                <feOffset dy="0.641986"/>
                <feGaussianBlur stdDeviation="0.320993"/>
                <feComposite in2="hardAlpha" operator="out"/>
                <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/>
                <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_3250_8010"/>
                <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_3250_8010" result="shape"/>
              </filter>
              <linearGradient id="paint0_linear_3250_8011" x1="6.15636" y1="4.40455" x2="25.4798" y2="28.0389" gradientUnits="userSpaceOnUse">
                <stop offset="1" stopColor="#B780FF"/>
              </linearGradient>
              <linearGradient id="paint1_linear_3250_8010" x1="4.187146" y1="4.479981" x2="25.5328" y2="27.2853" gradientUnits="userSpaceOnUse">
                <stop offset="1" stopColor="#B780FF"/>
              </linearGradient>
              <linearGradient id="paint2_linear_3250_8010" x1="8.6807" y1="7.00686" x2="21.359" y2="23.028" gradientUnits="userSpaceOnUse">
                <stop offset="1" stopColor="#B780FF"/>
              </linearGradient>
            </defs>
          </svg>
        </View>
        
        
        {/* Rectangle 795 - 선 (216.8, 472.84) */}
        <View style={styles.logoLine} />
      </View>

      {/* 로그인 버튼 */}
      <TouchableOpacity 
        style={styles.loginButton}
        onPress={handleNavigateToOnBoarding2}
      >
        <Text style={styles.loginButtonText}>시작하기</Text>
      </TouchableOpacity>

      {/* 홈 인디케이터 */}
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
  charactersGroup: {
    position: 'absolute',
    left: 38,
    top: 258.99993896484375,
    width: 318,
    height: 176.00006103515625,
  },
  character1: {
    position: 'absolute',
    left: 0,
    top: 50,
  },
  character2: {
    position: 'absolute',
    left: 0,
    top: 34,
  },
  character3: {
    position: 'absolute',
    left: 90,
    top: 32,
    zIndex: 3,
  },
  character4: {
    position: 'absolute',
    left: 184,
    zIndex: 2,
  },
  character5: {
    position: 'absolute',
    left: 179,
    top: 66,
    zIndex: 2,
  },
  character6: {
    position: 'absolute',
    left: 232,
    top: 76,
    zIndex: 1,
  },
         happyCharacterWrapper: {
           transformOrigin: 'center bottom',
         },
         embarrassedCharacterWrapper: {
           transformOrigin: 'center bottom',
         },
         normalCharacterWrapper: {
           transformOrigin: 'center bottom',
         },
         sadCharacterWrapper: {
           transformOrigin: 'center bottom',
         },
         angryCharacterWrapper: {
           transformOrigin: 'center bottom',
         },
         exciteCharacterWrapper: {
           transformOrigin: 'center center',
  },
  logoGroup: {
    position: 'absolute',
    left: 134,
    top: 439,
    width: 126,
    height: 37.26,
  },
  logoText: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  logoEllipse329: {
    position: 'absolute',
    left: 95.94,
    top: 5.58,
  },
  logoLine: {
    position: 'absolute',
    left: 82.8,
    top: 33.84,
    width: 12.24,
    height: 1.98,
    backgroundColor: '#B780FF',
  },
  loginButton: {
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
  loginButtonText: {
    color: '#000000',
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: 0.48,
  },
});

export default OnBoardingScreen1;