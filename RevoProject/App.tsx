/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useState } from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import {
  SafeAreaProvider,
} from 'react-native-safe-area-context';
import OnBoardingScreen1 from './src/screens/onBoarding/OnBoardingScreen1';
import RecordingScreen from './src/screens/recording/RecordingScreen';
import RecordsScreen from './src/screens/records/RecordsScreen';
import ProfileScreen from './src/screens/profile/ProfileScreen';
import EmotionDetailScreen from './src/screens/emotionDetail/EmotionDetailScreen';

type Screen = 'OnBoarding' | 'Recording' | 'Records' | 'Profile' | 'EmotionDetail';

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  
  const [currentScreen, setCurrentScreen] = useState<Screen>('OnBoarding');

  const navigateToRecording = () => {
    setCurrentScreen('Recording');
  };

  const navigateToRecords = () => {
    setCurrentScreen('Records');
  };

  const navigateToProfile = () => {
    setCurrentScreen('Profile');
  };

  const navigateToEmotionDetail = () => {
    setCurrentScreen('EmotionDetail');
  };

  const navigateBack = () => {
    setCurrentScreen('Profile');
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'OnBoarding':
        return <OnBoardingScreen1 onNavigateToRecording={navigateToRecording} />;
      case 'Recording':
        return <RecordingScreen onNavigateToRecords={navigateToRecords} onNavigateToRecording={navigateToRecording} onNavigateToProfile={navigateToProfile} />;
      case 'Records':
        return <RecordsScreen onNavigateToRecording={navigateToRecording} onNavigateToRecords={navigateToRecords} onNavigateToProfile={navigateToProfile} />;
      case 'Profile':
        return <ProfileScreen onNavigateToRecording={navigateToRecording} onNavigateToRecords={navigateToRecords} onNavigateToProfile={navigateToProfile} onNavigateToEmotionDetail={navigateToEmotionDetail} />;
      case 'EmotionDetail':
        return <EmotionDetailScreen onNavigateToRecording={navigateToRecording} onNavigateToRecords={navigateToRecords} onNavigateToProfile={navigateToProfile} onNavigateBack={navigateBack} />;
      default:
        return <OnBoardingScreen1 onNavigateToRecording={navigateToRecording} />;
    }
  };

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      {renderScreen()}
    </SafeAreaProvider>
  );
}

export default App;
