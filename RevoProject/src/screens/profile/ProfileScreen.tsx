import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  ScrollView,
} from 'react-native';
import NavigationBar from '../../components/NavigationBar';
import Header from '../../components/Header';

// iPhone 15, 15 Pro 크기 기준
const screenWidth = 393;
const screenHeight = 852;

interface ProfileScreenProps {
  onNavigateToRecording: () => void;
  onNavigateToRecords: () => void;
  onNavigateToProfile: () => void;
  onNavigateToEmotionDetail: () => void;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ 
  onNavigateToRecording, 
  onNavigateToRecords, 
  onNavigateToProfile,
  onNavigateToEmotionDetail
}) => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* 배경 프레임 */}
      <View style={styles.frame} />

      {/* 상단 헤더 */}
      <Header />

      {/* 프로필 이미지 */}
      <View style={styles.profileImageContainer}>
        <View style={styles.profileImage} />
      </View>

      {/* 사용자명 */}
      <View style={styles.userNameContainer}>
        <Text style={styles.userName}>홍시천사</Text>
      </View>

      {/* 프로필 편집 버튼 */}
      <TouchableOpacity style={styles.editButton}>
        <Text style={styles.editButtonText}>프로필 편집</Text>
      </TouchableOpacity>

      {/* 통계 섹션 */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>9</Text>
          <Text style={styles.statLabel}>게시물</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>12</Text>
          <Text style={styles.statLabel}>팔로워</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>12</Text>
          <Text style={styles.statLabel}>팔로잉</Text>
        </View>
      </View>

      {/* 기록 모음 제목 */}
      <View style={styles.recordsTitleContainer}>
        <Text style={styles.recordsTitle}>기록 모음</Text>
      </View>

      {/* 감정 기록 카드들 */}
      <ScrollView 
        style={styles.emotionCardsContainer}
        horizontal={true}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.emotionCardsContent}
      >
        <TouchableOpacity style={[styles.emotionCard, styles.happyCard]} onPress={onNavigateToEmotionDetail}>
          <Text style={styles.emotionDate}>7월 26일</Text>
          <Text style={styles.emotionText}>행복</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.emotionCard, styles.angryCard]} onPress={onNavigateToEmotionDetail}>
          <Text style={styles.emotionDate}>7월 26일</Text>
          <Text style={styles.emotionText}>분노</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.emotionCard, styles.happyCard2]} onPress={onNavigateToEmotionDetail}>
          <Text style={styles.emotionDate}>7월 26일</Text>
          <Text style={styles.emotionText}>슬픔</Text>
          <View style={styles.emotionIcon}>
            <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="30" cy="30" r="30" fill="#00C0FF"/>
              <circle cx="22" cy="22" r="8" fill="#FFFFFF"/>
              <circle cx="38" cy="22" r="8" fill="#FFFFFF"/>
              <circle cx="22" cy="22" r="4" fill="#00C0FF"/>
              <circle cx="38" cy="22" r="4" fill="#00C0FF"/>
              <path d="M20 38C20 35 25 32 30 32C35 32 40 35 40 38" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </View>
        </TouchableOpacity>
      </ScrollView>

      {/* 하단 네비게이션 바 */}
      <NavigationBar 
        onNavigateToRecords={onNavigateToRecords} 
        onNavigateToRecording={onNavigateToRecording} 
        onNavigateToProfile={onNavigateToProfile}
        currentPage="Profile"
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
  profileImageContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 126,
    alignItems: 'center',
  },
  profileImage: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: '#C4C4C4',
  },
  userNameContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 270,
    transform: [{ translateY: -16 }],
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 0.64,
    textAlign: 'center',
  },
  editButton: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 320,
    transform: [{ translateY: -11 }],
  },
  editButtonText: {
    color: '#B780FF',
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: 0.44,
    textAlign: 'center',
  },
  statsContainer: {
    position: 'absolute',
    left: 24,
    top: 354,
    width: 345,
    height: 100,
    backgroundColor: '#3A3A3A',
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNumber: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: 0.44,
    marginBottom: 8,
  },
  statLabel: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  statDivider: {
    width: 1,
    height: 60,
    backgroundColor: '#FFFFFF',
    opacity: 0.2,
  },
  recordsTitleContainer: {
    position: 'absolute',
    left: 24,
    top: 526.5,
    transform: [{ translateY: -11 }],
  },
  recordsTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: 0.44,
  },
  emotionCardsContainer: {
    position: 'absolute',
    left: 24,
    top: 559,
    width: 345,
    height: 168,
  },
  emotionCardsContent: {
    flexDirection: 'row',
    gap: 8,
  },
  emotionCard: {
    width: 150,
    height: 150,
    borderRadius: 20,
    paddingTop: 20,
    paddingBottom: 82,
    paddingLeft: 22,
    alignItems: 'flex-start',
    position: 'relative',
  },
  happyCard: {
    backgroundColor: '#FFD630',
  },
  angryCard: {
    backgroundColor: '#FF5154',
  },
  happyCard2: {
    backgroundColor: '#00C0FF',
  },
  emotionDate: {
    color: '#000000',
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: 0.44,
    marginBottom: 4,
    textAlign: 'left',
  },
  emotionText: {
    color: '#000000',
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: 0.44,
    textAlign: 'left',
  },
  emotionIcon: {
    position: 'absolute',
    right: 8,
    bottom: 8,
  },
});

export default ProfileScreen;
