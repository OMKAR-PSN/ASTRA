import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { Platform, StyleSheet, Text, TextInput, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Activity, ClipboardList, Database, FileText, Info, Moon, ShieldCheck, Smile, Sparkles, Thermometer } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

import { NumericField } from '@/components/NumericField';
import { KnowledgeLink } from '@/components/KnowledgeLink';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScaleSelector } from '@/components/ScaleSelector';
import { ScreenContainer } from '@/components/ScreenContainer';
import { StatusPill } from '@/components/StatusPill';
import { Surface } from '@/components/Surface';
import { SymptomBodyMap } from '@/components/SymptomBodyMap';
import { SymptomChecklist } from '@/components/SymptomChecklist';
import { SymptomSummary } from '@/components/SymptomSummary';
import { colors, fonts, layout, radius, stitch, type as typography } from '@/constants/theme';
import { demoReadings, symptomOptions } from '@/fixtures/checkInOptions';
import { crewProfile } from '@/fixtures/crew';
import { draftFromForm, emptyNumericTexts, emptySubjective, textsFrom, type NumericKey, type NumericTexts } from '@/lib/checkInForm';
import { DIFFERENCE_THRESHOLD_PERCENT } from '@/lib/comparison';
import { deriveRoutineProgress, evaluateMilestones } from '@/lib/engagement';
import { formatTimestamp } from '@/lib/format';
import { setFormHandoff, takeFormHandoff } from '@/lib/formHandoff';
import { validateDraft, type DraftErrors } from '@/lib/validation';
import { useSession } from '@/state/SessionProvider';
import type { Readings, SymptomEntry, SymptomStatus } from '@/types/astra';

const guidance = [
  'Manual entries only — this prototype has no live sensor feed.',
  'Leave unmeasured fields empty; partial check-ins are saved exactly as recorded.',
  'Baseline comparisons run after saving, against the local synthetic baseline.',
];

function Section({ Icon, title, badge, style, children }: { Icon: LucideIcon; title: string; badge?: string; style?: StyleProp<ViewStyle>; children: ReactNode }) {
  return (
    <Surface tone="panel" style={[styles.section, style]}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <View style={styles.sectionIcon}><Icon size={15} color={colors.primary[300]} strokeWidth={2.2} /></View>
          <Text accessibilityRole="header" style={styles.sectionTitle}>{title}</Text>
        </View>
        {badge ? <Text style={styles.badge}>{badge}</Text> : null}
      </View>
      {children}
    </Surface>
  );
}

export default function CheckInScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const desktop = width >= layout.desktopBreakpoint;
  const narrow = width < 820;
  const { saveCheckIn, checkIns, latestCheckIn, engagement } = useSession();

  const [texts, setTexts] = useState<NumericTexts>(() => ({ ...emptyNumericTexts }));
  const [scales, setScales] = useState<Pick<Readings, 'mood' | 'stress'>>(() => ({ ...emptySubjective }));
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [symptomEntries, setSymptomEntries] = useState<SymptomEntry[]>([]);
  const [symptomStatus, setSymptomStatus] = useState<SymptomStatus>('not-answered');
  const [bodyMapOpen, setBodyMapOpen] = useState(false);
  const [activityNote, setActivityNote] = useState('');
  const [errors, setErrors] = useState<DraftErrors>({});
  const [saved, setSaved] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const newMilestones = useMemo(() => {
    if (!saved || !latestCheckIn) return [];
    const previous = checkIns.filter((item) => item.id !== latestCheckIn.id);
    const before = new Set(evaluateMilestones(previous, engagement).filter((item) => item.unlocked).map((item) => item.id));
    return evaluateMilestones(checkIns, engagement).filter((item) => item.unlocked && !before.has(item.id));
  }, [checkIns, engagement, saved, latestCheckIn]);
  const routineComplete = saved && latestCheckIn ? deriveRoutineProgress(checkIns, Date.parse(latestCheckIn.recordedAt)).complete : false;

  useFocusEffect(useCallback(() => {
    const handoff = takeFormHandoff();
    if (!handoff) return;
    setTexts(handoff.texts);
    setScales(handoff.subjective);
    setSymptoms(handoff.symptoms);
    setSymptomEntries(handoff.symptomEntries);
    setSymptomStatus(handoff.symptomStatus);
    setActivityNote(handoff.activityNote);
    setErrors({});
    setSaved(false);
    setSavedAt(null);
    setSaveError(null);
  }, []));

  const updateText = (key: NumericKey, value: string) => {
    setTexts((current) => ({ ...current, [key]: value }));
    setSaved(false);
  };

  const loadDemo = () => {
    setTexts(textsFrom(demoReadings));
    setScales({ mood: demoReadings.mood, stress: demoReadings.stress });
    setSymptoms(['Trouble sleeping']);
    setSymptomEntries([]);
    setSymptomStatus('reported');
    setActivityNote('Light walk in the habitat corridor');
    setErrors({});
    setSaved(false);
  };

  const updateSymptoms = (next: string[]) => {
    setSymptoms(next);
    setSymptomStatus(next.length > 0 || symptomEntries.length > 0 ? 'reported' : 'not-answered');
    setSaved(false);
  };

  const updateSymptomEntries = (next: SymptomEntry[]) => {
    setSymptomEntries(next);
    setSymptomStatus(next.length > 0 || symptoms.length > 0
      ? 'reported'
      : symptomStatus === 'none' ? 'none' : 'not-answered');
    setSaved(false);
  };

  const reportNoSymptoms = () => {
    setSymptoms([]);
    setSymptomEntries([]);
    setSymptomStatus('none');
    setSaved(false);
  };

  const save = async () => {
    const draft = draftFromForm({ texts, subjective: scales, symptoms, symptomEntries, symptomStatus, activityNote });
    const result = validateDraft(draft, texts);
    if (!result.ok) {
      setErrors(result.errors);
      setSaved(false);
      return;
    }
    setErrors({});
    setSaveError(null);
    setSaving(true);
    try {
      await saveCheckIn({
        readings: result.readings,
        symptoms: draft.symptoms,
        symptomEntries: draft.symptomEntries,
        symptomStatus: draft.symptomStatus,
        activityNote: draft.activityNote,
      });
      setSavedAt(new Date().toISOString().slice(11, 16));
      setSaved(true);
    } catch {
      setSaved(false);
      setSaveError('Check-in could not be saved. Retry to confirm your changes.');
    } finally {
      setSaving(false);
    }
  };

  const openGuided = () => {
    setFormHandoff({ texts, subjective: scales, symptoms, symptomEntries, symptomStatus, activityNote });
    router.push('/guided-check-in');
  };

  return (
    <ScreenContainer title="Health check-in" hideHeading>
      <View style={[styles.hero, !desktop && styles.heroMobile]}>
        <View style={styles.heroCopy}>
          <View style={styles.eyebrowRow}>
            <View style={styles.liveDot} />
            <Text style={styles.eyebrow}>DAILY HEALTH CHECK-IN · MANUAL OBSERVATIONS</Text>
          </View>
          <Text accessibilityRole="header" style={[styles.heroTitle, !desktop && styles.heroTitleMobile]}>Health check-in</Text>
          <Text style={styles.heroSubtitle}>Record today&apos;s observations for this fictional mission · Flight Day {crewProfile.missionDay}. Nothing is prefilled; leave unmeasured fields empty.</Text>
        </View>
        <View style={styles.heroActions}>
          <View style={styles.localChip}>
            <Database size={13} color={colors.secondary[400]} strokeWidth={2} />
            <Text style={styles.localChipLabel}>Local-only save</Text>
          </View>
          <PrimaryButton variant="secondary" label="Guided check-in" onPress={openGuided} />
          <PrimaryButton variant="secondary" label="Load demo readings" onPress={loadDemo} />
        </View>
      </View>

      <View style={[styles.workspace, desktop && styles.workspaceDesktop]}>
        <View style={styles.formColumn}>
          <Section Icon={Activity} title="Heart and blood pressure" badge="MANUAL ENTRY">
            <NumericField
              label="Heart rate"
              unit="bpm"
              hint="Beats per minute, 20 to 250."
              value={texts.heartRateBpm}
              error={errors.heartRateBpm}
              onChangeText={(value) => updateText('heartRateBpm', value)}
            />
            <View style={[styles.fieldRow, narrow && styles.fieldStack]}>
              <View style={styles.fieldFlex}>
                <NumericField
                  label="Systolic pressure"
                  unit="mmHg"
                  hint="Top number, 60 to 250."
                  value={texts.systolicMmHg}
                  error={errors.systolicMmHg}
                  onChangeText={(value) => updateText('systolicMmHg', value)}
                />
              </View>
              <View style={styles.fieldFlex}>
                <NumericField
                  label="Diastolic pressure"
                  unit="mmHg"
                  hint="Bottom number, 30 to 150."
                  value={texts.diastolicMmHg}
                  error={errors.diastolicMmHg}
                  onChangeText={(value) => updateText('diastolicMmHg', value)}
                />
              </View>
            </View>
          </Section>

          <View style={[styles.row, narrow && styles.rowStack]}>
            <Section Icon={Thermometer} title="Temperature" badge="TYMPANIC" style={styles.half}>
              <NumericField
                label="Body temperature"
                unit="°C"
                hint="Degrees Celsius, 30 to 43."
                value={texts.temperatureC}
                error={errors.temperatureC}
                onChangeText={(value) => updateText('temperatureC', value)}
              />
            </Section>
            <Section Icon={Moon} title="Rest" badge="SELF-REPORTED" style={styles.half}>
              <NumericField
                label="Sleep duration"
                unit="hours"
                hint="Hours slept last night, 0 to 24."
                value={texts.sleepHours}
                error={errors.sleepHours}
                onChangeText={(value) => updateText('sleepHours', value)}
              />
              <KnowledgeLink cardId="sleep-duration" label="Why do we record sleep?" />
            </Section>
          </View>

          <Section Icon={Smile} title="Wellbeing and subjective indicators" badge="1–5 SCALE">
            <View style={[styles.scaleRow, narrow && styles.rowStack]}>
              <ScaleSelector
                label="Mood"
                hint="1 is lowest, 5 is highest. Tap again to clear."
                value={scales.mood}
                error={errors.mood}
                onChange={(mood) => {
                  setScales((current) => ({ ...current, mood }));
                  setSaved(false);
                }}
              />
              <ScaleSelector
                label="Stress"
                hint="1 is lowest, 5 is highest. Tap again to clear."
                value={scales.stress}
                error={errors.stress}
                onChange={(stress) => {
                  setScales((current) => ({ ...current, stress }));
                  setSaved(false);
                }}
              />
            </View>
          </Section>

          <Section Icon={ClipboardList} title="Symptoms" badge="SELF-REPORTED · OPTIONAL">
            <Text style={styles.hint}>Describe what you notice on the body map, select words below, or choose None. This is not a diagnosis.</Text>
            <PrimaryButton
              variant="secondary"
              label={symptomEntries.length > 0 ? 'Edit Symptoms on Body Map' : 'Describe Symptoms on Body Map'}
              onPress={() => setBodyMapOpen(true)}
            />
            {symptomEntries.length > 0 ? (
              <View style={styles.selectedSymptoms}>
                <Text style={styles.selectedSymptomsLabel}>SELECTED ON BODY MAP</Text>
                <SymptomSummary symptoms={[]} entries={symptomEntries} status="reported" />
              </View>
            ) : null}
            <SymptomChecklist
              options={symptomOptions}
              selected={symptoms}
              onChange={updateSymptoms}
              noneSelected={symptomStatus === 'none'}
              onNoneSelected={reportNoSymptoms}
            />
            <KnowledgeLink cardId="symptom-reporting" label="How symptom reporting works" />
          </Section>

          <Section Icon={FileText} title="Activity note" badge="OPTIONAL · 280 MAX">
            <TextInput
              accessibilityLabel="Activity note"
              value={activityNote}
              onChangeText={(value) => {
                setActivityNote(value);
                setSaved(false);
              }}
              placeholder="For example: walked 20 minutes on the treadmill"
              placeholderTextColor={colors.slate[500]}
              multiline
              maxLength={280}
              style={styles.note}
            />
          </Section>

          {Object.keys(errors).length > 0 ? (
            <Text accessibilityRole="alert" style={styles.formError}>Fix the highlighted fields before saving.</Text>
          ) : null}
          {saveError ? <Text accessibilityRole="alert" style={styles.formError}>{saveError}</Text> : null}

          <Surface tone="panel" style={styles.saveCard}>
            <View style={styles.saveCopy}>
              <Text style={styles.saveTitle}>{saved ? 'Check-in saved locally' : 'Ready to save'}</Text>
              <Text style={styles.saveMeta}>
                {saved && savedAt
                  ? `Stored on this device at ${savedAt} UTC. Nothing is transmitted until you confirm a report.`
                  : 'Saving stores this observation on this device. Nothing is transmitted by saving alone.'}
              </Text>
            </View>
            {saved ? (
              <View style={styles.saveJourney}>
                <Sparkles size={15} color={colors.primary[300]} strokeWidth={2} />
                <View style={styles.saveJourneyCopy}>
                  <Text accessibilityLiveRegion="polite" style={styles.saveJourneyTitle}>
                    {routineComplete ? "Today's health routine is complete." : 'This check-in was added to your mission record.'}
                  </Text>
                  {newMilestones.length > 0 ? newMilestones.map((milestone) => (
                    <Text key={milestone.id} style={styles.saveMilestone}>{`Milestone earned · ${milestone.title}. ${milestone.description}`}</Text>
                  )) : <Text style={styles.saveJourneyText}>Milestones recognize check-in days and optional learning only. They never reflect reading values.</Text>}
                </View>
              </View>
            ) : null}
            <View style={styles.saveActions}>
              {saved && savedAt ? <StatusPill label={`Saved locally · ${savedAt} UTC`} tone="success" /> : null}
              {saved ? <PrimaryButton variant="secondary" label="View dashboard" onPress={() => router.navigate('/dashboard')} /> : null}
              {saved ? <PrimaryButton variant="secondary" label="View assessment" onPress={() => router.navigate('/assessment')} /> : null}
              {saved ? <PrimaryButton variant="secondary" label="View mission journey" onPress={() => router.navigate('/journey')} /> : null}
              <PrimaryButton label={saving ? 'Saving check-in…' : 'Save demo check-in'} disabled={saving} onPress={save} />
            </View>
          </Surface>
        </View>

        <View style={styles.sideColumn}>
          <Surface variant="glass" tone="panel" style={styles.sidePanel}>
            <View style={styles.sideHeader}>
              <View style={styles.sideTitleRow}><ShieldCheck size={15} color={colors.secondary[400]} strokeWidth={2.2} /><Text style={styles.sideLabel}>OBSERVATION GUIDANCE</Text></View>
              <Text style={styles.sideTag}>SYNTHETIC</Text>
            </View>
            {guidance.map((item, index) => (
              <View key={item} style={styles.guideItem}>
                <Text style={styles.guideIndex}>{String(index + 1).padStart(2, '0')}</Text>
                <Text style={styles.guideText}>{item}</Text>
              </View>
            ))}
            <View style={styles.notice}>
              <Text style={styles.noticeText}>Synthetic prototype built for mission-simulation evaluation. Not medical advice.</Text>
            </View>
          </Surface>

          <Surface tone="panel" style={styles.sidePanel}>
            <View style={styles.sideHeader}>
              <View style={styles.sideTitleRow}><Database size={15} color={colors.secondary[400]} strokeWidth={2.2} /><Text style={styles.sideLabel}>LOCAL SESSION</Text></View>
              <StatusPill label="Offline OK" tone="success" />
            </View>
            <View style={styles.dataList}>
              <View style={styles.dataRow}><Text style={styles.dataLabel}>Saved check-ins</Text><Text style={styles.dataValue}>{checkIns.length}</Text></View>
              <View style={styles.dataRow}><Text style={styles.dataLabel}>Latest local save</Text><Text style={styles.dataValue} numberOfLines={1}>{latestCheckIn ? formatTimestamp(latestCheckIn.recordedAt) : 'None yet'}</Text></View>
              <View style={styles.dataRow}><Text style={styles.dataLabel}>Mission day</Text><Text style={styles.dataValue}>Day {crewProfile.missionDay}</Text></View>
            </View>
          </Surface>

          <Surface tone="panel" style={styles.sidePanel}>
            <View style={styles.sideHeader}>
              <View style={styles.sideTitleRow}><Info size={15} color={colors.secondary[400]} strokeWidth={2.2} /><Text style={styles.sideLabel}>REVIEW PROTOCOL</Text></View>
              <Text style={styles.sideTag}>{DIFFERENCE_THRESHOLD_PERCENT}% RULE</Text>
            </View>
            <Text style={styles.protocolBody}>
              Readings at or beyond {DIFFERENCE_THRESHOLD_PERCENT}% from the synthetic baseline are flagged for review after saving. The demo does not diagnose or recommend treatment.
            </Text>
          </Surface>
        </View>
      </View>

      <SymptomBodyMap
        visible={bodyMapOpen}
        entries={symptomEntries}
        onChange={updateSymptomEntries}
        onClose={() => setBodyMapOpen(false)}
        onNoSymptoms={reportNoSymptoms}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' },
  heroMobile: { flexDirection: 'column', alignItems: 'flex-start', gap: 12 },
  heroCopy: { gap: 5, flexShrink: 1, minWidth: 0 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 7 },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary[400],
    ...(Platform.OS === 'web' ? { boxShadow: '0 0 8px rgba(80, 222, 216, 0.75)' } as ViewStyle : {}),
  },
  eyebrow: { ...typography.labelWide, color: colors.primary[300], flex: 1, minWidth: 0 },
  heroTitle: { ...typography.hero, color: colors.offWhite },
  heroTitleMobile: typography.heroMobile,
  heroSubtitle: { ...typography.body, color: colors.slate[300], maxWidth: 760 },
  heroActions: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  localChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(40, 60, 80, 0.8)',
    backgroundColor: 'rgba(36, 55, 68, 0.42)',
  },
  localChipLabel: { fontFamily: fonts.mono, fontSize: 10, lineHeight: 14, color: colors.slate[300] },

  workspace: { gap: 16 },
  workspaceDesktop: { flexDirection: 'row', alignItems: 'flex-start', gap: 24 },
  formColumn: { flex: 2, minWidth: 0, gap: 16 },
  sideColumn: { flex: 1, minWidth: 280, gap: 16 },

  row: { flexDirection: 'row', gap: 16 },
  rowStack: { flexDirection: 'column' },
  half: { flex: 1, minWidth: 0 },
  fieldRow: { flexDirection: 'row', gap: 12 },
  fieldStack: { flexDirection: 'column' },
  fieldFlex: { flex: 1, minWidth: 0 },
  scaleRow: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },

  section: { padding: 16, gap: 14, borderColor: 'rgba(141, 187, 255, 0.14)' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 9, flexShrink: 1 },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(80, 222, 216, 0.22)',
    backgroundColor: stitch.cyanMuted,
  },
  sectionTitle: { ...typography.cardTitle, color: colors.offWhite, flexShrink: 1 },
  badge: { fontFamily: fonts.mono, fontSize: 8, lineHeight: 12, letterSpacing: 0.7, color: colors.slate[500] },

  hint: { ...typography.meta, color: colors.slate[500] },
  selectedSymptoms: { gap: 7, padding: 12, borderRadius: radius.sm, borderWidth: 1, borderColor: stitch.glassBorder, backgroundColor: 'rgba(4, 16, 28, 0.46)' },
  selectedSymptomsLabel: { ...typography.label, color: colors.slate[400] },
  note: {
    minHeight: 108,
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
  formError: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    lineHeight: 19,
    color: colors.error[400],
    padding: 11,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(242, 123, 130, 0.35)',
    backgroundColor: stitch.redMuted,
  },

  saveCard: { padding: 16, gap: 14, borderColor: 'rgba(80, 222, 216, 0.18)' },
  saveCopy: { gap: 3 },
  saveTitle: { ...typography.cardTitle, color: colors.offWhite },
  saveMeta: { ...typography.meta, color: colors.slate[400] },
  saveJourney: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, padding: 10, borderRadius: radius.sm, borderWidth: 1, borderColor: 'rgba(0, 214, 198, 0.24)', backgroundColor: 'rgba(0, 214, 198, 0.06)' },
  saveJourneyCopy: { flex: 1, minWidth: 0, gap: 3 },
  saveJourneyTitle: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 18, color: colors.offWhite },
  saveMilestone: { fontFamily: fonts.semibold, fontSize: 11.5, lineHeight: 17, color: colors.success[400] },
  saveJourneyText: { ...typography.meta, fontSize: 10.5, lineHeight: 15, color: colors.slate[400] },
  saveActions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', gap: 10 },

  sidePanel: { padding: 16, gap: 12, borderColor: 'rgba(141, 187, 255, 0.14)' },
  sideHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  sideTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7, flexShrink: 1 },
  sideLabel: { ...typography.label, color: colors.slate[300], flexShrink: 1 },
  sideTag: { fontFamily: fonts.mono, fontSize: 8, lineHeight: 12, letterSpacing: 0.6, color: colors.slate[500] },
  guideItem: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  guideIndex: { fontFamily: fonts.mono, fontSize: 10, lineHeight: 18, color: colors.primary[400], letterSpacing: 0.4 },
  guideText: { ...typography.bodySmall, color: colors.slate[300], flex: 1, minWidth: 0 },
  notice: {
    gap: 4,
    padding: 10,
    borderRadius: radius.sm,
    backgroundColor: stitch.panelDeep,
    borderWidth: 1,
    borderColor: 'rgba(40, 60, 80, 0.8)',
  },
  noticeText: { ...typography.meta, color: colors.slate[500] },
  dataList: { gap: 7 },
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
  dataValue: { fontFamily: fonts.mono, fontSize: 10, lineHeight: 15, color: colors.offWhite, fontVariant: ['tabular-nums'], flexShrink: 1, textAlign: 'right' },
  protocolBody: { ...typography.bodySmall, color: colors.slate[300] },
});
