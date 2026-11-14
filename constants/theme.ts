export const colors = {
  navy: {
    950: '#081321',
    900: '#081321',
    800: '#112438',
    700: '#172C43',
    600: '#263B50',
  },
  slate: {
    400: '#8FA3B8',
    300: '#AFBED0',
    200: '#D5E0EB',
  },
  offWhite: '#F2F7FC',
  primary: {
    300: '#59E4E7',
    400: '#31D9DE',
    500: '#21BFC7',
    ink: '#041017',
  },
  secondary: {
    400: '#93C5FD',
  },
  accent: {
    400: '#F5B84B',
    ink: '#1A1204',
  },
  success: {
    400: '#42D49A',
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
