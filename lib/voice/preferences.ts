import {
  DEFAULT_VOICE_PREFERENCES,
  type VoicePreferences,
  type VoiceRate,
} from './types';

export const VOICE_PREFERENCES_STORAGE_KEY = 'astra-care.voice-preferences.v1';

const RATES: VoiceRate[] = ['slow', 'normal', 'fast'];

export function parseVoicePreferences(raw: string | null | undefined): VoicePreferences {
  if (!raw) return { ...DEFAULT_VOICE_PREFERENCES };
  try {
    const candidate = JSON.parse(raw) as Partial<VoicePreferences> | null;
    if (!candidate || typeof candidate !== 'object') return { ...DEFAULT_VOICE_PREFERENCES };
    return {
      enabled: typeof candidate.enabled === 'boolean' ? candidate.enabled : DEFAULT_VOICE_PREFERENCES.enabled,
      rate: RATES.includes(candidate.rate as VoiceRate) ? candidate.rate as VoiceRate : DEFAULT_VOICE_PREFERENCES.rate,
      voiceId: typeof candidate.voiceId === 'string' && candidate.voiceId.trim() !== ''
        ? candidate.voiceId.trim().slice(0, 240)
        : null,
    };
  } catch {
    return { ...DEFAULT_VOICE_PREFERENCES };
  }
}

export function serializeVoicePreferences(preferences: VoicePreferences): string {
  return JSON.stringify({
    enabled: preferences.enabled,
    rate: RATES.includes(preferences.rate) ? preferences.rate : DEFAULT_VOICE_PREFERENCES.rate,
    voiceId: preferences.voiceId,
  });
}
