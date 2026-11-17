import { useEffect, useState } from 'react';

/** Keeps derived day-scoped progress aligned with the UTC day while a screen stays open. */
export function useUtcClock(intervalMs = 60000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}
