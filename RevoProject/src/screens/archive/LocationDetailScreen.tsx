import { FC, useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import Svg, { Circle, Ellipse, Path, G, Mask, Line, Rect, ClipPath, Defs } from 'react-native-svg';

import { useApp } from '../../contexts/AppContext';
import NavigationBar from '../../components/NavigationBar';
import Header from '../../components/Header';
import { getRecordings, getUserFromStorage, Recording } from '../../services/api';

// iPhone 15, 15 Pro 크기 기준
const screenWidth = 390;
const screenHeight = 844;

type LocationDetailScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'LocationDetail'>;
type LocationDetailScreenRouteProp = RouteProp<RootStackParamList, 'LocationDetail'>;

const LocationDetailScreen: FC = () => {
  const navigation = useNavigation<LocationDetailScreenNavigationProp>();
  const route = useRoute<LocationDetailScreenRouteProp>();
  const { isOnboardingCompleted } = useApp();
  
  const district = route.params?.district || '';
  const viewMode = route.params?.viewMode || 'monthly';
  
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);

  // 현재 월 계산
  const currentMonth = useMemo(() => {
    const now = new Date();
    return now.getMonth() + 1; // 1-12
  }, []);

  // 해당 장소의 기록만 필터링
  const locationRecordings = useMemo(() => {
    let filtered = recordings.filter(rec => rec.district === district);
    
    // 월별 모드인 경우 현재 월의 기록만 필터링
    if (viewMode === 'monthly') {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      
      filtered = filtered.filter(rec => {
        const recDate = new Date(rec.recorded_at);
        return recDate.getFullYear() === currentYear && recDate.getMonth() + 1 === currentMonth;
      });
    }
    
    return filtered;
  }, [recordings, district, viewMode]);

  // 현재 슬라이드의 기록 데이터
  const currentRecording = useMemo(() => {
    if (locationRecordings.length === 0) return null;
    return locationRecordings[currentSlideIndex] || locationRecordings[0];
  }, [locationRecordings, currentSlideIndex]);

  // 기록 데이터 로드
  useEffect(() => {
    const loadRecordings = async () => {
      try {
        const user = await getUserFromStorage();
        if (user) {
          const response = await getRecordings(user.id);
          if (response.success && response.recordings) {
            setRecordings(response.recordings);
          }
        }
      } catch (error) {
        console.error('기록 로드 오류:', error);
      } finally {
        setLoading(false);
      }
    };
    loadRecordings();
  }, []);

  // 감정 색상 가져오기 함수
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

  // 감정별 캐릭터 렌더링 함수 (RecordsScreen/FeedScreen 스타일, 219x219 사이즈)
  const renderEmotionCharacter = (emotion: string | null | undefined) => {
    if (!emotion) return null;

    const emotionColor = getEmotionColor(emotion);

    // 슬픔 캐릭터 (사각형 배경)
    if (emotion === '슬픔') {
      return (
        <View style={styles.sadCharacterWrapper}>
          <View style={[styles.sadCharacterBackground, { backgroundColor: emotionColor }]} />
          <Svg width="219" height="219" viewBox="0 0 393 534" fill="none" style={{ width: '100%', height: '100%' }}>
            <circle cx="140.233" cy="108.908" r="53.9077" fill="#F5F5F5"/>
            <circle cx="252.631" cy="108.908" r="53.9077" fill="#F5F5F5"/>
            <path d="M100.777 133.678H124.919C133.755 133.678 140.919 140.842 140.919 149.678V321.6C140.919 330.437 133.755 337.6 124.919 337.6H116.777C107.94 337.6 100.777 330.437 100.777 321.6V133.678Z" fill="#F5F5F5"/>
            <Mask id="mask0_sad_location" maskType="alpha" maskUnits="userSpaceOnUse" x="86" y="55" width="109" height="108">
              <Circle cx="140.232" cy="108.908" r="53.9077" fill="#F5F5F5"/>
            </Mask>
            <G mask="url(#mask0_sad_location)">
              <Circle cx="95.8028" cy="108.911" r="53.9108" fill="#0A0A0A"/>
            </G>
            <Mask id="mask1_sad_location" maskType="alpha" maskUnits="userSpaceOnUse" x="198" y="55" width="109" height="108">
              <Circle cx="252.631" cy="108.908" r="53.9077" fill="#F5F5F5"/>
            </Mask>
            <G mask="url(#mask1_sad_location)">
              <Circle cx="204.988" cy="108.911" r="53.9108" fill="#0A0A0A"/>
            </G>
            <Rect x="254.921" y="144.918" width="32.9243" height="95.7798" rx="16.4621" fill="#F5F5F5"/>
            <Path d="M211.568 174.927C211.568 158.87 182.666 158.067 182.666 174.927" stroke="#0A0A0A" strokeWidth="8.02842" strokeLinecap="round"/>
            <Path d="M153.88 120.03C153.88 123.65 152.44 127.121 149.88 129.681C147.32 132.241 143.83 133.678 140.23 133.678C136.61 133.678 133.14 132.241 130.58 129.681C128.02 127.121 126.58 123.65 126.58 120.03L140.23 120.03H153.88Z" fill="#F5F5F5"/>
            <Path d="M266.28 120.03C266.28 123.65 264.84 127.121 262.28 129.681C259.72 132.24 256.25 133.678 252.63 133.678C249.01 133.678 245.54 132.24 242.98 129.681C240.42 127.121 238.98 123.65 238.98 120.03L252.63 120.03H266.28Z" fill="#F5F5F5"/>
          </Svg>
        </View>
      );
    }

    // 신남 캐릭터 (별 모양 배경)
    if (emotion === '신남') {
      return (
        <View style={styles.excitedCharacterWrapper}>
          <Svg width="219" height="219" viewBox="0 0 640 640" fill="none" style={{ width: '100%', height: '100%' }}>
            <Path d="M315.663 17.6931C316.625 13.4338 322.694 13.4338 323.657 17.6931L365.107 201.195C365.73 203.956 368.898 205.268 371.291 203.757L530.357 103.311C534.049 100.98 538.34 105.271 536.009 108.963L435.563 268.029C434.052 270.422 435.364 273.589 438.124 274.213L621.627 315.663C625.886 316.625 625.886 322.694 621.627 323.657L438.124 365.107C435.364 365.73 434.052 368.898 435.563 371.291L536.009 530.357C538.34 534.049 534.049 538.34 530.357 536.009L371.291 435.563C368.898 434.052 365.73 435.364 365.107 438.124L323.657 621.627C322.694 625.886 316.625 625.886 315.663 621.627L274.213 438.124C273.589 435.364 270.422 434.052 268.029 435.563L108.963 536.009C105.271 538.34 100.98 534.049 103.311 530.357L203.757 371.291C205.268 368.898 203.956 365.73 201.195 365.107L17.6931 323.657C13.4338 322.694 13.4338 316.625 17.6931 315.663L201.195 274.213C203.956 273.589 205.268 270.422 203.757 268.029L103.311 108.963C100.98 105.271 105.271 100.98 108.963 103.311L268.029 203.757C270.422 205.268 273.589 203.956 274.213 201.195L315.663 17.6931Z" fill={emotionColor}/>
            <Circle cx="260.594" cy="263.941" r="56.5281" fill="#F5F5F5"/>
            <Circle cx="378.455" cy="263.941" r="56.5281" fill="#F5F5F5"/>
            <Mask id="mask0_excited_location" maskType="alpha" maskUnits="userSpaceOnUse" x="204" y="207" width="114" height="114">
              <Circle cx="260.594" cy="263.941" r="56.5281" fill="#F5F5F5"/>
            </Mask>
            <G mask="url(#mask0_excited_location)">
              <Circle cx="210.164" cy="263.944" r="56.5314" fill="#0A0A0A"/>
            </G>
            <Mask id="mask1_excited_location" maskType="alpha" maskUnits="userSpaceOnUse" x="321" y="207" width="114" height="114">
              <Circle cx="378.455" cy="263.941" r="56.5281" fill="#F5F5F5"/>
            </Mask>
            <G mask="url(#mask1_excited_location)">
              <Circle cx="328.025" cy="263.944" r="56.5314" fill="#0A0A0A"/>
            </G>
            <Path d="M282.977 274.6165C282.977 278.4115 281.364 282.5713 278.493 285.4425C275.622 288.3137 271.728 289.9268 267.667 289.9268C263.607 289.9268 259.712 288.3137 256.841 285.4425C253.9699 282.5713 252.3569 278.6771 252.3569 274.6165L267.667 274.6165H282.977Z" fill="#F5F5F5"/>
            <Path d="M400.839 274.6165C400.839 278.4115 399.227 282.5713 396.356 285.4425C393.485 288.3137 389.591 289.9268 385.53 289.9268C381.47 289.9268 377.575 288.3137 374.704 285.4425C371.833 282.5713 370.22 278.6771 370.22 274.6165L385.53 274.6165H400.839Z" fill="#F5F5F5"/>
            <Mask id="path-10-inside-1_excited_location" fill="white">
              <Path d="M331.686 313.371C326.698 328.308 314.998 337.86 305.554 334.707C296.11 331.553 292.497 316.887 297.485 301.95L297.485 301.948L331.686 313.369L331.686 313.371Z"/>
            </Mask>
            <Path d="M331.686 313.371C326.698 328.308 314.998 337.86 305.554 334.707C296.11 331.553 292.497 316.887 297.485 301.95L297.485 301.948L331.686 313.369L331.686 313.371Z" fill="#0A0A0A"/>
            <Path d="M331.686 313.371L333.629 314.02L333.629 314.02L331.686 313.371ZM305.554 334.707L304.905 336.65L304.905 336.65L305.554 334.707ZM297.485 301.95L295.542 301.301L295.542 301.301L297.485 301.95ZM297.485 301.948L298.134 300.005L296.191 299.356L295.542 301.299L297.485 301.948ZM331.686 313.369L333.63 314.018L334.278 312.075L332.335 311.426L331.686 313.369ZM331.686 313.371L329.743 312.722C327.352 319.88 323.38 325.656 318.995 329.236C314.587 332.836 310.024 334.04 306.203 332.764L305.554 334.707L304.905 336.65C310.528 338.528 316.537 336.532 321.587 332.41C326.659 328.268 331.031 321.798 333.629 314.02L331.686 313.371ZM305.554 334.707L306.203 332.764C302.382 331.488 299.458 327.784 298.096 322.257C296.742 316.761 297.037 309.757 299.428 302.599L297.485 301.95L295.542 301.301C292.944 309.08 292.551 316.878 294.118 323.237C295.677 329.567 299.282 334.772 304.905 336.65L305.554 334.707ZM297.485 301.95L299.428 302.599L299.429 302.597L297.485 301.948L295.542 301.299L295.542 301.301L297.485 301.95ZM297.485 301.948L296.836 303.891L331.038 315.312L331.686 313.369L332.335 311.426L298.134 300.005L297.485 301.948ZM331.686 313.369L329.743 312.72L329.743 312.722L331.686 313.371L333.629 314.02L333.63 314.018L331.686 313.369Z" fill="black" mask="url(#path-10-inside-1_excited_location)"/>
          </Svg>
        </View>
      );
    }

    // 놀람 캐릭터
    if (emotion === '놀람') {
      return (
        <View style={styles.surpriseCharacterWrapper}>
          <Svg width="219" height="219" viewBox="104 112 711 676" fill="none" style={{ width: '100%', height: '100%' }}>
            <G clipPath="url(#clip0_surprise_location)">
              <Path d="M356.24 212.801C388.742 112.771 530.258 112.771 562.76 212.801C577.295 257.536 618.983 287.824 666.02 287.824C771.198 287.824 814.929 422.414 729.838 484.236C691.784 511.883 675.861 560.89 690.396 605.625C722.898 705.655 608.409 788.836 523.318 727.014C485.264 699.367 433.736 699.367 395.682 727.014C310.591 788.836 196.102 705.655 228.604 605.625C243.139 560.89 227.216 511.883 189.162 484.236C104.071 422.414 147.802 287.824 252.98 287.824C300.017 287.824 341.705 257.536 356.24 212.801Z" fill={emotionColor}/>
              <Mask id="path-2-inside-1_surprise_location" fill="white">
                <Path d="M459.853 419.084C455.762 403.817 460.271 389.344 469.923 386.758C479.576 384.171 490.717 394.451 494.807 409.718L494.808 409.719L459.853 419.085L459.853 419.084Z"/>
              </Mask>
              <Path d="M459.853 419.084C455.762 403.817 460.271 389.344 469.923 386.758C479.576 384.171 490.717 394.451 494.807 409.718L494.808 409.719L459.853 419.085L459.853 419.084Z" fill="#0A0A0A"/>
              <Path d="M469.923 386.758L469.035 383.444L469.035 383.444L469.923 386.758ZM494.808 409.719L495.695 413.032L499.009 412.144L498.121 408.831L494.808 409.719ZM459.853 419.085L456.54 419.973L457.427 423.286L460.741 422.398L459.853 419.085ZM459.853 419.084L463.167 418.196C461.263 411.092 461.409 404.326 463.01 399.186C464.626 393.997 467.521 390.953 470.811 390.071L469.923 386.758L469.035 383.444C462.673 385.149 458.488 390.635 456.459 397.146C454.416 403.705 454.352 411.81 456.539 419.972L459.853 419.084ZM469.923 386.758L470.811 390.071C474.101 389.19 478.13 390.379 482.125 394.064C486.081 397.715 489.59 403.501 491.494 410.606L494.807 409.718L498.121 408.83C495.934 400.668 491.827 393.681 486.777 389.022C481.765 384.397 475.398 381.739 469.035 383.444L469.923 386.758ZM494.807 409.718L491.494 410.606L491.494 410.607L494.808 409.719L498.121 408.831L498.121 408.83L494.807 409.718ZM494.808 409.719L493.92 406.405L458.965 415.771L459.853 419.085L460.741 422.398L495.695 413.032L494.808 409.719ZM459.853 419.085L463.167 418.197L463.167 418.196L459.853 419.084L456.539 419.972L456.54 419.973L459.853 419.085Z" fill="black" mask="url(#path-2-inside-1_surprise_location)"/>
              <Circle cx="55.9859" cy="55.9859" r="55.9859" transform="matrix(-1 0 0 1 585.338 295.333)" fill="#F5F5F5"/>
              <Circle cx="55.9859" cy="55.9859" r="55.9859" transform="matrix(-1 0 0 1 468.607 295.332)" fill="#F5F5F5"/>
              <Mask id="mask0_surprise_location" maskType="alpha" maskUnits="userSpaceOnUse" x="473" y="295" width="113" height="113">
                <Circle cx="55.9859" cy="55.9859" r="55.9859" transform="matrix(-1 0 0 1 585.338 295.332)" fill="#F5F5F5"/>
              </Mask>
              <G mask="url(#mask0_surprise_location)">
                <Circle cx="55.9891" cy="55.9891" r="55.9891" transform="matrix(-1 0 0 1 632.03 295.332)" fill="#0A0A0A"/>
              </G>
              <Mask id="mask1_surprise_location" maskType="alpha" maskUnits="userSpaceOnUse" x="356" y="295" width="113" height="113">
                <Circle cx="55.9859" cy="55.9859" r="55.9859" transform="matrix(-1 0 0 1 468.607 295.332)" fill="#F5F5F5"/>
              </Mask>
              <G mask="url(#mask1_surprise_location)">
                <Circle cx="55.9891" cy="55.9891" r="55.9891" transform="matrix(-1 0 0 1 515.3 295.332)" fill="#0A0A0A"/>
              </G>
              <Path d="M515.629 361.202C515.629 364.961 517.123 368.566 519.781 371.225C522.439 373.883 526.045 375.376 529.804 375.376C533.563 375.376 537.169 373.883 539.827 371.225C542.485 368.566 543.978 364.961 543.978 361.202L529.804 361.202H515.629Z" fill="#F5F5F5"/>
              <Path d="M425.247 361.202C425.247 364.961 423.753 368.566 421.095 371.225C418.437 373.883 414.832 375.376 411.072 375.376C407.313 375.376 403.708 373.883 401.050 371.225C398.392 368.566 396.898 364.961 396.898 361.202L411.072 361.202H425.247Z" fill="#F5F5F5"/>
            </G>
            <Defs>
              <ClipPath id="clip0_surprise_location">
                <Rect x="104" y="112" width="711" height="676" fill="white"/>
              </ClipPath>
            </Defs>
          </Svg>
        </View>
      );
    }

    // 보통 캐릭터
    if (emotion === '보통') {
      return (
        <View style={styles.normalCharacterWrapper}>
          <Svg width="219" height="219" viewBox="0 0 632 632" fill="none" style={{ width: '100%', height: '100%' }}>
            <Path d="M295.13 15.1627C307.575 6.12142 324.425 6.12142 336.87 15.1627L595.664 203.188C608.108 212.229 613.316 228.255 608.562 242.884L509.712 547.116C504.958 561.745 491.326 571.649 475.944 571.649H156.056C140.674 571.649 127.042 561.745 122.288 547.116L23.4377 242.884C18.6844 228.255 23.8916 212.229 36.3358 203.188L295.13 15.1627Z" fill={emotionColor}/>
            <Line x1="301.071" y1="319.318" x2="330.929" y2="319.318" stroke="#0A0A0A" strokeWidth="8.29396" strokeLinecap="round"/>
            <Circle cx="55.7063" cy="55.7063" r="55.7063" transform="matrix(-1 0 0 1 429.988 177.291)" fill="#F5F5F5"/>
            <Circle cx="55.7063" cy="55.7063" r="55.7063" transform="matrix(-1 0 0 1 313.84 177.291)" fill="#F5F5F5"/>
            <Mask id="mask0_normal_location" maskType="alpha" maskUnits="userSpaceOnUse" x="318" y="177" width="112" height="112">
              <Circle cx="55.7063" cy="55.7063" r="55.7063" transform="matrix(-1 0 0 1 429.988 177.291)" fill="#F5F5F5"/>
            </Mask>
            <G mask="url(#mask0_normal_location)">
              <Circle cx="55.7095" cy="55.7095" r="55.7095" transform="matrix(-1 0 0 1 476.447 177.291)" fill="#0A0A0A"/>
            </G>
            <Mask id="mask1_normal_location" maskType="alpha" maskUnits="userSpaceOnUse" x="202" y="177" width="112" height="112">
              <Circle cx="55.7063" cy="55.7063" r="55.7063" transform="matrix(-1 0 0 1 313.84 177.291)" fill="#F5F5F5"/>
            </Mask>
            <G mask="url(#mask1_normal_location)">
              <Circle cx="55.7095" cy="55.7095" r="55.7095" transform="matrix(-1 0 0 1 360.299 177.291)" fill="#0A0A0A"/>
            </G>
            <Path d="M360.663 242.831C360.663 246.572 362.149 250.159 364.794 252.804C367.439 255.449 371.026 256.935 374.766 256.935C378.507 256.935 382.094 255.449 384.739 252.804C387.384 250.159 388.87 246.572 388.87 242.831L374.766 242.831H360.663Z" fill="#F5F5F5"/>
            <Path d="M244.514 242.831C244.514 246.572 246 250.159 248.645 252.804C251.29 255.449 254.877 256.935 258.618 256.935C262.358 256.935 265.945 255.449 268.59 252.804C271.235 250.159 272.721 246.572 272.721 242.831L258.618 242.831H244.514Z" fill="#F5F5F5"/>
          </Svg>
        </View>
      );
    }

    // 화남 캐릭터
    if (emotion === '화남') {
      return (
        <View style={styles.angryCharacterWrapper}>
          <Svg width="219" height="219" viewBox="0 0 791 557" fill="none" style={{ width: '100%', height: '100%' }}>
            <Path d="M419.629 535.046C412.208 545.738 396.689 546.544 388.2 536.679L24.6902 114.256C14.2364 102.108 21.6991 83.2169 37.633 81.4933L747.652 4.68908C764.609 2.85486 775.864 21.8074 766.139 35.8185L419.629 535.046Z" fill={emotionColor}/>
            <Path d="M412.686 268.128C412.686 248.933 378.136 247.973 378.136 268.128" stroke="#0A0A0A" strokeWidth="9.59736" strokeLinecap="round"/>
            <G clipPath="url(#clip0_angry_location)">
              <Path d="M396.885 188.442C396.885 196.905 395.218 205.285 391.98 213.104C388.741 220.922 383.994 228.026 378.01 234.01C372.026 239.994 364.922 244.741 357.104 247.98C349.285 251.218 340.905 252.885 332.442 252.885C323.98 252.885 315.6 251.218 307.781 247.98C299.963 244.741 292.859 239.994 286.875 234.01C280.891 228.026 276.144 220.922 272.905 213.104C269.667 205.285 268 196.905 268 188.442L332.442 188.442H396.885Z" fill="#F5F5F5"/>
              <Path d="M525.488 188.442C525.488 196.905 523.822 205.285 520.583 213.104C517.345 220.922 512.598 228.026 506.614 234.01C500.63 239.994 493.526 244.741 485.707 247.98C477.889 251.218 469.509 252.885 461.046 252.885C452.583 252.885 444.203 251.218 436.385 247.98C428.566 244.741 421.462 239.994 415.478 234.01C409.494 228.026 404.747 220.922 401.509 213.104C398.27 205.285 396.604 196.905 396.604 188.442L461.046 188.442H525.488Z" fill="#F5F5F5"/>
              <Path d="M372.622 189.025C372.622 194.318 371.579 199.56 369.553 204.45C367.528 209.341 364.559 213.784 360.815 217.527C357.072 221.27 352.629 224.24 347.738 226.265C342.848 228.291 337.606 229.334 332.313 229.334C327.019 229.334 321.778 228.291 316.887 226.265C311.997 224.24 307.553 221.27 303.81 217.527C300.067 213.784 297.098 209.341 295.072 204.45C293.047 199.56 292.004 194.318 292.004 189.025L332.313 189.025H372.622Z" fill="#0A0A0A"/>
              <Path d="M500.945 189.025C500.945 194.318 499.903 199.56 497.877 204.45C495.851 209.341 492.882 213.784 489.139 217.527C485.396 221.27 480.953 224.24 476.062 226.265C471.172 228.291 465.93 229.334 460.637 229.334C455.343 229.334 450.101 228.291 445.211 226.265C440.32 224.24 435.877 221.27 432.134 217.527C428.391 213.784 425.422 209.341 423.396 204.45C421.37 199.56 420.328 194.318 420.328 189.025L460.637 189.025H500.945Z" fill="#0A0A0A"/>
              <Path d="M308.308 203.658C308.308 207.985 306.589 212.135 303.53 215.195C300.47 218.254 296.32 219.973 291.993 219.973C287.666 219.973 283.516 218.254 280.456 215.195C277.396 212.135 275.677 207.985 275.677 203.658L291.993 203.658H308.308Z" fill="#F5F5F5"/>
              <Path d="M442.671 203.658C442.671 207.985 440.952 212.135 437.892 215.195C434.833 218.254 430.683 219.973 426.356 219.973C422.028 219.973 417.878 218.254 414.819 215.195C411.759 212.135 410.04 207.985 410.04 203.658L426.356 203.658H442.671Z" fill="#F5F5F5"/>
            </G>
            <Defs>
              <ClipPath id="clip0_angry_location">
                <Rect width="279" height="92" fill="white" transform="translate(256 169)"/>
              </ClipPath>
            </Defs>
          </Svg>
        </View>
      );
    }

    // 행복 캐릭터 및 기본 캐릭터 (원형 배경)
    return (
      <View style={styles.happyCharacterWrapper}>
        <View style={[styles.characterCircleBackground, { backgroundColor: emotionColor }]} />
        <Svg width="219" height="219" viewBox="0 0 337 138" fill="none" style={{ width: '100%', height: '100%' }}>
          <Circle cx="105.472" cy="69.472" r="60.4719" fill="#F5F5F5"/>
          <Circle cx="231.556" cy="69.472" r="60.4719" fill="#F5F5F5"/>
          <Mask id="mask0_happy_location" maskType="alpha" maskUnits="userSpaceOnUse" x="45" y="9" width="121" height="121">
            <Circle cx="105.472" cy="69.4719" r="60.4719" fill="#F5F5F5"/>
          </Mask>
          <G mask="url(#mask0_happy_location)">
            <Circle cx="55.0428" cy="69.4754" r="60.4755" fill="#0A0A0A"/>
          </G>
          <Mask id="mask1_happy_location" maskType="alpha" maskUnits="userSpaceOnUse" x="171" y="9" width="122" height="121">
            <Circle cx="231.557" cy="69.4719" r="60.4719" fill="#F5F5F5"/>
          </Mask>
          <G mask="url(#mask1_happy_location)">
            <Circle cx="181.126" cy="69.4754" r="60.4755" fill="#0A0A0A"/>
          </G>
          <Path d="M127.855 80.1475C127.855 84.208 126.242 88.1023 123.371 90.9735C120.5 93.8447 116.606 95.4578 112.545 95.4578C108.485 95.4578 104.59 93.8447 101.719 90.9735C98.8479 88.1023 97.2349 84.2081 97.2349 80.1475L112.545 80.1475H127.855Z" fill="#F5F5F5"/>
          <Path d="M253.94 80.1475C253.94 84.208 252.327 88.1023 249.456 90.9735C246.585 93.8447 242.691 95.4578 238.63 95.4578C234.57 95.4578 230.675 93.8447 227.804 90.9735C224.933 88.1023 223.32 84.2081 223.32 80.1475L238.63 80.1475H253.94Z" fill="#F5F5F5"/>
        </Svg>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>로딩 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
      
      <View style={styles.frame} />
      <Header currentScreen="Archive" />

      {/* 월별/전체 탭 버튼과 뒤로가기 버튼 */}
      <View style={styles.headerContainer}>
        {/* 뒤로가기 버튼 (왼쪽) */}
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Svg width="15" height="28" viewBox="0 0 15 28" fill="none">
            <Path d="M14 27L0.999999 14L14 0.999998" stroke="#F5F5F5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </Svg>
        </TouchableOpacity>
        
        {/* 월별/전체 탭 버튼 (ArchiveScreen과 동일) */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, viewMode === 'monthly' && styles.tabButtonActive]}
            onPress={() => {
              // 탭 변경은 나중에 구현
            }}
          >
            <Text style={[styles.tabButtonText, viewMode === 'monthly' && styles.tabButtonTextActive]}>
              월별
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, styles.tabButtonRight, viewMode === 'all' && styles.tabButtonActive]}
            onPress={() => {
              // 탭 변경은 나중에 구현
            }}
          >
            <Text style={[styles.tabButtonText, viewMode === 'all' && styles.tabButtonTextActive]}>
              전체
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* 오른쪽 여백 (레이아웃 균형) */}
        <View style={styles.headerSpacer} />
      </View>

      {/* 질문 텍스트 */}
      <View style={styles.questionContainer}>
        <Text style={styles.questionText}>
          {currentMonth}월 {district} 기록이에요
        </Text>
      </View>

      {/* 슬라이드 위치/전체 개수 */}
      {locationRecordings.length > 0 && (
        <View style={styles.slideInfoContainer}>
          <Text style={styles.slideInfoText}>
            {currentSlideIndex + 1}/{locationRecordings.length}
          </Text>
        </View>
      )}

      {/* 감정별 캐릭터 */}
      {currentRecording && (
        <View style={styles.emotionCharacterContainer}>
          {renderEmotionCharacter(currentRecording.emotion)}
        </View>
      )}

      {/* 감정 + 키워드 2개 */}
      {currentRecording && (
        <View style={styles.emotionKeywordsContainer}>
          <View style={styles.emotionKeywordsContent}>
            <Text style={styles.emotionText}>
              {currentRecording.emotion || '감정 없음'}
            </Text>
            {currentRecording.keywords && currentRecording.keywords.length > 0 && (
              <>
                <Text style={styles.keywordText}>
                  {currentRecording.keywords[0]}
                </Text>
                {currentRecording.keywords.length > 1 && (
                  <Text style={styles.keywordText}>
                    {currentRecording.keywords[1]}
                  </Text>
                )}
              </>
            )}
          </View>
        </View>
      )}

      <NavigationBar 
        onNavigateToRecords={() => navigation.navigate('Records')} 
        onNavigateToRecording={() => navigation.navigate('Recording')} 
        onNavigateToProfile={() => navigation.navigate('Profile')}
        onNavigateToFeed={() => navigation.navigate('Feed')}
        onNavigateToArchive={() => navigation.navigate('Archive')}
        currentPage="Archive" 
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
    width: screenWidth,
    height: screenHeight,
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
  },
  headerContainer: {
    position: 'absolute',
    top: 118,
    left: 24,
    right: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    marginTop: 0,
    alignSelf: 'center',
  },
  tabButton: {
    paddingHorizontal: 32,
    paddingVertical: 5,
    borderRadius: 50,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#B780FF',
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  tabButtonRight: {
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    borderTopRightRadius: 50,
    borderBottomRightRadius: 50,
    borderLeftWidth: 0,
  },
  tabButtonActive: {
    backgroundColor: '#B780FF',
    borderColor: '#B780FF',
  },
  tabButtonText: {
    color: '#F5F5F5',
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: 0.44,
    fontFamily: Platform.OS === 'web' ? 'Pretendard' : undefined,
  },
  tabButtonTextActive: {
    color: '#000000',
  },
  backButton: {
    width: 15,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSpacer: {
    width: 15,
    height: 28,
  },
  questionContainer: {
    position: 'absolute',
    top: 178,
    left: 24,
    right: 24,
  },
  questionText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 0.64,
    lineHeight: 48,
    textAlign: 'left',
    fontFamily: Platform.OS === 'web' ? 'Pretendard' : undefined,
  },
  slideInfoContainer: {
    position: 'absolute',
    top: 393,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  slideInfoText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 0.4,
    fontFamily: Platform.OS === 'web' ? 'Pretendard' : undefined,
  },
  emotionCharacterContainer: {
    position: 'absolute',
    top: 450,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emotionKeywordsContainer: {
    position: 'absolute',
    top: 550,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  emotionKeywordsContent: {
    width: screenWidth - 48, // 화면 너비 기준 가운데 배치를 위한 너비
    alignItems: 'flex-start', // 왼쪽 정렬
  },
  emotionText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.56,
    textAlign: 'left',
    marginBottom: 16,
    fontFamily: Platform.OS === 'web' ? 'Pretendard' : undefined,
  },
  keywordText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '500',
    letterSpacing: 0.4,
    textAlign: 'left',
    marginBottom: 8,
    fontFamily: Platform.OS === 'web' ? 'Pretendard' : undefined,
  },
});

export default LocationDetailScreen;

