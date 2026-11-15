# UI/UX audit — 15 November 2026

## Findings and implementation

| Category | Finding | Response |
|---|---|---|
| Functionality defect | Displayed timestamps used the computer's local timezone. | Shared timestamp formatter uses UTC. |
| Data interpretation | Missing values and baseline colors needed explicit meaning. | Missing labels, synthetic baseline labels, manual source and timestamps accompany observations. Older than 24 hours is an explicit demo freshness rule. |
| Accessibility | Region selection needed redundant keyboard controls. | Body map retains labeled controls and accessible state. |
| Visual inconsistency | Different screen titles and generous card heights reduced coherence. | Shared operational header, semantic theme, compact bordered panels. |
| Information hierarchy | Report preview occupied a primary tab while assessment was embedded. | Five primary areas with a dedicated assessment route and report preview as a secondary route. |
| Responsive layout | Content width restricted large desktops. | Shared responsive shell and flexible panels. Test the six requested viewport sizes. |
| Optional polish | Charts used short bars with check-in ID suffixes. | Historical line charts show real recorded points and gaps. |

## Reference principles applied

Consulted the standard registry and NASA reference pages on 15 November 2026. These guide prototype design.

- Consistent layouts, labels and icons reduce relearning. ASTRA CARE uses a shared shell and navigation.
- Missing or unavailable information needs an explicit indication. Readings retain missing states, measured time and source.
- Controls need timely feedback. Save and send actions show pending states and success follows persistence.
- Confirmation supports error prevention. Report confirmation fixes a snapshot before it enters the outbox.
- Graphs need titles, units, tick labels and distinctions between historical and live information. Charts use recorded observations and synthetic baseline labels.
- Color needs redundant meaning. Review and delivery states have text labels.
- Time needs an identified reference system. Operational dates use UTC.
- Primary data and actions should be easy to locate. Dense desktop layouts collapse for smaller screens.
- Touch and keyboard use require legible labels, adequate targets and selectable controls.
- Mode visibility identifies simulated operation. The header labels the synthetic demo and simulated communications.

Sources:
- [NASA-STD-3001 Volume 2 registry](https://standards.nasa.gov/standard/NASA/NASA-STD-3001_VOL_2)
- [NASA Crew Interfaces](https://www.nasa.gov/reference/10-0-crew-interfaces-vol-2/)
- [NASA Appendix F Display Standard](https://www.nasa.gov/reference/appendix-f-vol-2/)
- [Expo Router introduction](https://docs.expo.dev/router/introduction/)

The interface uses ASTRA CARE brand colors. The existing fictional crew and mission identity are retained so persisted reports remain consistent. Physical Expo Go device testing remains outstanding.
