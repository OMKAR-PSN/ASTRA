export type VoiceStatus =
  | 'idle'
  | 'preparing'
  | 'speaking'
  | 'stopping'
  | 'completed'
  | 'stopped'
  | 'unavailable'
  | 'error';

export type VoiceRate = 'slow' | 'normal' | 'fast';

export const VOICE_RATE_VALUES: Record<VoiceRate, number> = {
  slow: 0.8,
  normal: 1,
  fast: 1.2,
};

export const VOICE_RATE_LABELS: Record<VoiceRate, string> = {
  slow: 'Slow',
  normal: 'Normal',
  fast: 'Fast',
};

export type VoicePreferences = {
  enabled: boolean;
  rate: VoiceRate;
  voiceId: string | null;
};

/** Manual Listen is enabled by default; nothing is read automatically. */
export const DEFAULT_VOICE_PREFERENCES: VoicePreferences = {
  enabled: true,
  rate: 'normal',
  voiceId: null,
};

export type VoiceOption = {
  id: string;
  name: string;
  language: string;
  local: boolean | null;
};

export type VoiceRequest = {
  sourceId: string;
  text: string;
  label: string;
};

export type VoiceSnapshot = {
  supported: boolean;
  status: VoiceStatus;
  activeSourceId: string | null;
  activeLabel: string | null;
  lastSourceId: string | null;
  lastLabel: string | null;
  error: string | null;
  unavailableReason: string | null;
  voices: VoiceOption[];
  refreshingVoices: boolean;
};

export type SpeechCallbacks = {
  onStart: () => void;
  onDone: () => void;
  onStopped: () => void;
  onError: (error: Error) => void;
};

export type SpeechEngine = {
  isSupported: () => boolean;
  speak: (
    text: string,
    options: { rate: number; voiceId: string | null },
    callbacks: SpeechCallbacks,
  ) => void;
  stop: () => Promise<void>;
  getVoices: () => Promise<VoiceOption[]>;
};

export const EMPTY_VOICE_SNAPSHOT: VoiceSnapshot = {
  supported: true,
  status: 'idle',
  activeSourceId: null,
  activeLabel: null,
  lastSourceId: null,
  lastLabel: null,
  error: null,
  unavailableReason: null,
  voices: [],
  refreshingVoices: false,
};

export const VOICE_UNAVAILABLE_MESSAGE =
  'Speech is not available on this platform. The text remains visible and every control still works without audio.';

export const VOICE_NO_START_MESSAGE =
  'Speech did not start. This device may have no installed voice or may be blocking audio. The text remains available.';

export const VOICE_ERROR_MESSAGE =
  'Speech could not start. The text remains available and every control still works without audio.';
