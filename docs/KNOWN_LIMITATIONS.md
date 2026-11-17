# ASTRA CARE — Known limitations and release gates

Audit: 17 November 2026. This is a synthetic educational prototype, not a flight medical system.

## Priority-ranked remaining work

| Priority | Limitation | Required next evidence/action |
| --- | --- | --- |
| P1 before claiming native readiness | Android/iOS exports compile, but no connected Android device/emulator appeared in `adb devices`; no iOS simulator is available on this Windows host. | Complete the physical-device checklist below. |
| P1 before using real personal data | No authenticated identity, per-person ownership, authorization, application encryption, or protected key storage. | Security architecture and implementation appropriate to the intended deployment; continue using synthetic data only. |
| P1 before clinical/mission deployment | Fixed synthetic 10% comparison is not clinical validation; no emergency detector or diagnosis. | Clinician/crew evaluation, appropriate physiological models, operational requirements and qualification. |
| P2 | Audible voice output and real assistive technology have not been verified. | Listen on the demonstration device; test TalkBack/VoiceOver and desktop screen reader. |
| P2 | `npm audit` reports eight moderate affected packages, through minimatch/Expo fingerprint and TypeScript ESLint dependencies; zero high/critical in this run. | Review upstream fixes and compatible updates. Do not use `npm audit fix --force`, which proposes an incompatible Expo downgrade. No exploitability claim is made here. |
| P2 | Repository switching is guarded against stale async UI updates, but exhaustive fault injection across every native storage/receiver timing is not complete. | Add React/native integration tests with delayed storage and receipt writes before production release. |
| P2 | Screen-wide WCAG conformance, text zoom, forced-colors behavior and contrast ratios have not been certified. | Complete manual checks and quantitative contrast testing on all interactive states. |
| P3 | NTRS source 20220013418 timed out in direct and browser-source retrieval. | Recheck that external reference before presentation; do not claim it was fully revalidated here. |
| P3 | Some older browser harnesses used ambiguous Continue selectors or assumed demo exit stayed on replay. | Maintain current workflow selectors and keep browser harnesses reproducible. |

## Offline and storage boundaries

- Web uses IndexedDB. Native has a SQLite adapter; export is not proof of successful on-device persistence.
- Production web precaches the application shell and assets. Offline reload requires a completed successful prior installation, retained browser cache, and a secure context (HTTPS or localhost). A never-cached first visit cannot work offline.
- Development-server behavior is not equivalent to production service-worker behavior. External NASA/health-source pages require network access.
- A simulated link switch only changes the local indicator. It never proves connectivity or delivery. Sending requires explicit user action and a configured reachable receiver.
- Ground receiver is a local simulation. Default HTTP has no transport encryption, authentication or mission communications link. Receipt matching provides consistency checks, not server authenticity.
- Persistent device records have no crew-owner field. Browser-profile sharing, storage inspection, eviction, multi-tab stale views, backup/restore and retention controls are not solved by this prototype.
- Fictional crew fixtures and changes made in demo mode are session-only. Reload returns to the persistent local session. Demo identity is not a durable account.

## Privacy boundaries

The shield is opaque visual concealment with app-shell accessibility hiding/inert handling and speech stop controls. It is not a lock. Anyone may return to the session. Reload can remove the shield; developer tools and OS screen capture are outside its protection. The limited summary excludes measurements/notes but its counts and timestamps remain metadata. No guarantee of confidentiality against a device user is made.

## Physical-device checklist — all unverified in this audit

Use only synthetic inputs and a compatible SDK 58 Expo Go. In VS Code PowerShell:

```powershell
Set-Location "C:\Users\Omkar\Desktop\NASA_Space_App_Challenge_26"
npm.cmd ci
npx.cmd expo install --check
npm.cmd run start:phone
```

Phone and PC must share a reachable LAN; scan the QR in Expo Go (iOS can use Camera). If LAN routing is blocked, stop Metro and try `npm.cmd run start:tunnel`; tunnel setup may require the optional Expo tunnel helper and internet. The phone's `127.0.0.1` is the phone itself. For receiver testing, set `EXPO_PUBLIC_RECEIVER_URL` to the PC's reachable LAN address before starting Metro, bind the receiver to an appropriate reachable interface, and configure the firewall deliberately. Default localhost binding is appropriate for same-PC web tests.

Record device/OS/Expo Go version and pass/fail for each:

- [ ] Launch via QR; all five primary tabs and secondary routes render without red screens.
- [ ] Save a partial check-in; kill/restart app; SQLite restores the exact values and missing fields.
- [ ] Save while offline; restart offline; inspect the observation and queue.
- [ ] Body Map front/back and equivalent region list respond to real touch; editor scrolls above keyboard; close/Done preserves entries.
- [ ] Guided and detailed forms share data correctly; rapid repeated save creates one observation.
- [ ] Back button, native discard alerts and cancel actions preserve intended drafts.
- [ ] Switch into/out of fictional crew; check no stale notes, adaptive responses, replay selection or local-record leakage.
- [ ] Voice speaks a question, assessment and card; Stop, navigation, shield, backgrounding and session switching stop speech.
- [ ] Shield covers portrait/landscape and safe areas; returning does not restart speech.
- [ ] TalkBack/VoiceOver labels, state announcements, focus order and region list are usable.
- [ ] Large text, keyboard, rotation and background/resume do not hide primary actions.
- [ ] Confirm a report, inspect queued state, send to the reachable simulated receiver; receipt persists after restart; outage/retry never invents a receipt.

## Presentation boundaries

Show responsive mobile web as responsive mobile web. Keep narration available without audio. Keep fictional fixtures labeled. No real NFC, wearable synchronization, live physiological stream, diagnostic AI, NASA approval, medical-grade security or flight readiness is implemented.
