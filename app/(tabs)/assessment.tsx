import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import {
  BookOpen, ChartNoAxesCombined, Check, ClipboardCheck, Clock3, Database, Info, Send, ShieldCheck, TriangleAlert,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

import { AssessmentCard } from '@/components/AssessmentCard';
import { EmptyState } from '@/components/EmptyState';
import { KnowledgeLink } from '@/components/KnowledgeLink';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenContainer } from '@/components/ScreenContainer';
import { StatusPill } from '@/components/StatusPill';
import { Surface } from '@/components/Surface';
import { VoiceControls } from '@/components/VoiceControls';
import { colors, fonts, layout, radius, stitch, type as typography } from '@/constants/theme';
import { buildAssessment } from '@/lib/assessment';
import { adaptiveContextLines } from '@/lib/adaptiveQuestions';
import { createReportSnapshot } from '@/lib/snapshot';
import { symptomLines } from '@/lib/symptoms';
import { buildAssessmentOverviewRequest } from '@/lib/voice/builders';
import { usePresentation } from '@/state/PresentationSession';
import { useSession } from '@/state/SessionProvider';
import { useSessionReset } from '@/state/useSessionReset';

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

function Hero({ lastRecorded }: { lastRecorded: string | null }) {
  const { width } = useWindowDimensions();
  const desktop = width >= layout.desktopBreakpoint;
  return (
    <View style={[styles.hero, !desktop && styles.heroMobile]}>
      <View style={styles.heroCopy}>
        <View style={styles.eyebrowRow}>
          <View style={styles.liveDot} />
          <Text style={styles.eyebrow}>DETERMINISTIC ASSESSMENT · SYNTHETIC BASELINE</Text>
        </View>
        <Text accessibilityRole="header" style={[styles.heroTitle, !desktop && styles.heroTitleMobile]}>Your health assessment</Text>
        <Text style={styles.heroSubtitle}>Understand your recorded observations and what changed.</Text>
      </View>
      {lastRecorded ? (
        <View style={styles.heroActions}>
          <View style={styles.latestChip}>
            <Clock3 size={13} color={colors.secondary[400]} strokeWidth={2} />
            <Text style={styles.latestChipLabel}>Latest · {lastRecorded}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

export default function AssessmentScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { latestCheckIn, checkIns, recordEngagement } = useSession();
  const { active: demoActive } = usePresentation();
  const [observationOpen, setObservationOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  useSessionReset(() => setObservationOpen(false));
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  const snapshot = useMemo(() => (latestCheckIn ? createReportSnapshot(latestCheckIn) : null), [latestCheckIn]);
  const assessment = useMemo(
    () => (snapshot ? buildAssessment(snapshot, { source: demoActive ? 'demo' : 'local', now }) : null),
    [snapshot, demoActive, now],
  );

  if (!latestCheckIn || !snapshot || !assessment) {
    return (
      <ScreenContainer title="Assessment" hideHeading>
        <Hero lastRecorded={null} />
        <Surface variant="glass" tone="panel" style={styles.emptyPanel}>
          <EmptyState
            title="No observations to assess yet"
            body="Save a daily check-in to see a plain-language explanation for each recorded observation and its comparison with the fictional personal baseline. Nothing is transmitted by saving or by opening this screen."
            action={<PrimaryButton label="Go to daily check-in" onPress={() => router.navigate('/check-in')} />}
          />
        </Surface>
        <Surface variant="glass" tone="panel" style={styles.panel}>
          <CardHead Icon={Info} title="What this screen will show" meta="LEVELS 1–3" />
          <Text style={styles.bodyText}>Each observation gets a plain-language finding, an optional calculation showing baseline, difference, percentage, and threshold, and a bounded next step. The assessment reuses the existing deterministic engine and fictional baseline.</Text>
          <Text style={styles.metaText}>The demonstration threshold is a numerical rule, not a clinically validated medical threshold. This screen does not diagnose conditions or decide urgency.</Text>
          <View style={styles.termLinks}>
            <KnowledgeLink cardId="personal-baseline" label="What does baseline mean?" />
          </View>
          <View style={styles.linkGrid}>
            <PrimaryButton variant="secondary" label="Crew Knowledge Hub" Icon={BookOpen} onPress={() => router.navigate('/knowledge')} style={styles.linkButton} />
          </View>
        </Surface>
      </ScreenContainer>
    );
  }

  const review = assessment.overallStatus === 'review';
  const insufficient = assessment.overallStatus === 'insufficient';
  const overallLabel = review ? 'Review suggested' : insufficient ? 'No comparison available' : 'No review flags';
  const overallTone = review ? 'accent' : insufficient ? 'neutral' : 'primary';
  const overallIcon = review ? TriangleAlert : insufficient ? Info : Check;
  const selfReportedCount = assessment.counts.noBaseline;
  const symptomDetailLines = symptomLines(latestCheckIn);
  const activityNote = latestCheckIn.activityNote?.trim() || 'Not provided';
  const recordedContext = adaptiveContextLines(latestCheckIn.adaptiveResponses);

  return (
    <ScreenContainer title="Assessment" hideHeading scrollToTopKey={assessment.checkInId}>
      <Hero lastRecorded={assessment.recordedAtText} />

      <Surface variant="glass" tone="panel" style={styles.overview}>
        <View style={styles.cardHead}>
          <View style={styles.cardTitleRow}>
            <View style={styles.cardIcon}><ShieldCheck size={15} color={colors.primary[300]} strokeWidth={2.2} /></View>
            <Text accessibilityRole="header" style={styles.cardTitle}>Assessment overview</Text>
          </View>
          <StatusPill label={overallLabel} tone={overallTone} Icon={overallIcon} />
        </View>

        <Text style={styles.overviewTitle}>{assessment.summaryTitle}</Text>
        <Text style={styles.bodyText}>{assessment.summaryBody}</Text>

        <VoiceControls
          request={buildAssessmentOverviewRequest(assessment)}
          scope="assessment"
          listenLabel="Listen to explanation"
          detail="full"
        />

        <View style={styles.countStrip}>
          <View style={styles.countBlock}>
            <Text style={styles.countLabel}>Flagged for review</Text>
            <Text style={[styles.countValue, review && { color: colors.accent[400] }]}>{assessment.counts.review}</Text>
          </View>
          <View style={styles.countBlock}>
            <Text style={styles.countLabel}>Baseline comparisons</Text>
            <Text style={styles.countValue}>{assessment.counts.compared}</Text>
          </View>
          <View style={styles.countBlock}>
            <Text style={styles.countLabel}>No baseline comparison</Text>
            <Text style={styles.countValue}>{selfReportedCount}</Text>
          </View>
          <View style={styles.countBlock}>
            <Text style={styles.countLabel}>Not measured</Text>
            <Text style={styles.countValue}>{assessment.counts.missing}</Text>
          </View>
        </View>

        <View style={styles.provenanceRow}>
          <StatusPill label="Synthetic data" tone="primary" Icon={Database} />
          <Text style={styles.provenanceText}>{assessment.checkInId} · {assessment.recordedAtText} · {assessment.ageText}{checkIns.length > 1 ? ` · Latest of ${checkIns.length} saved observations` : ''}</Text>
        </View>
        <Text style={styles.metaText}>{assessment.sourceText}. The personal baseline is fictional demonstration data. No connected device, wearable import, or live sensor feed is used.</Text>

        {assessment.stale ? (
          <View style={styles.staleRow}>
            <Clock3 size={14} color={colors.accent[400]} strokeWidth={2} />
            <Text style={styles.staleText}>This record is from an earlier check-in and is not a current measurement. Open a newer record to assess current observations.</Text>
          </View>
        ) : null}
      </Surface>

      <View style={styles.sectionHead}>
        <View style={styles.sectionTitleRow}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>Observation explanations</Text>
          <Text style={styles.sectionMeta}>LEVEL 1</Text>
        </View>
        <Text style={styles.sectionIntro}>Each card explains one recorded value. The short note separates a comparison finding from a diagnosis. Open a card for the exact calculation.</Text>
      </View>

      <View style={styles.cardGrid}>
        {assessment.findings.map((finding) => (
          <AssessmentCard
            key={`${assessment.checkInId}-${finding.key}`}
            finding={finding}
            thresholdPercent={assessment.thresholdPercent}
            speechNextStep={assessment.nextSteps[0]}
            onCalculationOpen={() => { void recordEngagement('calculation-opened'); }}
          />
        ))}
      </View>

      <View style={[styles.splitRow, width >= layout.desktopBreakpoint && styles.splitRowDesktop]}>
        <Surface variant="glass" tone="panel" style={[styles.panel, styles.nextStepPanel]}>
          <CardHead Icon={ShieldCheck} title="Suggested next step" meta="LEVEL 3 · BOUNDED" />
          <Text style={styles.metaText}>These steps support record review and communication. They are not treatment instructions and do not decide urgency.</Text>
          <View style={styles.steps}>
            {assessment.nextSteps.map((step, index) => (
              <View key={step} style={styles.stepRow}>
                <View style={styles.stepNumber}><Text style={styles.stepNumberText}>{index + 1}</Text></View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>
          <View style={styles.emergencyRow}>
            <TriangleAlert size={15} color={colors.accent[400]} strokeWidth={2} />
            <Text style={styles.emergencyText}>{assessment.emergencyNote}</Text>
          </View>
        </Surface>

        <Surface variant="glass" tone="panel" style={[styles.panel, styles.contextPanel]}>
          <CardHead Icon={ChartNoAxesCombined} title="Supporting context" meta="NOTHING IS SENT" />
          <Text style={styles.metaText}>Review the source record, trends, or reports. Opening this assessment does not create, queue, or transmit a report.</Text>
          <View style={styles.linkGrid}>
            <PrimaryButton
              variant="secondary"
              label={observationOpen ? 'Hide observed values' : 'Original observation'}
              Icon={ClipboardCheck}
              onPress={() => setObservationOpen((current) => !current)}
              style={styles.linkButton}
              accessibilityHint="Shows the values recorded in this check-in."
            />
            <PrimaryButton variant="secondary" label="Health trends" Icon={ChartNoAxesCombined} onPress={() => router.navigate('/dashboard')} style={styles.linkButton} />
            <PrimaryButton variant="secondary" label="Daily check-in" Icon={ClipboardCheck} onPress={() => router.navigate('/check-in')} style={styles.linkButton} />
            <PrimaryButton variant="secondary" label="Reports & sync" Icon={Send} onPress={() => router.navigate('/delivery')} style={styles.linkButton} />
            <PrimaryButton variant="secondary" label="Crew Knowledge Hub" Icon={BookOpen} onPress={() => router.navigate('/knowledge')} style={styles.linkButton} />
          </View>
          {observationOpen ? (
            <View style={styles.observationBox} nativeID="original-observation">
              <Text style={styles.observationTitle}>{latestCheckIn.id} · {assessment.recordedAtText}</Text>
              <View style={styles.observationGrid}>
                {assessment.findings.map((finding) => (
                  <View key={finding.key} style={styles.observationCell}>
                    <Text style={styles.observationLabel}>{finding.label}</Text>
                    <Text style={styles.observationValue}>{finding.observedText}</Text>
                  </View>
                ))}
                <View style={[styles.observationCell, styles.observationCellWide]}>
                  <Text style={styles.observationLabel}>Symptoms</Text>
                  {symptomDetailLines.map((line, index) => (
                    <Text key={`${index}-${line}`} style={styles.observationValue}>{line}</Text>
                  ))}
                </View>
                <View style={[styles.observationCell, styles.observationCellWide]}>
                  <Text style={styles.observationLabel}>Activity note</Text>
                  <Text style={styles.observationValue}>{activityNote}</Text>
                </View>
              </View>
              <Text style={styles.metaText}>{assessment.sourceText}. Values are shown exactly as recorded; no substitute or default reading is displayed.</Text>
            </View>
          ) : null}
        </Surface>
      </View>

      {recordedContext.length > 0 ? (
        <Surface variant="glass" tone="panel" style={styles.panel}>
          <CardHead Icon={Info} title="Additional self-reported context" meta="SELF-REPORTED · OPTIONAL" />
          <Text style={styles.metaText}>
            These optional answers document what the astronaut reported. They are shown separately from the calculated findings and do not change any reading, baseline comparison, the {assessment.thresholdPercent}% demonstration rule, or the review status.
          </Text>
          <View style={styles.contextList}>
            {recordedContext.map((line) => (
              <View key={line.questionId} style={styles.contextRow}>
                <View style={styles.contextCopy}>
                  <Text style={styles.contextQuestion}>{line.questionLabel}</Text>
                  <Text style={styles.contextAnswer}>{line.answerLabel}</Text>
                </View>
                <Text style={styles.contextMeta}>{`${line.answeredAtText} · ${line.sourceLabel}`}</Text>
              </View>
            ))}
          </View>
          <View style={styles.termLinks}>
            <KnowledgeLink cardId="symptom-reporting" label="How symptom reporting works" />
          </View>
        </Surface>
      ) : null}

      <Surface variant="glass" tone="panel" style={styles.panel}>
        <CardHead Icon={Info} title="How this assessment works" meta="EXISTING ENGINE · DEMO RULE" />
        <Text style={styles.bodyText}>{assessment.engineSummary}</Text>
        <Text style={styles.bodyText}>Rule · An absolute percentage difference of at least {assessment.thresholdPercent}% from the fictional personal baseline marks an observation for review. Percentage change = (observation − baseline) ÷ baseline × 100. A zero or missing baseline never produces a percentage.</Text>
        <View style={styles.termLinks}>
          <KnowledgeLink cardId="personal-baseline" label="What does baseline mean?" />
          <KnowledgeLink cardId="percentage-difference" label="How is percentage difference calculated?" />
        </View>
        <Text style={styles.bodyText}>Baseline provenance · {assessment.baselineSource}</Text>
        <Text style={styles.bodyText}>Record provenance · {assessment.sourceText}.</Text>
        <Text style={styles.metaText}>This assessment reuses the existing deterministic comparison engine. It does not use a language model, the internet, or free-form medical advice. It does not diagnose conditions, prescribe treatment, or determine exercise, medication, oxygen, or evacuation decisions.</Text>
      </Surface>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' },
  heroMobile: { flexDirection: 'column', alignItems: 'flex-start', gap: 12 },
  heroCopy: { gap: 5, flexShrink: 1, minWidth: 0 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 7 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary[400] },
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

  emptyPanel: { padding: 18 },
  overview: { padding: 18, gap: 12, borderColor: 'rgba(80, 222, 216, 0.18)' },
  overviewTitle: { ...typography.section, color: colors.offWhite, maxWidth: 900 },
  bodyText: { ...typography.body, color: colors.slate[300], maxWidth: 980 },
  metaText: { ...typography.meta, color: colors.slate[400], maxWidth: 980 },
  countStrip: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, borderTopWidth: 1, borderTopColor: 'rgba(40, 60, 80, 0.75)', paddingTop: 12 },
  countBlock: {
    flexGrow: 1,
    flexBasis: 130,
    minWidth: 0,
    gap: 3,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: radius.sm,
    backgroundColor: stitch.panelDeep,
    borderWidth: 1,
    borderColor: 'rgba(40, 60, 80, 0.75)',
  },
  countLabel: { ...typography.label, fontSize: 8, lineHeight: 12, letterSpacing: 0.6, color: colors.slate[500] },
  countValue: { fontFamily: fonts.semibold, fontSize: 24, lineHeight: 30, color: colors.offWhite, fontVariant: ['tabular-nums'] },
  provenanceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  provenanceText: { ...typography.monoSmall, color: colors.slate[300], flexShrink: 1 },
  staleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(242, 192, 120, 0.3)',
    backgroundColor: stitch.amberMuted,
    borderRadius: radius.sm,
    padding: 10,
  },
  staleText: { flex: 1, fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.accent[400] },

  sectionHead: { gap: 5 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
  sectionTitle: { ...typography.section, color: colors.offWhite },
  sectionMeta: { ...typography.labelWide, color: colors.primary[300] },
  sectionIntro: { ...typography.bodySmall, color: colors.slate[400], maxWidth: 860 },
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: 14 },

  splitRow: { gap: 16 },
  splitRowDesktop: { flexDirection: 'row', alignItems: 'flex-start' },
  panel: { padding: 18, gap: 12, borderColor: 'rgba(141, 187, 255, 0.14)' },
  nextStepPanel: { flex: 1.15, minWidth: 0 },
  contextPanel: { flex: 1, minWidth: 0 },
  steps: { gap: 9 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  stepNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 214, 198, 0.32)',
    backgroundColor: stitch.cyanMuted,
    marginTop: 1,
  },
  stepNumberText: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 15, color: colors.primary[300] },
  stepText: { flex: 1, fontFamily: fonts.regular, fontSize: 13.5, lineHeight: 20, color: colors.slate[200] },
  emergencyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(242, 192, 120, 0.28)',
    backgroundColor: stitch.amberMuted,
    borderRadius: radius.sm,
    padding: 10,
  },
  emergencyText: { flex: 1, fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.accent[400] },
  linkGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  linkButton: { flexGrow: 1, flexBasis: 168 },
  termLinks: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4 },
  observationBox: {
    gap: 10,
    borderWidth: 1,
    borderColor: stitch.glassBorder,
    backgroundColor: stitch.glassInset,
    borderRadius: radius.sm,
    padding: 12,
  },
  observationTitle: { ...typography.mono, color: colors.primary[300] },
  observationGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  observationCell: {
    flexGrow: 1,
    flexBasis: 124,
    minWidth: 0,
    gap: 3,
    paddingVertical: 7,
    paddingHorizontal: 9,
    borderRadius: 8,
    backgroundColor: 'rgba(3, 12, 22, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(40, 60, 80, 0.75)',
  },
  observationCellWide: { flexBasis: 260 },
  observationLabel: { ...typography.label, fontSize: 8, lineHeight: 12, letterSpacing: 0.5, color: colors.slate[500] },
  observationValue: { fontFamily: fonts.mono, fontSize: 11.5, lineHeight: 16, color: colors.slate[200] },
  contextList: { gap: 7 },
  contextRow: {
    gap: 4,
    padding: 10,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(40, 60, 80, 0.75)',
    backgroundColor: 'rgba(3, 12, 22, 0.5)',
  },
  contextCopy: { gap: 2 },
  contextQuestion: { ...typography.meta, color: colors.slate[300] },
  contextAnswer: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 19, color: colors.offWhite },
  contextMeta: { fontFamily: fonts.mono, fontSize: 9, lineHeight: 13, color: colors.slate[500] },

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
});
