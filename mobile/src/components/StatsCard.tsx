import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../contexts/ThemeContext';
import { Card } from './ui';

interface StatsCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon?: string;
    color?: string;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    onPress?: () => void;
}

export const StatsCard: React.FC<StatsCardProps> = ({
    title,
    value,
    subtitle,
    icon,
    color,
    trend,
    onPress,
}) => {
    const { theme } = useTheme();
    const screenWidth = Dimensions.get('window').width;
    const isSmallScreen = screenWidth < 400;

    const getCardColor = () => {
        if (color) return color;
        return theme.colors.primary[500];
    };

    const formatValue = (val: string | number) => {
        if (typeof val === 'number') {
            if (val >= 1000000) {
                return `${(val / 1000000).toFixed(1)}M`;
            } else if (val >= 1000) {
                return `${(val / 1000).toFixed(1)}K`;
            }
            return val.toString();
        }
        return val;
    };

    const getCardStyle = () => ({
        ...styles.card,
        borderLeftColor: getCardColor(),
        width: isSmallScreen ? '47%' : '48%',
        maxWidth: isSmallScreen ? '47%' : '48%',
    });

    return (
        <Card
            variant="elevated"
            onPress={onPress}
            style={getCardStyle()}
        >
            <View style={styles.header}>
                <View style={styles.titleContainer}>
                    <Text style={[styles.title, { color: theme.colors.textSecondary }]}>
                        {title}
                    </Text>
                    {subtitle && (
                        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                            {subtitle}
                        </Text>
                    )}
                </View>

                {icon && (
                    <View style={[styles.iconContainer, { backgroundColor: `${getCardColor()}20` }]}>
                        <Icon name={icon} size={24} color={getCardColor()} />
                    </View>
                )}
            </View>

            <View style={styles.content}>
                <Text
                    style={[styles.value, { color: theme.colors.text }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit={true}
                    minimumFontScale={0.8}
                >
                    {formatValue(value)}
                </Text>

                {trend && (
                    <View style={styles.trendContainer}>
                        <Icon
                            name={trend.isPositive ? 'trending-up' : 'trending-down'}
                            size={16}
                            color={trend.isPositive ? theme.colors.success[500] : theme.colors.error[500]}
                        />
                        <Text
                            style={[
                                styles.trendText,
                                {
                                    color: trend.isPositive ? theme.colors.success[500] : theme.colors.error[500],
                                },
                            ]}
                        >
                            {Math.abs(trend.value)}%
                        </Text>
                    </View>
                )}
            </View>
        </Card>
    );
};

const styles = StyleSheet.create({
    card: {
        borderLeftWidth: 4,
        marginVertical: 4,
        minHeight: 100,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    titleContainer: {
        flex: 1,
    },
    title: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 2,
    },
    subtitle: {
        fontSize: 12,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        minHeight: 32,
    },
    value: {
        fontSize: 24,
        fontWeight: '700',
        flex: 1,
    },
    trendContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    trendText: {
        fontSize: 12,
        fontWeight: '500',
        marginLeft: 4,
    },
});

