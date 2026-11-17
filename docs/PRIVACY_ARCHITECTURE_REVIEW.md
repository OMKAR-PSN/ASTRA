# Privacy architecture review and threat model

Status: 17 November 2026. Feature 09 pre-implementation audit. This describes the source prototype, not a deployed medical system.

## Repository and session audit

| Area | Actual behavior |
| --- | --- |
| Git state | Branch `feat/stitch-ui-redesign`; Feature 08 checkpoint `6333d23`; working tree clean before Feature 09. |
| Data model | One active session at a time. `PresentationSession` renders one `SessionProvider` with either the local device repository or an in-memory demo repository. |
| Local persistence (web) | IndexedDB database `astra-care-offline`, object store `session`, single key `data`. One JSON payload holds check-ins, reports and engagement. |
| Local persistence (native) | Expo SQLite database `astra-care.db`, table `mission_session`, single row with a JSON payload. |
| Encryption at rest | None. IndexedDB and SQLite payloads are plain JSON. No custom cryptography is used. |
| Crew ownership | Check-in and report records contain **no crew-owner field**. The local session is a single unassigned record set. |
| Demo sessions | `createCrewDemoRepository()` rebuilds a deterministic in-memory fixture for one fictional crew (`AVERY-001`). It never reads or writes IndexedDB/SQLite. A separate presentation repository is also in-memory. |
| QR identity | `ASTRA_CARE_DEMO_CREW` payload with a version, type and crew id. It contains no medical data, name or secret. Parsing checks format and a known demo id only. It is **not authentication**. |
| Reports | Created only after explicit preview confirmation. Snapshots are immutable copies. Delivery is manual; the simulated receiver stores accepted payloads and returns a receipt. |
| Voice | One global speech controller; user-triggered only. It stops on route change, crew change, app backgrounding and unmount. |
| Routes | Expo Router stack with five tabs plus secondary routes (`/report`, `/identify`, `/guided-check-in`, `/replay`, `/journey`, `/knowledge`, `/voice-settings`). All are client-side; no server authorization exists. |
| Multi-tab (web) | Tabs sharing the browser profile share the same IndexedDB origin data. There is no cross-tab session channel; each tab loads on start and writes read-modify-write. |
| Refresh | Local session data survives refresh. A demo session does not: refresh returns to the local device session. |
| Existing tests | 186 unit/receiver tests and the Feature 08 browser harness pass before Feature 09. |

Classification: **single-user, single-active-session, two session sources (persistent local / temporary in-memory demo), shared browser storage, no multi-profile ownership records, no real authentication, no encryption.**

## What the prototype can and cannot enforce

- It **can** keep one session's records out of another session's view model by switching repositories, remounting session-scoped UI state and never merging record sets.
- It **can** prevent ordinary users from seeing health values on screen with an opaque privacy shield, and stop voice output.
- It **can** project a limited operational summary from explicitly permitted fields, so component props never contain measurements, symptoms, notes, assessments or report bodies.
- It **can** gate private UI client-side and keep deep-linked private routes visually covered while shielded.
- It **cannot** authenticate a person. The QR/tap flow selects a fictional demo identity; it does not prove identity.
- It **cannot** authorize access on a server, because there is no server-side identity or authorization layer.
- It **cannot** encrypt local data. IndexedDB and SQLite contents remain readable to anyone with storage or developer-tool access.
- It **cannot** defend against a compromised device, browser extensions, developer tools, OS-level screen capture, shoulder surfing after the shield is dismissed, or other apps.
- It **cannot** stop another same-origin browser tab from reading the same local records.
- It **cannot** make the simulated receiver secure. Accepted reports include their snapshots and are stored by the local receiver simulator.

## Threat model

| # | Scenario | Result | Prototype behavior and limitation |
| --- | --- | --- | --- |
| A | Another person can see the astronaut's screen | Partially mitigated | Privacy Shield draws an opaque full-viewport surface, hides the app from the accessibility tree, and provides an honest return action. It is visual privacy only, not a lock. |
| B | Device left unattended | Not mitigated | No idle timer, PIN, biometrics or device lock. The shield is manual. Anyone can select "Return to active session". |
| C | Fictional demo profile switched | Mitigated within the app model | A new in-memory repository is created; local records are not merged. Session versioning clears transient check-in, guided, replay and adaptive state. The demo code is not proof of identity. |
| D | Direct navigation to a private route | Partially mitigated | The opaque shield covers the route while active; session data is not rendered until the repository resolves. Any user can navigate once the shield is off. Client-side gating is not server authorization. |
| E | Browser refresh | Depends on session | Local records and engagement survive. Demo session, shield state and unsaved drafts do not. The app returns to the local session. |
| F | Same browser profile in another tab | Not mitigated | IndexedDB is shared by origin. Another tab can read the same records; no cross-tab privacy or session isolation exists. |
| G | Device storage inspected | Not mitigated | Plain JSON in IndexedDB/SQLite. No encryption, no secure keystore, no file protection claim. |
| H | Report contains symptom details | Partially mitigated | Reports are created only after confirmation; snapshots are immutable and contain the full check-in. The limited summary exposes only counts/status/timestamps, never the payload. The receiver simulator stores what it accepts. |
| I | Voice Guidance speaks sensitive text | Partially mitigated | Playback is user-triggered and stops on shield activation, session change, route change, backgrounding and disable. Browser/OS speech engines may log or route audio; audio privacy is not guaranteed. |
| J | Simulated receiver stores payloads | Accepted limitation | The local ground receiver persists accepted report bodies. Only explicitly confirmed reports are sent. No new data is sent by privacy screens. |

## Design boundaries adopted

1. **The limited summary is a projection, not a role.** It is labelled "Demonstration View — Not an Authenticated Access-Control System". No medical-officer login, fake role claim or universal PIN is added.
2. **The shield is visual privacy.** It is labelled "Privacy Shield Active" with an explicit statement that it is not a lock, sign-in or encryption. The return action is called "Return to active session", not "Unlock".
3. **Session isolation is repository plus state reset.** Switching to or exiting a demo session replaces the repository and resets transient UI state. Local records are never modified by a session switch.
4. **Local data remains unencrypted.** The Privacy Center states this plainly and does not offer a fake encryption toggle.
5. **No sensitive values in the summary component.** The summary receives a dedicated restricted structure built from permitted metadata only.
6. **No reports or acknowledgements are produced by privacy interactions.** Existing report confirmation, hashing, outbox and receiver behavior are unchanged.

## Verification limits

The delivered checks are unit tests and client-side browser tests. They inspect the rendered DOM for forbidden summary fields and exercise the shield at desktop and mobile sizes. They do not prove server authorization, encryption, biometric identity, resistance to developer tools, or physical device security. Physical Expo Go, OS screen capture and assistive-technology privacy behavior remain unverified.
