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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import Svg, { Path, Circle, G, Mask } from 'react-native-svg';

import { useApp } from '../../contexts/AppContext';
import NavigationBar from '../../components/NavigationBar';
import Header from '../../components/Header';
import { getRecordings, getUserFromStorage, Recording, getAudioUrl } from '../../services/api';

// iPhone 15, 15 Pro 크기 기준
const screenWidth = 390;
const screenHeight = 844;

type RecordsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Records'>;

interface WeekDay {
  dayLabel: string;
  dayNumber: number;
  date: Date;
  dateString: string; // YYYY-MM-DD 형식
}

const RecordsScreen: FC = () => {
  const navigation = useNavigation<RecordsScreenNavigationProp>();
  const { isOnboardingCompleted } = useApp();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const audioRef = useRef<any>(null); // HTMLAudioElement 또는 React Native Audio
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  // 선택한 날짜의 첫 번째 녹음 (감정이 기쁨인 경우)
  const joyRecording = useMemo(() => {
    return selectedDateRecordings.find(rec => rec.emotion === '기쁨') || null;
  }, [selectedDateRecordings]);

  // 해당 날짜에 기록이 있는지 확인
  const hasRecording = (dateString: string): boolean => {
    const hasRecord = recordings.some(rec => {
      const recDate = new Date(rec.recorded_at);
      const recDateString = `${recDate.getFullYear()}-${String(recDate.getMonth() + 1).padStart(2, '0')}-${String(recDate.getDate()).padStart(2, '0')}`;
      return recDateString === dateString;
    });
    return hasRecord;
  };

  // 선택한 날짜가 변경될 때 selectedRecording 업데이트 (감정이 기쁨인 녹음 우선)
  useEffect(() => {
    console.log('\n=== 선택한 날짜 변경 ===');
    console.log('선택한 날짜:', selectedDate);
    console.log('선택한 날짜의 녹음 개수:', selectedDateRecordings.length);
    console.log('기쁨 감정 녹음:', joyRecording);
    
    if (joyRecording) {
      console.log('기쁨 감정 녹음 선택됨:', joyRecording);
      console.log('감정 값:', joyRecording.emotion);
      console.log('감정이 기쁨인가?', joyRecording.emotion === '기쁨');
      setSelectedRecording(joyRecording);
    } else if (selectedDateRecordings.length > 0) {
      console.log('첫 번째 녹음 선택됨:', selectedDateRecordings[0]);
      console.log('감정:', selectedDateRecordings[0].emotion);
      setSelectedRecording(selectedDateRecordings[0]);
    } else {
      console.log('녹음 없음');
      setSelectedRecording(null);
    }
  }, [selectedDateRecordings, joyRecording, selectedDate]);

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

  // 키워드 강조를 위한 텍스트 렌더링
  const renderHighlightedText = (text: string, keywords: string[]) => {
    if (!keywords || keywords.length === 0) {
      return <Text style={styles.contentText}>{text}</Text>;
    }

    const parts: Array<{ text: string; isKeyword: boolean }> = [];
    let lastIndex = 0;
    const keywordPattern = new RegExp(`(${keywords.join('|')})`, 'g');
    let match;

    while ((match = keywordPattern.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ text: text.substring(lastIndex, match.index), isKeyword: false });
      }
      parts.push({ text: match[0], isKeyword: true });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push({ text: text.substring(lastIndex), isKeyword: false });
    }

    return (
      <Text style={styles.contentText}>
        {parts.map((part, index) => (
          <Text
            key={index}
            style={part.isKeyword ? styles.keywordText : styles.normalText}
          >
            {part.text}
          </Text>
        ))}
      </Text>
    );
  };

  // 녹음 데이터 로드
  useEffect(() => {
    const loadRecordings = async () => {
      try {
        setLoading(true);
        const userInfo = getUserFromStorage();
        if (userInfo) {
          console.log('=== 녹음 데이터 로드 시작 ===');
          console.log('사용자 정보:', userInfo);
          const response = await getRecordings({ userId: userInfo.id });
          console.log('녹음 데이터 응답:', response);
          if (response.success) {
            console.log('로드된 녹음 개수:', response.recordings.length);
            console.log('=== 모든 녹음 데이터 상세 정보 ===');
            response.recordings.forEach((rec, index) => {
              console.log(`\n[녹음 ${index + 1}]`);
              console.log('  ID:', rec.id);
              console.log('  사용자 ID:', rec.user_id);
              console.log('  내용:', rec.content);
              console.log('  키워드:', rec.keywords);
              console.log('  감정:', rec.emotion);
              console.log('  감정 타입:', typeof rec.emotion);
              console.log('  녹음 파일:', rec.audio_file);
              console.log('  녹음 시간:', rec.recorded_at);
              console.log('  하이라이트 시간:', rec.highlight_time);
              const recDate = new Date(rec.recorded_at);
              const recDateString = `${recDate.getFullYear()}-${String(recDate.getMonth() + 1).padStart(2, '0')}-${String(recDate.getDate()).padStart(2, '0')}`;
              console.log('  날짜 문자열:', recDateString);
            });
            console.log('\n=== 선택한 날짜의 녹음 필터링 ===');
            const selectedDateString = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
            console.log('선택한 날짜:', selectedDateString);
            const filtered = response.recordings.filter(rec => {
              const recDate = new Date(rec.recorded_at);
              const recDateString = `${recDate.getFullYear()}-${String(recDate.getMonth() + 1).padStart(2, '0')}-${String(recDate.getDate()).padStart(2, '0')}`;
              return recDateString === selectedDateString;
            });
            console.log('필터링된 녹음 개수:', filtered.length);
            filtered.forEach((rec, index) => {
              console.log(`\n[선택한 날짜의 녹음 ${index + 1}]`);
              console.log('  감정:', rec.emotion);
              console.log('  감정이 기쁨인가?', rec.emotion === '기쁨');
            });
            setRecordings(response.recordings);
          }
        } else {
          console.log('사용자 정보가 없습니다.');
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
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* 배경 프레임 */}
      <View style={styles.frame} />

      {/* 상단 헤더 */}
      <Header currentScreen="Records" />

      {/* 이번주 날짜 표시 */}
      <View style={styles.weekContainer}>
        {weekDays.map((day, index) => {
          const today = isToday(day.date);
          const selected = isSelected(day.date);
          const hasRecord = hasRecording(day.dateString);
          
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
                  setSelectedDate(day.date);
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

      {/* 메인 콘텐츠 영역 */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {selectedRecording && selectedRecording.emotion === '기쁨' ? (
          <>
            {/* 감정이 기쁨일 때 캐릭터 표시 */}
            <View style={styles.characterContainer}>
              <Svg width="598" height="453" viewBox="0 0 393 453" fill="none">
                <Path
                  d="M496 299C496 464.133 362.133 452.829 197 452.829C31.8669 452.829 -102 464.133 -102 299C-102 133.867 31.8669 0 197 0C362.133 0 496 133.867 496 299Z"
                  fill="#FED046"
                />
              </Svg>
            </View>

            {/* 녹음 내용 (키워드 강조) */}
            <View style={styles.contentContainer}>
              {renderHighlightedText(
                selectedRecording.content,
                selectedRecording.keywords || []
              )}
            </View>

            {/* 하단 버튼 영역 */}
            <View style={styles.buttonContainer}>
              {/* 하이라이트 버튼 */}
              <TouchableOpacity
                style={styles.highlightButton}
                onPress={() => {
                  const highlightTime = parseHighlightTime(selectedRecording.highlight_time);
                  playAudio(highlightTime);
                }}
                onLongPress={() => {
                  // 하이라이트 수정 화면으로 이동 (추후 구현)
                  console.log('하이라이트 수정 화면으로 이동');
                }}
                delayLongPress={1000}
              >
                <View style={styles.starIcon}>
                  <Text style={styles.starText}>⭐</Text>
                </View>
              </TouchableOpacity>

              {/* 재생 버튼 */}
              <TouchableOpacity
                style={styles.playButton}
                onPress={() => {
                  if (isPlaying) {
                    stopAudio();
                  } else {
                    playAudio();
                  }
                }}
              >
                <Text style={styles.playButtonText}>
                  {isPlaying ? '⏸' : '▶'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        ) : selectedDateRecordings.length === 0 ? (
          /* 녹음이 없을 때의 상태 */
          isPastDate(selectedDate) ? (
            /* 지나간 날짜인데 기록이 없을 때 */
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyStateTitle} numberOfLines={1}>녹음이 없어요</Text>
              {/* 캐릭터 표시 */}
              <View style={styles.characterContainerSmall}>
                <Svg width="178" height="178" viewBox="0 0 178 178" fill="none">
                  <Circle cx="89" cy="89" r="89" fill="#FED046"/>
                  <Circle cx="67" cy="33" r="18" transform="rotate(90 67 33)" fill="#F5F5F5"/>
                  <Circle cx="104.532" cy="33" r="18" transform="rotate(90 104.532 33)" fill="#F5F5F5"/>
                  <Mask id="mask0_3250_4914" maskType="alpha" maskUnits="userSpaceOnUse" x="49" y="15" width="36" height="36">
                    <Circle cx="67" cy="33" r="18" transform="rotate(90 67 33)" fill="#F5F5F5"/>
                  </Mask>
                  <G mask="url(#mask0_3250_4914)">
                    <Circle cx="66.9989" cy="18.0011" r="18.0011" transform="rotate(90 66.9989 18.0011)" fill="#0A0A0A"/>
                  </G>
                  <Mask id="mask1_3250_4914" maskType="alpha" maskUnits="userSpaceOnUse" x="86" y="15" width="37" height="36">
                    <Circle cx="104.532" cy="33" r="18" transform="rotate(90 104.532 33)" fill="#F5F5F5"/>
                  </Mask>
                  <G mask="url(#mask1_3250_4914)">
                    <Circle cx="104.531" cy="17.9879" r="18.0011" transform="rotate(90 104.531 17.9879)" fill="#0A0A0A"/>
                  </G>
                  <Path d="M81 53C81 58.3614 90.6506 58.6295 90.6506 53" stroke="#0A0A0A" strokeWidth="2.57207" strokeLinecap="round"/>
                  <Path d="M62.7257 39.4509C61.2072 39.4509 59.7509 38.8477 58.6772 37.774C57.6035 36.7002 57.0003 35.2439 57.0003 33.7255C57.0003 32.207 57.6035 30.7507 58.6772 29.6769C59.7509 28.6032 61.2072 28 62.7257 28L62.7257 33.7255L62.7257 39.4509Z" fill="#F5F5F5"/>
                  <Path d="M102.726 39.4509C101.207 39.4509 99.7509 38.8477 98.6772 37.774C97.6035 36.7002 97.0003 35.2439 97.0003 33.7255C97.0003 32.207 97.6035 30.7507 98.6772 29.6769C99.7509 28.6032 101.207 28 102.726 28L102.726 33.7255L102.726 39.4509Z" fill="#F5F5F5"/>
                </Svg>
              </View>
            </View>
          ) : isFutureDate(selectedDate) ? (
            /* 미래 날짜는 기록 불가 */
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyStateTitle} numberOfLines={1}>미래 날짜에는 기록할 수 없어요</Text>
            </View>
          ) : (
            /* 오늘 날짜인데 기록이 없을 때 */
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyStateTitle} numberOfLines={1}>오늘 첫 녹음을 남겨보세요</Text>
              {/* 캐릭터 표시 */}
              <View style={styles.characterContainerSmall}>
                <Svg width="178" height="178" viewBox="0 0 178 178" fill="none" style={{ overflow: 'visible' }}>
                  <Circle cx="89" cy="89" r="89" fill="#FED046"/>
                  <Circle cx="67" cy="33" r="18" transform="rotate(90 67 33)" fill="#F5F5F5"/>
                  <Circle cx="104.532" cy="33" r="18" transform="rotate(90 104.532 33)" fill="#F5F5F5"/>
                  <Mask id="mask0_1_4041" maskType="alpha" maskUnits="userSpaceOnUse" x="49" y="10" width="36" height="46">
                    <Circle cx="67" cy="33" r="18" transform="rotate(90 67 33)" fill="#F5F5F5"/>
                  </Mask>
                  <G mask="url(#mask0_1_4041)">
                    <Circle cx="66.9989" cy="18.0011" r="18.0011" transform="rotate(90 66.9989 18.0011)" fill="#0A0A0A"/>
                  </G>
                  <Mask id="mask1_1_4041" maskType="alpha" maskUnits="userSpaceOnUse" x="86" y="10" width="37" height="46">
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
              <TouchableOpacity style={styles.recordButton} onPress={() => navigation.navigate('Recording')}>
                <Text style={styles.recordButtonText}>녹음하러 가기</Text>
              </TouchableOpacity>
            </View>
          )
        ) : (
          /* 다른 감정의 녹음이 있을 때 */
          <View style={styles.emptyStateContainer}>
            <Text style={styles.emptyStateTitle} numberOfLines={1}>이 날짜에는 기쁨 감정의 녹음이 없습니다</Text>
            <Text style={styles.debugText}>
              현재 녹음 감정: {selectedRecording?.emotion || '없음'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* 하단 네비게이션 바 */}
      <NavigationBar 
        onNavigateToRecords={() => navigation.navigate('Records')} 
        onNavigateToRecording={() => navigation.navigate('Recording')} 
        onNavigateToProfile={() => navigation.navigate('Profile')} 
        currentPage="Records" 
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
    width: 390,
    height: 844,
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
    borderWidth: 1.5,
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
    borderWidth: 1.5,
    borderColor: '#B780FF',
    backgroundColor: 'transparent',
  },
  dayLabel: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '500',
    letterSpacing: 0.4,
    marginTop: 16, // 점(6px) + 간격(10px) = 16px
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
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 100,
    paddingBottom: 200,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 400,
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
  characterContainer: {
    position: 'relative',
    width: 598,
    height: 453,
    alignSelf: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  characterContainerSmall: {
    position: 'absolute',
    left: '50%',
    marginLeft: -89, // 캐릭터 너비의 절반 (178 / 2 = 89)
    top: 417, // 탑에서 417 떨어진 위치
    width: 178,
    height: 178,
    overflow: 'visible', // 눈이 잘리지 않도록
  },
  scrollView: {
    flex: 1,
    marginTop: 200,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    marginTop: 20,
  },
  contentText: {
    color: '#FFFFFF',
    fontSize: 40,
    fontWeight: '600',
    lineHeight: 60,
    letterSpacing: 1.6,
  },
  keywordText: {
    backgroundColor: '#FFD630',
    color: '#000000',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  normalText: {
    color: '#FFFFFF',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    gap: 20,
  },
  highlightButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#B780FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  starIcon: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  starText: {
    fontSize: 24,
  },
  playButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#B780FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonText: {
    fontSize: 24,
    color: '#0A0A0A',
  },
  debugText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginTop: 10,
    textAlign: 'center',
  },
});

export default RecordsScreen;

