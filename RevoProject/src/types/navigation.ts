// Navigation Types
export type RootStackParamList = {
  OnBoarding: undefined;
  OnBoarding2: undefined;
  Recording: undefined;
  Records: { initialDate?: string } | undefined;
  Profile: undefined;
  Feed: { recordingId?: number } | undefined;
  Archive: undefined;
  Settings: undefined;
  HighlightEdit: { recordingId: number } | undefined;
  LocationDetail: { district: string; viewMode: 'monthly' | 'all' } | undefined;
  EmotionDetail: { emotion: string; viewMode: 'monthly' | 'all' } | undefined;
};
