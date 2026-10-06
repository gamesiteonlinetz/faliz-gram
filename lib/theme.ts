export type ThemeMode = 'light' | 'dark';

interface ThemeColors {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  gradientStart: string;
  gradientEnd: string;
  background: string;
  surface: string;
  surfaceElevated: string;
  border: string;
  borderStrong: string;
  text: string;
  textSecondary: string;
  textLight: string;
  error: string;
  success: string;
  warning: string;
  black: string;
  white: string;
  overlay: string;
  scrim: string;
  badge: string;
}

const lightColors: ThemeColors = {
  primary: '#0095F6',
  primaryDark: '#0077C6',
  primaryLight: '#E8F4FE',
  gradientStart: '#F58529',
  gradientEnd: '#DD2A7B',
  background: '#FFFFFF',
  surface: '#FAFAFA',
  surfaceElevated: '#F4F4F4',
  border: '#EFEFEF',
  borderStrong: '#DBDBDB',
  text: '#262626',
  textSecondary: '#8E8E8E',
  textLight: '#C7C7C7',
  error: '#ED4956',
  success: '#34C759',
  warning: '#FFB700',
  black: '#000000',
  white: '#FFFFFF',
  overlay: 'rgba(0,0,0,0.5)',
  scrim: 'rgba(0,0,0,0.25)',
  badge: '#3897F0',
};

const darkColors: ThemeColors = {
  primary: '#0095F6',
  primaryDark: '#0077C6',
  primaryLight: '#1A3A4A',
  gradientStart: '#F58529',
  gradientEnd: '#DD2A7B',
  background: '#000000',
  surface: '#121212',
  surfaceElevated: '#1E1E1E',
  border: '#262626',
  borderStrong: '#363636',
  text: '#FFFFFF',
  textSecondary: '#A0A0A0',
  textLight: '#666666',
  error: '#ED4956',
  success: '#34C759',
  warning: '#FFB700',
  black: '#000000',
  white: '#FFFFFF',
  overlay: 'rgba(255,255,255,0.15)',
  scrim: 'rgba(0,0,0,0.6)',
  badge: '#3897F0',
};

let currentMode: ThemeMode = 'light';
const listeners = new Set<() => void>();

export const Colors = lightColors;
export const DarkColors = darkColors;

export function getColors(): ThemeColors {
  return currentMode === 'dark' ? darkColors : lightColors;
}

export function getThemeMode(): ThemeMode {
  return currentMode;
}

export function setThemeMode(mode: ThemeMode) {
  currentMode = mode;
  listeners.forEach(fn => fn());
}

export function subscribeTheme(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export const Shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 8,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const FontSizes = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 22,
  xxxl: 28,
  display: 34,
};

export const Radius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  round: 999,
};
