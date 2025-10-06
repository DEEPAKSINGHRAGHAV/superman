import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from './ui';

interface EmptyStateProps {
    icon?: string;
    title: string;
    subtitle?: string;
    actionText?: string;
    onActionPress?: () => void;
    style?: any;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    icon = 'inbox',
    title,
    subtitle,
    actionText,
    onActionPress,
    style,
}) => {
    const { theme } = useTheme();

    return (
        <View style={[styles.container, style]}>
            <View style={[styles.iconContainer, { backgroundColor: theme.colors.gray[100] }]}>
                <Icon
                    name={icon}
                    size={64}
                    color={theme.colors.gray[400]}
                />
            </View>

            <Text style={[styles.title, { color: theme.colors.text }]}>
                {title}
            </Text>

            {subtitle && (
                <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                    {subtitle}
                </Text>
            )}

            {actionText && onActionPress && (
                <Button
                    title={actionText}
                    onPress={onActionPress}
                    variant="primary"
                    style={styles.actionButton}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        paddingVertical: 64,
    },
    iconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 20,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 32,
    },
    actionButton: {
        minWidth: 200,
    },
});

