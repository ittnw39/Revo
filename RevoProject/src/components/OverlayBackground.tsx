import { FC } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Platform } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const screenWidth = Dimensions.get('window').width;
const screenHeight = Dimensions.get('window').height;

interface OverlayBackgroundProps {
  visible: boolean;
  overlayState: number; // 0: 첫 번째 가이드, 1: 두 번째 가이드, 2: 숨김
  onPress: () => void;
}

const OverlayBackground: FC<OverlayBackgroundProps> = ({ visible, overlayState, onPress }) => {
  if (!visible || overlayState >= 2) return null;

  return (
    <TouchableOpacity
      style={overlayState === 0 ? styles.guideContainer : styles.guideContainerSecond}
      activeOpacity={1}
      onPress={onPress}
    >
      {overlayState === 0 ? (
        // 첫 번째 가이드: 화살표 위아래
        <>
          <Svg width="173" height="152" viewBox="0 0 173 152" fill="none">
            <Path d="M31.2842 2.04639C31.2842 0.473622 29.5818 -0.509527 28.2197 0.276855L1.02148 15.98C-0.340569 16.7664 -0.340569 18.7327 1.02148 19.519L28.2197 35.2222C29.5817 36.0084 31.284 35.0252 31.2842 33.4526V23.1128H111.348V12.3862H31.2842V2.04639Z" fill="#B780FF"/>
            <Path d="M140.845 2.04626C140.845 0.4735 142.547 -0.509649 143.909 0.276733L171.108 15.9799C172.47 16.7662 172.47 18.7325 171.108 19.5189L143.909 35.222C142.547 36.0083 140.845 35.0251 140.845 33.4525V23.1127H60.7815V12.3861H140.845V2.04626Z" fill="#B780FF"/>
            <Path d="M94.3954 67.2724C91.4813 64.3925 91.5059 59.3572 94.3954 56.5017C97.285 53.6461 102.38 53.6218 105.294 56.5017L122.733 73.7349C137.302 88.1326 137.179 111.159 122.733 125.435C108.287 139.711 84.9867 139.832 70.4177 125.435L58.4288 113.587C55.5146 110.707 55.5392 105.671 58.4288 102.816C61.3183 99.9604 66.4136 99.9361 69.3278 102.816L64.9682 98.5076C62.054 95.6277 60.9887 91.6695 63.8783 88.8139C66.7678 85.9584 71.8631 85.9341 74.7773 88.8139L71.5076 85.5827C68.5934 82.7028 68.618 77.6675 71.5076 74.812C74.3971 71.9564 79.4924 71.9321 82.4066 74.812L56.249 48.9621C53.3348 46.0822 53.3595 41.0469 56.249 38.1914C59.1385 35.3358 63.1439 36.3886 66.0581 39.2684L109.654 82.3515L94.3954 67.2724Z" stroke="white" strokeWidth="4.08616" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
          </Svg>
          <Text style={styles.guideText}>
            스와이프로 화면을 넘기며{'\n'}친구들의 기록을 둘러보세요!
          </Text>
        </>
      ) : (
        // 두 번째 가이드: 화살표 아래위
        <>
          <Svg width="133" height="166" viewBox="0 0 133 166" fill="none">
            <Path d="M33.4515 134.716C35.0243 134.716 36.0075 136.418 35.2211 137.78L19.5179 164.978C18.7315 166.34 16.7662 166.34 15.9799 164.978L0.276734 137.78C-0.509646 136.418 0.4735 134.716 2.04627 134.716L12.3861 134.716L12.3861 54.6522L23.1117 54.6522L23.1117 134.716L33.4515 134.716Z" fill="#B780FF"/>
            <Path d="M33.4515 31.2842C35.0243 31.2842 36.0075 29.5818 35.2211 28.2197L19.5179 1.02148C18.7315 -0.340431 16.7662 -0.34047 15.9799 1.02148L0.276734 28.2197C-0.509646 29.5818 0.4735 31.2842 2.04627 31.2842L12.3861 31.2842L12.3861 111.348L23.1117 111.348L23.1117 31.2842L33.4515 31.2842Z" fill="#B780FF"/>
            <Path d="M78.0442 88.3763C75.1471 91.2734 75.1716 96.3388 78.0442 99.2114C80.9168 102.084 85.9821 102.108 88.8792 99.2114L106.215 81.8753C120.699 67.3916 120.577 44.2282 106.215 29.867C91.8541 15.5057 68.6906 15.3833 54.207 29.867L42.2885 41.7855C39.3914 44.6826 39.4159 49.748 42.2885 52.6206C45.161 55.4932 50.2264 55.5177 53.1235 52.6206L48.7895 56.9546C45.8924 59.8517 44.8334 63.8336 47.706 66.7062C50.5786 69.5788 55.644 69.6032 58.541 66.7062L55.2905 69.9567C52.3935 72.8538 52.4179 77.9192 55.2905 80.7917C58.1631 83.6643 63.2285 83.6888 66.1256 80.7917L40.1214 106.796C37.2244 109.693 37.2488 114.758 40.1214 117.631C42.994 120.504 46.9759 119.445 49.873 116.547L93.2132 73.2072L78.0442 88.3763Z" stroke="white" strokeWidth="4.08616" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
          </Svg>
          <Text style={styles.guideText}>
            스와이프로 화면을 넘기며{'\n'}친구들의 기록을 둘러보세요!
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  guideContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    width: screenWidth,
    height: screenHeight,
    backgroundColor: 'rgba(83, 83, 83, 0.5)', // 오버레이 배경
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 264, // SVG와 텍스트 위치
    zIndex: 1005, // 헤더(1000)보다 위에 표시
  },
  guideContainerSecond: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    width: screenWidth,
    height: screenHeight,
    backgroundColor: 'rgba(83, 83, 83, 0.5)', // 오버레이 배경
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 264, // SVG와 텍스트 위치
    zIndex: 1005, // 헤더(1000)보다 위에 표시
  },
  guideText: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontFamily: Platform.OS === 'web' ? 'Pretendard' : undefined,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.25,
    marginTop: 17, // SVG 하단으로부터 17px
  },
});

export default OverlayBackground;

