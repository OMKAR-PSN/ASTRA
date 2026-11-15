import { useEffect, useState } from 'react';
import { Clock3, Database, Orbit, Radio } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View, type ViewStyle, Platform } from 'react-native';

import { Surface } from '@/components/Surface';
import { SyntheticBanner } from '@/components/SyntheticBanner';
import { colors, fonts } from '@/constants/theme';
import { crewProfile } from '@/fixtures/crew';
import { usePresentation } from '@/state/PresentationSession';
import { useSession } from '@/state/SessionProvider';

const initials = crewProfile.name.split(' ').map((part) => part[0]).slice(0, 2).join('');

function StatusChip({ Icon, label, dot, style }: { Icon?: LucideIcon; label: string; dot?: string; style?: ViewStyle }) {
  return <View style={[styles.chip, style]}>
    {dot ? <View style={[styles.dot, { backgroundColor: dot }]} /> : Icon ? <Icon size={12} color={colors.slate[400]} strokeWidth={2} /> : null}
    <Text style={styles.chipLabel} numberOfLines={1}>{label}</Text>
  </View>;
}

export function MissionHeader({ desktop }: { desktop: boolean }) {
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
      <View style={[styles.top, desktop && styles.topDesktop]}>
        <View style={styles.brandBlock}>
          <View style={styles.brandIcon}><Orbit size={desktop ? 18 : 16} color={colors.primary[400]} strokeWidth={2.2} /></View>
          <View style={styles.brandText}>
            <View style={styles.brandLine}>
              <Text style={styles.brand}>ASTRA CARE</Text>
              <Text style={styles.brandTag}>CLINICAL</Text>
              <Text style={styles.day}>/ FD {crewProfile.missionDay}</Text>
            </View>
            {desktop ? <Text style={styles.mission} numberOfLines={1}>{crewProfile.missionName} · Flight Day {crewProfile.missionDay}</Text> : null}
          </View>
        </View>

        {desktop ? <View style={styles.actions}>
          <SyntheticBanner />
          <StatusChip Icon={Clock3} label={`${time.toISOString().slice(11, 16)} UTC`} />
          <StatusChip Icon={Database} label={recordsLabel} dot={colors.success[400]} />
          <StatusChip Icon={Radio} label={linkAvailable ? 'Link available' : 'Link unavailable'} dot={linkAvailable ? colors.success[400] : colors.accent[400]} />
          {presentation.active ? <Pressable accessibilityRole="button" onPress={presentation.exit} style={styles.exit}><Text style={styles.exitLabel}>Exit demo</Text></Pressable> : null}
          <View style={styles.identity}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>
            <View style={styles.identityText}>
              <Text style={styles.name} numberOfLines={1}>{crewProfile.name}</Text>
              <Text style={styles.role} numberOfLines={1}>{crewProfile.role}</Text>
            </View>
          </View>
        </View> : <View style={styles.mobileActions}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>
        </View>}
      </View>

      {!desktop ? <>
        <View style={styles.mobileRow}>
          <Text style={styles.mobileMission} numberOfLines={1}>CREW HEALTH · {crewProfile.missionName.toUpperCase()}</Text>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded(!expanded)} style={styles.expand}>
            <Text style={styles.expandLabel}>{expanded ? 'Hide details' : 'Details'}</Text>
          </Pressable>
        </View>
        <View style={styles.mobileStatusRow}>
          <SyntheticBanner />
          <View style={styles.mobileStatus}>
            <View style={[styles.dot, { backgroundColor: linkAvailable ? colors.success[400] : colors.accent[400] }]} />
            <Text style={styles.mobileStatusLabel}>{linkAvailable ? 'Link available' : 'Link unavailable'}</Text>
          </View>
          <View style={styles.mobileStatus}>
            <View style={[styles.dot, { backgroundColor: latestCheckIn ? colors.success[400] : colors.slate[500] }]} />
            <Text style={styles.mobileStatusLabel}>{latestCheckIn ? 'Records saved' : 'No records'}</Text>
          </View>
        </View>
      </> : null}
      {expanded && !desktop ? <View style={styles.expanded}>
        <Text style={styles.expandedText}>{time.toISOString().slice(11, 16)} UTC · {recordsLabel}</Text>
        <Text style={styles.expandedText}>{crewProfile.missionName} · {crewProfile.name} · {crewProfile.role} · Fictional crew</Text>
        {presentation.active ? <Pressable accessibilityRole="button" onPress={presentation.exit} style={styles.expand}><Text style={styles.exitLabel}>Exit presentation demo</Text></Pressable> : null}
      </View> : null}
    </Surface>
  );
}

const styles = StyleSheet.create({
  header: {
    borderRadius: 0,
    borderWidth: 0,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(80, 222, 216, 0.10)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    zIndex: 5,
  },
  desktopHeader: { paddingHorizontal: 24, paddingVertical: 0, minHeight: 72, justifyContent: 'center' },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  topDesktop: { width: '100%', gap: 20 },
  brandBlock: { flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0, flexShrink: 1 },
  brandIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(80, 222, 216, 0.25)',
    backgroundColor: 'rgba(80, 222, 216, 0.09)',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { boxShadow: '0 0 14px rgba(80, 222, 216, 0.18)' } as ViewStyle : {}),
  },
  brandText: { gap: 1, minWidth: 0 },
  brandLine: { flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' },
  brand: { fontFamily: fonts.semibold, color: colors.offWhite, fontSize: 13, lineHeight: 18, letterSpacing: 0.9 },
  brandTag: {
    fontFamily: fonts.mono,
    fontSize: 8,
    lineHeight: 12,
    letterSpacing: 0.6,
    color: colors.primary[300],
    borderWidth: 1,
    borderColor: 'rgba(80, 222, 216, 0.28)',
    backgroundColor: 'rgba(80, 222, 216, 0.08)',
    borderRadius: 4,
    paddingHorizontal: 5,
    overflow: 'hidden',
  },
  day: { fontFamily: fonts.mono, fontSize: 10, lineHeight: 16, color: colors.slate[400], letterSpacing: 0.2 },
  mission: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 16, color: colors.slate[400] },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8, flexShrink: 1, flexWrap: 'wrap', marginLeft: 'auto', maxWidth: '70%' },
  mobileActions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 'auto' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(40, 60, 80, 0.75)',
    backgroundColor: 'rgba(36, 55, 68, 0.32)',
    maxWidth: 210,
  },
  chipLabel: { fontFamily: fonts.mono, fontSize: 10, lineHeight: 14, color: colors.slate[300], letterSpacing: 0.1 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 5,
    paddingLeft: 5,
    paddingRight: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(40, 60, 80, 0.8)',
    backgroundColor: 'rgba(13, 34, 46, 0.55)',
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'rgba(80, 222, 216, 0.38)',
    backgroundColor: 'rgba(80, 222, 216, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.semibold, fontSize: 10, lineHeight: 14, color: colors.primary[300], letterSpacing: 0.4 },
  identityText: { gap: 0, minWidth: 0 },
  name: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16, color: colors.offWhite },
  role: { fontFamily: fonts.semibold, fontSize: 8, lineHeight: 12, letterSpacing: 0.7, textTransform: 'uppercase', color: colors.primary[400] },
  exit: { minHeight: 32, justifyContent: 'center', paddingHorizontal: 6 },
  exitLabel: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 16, color: colors.primary[300] },
  mobileRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  mobileMission: { fontFamily: fonts.semibold, fontSize: 9, lineHeight: 13, letterSpacing: 0.8, color: colors.slate[400], textTransform: 'uppercase', flexShrink: 1 },
  mobileStatusRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12 },
  mobileStatus: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  mobileStatusLabel: { fontFamily: fonts.mono, fontSize: 9, lineHeight: 13, color: colors.slate[300] },
  expand: { minHeight: 32, justifyContent: 'center', paddingHorizontal: 6 },
  expandLabel: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 16, color: colors.primary[300] },
  expanded: { gap: 4, paddingTop: 4 },
  expandedText: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 16, color: colors.slate[400] },
});
