import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../contexts/ThemeContext';
import { StockMovement } from '../types';
import { Card } from './ui';

interface StockMovementCardProps {
    movement: StockMovement;
    onPress?: () => void;
}

export const StockMovementCard: React.FC<StockMovementCardProps> = ({
    movement,
    onPress,
}) => {
    const { theme } = useTheme();

    const getMovementIcon = (type: string) => {
        const icons: Record<string, string> = {
            purchase: 'add-shopping-cart',
            sale: 'remove-shopping-cart',
            adjustment: 'tune',
            return: 'keyboard-return',
            damage: 'error',
            transfer: 'swap-horiz',
            expired: 'schedule',
        };
        return icons[type] || 'help';
    };

    const getMovementColor = (type: string) => {
        const colors: Record<string, string> = {
            purchase: theme.colors.success[500],
            sale: theme.colors.info[500],
            adjustment: theme.colors.warning[500],
            return: theme.colors.secondary[500],
            damage: theme.colors.error[500],
            transfer: theme.colors.gray[500],
            expired: theme.colors.warning[600],
        };
        return colors[type] || theme.colors.gray[500];
    };

    const getQuantityColor = (quantity: number) => {
        if (quantity > 0) return theme.colors.success[500];
        if (quantity < 0) return theme.colors.error[500];
        return theme.colors.gray[500];
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

        if (diffInHours < 1) return 'Just now';
        if (diffInHours < 24) return `${diffInHours}h ago`;
        if (diffInHours < 48) return 'Yesterday';
        return date.toLocaleDateString();
    };

    const getProductName = () => {
        if (typeof movement.product === 'string') {
            return 'Product';
        }
        return movement.product.name;
    };

    const getCreatedByName = () => {
        if (typeof movement.createdBy === 'string') {
            return 'User';
        }
        return movement.createdBy.name;
    };

    return (
        <Card
            variant="outlined"
            onPress={onPress}
            style={styles.card}
        >
            <View style={styles.header}>
                <View style={[styles.iconContainer, { backgroundColor: `${getMovementColor(movement.movementType)}20` }]}>
                    <Icon
                        name={getMovementIcon(movement.movementType)}
                        size={20}
                        color={getMovementColor(movement.movementType)}
                    />
                </View>

                <View style={styles.headerContent}>
                    <Text style={[styles.productName, { color: theme.colors.text }]} numberOfLines={1}>
                        {getProductName()}
                    </Text>
                    <Text style={[styles.movementType, { color: theme.colors.textSecondary }]}>
                        {movement.movementType.charAt(0).toUpperCase() + movement.movementType.slice(1)}
                    </Text>
                </View>

                <View style={styles.quantityContainer}>
                    <Text style={[
                        styles.quantity,
                        { color: getQuantityColor(movement.quantity) }
                    ]}>
                        {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                    </Text>
                </View>
            </View>

            <View style={styles.content}>
                <View style={styles.stockInfo}>
                    <View style={styles.stockRow}>
                        <Text style={[styles.stockLabel, { color: theme.colors.textSecondary }]}>
                            Previous:
                        </Text>
                        <Text style={[styles.stockValue, { color: theme.colors.text }]}>
                            {movement.previousStock}
                        </Text>
                    </View>

                    <View style={styles.stockRow}>
                        <Text style={[styles.stockLabel, { color: theme.colors.textSecondary }]}>
                            New Stock:
                        </Text>
                        <Text style={[styles.stockValue, { color: theme.colors.text }]}>
                            {movement.newStock}
                        </Text>
                    </View>
                </View>

                {movement.reason && (
                    <View style={styles.reasonContainer}>
                        <Text style={[styles.reasonLabel, { color: theme.colors.textSecondary }]}>
                            Reason:
                        </Text>
                        <Text style={[styles.reasonText, { color: theme.colors.text }]} numberOfLines={2}>
                            {movement.reason}
                        </Text>
                    </View>
                )}

                {movement.notes && (
                    <View style={styles.notesContainer}>
                        <Text style={[styles.notesLabel, { color: theme.colors.textSecondary }]}>
                            Notes:
                        </Text>
                        <Text style={[styles.notesText, { color: theme.colors.text }]} numberOfLines={2}>
                            {movement.notes}
                        </Text>
                    </View>
                )}
            </View>

            <View style={styles.footer}>
                <View style={styles.metaInfo}>
                    <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
                        By {getCreatedByName()}
                    </Text>
                    <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
                        {formatDate(movement.createdAt)}
                    </Text>
                </View>

                {movement.referenceNumber && (
                    <Text style={[styles.referenceText, { color: theme.colors.primary[500] }]}>
                        Ref: {movement.referenceNumber}
                    </Text>
                )}
            </View>
        </Card>
    );
};

const styles = StyleSheet.create({
    card: {
        marginHorizontal: 16,
        marginVertical: 4,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    headerContent: {
        flex: 1,
    },
    productName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    movementType: {
        fontSize: 12,
        textTransform: 'capitalize',
    },
    quantityContainer: {
        alignItems: 'center',
    },
    quantity: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    content: {
        marginBottom: 12,
    },
    stockInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    stockRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    stockLabel: {
        fontSize: 12,
        marginRight: 4,
    },
    stockValue: {
        fontSize: 12,
        fontWeight: '500',
    },
    reasonContainer: {
        marginBottom: 8,
    },
    reasonLabel: {
        fontSize: 12,
        marginBottom: 2,
    },
    reasonText: {
        fontSize: 14,
        lineHeight: 18,
    },
    notesContainer: {
        marginBottom: 8,
    },
    notesLabel: {
        fontSize: 12,
        marginBottom: 2,
    },
    notesText: {
        fontSize: 14,
        lineHeight: 18,
        fontStyle: 'italic',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: 'rgba(0, 0, 0, 0.1)',
        paddingTop: 8,
    },
    metaInfo: {
        flexDirection: 'row',
        gap: 12,
    },
    metaText: {
        fontSize: 10,
    },
    referenceText: {
        fontSize: 10,
        fontWeight: '500',
    },
});




