import Storage from 'expo-sqlite/kv-store';

import {
  VOICE_PREFERENCES_STORAGE_KEY,
  parseVoicePreferences,
  serializeVoicePreferences,
} from './preferences';
import type { VoicePreferences } from './types';

export async function loadVoicePreferences(): Promise<VoicePreferences> {
  try {
    return parseVoicePreferences(await Storage.getItem(VOICE_PREFERENCES_STORAGE_KEY));
  } catch {
    return parseVoicePreferences(null);
  }
}

export async function saveVoicePreferences(preferences: VoicePreferences): Promise<void> {
  try {
    await Storage.setItem(VOICE_PREFERENCES_STORAGE_KEY, serializeVoicePreferences(preferences));
  } catch {
    // Preferences are optional; storage failure must not block voice guidance.
  }
}
