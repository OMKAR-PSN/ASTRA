import { CircleCheck, Clock, Send, TriangleAlert, Wifi, WifiOff } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, stitch } from '@/constants/theme';
import type { DeliveryStatus } from '@/types/astra';

type Tone = 'primary' | 'accent' | 'success' | 'error' | 'neutral';

const toneColor: Record<Tone, string> = {
  primary: colors.primary[400],
  accent: colors.accent[400],
  success: colors.success[400],
  error: colors.error[400],
  neutral: colors.slate[300],
};

const toneBackground: Record<Tone, string> = {
  primary: stitch.cyanMuted,
  accent: stitch.amberMuted,
  success: stitch.greenMuted,
  error: stitch.redMuted,
  neutral: 'rgba(169, 189, 206, 0.10)',
};

type StatusPillProps = {
  label: string;
  tone: Tone;
  Icon?: LucideIcon;
};

export function StatusPill({ label, tone, Icon }: StatusPillProps) {
  const color = toneColor[tone];
  return (
    <View style={[styles.pill, { borderColor: color + '4D', backgroundColor: toneBackground[tone] }]}>
      {Icon ? <Icon size={12} color={color} strokeWidth={2.2} /> : null}
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

export const deliveryStatusDisplay: Record<DeliveryStatus, { label: string; tone: Tone; Icon: LucideIcon }> = {
  queued: { label: 'Queued · Not delivered', tone: 'accent', Icon: Clock },
  sending: { label: 'Sending', tone: 'primary', Icon: Send },
  failed: { label: 'Failed', tone: 'error', Icon: TriangleAlert },
  acknowledged: { label: 'Acknowledged', tone: 'success', Icon: CircleCheck },
};

type LinkIndicatorProps = {
  available: boolean;
};

export function LinkIndicator({ available }: LinkIndicatorProps) {
  return available ? (
    <StatusPill label="Simulated link available" tone="primary" Icon={Wifi} />
  ) : (
    <StatusPill label="Simulated link unavailable" tone="accent" Icon={WifiOff} />
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 9,
  },
  pillText: {
    fontFamily: fonts.semibold,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 0.35,
  },
});
