/**
 * RevoProject App with React Navigation
 * @format
 */

import React from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  SafeAreaProvider,
} from 'react-native-safe-area-context';

// Context
import { AppProvider, useApp } from './src/contexts/AppContext';

// Screens
import OnBoardingScreen1 from './src/screens/onBoarding/OnBoardingScreen1';
import OnBoardingScreen2 from './src/screens/onBoarding/OnBoardingScreen2';
import RecordingScreen from './src/screens/recording/RecordingScreen';
import RecordsScreen from './src/screens/records/RecordsScreen';
import ProfileScreen from './src/screens/profile/ProfileScreen';
import FeedScreen from './src/screens/feed/FeedScreen';
import ArchiveScreen from './src/screens/archive/ArchiveScreen';
import SettingsScreen from './src/screens/settings/SettingsScreen';
import HighlightEditScreen from './src/screens/records/HighlightEditScreen';
import LocationDetailScreen from './src/screens/archive/LocationDetailScreen';

// Navigation Types
import { RootStackParamList } from './src/types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Root Stack Navigator
function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <AppProvider>
      <AppNavigator />
    </AppProvider>
  );
}

// 별도 컴포넌트로 분리하여 Context 사용 가능하게 함
function AppNavigator() {
  const isDarkMode = useColorScheme() === 'dark';
  const { isOnboardingCompleted, lastVisitedScreen } = useApp();

  // 초기 라우트 결정
  const getInitialRoute = () => {
    if (!isOnboardingCompleted) {
      return "OnBoarding";
    }
    return lastVisitedScreen as keyof RootStackParamList;
  };

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <Stack.Navigator
          initialRouteName={getInitialRoute()}
          screenOptions={{
            headerShown: false,
          }}
        >
            <Stack.Screen name="OnBoarding" component={OnBoardingScreen1} />
            <Stack.Screen name="OnBoarding2" component={OnBoardingScreen2} />
            <Stack.Screen name="Recording" component={RecordingScreen} />
            <Stack.Screen name="Records" component={RecordsScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen 
              name="Feed" 
              component={FeedScreen}
              options={{
                presentation: 'modal',
              }}
            />
            <Stack.Screen name="Archive" component={ArchiveScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen 
              name="HighlightEdit" 
              component={HighlightEditScreen}
              options={{
                presentation: 'modal',
              }}
            />
            <Stack.Screen 
              name="LocationDetail" 
              component={LocationDetailScreen}
              options={{
                presentation: 'modal',
              }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    );
}

export default App;