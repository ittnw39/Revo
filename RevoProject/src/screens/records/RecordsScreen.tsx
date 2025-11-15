import { FC, useEffect, useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Animated,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import Svg, { Path, Circle, G, Mask, Ellipse } from 'react-native-svg';

import { useApp } from '../../contexts/AppContext';
import NavigationBar from '../../components/NavigationBar';
import Header from '../../components/Header';
import DeleteConfirmModal from '../../components/DeleteConfirmModal';
import { getRecordings, getUserFromStorage, Recording, getAudioUrl, deleteRecording } from '../../services/api';

// 웹 환경에서 document 사용을 위한 타입 선언
declare const document: {
  addEventListener: (event: string, handler: (e: any) => void) => void;
  removeEventListener: (event: string, handler: (e: any) => void) => void;
};

// iPhone 15, 15 Pro 크기 기준
const screenWidth = 390;
const screenHeight = 844;

type RecordsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Records'>;
type RecordsScreenRouteProp = RouteProp<RootStackParamList, 'Records'>;

interface WeekDay {
  dayLabel: string;
  dayNumber: number;
  date: Date;
  dateString: string; // YYYY-MM-DD 형식
}

const RecordsScreen: FC = () => {
  const navigation = useNavigation<RecordsScreenNavigationProp>();
  const route = useRoute<RecordsScreenRouteProp>();
  const { isOnboardingCompleted } = useApp();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  // 눈 애니메이션 상태 (1초마다 변경)
  const [eyeAnimationState, setEyeAnimationState] = useState<number>(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setEyeAnimationState(prev => (prev === 0 ? 1 : 0));
    }, 1000); // 1초마다 변경
    
    return () => clearInterval(interval);
  }, []);
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [userName, setUserName] = useState<string>('');
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0); // 오늘 날짜 기록 페이지 인덱스
  const audioRef = useRef<any>(null); // HTMLAudioElement 또는 React Native Audio
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoadRef = useRef<boolean>(true); // 초기 로드 여부 추적

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

  // 오늘 날짜 기준으로 이번주 날짜 계산 (일~토)
  const weekDays = useMemo<WeekDay[]>(() => {
    const today = new Date();
    const currentDay = today.getDay(); // 0(일요일) ~ 6(토요일)
    
    // 이번주 일요일 날짜 계산
    const sunday = new Date(today);
    sunday.setDate(today.getDate() - currentDay);
    sunday.setHours(0, 0, 0, 0);
    
    const days: WeekDay[] = [];
    const dayLabels = ['일', '월', '화', '수', '목', '금', '토'];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(sunday);
      date.setDate(sunday.getDate() + i);
      
      const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      
      days.push({
        dayLabel: dayLabels[i],
        dayNumber: date.getDate(),
        date,
        dateString,
      });
    }
    
    return days;
  }, []);

  // 과거 날짜인지 확인
  const isPastDate = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate < today;
  };

  // 미래 날짜인지 확인
  const isFutureDate = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate > today;
  };

  // 오늘 날짜인지 확인
  const isToday = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return (
      checkDate.getFullYear() === today.getFullYear() &&
      checkDate.getMonth() === today.getMonth() &&
      checkDate.getDate() === today.getDate()
    );
  };

  // 선택한 날짜인지 확인
  const isSelected = (date: Date): boolean => {
    return (
      selectedDate.getFullYear() === date.getFullYear() &&
      selectedDate.getMonth() === date.getMonth() &&
      selectedDate.getDate() === date.getDate()
    );
  };

  // 선택한 날짜의 녹음 데이터 가져오기
  const selectedDateRecordings = useMemo(() => {
    const dateString = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
    return recordings.filter(rec => {
      const recDate = new Date(rec.recorded_at);
      const recDateString = `${recDate.getFullYear()}-${String(recDate.getMonth() + 1).padStart(2, '0')}-${String(recDate.getDate()).padStart(2, '0')}`;
      return recDateString === dateString;
    });
  }, [selectedDate, recordings]);

  // 오늘 날짜인지 확인
  const isSelectedDateToday = useMemo(() => {
    return isToday(selectedDate);
  }, [selectedDate]);

  // 선택한 날짜의 녹음 데이터 정렬 (최신순)
  const sortedDateRecordings = useMemo(() => {
    return [...selectedDateRecordings].sort((a, b) => {
      return new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime();
    });
  }, [selectedDateRecordings]);

  // 선택한 날짜의 기록 최대 3개까지
  const todayRecordings = useMemo(() => {
    return sortedDateRecordings.slice(0, 3); // 최대 3개
  }, [sortedDateRecordings]);

  // 현재 페이지의 녹음 가져오기
  const currentRecording = useMemo(() => {
    if (todayRecordings.length === 0) return null;
    // 페이지 인덱스에 해당하는 녹음
    if (currentPageIndex >= 0 && currentPageIndex < todayRecordings.length) {
      return todayRecordings[currentPageIndex];
    }
    return todayRecordings[0];
  }, [todayRecordings, currentPageIndex]);

  // currentRecording이 변경되면 selectedRecording 업데이트
  useEffect(() => {
    if (currentRecording) {
      setSelectedRecording(currentRecording);
    } else {
      setSelectedRecording(null);
    }
  }, [currentRecording]);

  // 선택한 날짜가 변경되면 페이지 인덱스 리셋
  useEffect(() => {
    setCurrentPageIndex(0);
  }, [selectedDate]);

  // 초기 로드 시 최신 기록의 날짜로 selectedDate 설정 (한 번만 실행)
  useEffect(() => {
    if (recordings.length > 0 && isInitialLoadRef.current) {
      const sorted = [...recordings].sort((a, b) => {
        return new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime();
      });
      const latest = sorted[0];
      setSelectedDate(new Date(latest.recorded_at));
      isInitialLoadRef.current = false; // 초기 로드 완료 표시
    }
  }, [recordings.length]); // recordings.length만 의존성으로 사용

  // 해당 날짜에 기록이 있는지 확인
  const hasRecording = (dateString: string): boolean => {
    const hasRecord = recordings.some(rec => {
      const recDate = new Date(rec.recorded_at);
      const recDateString = `${recDate.getFullYear()}-${String(recDate.getMonth() + 1).padStart(2, '0')}-${String(recDate.getDate()).padStart(2, '0')}`;
      return recDateString === dateString;
    });
    return hasRecord;
  };

  // 렌더링 체크용 useEffect
  useEffect(() => {
    console.log('\n=== 렌더링 체크 ===');
    console.log('selectedRecording:', selectedRecording);
    console.log('selectedRecording?.emotion:', selectedRecording?.emotion);
    console.log('조건 체크 (기쁨인가?):', selectedRecording && selectedRecording.emotion === '기쁨');
    if (selectedRecording) {
      console.log('전체 selectedRecording 객체:', JSON.stringify(selectedRecording, null, 2));
    }
  }, [selectedRecording]);

  // 오디오 재생 함수
  const playAudio = (startTime?: number) => {
    if (!selectedRecording || !selectedRecording.audio_file) return;

    const audioUrl = getAudioUrl(selectedRecording.audio_file);
    
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

  // 하이라이트 시간을 초로 변환 (예: "1:30" -> 90)
  const parseHighlightTime = (timeString: string | null): number => {
    if (!timeString) return 0;
    const parts = timeString.split(':');
    if (parts.length === 2) {
      return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    }
    return 0;
  };

  // 녹음 삭제 함수
  const handleDeleteRecording = async () => {
    if (!selectedRecording) return;

    try {
      const response = await deleteRecording(selectedRecording.id);
      if (response.success) {
        // 녹음 목록에서 삭제
        setRecordings(prev => prev.filter(r => r.id !== selectedRecording.id));
        // 선택된 녹음 초기화
        setSelectedRecording(null);
        // 모달 닫기
        setShowDeleteModal(false);
      }
    } catch (error) {
      console.error('녹음 삭제 오류:', error);
      setShowDeleteModal(false);
    }
  };

  // 감정별 캐릭터 렌더링
  const renderCharacter = () => {
    if (!selectedRecording) return null;

    const emotion = selectedRecording.emotion;
    const emotionColor = getEmotionColor(emotion);

    // 슬픔 캐릭터 (사각형 배경)
    if (emotion === '슬픔') {
      return (
        <TouchableOpacity
          style={styles.sadEmotionCharacterContainer}
          onLongPress={() => setShowDeleteModal(true)}
          activeOpacity={1}
        >
          {/* 슬픔 색상 사각형 배경 */}
          <View style={[styles.sadCharacterBackground, { backgroundColor: emotionColor }]} />
          {/* 슬픔 캐릭터 SVG */}
          <View style={styles.sadCharacterWrapper}>
            <svg xmlns="http://www.w3.org/2000/svg" width="393" height="534" viewBox="0 0 393 534" fill="none" style={{ width: '100%', height: '100%' }}>
              {/* 슬픔 캐릭터 SVG - 배경 rect는 제외하고 캐릭터만 (배경은 별도 렌더링) */}
              <circle cx="140.233" cy="108.908" r="53.9077" fill="#F5F5F5"/>
              <circle cx="252.631" cy="108.908" r="53.9077" fill="#F5F5F5"/>
              <mask id="mask0_sad_records" style={{maskType:"alpha"}} maskUnits="userSpaceOnUse" x="86" y="55" width="109" height="108">
                <circle cx="140.232" cy="108.908" r="53.9077" fill="#F5F5F5"/>
              </mask>
              <g mask="url(#mask0_sad_records)">
                {eyeAnimationState === 0 ? (
                  <circle cx="95.8028" cy="108.911" r="53.9108" fill="#0A0A0A"/>
                ) : (
                  <circle cx="60.4755" cy="60.4755" r="53.9108" transform="matrix(-1 0 0 1 251.658 48.4355)" fill="#0A0A0A"/>
                )}
              </g>
              <mask id="mask1_sad_records" style={{maskType:"alpha"}} maskUnits="userSpaceOnUse" x="198" y="55" width="109" height="108">
                <circle cx="252.631" cy="108.908" r="53.9077" fill="#F5F5F5"/>
              </mask>
              <g mask="url(#mask1_sad_records)">
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
        </TouchableOpacity>
      );
    }

    // 신남 캐릭터 (별 모양 배경)
    if (emotion === '신남') {
      return (
        <TouchableOpacity
          style={styles.excitedEmotionCharacterContainer}
          onLongPress={() => setShowDeleteModal(true)}
          activeOpacity={1}
        >
          {/* 신남 캐릭터 SVG (별 모양 배경 포함) */}
          <View style={styles.excitedCharacterWrapper}>
            <svg xmlns="http://www.w3.org/2000/svg" width="640" height="640" viewBox="0 0 640 640" fill="none" style={{ width: '100%', height: '100%' }}>
              <path d="M315.663 17.6931C316.625 13.4338 322.694 13.4338 323.657 17.6931L365.107 201.195C365.73 203.956 368.898 205.268 371.291 203.757L530.357 103.311C534.049 100.98 538.34 105.271 536.009 108.963L435.563 268.029C434.052 270.422 435.364 273.589 438.124 274.213L621.627 315.663C625.886 316.625 625.886 322.694 621.627 323.657L438.124 365.107C435.364 365.73 434.052 368.898 435.563 371.291L536.009 530.357C538.34 534.049 534.049 538.34 530.357 536.009L371.291 435.563C368.898 434.052 365.73 435.364 365.107 438.124L323.657 621.627C322.694 625.886 316.625 625.886 315.663 621.627L274.213 438.124C273.589 435.364 270.422 434.052 268.029 435.563L108.963 536.009C105.271 538.34 100.98 534.049 103.311 530.357L203.757 371.291C205.268 368.898 203.956 365.73 201.195 365.107L17.6931 323.657C13.4338 322.694 13.4338 316.625 17.6931 315.663L201.195 274.213C203.956 273.589 205.268 270.422 203.757 268.029L103.311 108.963C100.98 105.271 105.271 100.98 108.963 103.311L268.029 203.757C270.422 205.268 273.589 203.956 274.213 201.195L315.663 17.6931Z" fill={emotionColor}/>
              <circle cx="260.594" cy="263.941" r="56.5281" fill="#F5F5F5"/>
              <circle cx="378.455" cy="263.941" r="56.5281" fill="#F5F5F5"/>
              <mask id="mask0_excited_records" style={{maskType:"alpha"}} maskUnits="userSpaceOnUse" x="204" y="207" width="114" height="114">
                <circle cx="260.594" cy="263.941" r="56.5281" fill="#F5F5F5"/>
              </mask>
              <g mask="url(#mask0_excited_records)">
                {eyeAnimationState === 0 ? (
                  <circle cx="210.164" cy="263.944" r="56.5314" fill="#0A0A0A"/>
                ) : (
                  <circle cx="60.4755" cy="60.4755" r="56.5314" transform="matrix(-1 0 0 1 369.41 203.4685)" fill="#0A0A0A"/>
                )}
              </g>
              <mask id="mask1_excited_records" style={{maskType:"alpha"}} maskUnits="userSpaceOnUse" x="321" y="207" width="114" height="114">
                <circle cx="378.455" cy="263.941" r="56.5281" fill="#F5F5F5"/>
              </mask>
              <g mask="url(#mask1_excited_records)">
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
              <mask id="path-10-inside-1_excited_records" fill="white">
                <path d="M331.686 313.371C326.698 328.308 314.998 337.86 305.554 334.707C296.11 331.553 292.497 316.887 297.485 301.95L297.485 301.948L331.686 313.369L331.686 313.371Z"/>
              </mask>
              <path d="M331.686 313.371C326.698 328.308 314.998 337.86 305.554 334.707C296.11 331.553 292.497 316.887 297.485 301.95L297.485 301.948L331.686 313.369L331.686 313.371Z" fill="#0A0A0A"/>
              <path d="M331.686 313.371L333.629 314.02L333.629 314.02L331.686 313.371ZM305.554 334.707L304.905 336.65L304.905 336.65L305.554 334.707ZM297.485 301.95L295.542 301.301L295.542 301.301L297.485 301.95ZM297.485 301.948L298.134 300.005L296.191 299.356L295.542 301.299L297.485 301.948ZM331.686 313.369L333.63 314.018L334.278 312.075L332.335 311.426L331.686 313.369ZM331.686 313.371L329.743 312.722C327.352 319.88 323.38 325.656 318.995 329.236C314.587 332.836 310.024 334.04 306.203 332.764L305.554 334.707L304.905 336.65C310.528 338.528 316.537 336.532 321.587 332.41C326.659 328.268 331.031 321.798 333.629 314.02L331.686 313.371ZM305.554 334.707L306.203 332.764C302.382 331.488 299.458 327.784 298.096 322.257C296.742 316.761 297.037 309.757 299.428 302.599L297.485 301.95L295.542 301.301C292.944 309.08 292.551 316.878 294.118 323.237C295.677 329.567 299.282 334.772 304.905 336.65L305.554 334.707ZM297.485 301.95L299.428 302.599L299.429 302.597L297.485 301.948L295.542 301.299L295.542 301.301L297.485 301.95ZM297.485 301.948L296.836 303.891L331.038 315.312L331.686 313.369L332.335 311.426L298.134 300.005L297.485 301.948ZM331.686 313.369L329.743 312.72L329.743 312.722L331.686 313.371L333.629 314.02L333.63 314.018L331.686 313.369Z" fill="black" mask="url(#path-10-inside-1_excited_records)"/>
            </svg>
          </View>
        </TouchableOpacity>
      );
    }

    // 놀람 캐릭터 (전체 SVG)
    if (emotion === '놀람') {
      return (
        <TouchableOpacity
          style={styles.emotionCharacterContainer}
          onLongPress={() => setShowDeleteModal(true)}
          activeOpacity={1}
        >
          {/* 놀람 캐릭터 SVG 전체 */}
          <View style={styles.surpriseCharacterWrapper}>
            <svg xmlns="http://www.w3.org/2000/svg" width="711" height="676" viewBox="104 112 711 676" fill="none" style={{ width: '100%', height: '100%' }}>
              <g clipPath="url(#clip0_1373_1361_surprise_records)">
                <path d="M356.24 212.801C388.742 112.771 530.258 112.771 562.76 212.801C577.295 257.536 618.983 287.824 666.02 287.824C771.198 287.824 814.929 422.414 729.838 484.236C691.784 511.883 675.861 560.89 690.396 605.625C722.898 705.655 608.409 788.836 523.318 727.014C485.264 699.367 433.736 699.367 395.682 727.014C310.591 788.836 196.102 705.655 228.604 605.625C243.139 560.89 227.216 511.883 189.162 484.236C104.071 422.414 147.802 287.824 252.98 287.824C300.017 287.824 341.705 257.536 356.24 212.801Z" fill="#F99841"/>
                <mask id="path-2-inside-1_surprise_records" fill="white">
                  <path d="M459.853 419.084C455.762 403.817 460.271 389.344 469.923 386.758C479.576 384.171 490.717 394.451 494.807 409.718L494.808 409.719L459.853 419.085L459.853 419.084Z"/>
                </mask>
                <path d="M459.853 419.084C455.762 403.817 460.271 389.344 469.923 386.758C479.576 384.171 490.717 394.451 494.807 409.718L494.808 409.719L459.853 419.085L459.853 419.084Z" fill="#0A0A0A"/>
                <path d="M469.923 386.758L469.035 383.444L469.035 383.444L469.923 386.758ZM494.808 409.719L495.695 413.032L499.009 412.144L498.121 408.831L494.808 409.719ZM459.853 419.085L456.54 419.973L457.427 423.286L460.741 422.398L459.853 419.085ZM459.853 419.084L463.167 418.196C461.263 411.092 461.409 404.326 463.01 399.186C464.626 393.997 467.521 390.953 470.811 390.071L469.923 386.758L469.035 383.444C462.673 385.149 458.488 390.635 456.459 397.146C454.416 403.705 454.352 411.81 456.539 419.972L459.853 419.084ZM469.923 386.758L470.811 390.071C474.101 389.19 478.13 390.379 482.125 394.064C486.081 397.715 489.59 403.501 491.494 410.606L494.807 409.718L498.121 408.83C495.934 400.668 491.827 393.681 486.777 389.022C481.765 384.397 475.398 381.739 469.035 383.444L469.923 386.758ZM494.807 409.718L491.494 410.606L491.494 410.607L494.808 409.719L498.121 408.831L498.121 408.83L494.807 409.718ZM494.808 409.719L493.92 406.405L458.965 415.771L459.853 419.085L460.741 422.398L495.695 413.032L494.808 409.719ZM459.853 419.085L463.167 418.197L463.167 418.196L459.853 419.084L456.539 419.972L456.54 419.973L459.853 419.085Z" fill="black" mask="url(#path-2-inside-1_surprise_records)"/>
                <circle cx="55.9859" cy="55.9859" r="55.9859" transform="matrix(-1 0 0 1 585.338 295.333)" fill="#F5F5F5"/>
                <circle cx="55.9859" cy="55.9859" r="55.9859" transform="matrix(-1 0 0 1 468.607 295.332)" fill="#F5F5F5"/>
                <mask id="mask0_1373_1361_surprise_records" style={{maskType:"alpha"}} maskUnits="userSpaceOnUse" x="473" y="295" width="113" height="113">
                  <circle cx="55.9859" cy="55.9859" r="55.9859" transform="matrix(-1 0 0 1 585.338 295.332)" fill="#F5F5F5"/>
                </mask>
                <g mask="url(#mask0_1373_1361_surprise_records)">
                  {eyeAnimationState === 0 ? (
                    <circle cx="55.9891" cy="55.9891" r="55.9891" transform="matrix(-1 0 0 1 632.03 295.332)" fill="#0A0A0A"/>
                  ) : (
                    <circle cx="55.9891" cy="55.9891" r="55.9891" transform="matrix(-1 0 0 1 585.338 295.332)" fill="#0A0A0A"/>
                  )}
                </g>
                <mask id="mask1_1373_1361_surprise_records" style={{maskType:"alpha"}} maskUnits="userSpaceOnUse" x="356" y="295" width="113" height="113">
                  <circle cx="55.9859" cy="55.9859" r="55.9859" transform="matrix(-1 0 0 1 468.607 295.332)" fill="#F5F5F5"/>
                </mask>
                <g mask="url(#mask1_1373_1361_surprise_records)">
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
                <clipPath id="clip0_1373_1361_surprise_records">
                  <rect x="104" y="112" width="711" height="676" fill="white"/>
                </clipPath>
              </defs>
            </svg>
          </View>
        </TouchableOpacity>
      );
    }

    // 행복 캐릭터 및 기본 캐릭터 (원형 배경)
    return (
      <TouchableOpacity
        style={styles.emotionCharacterContainer}
        onLongPress={() => setShowDeleteModal(true)}
        activeOpacity={1}
      >
        <View style={[styles.characterCircleBackground, { backgroundColor: emotionColor }]} />
        {/* 큰 캐릭터 전용 SVG */}
        <View style={styles.characterWrapper}>
          <View style={styles.characterEyesContainer}>
            {eyeAnimationState === 0 ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="337" height="138" viewBox="0 0 337 138" fill="none">
                <circle cx="105.472" cy="69.472" r="60.4719" fill="#F5F5F5"/>
                <circle cx="231.556" cy="69.472" r="60.4719" fill="#F5F5F5"/>
                <mask id="mask0_396_61_records" style={{maskType:"alpha"}} maskUnits="userSpaceOnUse" x="45" y="9" width="121" height="121">
                  <circle cx="105.472" cy="69.4719" r="60.4719" fill="#F5F5F5"/>
                </mask>
                <g mask="url(#mask0_396_61_records)">
                  <circle cx="55.0428" cy="69.4754" r="60.4755" fill="#0A0A0A"/>
                </g>
                <mask id="mask1_396_61_records" style={{maskType:"alpha"}} maskUnits="userSpaceOnUse" x="171" y="9" width="122" height="121">
                  <circle cx="231.557" cy="69.4719" r="60.4719" fill="#F5F5F5"/>
                </mask>
                <g mask="url(#mask1_396_61_records)">
                  <circle cx="181.126" cy="69.4754" r="60.4755" fill="#0A0A0A"/>
                </g>
                <path d="M127.855 80.1475C127.855 84.208 126.242 88.1023 123.371 90.9735C120.5 93.8447 116.606 95.4578 112.545 95.4578C108.485 95.4578 104.59 93.8447 101.719 90.9735C98.8479 88.1023 97.2349 84.2081 97.2349 80.1475L112.545 80.1475H127.855Z" fill="#F5F5F5"/>
                <path d="M253.94 80.1475C253.94 84.208 252.327 88.1023 249.456 90.9735C246.585 93.8447 242.691 95.4578 238.63 95.4578C234.57 95.4578 230.675 93.8447 227.804 90.9735C224.933 88.1023 223.32 84.2081 223.32 80.1475L238.63 80.1475H253.94Z" fill="#F5F5F5"/>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="337" height="138" viewBox="0 0 337 138" fill="none">
                <circle cx="105.472" cy="69.472" r="60.4719" fill="#F5F5F5"/>
                <circle cx="231.556" cy="69.472" r="60.4719" fill="#F5F5F5"/>
                <mask id="mask0_396_110_records" style={{maskType:"alpha"}} maskUnits="userSpaceOnUse" x="45" y="9" width="121" height="121">
                  <circle cx="105.472" cy="69.4719" r="60.4719" fill="#F5F5F5"/>
                </mask>
                <g mask="url(#mask0_396_110_records)">
                  <circle cx="60.4755" cy="60.4755" r="60.4755" transform="matrix(-1 0 0 1 214.288 9)" fill="#0A0A0A"/>
                </g>
                <mask id="mask1_396_110_records" style={{maskType:"alpha"}} maskUnits="userSpaceOnUse" x="171" y="9" width="122" height="121">
                  <circle cx="231.557" cy="69.4719" r="60.4719" fill="#F5F5F5"/>
                </mask>
                <g mask="url(#mask1_396_110_records)">
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
      </TouchableOpacity>
    );
  };

  // 키워드 강조를 위한 텍스트 렌더링 (인라인 스타일)
  const renderHighlightedTextContent = (text: string, keywords: string[], emotion?: string) => {
    if (!keywords || keywords.length === 0) {
      return (
        <View style={styles.contentTextContainer}>
          <Text style={styles.contentText}>{text}</Text>
        </View>
      );
    }

    // 감정에 따른 색상 가져오기
    const emotionColor = emotion ? getEmotionColor(emotion) : '#FED046';

    // 텍스트에서 키워드를 찾아서 하이라이트
    // 키워드를 길이 순으로 정렬 (긴 키워드부터 매칭)
    const sortedKeywords = [...keywords].filter(k => k && k.trim()).sort((a, b) => b.length - a.length);
    
    if (sortedKeywords.length === 0) {
      return (
        <View style={styles.contentTextContainer}>
          <Text style={styles.contentText}>{text}</Text>
        </View>
      );
    }

    // 텍스트를 키워드 기준으로 분할
    const parts: Array<{ text: string; isKeyword: boolean }> = [];
    let remainingText = text;
    
    // 각 키워드의 위치를 찾아서 정렬
    const matches: Array<{ keyword: string; index: number }> = [];
    sortedKeywords.forEach(keyword => {
      const trimmedKeyword = keyword.trim();
      if (!trimmedKeyword) return;
      
      let searchIndex = 0;
      while (true) {
        const index = remainingText.indexOf(trimmedKeyword, searchIndex);
        if (index === -1) break;
        matches.push({ keyword: trimmedKeyword, index });
        searchIndex = index + 1;
      }
    });
    
    // 인덱스 순으로 정렬
    matches.sort((a, b) => a.index - b.index);
    
    // 겹치는 매치 제거 (긴 키워드 우선)
    const nonOverlappingMatches: Array<{ keyword: string; index: number }> = [];
    let lastEnd = -1;
    
    matches.forEach(match => {
      const matchEnd = match.index + match.keyword.length;
      if (match.index >= lastEnd) {
        nonOverlappingMatches.push(match);
        lastEnd = matchEnd;
      }
    });
    
    // 텍스트를 키워드와 일반 텍스트로 분할
    let currentIndex = 0;
    nonOverlappingMatches.forEach(match => {
      // 키워드 이전의 일반 텍스트
      if (match.index > currentIndex) {
        const normalText = remainingText.substring(currentIndex, match.index);
        if (normalText) {
          parts.push({ text: normalText, isKeyword: false });
        }
      }
      
      // 키워드
      parts.push({ text: match.keyword, isKeyword: true });
      currentIndex = match.index + match.keyword.length;
    });
    
    // 마지막 남은 텍스트
    if (currentIndex < remainingText.length) {
      const normalText = remainingText.substring(currentIndex);
      if (normalText) {
        parts.push({ text: normalText, isKeyword: false });
      }
    }
    
    // 매칭이 없으면 전체 텍스트 반환
    if (parts.length === 0) {
      parts.push({ text: remainingText, isKeyword: false });
    }

    return (
      <View style={styles.contentTextContainer}>
        {parts.map((part, index) => {
          if (part.isKeyword) {
            return (
              <View key={index} style={[styles.keywordTagInline, { backgroundColor: emotionColor }]}>
                <Text style={styles.keywordTextInline}>{part.text}</Text>
              </View>
            );
          } else {
            // 일반 텍스트는 그대로 표시
            return (
              <Text key={index} style={styles.normalText}>{part.text}</Text>
            );
          }
        })}
      </View>
    );
  };

  // 녹음 데이터 로드 (모든 녹음 가져오기 - 날짜별 필터링을 위해)
  useEffect(() => {
    const loadRecordings = async () => {
      try {
        setLoading(true);
        const userInfo = getUserFromStorage();
        if (userInfo) {
          setUserName(userInfo.name);
          // 모든 녹음 가져오기 (날짜별 필터링을 위해)
          const response = await getRecordings({ 
            userId: userInfo.id,
            limit: 100 // 충분히 많이 가져오기
          });
          if (response.success) {
            setRecordings(response.recordings);
          }
        }
      } catch (error) {
        console.error('녹음 데이터 로드 오류:', error);
      } finally {
        setLoading(false);
      }
    };

    loadRecordings();
  }, []);

  // 온보딩 완료 상태 확인
  useEffect(() => {
    if (!isOnboardingCompleted) {
      navigation.navigate('OnBoarding');
    }
  }, [isOnboardingCompleted, navigation]);

  // route.params.initialDate가 있으면 해당 날짜로 selectedDate 설정
  useEffect(() => {
    if (route.params?.initialDate) {
      const date = new Date(route.params.initialDate);
      date.setHours(0, 0, 0, 0);
      setSelectedDate(date);
    }
  }, [route.params?.initialDate]);

  // 좌우 스와이프 제스처 처리 (설정화면 참고)
  const handleTouchStart = (e: any) => {
    // 기록이 2개 이상일 때만 스와이프 가능
    if (todayRecordings.length <= 1) return;

    let startX: number;
    if (Platform.OS === 'web') {
      // 웹 환경
      const touch = e.touches?.[0] || e.nativeEvent?.touches?.[0];
      if (!touch) return;
      startX = touch.clientX || touch.pageX;
    } else {
      // React Native 환경
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
        if (deltaX > 0 && currentPageIndex > 0) {
          // 오른쪽으로 스와이프 - 이전 페이지
          setCurrentPageIndex(currentPageIndex - 1);
        } else if (deltaX < 0 && currentPageIndex < todayRecordings.length - 1) {
          // 왼쪽으로 스와이프 - 다음 페이지
          setCurrentPageIndex(currentPageIndex + 1);
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
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* 배경 프레임 */}
      <View style={styles.frame} />

      {/* 상단 헤더 */}
      <Header currentScreen="Records" />

      {/* 메인 콘텐츠 영역 */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        snapToInterval={844}
        snapToAlignment="start"
        decelerationRate="fast"
        scrollEnabled={true}
      >
        {selectedRecording ? (
          <>
            {/* 첫 번째 화면: 캐릭터 화면 */}
            <View 
              style={styles.topScreen}
              onTouchStart={handleTouchStart}
            >
              {/* 이번주 날짜 표시 - topScreen 안에 배치 */}
              <View style={[styles.weekContainer, { pointerEvents: 'box-none' }]}>
        {weekDays.map((day, index) => {
          const today = isToday(day.date);
          const selected = isSelected(day.date);
          const hasRecord = hasRecording(day.dateString);
                  const isPastDate = !isFutureDate(day.date) && !today; // 지나간 날짜 (오늘이 아닌 과거 날짜)
          
          // 디버깅용 로그 (개발 중에만 사용)
          if (hasRecord) {
            console.log(`날짜 ${day.dateString}에 녹음이 있습니다.`);
          }
          
          return (
            <TouchableOpacity
              key={index}
              style={styles.dayItem}
              onPress={() => {
                // 미래 날짜는 선택 불가
                if (!isFutureDate(day.date)) {
                          console.log('날짜 선택:', day.date, day.dateString);
                          const newDate = new Date(day.date);
                          newDate.setHours(0, 0, 0, 0);
                          setSelectedDate(newDate); // 새로운 Date 객체로 설정
                }
              }}
              activeOpacity={isFutureDate(day.date) ? 1 : 0.7}
              disabled={isFutureDate(day.date)}
            >
              {/* 오늘 날짜 위에 점 표시 */}
              {today && (
                <View style={styles.recordDot} />
              )}
              
              <Text style={styles.dayLabel}>{day.dayLabel}</Text>
              <View
                style={[
                  styles.dayBorder,
                  !selected && !hasRecord && styles.noBorder, // 녹음 없고 선택 안된 날짜: 테두리 없음
                  selected && styles.selectedDay, // 선택한 날짜: 채워진 박스
                  hasRecord && !selected && styles.recordDay, // 녹음이 있는 날: 테두리만
                ]}
              >
                <Text
                  style={[
                    styles.dayNumber,
                    selected && styles.selectedDayNumber, // 선택한 날짜: 검은색 텍스트
                  ]}
                >
                  {day.dayNumber}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

              {/* 감정별 캐릭터 표시 */}
              {renderCharacter()}
            </View>

            {/* 두 번째 화면: 상세 정보 화면 */}
            <View 
              style={styles.bottomScreen}
              onTouchStart={handleTouchStart}
            >
              {/* 사용자 정보 영역 - 이름과 업로드 버튼 */}
              <View style={styles.userInfoContainer}>
                <View style={styles.userInfoLeft}>
                  <View style={styles.userProfileImage}>
                    <Text style={styles.userProfileText}>{userName.charAt(0)}</Text>
                  </View>
                  <Text style={styles.userName}>{userName}</Text>
                </View>
                <TouchableOpacity style={styles.uploadButton}>
                  <Text style={styles.uploadButtonText}>업로드</Text>
                </TouchableOpacity>
            </View>

              {/* 감정과 키워드 (인라인으로 표시) */}
            <View style={styles.contentContainer}>
                <View style={styles.contentTextContainer}>
                  <Text style={styles.normalText}>오늘은 </Text>
                  <View style={[styles.emotionTagInline, { backgroundColor: getEmotionColor(selectedRecording.emotion) }]}>
                    <Text style={styles.emotionTextInline}>{selectedRecording.emotion}</Text>
                  </View>
                </View>
                {/* 키워드만 표시 (최대 2개) */}
                {selectedRecording.keywords && selectedRecording.keywords.length > 0 && (
                  <View style={styles.keywordsContainer}>
                    {selectedRecording.keywords.slice(0, 2).map((keyword, index) => (
                      <View 
                        key={index} 
                        style={[styles.keywordTagInline, { backgroundColor: getEmotionColor(selectedRecording.emotion) }]}
                      >
                        <Text style={styles.keywordTextInline}>{keyword}</Text>
                      </View>
                    ))}
                  </View>
              )}
              {/* 위치 정보 표시 (키워드처럼 배경색 추가) */}
              {selectedRecording.district && (
                <View style={styles.locationContainer}>
                  <View style={[styles.locationTag, { backgroundColor: getEmotionColor(selectedRecording.emotion) }]}>
                    <Text style={styles.locationText}>{selectedRecording.district}</Text>
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
                    // 재생 중이면 정지 (처음부터)
                    stopAudio();
                  } else {
                    // 정지 상태면 하이라이트 시간부터 재생
                  const highlightTime = parseHighlightTime(selectedRecording.highlight_time);
                  playAudio(highlightTime);
                  }
                }}
                onLongPress={() => {
                    // 하이라이트 수정 화면으로 이동
                    if (selectedRecording) {
                      navigation.navigate('HighlightEdit', { recordingId: selectedRecording.id });
                    }
                }}
                delayLongPress={1000}
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
          </>
        ) : (
          /* 녹음이 없을 때의 상태 */
          <>
            {/* 첫 번째 화면: 캐릭터 화면 */}
            <View style={styles.topScreen}>
              {/* 이번주 날짜 표시 - topScreen 안에 배치 */}
              <View style={[styles.weekContainer, { pointerEvents: 'box-none' }]}>
                {weekDays.map((day, index) => {
                  const today = isToday(day.date);
                  const selected = isSelected(day.date);
                  const hasRecord = hasRecording(day.dateString);
                  
                  return (
                    <TouchableOpacity
                      key={index}
                      style={styles.dayItem}
                      onPress={() => {
                        // 미래 날짜는 선택 불가
                        if (!isFutureDate(day.date)) {
                          console.log('날짜 선택:', day.date, day.dateString);
                          const newDate = new Date(day.date);
                          newDate.setHours(0, 0, 0, 0);
                          setSelectedDate(newDate);
                        }
                      }}
                      activeOpacity={isFutureDate(day.date) ? 1 : 0.7}
                      disabled={isFutureDate(day.date)}
                    >
                      {/* 오늘 날짜 위에 점 표시 */}
                      {today && (
                        <View style={styles.recordDot} />
                      )}
                      
                      <Text style={styles.dayLabel}>{day.dayLabel}</Text>
                      <View
                        style={[
                          styles.dayBorder,
                          !selected && !hasRecord && styles.noBorder, // 녹음 없고 선택 안된 날짜: 테두리 없음
                          selected && styles.selectedDay, // 선택한 날짜: 채워진 박스
                          hasRecord && !selected && styles.recordDay, // 녹음이 있는 날: 테두리만
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayNumber,
                            selected && styles.selectedDayNumber, // 선택한 날짜: 검은색 텍스트
                          ]}
                        >
                          {day.dayNumber}
                        </Text>
              </View>
                    </TouchableOpacity>
                  );
                })}
            </View>
              
              {/* 빈 상태 컨테이너 */}
            <View style={styles.emptyStateContainer}>
                {/* 오늘 날짜인지 확인 */}
                {isToday(selectedDate) ? (
                  <>
                    <Text style={styles.emptyStateTitleToday} numberOfLines={1}>오늘 첫 녹음을 남겨보세요</Text>
                    <TouchableOpacity style={styles.recordButton} onPress={() => navigation.navigate('Recording')}>
                      <Text style={styles.recordButtonText}>녹음하러 가기</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={styles.emptyStateTitle} numberOfLines={1}>녹음이 없어요</Text>
                    {/* 지나간 날짜가 아닐 때만 녹음하러 가기 버튼 표시 */}
                    {!isPastDate(selectedDate) && (
                      <TouchableOpacity style={styles.recordButton} onPress={() => navigation.navigate('Recording')}>
                        <Text style={styles.recordButtonText}>녹음하러 가기</Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}
              {/* 캐릭터 표시 */}
              <View style={styles.characterContainerSmall}>
                  <Svg width="178" height="178" viewBox="0 0 178 178" fill="none">
                  <Circle cx="89" cy="89" r="89" fill="#FED046"/>
                  <Circle cx="67" cy="33" r="18" transform="rotate(90 67 33)" fill="#F5F5F5"/>
                  <Circle cx="104.532" cy="33" r="18" transform="rotate(90 104.532 33)" fill="#F5F5F5"/>
                    <Mask id="mask0_1_4041" maskType="alpha" maskUnits="userSpaceOnUse" x="49" y="15" width="36" height="36">
                    <Circle cx="67" cy="33" r="18" transform="rotate(90 67 33)" fill="#F5F5F5"/>
                  </Mask>
                  <G mask="url(#mask0_1_4041)">
                    <Circle cx="66.9989" cy="18.0011" r="18.0011" transform="rotate(90 66.9989 18.0011)" fill="#0A0A0A"/>
                  </G>
                    <Mask id="mask1_1_4041" maskType="alpha" maskUnits="userSpaceOnUse" x="86" y="15" width="37" height="36">
                    <Circle cx="104.532" cy="33" r="18" transform="rotate(90 104.532 33)" fill="#F5F5F5"/>
                  </Mask>
                  <G mask="url(#mask1_1_4041)">
                    <Circle cx="104.531" cy="17.9881" r="18.0011" transform="rotate(90 104.531 17.9881)" fill="#0A0A0A"/>
                  </G>
                  <Path d="M81 53C81 58.3614 90.6506 58.6295 90.6506 53" stroke="#0A0A0A" strokeWidth="2.57207" strokeLinecap="round"/>
                  <Path d="M62.7257 39.4509C61.2072 39.4509 59.7509 38.8477 58.6772 37.774C57.6035 36.7002 57.0003 35.2439 57.0003 33.7255C57.0003 32.207 57.6035 30.7507 58.6772 29.6769C59.7509 28.6032 61.2072 28 62.7257 28L62.7257 33.7255L62.7257 39.4509Z" fill="#F5F5F5"/>
                  <Path d="M102.726 39.4509C101.207 39.4509 99.7509 38.8477 98.6772 37.774C97.6035 36.7002 97.0003 35.2439 97.0003 33.7255C97.0003 32.207 97.6035 30.7507 98.6772 29.6769C99.7509 28.6032 101.207 28 102.726 28L102.726 33.7255L102.726 39.4509Z" fill="#F5F5F5"/>
                </Svg>
              </View>
            </View>
          </View>
          </>
        )}
      </ScrollView>

      {/* 하단 네비게이션 바 */}
      {/* 페이지바 (기록이 2개 이상일 때만 표시, 네비게이션 바 상단 10px 간격) */}
      {todayRecordings.length > 1 && (
        <View style={styles.pageIndicatorContainer}>
          <Svg width="75" height="14" viewBox="0 0 75 14" fill="none">
            {todayRecordings.map((_, index) => {
              if (index === 0) {
                // 첫 번째 페이지
                return (
                  <Circle 
                    key={index} 
                    cx={7} 
                    cy={7} 
                    r={7} 
                    fill={currentPageIndex === index ? "#CECECE" : "#2C2C2C"}
                  />
                );
              } else if (index === todayRecordings.length - 1) {
                // 마지막 페이지 (타원)
                return (
                  <Ellipse
                    key={index}
                    cx={67.5}
                    cy={7}
                    rx={7.5}
                    ry={7}
                    fill={currentPageIndex === index ? "#CECECE" : "#2C2C2C"}
                  />
                );
              } else {
                // 중간 페이지
                return (
                  <Circle 
                    key={index} 
                    cx={37} 
                    cy={7} 
                    r={7} 
                    fill={currentPageIndex === index ? "#CECECE" : "#2C2C2C"}
                  />
                );
              }
            })}
          </Svg>
        </View>
      )}

      <NavigationBar 
        onNavigateToRecords={() => navigation.navigate('Records')} 
        onNavigateToRecording={() => navigation.navigate('Recording')} 
        onNavigateToProfile={() => navigation.navigate('Profile')} 
        onNavigateToFeed={() => navigation.navigate('Feed')}
        onNavigateToArchive={() => navigation.navigate('Archive')}
        currentPage="Records" 
      />

      {/* 삭제 확인 모달 */}
      <DeleteConfirmModal
        visible={showDeleteModal}
        onConfirm={handleDeleteRecording}
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
  },
  frame: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 390,
    height: 844,
    backgroundColor: '#0A0A0A',
  },
  weekContainer: {
    position: 'absolute',
    left: 24,
    top: 118, // 헤더 아래부터 시작 (헤더 높이 66px + 여유 52px = 118px)
    width: 345,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end', // 하단 정렬로 변경
    zIndex: 10, // 캐릭터 위에 표시되도록
  },
  dayItem: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: 38,
    height: 70,
    position: 'relative',
  },
  recordDot: {
    position: 'absolute',
    top: 0,
    left: '50%',
    marginLeft: -3,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#B780FF',
  },
  dayBorder: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#9A9A9A',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  noBorder: {
    borderWidth: 0,
    borderColor: 'transparent',
  },
  selectedDay: {
    backgroundColor: '#B780FF',
    borderColor: '#B780FF',
  },
  recordDay: {
    borderWidth: 2,
    borderColor: '#B780FF',
    backgroundColor: 'transparent',
  },
  dayLabel: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '500',
    letterSpacing: 0.4,
    marginTop: 10,
    marginBottom: 8,
  },
  dayNumber: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '500',
    letterSpacing: 0.48,
  },
  selectedDayNumber: {
    color: '#0A0A0A',
  },
  emptyStateContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyStateTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.56,
    textAlign: 'center',
    marginBottom: 32,
  },
  emptyStateTitleToday: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.56,
    textAlign: 'center',
    marginBottom: 16, // 버튼과의 간격
  },
  recordButton: {
    backgroundColor: '#B780FF',
    borderRadius: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignSelf: 'center', // 버튼을 가운데 정렬
    height: 46,
  },
  recordButtonText: {
    color: '#0A0A0A',
    textAlign: 'center',
    fontFamily: 'Pretendard',
    fontSize: 22,
    fontStyle: 'normal',
    fontWeight: '600',
    lineHeight: undefined, // React Native에서 normal과 동일
    letterSpacing: 0.44,
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
    top: 162, // 화면 기준 top: 480이 되도록 (480 - 318 = 162)
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
    height: 856.632, // 슬픔일 때 높이 증가
    overflow: 'hidden',
  },
  sadCharacterBackground: {
    position: 'absolute',
    left: -1, // Figma 기준: left: -1px (container 기준)
    top: 0,
    width: 395.049,
    height: 856.632,
    borderRadius: 24.95,
    backgroundColor: '#47AFF4',
  },
  sadCharacterWrapper: {
    position: 'absolute',
    top: 55, // Figma 기준: top: 373px - container top 318px = 55px
    width: 393, // SVG viewBox width
    height: 534, // SVG viewBox height
    justifyContent: 'center',
    alignItems: 'center',
  },
  excitedEmotionCharacterContainer: {
    position: 'absolute',
    left: -188, // 더 왼쪽으로 이동 (슬픔 캐릭터 left: -1보다 20px 더 왼쪽)
    top: 298, // 더 위로 이동 (기존 318에서 20px 위로)
    width: 598,
    height: 640, // 신남일 때 높이 (640 viewBox)
    overflow: 'hidden',
  },
  excitedCharacterWrapper: {
    position: 'absolute',
    top: -10, // 더 위로 이동
    left: -21, // 더 왼쪽으로 이동
    width: 640, // SVG viewBox width
    height: 640, // SVG viewBox height
    justifyContent: 'center',
    alignItems: 'center',
  },
  surpriseCharacterWrapper: {
    position: 'absolute',
    top: 0,
    left: -138,
    width: 598,
    height: 598,
    justifyContent: 'center',
    alignItems: 'center',
  },
  characterContainerSmall: {
    position: 'absolute',
    left: 111, // Figma 기준: left: 111px
    top: 617, // Figma 기준: top: 617px
    width: 178,
    height: 178,
    overflow: 'visible', // 눈이 잘리지 않도록
  },
  scrollView: {
    flex: 1,
  },
  topScreen: {
    width: '100%',
    height: 844, // 첫 번째 화면 높이 (정확히 844px)
    position: 'relative',
  },
  bottomScreen: {
    width: '100%',
    height: 844, // 두 번째 화면 높이 (정확히 844px)
    position: 'relative',
    backgroundColor: '#0A0A0A',
    overflow: 'hidden', // 넘치는 내용 숨김
    justifyContent: 'flex-start',
    paddingTop: 118, // 헤더 아래부터 시작 (Figma 기준: 헤더 top 66px + 헤더 높이 약 52px = 118px)
  },
  userInfoContainer: {
    paddingHorizontal: 24,
    paddingTop: 0, // bottomScreen의 paddingTop으로 간격 조정
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
  uploadButton: {
    backgroundColor: '#B780FF',
    borderRadius: 50,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  uploadButtonText: {
    color: '#0B0B0C',
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  scrollContent: {
    // 두 화면이 정확히 이어지도록 (844 + 844 = 1688px)
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 30, // 사용자 정보 영역과의 간격 (Figma 기준으로 줄임)
    maxHeight: 500, // 최대 높이 제한 (버튼 영역을 위한 공간 확보: 844 - 30(userInfo) - 132(button) - 60(button height) - 122(여유) = 약 500px)
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
  pageIndicatorContainer: {
    position: 'absolute',
    bottom: 92, // 네비게이션 바(bottom: 24, height: 58) 상단에서 10px 간격 = 24 + 58 + 10 = 92
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000, // 네비게이션 바와 같은 z-index로 고정
  },
  contentText: {
    color: '#FFFFFF',
    fontSize: 40,
    fontWeight: '600',
    letterSpacing: 1.6,
    lineHeight: 56,
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
  buttonContainer: {
    position: 'absolute',
    bottom: 132, // 두 번째 화면 하단에서 132 떨어진 위치
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
  debugText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginTop: 10,
    textAlign: 'center',
  },
});

export default RecordsScreen;

