import { Atmosphere } from '@/components/Atmosphere';
import { type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SideRail } from '@/components/SideRail';
import { MissionHeader } from '@/components/MissionHeader';
import { colors, layout, spacing, type as typography } from '@/constants/theme';

type ScreenContainerProps = { title: string; subtitle?: string; children: ReactNode; hideHeading?: boolean };

export function ScreenContainer({ title, subtitle, children, hideHeading = false }: ScreenContainerProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= layout.desktopBreakpoint;

  return (
    <View style={[styles.root, isDesktop && styles.rootDesktop]}>
      <Atmosphere />
      {isDesktop ? <SideRail /> : null}
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <MissionHeader desktop={isDesktop} />
        <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={[styles.column, isDesktop && styles.columnDesktop]}>
            {!hideHeading ? <View style={styles.header}>
              <Text accessibilityRole="header" style={[styles.title, !isDesktop && styles.mobileTitle]}>{title}</Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View> : null}
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
  content: { paddingHorizontal: spacing.sm, paddingTop: 12, paddingBottom: 112 },
  contentDesktop: { paddingHorizontal: layout.desktopPadding, paddingTop: 28, paddingBottom: spacing.lg },
  column: { width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center', gap: spacing.sm + 4 },
  columnDesktop: { gap: layout.sectionGap },
  header: { gap: 5, marginBottom: 4 },
  title: { ...typography.headline, color: colors.offWhite },
  mobileTitle: { ...typography.headlineMobile, color: colors.offWhite },
  subtitle: { ...typography.body, color: colors.slate[300], maxWidth: 720 },
});
