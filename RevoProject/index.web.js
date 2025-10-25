import { AppRegistry } from 'react-native';
import App from './App';

// React Native 웹을 위한 글로벌 설정
if (typeof global === 'undefined') {
  global = globalThis;
}

// React Navigation 웹 지원을 위한 polyfill
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

  // React Native 웹을 위한 추가 polyfill
  if (!window.navigator) {
    window.navigator = {
      product: 'ReactNative',
      userAgent: 'ReactNative',
    };
  }

  // Dimensions polyfill
  if (!window.Dimensions) {
    window.Dimensions = {
      get: () => ({
        width: window.innerWidth,
        height: window.innerHeight,
        scale: window.devicePixelRatio || 1,
        fontScale: 1,
      }),
      addEventListener: () => {},
      removeEventListener: () => {},
    };
  }
}

// React Native 웹을 위한 추가 설정
if (typeof document !== 'undefined') {
  // React Native 웹 스타일 초기화
  const style = document.createElement('style');
  style.textContent = `
    * {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    #root {
      width: 100vw;
      height: 100vh;
      overflow: hidden;
    }
  `;
  document.head.appendChild(style);
}

AppRegistry.registerComponent('RevoProject', () => App);
AppRegistry.runApplication('RevoProject', {
  initialProps: {},
  rootTag: document.getElementById('root'),
});
