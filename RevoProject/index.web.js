import { AppRegistry } from 'react-native';
import App from './App';

// React Navigation 웹 지원을 위한 polyfill
if (typeof global === 'undefined') {
  global = globalThis;
}

// React Navigation 웹 지원을 위한 추가 polyfill
if (typeof window !== 'undefined') {
  // BackHandler polyfill
  if (!window.BackHandler) {
    window.BackHandler = {
      addEventListener: () => {},
      removeEventListener: () => {},
    };
  }
  
  // Linking polyfill
  if (!window.Linking) {
    window.Linking = {
      openURL: (url) => window.open(url, '_blank'),
      canOpenURL: () => Promise.resolve(true),
    };
  }
}

AppRegistry.registerComponent('RevoProject', () => App);
AppRegistry.runApplication('RevoProject', {
  initialProps: {},
  rootTag: document.getElementById('root'),
});
