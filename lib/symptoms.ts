import type {
  CheckIn,
  SymptomBodySide,
  SymptomBodyView,
  SymptomEntry,
  SymptomRegionId,
  SymptomStatus,
  SymptomTypeId,
} from '@/types/astra';

export const SYMPTOM_NOTE_MAX = 500;
export const SYMPTOM_COUNT_MAX = 12;

export type SymptomRegionDefinition = {
  id: SymptomRegionId;
  label: string;
  views: readonly SymptomBodyView[];
  paired: boolean;
};

export const SYMPTOM_REGION_DEFINITIONS: readonly SymptomRegionDefinition[] = [
  { id: 'head', label: 'Head', views: ['front', 'back'], paired: false },
  { id: 'neck', label: 'Neck', views: ['front', 'back'], paired: false },
  { id: 'chest', label: 'Chest', views: ['front'], paired: false },
  { id: 'abdomen', label: 'Abdomen', views: ['front'], paired: false },
  { id: 'upper-back', label: 'Upper back', views: ['back'], paired: false },
  { id: 'lower-back', label: 'Lower back', views: ['back'], paired: false },
  { id: 'shoulder', label: 'Shoulder', views: ['front', 'back'], paired: true },
  { id: 'upper-arm', label: 'Upper arm', views: ['front', 'back'], paired: true },
  { id: 'forearm', label: 'Forearm', views: ['front', 'back'], paired: true },
  { id: 'hand', label: 'Hand', views: ['front', 'back'], paired: true },
  { id: 'hip', label: 'Hip', views: ['front', 'back'], paired: true },
  { id: 'thigh', label: 'Thigh', views: ['front', 'back'], paired: true },
  { id: 'knee', label: 'Knee', views: ['front', 'back'], paired: true },
  { id: 'lower-leg', label: 'Lower leg', views: ['front', 'back'], paired: true },
  { id: 'foot', label: 'Foot', views: ['front', 'back'], paired: true },
] as const;

export const SYMPTOM_TYPE_DEFINITIONS: readonly { id: SymptomTypeId; label: string }[] = [
  { id: 'pain', label: 'Pain or discomfort' },
  { id: 'pressure', label: 'Pressure' },
  { id: 'tingling', label: 'Tingling' },
  { id: 'numbness', label: 'Numbness' },
  { id: 'stiffness', label: 'Stiffness' },
  { id: 'swelling', label: 'Swelling' },
  { id: 'other', label: 'Other sensation' },
] as const;

export const INTENSITY_LEVELS = [
  { value: 1, label: 'Barely noticeable' },
  { value: 2, label: 'Mild' },
  { value: 3, label: 'Moderate' },
  { value: 4, label: 'Strong' },
  { value: 5, label: 'Very strong' },
] as const;

export type SymptomRegionSelection = {
  region: SymptomRegionId;
  side: SymptomBodySide;
  view: SymptomBodyView;
};

export type SymptomDisplayState = SymptomStatus | 'not-recorded';

const REGION_BY_ID = new Map(SYMPTOM_REGION_DEFINITIONS.map((region) => [region.id, region]));
const TYPE_IDS = new Set(SYMPTOM_TYPE_DEFINITIONS.map((type) => type.id));
const VIEWS = new Set<SymptomBodyView>(['front', 'back']);
const SIDES = new Set<SymptomBodySide>(['left', 'right', 'center', 'not_applicable']);
const STATUSES = new Set<SymptomStatus>(['none', 'reported', 'not-answered']);

export const isSymptomRegion = (value: unknown): value is SymptomRegionId =>
  typeof value === 'string' && REGION_BY_ID.has(value as SymptomRegionId);

export const isSymptomType = (value: unknown): value is SymptomTypeId =>
  typeof value === 'string' && TYPE_IDS.has(value as SymptomTypeId);

export const isSymptomIntensity = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 5;

export const isSymptomBodyView = (value: unknown): value is SymptomBodyView =>
  typeof value === 'string' && VIEWS.has(value as SymptomBodyView);

export const isSymptomBodySide = (value: unknown): value is SymptomBodySide =>
  typeof value === 'string' && SIDES.has(value as SymptomBodySide);

export function regionDefinition(id: SymptomRegionId): SymptomRegionDefinition {
  return REGION_BY_ID.get(id) ?? SYMPTOM_REGION_DEFINITIONS[0];
}

export function regionsForView(view: SymptomBodyView): SymptomRegionDefinition[] {
  return SYMPTOM_REGION_DEFINITIONS.filter((region) => region.views.includes(view));
}

export function typeLabel(id: SymptomTypeId): string {
  return SYMPTOM_TYPE_DEFINITIONS.find((type) => type.id === id)?.label ?? 'Sensation';
}

export function intensityLabel(value: number | null): string | null {
  return INTENSITY_LEVELS.find((level) => level.value === value)?.label ?? null;
}

export function locationLabel(entry: Pick<SymptomEntry, 'bodyRegion' | 'bodySide' | 'bodyView'>): string {
  if (entry.bodyRegion === null) return 'General symptom';
  const region = regionDefinition(entry.bodyRegion);
  const side = entry.bodySide === 'left' ? 'Left ' : entry.bodySide === 'right' ? 'Right ' : '';
  const core = `${side}${region.label}`;
  return entry.bodyView ? `${core} · ${entry.bodyView} view` : core;
}

export function formatSymptomEntry(entry: SymptomEntry): string {
  const intensity = entry.discomfortIntensity === null
    ? ''
    : ` (${entry.discomfortIntensity}/5 · ${intensityLabel(entry.discomfortIntensity) ?? 'Self-reported'})`;
  const note = entry.symptomNote.trim() ? ` — ${entry.symptomNote.trim()}` : '';
  return `${locationLabel(entry)}: ${typeLabel(entry.symptomType)}${intensity}${note}`;
}

export function getSymptomDisplayState(checkIn: Pick<CheckIn, 'symptoms' | 'symptomEntries' | 'symptomStatus'>): SymptomDisplayState {
  const entries = sanitizeSymptomEntries(checkIn.symptomEntries);
  const checklist = checkIn.symptoms.filter((symptom) => symptom.trim() !== '');
  if (entries.length > 0 || checklist.length > 0) return 'reported';
  if (checkIn.symptomStatus === 'none' || checkIn.symptomStatus === 'not-answered') return checkIn.symptomStatus;
  return 'not-recorded';
}

export function symptomStateLabel(checkIn: Pick<CheckIn, 'symptoms' | 'symptomEntries' | 'symptomStatus'>): string {
  const state = getSymptomDisplayState(checkIn);
  return state === 'none'
    ? 'No symptoms reported'
    : state === 'not-answered'
      ? 'Symptoms not answered'
      : state === 'not-recorded'
        ? 'Symptoms not recorded'
        : 'Symptoms described';
}

/** Human-readable lines for reports, assessment details, and replay. Never infers a region. */
export function symptomLines(checkIn: Pick<CheckIn, 'symptoms' | 'symptomEntries' | 'symptomStatus'>): string[] {
  const entries = sanitizeSymptomEntries(checkIn.symptomEntries);
  const checklist = checkIn.symptoms.filter((symptom) => symptom.trim() !== '');
  const lines = entries.map(formatSymptomEntry);
  if (checklist.length > 0) lines.push(`Word list: ${checklist.join(', ')}`);
  if (lines.length > 0) return lines;
  return [symptomStateLabel(checkIn)];
}

export function symptomSummaryText(checkIn: Pick<CheckIn, 'symptoms' | 'symptomEntries' | 'symptomStatus'>): string {
  return symptomLines(checkIn).join(' · ');
}

export function hasReportedSymptoms(checkIn: Pick<CheckIn, 'symptoms' | 'symptomEntries'>): boolean {
  return checkIn.symptoms.some((symptom) => symptom.trim() !== '')
    || sanitizeSymptomEntries(checkIn.symptomEntries).length > 0;
}

export function normalizeSymptomStatus(
  value: unknown,
  symptoms: string[],
  entries: SymptomEntry[],
): SymptomStatus {
  if (symptoms.some((symptom) => symptom.trim() !== '') || entries.length > 0) return 'reported';
  return typeof value === 'string' && STATUSES.has(value as SymptomStatus)
    ? (value as SymptomStatus)
    : 'not-answered';
}

type EntryLike = Partial<Record<keyof SymptomEntry, unknown>>;

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function normalizeEntry(value: unknown): SymptomEntry | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const entry = value as EntryLike;
  const symptomEntryId = asString(entry.symptomEntryId).trim();
  const bodyRegion = entry.bodyRegion === null ? null : isSymptomRegion(entry.bodyRegion) ? entry.bodyRegion : undefined;
  const symptomType = isSymptomType(entry.symptomType) ? entry.symptomType : null;
  const recordedAtUTC = asString(entry.recordedAtUTC);
  if (!symptomEntryId || bodyRegion === undefined || !symptomType || !Number.isFinite(Date.parse(recordedAtUTC))) return null;

  if (bodyRegion === null) {
    return {
      symptomEntryId,
      bodyRegion: null,
      bodySide: 'not_applicable',
      bodyView: null,
      symptomType,
      discomfortIntensity: isSymptomIntensity(entry.discomfortIntensity) ? entry.discomfortIntensity : null,
      symptomNote: asString(entry.symptomNote).trim().slice(0, SYMPTOM_NOTE_MAX),
      recordedAtUTC,
    };
  }

  const region = regionDefinition(bodyRegion);
  const bodyView = isSymptomBodyView(entry.bodyView) && region.views.includes(entry.bodyView) ? entry.bodyView : null;
  const bodySide = isSymptomBodySide(entry.bodySide)
    ? entry.bodySide
    : region.paired
      ? null
      : ('center' as const);
  if (!bodyView || !bodySide) return null;
  if (region.paired && bodySide !== 'left' && bodySide !== 'right') return null;
  if (!region.paired && bodySide !== 'center') return null;

  return {
    symptomEntryId,
    bodyRegion,
    bodySide,
    bodyView,
    symptomType,
    discomfortIntensity: isSymptomIntensity(entry.discomfortIntensity) ? entry.discomfortIntensity : null,
    symptomNote: asString(entry.symptomNote).trim().slice(0, SYMPTOM_NOTE_MAX),
    recordedAtUTC,
  };
}

/** Drops malformed stored entries, duplicates, and over-limit lists instead of rendering untrusted values. */
export function sanitizeSymptomEntries(value: unknown): SymptomEntry[] {
  if (!Array.isArray(value)) return [];
  const seenIds = new Set<string>();
  const seenContent = new Set<string>();
  const result: SymptomEntry[] = [];
  for (const candidate of value) {
    const entry = normalizeEntry(candidate);
    if (!entry || seenIds.has(entry.symptomEntryId) || result.length >= SYMPTOM_COUNT_MAX) continue;
    const content = `${entry.bodyRegion}|${entry.bodySide}|${entry.bodyView}|${entry.symptomType}|${entry.symptomNote}|${entry.discomfortIntensity}`;
    if (seenContent.has(content)) continue;
    seenIds.add(entry.symptomEntryId);
    seenContent.add(content);
    result.push(entry);
  }
  return result;
}

/** Normalizes only records that already claim the structured fields; legacy records stay untouched. */
export function normalizeCheckInSymptoms(checkIn: CheckIn): CheckIn {
  if (checkIn.symptomEntries === undefined && checkIn.symptomStatus === undefined) return checkIn;
  const symptomEntries = sanitizeSymptomEntries(checkIn.symptomEntries);
  return {
    ...checkIn,
    symptomEntries,
    symptomStatus: normalizeSymptomStatus(checkIn.symptomStatus, checkIn.symptoms, symptomEntries),
  };
}

export function findDuplicateSymptomEntry(
  entries: SymptomEntry[],
  candidate: Omit<SymptomEntry, 'symptomEntryId' | 'recordedAtUTC'>,
  ignoreId?: string,
): SymptomEntry | undefined {
  return entries.find((entry) =>
    entry.symptomEntryId !== ignoreId
    && entry.bodyRegion === candidate.bodyRegion
    && entry.bodySide === candidate.bodySide
    && entry.bodyView === candidate.bodyView
    && entry.symptomType === candidate.symptomType
    && entry.symptomNote === candidate.symptomNote
    && entry.discomfortIntensity === candidate.discomfortIntensity,
  );
}

export function createSymptomEntry(
  input: Omit<SymptomEntry, 'symptomEntryId' | 'recordedAtUTC'>,
  identity: { id: string; recordedAtUTC: string },
): SymptomEntry {
  const region = input.bodyRegion === null ? null : regionDefinition(input.bodyRegion);
  const paired = region?.paired ?? false;
  return {
    symptomEntryId: identity.id,
    bodyRegion: input.bodyRegion,
    bodySide: input.bodyRegion === null
      ? 'not_applicable'
      : paired
        ? input.bodySide === 'right' ? 'right' : 'left'
        : 'center',
    bodyView: input.bodyRegion === null ? null : input.bodyView,
    symptomType: isSymptomType(input.symptomType) ? input.symptomType : 'other',
    discomfortIntensity: isSymptomIntensity(input.discomfortIntensity) ? input.discomfortIntensity : null,
    symptomNote: input.symptomNote.trim().slice(0, SYMPTOM_NOTE_MAX),
    recordedAtUTC: Number.isFinite(Date.parse(identity.recordedAtUTC))
      ? identity.recordedAtUTC
      : new Date(0).toISOString(),
  };
}

export function describeSelection(selection: SymptomRegionSelection): string {
  const region = regionDefinition(selection.region);
  const side = region.paired ? (selection.side === 'right' ? 'Right ' : 'Left ') : '';
  return `${side}${region.label} · ${selection.view} view`;
}
