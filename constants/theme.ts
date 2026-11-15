import { Platform } from 'react-native';

export const colors = {
  navy: {
    950: '#080F1C',
    900: '#080F1C',
    800: '#132236',
    700: '#1E3247',
    600: '#283C50',
  },
  slate: {
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
} as const;

export const fonts = {
  regular: 'Inter-Regular',
  semibold: 'Inter-SemiBold',
  bold: 'Inter-Bold',
  mono: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
} as const;

export const layout = {
  maxContentWidth: 1600,
  railWidth: 248,
  desktopBreakpoint: 900,
} as const;

export const tokens = {
  background: { primary: colors.navy[950], secondary: '#0D1828' },
  surface: { default: colors.navy[800], elevated: colors.navy[700], input: '#011522' },
  border: { default: colors.navy[600] },
  text: { primary: colors.offWhite, secondary: colors.slate[300] },
  action: { primary: colors.primary[400] },
  state: { information: colors.secondary[400], complete: colors.success[400], review: colors.accent[400], critical: colors.error[400], unavailable: colors.slate[400] },
} as const;
// Stitch spacing names are additive: existing screen spacing remains stable.
export const stitch = {
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 },
  glass: 'rgba(19, 34, 54, 0.92)',
  glassBorder: 'rgba(141, 187, 255, 0.20)',
  cyanMuted: 'rgba(80, 222, 216, 0.12)',
  blueMuted: 'rgba(141, 187, 255, 0.12)',
  amberMuted: 'rgba(243, 193, 107, 0.12)',
} as const;
