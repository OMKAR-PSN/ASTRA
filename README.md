# ASTRA CARE demo

Use synthetic readings only. The mobile and web clients share one Expo Router project.

## Expo Go on a phone (SDK 58)

See [VS Code / PowerShell setup](docs/EXPO_GO_SETUP.md). The dependency lockfile is aligned with Expo SDK 58.

```powershell
npm.cmd ci
npm.cmd run start:phone
```

Use the new QR code with Expo Go supporting SDK 58, on the same Wi-Fi. If LAN access fails, stop Metro and use `npm.cmd run start:tunnel`. The ground receiver is optional for check-ins and local reports.

## Run locally

From the project root in PowerShell, install dependencies with `npm.cmd ci`. Use Node 22.19 or later in the Node 22 series, or a supported newer release.

1. Run `npm.cmd run receiver` in one terminal. Fastify listens on port 8787 and stores receipts in `astra-receiver.db`.
2. In another terminal, set `$env:EXPO_PUBLIC_RECEIVER_URL = 'http://127.0.0.1:8787'`.
3. For browser development, run `npx.cmd expo start --web`. For the offline browser demo, run `npm.cmd run build:web` and serve `dist/web` from localhost or HTTPS with a fallback to `index.html` for app routes. Open the build online once and let its service worker finish installing.
4. For a phone, use Expo Go with the matching SDK. Use a receiver URL reachable by the phone. To use a receiver on the same trusted LAN, start it with `$env:RECEIVER_HOST = '0.0.0.0'` and set the app's receiver URL to the computer's LAN address before running `npx.cmd expo start --go`. Use HTTPS if the device blocks HTTP.

## Demo scenarios

1. **Routine check-in.** Enter the synthetic baseline values shown in the comparison table and confirm that the comparison reports no change.
2. **Baseline deviation.** Load demo readings and save. Dashboard should show 92 bpm against 72 bpm, a difference of +20 bpm (+27.78%).
3. **Missing reading.** Save a check-in with only sleep. Heart rate should show insufficient data.
4. **Prolonged outage.** With the simulated link unavailable, confirm a report and reopen the app. The report should still be queued. For web, also reload the cached build with the browser offline. For native, reopen ASTRA CARE in Expo Go and check the report ID and Dashboard. Launching Expo Go in airplane mode after fully closing it requires a separate device check.
5. **Retry and acknowledgement.** With the link available and receiver stopped, send a report and check for Failed. Restart the receiver and retry. The report should show Acknowledged with a receipt that survives reload. Run `npm.cmd run test:receiver` to verify that duplicate submissions return the same persisted receipt.

The simulated link starts unavailable on each app launch. Enabling it permits manual sending. The app does not need a receiver to save a check-in or queue a report. Delivery receipts confirm acceptance by the local simulator.

Open [Ground timeline](http://127.0.0.1:8787/mission) on the receiver computer to view accepted reports. Reload the timeline after a report is sent.
