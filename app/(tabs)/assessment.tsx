import { useMemo, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';

import { EmptyState } from '@/components/EmptyState';
import { ExplanationPanel } from '@/components/ExplanationPanel';
import { Panel } from '@/components/Panel';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenContainer } from '@/components/ScreenContainer';
import { StatusPill } from '@/components/StatusPill';
import { colors, fonts } from '@/constants/theme';
import { DIFFERENCE_THRESHOLD_PERCENT } from '@/lib/comparison';
import { formatTimestamp } from '@/lib/format';
import { createReportSnapshot } from '@/lib/snapshot';
import { useSession } from '@/state/SessionProvider';

export default function AssessmentScreen() {
  const router = useRouter();
  const { latestCheckIn } = useSession();
  const [details, setDetails] = useState(false);
  const snapshot = useMemo(() => latestCheckIn ? createReportSnapshot(latestCheckIn) : null, [latestCheckIn]);
  const comparisons = snapshot?.comparisons.filter((item) => item.percentChange !== null) ?? [];
  const review = comparisons.some((item) => Math.abs(item.percentChange!) >= DIFFERENCE_THRESHOLD_PERCENT);
  const label = comparisons.length === 0 ? 'Insufficient data for baseline comparison' : review ? 'Review suggested · Demo rule' : 'Within demo comparison range';

  return (
    <ScreenContainer title="Assessment" subtitle="Trace each finding to its observation and synthetic baseline.">
      {!snapshot || !latestCheckIn ? (
        <Panel><EmptyState title="Assessment pending" body="Save a check-in to review its observations and calculations."
          action={<PrimaryButton label="Start check-in" onPress={() => router.navigate('/check-in')} />} /></Panel>
      ) : (
        <>
          <Panel title="Assessment state">
            <StatusPill label={label} tone={review ? 'accent' : 'neutral'} />
            <Text style={styles.body}>Source {latestCheckIn.id} · {formatTimestamp(latestCheckIn.recordedAt)}</Text>
            <Text style={styles.body}>Manual entry · Synthetic demonstration data</Text>
          </Panel>
          <Panel title="Observation and explanation"><ExplanationPanel explanation={snapshot.explanation} /></Panel>
          <Panel>
            <PrimaryButton label={details ? 'Hide rule details' : 'Show rule details'} variant="secondary" onPress={() => setDetails(!details)} />
            {details ? <>
              <Text style={styles.body}>Rule v1 · Absolute percentage difference of at least {DIFFERENCE_THRESHOLD_PERCENT}% from the synthetic fixture baseline marks a reading for review.</Text>
              <Text style={styles.body}>Baseline source · Fictional individual baseline, fixture v1. Percentage change = (observation − baseline) / baseline × 100.</Text>
              <Text style={styles.body}>The demonstration threshold describes a numerical difference. Clinical urgency and causes cannot be established from this comparison.</Text>
              <Text style={styles.body}>{latestCheckIn.activityNote ? 'Recorded context · ' + latestCheckIn.activityNote : 'Measurement context was not provided.'}</Text>
            </> : null}
          </Panel>
          <PrimaryButton label="Preview report" onPress={() => router.navigate('/report')} />
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 23, color: colors.slate[300] },
});
