export const colors = {
  navy: {
    950: '#08111E',
    900: '#08111E',
    800: '#102237',
    700: '#172C42',
    600: '#294158',
  },
  slate: {
    400: '#91A6BA',
    300: '#B6C6D6',
    200: '#D5E0EB',
  },
  offWhite: '#F4F7FB',
  primary: {
    300: '#59E4E7',
    400: '#37D5DD',
    500: '#21BFC7',
    ink: '#041017',
  },
  secondary: {
    400: '#79B9FF',
  },
  accent: {
    400: '#F6BF58',
    ink: '#1A1204',
  },
  success: {
    400: '#44D49A',
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
} as const;

export const layout = {
  maxContentWidth: 1600,
  railWidth: 230,
  desktopBreakpoint: 900,
} as const;

export const tokens = {
  background: { primary: colors.navy[950], secondary: '#0B1928' },
  surface: { default: colors.navy[800], elevated: colors.navy[700], input: '#0D1D2D' },
  border: { default: colors.navy[600] },
  text: { primary: colors.offWhite, secondary: colors.slate[300] },
  action: { primary: colors.primary[400] },
  state: { information: colors.secondary[400], complete: colors.success[400], review: colors.accent[400], critical: colors.error[400], unavailable: colors.slate[400] },
} as const;