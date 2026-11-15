import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View, type ViewProps, type ViewStyle } from 'react-native';

import { colors, radius, stitch } from '@/constants/theme';

type SurfaceProps = ViewProps & { variant?: 'solid' | 'glass'; padded?: boolean };

/** Optional web enhancement; native and unsupported browsers retain an opaque surface. */
export function Surface({ variant = 'solid', padded = true, style, ...props }: SurfaceProps) {
  const [blurAllowed, setBlurAllowed] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || typeof CSS === 'undefined') return;
    const preference = window.matchMedia('(prefers-reduced-transparency: reduce), (prefers-contrast: more)');
    const update = () => setBlurAllowed(CSS.supports('backdrop-filter', 'blur(16px)') && !preference.matches);
    update();
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);
  const glassStyle = variant === 'glass' && blurAllowed ? {
    backgroundColor: stitch.glass,
    backdropFilter: 'blur(16px)',
    backgroundImage: 'linear-gradient(115deg, rgba(141,187,255,0.06), transparent 50%, rgba(80,222,216,0.05))',
  } as ViewStyle : undefined;
  return <View {...props} style={[styles.surface, padded && styles.padding, variant === 'glass' && styles.glassBorder, glassStyle, style]} />;
}

const styles = StyleSheet.create({
  surface: { backgroundColor: colors.navy[800], borderWidth: 1, borderColor: colors.navy[600], borderRadius: radius.lg, minWidth: 0 },
  padding: { padding: stitch.spacing.xl, gap: stitch.spacing.lg },
  glassBorder: { borderColor: stitch.glassBorder },
});
