import type { Assessment, AssessmentFinding } from '@/lib/assessment';
import type { AdaptiveQuestion } from '@/lib/adaptiveQuestions';
import { guidedStepMeta, type GuidedStepId } from '@/lib/guidedCheckIn';
import type { KnowledgeCard } from '@/lib/knowledge';
import type { ReplayFrame } from '@/lib/replay';
import { isUnavailableText, spokenPercent, spokenUnit, spokenValue } from './text';
import type { VoiceRequest } from './types';

export type KnowledgeSection = 'quick' | 'simple' | 'expanded';

const SIMPLE_STEP_INSTRUCTION: Record<GuidedStepId, string> = {
  wellbeing:
    'Choose the option that best describes how you feel. Stress uses a one to five scale, where one is calm and five is very high.',
  sleep: 'Enter the duration using the hours control. Leave it blank if you did not measure it.',
  vitals:
    'Enter the value from your measurement device, including the correct unit. Heart rate is in beats per minute, blood pressure is in millimeters of mercury, and body temperature is in degrees Celsius. Leave blank any value you did not measure.',
  symptoms:
    'Select anything that applies, then add brief context if it helps. You can choose a body area from the illustration or from the word list. Private notes are never read aloud automatically.',
  review: 'Check each entry. You can edit any step. Nothing is saved until you press Save check-in.',
};

const STEP_INTRO_VOICE: Record<GuidedStepId, string> = {
  wellbeing: 'Choose what fits today. These answers use the same one to five scale as the detailed form.',
  sleep: 'Approximate hours slept last night. Leave it blank if you did not measure it.',
  vitals: 'Enter only what you measured. Blank fields are recorded as not measured.',
  symptoms: 'Select anything that applies, and add brief context if it helps.',
  review: 'Check each entry. Nothing is saved until you press Save check-in.',
};

export function buildGuidedStepRequest(step: GuidedStepId): VoiceRequest {
  const meta = guidedStepMeta[step];
  return {
    sourceId: `guided-${step}`,
    label: meta.title,
    text: `${meta.title} ${STEP_INTRO_VOICE[step]} ${SIMPLE_STEP_INSTRUCTION[step]}`,
  };
}

export function buildAdaptiveQuestionRequest(question: AdaptiveQuestion): VoiceRequest {
  const options = question.type === 'short-text'
    ? 'Answer with a short note in your own words, or skip this question.'
    : `Choices: ${question.options.map((option) => option.label).join('. ')}.`;
  return {
    sourceId: `adaptive-${question.id}`,
    label: 'Optional question',
    text: `Optional question. ${question.prompt} ${question.reason} ${options} You can skip this question. Skipped is not recorded as No.`,
  };
}

function baselineSentence(finding: AssessmentFinding): string {
  if (finding.baselineText === 'No baseline') {
    return `This entry is self-reported on a one to five scale, and the prototype has no personal baseline for it.`;
  }
  if (finding.baseline === null || finding.baselineText === 'Not available') {
    return 'The fictional personal baseline is unavailable for this comparison.';
  }
  return `The fictional personal baseline is ${spokenValue(finding.baseline, finding.decimals)} ${spokenUnit(finding.unit)}.`;
}

function observedSentence(finding: AssessmentFinding): string {
  if (finding.observed === null) return `No current observation was recorded for ${finding.label.toLowerCase()}.`;
  return `The recorded ${finding.label.toLowerCase()} is ${spokenValue(finding.observed, finding.decimals)} ${spokenUnit(finding.unit)}.`;
}

function speakSymbols(text: string): string {
  return text
    .replace(/(\d+(?:\.\d+)?)\s*%/g, '$1 percent')
    .replace(/±/g, 'plus or minus ')
    .replace(/−/g, 'minus ')
    .replace(/×/g, ' times ')
    .replace(/÷/g, ' divided by ');
}

export function buildAssessmentOverviewRequest(assessment: Assessment): VoiceRequest {
  const nextStep = assessment.nextSteps[0] ?? '';
  return {
    sourceId: 'assessment-overview',
    label: 'Assessment overview',
    text: `${assessment.summaryTitle}. ${speakSymbols(assessment.summaryBody)} ${speakSymbols(assessment.engineSummary)} ${nextStep} This is a prototype comparison, not a medical diagnosis.`,
  };
}

export function buildFindingExplanationRequest(finding: AssessmentFinding, nextStep?: string): VoiceRequest {
  const parts = [
    finding.label + '.',
    observedSentence(finding),
    baselineSentence(finding),
    `${finding.statusLabel}.`,
    finding.headline,
    finding.note,
  ];
  if (finding.stale && finding.staleNote) parts.push(finding.staleNote);
  if (nextStep) parts.push(nextStep);
  return {
    sourceId: `assessment-finding-${finding.key}`,
    label: finding.label,
    text: parts.join(' '),
  };
}

export function buildCalculationRequest(finding: AssessmentFinding, thresholdPercent: number): VoiceRequest {
  const parts: string[] = [`Calculation for ${finding.label.toLowerCase()}.`, observedSentence(finding)];

  if (finding.observed === null) {
    parts.push('Without a recorded observation, no difference or percentage is calculated.');
  } else if (finding.baselineText === 'No baseline') {
    parts.push(
      'This self-reported entry has no personal baseline, so no difference or percentage is calculated.',
    );
  } else if (finding.baseline === null || finding.baselineText === 'Not available') {
    parts.push('The personal baseline is unavailable, so no difference or percentage is calculated.');
  } else {
    parts.push(baselineSentence(finding));
    if (finding.baseline === 0) {
      parts.push('The baseline is zero, so a percentage difference is undefined.');
    } else if (finding.change !== null && Number.isFinite(finding.change)) {
      const magnitude = spokenValue(Math.abs(finding.change), finding.decimals);
      const unit = spokenUnit(finding.unit);
      if (finding.change === 0) {
        parts.push('The recorded value matches the baseline exactly.');
      } else {
        const direction = finding.change > 0 ? 'above' : 'below';
        parts.push(`The difference is ${magnitude} ${unit}, ${direction} the baseline.`);
      }
      if (finding.percentChange !== null && Number.isFinite(finding.percentChange)) {
        parts.push(
          `That is a percentage difference of ${spokenPercent(Math.abs(finding.percentChange))} percent.`,
        );
      } else {
        parts.push('The stored percentage difference is unavailable.');
      }
    } else {
      parts.push('The difference is not calculated in the stored comparison.');
    }
  }

  parts.push(`The prototype review rule is ${thresholdPercent} percent. ${finding.calculation.note}`);
  parts.push(
    isUnavailableText(finding.recordedAtText) || finding.recordedAtText === 'Recorded time unavailable'
      ? 'The recorded time is unavailable.'
      : `The observation was recorded at ${finding.recordedAtText}.`,
  );
  if (finding.stale && finding.staleNote) parts.push(finding.staleNote);
  parts.push('The baseline is fictional fixture data for this prototype and is synthetic.');

  return {
    sourceId: `calculation-${finding.key}`,
    label: `${finding.label} calculation`,
    text: parts.join(' '),
  };
}

export function buildKnowledgeRequest(card: KnowledgeCard, section: KnowledgeSection): VoiceRequest {
  const parts = [card.title + '.'];
  if (section === 'quick') {
    parts.push(card.summary);
  } else if (section === 'simple') {
    parts.push('Simple explanation.', card.plainLanguageBody);
    if (card.example) parts.push(`For example: ${card.example}`);
  } else {
    parts.push('Learn more.', card.extendedExplanation);
    parts.push(
      'This card is educational context. It does not establish a cause, a diagnosis or an individual medical decision.',
    );
  }
  return {
    sourceId: `knowledge-${card.id}-${section}`,
    label: card.title,
    text: parts.join(' '),
  };
}

export const BODY_MAP_SPEECH = {
  region:
    'Where do you feel discomfort? Select the area on the body illustration, or choose the area from the word list. Left and right are separate selections. This records what you feel; it is not a diagnosis.',
  symptom:
    'Describe the symptom, choose a type, and set how intense it feels. Your private note is not read aloud.',
  intensity:
    'Choose how intense the symptom feels. This records your description and does not classify severity.',
} as const;

export function buildBodyMapRequest(kind: keyof typeof BODY_MAP_SPEECH): VoiceRequest {
  return {
    sourceId: `body-map-${kind}`,
    label: 'Body map instructions',
    text: BODY_MAP_SPEECH[kind],
  };
}

export function buildReplaySummaryRequest(frame: ReplayFrame): VoiceRequest {
  const parts = [
    `Historical observation from ${frame.recordedAtText}${frame.flightDay !== null ? `, flight day ${frame.flightDay}` : ''}.`,
  ];
  const recorded = frame.metrics.filter((metric) => metric.state === 'observed' && metric.value !== null);
  const earlier = frame.metrics.filter((metric) => metric.state === 'last-available' && metric.value !== null);
  if (recorded.length > 0) {
    parts.push(
      `Recorded in this observation: ${recorded
        .map((metric) => `${metric.label}, ${spokenValue(metric.value as number, metric.decimals)} ${spokenUnit(metric.unit)}`)
        .join('; ')}.`,
    );
  } else {
    parts.push('This observation has no measured values.');
  }
  if (earlier.length > 0) {
    parts.push(
      `Carried forward from earlier observations: ${earlier
        .map((metric) => `${metric.label}, ${spokenValue(metric.value as number, metric.decimals)} ${spokenUnit(metric.unit)}`)
        .join('; ')}. These values are not part of this observation.`,
    );
  }
  parts.push(
    `${frame.assessment.summaryTitle}. ${frame.assessment.summaryBody} This is a historical comparison, not a medical diagnosis and not live telemetry. ${frame.provenance.syntheticLabel === 'Synthetic data' ? 'The data is synthetic.' : frame.provenance.syntheticLabel + '.'}`,
  );
  return {
    sourceId: `replay-${frame.id}`,
    label: 'Historical summary',
    text: parts.join(' '),
  };
}
