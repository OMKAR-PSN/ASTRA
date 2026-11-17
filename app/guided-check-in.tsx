import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigation, useRouter } from 'expo-router';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import { ArrowLeft, ArrowRight, CircleCheck, Clock3, ClipboardEdit, Database, HeartPulse, Info, Moon, ShieldCheck, Smile, Sparkles, Thermometer, X } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { AccessibilityInfo, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions, type ViewStyle } from 'react-native';

import { DurationStepper } from '@/components/DurationStepper';
import { GuidedMoodChoices } from '@/components/GuidedMoodChoices';
import { NumericField } from '@/components/NumericField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScaleSelector } from '@/components/ScaleSelector';
import { ScreenContainer } from '@/components/ScreenContainer';
import { StatusPill } from '@/components/StatusPill';
import { StepProgress } from '@/components/StepProgress';
import { Surface } from '@/components/Surface';
import { SymptomBodyMap } from '@/components/SymptomBodyMap';
import { SymptomChecklist } from '@/components/SymptomChecklist';
import { SymptomSummary } from '@/components/SymptomSummary';
import { colors, fonts, layout, radius, stitch, type as typography } from '@/constants/theme';
import { symptomOptions } from '@/fixtures/checkInOptions';
import { crewProfile } from '@/fixtures/crew';
import { draftFromForm, emptyFormValues, formHasInput, type CheckInFormValues, type NumericKey } from '@/lib/checkInForm';
import { DIFFERENCE_THRESHOLD_PERCENT } from '@/lib/comparison';
import { deriveRoutineProgress, evaluateMilestones } from '@/lib/engagement';
import { setFormHandoff, takeFormHandoff } from '@/lib/formHandoff';
import { formatTimestamp } from '@/lib/format';
import { symptomSummaryText } from '@/lib/symptoms';
import {
  adjustSleepHours,
  guidedStepMeta,
  guidedStepOrder,
  moodChoiceForValue,
  moodChoices,
  moodValueFor,
  numericErrorsForStep,
  stressAnchors,
  type GuidedStepId,
  type MoodChoiceId,
} from '@/lib/guidedCheckIn';
import { parseNumericReadings, validateDraft, type DraftErrors } from '@/lib/validation';
import { usePresentation } from '@/state/PresentationSession';
import { useSession } from '@/state/SessionProvider';
import type { CheckIn } from '@/types/astra';

type Phase = 'welcome' | GuidedStepId | 'saved';
type Tone = 'ok' | 'missing' | 'error' | 'info';
type ReviewEntry = { label: string; value: string; status: string; tone: Tone };

const missionName = crewProfile.missionName.replace(' (simulated)', '');
const firstName = crewProfile.name.split(' ')[0];

const stepIcons: Record<GuidedStepId, LucideIcon> = {
  wellbeing: Smile,
  sleep: Moon,
  vitals: HeartPulse,
  symptoms: ClipboardEdit,
  review: ShieldCheck,
};

const stepIntros: Record<GuidedStepId, string> = {
  wellbeing: 'Choose what fits today. These answers use the same 1–5 scale as the detailed form.',
  sleep: 'Approximate hours slept last night. Leave it blank if you did not measure it.',
  vitals: 'Enter only what you measured. Blank fields are recorded as not measured.',
  symptoms: 'Select anything that applies and add brief context if it helps.',
  review: 'Check each entry. Nothing is saved until you press Save check-in.',
};

const numericLabels: Record<NumericKey, { label: string; unit: string; decimals: number }> = {
  heartRateBpm: { label: 'Heart rate', unit: 'bpm', decimals: 0 },
  systolicMmHg: { label: 'Systolic pressure', unit: 'mmHg', decimals: 0 },
  diastolicMmHg: { label: 'Diastolic pressure', unit: 'mmHg', decimals: 0 },
  temperatureC: { label: 'Body temperature', unit: '°C', decimals: 1 },
  sleepHours: { label: 'Sleep duration', unit: 'hours', decimals: 1 },
};

function StatusText({ tone, children }: { tone: Tone; children: string }) {
  const color = tone === 'ok' ? colors.success[400] : tone === 'error' ? colors.error[400] : tone === 'info' ? colors.primary[300] : colors.slate[400];
  return <Text style={[styles.statusText, { color }]}>{children}</Text>;
}

function Callout({ Icon, children }: { Icon: LucideIcon; children: string }) {
  return (
    <View style={styles.callout}>
      <Icon size={15} color={colors.secondary[400]} strokeWidth={2} />
      <Text style={styles.calloutText}>{children}</Text>
    </View>
  );
}

function ReviewGroup({ title, step, entries, onEdit }: { title: string; step: GuidedStepId; entries: ReviewEntry[]; onEdit: (step: GuidedStepId) => void }) {
  return (
    <View style={styles.reviewGroup}>
      <View style={styles.reviewGroupHead}>
        <Text accessibilityRole="header" style={styles.reviewGroupTitle}>{title}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Edit ${title}`}
          onPress={() => onEdit(step)}
          style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [styles.editButton, (hovered || pressed) && styles.editButtonHover]}
        >
          <Text style={styles.editLabel}>Edit</Text>
        </Pressable>
      </View>
      {entries.map((entry) => (
        <View key={entry.label} style={styles.reviewRow}>
          <View style={styles.reviewRowCopy}>
            <Text style={styles.reviewLabel}>{entry.label}</Text>
            <Text style={styles.reviewValue}>{entry.value}</Text>
          </View>
          <StatusText tone={entry.tone}>{entry.status}</StatusText>
        </View>
      ))}
    </View>
  );
}

export default function GuidedCheckInScreen() {
  const router = useRouter();
  const navigation = useNavigation() as unknown as NavigationProp<ParamListBase>;
  const { width } = useWindowDimensions();
  const desktop = width >= layout.desktopBreakpoint;
  const narrow = width < 820;
  const { saveCheckIn, checkIns, latestCheckIn, engagement } = useSession();
  const presentation = usePresentation();

  const [initial] = useState(() => takeFormHandoff());
  const [values, setValues] = useState<CheckInFormValues>(() => initial ?? emptyFormValues());
  const [moodChoice, setMoodChoice] = useState<MoodChoiceId | null>(() => moodChoiceForValue(initial?.subjective.mood ?? null));
  const [phase, setPhase] = useState<Phase>('welcome');
  const [errors, setErrors] = useState<DraftErrors>({});
  const [stepMessage, setStepMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedRecord, setSavedRecord] = useState<CheckIn | null>(null);
  const [reviewNow, setReviewNow] = useState(() => new Date().toISOString());
  const [exitOpen, setExitOpen] = useState(false);
  const [bodyMapOpen, setBodyMapOpen] = useState(false);
  const [wordListHint, setWordListHint] = useState(false);

  const newMilestones = useMemo(() => {
    if (!savedRecord) return [];
    const previous = checkIns.filter((item) => item.id !== savedRecord.id);
    const before = new Set(evaluateMilestones(previous, engagement).filter((item) => item.unlocked).map((item) => item.id));
    return evaluateMilestones(checkIns, engagement).filter((item) => item.unlocked && !before.has(item.id));
  }, [checkIns, engagement, savedRecord]);
  const routineComplete = savedRecord ? deriveRoutineProgress(checkIns, Date.parse(savedRecord.recordedAt)).complete : false;

  const pendingAction = useRef<(() => void) | null>(null);
  const bypassLeave = useRef(false);
  const saveLock = useRef(false);
  const dirty = formHasInput(values) || moodChoice !== null;
  const hasSaved = savedRecord !== null;

  useEffect(() => {
    return navigation.addListener('beforeRemove', (event) => {
      if (!dirty || hasSaved || bypassLeave.current) return;
      event.preventDefault();
      pendingAction.current = () => navigation.dispatch(event.data.action);
      setExitOpen(true);
    });
  }, [navigation, dirty, hasSaved]);

  const leaveWith = useCallback((action: () => void) => {
    bypassLeave.current = true;
    action();
    setTimeout(() => { bypassLeave.current = false; }, 1000);
  }, []);

  const clearError = (field: keyof DraftErrors) => {
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const clearMessages = () => {
    setStepMessage(null);
    setSaveError(null);
  };

  const updateText = (key: NumericKey, text: string) => {
    setValues((current) => ({ ...current, texts: { ...current.texts, [key]: text } }));
    clearError(key);
    clearMessages();
  };

  const chooseMood = (choice: MoodChoiceId) => {
    setMoodChoice(choice);
    setValues((current) => ({ ...current, subjective: { ...current.subjective, mood: moodValueFor(choice) } }));
    clearError('mood');
    clearMessages();
  };

  const chooseStress = (stress: number | null) => {
    setValues((current) => ({ ...current, subjective: { ...current.subjective, stress } }));
    clearError('stress');
    clearMessages();
  };

  const toggleSymptoms = (next: string[]) => {
    setValues((current) => ({
      ...current,
      symptoms: next,
      symptomStatus: next.length > 0 || current.symptomEntries.length > 0 ? 'reported' : 'not-answered',
    }));
    clearMessages();
  };

  const updateSymptomEntries = (next: CheckInFormValues['symptomEntries']) => {
    setValues((current) => ({
      ...current,
      symptomEntries: next,
      symptomStatus: next.length > 0 || current.symptoms.length > 0
        ? 'reported'
        : current.symptomStatus === 'none' ? 'none' : 'not-answered',
    }));
    clearMessages();
  };

  const reportNoSymptoms = () => {
    setValues((current) => ({ ...current, symptoms: [], symptomEntries: [], symptomStatus: 'none' }));
    setWordListHint(false);
    clearMessages();
    AccessibilityInfo.announceForAccessibility('No symptoms reported for this check-in.');
  };

  const describeInWords = () => {
    setWordListHint(true);
    AccessibilityInfo.announceForAccessibility('Use the word list below to describe symptoms.');
  };

  const updateNote = (text: string) => {
    setValues((current) => ({ ...current, activityNote: text }));
    clearMessages();
  };

  const goTo = (next: GuidedStepId) => {
    if (next === 'review') setReviewNow(new Date().toISOString());
    setPhase(next);
    setErrors({});
    setStepMessage(null);
    setSaveError(null);
  };

  const back = () => {
    if (phase === 'welcome' || phase === 'saved') return;
    const index = guidedStepOrder.indexOf(phase);
    setErrors({});
    setStepMessage(null);
    setSaveError(null);
    setPhase(index <= 0 ? 'welcome' : guidedStepOrder[index - 1]);
  };

  const advance = () => {
    if (phase === 'welcome') { goTo('wellbeing'); return; }
    if (phase === 'saved') return;
    if (phase === 'review') { void save(); return; }
    if (phase === 'wellbeing') {
      const next: DraftErrors = {};
      if (moodChoice === null) next.mood = 'Choose how you feel to continue.';
      if (values.subjective.stress === null) next.stress = 'Choose a stress level from 1 to 5 to continue.';
      if (Object.keys(next).length > 0) {
        setErrors(next);
        setStepMessage('Answer both questions before continuing.');
        return;
      }
    }
    if (phase === 'sleep' || phase === 'vitals') {
      const next = numericErrorsForStep(phase, values.texts);
      if (Object.keys(next).length > 0) {
        setErrors(next);
        setStepMessage('Fix the highlighted value before continuing.');
        return;
      }
    }
    goTo(guidedStepOrder[guidedStepOrder.indexOf(phase) + 1]);
  };

  const save = async () => {
    if (saveLock.current || savedRecord !== null) return;
    saveLock.current = true;
    setSaving(true);
    setSaveError(null);
    const draft = draftFromForm(values);
    const result = validateDraft(draft, values.texts);
    if (!result.ok) {
      const onlyGlobalRule = Object.keys(result.errors).length === 1 && result.errors.heartRateBpm === 'Enter at least one reading or load the demo readings.';
      setErrors(onlyGlobalRule ? {} : result.errors);
      setSaveError('This check-in cannot be saved yet. Add at least one measurement or self-report, then save again.');
      AccessibilityInfo.announceForAccessibility('Check-in needs attention before saving.');
      saveLock.current = false;
      setSaving(false);
      return;
    }
    try {
      const record = await saveCheckIn({
        readings: result.readings,
        symptoms: draft.symptoms,
        symptomEntries: draft.symptomEntries,
        symptomStatus: draft.symptomStatus,
        activityNote: draft.activityNote,
      });
      setErrors({});
      setSavedRecord(record);
      setPhase('saved');
      AccessibilityInfo.announceForAccessibility('Check-in saved.');
    } catch {
      setSaveError('Check-in could not be saved. Nothing was transmitted. Retry to confirm your changes.');
      AccessibilityInfo.announceForAccessibility('Check-in could not be saved.');
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  };

  const openDetailed = () => {
    setFormHandoff(values);
    leaveWith(() => router.replace('/check-in'));
  };

  const finishAt = (route: '/' | '/dashboard' | '/assessment' | '/journey') => {
    leaveWith(() => router.replace(route));
  };

  const requestExit = () => {
    if (!dirty || savedRecord) { leaveWith(() => router.replace('/')); return; }
    pendingAction.current = null;
    setExitOpen(true);
  };

  const keepEditing = () => {
    pendingAction.current = null;
    setExitOpen(false);
  };

  const discard = () => {
    const action = pendingAction.current;
    pendingAction.current = null;
    setExitOpen(false);
    if (action) leaveWith(action);
    else leaveWith(() => router.replace('/'));
  };

  const demo = presentation.active;
  const storedRecords = checkIns.length;
  const stepIndex = phase !== 'welcome' && phase !== 'saved' ? guidedStepOrder.indexOf(phase) : -1;
  const meta = stepIndex >= 0 ? guidedStepMeta[guidedStepOrder[stepIndex]] : null;
  const StepIcon = stepIndex >= 0 ? stepIcons[guidedStepOrder[stepIndex]] : null;

  const liveNumericErrors = parseNumericReadings(values.texts).errors;
  const hasAnyReading = values.subjective.mood !== null
    || values.subjective.stress !== null
    || Object.values(values.texts).some((text) => text.trim() !== '' && Number.isFinite(Number(text)));
  const reviewIssues = [
    ...Object.entries(liveNumericErrors).map(([field, message]) => `${numericLabels[field as NumericKey].label}: ${message}`),
    ...(hasAnyReading ? [] : ['Missing required: add at least one measurement or self-report before saving.']),
  ];

  const numericEntry = (field: NumericKey): ReviewEntry => {
    const text = values.texts[field].trim();
    const error = liveNumericErrors[field];
    const { label, unit, decimals } = numericLabels[field];
    const numeric = Number(text);
    return {
      label,
      value: text === '' ? 'Not measured' : Number.isFinite(numeric) ? `${numeric.toFixed(decimals)} ${unit}` : text,
      status: error ? 'Needs correction' : text === '' ? 'Not measured' : 'Entered',
      tone: error ? 'error' : text === '' ? 'missing' : 'ok',
    };
  };

  const moodLabel = moodChoices.find((choice) => choice.id === moodChoice)?.label ?? 'Not answered';
  const stress = values.subjective.stress;
  const hasSymptomInput = values.symptoms.length > 0 || values.symptomEntries.length > 0;
  const symptomEntry: ReviewEntry = {
    label: 'Symptoms',
    value: hasSymptomInput
      ? symptomSummaryText({ symptoms: values.symptoms, symptomEntries: values.symptomEntries, symptomStatus: values.symptomStatus })
      : values.symptomStatus === 'none' ? 'No symptoms reported' : 'Not answered',
    status: hasSymptomInput ? 'Entered' : values.symptomStatus === 'none' ? 'No symptoms reported' : 'Not answered',
    tone: hasSymptomInput ? 'ok' : values.symptomStatus === 'none' ? 'info' : 'missing',
  };
  const moodEntry: ReviewEntry = {
    label: 'Mood',
    value: values.subjective.mood === null ? 'Not measured' : `${values.subjective.mood} of 5`,
    status: moodLabel,
    tone: moodChoice === null ? 'missing' : 'ok',
  };
  const stressEntry: ReviewEntry = {
    label: 'Stress',
    value: stress === null ? 'Not answered' : `${stress} of 5 · ${stressAnchors[stress - 1]}`,
    status: stress === null ? 'Not answered' : 'Entered',
    tone: stress === null ? 'missing' : 'ok',
  };

  return (
    <ScreenContainer title="Guided health check-in" hideHeading scrollToTopKey={phase}>
      <View style={[styles.shell, desktop && styles.shellDesktop]}>
        <View style={[styles.mainColumn, desktop && styles.mainColumnDesktop]}>
          {phase !== 'saved' ? (
            <View style={styles.topBar}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Exit check-in"
                onPress={requestExit}
                style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [styles.topAction, (hovered || pressed) && styles.topActionHover]}
              >
                <X size={16} color={colors.slate[300]} strokeWidth={2.2} />
                <Text style={styles.topActionLabel}>Exit</Text>
              </Pressable>
              <Pressable
                accessibilityRole="link"
                accessibilityLabel="Open detailed check-in form"
                onPress={openDetailed}
                style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [styles.topAction, (hovered || pressed) && styles.topActionHover]}
              >
                <Text style={styles.topActionLabel}>Detailed form</Text>
                <ArrowRight size={15} color={colors.primary[300]} strokeWidth={2} />
              </Pressable>
            </View>
          ) : null}

          {phase === 'welcome' ? (
            <Surface variant="glass" tone="panel" style={styles.welcomeCard}>
              <View style={styles.eyebrowRow}>
                <View style={styles.liveDot} />
                <Text style={styles.eyebrow}>DAILY HEALTH CHECK · MANUAL ENTRY</Text>
              </View>
              <Text accessibilityRole="header" style={[styles.greeting, !desktop && styles.greetingMobile]}>Good morning, {firstName}.</Text>
              <Text style={styles.welcomeTitle}>Ready for your daily health check?</Text>
              <Text style={styles.welcomeBody}>A few simple questions will help you record how you&apos;re feeling.</Text>

              <View style={styles.identityRow}>
                <View style={styles.identityCell}>
                  <Text style={styles.identityLabel}>CREW</Text>
                  <Text style={styles.identityValue}>{crewProfile.name}</Text>
                  <Text style={styles.identityMeta}>{crewProfile.role}</Text>
                </View>
                <View style={styles.identityCell}>
                  <Text style={styles.identityLabel}>MISSION</Text>
                  <Text style={styles.identityValue}>{missionName}</Text>
                  <Text style={styles.identityMeta}>Simulated transit</Text>
                </View>
                <View style={styles.identityCell}>
                  <Text style={styles.identityLabel}>FLIGHT DAY</Text>
                  <Text style={styles.identityValue}>Day {crewProfile.missionDay}</Text>
                  <Text style={styles.identityMeta}>Fictional crew</Text>
                </View>
              </View>

              <View style={styles.lastRow}>
                <Clock3 size={14} color={colors.secondary[400]} strokeWidth={2} />
                <Text style={styles.lastText}>
                  Last check-in · {latestCheckIn ? formatTimestamp(latestCheckIn.recordedAt) : 'None recorded yet'}
                </Text>
                <Text style={styles.lastMeta}>{storedRecords} saved</Text>
              </View>

              <View style={styles.badgeRow}>
                <StatusPill label={demo ? 'Synthetic demo · session only' : 'Synthetic prototype · local device'} tone="primary" />
                <StatusPill label="No live sensor feed" tone="neutral" />
              </View>
              <Text style={styles.modeText}>
                {demo
                  ? 'Demo crew records are kept in this session and cleared when the demo ends. Saved device records are unchanged.'
                  : 'Records are written to this device only. Nothing is transmitted when you save.'}
              </Text>

              <Text style={styles.durationNote}>About 60 seconds · 5 short steps · review everything before saving</Text>

              <View style={styles.welcomeActions}>
                <PrimaryButton label="Start Check-In" Icon={ArrowRight} onPress={() => goTo('wellbeing')} style={styles.actionButton} />
                <PrimaryButton variant="secondary" label="Use Detailed Form" onPress={openDetailed} style={styles.actionButton} />
              </View>
            </Surface>
          ) : null}

          {meta && StepIcon && phase !== 'saved' ? (
            <Surface variant="glass" tone="panel" style={styles.stepCard}>
              <StepProgress current={stepIndex + 1} total={guidedStepOrder.length} label={meta.progressLabel} />
              <View style={styles.stepHead}>
                <View style={styles.stepIcon}><StepIcon size={17} color={colors.primary[300]} strokeWidth={2.2} /></View>
                <View style={styles.stepHeadCopy}>
                  <Text accessibilityRole="header" accessibilityLiveRegion="polite" style={styles.stepTitle}>{meta.title}</Text>
                  <Text style={styles.stepIntro}>{stepIntros[guidedStepOrder[stepIndex]]}</Text>
                </View>
              </View>

              {stepMessage ? <Text accessibilityRole="alert" style={styles.alert}>{stepMessage}</Text> : null}
              {saveError && phase === 'review' ? <Text accessibilityRole="alert" style={styles.alert}>{saveError}</Text> : null}
              {phase === 'review' && reviewIssues.length > 0 ? (
                <View accessibilityRole="alert" style={styles.alert}>
                  {reviewIssues.map((issue) => (
                    <Text key={issue} style={styles.alertText}>{issue}</Text>
                  ))}
                </View>
              ) : null}

              {phase === 'wellbeing' ? (
                <View style={styles.stepBody}>
                  <View style={styles.question}>
                    <Text style={styles.questionLabel}>MOOD</Text>
                    <GuidedMoodChoices value={moodChoice} error={errors.mood} onChange={chooseMood} />
                  </View>
                  <View style={styles.question}>
                    <View style={styles.scaleRow}>
                      <ScaleSelector
                        label="Stress"
                        hint="1 is calm, 5 is very high. Tap a number again to clear."
                        anchors={stressAnchors}
                        value={values.subjective.stress}
                        error={errors.stress}
                        onChange={chooseStress}
                      />
                    </View>
                  </View>
                  <Callout Icon={Info}>Mood and stress are self-reported. They do not use a sensor or a clinical scale.</Callout>
                </View>
              ) : null}

              {phase === 'sleep' ? (
                <View style={styles.stepBody}>
                  <DurationStepper
                    label="Sleep duration"
                    unit="hours"
                    hint="30-minute steps. Leave blank if you did not measure it. 0.5 hours = 30 minutes."
                    value={values.texts.sleepHours}
                    error={errors.sleepHours}
                    onChangeText={(text) => updateText('sleepHours', text)}
                    onStep={(direction) => updateText('sleepHours', adjustSleepHours(values.texts.sleepHours, direction))}
                    onClear={() => updateText('sleepHours', '')}
                  />
                  <Callout Icon={Moon}>Sleep is self-reported. No wristband or bed sensor is connected.</Callout>
                </View>
              ) : null}

              {phase === 'vitals' ? (
                <View style={styles.stepBody}>
                  <NumericField
                    label="Heart rate"
                    unit="bpm"
                    hint="Resting beats per minute · 20 to 250."
                    value={values.texts.heartRateBpm}
                    error={errors.heartRateBpm}
                    onChangeText={(text) => updateText('heartRateBpm', text)}
                    onClear={() => updateText('heartRateBpm', '')}
                  />
                  <View style={[styles.fieldRow, narrow && styles.fieldStack]}>
                    <View style={styles.fieldFlex}>
                      <NumericField
                        label="Systolic pressure"
                        unit="mmHg"
                        hint="Top number · 60 to 250."
                        value={values.texts.systolicMmHg}
                        error={errors.systolicMmHg}
                        onChangeText={(text) => updateText('systolicMmHg', text)}
                        onClear={() => updateText('systolicMmHg', '')}
                      />
                    </View>
                    <View style={styles.fieldFlex}>
                      <NumericField
                        label="Diastolic pressure"
                        unit="mmHg"
                        hint="Bottom number · 30 to 150."
                        value={values.texts.diastolicMmHg}
                        error={errors.diastolicMmHg}
                        onChangeText={(text) => updateText('diastolicMmHg', text)}
                        onClear={() => updateText('diastolicMmHg', '')}
                      />
                    </View>
                  </View>
                  <NumericField
                    label="Body temperature"
                    unit="°C"
                    hint="Degrees Celsius · 30 to 43."
                    value={values.texts.temperatureC}
                    error={errors.temperatureC}
                    onChangeText={(text) => updateText('temperatureC', text)}
                    onClear={() => updateText('temperatureC', '')}
                  />
                  <Callout Icon={Thermometer}>Manual entry only. This prototype has no live sensor feed.</Callout>
                </View>
              ) : null}

              {phase === 'symptoms' ? (
                <View style={styles.stepBody}>
                  <View style={styles.bodyMapPrompt}>
                    <Text style={styles.questionLabel}>WHERE DO YOU FEEL DISCOMFORT?</Text>
                    <Text style={styles.bodyMapText}>
                      Open the body map, describe symptoms with the word list, or explicitly report no symptoms. The illustration is optional.
                    </Text>
                    <View style={styles.symptomActionRow}>
                      <PrimaryButton label="Open Body Map" onPress={() => setBodyMapOpen(true)} style={styles.symptomActionButton} />
                      <PrimaryButton variant="secondary" label="Describe in Words" onPress={describeInWords} style={styles.symptomActionButton} />
                      <PrimaryButton variant="secondary" label="No Symptoms to Report" onPress={reportNoSymptoms} style={styles.symptomActionButton} />
                    </View>
                    {wordListHint ? (
                      <Text accessibilityLiveRegion="polite" style={styles.wordListHint}>The word list below is ready. Select anything that applies.</Text>
                    ) : null}
                    {values.symptomEntries.length > 0 ? (
                      <View style={styles.selectedSymptoms}>
                        <Text style={styles.questionLabel}>SELECTED ON BODY MAP</Text>
                        <SymptomSummary
                          symptoms={[]}
                          entries={values.symptomEntries}
                          status={values.symptomStatus}
                          compact
                        />
                        <Text style={styles.bodyMapFootnote}>Reopen the body map to edit or remove an entry.</Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.question}>
                    <Text style={styles.questionLabel}>DESCRIBE IN WORDS</Text>
                    <SymptomChecklist
                      options={symptomOptions}
                      selected={values.symptoms}
                      noneSelected={values.symptomStatus === 'none'}
                      onChange={toggleSymptoms}
                      onNoneSelected={reportNoSymptoms}
                    />
                  </View>
                  <View style={styles.question}>
                    <View style={styles.noteHead}>
                      <Text style={styles.questionLabel}>ACTIVITY CONTEXT · OPTIONAL</Text>
                      <Text style={styles.noteCount}>{values.activityNote.length} / 280</Text>
                    </View>
                    <TextInput
                      accessibilityLabel="Activity note"
                      value={values.activityNote}
                      onChangeText={updateNote}
                      placeholder="For example: light exercise, rest, or an EVA"
                      placeholderTextColor={colors.slate[500]}
                      multiline
                      maxLength={280}
                      style={styles.note}
                    />
                  </View>
                  <Callout Icon={ShieldCheck}>
                    Symptoms are recorded without an urgency rating. If anything concerns you, follow your crew&apos;s approved mission procedures and contact the flight surgeon.
                  </Callout>
                </View>
              ) : null}

              {phase === 'review' ? (
                <View style={styles.stepBody}>
                  <ReviewGroup title="Mood & stress" step="wellbeing" entries={[moodEntry, stressEntry]} onEdit={goTo} />
                  <ReviewGroup title="Sleep" step="sleep" entries={[numericEntry('sleepHours')]} onEdit={goTo} />
                  <ReviewGroup
                    title="Health measurements"
                    step="vitals"
                    entries={['heartRateBpm', 'systolicMmHg', 'diastolicMmHg', 'temperatureC'].map((field) => numericEntry(field as NumericKey))}
                    onEdit={goTo}
                  />
                  <ReviewGroup
                    title="Symptoms & activity"
                    step="symptoms"
                    entries={[
                      symptomEntry,
                      {
                        label: 'Activity context',
                        value: values.activityNote.trim() === '' ? 'Not provided' : values.activityNote.trim(),
                        status: values.activityNote.trim() === '' ? 'Optional' : 'Entered',
                        tone: values.activityNote.trim() === '' ? 'missing' : 'ok',
                      },
                    ]}
                    onEdit={goTo}
                  />

                  <View style={styles.recordGroup}>
                    <Text accessibilityRole="header" style={styles.reviewGroupTitle}>Record</Text>
                    <View style={styles.reviewRow}>
                      <View style={styles.reviewRowCopy}>
                        <Text style={styles.reviewLabel}>Source</Text>
                        <Text style={styles.reviewValue}>Manual entry · {demo ? 'demo session' : 'local device'}</Text>
                      </View>
                      <StatusText tone="info">{demo ? 'Demo session' : 'Local device'}</StatusText>
                    </View>
                    <View style={styles.reviewRow}>
                      <View style={styles.reviewRowCopy}>
                        <Text style={styles.reviewLabel}>Timestamp</Text>
                        <Text style={styles.reviewValue}>Set when you save · now {formatTimestamp(reviewNow)}</Text>
                      </View>
                      <StatusText tone="info">At save</StatusText>
                    </View>
                    <View style={styles.reviewRow}>
                      <View style={styles.reviewRowCopy}>
                        <Text style={styles.reviewLabel}>Storage</Text>
                        <Text style={styles.reviewValue}>
                          {demo ? 'Demo session · cleared when the session ends' : 'This device · remains after reload'}
                        </Text>
                      </View>
                      <StatusText tone="info">{demo ? 'Session only' : 'Offline'}</StatusText>
                    </View>
                  </View>

                  <Text style={styles.reviewNote}>
                    Saving adds one check-in. Comparisons with the synthetic baseline and the {DIFFERENCE_THRESHOLD_PERCENT}% review rule run after saving. No report is queued or sent.
                  </Text>
                </View>
              ) : null}

              <View style={styles.stepActions}>
                <PrimaryButton variant="secondary" label="Back" Icon={ArrowLeft} onPress={back} style={styles.actionButton} />
                <PrimaryButton
                  label={phase === 'review' ? (saving ? 'Saving check-in…' : 'Save check-in') : 'Continue'}
                  Icon={phase === 'review' ? undefined : ArrowRight}
                  disabled={saving}
                  onPress={advance}
                  style={styles.actionButton}
                />
              </View>
              {phase === 'review' ? (
                <Pressable accessibilityRole="link" accessibilityLabel="Open detailed form with these answers" onPress={openDetailed} style={styles.detailedLink}>
                  <Text style={styles.detailedLinkLabel}>Open detailed form instead</Text>
                  <ArrowRight size={14} color={colors.primary[300]} strokeWidth={2} />
                </Pressable>
              ) : null}
            </Surface>
          ) : null}

          {phase === 'saved' && savedRecord ? (
            <Surface variant="glass" tone="panel" style={styles.savedCard}>
              <View style={styles.savedIcon}><CircleCheck size={34} color={colors.primary[300]} strokeWidth={1.8} /></View>
              <Text accessibilityRole="header" accessibilityLiveRegion="polite" style={styles.savedTitle}>Check-in saved.</Text>
              <Text style={styles.savedBody}>
                {demo ? 'Your observations are available in this demo session.' : 'Your observations are available in your local health record.'}
              </Text>
              <View style={styles.savedMetaRow}>
                <StatusPill label={`Saved · ${savedRecord.id}`} tone="success" />
                <View style={styles.savedTime}>
                  <Clock3 size={13} color={colors.slate[400]} strokeWidth={2} />
                  <Text style={styles.savedTimeText}>{formatTimestamp(savedRecord.recordedAt)}</Text>
                </View>
              </View>
              <Text style={styles.savedMode}>
                {demo
                  ? 'Saved in this demo session. Demo records are cleared when the session ends.'
                  : 'Saved on this device. It remains available after reload and without a network connection.'}
              </Text>

              <View style={styles.savedSymptoms}>
                <Text style={styles.savedSymptomsLabel}>SYMPTOMS · SELF-REPORTED</Text>
                <SymptomSummary
                  symptoms={savedRecord.symptoms}
                  entries={savedRecord.symptomEntries}
                  status={savedRecord.symptomStatus}
                  showTimestamps
                />
              </View>

              <View style={styles.savedJourney}>
                <View style={styles.savedJourneyIcon}><Sparkles size={16} color={colors.primary[300]} strokeWidth={2} /></View>
                <View style={styles.savedJourneyCopy}>
                  <Text accessibilityLiveRegion="polite" style={styles.savedJourneyTitle}>
                    {routineComplete ? "Today's health routine is complete." : 'This check-in was added to your mission record.'}
                  </Text>
                  {newMilestones.length > 0 ? newMilestones.map((milestone) => (
                    <Text key={milestone.id} style={styles.savedMilestone}>
                      {`Milestone earned · ${milestone.title}. ${milestone.description}`}
                    </Text>
                  )) : <Text style={styles.savedJourneyText}>Milestones recognize check-in days and optional learning only. They never reflect health values or affect your assessment.</Text>}
                </View>
              </View>

              <View style={styles.savedGrid}>
                {[
                  { label: 'Heart rate', value: savedRecord.readings.heartRateBpm === null ? null : `${savedRecord.readings.heartRateBpm} bpm` },
                  { label: 'Blood pressure', value: savedRecord.readings.systolicMmHg === null && savedRecord.readings.diastolicMmHg === null ? null : `${savedRecord.readings.systolicMmHg ?? '—'}/${savedRecord.readings.diastolicMmHg ?? '—'} mmHg` },
                  { label: 'Temperature', value: savedRecord.readings.temperatureC === null ? null : `${savedRecord.readings.temperatureC} °C` },
                  { label: 'Sleep', value: savedRecord.readings.sleepHours === null ? null : `${savedRecord.readings.sleepHours} hours` },
                  { label: 'Mood', value: savedRecord.readings.mood === null ? null : `${savedRecord.readings.mood} of 5` },
                  { label: 'Stress', value: savedRecord.readings.stress === null ? null : `${savedRecord.readings.stress} of 5` },
                ].filter((item) => item.value !== null).map((item) => (
                  <View key={item.label} style={styles.savedCell}>
                    <Text style={styles.savedCellLabel}>{item.label}</Text>
                    <Text style={styles.savedCellValue}>{item.value}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.savedActions}>
                <PrimaryButton label="View Health Overview" onPress={() => finishAt('/dashboard')} style={styles.actionButton} />
                <PrimaryButton variant="secondary" label="View Assessment" onPress={() => finishAt('/assessment')} style={styles.actionButton} />
                <PrimaryButton variant="secondary" label="View Mission Journey" onPress={() => finishAt('/journey')} style={styles.actionButton} />
                <PrimaryButton variant="secondary" label="Finish" onPress={() => finishAt('/')} style={styles.actionButton} />
              </View>
              <Text style={styles.savedNote}>No report was queued or sent. You can create one from Assessment when you choose.</Text>
            </Surface>
          ) : null}
        </View>

        {desktop && phase !== 'saved' ? (
          <View style={styles.sideColumn}>
            <Surface variant="glass" tone="panel" style={styles.sidePanel}>
              <View style={styles.sideHead}>
                <Database size={15} color={colors.secondary[400]} strokeWidth={2.2} />
                <Text style={styles.sideLabel}>SESSION</Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Record mode</Text>
                <Text style={styles.dataValue}>{demo ? 'Demo session' : 'Local device'}</Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Saved records</Text>
                <Text style={styles.dataValue}>{storedRecords}</Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Last check-in</Text>
                <Text style={styles.dataValue} numberOfLines={1}>{latestCheckIn ? formatTimestamp(latestCheckIn.recordedAt) : 'None yet'}</Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Storage</Text>
                <Text style={styles.dataValue}>{demo ? 'Session only' : 'Offline · browser IndexedDB'}</Text>
              </View>
            </Surface>

            <Surface variant="glass" tone="panel" style={styles.sidePanel}>
              <View style={styles.sideHead}>
                <ShieldCheck size={15} color={colors.secondary[400]} strokeWidth={2.2} />
                <Text style={styles.sideLabel}>WHEN YOU SAVE</Text>
              </View>
              {[
                demo ? 'The check-in is added to this demo session.' : 'The check-in is written to this device.',
                'Nothing is transmitted. Reports are confirmed separately.',
                `Comparisons use the synthetic baseline and ${DIFFERENCE_THRESHOLD_PERCENT}% review rule.`,
              ].map((item, index) => (
                <View key={item} style={styles.guideItem}>
                  <Text style={styles.guideIndex}>{String(index + 1).padStart(2, '0')}</Text>
                  <Text style={styles.guideText}>{item}</Text>
                </View>
              ))}
              <Text style={styles.sideNote}>Synthetic prototype for mission-simulation evaluation. Not medical advice.</Text>
            </Surface>
          </View>
        ) : null}
      </View>

      <Modal visible={exitOpen} transparent animationType="none" onRequestClose={keepEditing}>
        <View style={styles.modalBackdrop}>
          <View accessibilityViewIsModal>
            <Surface tone="panel" style={styles.modalCard}>
              <Text accessibilityRole="header" style={styles.modalTitle}>Discard this check-in?</Text>
              <Text style={styles.modalBody}>Your answers have not been saved. Leaving now will discard them.</Text>
              <View style={styles.modalActions}>
                <PrimaryButton variant="secondary" label="Keep editing" onPress={keepEditing} style={styles.actionButton} />
                <PrimaryButton label="Discard & exit" onPress={discard} style={styles.actionButton} />
              </View>
            </Surface>
          </View>
        </View>
      </Modal>

      <SymptomBodyMap
        visible={bodyMapOpen}
        entries={values.symptomEntries}
        onChange={updateSymptomEntries}
        onClose={() => setBodyMapOpen(false)}
        onNoSymptoms={reportNoSymptoms}
      />
    </ScreenContainer>
  );
}

const webPointer = Platform.OS === 'web' ? ({ cursor: 'pointer' } as ViewStyle) : {};

const styles = StyleSheet.create({
  shell: { gap: 20 },
  shellDesktop: { flexDirection: 'row', alignItems: 'flex-start', gap: 22 },
  mainColumn: { minWidth: 0, gap: 12 },
  mainColumnDesktop: { flex: 1.65 },
  sideColumn: { flex: 1, minWidth: 280, gap: 16 },

  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  topAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    ...webPointer,
  },
  topActionHover: { backgroundColor: 'rgba(255, 255, 255, 0.07)' },
  topActionLabel: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 17, color: colors.slate[300] },

  welcomeCard: { padding: 20, gap: 12, borderColor: 'rgba(80, 222, 216, 0.18)' },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary[400],
    ...(Platform.OS === 'web' ? { boxShadow: '0 0 8px rgba(80, 222, 216, 0.75)' } as ViewStyle : {}),
  },
  eyebrow: { ...typography.labelWide, color: colors.primary[300], flexShrink: 1 },
  greeting: { ...typography.hero, color: colors.offWhite },
  greetingMobile: typography.heroMobile,
  welcomeTitle: { fontFamily: fonts.semibold, fontSize: 23, lineHeight: 30, letterSpacing: -0.3, color: colors.offWhite },
  welcomeBody: { ...typography.body, color: colors.slate[300], maxWidth: 640 },

  identityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  identityCell: {
    flexBasis: 150,
    flexGrow: 1,
    minWidth: 0,
    gap: 2,
    padding: 12,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(40, 60, 80, 0.75)',
    backgroundColor: 'rgba(4, 19, 34, 0.72)',
  },
  identityLabel: { fontFamily: fonts.mono, fontSize: 8.5, lineHeight: 12, letterSpacing: 0.7, color: colors.slate[500] },
  identityValue: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 21, color: colors.offWhite },
  identityMeta: { ...typography.meta, fontSize: 10.5, lineHeight: 15, color: colors.slate[400] },

  lastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(40, 60, 80, 0.75)',
    backgroundColor: 'rgba(9, 29, 42, 0.62)',
  },
  lastText: { ...typography.bodySmall, fontSize: 12, lineHeight: 17, color: colors.slate[200], flexShrink: 1 },
  lastMeta: { fontFamily: fonts.mono, fontSize: 9, lineHeight: 13, color: colors.slate[500], marginLeft: 'auto' },

  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  modeText: { ...typography.meta, color: colors.slate[400], maxWidth: 720 },
  durationNote: { fontFamily: fonts.mono, fontSize: 10, lineHeight: 15, color: colors.slate[500] },
  welcomeActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 2 },

  stepCard: { padding: 20, gap: 14, borderColor: 'rgba(80, 222, 216, 0.18)' },
  stepHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 11 },
  stepIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(80, 222, 216, 0.24)',
    backgroundColor: stitch.cyanMuted,
    flexShrink: 0,
  },
  stepHeadCopy: { flex: 1, minWidth: 0, gap: 3 },
  stepTitle: { fontFamily: fonts.semibold, fontSize: 24, lineHeight: 31, letterSpacing: -0.3, color: colors.offWhite },
  stepIntro: { ...typography.bodySmall, color: colors.slate[300] },
  stepBody: { gap: 18 },
  question: { gap: 8 },
  questionLabel: { ...typography.label, color: colors.slate[200] },
  scaleRow: { flexDirection: 'row' },

  alert: {
    gap: 4,
    padding: 11,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(242, 143, 151, 0.35)',
    backgroundColor: stitch.redMuted,
  },
  alertText: { fontFamily: fonts.semibold, fontSize: 12.5, lineHeight: 18, color: colors.error[400] },

  callout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    padding: 11,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(40, 60, 80, 0.8)',
    backgroundColor: 'rgba(4, 19, 34, 0.6)',
  },
  calloutText: { ...typography.meta, color: colors.slate[400], flex: 1, minWidth: 0 },

  fieldRow: { flexDirection: 'row', gap: 12 },
  fieldStack: { flexDirection: 'column' },
  fieldFlex: { flex: 1, minWidth: 0 },

  noteHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  noteCount: { fontFamily: fonts.mono, fontSize: 9, lineHeight: 13, color: colors.slate[500] },
  note: {
    minHeight: 96,
    padding: 12,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(40, 60, 80, 0.9)',
    backgroundColor: stitch.panelDeep,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.offWhite,
    textAlignVertical: 'top',
  },

  reviewGroup: {
    gap: 2,
    padding: 12,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(40, 60, 80, 0.75)',
    backgroundColor: 'rgba(4, 19, 34, 0.55)',
  },
  reviewGroupHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingBottom: 6 },
  reviewGroupTitle: { ...typography.label, color: colors.primary[300] },
  editButton: { minHeight: 32, justifyContent: 'center', paddingHorizontal: 8, borderRadius: 6 },
  editButtonHover: { backgroundColor: 'rgba(255, 255, 255, 0.07)' },
  editLabel: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 16, color: colors.primary[300] },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(40, 60, 80, 0.5)',
  },
  reviewRowCopy: { flex: 1, minWidth: 0, gap: 1 },
  reviewLabel: { ...typography.meta, fontSize: 10.5, lineHeight: 15, color: colors.slate[500] },
  reviewValue: { fontFamily: fonts.regular, fontSize: 14.5, lineHeight: 21, color: colors.offWhite },
  statusText: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 16, flexShrink: 0, textAlign: 'right' },
  recordGroup: {
    gap: 2,
    padding: 12,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(0, 214, 198, 0.2)',
    backgroundColor: 'rgba(0, 214, 198, 0.05)',
  },
  reviewNote: { ...typography.meta, color: colors.slate[500] },

  stepActions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10, marginTop: 2 },
  actionButton: { flexGrow: 1, minWidth: 148 },
  detailedLink: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 44, paddingHorizontal: 2 },
  detailedLinkLabel: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 17, color: colors.primary[300] },

  savedCard: { padding: 24, gap: 14, alignItems: 'flex-start', borderColor: 'rgba(80, 222, 216, 0.22)' },
  savedIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 214, 198, 0.35)',
    backgroundColor: stitch.cyanMuted,
  },
  savedTitle: { ...typography.headline, color: colors.offWhite },
  savedBody: { ...typography.body, color: colors.slate[300], maxWidth: 640 },
  savedMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  savedTime: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  savedTimeText: { fontFamily: fonts.mono, fontSize: 10, lineHeight: 15, color: colors.slate[400] },
  savedMode: { ...typography.bodySmall, color: colors.slate[300], maxWidth: 720 },
  savedJourney: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, alignSelf: 'stretch', padding: 12, borderRadius: radius.sm, borderWidth: 1, borderColor: 'rgba(0, 214, 198, 0.26)', backgroundColor: 'rgba(0, 214, 198, 0.07)' },
  savedJourneyIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(0, 214, 198, 0.24)', backgroundColor: stitch.cyanMuted, flexShrink: 0 },
  savedJourneyCopy: { flex: 1, minWidth: 0, gap: 3 },
  savedJourneyTitle: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 19, color: colors.offWhite },
  savedMilestone: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 18, color: colors.success[400] },
  savedJourneyText: { ...typography.meta, fontSize: 10.5, lineHeight: 15, color: colors.slate[400] },
  savedSymptoms: { alignSelf: 'stretch', gap: 7, padding: 12, borderRadius: radius.sm, borderWidth: 1, borderColor: stitch.glassBorder, backgroundColor: 'rgba(4, 16, 28, 0.46)' },
  savedSymptomsLabel: { ...typography.label, color: colors.slate[400] },
  savedGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignSelf: 'stretch' },
  savedCell: {
    flexBasis: 130,
    flexGrow: 1,
    minWidth: 0,
    gap: 2,
    paddingVertical: 9,
    paddingHorizontal: 11,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(40, 60, 80, 0.75)',
    backgroundColor: 'rgba(4, 19, 34, 0.7)',
  },
  savedCellLabel: { ...typography.meta, fontSize: 10, lineHeight: 14, color: colors.slate[500] },
  savedCellValue: { fontFamily: fonts.mono, fontSize: 17, lineHeight: 23, color: colors.offWhite, fontVariant: ['tabular-nums'] },
  savedActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignSelf: 'stretch' },
  savedNote: { ...typography.meta, color: colors.slate[500] },

  sidePanel: { padding: 16, gap: 10, borderColor: 'rgba(141, 187, 255, 0.14)' },
  sideHead: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  sideLabel: { ...typography.label, color: colors.slate[300] },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(9, 29, 42, 0.62)',
    borderWidth: 1,
    borderColor: 'rgba(40, 60, 80, 0.75)',
  },
  dataLabel: { ...typography.bodySmall, fontSize: 12, lineHeight: 17, color: colors.slate[200], flexShrink: 1 },
  dataValue: { fontFamily: fonts.mono, fontSize: 9.5, lineHeight: 14, color: colors.offWhite, fontVariant: ['tabular-nums'], flexShrink: 1, textAlign: 'right' },
  guideItem: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  guideIndex: { fontFamily: fonts.mono, fontSize: 10, lineHeight: 18, color: colors.primary[400], letterSpacing: 0.4 },
  guideText: { ...typography.bodySmall, color: colors.slate[300], flex: 1, minWidth: 0 },
  sideNote: { ...typography.meta, fontSize: 10, lineHeight: 15, color: colors.slate[500] },

  bodyMapPrompt: { gap: 10, padding: 13, borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(0, 214, 198, 0.26)', backgroundColor: 'rgba(0, 214, 198, 0.055)' },
  bodyMapText: { ...typography.bodySmall, color: colors.slate[300] },
  symptomActionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  symptomActionButton: { flexBasis: 170, flexGrow: 1 },
  wordListHint: { ...typography.meta, color: colors.primary[300] },
  selectedSymptoms: { gap: 7 },
  bodyMapFootnote: { ...typography.meta, color: colors.slate[500] },

  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(1, 6, 12, 0.78)',
  },
  modalCard: { width: '100%', maxWidth: 460, padding: 20, gap: 12 },
  modalTitle: { fontFamily: fonts.semibold, fontSize: 21, lineHeight: 28, color: colors.offWhite },
  modalBody: { ...typography.body, color: colors.slate[300] },
  modalActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'flex-end' },
});
