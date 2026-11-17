import { ArrowLeft, ArrowRight, Database, Eye, FileText, Info, LogOut, ShieldCheck, UserRound, Users } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View, useWindowDimensions, type ViewStyle } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenContainer } from '@/components/ScreenContainer';
import { StatusPill } from '@/components/StatusPill';
import { Surface } from '@/components/Surface';
import { colors, fonts, layout, radius, type as typography } from '@/constants/theme';
import { PRIVACY_DEMO_BANNER, describePrivacySession } from '@/lib/privacy';
import { usePresentation } from '@/state/PresentationSession';
import { usePrivacyShield } from '@/state/PrivacyShieldProvider';
import { useSession } from '@/state/SessionProvider';

const webPointer = Platform.OS === 'web' ? ({ cursor: 'pointer' } as ViewStyle) : {};

function ActionCard({ Icon, title, description, badge, onPress }: { Icon: LucideIcon; title: string; description: string; badge: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={description}
      onPress={onPress}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [styles.action, hovered && styles.actionHover, pressed && styles.actionPressed]}
    >
      <View style={styles.actionIcon}><Icon size={18} color={colors.primary[300]} strokeWidth={2} /></View>
      <View style={styles.actionCopy}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionBody}>{description}</Text>
      </View>
      <View style={styles.actionTail}>
        <Text style={styles.actionBadge}>{badge}</Text>
        <ArrowRight size={15} color={colors.slate[400]} strokeWidth={2} />
      </View>
    </Pressable>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue}>{value}</Text>
    </View>
  );
}

export default function PrivacyCenterScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const desktop = width >= layout.desktopBreakpoint;
  const presentation = usePresentation();
  const shield = usePrivacyShield();
  const { checkIns, reports, storageDescription } = useSession();
  const session = describePrivacySession({ active: presentation.active, activeCrewId: presentation.activeCrewId });

  const leaveDemo = async () => {
    const proceed = await shield.confirmDiscardUnsaved(
      'Leaving the demo session discards its session-only records and clears any unsaved check-in values in this tab. Continue?',
    );
    if (!proceed) return;
    shield.returnToSession();
    presentation.exit();
    router.replace('/');
  };

  const switchCrew = async () => {
    const proceed = await shield.confirmDiscardUnsaved(
      'Switching the fictional crew clears unsaved check-in values in this tab. Saved device records are not changed. Continue?',
    );
    if (!proceed) return;
    shield.returnToSession();
    router.navigate('/identify');
  };

  return (
    <ScreenContainer title="Privacy & Crew Access" subtitle="What this demonstration shows, shares, stores, and conceals.">
      <View style={styles.topRow}>
        <Pressable accessibilityRole="link" accessibilityLabel="Back" onPress={() => router.back()} style={({ hovered }: { hovered?: boolean }) => [styles.back, hovered && styles.backHover]}>
          <ArrowLeft size={15} color={colors.primary[300]} strokeWidth={2.2} />
          <Text style={styles.backLabel}>Back</Text>
        </Pressable>
        <StatusPill label="DEMONSTRATION BOUNDARY" tone="accent" Icon={ShieldCheck} />
      </View>

      <View style={styles.banner} accessibilityRole="text">
        <ShieldCheck size={15} color={colors.accent[400]} strokeWidth={2.2} />
        <Text style={styles.bannerText}>{PRIVACY_DEMO_BANNER}</Text>
      </View>

      <View style={[styles.columns, desktop && styles.columnsDesktop]}>
        <View style={styles.mainColumn}>
          <Surface tone="panel" style={styles.section}>
            <View style={styles.sectionHead}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>A · Active session</Text>
              <Text style={styles.sectionMeta}>{session.storageScope === 'persistent' ? 'LOCAL STORE' : 'SESSION ONLY'}</Text>
            </View>
            <View style={styles.identityRow}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{session.kind === 'local' ? 'LR' : 'AR'}</Text></View>
              <View style={styles.identityCopy}>
                <Text style={styles.identityName}>{session.crewName ?? 'Local device records'}</Text>
                <Text style={styles.identityMeta}>{session.crewRole ?? 'No crew owner is stored with local records'}</Text>
                <Text style={styles.identitySession}>{session.label}</Text>
              </View>
            </View>
            <View style={styles.factGrid}>
              <Fact label="CREW IDENTIFIER" value={session.crewId ?? 'None stored'} />
              <Fact label="OWNER CHECK" value={session.verifiedOwner ? 'Verified' : 'Not verified · no authentication'} />
              <Fact label="CHECK-INS" value={`${checkIns.length}`} />
              <Fact label="REPORTS" value={`${reports.length}`} />
            </View>
            <Text style={styles.note}>{session.ownerLabel}. This prototype does not sign a person in, so no view is a verified personal health record.</Text>
          </Surface>

          <Surface tone="panel" style={styles.section}>
            <View style={styles.sectionHead}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>B · Visibility controls</Text>
              <Text style={styles.sectionMeta}>CHOOSE WHAT IS SHOWN</Text>
            </View>
            <View style={styles.actions}>
              <ActionCard Icon={Eye} title="Open Personal View" description="Enter the personal health workspace for the active session." badge="PERSONAL" onPress={() => router.navigate('/personal')} />
              <ActionCard Icon={Users} title="View Limited Crew Summary" description="Operational information only. No measurements, symptoms, notes, or report contents." badge="RESTRICTED" onPress={() => router.navigate('/crew-summary')} />
              <ActionCard Icon={ShieldCheck} title="Activate Privacy Shield" description="Hides personal health details on screen and stops voice guidance. It is not a lock." badge="VISUAL" onPress={shield.activate} />
            </View>
          </Surface>

          <Surface tone="panel" style={styles.section}>
            <View style={styles.sectionHead}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>D · Privacy explanation</Text>
              <Text style={styles.sectionMeta}>WHAT THIS IS</Text>
            </View>
            <View style={styles.bulletList}>
              <Text style={styles.bullet}>• The Privacy Shield is a visual cover for the screen. Anyone with access to the device can still return to the session, because no sign-in is required.</Text>
              <Text style={styles.bullet}>• The Shield is not encryption. It does not lock the app, lock the device, or hide data from someone who inspects local storage.</Text>
              <Text style={styles.bullet}>• A fictional crew QR code identifies a demo fixture. It is not proof of identity and does not grant permission.</Text>
              <Text style={styles.bullet}>• Screens decide what to render on the client. There is no server-side authorization in this demonstration.</Text>
              <Text style={styles.bullet}>• All records in this prototype are synthetic. No real astronaut, mission, or clinical system is connected.</Text>
            </View>
          </Surface>
        </View>

        <View style={[styles.sideColumn, desktop && styles.sideColumnDesktop]}>
          <Surface tone="panel" style={styles.section}>
            <View style={styles.sectionHead}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>C · Local data information</Text>
              <Database size={15} color={colors.primary[300]} strokeWidth={2} />
            </View>
            <Text style={styles.body}>{storageDescription}</Text>
            <View style={styles.infoRow}>
              <Info size={13} color={colors.slate[400]} strokeWidth={2} />
              <Text style={styles.infoText}>
                {session.survivesRefresh
                  ? 'Local records survive a page refresh. Demo crew records are session-only and disappear on refresh.'
                  : 'This demo session exists only in memory. A refresh returns to the local store without these records.'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <FileText size={13} color={colors.slate[400]} strokeWidth={2} />
              <Text style={styles.infoText}>Stored records are not encrypted. Anyone with access to this browser profile or device can read the saved JSON payload.</Text>
            </View>
            {Platform.OS === 'web' ? (
              <View style={styles.infoRow}>
                <Users size={13} color={colors.slate[400]} strokeWidth={2} />
                <Text style={styles.infoText}>Browser tabs on the same origin share the same local store. Changes in one tab are not automatically echoed in another open tab.</Text>
              </View>
            ) : null}
          </Surface>

          <Surface tone="panel" style={styles.section}>
            <View style={styles.sectionHead}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>E · Session controls</Text>
              <Text style={styles.sectionMeta}>REVERSIBLE</Text>
            </View>
            {presentation.active ? (
              <>
                <Text style={styles.body}>Returning to the identity step ends this demo session. Existing saved device records are not edited or deleted.</Text>
                <PrimaryButton label="Switch fictional crew profile" variant="secondary" Icon={UserRound} onPress={() => { void switchCrew(); }} style={styles.fullWidth} />
                <PrimaryButton label="Exit demo session" variant="secondary" Icon={LogOut} onPress={() => { void leaveDemo(); }} style={styles.fullWidth} />
              </>
            ) : (
              <>
                <Text style={styles.body}>No demo session is active. Local records remain available on this device.</Text>
                <PrimaryButton label="Identify a fictional crew" variant="secondary" Icon={UserRound} onPress={() => router.navigate('/identify')} style={styles.fullWidth} />
              </>
            )}
            <Text style={styles.note}>Leaving a session never deletes stored local records. Unsaved form values are cleared in this tab.</Text>
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
  sideColumnDesktop: { flex: 0.9 },
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
  identityName: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 23, color: colors.offWhite },
  identityMeta: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, color: colors.slate[400] },
  identitySession: { fontFamily: fonts.mono, fontSize: 9.5, lineHeight: 14, letterSpacing: 0.5, color: colors.primary[300], textTransform: 'uppercase' },
  factGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  fact: {
    flexGrow: 1, flexBasis: 120, gap: 3, padding: 11, borderRadius: radius.md,
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.09)', backgroundColor: 'rgba(4, 16, 28, 0.46)',
  },
  factLabel: { fontFamily: fonts.semibold, fontSize: 8.5, lineHeight: 12, letterSpacing: 0.9, color: colors.slate[500] },
  factValue: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, color: colors.offWhite },
  note: { fontFamily: fonts.regular, fontSize: 11.5, lineHeight: 17, color: colors.slate[500] },
  actions: { gap: 10 },
  action: {
    flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 68, paddingVertical: 12, paddingHorizontal: 13,
    borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.11)', backgroundColor: 'rgba(4, 16, 28, 0.46)', ...webPointer,
  },
  actionHover: { borderColor: 'rgba(0, 214, 198, 0.36)', backgroundColor: 'rgba(255, 255, 255, 0.05)' },
  actionPressed: { opacity: 0.85 },
  actionIcon: {
    width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(0, 214, 198, 0.32)', backgroundColor: 'rgba(0, 214, 198, 0.10)',
  },
  actionCopy: { flex: 1, gap: 2, minWidth: 0 },
  actionTitle: { fontFamily: fonts.semibold, fontSize: 14.5, lineHeight: 20, color: colors.offWhite },
  actionBody: { fontFamily: fonts.regular, fontSize: 11.5, lineHeight: 17, color: colors.slate[400] },
  actionTail: { alignItems: 'flex-end', gap: 6 },
  actionBadge: { fontFamily: fonts.mono, fontSize: 7.5, lineHeight: 10, letterSpacing: 0.7, color: colors.slate[500] },
  bulletList: { gap: 9 },
  bullet: { fontFamily: fonts.regular, fontSize: 12.5, lineHeight: 19, color: colors.slate[300] },
  body: { fontFamily: fonts.regular, fontSize: 12.5, lineHeight: 19, color: colors.slate[300] },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  infoText: { flex: 1, fontFamily: fonts.regular, fontSize: 11.5, lineHeight: 17, color: colors.slate[400] },
  fullWidth: { width: '100%' },
});
