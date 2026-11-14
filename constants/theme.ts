export const colors = {
  navy: {
    950: '#070F18',
    900: '#0B1622',
    800: '#11202F',
    700: '#182B3F',
    600: '#223A53',
  },
  slate: {
    400: '#8FA3B8',
    300: '#A9BACB',
    200: '#CBD6E2',
  },
  offWhite: '#EEF3F8',
  primary: {
    300: '#67E8F9',
    400: '#22D3EE',
    500: '#06B6D4',
    ink: '#041017',
  },
  secondary: {
    400: '#93C5FD',
  },
  accent: {
    400: '#F5B942',
    ink: '#1A1204',
  },
  success: {
    400: '#4ADE80',
  },
  error: {
    400: '#F87171',
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
  maxContentWidth: 960,
  railWidth: 220,
  desktopBreakpoint: 900,
} as const;
