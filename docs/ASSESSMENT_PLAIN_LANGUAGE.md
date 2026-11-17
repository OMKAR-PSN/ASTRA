# Assessment Plain-Language Layer — Architecture Note (Feature 02)

## Existing domain model (unchanged)

| Domain object | Source | Role |
| --- | --- | --- |
| `CheckIn` | `types/astra.ts` | Immutable observation: `id`, `recordedAt`, seven `readings`, `symptoms`, `activityNote`. |
| `ReportSnapshot` | `lib/snapshot.ts` | Latest check-in + crew + synthetic baseline + comparisons + existing explanation. |
| `MetricComparison` | `lib/comparison.ts` | Per-metric `current`, `baseline`, `change`, `percentChange` for heart rate, systolic, diastolic, temperature, sleep. |
| `DIFFERENCE_THRESHOLD_PERCENT` | `lib/comparison.ts` | The prototype's 10% review rule. Never redefined. |
| `ExplanationSections` | `lib/explanation.ts` | Existing four-layer explanation: observed, calculated, possible interpretation, suggested next step. |

Mood and stress exist only in `Readings`; the engine has no baseline for them, so the
presentation must never fabricate a comparison for either metric.

## New presentation layer

`lib/assessment.ts` is a pure, deterministic translator. It receives a `ReportSnapshot`,
a provenance label (`local` or `demo`) and a reference time, then emits an
`Assessment` object. It never decides health status; every status is derived from the
existing `MetricComparison` values and the existing 10% constant.

```
ReportSnapshot ──► buildAssessment(snapshot, { source, now })
                     │
                     ├─ findings[]        one per supported metric (7)
                     │    ├─ Level 1      label, observed, baseline, status, headline, note, time
                     │    ├─ Level 2      exact difference, percentage, formula, sources, stale note
                     │    └─ Level 3      bounded next-step copy (screen-level section)
                     ├─ counts            review / compared / missing / no-baseline
                     ├─ summary           accurate finding count, no global health score
                     └─ provenance        record id, timestamp, source, synthetic flag
```

### Status mapping

| Condition | Status | Wording basis |
| --- | --- | --- |
| `current === null` | `missing` | Missing-data template. |
| `percentChange === null` (zero/invalid baseline, or mood/stress) | `no-baseline` | Explicit "no comparison" template. |
| `abs(percentChange) >= 10` | `review` | "higher/lower than your fictional personal baseline". |
| otherwise | `within-range` | "did not exceed the prototype's configured comparison threshold". |

### Metadata sources

- Timestamp and observation ID come from the stored `CheckIn`; nothing is generated.
- Baseline values come from `fixtures/crew.ts` and are labelled fictional.
- Source text distinguishes a local manual record from a fictional demo fixture;
  no simulated wearable or connected device is claimed.
- Staleness uses the same 24-hour window as `MetricTile` and is derived from
  `recordedAt` versus the caller-supplied `now`.

## UI mapping

- **Level 1** — `AssessmentCard` default state (value, unit, time, baseline,
  status icon + text, one-sentence explanation).
- **Level 2** — `AssessmentCard` expanded state with a labelled calculation table and
  `ComparisonBar` (baseline marker → observed marker, text labels, no clinical range).
- **Level 3** — a screen-level "Suggested next step" panel built from the actual
  findings, plus a constant non-diagnostic note about mission-approved emergency
  procedures.
- **Overview / provenance / supporting routes** — screen sections that cite the
  original observation, the synthetic baseline, and the existing Trends, Check-In and
  Reports routes without queueing or sending anything.
