// packages/ultracontrol-app/src/lib/ui/theme.ts

export interface ThemeColors {
  // Base colors
  primary: string;
  secondary: string;
  accent: string;
  
  // Semantic colors
  success: string;
  warning: string;
  danger: string;
  info: string;
  
  // Neutral colors
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  
  // Component colors
  border: string;
  input: string;
  ring: string;
  
  // Special colors
  muted: string;
  mutedForeground: string;
  destructive: string;
  destructiveForeground: string;
}

export interface ThemeSpacing {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  '3xl': string;
  '4xl': string;
}

export interface ThemeFonts {
  sans: string;
  serif: string;
  mono: string;
}

export interface ThemeFontSizes {
  xs: string;
  sm: string;
  base: string;
  lg: string;
  xl: string;
  '2xl': string;
  '3xl': string;
  '4xl': string;
  '5xl': string;
}

export interface ThemeBorderRadius {
  none: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  '3xl': string;
  full: string;
}

export interface Theme {
  colors: ThemeColors;
  spacing: ThemeSpacing;
  fonts: ThemeFonts;
  fontSizes: ThemeFontSizes;
  borderRadius: ThemeBorderRadius;
}

// Light theme
export const lightTheme: Theme = {
  colors: {
    primary: 'hsl(221.2 83.2% 53.3%)',
    secondary: 'hsl(210 40% 96.1%)',
    accent: 'hsl(280 65% 60%)',
    
    success: 'hsl(142.1 76.2% 36.3%)',
    warning: 'hsl(38 92% 50%)',
    danger: 'hsl(0 84.2% 60.2%)',
    info: 'hsl(199 89% 48%)',
    
    background: 'hsl(0 0% 100%)',
    foreground: 'hsl(222.2 47.4% 11.2%)',
    card: 'hsl(0 0% 100%)',
    cardForeground: 'hsl(222.2 47.4% 11.2%)',
    popover: 'hsl(0 0% 100%)',
    popoverForeground: 'hsl(222.2 47.4% 11.2%)',
    
    border: 'hsl(214.3 31.8% 91.4%)',
    input: 'hsl(214.3 31.8% 91.4%)',
    ring: 'hsl(221.2 83.2% 53.3%)',
    
    muted: 'hsl(210 40% 96.1%)',
    mutedForeground: 'hsl(215.4 16.3% 46.9%)',
    destructive: 'hsl(0 84.2% 60.2%)',
    destructiveForeground: 'hsl(0 0% 98%)',
  },
  spacing: {
    xs: '0.5rem',
    sm: '0.75rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
    '3xl': '4rem',
    '4xl': '6rem',
  },
  fonts: {
    sans: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    serif: 'Georgia, Cambria, "Times New Roman", Times, serif',
    mono: 'Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  },
  fontSizes: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
    '5xl': '3rem',
  },
  borderRadius: {
    none: '0',
    sm: '0.125rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    '2xl': '1rem',
    '3xl': '1.5rem',
    full: '9999px',
  },
};

// Dark theme
export const darkTheme: Theme = {
  ...lightTheme,
  colors: {
    primary: 'hsl(217.2 91.2% 59.8%)',
    secondary: 'hsl(217.2 32.6% 17.5%)',
    accent: 'hsl(280 65% 70%)',
    
    success: 'hsl(142.1 76.2% 45%)',
    warning: 'hsl(38 92% 55%)',
    danger: 'hsl(0 72.2% 50.6%)',
    info: 'hsl(199 89% 58%)',
    
    background: 'hsl(222.2 84% 4.9%)',
    foreground: 'hsl(210 40% 98%)',
    card: 'hsl(222.2 84% 8%)',
    cardForeground: 'hsl(210 40% 98%)',
    popover: 'hsl(222.2 84% 8%)',
    popoverForeground: 'hsl(210 40% 98%)',
    
    border: 'hsl(217.2 32.6% 17.5%)',
    input: 'hsl(217.2 32.6% 17.5%)',
    ring: 'hsl(224.3 76.3% 48%)',
    
    muted: 'hsl(217.2 32.6% 17.5%)',
    mutedForeground: 'hsl(215 20.2% 65.1%)',
    destructive: 'hsl(0 62.8% 30.6%)',
    destructiveForeground: 'hsl(0 85.7% 97.3%)',
  },
};

// CSS custom properties generator
export function generateCSSVariables(theme: Theme, prefix = '--ui'): string {
  const lines: string[] = [];
  
  // Colors
  Object.entries(theme.colors).forEach(([key, value]) => {
    lines.push(`${prefix}-color-${key}: ${value};`);
  });
  
  // Spacing
  Object.entries(theme.spacing).forEach(([key, value]) => {
    lines.push(`${prefix}-spacing-${key}: ${value};`);
  });
  
  // Font sizes
  Object.entries(theme.fontSizes).forEach(([key, value]) => {
    lines.push(`${prefix}-font-size-${key}: ${value};`);
  });
  
  // Border radius
  Object.entries(theme.borderRadius).forEach(([key, value]) => {
    lines.push(`${prefix}-radius-${key}: ${value};`);
  });
  
  // Fonts
  Object.entries(theme.fonts).forEach(([key, value]) => {
    lines.push(`${prefix}-font-${key}: ${value};`);
  });
  
  return lines.join('\n  ');
}

// Theme context and hooks
import { createContext, useContext } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeContextValue {
  theme: Theme;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}