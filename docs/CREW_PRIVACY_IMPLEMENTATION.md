# Crew privacy, health-information boundaries and Privacy Shield (Feature 09)

Status: 17 November 2026. This document describes what the demonstration actually implements. It is not a security certification, and it must not be read as a claim of NASA medical-data compliance, encryption, or authenticated access control.

## 1. What was added

- **Privacy & Crew Access** (`/privacy`) with five sections: A Active session, B Visibility controls, C Local data information, D Privacy explanation, E Session controls. It is reachable from the desktop side rail, the mobile header details and the Privacy Shield, and it is **not** a sixth bottom tab.
- **Personal Health** (`/personal`) as an entry view for the active session. It shows identity, record availability, counts, the last recorded time, the storage description and five links to the existing health screens. It deliberately does not duplicate measurements, charts or assessment content.
- **Crew Status Summary** (`/crew-summary`), a restricted operational projection with the subtitle "Limited workflow information for the demonstration." It shows only crew identifier/name, whether a check-in exists, the last check-in time, the check-in count, report totals, delivery state and the last acknowledgement time.
- **Privacy Shield**: a full-viewport, opaque visual cover. It stops voice guidance, hides the application from keyboard and assistive-technology navigation, and offers a clear return action. It never changes persisted data.
- **Session isolation**: demo records live only in memory, every identification start resets the transient form/assessment/replay state, and leaving a session clears the in-tab draft.

Every surface that can be mistaken for an access-control system is labelled **"Demonstration View — Not an Authenticated Access-Control System"**.

## 2. Session scoping

| Scope | Source | Storage | Survives refresh | Owner check |
|---|---|---|---|---|
| Local device session | Local repository (IndexedDB on web, SQLite on native) | Persistent | Yes | Not verified |
| Fictional crew demo session | `createCrewDemoRepository()` fixture, crew `AVERY-001` | In memory only | No | Not verified |
| Presentation demo session | `createPresentationRepository()`, crew `PRESENTATION` | In memory only | No | Not verified |

`PresentationSession` owns `active`, `activeCrewId` and `sessionVersion`. `SessionProvider` re-reads its records when the session changes and uses a `loadedRepository` guard so a stale repository read can never overwrite the next session's screen. Demo sessions do not write to the persistent store, and ending a demo does not modify or delete saved local records.

## 3. Restricted projection model

`lib/privacy.ts` exposes two pure builders:

- `buildPersonalHealthView({ session, checkIns, reports, storageDescription })` returns a `PersonalHealthView` with session metadata, counts, latest valid timestamp and the static link list. It never returns readings, symptoms, notes or snapshots.
- `buildCrewOperationalSummary({ session, checkIns, reports, now })` takes `Pick<CheckIn, 'id' | 'recordedAt'>` and `Pick<ReportRecord, 'id' | 'status' | 'receipt'>`. The call site in `app/crew-summary.tsx` maps records down to those fields before the builder runs, so extra fields cannot leak by accident.

### Permitted in the Crew Status Summary

- Crew identifier and display name.
- Session kind, storage scope, refresh behaviour and synthetic flag.
- Whether a check-in exists, its count and its last recorded UTC timestamp.
- Report total, queued/sending/failed/acknowledged counts, delivery state text and the last acknowledgement timestamp.
- The generated timestamp.

### Never passed to the Crew Status Summary

- Heart rate, blood pressure, temperature, sleep, mood or stress.
- Symptoms, body-map selections, activity notes or adaptive answers.
- Baseline values, comparison results or assessment explanations.
- Report snapshots, payloads, hashes or receiver receipts beyond the acknowledgement timestamp.
- Readiness scores, percentages, compliance marks or health classifications. None is calculated; the screen states this in text.

## 4. Privacy Shield behaviour

- Activation is explicit (header button, mobile header icon, Privacy Center action, Personal Health control). It is also available while the mobile details panel is open.
- The overlay is rendered above the application Stack with an opaque `colors.navy[950]` background and no blur or transparency. A screenshot of the activated shield shows no health content behind it.
- While active, the application shell receives `inert`, `aria-hidden="true"`, `accessibilityElementsHidden` and `importantForAccessibility="no-hide-descendants"`. Keyboard focus is confined to the shield, and the overlay is declared `accessibilityViewIsModal`.
- Shield copy states: "Personal health details are hidden from view." plus the limit "This screen is a visual privacy mode. It is not a lock, sign-in, encryption, or access-control system." There is no "Unlock" affordance.
- Return actions: **Return to active session** (primary), **Return to identity step**, **Exit demo session** (demo only) and a link to Privacy & Crew Access. Returning does not sign in, verify a person or reload data.
- The shield is independent of animation; nothing depends on a transition completing for the cover to appear.

## 5. Voice, routes and session transitions

- `PrivacyShieldProvider.activate()` cancels current speech through the voice controller before showing the cover, and `VoiceGuidanceProvider` independently stops speech on navigation, crew change, scope change and app backgrounding.
- Returning from the shield does not re-speak anything; speech remains user-triggered.
- Routes `/privacy`, `/personal` and `/crew-summary` are ordinary Stack routes. They contain no tokens, crew identifiers, record ids or other sensitive parameters.
- All screens render client-side. There is no server-side authorization check, no API that returns crew data and no claim that DOM inspection proves backend permission.
- Starting a new identification from the header, side rail, demo banner or shield confirms when a demo is active, then `identify.tsx` defensively exits any previous session on mount. Every activation clears an unconsumed detailed-form handoff.

## 6. Unsaved drafts

- Both check-in flows report `formHasInput(...)` to `PrivacyShieldProvider.setUnsavedDraft`.
- Every exit/switch/identity path calls `confirmDiscardUnsaved(...)`. On web this uses `window.confirm`; on native it uses an `Alert` with "Keep editing" and "Discard".
- Dismissing the warning keeps the session, the typed values and the shield state. Accepting exits and clears the transient form.
- Drafts stay in component memory for the same session only. They are never written to the repository, never included in any projection and never shown in the summary. `useSessionReset` resets both check-in forms, the assessment dialog and the replay screen on `sessionVersion` changes, so a previous astronaut's draft cannot appear for the next session.

## 7. Local storage and its limits

- Local records are saved as JSON in IndexedDB (web) or SQLite (native). They are **not encrypted** and carry no crew-owner field. Anyone with access to the browser profile or device can read the stored payload.
- Browser tabs on the same origin share the same store; changes in one tab are not automatically echoed in another open tab.
- Demo fixtures exist only in memory, so a refresh returns to the local store without them.
- Records are never deleted by privacy actions. "Exit demo" only discards the in-memory session; saved local records remain.
- No analytics, telemetry, cloud sync or remote storage is used by the privacy surfaces.

## 8. What this Feature does not secure

- No authentication, passwords, PINs, biometrics, device pairing or role-based access. The local role/crew selector is a demonstration control, not an authorization system.
- No encryption at rest or in transit beyond the local HTTP receiver used by the existing report flow.
- No server-side access control; a client-side DOM check is not backend authorization.
- The fictional crew QR identifies a demo fixture. It is not proof of identity, a credential or a permission grant.
- The Privacy Shield hides the screen from casual view. It does not lock the device, block screenshots, stop another process or hide data from storage inspection.
- Gamification is absent from the summary: there is no leaderboard, no crew ranking and no progress or badge content in reports.
- Knowledge Hub content remains session-independent. It can be browsed without an active session and never reads or displays private records.

## 9. Threat-model summary (A–J)

| # | Scenario | Current behaviour | Residual risk |
|---|---|---|---|
| A | Shoulder surfing during a check-in | Opaque shield via header button | User must activate it; the device itself is not locked |
| B | Coworker opens the app on an unattended device | Local session is readable; owner is explicitly "Not verified" | No authentication; local storage is unencrypted |
| C | Crew switch with an unsaved form | Confirm dialog; dismiss keeps values; accept clears them | Native confirm wording must be re-checked on a device |
| D | Previous astronaut's data after a switch | `useSessionReset` clears forms, assessment dialog and replay; summary reads the new session only | Screen-reader announcement of the reset is not verified |
| E | Deep link to a private route | Routes render without parameters and use the active session only | Client-side rendering is not authorization |
| F | Voice keeps reading after privacy action | Shield activation and session/navigation changes cancel speech | Audible output on a physical device is unverified |
| G | Demo data persists accidentally | Demo repositories are memory-only; refresh returns to local records | A user can still read local records from storage |
| H | Report payload leaks into the summary | Projection maps ids/status/receipt only; snapshots are dropped at the call site | A future edit could widen the map; the privacy unit suite guards the projection |
| I | Privacy cover mistaken for encryption | Shield, Privacy Center and documentation repeat the limit | Screenshots can still be taken by the operating system |
| J | Unverified identity treated as verified | Every surface shows "Not verified · no authentication"; no verified badge exists | A user may ignore the label |

## 10. Verification

- `npm run typecheck` and `npm run lint` pass.
- Unit suites: privacy 28, crew 7, guided 21, assessment 25, replay 20, engagement 22, symptoms 23, knowledge 20, voice 18, adaptive 29 and receiver 1 pass (215 total across 11 suites).
- Production export `npm run build:web` succeeded and serves from `dist/web` on `http://127.0.0.1:8083`.
- Browser harness `node dist/verify-privacy.mjs` (Playwright/Edge): **74/74 checks passed with no console errors**, at 1440×900 and 390×844. Coverage:
  - Privacy Center sections A–E, local and demo session labels, owner "not verified", no horizontal overflow.
  - Personal Health record counts, five workspace links, no measurements in the DOM.
  - Crew Summary absence checks for fixture measurements, symptoms and snapshots; 12 demo check-ins; no readiness score.
  - Shield viewport coverage, opaque background `#030B14`, `fixed` positioning, shell `inert`/`aria-hidden`, keyboard focus containment, shielded navigation attempt, return flow.
  - Voice: speech starts on request, is cancelled by the shield, stays stopped after return.
  - Identity switch, unsaved-draft warning (dismiss keeps values, accept clears them), report screen unchanged by shield use, refresh returns to the local session, offline navigation.
  - Mobile: five primary tabs with no privacy tab, no overflow, shield at 390×844, expanded-header privacy entries.
- Screenshots: `dist/privacy-prod-center-1440.png`, `personal-empty-1440`, `summary-empty-1440`, `shield-1440`, `return-summary-1440`, `center-demo-1440`, `personal-demo-1440`, `summary-demo-1440`, `switch-1440`, `center-390`, `personal-390`, `summary-390`, `shield-390`, `return-390`.
- Not verified: physical Expo Go behaviour, the native Alert wording, real screen-reader announcement order, OS-level screenshots and screenshots of recent-apps previews.

## 11. Manual checks

1. Open `/privacy` on desktop and phone. Confirm the banner, sections A–E and that no sixth tab exists.
2. Identify the fictional crew (`/identify` → Scan Crew QR → Use Demo Crew QR). Confirm `/privacy` reports "Fictional crew demo session", 12 check-ins and 0 reports.
3. Open Personal Health and Crew Status Summary and confirm no measurements, symptoms, notes or snapshots appear anywhere on screen.
4. Activate the shield from the header, tab through the page and confirm focus never reaches the hidden application. Return and confirm the previous screen and data are unchanged.
5. On `/guided-check-in`, start a check-in, play a question, then activate the shield: speech must stop and must not resume on return.
6. Type into the detailed check-in, then use "Exit demo": dismiss the warning and confirm values remain; accept and confirm the form is empty.
7. Refresh during a demo: the demo session disappears and the local session is shown.
8. Disconnect networking and confirm `/privacy`, `/personal` and `/crew-summary` still render.

## 12. Main files

- `lib/privacy.ts`, `state/PrivacyShieldProvider.tsx`, `state/PresentationSession.tsx`, `state/SessionProvider.tsx`, `state/useSessionReset.ts`.
- `components/PrivacyShield.tsx`, `components/MissionHeader.tsx`, `components/SideRail.tsx`, `components/DemoModeBanner.tsx`, `app/_layout.tsx`.
- `app/privacy.tsx`, `app/personal.tsx`, `app/crew-summary.tsx`, `app/identify.tsx`, `app/guided-check-in.tsx`, `app/(tabs)/check-in.tsx`, `app/(tabs)/assessment.tsx`, `app/replay.tsx`, `lib/formHandoff.ts`.
- `tests/privacy.test.mjs`, `dist/verify-privacy.mjs`, `docs/PRIVACY_ARCHITECTURE_REVIEW.md`.
