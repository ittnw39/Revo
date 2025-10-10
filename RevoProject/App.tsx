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

// Screens
import OnBoardingScreen1 from './src/screens/onBoarding/OnBoardingScreen1';
import RecordingScreen from './src/screens/recording/RecordingScreen';
import RecordsScreen from './src/screens/records/RecordsScreen';
import ProfileScreen from './src/screens/profile/ProfileScreen';
import EmotionDetailScreen from './src/screens/emotionDetail/EmotionDetailScreen';

// Navigation Types
import { RootStackParamList } from './src/types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Root Stack Navigator
function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <Stack.Navigator
          initialRouteName="OnBoarding"
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="OnBoarding" component={OnBoardingScreen1} />
          <Stack.Screen name="Recording" component={RecordingScreen} />
          <Stack.Screen name="Records" component={RecordsScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen 
            name="EmotionDetail" 
            component={EmotionDetailScreen}
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