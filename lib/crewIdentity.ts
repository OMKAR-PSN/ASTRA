export const CREW_QR_TYPE = 'ASTRA_CARE_DEMO_CREW';
export const CREW_QR_VERSION = 1;
export const CREW_QR_MAX_LENGTH = 256;

export type CrewQrPayload = {
  version: typeof CREW_QR_VERSION;
  type: typeof CREW_QR_TYPE;
  crewId: string;
};

export type CrewQrRejection =
  | 'empty'
  | 'too_long'
  | 'malformed'
  | 'wrong_type'
  | 'unsupported_version'
  | 'invalid_crew_id'
  | 'unknown_crew';

export type CrewQrResult =
  | { ok: true; crewId: string }
  | { ok: false; reason: CrewQrRejection };

const CREW_ID_PATTERN = /^[A-Z0-9][A-Z0-9-]{2,31}$/;

/** Encodes a fictional crew identifier. The payload carries no medical data, name, or secret. */
export function encodeCrewQrPayload(crewId: string): string {
  const payload: CrewQrPayload = { version: CREW_QR_VERSION, type: CREW_QR_TYPE, crewId };
  return JSON.stringify(payload);
}

export function parseCrewQrPayload(raw: string, knownCrewIds: readonly string[]): CrewQrResult {
  const text = raw.trim();
  if (!text) return { ok: false, reason: 'empty' };
  if (text.length > CREW_QR_MAX_LENGTH) return { ok: false, reason: 'too_long' };

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'malformed' };
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { ok: false, reason: 'malformed' };
  }

  const candidate = parsed as Record<string, unknown>;
  if (candidate.type !== CREW_QR_TYPE) return { ok: false, reason: 'wrong_type' };
  if (candidate.version !== CREW_QR_VERSION) return { ok: false, reason: 'unsupported_version' };
  if (typeof candidate.crewId !== 'string' || !CREW_ID_PATTERN.test(candidate.crewId)) {
    return { ok: false, reason: 'invalid_crew_id' };
  }
  if (!knownCrewIds.includes(candidate.crewId)) return { ok: false, reason: 'unknown_crew' };

  return { ok: true, crewId: candidate.crewId };
}

export function describeCrewQrRejection(reason: CrewQrRejection): string {
  switch (reason) {
    case 'empty':
      return 'The crew code was empty. No records were changed.';
    case 'too_long':
      return 'The crew code is too long to be an ASTRA CARE demo code. No records were changed.';
    case 'malformed':
      return 'The crew code is not a valid demo payload. No records were changed.';
    case 'wrong_type':
      return 'This code is not an ASTRA CARE demo crew code. No records were changed.';
    case 'unsupported_version':
      return 'This crew code uses an unsupported version. No records were changed.';
    case 'invalid_crew_id':
      return 'The crew identifier is not valid. No records were changed.';
    case 'unknown_crew':
      return 'No local demonstration records match this crew. No records were changed.';
  }
}
