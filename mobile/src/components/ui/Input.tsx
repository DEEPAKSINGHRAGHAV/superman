import React, { useState, forwardRef } from 'react';
import {
    View,
    TextInput,
    Text,
    StyleSheet,
    ViewStyle,
    TextStyle,
    TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../../contexts/ThemeContext';

export type InputVariant = 'default' | 'filled' | 'outlined';
export type InputSize = 'sm' | 'md' | 'lg';

interface InputProps {
    label?: string;
    placeholder?: string;
    value: string;
    onChangeText: (text: string) => void;
    variant?: InputVariant;
    size?: InputSize;
    disabled?: boolean;
    error?: string;
    helperText?: string;
    leftIcon?: string;
    rightIcon?: string;
    onRightIconPress?: () => void;
    secureTextEntry?: boolean;
    keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
    autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
    autoCorrect?: boolean;
    multiline?: boolean;
    numberOfLines?: number;
    maxLength?: number;
    style?: ViewStyle;
    inputStyle?: TextStyle;
    required?: boolean;
}

export const Input = forwardRef<TextInput, InputProps>(({
    label,
    placeholder,
    value,
    onChangeText,
    variant = 'outlined',
    size = 'md',
    disabled = false,
    error,
    helperText,
    leftIcon,
    rightIcon,
    onRightIconPress,
    secureTextEntry = false,
    keyboardType = 'default',
    autoCapitalize = 'sentences',
    autoCorrect = true,
    multiline = false,
    numberOfLines = 1,
    maxLength,
    style,
    inputStyle,
    required = false,
}, ref) => {
    const { theme } = useTheme();
    const [isFocused, setIsFocused] = useState(false);

    const getContainerStyle = (): ViewStyle => {
        const baseStyle: ViewStyle = {
            marginBottom: theme.spacing[4],
        };

        return {
            ...baseStyle,
            ...style,
        };
    };

    const getInputContainerStyle = (): ViewStyle => {
        const baseStyle: ViewStyle = {
            flexDirection: 'row',
            alignItems: multiline ? 'flex-start' : 'center',
            borderRadius: theme.borderRadius.base,
            borderWidth: 1,
            backgroundColor: disabled ? theme.colors.gray[100] : theme.colors.background,
        };

        // Size styles
        const sizeStyles: Record<InputSize, ViewStyle> = {
            sm: {
                paddingHorizontal: theme.spacing[3],
                paddingVertical: theme.spacing[2],
                minHeight: 36,
            },
            md: {
                paddingHorizontal: theme.spacing[4],
                paddingVertical: theme.spacing[3],
                minHeight: 44,
            },
            lg: {
                paddingHorizontal: theme.spacing[4],
                paddingVertical: theme.spacing[4],
                minHeight: 52,
            },
        };

        // Variant styles
        const variantStyles: Record<InputVariant, ViewStyle> = {
            default: {
                borderColor: error ? theme.colors.error[500] : isFocused ? theme.colors.primary[500] : theme.colors.border,
                backgroundColor: theme.colors.background,
            },
            filled: {
                borderColor: 'transparent',
                backgroundColor: error ? theme.colors.error[50] : isFocused ? theme.colors.primary[50] : theme.colors.input,
            },
            outlined: {
                borderColor: error ? theme.colors.error[500] : isFocused ? theme.colors.primary[500] : theme.colors.border,
                backgroundColor: theme.colors.background,
            },
        };

        return {
            ...baseStyle,
            ...sizeStyles[size],
            ...variantStyles[variant],
        };
    };

    const getInputStyle = (): TextStyle => {
        const baseStyle: TextStyle = {
            flex: 1,
            fontFamily: theme.typography.fontFamily.regular,
            color: disabled ? theme.colors.disabled : theme.colors.text,
            fontSize: theme.typography.fontSize.base,
            lineHeight: theme.typography.lineHeight.base,
        };

        // Size styles
        const sizeStyles: Record<InputSize, TextStyle> = {
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

        return {
            ...baseStyle,
            ...sizeStyles[size],
            ...inputStyle,
        };
    };

    const getLabelStyle = (): TextStyle => {
        return {
            fontFamily: theme.typography.fontFamily.medium,
            fontSize: theme.typography.fontSize.sm,
            color: error ? theme.colors.error[500] : theme.colors.text,
            marginBottom: theme.spacing[1],
        };
    };

    const getHelperTextStyle = (): TextStyle => {
        return {
            fontFamily: theme.typography.fontFamily.regular,
            fontSize: theme.typography.fontSize.xs,
            color: error ? theme.colors.error[500] : theme.colors.textSecondary,
            marginTop: theme.spacing[1],
        };
    };

    const handleFocus = () => {
        setIsFocused(true);
    };

    const handleBlur = () => {
        setIsFocused(false);
    };

    return (
        <View style={getContainerStyle()}>
            {label && (
                <Text style={getLabelStyle()}>
                    {label}
                    {required && <Text style={{ color: theme.colors.error[500] }}> *</Text>}
                </Text>
            )}

            <View style={getInputContainerStyle()}>
                {leftIcon && (
                    <Icon
                        name={leftIcon}
                        size={20}
                        color={disabled ? theme.colors.disabled : theme.colors.gray[500]}
                        style={styles.leftIcon}
                    />
                )}

                <TextInput
                    ref={ref}
                    style={getInputStyle()}
                    placeholder={placeholder}
                    placeholderTextColor={theme.colors.placeholder}
                    value={value}
                    onChangeText={onChangeText}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    editable={!disabled}
                    secureTextEntry={secureTextEntry}
                    keyboardType={keyboardType}
                    autoCapitalize={autoCapitalize}
                    autoCorrect={autoCorrect}
                    multiline={multiline}
                    numberOfLines={numberOfLines}
                    maxLength={maxLength}
                />

                {rightIcon && (
                    <TouchableOpacity
                        onPress={onRightIconPress}
                        disabled={!onRightIconPress}
                        style={styles.rightIcon}
                    >
                        <Icon
                            name={rightIcon}
                            size={20}
                            color={disabled ? theme.colors.disabled : theme.colors.gray[500]}
                        />
                    </TouchableOpacity>
                )}
            </View>

            {(error || helperText) && (
                <Text style={getHelperTextStyle()}>
                    {error || helperText}
                </Text>
            )}
        </View>
    );
});

const styles = StyleSheet.create({
    leftIcon: {
        marginRight: 12,
    },
    rightIcon: {
        marginLeft: 12,
        padding: 4,
    },
});

