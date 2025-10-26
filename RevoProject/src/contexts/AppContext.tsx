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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState<boolean>(false);
  const [currentScreen, setCurrentScreen] = useState<string>('');

  // 앱 시작 시 localStorage에서 온보딩 완료 상태 확인
  useEffect(() => {
    const savedOnboardingState = localStorage.getItem('onboardingCompleted');
    if (savedOnboardingState === 'true') {
      setIsOnboardingCompleted(true);
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

  const value: AppContextType = {
    isOnboardingCompleted,
    setOnboardingCompleted,
    currentScreen,
    setCurrentScreen,
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
