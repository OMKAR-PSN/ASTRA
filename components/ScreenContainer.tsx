import { Atmosphere } from '@/components/Atmosphere';
import { useEffect, useRef, type ReactNode } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions, type ScrollViewInstance, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SideRail } from '@/components/SideRail';
import { MissionHeader } from '@/components/MissionHeader';
import { DemoModeBanner } from '@/components/DemoModeBanner';
import { colors, layout, type as typography } from '@/constants/theme';

type ScreenContainerProps = { title: string; subtitle?: string; children: ReactNode; hideHeading?: boolean; scrollToTopKey?: string | number };

export function ScreenContainer({ title, subtitle, children, hideHeading = false, scrollToTopKey }: ScreenContainerProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= layout.desktopBreakpoint;
  const scrollRef = useRef<ScrollViewInstance | null>(null);
  useEffect(() => {
    if (scrollToTopKey === undefined) return;
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [scrollToTopKey]);
  const frameShadow = Platform.OS === 'web' && isDesktop
    ? { boxShadow: '0 40px 120px rgba(0, 4, 12, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.08)' } as ViewStyle
    : undefined;

  return (
    <View style={styles.root}>
      <Atmosphere />
      <SafeAreaView style={styles.safeArea} edges={isDesktop ? ['top', 'bottom'] : ['top']}>
        <View style={[styles.frame, isDesktop && styles.frameDesktop, frameShadow]}>
          {isDesktop ? <SideRail /> : null}
          <View style={styles.main}>
            <View style={[styles.headerWrap, !isDesktop && styles.headerWrapMobile]}>
              <MissionHeader desktop={isDesktop} />
            </View>
            <DemoModeBanner />
            <ScrollView ref={scrollRef} style={styles.scroll} contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={[styles.column, isDesktop && styles.columnDesktop]}>
                {!hideHeading ? <View style={styles.header}>
                  <Text accessibilityRole="header" style={[styles.title, !isDesktop && styles.mobileTitle]}>{title}</Text>
                  {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
                </View> : null}
                {children}
              </View>
            </ScrollView>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.navy[950] },
  safeArea: { flex: 1 },
  frame: { flex: 1, minWidth: 0 },
  frameDesktop: {
    flexDirection: 'row',
    marginHorizontal: 12,
    marginVertical: 10,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.13)',
    backgroundColor: 'rgba(2, 10, 18, 0.30)',
    overflow: 'hidden',
  },
  main: { flex: 1, minWidth: 0 },
  headerWrap: { paddingHorizontal: 14, paddingTop: 12 },
  headerWrapMobile: { paddingHorizontal: 10, paddingTop: 8 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 116 },
  contentDesktop: { paddingHorizontal: layout.desktopPadding, paddingTop: 20, paddingBottom: 34 },
  column: { width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center', gap: 18 },
  columnDesktop: { gap: layout.sectionGap },
  header: { gap: 5, marginBottom: 4 },
  title: { ...typography.headline, color: colors.offWhite },
  mobileTitle: { ...typography.headlineMobile, color: colors.offWhite },
  subtitle: { ...typography.body, color: colors.slate[300], maxWidth: 720 },
});
