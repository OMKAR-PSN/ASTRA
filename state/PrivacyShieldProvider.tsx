import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AccessibilityInfo, Alert, Platform } from 'react-native';

import { useVoiceGuidance } from '@/state/VoiceGuidanceProvider';

type PrivacyShieldValue = {
  active: boolean;
  activate: () => void;
  returnToSession: () => void;
  hasUnsavedDraft: boolean;
  setUnsavedDraft: (value: boolean) => void;
  confirmDiscardUnsaved: (message: string) => Promise<boolean>;
};

const PrivacyShieldContext = createContext<PrivacyShieldValue | null>(null);

export function usePrivacyShield(): PrivacyShieldValue {
  const value = useContext(PrivacyShieldContext);
  if (!value) throw new Error('usePrivacyShield must be used inside PrivacyShieldProvider');
  return value;
}

/**
 * Owns the visual Privacy Shield. Activation stops speech and hides the interface;
 * it never changes stored observations and is not presented as authentication.
 */
export function PrivacyShieldProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false);
  const [hasUnsavedDraft, setUnsavedDraft] = useState(false);
  const { stop } = useVoiceGuidance();

  const activate = useCallback(() => {
    setActive(true);
    void stop();
    AccessibilityInfo.announceForAccessibility(
      'Privacy Shield active. Personal health details are hidden from view. This is a visual privacy mode, not a lock or sign-in.',
    );
  }, [stop]);

  const returnToSession = useCallback(() => {
    setActive(false);
    AccessibilityInfo.announceForAccessibility('Privacy Shield off. Personal health details are visible.');
  }, []);

  const confirmDiscardUnsaved = useCallback(async (message: string) => {
    if (!hasUnsavedDraft) return true;
    if (Platform.OS === 'web') {
      const confirmFn = (globalThis as { confirm?: (text?: string) => boolean }).confirm;
      return confirmFn ? confirmFn(message) : true;
    }
    return new Promise<boolean>((resolve) => {
      Alert.alert(
        'Unsaved check-in',
        message,
        [
          { text: 'Keep editing', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Discard and continue', style: 'destructive', onPress: () => resolve(true) },
        ],
        { cancelable: true, onDismiss: () => resolve(false) },
      );
    });
  }, [hasUnsavedDraft]);

  const value = useMemo<PrivacyShieldValue>(() => ({
    active,
    activate,
    returnToSession,
    hasUnsavedDraft,
    setUnsavedDraft,
    confirmDiscardUnsaved,
  }), [active, activate, returnToSession, hasUnsavedDraft, confirmDiscardUnsaved]);

  return <PrivacyShieldContext.Provider value={value}>{children}</PrivacyShieldContext.Provider>;
}
