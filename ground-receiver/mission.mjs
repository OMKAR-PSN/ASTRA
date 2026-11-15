const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]);

export function renderMissionTimeline(rows) {
  const cards = rows.map(({ payload, reference, received_at }) => {
    const report = JSON.parse(payload);
    const crew = report.snapshot.crew;
    const readings = report.snapshot.checkIn?.readings;
    const heartRate = Number.isFinite(readings?.heartRateBpm) ? readings.heartRateBpm + ' bpm' : 'Not recorded';
    const sleep = Number.isFinite(readings?.sleepHours) ? readings.sleepHours + ' hours' : 'Not recorded';

    return `<article>
      <h2>${escapeHtml(report.localReportId)}</h2>
      <dl>
        <dt>Crew</dt><dd>${escapeHtml(crew?.name ?? 'Unspecified')}</dd>
        <dt>Mission</dt><dd>${escapeHtml(crew?.missionName ?? 'Unspecified')}</dd>
        <dt>Heart rate</dt><dd>${heartRate}</dd>
        <dt>Sleep</dt><dd>${sleep}</dd>
        <dt>Received</dt><dd><time datetime="${escapeHtml(received_at)}">${escapeHtml(received_at)}</time></dd>
        <dt>Receipt</dt><dd>${escapeHtml(reference)}</dd>
      </dl>
    </article>`;
  });

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>ASTRA CARE | Ground timeline</title>
<style>
  :root { color-scheme: dark; font-family: system-ui, sans-serif; background: #081321; color: #f2f7fc; }
  main { max-width: 68rem; margin: auto; padding: clamp(1rem, 4vw, 3rem); }
  header p, dt { color: #afbed0; } strong { color: #31d9de; }
  section { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 24rem), 1fr)); gap: 1rem; }
  article { background: #112438; border: 1px solid #263b50; border-radius: .75rem; padding: 1rem; }
  h2 { margin-top: 0; } dl { display: grid; grid-template-columns: 6rem 1fr; gap: .5rem; margin-bottom: 0; }
  dd { margin: 0; overflow-wrap: anywhere; }
</style>
</head><body><main>
  <header><strong>ASTRA CARE · SYNTHETIC DEMO DATA</strong>
  <h1>Ground timeline</h1><p>Reports accepted by the simulated receiver. Latest 100, newest first.</p></header>
  <section aria-label="Received reports">${cards.join('') || '<p>No reports received yet. Send a queued report from Crew Delivery and reload this page.</p>'}</section>
</main></body></html>`;
}
