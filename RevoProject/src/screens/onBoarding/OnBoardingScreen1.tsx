import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import Layer1 from '../../assets/icons/onBoarding/Layer_1.svg';
import Group1000013362 from '../../assets/icons/onBoarding/Group 1000013362.svg';
import Group1000013363 from '../../assets/icons/onBoarding/Group 1000013363.svg';
import Group1000013364 from '../../assets/icons/onBoarding/Group 1000013364.svg';
import Group1000013365 from '../../assets/icons/onBoarding/Group 1000013365.svg';
import Group1000013366 from '../../assets/icons/onBoarding/Group 1000013366.svg';
import Group1000013367 from '../../assets/icons/onBoarding/Group 1000013367.svg';
import Header from '../../components/Header';
import Ellipse329 from '../../assets/icons/onBoarding/Ellipse 329.svg';

// iPhone 15, 15 Pro 크기 기준
const screenWidth = 393;
const screenHeight = 852;

interface OnBoardingScreen1Props {
  onNavigateToRecording: () => void;
}

const OnBoardingScreen1: React.FC<OnBoardingScreen1Props> = ({ onNavigateToRecording }) => {

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* 배경 프레임 */}
      <View style={styles.frame} />

      {/* 상단 헤더 */}
      <Header />

      {/* 캐릭터들 그룹 */}
      <View style={styles.charactersGroup}>
        <View style={styles.character1}>
          <Group1000013364 width={41} height={89} />
        </View>
        <View style={styles.character2}>
          <Group1000013366 width={142} height={142} />
        </View>
        <View style={styles.character3}>
          <Group1000013362 width={108} height={108} />
        </View>
        <View style={styles.character4}>
          <Group1000013365 width={107.10901975631714} height={107.10901975631714} />
        </View>
        <View style={styles.character5}>
          <Group1000013367 width={77} height={77} />
        </View>

        <View style={styles.character6}>
          <Group1000013363 width={86} height={60} />
        </View>
      </View>

      {/* Rev_O 로고 그룹 - Figma 정확한 위치 */}
      <View style={styles.logoGroup}>
        {/* Layer_1 - Rev 텍스트 (134, 439) */}
        <View style={styles.logoText}>
          <Layer1 width={84.24} height={37.26} />
        </View>
        
        {/* Ellipse 329 - 큰 원 (229.94, 444.58) */}
        <View style={styles.logoEllipse329}>
          <Ellipse329 width={30.06} height={30.24} />
        </View>
        
        
        {/* Rectangle 795 - 선 (216.8, 472.84) */}
        <View style={styles.logoLine} />
      </View>

      {/* 로그인 버튼 */}
      <TouchableOpacity 
        style={styles.loginButton}
        onPress={onNavigateToRecording}
      >
        <Text style={styles.loginButtonText}>로그인</Text>
      </TouchableOpacity>

      {/* 회원가입 버튼 */}
      <TouchableOpacity style={styles.signupButton}>
        <Text style={styles.signupButtonText}>회원가입</Text>
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
    top: 698,
    width: 361,
    height: 49,
    backgroundColor: '#B780FF',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#000000',
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: 0.48,
  },
  signupButton: {
    position: 'absolute',
    left: 16,
    top: 763,
    width: 361,
    height: 49,
    backgroundColor: '#3A3A3A',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupButtonText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: 0.48,
  },
});

export default OnBoardingScreen1;