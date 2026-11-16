import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Clock3, Database, Orbit, Radio, Rocket, ScanLine } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View, type ViewStyle, Platform } from 'react-native';

import { Surface } from '@/components/Surface';
import { SyntheticBanner } from '@/components/SyntheticBanner';
import { colors, fonts, stitch } from '@/constants/theme';
import { crewProfile } from '@/fixtures/crew';
import { usePresentation } from '@/state/PresentationSession';
import { useSession } from '@/state/SessionProvider';

const initials = crewProfile.name.split(' ').map((part) => part[0]).slice(0, 2).join('');
const missionName = crewProfile.missionName.replace(' (simulated)', '');

function StatusChip({ Icon, label, dot }: { Icon?: LucideIcon; label: string; dot?: string }) {
  return <View style={styles.chip}>
    {dot ? <View style={[styles.dot, { backgroundColor: dot }]} /> : Icon ? <Icon size={12} color={colors.slate[400]} strokeWidth={2} /> : null}
    <Text style={styles.chipLabel} numberOfLines={1}>{label}</Text>
  </View>;
}

export function MissionHeader({ desktop }: { desktop: boolean }) {
  const router = useRouter();
  const presentation = usePresentation();
  const { latestCheckIn, linkAvailable } = useSession();
  const [expanded, setExpanded] = useState(false);
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  const recordsLabel = presentation.active ? 'Demo records · Session' : `Local records · ${latestCheckIn ? 'Available' : 'Ready'}`;
  return (
    <Surface testID="mission-header" variant="glass" padded={false} style={[styles.header, desktop && styles.desktopHeader]}>
      {desktop ? (
        <View style={styles.topDesktop}>
          <View style={styles.missionBlock}>
            <View style={styles.missionIcon}><Rocket size={17} color={colors.primary[300]} strokeWidth={2.1} /></View>
            <View style={styles.missionText}>
              <Text style={styles.missionName} numberOfLines={1}>{missionName}</Text>
              <View style={styles.missionMeta}>
                <Text style={styles.missionMetaText}>Flight Day {crewProfile.missionDay}</Text>
                <View style={styles.metaDivider} />
                <Text style={styles.missionMetaText}>SIMULATED TRANSIT</Text>
              </View>
            </View>
          </View>

          <View style={styles.actions}>
            <SyntheticBanner />
            <StatusChip Icon={Clock3} label={`${time.toISOString().slice(11, 16)} UTC`} />
            <View style={styles.divider} />
            <StatusChip Icon={Database} label={recordsLabel} dot={colors.success[400]} />
            <StatusChip Icon={Radio} label={linkAvailable ? 'Simulated connection' : 'Simulated link off'} dot={linkAvailable ? colors.success[400] : colors.accent[400]} />
            {presentation.active ? <Pressable accessibilityRole="button" onPress={presentation.exit} style={styles.exit}><Text style={styles.exitLabel}>Exit demo</Text></Pressable> : null}
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="Identify crew member"
              onPress={() => router.navigate('/identify')}
              style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [styles.identity, (hovered || pressed) && styles.identityHover]}
            >
              <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>
              <View style={styles.identityText}>
                <Text style={styles.name} numberOfLines={1}>{crewProfile.name}</Text>
                <Text style={styles.role} numberOfLines={1}>Astronaut · Systems</Text>
              </View>
              <ScanLine size={14} color={colors.primary[300]} strokeWidth={2} />
            </Pressable>
          </View>
        </View>
      ) : (
        <>
          <View style={styles.mobileTop}>
            <View style={styles.mobileBrand}>
              <View style={styles.mobileBrandIcon}><Orbit size={17} color={colors.primary[300]} strokeWidth={2.1} /></View>
              <Text style={styles.mobileBrandText}>ASTRA CARE</Text>
            </View>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="Identify crew member"
              onPress={() => router.navigate('/identify')}
              style={({ pressed }: { pressed: boolean }) => [styles.avatar, pressed && styles.avatarPressed]}
            >
              <Text style={styles.avatarText}>{initials}</Text>
            </Pressable>
          </View>
          <View style={styles.mobileRow}>
            <View style={styles.mobileMissionWrap}>
              <Text style={styles.mobileMission} numberOfLines={1}>{missionName} · FD {crewProfile.missionDay}</Text>
              <SyntheticBanner />
            </View>
            <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded(!expanded)} style={styles.expand}>
              <Text style={styles.expandLabel}>{expanded ? 'Hide' : 'Details'}</Text>
            </Pressable>
          </View>
        </>
      )}
      {expanded && !desktop ? <View style={styles.expanded}>
        <Text style={styles.expandedText}>{time.toISOString().slice(11, 16)} UTC · {recordsLabel} · {linkAvailable ? 'Simulated link available' : 'Simulated link unavailable'}</Text>
        <Text style={styles.expandedText}>{crewProfile.missionName} · {crewProfile.name} · {crewProfile.role} · Fictional crew</Text>
        <Pressable accessibilityRole="link" accessibilityLabel="Identify crew member" onPress={() => router.navigate('/identify')} style={styles.expand}>
          <Text style={styles.expandLabel}>Identify crew member</Text>
        </Pressable>
        {presentation.active ? <Pressable accessibilityRole="button" onPress={presentation.exit} style={styles.expand}><Text style={styles.exitLabel}>Exit presentation demo</Text></Pressable> : null}
      </View> : null}
    </Surface>
  );
}

const styles = StyleSheet.create({
  header: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 9,
    zIndex: 5,
  },
  desktopHeader: { paddingHorizontal: 16, minHeight: 64, justifyContent: 'center', ...(Platform.OS === 'web' ? { boxShadow: stitch.shadowSoft } as ViewStyle : {}) },
  topDesktop: { flexDirection: 'row', alignItems: 'center', gap: 16, width: '100%' },
  missionBlock: { flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 },
  missionIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(0, 214, 198, 0.28)',
    backgroundColor: 'rgba(0, 214, 198, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  missionText: { gap: 2, minWidth: 0 },
  missionName: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 19, color: colors.offWhite, letterSpacing: 0.1 },
  missionMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  missionMetaText: { fontFamily: fonts.mono, fontSize: 9, lineHeight: 13, letterSpacing: 0.5, color: colors.slate[400] },
  metaDivider: { width: 1, height: 10, backgroundColor: 'rgba(255, 255, 255, 0.16)' },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8, flexShrink: 1, flexWrap: 'wrap', marginLeft: 'auto' },
  divider: { width: 1, height: 20, backgroundColor: 'rgba(255, 255, 255, 0.12)' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.09)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    maxWidth: 200,
  },
  chipLabel: { fontFamily: fonts.mono, fontSize: 9.5, lineHeight: 14, color: colors.slate[300], letterSpacing: 0.1 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
    paddingLeft: 4,
    paddingRight: 10,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  identityHover: { borderColor: 'rgba(0, 214, 198, 0.32)', backgroundColor: 'rgba(0, 214, 198, 0.09)' },
  avatarPressed: { opacity: 0.78 },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 214, 198, 0.40)',
    backgroundColor: 'rgba(0, 214, 198, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.semibold, fontSize: 10, lineHeight: 14, color: colors.primary[300], letterSpacing: 0.4 },
  identityText: { gap: 0, minWidth: 0 },
  name: { fontFamily: fonts.semibold, fontSize: 11.5, lineHeight: 15, color: colors.offWhite },
  role: { fontFamily: fonts.semibold, fontSize: 7.5, lineHeight: 11, letterSpacing: 0.6, textTransform: 'uppercase', color: colors.primary[400] },
  exit: { minHeight: 30, justifyContent: 'center', paddingHorizontal: 4 },
  exitLabel: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 16, color: colors.primary[300] },
  mobileTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  mobileBrand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mobileBrandIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 214, 198, 0.30)',
    backgroundColor: 'rgba(0, 214, 198, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileBrandText: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 18, letterSpacing: 1.2, color: colors.offWhite },
  mobileRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  mobileMissionWrap: { gap: 6, flexShrink: 1, minWidth: 0 },
  mobileMission: { fontFamily: fonts.mono, fontSize: 9, lineHeight: 13, letterSpacing: 0.5, color: colors.slate[400], textTransform: 'uppercase' },
  expand: { minHeight: 30, justifyContent: 'center', paddingHorizontal: 5 },
  expandLabel: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 16, color: colors.primary[300] },
  expanded: { gap: 4, paddingTop: 2 },
  expandedText: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 16, color: colors.slate[400] },
});
