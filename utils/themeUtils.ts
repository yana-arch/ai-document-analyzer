// Color system utilities
export const colors = {
  // Primary colors
  primary: {
    50: '#eef2ff',
    100: '#e0e7ff',
    200: '#c7d2fe',
    300: '#a5b4fc',
    400: '#818cf8',
    500: '#6366f1',
    600: '#4f46e5',
    700: '#4338ca',
    800: '#3730a3',
    900: '#312e81',
    950: '#1e1b4b',
  },

  // Semantic colors
  success: {
    50: '#f0fdf4',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
  },

  warning: {
    50: '#fffbeb',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
  },

  error: {
    50: '#fef2f2',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
  },

  // Neutral colors
  zinc: {
    50: '#fafafa',
    100: '#f4f4f5',
    200: '#e4e4e7',
    300: '#d4d4d8',
    400: '#a1a1aa',
    500: '#71717a',
    600: '#52525b',
    700: '#3f3f46',
    800: '#27272a',
    900: '#18181b',
    950: '#09090b',
  }
};

// Typography system
export const typography = {
  fontSize: {
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

  lineHeight: {
    xs: '1rem',
    sm: '1.25rem',
    base: '1.5rem',
    lg: '1.75rem',
    xl: '1.75rem',
    '2xl': '2rem',
    '3xl': '2.25rem',
    '4xl': '2.5rem',
    '5xl': '1',
  },

  fontWeight: {
    thin: '100',
    extralight: '200',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },

  fontFamily: {
    sans: ['Inter', 'system-ui', 'sans-serif'],
    mono: ['JetBrains Mono', 'monospace'],
  }
};

// Spacing system
export const spacing = {
  0: '0px',
  1: '0.25rem',
  2: '0.5rem',
  3: '0.75rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  8: '2rem',
  10: '2.5rem',
  12: '3rem',
  16: '4rem',
  20: '5rem',
  24: '6rem',
  32: '8rem',
};

// Border radius system
export const borderRadius = {
  none: '0px',
  sm: '0.125rem',
  base: '0.25rem',
  md: '0.375rem',
  lg: '0.5rem',
  xl: '0.75rem',
  '2xl': '1rem',
  '3xl': '1.5rem',
  full: '9999px',
};

// Shadow system
export const boxShadow = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
};

// Animation utilities
export const animations = {
  transition: {
    fast: '150ms ease-in-out',
    base: '200ms ease-in-out',
    slow: '300ms ease-in-out',
  },

  keyframes: {
    fadeIn: {
      '0%': { opacity: '0' },
      '100%': { opacity: '1' },
    },
    slideUp: {
      '0%': { transform: 'translateY(10px)', opacity: '0' },
      '100%': { transform: 'translateY(0)', opacity: '1' },
    },
    shimmer: {
      '0%': { backgroundPosition: '-200% 0' },
      '100%': { backgroundPosition: '200% 0' },
    },
  },
};

// Utility function to generate CSS custom properties
export const generateCSSVariables = () => {
  const root = document.documentElement;

  // Set color variables
  Object.entries(colors.primary).forEach(([key, value]) => {
    root.style.setProperty(`--color-primary-${key}`, value);
  });

  Object.entries(colors.success).forEach(([key, value]) => {
    root.style.setProperty(`--color-success-${key}`, value);
  });

  Object.entries(colors.warning).forEach(([key, value]) => {
    root.style.setProperty(`--color-warning-${key}`, value);
  });

  Object.entries(colors.error).forEach(([key, value]) => {
    root.style.setProperty(`--color-error-${key}`, value);
  });

  // Set typography variables
  Object.entries(typography.fontSize).forEach(([key, value]) => {
    if (typeof value === 'string') {
      root.style.setProperty(`--font-size-${key}`, value);
    } else if (Array.isArray(value) && value[0]) {
      root.style.setProperty(`--font-size-${key}`, value[0]);
    }
  });

  Object.entries(typography.fontWeight).forEach(([key, weight]) => {
    root.style.setProperty(`--font-weight-${key}`, weight);
  });

  // Set spacing variables
  Object.entries(spacing).forEach(([key, value]) => {
    root.style.setProperty(`--spacing-${key}`, value);
  });

  // Set border radius variables
  Object.entries(borderRadius).forEach(([key, value]) => {
    root.style.setProperty(`--radius-${key}`, value);
  });

  // Set shadow variables
  Object.entries(boxShadow).forEach(([key, value]) => {
    root.style.setProperty(`--shadow-${key}`, value);
  });
};

// Dark mode utilities
export const darkMode = {
  background: colors.zinc[900],
  surface: colors.zinc[800],
  primary: colors.primary[400],
  text: {
    primary: colors.zinc[100],
    secondary: colors.zinc[300],
    muted: colors.zinc[400],
  },
  border: colors.zinc[700],
};

export const lightMode = {
  background: colors.zinc[50],
  surface: '#ffffff',
  primary: colors.primary[600],
  text: {
    primary: colors.zinc[900],
    secondary: colors.zinc[600],
    muted: colors.zinc[500],
  },
  border: colors.zinc[200],
};
