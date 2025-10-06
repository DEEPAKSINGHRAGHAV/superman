import { Platform } from 'react-native';

// Professional Color Palette
export const colors = {
    // Primary Colors
    primary: {
        50: '#E8F5E8',
        100: '#C8E6C9',
        200: '#A5D6A7',
        300: '#81C784',
        400: '#66BB6A',
        500: '#4CAF50', // Main primary
        600: '#43A047',
        700: '#388E3C',
        800: '#2E7D32',
        900: '#1B5E20',
    },

    // Secondary Colors
    secondary: {
        50: '#E3F2FD',
        100: '#BBDEFB',
        200: '#90CAF9',
        300: '#64B5F6',
        400: '#42A5F5',
        500: '#2196F3', // Main secondary
        600: '#1E88E5',
        700: '#1976D2',
        800: '#1565C0',
        900: '#0D47A1',
    },

    // Status Colors
    success: {
        50: '#E8F5E8',
        500: '#4CAF50',
        600: '#43A047',
        700: '#388E3C',
    },

    warning: {
        50: '#FFF8E1',
        500: '#FF9800',
        600: '#FB8C00',
        700: '#F57C00',
    },

    error: {
        50: '#FFEBEE',
        500: '#F44336',
        600: '#E53935',
        700: '#D32F2F',
    },

    info: {
        50: '#E1F5FE',
        500: '#00BCD4',
        600: '#00ACC1',
        700: '#0097A7',
    },

    // Neutral Colors
    gray: {
        50: '#FAFAFA',
        100: '#F5F5F5',
        200: '#EEEEEE',
        300: '#E0E0E0',
        400: '#BDBDBD',
        500: '#9E9E9E',
        600: '#757575',
        700: '#616161',
        800: '#424242',
        900: '#212121',
    },

    // Base Colors
    white: '#FFFFFF',
    black: '#000000',
    transparent: 'transparent',
};

// Typography System
export const typography = {
    fontFamily: {
        regular: Platform.select({
            ios: 'System',
            android: 'Roboto',
        }),
        medium: Platform.select({
            ios: 'System',
            android: 'Roboto-Medium',
        }),
        bold: Platform.select({
            ios: 'System',
            android: 'Roboto-Bold',
        }),
    },

    fontSize: {
        xs: 12,
        sm: 14,
        base: 16,
        lg: 18,
        xl: 20,
        '2xl': 24,
        '3xl': 30,
        '4xl': 36,
        '5xl': 48,
    },

    lineHeight: {
        xs: 16,
        sm: 20,
        base: 24,
        lg: 28,
        xl: 28,
        '2xl': 32,
        '3xl': 40,
        '4xl': 44,
        '5xl': 56,
    },

    fontWeight: {
        normal: '400' as const,
        medium: '500' as const,
        semibold: '600' as const,
        bold: '700' as const,
    },
};

// Spacing System
export const spacing = {
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    8: 32,
    10: 40,
    12: 48,
    16: 64,
    20: 80,
    24: 96,
    32: 128,
};

// Border Radius
export const borderRadius = {
    none: 0,
    sm: 4,
    base: 8,
    md: 12,
    lg: 16,
    xl: 20,
    '2xl': 24,
    full: 9999,
};

// Shadows
export const shadows = {
    sm: {
        shadowColor: colors.black,
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },

    base: {
        shadowColor: colors.black,
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },

    md: {
        shadowColor: colors.black,
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
    },

    lg: {
        shadowColor: colors.black,
        shadowOffset: {
            width: 0,
            height: 8,
        },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 8,
    },

    xl: {
        shadowColor: colors.black,
        shadowOffset: {
            width: 0,
            height: 12,
        },
        shadowOpacity: 0.25,
        shadowRadius: 24,
        elevation: 12,
    },
};

// Light Theme
export const lightTheme = {
    colors: {
        ...colors,
        background: colors.white,
        surface: colors.gray[50],
        text: colors.gray[900],
        textSecondary: colors.gray[600],
        border: colors.gray[200],
        input: colors.gray[100],
        placeholder: colors.gray[400],
        disabled: colors.gray[300],
        overlay: 'rgba(0, 0, 0, 0.5)',
    },
    typography,
    spacing,
    borderRadius,
    shadows,
};

// Dark Theme
export const darkTheme = {
    colors: {
        ...colors,
        background: colors.gray[900],
        surface: colors.gray[800],
        text: colors.white,
        textSecondary: colors.gray[300],
        border: colors.gray[700],
        input: colors.gray[700],
        placeholder: colors.gray[500],
        disabled: colors.gray[600],
        overlay: 'rgba(0, 0, 0, 0.7)',
    },
    typography,
    spacing,
    borderRadius,
    shadows: {
        ...shadows,
        sm: {
            ...shadows.sm,
            shadowColor: colors.white,
            shadowOpacity: 0.1,
        },
        base: {
            ...shadows.base,
            shadowColor: colors.white,
            shadowOpacity: 0.15,
        },
        md: {
            ...shadows.md,
            shadowColor: colors.white,
            shadowOpacity: 0.2,
        },
        lg: {
            ...shadows.lg,
            shadowColor: colors.white,
            shadowOpacity: 0.25,
        },
        xl: {
            ...shadows.xl,
            shadowColor: colors.white,
            shadowOpacity: 0.3,
        },
    },
};

export type Theme = typeof lightTheme;
export type ColorScheme = 'light' | 'dark';

// Theme Context
export const getTheme = (colorScheme: ColorScheme): Theme => {
    return colorScheme === 'dark' ? darkTheme : lightTheme;
};

