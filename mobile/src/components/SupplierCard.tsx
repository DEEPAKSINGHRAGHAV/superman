import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../contexts/ThemeContext';
import { Supplier } from '../types';
import { Card } from './ui';

interface SupplierCardProps {
    supplier: Supplier;
    onPress: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
    showActions?: boolean;
}

export const SupplierCard: React.FC<SupplierCardProps> = ({
    supplier,
    onPress,
    onEdit,
    onDelete,
    showActions = false,
}) => {
    const { theme } = useTheme();

    const getRatingColor = (rating: number) => {
        if (rating >= 4) return theme.colors.success[500];
        if (rating >= 3) return theme.colors.warning[500];
        return theme.colors.error[500];
    };

    const formatAddress = () => {
        const { address } = supplier;
        const parts = [address.street, address.city, address.state, address.pincode].filter(Boolean);
        return parts.join(', ');
    };

    return (
        <Card
            variant="elevated"
            onPress={onPress}
            style={styles.card}
        >
            <View style={styles.header}>
                <View style={styles.titleContainer}>
                    <Text style={[styles.name, { color: theme.colors.text }]} numberOfLines={1}>
                        {supplier.name}
                    </Text>
                    <Text style={[styles.code, { color: theme.colors.textSecondary }]}>
                        Code: {supplier.code}
                    </Text>
                </View>

                {showActions && (
                    <View style={styles.actions}>
                        {onEdit && (
                            <TouchableOpacity
                                onPress={onEdit}
                                style={[styles.actionButton, { backgroundColor: theme.colors.primary[50] }]}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                                <Icon name="edit" size={16} color={theme.colors.primary[500]} />
                            </TouchableOpacity>
                        )}
                        {onDelete && (
                            <TouchableOpacity
                                onPress={onDelete}
                                style={[styles.actionButton, { backgroundColor: theme.colors.error[50] }]}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                                <Icon name="delete" size={16} color={theme.colors.error[500]} />
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </View>

            <View style={styles.content}>
                <View style={styles.contactInfo}>
                    <View style={styles.contactItem}>
                        <Icon name="email" size={16} color={theme.colors.textSecondary} />
                        <Text style={[styles.contactText, { color: theme.colors.text }]} numberOfLines={1}>
                            {supplier.email}
                        </Text>
                    </View>

                    {supplier.phone && (
                        <View style={styles.contactItem}>
                            <Icon name="phone" size={16} color={theme.colors.textSecondary} />
                            <Text style={[styles.contactText, { color: theme.colors.text }]}>
                                {supplier.phone}
                            </Text>
                        </View>
                    )}

                    <View style={styles.contactItem}>
                        <Icon name="location-on" size={16} color={theme.colors.textSecondary} />
                        <Text style={[styles.contactText, { color: theme.colors.text }]} numberOfLines={1}>
                            {formatAddress()}
                        </Text>
                    </View>
                </View>

                <View style={styles.stats}>
                    <View style={styles.statItem}>
                        <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                            Rating
                        </Text>
                        <View style={styles.ratingContainer}>
                            <Icon name="star" size={16} color={getRatingColor(supplier.rating)} />
                            <Text style={[styles.statValue, { color: getRatingColor(supplier.rating) }]}>
                                {supplier.rating.toFixed(1)}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.statItem}>
                        <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                            Orders
                        </Text>
                        <Text style={[styles.statValue, { color: theme.colors.text }]}>
                            {supplier.totalOrders}
                        </Text>
                    </View>

                    <View style={styles.statItem}>
                        <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                            Total Value
                        </Text>
                        <Text style={[styles.statValue, { color: theme.colors.text }]}>
                            ₹{supplier.totalAmount.toLocaleString()}
                        </Text>
                    </View>
                </View>
            </View>

            <View style={styles.footer}>
                <View style={styles.statusContainer}>
                    <View style={[
                        styles.statusIndicator,
                        { backgroundColor: supplier.isActive ? theme.colors.success[500] : theme.colors.error[500] }
                    ]} />
                    <Text style={[styles.statusText, { color: theme.colors.textSecondary }]}>
                        {supplier.isActive ? 'Active' : 'Inactive'}
                    </Text>
                </View>

                <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
                    Added {new Date(supplier.createdAt).toLocaleDateString()}
                </Text>
            </View>
        </Card>
    );
};

const styles = StyleSheet.create({
    card: {
        marginHorizontal: 16,
        marginVertical: 8,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    titleContainer: {
        flex: 1,
        marginRight: 12,
    },
    name: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    code: {
        fontSize: 12,
    },
    actions: {
        flexDirection: 'row',
        gap: 8,
    },
    actionButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        marginBottom: 12,
    },
    contactInfo: {
        marginBottom: 12,
    },
    contactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    contactText: {
        fontSize: 14,
        marginLeft: 8,
        flex: 1,
    },
    stats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    statItem: {
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 12,
        marginBottom: 4,
    },
    statValue: {
        fontSize: 14,
        fontWeight: '600',
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: 'rgba(0, 0, 0, 0.1)',
        paddingTop: 8,
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    statusText: {
        fontSize: 12,
    },
    metaText: {
        fontSize: 10,
    },
});






