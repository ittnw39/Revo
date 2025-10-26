import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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

  // 앱 시작 시 localStorage에서 상태 복원
  useEffect(() => {
    const savedOnboardingState = localStorage.getItem('onboardingCompleted');
    const savedLastScreen = localStorage.getItem('lastVisitedScreen');
    const savedSettingsView = localStorage.getItem('settingsView');
    const savedAccessibilityStep = localStorage.getItem('accessibilityStep');
    
    if (savedOnboardingState === 'true') {
      setIsOnboardingCompleted(true);
    }
    
    if (savedLastScreen) {
      setLastVisitedScreen(savedLastScreen);
    }
    
    if (savedSettingsView) {
      setSettingsView(savedSettingsView);
    }
    
    if (savedAccessibilityStep) {
      setAccessibilityStep(parseInt(savedAccessibilityStep, 10));
    }
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

  // 설정 화면 상태 변경 시 localStorage에 저장
  const handleSetSettingsView = (view: string) => {
    setSettingsView(view);
    localStorage.setItem('settingsView', view);
  };

  const handleSetAccessibilityStep = (step: number) => {
    setAccessibilityStep(step);
    localStorage.setItem('accessibilityStep', step.toString());
  };

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
