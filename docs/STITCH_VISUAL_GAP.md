# Stitch visual fidelity correction

Baseline: feat/stitch-ui-redesign at 44704f2. The original desktop and mobile HTML were rendered at 1440x900 and 390x844 respectively; CSS loaded successfully (desktop rail computed at 240px). Captures: dist/fidelity-reference-WIDTH.png, dist/fidelity-before-WIDTH.png. The original exported desktop screen.png was also inspected. Its generated page has remote/broken image and font inconsistencies; those are not reproduced.

| Area | Reference / current gap | Correction |
|---|---|---|
| Canvas | Reference has deeper teal/navy field; current is uniform and flat | Layer restrained radial cyan/blue illumination behind decorative glass |
| Sidebar | Reference 240px, translucent, soft edge/shadow; current 248px opaque | 240px glass rail with restrained shadow and existing working links |
| Header | Reference single 64px strip; current two rows ~94px | Compact responsive status row; retain UTC, mode, records and simulated link |
| Greeting/action | Reference prominent greeting with action beside it; current title plus separate action row | Single hero composition, larger greeting, concise subtitle, clear check-in CTA |
| Mission banner | Reference y188, inset trajectory and multiple compact context blocks; current y272 with two bulky cards | Illuminated glass centerpiece, decorative orbit, progress from existing day/240 context |
| Metrics | Reference 3x2 desktop / 2-column mobile, strong values; current repeated microtext | Larger tabular values, consolidated measurement context, expandable details |
| Charts | Reference filled cyan trace and soft guides; current thin line and visible technical list | Optional Overview chart presentation with gradient fill and actual straight segments; same values/gaps/baseline/rule |
| Assessment | Reference concise right-hand panel; current long explanatory block | Concise latest status plus clearly separated historical review event and link to full assessment |
| Sync | Reference compact status rows | Actual queued/acknowledged counts only, no invented DSN or capacity data |
| Fonts | Reference specifies Inter/JetBrains Mono but exported desktop includes serif fallbacks | Bundled Inter for interface and tabular values; platform monospace only for metadata where useful |
| Buttons | Reference primary CTA sits beside greeting / below banner on mobile | Same hierarchy with readable 48px minimum actions |
| Borders/shadows | Current equal flat outlines everywhere | Soft shadow/glass edge on decorative layers; calm solid cards for medical data |
| Mobile | Current mission card pushes readings below viewport | Compact hero/banner, floating glass navigation with reserved scroll space |

Native compatibility inspection: Expo SDK 57, expo-blur 57.0.3 and expo-linear-gradient 57.0.2 already installed and match bundledNativeModules. iOS BlurView can be used with reduced-transparency support. Android uses a solid layered fallback rather than enabling an unverified blur target/performance path. No dependencies added.

Presentation sandbox: the isolated in-memory repository and eight dated synthetic check-ins exist behind `PresentationSession`/`PresentationRepository`. In this branch there is no start control wired for it, so the rendered captures below use the normal local repository with one saved check-in. The normal device store is never seeded or cleared by the sandbox code. Acknowledgement remains conditional on the existing actual receiver call. Backend, schemas and the 10% assessment threshold stay unchanged.

## Iterations and verification

Rendered on 15 Nov 2026. Production web build served from `dist/web`; clean captures are `dist/prod-1440.png`, `dist/prod-1440-tall.png`, `dist/prod-390.png`, `dist/prod-1024.png` and `dist/prod-768.png` (no dev overlay). Reference: `dist/reference-1440.png`. Pre-redesign: `dist/fidelity-before-1440.png` / `dist/fidelity-before-390.png`. Intermediate dev iterations: `dist/after-*.png`.

Rendered values came from the real local check-in created through the check-in form: HR 92 bpm, BP 118/76 mmHg, 36.9 °C, 6.5 h sleep, mood 3, stress 3; one local check-in; 0 queued and 0 acknowledged reports; simulated link unavailable. The overview shows the +20 bpm / −1.0 h review events and the actual receiver state; no acknowledgement is displayed.

Corrections in this pass:
- Removed the RN-web `accessible` attribute error; chart axis labels now use each observation's real UTC time instead of invented times.
- Removed the idle chart tooltip that covered sparse data; the tooltip now appears only after point selection.
- Fixed banner stat truncation, card footer truncation, sidebar footer clipping and duplicated mission copy.
- Rebalanced chart, assessment, comparison table, local data and hazards panels; chart and table no longer stretch into empty framed areas.
- Simplified the mobile header into brand + mission context + status row, and made the status chips/data dots fit without wrapping at 390 px.
- Phone-width observations use one readable column; the glass bottom navigation is fixed to the viewport on web and visible while scrolling.
- Matched Stitch title casing and tightened BP value formatting.
- Raised the desktop breakpoint to 1180 px and gave 1180–1359 px a 2×2 compact stat grid, so the 1024 px and 768 px tablet captures no longer wrap or clip the header, banner stats or check-in button. The banner stat grid also lost its column-axis `flex` value (it collapsed to zero height and overflowed the glass at tablet widths).
- Kept the hero eyebrow dot inline with the first label line at 390 px instead of letting it wrap onto its own line.

Residual mismatches:
- Stitch's chart mock contains a multi-day line. The real local repository held one observation, so the chart correctly renders one point; no points were invented. The presentation sandbox can show eight points if it is later exposed.
- Stitch's chart metric tabs and switchable series were not added (outside the requested visual pass); the existing single Heart Rate chart contract is unchanged.
- Mood/stress remain repository numeric values (`3 of 5`) rather than Stitch's word labels/10-point scale; the identity photo, simulated delay value, DSN/capacity figures and other mock-only data are intentionally not reproduced.
- Native Expo Go/iOS/Android were not run on a device in this environment and remain unverified; web glass, opaque fallbacks and reduced-transparency handling were exercised only in Expo Web.
