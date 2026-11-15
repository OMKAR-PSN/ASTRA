import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SideRail } from '@/components/SideRail';
import { SyntheticBanner } from '@/components/SyntheticBanner';
import { colors, fonts, layout, spacing, tokens } from '@/constants/theme';
import { crewProfile } from '@/fixtures/crew';
import { useSession } from '@/state/SessionProvider';

type ScreenContainerProps = { title: string; subtitle?: string; children: ReactNode };

export function ScreenContainer({ title, subtitle, children }: ScreenContainerProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= layout.desktopBreakpoint;
  const { linkAvailable, latestCheckIn } = useSession();
  const [expanded, setExpanded] = useState(false);
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);
  const utc = time.toISOString().slice(11, 16);

  return (
    <View style={[styles.root, isDesktop && styles.rootDesktop]}>
      {isDesktop ? <SideRail /> : null}
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.missionHeader}>
          <View style={styles.headerTop}>
            <Text style={styles.wordmark}>ASTRA <Text style={{ color: colors.primary[400] }}>CARE</Text></Text>
            <SyntheticBanner />
            <Text style={styles.utc}>{utc} UTC</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.status}>Local records · {latestCheckIn ? 'Available' : 'Ready'}</Text>
            <Text style={[styles.status, { color: linkAvailable ? colors.secondary[400] : colors.accent[400] }]}>Simulated link · {linkAvailable ? 'Available' : 'Unavailable'}</Text>
            {!isDesktop ? <Pressable accessibilityRole="button" aria-expanded={expanded} onPress={() => setExpanded(!expanded)} style={styles.expand}><Text style={styles.status}>{expanded ? 'Hide mission' : 'Mission details'}</Text></Pressable> : null}
          </View>
          {isDesktop || expanded ? <Text style={styles.mission}>{crewProfile.missionName}  /  FD {crewProfile.missionDay}  /  {crewProfile.name} · Fictional crew</Text> : null}
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.column}>
            <View style={styles.header}>
              <Text accessibilityRole="header" style={[styles.title, !isDesktop && styles.mobileTitle]}>{title}</Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
            {children}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.navy[950] },
  rootDesktop: { flexDirection: 'row' },
  safeArea: { flex: 1, minWidth: 0 },
  scroll: { flex: 1 },
  missionHeader: { paddingHorizontal: spacing.sm, paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.navy[600], backgroundColor: tokens.background.secondary, gap: 8 },
  headerTop: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12 },
  wordmark: { fontFamily: fonts.bold, color: colors.offWhite, fontSize: 18, letterSpacing: 1 },
  utc: { marginLeft: 'auto', fontFamily: fonts.regular, fontVariant: ['tabular-nums'], fontSize: 12, color: colors.slate[300] },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 20, rowGap: 4 },
  status: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.slate[300] },
  mission: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 20, color: colors.slate[300] },
  expand: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  content: { paddingHorizontal: spacing.sm, paddingTop: spacing.sm, paddingBottom: spacing.lg },
  contentDesktop: { paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.lg },
  column: { width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center', gap: spacing.sm },
  header: { gap: 4, marginBottom: 4 },
  title: { fontFamily: fonts.bold, fontSize: 27, lineHeight: 34, color: colors.offWhite },
  mobileTitle: { fontSize: 23, lineHeight: 30 },
  subtitle: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, color: colors.slate[300] },
});
