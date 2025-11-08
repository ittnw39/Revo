/**
 * 전역 타입 선언
 */

// window 객체 (웹 환경)
declare global {
  interface Window {
    localStorage: Storage;
    alert: (message?: any) => void;
  }
  
  const window: Window;
  
  // process 객체 (Node.js 환경)
  namespace NodeJS {
    interface ProcessEnv {
      REACT_APP_API_URL?: string;
      [key: string]: string | undefined;
    }
    
    interface Process {
      env: ProcessEnv;
    }
  }
  
  const process: NodeJS.Process;
}

export {};

