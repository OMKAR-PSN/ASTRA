# Feature 05 — Interactive body map and self-reported symptoms

Implementation date: 17 November 2026. Branch: `feat/stitch-ui-redesign`.
This note covers the source implementation and the verification that was actually run.

## What was built

- A structured symptom model that is stored inside an existing `CheckIn` without changing
  readings, baseline comparisons, the 10% demonstration threshold, or report delivery.
- An interactive front/back body map with 15 anatomical regions, left/right selection for paired
  regions, and a general-symptom option that does not require a body area.
- An equivalent word-list/region-list path that can complete the feature without the illustration.
- Optional 1–5 intensity and an optional 500-character free-text note per entry.
- Editing and removing entries before the check-in is saved.
- Integration into both Guided Check-In and Detailed Check-In, sharing one form model, validation,
  save pipeline and persisted record shape.
- Saved-record summaries, report preview text, assessment observation text, replay details and a
  replay "Symptoms reported" event.

The body map is a recording tool. It never suggests a diagnosis, urgency, treatment or procedure,
and it does not alter assessment calculations.

## Data model

`types/astra.ts` adds optional fields to `CheckIn`/`CheckInDraft`:

```ts
symptomEntries?: SymptomEntry[];
symptomStatus?: 'none' | 'reported' | 'not-answered';
```

`SymptomEntry` records:

- `symptomEntryId` and `recordedAtUTC`
- `bodyRegion` (or `null` for a general symptom)
- `bodySide` (`left`, `right`, `center`, `not_applicable`)
- `bodyView` (`front`, `back`, or `null` for general)
- `symptomType` (`pain`, `pressure`, `tingling`, `numbness`, `stiffness`, `swelling`, `other`)
- `discomfortIntensity` (1–5 or `null`)
- `symptomNote` (trimmed, maximum 500 characters)

The legacy `symptoms: string[]` word-list field remains. It is preserved and displayed as a
`Word list:` line rather than being silently rewritten into structured entries.

Records saved before this feature have neither field. They are normalized without adding fields,
so their stored JSON and report snapshots remain unchanged. New fields are only written when the
saving flow supplies them.

### Explicit states

The UI distinguishes three outcomes instead of treating an empty list as an answer:

- `No symptoms reported` — the crew member explicitly selected None.
- `Symptoms described` — at least one structured entry or word-list item exists.
- `Symptoms not answered` / `Symptoms not recorded` — no explicit answer was given.

Selecting None clears both symptom lists and records `symptomStatus: 'none'`. No reward, score or
priority changes are tied to that choice.

## Body map and region list

`components/SymptomBodyMap.tsx` is a modal with a two-column desktop layout (illustration and
region list on the left, editor and entries on the right) and a single scrolling column on mobile.

- Front and back views are buttons with `aria-pressed` state.
- The SVG figure has a text alternative that points to the word list.
- Every region also exists as a labelled button. Paired regions expose separate left/right
  controls; unpaired regions are centered.
- The illustration is optional. The region list and word list cover the same options.
- Selecting a region opens the editor; selecting a region alone does not create an entry.
- Duplicate entries are rejected with an inline message.
- The note and intensity are optional. The intensity labels explicitly avoid presenting a clinical
  pain scale.
- Entries can be edited or removed. Done returns to the check-in with the list unchanged unless an
  add/edit/remove was saved.
- Reduced-motion preference switches the modal from a fade to no animation.

`lib/symptoms.ts` owns region/type definitions, formatting, validation, duplicate detection,
sanitization, display-state derivation and storage normalization. Untrusted or malformed stored
entries are dropped rather than rendered.

`components/SymptomSummary.tsx` renders the same entries as text in the guided summary, detailed
form and saved record.

## Check-In integration

Both flows now carry `symptomEntries` and `symptomStatus` through `lib/checkInForm.ts`.
`draftFromForm` sanitizes entries and normalizes the status before validation and save.

- Guided Check-In: step 4 offers Open Body Map, Describe in Words, and No Symptoms to Report.
  The review step shows the structured summary or the explicit no-symptom state.
- Detailed Check-In: the Symptoms section offers the body map, shows selected entries, and keeps
  the word list and None control.
- Switching flows uses the existing `lib/formHandoff.ts` copy, which now deep-copies entries.
- The guided saved screen and the detailed form display the saved entries with their timestamps.

Saving still goes through `validateDraft` and `SessionProvider.saveCheckIn`. Neither flow creates
a report. Reports are only created by explicit confirmation on the Report Preview screen.

## History, reports and replay

- `app/(tabs)/report.tsx` prints each entry through `symptomLines`.
- `app/(tabs)/assessment.tsx` shows the same lines in the original observation.
- `app/replay.tsx` shows the lines in observation details and `lib/replay.ts` adds a read-only
  `Symptoms reported` event.
- `lib/snapshot.ts` deep-copies structured entries and preserves `symptomStatus` only when the
  source record has it. Legacy snapshots are byte-identical.
- The receiver accepts the additive payload; report hashes are computed from the canonical payload
  as before. No historical report payload or hash was rewritten.

## Routing correction

`app/(tabs)/_layout.tsx` previously hid the Report Preview tab with `href: null`. Expo Router 58
now redirects a hidden tab route to the first tab, so Report Preview was unreachable by URL or by
`router.navigate('/report')` in the web export. The screen is now hidden with
`tabBarButton: () => null`, which keeps it out of the five-tab bar while preserving routing. The
browser harness verifies navigation from Reports & Sync and confirms the tab bar still shows five
items.

## Accessibility

- Full keyboard operation is verified through the region list, including a visible focus ring.
- Every SVG region is also a labelled button, so the illustration is never required.
- View toggles expose pressed state; type and intensity controls expose radio roles and checked
  state.
- The selected region, entry count, add/edit/remove and errors are announced through an
  `accessibilityLiveRegion` plus `AccessibilityInfo.announceForAccessibility`.
- Touch targets use the shared large-button sizing. The modal renders inside the existing safe
  screen shell and is scrollable on 390 × 844.
- Reduced-motion preference removes the modal fade. Other controls do not depend on animation.

## Verification

Unit tests (Node test runner with the project loader):

| Suite | Tests | Result |
|---|---|---|
| `npm run test:symptoms` | 23 | 23 pass |
| `npm run test:guided` | 21 | 21 pass |
| `npm run test:assessment` | 25 | 25 pass |
| `npm run test:replay` | 20 | 20 pass |
| `npm run test:engagement` | 22 | 22 pass |
| `npm run test:crew` | 7 | 7 pass |
| `npm run test:receiver` | 1 | 1 pass |
| **Total** | **119** | **119 pass** |

`npm run typecheck`, `npm run lint` and `npm run build:web` pass.

Browser harness `dist/verify-symptoms.mjs` (Playwright-core, Edge) against the production export
at `http://127.0.0.1:8083`:

- Desktop 1440 × 900: **53/53 checks pass**, 0 console/page errors.
- Mobile 390 × 844: **53/53 checks pass**, 0 console/page errors.

The harness covers: opening from Guided Check-In; empty map; front/back switching; real mouse
click on an SVG region; region-list selection; add/edit/remove; multiple entries across views;
guided summary; review; save; saved-record summary; detailed Check-In entry; keyboard-only
completion; report preview lines; confirmation into the outbox; assessment observation; replay
details/event; and focus-ring visibility. It also checks that the page has no horizontal overflow.

Regression browser harnesses against the same export:

- Assessment: 55/55 pass, 0 errors.
- Replay: 74/74 pass, 0 errors.
- Guided Check-In: 49/49 pass, 0 errors.
- Crew identification: all checks pass, 0 errors.

Screenshots are in `dist/` (ignored build-artifact directory), ten states at each viewport:

- `symptom-desktop-{empty,front-selected,editor,back,multiple,details,guided,saved,report,report-confirmed}-1440.png`
- `symptom-mobile-{empty,front-selected,editor,back,multiple,details,guided,saved,report,report-confirmed}-390.png`

The screenshots were inspected for clipping, overflow, tab-bar collisions, selected-region
contrast and SVG artifacts. The mobile report screenshot confirms that the bottom bar still shows
exactly the five primary destinations.

## Known limitations

- Native SQLite persistence, Expo Go rendering and physical-device touch targets were not run in
  this environment. The web build and SQLite-backed flow are code-compatible, but native runtime
  verification remains outstanding.
- Screen-reader output was not tested with VoiceOver or TalkBack. Labels and live regions were
  inspected and keyboard behavior was exercised in the browser.
- The body silhouette is a simple schematic, not a medical anatomical atlas. It is intentionally
  region-based and does not attempt to depict organs or imply a clinical finding.
- Structured entries are not migrated from legacy word-list strings. Existing word-list selections
  remain visible and unmodified.
- Browser harnesses live in the ignored `dist/` tooling, matching the existing repository setup.
  They require the separately installed Playwright-core package and a running production export.

## Demo instructions

1. From a clean local store, open **Health Check-In** → **Describe Symptoms on Body Map**.
2. On the front view, select a region such as Head, choose a sensation, optionally set intensity
   and add a note, then press **Add symptom**.
3. Switch to **Back view**, select Upper back, add a second symptom, then press **Done**.
   The check-in shows both entries.
4. Save the check-in. Open **Assessment** → **Original observation** to see the same lines.
5. Open **Reports & Sync** → **Preview latest report**. The report preview includes the structured
   symptom lines. Press **Confirm and queue** to create one outbox report.
6. Open **Health Trends** → **Mission Health Replay** to see the symptom entry and the
   `Symptoms reported` event without changing the saved record.
7. To exercise the text-only path, reopen the body map, use the region list or the word list, and
   complete the form with the keyboard.
