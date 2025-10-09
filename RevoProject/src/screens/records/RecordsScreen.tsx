import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import NavigationBar from '../../components/NavigationBar';
import Header from '../../components/Header';

// iPhone 15, 15 Pro 크기 기준
const screenWidth = 393;
const screenHeight = 852;

interface RecordsScreenProps {
  onNavigateToRecording: () => void;
  onNavigateToRecords: () => void;
  onNavigateToProfile: () => void;
}

const RecordsScreen: React.FC<RecordsScreenProps> = ({ onNavigateToRecording, onNavigateToRecords, onNavigateToProfile }) => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* 배경 프레임 */}
      <View style={styles.frame} />

      {/* 상단 헤더 */}
      <Header />

      {/* 이번주 날짜 표시 */}
      <View style={styles.weekContainer}>
        <View style={styles.dayItem}>
          <Text style={styles.dayLabel}>일</Text>
          <View style={styles.dayBorder}>
            <Text style={styles.dayNumber}>6</Text>
          </View>
        </View>
        <View style={styles.dayItem}>
          <Text style={styles.dayLabel}>월</Text>
          <View style={[styles.dayBorder, styles.selectedDay]}>
            <Text style={[styles.dayNumber, styles.selectedDayNumber]}>7</Text>
          </View>
        </View>
        <View style={styles.dayItem}>
          <Text style={styles.dayLabel}>화</Text>
          <View style={styles.dayBorder}>
            <Text style={styles.dayNumber}>8</Text>
          </View>
        </View>
        <View style={styles.dayItem}>
          <Text style={styles.dayLabel}>수</Text>
          <View style={styles.dayBorder}>
            <Text style={styles.dayNumber}>9</Text>
          </View>
        </View>
        <View style={styles.dayItem}>
          <Text style={styles.dayLabel}>목</Text>
          <View style={styles.dayBorder}>
            <Text style={styles.dayNumber}>10</Text>
          </View>
        </View>
        <View style={styles.dayItem}>
          <Text style={styles.dayLabel}>금</Text>
          <View style={styles.dayBorder}>
            <Text style={styles.dayNumber}>11</Text>
          </View>
        </View>
        <View style={styles.dayItem}>
          <Text style={styles.dayLabel}>토</Text>
          <View style={styles.dayBorder}>
            <Text style={styles.dayNumber}>12</Text>
          </View>
        </View>
      </View>

      {/* 녹음이 없을 때의 상태 */}
      <View style={styles.emptyStateContainer}>
        <Text style={styles.emptyStateTitle} numberOfLines={1}>오늘 첫 녹음을 남겨보세요</Text>
        <TouchableOpacity style={styles.recordButton} onPress={onNavigateToRecording}>
          <Text style={styles.recordButtonText} numberOfLines={1}>녹음하러 가기</Text>
        </TouchableOpacity>
      </View>

      {/* 캐릭터 */}
      <View style={styles.characterContainer}>
        <svg width="178" height="178" viewBox="0 0 178 178" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="89" cy="89" r="89" fill="#FED046"/>
          <circle cx="67" cy="33" r="18" transform="rotate(90 67 33)" fill="#F5F5F5"/>
          <circle cx="104.532" cy="33" r="18" transform="rotate(90 104.532 33)" fill="#F5F5F5"/>
          <mask id="mask0_3250_4914" style={{maskType:'alpha'}} maskUnits="userSpaceOnUse" x="49" y="15" width="36" height="36">
            <circle cx="67" cy="33" r="18" transform="rotate(90 67 33)" fill="#F5F5F5"/>
          </mask>
          <g mask="url(#mask0_3250_4914)">
            <circle cx="66.9989" cy="18.0011" r="18.0011" transform="rotate(90 66.9989 18.0011)" fill="#0A0A0A"/>
          </g>
          <mask id="mask1_3250_4914" style={{maskType:'alpha'}} maskUnits="userSpaceOnUse" x="86" y="15" width="37" height="36">
            <circle cx="104.532" cy="33" r="18" transform="rotate(90 104.532 33)" fill="#F5F5F5"/>
          </mask>
          <g mask="url(#mask1_3250_4914)">
            <circle cx="104.531" cy="17.9879" r="18.0011" transform="rotate(90 104.531 17.9879)" fill="#0A0A0A"/>
          </g>
          <path d="M81 53C81 58.3614 90.6506 58.6295 90.6506 53" stroke="#0A0A0A" strokeWidth="2.57207" strokeLinecap="round"/>
          <path d="M62.7257 39.4509C61.2072 39.4509 59.7509 38.8477 58.6772 37.774C57.6035 36.7002 57.0003 35.2439 57.0003 33.7255C57.0003 32.207 57.6035 30.7507 58.6772 29.6769C59.7509 28.6032 61.2072 28 62.7257 28L62.7257 33.7255L62.7257 39.4509Z" fill="#F5F5F5"/>
          <path d="M102.726 39.4509C101.207 39.4509 99.7509 38.8477 98.6772 37.774C97.6035 36.7002 97.0003 35.2439 97.0003 33.7255C97.0003 32.207 97.6035 30.7507 98.6772 29.6769C99.7509 28.6032 101.207 28 102.726 28L102.726 33.7255L102.726 39.4509Z" fill="#F5F5F5"/>
        </svg>
      </View>

      {/* 하단 네비게이션 바 */}
      <NavigationBar onNavigateToRecords={onNavigateToRecords} onNavigateToRecording={onNavigateToRecording} onNavigateToProfile={onNavigateToProfile} currentPage="Records" />
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
  weekContainer: {
    position: 'absolute',
    left: 24,
    top: 118,
    width: 345,
    height: 70,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end', // 하단 정렬로 변경
    paddingBottom: 8, // 하단 여백 추가
  },
  dayItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 38,
    height: 50,
  },
  dayBorder: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#9A9A9A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedDay: {
    backgroundColor: '#B780FF',
    borderColor: '#B780FF',
  },
  dayLabel: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '500',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  dayNumber: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '500',
    letterSpacing: 0.48,
  },
  selectedDayNumber: {
    color: '#000000',
  },
  emptyStateContainer: {
    position: 'absolute',
    left: 24,
    right: 24,
    top: 300,
    bottom: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.56,
    textAlign: 'center',
    marginBottom: 32,
  },
  recordButton: {
    width: 146,
    height: 46,
    borderRadius: 50,
    backgroundColor: '#B780FF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden', // 텍스트가 버튼 밖으로 나가지 않도록
    paddingHorizontal: 12, // 양옆 패딩 12px
    paddingVertical: 10,   // 위아래 패딩 10px
  },
  recordButtonText: {
    color: '#000000',
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: 0.44,
    textAlign: 'center',
    lineHeight: 26, // 텍스트 높이를 명시적으로 설정
  },
  characterContainer: {
    position: 'absolute',
    left: 111,
    top: 617,
    width: 178,
    height: 178,
  },
});

export default RecordsScreen;

