import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  Activity, AlertTriangle, ArrowLeft, CalendarDays, ChartNoAxesCombined, Check, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, CircleDashed, CircleSlash, Clock3, ClipboardList, Database, History, Info,
  ListChecks, Pause, Play, RotateCcw, Send, ShieldCheck, Sparkles,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { AccessibilityInfo, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type ScrollViewInstance } from 'react-native';

import { AssessmentCard } from '@/components/AssessmentCard';
import { EmptyState } from '@/components/EmptyState';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenContainer } from '@/components/ScreenContainer';
import { StatusPill } from '@/components/StatusPill';
import { Surface } from '@/components/Surface';
import { TrendBars } from '@/components/TrendBars';
import { colors, fonts, layout, radius, stitch, type as typography } from '@/constants/theme';
import { crewProfile, syntheticBaseline } from '@/fixtures/crew';
import {
  REPLAY_MAX_GAP_DAYS, REPLAY_PLAYBACK_MS, buildDemoStory, buildReplayTimeline, clampReplayIndex,
  type ReplayEventType, type ReplayFrame, type ReplayTimeline,
} from '@/lib/replay';
import { usePresentation } from '@/state/PresentationSession';
import { useSession } from '@/state/SessionProvider';
import type { Readings } from '@/types/astra';

const metricIcon: Record<keyof Readings, LucideIcon> = {
  heartRateBpm: Activity,
  systolicMmHg: Activity,
  diastolicMmHg: Activity,
  temperatureC: Activity,
  sleepHours: Clock3,
  mood: Sparkles,
  stress: Activity,
} as const;

const eventIcon: Record<ReplayEventType, LucideIcon> = {
  observation: ClipboardList,
  review: AlertTriangle,
  symptom: Activity,
  report: Send,
  receipt: ShieldCheck,
};

const chartMetrics = [
  { key: 'heartRateBpm', label: 'Heart rate', unit: 'bpm', decimals: 0, baseline: syntheticBaseline.heartRateBpm },
  { key: 'systolicMmHg', label: 'Systolic', unit: 'mmHg', decimals: 0, baseline: syntheticBaseline.systolicMmHg },
  { key: 'temperatureC', label: 'Temperature', unit: '°C', decimals: 1, baseline: syntheticBaseline.temperatureC },
  { key: 'sleepHours', label: 'Sleep', unit: 'hours', decimals: 1, baseline: syntheticBaseline.sleepHours },
] as const;

type ChartMetricKey = typeof chartMetrics[number]['key'];

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

function ControlButton({
  label, Icon, disabled = false, onPress,
}: { label: string; Icon: LucideIcon; disabled?: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        styles.control,
        disabled && styles.controlDisabled,
        hovered && !disabled && styles.controlHover,
        pressed && !disabled && styles.controlPressed,
      ]}
    >
      <Icon size={14} color={disabled ? colors.slate[500] : colors.primary[300]} strokeWidth={2.2} />
      <Text style={[styles.controlLabel, disabled && styles.controlLabelDisabled]}>{label}</Text>
    </Pressable>
  );
}

function flightLabel(frame: ReplayFrame): string {
  return frame.flightDay === null ? 'Flight day not stored' : `Flight day ${frame.flightDay}`;
}

export default function MissionHealthReplayScreen() {
  const { active: demoActive } = usePresentation();
  return <ReplayContent key={demoActive ? 'demo' : 'local'} />;
}

function ReplayContent() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const desktop = width >= layout.desktopBreakpoint;
  const { checkIns, reports, recordEngagement } = useSession();
  const { active: demoActive } = usePresentation();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [chartMetric, setChartMetric] = useState<ChartMetricKey>('heartRateBpm');
  const [storyIndex, setStoryIndex] = useState(0);
  const timelineScrollRef = useRef<ScrollViewInstance | null>(null);
  const dayOffsets = useRef<Record<string, number>>({});

  const timeline: ReplayTimeline = useMemo(
    () => buildReplayTimeline({
      checkIns,
      reports,
      source: demoActive ? 'demo' : 'local',
      missionDay: demoActive ? crewProfile.missionDay : null,
    }),
    [checkIns, reports, demoActive],
  );
  const frames = timeline.frames;
  const activeIndex = clampReplayIndex(
    selectedId ? frames.findIndex((frame) => frame.id === selectedId) : frames.length - 1,
    frames.length,
  );
  const activeFrame = frames[activeIndex] ?? null;
  const story = useMemo(() => (demoActive ? buildDemoStory(timeline) : []), [demoActive, timeline]);
  const storyStep = story[Math.min(storyIndex, Math.max(0, story.length - 1))] ?? null;
  const chartOption = chartMetrics.find((option) => option.key === chartMetric) ?? chartMetrics[0];

  useEffect(() => {
    let current = true;
    AccessibilityInfo.isReduceMotionEnabled().then((value) => { if (current) setReduceMotion(value); }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { current = false; subscription.remove(); };
  }, []);

  useFocusEffect(useCallback(() => () => setPlaying(false), []));

  useEffect(() => {
    if (!activeFrame?.dateKey) return;
    const offset = dayOffsets.current[activeFrame.dateKey];
    if (offset === undefined) return;
    timelineScrollRef.current?.scrollTo({ x: Math.max(0, offset - 8), animated: !reduceMotion });
  }, [activeFrame, reduceMotion]);

  useEffect(() => {
    if (!playing || !activeFrame) return;
    if (activeIndex >= frames.length - 1) return;
    const timer = setTimeout(() => {
      const nextIndex = activeIndex + 1;
      setSelectedId(frames[nextIndex].id);
      if (nextIndex >= frames.length - 1) setPlaying(false);
    }, REPLAY_PLAYBACK_MS);
    return () => clearTimeout(timer);
  }, [playing, activeIndex, frames, activeFrame]);

  const selectFrame = (id: string) => {
    setSelectedId(id);
    setPlaying(false);
    void recordEngagement('replay-explored');
  };

  const togglePlayback = () => {
    if (frames.length < 2) return;
    if (playing) {
      setPlaying(false);
      return;
    }
    void recordEngagement('replay-explored');
    if (activeIndex >= frames.length - 1) setSelectedId(frames[0].id);
    setPlaying(true);
  };

  const move = (direction: 'first' | 'previous' | 'next' | 'latest') => {
    if (frames.length === 0) return;
    const target = direction === 'first' ? 0
      : direction === 'latest' ? frames.length - 1
        : direction === 'next' ? clampReplayIndex(activeIndex + 1, frames.length)
          : clampReplayIndex(activeIndex - 1, frames.length);
    selectFrame(frames[target].id);
  };

  const goToStory = (index: number) => {
    if (story.length === 0) return;
    const next = Math.min(story.length - 1, Math.max(0, index));
    setStoryIndex(next);
    const step = story[next];
    if (step.frameId) selectFrame(step.frameId);
    if (step.action === 'overview') router.navigate('/');
  };

  const goToTrends = () => {
    if (router.canGoBack()) router.back();
    else router.navigate('/dashboard');
  };

  const hero = (
    <View style={[styles.hero, !desktop && styles.heroMobile]}>
      <View style={styles.heroCopy}>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Back to health trends"
          onPress={goToTrends}
          style={styles.backLink}
        >
          <ArrowLeft size={14} color={colors.primary[300]} strokeWidth={2.2} />
          <Text style={styles.backLinkText}>Back to health trends</Text>
        </Pressable>
        <View style={styles.eyebrowRow}>
          <View style={styles.liveDot} />
          <Text style={styles.eyebrow}>MISSION HEALTH REPLAY · READ-ONLY HISTORY</Text>
        </View>
        <Text accessibilityRole="header" style={[styles.heroTitle, !desktop && styles.heroTitleMobile]}>Mission health replay</Text>
        <Text style={styles.heroSubtitle}>Explore your recorded health history, one observation at a time.</Text>
        <Text style={styles.heroSecondary}>{demoActive ? 'Fictional mission history — synthetic observations' : 'Local recorded history · manual observations stored on this device'}</Text>
      </View>
      <View style={styles.heroActions}>
        {activeFrame ? (
          <View style={styles.latestChip}>
            <Clock3 size={13} color={colors.secondary[400]} strokeWidth={2} />
            <Text style={styles.latestChipLabel}>Frame {activeIndex + 1} of {frames.length}</Text>
          </View>
        ) : null}
        <View style={[styles.provenanceChip, demoActive && styles.provenanceChipDemo]}>
          <Database size={12} color={demoActive ? colors.accent[400] : colors.primary[300]} strokeWidth={2} />
          <Text style={[styles.provenanceText, demoActive && styles.provenanceTextDemo]}>{timeline.syntheticLabel}</Text>
        </View>
      </View>
    </View>
  );

  if (!activeFrame) {
    return (
      <ScreenContainer title="Mission health replay" hideHeading>
        {hero}
        <Surface tone="panel" style={styles.emptyPanel}>
          <EmptyState
            title="No observations to replay yet"
            body="Save a daily check-in to build a historical timeline. This screen is read-only: opening it never creates, edits, queues, or sends a record."
            action={<PrimaryButton label="Go to daily check-in" onPress={() => router.navigate('/check-in')} />}
          />
        </Surface>
        <Surface tone="panel" style={styles.panel}>
          <CardHead Icon={Info} title="What this screen will show" meta="LEVELS 1–3 · HISTORICAL CUTOFF" />
          <Text style={styles.bodyText}>Each recorded observation becomes a replay frame. The frame shows the values recorded at that cutoff, the existing prototype comparison, and the plain-language explanation from the assessment layer. Later observations are never included in an earlier frame.</Text>
          <Text style={styles.footnote}>The replay is a projection of stored records, not a live sensor feed. Synthetic baseline comparisons are not diagnoses.</Text>
        </Surface>
      </ScreenContainer>
    );
  }

  const selectedDayFrames = timeline.days.find((day) => day.frameIds.includes(activeFrame.id));
  const dayEvents = selectedDayFrames && selectedDayFrames.frameIds.length > 1
    ? frames.filter((frame) => frame.dateKey === activeFrame.dateKey)
    : [];
  const reviewTone = activeFrame.assessment.overallStatus === 'review' ? 'accent' : activeFrame.assessment.overallStatus === 'within-range' ? 'primary' : 'neutral';
  const reviewIcon = activeFrame.assessment.overallStatus === 'review' ? AlertTriangle : activeFrame.assessment.overallStatus === 'within-range' ? Check : CircleSlash;
  const reviewLabel = activeFrame.assessment.overallStatus === 'review'
    ? `${activeFrame.assessment.counts.review} review finding${activeFrame.assessment.counts.review === 1 ? '' : 's'}`
    : activeFrame.assessment.overallStatus === 'within-range' ? 'No review flags' : 'No comparison available';
  const progress = frames.length > 1 ? (activeIndex / (frames.length - 1)) * 100 : 100;
  const atFirst = activeIndex === 0;
  const atLast = activeIndex === frames.length - 1;

  return (
    <ScreenContainer title="Mission health replay" hideHeading scrollToTopKey={activeFrame.id}>
      {hero}

      {/* A. Timeline selector */}
      <Surface tone="panel" style={styles.panel}>
        <CardHead Icon={History} title="Mission timeline" meta={`${frames.length} RECORDED OBSERVATION${frames.length === 1 ? '' : 'S'}`} />
        <View style={styles.selectedHeader}>
          <View style={styles.selectedCopy}>
            <Text accessibilityLiveRegion="polite" style={styles.selectedTitle}>Observation {activeFrame.checkIn.id} · {activeFrame.recordedAtText}</Text>
            <Text style={styles.selectedMeta}>{flightLabel(activeFrame)} · {timeline.source === 'demo' ? 'Synthetic fixture record' : 'Local manual record'}</Text>
          </View>
          <StatusPill label={reviewLabel} tone={reviewTone} Icon={reviewIcon} />
        </View>
        <Text style={styles.cutoffInline}>{activeFrame.cutoffNote}</Text>

        <ScrollView
          ref={timelineScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.timelineTrack}
          accessibilityLabel="Mission observation timeline"
        >
          {timeline.days.map((day) => {
            const selected = day.frameIds.includes(activeFrame.id);
            const latestForDay = day.frameIds.at(-1);
            const dayFrame = latestForDay ? frames.find((frame) => frame.id === latestForDay) : null;
            const label = day.empty
              ? `${day.dateText}. No observation recorded.`
              : `${day.dateText}. ${day.recordCount} observation${day.recordCount === 1 ? '' : 's'}${day.review ? ', review finding' : ''}${selected ? ', currently selected' : ''}.`;
            return (
              <Pressable
                key={day.dateKey}
                accessibilityRole="button"
                accessibilityLabel={label}
                accessibilityState={{ disabled: day.empty, selected }}
                disabled={day.empty}
                onPress={() => dayFrame && selectFrame(dayFrame.id)}
                onLayout={(event) => {
                  dayOffsets.current[day.dateKey] = event.nativeEvent.layout.x;
                  if (selected) timelineScrollRef.current?.scrollTo({ x: Math.max(0, event.nativeEvent.layout.x - 8), animated: false });
                }}
                style={({ pressed }: { pressed: boolean }) => [
                  styles.dayChip,
                  day.empty && styles.dayChipEmpty,
                  selected && styles.dayChipSelected,
                  pressed && !day.empty && styles.dayChipPressed,
                ]}
              >
                <View style={styles.dayChipTop}>
                  <Text style={[styles.dayChipDate, day.empty && styles.dayChipDateEmpty]}>{day.dateText}</Text>
                  {day.review ? <AlertTriangle size={12} color={colors.accent[400]} strokeWidth={2.2} /> : day.empty ? <CircleDashed size={12} color={colors.slate[500]} strokeWidth={2} /> : <Check size={12} color={colors.primary[300]} strokeWidth={2.2} />}
                </View>
                <Text style={[styles.dayChipMeta, day.empty && styles.dayChipMetaEmpty]}>
                  {day.empty ? 'No record' : day.flightDay === null ? `${day.recordCount} logged` : `FD ${day.flightDay} · ${day.recordCount} logged`}
                </Text>
                <Text style={[styles.dayChipState, selected && styles.dayChipStateSelected]}>
                  {day.empty ? 'Not recorded' : selected ? 'SELECTED' : day.review ? 'Review' : 'Recorded'}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <Text style={styles.footnote}>Days without observations are shown without measurements. Multiple records on one day stay individually selectable.</Text>

        {dayEvents.length > 1 ? (
          <View style={styles.eventChips}>
            <Text style={styles.eventChipsLabel}>Observations on this day</Text>
            <View style={styles.eventChipsRow}>
              {dayEvents.map((frame) => (
                <Pressable
                  key={frame.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${frame.checkIn.id} at ${frame.recordedAtText}${frame.id === activeFrame.id ? ', selected' : ''}`}
                  accessibilityState={{ selected: frame.id === activeFrame.id }}
                  onPress={() => selectFrame(frame.id)}
                  style={[styles.eventChip, frame.id === activeFrame.id && styles.eventChipSelected]}
                >
                  <Text style={[styles.eventChipText, frame.id === activeFrame.id && styles.eventChipTextSelected]}>{frame.checkIn.id} · {frame.recordedAtText}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.controls}>
          <ControlButton label="First" Icon={ChevronsLeft} disabled={atFirst} onPress={() => move('first')} />
          <ControlButton label="Previous" Icon={ChevronLeft} disabled={atFirst} onPress={() => move('previous')} />
          <ControlButton
            label={playing ? 'Pause replay' : 'Play replay'}
            Icon={playing ? Pause : Play}
            disabled={frames.length < 2}
            onPress={togglePlayback}
          />
          <ControlButton label="Next" Icon={ChevronRight} disabled={atLast} onPress={() => move('next')} />
          <ControlButton label="Last" Icon={ChevronsRight} disabled={atLast} onPress={() => move('latest')} />
          <ControlButton label="Reset to latest" Icon={RotateCcw} disabled={atLast} onPress={() => move('latest')} />
        </View>
        <View style={styles.progressRow}>
          <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress}%` }]} /></View>
          <Text style={styles.progressText}>{activeIndex + 1} / {frames.length}</Text>
        </View>
        <Text style={styles.footnote}>
          {frames.length < 2
            ? 'Playback needs at least two recorded observations. Use Next/Previous when more records exist.'
            : reduceMotion
              ? 'Reduced motion is on. Playback changes frames without animation; manual navigation remains available. This is recorded check-in playback, not continuous sensor monitoring.'
              : 'Playback steps through recorded check-ins at a presentation pace. This is not continuous sensor monitoring.'}
        </Text>
      </Surface>

      {/* Demo story */}
      {demoActive && storyStep ? (
        <Surface tone="panel" style={styles.storyPanel}>
          <CardHead Icon={Sparkles} title="Presentation story" meta={`STEP ${Math.min(storyIndex, story.length - 1) + 1} OF ${story.length} · ${storyStep.action === 'overview' ? 'NAVIGATION' : 'SYNTHETIC DATA'}`} />
          <Text style={styles.storyTitle}>{storyStep.title}</Text>
          <Text style={styles.bodyText}>{storyStep.body}</Text>
          <View style={styles.storyActions}>
            <ControlButton label="Previous step" Icon={ChevronLeft} disabled={storyIndex === 0} onPress={() => goToStory(storyIndex - 1)} />
            {storyStep.action === 'overview' ? (
              <PrimaryButton label="Open current overview" variant="secondary" onPress={() => router.navigate('/')} />
            ) : (
              <ControlButton label="Next step" Icon={ChevronRight} disabled={storyIndex >= story.length - 1} onPress={() => goToStory(storyIndex + 1)} />
            )}
            {storyStep.frameId && storyStep.frameId !== activeFrame.id ? (
              <ControlButton label="Show this frame" Icon={History} onPress={() => { if (storyStep.frameId) selectFrame(storyStep.frameId); }} />
            ) : null}
          </View>
          <Text style={styles.footnote}>Story labels are derived from the stored fixture. No narrative is generated and no cause is attributed to any observation.</Text>
        </Surface>
      ) : null}

      {/* B. Historical metric summary */}
      <Surface tone="panel" style={styles.panel}>
        <CardHead Icon={ListChecks} title="Recorded values at this frame" meta={`${activeFrame.observedCount} MEASURED · CUTOFF ${activeFrame.recordedAtText.toUpperCase()}`} />
        <View style={styles.metricGrid}>
          {activeFrame.metrics.map((metric) => {
            const Icon = metricIcon[metric.key];
            const StateIcon = metric.state === 'observed' ? Check : metric.state === 'last-available' ? Clock3 : CircleDashed;
            const stateColor = metric.state === 'missing' ? colors.slate[500] : metric.state === 'last-available' ? colors.secondary[400] : colors.primary[300];
            return (
              <View key={metric.key} style={styles.metricCard}>
                <View style={styles.metricHead}>
                  <View style={styles.metricTitleRow}>
                    <Icon size={13} color={colors.primary[300]} strokeWidth={2.2} />
                    <Text style={styles.metricLabel}>{metric.label}</Text>
                  </View>
                  <View style={styles.metricStateRow}>
                    <StateIcon size={12} color={stateColor} strokeWidth={2.2} />
                    <Text style={[styles.metricState, { color: stateColor }]}>{metric.state === 'observed' ? 'Recorded' : metric.state === 'last-available' ? 'Earlier value' : 'Missing'}</Text>
                  </View>
                </View>
                <View style={styles.metricValueRow}>
                  {metric.value === null ? <Text style={styles.metricMissing}>Not recorded</Text> : (
                    <>
                      <Text style={styles.metricValue}>{metric.value.toFixed(metric.decimals)}</Text>
                      <Text style={styles.metricUnit}>{metric.unit}</Text>
                    </>
                  )}
                </View>
                {metric.baselineText ? <Text style={styles.metricBaseline}>Baseline {metric.baselineText}</Text> : <Text style={styles.metricNoBaseline}>No baseline for self-reported entry</Text>}
                <Text style={styles.metricStateNote}>{metric.stateLabel}</Text>
              </View>
            );
          })}
        </View>
        <Text style={styles.footnote}>A value marked “Earlier value” was measured in an earlier observation and is shown for context only. It is not part of this observation and is never presented as newly recorded.</Text>
      </Surface>

      {/* C. Historical trend chart */}
      <Surface tone="panel" style={styles.panel}>
        <CardHead Icon={ChartNoAxesCombined} title="Historical trend" meta={`${activeFrame.eligibleCheckIns.length} ELIGIBLE OBSERVATION${activeFrame.eligibleCheckIns.length === 1 ? '' : 'S'}`} />
        <View style={styles.chartPicker} accessibilityLabel="Choose a metric for the historical chart">
          {chartMetrics.map((option) => {
            const selected = option.key === chartMetric;
            return (
              <Pressable
                key={option.key}
                accessibilityRole="button"
                accessibilityLabel={`Chart ${option.label}`}
                accessibilityState={{ selected }}
                onPress={() => setChartMetric(option.key)}
                style={[styles.chartChip, selected && styles.chartChipSelected]}
              >
                <Text style={[styles.chartChipText, selected && styles.chartChipTextSelected]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <TrendBars
          title={chartOption.label}
          unit={chartOption.unit}
          decimals={chartOption.decimals}
          baseline={chartOption.baseline}
          checkIns={activeFrame.eligibleCheckIns}
          read={(item) => item.readings[chartOption.key]}
          selectionId={activeFrame.id}
          onSelect={selectFrame}
          accessibilitySummary={`${chartOption.label} historical trend up to ${activeFrame.recordedAtText}. ${activeFrame.eligibleCheckIns.length} eligible observation${activeFrame.eligibleCheckIns.length === 1 ? '' : 's'}. Synthetic baseline ${chartOption.baseline.toFixed(chartOption.decimals)} ${chartOption.unit}. Selected ${activeFrame.checkIn.id}.`}
        />
        <Text style={styles.footnote}>Only observations recorded on or before the selected cutoff are plotted. Gaps indicate missing readings; no intermediate points are invented. Select a plotted point to move the replay to that observation.</Text>
      </Surface>

      {/* D. Historical assessment */}
      <Surface tone="panel" style={styles.panel}>
        <CardHead Icon={ShieldCheck} title="Assessment at this cutoff" meta="PROTOTYPE COMPARISON · NOT A MEDICAL DIAGNOSIS" />
        <View style={styles.assessmentHead}>
          <View style={styles.assessmentCopy}>
            <Text style={styles.assessmentTitle}>{activeFrame.assessment.summaryTitle}</Text>
            <Text style={styles.bodyText}>{activeFrame.assessment.summaryBody}</Text>
          </View>
          <StatusPill label={reviewLabel} tone={reviewTone} Icon={reviewIcon} />
        </View>
        <Text style={styles.requiredLabel}>Prototype comparison — not a medical diagnosis.</Text>
        <View style={styles.noteRow}>
          <History size={14} color={colors.secondary[400]} strokeWidth={2.2} />
          <Text style={styles.noteText}>{activeFrame.cutoffNote}</Text>
        </View>
        <View style={styles.noteRow}>
          <Info size={14} color={colors.secondary[400]} strokeWidth={2.2} />
          <Text style={styles.noteText}>{activeFrame.baselineNote}</Text>
        </View>
        <Text style={styles.footnote}>The assessment uses only {activeFrame.checkIn.id}. Values shown as “Earlier value” in the summary above are not merged into this assessment.</Text>
        <View style={styles.cardGrid}>
          {activeFrame.assessment.findings.map((finding) => (
            <AssessmentCard
              key={finding.key}
              finding={finding}
              thresholdPercent={activeFrame.assessment.thresholdPercent}
              onCalculationOpen={() => { void recordEngagement('calculation-opened'); }}
            />
          ))}
        </View>
      </Surface>

      <View style={[styles.splitRow, desktop && styles.splitRowDesktop]}>
        {/* E. Observation details */}
        <Surface tone="panel" style={[styles.panel, styles.splitPanel]}>
          <CardHead Icon={ClipboardList} title="Observation details" meta={activeFrame.checkIn.id} />
          <View style={styles.detailList}>
            <View style={styles.detailRow}><Text style={styles.detailName}>Recorded time</Text><Text style={styles.detailValue}>{activeFrame.recordedAtText}</Text></View>
            <View style={styles.detailRow}><Text style={styles.detailName}>Flight day</Text><Text style={styles.detailValue}>{activeFrame.flightDay === null ? 'Not stored for local records' : `FD ${activeFrame.flightDay}`}</Text></View>
            <View style={styles.detailRow}><Text style={styles.detailName}>Source</Text><Text style={styles.detailValue}>{activeFrame.provenance.sourceText}</Text></View>
            <View style={styles.detailRow}><Text style={styles.detailName}>Baseline</Text><Text style={styles.detailValue}>{activeFrame.provenance.baselineSource}</Text></View>
            <View style={styles.detailRow}><Text style={styles.detailName}>Symptoms</Text><Text style={styles.detailValue}>{activeFrame.symptoms.length ? activeFrame.symptoms.join(', ') : 'None recorded'}</Text></View>
            <View style={styles.detailRow}><Text style={styles.detailName}>Activity note</Text><Text style={styles.detailValue}>{activeFrame.activityNote.trim() || 'Not provided'}</Text></View>
          </View>
          <View style={styles.provenanceRow}>
            <View style={styles.provenanceChip}>
              <Database size={12} color={colors.primary[300]} strokeWidth={2} />
              <Text style={styles.provenanceText}>{timeline.syntheticLabel}</Text>
            </View>
            <Text style={styles.footnote}>{timeline.sourceNote}</Text>
          </View>
        </Surface>

        {/* F. Health event timeline */}
        <Surface tone="panel" style={[styles.panel, styles.splitPanel]}>
          <CardHead Icon={CalendarDays} title="Health event timeline" meta={`${activeFrame.events.length} STORED EVENT${activeFrame.events.length === 1 ? '' : 'S'}`} />
          <View style={styles.eventList}>
            {activeFrame.events.map((event) => {
              const Icon = eventIcon[event.type];
              const tone = event.type === 'review' ? colors.accent[400] : event.type === 'receipt' ? colors.success[400] : colors.primary[300];
              return (
                <View key={event.id} style={styles.eventRow}>
                  <View style={[styles.eventIcon, event.type === 'review' && styles.eventIconReview]}>
                    <Icon size={13} color={tone} strokeWidth={2.2} />
                  </View>
                  <View style={styles.eventCopy}>
                    <Text style={styles.eventLabel}>{event.label}</Text>
                    <Text style={styles.eventDetail}>{event.detail}</Text>
                    <Text style={styles.eventTime}>{event.atText}</Text>
                  </View>
                </View>
              );
            })}
          </View>
          <Text style={styles.footnote}>Only events supported by stored records appear. A review finding does not establish a cause, and no event implies continuous monitoring.</Text>
        </Surface>
      </View>

      {/* G. Method note */}
      <Surface tone="panel" style={styles.panel}>
        <CardHead Icon={Info} title="How this replay stays honest" meta="READ-ONLY · OFFLINE" />
        <View style={styles.infoList}>
          <Text style={styles.infoLine}><Text style={styles.infoStrong}>Historical cutoff. </Text>Each frame includes only observations recorded on or before the selected observation. Later records never affect an earlier assessment.</Text>
          <Text style={styles.infoLine}><Text style={styles.infoStrong}>Retrospective baseline. </Text>{activeFrame.baselineNote} The 10% threshold stays a demonstration rule, not a clinically validated cutoff.</Text>
          <Text style={styles.infoLine}><Text style={styles.infoStrong}>Read-only. </Text>Opening, selecting, and playing this replay never edits check-ins, creates or queues reports, changes receipts, alters baselines, or changes the active astronaut identity.</Text>
          <Text style={styles.infoLine}><Text style={styles.infoStrong}>Recorded frames only. </Text>{timeline.missionDayNote} Playback is a UI presentation of stored check-ins, not sensor streaming or a continuous heart monitor.</Text>
          {timeline.gapsOmitted ? <Text style={styles.infoLine}>The history spans more than {REPLAY_MAX_GAP_DAYS} days, so only days with recorded observations are listed; no missing-day measurements are invented.</Text> : null}
          <Text style={styles.infoLine}><Text style={styles.infoStrong}>Synthetic provenance. </Text>{activeFrame.provenance.sourceText}. {activeFrame.provenance.baselineSource}</Text>
        </View>
      </Surface>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' },
  heroMobile: { flexDirection: 'column', alignItems: 'flex-start', gap: 12 },
  heroCopy: { gap: 6, flexShrink: 1, minWidth: 0 },
  backLink: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', minHeight: 32, paddingVertical: 4 },
  backLinkText: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 16, color: colors.primary[300] },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary[400] },
  eyebrow: { ...typography.labelWide, color: colors.primary[300], flexShrink: 1 },
  heroTitle: { ...typography.hero, color: colors.offWhite },
  heroTitleMobile: typography.heroMobile,
  heroSubtitle: { ...typography.body, color: colors.slate[300], maxWidth: 760 },
  heroSecondary: { ...typography.meta, color: colors.slate[400] },
  heroActions: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  latestChip: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 9, paddingHorizontal: 12, borderRadius: radius.sm, borderWidth: 1, borderColor: 'rgba(40, 60, 80, 0.8)', backgroundColor: 'rgba(36, 55, 68, 0.42)' },
  latestChipLabel: { fontFamily: fonts.mono, fontSize: 10, lineHeight: 14, color: colors.slate[300] },
  provenanceChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 7, paddingHorizontal: 10, borderRadius: radius.sm, borderWidth: 1, borderColor: 'rgba(0, 214, 198, 0.28)', backgroundColor: stitch.cyanMuted },
  provenanceChipDemo: { borderColor: 'rgba(242, 192, 120, 0.3)', backgroundColor: stitch.amberMuted },
  provenanceText: { fontFamily: fonts.semibold, fontSize: 10, lineHeight: 14, letterSpacing: 0.3, color: colors.primary[300] },
  provenanceTextDemo: { color: colors.accent[400] },

  emptyPanel: { padding: 18 },
  panel: { padding: 18, gap: 12, borderColor: 'rgba(141, 187, 255, 0.14)' },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  cardIcon: { width: 27, height: 27, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(80, 222, 216, 0.22)', backgroundColor: stitch.cyanMuted },
  cardTitle: { ...typography.cardTitle, color: colors.offWhite, flexShrink: 1 },
  cardBadge: { fontFamily: fonts.mono, fontSize: 8, lineHeight: 12, letterSpacing: 0.6, color: colors.slate[500], flexShrink: 1 },
  bodyText: { ...typography.body, color: colors.slate[300] },
  footnote: { ...typography.meta, color: colors.slate[500], maxWidth: 980 },

  selectedHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
  selectedCopy: { gap: 4, flexShrink: 1, minWidth: 0 },
  selectedTitle: { ...typography.section, color: colors.offWhite },
  selectedMeta: { ...typography.monoSmall, color: colors.slate[400] },
  cutoffInline: { ...typography.bodySmall, color: colors.slate[300] },

  timelineTrack: { gap: 8, paddingVertical: 2 },
  dayChip: { minWidth: 118, minHeight: 68, gap: 3, justifyContent: 'center', paddingVertical: 9, paddingHorizontal: 11, borderRadius: radius.sm, borderWidth: 1, borderColor: 'rgba(40, 60, 80, 0.8)', backgroundColor: stitch.panelDeep },
  dayChipEmpty: { borderStyle: 'dashed', opacity: 0.6 },
  dayChipSelected: { borderColor: colors.primary[400], backgroundColor: 'rgba(0, 214, 198, 0.16)' },
  dayChipPressed: { backgroundColor: 'rgba(0, 214, 198, 0.22)' },
  dayChipTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  dayChipDate: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 16, color: colors.offWhite },
  dayChipDateEmpty: { color: colors.slate[400] },
  dayChipMeta: { fontFamily: fonts.mono, fontSize: 10, lineHeight: 14, color: colors.slate[400] },
  dayChipMetaEmpty: { color: colors.slate[500] },
  dayChipState: { ...typography.label, fontSize: 8, lineHeight: 12, letterSpacing: 0.7, color: colors.slate[500] },
  dayChipStateSelected: { color: colors.primary[300] },

  eventChips: { gap: 6, borderTopWidth: 1, borderTopColor: 'rgba(40, 60, 80, 0.75)', paddingTop: 10 },
  eventChipsLabel: { ...typography.label, color: colors.slate[500] },
  eventChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  eventChip: { minHeight: 36, justifyContent: 'center', paddingHorizontal: 10, borderRadius: radius.sm, borderWidth: 1, borderColor: 'rgba(40, 60, 80, 0.8)', backgroundColor: stitch.panelDeep },
  eventChipSelected: { borderColor: colors.primary[400], backgroundColor: 'rgba(0, 214, 198, 0.14)' },
  eventChipText: { fontFamily: fonts.mono, fontSize: 10, lineHeight: 14, color: colors.slate[300] },
  eventChipTextSelected: { color: colors.primary[300] },

  controls: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, borderTopWidth: 1, borderTopColor: 'rgba(40, 60, 80, 0.75)', paddingTop: 12 },
  control: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 12, borderRadius: radius.sm, borderWidth: 1, borderColor: 'rgba(0, 214, 198, 0.26)', backgroundColor: stitch.cyanMuted },
  controlHover: { backgroundColor: 'rgba(0, 214, 198, 0.22)' },
  controlPressed: { backgroundColor: 'rgba(0, 214, 198, 0.3)' },
  controlDisabled: { borderColor: 'rgba(40, 60, 80, 0.75)', backgroundColor: 'rgba(9, 29, 42, 0.5)' },
  controlLabel: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 15, color: colors.primary[300] },
  controlLabelDisabled: { color: colors.slate[500] },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressTrack: { flex: 1, height: 4, borderRadius: 2, backgroundColor: 'rgba(40, 60, 80, 0.8)', overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2, backgroundColor: colors.primary[400] },
  progressText: { fontFamily: fonts.mono, fontSize: 10, lineHeight: 14, color: colors.slate[400] },

  storyPanel: { padding: 18, gap: 10, borderColor: 'rgba(242, 192, 120, 0.26)', backgroundColor: 'rgba(22, 18, 10, 0.32)' },
  storyTitle: { ...typography.section, fontSize: 19, lineHeight: 25, color: colors.offWhite },
  storyActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },

  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricCard: { flexBasis: 164, flexGrow: 1, flexShrink: 1, minWidth: 0, gap: 6, padding: 12, borderRadius: radius.sm, borderWidth: 1, borderColor: 'rgba(40, 60, 80, 0.8)', backgroundColor: stitch.panelDeep },
  metricHead: { gap: 4 },
  metricTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metricLabel: { ...typography.label, color: colors.slate[300], flexShrink: 1 },
  metricStateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metricState: { fontFamily: fonts.semibold, fontSize: 9, lineHeight: 13, letterSpacing: 0.4, textTransform: 'uppercase' },
  metricValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 5, flexWrap: 'wrap' },
  metricValue: { fontFamily: fonts.semibold, fontSize: 27, lineHeight: 32, letterSpacing: -0.5, color: colors.offWhite, fontVariant: ['tabular-nums'] },
  metricUnit: { fontFamily: fonts.mono, fontSize: 10, lineHeight: 14, color: colors.slate[400] },
  metricMissing: { fontFamily: fonts.semibold, fontSize: 18, lineHeight: 24, color: colors.slate[400] },
  metricBaseline: { fontFamily: fonts.mono, fontSize: 10, lineHeight: 14, color: colors.slate[400] },
  metricNoBaseline: { ...typography.meta, fontSize: 10, lineHeight: 14, color: colors.slate[500] },
  metricStateNote: { ...typography.meta, fontSize: 10, lineHeight: 14, color: colors.slate[500] },

  chartPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chartChip: { minHeight: 36, justifyContent: 'center', paddingHorizontal: 11, borderRadius: radius.sm, borderWidth: 1, borderColor: 'rgba(40, 60, 80, 0.8)', backgroundColor: stitch.panelDeep },
  chartChipSelected: { borderColor: colors.primary[400], backgroundColor: 'rgba(0, 214, 198, 0.14)' },
  chartChipText: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 15, color: colors.slate[300] },
  chartChipTextSelected: { color: colors.primary[300] },

  assessmentHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' },
  assessmentCopy: { gap: 6, flexShrink: 1, minWidth: 0, flexBasis: 360, flexGrow: 1 },
  assessmentTitle: { ...typography.section, color: colors.offWhite },
  requiredLabel: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 16, letterSpacing: 0.2, color: colors.secondary[400] },
  noteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, paddingVertical: 8, paddingHorizontal: 10, borderRadius: radius.sm, borderWidth: 1, borderColor: 'rgba(40, 60, 80, 0.75)', backgroundColor: 'rgba(9, 29, 42, 0.5)' },
  noteText: { flex: 1, ...typography.bodySmall, color: colors.slate[300] },
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: 14, paddingTop: 2 },

  splitRow: { gap: 16 },
  splitRowDesktop: { flexDirection: 'row', alignItems: 'flex-start' },
  splitPanel: { flex: 1, minWidth: 0 },
  detailList: { gap: 0 },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.06)' },
  detailName: { flexShrink: 0, width: 108, ...typography.label, color: colors.slate[500] },
  detailValue: { flex: 1, fontFamily: fonts.mono, fontSize: 11, lineHeight: 16, color: colors.slate[200], textAlign: 'right' },
  provenanceRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, paddingTop: 2 },

  eventList: { gap: 8 },
  eventRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, padding: 10, borderRadius: radius.sm, borderWidth: 1, borderColor: 'rgba(40, 60, 80, 0.75)', backgroundColor: 'rgba(9, 29, 42, 0.5)' },
  eventIcon: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(0, 214, 198, 0.22)', backgroundColor: stitch.cyanMuted },
  eventIconReview: { borderColor: 'rgba(242, 192, 120, 0.3)', backgroundColor: stitch.amberMuted },
  eventCopy: { flex: 1, minWidth: 0, gap: 2 },
  eventLabel: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 17, color: colors.offWhite },
  eventDetail: { ...typography.meta, color: colors.slate[400] },
  eventTime: { fontFamily: fonts.mono, fontSize: 10, lineHeight: 14, color: colors.slate[500] },

  infoList: { gap: 8 },
  infoLine: { ...typography.bodySmall, color: colors.slate[300] },
  infoStrong: { fontFamily: fonts.semibold, color: colors.offWhite },
});
