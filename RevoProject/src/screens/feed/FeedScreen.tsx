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
import Svg, { Path, Circle, Rect, Text as SvgText } from 'react-native-svg';
import NavigationBar from '../../components/NavigationBar';
import Header from '../../components/Header';
import DeleteConfirmModal from '../../components/DeleteConfirmModal';
import OverlayBackground from '../../components/OverlayBackground';

import { useApp } from '../../contexts/AppContext';
import { getRecordings, getRecording, deleteRecording, getUserFromStorage, Recording, getAudioUrl, likeRecording, unlikeRecording } from '../../services/api';

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
  const [likedRecordings, setLikedRecordings] = useState<Set<number>>(new Set()); // 좋아요한 기록 ID 집합
  
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

  // 업로드된 기록 로드 (최신순 정렬)
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

        // 모든 업로드된 기록 가져오기
        if (userInfo) {
          const response = await getRecordings({
            isUploaded: true,
            limit: 100, // 충분히 많이 가져오기
          });
          
          if (response.success && response.recordings.length > 0) {
            // 최신순으로 정렬 (uploaded_at 기준, 내림차순)
            const sortedRecordings = response.recordings.sort((a, b) => {
              // uploaded_at이 있으면 그것을 사용, 없으면 recorded_at 사용
              const aUploaded = a.uploaded_at 
                ? new Date(a.uploaded_at).getTime() 
                : new Date(a.recorded_at).getTime();
              const bUploaded = b.uploaded_at 
                ? new Date(b.uploaded_at).getTime() 
                : new Date(b.recorded_at).getTime();
              
              // 최신이 먼저 오도록 내림차순 정렬
              return bUploaded - aUploaded;
            });
            
            setRecordings(sortedRecordings);
            
            // route에서 recordingId가 있으면 해당 기록의 인덱스 찾기
            if (route.params?.recordingId) {
              const targetIndex = sortedRecordings.findIndex(r => r.id === route.params?.recordingId);
              if (targetIndex >= 0) {
                setCurrentRecordingIndex(targetIndex);
              } else {
                // 기록을 찾을 수 없으면 해당 기록만 가져와서 맨 앞에 추가
                const targetResponse = await getRecording(route.params.recordingId);
                if (targetResponse.success) {
                  setRecordings([targetResponse.recording, ...sortedRecordings]);
                  setCurrentRecordingIndex(0);
                } else {
                  setCurrentRecordingIndex(0);
                }
              }
            } else {
              setCurrentRecordingIndex(0);
            }
          } else if (route.params?.recordingId) {
            // 업로드된 기록이 없지만 recordingId가 있으면 해당 기록만 가져오기
            const targetResponse = await getRecording(route.params.recordingId);
            if (targetResponse.success) {
              setRecordings([targetResponse.recording]);
              setCurrentRecordingIndex(0);
            }
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

  // 좋아요 토글 핸들러
  const handleLikeToggle = async () => {
    if (!currentRecording || isMyRecording) return; // 내 기록은 좋아요 불가

    const isLiked = likedRecordings.has(currentRecording.id);
    
    try {
      let newLikes: number;
      if (isLiked) {
        // 좋아요 취소
        const response = await unlikeRecording(currentRecording.id);
        if (response.success) {
          setLikedRecordings(prev => {
            const newSet = new Set(prev);
            newSet.delete(currentRecording.id);
            return newSet;
          });
          newLikes = response.likes;
        } else {
          return;
        }
      } else {
        // 좋아요 추가
        const response = await likeRecording(currentRecording.id);
        if (response.success) {
          setLikedRecordings(prev => new Set(prev).add(currentRecording.id));
          newLikes = response.likes;
        } else {
          return;
        }
      }
      
      // 기록 목록의 좋아요 수 업데이트
      setRecordings(prev => prev.map(rec => 
        rec.id === currentRecording.id ? { ...rec, likes: newLikes } : rec
      ));
    } catch (error) {
      console.error('좋아요 토글 오류:', error);
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
        // 최신 기록(currentRecordingIndex === 0)에서는 우측으로만 이동 가능
        if (currentRecordingIndex === 0) {
          if (deltaX < 0 && recordings.length > 1) {
            // 왼쪽으로 스와이프 - 과거 기록 (인덱스 증가)
            setCurrentRecordingIndex(1);
          }
          // 오른쪽으로 스와이프는 무시 (최신 기록이므로)
        } else {
          // 일반 기록에서는 좌우 모두 이동 가능
          if (deltaX < 0 && currentRecordingIndex < recordings.length - 1) {
            // 왼쪽으로 스와이프 - 과거 기록 (인덱스 증가)
            setCurrentRecordingIndex(currentRecordingIndex + 1);
          } else if (deltaX > 0 && currentRecordingIndex > 0) {
            // 오른쪽으로 스와이프 - 최신 기록 (인덱스 감소)
            setCurrentRecordingIndex(currentRecordingIndex - 1);
          }
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
              {/* path를 원보다 먼저 배치하여 z-index 낮게 */}
              <path d="M100.777 133.678H124.919C133.755 133.678 140.919 140.842 140.919 149.678V321.6C140.919 330.437 133.755 337.6 124.919 337.6H116.777C107.94 337.6 100.777 330.437 100.777 321.6V133.678Z" fill="#F5F5F5"/>
              {/* 원들 */}
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
              {/* rect를 검은 원들 다음에 배치하여 가장 높은 z-index */}
              <rect x="254.921" y="144.918" width="32.9243" height="95.7798" rx="16.4621" fill="#F5F5F5"/>
              <path d="M211.568 174.927C211.568 158.87 182.666 158.067 182.666 174.927" stroke="#0A0A0A" strokeWidth="8.02842" strokeLinecap="round"/>
              <path d="M153.88 120.03C153.88 123.65 152.44 127.121 149.88 129.681C147.32 132.241 143.83 133.678 140.23 133.678C136.61 133.678 133.14 132.241 130.58 129.681C128.02 127.121 126.58 123.65 126.58 120.03L140.23 120.03H153.88Z" fill="#F5F5F5"/>
              <path d="M266.28 120.03C266.28 123.65 264.84 127.121 262.28 129.681C259.72 132.24 256.25 133.678 252.63 133.678C249.01 133.678 245.54 132.24 242.98 129.681C240.42 127.121 238.98 123.65 238.98 120.03L252.63 120.03H266.28Z" fill="#F5F5F5"/>
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
            <svg xmlns="http://www.w3.org/2000/svg" width="711" height="676" viewBox="104 112 711 676" fill="none">
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
                    <circle cx="55.9891" cy="55.9891" r="55.9891" transform="matrix(-1 0 0 1 538.646 295.332)" fill="#0A0A0A"/>
                  )}
                </g>
                <mask id="mask1_1373_1361_surprise_feed" style={{maskType:"alpha"}} maskUnits="userSpaceOnUse" x="356" y="295" width="113" height="113">
                  <circle cx="55.9859" cy="55.9859" r="55.9859" transform="matrix(-1 0 0 1 468.607 295.332)" fill="#F5F5F5"/>
                </mask>
                <g mask="url(#mask1_1373_1361_surprise_feed)">
                  {eyeAnimationState === 0 ? (
                    <circle cx="55.9891" cy="55.9891" r="55.9891" transform="matrix(-1 0 0 1 515.3 295.332)" fill="#0A0A0A"/>
                  ) : (
                    <circle cx="55.9891" cy="55.9891" r="55.9891" transform="matrix(-1 0 0 1 421.914 295.332)" fill="#0A0A0A"/>
                  )}
                </g>
                <path d="M515.629 361.202C515.629 364.961 517.123 368.566 519.781 371.225C522.439 373.883 526.045 375.376 529.804 375.376C533.563 375.376 537.169 373.883 539.827 371.225C542.485 368.566 543.978 364.961 543.978 361.202L529.804 361.202H515.629Z" fill="#F5F5F5"/>
                <path d="M425.247 361.202C425.247 364.961 423.753 368.566 421.095 371.225C418.437 373.883 414.832 375.376 411.072 375.376C407.313 375.376 403.708 373.883 401.050 371.225C398.392 368.566 396.898 364.961 396.898 361.202L411.072 361.202H425.247Z" fill="#F5F5F5"/>
              </g>
              <defs>
                <clipPath id="clip0_1373_1361_surprise_feed">
                  <rect x="104" y="112" width="711" height="676" fill="white"/>
                </clipPath>
              </defs>
            </svg>
          </View>
        </View>
      );
    }

    // 보통 캐릭터
    if (emotion === '보통') {
      return (
        <View style={styles.normalEmotionCharacterContainer}>
          <View style={styles.normalCharacterWrapper}>
            <svg xmlns="http://www.w3.org/2000/svg" width="632" height="632" viewBox="0 0 632 632" fill="none">
              <path d="M295.13 15.1627C307.575 6.12142 324.425 6.12142 336.87 15.1627L595.664 203.188C608.108 212.229 613.316 228.255 608.562 242.884L509.712 547.116C504.958 561.745 491.326 571.649 475.944 571.649H156.056C140.674 571.649 127.042 561.745 122.288 547.116L23.4377 242.884C18.6844 228.255 23.8916 212.229 36.3358 203.188L295.13 15.1627Z" fill={emotionColor}/>
              <line x1="301.071" y1="319.318" x2="330.929" y2="319.318" stroke="#0A0A0A" strokeWidth="8.29396" strokeLinecap="round"/>
              <circle cx="55.7063" cy="55.7063" r="55.7063" transform="matrix(-1 0 0 1 429.988 177.291)" fill="#F5F5F5"/>
              <circle cx="55.7063" cy="55.7063" r="55.7063" transform="matrix(-1 0 0 1 313.84 177.291)" fill="#F5F5F5"/>
              <mask id="mask0_1373_1493_feed" style={{maskType:"alpha"}} maskUnits="userSpaceOnUse" x="318" y="177" width="112" height="112">
                <circle cx="55.7063" cy="55.7063" r="55.7063" transform="matrix(-1 0 0 1 429.988 177.291)" fill="#F5F5F5"/>
              </mask>
              <g mask="url(#mask0_1373_1493_feed)">
                {eyeAnimationState === 0 ? (
                  <circle cx="55.7095" cy="55.7095" r="55.7095" transform="matrix(-1 0 0 1 476.447 177.291)" fill="#0A0A0A"/>
                ) : (
                  <circle cx="55.7095" cy="55.7095" r="55.7095" transform="matrix(-1 0 0 1 383.529 177.291)" fill="#0A0A0A"/>
                )}
              </g>
              <mask id="mask1_1373_1493_feed" style={{maskType:"alpha"}} maskUnits="userSpaceOnUse" x="202" y="177" width="112" height="112">
                <circle cx="55.7063" cy="55.7063" r="55.7063" transform="matrix(-1 0 0 1 313.84 177.291)" fill="#F5F5F5"/>
              </mask>
              <g mask="url(#mask1_1373_1493_feed)">
                {eyeAnimationState === 0 ? (
                  <circle cx="55.7095" cy="55.7095" r="55.7095" transform="matrix(-1 0 0 1 360.299 177.291)" fill="#0A0A0A"/>
                ) : (
                  <circle cx="55.7095" cy="55.7095" r="55.7095" transform="matrix(-1 0 0 1 267.381 177.291)" fill="#0A0A0A"/>
                )}
              </g>
              <path d="M360.663 242.831C360.663 246.572 362.149 250.159 364.794 252.804C367.439 255.449 371.026 256.935 374.766 256.935C378.507 256.935 382.094 255.449 384.739 252.804C387.384 250.159 388.87 246.572 388.87 242.831L374.766 242.831H360.663Z" fill="#F5F5F5"/>
              <path d="M244.514 242.831C244.514 246.572 246 250.159 248.645 252.804C251.29 255.449 254.877 256.935 258.618 256.935C262.358 256.935 265.945 255.449 268.59 252.804C271.235 250.159 272.721 246.572 272.721 242.831L258.618 242.831H244.514Z" fill="#F5F5F5"/>
            </svg>
          </View>
        </View>
      );
    }

    // 화남 캐릭터
    if (emotion === '화남') {
      return (
        <View style={styles.angryEmotionCharacterContainer}>
          <View style={styles.angryCharacterWrapper}>
            <svg xmlns="http://www.w3.org/2000/svg" width="791" height="557" viewBox="0 0 791 557" fill="none">
              <path d="M419.629 535.046C412.208 545.738 396.689 546.544 388.2 536.679L24.6902 114.256C14.2364 102.108 21.6991 83.2169 37.633 81.4933L747.652 4.68908C764.609 2.85486 775.864 21.8074 766.139 35.8185L419.629 535.046Z" fill={emotionColor}/>
              <path d="M412.686 268.128C412.686 248.933 378.136 247.973 378.136 268.128" stroke="#0A0A0A" strokeWidth="9.59736" strokeLinecap="round"/>
              <g clipPath="url(#clip0_1373_1507_angry_feed)">
                {eyeAnimationState === 0 ? (
                  // 기본 눈 (큰 눈)
                  <>
                    <path d="M396.885 188.442C396.885 196.905 395.218 205.285 391.98 213.104C388.741 220.922 383.994 228.026 378.01 234.01C372.026 239.994 364.922 244.741 357.104 247.98C349.285 251.218 340.905 252.885 332.442 252.885C323.98 252.885 315.6 251.218 307.781 247.98C299.963 244.741 292.859 239.994 286.875 234.01C280.891 228.026 276.144 220.922 272.905 213.104C269.667 205.285 268 196.905 268 188.442L332.442 188.442H396.885Z" fill="#F5F5F5"/>
                    <path d="M525.488 188.442C525.488 196.905 523.822 205.285 520.583 213.104C517.345 220.922 512.598 228.026 506.614 234.01C500.63 239.994 493.526 244.741 485.707 247.98C477.889 251.218 469.509 252.885 461.046 252.885C452.583 252.885 444.203 251.218 436.385 247.98C428.566 244.741 421.462 239.994 415.478 234.01C409.494 228.026 404.747 220.922 401.509 213.104C398.27 205.285 396.604 196.905 396.604 188.442L461.046 188.442H525.488Z" fill="#F5F5F5"/>
                    <path d="M372.622 189.025C372.622 194.318 371.579 199.56 369.553 204.45C367.528 209.341 364.559 213.784 360.815 217.527C357.072 221.27 352.629 224.24 347.738 226.265C342.848 228.291 337.606 229.334 332.313 229.334C327.019 229.334 321.778 228.291 316.887 226.265C311.997 224.24 307.553 221.27 303.81 217.527C300.067 213.784 297.098 209.341 295.072 204.45C293.047 199.56 292.004 194.318 292.004 189.025L332.313 189.025H372.622Z" fill="#0A0A0A"/>
                    <path d="M500.945 189.025C500.945 194.318 499.903 199.56 497.877 204.45C495.851 209.341 492.882 213.784 489.139 217.527C485.396 221.27 480.953 224.24 476.062 226.265C471.172 228.291 465.93 229.334 460.637 229.334C455.343 229.334 450.101 228.291 445.211 226.265C440.32 224.24 435.877 221.27 432.134 217.527C428.391 213.784 425.422 209.341 423.396 204.45C421.37 199.56 420.328 194.318 420.328 189.025L460.637 189.025H500.945Z" fill="#0A0A0A"/>
                    <path d="M308.308 203.658C308.308 207.985 306.589 212.135 303.53 215.195C300.47 218.254 296.32 219.973 291.993 219.973C287.666 219.973 283.516 218.254 280.456 215.195C277.396 212.135 275.677 207.985 275.677 203.658L291.993 203.658H308.308Z" fill="#F5F5F5"/>
                    <path d="M442.671 203.658C442.671 207.985 440.952 212.135 437.892 215.195C434.833 218.254 430.683 219.973 426.356 219.973C422.028 219.973 417.878 218.254 414.819 215.195C411.759 212.135 410.04 207.985 410.04 203.658L426.356 203.658H442.671Z" fill="#F5F5F5"/>
                  </>
                ) : (
                  // 깜빡이는 눈 (작은 눈)
                  <>
                    <path d="M140.885 19.4425C140.885 27.9052 139.218 36.285 135.98 44.1035C132.741 51.9221 127.994 59.0261 122.01 65.0102C116.026 70.9942 108.922 75.741 101.104 78.9795C93.285 82.2181 84.9052 83.8849 76.4425 83.8849C67.9798 83.8849 59.5999 82.2181 51.7814 78.9795C43.9629 75.741 36.8588 70.9942 30.8748 65.0102C24.8907 59.0261 20.1439 51.9221 16.9054 44.1035C13.6669 36.285 12 27.9052 12 19.4425L76.4425 19.4425H140.885Z" fill="#F5F5F5" transform="translate(256 169)"/>
                    <path d="M269.489 19.4425C269.489 27.9052 267.822 36.285 264.583 44.1035C261.345 51.9221 256.598 59.0261 250.614 65.0102C244.63 70.9942 237.526 75.741 229.707 78.9795C221.889 82.2181 213.509 83.8849 205.046 83.8849C196.584 83.8849 188.204 82.2181 180.385 78.9795C172.567 75.741 165.463 70.9942 159.479 65.0102C153.494 59.0261 148.748 51.9221 145.509 44.1035C142.271 36.285 140.604 27.9052 140.604 19.4425L205.046 19.4425H269.489Z" fill="#F5F5F5" transform="translate(256 169)"/>
                    <path d="M138.944 20.0247C138.944 25.3182 137.902 30.5598 135.876 35.4503C133.85 40.3408 130.881 44.7844 127.138 48.5274C123.395 52.2704 118.951 55.2396 114.061 57.2653C109.17 59.291 103.929 60.3336 98.6353 60.3336C93.3419 60.3336 88.1003 59.291 83.2098 57.2653C78.3193 55.2396 73.8756 52.2704 70.1326 48.5274C66.3896 44.7844 63.4205 40.3408 61.3947 35.4503C59.369 30.5598 58.3264 25.3182 58.3264 20.0247L98.6353 20.0247H138.944Z" fill="#0A0A0A" transform="translate(256 169)"/>
                    <path d="M266.905 20.0247C266.905 25.3182 265.863 30.5598 263.837 35.4503C261.811 40.3408 258.842 44.7844 255.099 48.5274C251.356 52.2704 246.913 55.2396 242.022 57.2653C237.132 59.291 231.89 60.3336 226.596 60.3336C221.303 60.3336 216.061 59.291 211.171 57.2653C206.28 55.2396 201.837 52.2704 198.094 48.5274C194.351 44.7844 191.382 40.3408 189.356 35.4503C187.33 30.5598 186.288 25.3182 186.288 20.0247L226.596 20.0247H266.905Z" fill="#0A0A0A" transform="translate(256 169)"/>
                    <path d="M74.631 34.6578C74.631 38.9849 72.9121 43.1348 69.8523 46.1946C66.7926 49.2543 62.6426 50.9733 58.3155 50.9733C53.9884 50.9733 49.8385 49.2543 46.7787 46.1946C43.719 43.1348 42 38.9849 42 34.6578L58.3155 34.6578H74.631Z" fill="#F5F5F5" transform="translate(256 169)"/>
                    <path d="M208.631 34.6578C208.631 38.9849 206.912 43.1348 203.852 46.1946C200.793 49.2543 196.643 50.9733 192.316 50.9733C187.988 50.9733 183.838 49.2543 180.779 46.1946C177.719 43.1348 176 38.9849 176 34.6578L192.316 34.6578H208.631Z" fill="#F5F5F5" transform="translate(256 169)"/>
                  </>
                )}
              </g>
              <defs>
                <clipPath id="clip0_1373_1507_angry_feed">
                  <rect width="279" height="92" fill="white" transform="translate(256 169)"/>
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
        <View 
          style={styles.bottomScreen}
          onTouchStart={handleTouchStart}
        >
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
            {/* 좋아요 아이콘과 수 표시 - locationContainer 밖에, 키워드와 동일한 여백 */}
            {currentRecording.district && (() => {
              const emotionColor = getEmotionColor(currentRecording.emotion);
              const isLiked = likedRecordings.has(currentRecording.id);
              const isMyRec = isMyRecording;
              
              // 내 기록이거나 좋아요를 누르지 않은 경우: 테두리 감정 색상, 배경 #0A0A0A, 텍스트 감정 색상
              // 남의 기록이고 좋아요를 누른 경우: 배경 감정 색상, 텍스트 검정
              const isFilled = !isMyRec && isLiked;
              
              return (
                <TouchableOpacity
                  style={[
                    styles.likeContainer,
                    {
                      backgroundColor: isFilled ? emotionColor : '#0A0A0A',
                      borderWidth: 4,
                      borderColor: emotionColor,
                    },
                  ]}
                  onPress={handleLikeToggle}
                  disabled={isMyRec}
                  activeOpacity={isMyRec ? 1 : 0.7}
                >
                  <Svg width="38" height="29" viewBox="0 0 38 29" fill="none">
                    <Path 
                      d="M37.5396 12.3597C37.4864 15.1714 34.6336 15.2098 34.5924 15.2102L23.0205 15.0058C23.0309 15.0725 24.128 22.171 20.5511 25.7091C19.012 27.2312 15.1695 27.8461 11.2786 28.0514C5.24305 28.3697 0.476329 23.427 0.0332704 17.3819C-0.330988 12.4115 2.31851 7.70503 6.75148 5.44745L8.51303 4.55044C8.52372 4.54467 15.5805 0.734579 18.5292 0.0985724C19.7877 -0.172823 20.5207 0.154068 20.9475 0.617854C21.6605 1.39279 21.1543 2.55306 20.4572 3.34408L16.0274 8.37048L34.7008 9.40628C34.7064 9.40652 37.5932 9.53037 37.5396 12.3597Z" 
                      fill={isFilled ? '#0A0A0A' : emotionColor}
                    />
                  </Svg>
                  <View style={styles.likeTextContainer}>
                    <Text style={[
                      styles.likeCount,
                      { color: isFilled ? '#0A0A0A' : emotionColor }
                    ]}>
                      {currentRecording.likes || 0}
                    </Text>
                    <Text style={[
                      styles.likePlus,
                      { color: isFilled ? '#0A0A0A' : emotionColor }
                    ]}>
                      +
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })()}
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
  likeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10, // 키워드와 동일한 여백
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
    gap: 8,
    alignSelf: 'flex-start',
  },
  likeTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  likeCount: {
    fontSize: 40,
    fontWeight: '600',
    letterSpacing: 1.6,
    fontFamily: Platform.OS === 'web' ? 'Pretendard' : undefined,
  },
  likePlus: {
    fontSize: 40,
    fontWeight: '600',
    fontFamily: Platform.OS === 'web' ? 'Pretendard' : undefined,
    marginLeft: 0,
    ...(Platform.OS === 'web' ? { bottom: 3.5 } : { marginTop: -3.5 }),
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
    top: 298, // 놀람 캐릭터만 top: 280 적용
    width: 598,
    height: 598,
    overflow: 'hidden',
  },
  surpriseCharacterWrapper: {
    position: 'absolute',
    top: 0,
    left: -138,
    width: 628,
    height: 658,
    justifyContent: 'center',
    alignItems: 'center',
  },
  angryEmotionCharacterContainer: {
    position: 'absolute',
    left: -199,
    top: 332,
    width: 791,
    height: 557,
    overflow: 'hidden',
  },
  angryCharacterWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 791,
    height: 557,
    justifyContent: 'center',
    alignItems: 'center',
  },
  normalEmotionCharacterContainer: {
    position: 'absolute',
    left: -48,
    top: 294,
    width: 632,
    height: 632,
    overflow: 'hidden',
  },
  normalCharacterWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 632,
    height: 632,
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
