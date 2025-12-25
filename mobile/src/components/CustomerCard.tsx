import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../contexts/ThemeContext';
import { Customer } from '../types';
import { Card } from './ui';

interface CustomerCardProps {
    customer: Customer;
    onPress: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
    showActions?: boolean;
}

export const CustomerCard: React.FC<CustomerCardProps> = ({
    customer,
    onPress,
    onEdit,
    onDelete,
    showActions = false,
}) => {
    const { theme } = useTheme();

    const formatAddress = () => {
        if (!customer.address) return 'No address';
        const { address } = customer;
        const parts = [address.street, address.city, address.state, address.pincode].filter(Boolean);
        return parts.length > 0 ? parts.join(', ') : 'No address';
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
                        {customer.name || 'Walk-in Customer'}
                    </Text>
                    <Text style={[styles.code, { color: theme.colors.textSecondary }]}>
                        {customer.customerNumber}
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
                    {customer.phone && (
                        <View style={styles.contactItem}>
                            <Icon name="phone" size={16} color={theme.colors.textSecondary} />
                            <Text style={[styles.contactText, { color: theme.colors.text }]}>
                                {customer.phone}
                            </Text>
                        </View>
                    )}

                    {customer.email && (
                        <View style={styles.contactItem}>
                            <Icon name="email" size={16} color={theme.colors.textSecondary} />
                            <Text style={[styles.contactText, { color: theme.colors.text }]} numberOfLines={1}>
                                {customer.email}
                            </Text>
                        </View>
                    )}

                    {customer.address && (
                        <View style={styles.contactItem}>
                            <Icon name="location-on" size={16} color={theme.colors.textSecondary} />
                            <Text style={[styles.contactText, { color: theme.colors.text }]} numberOfLines={1}>
                                {formatAddress()}
                            </Text>
                        </View>
                    )}
                </View>
            </View>

            <View style={styles.footer}>
                <View style={styles.statusContainer}>
                    <View style={[
                        styles.statusIndicator,
                        { backgroundColor: customer.isActive ? theme.colors.success[500] : theme.colors.error[500] }
                    ]} />
                    <Text style={[styles.statusText, { color: theme.colors.textSecondary }]}>
                        {customer.isActive ? 'Active' : 'Inactive'}
                    </Text>
                </View>

                <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
                    Added {new Date(customer.createdAt).toLocaleDateString()}
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




