import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Platform } from 'react-native';
import { getRecordings, getUserFromStorage, Recording, getAudioUrl } from '../services/api';

// 웹 환경에서 localStorage 사용을 위한 타입 선언
declare const localStorage: {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

interface AppContextType {
  isOnboardingCompleted: boolean;
  setOnboardingCompleted: (completed: boolean) => void;
  currentScreen: string;
  setCurrentScreen: (screen: string) => void;
  lastVisitedScreen: string;
  setLastVisitedScreen: (screen: string) => void;
  settingsView: string;
  setSettingsView: (view: string) => void;
  accessibilityStep: number;
  setAccessibilityStep: (step: number) => void;
  totalArchiveDuration: number;
  refreshArchiveDuration: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState<boolean>(false);
  const [currentScreen, setCurrentScreen] = useState<string>('');
  const [lastVisitedScreen, setLastVisitedScreen] = useState<string>('Recording');
  const [settingsView, setSettingsView] = useState<string>('main');
  const [accessibilityStep, setAccessibilityStep] = useState<number>(0);
  const [totalArchiveDuration, setTotalArchiveDuration] = useState<number>(0);

  // 앱 시작 시 localStorage에서 상태 복원
  useEffect(() => {
    const savedOnboardingState = localStorage.getItem('onboardingCompleted');
    const savedLastScreen = localStorage.getItem('lastVisitedScreen');
    
    if (savedOnboardingState === 'true') {
      setIsOnboardingCompleted(true);
    }
    
    if (savedLastScreen) {
      setLastVisitedScreen(savedLastScreen);
    }
    
    // settingsView와 accessibilityStep은 localStorage에 저장하지 않음 - 새로고침 시 항상 첫 화면/첫 페이지로
    // 기존에 저장된 값이 있다면 제거
    localStorage.removeItem('settingsView');
    localStorage.removeItem('accessibilityStep');
  }, []);

  // 온보딩 완료 상태 변경 시 localStorage에 저장
  const setOnboardingCompleted = (completed: boolean) => {
    setIsOnboardingCompleted(completed);
    if (completed) {
      localStorage.setItem('onboardingCompleted', 'true');
    } else {
      localStorage.removeItem('onboardingCompleted');
    }
  };

  // 마지막 방문 화면 변경 시 localStorage에 저장
  const handleSetLastVisitedScreen = (screen: string) => {
    setLastVisitedScreen(screen);
    localStorage.setItem('lastVisitedScreen', screen);
  };

  // 설정 화면 상태 변경 - localStorage에 저장하지 않음 (새로고침 시 항상 첫 화면으로)
  const handleSetSettingsView = (view: string) => {
    setSettingsView(view);
  };

  // 접근성 단계 변경 - localStorage에 저장하지 않음 (설정 화면 재진입 시 항상 첫 페이지로)
  const handleSetAccessibilityStep = (step: number) => {
    setAccessibilityStep(step);
  };

  // 총 녹음 시간 계산 함수 (백엔드에서 제공하는 duration 사용)
  const calculateTotalDuration = useCallback(async (recordings: Recording[]) => {
    if (recordings.length === 0) {
      setTotalArchiveDuration(0);
      return;
    }

    // 백엔드에서 제공하는 duration을 사용 (없으면 0으로 처리)
    const totalSeconds = recordings.reduce((sum, recording) => {
      return sum + (recording.duration || 0);
    }, 0);
    
    setTotalArchiveDuration(totalSeconds);
  }, []);

  // 총 녹음 시간 새로고침 함수
  const refreshArchiveDuration = useCallback(async () => {
    const userInfo = getUserFromStorage();
    if (userInfo && isOnboardingCompleted) {
      try {
        const response = await getRecordings({ 
          userId: userInfo.id,
          limit: 1000
        });
        if (response.success) {
          await calculateTotalDuration(response.recordings);
        }
      } catch (error) {
        console.error('총 녹음 시간 계산 오류:', error);
      }
    }
  }, [isOnboardingCompleted, calculateTotalDuration]);

  // 온보딩 완료 후 총 녹음 시간 계산
  useEffect(() => {
    if (isOnboardingCompleted) {
      refreshArchiveDuration();
    }
  }, [isOnboardingCompleted, refreshArchiveDuration]);

  const value: AppContextType = {
    isOnboardingCompleted,
    setOnboardingCompleted,
    currentScreen,
    setCurrentScreen,
    lastVisitedScreen,
    setLastVisitedScreen: handleSetLastVisitedScreen,
    settingsView,
    setSettingsView: handleSetSettingsView,
    accessibilityStep,
    setAccessibilityStep: handleSetAccessibilityStep,
    totalArchiveDuration,
    refreshArchiveDuration,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
