import {
  VOICE_PREFERENCES_STORAGE_KEY,
  parseVoicePreferences,
  serializeVoicePreferences,
} from './preferences';
import type { VoicePreferences } from './types';

export async function loadVoicePreferences(): Promise<VoicePreferences> {
  try {
    const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(VOICE_PREFERENCES_STORAGE_KEY);
    return parseVoicePreferences(raw);
  } catch {
    return parseVoicePreferences(null);
  }
}

export async function saveVoicePreferences(preferences: VoicePreferences): Promise<void> {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(VOICE_PREFERENCES_STORAGE_KEY, serializeVoicePreferences(preferences));
    }
  } catch {
    // Preferences are optional; storage failure must not block voice guidance.
  }
}
