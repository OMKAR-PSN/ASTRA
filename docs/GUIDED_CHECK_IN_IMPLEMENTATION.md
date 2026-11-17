# Feature 01 — Guided 60-second check-in: implementation note

Analysis date: 16 Nov 2026. Branch: `feat/stitch-ui-redesign` (uncommitted work preserved).

## 1. Existing measurement fields

`CheckIn` and `CheckInDraft` (`types/astra.ts`) hold `readings`, `symptoms`, `activityNote`.
`Readings` contains seven nullable values: `heartRateBpm`, `systolicMmHg`, `diastolicMmHg`,
`temperatureC`, `sleepHours` (manual numeric entry), and `mood` / `stress` (1–5 self-report).
`CheckIn` adds `id` (`CHK-###`) and `recordedAt` (UTC ISO string assigned at save time).
No new fields, units, or metric types are introduced by the guided flow.

## 2. Required versus optional inputs

The existing model permits any numeric reading to be null and requires at least one non-null
reading per record (`validateDraft`). The guided flow keeps that contract:

- Mood: choose one of six explicit answers (including "Prefer to describe", which records
  mood as not measured). Required to leave step 1.
- Stress: 1–5 required to leave step 1. Stored as the existing 1–5 number.
- Sleep, heart rate, systolic, diastolic, temperature: optional; blank means not measured.
  The vitals step offers an explicit "Not measured" control that clears a value.
- Symptoms: optional; "None" maps to `[]` through the existing `SymptomChecklist`.
- Activity note: optional, 280 characters, same field as the detailed form.

Step gating is a presentation rule only. The save pipeline still accepts a partially filled
record exactly as the detailed form does.

## 3. Validation

`lib/validation.ts` remains the single source of truth: heart rate 20–250, systolic 60–250,
diastolic 30–150, temperature 30–43 °C, sleep 0–24 h, mood/stress 1–5, at least one reading,
non-numeric text rejected, blank text becomes null. The guided flow calls the same
`validateDraft`; per-step checks reuse `parseNumericReadings`, extracted from `validateDraft`
with unchanged behaviour. Incomplete records are never auto-saved.

## 4. Save behaviour

Both flows build a `CheckInDraft` through `lib/checkInForm.ts` and call
`SessionProvider.saveCheckIn`, which timestamps with `new Date().toISOString()` and delegates to
the active `SessionRepository`. Guided save is guarded by an in-flight ref plus disabled
controls, and the wizard leaves the review step only after one record is returned. Saving does
not queue, send, or confirm a report.

## 5. Crew attribution

Records are attributed to the fixed fictional crew profile (`fixtures/crew.ts`: Avery Rao,
Meridian Transit (simulated), Flight Day 183). Identification activates a demo repository in
`PresentationSession`; it does not change identity fields on saved records. No crew id is
stored inside `CheckIn`, matching the existing format.

## 6. Reports, assessment, and trends

`SessionProvider` exposes `latestCheckIn`; `createReportSnapshot`, `compareToBaseline`,
`buildExplanation`, `buildReadingTiles`, and `TrendBars` all derive from `checkIns`. A guided
save therefore changes dashboard tiles, charts, the assessment explanation, and report
snapshots through the same path as a detailed save. The 10% review threshold and synthetic
baseline are untouched.

## 7. Demo versus persistent records

Local records use IndexedDB on web (`astra-care-offline`) and SQLite on native. Presentation
or demo-crew sessions swap in an in-memory repository that is rebuilt deterministically and
never reads or writes device storage. Guided completion copy reflects this: demo sessions say
"Saved in this demo session."; local sessions say "Saved on this device." Neither claims offline
sync, sensor capture, or transmission.

## Guided flow decisions

- Steps: Welcome → Mood & stress → Sleep → Vitals → Symptoms & activity → Review → Saved.
  Welcome and Saved are not counted in the five-step progress indicator.
- Mood mapping (documented in `lib/guidedCheckIn.ts` and shared with tests):
  Great = 5, Good = 4, Okay = 3, Not great = 2, Very low = 1, Prefer to describe = null.
  "Very low" exists so a value entered on the detailed form (mood 1) survives a switch.
- Stress anchors: 1 Calm, 2 Low, 3 Moderate, 4 High, 5 Very high. Values unchanged.
- Sleep stepper moves in 0.5 h increments (24 h maximum). An empty field stays empty until the
  user presses increment (0.5 h) or types; decrement is disabled while empty. No prefilled value.
- Symptom model is the existing seven options plus None. "Other" does not exist in the model and
  is not invented. Symptoms are listed without any urgency rating; the review refers the crew
  member to approved mission procedures instead.
- Status vocabulary in review: Entered, Not measured, Needs correction (validation error), and
  "Demo session" / "Saved on this device" for the record source. There are no imported records
  in this flow, so no "Previously imported" status is displayed.
- Switching flows hands the shared form values through `lib/formHandoff.ts`; neither flow saves
  until the crew member presses Save, so no duplicate record is created.
- Unsaved exit is guarded with `usePreventRemove` plus an explicit discard dialog. Progress
  uses text plus a segmented bar, so it is not animation-only.
