# Crew Knowledge Hub — content versioning and review

Feature 06. This document describes how the bundled knowledge catalog is updated, reviewed,
retired and validated. The catalog is static TypeScript shipped with the app; it is not loaded
from a CMS or a network API.

Initial content: version 1.0.0 for all cards, version 1.0 for all sources, reviewed 2026-11-17.

## Where content lives

| Concern | File |
|---|---|
| Card text, categories, related metadata | `lib/knowledge/catalog.ts` |
| External source metadata | `lib/knowledge/sources.ts` |
| Types and the educational notice | `lib/knowledge/types.ts` |
| Search, filtering, routing and related cards | `lib/knowledge/index.ts` |
| Human-readable source register | `docs/KNOWLEDGE_CONTENT_SOURCES.md` |
| Hub and article screens | `app/knowledge.tsx`, `app/knowledge/[cardId].tsx` |
| Contextual entry links | `components/KnowledgeLink.tsx` and its host screens |
| Automated checks | `tests/knowledge.test.mjs` |

The shared card version and review date are the `VERSION` and `REVIEWED` constants at the top of
`catalog.ts`. Source review dates use `REVIEWED_AT` in `sources.ts`. The hub header and footer
read the counts, version and review date from the catalog, so a catalog update changes the
displayed values without a second edit.

## Version rules

- **Card `version`** is a content revision for that card, not the app version. Bump it whenever
  the meaning, scope, examples or references change.
  - Patch (`1.0.1`): wording correction with no change in meaning.
  - Minor (`1.1.0`): added explanation, example or reference, or clarified a limitation.
  - Major (`2.0.0`): removed or materially changed a claim, category or safety framing.
- **Card `lastReviewedAt`** is the most recent date a human re-read the card and its references.
  It is not the date of a spelling-only edit unless the card was actually reviewed.
- **Source `contentVersion`** changes when the source's title, URL, publisher, publication date
  or topic metadata changes. A link that still exists but was re-reviewed without metadata
  changes keeps its version but gets a new `reviewedAt`.
- **Source `reviewedAt`** is the date the URL was opened and its metadata was checked.
- All cards do not have to share one version forever. The initial catalog does. If a single card
  is revised, change its constants locally rather than changing every card. The summary footer
  then shows the first card's version, so revise the footer to an explicit catalog version label
  if cards diverge. The current tests expect one shared version and review date; update test 11
  deliberately when that policy changes.

## How to update existing content

1. Open the card in `catalog.ts` and make the smallest edit that answers the need.
2. Keep the three learning levels distinct:
   - `summary`: one or two sentences that answer the card title immediately.
   - `plainLanguageBody`: a short plain-language explanation; `example` is an everyday,
     clearly fictional illustration where needed.
   - `extendedExplanation`: optional detail, limitations and how ASTRA CARE uses the concept.
3. Keep `keywords` focused on terms a crew member might actually search for. Search is local
   and case-insensitive; every query token must appear in at least one searchable field.
4. Do not add diagnosis, triage, medication dose, treatment instruction, an invented clinical
   reference range or a fabricated physiological threshold. Test 12 scans the catalog for these
   patterns and fails the build if one appears.
5. Do not attribute content to NASA approval or use it to claim flight-medical authority. The
   educational notice and the hub safety panel state the boundary and must remain visible.
6. Update `version` and, when the review was actually performed, `lastReviewedAt`.
7. Update `docs/KNOWLEDGE_CONTENT_SOURCES.md` if references, topics or dates changed.
8. Run the checks in the checklist below.

Search text is derived from the title, keywords, category labels, summary, body and extended
explanation. There is no separate search index to rebuild.

## How to review references

1. Open every URL in `sources.ts` in a normal browser. Do not rely on a search-result snippet.
2. Confirm that the page is the intended page and that the title and publisher match the
   metadata. Prefer official NASA, other space-agency and public-health pages already used by
   the register.
3. Confirm the publication date only when the publisher states one. If no date is stated, keep
   `publishedAt: null`; the UI then says "Date not stated". Do not guess.
4. Check that the card's use of the source is supportable. A source used for general context
   must not be turned into a clinical threshold, a diagnosis or a treatment instruction.
5. If the page moved, update the URL and `contentVersion`; if the page is gone and no equivalent
   official page exists, retire the source or replace it and revise every card that cited it.
6. Record the review date in `reviewedAt` and in the register. Never cite a source that was not
   verified.
7. Run test 10 (all referenced IDs resolve with complete metadata) and test 11 (versioning).

External URLs are the only network dependency. Card text and citation metadata are bundled, and
opening a source requires internet access. The UI says so on every source row.

## How to retire outdated content

Retiring a card is a catalog change, not a data migration.

1. Remove the card entry from `catalog.ts` (or replace it with a rewritten card under a new,
   stable ID when the concept still belongs in the library).
2. Remove or replace every contextual link to the retired ID. `KnowledgeLink` renders nothing
   for an unknown ID, so a stale link would disappear silently; search the repository rather
   than relying on that fallback. Test 08 now verifies that every statically written
   `KnowledgeLink` target resolves.
3. Update related-card scoring inputs if the retired card was the only carrier of a metric or
   feature. Related cards are derived, so no separate index needs editing.
4. Update counts in tests and docs: `tests/knowledge.test.mjs` asserts 21 cards, 4 categories and
   26 sources; the hub derives its counts from the catalog but the tests are explicit.
5. Existing bookmarks to `/knowledge/<retired-id>` show the missing-card state: "That card is
   not in the offline library" with a link back to the hub. Do not generate substitute content
   or redirect to an unrelated card.
6. If a source is retired, remove or replace its citations in every card and delete the register
   row. Keep the historical source register entry only if a durable audit trail is required;
   otherwise an unused source ID should not remain in `sources.ts`.
7. Retiring knowledge content must not delete, rewrite or migrate historical health
   observations, check-ins or report snapshots. Those records never embed card text (see below).
8. Bump the affected cards' versions and review dates. If the catalog shape changes, update the
   hub version label deliberately.

## How to add a new card

1. Choose a unique, URL-safe, lowercase kebab-case ID (for example `blood-pressure-cuff`). The
   ID is the route segment and must not contain private observation values, dates, crew names or
   query parameters.
2. Pick one existing category: `observations`, `measurement`, `astra-care` or `spaceflight`. Add
   a category only if the existing four cannot represent the topic; categories are part of the
   filter contract and the category count is asserted in tests.
3. Write all three levels, an everyday example where it helps, focused `keywords`, and the
   `relatedMetricTypes` / `relatedAppFeatures` lists used by related-card ranking.
4. Add only source IDs that already exist and were verified, or add the new source to
   `sources.ts` and the register first. A pure app-behavior card may have `references: []`; the
   article then explains that no external source is required.
5. Set `contentClassification` to one of the approved values, `diagram` to `baseline`,
   `percentage`, `timeline` or `null`, and `featured` only for a small number of broadly useful
   starting cards. The hub's "Start here" area renders featured cards.
6. Set `version`, `lastReviewedAt`, and the source's `reviewedAt` / `contentVersion`.
7. Run `npm run test:knowledge`. It checks completeness, unique IDs, valid categories, all three
   levels, reference resolution and the safety patterns.
8. Search the new card in the hub, open it, expand "Learn more", check the sources and verify the
   mobile and desktop layouts.
9. Update `docs/KNOWLEDGE_CONTENT_SOURCES.md` if any source was added or changed.

No app store or database migration is involved: content ships with the next build. The catalog is
read synchronously at module load, so an updated build is required for content changes.

## How to validate internal contextual links

Contextual links are the `KnowledgeLink` instances placed in check-in, assessment, trends,
delivery, replay and overview screens. They pass a `cardId` into the hub article route.

1. Run `npm run test:knowledge`. Test 08 scans all `.tsx` files under `app/` and `components/`
   for `<KnowledgeLink ... cardId="…">`, requires at least ten links, and asserts every target
   exists in the catalog.
2. For a new link, confirm the target card is the best explanation and that the link label
   matches the card. Prefer a stable ID over duplicating explanation text.
3. Check the destination in the browser: the card must open with the correct title, summary and
   sources, and Back must return to the originating screen (the hub preserves the last search
   and category filter when returning to it).
4. Do not put observation values, crew identifiers or report contents into the URL. Routes are
   card-ID only, and the link component passes only `cardId`.
5. If a card is retired, remove its links rather than relying on the empty-render fallback.

## Independence from health records and reports

Knowledge content is explanatory content only. It is deliberately decoupled from the health data
path:

- Cards do not read the active session, observations, assessments, reports, queue, replay state
  or crew identity. Tests 9, 13–20 assert this separation.
- `KnowledgeLink` passes a static card ID, never session data, and article URLs contain no
  observation values.
- Content updates must not rewrite, backfill or reinterpret historical health observations.
  Existing check-ins and their timestamps remain exactly as recorded.
- Knowledge content is not embedded into immutable report snapshots. A report keeps the
  observations, baseline, comparisons and explanation that were captured when it was created;
  a later card edit cannot change a historical report. Do not add card text to the snapshot
  format without an explicit protocol change and compatibility review.
- The educational notice is shown on every card and the hub safety panel states that the cards
  do not diagnose, prescribe or replace approved mission medical procedures. The notice is not a
  clinical disclaimer for operational decisions; crews must follow approved procedures.

## Validation checklist

Run from the project root in Git Bash:

```bash
npm run typecheck
npm run lint
npm run test:knowledge
npm run build:web
```

Then open the hub and check:

- search by a title word, a keyword and a category term;
- clear the query, filter each category, and confirm the result count;
- open a card, expand "Learn more", and confirm sources, version and review date;
- follow a contextual link from Assessment, Reports & Sync or a check-in screen;
- use browser DevTools offline after loading the hub, then search and open a card;
- check keyboard focus and the 390×844 and 1440×900 layouts.

The current browser harness also covers direct hub loading, search, filters, article levels,
source warnings, contextual links, offline in-session navigation, keyboard use and both
viewports. Its scripts live under the ignored `dist/` verification workspace; the maintained
automated checks are the Node suites in `tests/`.
