import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ViewStyle,
} from 'react-native';
import { ArrowLeft, ArrowRight, Check, ClipboardEdit, CreditCard, QrCode, ScanLine, ShieldCheck, TriangleAlert } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenContainer } from '@/components/ScreenContainer';
import { StatusPill } from '@/components/StatusPill';
import { Surface } from '@/components/Surface';
import { colors, fonts, layout, radius, type as typography } from '@/constants/theme';
import { demoCrewIds, demoCrewIdentity, demoCrewQrPayload, demoCrewRecordCount, buildDemoCheckIns, validateDemoCheckIns, DEMO_CREW_ID } from '@/fixtures/demoCrew';
import { describeCrewQrRejection, parseCrewQrPayload } from '@/lib/crewIdentity';
import { usePresentation } from '@/state/PresentationSession';

const STEP_LABELS = ['Crew Identity Selected', 'Local Demo Records Found', 'Observations Validated', 'Dashboard Updated'] as const;

type StepState = 'pending' | 'active' | 'done';
type IdentificationMode = 'qr' | 'tap';
type Phase = 'idle' | 'reading' | 'identified' | 'loading' | 'done' | 'error';

type MethodCardProps = {
  Icon: LucideIcon;
  title: string;
  description: string;
  badge: string;
  selected?: boolean;
  disabled: boolean;
  onPress: () => void;
};

function MethodCard({ Icon, title, description, badge, selected, disabled, onPress }: MethodCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={description}
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        styles.method,
        selected && styles.methodSelected,
        hovered && !disabled && styles.methodHover,
        pressed && !disabled && styles.methodPressed,
        disabled && styles.methodDisabled,
      ]}
    >
      <View style={[styles.methodIcon, selected && styles.methodIconSelected]}>
        <Icon size={21} color={selected ? colors.primary.ink : colors.primary[300]} strokeWidth={2} />
      </View>
      <View style={styles.methodCopy}>
        <Text style={styles.methodTitle}>{title}</Text>
        <Text style={styles.methodBody}>{description}</Text>
      </View>
      <View style={styles.methodTail}>
        <Text style={styles.methodBadge}>{badge}</Text>
        <ArrowRight size={15} color={selected ? colors.primary[300] : colors.slate[500]} strokeWidth={2} />
      </View>
    </Pressable>
  );
}

function StepRow({ label, state }: { label: string; state: StepState }) {
  return (
    <View style={styles.stepRow}>
      <View style={[styles.stepNode, state === 'done' && styles.stepNodeDone, state === 'active' && styles.stepNodeActive]}>
        {state === 'done' ? <Check size={11} color={colors.primary.ink} strokeWidth={3} />
          : state === 'active' ? <ActivityIndicator size="small" color={colors.primary[300]} />
            : <View style={styles.stepDot} />}
      </View>
      <Text style={[styles.stepLabel, state === 'pending' && styles.stepLabelPending, state === 'done' && styles.stepLabelDone]}>{label}</Text>
    </View>
  );
}

function BaselineCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.baselineCell}>
      <Text style={styles.baselineLabel}>{label}</Text>
      <Text style={styles.baselineValue}>{value}</Text>
    </View>
  );
}

export default function IdentifyCrewScreen() {
  const router = useRouter();
  const presentation = usePresentation();
  const { width } = useWindowDimensions();
  const desktop = width >= layout.desktopBreakpoint;
  const compact = width < 380;

  const [phase, setPhase] = useState<Phase>('idle');
  const [steps, setSteps] = useState<StepState[]>(['pending', 'pending', 'pending', 'pending']);
  const [mode, setMode] = useState<IdentificationMode | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);

  const busyRef = useRef(false);
  const cancelled = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [pulse] = useState(() => new Animated.Value(0));
  const busy = phase === 'reading' || phase === 'identified' || phase === 'loading' || phase === 'done';
  const progressVisible = phase !== 'idle';

  const wait = useCallback((ms: number) => new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    timers.current.push(timer);
  }), []);

  useEffect(() => {
    cancelled.current = false;
    const pendingTimers = timers.current;
    return () => {
      cancelled.current = true;
      pendingTimers.forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then((value) => { if (active) setReduceMotion(value); });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { active = false; subscription.remove(); };
  }, []);

  // Reaching the identity step ends the previous demo session so its draft cannot reappear.
  const exitedPreviousSession = useRef(false);
  useEffect(() => {
    if (exitedPreviousSession.current) return;
    exitedPreviousSession.current = true;
    if (presentation.active) presentation.exit();
  }, [presentation]);

  useEffect(() => {
    if (phase !== 'reading' || reduceMotion) {
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 750, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(pulse, { toValue: 0, duration: 750, useNativeDriver: Platform.OS !== 'web' }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [phase, reduceMotion, pulse]);

  const setStep = (index: number, state: StepState) => {
    setSteps((current) => current.map((value, position) => position === index ? state : value));
  };

  const runIdentification = useCallback(async (crewId: string, nextMode: IdentificationMode) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setError(null);
    setMode(nextMode);
    setSteps(['pending', 'pending', 'pending', 'pending']);
    setPhase(nextMode === 'tap' ? 'reading' : 'identified');

    if (nextMode === 'tap') {
      await wait(reduceMotion ? 300 : 950);
      if (cancelled.current) return;
      setPhase('identified');
      await wait(reduceMotion ? 150 : 550);
      if (cancelled.current) return;
    }

    setStep(0, 'done');
    setStep(1, 'active');
    const records = buildDemoCheckIns();
    await wait(reduceMotion ? 120 : 450);
    if (cancelled.current) return;

    setStep(1, 'done');
    setStep(2, 'active');
    const validation = validateDemoCheckIns(records);
    await wait(reduceMotion ? 120 : 350);
    if (cancelled.current) return;

    if (!validation.ok) {
      setPhase('error');
      setError(`The demo fixture failed validation: ${validation.issues[0]}`);
      busyRef.current = false;
      return;
    }

    setStep(2, 'done');
    setStep(3, 'active');
    setPhase('loading');
    presentation.identify(crewId);
    await wait(reduceMotion ? 180 : 650);
    if (cancelled.current) return;

    setStep(3, 'done');
    setPhase('done');
    await wait(reduceMotion ? 300 : 1000);
    if (cancelled.current) return;

    busyRef.current = false;
    router.replace('/');
  }, [presentation, reduceMotion, router, wait]);

  const handleDemoQr = () => {
    const result = parseCrewQrPayload(demoCrewQrPayload, demoCrewIds);
    if (!result.ok) {
      setPhase('error');
      setError(describeCrewQrRejection(result.reason));
      return;
    }
    void runIdentification(result.crewId, 'qr');
  };

  const handleTap = () => {
    void runIdentification(DEMO_CREW_ID, 'tap');
  };

  const handleManual = () => {
    router.navigate('/check-in');
  };

  const resetFlow = () => {
    setPhase('idle');
    setMode(null);
    setError(null);
    setSteps(['pending', 'pending', 'pending', 'pending']);
  };

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const phaseTitle = phase === 'reading' ? 'Reading fictional crew ID'
    : phase === 'loading' ? 'Loading Stored Synthetic Health Observations'
      : phase === 'error' ? 'Identification did not complete'
        : phase === 'done' || phase === 'identified' ? 'Demo Crew Identified'
          : '';
  const phaseBody = phase === 'reading' ? 'Simulated contactless read · no NFC hardware is used.'
    : phase === 'loading' ? 'Session-only fixture · no wearable synchronization.'
      : phase === 'error' ? 'No saved records were changed.'
        : phase === 'done' ? 'Opening Mission Overview…'
          : phase === 'identified' ? 'The fictional crew code resolved to the local demo fixture.' : '';

  const qrSize = desktop ? 172 : compact ? 132 : 152;

  return (
    <ScreenContainer title="Identify Crew Member" subtitle="Select a fictional crew identity to access its local demonstration health records.">
      <View style={styles.topRow}>
        <Pressable accessibilityRole="link" accessibilityLabel="Back to mission overview" onPress={goBack} style={({ hovered }: { hovered?: boolean }) => [styles.back, hovered && styles.backHover]}>
          <ArrowLeft size={15} color={colors.primary[300]} strokeWidth={2.2} />
          <Text style={styles.backLabel}>Back to mission overview</Text>
        </Pressable>
        <StatusPill label="FICTIONAL CREW · SYNTHETIC DEMO" tone="primary" Icon={ShieldCheck} />
      </View>

      <View style={[styles.columns, desktop && styles.columnsDesktop]}>
        <Surface variant="glass" tone="panel" style={[styles.crewCard, desktop && styles.crewCardDesktop]}>
          <View style={styles.crewTop}>
            <View style={styles.avatar}><Text style={styles.avatarText}>AR</Text></View>
            <View style={styles.crewHead}>
              <Text style={styles.crewName}>{demoCrewIdentity.name}</Text>
              <Text style={styles.crewRole}>{demoCrewIdentity.role}</Text>
              <Text style={styles.crewMission}>{demoCrewIdentity.missionName} · Flight Day {demoCrewIdentity.missionDay}</Text>
            </View>
          </View>

          <View style={styles.factGrid}>
            <View style={styles.fact}><Text style={styles.factLabel}>CREW ID</Text><Text style={styles.factValueMono}>{demoCrewIdentity.crewId}</Text></View>
            <View style={styles.fact}><Text style={styles.factLabel}>DEMO RECORDS</Text><Text style={styles.factValue}>{demoCrewRecordCount} observations</Text></View>
            <View style={styles.fact}><Text style={styles.factLabel}>FIXTURE</Text><Text style={styles.factValue}>Deterministic v1</Text></View>
          </View>

          <View style={styles.baselineBlock}>
            <Text style={styles.blockLabel}>SYNTHETIC FIXTURE BASELINE</Text>
            <View style={styles.baselineRow}>
              <BaselineCell label="HR" value={`${demoCrewIdentity.baseline.heartRateBpm} bpm`} />
              <BaselineCell label="BP" value={`${demoCrewIdentity.baseline.systolicMmHg}/${demoCrewIdentity.baseline.diastolicMmHg}`} />
              <BaselineCell label="TEMP" value={`${demoCrewIdentity.baseline.temperatureC} °C`} />
              <BaselineCell label="SLEEP" value={`${demoCrewIdentity.baseline.sleepHours} h`} />
            </View>
          </View>

          <View style={styles.crewNote}>
            <ShieldCheck size={13} color={colors.secondary[400]} strokeWidth={2} />
            <Text style={styles.crewNoteText}>Fictional records for a research prototype. The same fixture baseline drives the existing assessment and reporting screens.</Text>
          </View>
        </Surface>

        <View style={[styles.actionColumn, desktop && styles.actionColumnDesktop]}>
          <Surface variant="glass" tone="panel" style={styles.actionsPanel}>
            <View style={styles.panelHead}>
              <Text style={styles.panelLabel}>IDENTIFICATION METHOD</Text>
              <Text style={styles.panelMeta}>No device pairing · no account</Text>
            </View>

            <View style={styles.methodList}>
              <MethodCard
                Icon={QrCode}
                title="Scan Crew QR"
                description="Open the demo crew code and resolve its payload locally."
                badge="DEMO QR"
                selected={qrOpen}
                disabled={busy}
                onPress={() => setQrOpen((open) => !open)}
              />
              <MethodCard
                Icon={CreditCard}
                title="Simulate ID Card Tap"
                description="Fictional contactless card read. No NFC hardware is used."
                badge="SIMULATED"
                selected={mode === 'tap' && progressVisible}
                disabled={busy}
                onPress={handleTap}
              />
            </View>

            {qrOpen ? (
              <View style={styles.qrPanel}>
                <View style={[styles.qrLayout, !desktop && styles.qrLayoutStacked]}>
                  <View style={[styles.qrImageWrap, !desktop && styles.qrImageWrapStacked]}>
                    <QRCode value={demoCrewQrPayload} size={qrSize} color={colors.navy[950]} backgroundColor="#F9FCFF" quietZone={8} ecl="M" />
                  </View>
                  <View style={styles.qrCopy}>
                    <Text style={styles.qrTitle}>Fictional crew QR</Text>
                    <Text style={styles.qrBody}>The code carries only a demo type, a version, and a crew identifier. It contains no medical data or authentication secret.</Text>
                    <View style={styles.payloadBox}>
                      <Text style={styles.payloadText} selectable>{demoCrewQrPayload}</Text>
                    </View>
                  </View>
                </View>
                <PrimaryButton label="Use Demo Crew QR" Icon={QrCode} disabled={busy} onPress={handleDemoQr} style={styles.fullWidth} />
                <Text style={styles.qrNote}>Camera scanning is not enabled in this prototype. This button resolves the same demo payload through the real parser.</Text>
              </View>
            ) : null}

            {progressVisible ? (
              <View style={styles.progressPanel} accessibilityRole="status" accessibilityLiveRegion="polite">
                <View style={styles.progressHead}>
                  <View style={styles.progressIconWrap}>
                    {phase === 'reading' && !reduceMotion ? (
                      <Animated.View
                        pointerEvents="none"
                        style={[styles.pulseRing, {
                          opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0.08] }),
                          transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.45] }) }],
                        }]}
                      />
                    ) : null}
                    <View style={[styles.progressIcon, phase === 'error' && styles.progressIconError]}>
                      {phase === 'error' ? <TriangleAlert size={20} color={colors.error[400]} strokeWidth={2.2} />
                        : phase === 'reading' ? <CreditCard size={20} color={colors.primary[300]} strokeWidth={2} />
                          : phase === 'loading' ? <ScanLine size={20} color={colors.primary[300]} strokeWidth={2} />
                            : <Check size={20} color={colors.primary.ink} strokeWidth={2.6} />}
                    </View>
                  </View>
                  <View style={styles.progressTitleWrap}>
                    <Text style={styles.progressTitle}>{phaseTitle}</Text>
                    <Text style={styles.progressBody}>{phaseBody}</Text>
                  </View>
                </View>

                <View style={styles.steps}>
                  {STEP_LABELS.map((label, index) => <StepRow key={label} label={label} state={steps[index]} />)}
                </View>

                {error ? (
                  <View style={styles.errorBox} accessibilityRole="alert">
                    <TriangleAlert size={14} color={colors.error[400]} strokeWidth={2.2} />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                {phase === 'error' ? <PrimaryButton label="Dismiss" variant="secondary" onPress={resetFlow} style={styles.fullWidth} /> : null}
              </View>
            ) : null}
          </Surface>

          <Surface variant="glass" tone="panel" style={styles.manualPanel}>
            <View style={styles.manualHead}>
              <View style={styles.manualIcon}><ClipboardEdit size={19} color={colors.secondary[400]} strokeWidth={2} /></View>
              <View style={styles.manualCopy}>
                <Text style={styles.manualTitle}>Continue with Manual Check-In</Text>
                <Text style={styles.manualBody}>Record observations by hand using the records already saved on this device. Identification is optional.</Text>
              </View>
            </View>
            <PrimaryButton label="Continue with Manual Check-In" variant="secondary" Icon={ClipboardEdit} disabled={busy} onPress={handleManual} />
            <Text style={styles.manualNote}>No QR code, camera, card tap, or wearable is required.</Text>
          </Surface>
        </View>
      </View>

      <View style={styles.footnote}>
        <ShieldCheck size={13} color={colors.slate[500]} strokeWidth={2} />
        <Text style={styles.footnoteText}>Identification selects a fictional crew identity for local demonstration records. It does not authenticate a real astronaut, read a wearable, or transmit biometric data. Simulated crew loading never overwrites saved device records.</Text>
      </View>
    </ScreenContainer>
  );
}

const webPointer = Platform.OS === 'web' ? ({ cursor: 'pointer' } as ViewStyle) : {};

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 32, paddingHorizontal: 2, ...webPointer },
  backHover: { opacity: 0.8 },
  backLabel: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 17, color: colors.primary[300] },
  columns: { gap: 18 },
  columnsDesktop: { flexDirection: 'row', alignItems: 'flex-start', gap: layout.sectionGap },
  crewCard: { minWidth: 0, gap: 18, padding: 22 },
  crewCardDesktop: { flex: 1 },
  crewTop: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  avatar: {
    width: 64, height: 64, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(0, 214, 198, 0.42)',
    backgroundColor: 'rgba(0, 214, 198, 0.14)', alignItems: 'center', justifyContent: 'center',
    ...(Platform.OS === 'web' ? { boxShadow: '0 0 26px rgba(0, 214, 198, 0.22)' } as ViewStyle : {}),
  },
  avatarText: { fontFamily: fonts.semibold, fontSize: 21, lineHeight: 26, letterSpacing: 0.8, color: colors.primary[300] },
  crewHead: { gap: 3, flexShrink: 1, minWidth: 0 },
  crewName: { ...typography.headline, fontSize: 26, lineHeight: 32, color: colors.offWhite },
  crewRole: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, color: colors.slate[300] },
  crewMission: { fontFamily: fonts.mono, fontSize: 10, lineHeight: 15, letterSpacing: 0.5, color: colors.primary[300], textTransform: 'uppercase' },
  factGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  fact: {
    flexGrow: 1, flexBasis: 130, gap: 4, padding: 12, borderRadius: radius.md,
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.09)', backgroundColor: 'rgba(4, 16, 28, 0.46)',
  },
  factLabel: { fontFamily: fonts.semibold, fontSize: 8.5, lineHeight: 12, letterSpacing: 0.9, color: colors.slate[500] },
  factValue: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, color: colors.offWhite },
  factValueMono: { fontFamily: fonts.mono, fontSize: 13, lineHeight: 18, letterSpacing: 0.4, color: colors.primary[300] },
  baselineBlock: {
    gap: 10, padding: 14, borderRadius: radius.md,
    borderWidth: 1, borderColor: 'rgba(121, 180, 255, 0.18)', backgroundColor: 'rgba(121, 180, 255, 0.06)',
  },
  blockLabel: { fontFamily: fonts.semibold, fontSize: 9, lineHeight: 13, letterSpacing: 0.9, color: colors.slate[400] },
  baselineRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  baselineCell: { gap: 2, minWidth: 54, flexGrow: 1 },
  baselineLabel: { fontFamily: fonts.mono, fontSize: 8.5, lineHeight: 12, letterSpacing: 0.7, color: colors.slate[500] },
  baselineValue: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 19, color: colors.offWhite, fontVariant: ['tabular-nums'] },
  crewNote: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  crewNoteText: { flex: 1, fontFamily: fonts.regular, fontSize: 11.5, lineHeight: 17, color: colors.slate[400] },
  actionColumn: { minWidth: 0, gap: 18 },
  actionColumnDesktop: { flex: 1.08 },
  actionsPanel: { gap: 16, padding: 20 },
  panelHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
  panelLabel: { fontFamily: fonts.semibold, fontSize: 9.5, lineHeight: 14, letterSpacing: 1, color: colors.slate[400] },
  panelMeta: { fontFamily: fonts.mono, fontSize: 8.5, lineHeight: 12, letterSpacing: 0.4, color: colors.slate[500], textTransform: 'uppercase' },
  methodList: { gap: 10 },
  method: {
    flexDirection: 'row', alignItems: 'center', gap: 13, minHeight: 76, paddingVertical: 12, paddingHorizontal: 13,
    borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.11)',
    backgroundColor: 'rgba(4, 16, 28, 0.46)', ...webPointer,
  },
  methodSelected: { borderColor: 'rgba(0, 214, 198, 0.52)', backgroundColor: 'rgba(0, 214, 198, 0.08)' },
  methodHover: { borderColor: 'rgba(0, 214, 198, 0.36)', backgroundColor: 'rgba(255, 255, 255, 0.05)' },
  methodPressed: { opacity: 0.85 },
  methodDisabled: { opacity: 0.55 },
  methodIcon: {
    width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(0, 214, 198, 0.34)', backgroundColor: 'rgba(0, 214, 198, 0.10)',
  },
  methodIconSelected: { backgroundColor: colors.primary[400], borderColor: colors.primary[300] },
  methodCopy: { flex: 1, gap: 3, minWidth: 0 },
  methodTitle: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 21, color: colors.offWhite },
  methodBody: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, color: colors.slate[400] },
  methodTail: { alignItems: 'flex-end', gap: 7 },
  methodBadge: { fontFamily: fonts.mono, fontSize: 7.5, lineHeight: 10, letterSpacing: 0.7, color: colors.slate[500] },
  qrPanel: {
    gap: 12, padding: 14, borderRadius: radius.md, borderWidth: 1,
    borderColor: 'rgba(0, 214, 198, 0.26)', backgroundColor: 'rgba(2, 12, 21, 0.6)',
  },
  qrLayout: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  qrLayoutStacked: { flexDirection: 'column' },
  qrImageWrap: {
    padding: 8, borderRadius: 12, backgroundColor: '#F9FCFF', alignSelf: 'flex-start',
    ...(Platform.OS === 'web' ? { boxShadow: '0 10px 26px rgba(0, 0, 0, 0.4)' } as ViewStyle : {}),
  },
  qrImageWrapStacked: { alignSelf: 'center' },
  qrCopy: { flex: 1, gap: 8, minWidth: 0 },
  qrTitle: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 19, color: colors.offWhite },
  qrBody: { fontFamily: fonts.regular, fontSize: 11.5, lineHeight: 17, color: colors.slate[400] },
  payloadBox: { padding: 9, borderRadius: radius.sm, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.09)', backgroundColor: 'rgba(255, 255, 255, 0.04)' },
  payloadText: { fontFamily: fonts.mono, fontSize: 9.5, lineHeight: 15, color: colors.primary[300] },
  qrNote: { fontFamily: fonts.regular, fontSize: 10.5, lineHeight: 15, color: colors.slate[500] },
  progressPanel: {
    gap: 12, padding: 14, borderRadius: radius.md, borderWidth: 1,
    borderColor: 'rgba(0, 214, 198, 0.24)', backgroundColor: 'rgba(0, 214, 198, 0.05)',
  },
  progressHead: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  progressIconWrap: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  progressIcon: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(0, 214, 198, 0.42)', backgroundColor: colors.primary[400],
  },
  progressIconError: { borderColor: 'rgba(255, 143, 151, 0.45)', backgroundColor: 'rgba(255, 143, 151, 0.12)' },
  pulseRing: {
    position: 'absolute', width: 40, height: 40, borderRadius: 20, borderWidth: 1,
    borderColor: 'rgba(0, 214, 198, 0.7)', backgroundColor: 'rgba(0, 214, 198, 0.12)',
  },
  progressTitleWrap: { flex: 1, gap: 2, minWidth: 0 },
  progressTitle: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20, color: colors.offWhite },
  progressBody: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 16, color: colors.slate[400] },
  steps: { gap: 8, paddingTop: 2 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepNode: {
    width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.18)', backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  stepNodeActive: { borderColor: 'rgba(0, 214, 198, 0.55)', backgroundColor: 'rgba(0, 214, 198, 0.12)' },
  stepNodeDone: { borderColor: colors.primary[300], backgroundColor: colors.primary[400] },
  stepDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.slate[500] },
  stepLabel: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, color: colors.offWhite },
  stepLabelPending: { color: colors.slate[500] },
  stepLabelDone: { color: colors.slate[200] },
  errorBox: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start', padding: 10, borderRadius: radius.sm,
    borderWidth: 1, borderColor: 'rgba(255, 143, 151, 0.3)', backgroundColor: 'rgba(255, 143, 151, 0.08)',
  },
  errorText: { flex: 1, fontFamily: fonts.regular, fontSize: 11.5, lineHeight: 16, color: colors.error[400] },
  manualPanel: { gap: 14, padding: 18 },
  manualHead: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  manualIcon: {
    width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(121, 180, 255, 0.28)', backgroundColor: 'rgba(121, 180, 255, 0.10)',
  },
  manualCopy: { flex: 1, gap: 3, minWidth: 0 },
  manualTitle: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 21, color: colors.offWhite },
  manualBody: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.slate[400] },
  manualNote: { fontFamily: fonts.regular, fontSize: 10.5, lineHeight: 15, color: colors.slate[500] },
  footnote: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', paddingTop: 2 },
  footnoteText: { flex: 1, fontFamily: fonts.regular, fontSize: 11, lineHeight: 17, color: colors.slate[500] },
  fullWidth: { width: '100%' },
});
