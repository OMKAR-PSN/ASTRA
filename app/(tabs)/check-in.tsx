import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Grid, GridItem } from '@/components/Grid';
import { NumericField } from '@/components/NumericField';
import { Panel } from '@/components/Panel';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScaleSelector } from '@/components/ScaleSelector';
import { ScreenContainer } from '@/components/ScreenContainer';
import { StatusPill } from '@/components/StatusPill';
import { SymptomChecklist } from '@/components/SymptomChecklist';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { demoReadings, emptyReadings, symptomOptions } from '@/fixtures/checkInOptions';
import { validateDraft, type DraftErrors } from '@/lib/validation';
import { useSession } from '@/state/SessionProvider';
import type { Readings } from '@/types/astra';

type NumericKey = 'heartRateBpm' | 'systolicMmHg' | 'diastolicMmHg' | 'temperatureC' | 'sleepHours';
type NumericTexts = Record<NumericKey, string>;

const emptyTexts: NumericTexts = {
  heartRateBpm: '',
  systolicMmHg: '',
  diastolicMmHg: '',
  temperatureC: '',
  sleepHours: '',
};

const textsFrom = (readings: Readings): NumericTexts => ({
  heartRateBpm: readings.heartRateBpm?.toString() ?? '',
  systolicMmHg: readings.systolicMmHg?.toString() ?? '',
  diastolicMmHg: readings.diastolicMmHg?.toString() ?? '',
  temperatureC: readings.temperatureC?.toString() ?? '',
  sleepHours: readings.sleepHours?.toString() ?? '',
});

export default function CheckInScreen() {
  const router = useRouter();
  const { saveCheckIn } = useSession();

  const [texts, setTexts] = useState<NumericTexts>(emptyTexts);
  const [scales, setScales] = useState<Pick<Readings, 'mood' | 'stress'>>({ mood: null, stress: null });
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [activityNote, setActivityNote] = useState('');
  const [errors, setErrors] = useState<DraftErrors>({});
  const [saved, setSaved] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const updateText = (key: NumericKey, value: string) => {
    setTexts((current) => ({ ...current, [key]: value }));
    setSaved(false);
  };

  const loadDemo = () => {
    setTexts(textsFrom(demoReadings));
    setScales({ mood: demoReadings.mood, stress: demoReadings.stress });
    setSymptoms(['Trouble sleeping']);
    setActivityNote('Light walk in the habitat corridor');
    setErrors({});
    setSaved(false);
  };

  const save = async () => {
    const readings = { ...emptyReadings, ...scales };
    const result = validateDraft({ readings, symptoms, activityNote }, texts);
    if (!result.ok) {
      setErrors(result.errors);
      setSaved(false);
      return;
    }
    setErrors({});
    setSaveError(null);
    setSaving(true);
    try {
      await saveCheckIn({ readings: result.readings, symptoms, activityNote: activityNote.trim() });
      setSavedAt(new Date().toISOString().slice(11, 16));
      setSaved(true);
    } catch {
      setSaved(false);
      setSaveError('Check-in could not be saved. Retry to confirm your changes.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenContainer
      title="Health check-in"
      subtitle="Record manual observations for this fictional mission. Leave unmeasured fields empty."
    >
      <View style={styles.toolbar}>
        <Text style={styles.hint}>MANUAL OBSERVATIONS · SYNTHETIC DATA</Text>
        <PrimaryButton variant="secondary" label="Load demo readings" onPress={loadDemo} />
      </View>

      <Grid>
        <GridItem>
          <Panel title="Heart and blood pressure">
            <NumericField
              label="Heart rate"
              unit="bpm"
              hint="Beats per minute, 20 to 250."
              value={texts.heartRateBpm}
              error={errors.heartRateBpm}
              onChangeText={(value) => updateText('heartRateBpm', value)}
            />
            <NumericField
              label="Systolic pressure"
              unit="mmHg"
              hint="Top number, 60 to 250."
              value={texts.systolicMmHg}
              error={errors.systolicMmHg}
              onChangeText={(value) => updateText('systolicMmHg', value)}
            />
            <NumericField
              label="Diastolic pressure"
              unit="mmHg"
              hint="Bottom number, 30 to 150."
              value={texts.diastolicMmHg}
              error={errors.diastolicMmHg}
              onChangeText={(value) => updateText('diastolicMmHg', value)}
            />
          </Panel>
        </GridItem>

        <GridItem>
          <Panel title="Temperature and sleep">
            <NumericField
              label="Body temperature"
              unit="°C"
              hint="Degrees Celsius, 30 to 43."
              value={texts.temperatureC}
              error={errors.temperatureC}
              onChangeText={(value) => updateText('temperatureC', value)}
            />
            <NumericField
              label="Sleep duration"
              unit="hours"
              hint="Hours slept last night, 0 to 24."
              value={texts.sleepHours}
              error={errors.sleepHours}
              onChangeText={(value) => updateText('sleepHours', value)}
            />
          </Panel>
        </GridItem>

        <GridItem wide>
          <Panel title="Mood and stress">
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
          </Panel>
        </GridItem>

        <GridItem wide>
          <Panel title="Symptoms">
            <Text style={styles.hint}>Select symptoms or choose None.</Text>
            <SymptomChecklist
              options={symptomOptions}
              selected={symptoms}
              onChange={(next) => {
                setSymptoms(next);
                setSaved(false);
              }}
            />
          </Panel>
        </GridItem>

        <GridItem wide>
          <Panel title="Activity note (optional)">
            <TextInput
              accessibilityLabel="Activity note"
              value={activityNote}
              onChangeText={(value) => {
                setActivityNote(value);
                setSaved(false);
              }}
              placeholder="For example: walked 20 minutes on the treadmill"
              placeholderTextColor={colors.slate[400]}
              multiline
              maxLength={280}
              style={styles.note}
            />
          </Panel>
        </GridItem>
      </Grid>

      {Object.keys(errors).length > 0 ? (
        <Text accessibilityRole="alert" style={styles.formError}>Fix the highlighted fields before saving.</Text>
      ) : null}
      {saveError ? <Text accessibilityRole="alert" style={styles.formError}>{saveError}</Text> : null}

      <View style={styles.footer}>
        {saved ? (
          <View style={styles.savedRow}>
            <StatusPill label={`Check-in saved locally at ${savedAt} UTC`} tone="success" />
            <PrimaryButton
              variant="secondary"
              label="View dashboard"
              onPress={() => router.navigate('/dashboard')}
            />
          </View>
        ) : null}
        <PrimaryButton label={saving ? 'Saving check-in…' : 'Save demo check-in'} disabled={saving} onPress={save} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  hint: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.slate[300],
  },
  note: {
    minHeight: 96,
    padding: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.navy[600],
    backgroundColor: colors.navy[900],
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 24,
    color: colors.offWhite,
    textAlignVertical: 'top',
  },
  formError: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    lineHeight: 20,
    color: colors.error[400],
  },
  footer: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  savedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
