import { Platform, type TextStyle } from 'react-native';

export const colors = {
  navy: {
    950: '#030B14',
    900: '#061525',
    850: '#081D30',
    800: '#0B2439',
    750: '#0F2D46',
    700: '#143A58',
    650: '#1B4D7A',
    600: '#285E88',
    550: '#173A53',
  },
  slate: {
    500: '#7B93AA',
    400: '#A6BBD0',
    300: '#C9D9E8',
    200: '#E6F2FF',
  },
  offWhite: '#F9FCFF',
  primary: {
    300: '#7DFBF0',
    400: '#00D6C6',
    500: '#00B7AA',
    ink: '#031512',
  },
  secondary: {
    400: '#79B4FF',
  },
  accent: {
    400: '#F2C078',
    ink: '#1A1204',
  },
  success: {
    400: '#86E3B4',
  },
  error: {
    400: '#FF8F97',
  },
} as const;

export const spacing = {
  xs: 8,
  sm: 16,
  md: 24,
  lg: 32,
  xl: 48,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 26,
} as const;

export const fonts = {
  regular: 'Inter-Regular',
  semibold: 'Inter-SemiBold',
  bold: 'Inter-Bold',
  mono: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
} as const;

export const layout = {
  maxContentWidth: 1600,
  railWidth: 252,
  desktopBreakpoint: 1180,
  desktopPadding: 26,
  sectionGap: 30,
} as const;

export const tokens = {
  background: { primary: colors.navy[950], secondary: colors.navy[900] },
  surface: { default: colors.navy[800], elevated: colors.navy[700], input: '#041322' },
  border: { default: colors.navy[600] },
  text: { primary: colors.offWhite, secondary: colors.slate[300], muted: colors.slate[500] },
  action: { primary: colors.primary[400] },
  state: { information: colors.secondary[400], complete: colors.success[400], review: colors.accent[400], critical: colors.error[400], unavailable: colors.slate[400] },
} as const;

// Stitch spacing names are additive: existing screen spacing remains stable.
export const stitch = {
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 },
  glass: 'rgba(8, 24, 39, 0.58)',
  glassStrong: 'rgba(6, 19, 33, 0.76)',
  glassRail: 'rgba(5, 17, 29, 0.62)',
  glassHeader: 'rgba(6, 20, 33, 0.58)',
  glassInset: 'rgba(4, 15, 26, 0.62)',
  glassDeep: 'rgba(3, 12, 22, 0.72)',
  glassBorder: 'rgba(255, 255, 255, 0.14)',
  glassBorderStrong: 'rgba(0, 214, 198, 0.42)',
  highlight: 'rgba(255, 255, 255, 0.10)',
  cyanMuted: 'rgba(0, 214, 198, 0.14)',
  blueMuted: 'rgba(121, 180, 255, 0.14)',
  amberMuted: 'rgba(242, 192, 120, 0.14)',
  greenMuted: 'rgba(134, 227, 180, 0.14)',
  redMuted: 'rgba(255, 143, 151, 0.14)',
  panel: '#0A2337',
  panelDeep: '#041322',
  chart: '#071B2B',
  shadow: '0 28px 70px rgba(0, 4, 12, 0.58)',
  shadowSoft: '0 14px 34px rgba(0, 5, 14, 0.42)',
} as const;

export const type: Record<string, TextStyle> = {
  hero: { fontFamily: fonts.semibold, fontSize: 42, lineHeight: 50, letterSpacing: -1 },
  heroMobile: { fontFamily: fonts.semibold, fontSize: 30, lineHeight: 36, letterSpacing: -0.5 },
  headline: { fontFamily: fonts.semibold, fontSize: 30, lineHeight: 38, letterSpacing: -0.5 },
  headlineMobile: { fontFamily: fonts.semibold, fontSize: 23, lineHeight: 30, letterSpacing: -0.3 },
  section: { fontFamily: fonts.semibold, fontSize: 21, lineHeight: 27, letterSpacing: -0.25 },
  sectionMobile: { fontFamily: fonts.semibold, fontSize: 18, lineHeight: 24, letterSpacing: -0.1 },
  cardTitle: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22, letterSpacing: -0.08 },
  label: { fontFamily: fonts.semibold, fontSize: 10, lineHeight: 14, letterSpacing: 0.8, textTransform: 'uppercase' },
  labelWide: { fontFamily: fonts.semibold, fontSize: 10, lineHeight: 14, letterSpacing: 1.1, textTransform: 'uppercase' },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  bodySmall: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19 },
  meta: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 16 },
  mono: { fontFamily: fonts.mono, fontSize: 12, lineHeight: 18, fontVariant: ['tabular-nums'] },
  monoSmall: { fontFamily: fonts.mono, fontSize: 11, lineHeight: 16, fontVariant: ['tabular-nums'] },
  numeral: { fontFamily: fonts.semibold, fontSize: 36, lineHeight: 42, letterSpacing: -0.8, fontVariant: ['tabular-nums'] },
  numeralSmall: { fontFamily: fonts.semibold, fontSize: 23, lineHeight: 29, letterSpacing: -0.4, fontVariant: ['tabular-nums'] },
};
