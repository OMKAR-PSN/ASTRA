import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

/** Decorative light field, never a chart or operational measurement. */
export function Atmosphere() {
  return <View pointerEvents="none" aria-hidden style={StyleSheet.absoluteFill}>
    <Svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 1440 1000">
      <Defs>
        <RadialGradient id="auraCyan" cx="84%" cy="4%" rx="54%" ry="52%">
          <Stop offset="0" stopColor="#35CFC8" stopOpacity="0.26" />
          <Stop offset="0.45" stopColor="#146B78" stopOpacity="0.13" />
          <Stop offset="1" stopColor="#080F1C" stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="auraBlue" cx="12%" cy="10%" rx="58%" ry="62%">
          <Stop offset="0" stopColor="#2E6FBF" stopOpacity="0.24" />
          <Stop offset="0.5" stopColor="#123353" stopOpacity="0.12" />
          <Stop offset="1" stopColor="#080F1C" stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="auraIndigo" cx="52%" cy="88%" rx="70%" ry="46%">
          <Stop offset="0" stopColor="#3A4F9C" stopOpacity="0.14" />
          <Stop offset="1" stopColor="#080F1C" stopOpacity="0" />
        </RadialGradient>
        <LinearGradient id="vignette" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0.5" stopColor="#050A12" stopOpacity="0" />
          <Stop offset="1" stopColor="#050A12" stopOpacity="0.5" />
        </LinearGradient>
      </Defs>
      <Rect width="1440" height="1000" fill="url(#auraCyan)" />
      <Rect width="1440" height="1000" fill="url(#auraBlue)" />
      <Rect width="1440" height="1000" fill="url(#auraIndigo)" />
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
          <Stop offset="0" stopColor="#50DED8" stopOpacity="0.22" />
          <Stop offset="0.5" stopColor="#1B7A8E" stopOpacity="0.10" />
          <Stop offset="1" stopColor="#0D222E" stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="bannerBlue" cx="6%" cy="112%" rx="48%" ry="80%">
          <Stop offset="0" stopColor="#3C7CD6" stopOpacity="0.18" />
          <Stop offset="0.6" stopColor="#16406E" stopOpacity="0.08" />
          <Stop offset="1" stopColor="#0D222E" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect width="1000" height="360" fill="url(#bannerCyan)" />
      <Rect width="1000" height="360" fill="url(#bannerBlue)" />
    </Svg>
  </View>;
}
