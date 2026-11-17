# ASTRA CARE — Judge demonstration runbook

## Preparation

Use a dedicated browser profile with synthetic data only, a 1440 × 900 desktop viewport, and the verified production build. Keep a phone-width browser window ready; it demonstrates responsive web, not Expo Go. Disable voice unless it has been audibly checked on the presentation computer.

From the repository in PowerShell:

```powershell
npm.cmd ci
npm.cmd test
npm.cmd run typecheck
npm.cmd run lint
$env:EXPO_PUBLIC_RECEIVER_URL = "http://127.0.0.1:8787"
npm.cmd run build:web
```

Run `npm.cmd run preview:web` in a separate terminal to serve `dist/web` at http://127.0.0.1:8196 with SPA fallback. Do not open `index.html` using a file URL. For receiver demonstration, run `npm.cmd run receiver` in a second terminal; its default binding is localhost:8787. Keep receiver demo data separate from any existing database with `RECEIVER_DB` when needed. Confirm the chosen port is free. Do not erase existing user records to prepare a demo.

Visit the app online once and wait for service-worker installation before testing offline reload. Rehearse the exact routes below. A full browser reload ends the session-only fictional identity and restores persistent local records; use in-app navigation while presenting the fictional crew.

## Three-minute path

| Time | Navigation and action | Expected outcome and narration |
| --- | --- | --- |
| 0:00–0:25 | Sidebar **Identify crew member** → **Scan Crew QR** → **Use Demo Crew QR** | Avery Rao's fictional history appears. Say: “This identity and these observations are synthetic; the QR selects a demonstration, not an authenticated account.” |
| 0:25–1:05 | Overview **Start Health Check-In** → **Start Check-In**. Select mood/stress, continue through sleep and measurements, leaving unmeasured fields empty. On symptoms choose **Open Body Map**, choose a region and a symptom, optionally intensity, **Add symptom** → **Done**. | Show a structured body-region observation and, if triggered, one optional follow-up. Say: “These are manual entries. Questions can be skipped; missing values stay missing.” |
| 1:05–1:20 | Answer one applicable question or **Skip**. Use the wizard footer **Continue** → **Save check-in** once. | Exactly one temporary synthetic-session observation. No report is sent by saving. Use deliberately synthetic values and state that aloud. |
| 1:20–1:55 | Open **Assessment**, expand a calculation control. | Show the actual saved observation and its actual comparison. Do not promise that the newly saved partial check-in triggers a review. Explain observation → calculation → limited interpretation → next step, and that the 10% rule is only a demo rule. |
| 1:55–2:30 | **Health Trends** → replay entry; use **First**, **Next**, **Last**, or select the actual historical review frame. | Explain chronology and the displayed historical/provenance labels. Do not call an old flag a current emergency. Earlier frames use the documented retrospective baseline. |
| 2:30–3:00 | Open **Privacy & Crew Access**, then its Shield control (or header privacy menu). **Return to active session**. | Opaque cover; no data sent. Say: “Visual privacy, not authentication or encryption.” Close with the value: understandable local records during communication outages. |

If 40 seconds are lost, omit saving a new observation: show the form, discard through the supported confirmation, and use the original deterministic fixture assessment/replay. Do not race through confirmation dialogs.

## Five-minute path

Follow the first three minutes, then:

| Time | Navigation and action | Expected result |
| --- | --- | --- |
| 3:00–3:35 | **Crew Knowledge Hub**, search a topic such as sleep, open a card and its source section. | Bundled educational text, source/version context, no diagnostic claim. External source websites still need connectivity. |
| 3:35–4:20 | **Reports & Sync** → **Preview latest report**, inspect snapshot, **Confirm and queue**, then **View in Delivery**. | Queued only after explicit confirmation. Enable simulated outage to demonstrate that a link indicator cannot produce a receipt. |
| 4:20–4:45 | If the configured receiver is running, disable outage and **Send report**. Otherwise leave queued and explain retry. | Acknowledged only when a stored receiver response is obtained. Never announce success from a spinner or restored connectivity alone. |
| 4:45–5:00 | **Privacy & Crew Access** → limited crew summary, then exit demo through the supported control. | Metadata-only summary; persistent local records remain separate. |

Optional substitutions: show Wellness Journey as participation rather than health scoring; or play a short Knowledge Card passage if real audio has been tested. Audio is never required for the timed path.

## Failure fallbacks

- **Audio unavailable:** keep voice off and use the written explanation. Do not imply the audience heard playback.
- **Network unavailable:** use the already-loaded/cached app and bundled cards. Keep reports queued; show the queue truthfully. A never-cached browser needs an online preparation step.
- **Receiver unavailable:** show queued or failed/retry state. Do not fabricate an acknowledgement. Keep a previously captured, clearly labeled rehearsal screenshot as optional evidence, not a live result.
- **QR camera denied:** use **Use Demo Crew QR**; no camera dependency for the presentation.
- **Session accidentally reloaded:** re-identify Avery through the same demo QR action. Fixture changes made during the prior demo session are intentionally lost.
- **Native device fails:** present responsive web and identify native testing as incomplete. Never call browser emulation a native test.
- **Storage failure:** show the restore error and Retry; do not clear storage or claim recovery without seeing the records return.
