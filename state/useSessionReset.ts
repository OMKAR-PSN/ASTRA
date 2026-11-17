import { useEffect, useRef } from 'react';

import { usePresentation } from '@/state/PresentationSession';

/**
 * Runs `reset` when the active session source changes (crew identified, session exited,
 * or demo started). Transient drafts and selections must never carry across a switch.
 */
export function useSessionReset(reset: () => void) {
  const { sessionVersion } = usePresentation();
  const resetRef = useRef(reset);
  const seen = useRef(sessionVersion);

  useEffect(() => {
    resetRef.current = reset;
  }, [reset]);

  useEffect(() => {
    if (seen.current === sessionVersion) return;
    seen.current = sessionVersion;
    resetRef.current();
  }, [sessionVersion]);
}
