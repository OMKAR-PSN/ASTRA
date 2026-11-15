import { createContext, useContext, useState, type ReactNode } from 'react';
import { createPresentationRepository } from '@/lib/presentationRepository';
import type { SessionRepository } from '@/lib/sessionRepositoryContract';
import { SessionProvider } from '@/state/SessionProvider';

const PresentationContext = createContext({ active: false, start: () => {}, exit: () => {} });
export const usePresentation = () => useContext(PresentationContext);

export function PresentationSession({ children }: { children: ReactNode }) {
  const [demo, setDemo] = useState<SessionRepository | null>(null);
  return <PresentationContext.Provider value={{ active: demo !== null, start: () => setDemo(createPresentationRepository()), exit: () => setDemo(null) }}>
    <SessionProvider key={demo ? 'presentation' : 'saved'} repository={demo ?? undefined}
      storageLabel={demo ? 'Presentation sandbox: session-only memory. Saved device records are unchanged.' : undefined}>
      {children}
    </SessionProvider>
  </PresentationContext.Provider>;
}
