import { createContext, useContext, useState, type ReactNode } from 'react';
import { createCrewDemoRepository } from '@/lib/crewDemoRepository';
import { createPresentationRepository } from '@/lib/presentationRepository';
import type { SessionRepository } from '@/lib/sessionRepositoryContract';
import { SessionProvider } from '@/state/SessionProvider';

type DemoSession = { crewId: string; repository: SessionRepository };

type PresentationValue = {
  active: boolean;
  activeCrewId: string | null;
  start: () => void;
  identify: (crewId: string) => void;
  exit: () => void;
};

const PresentationContext = createContext<PresentationValue>({
  active: false,
  activeCrewId: null,
  start: () => {},
  identify: () => {},
  exit: () => {},
});
export const usePresentation = () => useContext(PresentationContext);

export function PresentationSession({ children }: { children: ReactNode }) {
  const [demo, setDemo] = useState<DemoSession | null>(null);
  const value: PresentationValue = {
    active: demo !== null,
    activeCrewId: demo?.crewId ?? null,
    start: () => setDemo({ crewId: 'PRESENTATION', repository: createPresentationRepository() }),
    identify: (crewId) => setDemo({ crewId, repository: createCrewDemoRepository() }),
    exit: () => setDemo(null),
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
