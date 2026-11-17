import { usePathname } from 'expo-router';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';

import { createVoiceController, type VoiceController } from '@/lib/voice/controller';
import { loadVoicePreferences, saveVoicePreferences } from '@/lib/voice/preferencesRepository';
import { createSpeechEngine } from '@/lib/voice/speechEngine';
import {
  DEFAULT_VOICE_PREFERENCES,
  type VoiceOption,
  type VoicePreferences,
  type VoiceRate,
  type VoiceRequest,
  type VoiceSnapshot,
} from '@/lib/voice/types';
import { usePresentation } from '@/state/PresentationSession';

type VoiceGuidanceValue = {
  snapshot: VoiceSnapshot;
  preferences: VoicePreferences;
  ready: boolean;
  speak: (request: VoiceRequest, scope: string) => boolean;
  replay: (scope: string) => boolean;
  stop: () => Promise<void>;
  stopScope: (scope: string) => void;
  setEnabled: (enabled: boolean) => void;
  setRate: (rate: VoiceRate) => void;
  setVoiceId: (voiceId: string | null) => void;
  refreshVoices: () => Promise<VoiceOption[]>;
};

const VoiceGuidanceContext = createContext<VoiceGuidanceValue | null>(null);

export function useVoiceGuidance(): VoiceGuidanceValue {
  const value = useContext(VoiceGuidanceContext);
  if (!value) throw new Error('useVoiceGuidance must be used inside VoiceGuidanceProvider');
  return value;
}

/**
 * Owns the only speech controller in the app. Playback is explicitly user-triggered;
 * the provider stops audio when identity, demo mode, route or app visibility changes.
 */
export function VoiceGuidanceProvider({ children }: { children: ReactNode }) {
  const controller: VoiceController = useMemo(
    () => createVoiceController({ engine: createSpeechEngine() }),
    [],
  );
  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  const [preferences, setPreferences] = useState<VoicePreferences>({ ...DEFAULT_VOICE_PREFERENCES });
  const [ready, setReady] = useState(false);
  const readyRef = useRef(false);
  const { activeCrewId } = usePresentation();
  const pathname = usePathname();
  const previousCrew = useRef<string | null>(activeCrewId);
  const previousPath = useRef<string | null>(pathname);

  useEffect(() => {
    let cancelled = false;
    void loadVoicePreferences().then((stored) => {
      if (cancelled) return;
      setPreferences(stored);
      controller.setPreferences(stored);
      readyRef.current = true;
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [controller]);

  useEffect(() => {
    void controller.refreshVoices();
  }, [controller]);

  useEffect(() => {
    if (previousCrew.current !== activeCrewId) {
      previousCrew.current = activeCrewId;
      void controller.stop();
    }
  }, [activeCrewId, controller]);

  useEffect(() => {
    if (previousPath.current !== pathname) {
      previousPath.current = pathname;
      void controller.stop();
    }
  }, [pathname, controller]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') void controller.stop();
    });
    return () => subscription.remove();
  }, [controller]);

  useEffect(() => () => {
    void controller.stop();
  }, [controller]);

  const update = useCallback((patch: Partial<VoicePreferences>) => {
    setPreferences((current) => {
      const next = { ...current, ...patch };
      controller.setPreferences(next);
      if (readyRef.current) void saveVoicePreferences(next);
      return next;
    });
  }, [controller]);

  const value = useMemo<VoiceGuidanceValue>(() => ({
    snapshot,
    preferences,
    ready,
    speak: controller.speak,
    replay: controller.replay,
    stop: controller.stop,
    stopScope: controller.stopScope,
    setEnabled: (enabled) => update({ enabled }),
    setRate: (rate) => update({ rate }),
    setVoiceId: (voiceId) => update({ voiceId }),
    refreshVoices: controller.refreshVoices,
  }), [snapshot, preferences, ready, controller, update]);

  return <VoiceGuidanceContext.Provider value={value}>{children}</VoiceGuidanceContext.Provider>;
}
