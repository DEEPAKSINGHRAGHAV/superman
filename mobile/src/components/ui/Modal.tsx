import React, { useEffect } from 'react';
import {
    Modal as RNModal,
    View,
    Text,
    StyleSheet,
    ViewStyle,
    TextStyle,
    TouchableOpacity,
    TouchableWithoutFeedback,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../../contexts/ThemeContext';

interface ModalProps {
    visible: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'full';
    showCloseButton?: boolean;
    closeOnBackdrop?: boolean;
    style?: ViewStyle;
    contentStyle?: ViewStyle;
}

export const Modal: React.FC<ModalProps> = ({
    visible,
    onClose,
    title,
    children,
    size = 'md',
    showCloseButton = true,
    closeOnBackdrop = true,
    style,
    contentStyle,
}) => {
    const { theme } = useTheme();
    const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

    useEffect(() => {
        if (visible) {
            // Prevent body scroll on web if needed
        }
    }, [visible]);

    const getModalSize = (): ViewStyle => {
        const sizeStyles: Record<string, ViewStyle> = {
            sm: {
                width: screenWidth * 0.8,
                maxHeight: screenHeight * 0.6,
            },
            md: {
                width: screenWidth * 0.9,
                maxHeight: screenHeight * 0.8,
            },
            lg: {
                width: screenWidth * 0.95,
                maxHeight: screenHeight * 0.9,
            },
            full: {
                width: screenWidth,
                height: screenHeight,
            },
        };

        return sizeStyles[size];
    };

    const getContainerStyle = (): ViewStyle => {
        return {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: theme.colors.overlay,
            padding: theme.spacing[4],
        };
    };

    const getContentStyle = (): ViewStyle => {
        return {
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.xl,
            ...theme.shadows.xl,
            ...getModalSize(),
            ...contentStyle,
        };
    };

    const getHeaderStyle = (): ViewStyle => {
        return {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: theme.spacing[6],
            paddingVertical: theme.spacing[4],
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
        };
    };

    const getTitleStyle = (): TextStyle => {
        return {
            fontFamily: theme.typography.fontFamily.semibold,
            fontSize: theme.typography.fontSize.xl,
            color: theme.colors.text,
            flex: 1,
        };
    };

    const getBodyStyle = (): ViewStyle => {
        return {
            padding: theme.spacing[6],
            flex: 1,
        };
    };

    const handleBackdropPress = () => {
        if (closeOnBackdrop) {
            onClose();
        }
    };

    const ModalContent = () => (
        <View style={getContentStyle()}>
            {(title || showCloseButton) && (
                <View style={getHeaderStyle()}>
                    {title && <Text style={getTitleStyle()}>{title}</Text>}
                    {showCloseButton && (
                        <TouchableOpacity
                            onPress={onClose}
                            style={styles.closeButton}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Icon
                                name="close"
                                size={24}
                                color={theme.colors.textSecondary}
                            />
                        </TouchableOpacity>
                    )}
                </View>
            )}
            <View style={getBodyStyle()}>
                {children}
            </View>
        </View>
    );

    return (
        <RNModal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={handleBackdropPress}>
                <View style={getContainerStyle()}>
                    <TouchableWithoutFeedback>
                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                            style={style}
                        >
                            <ModalContent />
                        </KeyboardAvoidingView>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </RNModal>
    );
};

const styles = StyleSheet.create({
    closeButton: {
        padding: 4,
    },
});

