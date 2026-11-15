import { useEffect, useState } from 'react';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { AccessibilityInfo, Platform, StyleSheet, View, type ViewProps, type ViewStyle } from 'react-native';

import { colors, radius, stitch } from '@/constants/theme';

type SurfaceTone = 'default' | 'panel' | 'raised' | 'inset' | 'chart';
type SurfaceProps = ViewProps & { variant?: 'solid' | 'glass'; tone?: SurfaceTone; padded?: boolean };

const toneBackground: Record<SurfaceTone, string> = {
  default: colors.navy[800],
  panel: stitch.panel,
  raised: colors.navy[700],
  inset: stitch.panelDeep,
  chart: stitch.chart,
};

/** Cross-platform surface. Glass uses blur where supported and layered tone where it is not. */
export function Surface({ variant = 'solid', tone = 'default', padded = true, style, children, ...props }: SurfaceProps) {
  const [nativeBlur, setNativeBlur] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    let active = true;
    void AccessibilityInfo.isReduceTransparencyEnabled().then((reduced) => { if (active) setNativeBlur(!reduced); });
    const subscription = AccessibilityInfo.addEventListener('reduceTransparencyChanged', (reduced) => setNativeBlur(!reduced));
    return () => { active = false; subscription.remove(); };
  }, []);
  const [webBlur, setWebBlur] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || typeof CSS === 'undefined') return;
    const preference = window.matchMedia('(prefers-reduced-transparency: reduce), (prefers-contrast: more)');
    const update = () => setWebBlur(CSS.supports('backdrop-filter', 'blur(16px)') && !preference.matches);
    update();
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);

  const glass = variant === 'glass';
  const webGlassStyle = glass && webBlur ? {
    backgroundColor: stitch.glass,
    backdropFilter: 'blur(20px) saturate(145%)',
    boxShadow: `${stitch.shadow}, inset 0 1px 0 ${stitch.highlight}`,
  } as ViewStyle : undefined;
  const opaqueGlassStyle = glass && !webBlur && Platform.OS === 'web' ? { backgroundColor: colors.navy[800] } : undefined;
  const androidGlassStyle = glass && Platform.OS === 'android' ? { backgroundColor: 'rgba(13, 34, 46, 0.94)' } : undefined;
  const iosGlassStyle = glass && nativeBlur ? { backgroundColor: 'rgba(13, 34, 46, 0.42)' } : undefined;

  return <View {...props} style={[
    styles.surface,
    padded && styles.padding,
    { backgroundColor: toneBackground[tone] },
    glass && styles.glass,
    webGlassStyle,
    opaqueGlassStyle,
    androidGlassStyle,
    iosGlassStyle,
    style,
  ]}>
    {glass && nativeBlur ? <BlurView pointerEvents="none" tint="dark" intensity={38} style={StyleSheet.absoluteFill} /> : null}
    {glass ? <LinearGradient
      pointerEvents="none"
      colors={['rgba(141, 187, 255, 0.10)', 'rgba(80, 222, 216, 0.035)', 'rgba(13, 34, 46, 0)']}
      locations={[0, 0.46, 0.78]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={StyleSheet.absoluteFill}
    /> : <LinearGradient
      pointerEvents="none"
      colors={['rgba(141, 187, 255, 0.05)', 'rgba(13, 34, 46, 0)']}
      locations={[0, 0.62]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[StyleSheet.absoluteFill, { borderRadius: radius.lg }]}
    />}
    {children}
  </View>;
}

const styles = StyleSheet.create({
  surface: { borderWidth: 1, borderColor: colors.navy[600], borderRadius: radius.lg, minWidth: 0 },
  padding: { padding: stitch.spacing.xl, gap: stitch.spacing.lg },
  glass: { borderColor: stitch.glassBorder, overflow: 'hidden' },
});
