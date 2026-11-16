import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View, Platform, type ViewStyle } from 'react-native';
import { ScanLine, X } from 'lucide-react-native';

import { colors, fonts, radius } from '@/constants/theme';
import { demoCrewIdentity } from '@/fixtures/demoCrew';
import { usePresentation } from '@/state/PresentationSession';

export function DemoModeBanner() {
  const { active, activeCrewId, exit } = usePresentation();
  const router = useRouter();
  if (!active) return null;
  const crewId = activeCrewId === demoCrewIdentity.crewId ? demoCrewIdentity.crewId : activeCrewId;

  return (
    <View style={styles.wrap} accessibilityRole="status" accessibilityLabel="Fictional crew synthetic demo data is active">
      <View style={styles.banner}>
        <View style={styles.dot} />
        <View style={styles.copy}>
          <Text style={styles.label}>FICTIONAL CREW — SYNTHETIC DEMO DATA</Text>
          <Text style={styles.meta}>{crewId} · Session-only fixture · Saved records unchanged</Text>
        </View>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Identify a crew member again"
          onPress={() => router.navigate('/identify')}
          style={({ hovered }: { hovered?: boolean }) => [styles.action, hovered && styles.actionHover]}
        >
          <ScanLine size={12} color={colors.primary[300]} strokeWidth={2.2} />
          <Text style={styles.actionLabel}>Identify</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Exit demo crew session"
          onPress={exit}
          style={({ hovered }: { hovered?: boolean }) => [styles.exit, hovered && styles.actionHover]}
        >
          <X size={13} color={colors.slate[300]} strokeWidth={2.2} />
        </Pressable>
      </View>
    </View>
  );
}

const webPointer = Platform.OS === 'web' ? ({ cursor: 'pointer' } as ViewStyle) : {};

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 8 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 40,
    paddingVertical: 6,
    paddingLeft: 12,
    paddingRight: 6,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(0, 214, 198, 0.34)',
    backgroundColor: 'rgba(0, 214, 198, 0.09)',
    ...(Platform.OS === 'web' ? { boxShadow: '0 10px 26px rgba(0, 0, 0, 0.24)' } as ViewStyle : {}),
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary[400],
    ...(Platform.OS === 'web' ? { boxShadow: '0 0 10px rgba(0, 214, 198, 0.9)' } as ViewStyle : {}),
  },
  copy: { flex: 1, minWidth: 0, gap: 1 },
  label: { fontFamily: fonts.mono, fontSize: 9, lineHeight: 13, letterSpacing: 0.8, color: colors.primary[300] },
  meta: { fontFamily: fonts.regular, fontSize: 10, lineHeight: 14, color: colors.slate[400] },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 28,
    paddingHorizontal: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(0, 214, 198, 0.3)',
    ...webPointer,
  },
  actionHover: { backgroundColor: 'rgba(255, 255, 255, 0.08)' },
  actionLabel: { fontFamily: fonts.semibold, fontSize: 10.5, lineHeight: 15, color: colors.primary[300] },
  exit: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, ...webPointer },
});
