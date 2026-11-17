import { ArrowLeft, ArrowRight, ClipboardList, Database, Eye, FileText, ListChecks, ShieldCheck } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View, useWindowDimensions, type ViewStyle } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenContainer } from '@/components/ScreenContainer';
import { StatusPill } from '@/components/StatusPill';
import { Surface } from '@/components/Surface';
import { colors, fonts, layout, radius, type as typography } from '@/constants/theme';
import { PRIVACY_DEMO_BANNER, buildPersonalHealthView, describePrivacySession } from '@/lib/privacy';
import { usePresentation } from '@/state/PresentationSession';
import { usePrivacyShield } from '@/state/PrivacyShieldProvider';
import { useSession } from '@/state/SessionProvider';

const webPointer = Platform.OS === 'web' ? ({ cursor: 'pointer' } as ViewStyle) : {};

const linkIcons = {
  overview: Eye,
  trends: ListChecks,
  assessment: ClipboardList,
  replay: FileText,
  reports: Database,
} as const;

export default function PersonalHealthScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const desktop = width >= layout.desktopBreakpoint;
  const presentation = usePresentation();
  const shield = usePrivacyShield();
  const { ready, checkIns, reports, storageDescription } = useSession();
  const session = describePrivacySession({ active: presentation.active, activeCrewId: presentation.activeCrewId });
  const view = buildPersonalHealthView({ session, checkIns, reports, storageDescription });

  return (
    <ScreenContainer title="Personal Health" subtitle="Your own workspace for the active session. This entry view links to the existing screens.">
      <View style={styles.topRow}>
        <Pressable accessibilityRole="link" accessibilityLabel="Back" onPress={() => router.back()} style={({ hovered }: { hovered?: boolean }) => [styles.back, hovered && styles.backHover]}>
          <ArrowLeft size={15} color={colors.primary[300]} strokeWidth={2.2} />
          <Text style={styles.backLabel}>Back</Text>
        </Pressable>
        <StatusPill label="PERSONAL VIEW · ACTIVE SESSION" tone="primary" Icon={ShieldCheck} />
      </View>

      <View style={styles.banner}>
        <ShieldCheck size={15} color={colors.accent[400]} strokeWidth={2.2} />
        <Text style={styles.bannerText}>{PRIVACY_DEMO_BANNER}</Text>
      </View>

      <View style={[styles.columns, desktop && styles.columnsDesktop]}>
        <View style={styles.mainColumn}>
          <Surface tone="panel" style={styles.section}>
            <View style={styles.identityRow}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{view.session.kind === 'local' ? 'LR' : 'AR'}</Text></View>
              <View style={styles.identityCopy}>
                <Text accessibilityRole="header" style={styles.identityName}>{view.session.crewName ?? 'Local device records'}</Text>
                <Text style={styles.identityMeta}>{view.session.crewRole ?? 'No crew owner is stored with local records'}</Text>
                <Text style={styles.identitySession}>{view.session.label}</Text>
              </View>
            </View>
            <View style={styles.factGrid}>
              <View style={styles.fact}><Text style={styles.factLabel}>RECORD AVAILABILITY</Text><Text style={styles.factValue}>{ready ? (view.hasRecords ? 'Check-in records available' : 'No check-in records yet') : 'Restoring records…'}</Text></View>
              <View style={styles.fact}><Text style={styles.factLabel}>CHECK-INS</Text><Text style={styles.factValue}>{view.recordCount}</Text></View>
              <View style={styles.fact}><Text style={styles.factLabel}>REPORTS</Text><Text style={styles.factValue}>{view.reportCount}</Text></View>
              <View style={styles.fact}><Text style={styles.factLabel}>LAST RECORDED</Text><Text style={styles.factValue}>{view.lastRecordedAtText ?? 'No record yet'}</Text></View>
            </View>
            <Text style={styles.note}>{view.storageDescription}</Text>
          </Surface>

          <Surface tone="panel" style={styles.section}>
            <View style={styles.sectionHead}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>Open your health workspace</Text>
              <Text style={styles.sectionMeta}>EXISTING SCREENS</Text>
            </View>
            <View style={styles.links}>
              {view.links.map((link) => {
                const Icon = linkIcons[link.key];
                return (
                  <Pressable
                    key={link.key}
                    accessibilityRole="link"
                    accessibilityLabel={link.label}
                    accessibilityHint={link.description}
                    onPress={() => router.navigate(link.href)}
                    style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [styles.link, hovered && styles.linkHover, pressed && styles.linkPressed]}
                  >
                    <View style={styles.linkIcon}><Icon size={16} color={colors.primary[300]} strokeWidth={2} /></View>
                    <View style={styles.linkCopy}>
                      <Text style={styles.linkTitle}>{link.label}</Text>
                      <Text style={styles.linkBody}>{link.description}</Text>
                    </View>
                    <ArrowRight size={15} color={colors.slate[400]} strokeWidth={2} />
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.note}>This page is an entry point only. Measurements, symptoms, and notes remain on the screens above.</Text>
          </Surface>
        </View>

        <View style={[styles.sideColumn, desktop && styles.sideColumnDesktop]}>
          <Surface tone="panel" style={styles.section}>
            <View style={styles.sectionHead}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>Session status</Text>
              <Text style={styles.sectionMeta}>{view.session.storageScope === 'persistent' ? 'PERSISTENT' : 'SESSION-ONLY'}</Text>
            </View>
            <View style={styles.statusRow}><Text style={styles.statusLabel}>Owner check</Text><Text style={styles.statusValue}>{view.session.verifiedOwner ? 'Verified' : 'Not verified'}</Text></View>
            <View style={styles.statusRow}><Text style={styles.statusLabel}>Survives refresh</Text><Text style={styles.statusValue}>{view.session.survivesRefresh ? 'Yes, local records' : 'No, demo records'}</Text></View>
            <View style={styles.statusRow}><Text style={styles.statusLabel}>Synthetic data</Text><Text style={styles.statusValue}>{view.session.synthetic ? 'Yes' : 'No'}</Text></View>
            <Text style={styles.note}>{view.session.ownerLabel}. No sign-in, PIN, or credential protects this view.</Text>
          </Surface>

          <Surface tone="panel" style={styles.section}>
            <View style={styles.sectionHead}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>Privacy controls</Text>
              <ShieldCheck size={15} color={colors.primary[300]} strokeWidth={2} />
            </View>
            <Text style={styles.body}>Hide the screen quickly, or review what the demonstration shares and stores.</Text>
            <PrimaryButton label="Activate Privacy Shield" Icon={ShieldCheck} onPress={shield.activate} style={styles.fullWidth} />
            <PrimaryButton label="Privacy & Crew Access" variant="secondary" onPress={() => router.navigate('/privacy')} style={styles.fullWidth} />
          </Surface>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 32, paddingHorizontal: 2, ...webPointer },
  backHover: { opacity: 0.8 },
  backLabel: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 17, color: colors.primary[300] },
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 10, paddingHorizontal: 13,
    borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(242, 192, 120, 0.32)', backgroundColor: 'rgba(242, 192, 120, 0.08)',
  },
  bannerText: { flex: 1, fontFamily: fonts.semibold, fontSize: 12, lineHeight: 18, color: colors.accent[400] },
  columns: { gap: 18 },
  columnsDesktop: { flexDirection: 'row', alignItems: 'flex-start', gap: layout.sectionGap },
  mainColumn: { gap: 18, flex: 1.35, minWidth: 0 },
  sideColumn: { gap: 18, flex: 1, minWidth: 0 },
  sideColumnDesktop: { flex: 0.85 },
  section: { gap: 14, padding: 20 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
  sectionTitle: { ...typography.section, fontSize: 17, lineHeight: 23, color: colors.offWhite },
  sectionMeta: { fontFamily: fonts.mono, fontSize: 8.5, lineHeight: 12, letterSpacing: 0.7, color: colors.slate[500] },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: {
    width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(0, 214, 198, 0.40)', backgroundColor: 'rgba(0, 214, 198, 0.12)',
  },
  avatarText: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 22, letterSpacing: 0.6, color: colors.primary[300] },
  identityCopy: { gap: 2, flex: 1, minWidth: 0 },
  identityName: { fontFamily: fonts.semibold, fontSize: 18, lineHeight: 24, color: colors.offWhite },
  identityMeta: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, color: colors.slate[400] },
  identitySession: { fontFamily: fonts.mono, fontSize: 9.5, lineHeight: 14, letterSpacing: 0.5, color: colors.primary[300], textTransform: 'uppercase' },
  factGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  fact: {
    flexGrow: 1, flexBasis: 130, gap: 3, padding: 11, borderRadius: radius.md,
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.09)', backgroundColor: 'rgba(4, 16, 28, 0.46)',
  },
  factLabel: { fontFamily: fonts.semibold, fontSize: 8.5, lineHeight: 12, letterSpacing: 0.9, color: colors.slate[500] },
  factValue: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, color: colors.offWhite },
  note: { fontFamily: fonts.regular, fontSize: 11.5, lineHeight: 17, color: colors.slate[500] },
  links: { gap: 9 },
  link: {
    flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 62, paddingVertical: 11, paddingHorizontal: 12,
    borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.11)', backgroundColor: 'rgba(4, 16, 28, 0.46)', ...webPointer,
  },
  linkHover: { borderColor: 'rgba(0, 214, 198, 0.36)', backgroundColor: 'rgba(255, 255, 255, 0.05)' },
  linkPressed: { opacity: 0.85 },
  linkIcon: {
    width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(0, 214, 198, 0.32)', backgroundColor: 'rgba(0, 214, 198, 0.10)',
  },
  linkCopy: { flex: 1, gap: 2, minWidth: 0 },
  linkTitle: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 19, color: colors.offWhite },
  linkBody: { fontFamily: fonts.regular, fontSize: 11.5, lineHeight: 17, color: colors.slate[400] },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingVertical: 4 },
  statusLabel: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, color: colors.slate[400] },
  statusValue: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 17, color: colors.offWhite, textAlign: 'right', flexShrink: 1 },
  body: { fontFamily: fonts.regular, fontSize: 12.5, lineHeight: 19, color: colors.slate[300] },
  fullWidth: { width: '100%' },
});
