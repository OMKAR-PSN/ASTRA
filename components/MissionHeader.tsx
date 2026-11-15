import { useEffect, useState } from 'react';
import { Clock3, Database, UserRound, Radio } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Surface } from '@/components/Surface';
import { SyntheticBanner } from '@/components/SyntheticBanner';
import { colors, fonts, stitch } from '@/constants/theme';
import { crewProfile } from '@/fixtures/crew';
import { useSession } from '@/state/SessionProvider';

export function MissionHeader({ desktop }: { desktop: boolean }) {
  const { latestCheckIn, linkAvailable } = useSession();
  const [expanded, setExpanded] = useState(false);
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  return (
    <Surface testID="mission-header" variant="glass" padded={false} style={styles.header}>
      <View style={styles.top}>
        <View style={styles.brandBlock}>
          <Text style={styles.brand}>ASTRA <Text style={styles.cyan}>CARE</Text> <Text style={styles.day}>/ FD {crewProfile.missionDay}</Text></Text>
          {desktop ? <Text style={styles.meta}>{crewProfile.missionName}</Text> : null}
        </View>
        <SyntheticBanner />
        <View style={styles.clock}><Clock3 size={14} color={colors.slate[300]} /><Text style={styles.meta}>{time.toISOString().slice(11, 16)} UTC</Text></View>
        {desktop ? <View style={styles.identity}><UserRound size={19} color={colors.primary[400]} /><Text style={styles.name}>{crewProfile.name}</Text></View> : null}
      </View>
      <View style={styles.statuses}>
        <View style={styles.inline}><Database size={13} color={colors.primary[400]} /><Text style={styles.meta}>Local records · {latestCheckIn ? 'Available' : 'Ready'}</Text></View>
        <View style={styles.inline}><Radio size={13} color={colors.accent[400]} /><Text style={styles.meta}>Simulated link · {linkAvailable ? 'Available' : 'Unavailable'}</Text></View>
        {!desktop ? <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded(!expanded)} style={styles.expand}><Text style={styles.cyan}>{expanded ? 'Hide mission' : 'Mission details'}</Text></Pressable> : null}
      </View>
      {expanded && !desktop ? <Text style={styles.meta}>{crewProfile.missionName} · {crewProfile.name} · {crewProfile.role} · Fictional crew</Text> : null}
    </Surface>
  );
}
const styles = StyleSheet.create({
  header: { borderRadius: 0, borderTopWidth: 0, borderLeftWidth: 0, borderRightWidth: 0, paddingHorizontal: 20, paddingVertical: 12, gap: 10 },
  top: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 },
  brandBlock: { gap: 4, marginRight: 'auto' },
  brand: { fontFamily: fonts.bold, color: colors.offWhite, fontSize: 16, letterSpacing: 1 },
  day: { fontFamily: fonts.mono, fontSize: 12, color: colors.slate[300], letterSpacing: 0 },
  cyan: { color: colors.primary[400], fontFamily: fonts.semibold, fontSize: 12 },
  meta: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.slate[300] },
  clock: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  identity: { flexDirection: 'row', gap: 8, alignItems: 'center', padding: 8, borderRadius: 8, backgroundColor: stitch.cyanMuted },
  name: { fontFamily: fonts.semibold, fontSize: 13, color: colors.offWhite },
  statuses: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 20, rowGap: 4 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  expand: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
});
