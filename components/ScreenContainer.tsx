import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SideRail } from '@/components/SideRail';
import { SyntheticBanner } from '@/components/SyntheticBanner';
import { colors, fonts, layout, spacing } from '@/constants/theme';

type ScreenContainerProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function ScreenContainer({ title, subtitle, children }: ScreenContainerProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= layout.desktopBreakpoint;

  return (
    <View style={[styles.root, isDesktop && styles.rootDesktop]}>
      {isDesktop ? <SideRail /> : null}
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.column}>
            <SyntheticBanner />
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
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
  root: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: colors.navy[900],
  },
  rootDesktop: {
    flexDirection: 'row',
  },
  safeArea: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  contentDesktop: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  column: {
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
    gap: spacing.sm,
  },
  header: {
    gap: spacing.xs,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 28,
    lineHeight: 34,
    color: colors.offWhite,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 24,
    color: colors.slate[300],
  },
});
