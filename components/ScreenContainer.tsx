import { type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SideRail } from '@/components/SideRail';
import { MissionHeader } from '@/components/MissionHeader';
import { colors, fonts, layout, spacing } from '@/constants/theme';

type ScreenContainerProps = { title: string; subtitle?: string; children: ReactNode };

export function ScreenContainer({ title, subtitle, children }: ScreenContainerProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= layout.desktopBreakpoint;

  return (
    <View style={[styles.root, isDesktop && styles.rootDesktop]}>
      {isDesktop ? <SideRail /> : null}
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <MissionHeader desktop={isDesktop} />
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
  content: { paddingHorizontal: spacing.sm, paddingTop: spacing.sm, paddingBottom: spacing.lg },
  contentDesktop: { paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.lg },
  column: { width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center', gap: spacing.sm },
  header: { gap: 4, marginBottom: 4 },
  title: { fontFamily: fonts.bold, fontSize: 32, lineHeight: 40, color: colors.offWhite },
  mobileTitle: { fontSize: 23, lineHeight: 30 },
  subtitle: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, color: colors.slate[300] },
});
