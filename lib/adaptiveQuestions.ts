import { formatTimestamp } from '@/lib/format';
import { SYMPTOM_TYPE_DEFINITIONS, locationLabel } from '@/lib/symptoms';
import type { CheckInFormValues, NumericKey } from '@/lib/checkInForm';
import type {
  AdaptiveAnswer,
  AdaptiveAnswerSource,
  AdaptiveResponse,
  AdaptiveRuleId,
  CheckIn,
  SymptomEntry,
} from '@/types/astra';

export const ADAPTIVE_QUESTION_LIMIT = 3;
export const ADAPTIVE_NOTE_MAX = 160;
export const ADAPTIVE_RESPONSE_MAX = 14;
export const ADAPTIVE_CONTEXT_LABEL_MAX = 120;

export type AdaptiveQuestionType = 'single-select' | 'multi-select' | 'short-text' | 'onset' | 'yes-no-not-sure';

export type AdaptiveQuestionOption = {
  id: string;
  label: string;
  notSure?: boolean;
};

export type AdaptiveQuestion = {
  id: string;
  ruleId: AdaptiveRuleId;
  type: AdaptiveQuestionType;
  prompt: string;
  helper: string;
  reason: string;
  options: AdaptiveQuestionOption[];
  maxLength?: number;
  requiresTextForOptionIds?: readonly string[];
  contextLabel: string | null;
  knowledgeCardId: string;
  order: number;
};

export type AdaptiveRuleEvaluation = {
  ruleId: AdaptiveRuleId;
  label: string;
  applicable: boolean;
  reason: string;
  questionIds: string[];
};

export type AdaptiveQuestionResult = {
  questions: AdaptiveQuestion[];
  allQuestionIds: string[];
  evaluations: AdaptiveRuleEvaluation[];
  totalAvailable: number;
  hiddenCount: number;
  limit: number;
};

export type AdaptiveContext = {
  symptoms: string[];
  symptomEntries: SymptomEntry[];
  /** Numeric fields left blank by the user; both forms already label blank as "Not measured". */
  blankMeasurements: NumericKey[];
  hasExplicitInput: boolean;
};

export type AdaptiveContextLine = {
  questionId: string;
  questionLabel: string;
  answerLabel: string;
  answeredAtText: string;
  sourceLabel: string;
};

const MEASUREMENT_KEYS: readonly NumericKey[] = [
  'heartRateBpm',
  'systolicMmHg',
  'diastolicMmHg',
  'temperatureC',
  'sleepHours',
];

const MEASUREMENT_LABELS: Record<NumericKey, string> = {
  heartRateBpm: 'heart rate',
  systolicMmHg: 'systolic pressure',
  diastolicMmHg: 'diastolic pressure',
  temperatureC: 'body temperature',
  sleepHours: 'sleep duration',
};

const ONSET_OPTIONS: AdaptiveQuestionOption[] = [
  { id: 'earlier-today', label: 'Earlier today' },
  { id: 'previous-day', label: 'Previous day' },
  { id: 'more-than-a-day', label: 'More than a day ago' },
  { id: 'not-sure', label: 'Not sure', notSure: true },
];

const YES_NO_NOT_SURE: AdaptiveQuestionOption[] = [
  { id: 'yes', label: 'Yes' },
  { id: 'no', label: 'No' },
  { id: 'not-sure', label: 'Not sure', notSure: true },
];

const SENSATION_OPTIONS: AdaptiveQuestionOption[] = SYMPTOM_TYPE_DEFINITIONS.map((type) => ({
  id: type.id,
  label: type.label,
}));

const HEAD_LOCATION_OPTIONS: AdaptiveQuestionOption[] = [
  { id: 'front', label: 'Front of the head' },
  { id: 'back', label: 'Back of the head' },
  { id: 'whole', label: 'Whole head' },
  { id: 'not-sure', label: 'Not sure', notSure: true },
];

const MEASUREMENT_REASON_OPTIONS: AdaptiveQuestionOption[] = [
  { id: 'measurement-not-available', label: 'Measurement not available' },
  { id: 'device-unavailable', label: 'Device unavailable' },
  { id: 'prefer-not-to-say', label: 'Prefer not to say' },
  { id: 'other', label: 'Other' },
];

const MEASUREMENT_REQUIRES_NOTE = ['other'] as const;

const FATIGUE_WORDS = ['tired', 'fatigue', 'exhaust', 'low energy', 'run down'];
const HEAD_WORDS = ['headache', 'head pain', 'migraine', 'head discomfort'];
const SLEEP_WORDS = ['trouble sleeping', 'difficulty sleeping', 'poor sleep', 'insomnia'];
const DIZZINESS_WORDS = ['dizz', 'lighthead', 'light-head', 'nausea', 'nauseous', 'queasy'];

const normalizeWord = (value: string) => value.trim().toLowerCase();
const matchesAny = (text: string, parts: readonly string[]) => parts.some((part) => text.includes(part));

type CatalogQuestion = Omit<AdaptiveQuestion, 'order' | 'contextLabel'>;

const CATALOG: CatalogQuestion[] = [
  {
    id: 'fatigue-onset',
    ruleId: 'fatigue',
    type: 'onset',
    prompt: 'When did the tiredness first start?',
    helper: 'An approximate time is enough. Choose Not sure if you do not know.',
    reason: 'Because you reported tiredness, you can add a little more context.',
    options: ONSET_OPTIONS,
    knowledgeCardId: 'symptom-reporting',
  },
  {
    id: 'fatigue-change',
    ruleId: 'fatigue',
    type: 'yes-no-not-sure',
    prompt: 'Has the tiredness changed since it began?',
    helper: 'Not sure is recorded separately from No.',
    reason: 'Because you reported tiredness, you can add a little more context.',
    options: YES_NO_NOT_SURE,
    knowledgeCardId: 'symptom-reporting',
  },
  {
    id: 'fatigue-context',
    ruleId: 'fatigue',
    type: 'short-text',
    prompt: 'What were you doing when you noticed the tiredness?',
    helper: 'A short note in your own words. This is not a diagnosis.',
    reason: 'Because you reported tiredness, you can add a little more context.',
    options: [],
    maxLength: ADAPTIVE_NOTE_MAX,
    knowledgeCardId: 'symptom-reporting',
  },
  {
    id: 'head-onset',
    ruleId: 'head',
    type: 'onset',
    prompt: 'When did the head discomfort first start?',
    helper: 'An approximate time is enough. Choose Not sure if you do not know.',
    reason: 'Because you reported head discomfort, you can add a little more context.',
    options: ONSET_OPTIONS,
    knowledgeCardId: 'symptom-reporting',
  },
  {
    id: 'head-location',
    ruleId: 'head',
    type: 'single-select',
    prompt: 'Where do you notice the head discomfort?',
    helper: 'Choose one area, or Not sure.',
    reason: 'Because you reported head discomfort, you can add a little more context.',
    options: HEAD_LOCATION_OPTIONS,
    knowledgeCardId: 'symptom-reporting',
  },
  {
    id: 'head-sensation',
    ruleId: 'head',
    type: 'multi-select',
    prompt: 'How would you describe the head discomfort?',
    helper: 'Select any descriptions that fit. This records your words, not a severity rating.',
    reason: 'Because you reported head discomfort, you can add a little more context.',
    options: SENSATION_OPTIONS,
    knowledgeCardId: 'symptom-reporting',
  },
  {
    id: 'sleep-interruptions',
    ruleId: 'sleep',
    type: 'yes-no-not-sure',
    prompt: 'Did your sleep feel interrupted?',
    helper: 'Not sure is recorded separately from No.',
    reason: 'Because you reported difficulty sleeping, you can add a little more context.',
    options: YES_NO_NOT_SURE,
    knowledgeCardId: 'sleep-duration',
  },
  {
    id: 'sleep-factors',
    ruleId: 'sleep',
    type: 'short-text',
    prompt: 'Is anything affecting your rest?',
    helper: 'Optional words about your rest. This is not a diagnosis.',
    reason: 'Because you reported difficulty sleeping, you can add a little more context.',
    options: [],
    maxLength: ADAPTIVE_NOTE_MAX,
    knowledgeCardId: 'sleep-duration',
  },
  {
    id: 'dizziness-onset',
    ruleId: 'dizziness',
    type: 'onset',
    prompt: 'When did the dizziness or nausea first start?',
    helper: 'An approximate time is enough. Choose Not sure if you do not know.',
    reason: 'Because you reported dizziness or nausea, you can add a little more context.',
    options: ONSET_OPTIONS,
    knowledgeCardId: 'symptom-reporting',
  },
  {
    id: 'dizziness-ongoing',
    ruleId: 'dizziness',
    type: 'yes-no-not-sure',
    prompt: 'Is it still present now?',
    helper: 'Not sure is recorded separately from No.',
    reason: 'Because you reported dizziness or nausea, you can add a little more context.',
    options: YES_NO_NOT_SURE,
    knowledgeCardId: 'symptom-reporting',
  },
  {
    id: 'dizziness-context',
    ruleId: 'dizziness',
    type: 'short-text',
    prompt: 'What were you doing when you noticed it?',
    helper: 'A short note in your own words. This is not a diagnosis.',
    reason: 'Because you reported dizziness or nausea, you can add a little more context.',
    options: [],
    maxLength: ADAPTIVE_NOTE_MAX,
    knowledgeCardId: 'symptom-reporting',
  },
  {
    id: 'body-onset',
    ruleId: 'body',
    type: 'onset',
    prompt: 'When did you first notice the discomfort at {location}?',
    helper: 'This reuses your body-map entry. You do not need to re-enter the location.',
    reason: 'Because you added a symptom on the body map, you can add a little more context.',
    options: ONSET_OPTIONS,
    knowledgeCardId: 'symptom-reporting',
  },
  {
    id: 'body-change',
    ruleId: 'body',
    type: 'yes-no-not-sure',
    prompt: 'Has the discomfort at {location} changed since it began?',
    helper: 'Not sure is recorded separately from No.',
    reason: 'Because you added a symptom on the body map, you can add a little more context.',
    options: YES_NO_NOT_SURE,
    knowledgeCardId: 'symptom-reporting',
  },
  {
    id: 'measurement-reason',
    ruleId: 'measurement',
    type: 'single-select',
    prompt: 'Would you like to explain why {measurements} was not recorded?',
    helper: 'This does not add a measurement. Blank values stay recorded as not measured.',
    reason: 'You left a measurement blank and marked it as not measured. You can explain why if you choose.',
    options: MEASUREMENT_REASON_OPTIONS,
    maxLength: ADAPTIVE_NOTE_MAX,
    requiresTextForOptionIds: MEASUREMENT_REQUIRES_NOTE,
    knowledgeCardId: 'missing-data',
  },
];

const CATALOG_INDEX = new Map(CATALOG.map((question, index) => [question.id, index]));
const CATALOG_BY_ID = new Map(CATALOG.map((question) => [question.id, question]));

const RULE_META: { ruleId: AdaptiveRuleId; label: string; applicableReason: string; inactiveReason: string }[] = [
  {
    ruleId: 'fatigue',
    label: 'Fatigue context',
    applicableReason: 'Because you reported tiredness, you can add a little more context.',
    inactiveReason: 'No tiredness was explicitly reported.',
  },
  {
    ruleId: 'head',
    label: 'Head discomfort context',
    applicableReason: 'Because you reported head discomfort, you can add a little more context.',
    inactiveReason: 'No head discomfort was explicitly reported.',
  },
  {
    ruleId: 'sleep',
    label: 'Sleep context',
    applicableReason: 'Because you reported difficulty sleeping, you can add a little more context.',
    inactiveReason: 'No difficulty sleeping was explicitly reported.',
  },
  {
    ruleId: 'dizziness',
    label: 'Dizziness or nausea context',
    applicableReason: 'Because you reported dizziness or nausea, you can add a little more context.',
    inactiveReason: 'No dizziness or nausea was explicitly reported.',
  },
  {
    ruleId: 'body',
    label: 'Body-map context',
    applicableReason: 'Because you added a symptom on the body map, you can add a little more context.',
    inactiveReason: 'No non-head body-map symptom was recorded.',
  },
  {
    ruleId: 'measurement',
    label: 'Missing measurement context',
    applicableReason: 'You left a measurement blank and marked it as not measured. You can explain why if you choose.',
    inactiveReason: 'No measurement was left blank, or no other observation was entered.',
  },
];

/** Builds evaluation input from the shared form values. Only explicit user input is used. */
export function buildAdaptiveContext(values: CheckInFormValues): AdaptiveContext {
  const texts = values.texts ?? ({} as CheckInFormValues['texts']);
  const symptoms = (values.symptoms ?? []).filter((symptom) => symptom.trim() !== '');
  const symptomEntries = values.symptomEntries ?? [];
  const blankMeasurements = MEASUREMENT_KEYS.filter((key) => (texts[key] ?? '').trim() === '');
  const hasExplicitInput = Boolean(
    values.subjective?.mood != null
    || values.subjective?.stress != null
    || symptoms.length > 0
    || symptomEntries.length > 0
    || (values.adaptiveResponses?.length ?? 0) > 0
    || MEASUREMENT_KEYS.some((key) => (texts[key] ?? '').trim() !== ''),
  );
  return { symptoms, symptomEntries, blankMeasurements, hasExplicitInput };
}

function resolveQuestion(base: CatalogQuestion, contextLabel: string | null, order: number): AdaptiveQuestion {
  const location = contextLabel ?? 'the selected area';
  const measurements = contextLabel ?? 'this measurement';
  return {
    ...base,
    prompt: base.prompt.replace('{location}', location).replace('{measurements}', measurements),
    contextLabel,
    order,
  };
}

function groupQuestions(signals: AdaptiveContext): Record<AdaptiveRuleId, { questions: AdaptiveQuestion[]; applicable: boolean }> {
  const words = signals.symptoms.map(normalizeWord);
  const headEntry = signals.symptomEntries.find((entry) => entry.bodyRegion === 'head') ?? null;
  const bodyEntry = signals.symptomEntries.find((entry) => entry.bodyRegion !== null && entry.bodyRegion !== 'head') ?? null;
  const hasFatigue = words.some((word) => matchesAny(word, FATIGUE_WORDS));
  const hasHead = Boolean(headEntry) || words.some((word) => matchesAny(word, HEAD_WORDS));
  const hasSleep = words.some((word) => matchesAny(word, SLEEP_WORDS));
  const hasDizziness = words.some((word) => matchesAny(word, DIZZINESS_WORDS));
  const hasMeasurementGap = signals.blankMeasurements.length > 0 && signals.hasExplicitInput;

  const pick = (id: string, contextLabel: string | null = null) => resolveQuestion(
    CATALOG_BY_ID.get(id) as CatalogQuestion,
    contextLabel,
    CATALOG_INDEX.get(id) ?? 0,
  );

  const headLabel = headEntry ? locationLabel(headEntry) : null;
  const headQuestions = hasHead
    ? [
        pick('head-onset', headLabel),
        ...(headEntry ? [] : [pick('head-location'), pick('head-sensation')]),
      ]
    : [];

  const bodyLabel = bodyEntry ? locationLabel(bodyEntry) : null;
  const measurementLabel = signals.blankMeasurements.length > 0
    ? signals.blankMeasurements.map((key) => MEASUREMENT_LABELS[key]).join(', ')
    : null;

  return {
    fatigue: { applicable: hasFatigue, questions: hasFatigue ? [pick('fatigue-onset'), pick('fatigue-change'), pick('fatigue-context')] : [] },
    head: { applicable: hasHead, questions: headQuestions },
    sleep: { applicable: hasSleep, questions: hasSleep ? [pick('sleep-interruptions'), pick('sleep-factors')] : [] },
    dizziness: { applicable: hasDizziness, questions: hasDizziness ? [pick('dizziness-onset'), pick('dizziness-ongoing'), pick('dizziness-context')] : [] },
    body: { applicable: Boolean(bodyEntry), questions: bodyEntry ? [pick('body-onset', bodyLabel), pick('body-change', bodyLabel)] : [] },
    measurement: { applicable: hasMeasurementGap, questions: hasMeasurementGap ? [pick('measurement-reason', measurementLabel)] : [] },
  };
}

/** Interleaves groups so a check-in with several symptoms sees a range of follow-ups first. */
function orderQuestions(groupsByRule: Record<AdaptiveRuleId, { questions: AdaptiveQuestion[] }>): AdaptiveQuestion[] {
  const groups = RULE_META
    .map((meta) => groupsByRule[meta.ruleId].questions)
    .filter((questions) => questions.length > 0);
  const ordered: AdaptiveQuestion[] = [];
  const longest = groups.reduce((max, questions) => Math.max(max, questions.length), 0);
  for (let index = 0; index < longest; index += 1) {
    groups.forEach((questions) => {
      const question = questions[index];
      if (question) ordered.push(question);
    });
  }
  return ordered.map((question, index) => ({ ...question, order: index }));
}

/** Pure evaluation. It never saves, routes, transmits, or mutates its input. */
export function evaluateAdaptiveQuestions(
  context: AdaptiveContext,
  options: { limit?: number } = {},
): AdaptiveQuestionResult {
  const groupsByRule = groupQuestions(context);
  const ordered = orderQuestions(groupsByRule);
  const requested = options.limit ?? ADAPTIVE_QUESTION_LIMIT;
  const limit = Number.isFinite(requested) ? Math.max(0, Math.trunc(requested)) : ordered.length;

  return {
    questions: ordered.slice(0, limit),
    allQuestionIds: ordered.map((question) => question.id),
    evaluations: RULE_META.map((meta) => {
      const group = groupsByRule[meta.ruleId];
      return {
        ruleId: meta.ruleId,
        label: meta.label,
        applicable: group.applicable,
        reason: group.applicable ? meta.applicableReason : meta.inactiveReason,
        questionIds: group.questions.map((question) => question.id),
      };
    }),
    totalAvailable: ordered.length,
    hiddenCount: Math.max(0, ordered.length - limit),
    limit,
  };
}

export function activeAdaptiveQuestionIds(context: AdaptiveContext): Set<string> {
  return new Set(evaluateAdaptiveQuestions(context, { limit: Number.POSITIVE_INFINITY }).allQuestionIds);
}

export function hasAdaptiveQuestions(context: AdaptiveContext): boolean {
  return evaluateAdaptiveQuestions(context, { limit: 0 }).totalAvailable > 0;
}

export function findInactiveAdaptiveResponses(values: CheckInFormValues): AdaptiveResponse[] {
  const active = activeAdaptiveQuestionIds(buildAdaptiveContext(values));
  return (values.adaptiveResponses ?? []).filter((response) => !active.has(response.questionId));
}

export function validateAdaptiveAnswer(question: AdaptiveQuestion, answer: AdaptiveAnswer): string | null {
  const known = new Set(question.options.map((option) => option.id));
  const unknown = answer.optionIds.some((id) => !known.has(id));
  if (unknown) return 'Choose an option from the list.';
  const text = answer.text?.trim() ?? '';

  if (question.type === 'short-text') {
    if (text === '') return 'Add a short note before continuing, or skip this question.';
    if (text.length > ADAPTIVE_NOTE_MAX) return `Keep the note to ${ADAPTIVE_NOTE_MAX} characters.`;
    return null;
  }

  if (answer.optionIds.length === 0) return 'Choose an option to continue, or skip this question.';
  if (question.type !== 'multi-select' && answer.optionIds.length > 1) return 'Choose one option.';
  if (text.length > ADAPTIVE_NOTE_MAX) return `Keep the note to ${ADAPTIVE_NOTE_MAX} characters.`;
  if (question.requiresTextForOptionIds?.some((id) => answer.optionIds.includes(id)) && text === '') {
    return 'Add a short note for this option.';
  }
  return null;
}

export function createAdaptiveResponse(
  question: AdaptiveQuestion,
  answer: AdaptiveAnswer,
  source: AdaptiveAnswerSource,
  answeredAtUTC: string,
  contextLabel: string | null = null,
): AdaptiveResponse | null {
  const known = new Set(question.options.map((option) => option.id));
  const optionIds = [...new Set(answer.optionIds.filter((id) => known.has(id)))];
  const text = typeof answer.text === 'string' ? answer.text.trim().slice(0, ADAPTIVE_NOTE_MAX) : null;
  const normalized: AdaptiveAnswer = { optionIds, text: text ? text : null };
  if (validateAdaptiveAnswer(question, normalized) !== null) return null;
  if (!Number.isFinite(Date.parse(answeredAtUTC))) return null;
  return {
    questionId: question.id,
    ruleId: question.ruleId,
    answer: normalized,
    source,
    answeredAtUTC,
    contextLabel: contextLabel ? contextLabel.trim().slice(0, ADAPTIVE_CONTEXT_LABEL_MAX) : null,
  };
}

function normalizeStoredResponse(value: unknown): AdaptiveResponse | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const questionId = typeof record.questionId === 'string' ? record.questionId.trim() : '';
  const question = CATALOG_BY_ID.get(questionId);
  if (!question) return null;
  if (record.ruleId !== question.ruleId) return null;
  if (record.source !== 'guided' && record.source !== 'detailed') return null;
  const answeredAtUTC = typeof record.answeredAtUTC === 'string' ? record.answeredAtUTC : '';
  if (!Number.isFinite(Date.parse(answeredAtUTC))) return null;
  const answer = record.answer;
  if (!answer || typeof answer !== 'object' || Array.isArray(answer)) return null;
  const answerRecord = answer as Record<string, unknown>;
  const optionIds = Array.isArray(answerRecord.optionIds)
    ? answerRecord.optionIds.filter((id): id is string => typeof id === 'string').slice(0, question.options.length)
    : [];
  const text = typeof answerRecord.text === 'string' ? answerRecord.text : null;
  const contextLabel = typeof record.contextLabel === 'string'
    ? record.contextLabel.trim().slice(0, ADAPTIVE_CONTEXT_LABEL_MAX)
    : null;
  return createAdaptiveResponse(
    resolveQuestion(question, contextLabel, 0),
    { optionIds, text },
    record.source,
    answeredAtUTC,
    contextLabel,
  );
}

/** Drops malformed, unknown, duplicate, and over-limit answers instead of trusting stored values. */
export function sanitizeAdaptiveResponses(value: unknown): AdaptiveResponse[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: AdaptiveResponse[] = [];
  for (const candidate of value) {
    if (result.length >= ADAPTIVE_RESPONSE_MAX) break;
    const response = normalizeStoredResponse(candidate);
    if (!response || seen.has(response.questionId)) continue;
    seen.add(response.questionId);
    result.push(response);
  }
  return result.sort((left, right) => (CATALOG_INDEX.get(left.questionId) ?? 0) - (CATALOG_INDEX.get(right.questionId) ?? 0));
}

/** Sanitizes only records that claim adaptive answers; legacy records stay untouched. */
export function normalizeCheckInAdaptive(checkIn: CheckIn): CheckIn {
  if (checkIn.adaptiveResponses === undefined) return checkIn;
  const adaptiveResponses = sanitizeAdaptiveResponses(checkIn.adaptiveResponses);
  if (adaptiveResponses.length > 0) return { ...checkIn, adaptiveResponses };
  const next = { ...checkIn };
  delete next.adaptiveResponses;
  return next;
}

export function questionForResponse(response: AdaptiveResponse): AdaptiveQuestion | null {
  const base = CATALOG_BY_ID.get(response.questionId);
  return base ? resolveQuestion(base, response.contextLabel, CATALOG_INDEX.get(response.questionId) ?? 0) : null;
}

export function answerLabelFor(question: AdaptiveQuestion, answer: AdaptiveAnswer): string {
  const labels = question.options
    .filter((option) => answer.optionIds.includes(option.id))
    .map((option) => option.label);
  const base = labels.join(', ');
  const text = answer.text?.trim() ?? '';
  if (question.type === 'short-text') return text;
  if (base && text) return `${base} — ${text}`;
  return base || text;
}

export function describeAdaptiveResponse(response: AdaptiveResponse): { question: string; answer: string } {
  const question = questionForResponse(response);
  if (!question) return { question: 'Optional question', answer: '' };
  return { question: question.prompt, answer: answerLabelFor(question, response.answer) };
}

export function adaptiveContextLines(responses: AdaptiveResponse[] | undefined): AdaptiveContextLine[] {
  return sanitizeAdaptiveResponses(responses).map((response) => {
    const { question, answer } = describeAdaptiveResponse(response);
    return {
      questionId: response.questionId,
      questionLabel: question,
      answerLabel: answer,
      answeredAtText: formatTimestamp(response.answeredAtUTC),
      sourceLabel: response.source === 'guided' ? 'Guided check-in' : 'Detailed check-in',
    };
  });
}

export function isNotSureAnswer(response: AdaptiveResponse): boolean {
  const question = questionForResponse(response);
  return Boolean(question?.options.some((option) => option.notSure && response.answer.optionIds.includes(option.id)));
}
