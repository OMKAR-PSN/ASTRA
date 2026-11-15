import { Database, Orbit } from 'lucide-react-native';
import { usePathname, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View, type ViewStyle, Platform } from 'react-native';

import { Surface } from '@/components/Surface';
import { colors, fonts, layout, radius, spacing, stitch } from '@/constants/theme';
import { crewProfile } from '@/fixtures/crew';
import { navItems } from '@/constants/navigation';
import { useSession } from '@/state/SessionProvider';

export function SideRail() {
  const { checkIns, reports } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const acknowledged = reports.filter((report) => report.status === 'acknowledged').length;

  return (
    <Surface variant="glass" padded={false} style={styles.rail}>
      <View style={styles.brandRow}>
        <View style={styles.brandIcon}><Orbit size={20} color={colors.primary[400]} strokeWidth={2.2} /></View>
        <View style={styles.brandText}>
          <Text style={styles.brand}>ASTRA CARE</Text>
          <Text style={styles.caption} numberOfLines={1}>{crewProfile.missionName.replace(' (simulated)', '').toUpperCase()}</Text>
        </View>
      </View>

      <Text style={styles.navLabel}>Mission console</Text>
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
              <Icon size={18} color={active ? colors.primary.ink : colors.slate[300]} strokeWidth={2.1} />
              <Text style={[styles.itemLabel, active && styles.itemLabelActive]}>{desktopLabel}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.footer}>
        <View style={styles.storage}>
          <View style={styles.storageHeader}>
            <View style={styles.inline}><Database size={13} color={colors.primary[400]} strokeWidth={2} /><Text style={styles.storageLabel}>LOCAL RECORDS</Text></View>
            <View style={styles.okPill}><View style={styles.okDot} /><Text style={styles.okText}>OFFLINE OK</Text></View>
          </View>
          <View style={styles.storageRow}><Text style={styles.storageMeta}>Check-ins</Text><Text style={styles.storageValue}>{checkIns.length}</Text></View>
          <View style={styles.storageRow}><Text style={styles.storageMeta}>Reports</Text><Text style={styles.storageValue}>{reports.length}</Text></View>
          <View style={styles.storageRule} />
          <View style={styles.storageRow}><Text style={styles.storageMeta}>Acknowledged</Text><Text style={styles.storageValue}>{acknowledged}</Text></View>
        </View>
        <View style={styles.versionBlock}>
          <Text style={styles.version}>v1.0 · Space Apps Demo</Text>
          <Text style={styles.protocol}>Fictional crew · Synthetic protocol</Text>
        </View>
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  rail: {
    width: layout.railWidth,
    height: '100%',
    paddingTop: spacing.sm + 4,
    paddingHorizontal: 12,
    paddingBottom: spacing.sm,
    borderWidth: 0,
    borderRightWidth: 1,
    borderRightColor: 'rgba(80, 222, 216, 0.08)',
    borderRadius: 0,
    backgroundColor: stitch.glassRail,
    gap: spacing.sm,
    zIndex: 6,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 6,
    paddingTop: 4,
    paddingBottom: 6,
  },
  brandIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(80, 222, 216, 0.25)',
    backgroundColor: 'rgba(80, 222, 216, 0.09)',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { boxShadow: '0 0 16px rgba(80, 222, 216, 0.16)' } as ViewStyle : {}),
  },
  brandText: { gap: 2, minWidth: 0, flexShrink: 1 },
  brand: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 15, letterSpacing: 1.5, color: colors.primary[300] },
  caption: { fontFamily: fonts.mono, fontSize: 9, lineHeight: 14, letterSpacing: 0.6, color: colors.slate[500] },
  navLabel: {
    fontFamily: fonts.semibold,
    fontSize: 9,
    lineHeight: 13,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: colors.slate[500],
    paddingHorizontal: 10,
    marginTop: 2,
  },
  list: { gap: 3 },
  item: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 11,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  itemActive: {
    backgroundColor: colors.primary[400],
    borderColor: colors.primary[300],
    ...(Platform.OS === 'web' ? { boxShadow: '0 0 20px rgba(80, 222, 216, 0.20)' } as ViewStyle : {}),
  },
  itemHover: {
    backgroundColor: 'rgba(36, 55, 68, 0.55)',
    borderColor: 'rgba(40, 60, 80, 0.8)',
  },
  itemLabel: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    color: colors.slate[300],
  },
  itemLabelActive: {
    fontFamily: fonts.semibold,
    color: colors.primary.ink,
  },
  footer: { marginTop: 'auto', gap: 10, paddingHorizontal: 2, paddingTop: 12 },
  storage: {
    gap: 6,
    padding: 11,
    backgroundColor: 'rgba(9, 29, 42, 0.72)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(141, 187, 255, 0.14)',
  },
  storageHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  storageLabel: { fontFamily: fonts.semibold, fontSize: 8, lineHeight: 12, letterSpacing: 0.9, color: colors.slate[300] },
  okPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 2, paddingHorizontal: 5, borderRadius: 4, backgroundColor: stitch.greenMuted, borderWidth: 1, borderColor: 'rgba(101, 215, 171, 0.28)' },
  okDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.success[400] },
  okText: { fontFamily: fonts.mono, fontSize: 7, lineHeight: 11, letterSpacing: 0.5, color: colors.success[400] },
  storageRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  storageMeta: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 16, color: colors.slate[400] },
  storageValue: { fontFamily: fonts.mono, fontSize: 12, lineHeight: 16, color: colors.offWhite, fontVariant: ['tabular-nums'] },
  storageRule: { height: 1, backgroundColor: 'rgba(40, 60, 80, 0.7)', marginVertical: 1 },
  versionBlock: { gap: 3, paddingHorizontal: 4 },
  version: { fontFamily: fonts.mono, fontSize: 9, lineHeight: 13, color: colors.slate[500] },
  protocol: { fontFamily: fonts.semibold, fontSize: 8, lineHeight: 12, letterSpacing: 0.9, color: colors.slate[500] },
});
