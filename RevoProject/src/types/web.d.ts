/**
 * 웹 환경 전용 타입 정의
 */

declare global {
  interface Window {
    SpeechRecognition?: typeof SpeechRecognition;
    webkitSpeechRecognition?: typeof SpeechRecognition;
    MediaRecorder?: {
      new (stream: MediaStream, options?: MediaRecorderOptions): MediaRecorder;
    };
    document?: Document;
  }

  interface Document {
    getElementById(elementId: string): HTMLElement | null;
    createElement(tagName: string): HTMLElement;
    head: HTMLHeadElement;
  }

  interface HTMLElement {
    id: string;
    textContent: string | null;
    appendChild(node: Node): Node;
  }

  interface HTMLHeadElement extends HTMLElement {
    appendChild(node: Node): Node;
  }

  interface Node {}

  interface Navigator {
    mediaDevices?: MediaDevices;
  }

  interface MediaDevices {
    getUserMedia(constraints: MediaStreamConstraints): Promise<MediaStream>;
  }

  interface MediaStream {
    getTracks(): MediaStreamTrack[];
  }

  interface MediaStreamTrack {
    stop(): void;
  }

  interface MediaRecorder extends EventTarget {
    state: 'inactive' | 'recording' | 'paused';
    start(timeslice?: number): void;
    stop(): void;
    pause(): void;
    resume(): void;
    ondataavailable: (event: BlobEvent) => void;
    onstop: () => void;
  }

  interface MediaRecorderOptions {
    mimeType?: string;
  }

  interface BlobEvent {
    data: Blob;
  }

  interface MediaStreamConstraints {
    audio?: boolean | MediaTrackConstraints;
    video?: boolean | MediaTrackConstraints;
  }

  interface SpeechRecognition extends EventTarget {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    start(): void;
    stop(): void;
    abort(): void;
    onresult: (event: SpeechRecognitionEvent) => void;
    onerror: (event: SpeechRecognitionErrorEvent) => void;
    onend: () => void;
  }

  interface SpeechRecognitionEvent {
    resultIndex: number;
    results: SpeechRecognitionResultList;
  }

  interface SpeechRecognitionResultList {
    length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
  }

  interface SpeechRecognitionResult {
    length: number;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
    isFinal: boolean;
  }

  interface SpeechRecognitionAlternative {
    transcript: string;
    confidence: number;
  }

  interface SpeechRecognitionErrorEvent {
    error: string;
    message: string;
  }

  var SpeechRecognition: {
    new (): SpeechRecognition;
  };

  var webkitSpeechRecognition: {
    new (): SpeechRecognition;
  };

  // NodeJS 타입 (타이머용)
  namespace NodeJS {
    interface Timeout {
      ref(): Timeout;
      unref(): Timeout;
    }
  }
}

export {};

