import { copyFormValues, type CheckInFormValues } from '@/lib/checkInForm';

let pending: CheckInFormValues | null = null;

/** Hands values between the guided and detailed forms without saving a record. Module-scoped and session-only. */
export function setFormHandoff(values: CheckInFormValues) {
  pending = copyFormValues(values);
}

export function takeFormHandoff(): CheckInFormValues | null {
  const values = pending;
  pending = null;
  return values;
}

/** Drops an unconsumed handoff so a crew switch can never surface another session's draft. */
export function clearFormHandoff() {
  pending = null;
}
