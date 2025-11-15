import { FC, useEffect, useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Platform,
  Animated,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../types/navigation';
import Svg, { Path, Circle } from 'react-native-svg';
import NavigationBar from '../../components/NavigationBar';
import Header from '../../components/Header';
import DeleteConfirmModal from '../../components/DeleteConfirmModal';
import OverlayBackground from '../../components/OverlayBackground';

import { useApp } from '../../contexts/AppContext';
import { getRecordings, getRecording, deleteRecording, getUserFromStorage, Recording, getAudioUrl } from '../../services/api';

// 웹 환경에서 document 사용을 위한 타입 선언
declare const document: {
  addEventListener: (event: string, handler: (e: any) => void) => void;
  removeEventListener: (event: string, handler: (e: any) => void) => void;
};

// iPhone 15, 15 Pro 크기 기준
const screenWidth = 390;
const screenHeight = 844;

type FeedScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Feed'>;
type FeedScreenRouteProp = RouteProp<RootStackParamList, 'Feed'>;

const FeedScreen: FC = () => {
  const navigation = useNavigation<FeedScreenNavigationProp>();
  const route = useRoute<FeedScreenRouteProp>();
  const { isOnboardingCompleted } = useApp();
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [currentRecordingIndex, setCurrentRecordingIndex] = useState<number>(0);
  const [userName, setUserName] = useState<string>('');
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [scrollY] = useState(new Animated.Value(0));
  
  // 눈 애니메이션 상태 (1초마다 변경)
  const [eyeAnimationState, setEyeAnimationState] = useState<number>(0);
  
  // 오버레이 가이드 상태 (0: 첫 번째 가이드, 1: 두 번째 가이드, 2: 사라짐)
  const [overlayState, setOverlayState] = useState<number>(0);
  
  useEffect(() => {
    // 오버레이가 없을 때만 눈동자 애니메이션 작동
    if (overlayState < 2) {
      return;
    }
    
    const interval = setInterval(() => {
      setEyeAnimationState(prev => (prev === 0 ? 1 : 0));
    }, 1000); // 1초마다 변경
    
    return () => clearInterval(interval);
  }, [overlayState]);

  const audioRef = useRef<any>(null);

  // 현재 표시할 기록
  const currentRecording = useMemo(() => {
    if (recordings.length === 0) return null;
    if (currentRecordingIndex >= 0 && currentRecordingIndex < recordings.length) {
      return recordings[currentRecordingIndex];
    }
    return recordings[0];
  }, [recordings, currentRecordingIndex]);
  
  // 감정별 색상 매핑
  const getEmotionColor = (emotion: string): string => {
    const emotionColorMap: { [key: string]: string } = {
      '행복': '#FED046',
      '슬픔': '#47AFF4',
      '놀람': '#F99841',
      '신남': '#EE47CA',
      '화남': '#EE4947',
      '보통': '#5CC463',
    };
    return emotionColorMap[emotion] || '#FED046';
  };

  // 업로드된 기록 로드 (우선순위: 내 기록 오늘 > 남의 기록 오늘 > 최신순)
  useEffect(() => {
    const loadRecordings = async () => {
      try {
        setLoading(true);
        
        // 사용자 정보 가져오기
        const userInfo = getUserFromStorage();
        if (userInfo) {
          setUserName(userInfo.name);
          setCurrentUserId(userInfo.id);
        }

        // route에서 recordingId가 있으면 해당 기록 가져오기
        if (route.params?.recordingId) {
          const response = await getRecording(route.params.recordingId);
          if (response.success) {
            setRecordings([response.recording]);
            setCurrentRecordingIndex(0);
            setLoading(false);
            return;
          }
        }

        // recordingId가 없으면 모든 업로드된 기록 가져와서 우선순위대로 정렬
        if (userInfo) {
          // 모든 업로드된 기록 가져오기
          const response = await getRecordings({
            isUploaded: true,
            limit: 100, // 충분히 많이 가져오기
          });
          
          if (response.success && response.recordings.length > 0) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            // 오늘 날짜인지 확인하는 함수
            const isToday = (dateString: string): boolean => {
              const date = new Date(dateString);
              date.setHours(0, 0, 0, 0);
              return date.getTime() === today.getTime();
            };
            
            // 우선순위별로 정렬
            const sortedRecordings = response.recordings.sort((a, b) => {
              const aIsToday = isToday(a.recorded_at);
              const bIsToday = isToday(b.recorded_at);
              const aIsMine = a.user_id === userInfo.id;
              const bIsMine = b.user_id === userInfo.id;
              
              // 1순위: 내 기록이면서 오늘
              if (aIsMine && aIsToday && !(bIsMine && bIsToday)) return -1;
              if (bIsMine && bIsToday && !(aIsMine && aIsToday)) return 1;
              
              // 2순위: 오늘이면서 남의 기록
              if (aIsToday && !aIsMine && !(bIsToday && !bIsMine)) return -1;
              if (bIsToday && !bIsMine && !(aIsToday && !aIsMine)) return 1;
              
              // 3순위: 최신순 (uploaded_at 기준)
              const aUploaded = a.uploaded_at ? new Date(a.uploaded_at).getTime() : 0;
              const bUploaded = b.uploaded_at ? new Date(b.uploaded_at).getTime() : 0;
              return bUploaded - aUploaded;
            });
            
            setRecordings(sortedRecordings);
            setCurrentRecordingIndex(0);
          }
        }
        
        setLoading(false);
      } catch (error) {
        console.error('기록 로드 오류:', error);
        setLoading(false);
      }
    };

    if (isOnboardingCompleted) {
      loadRecordings();
    }
  }, [isOnboardingCompleted, route.params?.recordingId]);

  // 온보딩 완료 상태 확인
  useEffect(() => {
    if (!isOnboardingCompleted) {
      navigation.navigate('OnBoarding');
    }
  }, [isOnboardingCompleted, navigation]);

  // 스크롤 이벤트 핸들러
  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    scrollY.setValue(offsetY);
  };

  // 삭제 버튼 핸들러
  const handleDelete = async () => {
    if (!currentRecording) return;

    try {
      const response = await deleteRecording(currentRecording.id);
      if (response.success) {
        // 기록 목록에서 삭제
        const newRecordings = recordings.filter(r => r.id !== currentRecording.id);
        setRecordings(newRecordings);
        
        // 인덱스 조정
        if (currentRecordingIndex >= newRecordings.length) {
          setCurrentRecordingIndex(Math.max(0, newRecordings.length - 1));
        }
        
        // 모달 닫기
        setShowDeleteModal(false);
      }
    } catch (error) {
              console.error('삭제 오류:', error);
      setShowDeleteModal(false);
            }
  };

  // 날짜 포맷팅
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}월 ${day}일`;
  };

  // 하이라이트 시간을 초로 변환 (예: "1:30" -> 90)
  const parseHighlightTime = (timeString: string | null): number => {
    if (!timeString) return 0;
    const parts = timeString.split(':');
    if (parts.length === 2) {
      return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    }
    return 0;
  };

  // 오디오 재생 함수
  const playAudio = (startTime?: number) => {
    if (!currentRecording || !currentRecording.audio_file) return;

    const audioUrl = getAudioUrl(currentRecording.audio_file);
    
    if (typeof window !== 'undefined' && (window as any).Audio) {
      const Audio = (window as any).Audio;
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      if (startTime !== undefined) {
        audio.currentTime = startTime;
      }
      
      audio.play();
      setIsPlaying(true);
      
      audio.onended = () => {
        setIsPlaying(false);
      };
      
      audio.onerror = () => {
        setIsPlaying(false);
        console.error('오디오 재생 오류');
      };
    }
  };

  // 오디오 중지 함수
  const stopAudio = () => {
    if (audioRef.current) {
      if (typeof (audioRef.current as any).pause === 'function') {
        (audioRef.current as any).pause();
        (audioRef.current as any).currentTime = 0;
      }
      audioRef.current = null;
      setIsPlaying(false);
    }
  };

  // 좌우 스와이프 제스처 처리
  const handleTouchStart = (e: any) => {
    if (recordings.length <= 1) return;

    let startX: number;
    if (Platform.OS === 'web') {
      const touch = e.touches?.[0] || e.nativeEvent?.touches?.[0];
      if (!touch) return;
      startX = touch.clientX || touch.pageX;
    } else {
      const touch = e.nativeEvent.touches[0];
      if (!touch) return;
      startX = touch.pageX;
    }
    
    const handleTouchMove = (moveEvent: any) => {
      let currentX: number;
      if (Platform.OS === 'web') {
        const moveTouch = moveEvent.touches?.[0] || moveEvent.nativeEvent?.touches?.[0];
        if (!moveTouch) return;
        currentX = moveTouch.clientX || moveTouch.pageX;
      } else {
        const moveTouch = moveEvent.nativeEvent.touches[0];
        if (!moveTouch) return;
        currentX = moveTouch.pageX;
      }
      
      const deltaX = currentX - startX;
      
      if (Math.abs(deltaX) > 50) {
        if (deltaX > 0 && currentRecordingIndex > 0) {
          // 오른쪽으로 스와이프 - 이전 기록
          setCurrentRecordingIndex(currentRecordingIndex - 1);
        } else if (deltaX < 0 && currentRecordingIndex < recordings.length - 1) {
          // 왼쪽으로 스와이프 - 다음 기록
          setCurrentRecordingIndex(currentRecordingIndex + 1);
        }
        
        // 이벤트 리스너 제거
        if (Platform.OS === 'web' && typeof document !== 'undefined') {
          (document as any).removeEventListener('touchmove', handleTouchMove);
          (document as any).removeEventListener('touchend', handleTouchEnd);
        }
      }
    };
    
    const handleTouchEnd = () => {
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        (document as any).removeEventListener('touchmove', handleTouchMove);
        (document as any).removeEventListener('touchend', handleTouchEnd);
      }
    };
    
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      (document as any).addEventListener('touchmove', handleTouchMove);
      (document as any).addEventListener('touchend', handleTouchEnd);
    }
  };

  // 감정별 캐릭터 렌더링
  const renderCharacter = () => {
    if (!currentRecording) return null;

    const emotion = currentRecording.emotion;
    const emotionColor = getEmotionColor(emotion);

    // 행복 캐릭터
    if (emotion === '행복' || emotion === '기쁨') {
      return (
        <View style={styles.emotionCharacterContainer}>
          <View style={[styles.characterCircleBackground, { backgroundColor: emotionColor }]} />
          {/* 큰 캐릭터 전용 SVG */}
          <View style={styles.characterWrapper}>
            <View style={styles.characterEyesContainer}>
              {eyeAnimationState === 0 ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="337" height="138" viewBox="0 0 337 138" fill="none">
                  <circle cx="105.472" cy="69.472" r="60.4719" fill="#F5F5F5"/>
                  <circle cx="231.556" cy="69.472" r="60.4719" fill="#F5F5F5"/>
                  <mask id="mask0_396_61" style={{maskType:"alpha"}} maskUnits="userSpaceOnUse" x="45" y="9" width="121" height="121">
                    <circle cx="105.472" cy="69.4719" r="60.4719" fill="#F5F5F5"/>
                  </mask>
                  <g mask="url(#mask0_396_61)">
                    <circle cx="55.0428" cy="69.4754" r="60.4755" fill="#0A0A0A"/>
                  </g>
                  <mask id="mask1_396_61" style={{maskType:"alpha"}} maskUnits="userSpaceOnUse" x="171" y="9" width="122" height="121">
                    <circle cx="231.557" cy="69.4719" r="60.4719" fill="#F5F5F5"/>
                  </mask>
                  <g mask="url(#mask1_396_61)">
                    <circle cx="181.126" cy="69.4754" r="60.4755" fill="#0A0A0A"/>
                  </g>
                  <path d="M127.855 80.1475C127.855 84.208 126.242 88.1023 123.371 90.9735C120.5 93.8447 116.606 95.4578 112.545 95.4578C108.485 95.4578 104.59 93.8447 101.719 90.9735C98.8479 88.1023 97.2349 84.2081 97.2349 80.1475L112.545 80.1475H127.855Z" fill="#F5F5F5"/>
                  <path d="M253.94 80.1475C253.94 84.208 252.327 88.1023 249.456 90.9735C246.585 93.8447 242.691 95.4578 238.63 95.4578C234.57 95.4578 230.675 93.8447 227.804 90.9735C224.933 88.1023 223.32 84.2081 223.32 80.1475L238.63 80.1475H253.94Z" fill="#F5F5F5"/>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="337" height="138" viewBox="0 0 337 138" fill="none">
                  <circle cx="105.472" cy="69.472" r="60.4719" fill="#F5F5F5"/>
                  <circle cx="231.556" cy="69.472" r="60.4719" fill="#F5F5F5"/>
                  <mask id="mask0_396_110" style={{maskType:"alpha"}} maskUnits="userSpaceOnUse" x="45" y="9" width="121" height="121">
                    <circle cx="105.472" cy="69.4719" r="60.4719" fill="#F5F5F5"/>
            </mask>
                  <g mask="url(#mask0_396_110)">
                    <circle cx="60.4755" cy="60.4755" r="60.4755" transform="matrix(-1 0 0 1 214.288 9)" fill="#0A0A0A"/>
            </g>
                  <mask id="mask1_396_110" style={{maskType:"alpha"}} maskUnits="userSpaceOnUse" x="171" y="9" width="122" height="121">
                    <circle cx="231.557" cy="69.4719" r="60.4719" fill="#F5F5F5"/>
            </mask>
                  <g mask="url(#mask1_396_110)">
                    <circle cx="60.4755" cy="60.4755" r="60.4755" transform="matrix(-1 0 0 1 344.289 9)" fill="#0A0A0A"/>
                  </g>
                  <path d="M81.0001 80.1475C81.0001 84.208 82.6132 88.1023 85.4844 90.9735C88.3556 93.8447 92.2498 95.4578 96.3104 95.4578C100.371 95.4578 104.265 93.8447 107.136 90.9735C110.008 88.1023 111.621 84.2081 111.621 80.1475L96.3104 80.1475H81.0001Z" fill="#F5F5F5"/>
                  <path d="M211 80.1475C211 84.208 212.613 88.1023 215.484 90.9735C218.356 93.8447 222.25 95.4578 226.31 95.4578C230.371 95.4578 234.265 93.8447 237.136 90.9735C240.008 88.1023 241.621 84.2081 241.621 80.1475L226.31 80.1475H211Z" fill="#F5F5F5"/>
                </svg>
              )}
            </View>
            {/* 입 */}
            <View style={styles.characterMouthContainer}>
              <svg xmlns="http://www.w3.org/2000/svg" width="42" height="23" viewBox="0 0 42 23" fill="none">
                <path 
                  d="M4.50293 4.50299C4.50293 22.515 36.9246 23.4156 36.9246 4.50299" 
                  stroke="#0A0A0A" 
                  strokeWidth="9.00602" 
                  strokeLinecap="round"
                />
          </svg>
            </View>
          </View>
        </View>
      );
    }

    // 슬픔 캐릭터 (사각형 배경)
    if (emotion === '슬픔') {
      return (
        <View style={styles.sadEmotionCharacterContainer}>
          {/* 슬픔 색상 사각형 배경 */}
          <View style={[styles.sadCharacterBackground, { backgroundColor: emotionColor }]} />
          {/* 슬픔 캐릭터 SVG */}
          <View style={styles.sadCharacterWrapper}>
            <svg xmlns="http://www.w3.org/2000/svg" width="393" height="534" viewBox="0 0 393 534" fill="none" style={{ width: '100%', height: '100%' }}>
              {/* 슬픔 캐릭터 SVG - 배경 rect는 제외하고 캐릭터만 (배경은 별도 렌더링) */}
              <circle cx="140.233" cy="108.908" r="53.9077" fill="#F5F5F5"/>
              <circle cx="252.631" cy="108.908" r="53.9077" fill="#F5F5F5"/>
              <mask id="mask0_sad_feed" style={{maskType:"alpha"}} maskUnits="userSpaceOnUse" x="86" y="55" width="109" height="108">
                <circle cx="140.232" cy="108.908" r="53.9077" fill="#F5F5F5"/>
              </mask>
              <g mask="url(#mask0_sad_feed)">
                {eyeAnimationState === 0 ? (
                  <circle cx="95.8028" cy="108.911" r="53.9108" fill="#0A0A0A"/>
                ) : (
                  <circle cx="60.4755" cy="60.4755" r="53.9108" transform="matrix(-1 0 0 1 251.658 48.4355)" fill="#0A0A0A"/>
                )}
              </g>
              <mask id="mask1_sad_feed" style={{maskType:"alpha"}} maskUnits="userSpaceOnUse" x="198" y="55" width="109" height="108">
                <circle cx="252.631" cy="108.908" r="53.9077" fill="#F5F5F5"/>
              </mask>
              <g mask="url(#mask1_sad_feed)">
                {eyeAnimationState === 0 ? (
                  <circle cx="204.988" cy="108.911" r="53.9108" fill="#0A0A0A"/>
                ) : (
                  <circle cx="60.4755" cy="60.4755" r="53.9108" transform="matrix(-1 0 0 1 365.659 48.4355)" fill="#0A0A0A"/>
                )}
              </g>
              <path d="M100.777 133.678H124.919C133.755 133.678 140.919 140.842 140.919 149.678V321.6C140.919 330.437 133.755 337.6 124.919 337.6H116.777C107.94 337.6 100.777 330.437 100.777 321.6V133.678Z" fill="#F5F5F5"/>
              <rect x="254.921" y="144.918" width="32.9243" height="95.7798" rx="16.4621" fill="#F5F5F5"/>
              <path d="M211.568 174.927C211.568 158.87 182.666 158.067 182.666 174.927" stroke="#0A0A0A" strokeWidth="8.02842" strokeLinecap="round"/>
              <path d="M144.111 120.03C144.111 123.65 142.673 127.121 140.113 129.681C137.554 132.241 134.082 133.678 130.463 133.678C126.843 133.678 123.371 132.241 120.812 129.681C118.252 127.121 116.814 123.65 116.814 120.03L130.463 120.03H144.111Z" fill="#F5F5F5"/>
              <path d="M254.922 120.03C254.922 123.65 253.484 127.121 250.924 129.681C248.365 132.24 244.893 133.678 241.273 133.678C237.654 133.678 234.182 132.24 231.622 129.681C229.063 127.121 227.625 123.65 227.625 120.03L241.273 120.03H254.922Z" fill="#F5F5F5"/>
            </svg>
          </View>
        </View>
      );
    }

    // 신남 캐릭터 (별 모양 배경)
    if (emotion === '신남') {
      return (
        <View style={styles.excitedEmotionCharacterContainer}>
          {/* 신남 캐릭터 SVG (별 모양 배경 포함) */}
          <View style={styles.excitedCharacterWrapper}>
            <svg xmlns="http://www.w3.org/2000/svg" width="640" height="640" viewBox="0 0 640 640" fill="none" style={{ width: '100%', height: '100%' }}>
              <path d="M315.663 17.6931C316.625 13.4338 322.694 13.4338 323.657 17.6931L365.107 201.195C365.73 203.956 368.898 205.268 371.291 203.757L530.357 103.311C534.049 100.98 538.34 105.271 536.009 108.963L435.563 268.029C434.052 270.422 435.364 273.589 438.124 274.213L621.627 315.663C625.886 316.625 625.886 322.694 621.627 323.657L438.124 365.107C435.364 365.73 434.052 368.898 435.563 371.291L536.009 530.357C538.34 534.049 534.049 538.34 530.357 536.009L371.291 435.563C368.898 434.052 365.73 435.364 365.107 438.124L323.657 621.627C322.694 625.886 316.625 625.886 315.663 621.627L274.213 438.124C273.589 435.364 270.422 434.052 268.029 435.563L108.963 536.009C105.271 538.34 100.98 534.049 103.311 530.357L203.757 371.291C205.268 368.898 203.956 365.73 201.195 365.107L17.6931 323.657C13.4338 322.694 13.4338 316.625 17.6931 315.663L201.195 274.213C203.956 273.589 205.268 270.422 203.757 268.029L103.311 108.963C100.98 105.271 105.271 100.98 108.963 103.311L268.029 203.757C270.422 205.268 273.589 203.956 274.213 201.195L315.663 17.6931Z" fill={emotionColor}/>
              <circle cx="260.594" cy="263.941" r="56.5281" fill="#F5F5F5"/>
              <circle cx="378.455" cy="263.941" r="56.5281" fill="#F5F5F5"/>
              <mask id="mask0_excited_feed" style={{maskType:"alpha"}} maskUnits="userSpaceOnUse" x="204" y="207" width="114" height="114">
                <circle cx="260.594" cy="263.941" r="56.5281" fill="#F5F5F5"/>
            </mask>
              <g mask="url(#mask0_excited_feed)">
                {eyeAnimationState === 0 ? (
                  <circle cx="210.164" cy="263.944" r="56.5314" fill="#0A0A0A"/>
                ) : (
                  <circle cx="60.4755" cy="60.4755" r="56.5314" transform="matrix(-1 0 0 1 369.41 203.4685)" fill="#0A0A0A"/>
                )}
            </g>
              <mask id="mask1_excited_feed" style={{maskType:"alpha"}} maskUnits="userSpaceOnUse" x="321" y="207" width="114" height="114">
                <circle cx="378.455" cy="263.941" r="56.5281" fill="#F5F5F5"/>
            </mask>
              <g mask="url(#mask1_excited_feed)">
                {eyeAnimationState === 0 ? (
                  <circle cx="328.025" cy="263.944" r="56.5314" fill="#0A0A0A"/>
                ) : (
                  <circle cx="60.4755" cy="60.4755" r="56.5314" transform="matrix(-1 0 0 1 491.188 203.4685)" fill="#0A0A0A"/>
                )}
            </g>
              {eyeAnimationState === 0 ? (
                <>
                  <path d="M282.977 274.6165C282.977 278.4115 281.364 282.5713 278.493 285.4425C275.622 288.3137 271.728 289.9268 267.667 289.9268C263.607 289.9268 259.712 288.3137 256.841 285.4425C253.9699 282.5713 252.3569 278.6771 252.3569 274.6165L267.667 274.6165H282.977Z" fill="#F5F5F5"/>
                  <path d="M400.839 274.6165C400.839 278.4115 399.227 282.5713 396.356 285.4425C393.485 288.3137 389.591 289.9268 385.53 289.9268C381.47 289.9268 377.575 288.3137 374.704 285.4425C371.833 282.5713 370.22 278.6771 370.22 274.6165L385.53 274.6165H400.839Z" fill="#F5F5F5"/>
                </>
              ) : (
                <>
                  <path d="M236.122 274.6165C236.122 278.4115 237.7352 282.5713 240.6064 285.4425C243.4776 288.3137 247.3718 289.9268 251.4324 289.9268C255.493 289.9268 259.387 288.3137 262.258 285.4425C265.13 282.5713 266.743 278.6771 266.743 274.6165L251.4324 274.6165H236.122Z" fill="#F5F5F5"/>
                  <path d="M357.899 274.6165C357.899 278.4115 359.5122 282.5713 362.3834 285.4425C365.2546 288.3137 369.1488 289.9268 373.2094 289.9268C377.27 289.9268 381.1642 288.3137 384.0354 285.4425C386.9066 282.5713 388.5196 278.6771 388.5196 274.6165L373.2094 274.6165H357.899Z" fill="#F5F5F5"/>
                </>
              )}
              <mask id="path-10-inside-1_excited_feed" fill="white">
                <path d="M331.686 313.371C326.698 328.308 314.998 337.86 305.554 334.707C296.11 331.553 292.497 316.887 297.485 301.95L297.485 301.948L331.686 313.369L331.686 313.371Z"/>
              </mask>
              <path d="M331.686 313.371C326.698 328.308 314.998 337.86 305.554 334.707C296.11 331.553 292.497 316.887 297.485 301.95L297.485 301.948L331.686 313.369L331.686 313.371Z" fill="#0A0A0A"/>
              <path d="M331.686 313.371L333.629 314.02L333.629 314.02L331.686 313.371ZM305.554 334.707L304.905 336.65L304.905 336.65L305.554 334.707ZM297.485 301.95L295.542 301.301L295.542 301.301L297.485 301.95ZM297.485 301.948L298.134 300.005L296.191 299.356L295.542 301.299L297.485 301.948ZM331.686 313.369L333.63 314.018L334.278 312.075L332.335 311.426L331.686 313.369ZM331.686 313.371L329.743 312.722C327.352 319.88 323.38 325.656 318.995 329.236C314.587 332.836 310.024 334.04 306.203 332.764L305.554 334.707L304.905 336.65C310.528 338.528 316.537 336.532 321.587 332.41C326.659 328.268 331.031 321.798 333.629 314.02L331.686 313.371ZM305.554 334.707L306.203 332.764C302.382 331.488 299.458 327.784 298.096 322.257C296.742 316.761 297.037 309.757 299.428 302.599L297.485 301.95L295.542 301.301C292.944 309.08 292.551 316.878 294.118 323.237C295.677 329.567 299.282 334.772 304.905 336.65L305.554 334.707ZM297.485 301.95L299.428 302.599L299.429 302.597L297.485 301.948L295.542 301.299L295.542 301.301L297.485 301.95ZM297.485 301.948L296.836 303.891L331.038 315.312L331.686 313.369L332.335 311.426L298.134 300.005L297.485 301.948ZM331.686 313.369L329.743 312.72L329.743 312.722L331.686 313.371L333.629 314.02L333.63 314.018L331.686 313.369Z" fill="black" mask="url(#path-10-inside-1_excited_feed)"/>
          </svg>
          </View>
        </View>
      );
    }

    // 놀람 캐릭터 (전체 SVG)
    if (emotion === '놀람') {
      return (
        <View style={styles.surpriseEmotionCharacterContainer}>
          {/* 놀람 캐릭터 SVG 전체 */}
          <View style={styles.surpriseCharacterWrapper}>
            <svg xmlns="http://www.w3.org/2000/svg" width="919" height="927" viewBox="0 0 919 927" fill="none" style={{ width: '100%', height: '100%' }}>
              <g clipPath="url(#clip0_1373_1361_surprise_feed)">
                <path d="M356.24 212.801C388.742 112.771 530.258 112.771 562.76 212.801C577.295 257.536 618.983 287.824 666.02 287.824C771.198 287.824 814.929 422.414 729.838 484.236C691.784 511.883 675.861 560.89 690.396 605.625C722.898 705.655 608.409 788.836 523.318 727.014C485.264 699.367 433.736 699.367 395.682 727.014C310.591 788.836 196.102 705.655 228.604 605.625C243.139 560.89 227.216 511.883 189.162 484.236C104.071 422.414 147.802 287.824 252.98 287.824C300.017 287.824 341.705 257.536 356.24 212.801Z" fill="#F99841"/>
                <mask id="path-2-inside-1_surprise_feed" fill="white">
                  <path d="M459.853 419.084C455.762 403.817 460.271 389.344 469.923 386.758C479.576 384.171 490.717 394.451 494.807 409.718L494.808 409.719L459.853 419.085L459.853 419.084Z"/>
                </mask>
                <path d="M459.853 419.084C455.762 403.817 460.271 389.344 469.923 386.758C479.576 384.171 490.717 394.451 494.807 409.718L494.808 409.719L459.853 419.085L459.853 419.084Z" fill="#0A0A0A"/>
                <path d="M469.923 386.758L469.035 383.444L469.035 383.444L469.923 386.758ZM494.808 409.719L495.695 413.032L499.009 412.144L498.121 408.831L494.808 409.719ZM459.853 419.085L456.54 419.973L457.427 423.286L460.741 422.398L459.853 419.085ZM459.853 419.084L463.167 418.196C461.263 411.092 461.409 404.326 463.01 399.186C464.626 393.997 467.521 390.953 470.811 390.071L469.923 386.758L469.035 383.444C462.673 385.149 458.488 390.635 456.459 397.146C454.416 403.705 454.352 411.81 456.539 419.972L459.853 419.084ZM469.923 386.758L470.811 390.071C474.101 389.19 478.13 390.379 482.125 394.064C486.081 397.715 489.59 403.501 491.494 410.606L494.807 409.718L498.121 408.83C495.934 400.668 491.827 393.681 486.777 389.022C481.765 384.397 475.398 381.739 469.035 383.444L469.923 386.758ZM494.807 409.718L491.494 410.606L491.494 410.607L494.808 409.719L498.121 408.831L498.121 408.83L494.807 409.718ZM494.808 409.719L493.92 406.405L458.965 415.771L459.853 419.085L460.741 422.398L495.695 413.032L494.808 409.719ZM459.853 419.085L463.167 418.197L463.167 418.196L459.853 419.084L456.539 419.972L456.54 419.973L459.853 419.085Z" fill="black" mask="url(#path-2-inside-1_surprise_feed)"/>
                <circle cx="55.9859" cy="55.9859" r="55.9859" transform="matrix(-1 0 0 1 585.338 295.333)" fill="#F5F5F5"/>
                <circle cx="55.9859" cy="55.9859" r="55.9859" transform="matrix(-1 0 0 1 468.607 295.332)" fill="#F5F5F5"/>
                <mask id="mask0_1373_1361_surprise_feed" style={{maskType:"alpha"}} maskUnits="userSpaceOnUse" x="473" y="295" width="113" height="113">
                  <circle cx="55.9859" cy="55.9859" r="55.9859" transform="matrix(-1 0 0 1 585.338 295.332)" fill="#F5F5F5"/>
                </mask>
                <g mask="url(#mask0_1373_1361_surprise_feed)">
                  {eyeAnimationState === 0 ? (
                    <circle cx="55.9891" cy="55.9891" r="55.9891" transform="matrix(-1 0 0 1 632.03 295.332)" fill="#0A0A0A"/>
                  ) : (
                    <circle cx="55.9891" cy="55.9891" r="55.9891" transform="matrix(-1 0 0 1 585.338 295.332)" fill="#0A0A0A"/>
                  )}
                </g>
                <mask id="mask1_1373_1361_surprise_feed" style={{maskType:"alpha"}} maskUnits="userSpaceOnUse" x="356" y="295" width="113" height="113">
                  <circle cx="55.9859" cy="55.9859" r="55.9859" transform="matrix(-1 0 0 1 468.607 295.332)" fill="#F5F5F5"/>
                </mask>
                <g mask="url(#mask1_1373_1361_surprise_feed)">
                  {eyeAnimationState === 0 ? (
                    <circle cx="55.9891" cy="55.9891" r="55.9891" transform="matrix(-1 0 0 1 515.3 295.332)" fill="#0A0A0A"/>
                  ) : (
                    <circle cx="55.9891" cy="55.9891" r="55.9891" transform="matrix(-1 0 0 1 468.607 295.332)" fill="#0A0A0A"/>
                  )}
                </g>
                <path d="M508.63 361.202C508.63 364.961 510.123 368.566 512.781 371.225C515.439 373.883 519.045 375.376 522.804 375.376C526.563 375.376 530.169 373.883 532.827 371.225C535.485 368.566 536.979 364.961 536.979 361.202L522.804 361.202H508.63Z" fill="#F5F5F5"/>
                <path d="M391.898 361.202C391.898 364.961 393.392 368.566 396.05 371.225C398.708 373.883 402.313 375.376 406.073 375.376C409.832 375.376 413.437 373.883 416.095 371.225C418.754 368.566 420.247 364.961 420.247 361.202L406.073 361.202H391.898Z" fill="#F5F5F5"/>
              </g>
              <defs>
                <clipPath id="clip0_1373_1361_surprise_feed">
                  <rect width="919" height="927" fill="white"/>
                </clipPath>
              </defs>
            </svg>
          </View>
        </View>
      );
    }

    // 기본 캐릭터 (다른 감정들)
    return (
      <View style={styles.emotionCharacterContainer}>
        <View style={[styles.characterCircleBackground, { backgroundColor: emotionColor }]} />
        {/* 큰 캐릭터 전용 SVG */}
        <View style={styles.characterWrapper}>
          <View style={styles.characterEyesContainer}>
            {eyeAnimationState === 0 ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="337" height="138" viewBox="0 0 337 138" fill="none">
                <circle cx="105.472" cy="69.472" r="60.4719" fill="#F5F5F5"/>
                <circle cx="231.556" cy="69.472" r="60.4719" fill="#F5F5F5"/>
                <mask id="mask0_396_61_default" style={{maskType:"alpha"}} maskUnits="userSpaceOnUse" x="45" y="9" width="121" height="121">
                  <circle cx="105.472" cy="69.4719" r="60.4719" fill="#F5F5F5"/>
                </mask>
                <g mask="url(#mask0_396_61_default)">
                  <circle cx="55.0428" cy="69.4754" r="60.4755" fill="#0A0A0A"/>
                </g>
                <mask id="mask1_396_61_default" style={{maskType:"alpha"}} maskUnits="userSpaceOnUse" x="171" y="9" width="122" height="121">
                  <circle cx="231.557" cy="69.4719" r="60.4719" fill="#F5F5F5"/>
                </mask>
                <g mask="url(#mask1_396_61_default)">
                  <circle cx="181.126" cy="69.4754" r="60.4755" fill="#0A0A0A"/>
                </g>
                <path d="M127.855 80.1475C127.855 84.208 126.242 88.1023 123.371 90.9735C120.5 93.8447 116.606 95.4578 112.545 95.4578C108.485 95.4578 104.59 93.8447 101.719 90.9735C98.8479 88.1023 97.2349 84.2081 97.2349 80.1475L112.545 80.1475H127.855Z" fill="#F5F5F5"/>
                <path d="M253.94 80.1475C253.94 84.208 252.327 88.1023 249.456 90.9735C246.585 93.8447 242.691 95.4578 238.63 95.4578C234.57 95.4578 230.675 93.8447 227.804 90.9735C224.933 88.1023 223.32 84.2081 223.32 80.1475L238.63 80.1475H253.94Z" fill="#F5F5F5"/>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="337" height="138" viewBox="0 0 337 138" fill="none">
                <circle cx="105.472" cy="69.472" r="60.4719" fill="#F5F5F5"/>
                <circle cx="231.556" cy="69.472" r="60.4719" fill="#F5F5F5"/>
                <mask id="mask0_396_110_default" style={{maskType:"alpha"}} maskUnits="userSpaceOnUse" x="45" y="9" width="121" height="121">
                  <circle cx="105.472" cy="69.4719" r="60.4719" fill="#F5F5F5"/>
          </mask>
                <g mask="url(#mask0_396_110_default)">
                  <circle cx="60.4755" cy="60.4755" r="60.4755" transform="matrix(-1 0 0 1 214.288 9)" fill="#0A0A0A"/>
          </g>
                <mask id="mask1_396_110_default" style={{maskType:"alpha"}} maskUnits="userSpaceOnUse" x="171" y="9" width="122" height="121">
                  <circle cx="231.557" cy="69.4719" r="60.4719" fill="#F5F5F5"/>
          </mask>
                <g mask="url(#mask1_396_110_default)">
                  <circle cx="60.4755" cy="60.4755" r="60.4755" transform="matrix(-1 0 0 1 344.289 9)" fill="#0A0A0A"/>
          </g>
                <path d="M81.0001 80.1475C81.0001 84.208 82.6132 88.1023 85.4844 90.9735C88.3556 93.8447 92.2498 95.4578 96.3104 95.4578C100.371 95.4578 104.265 93.8447 107.136 90.9735C110.008 88.1023 111.621 84.2081 111.621 80.1475L96.3104 80.1475H81.0001Z" fill="#F5F5F5"/>
                <path d="M211 80.1475C211 84.208 212.613 88.1023 215.484 90.9735C218.356 93.8447 222.25 95.4578 226.31 95.4578C230.371 95.4578 234.265 93.8447 237.136 90.9735C240.008 88.1023 241.621 84.2081 241.621 80.1475L226.31 80.1475H211Z" fill="#F5F5F5"/>
              </svg>
            )}
          </View>
          {/* 입 */}
          <View style={styles.characterMouthContainer}>
            <svg xmlns="http://www.w3.org/2000/svg" width="42" height="23" viewBox="0 0 42 23" fill="none">
              <path 
                d="M4.50293 4.50299C4.50293 22.515 36.9246 23.4156 36.9246 4.50299" 
                stroke="#0A0A0A" 
                strokeWidth="9.00602" 
                strokeLinecap="round"
              />
        </svg>
          </View>
        </View>
      </View>
    );
  };

  // 현재 기록이 내 기록인지 확인
  const isMyRecording = useMemo(() => {
    if (!currentRecording || !currentUserId) return false;
    return currentRecording.user_id === currentUserId;
  }, [currentRecording, currentUserId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
        <View style={styles.frame} />
        <Header currentScreen="Feed" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>로딩 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!currentRecording) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
        <View style={styles.frame} />
        <Header currentScreen="Feed" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>업로드된 기록이 없습니다.</Text>
        </View>
        <NavigationBar 
          onNavigateToRecords={() => navigation.navigate('Records')} 
          onNavigateToRecording={() => navigation.navigate('Recording')} 
          onNavigateToProfile={() => navigation.navigate('Profile')}
          onNavigateToFeed={() => navigation.navigate('Feed')}
          onNavigateToArchive={() => navigation.navigate('Archive')}
          currentPage="Feed"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* 배경 프레임 */}
      <View style={styles.frame} />

      {/* 상단 헤더 */}
      <Header currentScreen="Feed" />

      {/* 오버레이 배경 - 화면 전체 덮기 (SVG와 텍스트 포함) */}
      <OverlayBackground 
        visible={overlayState < 2} 
        overlayState={overlayState}
        onPress={() => {
          if (overlayState === 0) {
            setOverlayState(1);
          } else if (overlayState === 1) {
            setOverlayState(2);
          }
        }}
      />

      {/* 메인 콘텐츠 영역 */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        snapToInterval={844}
        snapToAlignment="start"
        decelerationRate="fast"
        scrollEnabled={true}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* 첫 번째 화면: 캐릭터 화면 */}
        <View 
          style={styles.topScreen}
          onTouchStart={handleTouchStart}
        >
          {/* 상단 제목 */}
      <View style={styles.titleContainer}>
            <Text style={styles.dateText}>{formatDate(currentRecording.recorded_at)}</Text>
            <Text style={styles.subtitleText}>
              {isMyRecording ? '내가 올린 기록' : '친구들의 기록'}
            </Text>
          </View>

          {/* 사용자 정보 영역 - 이름과 버튼 */}
          <View style={styles.topUserInfoContainer}>
            <View style={styles.userInfoLeft}>
              <View style={styles.userProfileImage}>
                <Text style={styles.userProfileText}>
                  {currentRecording.user_name?.charAt(0) || 'U'}
                </Text>
              </View>
              <Text style={styles.userName}>{currentRecording.user_name || ''}</Text>
            </View>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => {
                if (isMyRecording) {
                  setShowDeleteModal(true);
                } else {
                  // 방문하기 기능은 나중에 추가
                }
              }}
            >
              <Text style={styles.actionButtonText}>
                {isMyRecording ? '삭제하기' : '방문하기'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* 감정별 캐릭터 표시 */}
          {renderCharacter()}
          
      </View>

        {/* 두 번째 화면: 상세 정보 화면 */}
        <View style={styles.bottomScreen}>
          {/* 바텀 스크린 헤더 */}
          <Header currentScreen="Feed" />
          
          {/* 사용자 정보 영역 - 이름과 버튼 */}
      <View style={styles.userInfoContainer}>
        <View style={styles.userInfoLeft}>
          <View style={styles.userProfileImage}>
                <Text style={styles.userProfileText}>
                  {currentRecording.user_name?.charAt(0) || 'U'}
                </Text>
          </View>
              <Text style={styles.userName}>{currentRecording.user_name || ''}</Text>
        </View>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => {
                if (isMyRecording) {
                  setShowDeleteModal(true);
                } else {
                  // 방문하기 기능은 나중에 추가
                }
              }}
            >
              <Text style={styles.actionButtonText}>
                {isMyRecording ? '삭제하기' : '방문하기'}
              </Text>
        </TouchableOpacity>
      </View>

          {/* 감정과 키워드 */}
          <View style={styles.contentContainer}>
            <View style={styles.contentTextContainer}>
              <Text style={styles.normalText}>오늘은 </Text>
              <View style={[styles.emotionTagInline, { backgroundColor: getEmotionColor(currentRecording.emotion) }]}>
                <Text style={styles.emotionTextInline}>{currentRecording.emotion}</Text>
              </View>
            </View>
            {/* 키워드만 표시 (최대 2개) */}
            {currentRecording.keywords && currentRecording.keywords.length > 0 && (
              <View style={styles.keywordsContainer}>
                {currentRecording.keywords.slice(0, 2).map((keyword, index) => (
                  <View 
                    key={index} 
                    style={[styles.keywordTagInline, { backgroundColor: getEmotionColor(currentRecording.emotion) }]}
                  >
                    <Text style={styles.keywordTextInline}>{keyword}</Text>
                  </View>
                ))}
              </View>
            )}
            {/* 위치 정보 표시 */}
            {currentRecording.district && (
              <View style={styles.locationContainer}>
                <View style={[styles.locationTag, { backgroundColor: getEmotionColor(currentRecording.emotion) }]}>
                  <Text style={styles.locationText}>{currentRecording.district}</Text>
                </View>
                <Text style={styles.normalText}>에서</Text>
              </View>
            )}
      </View>

          {/* 하단 버튼 영역 */}
          <View style={styles.buttonContainer}>
            {/* 하이라이트 재생 버튼 */}
            <TouchableOpacity
              style={styles.highlightPlayButton}
              onPress={() => {
                if (isPlaying && audioRef.current) {
                  stopAudio();
                } else {
                  const highlightTime = parseHighlightTime(currentRecording.highlight_time);
                  playAudio(highlightTime);
                }
              }}
            >
              <Svg width="60" height="60" viewBox="0 0 60 60" fill="none">
                <Circle cx="30" cy="30" r="30" transform="matrix(-1 0 0 1 60 0)" fill="#B780FF"/>
                <Path d="M31.4261 18.3906C30.9771 17.0086 29.022 17.0086 28.5729 18.3906L26.7441 24.0193C26.5432 24.6373 25.9673 25.0557 25.3175 25.0557H19.3991C17.946 25.0557 17.3419 26.9152 18.5175 27.7693L23.3055 31.248C23.8312 31.6299 24.0512 32.307 23.8504 32.925L22.0215 38.5537C21.5725 39.9357 23.1542 41.0848 24.3298 40.2307L29.1178 36.752C29.6436 36.3701 30.3555 36.3701 30.8812 36.752L35.6692 40.2307C36.8448 41.0849 38.4265 39.9357 37.9775 38.5537L36.1486 32.925C35.9478 32.307 36.1678 31.6299 36.6935 31.248L41.4816 27.7693C42.6571 26.9151 42.053 25.0557 40.5999 25.0557H34.6815C34.0317 25.0557 33.4558 24.6373 33.255 24.0193L31.4261 18.3906Z" fill="#0A0A0A"/>
              </Svg>
            </TouchableOpacity>

            {/* 전체 재생 버튼 */}
            <TouchableOpacity
              style={styles.fullPlayButton}
              onPress={() => {
                if (isPlaying) {
                  stopAudio();
                } else {
                  playAudio();
                }
              }}
            >
              <Svg width="60" height="60" viewBox="84 0 60 60" fill="none">
                <Circle cx="114" cy="30" r="30" fill="#B780FF"/>
                <Path d="M125.532 28.5831C127.484 29.5984 127.492 30.8757 125.532 32.0236L110.394 41.5527C108.492 42.5001 107.2 41.9407 107.064 39.8907L107 19.9464C106.957 18.0581 108.624 17.5245 110.212 18.4299L125.532 28.5831Z" fill="#0A0A0A"/>
              </Svg>
            </TouchableOpacity>
      </View>
        </View>
      </ScrollView>

      {/* 하단 네비게이션 바 */}
      <NavigationBar 
        onNavigateToRecords={() => navigation.navigate('Records')} 
        onNavigateToRecording={() => navigation.navigate('Recording')} 
        onNavigateToProfile={() => navigation.navigate('Profile')}
        onNavigateToFeed={() => navigation.navigate('Feed')}
        currentPage="Feed"
      />

      {/* 삭제 확인 모달 */}
      <DeleteConfirmModal
        visible={showDeleteModal}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
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
    overflow: 'visible', // 헤더가 잘리지 않도록
  },
  frame: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 390,
    height: 844,
    backgroundColor: '#0A0A0A',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    // 두 화면이 정확히 이어지도록 (844 + 844 = 1688px)
  },
  topScreen: {
    width: '100%',
    height: 844, // 첫 번째 화면 높이
    position: 'relative',
  },
  topUserInfoContainer: {
    position: 'absolute',
    left: 24,
    top: 222,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  bottomScreen: {
    width: '100%',
    height: 844, // 두 번째 화면 높이
    position: 'relative',
    backgroundColor: '#0A0A0A',
    overflow: 'hidden',
    justifyContent: 'flex-start',
    paddingTop: 118, // 헤더 아래부터 시작
  },
  titleContainer: {
    position: 'absolute',
    left: 24,
    top: 118,
    zIndex: 10,
  },
  dateText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 0.64,
    marginBottom: 4,
    fontFamily: Platform.OS === 'web' ? 'Pretendard' : undefined,
  },
  subtitleText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 0.64,
    fontFamily: Platform.OS === 'web' ? 'Pretendard' : undefined,
  },
  userInfoContainer: {
    paddingHorizontal: 24,
    paddingTop: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userProfileImage: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#C4C4C4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  userProfileText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
  userName: {
    color: '#F5F5F5',
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 0.4,
    textAlign: 'center',
    flex: 1,
    marginRight: 157,
    fontFamily: Platform.OS === 'web' ? 'Pretendard' : undefined,
  },
  actionButton: {
    backgroundColor: '#B780FF',
    borderRadius: 50,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  actionButtonText: {
    color: '#0B0B0C',
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 30,
    maxHeight: 500,
  },
  contentTextContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  keywordsContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginTop: 10,
    gap: 8,
  },
  locationContainer: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationTag: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginRight: 8,
  },
  locationText: {
    color: '#000000',
    fontSize: 40,
    fontWeight: '600',
    letterSpacing: 1.6,
    fontFamily: Platform.OS === 'web' ? 'Pretendard' : undefined,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 132,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  highlightPlayButton: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullPlayButton: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emotionCharacterContainer: {
    position: 'absolute',
    left: -102,
    top: 318,
    width: 598,
    height: 598,
    overflow: 'hidden',
  },
  characterCircleBackground: {
    position: 'absolute',
    width: 598,
    height: 598,
    borderRadius: 299,
    backgroundColor: '#FED046',
    left: 0,
    top: 0,
  },
  characterWrapper: {
    position: 'absolute',
    left: 104.25,
    top: 162,
    width: 337,
    height: 138,
  },
  characterEyesContainer: {
    width: 337,
    height: 138,
    paddingTop: 9,
    paddingRight: 44.971,
    paddingBottom: 8.056,
    paddingLeft: 45,
    justifyContent: 'center',
    alignItems: 'center',
  },
  characterMouthContainer: {
    position: 'absolute',
    left: 149.22,
    top: 129.68,
    width: 42,
    height: 23,
  },
  sadEmotionCharacterContainer: {
    position: 'absolute',
    left: -1,
    top: 318,
    width: 598,
    height: 856.632,
    overflow: 'hidden',
  },
  sadCharacterBackground: {
    position: 'absolute',
    left: -1,
    top: 0,
    width: 395.049,
    height: 856.632,
    borderRadius: 24.95,
    backgroundColor: '#47AFF4',
  },
  sadCharacterWrapper: {
    position: 'absolute',
    top: 55,
    width: 393,
    height: 534,
    justifyContent: 'center',
    alignItems: 'center',
  },
  excitedEmotionCharacterContainer: {
    position: 'absolute',
    left: -188,
    top: 298,
    width: 598,
    height: 640,
    overflow: 'hidden',
  },
  excitedCharacterWrapper: {
    position: 'absolute',
    top: -10,
    left: -21,
    width: 640,
    height: 640,
    justifyContent: 'center',
    alignItems: 'center',
  },
  surpriseEmotionCharacterContainer: {
    position: 'absolute',
    left: -102,
    top: 318,
    width: 598,
    height: 598,
    overflow: 'hidden',
  },
  surpriseCharacterWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 919,
    height: 927,
    justifyContent: 'center',
    alignItems: 'center',
  },
  normalText: {
    color: '#FFFFFF',
    fontSize: 40,
    fontWeight: '600',
    letterSpacing: 1.6,
    marginHorizontal: 2,
    fontFamily: Platform.OS === 'web' ? 'Pretendard' : undefined,
  },
  emotionTagInline: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginHorizontal: 2,
    marginVertical: 2,
  },
  emotionTextInline: {
    color: '#000000',
    fontSize: 40,
    fontWeight: '600',
    letterSpacing: 1.6,
    fontFamily: Platform.OS === 'web' ? 'Pretendard' : undefined,
  },
  keywordTagInline: {
    backgroundColor: '#FFD630',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginHorizontal: 2,
    marginVertical: 2,
  },
  keywordTextInline: {
    color: '#000000',
    fontSize: 40,
    fontWeight: '600',
    letterSpacing: 1.6,
    fontFamily: Platform.OS === 'web' ? 'Pretendard' : undefined,
  },
});

export default FeedScreen;
