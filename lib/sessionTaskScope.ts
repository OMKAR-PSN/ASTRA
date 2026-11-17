/** Invalidates pending UI updates without cancelling writes to their original repository. */
export function createSessionTaskScope() {
  let generation = 0;
  let active = false;
  return {
    activate() { generation += 1; active = true; },
    invalidate() { generation += 1; active = false; },
    capture() {
      const started = generation;
      return () => active && started === generation;
    },
  };
}
