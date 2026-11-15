# ASTRA CARE progress and remaining work

Status: 15 November 2026. This describes the source implementation, not a deployed production release.

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

The audit and source references are in UI_UX_AUDIT.md. The layout is NASA-inspired, without a certification claim.

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
3. Check safe areas, keyboard overlap, text scaling, touch targets and native chart interactions.
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
- Reusable UI: MetricTile.tsx, TrendBars.tsx, BodyMap.tsx (new), OutboxItem.tsx, NumericField.tsx, SymptomChecklist.tsx and shared action controls.
- Persistence/delivery: state/SessionProvider.tsx, lib/sessionRepository.web.ts, lib/sessionRepository.native.ts, lib/sessionRepositoryContract.ts, lib/receiver.ts, lib/reportProtocol.ts, ground-receiver/.
- Supporting logic/build: lib/format.ts, lib/comparison.ts, lib/readingTiles.ts, lib/checkInStreak.ts, scripts/build-web-cache.mjs, package.json, app.json.
- Documentation: README.md, docs/decisions.md, docs/UI_UX_AUDIT.md and this progress report.

## Stitch design integration

Milestone 1 is implemented on feat/stitch-ui-redesign: shared tokens/surfaces/navigation/header and Mission Overview. See STITCH_INTEGRATION.md for the inspected export, preserved contracts, validation and remaining differences. The other screen-specific Stitch layouts are intentionally deferred.
