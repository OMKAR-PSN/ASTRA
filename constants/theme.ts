import { Platform, type TextStyle } from 'react-native';

export const colors = {
  navy: {
    950: '#080F1C',
    900: '#0D1828',
    850: '#0E2032',
    800: '#132236',
    750: '#192A3F',
    700: '#1E3247',
    650: '#243744',
    600: '#283C50',
    550: '#1D3044',
  },
  slate: {
    500: '#6B8299',
    400: '#94AABD',
    300: '#A9BDCE',
    200: '#D5E0EB',
  },
  offWhite: '#F5F8FC',
  primary: {
    300: '#72FBF4',
    400: '#50DED8',
    500: '#36C7C1',
    ink: '#041017',
  },
  secondary: {
    400: '#8DBBFF',
  },
  accent: {
    400: '#F3C16B',
    ink: '#1A1204',
  },
  success: {
    400: '#65D7AB',
  },
  error: {
    400: '#F27B82',
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
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
} as const;

export const fonts = {
  regular: 'Inter-Regular',
  semibold: 'Inter-SemiBold',
  bold: 'Inter-Bold',
  mono: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
} as const;

export const layout = {
  maxContentWidth: 1600,
  railWidth: 240,
  desktopBreakpoint: 1180,
  desktopPadding: 32,
  sectionGap: 32,
} as const;

export const tokens = {
  background: { primary: colors.navy[950], secondary: colors.navy[900] },
  surface: { default: colors.navy[800], elevated: colors.navy[700], input: '#011522' },
  border: { default: colors.navy[600] },
  text: { primary: colors.offWhite, secondary: colors.slate[300], muted: colors.slate[500] },
  action: { primary: colors.primary[400] },
  state: { information: colors.secondary[400], complete: colors.success[400], review: colors.accent[400], critical: colors.error[400], unavailable: colors.slate[400] },
} as const;

// Stitch spacing names are additive: existing screen spacing remains stable.
export const stitch = {
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 },
  glass: 'rgba(13, 34, 46, 0.72)',
  glassStrong: 'rgba(13, 34, 46, 0.86)',
  glassRail: 'rgba(9, 21, 34, 0.88)',
  glassHeader: 'rgba(9, 21, 34, 0.82)',
  glassInset: 'rgba(9, 29, 42, 0.72)',
  glassDeep: 'rgba(0, 16, 27, 0.72)',
  glassBorder: 'rgba(141, 187, 255, 0.18)',
  glassBorderStrong: 'rgba(80, 222, 216, 0.22)',
  highlight: 'rgba(200, 235, 255, 0.06)',
  cyanMuted: 'rgba(80, 222, 216, 0.12)',
  blueMuted: 'rgba(141, 187, 255, 0.12)',
  amberMuted: 'rgba(243, 193, 107, 0.12)',
  greenMuted: 'rgba(101, 215, 171, 0.12)',
  redMuted: 'rgba(240, 121, 131, 0.12)',
  panel: '#0E2032',
  panelDeep: '#091624',
  chart: colors.navy[800],
  shadow: '0 18px 44px rgba(0, 6, 18, 0.45)',
  shadowSoft: '0 8px 24px rgba(0, 8, 20, 0.35)',
} as const;

export const type: Record<string, TextStyle> = {
  hero: { fontFamily: fonts.semibold, fontSize: 40, lineHeight: 48, letterSpacing: -0.8 },
  heroMobile: { fontFamily: fonts.semibold, fontSize: 30, lineHeight: 36, letterSpacing: -0.45 },
  headline: { fontFamily: fonts.semibold, fontSize: 28, lineHeight: 36, letterSpacing: -0.42 },
  headlineMobile: { fontFamily: fonts.semibold, fontSize: 22, lineHeight: 28, letterSpacing: -0.22 },
  section: { fontFamily: fonts.semibold, fontSize: 20, lineHeight: 26, letterSpacing: -0.2 },
  sectionMobile: { fontFamily: fonts.semibold, fontSize: 18, lineHeight: 24, letterSpacing: -0.1 },
  cardTitle: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22, letterSpacing: -0.08 },
  label: { fontFamily: fonts.semibold, fontSize: 10, lineHeight: 14, letterSpacing: 0.8, textTransform: 'uppercase' },
  labelWide: { fontFamily: fonts.semibold, fontSize: 10, lineHeight: 14, letterSpacing: 1.1, textTransform: 'uppercase' },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  bodySmall: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19 },
  meta: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 16 },
  mono: { fontFamily: fonts.mono, fontSize: 12, lineHeight: 18, fontVariant: ['tabular-nums'] },
  monoSmall: { fontFamily: fonts.mono, fontSize: 11, lineHeight: 16, fontVariant: ['tabular-nums'] },
  numeral: { fontFamily: fonts.mono, fontSize: 34, lineHeight: 40, letterSpacing: -0.6, fontVariant: ['tabular-nums'] },
  numeralSmall: { fontFamily: fonts.mono, fontSize: 22, lineHeight: 28, letterSpacing: -0.3, fontVariant: ['tabular-nums'] },
};
