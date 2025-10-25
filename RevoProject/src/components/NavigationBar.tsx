import { FC } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface NavigationBarProps {
  onNavigateToRecords?: () => void;
  onNavigateToRecording?: () => void;
  onNavigateToProfile?: () => void;
  currentPage?: 'Recording' | 'Records' | 'Profile';
}

const NavigationBar: FC<NavigationBarProps> = ({ onNavigateToRecords, onNavigateToRecording, onNavigateToProfile, currentPage }) => {
  return (
    <View style={styles.navigationBar}>
      <TouchableOpacity style={styles.navItem} onPress={onNavigateToRecords}>
        <svg width="20" height="24" viewBox="0 0 22 26" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M21 17.6154H4.47826C2.55727 17.6154 1 19.2685 1 21.3077M21 17.6154V23.1538C21 24.1734 20.2214 25 19.2609 25H4.47826C2.55727 25 1 23.3469 1 21.3077M21 17.6154V2.84615C21 1.82655 20.2214 1 19.2609 1H6.65217H4.47826C2.55727 1 1 2.6531 1 4.69231V21.3077" stroke={currentPage === 'Records' ? '#B780FF' : '#F5F5F5'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <Text style={[styles.navText, currentPage === 'Records' && styles.activeNavText]}>내기록</Text>
      </TouchableOpacity>
      
      <View style={styles.navItem}>
        <svg width="20" height="24" viewBox="0 0 22 26" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M19.4615 1H2.53846C1.68879 1 1 1.82655 1 2.84615V23.1538C1 24.1734 1.68879 25 2.53846 25H19.4615C20.3112 25 21 24.1734 21 23.1538V2.84615C21 1.82655 20.3112 1 19.4615 1Z" stroke="#F5F5F5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M7 8H14.5" stroke="#F5F5F5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M7 13H14.5" stroke="#F5F5F5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M7 18H14.5" stroke="#F5F5F5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <Text style={styles.navText}>피드</Text>
      </View>
      
      <TouchableOpacity style={styles.navItem} onPress={onNavigateToRecording}>
        <svg width="20" height="24" viewBox="0 0 22 26" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M1 11.9714C1.34968 14.2546 2.55271 16.3417 4.38899 17.8511C6.22528 19.3605 8.57206 20.1912 11 20.1912M11 20.1912C13.4279 20.1912 15.7747 19.3605 17.611 17.8511C19.4473 16.3417 20.6503 14.2546 21 11.9714M11 20.1912V25M11.0014 1C9.85315 1 8.75189 1.43347 7.93993 2.20505C7.12797 2.97662 6.67181 4.02311 6.67181 5.11429V10.6C6.67181 11.6912 7.12797 12.7377 7.93993 13.5092C8.75189 14.2808 9.85315 14.7143 11.0014 14.7143C12.1497 14.7143 13.251 14.2808 14.063 13.5092C14.8749 12.7377 15.3311 11.6912 15.3311 10.6V5.11429C15.3311 4.02311 14.8749 2.97662 14.063 2.20505C13.251 1.43347 12.1497 1 11.0014 1Z" stroke={currentPage === 'Recording' ? '#B780FF' : '#F5F5F5'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M1 12.25C1.34968 14.4843 2.55271 16.5269 4.38899 18.004C6.22528 19.4811 8.57206 20.294 11 20.294M11 20.294C13.4279 20.294 15.7747 19.4811 17.611 18.004C19.4473 16.5269 20.6503 14.4843 21 12.25M11 20.294V25" stroke={currentPage === 'Recording' ? '#B780FF' : '#F5F5F5'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <Text style={[styles.navText, currentPage === 'Recording' && styles.activeNavText]}>녹음</Text>
      </TouchableOpacity>
      
      <View style={styles.navItem}>
        <svg width="20" height="24" viewBox="0 0 23 26" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M17.044 1H5.94444C3.49194 1 1.5 3.08733 1.5 5.63051V22.5331C1.5 24.6924 2.98532 25.6041 4.80455 24.5604L10.4234 21.3094C11.0222 20.9616 11.9893 20.9616 12.5766 21.3094L18.1955 24.5604C20.0147 25.6161 21.5 24.7044 21.5 22.5331V5.63051C21.4885 3.08733 19.4965 1 17.044 1Z" stroke="#F5F5F5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M8.45654 11.7778L10.1166 13.4444L14.5435 9" stroke="#F5F5F5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <Text style={styles.navText}>아카이브</Text>
      </View>
      
      <TouchableOpacity style={styles.navItem} onPress={onNavigateToProfile}>
        <View style={styles.profileImage} />
        <Text style={[styles.navText, currentPage === 'Profile' && styles.activeNavText]}>내 프로필</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  navigationBar: {
    position: 'absolute',
    left: 24,
    bottom: 24,
    width: 345,
    height: 58,
    backgroundColor: '#2C2C2C',
    borderRadius: 35,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 49,
    height: 58,
  },
  activeNavItem: {
    // 활성 상태 스타일
  },
  navText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.25,
    marginTop: 4,
    textAlign: 'center',
  },
  activeNavText: {
    color: '#B780FF',
  },
  profileImage: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#D9D9D9',
  },
});

export default NavigationBar;
