import { Activity, Database } from 'lucide-react-native';
import { useSession } from '@/state/SessionProvider';
import { usePathname, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, layout, radius, spacing } from '@/constants/theme';
import { crewProfile } from '@/fixtures/crew';
import { navItems } from '@/constants/navigation';

export function SideRail() {
  const { checkIns, reports } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <View style={styles.rail}>
      <View style={styles.brandRow}><Activity size={28} color={colors.primary[400]} /><View><Text style={styles.brand}>ASTRA CARE</Text><Text style={styles.caption}>CREW OPERATIONS</Text></View></View>
      <View style={styles.list}>
        {navItems.map(({ href, desktopLabel, Icon }) => {
          const active = pathname === href || (href === '/delivery' && pathname === '/report');
          return (
            <Pressable
              key={href}
              accessibilityRole="link"
              accessibilityState={{ selected: active }}
              onPress={() => router.navigate(href)}
              style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                styles.item,
                active && styles.itemActive,
                (hovered || pressed) && !active && styles.itemHover,
              ]}
            >
              <Icon size={20} color={active ? colors.primary.ink : colors.slate[300]} strokeWidth={2} />
              <Text style={[styles.itemLabel, active && styles.itemLabelActive]}>{desktopLabel}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.footer}><View style={styles.storage}><Database size={18} color={colors.primary[400]} /><Text style={styles.caption}>LOCAL RECORDS</Text><Text style={styles.caption}>{checkIns.length} check-ins · {reports.length} reports</Text></View><Text style={styles.caption}>{crewProfile.missionName}</Text><Text style={styles.caption}>Fictional crew · Synthetic demo</Text></View>
    </View>
  );
}

const styles = StyleSheet.create({
  brandRow: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  storage: { padding: 12, gap: 8, backgroundColor: colors.navy[800], borderRadius: 12, borderWidth: 1, borderColor: colors.navy[600] },
  caption: { fontFamily: fonts.regular, color: colors.slate[300], fontSize: 12, lineHeight: 19, paddingHorizontal: 8 },
  footer: { marginTop: 'auto', paddingVertical: 24, gap: 8 },
  rail: {
    width: layout.railWidth,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.sm,
    borderRightWidth: 1,
    borderRightColor: colors.navy[600],
    backgroundColor: '#0D1828',
    gap: spacing.md,
  },
  brand: {
    fontFamily: fonts.bold,
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 1.5,
    color: colors.offWhite,
    paddingHorizontal: spacing.xs,
  },
  list: {
    gap: spacing.xs,
  },
  item: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.md,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  itemActive: {
    backgroundColor: colors.primary[400],
    borderLeftColor: colors.primary[400],
  },
  itemHover: {
    backgroundColor: colors.navy[800],
  },
  itemLabel: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 22,
    color: colors.slate[300],
  },
  itemLabelActive: {
    fontFamily: fonts.semibold,
    color: colors.primary.ink,
  },
});
