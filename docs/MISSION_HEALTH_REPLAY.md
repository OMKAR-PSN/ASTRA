# Mission Health Replay — Historical Data Contract (Feature 03)

## Stored history

| Concern | Source | Replay behavior |
| --- | --- | --- |
| Observation | `CheckIn` in `types/astra.ts` | Copied into each frame; never mutated. |
| Ordering | `recordedAt` plus original array position | Ascending UTC time; equal timestamps keep repository order; unreadable timestamps sort last. |
| Identity | `CheckIn.id` | Frame IDs stay the stored IDs (`CHK-001`, etc.). |
| Flight day | `crewProfile.missionDay` + latest fixture date | Derived only for the synthetic demo fixture. Local records do not store a flight day, so dates alone are shown. |
| Baseline | `fixtures/crew.ts` → `syntheticBaseline` | Applied retrospectively; labelled as a limitation. |
| Comparison | `lib/comparison.ts` | Reused unchanged, including `DIFFERENCE_THRESHOLD_PERCENT = 10`. |
| Assessment | `lib/snapshot.ts` + `lib/assessment.ts` | `buildAssessment` runs on the selected check-in only. |
| Reports | `SessionProvider.reports` | Read only for event labels; replay never creates, queues, confirms, or acknowledges a report. |

## Frame model

`lib/replay.ts` exposes a pure, deterministic projection:

```
checkIns + reports + source (+ demo missionDay)
        │
        ▼ buildReplayTimeline
frames[]   one per stored observation, chronological
  ├─ eligibleCheckIns   records on or before this frame's cutoff
  ├─ metrics[7]         observed / last-available / missing, with original timestamps
  ├─ assessment         existing buildAssessment() for this check-in
  ├─ events[]           observation, symptom, review, report, receipt (stored only)
  └─ cutoffNote + baselineNote
days[]     Observed days plus explicit empty days (gaps > 45 days are summarised)
```

`referenceTime` is the latest valid stored timestamp, so repeated builds with the
same records and selection produce identical frames. No `Date.now()` is used.

## Historical cutoff

A frame at index `i` includes only `checkIns[0..i]`. Later observations never
influence an earlier assessment. A metric missing from the selected check-in can
display the most recent earlier value for context, but it is named
"Earlier value", keeps its original timestamp, and is never merged into the
assessment card or presented as newly recorded.

## Baseline limitation

The fictional personal baseline is applied to every historical frame for
demonstration. It was not established at that point in the mission, and the
replay states this on every assessment. The 10% rule remains a demonstration
rule, not a clinical threshold.

## Read-only guarantees

The module imports no repository, network, storage, or mutation helper. It does
not call `saveCheckIn`, `confirmReport`, `updateDelivery`, or any delivery
action. Frames and metrics are deep copies. Report and receipt labels appear only
when a corresponding stored `ReportRecord`/receipt already exists.

## Session behavior

- Persistent local session: reads the existing saved check-ins from IndexedDB.
- Synthetic crew session: reads the deterministic 12-observation fixture through
  the session-only repository. Reload discards it, consistent with Features 01–02.
- No mixing: the timeline is built from the active session only.

## Playback

- Manual First / Previous / Next / Last / Reset controls plus direct frame and day
  selection. No drag-only interaction.
- Optional play/pause at 1.8 s per recorded frame. It is a UI presentation,
  not a sampling interval or sensor stream.
- Timers are cleared on pause, frame change, blur, and unmount. Playback does not
  autoplay, and reduced-motion users receive instant frame changes.
