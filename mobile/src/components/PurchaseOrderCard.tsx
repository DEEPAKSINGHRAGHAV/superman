import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../contexts/ThemeContext';
import { PurchaseOrder } from '../types';
import { Card } from './ui';

interface PurchaseOrderCardProps {
    order: PurchaseOrder;
    onPress: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
    showActions?: boolean;
}

export const PurchaseOrderCard: React.FC<PurchaseOrderCardProps> = ({
    order,
    onPress,
    onEdit,
    onDelete,
    showActions = false,
}) => {
    const { theme } = useTheme();

    const getStatusColor = (status: string) => {
        const statusColors: Record<string, string> = {
            pending: theme.colors.warning[500],
            approved: theme.colors.success[500],
            ordered: theme.colors.info[500],
            received: theme.colors.success[600],
            cancelled: theme.colors.error[500],
        };
        return statusColors[status] || theme.colors.gray[500];
    };

    const getStatusIcon = (status: string) => {
        const statusIcons: Record<string, string> = {
            pending: 'pending',
            approved: 'check-circle',
            ordered: 'shopping-cart',
            received: 'done-all',
            cancelled: 'cancel',
        };
        return statusIcons[status] || 'help';
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString();
    };

    const getSupplierName = () => {
        if (typeof order.supplier === 'string') {
            return 'Supplier';
        }
        return order.supplier.name;
    };

    return (
        <Card
            variant="elevated"
            onPress={onPress}
            style={styles.card}
        >
            <View style={styles.header}>
                <View style={styles.titleContainer}>
                    <Text style={[styles.orderNumber, { color: theme.colors.text }]}>
                        {order.orderNumber}
                    </Text>
                    <Text style={[styles.supplier, { color: theme.colors.textSecondary }]}>
                        {getSupplierName()}
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
                <View style={styles.statusContainer}>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
                        <Icon
                            name={getStatusIcon(order.status)}
                            size={16}
                            color={theme.colors.white}
                        />
                        <Text style={styles.statusText}>
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </Text>
                    </View>
                </View>

                <View style={styles.details}>
                    <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                            Items:
                        </Text>
                        <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                            {order.items.length} products
                        </Text>
                    </View>

                    <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                            Total Amount:
                        </Text>
                        <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                            {formatCurrency(order.totalAmount)}
                        </Text>
                    </View>

                    <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                            Order Date:
                        </Text>
                        <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                            {formatDate(order.orderDate)}
                        </Text>
                    </View>

                    {order.expectedDeliveryDate && (
                        <View style={styles.detailRow}>
                            <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                                Expected Delivery:
                            </Text>
                            <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                                {formatDate(order.expectedDeliveryDate)}
                            </Text>
                        </View>
                    )}
                </View>
            </View>

            <View style={styles.footer}>
                <View style={styles.paymentInfo}>
                    <Text style={[styles.paymentLabel, { color: theme.colors.textSecondary }]}>
                        Payment: {order.paymentMethod}
                    </Text>
                    <View style={[
                        styles.paymentStatus,
                        { backgroundColor: order.paymentStatus === 'paid' ? theme.colors.success[50] : theme.colors.warning[50] }
                    ]}>
                        <Text style={[
                            styles.paymentStatusText,
                            { color: order.paymentStatus === 'paid' ? theme.colors.success[500] : theme.colors.warning[500] }
                        ]}>
                            {order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}
                        </Text>
                    </View>
                </View>
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
    orderNumber: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    supplier: {
        fontSize: 14,
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
    statusContainer: {
        marginBottom: 12,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '500',
        color: 'white',
        marginLeft: 4,
    },
    details: {
        gap: 6,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    detailLabel: {
        fontSize: 14,
    },
    detailValue: {
        fontSize: 14,
        fontWeight: '500',
    },
    footer: {
        borderTopWidth: 1,
        borderTopColor: 'rgba(0, 0, 0, 0.1)',
        paddingTop: 8,
    },
    paymentInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    paymentLabel: {
        fontSize: 12,
    },
    paymentStatus: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    paymentStatusText: {
        fontSize: 10,
        fontWeight: '500',
    },
});








