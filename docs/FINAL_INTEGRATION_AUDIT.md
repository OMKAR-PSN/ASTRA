# ASTRA CARE — Final integration and hackathon readiness audit

Date: 17 November 2026. Starting checkpoint: `0fbd1c3`, branch `feat/stitch-ui-redesign`. The starting working tree was clean. All nine requested milestones are present. No tenth feature, schema migration, assessment-threshold change, API-contract change, push, or merge was made.

## Verdict

The tested web paths support a credible synthetic hackathon demonstration. This is not certification of clinical validity, production security, native runtime readiness, or accessibility compliance. Native execution, real audible speech and screen-reader testing remain explicit release gates. See KNOWN_LIMITATIONS.md, JUDGE_DEMO_RUNBOOK.md and FINAL_JUDGE_QA.md.

## Confirmed defects corrected

1. **Cross-session asynchronous updates:** unfinished saves, report confirmations, engagement writes and delivery responses could update a different session's displayed state. Repository-scoped operation generations now discard stale UI results; repository writes remain associated with their original repository. In-flight report IDs are also scoped per repository. A delayed real receiver response test confirmed that the original local report received its receipt while the same-ID demo report remained queued.
2. **Restoration failure after switching:** the initial-ready flag previously bypassed the recovery screen on a later repository-load failure. The error gate now handles that case. Injected IndexedDB failure after leaving a demo displayed Storage unavailable; restoring access and pressing Retry restored the navigable local session without page errors.
3. **Detailed form duplicate save:** added a synchronous in-flight guard, matching the guided form's existing protection. Browser double dispatch resulted in exactly one additional offline record.
4. **Cold-offline dynamic route asset:** precached percent-encoded bracket filenames did not match literal bracket requests for the Knowledge Card chunk. The service worker now normalizes the path comparison and reads the original cache key. The original failure was reproduced, then cached offline Knowledge Hub, check-in, assessment and replay reloads passed. Cache registration generation is idempotent.
5. **Expo compatibility drift:** aligned Expo 58.0.26, Router 58.0.32, SQLite 58.0.18 and Web Browser 58.1.0 to Expo's recommended versions. `expo install --check` now reports dependencies up to date. No new native module was added.
6. **Documentation:** corrected 215 to 214 for the original test inventory and removed wording that could suggest local HTTP encrypts transport.

## Architecture and repository review

Expo Router remains the application router. Five primary routes are overview, check-in, trends (`dashboard`), assessment and delivery; report is a hidden-tab route. Secondary routes cover identify, guided-check-in, replay, journey, knowledge and card detail, voice settings, privacy, personal view and crew summary. Navigation tests confirm hidden report routing and the stable five mobile tabs.

PresentationSession selects persistent local or temporary fictional repositories. SessionProvider owns observations, reports, engagement and link state. Web persistence is IndexedDB; native persistence is SQLite. A synthetic 10% comparison produces deterministic findings. Reports store confirmed immutable snapshots. Only an explicit send/retry uses the receiver contract and validates a returned receipt. Bundled knowledge, conditional follow-up rules, replay and participation tracking work locally. Voice is optional and all primary interactions have text.

No broken imports or TypeScript/lint errors were found. Installed dependencies such as Supabase, haptics, symbols and web-browser have no direct app imports in the searched app/lib/components/state paths; no speculative removal was attempted. Eight moderate dependency advisories remain documented separately. The receiver emits Node's experimental SQLite/module-type warnings; these did not prevent its test or actual receipt storage. Metro recovered from an old cache deserialization warning by rebuilding; exports completed.

## Exact automated test inventory

`npm.cmd test` now runs every unit/receiver test file using the existing TypeScript resolver. Baseline count reconciliation:

| Suite | Baseline | Final |
| --- | ---: | ---: |
| Privacy | 28 | 28 |
| Crew identity | 7 | 7 |
| Guided check-in | 21 | 21 |
| Assessment | 25 | 25 |
| Replay | 20 | 20 |
| Engagement | 22 | 22 |
| Symptoms | 23 | 23 |
| Knowledge | 20 | 20 |
| Voice controller | 18 | 18 |
| Adaptive questions | 29 | 29 |
| Receiver | 1 | 1 |
| Session task scope (new regressions) | 0 | 3 |
| **Total** | **214** | **217** |

There was no missing 215th test. The old total was arithmetic/reporting error. Final runner output: 217 tests, 217 pass, 0 fail, 0 cancelled, 0 skipped, 0 todo. Node reports zero suite-container objects; the 12 rows above group files, not Node `describe` containers.

Build gates: TypeScript passed; Expo lint passed; production web export/cache generation passed; Android and iOS JavaScript/asset exports passed; Expo dependency compatibility passed. Native export is not an APK/IPA build or device run.

## Feature integration evidence

Microsoft Edge automation, isolated contexts, local production export:

| Feature/check | Browser evidence | Unit coverage |
| --- | --- | --- |
| Guided Check-In | 49 checks pass; validation, handoff, repeated save and restoration | 21 |
| Plain-language assessment | 55 checks pass; observation explanations/calculation details | 25 |
| Replay | 74 checks pass; chronology, fixture review, controls and mobile layout | 20 |
| Wellness Journey | Combined route/record journey plus participation state tests | 22 |
| Body Map | 53 checks pass; real browser mouse SVG selection, region-list equivalent, editing and persistence | 23 |
| Knowledge | 41 checks pass; search, cards, source context and responsive layout | 20 |
| Voice controls | 53 checks pass with stubbed speech engine; interruption/control behavior only | 18 |
| Adaptive questions | 38 checks pass; conditional questions, skip/edit, saved wording | 29 |
| Privacy | 74 checks pass; restricted summary, full opaque cover, focus trap, inert shell, session exit | 28 |
| Navigation | 16 checks pass; primary routes and hidden report route | — |

The above feature/navigation harnesses total 453 assertions. A separate combined journey passed 39 assertions. Do not add browser assertions to the unit-test total. Two fault-injection recovery checks and one delayed-receipt scenario also passed. These counts describe test assertions, not independent proof of every possible state.

Older local harnesses initially stopped on duplicate Continue selectors introduced by nested follow-up questions, or on the old replay demo-exit destination. Their selectors/navigation were updated to the current supported flow. A transient preview-server restart was needed after rebuilding served files. Those interrupted runs are not counted as passes.

## User journeys and data integrity

- **A — Local:** guided mood/stress, sleep and HR entry; Body Map head discomfort; symptom words and optional follow-up; double-dispatch save; one record with HR 86 and absent temperature. Assessment, trends, replay, journey, knowledge, personal/privacy/crew views, report preview and detailed form all opened. Read-only visits left the observation array unchanged. Confirmation created one queued report with no receipt.
- **B — Fictional crew:** QR fixture identification, overview/assessment/replay and privacy/session boundaries exercised through the feature harnesses. Demo selection left persistent history unchanged; supported exit restored local state. Re-identification starts a fresh temporary fixture, not a durable user profile.
- **C — Offline:** after completed service-worker installation, browser network was disabled. Cached full reload into Knowledge Hub worked after the cache fix. Detailed check-in saved one record despite repeated dispatch; assessment and replay reloaded offline. Earlier confirmed report remained intact. Reconnection alone did not acknowledge it. Explicit send obtained an actual HTTP response from the isolated simulated receiver; the validated receipt was stored.
- Guided/detailed records share the repository model. Body-map/adaptive sanitization, original question wording, explicit-none versus unanswered, malformed entries and missing readings are covered by existing suites. No measured values were synthesized to fill absent fields.
- The 10% constant and assessment calculations were not modified. Replay tests check historical record subsets; baseline provenance explicitly identifies retrospective comparison where used. Do not present that as knowledge available to a crew member at the earlier timestamp.
- Reports preserve source snapshots, including earlier reports after later check-ins. Receiver tests exercise duplicate handling and mismatch behavior. Receipt hashes are consistency checks, not authenticated signatures.
- Privacy actions neither create nor send reports; engagement fields are separate from health observations and report payloads. No ownership schema or medical rule was changed.

## Visual and accessibility review

Captured all primary routes at 1440 × 900 and 390 × 844, plus Body Map/editor and shield images from feature tests. Reviewed desktop/mobile contact sheets and full-sized overview, assessment and report samples. Shared dark background, teal primary actions, typography, navigation and cards remain consistent. Automated route checks found no horizontal page overflow. Long screens intentionally scroll; viewport screenshots do not by themselves prove every below-fold control is unobscured. Feature harnesses exercise lower-page form/report actions and modal scrolling.

Automated/browser interaction evidence includes labeled inputs and states, region-list alternative to the illustration, keyboard focus styling, shield focus containment and app-shell accessibility hiding. Reduced-motion was enabled for the separate performance sample; existing replay tests cover relevant motion behavior. No real TalkBack, VoiceOver, NVDA, speaker listening, full forced-colors review, 200% text-zoom audit, or quantitative WCAG contrast audit was performed. No accessibility certification is claimed. Written flows remain usable without speech.

## Practical timing sample

One unthrottled local Edge run, desktop viewport, reduced motion, fresh context. Timer spans the action to an expected visible marker plus two animation frames. Direct route openings include document navigation; these are not pure component-render timings or field benchmarks. Values vary with machine/browser/cache and should not be advertised as performance improvements.

| Action | Observed ms |
| --- | ---: |
| Initial dashboard | 1210 |
| Primary tab switch | 533 |
| Open Replay via URL | 945 |
| Open Guided Check-In via URL | 969 |
| Load fictional crew fixture (reduced motion) | 429 |
| Open Knowledge Hub via URL | 945 |
| Render Body Map after opening | 151 |
| Activate Privacy Shield | 99 |

No page errors were recorded in the successful combined journey or feature harnesses; no SVG responder warnings surfaced there. Source inspection found cleanup for replay timers and voice watchdogs/provider subscriptions. This is not a heap-profile or long-duration memory-leak certification. No claim of quantified speedup is made.

## Scientific, privacy and security review

Visible copy and documentation were searched for diagnosis, clinical validation, NASA approval, live monitoring, NFC, encryption and sensor claims. Matches in the reviewed UI were appropriate negations/limitations; the HTTP encryption documentation ambiguity was corrected. General NASA references support contextual education, not the synthetic cutoff, clinical advice, flight certification or product approval. The source list's reviewed dates are content metadata, not proof of clinical review.

Verified relevant primary references include NASA's [five hazards](https://www.nasa.gov/hrp/hazards/) and [cardiovascular adaptation overview](https://www.nasa.gov/missions/station/cardiovascular-health-in-microgravity/). Expo's [upgrade guidance](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/) supports dependency alignment and the distinction between SDK compatibility and device testing.

The 26 source URLs were probed: 20 returned HTTP 200 directly. Browser-source retrieval confirmed the two CDC pages, the Canadian Space Agency health page, and NTRS citation 20250000703 after local request failures; NTRS citation 20230015521 confirmed the timed-out PDF's identity. The 20220013418 communication-delays source remained unavailable in this environment, so its full text was not revalidated. HTTP success/title matching does not constitute a fresh scientific review of every document. Raw results are in `dist/audit/source-links.json`.

Crew Summary constructs a restricted projection of IDs/counts/timestamps/delivery state, omitting measurements, symptoms and notes. The shield is an opaque cover, with no translucency exposing the underlying private screen; in-app navigation cannot visibly bypass the active overlay. Full reload is outside that protection. Route parameters use record/card identifiers, not health notes/measurements. No health-note debug logs were found in the searched app/state/lib paths. Local storage is unencrypted and identity is demonstrative. No cosmetic login or security guarantee was added.

## Mock evaluation (not an official NASA score)

| Category | /10 | Evidence and skeptical challenge | One meaningful improvement |
| --- | ---: | --- | --- |
| Problem understanding | 8 | Communication-limited record access is clear; actual crew needs not studied | Conduct crew/clinician workflow interviews |
| Innovation | 7 | Integrated explainable UX; individual functions are established patterns | Validate a specific usability advantage |
| Technical depth | 8 | Persistence, immutable reports, idempotent receiver, offline cache and regression tests | Native fault-injection coverage |
| Working functionality | 8 | Web journeys pass; device runtime remains unverified | Complete physical-device checklist |
| Space-mission relevance | 7 | NASA context and communications scenario; no operational integration | Map one real mission workflow with domain experts |
| Human-centered design | 8 | Guided entry, optional prompts and text alternatives | Observe representative users completing tasks |
| Scientific responsibility | 8 | Clear non-diagnostic limits and source context | Independent review of educational content |
| Offline resilience | 8 | Cached reload, local saves, queue and legitimate receipts verified | Storage-eviction/recovery testing |
| Privacy awareness | 7 | Honest shield and metadata projection; no real access controls | Design authenticated ownership boundaries before real data |
| Presentation readiness | 8 | Timed scripts and fallback paths; not a timed human rehearsal | Rehearse on the actual presentation hardware |
| Demo reliability | 8 | Deterministic fixtures and multiple passing browser checks | Run the full script in the intended venue/network |
| Feasibility | 7 | Feasible educational prototype; large gap to mission deployment | Define a limited validated next deployment scope |

## Reproduction and evidence

Core gates:

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run lint
npx.cmd expo install --check
$env:EXPO_PUBLIC_RECEIVER_URL = "http://127.0.0.1:8787"
npm.cmd run build:web
npx.cmd expo export --platform android --platform ios --output-dir dist/audit/native --max-workers 1
```

Browser audit requires Edge and Playwright Core. The audit machine already had the latter under `dist/browser-tools/node_modules`. On a fresh clone, install only that optional test tool with `npm.cmd install --prefix dist/browser-tools --no-save playwright-core`; it is not an app/native dependency. Create `dist/audit` if needed. Run `npm.cmd run preview:web` in a terminal and the isolated receiver in another (`RECEIVER_DB=dist/audit/receiver.db`, then `npm.cmd run receiver`). Run `npm.cmd run test:web:audit` from a third terminal. Use `node scripts/audit-performance.mjs` for the separate sample. `ASTRA_AUDIT_URL` overrides the default http://127.0.0.1:8196; `ASTRA_PLAYWRIGHT_MODULE` can identify another installed Playwright Core module. The web build must point at the reachable receiver before exporting.

Local ignored evidence: `dist/audit/final-unit.log`, per-suite baseline JSON/logs, `*-final.log`, `integration.json`, `recovery.log`, `session-race.log`, `performance.json`, build logs, `npm-audit.json`, source-link probe, route PNGs and contact sheets. Older feature harnesses remain local ignored audit utilities; the combined journey, storage recovery, delayed-receipt and performance scripts are retained in `scripts/`. Generated exports, screenshots and receiver database are excluded from the commit.

All fixes/docs remain on the existing feature branch. Use `git log -1 --oneline` to identify the audit checkpoint; the hash is reported with delivery rather than embedding a self-referential hash here. No push or merge is authorized by this audit.
