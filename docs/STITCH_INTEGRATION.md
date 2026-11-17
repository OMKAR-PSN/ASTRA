# Stitch integration — Milestone 1

## Inspection and plan

The ZIP in Downloads was verified with Python zipfile.testzip (no corrupt entries) and extracted with path containment checks to design-reference/stitch/. The existing stitch-refernce/stitch_astra_care_astronaut_health_ui directory was already extracted. Both references remain separate from application assets and are gitignored.

Archive SHA-256: afe17ca51471348dbed6a0a378dbf300275edb86fd2401ce919062e0517baa4a

Inventory: 11 code.html files, 8 screen.png images, one DESIGN.md, and directory entries (33 ZIP entries total). Six desktop screens and five mobile screens. No separate CSS, bundled fonts, or application source project. HTML embeds CSS/Tailwind configuration, Google Fonts links (Inter, JetBrains Mono, Material Symbols), inline SVG and some remote images. Mobile Overview, Assessment and Reports have HTML without PNG previews. DESIGN.md lives under astra_care_transit_system/.

The YAML palette, prose palette and HTML differ. Milestone 1 follows the prose/dossier canvas #080F1C, solid surface #132236, cyan #50DED8, blue #8DBBFF and amber #F3C16B. Inter remains bundled locally; platform monospace replaces unbundled JetBrains Mono. Small muted text is lightened for readability. Existing spacing aliases are preserved to avoid unintentionally resizing the other four screens; additional Stitch spacing tokens are explicit.

| Export suffix (desktop and mobile unless noted) | Existing route | Milestone |
|---|---|---|
| mission_overview | / | 1 |
| daily_health_check_in | /check-in | Later |
| health_trends | /dashboard | Later |
| explainable_assessment | /assessment | Later |
| reports_sync | /delivery | Later |
| medical_report_preview (desktop only) | /report, including reportId query | Later |

## Component and functionality inventory

- Reuse: Expo Router tabs/Stack, PrimaryButton, StatusPill, EmptyState, TrendBars, ComparisonTable; existing MetricTile continues on other screens.
- Visually change: theme tokens, SideRail, ScreenContainer, mobile tab styling and Mission Overview.
- Add: Surface (solid/glass), MissionHeader (extracted shared header), ObservationCard (Overview presentation only).
- Preserve: SessionProvider restoration/loading/retry, validation, all original models/fixtures, 1–5 mood/stress scales, 10% demo threshold and deterministic explanations.
- Preserve: IndexedDB v1/session/data, native SQLite mission_session, confirmation idempotency and immutable snapshots, queued/failed/acknowledged persistence, transient Sending, manual outage and receiver URL handling, API and receipt/hash contract.
- Preserve: all six existing paths and report snapshot query links. No new routes or packages.

The dossier's create-expo-app, replacement data models and mockData instructions conflict with the user's integration-only request and are not applied. DESIGN.md's diagnostic language is visual reference copy, not a product claim.

Unsupported reference details omitted: real-time sensor sync, clinical normality, 30-day derived statistics, fictional resolved historical events, different baseline/threshold/rule versions, stress /10, hydration, exercise prescriptions, CO2 causes, DSN apertures, fixed light delay, mission distances and storage-capacity/cryptographic enclave claims. Report acknowledgements continue to require the actual simulator response. No decorative settings, date-range or metric-selection controls are added without a working action.

## Implementation order and compatibility

1. Feature branch from ASTRA/main at 9e862b9.
2. Additive tokens and reusable surfaces.
3. Shared header, sidebar and mobile navigation styling.
4. Mission Overview: mission progress; six observation cards (combined BP); recorded trend; assessment and local handoff panels; retained baseline table and hazard context.
5. Typecheck/lint/build, workflow regressions, visual review and verified milestone commit.

Web blur is gated by CSS support and disabled for reduced-transparency/high-contrast preference. Unsupported browsers and native use opaque surfaces. No native blur module or remote runtime assets are required. Native SSR-safe web guards and Android export are checked, but physical Expo Go behavior remains a device-test limitation. Other screens inherit tokens/shell only; their layouts remain unchanged.

## Regression plan

Run npm run typecheck, npm run lint, npm run build:web, npm run test:receiver and Android bundle export. Use existing local Edge scripts for baseline/deviation, missing input, immutable/duplicate report confirmation, offline reload and save, storage restoration failure/retry, failed request/retry and receipt persistence. Check all primary routes at six widths and report deep links. Compare Overview against the desktop PNG and mobile HTML, checking empty, populated and stale states, 1–5 scale labels, partial BP and reduced-transparency fallback. Test screenshot data is synthetic and created in isolated browser contexts.

## Verification results

- TypeScript and Expo lint passed.
- Web production export and offline-cache generation passed.
- Android bundle export passed; no physical Expo Go device was tested.
- Receiver test passed (persisted receipts, duplicates, conflicts and invalid submissions).
- Edge checked all five primary routes at 375x812, 390x844, 768x1024, 1280x800, 1440x900 and 1920x1080 without document horizontal overflow.
- Edge workflow regression passed: baseline/deviation, duplicate-safe confirmation, offline launch/save, retained earlier report, injected storage-load failure and Retry, failed send/retry, and persisted acknowledgement.
- Saved-report deep-link navigation and reload passed; the original 92 bpm snapshot remained visible after a later sleep-only check-in.
- Dedicated Overview checks passed: six empty observation cards; actual saved readings; original 1–5 mood/stress scales; partial blood pressure; 24-hour demo freshness labels; reduced-transparency opaque fallback; no browser page errors.
- Actual Overview screenshots are in dist/stitch-overview-WIDTH.png and lower-page captures in dist/stitch-trend-WIDTH.png. Desktop/phone captures were inspected against the exported desktop PNG and mobile HTML structure. The encoding defect found during visual review was corrected to UTF-8 and tests rerun.
- Domain, fixtures, models, SessionProvider, both storage adapters, receiver code, API contract and dependencies have no changes in this milestone.

## Remaining differences and blockers

Native uses solid surfaces, and unbundled JetBrains Mono is replaced by system monospace. Glass is intentionally subtle and limited to the shared header and mission summary. The mission card displays existing day/progress and record counts rather than unsupported orbital distance/light-delay data. Missing history is shown honestly rather than reproducing the screenshot's invented chart. Current source readings and 1–5 scores differ intentionally from the reference. Tablet retains existing mobile navigation below the established desktop breakpoint; no new icon-only rail is introduced. Other screen-specific Stitch layouts remain for subsequent milestones.

No implementation blocker for this milestone. Device testing, exhaustive screen-reader/text-scaling QA and later-screen designs remain outstanding. Reference export and generated screenshots stay local; this document records provenance and the mapping.
