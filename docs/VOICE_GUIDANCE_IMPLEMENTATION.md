# Voice guidance and accessible reading (Feature 07)

Status: 17 November 2026. Source implementation and automated browser verification are complete. Audible output on physical devices and real screen readers remain unverified.

## Purpose and boundaries

Voice guidance is an optional accessibility layer. It reads text that already exists on screen and never replaces or changes that text. Every instruction, value, limitation and next step remains visible and every control works without audio. Voice never selects answers, pre-fills fields, changes observations, alters the assessment, creates reports or queues delivery.

Out of scope: speech recognition, microphone capture, cloud TTS, AI voices, wake words, background narration, auto-reading, diagnosis, triage and new scoring. ASTRA CARE requests no microphone permission and stores no audio.

## Architecture

| Area | File | Responsibility |
| --- | --- | --- |
| Types | `lib/voice/types.ts` | Status, rate, preferences, snapshot, engine and callback contracts |
| Speech engine | `lib/voice/speechEngine.ts` | Wraps `expo-speech` in a typed interface; capability detection; voice list with timeout |
| Controller | `lib/voice/controller.ts` | One global playback owner; chunk queue; stale-callback guards; watchdog |
| Text helpers | `lib/voice/text.ts` | Normalisation, sentence/long-word splitting, spoken units and percentages |
| Content builders | `lib/voice/builders.ts` | Guided steps, assessment overview, finding explanation, calculation, knowledge, body map, replay |
| Preferences | `lib/voice/preferences.ts` | Strict parse/serialise of the stored preference object |
| Preference storage | `lib/voice/preferencesRepository.web.ts`, `.native.ts` | `localStorage` on web; `expo-sqlite/kv-store` on native |
| React state | `state/VoiceGuidanceProvider.tsx` | External-store subscription, preference persistence, lifecycle stops |
| Shared UI | `components/VoiceControls.tsx` | Listen / Stop / Replay, speed, on/off, status, error and unavailable notices |
| Screen | `app/voice-settings.tsx` | Playback, speed, voice list, privacy and known limits |

The controller is the only component that calls the speech engine. A new request increments an utterance sequence and invalidates the previous one, so late `onStart`, `onDone`, `onStopped` or `onError` callbacks cannot overwrite newer state. Each request is split into 450-character speech-friendly chunks; the next chunk starts only after the previous one finishes. A 4-second watchdog converts "no start" into a visible error with the text still available. `stop()` invalidates the sequence before awaiting the engine, and `dispose()` silently stops and freezes the snapshot.

The provider stops speech when the route changes, when the active crew changes, when the app leaves the foreground, and on unmount. Individual screens additionally stop their own scope when a guided step, replay frame, knowledge card, modal or expanded calculation changes. Speech is never started automatically.

## Controls and states

- Listen (teal, volume icon) reads the current step, explanation, calculation, card section, body-map instruction or replay summary.
- Stop replaces Listen while `preparing`, `speaking` or `stopping`. Replay appears after a completed or stopped utterance.
- Full-detail strips add `Speed · Slow/Normal/Fast`, `Voice off` and `Settings`. Speed changes affect the next request only.
- States are Idle, Preparing, Speaking, Stopping, Completed, Stopped, Unavailable and Error. Pause/Resume is not offered.
- Error and unavailable notices use `accessibilityRole="alert"`/summary semantics; the text and all controls remain usable.
- Controls have 44 px minimum targets, visible focus outlines on web, and labelled group/alert semantics.

## What is spoken

- Guided check-in: step title, purpose of the step, response instructions and units. It never reads answers back or pre-fills anything.
- Assessment overview: the stored summary, engine interpretation, first suggested next step and the non-diagnostic statement.
- Observation card: metric label, recorded value with unit, fictional baseline, status, non-diagnostic limitation and the bounded next step.
- Calculation: observed value, baseline, difference, spoken percentage, the 10% prototype rule, recorded time, stale-record warning and synthetic baseline note. Missing values, zero baseline, self-reported entries and unavailable timestamps have explicit sentences.
- Knowledge card: title plus quick answer, simple explanation/example, or expanded explanation and limitation. Citation URLs are never read.
- Body map: optional region, symptom and intensity instructions. Private notes are never spoken.
- Replay: date/flight day, recorded measurements, carried-forward values marked as not part of the observation, assessment summary and synthetic/non-live disclaimer. Nothing narrates per frame.

## Preferences and privacy

Preferences are `{enabled, rate, voiceId}` stored locally under `astra-care.voice-preferences.v1`. They are never sent to the ground receiver and are not part of report snapshots. Speech is produced by the device or browser engine. ASTRA CARE does not send health text to a cloud speech service and does not create audio files. Browser speech may itself use a network voice supplied by the operating system; the settings screen marks which reported voices are on-device, network or unknown.

No voice is installed or downloaded by the app. Offline speech is not guaranteed: some engines and voices require a network connection. When speech is unavailable the interface shows a persistent notice while every text element and control remains operable.

## Platform behavior

- Web: uses the browser `SpeechSynthesis` API through `expo-speech`. Voice lists may populate asynchronously and can be empty; support is decided by API presence, not voice count. Repeated Listen/Stop, route changes, tab switching and offline text playback were exercised.
- Android: uses the installed system speech engine. Pause/Resume is not exposed because the platform API does not support it reliably; use Stop and Listen again.
- iOS: speech may be silent when the device is in silent mode, and some voices may need downloading. This limitation is shown in the settings screen.
- Expo Go: only `expo-speech` is used, so the project remains Expo Go compatible. Native runtime behavior was not verified on a physical device in this environment.

Reference: <https://docs.expo.dev/versions/v58.0.0/sdk/speech/>

## Verification

Voice unit suite: `npm run test:voice` — 18/18. It covers text splitting, guided prompts, assessment wording, percentage pronunciation, missing/zero baseline, knowledge text, playback state transitions, stop behaviour, stale callbacks, dispose, watchdog, unsupported engines, empty text, chunking, preference parsing, disabling, body map/replay privacy and record immutability. The engine is mocked; the tests prove controller behaviour, not audible output.

Browser harness: `node dist/verify-voice.mjs http://127.0.0.1:8083 prod` against the production export — 53/53 checks at 1440×900 and 390×844. The harness installs a `speechSynthesis`/`SpeechSynthesisUtterance` stub that records utterance text and speed, can hold a chunk to expose the speaking state, and releases chunks to exercise the queue. It verifies Listen, Stop, Replay, step-change and navigation stops, keyboard activation, assessment and calculation narration, knowledge Read Aloud (including offline), the on/off preference, the unsupported fallback, no console errors and no horizontal overflow. Screenshots: `voice-prod-guided-idle`, `guided-speaking`, `guided-stopped`, `assessment`, `calculation`, `knowledge`, `settings` and `unavailable` at 1440×900, plus guided and settings at 390×844.

Limitations: the harness cannot prove audible output, voice quality, Bluetooth routing, silent-mode behaviour or screen-reader interaction conflicts. Those require a manual pass with system speech enabled, and a physical Expo Go device run.

## Manual check (desktop or phone)

1. `npm install`
2. `npm run web` (or `npm start` and open the app in Expo Go)
3. Open Daily Check-In, press **Listen to question**, then **Stop**, then **Replay**.
4. Open Assessment → **Listen to explanation**, expand an observation and press **Read calculation**.
5. Open a knowledge card and press **Read quick answer**.
6. Open Voice guidance settings, switch voices/speed, toggle voice off, and confirm the text-only notice appears.
7. Navigate away while speaking and confirm speech stops. Reload and confirm the saved preference persists.
8. Disable the network and repeat a knowledge Read Aloud. Text playback must still work; speech may not.

## Boundaries respected

No microphone permission, no speech recognition, no recording, no cloud TTS, no AI voice/avatar, no auto-read, no hidden medical text, no assessment changes, no report generation, no baseline/threshold changes and no fabricated sensor data. Speech is user-triggered and supplements, rather than replaces, a screen reader.
