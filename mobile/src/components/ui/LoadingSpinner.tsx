import React from 'react';
import {
    View,
    ActivityIndicator,
    Text,
    StyleSheet,
    ViewStyle,
    TextStyle,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

export type LoadingSize = 'sm' | 'md' | 'lg';

interface LoadingSpinnerProps {
    size?: LoadingSize;
    color?: string;
    text?: string;
    overlay?: boolean;
    style?: ViewStyle;
    textStyle?: TextStyle;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
    size = 'md',
    color,
    text,
    overlay = false,
    style,
    textStyle,
}) => {
    const { theme } = useTheme();

    const getSpinnerSize = (): number => {
        const sizeMap: Record<LoadingSize, number> = {
            sm: 20,
            md: 32,
            lg: 48,
        };
        return sizeMap[size];
    };

    const getContainerStyle = (): ViewStyle => {
        const baseStyle: ViewStyle = {
            alignItems: 'center',
            justifyContent: 'center',
        };

        if (overlay) {
            return {
                ...baseStyle,
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: theme.colors.overlay,
                zIndex: 1000,
            };
        }

        return {
            ...baseStyle,
            padding: theme.spacing[4],
            ...style,
        };
    };

    const getTextStyle = (): TextStyle => {
        return {
            fontFamily: theme.typography.fontFamily.regular,
            fontSize: theme.typography.fontSize.sm,
            color: theme.colors.textSecondary,
            marginTop: theme.spacing[2],
            textAlign: 'center',
            ...textStyle,
        };
    };

    const spinnerColor = color || theme.colors.primary[500];

    return (
        <View style={getContainerStyle()}>
            <ActivityIndicator
                size={getSpinnerSize()}
                color={spinnerColor}
            />
            {text && <Text style={getTextStyle()}>{text}</Text>}
        </View>
    );
};

