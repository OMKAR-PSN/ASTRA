import { BookOpen, Database, Info, Orbit, ScanLine } from 'lucide-react-native';
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
        <View style={styles.brandIcon}><Orbit size={24} color={colors.primary[300]} strokeWidth={2} /></View>
        <View style={styles.brandText}>
          <Text style={styles.brand}>ASTRA CARE</Text>
          <Text style={styles.brandSub}>Astronaut health{'\n'}monitoring &amp; self-assessment</Text>
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

      <Pressable
        accessibilityRole="link"
        accessibilityLabel="Crew Knowledge Hub"
        accessibilityHint="Opens the offline health knowledge library."
        accessibilityState={{ selected: pathname.startsWith('/knowledge') }}
        onPress={() => router.navigate('/knowledge')}
        style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
          styles.item,
          styles.knowledgeItem,
          pathname.startsWith('/knowledge') && styles.itemActive,
          (hovered || pressed) && !pathname.startsWith('/knowledge') && styles.itemHover,
        ]}
      >
        <BookOpen size={18} color={pathname.startsWith('/knowledge') ? colors.primary.ink : colors.slate[300]} strokeWidth={2.1} />
        <Text style={[styles.itemLabel, pathname.startsWith('/knowledge') && styles.itemLabelActive]}>Crew Knowledge Hub</Text>
        <Text style={[styles.knowledgeMeta, pathname.startsWith('/knowledge') && styles.knowledgeMetaActive]}>OFFLINE</Text>
      </Pressable>

      <Pressable
        accessibilityRole="link"
        accessibilityLabel="Identify crew member"
        accessibilityState={{ selected: pathname === '/identify' }}
        onPress={() => router.navigate('/identify')}
        style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
          styles.identify,
          pathname === '/identify' && styles.identifyActive,
          (hovered || pressed) && styles.identifyHover,
        ]}
      >
        <View style={styles.identifyIcon}><ScanLine size={18} color={colors.primary[300]} strokeWidth={2.1} /></View>
        <View style={styles.identifyCopy}>
          <Text style={styles.identifyTitle}>Identify crew member</Text>
          <Text style={styles.identifyMeta}>Fictional crew demo</Text>
        </View>
      </Pressable>

      <View style={styles.footer}>
        <View style={styles.storage}>
          <View style={styles.storageHeader}>
            <View style={styles.inline}><Database size={13} color={colors.primary[300]} strokeWidth={2} /><Text style={styles.storageLabel}>LOCAL STORE</Text></View>
            <View style={styles.okPill}><View style={styles.okDot} /><Text style={styles.okText}>OFFLINE OK</Text></View>
          </View>
          <Text style={styles.storageLine}>{checkIns.length} check-ins · {reports.length} reports · {acknowledged} acknowledged</Text>
          <Text style={styles.storageMission} numberOfLines={1}>{crewProfile.missionName.replace(' (simulated)', '').toUpperCase()} · FD {crewProfile.missionDay}</Text>
        </View>
        <View style={styles.prototype}>
          <Info size={12} color={colors.slate[400]} strokeWidth={2} />
          <Text style={styles.prototypeLabel}>Research &amp; Educational Prototype</Text>
        </View>
        <Text style={styles.version}>v1.0 · Synthetic protocol · Fictional crew</Text>
      </View>
    </Surface>
  );
}

const glow = Platform.OS === 'web' ? { boxShadow: '0 0 26px rgba(0, 214, 198, 0.24)' } as ViewStyle : {};

const styles = StyleSheet.create({
  rail: {
    width: layout.railWidth,
    height: '100%',
    paddingTop: spacing.sm + 8,
    paddingHorizontal: 16,
    paddingBottom: spacing.sm + 4,
    borderWidth: 0,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.10)',
    borderRadius: 0,
    backgroundColor: stitch.glassRail,
    gap: spacing.sm,
    zIndex: 6,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 6,
    paddingTop: 8,
    paddingBottom: 10,
  },
  brandIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(0, 214, 198, 0.34)',
    backgroundColor: 'rgba(0, 214, 198, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    ...glow,
  },
  brandText: { gap: 5, minWidth: 0, flexShrink: 1, paddingTop: 1 },
  brand: { fontFamily: fonts.semibold, fontSize: 20, lineHeight: 24, letterSpacing: 0.6, color: colors.offWhite },
  brandSub: { fontFamily: fonts.regular, fontSize: 10.5, lineHeight: 14, color: colors.slate[300] },
  navLabel: {
    fontFamily: fonts.semibold,
    fontSize: 9,
    lineHeight: 13,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: colors.slate[500],
    paddingHorizontal: 11,
    marginTop: 6,
  },
  list: { gap: 4 },
  identify: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    minHeight: 54,
    paddingHorizontal: 11,
    paddingVertical: 8,
    marginTop: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 214, 198, 0.22)',
    backgroundColor: 'rgba(0, 214, 198, 0.06)',
  },
  identifyActive: { borderColor: 'rgba(0, 214, 198, 0.48)', backgroundColor: 'rgba(0, 214, 198, 0.12)' },
  identifyHover: { backgroundColor: 'rgba(0, 214, 198, 0.11)' },
  identifyIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 214, 198, 0.30)',
    backgroundColor: 'rgba(0, 214, 198, 0.10)',
  },
  identifyCopy: { gap: 1, minWidth: 0, flexShrink: 1 },
  identifyTitle: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 17, color: colors.offWhite },
  identifyMeta: { fontFamily: fonts.regular, fontSize: 10, lineHeight: 14, color: colors.slate[400] },
  item: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  itemActive: {
    backgroundColor: colors.primary[400],
    borderColor: colors.primary[300],
    ...(Platform.OS === 'web' ? { boxShadow: '0 12px 30px rgba(0, 214, 198, 0.26)' } as ViewStyle : {}),
  },
  itemHover: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderColor: 'rgba(255, 255, 255, 0.09)',
  },
  itemLabel: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.slate[300],
  },
  itemLabelActive: {
    fontFamily: fonts.semibold,
    color: colors.primary.ink,
  },
  knowledgeItem: { borderColor: 'rgba(0, 214, 198, 0.16)', marginTop: 2 },
  knowledgeMeta: { fontFamily: fonts.mono, fontSize: 7.5, lineHeight: 11, letterSpacing: 0.5, color: colors.primary[300], marginLeft: 'auto' },
  knowledgeMetaActive: { color: colors.primary.ink },
  footer: { marginTop: 'auto', gap: 9, paddingHorizontal: 4, paddingTop: 16 },
  storage: {
    gap: 7,
    padding: 11,
    backgroundColor: 'rgba(4, 16, 28, 0.52)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.09)',
  },
  storageHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  storageLabel: { fontFamily: fonts.semibold, fontSize: 8.5, lineHeight: 12, letterSpacing: 0.9, color: colors.slate[200] },
  okPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 2, paddingHorizontal: 5, borderRadius: 5, backgroundColor: stitch.greenMuted, borderWidth: 1, borderColor: 'rgba(134, 227, 180, 0.28)' },
  okDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.success[400] },
  okText: { fontFamily: fonts.mono, fontSize: 7, lineHeight: 11, letterSpacing: 0.5, color: colors.success[400] },
  storageLine: { fontFamily: fonts.regular, fontSize: 10.5, lineHeight: 15, color: colors.slate[400] },
  storageMission: { fontFamily: fonts.mono, fontSize: 8.5, lineHeight: 12, letterSpacing: 0.5, color: colors.primary[300] },
  prototype: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 34,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 8,
  },
  prototypeLabel: { fontFamily: fonts.semibold, fontSize: 9.5, lineHeight: 14, color: colors.slate[300] },
  version: { fontFamily: fonts.mono, fontSize: 8.5, lineHeight: 12, color: colors.slate[500], textAlign: 'center' },
});
