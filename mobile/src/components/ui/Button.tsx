import React from 'react';
import {
    TouchableOpacity,
    Text,
    StyleSheet,
    ViewStyle,
    TextStyle,
    ActivityIndicator,
    View,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: ButtonVariant;
    size?: ButtonSize;
    disabled?: boolean;
    loading?: boolean;
    fullWidth?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    style?: ViewStyle;
    textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
    title,
    onPress,
    variant = 'primary',
    size = 'md',
    disabled = false,
    loading = false,
    fullWidth = false,
    leftIcon,
    rightIcon,
    style,
    textStyle,
}) => {
    const { theme } = useTheme();

    const getButtonStyle = (): ViewStyle => {
        const baseStyle: ViewStyle = {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: theme.borderRadius.base,
        };

        // Size styles
        const sizeStyles: Record<ButtonSize, ViewStyle> = {
            sm: {
                paddingHorizontal: theme.spacing[3],
                paddingVertical: theme.spacing[2],
                minHeight: 32,
            },
            md: {
                paddingHorizontal: theme.spacing[4],
                paddingVertical: theme.spacing[3],
                minHeight: 44,
            },
            lg: {
                paddingHorizontal: theme.spacing[6],
                paddingVertical: theme.spacing[4],
                minHeight: 52,
            },
        };

        // Variant styles
        const variantStyles: Record<ButtonVariant, ViewStyle> = {
            primary: {
                backgroundColor: disabled ? theme.colors.gray[300] : theme.colors.primary[500],
                borderWidth: 0,
                ...theme.shadows.sm,
            },
            secondary: {
                backgroundColor: disabled ? theme.colors.gray[300] : theme.colors.secondary[500],
                borderWidth: 0,
                ...theme.shadows.sm,
            },
            outline: {
                backgroundColor: 'transparent',
                borderWidth: 1,
                borderColor: disabled ? theme.colors.gray[300] : theme.colors.primary[500],
            },
            ghost: {
                backgroundColor: 'transparent',
                borderWidth: 0,
            },
            danger: {
                backgroundColor: disabled ? theme.colors.gray[300] : theme.colors.error[500],
                borderWidth: 0,
                ...theme.shadows.sm,
            },
        };

        return {
            ...baseStyle,
            ...sizeStyles[size],
            ...variantStyles[variant],
            ...(fullWidth && { width: '100%' }),
            ...style,
        };
    };

    const getTextStyle = (): TextStyle => {
        const baseStyle: TextStyle = {
            fontFamily: theme.typography.fontFamily.medium,
            textAlign: 'center',
        };

        // Size styles
        const sizeStyles: Record<ButtonSize, TextStyle> = {
            sm: {
                fontSize: theme.typography.fontSize.sm,
                lineHeight: theme.typography.lineHeight.sm,
            },
            md: {
                fontSize: theme.typography.fontSize.base,
                lineHeight: theme.typography.lineHeight.base,
            },
            lg: {
                fontSize: theme.typography.fontSize.lg,
                lineHeight: theme.typography.lineHeight.lg,
            },
        };

        // Variant styles
        const variantStyles: Record<ButtonVariant, TextStyle> = {
            primary: {
                color: disabled ? theme.colors.gray[500] : theme.colors.white,
            },
            secondary: {
                color: disabled ? theme.colors.gray[500] : theme.colors.white,
            },
            outline: {
                color: disabled ? theme.colors.gray[500] : theme.colors.primary[500],
            },
            ghost: {
                color: disabled ? theme.colors.gray[500] : theme.colors.primary[500],
            },
            danger: {
                color: disabled ? theme.colors.gray[500] : theme.colors.white,
            },
        };

        return {
            ...baseStyle,
            ...sizeStyles[size],
            ...variantStyles[variant],
            ...textStyle,
        };
    };

    const isDisabled = disabled || loading;

    return (
        <TouchableOpacity
            style={getButtonStyle()}
            onPress={onPress}
            disabled={isDisabled}
            activeOpacity={0.7}
        >
            {loading ? (
                <ActivityIndicator
                    size="small"
                    color={variant === 'outline' || variant === 'ghost' ? theme.colors.primary[500] : theme.colors.white}
                />
            ) : (
                <View style={styles.content}>
                    {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
                    <Text style={getTextStyle()}>{title}</Text>
                    {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
                </View>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    leftIcon: {
        marginRight: 8,
    },
    rightIcon: {
        marginLeft: 8,
    },
});

