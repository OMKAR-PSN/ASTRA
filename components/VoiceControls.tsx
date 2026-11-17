import { useRouter } from 'expo-router';
import { Gauge, RotateCcw, Settings2, Square, Volume2, VolumeX } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { colors, fonts, radius, stitch } from '@/constants/theme';
import { VOICE_RATE_LABELS, VOICE_UNAVAILABLE_MESSAGE, type VoiceRequest, type VoiceStatus } from '@/lib/voice/types';
import { useVoiceGuidance } from '@/state/VoiceGuidanceProvider';

type VoiceControlsProps = {
  request: VoiceRequest;
  scope: string;
  listenLabel?: string;
  detail?: 'minimal' | 'full';
  onListen?: () => void;
  style?: ViewStyle;
};

const STATUS_LABEL: Partial<Record<VoiceStatus, string>> = {
  preparing: 'Preparing speech',
  speaking: 'Speaking',
  stopping: 'Stopping',
};

const RATE_CYCLE = { slow: 'normal', normal: 'fast', fast: 'slow' } as const;

function Focusable({
  label,
  Icon,
  onPress,
  accessibilityHint,
  disabled = false,
  primary = false,
}: {
  label: string;
  Icon: LucideIcon;
  onPress: () => void;
  accessibilityHint?: string;
  disabled?: boolean;
  primary?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        styles.button,
        primary && styles.buttonPrimary,
        hovered && !disabled && styles.buttonHover,
        pressed && !disabled && styles.buttonPressed,
        focused && !disabled && styles.buttonFocused,
        disabled && styles.buttonDisabled,
      ]}
    >
      <Icon size={15} color={primary ? colors.primary.ink : colors.primary[300]} strokeWidth={2.2} />
      <Text style={[styles.buttonLabel, primary && styles.buttonLabelPrimary]}>{label}</Text>
    </Pressable>
  );
}

export function VoiceControls({
  request,
  scope,
  listenLabel = 'Listen',
  detail = 'minimal',
  onListen,
  style,
}: VoiceControlsProps) {
  const router = useRouter();
  const {
    snapshot,
    preferences,
    speak,
    replay,
    stop,
    setEnabled,
    setRate,
  } = useVoiceGuidance();

  const active =
    snapshot.activeSourceId === request.sourceId &&
    (snapshot.status === 'preparing' || snapshot.status === 'speaking' || snapshot.status === 'stopping');
  const isLast = snapshot.lastSourceId === request.sourceId;
  const error = !active && isLast ? snapshot.error : null;
  const disabled = !preferences.enabled;
  const listeningLabel = listenLabel.charAt(0) + listenLabel.slice(1).toLowerCase();

  if (!snapshot.supported) {
    return (
      <View style={[styles.strip, styles.stripNotice, style]} accessibilityRole="summary">
        <View style={styles.noticeRow}>
          <VolumeX size={15} color={colors.accent[400]} strokeWidth={2} />
          <Text style={styles.noticeText}>{snapshot.unavailableReason ?? VOICE_UNAVAILABLE_MESSAGE}</Text>
        </View>
      </View>
    );
  }

  if (disabled) {
    return (
      <View style={[styles.strip, style]} accessibilityRole="summary" accessibilityLabel="Voice guidance is off">
        <View style={styles.noticeRow}>
          <VolumeX size={15} color={colors.slate[400]} strokeWidth={2} />
          <Text style={styles.offText}>Voice guidance is off. Every answer and control still works without audio.</Text>
        </View>
        <View style={styles.row}>
          <Focusable label="Turn on" Icon={Volume2} onPress={() => setEnabled(true)} />
          <Focusable
            label="Settings"
            Icon={Settings2}
            onPress={() => router.push('/voice-settings')}
            accessibilityHint="Opens voice guidance settings."
          />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.strip, style]} accessibilityRole="group" accessibilityLabel="Voice guidance controls">
      <View style={styles.row}>
        {active ? (
          <Focusable
            label="Stop"
            Icon={Square}
            onPress={() => { void stop(); }}
            accessibilityHint="Stops the current speech."
          />
        ) : (
          <Focusable
            label={listenLabel}
            Icon={Volume2}
            onPress={() => { onListen?.(); speak(request, scope); }}
            accessibilityHint={`Reads ${request.label} aloud. The same text stays visible on screen.`}
            primary
          />
        )}
        {!active && isLast ? (
          <Focusable
            label="Replay"
            Icon={RotateCcw}
            onPress={() => { onListen?.(); replay(scope); }}
            accessibilityHint="Reads the same text aloud again."
          />
        ) : null}
        {active ? (
          <View style={styles.speaking} accessibilityLiveRegion="polite">
            <View style={styles.wave} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              {[6, 11, 15, 9, 5].map((height, index) => (
                <View key={index} style={[styles.waveBar, { height }]} />
              ))}
            </View>
            <Text style={styles.statusText}>{STATUS_LABEL[snapshot.status] ?? 'Speaking'}</Text>
          </View>
        ) : null}
      </View>

      {detail === 'full' ? (
        <View style={styles.row}>
          <Focusable
            label={`Speed · ${VOICE_RATE_LABELS[preferences.rate]}`}
            Icon={Gauge}
            onPress={() => setRate(RATE_CYCLE[preferences.rate])}
            accessibilityHint="Cycles reading speed between slow, normal and fast."
          />
          <Focusable
            label="Voice off"
            Icon={VolumeX}
            onPress={() => setEnabled(false)}
            accessibilityHint="Turns voice guidance off. Nothing is read automatically."
          />
          <Focusable
            label="Settings"
            Icon={Settings2}
            onPress={() => router.push('/voice-settings')}
            accessibilityHint="Opens voice guidance settings."
          />
        </View>
      ) : null}

      {error ? (
        <View style={styles.errorRow} accessibilityRole="alert">
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.errorHint}>
            {listeningLabel} stays available to retry. Visible text is unchanged.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    gap: 8,
    padding: 9,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: stitch.glassBorder,
    backgroundColor: 'rgba(8, 26, 42, 0.62)',
  },
  stripNotice: { borderColor: 'rgba(242, 192, 120, 0.3)', backgroundColor: stitch.amberMuted },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  button: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 12,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(0, 214, 198, 0.26)',
    backgroundColor: stitch.cyanMuted,
  },
  buttonPrimary: {
    borderColor: 'rgba(0, 214, 198, 0.55)',
    backgroundColor: colors.primary[400],
  },
  buttonHover: { borderColor: 'rgba(0, 214, 198, 0.5)', backgroundColor: 'rgba(0, 214, 198, 0.24)' },
  buttonPressed: { opacity: 0.88 },
  buttonFocused: Platform.OS === 'web'
    ? ({ outlineStyle: 'solid', outlineColor: colors.primary[300], outlineWidth: 2, outlineOffset: 2 } as ViewStyle)
    : { borderColor: colors.primary[300] },
  buttonDisabled: { opacity: 0.5 },
  buttonLabel: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16, letterSpacing: 0.1, color: colors.primary[300] },
  buttonLabelPrimary: { color: colors.primary.ink },
  speaking: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 },
  wave: { flexDirection: 'row', alignItems: 'center', gap: 2.5, height: 16 },
  waveBar: { width: 2.5, borderRadius: 2, backgroundColor: 'rgba(0, 214, 198, 0.72)' },
  statusText: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 15, letterSpacing: 0.4, textTransform: 'uppercase', color: colors.primary[300] },
  noticeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, flexShrink: 1 },
  noticeText: { flex: 1, fontFamily: fonts.regular, fontSize: 11.5, lineHeight: 17, color: colors.accent[400] },
  offText: { flex: 1, fontFamily: fonts.regular, fontSize: 11.5, lineHeight: 17, color: colors.slate[300] },
  errorRow: { gap: 2, borderTopWidth: 1, borderTopColor: 'rgba(242, 192, 120, 0.22)', paddingTop: 7 },
  errorText: { fontFamily: fonts.regular, fontSize: 11.5, lineHeight: 17, color: colors.accent[400] },
  errorHint: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 16, color: colors.slate[400] },
});
