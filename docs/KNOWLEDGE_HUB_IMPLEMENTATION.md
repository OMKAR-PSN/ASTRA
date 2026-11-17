# Crew Knowledge Hub — Feature 06 implementation report

Status: implemented and verified 2026-11-17. Scope ended before Feature 07.

The Crew Knowledge Hub is an offline, plain-language library that explains the health concepts
and app behavior already present in ASTRA CARE. It is educational context, not a chatbot, not a
diagnostic system, not a treatment guide and not NASA-approved flight medical guidance. The
educational notice appears on every card and the hub carries a separate safety panel.

## 1. Hub

- Route: `/knowledge`; title "Crew Knowledge Hub"; subtitle "Clear explanations for your health
  records, available offline."
- Entry points: the desktop sidebar and the expanded mobile header ("Crew Knowledge Hub ·
  offline"). It is not a sixth bottom tab.
- Header shows "OFFLINE LIBRARY · BUNDLED WITH THE APP" and catalog counts derived from the
  catalog (21 cards, 4 categories, reviewed 2026-11-17).
- Search panel states that search is local and no query leaves the device.
- Desktop: category column and "Available offline" note, featured "Start here" cards, results,
  and a reading-guide / medical-safety column with the content version.
- Mobile: horizontally scrollable category chips, stacked cards, no document-level horizontal
  overflow at 390×844.
- Back navigation from an article preserves the last query and category filter; the filter is
  held in module state, not in a URL or localStorage.

## 2. Offline catalog

- 21 original cards in four fixed categories:
  - Understanding your observations — 5
  - Health measurement basics — 5
  - Using ASTRA CARE — 8
  - Spaceflight context — 3
- 26 external sources, S01–S26, each with title, publisher, URL, publication date when stated,
  review date, topic and content version.
- Card and citation text is bundled TypeScript. There is no `fetch`, XMLHttpRequest, WebSocket,
  Supabase client, cloud login or AI call in the knowledge modules. Only opening an external
  citation URL requires internet, and the UI labels every source "External link · requires
  internet".
- External source pages are not scraped at runtime and their text is not copied into cards.
- Content includes app explanations, general health education and spaceflight research context.
  It excludes diagnosis algorithms, medication doses, emergency treatment procedures,
  spaceflight-specific clinical interventions, invented physiological thresholds, autonomous
  triage and unsupported radiation-illness claims.

## 3. Search and filters

- Local, deterministic search across title, keywords, category labels, quick answer, simple
  explanation and extended explanation, in that weight order.
- Case-insensitive, NFKD-normalized, accent-insensitive and whitespace-tolerant. Every query
  token must appear in at least one field; results are ranked and then returned in catalog order.
- Filtering by one of the four categories or "All cards"; search and filter combine.
- Empty search returns the full catalog in catalog order. An unmatched query shows "No cards
  match your search" with a "Clear search and filters" action; no content is generated.
- No query history, no analytics and no network request. Results count is announced with
  `accessibilityLiveRegion="polite"`.

## 4. Three-level content

Every card has:

1. **Quick answer** — one or two sentences and the first thing shown after the title.
2. **Simple explanation** — a plain-language paragraph plus an everyday example where useful.
3. **Learn more** — a collapsible section with optional detail, limitations and app context.

Cards also show category, classification, content version, review date, reading estimate,
related cards, sources and the educational notice. Baseline and percentage cards include small
conceptual diagrams. The article route is `/knowledge/<cardId>`; IDs are stable, URL-safe and
contain no observation values, crew names, reports or query parameters.

A missing or retired ID renders "That card is not in the offline library" with a link back to
the hub. No substitute content is generated.

## 5. Contextual links

`KnowledgeLink` opens a specific card from existing workflows without duplicating explanations:

- Mission Overview: five hazards of human spaceflight; hub button.
- Health Check-In: sleep records, symptom reporting.
- Guided check-in: sleep duration, blood-pressure readings, symptom reporting.
- Assessment: personal baseline and percentage difference when an assessment exists; the
  pre-check-in empty state also offers "What does baseline mean?" and a hub button.
- Health Trends: personal baseline, missing data.
- Reports & Sync: offline report queue, ground acknowledgement.
- Mission Health Replay: historical replay explanation.

`KnowledgeLink` renders nothing for an unknown ID. Test 08 scans every static `<KnowledgeLink>`
target under `app/` and `components/` and fails if a card ID does not resolve.

## 6. Research-source register

`docs/KNOWLEDGE_CONTENT_SOURCES.md` records all 26 sources, the sourcing rules, how app-behavior
cards are grounded in the shipped implementation, the card-to-source map and review notes. No
source was cited without opening it. Undated publisher pages are recorded as "Not stated" or
`null`, never guessed.

## 7. Content versioning

`docs/KNOWLEDGE_CONTENT_VERSIONING.md` documents how to update content, review references, retire
outdated content, add a card and validate internal contextual links. It also states the two data
boundaries:

- content updates must not rewrite or reinterpret historical health observations;
- knowledge-card text is not embedded in immutable report snapshots.

Cards are version 1.0.0 and sources version 1.0, all reviewed 2026-11-17. The hub header/footer
read counts and version metadata from the catalog.

## 8. Accessibility

- Search has an explicit label and hint; clear-search is a labeled button.
- Category chips are buttons with a selected state; the results count is a polite live region.
- Card tiles are links with card title and summary in the accessible name.
- "Learn more" is a button with `accessibilityState.expanded` and an explicit label that changes
  to "Hide learn more"; it has a visible web focus ring and 44px minimum height.
- Source rows are links with publisher and "opens an external source" context plus an external
  internet hint. URLs are selectable and wrap on web.
- Section headings use header roles; mobile and desktop layouts were checked at 390×844 and
  1440×900. Keyboard typing and Tab focus movement were exercised in the browser harness; full
  focus traversal and activation of every control were not.
- Not verified: screen-reader output, browser 200% text zoom and native touch exploration.

## 9. Automated tests

`tests/knowledge.test.mjs` contains 20 tests:

1. catalog completeness and all three levels;
2. unique URL-safe IDs;
3. exactly four populated categories;
4. title/summary search, case-insensitivity and no-result behavior;
5. keyword-only matches;
6. empty-search order and category filtering;
7. stable card routing with no query data;
8. missing-card handling plus contextual-link resolution;
9. offline content scan (no runtime fetch/storage);
10. reference metadata completeness and resolution;
11. card/source versioning and documentation;
12. no diagnosis, dosage, emergency or invented-range patterns;
13. no private observation values in routes or link components;
14. no effect on the assessment engine or 10% threshold;
15. no effect on report snapshots or the queue;
16. no effect on crew identity;
17. no effect on replay;
18. no knowledge milestone added (engagement remains six milestones);
19. independence from the synthetic presentation session;
20. independence from the local stored session and catalog purity.

The browser harness (`dist/verify-knowledge.mjs`, local verification tooling, not committed)
exercised 41 checks at 1440×900 and 390×844: direct hub open, counts and safety copy, search,
category filter, open article, expand Learn more, sources, back with preserved filter,
Assessment→card, Reports & Sync→card, keyboard typing/Tab, in-session offline search and
navigation, mobile layout and no horizontal overflow. It produced no console or page errors.

## 10. Screenshots

Local evidence in ignored `dist/`, reviewed for truncation, overflow, overlap and unreadable
URLs:

- `dist/knowledge-hub-desktop.png`, `knowledge-search-desktop.png`,
  `knowledge-filter-desktop.png`, `knowledge-article-desktop.png`,
  `knowledge-learn-more-desktop.png`, `knowledge-sources-desktop.png`,
  `knowledge-context-assessment-desktop.png`, `knowledge-offline-desktop.png`
- `dist/knowledge-hub-mobile.png`, `knowledge-search-mobile.png`,
  `knowledge-filter-mobile.png`, `knowledge-article-mobile.png`,
  `knowledge-learn-more-mobile.png`, `knowledge-sources-mobile.png`

The mobile featured-card overflow and truncated search placeholder found during review were
fixed before the final run. Source URLs wrap at both widths.

## 11. Files changed

New:

- `app/knowledge.tsx`, `app/knowledge/[cardId].tsx`
- `components/KnowledgeLink.tsx`, `components/KnowledgeCardTile.tsx`,
  `components/KnowledgeDiagram.tsx`
- `lib/knowledge/types.ts`, `lib/knowledge/sources.ts`, `lib/knowledge/catalog.ts`,
  `lib/knowledge/index.ts`
- `tests/knowledge.test.mjs`
- `docs/KNOWLEDGE_CONTENT_SOURCES.md`, `docs/KNOWLEDGE_CONTENT_VERSIONING.md`,
  `docs/KNOWLEDGE_HUB_IMPLEMENTATION.md`

Modified:

- `app/_layout.tsx` (register `knowledge` and `knowledge/[cardId]`)
- `app/(tabs)/index.tsx`, `check-in.tsx`, `dashboard.tsx`, `assessment.tsx`, `delivery.tsx`
- `app/guided-check-in.tsx`, `app/replay.tsx`
- `components/SideRail.tsx`, `components/MissionHeader.tsx`
- `package.json` (`test:knowledge`)
- `docs/PROGRESS.md`

No fixture, comparison, assessment, snapshot, queue, crew-identity or replay logic was changed.
No sixth tab was added. The ignored `dist/` harness and screenshots are not part of the commit.

## 12. Exact test results

Final run on 2026-11-17:

| Suite | Result |
|---|---|
| knowledge | 20/20 pass |
| crew | 7/7 pass |
| guided | 21/21 pass |
| assessment | 25/25 pass |
| replay | 20/20 pass |
| engagement | 22/22 pass |
| symptoms | 23/23 pass |
| receiver | 1/1 pass |
| **Total unit tests** | **139/139 pass, 0 fail** |
| Browser harness | 41/41 checks pass, 0 errors |
| `npm run typecheck` | pass |
| `npm run lint` | pass |
| `npm run build:web` | pass (`dist/web`, including the knowledge route) |

## 13. Known limitations

- Physical Expo Go, Android/iOS runtime, screen readers, 200% text zoom and native touch
  behavior remain unverified; browser checks do not prove them.
- Search is English substring matching with token AND semantics. It has no stemming, fuzzy
  matching or translation.
- Content ships with the app; there is no CMS or remote update path, by design. A content change
  requires a new build.
- External citation availability depends on the publishers and needs internet. Metadata was
  reviewed on 2026-11-17 and must be re-reviewed on the schedule in the versioning document.
- In-session offline navigation to a card from the hub is verified. A cold offline reload
  directly on an article URL was not separately verified.
- No knowledge-specific engagement milestone was added. Adding one would require extending the
  existing engagement event contract, which this feature did not do.
- No new clinical scoring, diagnosis, triage, treatment recommendation, IoT integration,
  adaptive follow-up, privacy dashboard or AI copilot was implemented.

## 14. Demo instructions

From the project root in Git Bash:

```bash
cd /c/Users/Omkar/Desktop/NASA_Space_App_Challenge_26
npm install
npm run web
```

Open the local URL Expo prints (normally `http://localhost:8081`) and choose "Crew Knowledge
Hub · OFFLINE" in the sidebar, or open `/knowledge` directly. On a phone matching SDK 58, use
`npm run start:phone` and scan the QR code in Expo Go; physical-device verification is still
outstanding.

Suggested demo path:

1. Search `baseline`; open "What is a personal baseline?" and read the quick answer and simple
   explanation. Expand "Learn more" and scroll to the source register.
2. Return to the hub and confirm the query is still present. Filter "Health measurement basics"
   and open the blood-pressure card.
3. Open the Assessment screen. Before any check-in, use "What does baseline mean?"; with a saved
   check-in, use the baseline and percentage links in the assessment context.
4. Open Reports & Sync and follow "What does queued mean?".
5. With the hub loaded, switch browser DevTools to Offline, search `offline`, filter and open the
   queue card. External source links still require internet and say so.

Regression and verification commands:

```bash
npm run typecheck
npm run lint
npm run test:knowledge
npm run test:crew && npm run test:guided && npm run test:assessment
npm run test:replay && npm run test:engagement && npm run test:symptoms && npm run test:receiver
npm run build:web
```

The local production harness requires the ignored `dist/` workspace: serve `dist/web` with
`node dist/static-server.mjs`, then run `node dist/verify-knowledge.mjs` against
`http://127.0.0.1:8083`.
