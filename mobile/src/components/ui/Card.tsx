import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ViewStyle,
    TextStyle,
    TouchableOpacity,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

export type CardVariant = 'default' | 'elevated' | 'outlined' | 'filled';

interface CardProps {
    children: React.ReactNode;
    variant?: CardVariant;
    padding?: 'none' | 'sm' | 'md' | 'lg';
    margin?: 'none' | 'sm' | 'md' | 'lg';
    onPress?: () => void;
    style?: ViewStyle;
    title?: string;
    subtitle?: string;
    headerAction?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
    children,
    variant = 'default',
    padding = 'md',
    margin = 'none',
    onPress,
    style,
    title,
    subtitle,
    headerAction,
}) => {
    const { theme } = useTheme();

    const getCardStyle = (): ViewStyle => {
        const baseStyle: ViewStyle = {
            borderRadius: theme.borderRadius.lg,
            overflow: 'hidden',
        };

        // Variant styles
        const variantStyles: Record<CardVariant, ViewStyle> = {
            default: {
                backgroundColor: theme.colors.surface,
                ...theme.shadows.sm,
            },
            elevated: {
                backgroundColor: theme.colors.surface,
                ...theme.shadows.md,
            },
            outlined: {
                backgroundColor: theme.colors.surface,
                borderWidth: 1,
                borderColor: theme.colors.border,
            },
            filled: {
                backgroundColor: theme.colors.gray[50],
            },
        };

        // Padding styles
        const paddingStyles: Record<string, ViewStyle> = {
            none: { padding: 0 },
            sm: { padding: theme.spacing[3] },
            md: { padding: theme.spacing[4] },
            lg: { padding: theme.spacing[6] },
        };

        // Margin styles
        const marginStyles: Record<string, ViewStyle> = {
            none: { margin: 0 },
            sm: { margin: theme.spacing[2] },
            md: { margin: theme.spacing[4] },
            lg: { margin: theme.spacing[6] },
        };

        return {
            ...baseStyle,
            ...variantStyles[variant],
            ...paddingStyles[padding],
            ...marginStyles[margin],
            ...style,
        };
    };

    const getTitleStyle = (): TextStyle => {
        return {
            fontFamily: theme.typography.fontFamily.semibold,
            fontSize: theme.typography.fontSize.lg,
            color: theme.colors.text,
            marginBottom: subtitle ? theme.spacing[1] : theme.spacing[3],
        };
    };

    const getSubtitleStyle = (): TextStyle => {
        return {
            fontFamily: theme.typography.fontFamily.regular,
            fontSize: theme.typography.fontSize.sm,
            color: theme.colors.textSecondary,
            marginBottom: theme.spacing[3],
        };
    };

    const CardContent = () => (
        <View style={getCardStyle()}>
            {(title || subtitle || headerAction) && (
                <View style={styles.header}>
                    <View style={styles.headerText}>
                        {title && <Text style={getTitleStyle()}>{title}</Text>}
                        {subtitle && <Text style={getSubtitleStyle()}>{subtitle}</Text>}
                    </View>
                    {headerAction && <View style={styles.headerAction}>{headerAction}</View>}
                </View>
            )}
            {children}
        </View>
    );

    if (onPress) {
        return (
            <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
                <CardContent />
            </TouchableOpacity>
        );
    }

    return <CardContent />;
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    headerText: {
        flex: 1,
    },
    headerAction: {
        marginLeft: 16,
    },
});

