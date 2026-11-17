import { Image, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

/** Decorative light field, never a chart or operational measurement. */
export function Atmosphere() {
  const { width } = useWindowDimensions();
  const mobile = width < 768;
  return <View pointerEvents="none" aria-hidden style={[StyleSheet.absoluteFill, styles.clip]}>
    {mobile ? (
      <Image source={require('@/assets/images/space-mobile.png')} style={StyleSheet.absoluteFill} resizeMode="cover" />
    ) : (
      <Image source={require('@/assets/images/space-vista.png')} style={styles.desktopImage} resizeMode="cover" />
    )}
    <View style={styles.wash} />
    <Svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 1440 1000" style={StyleSheet.absoluteFill}>
      <Defs>
        <RadialGradient id="auraCyan" cx="78%" cy="2%" rx="52%" ry="48%">
          <Stop offset="0" stopColor="#00D6C6" stopOpacity="0.18" />
          <Stop offset="0.5" stopColor="#0C6C74" stopOpacity="0.10" />
          <Stop offset="1" stopColor="#030B14" stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="auraBlue" cx="10%" cy="8%" rx="54%" ry="58%">
          <Stop offset="0" stopColor="#2F6DB4" stopOpacity="0.20" />
          <Stop offset="0.55" stopColor="#123353" stopOpacity="0.10" />
          <Stop offset="1" stopColor="#030B14" stopOpacity="0" />
        </RadialGradient>
        <LinearGradient id="vignette" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#020810" stopOpacity="0.18" />
          <Stop offset="0.55" stopColor="#020810" stopOpacity="0.32" />
          <Stop offset="1" stopColor="#020810" stopOpacity="0.66" />
        </LinearGradient>
      </Defs>
      <Rect width="1440" height="1000" fill="url(#auraCyan)" />
      <Rect width="1440" height="1000" fill="url(#auraBlue)" />
      <Rect width="1440" height="1000" fill="url(#vignette)" />
    </Svg>
  </View>;
}

/** Local atmospheric bloom for the mission banner's frosted glass. */
export function PanelGlow() {
  return <View pointerEvents="none" aria-hidden style={StyleSheet.absoluteFill}>
    <Svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 1000 360">
      <Defs>
        <RadialGradient id="bannerCyan" cx="88%" cy="-6%" rx="52%" ry="86%">
          <Stop offset="0" stopColor="#00D6C6" stopOpacity="0.20" />
          <Stop offset="0.5" stopColor="#1B7A8E" stopOpacity="0.10" />
          <Stop offset="1" stopColor="#041322" stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="bannerBlue" cx="6%" cy="112%" rx="48%" ry="80%">
          <Stop offset="0" stopColor="#3C7CD6" stopOpacity="0.16" />
          <Stop offset="0.6" stopColor="#16406E" stopOpacity="0.08" />
          <Stop offset="1" stopColor="#041322" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect width="1000" height="360" fill="url(#bannerCyan)" />
      <Rect width="1000" height="360" fill="url(#bannerBlue)" />
    </Svg>
  </View>;
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  desktopImage: { position: 'absolute', top: 0, left: 0, width: '100%', aspectRatio: 1 },
  wash: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(2, 9, 17, 0.28)' },
});
