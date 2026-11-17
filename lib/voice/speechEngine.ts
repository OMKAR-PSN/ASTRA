import * as Speech from 'expo-speech';
import { Platform } from 'react-native';

import type { SpeechEngine, VoiceOption } from './types';

const VOICE_LIST_TIMEOUT_MS = 1500;

type VoiceWithLocaleHint = {
  identifier?: string;
  name?: string;
  language?: string;
  localService?: boolean;
};

export function isSpeechSupported(): boolean {
  if (typeof Speech.speak !== 'function') return false;
  if (Platform.OS !== 'web') return true;
  if (typeof window === 'undefined') return false;
  const synthesis = (window as { speechSynthesis?: unknown }).speechSynthesis;
  const Utterance = (window as { SpeechSynthesisUtterance?: unknown }).SpeechSynthesisUtterance;
  return Boolean(synthesis) && typeof Utterance === 'function';
}

function mapVoices(voices: VoiceWithLocaleHint[]): VoiceOption[] {
  const seen = new Set<string>();
  const options: VoiceOption[] = [];
  for (const voice of voices) {
    const id = typeof voice.identifier === 'string' && voice.identifier.trim() !== ''
      ? voice.identifier.trim()
      : typeof voice.name === 'string' ? voice.name.trim() : '';
    if (id === '' || seen.has(id)) continue;
    seen.add(id);
    options.push({
      id,
      name: typeof voice.name === 'string' && voice.name.trim() !== '' ? voice.name.trim() : id,
      language: typeof voice.language === 'string' ? voice.language : '',
      local: typeof voice.localService === 'boolean' ? voice.localService : null,
    });
  }
  return options;
}

export function createSpeechEngine(): SpeechEngine {
  return {
    isSupported: () => {
      try {
        return isSpeechSupported();
      } catch {
        return false;
      }
    },
    speak: (text, options, callbacks) => {
      try {
        Speech.speak(text, {
          rate: options.rate,
          ...(options.voiceId ? { voice: options.voiceId } : null),
          onStart: () => callbacks.onStart(),
          onDone: () => callbacks.onDone(),
          onStopped: () => callbacks.onStopped(),
          onError: (error: Error) => callbacks.onError(error instanceof Error ? error : new Error(String(error))),
        });
      } catch (error) {
        callbacks.onError(error instanceof Error ? error : new Error(String(error)));
      }
    },
    stop: async () => {
      try {
        await Speech.stop();
      } catch {
        // Stopping is best-effort; playback state still needs to reset.
      }
    },
    getVoices: async () => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const voices = await Promise.race([
          Speech.getAvailableVoicesAsync(),
          new Promise<VoiceWithLocaleHint[]>((resolve) => {
            timer = setTimeout(() => resolve([]), VOICE_LIST_TIMEOUT_MS);
          }),
        ]);
        return mapVoices(voices as VoiceWithLocaleHint[]);
      } catch {
        return [];
      } finally {
        if (timer !== undefined) clearTimeout(timer);
      }
    },
  };
}
