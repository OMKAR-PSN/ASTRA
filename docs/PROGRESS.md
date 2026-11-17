# ASTRA CARE progress and remaining work

Status: 17 November 2026. This describes the source implementation, not a deployed production release.

## Current product

One Expo / React Native TypeScript project supplies the crew website and mobile application. The crew website is a working local demonstration. Mobile shares its screens and domain logic, with a native SQLite repository, but has not been verified on an actual Expo Go device. A separate Fastify / SQLite service is the simulated ground receiver; its mission timeline is the ground team's view.

Target repository: OMKAR-PSN/ASTRA, main branch. Source history originates from OMKAR-PSN/wer, v0/offline-persistence. The local web build is configured for the receiver at http://127.0.0.1:8787 and must be rebuilt with a reachable receiver URL before deployment or phone testing.

## Original core requirements

| Requirement | Implemented behavior | Remaining verification / limitation |
|---|---|---|
| P0-01 Mission context | Fictional Avery Rao / Meridian Transit, synthetic-mode label and mission progress | One fixed crew and mission; no selector or advancing mission clock |
| P0-02 Check-in | HR, systolic/diastolic BP, temperature, sleep, mood, stress, symptoms and activity note; input validation and save feedback | Unsaved form drafts are not durable across a reload |
| P0-03 Local persistence | IndexedDB for web; Expo SQLite for native; loading gate and load-error retry | Native process restart and device storage failure need device tests |
| P0-04 Dashboard | Latest observations with units and UTC timestamps; HR/sleep historical charts | Charts show latest 20 check-ins; no date-range or arbitrary-metric selector |
| P0-05 Comparisons | Absolute and relative differences from fictional baseline; missing values remain missing | Current demo threshold is 10%, not the 25% example in the earlier context document; not a medical threshold |
| P0-06 Explanation | Observed, calculated, possible interpretation and suggested next step; dedicated assessment screen and rule details | No validated clinical assessment or causal inference |
| P0-07 Reports | Preview and explicit confirmation; stable report and immutable snapshot; snapshot deep links | PDF/share export is absent; rule version is displayed but not explicitly stored as a snapshot field |
| P0-08 Outbox | Saved reports persist; queued, sending, failed and acknowledged states; retry | Manual delivery; no automatic background retry scheduler |
| P0-09 Receiver | Full report storage, SHA-256 integrity check, receipt validation, duplicate handling and persisted receipt | Local simulator, without production authentication/authorization or hosted infrastructure |
| P0-10 Scenarios | Baseline, deviation, missing data, offline reload/save, duplicate confirmation, failed send/retry and acknowledgement reload checked in Edge | Browser regression scripts currently reside in ignored dist/ tooling; move into maintained test tooling before handoff |

## UI redesign delivered

- Five primary areas: Mission Overview, Health Check-In, Health Trends, Assessment, Reports & Sync. Report preview is secondary.
- Shared dark design tokens, Inter typography, 230px desktop sidebar and mobile tabs.
- Operational header: synthetic mode, UTC time, local record status, simulated link; expandable mobile mission details.
- Observation cards: units, manual/synthetic source, measurement time, missing state and explicit demo freshness label after 24 hours.
- Line charts: recorded points, real UTC time spacing, synthetic baseline, missing-reading gaps, demo review markers and selectable observations.
- Four-layer assessment plus expandable explanation of the demonstration rule.
- Report timeline derives from actual report state. Future delivery stages are not marked complete.
- Check-in success appears after persistence. Explicit None symptom choice excludes other symptoms.
- Body-map controls remain available on Health Trends. Mission progress, UTC check-in streak and NASA hazard context are preserved.
- Existing fictional identity is retained to keep saved report context consistent. The reference mockups are design guidance, not seeded historical evidence.

## Crew Knowledge Hub (Feature 06)

- `/knowledge` is an offline, bundled library of 21 plain-language cards in four categories, with 26 reviewed external citations in `docs/KNOWLEDGE_CONTENT_SOURCES.md`.
- Each card has three levels: a quick answer, a simple explanation with an everyday example, and an optional "Learn more" section with limitations. Cards carry an explicit content version and review date.
- Search and category filters are local, case-insensitive and deterministic. There is no chatbot, network text fetch, cloud authentication or AI API.
- Contextual links from overview, check-in, guided check-in, assessment, trends, replay and delivery open the relevant card. The hub is entry navigation, not a sixth main tab.
- Card text is bundled; only external citation URLs need internet. Report snapshots and historical observations are unchanged, and knowledge cards cannot be imported into an immutable report.
- Content maintenance, reference review, retirement and contextual-link validation are documented in KNOWLEDGE_CONTENT_VERSIONING.md. The catalog contains no diagnosis, dosage, emergency-treatment or invented clinical-threshold content.
- Verification: 20 knowledge unit tests plus the 119 prior tests pass; typecheck, lint, production web export and the 41-check desktop/mobile browser harness pass. Physical Expo Go verification remains outstanding.

## Voice guidance and accessible reading (Feature 07)

- Optional, user-triggered speech built on `expo-speech` only. Nothing is read automatically; every spoken instruction also stays on screen, and all controls, answers and saving work without audio.
- One global controller owns playback, splits text into speech-friendly chunks, blocks overlapping utterances, ignores stale engine callbacks and stops speech on navigation, crew change, backgrounding and scope changes.
- Controls: Listen, Stop, Replay, Slow/Normal/Fast, voice on/off and Settings. Pause/Resume is intentionally absent because Android cannot support it reliably.
- Coverage: guided steps, assessment overview and per-observation explanation, expanded calculations, knowledge card sections, body-map instructions and the replay summary. Knowledge citations are never read; private notes are never spoken.
- Preferences `{enabled, rate, voiceId}` persist locally only and are never sent to the receiver. There is no microphone permission, recording, cloud TTS or AI voice.
- Offline speech is not guaranteed. When the engine or a voice is unavailable, a visible notice appears and the text-only interface remains complete.
- Verification: 18 voice unit tests plus the 139 prior tests pass; typecheck, lint, production web export and a 53-check desktop/mobile browser harness pass. Harness speech is stubbed, so audible output, silent-mode behaviour and screen-reader interaction still need manual/physical verification. See VOICE_GUIDANCE_IMPLEMENTATION.md.

## Adaptive follow-up questions (Feature 08)

- Optional, user-opened follow-up questions generated by a pure TypeScript rule engine from explicit input in the current check-in. Six groups: fatigue, head discomfort, sleep difficulty, dizziness/nausea, non-head body-map symptoms and missing measurements.
- Fatigue is never inferred from short sleep, a blank form asks nothing, and body-map questions reuse the recorded region instead of re-asking location.
- At most three questions appear first, with "+N more available" and an explicit "View more" action. Skipping records nothing, "Not sure" is stored separately from No, and answers can be edited or removed from the summary.
- Answers are optional on the check-in schema; stored records are sanitized, legacy records stay untouched, and omitted answers do not change readings, symptoms or the 10% demonstration rule.
- Assessment shows "Additional self-reported context" separately from calculated findings; replay shows read-only "Recorded context". Report snapshots deep-copy the answers without adding controls, and the receiver hash continues to cover the canonical snapshot.
- Voice reads only the visible optional question, its reason, choices and skip semantics. Nothing is read automatically, and no network, LLM, sensor or microphone access is involved.
- Verification: 29 adaptive unit tests plus 157 prior tests (186 total across 10 suites) pass; typecheck, lint, production web export and a 38-check desktop/mobile browser harness pass with no console errors. Physical Expo Go, audible speech and real screen-reader passes remain outstanding. See ADAPTIVE_QUESTIONS_IMPLEMENTATION.md.

The audit and source references are in UI_UX_AUDIT.md. The layout is NASA-inspired, without a certification claim.

## Crew privacy, health-information boundaries and Privacy Shield (Feature 09)

- `/privacy` ("Privacy & Crew Access") has five sections: active session, visibility controls, local data information, privacy explanation and session controls. It is reachable from the desktop side rail, mobile header details and the shield, and is not a sixth bottom tab.
- `/personal` is an entry view for the active session only: identity, record availability, counts, last recorded time, storage description and links to the existing health screens. It does not duplicate measurements or assessment content.
- `/crew-summary` is a restricted projection built from `Pick<CheckIn, 'id' | 'recordedAt'>` and `Pick<ReportRecord, 'id' | 'status' | 'receipt'>`. It shows only workflow presence (check-in count, last recorded time, report totals, delivery state and last acknowledgement). Measurements, symptoms, body-map detail, notes, adaptive answers, baseline/assessment content, snapshots and any readiness score are never passed to it.
- The Privacy Shield is a full-viewport opaque cover (`#030B14`), not blur or glass. It stops voice guidance, makes the shell inert/aria-hidden, contains keyboard focus and offers a plain return action. It never changes saved data, and no "Unlock" or sign-in is implied.
- Every privacy surface carries "Demonstration View — Not an Authenticated Access-Control System". The fictional QR remains a fixture identifier, not a credential. Local records remain unencrypted and without a crew owner.
- Session isolation: demo records are memory-only; switching or exiting a demo resets both check-in forms, the assessment dialog and replay; unsaved drafts prompt before being discarded and are never persisted or included in any summary.
- Verification: 28 privacy unit tests plus 186 prior tests (214 total across 11 suites) pass; typecheck and lint pass; the production web export passes; the 74-check desktop/mobile privacy harness passes with no console errors. Physical Expo Go, native confirm wording and real screen-reader announcements remain unverified. See CREW_PRIVACY_IMPLEMENTATION.md.

## Verification evidence

- TypeScript and Expo lint passed after integration.
- Expo Web production export and offline cache generation passed. Android bundle export passed; this is not a device-runtime test.
- Edge automated checks visited all five main routes at 375x812, 390x844, 768x1024, 1280x800, 1440x900 and 1920x1080; no document horizontal overflow.
- Screenshots captured in dist/overview-WIDTH.png and dist/assessment.png. Desktop overview, phone overview and assessment were visually inspected; a clipped tab label and excess overview spacing were corrected afterward.
- Edge end-to-end check: save check-in, preview, confirm, queue, send, obtain receipt and find matching reference on ground timeline.
- Edge regression: baseline and deviation calculations; duplicate confirmation creates one queued report; cached offline reload and save; previous report survives another check-in; forced IndexedDB load failure and Retry; request failure and successful retry; acknowledged state survives reload.
- Receiver automated test passes: persisted receipt, repeat submission, restart, conflicting payload and invalid reports.
- Physical Expo Go, iOS runtime, screen-reader audit, browser text zoom and exhaustive accessibility testing remain unverified. Viewport checks do not prove those behaviors.

## Remaining work in recommended order

### Finish the website release

1. Maintain browser regression tests in the repository with a reproducible test dependency/setup and CI command.
2. Test keyboard focus, screen readers, 200% text zoom, invalid and stale records, all save-failure paths, storage quota and service-worker upgrade behavior.
3. Add unsaved-input recovery, schema migrations and explicit report rule/baseline version fields before expanding the data model.
4. Add metric selection/date filtering if required for the full redesign specification. Charts currently use UTC endpoints, without derived historical flight-day labels.
5. Add onboarding/help, usable settings, PDF/download/share and check-in reminder preferences.
6. Deploy web and receiver using reachable HTTPS endpoints; test an actual hosted offline reload and end-to-end receipt.
7. Maintain subsequent changes through reviewed commits and pull requests in OMKAR-PSN/ASTRA.

### Validate and release mobile

1. Open in a matching Expo Go build on Android, then iOS if required.
2. Verify native SQLite save, restart restoration, queued reports, network failure and receipt persistence.
3. Check safe areas, keyboard overlap, text scaling, touch targets, native chart interactions and the optional follow-up question flow.
4. Use a LAN/hosted receiver URL; phone localhost points to the phone itself.
5. Test native reminder behavior and prepare standalone builds only when that scope is selected.

### Broader improvement-plan backlog

- Multiple crew profiles and mission selection.
- Editable/versioned personal baselines.
- Blood glucose, oxygen saturation and radiation observations with explicit units and validated data provenance.
- Daily reminders; browsers cannot guarantee a daily background notification using a service-worker timer.
- First-launch walkthrough, light theme, PDF sharing and presentation/demo video.
- More detailed anatomy regions and additional trend metrics.
- Completion badges if useful. A streak exists; a clinical-looking health score does not.

Some older suggestions conflict with the newer redesign and original prototype boundaries: invented NASA-derived clinical thresholds, a generic radiation exposure limit, causal hazard labels, treatment prescriptions, flashing warnings and an unvalidated 0-100 health score. They should not be counted as ordinary missing coding tasks. They require separate evidence and scope decisions; the current app uses transparent synthetic differences and educational context.

## Practical roles

Crew web and mobile: record observations, review history/explanations, confirm reports and manage local queue. Ground timeline: inspect reports actually accepted by the simulator. The website is not automatically a multi-user flight-surgeon portal, and records do not synchronize between devices merely because both use the same app.

## Main implementation files

- Shell/navigation: constants/theme.ts, constants/navigation.ts, components/ScreenContainer.tsx, components/SideRail.tsx, components/SyntheticBanner.tsx, app/(tabs)/_layout.tsx.
- Screens: app/(tabs)/index.tsx, check-in.tsx, dashboard.tsx, assessment.tsx (new), report.tsx, delivery.tsx.
- Reusable UI: MetricTile.tsx, TrendBars.tsx, BodyMap.tsx, AdaptiveQuestions.tsx, OutboxItem.tsx, NumericField.tsx, SymptomChecklist.tsx and shared action controls.
- Adaptive questions: lib/adaptiveQuestions.ts, components/AdaptiveQuestions.tsx, tests/adaptiveQuestions.test.mjs.
- Persistence/delivery: state/SessionProvider.tsx, lib/sessionRepository.web.ts, lib/sessionRepository.native.ts, lib/sessionRepositoryContract.ts, lib/receiver.ts, lib/reportProtocol.ts, ground-receiver/.
- Knowledge Hub: app/knowledge.tsx, app/knowledge/[cardId].tsx, components/KnowledgeLink.tsx, KnowledgeCardTile.tsx, KnowledgeDiagram.tsx, lib/knowledge/.
- Voice guidance: lib/voice/, state/VoiceGuidanceProvider.tsx, components/VoiceControls.tsx, app/voice-settings.tsx.
- Privacy and session boundaries: lib/privacy.ts, state/PrivacyShieldProvider.tsx, state/PresentationSession.tsx, state/useSessionReset.ts, components/PrivacyShield.tsx, components/DemoModeBanner.tsx, app/privacy.tsx, app/personal.tsx, app/crew-summary.tsx.
- Supporting logic/build: lib/format.ts, lib/comparison.ts, lib/readingTiles.ts, lib/checkInStreak.ts, scripts/build-web-cache.mjs, package.json, app.json.
- Documentation: README.md, docs/decisions.md, docs/UI_UX_AUDIT.md, docs/KNOWLEDGE_CONTENT_SOURCES.md, docs/KNOWLEDGE_CONTENT_VERSIONING.md, docs/VOICE_GUIDANCE_IMPLEMENTATION.md, docs/ADAPTIVE_QUESTIONS_IMPLEMENTATION.md and this progress report.

## Stitch design integration

Milestone 1 is implemented on feat/stitch-ui-redesign: shared tokens/surfaces/navigation/header and Mission Overview. See STITCH_INTEGRATION.md for the inspected export, preserved contracts, validation and remaining differences. The other screen-specific Stitch layouts are intentionally deferred.

## Final integration audit — 17 November 2026

- Corrected the original unit total to 214; added three session-scope regressions for 217 passing tests.
- Fixed stale cross-session async UI updates, post-switch storage recovery, repeated detailed saves and encoded dynamic-route offline caching. Expo SDK 58 dependencies are aligned.
- Web journey, cached offline reload, real simulated receiver receipt, delayed-receipt isolation and storage-failure Retry verified. TypeScript, lint, web export and Android/iOS bundle exports pass.
- No physical native, audible-speech or real screen-reader verification. See FINAL_INTEGRATION_AUDIT.md for exact evidence, JUDGE_DEMO_RUNBOOK.md for timed scripts, FINAL_JUDGE_QA.md for defensible answers and KNOWN_LIMITATIONS.md for release gates.
