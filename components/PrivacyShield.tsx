import { useRouter } from 'expo-router';
import { ArrowLeft, ArrowRight, EyeOff, ShieldCheck, UserRound } from 'lucide-react-native';
import { Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/PrimaryButton';
import { colors, fonts, radius, spacing, type as typography } from '@/constants/theme';
import { PRIVACY_SHIELD_BODY, PRIVACY_SHIELD_LIMIT, PRIVACY_SHIELD_TITLE } from '@/lib/privacy';
import { usePresentation } from '@/state/PresentationSession';
import { usePrivacyShield } from '@/state/PrivacyShieldProvider';

const webFixed = Platform.OS === 'web' ? ({ position: 'fixed' } as ViewStyle) : {};

export function PrivacyShield() {
  const router = useRouter();
  const shield = usePrivacyShield();
  const presentation = usePresentation();

  const openIdentity = async () => {
    const proceed = await shield.confirmDiscardUnsaved(
      'Returning to the identity step ends this demo session and clears unsaved check-in values in this tab. Saved device records are not changed. Continue?',
    );
    if (!proceed) return;
    shield.returnToSession();
    router.navigate('/identify');
  };

  const openPrivacyCenter = () => {
    shield.returnToSession();
    router.navigate('/privacy');
  };

  const exitDemo = async () => {
    const proceed = await shield.confirmDiscardUnsaved(
      'Leaving the demo session discards its session-only records and clears any unsaved check-in values in this tab. Continue?',
    );
    if (!proceed) return;
    shield.returnToSession();
    presentation.exit();
    router.replace('/');
  };

  return (
    <View testID="privacy-shield" style={[styles.overlay, webFixed]} accessibilityViewIsModal>
      <SafeAreaView style={styles.safe}>
        <View style={styles.panel} accessibilityRole="alert">
          <View style={styles.badge}><ShieldCheck size={14} color={colors.primary[300]} strokeWidth={2.2} /><Text style={styles.badgeText}>VISUAL PRIVACY MODE</Text></View>
          <View style={styles.iconWrap}><EyeOff size={34} color={colors.primary[300]} strokeWidth={1.9} /></View>
          <Text accessibilityRole="header" style={styles.title}>{PRIVACY_SHIELD_TITLE}</Text>
          <Text style={styles.body}>{PRIVACY_SHIELD_BODY}</Text>

          <View style={styles.facts}>
            <View style={styles.fact}>
              <ShieldCheck size={15} color={colors.slate[400]} strokeWidth={2} />
              <Text style={styles.factText}>{PRIVACY_SHIELD_LIMIT}</Text>
            </View>
            <View style={styles.fact}>
              <ArrowLeft size={15} color={colors.slate[400]} strokeWidth={2} />
              <Text style={styles.factText}>Returning does not sign in or verify a person. Unsaved values stay in this tab while the same session remains active.</Text>
            </View>
          </View>

          <View style={styles.actions}>
            <PrimaryButton label="Return to active session" Icon={ArrowRight} onPress={shield.returnToSession} style={styles.fullWidth} />
            <PrimaryButton label="Return to identity step" variant="secondary" Icon={UserRound} onPress={() => { void openIdentity(); }} style={styles.fullWidth} />
            {presentation.active ? (
              <Pressable accessibilityRole="button" onPress={() => { void exitDemo(); }} style={styles.textButton}>
                <Text style={styles.textButtonLabel}>Exit demo session</Text>
              </Pressable>
            ) : null}
          </View>

          <Pressable accessibilityRole="link" accessibilityLabel="Open Privacy and Crew Access" onPress={openPrivacyCenter} style={styles.link}>
            <Text style={styles.linkLabel}>Privacy &amp; Crew Access</Text>
            <ArrowRight size={13} color={colors.primary[300]} strokeWidth={2} />
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.navy[950],
    zIndex: 1000,
    elevation: 1000,
  },
  safe: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.sm },
  panel: {
    width: '100%',
    maxWidth: 620,
    gap: 14,
    paddingVertical: 30,
    paddingHorizontal: 26,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(0, 214, 198, 0.34)',
    backgroundColor: colors.navy[900],
    alignItems: 'center',
    ...(Platform.OS === 'web' ? { boxShadow: '0 36px 90px rgba(0, 4, 12, 0.72)' } as ViewStyle : {}),
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 30,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(0, 214, 198, 0.28)',
    backgroundColor: 'rgba(0, 214, 198, 0.08)',
  },
  badgeText: { fontFamily: fonts.mono, fontSize: 9, lineHeight: 13, letterSpacing: 1, color: colors.primary[300] },
  iconWrap: {
    width: 78,
    height: 78,
    marginTop: 4,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 214, 198, 0.40)',
    backgroundColor: 'rgba(0, 214, 198, 0.10)',
  },
  title: { ...typography.headline, textAlign: 'center', color: colors.offWhite },
  body: { ...typography.body, textAlign: 'center', color: colors.slate[300], maxWidth: 440 },
  facts: { width: '100%', gap: 10, padding: 16, borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.09)', backgroundColor: colors.navy[850] },
  fact: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  factText: { flex: 1, fontFamily: fonts.regular, fontSize: 12.5, lineHeight: 19, color: colors.slate[300] },
  actions: { width: '100%', gap: 10, marginTop: 2 },
  fullWidth: { width: '100%' },
  textButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  textButtonLabel: { fontFamily: fonts.semibold, fontSize: 12.5, lineHeight: 18, color: colors.error[400] },
  link: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 32, paddingHorizontal: 4 },
  linkLabel: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 18, color: colors.primary[300] },
});
