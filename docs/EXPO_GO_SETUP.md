# Run ASTRA CARE in Expo Go (SDK 58)

Open C:/Users/Omkar/Desktop/NASA_Space_App_Challenge_26 in VS Code. Use Terminal > New Terminal and select PowerShell.

## Install and launch

```powershell
Set-Location "C:\Users\Omkar\Desktop\NASA_Space_App_Challenge_26"
npm.cmd ci
npx.cmd expo install --check
npm.cmd run start:phone
```

Use Expo Go supporting SDK 58. Keep the terminal running. Connect the phone and computer to the same Wi-Fi. Scan the newly displayed QR with Expo Go on Android or the Camera app on iPhone. If prompted by Expo, sign in using `npx.cmd expo login`. Allow Node.js on your trusted private network if Windows Firewall prompts. Do not disable the firewall.

If the QR cannot connect, stop Metro with Ctrl+C and run:

```powershell
npm.cmd run start:tunnel
```

Tunnel mode requires Internet access and may prompt to install Expo's tunnel helper. A tunnel to Metro does not expose the optional ground receiver.

If a version mismatch still appears, close the old Expo Go project and scan the new QR. Check `node -p "require('expo/package.json').version"` in this folder. Do not run an old server from another folder or open an old saved Expo URL. If a red error screen appears after loading, its full error is needed to diagnose a device-runtime issue.

## Ground receiver (optional)

The app can save check-ins, assess and queue reports without a receiver. To test actual acknowledgements from a phone, start a second PowerShell terminal:

```powershell
$env:RECEIVER_HOST = '0.0.0.0'
npm.cmd run receiver
```

Run `ipconfig` and find your computer's Wi-Fi IPv4 address. In the Expo terminal, stop Metro and replace the example address below with your actual IPv4 address:

```powershell
$env:EXPO_PUBLIC_RECEIVER_URL = 'http://192.168.1.10:8787'
npm.cmd run start:phone
```

On a phone, localhost/127.0.0.1 refers to the phone itself. Check that `http://YOUR-PC-IP:8787/api/v1/health` opens in the phone browser. This local synthetic-data simulator should only be exposed to a trusted LAN. Use a reachable HTTPS receiver if your platform/network blocks HTTP.

## Web

```powershell
npm.cmd run web
```

SDK upgrades do not replace or reset the application database. Physical phone testing is still required; successful bundling alone does not verify on-device behavior.

## Verified locally — 16 November 2026

Rebuilt the stale SDK 57 lockfile against the existing SDK 58 package manifest, without --force or --legacy-peer-deps. npm ci succeeded. Installed Expo 58.0.25, Expo Router 58.0.31, React Native 0.88.1. Expo dependency check passed; Expo Doctor passed 20/20 checks. TypeScript, lint, Android/iOS bundle export and web export passed. A test Expo Go LAN server started on port 8091 and its Android manifest declared sdkVersion 58.0.0. The test server was stopped afterward. No physical device was available for runtime verification.
