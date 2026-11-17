import { createContext, useContext, useState, type ReactNode } from 'react';
import { createCrewDemoRepository } from '@/lib/crewDemoRepository';
import { clearFormHandoff } from '@/lib/formHandoff';
import { createPresentationRepository } from '@/lib/presentationRepository';
import type { SessionRepository } from '@/lib/sessionRepositoryContract';
import { SessionProvider } from '@/state/SessionProvider';

type DemoSession = { crewId: string; repository: SessionRepository };

type PresentationValue = {
  active: boolean;
  activeCrewId: string | null;
  /** Changes whenever the active session source changes. Used to clear transient health UI state. */
  sessionVersion: number;
  start: () => void;
  identify: (crewId: string) => void;
  exit: () => void;
};

const PresentationContext = createContext<PresentationValue>({
  active: false,
  activeCrewId: null,
  sessionVersion: 0,
  start: () => {},
  identify: () => {},
  exit: () => {},
});
export const usePresentation = () => useContext(PresentationContext);

export function PresentationSession({ children }: { children: ReactNode }) {
  const [demo, setDemo] = useState<DemoSession | null>(null);
  const [sessionVersion, setSessionVersion] = useState(0);
  const activate = (next: DemoSession | null) => {
    clearFormHandoff();
    setDemo(next);
    setSessionVersion((version) => version + 1);
  };
  const value: PresentationValue = {
    active: demo !== null,
    activeCrewId: demo?.crewId ?? null,
    sessionVersion,
    start: () => activate({ crewId: 'PRESENTATION', repository: createPresentationRepository() }),
    identify: (crewId) => activate({ crewId, repository: createCrewDemoRepository() }),
    exit: () => activate(null),
  };

  return (
    <PresentationContext.Provider value={value}>
      <SessionProvider
        repository={demo?.repository}
        storageLabel={demo ? 'Demo crew session: session-only fixture records. Saved device records are unchanged.' : undefined}
      >
        {children}
      </SessionProvider>
    </PresentationContext.Provider>
  );
}
