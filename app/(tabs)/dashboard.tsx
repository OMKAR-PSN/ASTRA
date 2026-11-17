import { useMemo } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Activity, BookOpen, ChartNoAxesCombined, Clock3, Database, HeartPulse, Moon, ShieldCheck, Sparkles, Zap } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

import { BodyMap } from '@/components/BodyMap';
import { ComparisonTable } from '@/components/ComparisonTable';
import { EmptyState } from '@/components/EmptyState';
import { ExplanationPanel } from '@/components/ExplanationPanel';
import { KnowledgeLink } from '@/components/KnowledgeLink';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenContainer } from '@/components/ScreenContainer';
import { Surface } from '@/components/Surface';
import { TrendBars } from '@/components/TrendBars';
import { colors, fonts, layout, radius, stitch, type as typography } from '@/constants/theme';
import { crewProfile, syntheticBaseline } from '@/fixtures/crew';
import { DIFFERENCE_THRESHOLD_PERCENT, formatSigned } from '@/lib/comparison';
import { buildJourneySummary } from '@/lib/engagement';
import { formatReadingValue, formatTimestamp } from '@/lib/format';
import { useUtcClock } from '@/hooks/useUtcClock';
import { buildReadingTiles } from '@/lib/readingTiles';
import { createReportSnapshot } from '@/lib/snapshot';
import { useSession } from '@/state/SessionProvider';

const RECENT_LIMIT = 5;

function CardHead({ Icon, title, meta }: { Icon: LucideIcon; title: string; meta?: string }) {
  return (
    <View style={styles.cardHead}>
      <View style={styles.cardTitleRow}>
        <View style={styles.cardIcon}><Icon size={15} color={colors.primary[300]} strokeWidth={2.2} /></View>
        <Text accessibilityRole="header" style={styles.cardTitle}>{title}</Text>
      </View>
      {meta ? <Text style={styles.cardBadge}>{meta}</Text> : null}
    </View>
  );
}

const mean = (values: number[]) => values.length ? values.reduce((total, value) => total + value, 0) / values.length : null;

export default function DashboardScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const desktop = width >= layout.desktopBreakpoint;
  const { latestCheckIn, checkIns, engagement } = useSession();
  const now = useUtcClock();

  const snapshot = useMemo(() => (latestCheckIn ? createReportSnapshot(latestCheckIn) : null), [latestCheckIn]);
  const journey = useMemo(
    () => buildJourneySummary({ checkIns, engagement, referenceTime: now }),
    [checkIns, engagement, now],
  );

  if (!latestCheckIn || !snapshot) {
    return (
      <ScreenContainer title="Health trends" hideHeading>
        <View style={[styles.hero, !desktop && styles.heroMobile]}>
          <View style={styles.heroCopy}>
            <View style={styles.eyebrowRow}><View style={styles.liveDot} /><Text style={styles.eyebrow}>BIOMETRIC SURVEILLANCE · RECORDED OBSERVATIONS</Text></View>
            <Text accessibilityRole="header" style={[styles.heroTitle, !desktop && styles.heroTitleMobile]}>Health trends</Text>
            <Text style={styles.heroSubtitle}>Physiological changes and baseline deviations across this fictional mission transit.</Text>
          </View>
        </View>
        <Surface tone="panel" style={styles.emptyPanel}>
          <EmptyState
            title="No readings to show"
            body="Save a demo check-in to see the latest readings, baseline comparison, and trends."
            action={<PrimaryButton label="Go to Check-in" onPress={() => router.navigate('/check-in')} />}
          />
        </Surface>
      </ScreenContainer>
    );
  }

  const tiles = buildReadingTiles(latestCheckIn.readings, snapshot.comparisons);
  const [hrTile, sysTile, diaTile, tempTile, sleepTile] = tiles;
  const comparisonByLabel = (label: string) => snapshot.comparisons.find((item) => item.label === label);
  const deltaText = (label: string, decimals: number, unit: string) => {
    const comparison = comparisonByLabel(label);
    if (!comparison || comparison.change === null || comparison.percentChange === null) return null;
    return `${formatSigned(comparison.change, decimals)} ${unit} · ${formatSigned(comparison.percentChange, 2)}%`;
  };
  const systolic = comparisonByLabel('Systolic pressure');
  const diastolic = comparisonByLabel('Diastolic pressure');
  const bpMissing = sysTile.status === 'missing' && diaTile.status === 'missing';
  const bpValue = bpMissing ? 'Not recorded' : `${sysTile.status === 'missing' ? '—' : sysTile.value}/${diaTile.status === 'missing' ? '—' : diaTile.value}`;
  const bpDelta = systolic?.change == null || diastolic?.change == null
    ? null
    : `${formatSigned(systolic.change, 0)}/${formatSigned(diastolic.change, 0)} mmHg`;

  const cards = [
    { label: 'Resting heart rate', value: hrTile.value, unit: 'bpm', baseline: `${syntheticBaseline.heartRateBpm} bpm`, delta: deltaText('Heart rate', 0, 'bpm'), review: hrTile.status === 'difference', Icon: HeartPulse },
    { label: 'Blood pressure', value: bpValue, unit: 'mmHg', baseline: `${syntheticBaseline.systolicMmHg}/${syntheticBaseline.diastolicMmHg} mmHg`, delta: bpDelta, review: sysTile.status === 'difference' || diaTile.status === 'difference', Icon: Activity },
    { label: 'Core temperature', value: tempTile.value, unit: '°C', baseline: `${syntheticBaseline.temperatureC} °C`, delta: deltaText('Body temperature', 1, '°C'), review: tempTile.status === 'difference', Icon: Zap },
    { label: 'Sleep duration', value: sleepTile.value, unit: 'hours', baseline: `${syntheticBaseline.sleepHours} h`, delta: deltaText('Sleep', 1, 'h'), review: sleepTile.status === 'difference', Icon: Moon },
  ];

  const hrValues = checkIns.flatMap((item) => item.readings.heartRateBpm === null ? [] : [item.readings.heartRateBpm]);
  const sleepValues = checkIns.flatMap((item) => item.readings.sleepHours === null ? [] : [item.readings.sleepHours]);
  const hrMean = mean(hrValues);
  const peak = hrValues.length ? hrValues.reduce((best, value) => Math.abs(value - syntheticBaseline.heartRateBpm) > Math.abs(best - syntheticBaseline.heartRateBpm) ? value : best, hrValues[0]) : null;
  const completeness = checkIns.length ? Math.round(hrValues.length / checkIns.length * 100) : null;
  const recent = [...checkIns].reverse().slice(0, RECENT_LIMIT);

  const chartStats = [
    { label: 'Current reading', value: formatReadingValue(latestCheckIn.readings.heartRateBpm, 'bpm', 0) },
    { label: 'Recorded mean', value: hrMean === null ? 'Not recorded' : `${hrMean.toFixed(0)} bpm` },
    { label: 'Peak deviation', value: peak === null ? 'Not recorded' : `${formatSigned(peak - syntheticBaseline.heartRateBpm, 0)} bpm` },
    { label: 'Data completeness', value: completeness === null ? '—' : `${completeness}% · ${hrValues.length}/${checkIns.length}` },
  ];

  return (
    <ScreenContainer title="Health trends" hideHeading>
      <View style={[styles.hero, !desktop && styles.heroMobile]}>
        <View style={styles.heroCopy}>
          <View style={styles.eyebrowRow}><View style={styles.liveDot} /><Text style={styles.eyebrow}>BIOMETRIC SURVEILLANCE · RECORDED OBSERVATIONS</Text></View>
          <Text accessibilityRole="header" style={[styles.heroTitle, !desktop && styles.heroTitleMobile]}>Health trends</Text>
          <Text style={styles.heroSubtitle}>Physiological changes and baseline deviations across this fictional mission transit · Flight Day {crewProfile.missionDay}.</Text>
        </View>
        <View style={styles.heroActions}>
          <View style={styles.latestChip}>
            <Clock3 size={13} color={colors.secondary[400]} strokeWidth={2} />
            <Text style={styles.latestChipLabel}>Latest · {formatTimestamp(latestCheckIn.recordedAt)}</Text>
          </View>
          <PrimaryButton
            variant="secondary"
            label="Mission Health Replay"
            onPress={() => router.navigate('/replay')}
            accessibilityHint="Opens the read-only historical timeline at the latest recorded observation."
          />
          <PrimaryButton
            variant="secondary"
            label="Preview report"
            onPress={() => router.navigate('/report')}
            accessibilityHint="Opens the report preview for the latest check-in. Nothing is sent."
          />
          <PrimaryButton
            variant="secondary"
            label="Knowledge Hub"
            Icon={BookOpen}
            onPress={() => router.navigate('/knowledge')}
            accessibilityHint="Opens the offline Crew Knowledge Hub."
          />
        </View>
      </View>

      <View style={styles.summaryGrid}>
        {cards.map((card) => (
          <Surface key={card.label} tone="panel" style={styles.summaryCard}>
            <View style={styles.summaryHead}>
              <View style={styles.summaryTitleRow}><card.Icon size={13} color={colors.primary[400]} strokeWidth={2.2} /><Text style={styles.summaryLabel}>{card.label}</Text></View>
            </View>
            <View style={styles.summaryValueRow}>
              <Text style={[styles.summaryValue, card.value === 'Not recorded' && styles.summaryMissing]}>{card.value}</Text>
              {card.value === 'Not recorded' ? null : <Text style={styles.summaryUnit}>{card.unit}</Text>}
            </View>
            {card.delta ? <Text style={[styles.summaryDelta, { color: card.review ? colors.accent[400] : colors.success[400] }]}>{`${card.delta}${card.review ? ' · Review' : ''}`}</Text> : <Text style={styles.summaryDeltaMissing}>Not recorded</Text>}
            <View style={styles.summaryFooter}>
              <Text style={styles.summaryMeta}>Baseline</Text>
              <Text style={styles.summaryBaseline}>{card.baseline}</Text>
            </View>
          </Surface>
        ))}
      </View>

      <Surface tone="panel" style={styles.chartCard}>
        <CardHead Icon={ChartNoAxesCombined} title="Physiological trend trajectory" meta={`FD ${crewProfile.missionDay} · SYNTHETIC BASELINE`} />
        <Text style={styles.cardMeta}>Recorded observations against the synthetic baseline and {DIFFERENCE_THRESHOLD_PERCENT}% demo band. Gaps indicate missing readings.</Text>
        <TrendBars title="Heart rate" unit="bpm" decimals={0} baseline={syntheticBaseline.heartRateBpm} checkIns={checkIns} read={(item) => item.readings.heartRateBpm} />
        <KnowledgeLink cardId="personal-baseline" label="What is a personal baseline?" />
        <View style={styles.statStrip}>
          {chartStats.map((stat) => (
            <View key={stat.label} style={styles.statBlock}>
              <Text style={styles.statLabel}>{stat.label}</Text>
              <Text style={styles.statValue}>{stat.value}</Text>
            </View>
          ))}
        </View>
      </Surface>

      {engagement.journeyVisible ? (
        <Surface tone="panel" style={styles.journeyCard}>
          <CardHead Icon={Sparkles} title="Mission Wellness Journey" meta="OPTIONAL · PARTICIPATION ONLY" />
          <View style={[styles.journeyRow, desktop && styles.journeyRowDesktop]}>
            <View style={styles.journeyCopy}>
              <Text style={styles.journeyTitle}>
                {journey.routine.complete ? "Today's health routine is complete." : 'A check-in is available whenever you are ready.'}
              </Text>
              <Text style={styles.journeyText}>{journey.encouragement}</Text>
              <Text style={styles.journeyMeta}>{`${journey.distinctDays} check-in ${journey.distinctDays === 1 ? 'day' : 'days'} · ${journey.unlockedCount} of ${journey.milestones.length} milestones`}</Text>
            </View>
            <PrimaryButton variant="secondary" label="Open Mission Journey" onPress={() => router.navigate('/journey')} />
          </View>
          <Text style={styles.footnote}>Participation milestones never reflect reading values and do not affect this health record.</Text>
        </Surface>
      ) : null}

      <View style={[styles.splitRow, desktop && styles.splitRowDesktop]}>
        <Surface tone="panel" style={[styles.chartCard, desktop && styles.chartWide]}>
          <CardHead Icon={Moon} title="Rest and recovery trajectory" meta={`BASELINE ${syntheticBaseline.sleepHours} H`} />
          <Text style={styles.cardMeta}>Self-reported rest per check-in. Sleep readings are compared to the same {DIFFERENCE_THRESHOLD_PERCENT}% demo rule.</Text>
          <TrendBars title="Sleep" unit="hours" decimals={1} baseline={syntheticBaseline.sleepHours} checkIns={checkIns} read={(item) => item.readings.sleepHours} />
        </Surface>

        <Surface tone="panel" style={styles.panel}>
          <CardHead Icon={Activity} title="Baseline comparison" meta={`${DIFFERENCE_THRESHOLD_PERCENT}% DEMO RULE`} />
          <ComparisonTable comparisons={snapshot.comparisons} />
        </Surface>
      </View>

      <View style={[styles.splitRow, desktop && styles.splitRowDesktop]}>
        <Surface tone="panel" style={[styles.panel, desktop && styles.explanationWide]}>
          <CardHead Icon={ShieldCheck} title="Algorithmic interpretation" meta="DEMO EVALUATION" />
          <ExplanationPanel explanation={snapshot.explanation} />
          <Text style={styles.footnote}>Educational synthetic demonstration. Does not diagnose medical conditions or prescribe interventions.</Text>
        </Surface>

        <View style={[styles.stack, desktop && styles.stackWide]}>
          <Surface tone="panel" style={styles.panel}>
            <CardHead Icon={HeartPulse} title="Body map" meta="SELECT A REGION" />
            <BodyMap tiles={tiles} />
          </Surface>

          <Surface tone="panel" style={styles.panel}>
            <CardHead Icon={Database} title="Local record quality" meta="DEVICE STORE" />
            <View style={styles.dataList}>
              <View style={styles.dataRow}><Text style={styles.dataLabel}>Saved check-ins</Text><Text style={styles.dataValue}>{checkIns.length}</Text></View>
              <View style={styles.dataRow}><Text style={styles.dataLabel}>Heart-rate readings</Text><Text style={styles.dataValue}>{hrValues.length}</Text></View>
              <View style={styles.dataRow}><Text style={styles.dataLabel}>Sleep readings</Text><Text style={styles.dataValue}>{sleepValues.length}</Text></View>
              <View style={styles.dataRow}><Text style={styles.dataLabel}>Latest local save</Text><Text style={styles.dataValue} numberOfLines={1}>{formatTimestamp(latestCheckIn.recordedAt)}</Text></View>
            </View>
            <Text style={styles.footnote}>Readings are manual entries stored on this device. No live sensor feed or ground sync is implied.</Text>
            <KnowledgeLink cardId="missing-data" label="What does missing data mean?" />
          </Surface>
        </View>
      </View>

      <Surface tone="panel" style={styles.panel}>
        <CardHead Icon={Database} title="Mission logged records" meta={`MOST RECENT ${recent.length} OF ${checkIns.length}`} />
        <View style={styles.history}>
          {recent.map((item) => (
            <View key={item.id} style={styles.historyRow}>
              <Text style={styles.historyId}>{item.id}</Text>
              <Text style={styles.historyMeta}>{formatTimestamp(item.recordedAt)}</Text>
              <Text style={styles.historyMetric}>{`HR ${formatReadingValue(item.readings.heartRateBpm, 'bpm', 0)}`}</Text>
              <Text style={styles.historyMetric}>{`Sleep ${formatReadingValue(item.readings.sleepHours, 'h', 1)}`}</Text>
            </View>
          ))}
        </View>
      </Surface>
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
  },
  eyebrow: { ...typography.labelWide, color: colors.primary[300], flex: 1, minWidth: 0 },
  heroTitle: { ...typography.hero, color: colors.offWhite },
  heroTitleMobile: typography.heroMobile,
  heroSubtitle: { ...typography.body, color: colors.slate[300], maxWidth: 760 },
  heroActions: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap', flexShrink: 0 },
  latestChip: {
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
  latestChipLabel: { fontFamily: fonts.mono, fontSize: 10, lineHeight: 14, color: colors.slate[300] },

  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  summaryCard: { flexBasis: 160, flexGrow: 1, minWidth: 0, padding: 14, gap: 8, borderColor: 'rgba(141, 187, 255, 0.14)' },
  summaryHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, flexWrap: 'wrap' },
  summaryTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  summaryLabel: { ...typography.label, fontSize: 9, lineHeight: 13, letterSpacing: 0.6, color: colors.slate[300], flexShrink: 1 },
  summaryValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' },
  summaryValue: { ...typography.numeral, color: colors.offWhite },
  summaryMissing: { ...typography.numeralSmall, color: colors.slate[400] },
  summaryUnit: { fontFamily: fonts.mono, fontSize: 10, lineHeight: 15, color: colors.slate[500], textTransform: 'uppercase', letterSpacing: 0.4 },
  summaryDelta: { fontFamily: fonts.mono, fontSize: 10, lineHeight: 15, fontVariant: ['tabular-nums'] },
  summaryDeltaMissing: { ...typography.meta, fontSize: 10, lineHeight: 15, color: colors.slate[500] },
  summaryFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, borderTopWidth: 1, borderTopColor: 'rgba(40, 60, 80, 0.75)', paddingTop: 8 },
  summaryMeta: { ...typography.meta, fontSize: 10, lineHeight: 14, color: colors.slate[500] },
  summaryBaseline: { fontFamily: fonts.mono, fontSize: 9, lineHeight: 13, color: colors.slate[400] },

  chartCard: { padding: 18, gap: 12, borderColor: 'rgba(80, 222, 216, 0.14)' },
  chartWide: { flex: 1.6, minWidth: 0 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  cardIcon: {
    width: 27,
    height: 27,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(80, 222, 216, 0.22)',
    backgroundColor: stitch.cyanMuted,
  },
  cardTitle: { ...typography.cardTitle, color: colors.offWhite, flexShrink: 1 },
  cardBadge: { fontFamily: fonts.mono, fontSize: 8, lineHeight: 12, letterSpacing: 0.6, color: colors.slate[500] },
  cardMeta: { ...typography.meta, color: colors.slate[500], maxWidth: 900 },

  statStrip: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, borderTopWidth: 1, borderTopColor: 'rgba(40, 60, 80, 0.75)', paddingTop: 12 },
  statBlock: { flexGrow: 1, flexBasis: 150, minWidth: 0, gap: 3, paddingVertical: 8, paddingHorizontal: 11, borderRadius: radius.sm, backgroundColor: stitch.panelDeep, borderWidth: 1, borderColor: 'rgba(40, 60, 80, 0.75)' },
  statLabel: { ...typography.label, fontSize: 8, lineHeight: 12, letterSpacing: 0.6, color: colors.slate[500] },
  statValue: { fontFamily: fonts.mono, fontSize: 12, lineHeight: 18, color: colors.offWhite, fontVariant: ['tabular-nums'] },

  splitRow: { gap: 16 },
  splitRowDesktop: { flexDirection: 'row', alignItems: 'flex-start' },
  journeyCard: { padding: 18, gap: 10, borderColor: 'rgba(0, 214, 198, 0.20)' },
  journeyRow: { gap: 12 },
  journeyRowDesktop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  journeyCopy: { gap: 4, flexShrink: 1, minWidth: 0 },
  journeyTitle: { ...typography.cardTitle, color: colors.offWhite },
  journeyText: { ...typography.bodySmall, color: colors.slate[300], maxWidth: 940 },
  journeyMeta: { fontFamily: fonts.mono, fontSize: 9, lineHeight: 14, letterSpacing: 0.3, color: colors.slate[400] },
  explanationWide: { flex: 1.5, minWidth: 0 },
  stack: { gap: 16 },
  stackWide: { flex: 1, minWidth: 0 },
  panel: { padding: 18, gap: 12, borderColor: 'rgba(141, 187, 255, 0.14)' },

  history: { gap: 6 },
  historyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    paddingHorizontal: 11,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(9, 29, 42, 0.62)',
    borderWidth: 1,
    borderColor: 'rgba(40, 60, 80, 0.75)',
  },
  historyId: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 16, color: colors.primary[300], minWidth: 64 },
  historyMeta: { fontFamily: fonts.mono, fontSize: 10, lineHeight: 15, color: colors.slate[400], flexGrow: 1 },
  historyMetric: { fontFamily: fonts.mono, fontSize: 10, lineHeight: 15, color: colors.slate[200], fontVariant: ['tabular-nums'] },

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
  footnote: { ...typography.meta, color: colors.slate[500] },

  emptyPanel: { padding: 18 },
});
