# Implementation decisions

- Expo Web caches the exported application shell with a service worker. IndexedDB stores the check-ins, immutable report snapshots and delivery results. Native uses the same repository contract with Expo SQLite. Existing IndexedDB data keeps its original storage key.
- The optional Fastify receiver uses Node SQLite. Version 1 reports use deterministic JSON and SHA-256. The client validates the returned report ID and hash before saving an acknowledgement. The simulator is for fictional data and local demos.
- To keep an interrupted transfer retryable, Sending is displayed in memory. The client persists the eventual Failed or Acknowledged state. Retrying the same snapshot returns the same receiver receipt.
- Website metric colors describe differences from the synthetic baseline. NASA's hazard categories appear as mission context. Source accessed November 15, 2026. [NASA Human Research Program](https://www.nasa.gov/hrp/risks/)
- The receiver's local mission timeline reads accepted snapshots from SQLite and displays the most recent 100 reports.
