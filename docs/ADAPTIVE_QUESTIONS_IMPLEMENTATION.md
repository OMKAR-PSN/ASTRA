# Adaptive follow-up questions (Feature 08)

Status: 17 November 2026. Deterministic source implementation and automated browser verification are complete. Physical Expo Go and screen-reader passes remain unverified.

## Purpose and boundaries

Adaptive follow-up questions are optional, self-reported context prompts. They are generated only from input the astronaut has already entered in the current check-in. They are a structured documentation aid, not a medical decision-maker: no diagnosis, no triage, no urgency rating, no clinical scoring and no hidden inference. Nothing is asked or answered unless the astronaut opens the optional panel and chooses to continue or skip.

Out of scope: LLM or other model calls, network requests, automatic speech, sensor or wearable input, new measurements, baseline changes, threshold changes, report workflow changes, routing changes and a sixth main tab. The rule engine is a pure function with no storage, routing, network or side effects.

## Architecture

| Area | File | Responsibility |
| --- | --- | --- |
| Types | `types/astra.ts` | `AdaptiveRuleId`, `AdaptiveAnswer`, `AdaptiveResponse`, optional `CheckIn.adaptiveResponses` |
| Rule engine | `lib/adaptiveQuestions.ts` | Catalog, trigger evaluation, ordering, limit policy, validation, response creation, sanitization, context lines |
| Shared form model | `lib/checkInForm.ts` | `adaptiveResponses` and transient `adaptiveSkipped` in form values and drafts |
| Question UI | `components/AdaptiveQuestions.tsx` | One-question-at-a-time flow, reason, voice, skip, summary, edit, "View more" |
| Detailed check-in | `app/(tabs)/check-in.tsx` | Collapsible "Add context questions" section and saved-answer block |
| Guided check-in | `app/guided-check-in.tsx` | Inline questions in the symptoms step, review group, saved-answer block |
| Assessment | `app/(tabs)/assessment.tsx` | "Additional self-reported context" card, separate from findings |
| Replay | `app/replay.tsx` | Read-only "Recorded context" rows |
| Voice | `lib/voice/builders.ts` | Optional-question speech script |
| Persistence | `state/sessionReducer.ts`, `lib/sessionRepository.web.ts`, `lib/sessionRepositoryContract.ts`, `lib/snapshot.ts`, `lib/replay.ts` | Sanitization, optional storage, deep copies |
| Tests | `tests/adaptiveQuestions.test.mjs` | 29 unit tests |

## Rule catalog

| Rule | Trigger (explicit input only) | Questions, in catalog order |
| --- | --- | --- |
| `fatigue` | A symptom word containing tired, fatigue, exhaust, low energy or run down | `fatigue-onset` (onset), `fatigue-change` (yes/no/not sure), `fatigue-context` (short text) |
| `head` | A word containing headache, head pain, migraine or head discomfort, or a body-map entry on the head region | `head-onset` (onset, reuses the body-map label when present); `head-location` and `head-sensation` are asked only when the head trigger came from the word list |
| `sleep` | A word containing trouble sleeping, difficulty sleeping, poor sleep or insomnia | `sleep-interruptions` (yes/no/not sure), `sleep-factors` (short text) |
| `dizziness` | A word containing dizz, lighthead/light-head, nausea, nauseous or queasy | `dizziness-onset` (onset), `dizziness-ongoing` (yes/no/not sure), `dizziness-context` (short text) |
| `body` | A body-map entry on a non-head region | `body-onset` and `body-change`, both naming the recorded region via `locationLabel` |
| `measurement` | A blank numeric field **and** at least one explicit observation elsewhere in the form | `measurement-reason` (single select: measurement not available, device unavailable, prefer not to say, other + note) |

Trigger conditions are deliberately narrow:

- Short sleep duration alone never triggers fatigue. Fatigue requires an explicit tiredness word.
- A blank form asks nothing. The measurement rule needs explicit user input, so an untouched form produces no prompt.
- Blank fields are described as "not measured" and are never treated as zero or as a symptom.
- Body-map entries are read from structured `symptomEntries`; free-text symptom words are matched case-insensitively and only for the groups above.

Every question carries a plain-language `reason`, for example "Because you reported tiredness, you can add a little more context." All questions are optional and can be skipped.

## Question ordering and maximum policy

Groups are interleaved, not concatenated: the first question of every applicable group appears before the second question of any group. With fatigue, sleep and dizziness selected, the order is `fatigue-onset, sleep-interruptions, dizziness-onset, fatigue-change, sleep-factors, dizziness-ongoing, fatigue-context, dizziness-context`. The catalog order is fixed and deterministic; stored responses are re-sorted to catalog order when sanitized.

`ADAPTIVE_QUESTION_LIMIT` is 3. The UI first shows at most three questions and states "+N more available"; "View more optional questions (N)" reveals the full interleaved list. The engine accepts a configurable limit, so callers can request all questions (`Number.POSITIVE_INFINITY`) or none (`0`). The detailed check-in badge counts all eligible questions; the guided flow and panel follow the default limit.

## Answer persistence

- Only **Continue** commits an answer. Skipping moves on without creating a response, and the summary shows "Skipped — not answered".
- "Not sure" is a real stored option, distinct from No and from a skipped question.
- Saving only includes non-empty, sanitized responses. `adaptiveSkipped` is transient UI state and is never saved.
- Unsaved edits are discarded when the check-in is abandoned or reloaded; there is no background draft persistence for these answers.
- Answers are stored on the check-in as `{questionId, ruleId, answer: {optionIds, text}, source, answeredAtUTC, contextLabel}`.
- If a symptom is removed, its answers become inactive. The panel shows an inactive-answer notice with "Remove answer"; individual responses can also be edited or removed from the summary.
- Answers survive guided-to-detailed handoff as a deep copy and are persisted through the shared session reducer.

## Schema compatibility

`adaptiveResponses` is optional, so records saved before Feature 08 remain valid and unchanged. `normalizeStoredSession` runs `normalizeCheckInAdaptive` only on records that claim the field; if nothing valid survives, the key is removed entirely. Sanitization drops unknown question ids, rule-id mismatches, invalid sources or timestamps, duplicates, malformed answers and anything beyond `ADAPTIVE_RESPONSE_MAX = 14`. Notes are capped at 160 characters and context labels at 120. Legacy symptom, reading and note fields are untouched.

## Guided and detailed integration

**Detailed check-in:** after the symptoms section, "Add context questions" appears only when at least one rule applies or answers already exist. The section is collapsible, uses an "OPTIONAL · SELF-REPORTED" badge and explains that skipping does not change readings, symptoms or the check-in. The button shows the eligible count. Saving displays "ADDITIONAL CONTEXT · SELF-REPORTED" with question, answer, timestamp and source ("Detailed check-in").

**Guided check-in:** the same component is embedded in the symptoms step, after the body map and word list, so context can be added while the symptom is fresh. The review step lists answers under "Additional context · optional" with Edit links. The saved screen reuses the "ADDITIONAL CONTEXT · SELF-REPORTED" block. Load-demo and handoff paths reset or transfer adaptive state explicitly.

## Body Map integration

A head-region entry enables the head group and reuses the body-map label in the onset prompt. A non-head entry enables the body group and names the region in both prompts ("…at Left Knee · front view?") with the helper "This reuses your body-map entry. You do not need to re-enter the location." The location is never re-asked, and answers survive a body-map edit round trip.

## Voice integration

`buildAdaptiveQuestionRequest` reads only the visible question: prompt, reason, choices or the short-note instruction, and the sentence "You can skip this question. Skipped is not recorded as No." The label is "Optional question". Speech uses the existing global controller and stops when the question changes or the panel closes. Nothing is read automatically and every spoken sentence stays on screen.

## Assessment and Replay display

Assessment shows a separate "Additional self-reported context" card with question, answer, UTC timestamp and source. Its copy states that these answers document what was reported and do not change any reading, baseline comparison, the 10% demonstration rule or the review status. Assessment findings and the 10% rule are unchanged.

Replay shows "Recorded context" inside observation details. It is read-only: the frame's check-in is deep-copied, nothing can be edited, and replay still does not persist changes.

## Report compatibility

`createReportSnapshot` deep-copies sanitized adaptive responses into the snapshot, so the immutable record keeps the answers exactly as saved. The receiver hashes the canonical snapshot JSON including these fields; the existing SHA-256 integrity check and duplicate/conflict handling are unchanged. The report preview does not add new controls and adaptive answers never alter comparisons, findings or delivery state.

## Privacy boundaries

Answers stay in the local session and local snapshot, exactly like other check-in fields. The engine performs no network calls, uses no model or chatbot, requests no microphone permission and adds no analytics. There is no background transmission: reports are still sent only after explicit preview and confirmation. Notes are limited to 160 characters and are self-reported free text.

## Known medical limitations

These rules organize what a person chose to report; they do not interpret it. There is no clinical validation, no symptom severity assessment, no urgency rating, no differential diagnosis and no treatment guidance. The question set is intentionally small and covers only fatigue, head discomfort, sleep difficulty, dizziness/nausea, non-head body-map symptoms and missing measurements. "Not sure" and skipped questions are documentation states, not negative findings. Nothing here replaces a clinician, a flight surgeon or mission medical procedures.

## Test results

Exact results from 17 November 2026:

- `npm run test:adaptive` — 29/29 pass. Covers triggers per rule, no inferred fatigue, head word/entry variants, body reuse and no location re-ask, measurement gaps and empty forms, Not sure vs No, skip behaviour, limit/hidden counts, deterministic ordering, stable ids/reasons/knowledge cards, labels, validation, short-text bounds, "Other" note, response creation, sanitization (unknown, mismatch, invalid source, duplicates, malformed), the 14-record cap, legacy records, active-only drafts, deep-copy handoff, reducer persistence, stored-session normalization, snapshot/explanation immutability, the 10% threshold, replay copy, context lines, voice script wording and a source scan proving the engine has no routing, persistence or network imports.
- All prior suites pass: crew 7, guided 21, assessment 25, replay 20, engagement 22, symptoms 23, knowledge 20, voice 18 and receiver 1. Total 186/186 across 10 suites.
- `npm run typecheck` and `npm run lint` pass.
- Production web export (`npm run build:web`) succeeds.
- Browser harness `node dist/verify-adaptive.mjs http://127.0.0.1:8083 prod` — 38/38 checks at 1440×900 and 390×844, with zero console errors. It verifies the hidden state, eligibility counts, one-question-at-a-time behaviour, reasons, voice content and stop-on-change, Back retention, Not sure vs No, summary/edit, saved context, assessment context with the intact 10% text, replay context, eight eligible questions with "+5 more available", three skips, View more, body-map reuse, the guided flow, save, five mobile tabs, no horizontal overflow and an in-viewport mobile question.

Screenshots (ignored `dist/`, production export): `adaptive-prod-hidden-1440`, `fatigue-1440`, `voice-1440`, `summary-1440`, `saved-1440`, `skipped-1440`, `body-map-1440`, `assessment-1440`, `replay-1440`, `guided-1440`, `guided-summary-1440`, `guided-saved-1440`, `mobile-390` and `mobile-question-2-390`. All were reviewed for clipping, target size, collisions, empty space, faint text, duplicate labels and missing selection state; no further visual changes were required.

Limitations: the harness stubs speech and proves controller text and stop behaviour, not audible output. Keyboard and screen-reader behaviour was exercised only through web focus/activation checks. Physical Expo Go, native SQLite restart, iOS runtime and manual assistive-technology passes remain unverified.

## Demonstration instructions

1. `npm install`
2. `npm run web` (or `npm start` and open in Expo Go)
3. Open **Health Check-In**. Confirm no context section appears before any input.
4. Press **Load demo readings** and expand **Add Context Questions**. One optional question appears at a time with a reason.
5. Answer the first question, choose **Not sure** on the second, and **Skip** the third. Confirm the summary distinguishes all three states.
6. Press **View more optional questions (N)** to see the interleaved full list, then **Edit** an answer.
7. Save the check-in and confirm **ADDITIONAL CONTEXT · SELF-REPORTED** appears.
8. Open **Assessment** and confirm the separate context card and the unchanged 10% text.
9. Open **Health Trends**, select the saved check-in and confirm **Recorded context** in observation details.
10. Repeat through **Guided check-in**; the questions appear in the symptoms step and in the review.
11. On **Health Check-In**, add a non-head body-map symptom and confirm the follow-up names the region instead of asking where it is.

## Files changed

- New: `lib/adaptiveQuestions.ts`, `components/AdaptiveQuestions.tsx`, `tests/adaptiveQuestions.test.mjs`, `docs/ADAPTIVE_QUESTIONS_IMPLEMENTATION.md`.
- Updated: `types/astra.ts`, `lib/checkInForm.ts`, `lib/sessionRepositoryContract.ts`, `lib/sessionRepository.web.ts`, `state/sessionReducer.ts`, `lib/snapshot.ts`, `lib/replay.ts`, `lib/voice/builders.ts`, `app/(tabs)/check-in.tsx`, `app/guided-check-in.tsx`, `app/(tabs)/assessment.tsx`, `app/replay.tsx`, `package.json`, `docs/PROGRESS.md`.
