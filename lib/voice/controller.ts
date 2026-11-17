import { DEFAULT_SPEECH_CHUNK_CHARS, splitSpeechText } from './text';
import {
  DEFAULT_VOICE_PREFERENCES,
  EMPTY_VOICE_SNAPSHOT,
  VOICE_ERROR_MESSAGE,
  VOICE_NO_START_MESSAGE,
  VOICE_RATE_VALUES,
  VOICE_UNAVAILABLE_MESSAGE,
  type SpeechEngine,
  type VoiceOption,
  type VoicePreferences,
  type VoiceRequest,
  type VoiceSnapshot,
} from './types';

const DEFAULT_WATCHDOG_MS = 4000;

export type VoiceControllerOptions = {
  engine: SpeechEngine;
  chunkChars?: number;
  watchdogMs?: number;
};

export type VoiceController = {
  getSnapshot: () => VoiceSnapshot;
  subscribe: (listener: () => void) => () => void;
  setPreferences: (preferences: VoicePreferences) => void;
  speak: (request: VoiceRequest, scope: string) => boolean;
  replay: (scope: string) => boolean;
  stop: () => Promise<void>;
  stopScope: (scope: string) => void;
  refreshVoices: () => Promise<VoiceOption[]>;
  dispose: () => void;
};

/**
 * Single global owner of speech playback. Every screen talks to this controller so
 * only one utterance can be prepared or spoken at a time, and callbacks from an
 * older utterance can never overwrite the current playback state.
 */
export function createVoiceController({
  engine,
  chunkChars = DEFAULT_SPEECH_CHUNK_CHARS,
  watchdogMs = DEFAULT_WATCHDOG_MS,
}: VoiceControllerOptions): VoiceController {
  let supported = false;
  try {
    supported = engine.isSupported();
  } catch {
    supported = false;
  }

  let snapshot: VoiceSnapshot = {
    ...EMPTY_VOICE_SNAPSHOT,
    supported,
    status: supported ? 'idle' : 'unavailable',
    unavailableReason: supported ? null : VOICE_UNAVAILABLE_MESSAGE,
  };
  let preferences: VoicePreferences = { ...DEFAULT_VOICE_PREFERENCES };
  const listeners = new Set<() => void>();
  let sequence = 0;
  let token = 0;
  let chunks: string[] = [];
  let chunkIndex = 0;
  let activeScope: string | null = null;
  let lastRequest: VoiceRequest | null = null;
  let watchdog: ReturnType<typeof setTimeout> | null = null;
  let voicesRequest = 0;
  let disposed = false;

  const notify = () => {
    if (disposed) return;
    for (const listener of listeners) listener();
  };

  const update = (patch: Partial<VoiceSnapshot>) => {
    snapshot = { ...snapshot, ...patch };
    notify();
  };

  const clearWatchdog = () => {
    if (watchdog !== null) {
      clearTimeout(watchdog);
      watchdog = null;
    }
  };

  const isStale = (session: number, utterance: number, index: number) =>
    disposed || session !== sequence || utterance !== token || index !== chunkIndex;

  const resetActive = () => {
    activeScope = null;
    chunkIndex = 0;
    clearWatchdog();
  };

  const failCurrent = (message: string) => {
    sequence += 1;
    token += 1;
    resetActive();
    void engine.stop().catch(() => {});
    update({ status: 'error', error: message, activeSourceId: null, activeLabel: null });
  };

  const armWatchdog = (session: number, utterance: number, index: number) => {
    clearWatchdog();
    watchdog = setTimeout(() => {
      watchdog = null;
      if (isStale(session, utterance, index)) return;
      failCurrent(VOICE_NO_START_MESSAGE);
    }, watchdogMs);
  };

  const speakChunk = (session: number, index: number) => {
    if (disposed || session !== sequence) return;
    chunkIndex = index;
    const utterance = ++token;
    const text = chunks[index];
    armWatchdog(session, utterance, index);
    try {
      engine.speak(
        text,
        { rate: VOICE_RATE_VALUES[preferences.rate], voiceId: preferences.voiceId },
        {
          onStart: () => {
            if (isStale(session, utterance, index)) return;
            clearWatchdog();
            update({ status: 'speaking' });
          },
          onDone: () => {
            if (isStale(session, utterance, index)) return;
            clearWatchdog();
            if (index + 1 < chunks.length) {
              speakChunk(session, index + 1);
              return;
            }
            resetActive();
            update({ status: 'completed', error: null, activeSourceId: null, activeLabel: null });
          },
          onStopped: () => {
            if (isStale(session, utterance, index)) return;
            resetActive();
            update({ status: 'stopped', activeSourceId: null, activeLabel: null });
          },
          onError: (error: Error) => {
            if (isStale(session, utterance, index)) return;
            failCurrent(error.message.trim() !== '' ? error.message : VOICE_ERROR_MESSAGE);
          },
        },
      );
    } catch (error) {
      if (isStale(session, utterance, index)) return;
      failCurrent(error instanceof Error && error.message.trim() !== '' ? error.message : VOICE_ERROR_MESSAGE);
    }
  };

  const speak = (request: VoiceRequest, scope: string): boolean => {
    if (disposed || !supported || !preferences.enabled) return false;
    const nextChunks = splitSpeechText(request.text, chunkChars);
    if (nextChunks.length === 0) return false;

    sequence += 1;
    token += 1;
    clearWatchdog();
    chunks = nextChunks;
    chunkIndex = 0;
    activeScope = scope;
    lastRequest = { sourceId: request.sourceId, text: request.text, label: request.label };
    update({
      status: 'preparing',
      error: null,
      activeSourceId: request.sourceId,
      activeLabel: request.label,
      lastSourceId: request.sourceId,
      lastLabel: request.label,
    });

    const session = sequence;
    void engine.stop().catch(() => {}).then(() => {
      if (disposed || session !== sequence) return;
      speakChunk(session, 0);
    });
    return true;
  };

  const stop = async (): Promise<void> => {
    if (disposed) return;
    const wasActive =
      snapshot.activeSourceId !== null ||
      snapshot.status === 'preparing' ||
      snapshot.status === 'speaking' ||
      snapshot.status === 'stopping';
    sequence += 1;
    token += 1;
    resetActive();
    if (wasActive) {
      update({ status: 'stopped', error: null, activeSourceId: null, activeLabel: null });
    }
    try {
      await engine.stop();
    } catch {
      // Best-effort stop; the controller state is already reset.
    }
  };

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setPreferences: (next) => {
      const wasEnabled = preferences.enabled;
      preferences = next;
      if (wasEnabled && !next.enabled) void stop();
    },
    speak,
    replay: (scope) => (lastRequest ? speak(lastRequest, scope) : false),
    stop,
    stopScope: (scope) => {
      if (activeScope === scope) void stop();
    },
    refreshVoices: async () => {
      if (disposed) return snapshot.voices;
      const request = ++voicesRequest;
      update({ refreshingVoices: true });
      let voices: VoiceOption[] = [];
      try {
        voices = await engine.getVoices();
      } catch {
        voices = [];
      }
      if (disposed || request !== voicesRequest) return snapshot.voices;
      update({ voices, refreshingVoices: false });
      return voices;
    },
    dispose: () => {
      if (disposed) return;
      disposed = true;
      sequence += 1;
      token += 1;
      resetActive();
      listeners.clear();
      void engine.stop().catch(() => {});
    },
  };
}
