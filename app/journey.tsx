import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  CalendarCheck, Check, Circle, ClipboardCheck, ClipboardList, Eye, FileText, History, Info,
  Orbit, Search, ShieldCheck, Sparkles,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Svg, Circle as SvgCircle } from 'react-native-svg';

import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenContainer } from '@/components/ScreenContainer';
import { StatusPill } from '@/components/StatusPill';
import { Surface } from '@/components/Surface';
import { colors, fonts, layout, radius, stitch, type as typography } from '@/constants/theme';
import {
  buildJourneySummary,
  formatUtcDayKey,
  type EngagementMilestone,
  type MilestoneId,
  type RoutineProgress,
} from '@/lib/engagement';
import { formatTimestamp } from '@/lib/format';
import { useUtcClock } from '@/hooks/useUtcClock';
import { usePresentation } from '@/state/PresentationSession';
import { useSession } from '@/state/SessionProvider';

const milestoneIcons: Record<MilestoneId, LucideIcon> = {
  'first-log': ClipboardCheck,
  'routine-builder': CalendarCheck,
  'consistent-explorer': Orbit,
  'record-explorer': History,
  'data-explorer': Search,
  'report-explorer': FileText,
};

function RoutineRing({ routine }: { routine: RoutineProgress }) {
  const size = 62;
  const stroke = 5;
  const radiusPx = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radiusPx;
  const fraction = routine.totalSteps === 0 ? 0 : routine.completedSteps / routine.totalSteps;
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Today's health routine"
      accessibilityValue={{ min: 0, max: routine.totalSteps, now: routine.completedSteps, text: `${routine.completedSteps} of ${routine.totalSteps} steps complete` }}
      style={styles.ring}
    >
      <Svg width={size} height={size}>
        <SvgCircle cx={size / 2} cy={size / 2} r={radiusPx} stroke="rgba(255, 255, 255, 0.12)" strokeWidth={stroke} fill="none" />
        <SvgCircle
          cx={size / 2}
          cy={size / 2}
          r={radiusPx}
          stroke={routine.complete ? colors.success[400] : colors.primary[400]}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - fraction)}
          fill="none"
        />
      </Svg>
      <View pointerEvents="none" style={styles.ringLabel}>
        <Text style={styles.ringValue}>{routine.completedSteps}/{routine.totalSteps}</Text>
      </View>
    </View>
  );
}

function RoutineCard({ routine, desktop }: { routine: RoutineProgress; desktop: boolean }) {
  return (
    <Surface variant="glass" tone="panel" style={styles.routineCard}>
      <View style={styles.cardHead}>
        <View style={styles.cardTitleRow}>
          <View style={styles.cardIcon}><ClipboardList size={15} color={colors.primary[300]} strokeWidth={2.2} /></View>
          <View style={styles.cardTitleCopy}>
            <Text accessibilityRole="header" style={styles.cardTitle}>Today&apos;s Health Routine</Text>
            <Text style={styles.cardMeta}>{`UTC day · ${formatUtcDayKey(routine.dayKey)}`}</Text>
          </View>
        </View>
        <StatusPill label={routine.complete ? 'Routine complete' : 'Available'} tone={routine.complete ? 'success' : 'primary'} />
      </View>

      <View style={[styles.routineBody, desktop && styles.routineBodyDesktop]}>
        <RoutineRing routine={routine} />
        <View style={styles.routineSteps}>
          <Text accessibilityLiveRegion="polite" style={styles.routineSummary}>
            {routine.complete
              ? 'A check-in is saved for this UTC day. The daily routine is complete.'
              : 'The routine completes only after a check-in is saved. Opening a form does not earn progress.'}
          </Text>
          {routine.steps.map((step) => (
            <View key={step.key} style={styles.routineStep}>
              {step.complete
                ? <Check size={14} color={colors.success[400]} strokeWidth={2.6} />
                : <Circle size={14} color={colors.slate[500]} strokeWidth={2} />}
              <Text style={[styles.routineStepLabel, step.complete && styles.routineStepDone]}>{step.label}</Text>
              <Text style={styles.routineStepState}>{step.complete ? 'Complete' : 'Not yet'}</Text>
            </View>
          ))}
        </View>
      </View>

      <Text style={styles.footnote}>A day is a UTC calendar day taken from each saved timestamp. Partial entries and missing optional fields still count as a saved observation.</Text>
    </Surface>
  );
}

function MilestoneCard({ milestone, desktop, featured = false }: { milestone: EngagementMilestone; desktop: boolean; featured?: boolean }) {
  const Icon = milestoneIcons[milestone.id];
  return (
    <View
      accessible
      accessibilityLabel={`${milestone.title}. ${milestone.unlocked ? 'Earned' : 'Not yet earned'}. ${milestone.progressText}`}
      style={[styles.milestone, desktop && styles.milestoneDesktop, milestone.unlocked && styles.milestoneUnlocked, featured && styles.milestoneFeatured]}
    >
      <View style={styles.milestoneHead}>
        <View style={[styles.milestoneIcon, milestone.unlocked && styles.milestoneIconUnlocked]}>
          <Icon size={17} color={milestone.unlocked ? colors.primary[300] : colors.slate[400]} strokeWidth={2} />
        </View>
        <StatusPill label={milestone.unlocked ? 'Earned' : 'Not yet'} tone={milestone.unlocked ? 'success' : 'neutral'} Icon={milestone.unlocked ? Check : undefined} />
      </View>
      <Text style={styles.milestoneTitle}>{milestone.title}</Text>
      <Text style={styles.milestoneBody}>{milestone.description}</Text>
      <Text style={[styles.milestoneProgress, milestone.unlocked && styles.milestoneProgressEarned]}>{milestone.progressText}</Text>
    </View>
  );
}

function LearningRow({ milestone, featured = false }: { milestone: EngagementMilestone; featured?: boolean }) {
  const Icon = milestoneIcons[milestone.id];
  return (
    <View
      accessible
      accessibilityLabel={`${milestone.title}. ${milestone.unlocked ? 'Earned' : 'Not yet earned'}. ${milestone.progressText}`}
      style={[styles.learningRow, milestone.unlocked && styles.learningRowUnlocked, featured && styles.milestoneFeatured]}
    >
      <View style={[styles.learningIcon, milestone.unlocked && styles.milestoneIconUnlocked]}>
        <Icon size={15} color={milestone.unlocked ? colors.primary[300] : colors.slate[400]} strokeWidth={2} />
      </View>
      <View style={styles.learningCopy}>
        <View style={styles.learningTitleRow}>
          <Text style={styles.learningTitle}>{milestone.title}</Text>
          <Text style={[styles.learningState, milestone.unlocked && styles.milestoneProgressEarned]}>{milestone.unlocked ? 'Explored' : 'Optional'}</Text>
        </View>
        <Text style={styles.learningBody}>{milestone.description}</Text>
        <Text style={styles.learningProgress}>{milestone.progressText}</Text>
      </View>
    </View>
  );
}

export default function JourneyScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const desktop = width >= layout.desktopBreakpoint;
  const { checkIns, engagement, setJourneyVisible } = useSession();
  const { active: demoActive } = usePresentation();
  const referenceTime = useUtcClock();
  const [visibilityError, setVisibilityError] = useState<string | null>(null);

  const summary = useMemo(
    () => buildJourneySummary({ checkIns, engagement, referenceTime }),
    [checkIns, engagement, referenceTime],
  );

  const changeVisibility = async (visible: boolean) => {
    setVisibilityError(null);
    try {
      await setJourneyVisible(visible);
      if (!visible) router.navigate('/');
    } catch {
      setVisibilityError('The journey preference could not be saved. Your check-ins and milestones are unchanged.');
    }
  };

  if (!engagement.journeyVisible) {
    return (
      <ScreenContainer title="Mission journey" hideHeading>
        <View style={[styles.hero, !desktop && styles.heroMobile]}>
          <View style={styles.heroCopy}>
            <View style={styles.eyebrowRow}><Eye size={12} color={colors.primary[300]} strokeWidth={2.2} /><Text style={styles.eyebrow}>MISSION WELLNESS JOURNEY</Text></View>
            <Text accessibilityRole="header" style={[styles.heroTitle, !desktop && styles.heroTitleMobile]}>Your Mission Journey</Text>
            <Text style={styles.heroSubtitle}>Small check-ins help build a clearer record over time.</Text>
          </View>
        </View>
        <Surface variant="glass" tone="panel" style={styles.hiddenCard}>
          <View style={styles.hiddenIcon}><Eye size={22} color={colors.slate[400]} strokeWidth={2} /></View>
          <Text accessibilityRole="header" style={styles.hiddenTitle}>Mission Wellness Journey is hidden</Text>
          <Text style={styles.hiddenBody}>Hiding this view never removes check-ins, changes assessment results, or affects saved reports. You can show it again at any time.</Text>
          {visibilityError ? <Text accessibilityRole="alert" style={styles.error}>{visibilityError}</Text> : null}
          <PrimaryButton label="Show Mission Wellness Journey" Icon={Eye} onPress={() => { void changeVisibility(true); }} />
        </Surface>
      </ScreenContainer>
    );
  }

  const participation = summary.milestones.filter((milestone) => milestone.category === 'participation');
  const learning = summary.milestones.filter((milestone) => milestone.category === 'learning');
  const current = summary.milestones.find((milestone) => !milestone.unlocked) ?? null;
  const isCurrent = (milestone: EngagementMilestone) => current?.id === milestone.id;

  return (
    <ScreenContainer title="Mission journey" hideHeading>
      <View style={[styles.hero, !desktop && styles.heroMobile]}>
        <View style={styles.heroCopy}>
          <View style={styles.eyebrowRow}><Sparkles size={12} color={colors.primary[300]} strokeWidth={2.2} /><Text style={styles.eyebrow}>MISSION WELLNESS JOURNEY</Text></View>
          <Text accessibilityRole="header" style={[styles.heroTitle, !desktop && styles.heroTitleMobile]}>Your Mission Journey</Text>
          <Text style={styles.heroSubtitle}>Small check-ins help build a clearer record over time.</Text>
        </View>
        <View style={styles.heroActions}>
          <StatusPill label={demoActive ? 'Demo session · temporary' : 'Local record'} tone={demoActive ? 'accent' : 'success'} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Hide Mission Wellness Journey"
            onPress={() => { void changeVisibility(false); }}
            style={({ pressed }) => [styles.hideLink, pressed && styles.hideLinkPressed]}
          >
            <Eye size={14} color={colors.slate[300]} strokeWidth={2} />
            <Text style={styles.hideLinkText}>Hide journey</Text>
          </Pressable>
        </View>
      </View>

      {demoActive ? (
        <View style={styles.demoBand}>
          <Info size={14} color={colors.accent[400]} strokeWidth={2.2} />
          <Text style={styles.demoBandText}>Demo crew session: this progress is temporary, stays in this session, and clears when the demo ends. It never modifies saved device records.</Text>
        </View>
      ) : null}

      <View style={[styles.topRow, desktop && styles.topRowDesktop]}>
        <RoutineCard routine={summary.routine} desktop={desktop} />
        <Surface variant="glass" tone="panel" style={styles.nextCard}>
          <View style={styles.cardHead}>
            <View style={styles.cardTitleRow}>
              <View style={styles.cardIcon}><ShieldCheck size={15} color={colors.primary[300]} strokeWidth={2.2} /></View>
              <Text accessibilityRole="header" style={styles.cardTitle}>A gentle next step</Text>
            </View>
            <Text style={styles.cardMeta}>{`${summary.unlockedCount} OF ${summary.milestones.length} MILESTONES`}</Text>
          </View>
          <Text accessibilityLiveRegion="polite" style={styles.encouragement}>{summary.encouragement}</Text>
          <Text style={styles.nextDescription}>{summary.nextAction.description}</Text>
          <PrimaryButton
            label={summary.nextAction.label}
            onPress={() => router.navigate(summary.nextAction.href)}
            style={styles.nextButton}
          />
          <Text style={styles.nextFootnote}>Nothing is required. Milestones are optional and can be earned in any order, without a penalty for gaps.</Text>
        </Surface>
      </View>

      {!desktop && current ? (
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>Current milestone</Text>
            <Text style={styles.sectionMeta}>NEXT OPTIONAL STEP</Text>
          </View>
          <MilestoneCard milestone={current} desktop={false} featured />
        </View>
      ) : null}

      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>Participation milestones</Text>
          <Text style={styles.sectionMeta}>{`${summary.distinctDays} CHECK-IN ${summary.distinctDays === 1 ? 'DAY' : 'DAYS'} · UTC`}</Text>
        </View>
        <Text style={styles.sectionIntro}>These milestones recognize the days you chose to record an observation. Total days matter; consecutive streaks do not.</Text>
        <View style={[styles.milestoneGrid, desktop && styles.milestoneGridDesktop]}>
          {participation
            .filter((milestone) => desktop || !isCurrent(milestone))
            .map((milestone) => <MilestoneCard key={milestone.id} milestone={milestone} desktop={desktop} featured={isCurrent(milestone)} />)}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>Optional learning milestones</Text>
          <Text style={styles.sectionMeta}>NO HEALTH RESULT REQUIRED</Text>
        </View>
        <Text style={styles.sectionIntro}>Learning milestones are earned by deliberately exploring existing explanations. Simply opening this screen or navigating between tabs does not grant them.</Text>
        <View style={styles.learningList}>
          {learning
            .filter((milestone) => desktop || !isCurrent(milestone))
            .map((milestone) => <LearningRow key={milestone.id} milestone={milestone} featured={isCurrent(milestone)} />)}
        </View>
      </View>

      <View style={[styles.bottomRow, desktop && styles.bottomRowDesktop]}>
        <Surface variant="glass" tone="panel" style={styles.recentCard}>
          <View style={styles.cardHead}>
            <View style={styles.cardTitleRow}>
              <View style={styles.cardIcon}><History size={15} color={colors.primary[300]} strokeWidth={2.2} /></View>
              <Text accessibilityRole="header" style={styles.cardTitle}>Recent check-in activity</Text>
            </View>
            <Text style={styles.cardMeta}>MOST RECENT {summary.recent.length}</Text>
          </View>
          {summary.recent.length === 0 ? (
            <Text style={styles.emptyText}>No check-ins saved yet. Your first saved observation starts this list.</Text>
          ) : (
            <View style={styles.recentList}>
              {summary.recent.map((entry) => (
                <View key={entry.id} style={styles.recentRow}>
                  <View style={styles.recentDot} />
                  <Text style={styles.recentId}>{entry.id}</Text>
                  <Text style={styles.recentTime}>{formatTimestamp(entry.recordedAt)}</Text>
                </View>
              ))}
            </View>
          )}
          <Text style={styles.footnote}>Only saved check-ins appear here. Drafts, opened forms, and navigation are never recorded as participation.</Text>
        </Surface>

        <Surface variant="glass" tone="panel" style={styles.aboutCard}>
          <View style={styles.cardHead}>
            <View style={styles.cardTitleRow}>
              <View style={styles.cardIcon}><Info size={15} color={colors.secondary[400]} strokeWidth={2.2} /></View>
              <Text accessibilityRole="header" style={styles.cardTitle}>How this journey works</Text>
            </View>
          </View>
          <Text style={styles.aboutBody}>Milestones recognize participation and learning only. They never reward lower or higher readings, missing symptoms, or a “perfect” health score.</Text>
          <Text style={styles.aboutBody}>Milestones do not change assessment results, are not included in reports, and are never sent to the simulated ground receiver.</Text>
          <Text style={styles.footnote}>Stored with {demoActive ? 'this temporary demo session' : 'your local mission record'}. Interaction notes contain only a milestone type and timestamp, never health values.</Text>
        </Surface>
      </View>

      {visibilityError ? <Text accessibilityRole="alert" style={styles.error}>{visibilityError}</Text> : null}
      <Text style={styles.pageFooter}>Educational prototype · Optional participation milestones · No NASA certification or medical clearance is implied.</Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' },
  heroMobile: { flexDirection: 'column', alignItems: 'flex-start', gap: 12 },
  heroCopy: { gap: 5, flexShrink: 1, minWidth: 0 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  eyebrow: { ...typography.labelWide, color: colors.primary[300], flexShrink: 1 },
  heroTitle: { fontFamily: fonts.semibold, fontSize: 40, lineHeight: 47, letterSpacing: -0.9, color: colors.offWhite },
  heroTitleMobile: { fontFamily: fonts.semibold, fontSize: 29, lineHeight: 35, letterSpacing: -0.4, color: colors.offWhite },
  heroSubtitle: { ...typography.body, color: colors.slate[300], maxWidth: 720 },
  heroActions: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  hideLink: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, borderRadius: radius.sm, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.12)', backgroundColor: 'rgba(255, 255, 255, 0.035)' },
  hideLinkPressed: { backgroundColor: 'rgba(255, 255, 255, 0.08)' },
  hideLinkText: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 17, color: colors.slate[200] },

  demoBand: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 11, borderRadius: radius.sm, borderWidth: 1, borderColor: 'rgba(242, 192, 120, 0.26)', backgroundColor: stitch.amberMuted },
  demoBandText: { flex: 1, fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.slate[200] },

  topRow: { gap: 16 },
  topRowDesktop: { flexDirection: 'row', alignItems: 'stretch' },
  routineCard: { flex: 1.25, minWidth: 0, padding: 18, gap: 12 },
  nextCard: { flex: 1, minWidth: 0, padding: 18, gap: 12 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1, minWidth: 0 },
  cardTitleCopy: { gap: 2, flexShrink: 1, minWidth: 0 },
  cardIcon: { width: 27, height: 27, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(0, 214, 198, 0.22)', backgroundColor: stitch.cyanMuted },
  cardTitle: { ...typography.cardTitle, color: colors.offWhite, flexShrink: 1 },
  cardMeta: { fontFamily: fonts.mono, fontSize: 8.5, lineHeight: 12, letterSpacing: 0.6, color: colors.slate[500] },

  routineBody: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  routineBodyDesktop: { alignItems: 'flex-start' },
  ring: { width: 62, height: 62, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  ringLabel: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  ringValue: { fontFamily: fonts.mono, fontSize: 11, lineHeight: 16, color: colors.offWhite, fontVariant: ['tabular-nums'] },
  routineSteps: { flex: 1, minWidth: 0, gap: 7 },
  routineSummary: { ...typography.bodySmall, fontSize: 12, lineHeight: 18, color: colors.slate[200] },
  routineStep: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 24 },
  routineStepLabel: { flex: 1, minWidth: 0, fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, color: colors.slate[300] },
  routineStepDone: { color: colors.slate[200] },
  routineStepState: { fontFamily: fonts.mono, fontSize: 8.5, lineHeight: 12, letterSpacing: 0.5, color: colors.slate[500], textTransform: 'uppercase' },

  encouragement: { ...typography.section, fontSize: 18, lineHeight: 25, color: colors.offWhite },
  nextDescription: { ...typography.bodySmall, color: colors.slate[300] },
  nextButton: { width: '100%' },
  nextFootnote: { ...typography.meta, color: colors.slate[500] },

  section: { gap: 10 },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
  sectionTitle: { ...typography.section, color: colors.offWhite, flexShrink: 1 },
  sectionMeta: { fontFamily: fonts.mono, fontSize: 8.5, lineHeight: 13, letterSpacing: 0.7, color: colors.slate[500] },
  sectionIntro: { ...typography.bodySmall, color: colors.slate[400], maxWidth: 980 },

  milestoneGrid: { gap: 10 },
  milestoneGridDesktop: { flexDirection: 'row', alignItems: 'stretch' },
  milestone: { gap: 7, padding: 15, borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(141, 187, 255, 0.14)', backgroundColor: 'rgba(9, 29, 42, 0.62)' },
  milestoneDesktop: { flex: 1, minWidth: 0 },
  milestoneUnlocked: { borderColor: 'rgba(0, 214, 198, 0.38)', backgroundColor: 'rgba(0, 214, 198, 0.075)' },
  milestoneFeatured: { borderColor: 'rgba(121, 180, 255, 0.42)', borderWidth: 1.5 },
  milestoneHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  milestoneIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.12)', backgroundColor: 'rgba(255, 255, 255, 0.04)' },
  milestoneIconUnlocked: { borderColor: 'rgba(0, 214, 198, 0.32)', backgroundColor: stitch.cyanMuted },
  milestoneTitle: { ...typography.cardTitle, color: colors.offWhite },
  milestoneBody: { ...typography.bodySmall, fontSize: 12, lineHeight: 18, color: colors.slate[300] },
  milestoneProgress: { fontFamily: fonts.mono, fontSize: 9.5, lineHeight: 14, color: colors.slate[400] },
  milestoneProgressEarned: { color: colors.success[400] },

  learningList: { gap: 8 },
  learningRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, padding: 13, borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(141, 187, 255, 0.12)', backgroundColor: 'rgba(9, 29, 42, 0.55)' },
  learningRowUnlocked: { borderColor: 'rgba(0, 214, 198, 0.30)', backgroundColor: 'rgba(0, 214, 198, 0.055)' },
  learningIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.12)', backgroundColor: 'rgba(255, 255, 255, 0.04)', flexShrink: 0 },
  learningCopy: { flex: 1, minWidth: 0, gap: 3 },
  learningTitleRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  learningTitle: { ...typography.cardTitle, fontSize: 14, lineHeight: 20, color: colors.offWhite },
  learningState: { fontFamily: fonts.mono, fontSize: 8.5, lineHeight: 12, letterSpacing: 0.6, textTransform: 'uppercase', color: colors.slate[500] },
  learningBody: { ...typography.meta, color: colors.slate[300] },
  learningProgress: { fontFamily: fonts.mono, fontSize: 9, lineHeight: 13, color: colors.slate[400] },

  bottomRow: { gap: 16 },
  bottomRowDesktop: { flexDirection: 'row', alignItems: 'stretch' },
  recentCard: { flex: 1.2, minWidth: 0, padding: 18, gap: 12 },
  aboutCard: { flex: 1, minWidth: 0, padding: 18, gap: 10 },
  recentList: { gap: 7 },
  recentRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 8, paddingHorizontal: 10, borderRadius: radius.sm, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)', backgroundColor: 'rgba(255, 255, 255, 0.035)' },
  recentDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.primary[400] },
  recentId: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 16, color: colors.primary[300], minWidth: 62 },
  recentTime: { flex: 1, minWidth: 0, fontFamily: fonts.mono, fontSize: 9.5, lineHeight: 14, color: colors.slate[300], textAlign: 'right' },
  emptyText: { ...typography.bodySmall, color: colors.slate[400] },
  aboutBody: { ...typography.bodySmall, fontSize: 12, lineHeight: 18, color: colors.slate[200] },
  footnote: { ...typography.meta, fontSize: 10, lineHeight: 15, color: colors.slate[500] },

  hiddenCard: { padding: 22, gap: 12, alignItems: 'flex-start' },
  hiddenIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.14)', backgroundColor: 'rgba(255, 255, 255, 0.04)' },
  hiddenTitle: { ...typography.cardTitle, fontSize: 18, lineHeight: 24, color: colors.offWhite },
  hiddenBody: { ...typography.bodySmall, color: colors.slate[300], maxWidth: 720 },
  error: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 18, color: colors.error[400] },
  pageFooter: { ...typography.meta, fontSize: 9.5, lineHeight: 14, color: colors.slate[500] },
});
