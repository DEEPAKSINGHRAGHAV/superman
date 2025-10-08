import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../contexts/ThemeContext';
import { Button, Card, LoadingSpinner } from '../components/ui';
import { PurchaseOrder } from '../types';
import apiService from '../services/api';

const PurchaseOrderDetailScreen: React.FC = () => {
    const { theme } = useTheme();
    const route = useRoute();
    const navigation = useNavigation();
    const { orderId } = route.params as { orderId: string };

    const [order, setOrder] = useState<PurchaseOrder | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadOrder();
    }, [orderId]);

    const loadOrder = async () => {
        try {
            setIsLoading(true);
            const response = await apiService.getPurchaseOrder(orderId);

            if (response.success && response.data) {
                setOrder(response.data);
            } else {
                setError('Purchase order not found');
            }
        } catch (error: any) {
            console.error('Error loading purchase order:', error);
            setError(error.message || 'Failed to load purchase order');
        } finally {
            setIsLoading(false);
        }
    };

    const handleEdit = () => {
        navigation.navigate('PurchaseOrderForm', { orderId });
    };

    const handleApprove = () => {
        Alert.alert(
            'Approve Purchase Order',
            'Are you sure you want to approve this purchase order?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Approve',
                    onPress: async () => {
                        try {
                            const response = await apiService.approvePurchaseOrder(orderId);
                            if (response.success) {
                                Alert.alert('Success', 'Purchase order approved successfully');
                                loadOrder(); // Reload to show updated status
                            }
                        } catch (error: any) {
                            Alert.alert('Error', error.message || 'Failed to approve purchase order');
                        }
                    },
                },
            ]
        );
    };

    const handleReceive = () => {
        Alert.alert(
            'Receive Stock',
            'Mark this purchase order as received? This will create batches and update inventory.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Receive',
                    onPress: async () => {
                        try {
                            // Prepare received items from order items with correct field names
                            const receivedItems = order?.items.map(item => {
                                const productId = typeof item.product === 'string' ? item.product : item.product._id;
                                // Use selling price from order if available, otherwise calculate with 20% markup
                                const sellingPrice = (item as any).sellingPrice || item.costPrice * 1.2;

                                return {
                                    productId: productId,
                                    quantity: item.quantity,
                                    costPrice: item.costPrice,
                                    sellingPrice: sellingPrice,
                                };
                            }) || [];

                            const response = await apiService.receivePurchaseOrder(orderId, receivedItems);
                            if (response.success) {
                                Alert.alert(
                                    'Success',
                                    `Stock received successfully! ${response.data?.batchCount || 'Batches have been'} batch(es) created and inventory updated.`,
                                    [{ text: 'OK', onPress: () => loadOrder() }]
                                );
                            }
                        } catch (error: any) {
                            Alert.alert('Error', error.message || 'Failed to receive purchase order');
                        }
                    },
                },
            ]
        );
    };

    const handleDelete = () => {
        Alert.alert(
            'Delete Purchase Order',
            'Are you sure you want to delete this purchase order?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await apiService.deletePurchaseOrder(orderId);
                            navigation.goBack();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete purchase order');
                        }
                    },
                },
            ]
        );
    };

    const getContainerStyle = () => ({
        ...styles.container,
        backgroundColor: theme.colors.background,
    });

    if (isLoading) {
        return <LoadingSpinner overlay text="Loading purchase order..." />;
    }

    if (error || !order) {
        return (
            <View style={getContainerStyle()}>
                <View style={styles.errorContainer}>
                    <Icon name="error" size={64} color={theme.colors.error['500']} />
                    <Text style={[styles.errorText, { color: theme.colors.text }]}>
                        {error || 'Purchase order not found'}
                    </Text>
                    <Button
                        title="Go Back"
                        onPress={() => navigation.goBack()}
                        variant="primary"
                    />
                </View>
            </View>
        );
    }

    return (
        <ScrollView style={getContainerStyle()}>
            <View style={styles.content}>
                <Card variant="elevated" style={styles.card}>
                    <Text style={[styles.title, { color: theme.colors.text }]}>
                        {order.orderNumber}
                    </Text>
                    <Text style={[styles.status, { color: theme.colors.textSecondary }]}>
                        Status: {order.status}
                    </Text>

                    <View style={styles.details}>
                        {/* Supplier Info */}
                        <View style={styles.detailRow}>
                            <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                                Supplier:
                            </Text>
                            <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                                {typeof order.supplier === 'string' ? order.supplier : order.supplier.name}
                            </Text>
                        </View>

                        <View style={styles.detailRow}>
                            <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                                Total Amount:
                            </Text>
                            <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                                ₹{order.totalAmount.toLocaleString()}
                            </Text>
                        </View>

                        <View style={styles.detailRow}>
                            <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                                Items:
                            </Text>
                            <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                                {order.items.length} product(s)
                            </Text>
                        </View>

                        <View style={styles.detailRow}>
                            <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                                Order Date:
                            </Text>
                            <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                                {new Date(order.orderDate).toLocaleDateString()}
                            </Text>
                        </View>

                        {order.expectedDeliveryDate && (
                            <View style={styles.detailRow}>
                                <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                                    Expected Delivery:
                                </Text>
                                <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                                    {new Date(order.expectedDeliveryDate).toLocaleDateString()}
                                </Text>
                            </View>
                        )}

                        <View style={styles.detailRow}>
                            <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                                Payment Method:
                            </Text>
                            <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                                {order.paymentMethod}
                            </Text>
                        </View>

                        <View style={styles.detailRow}>
                            <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                                Payment Status:
                            </Text>
                            <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                                {order.paymentStatus}
                            </Text>
                        </View>
                    </View>
                </Card>

                <View style={styles.actions}>
                    {/* Show Approve button only for pending orders */}
                    {order.status === 'pending' && (
                        <Button
                            title="Approve Order"
                            onPress={handleApprove}
                            variant="primary"
                            leftIcon={<Icon name="check-circle" size={16} color="white" />}
                            style={styles.actionButton}
                        />
                    )}

                    {/* Show Receive button only for approved/ordered */}
                    {(order.status === 'approved' || order.status === 'ordered') && (
                        <Button
                            title="Receive Stock"
                            onPress={handleReceive}
                            variant="primary"
                            leftIcon={<Icon name="inventory" size={16} color="white" />}
                            style={styles.actionButton}
                        />
                    )}

                    {/* Show Edit only for pending/approved (not for received) */}
                    {order.status !== 'received' && order.status !== 'cancelled' && (
                        <Button
                            title="Edit Order"
                            onPress={handleEdit}
                            variant="secondary"
                            leftIcon={<Icon name="edit" size={16} color="white" />}
                            style={styles.actionButton}
                        />
                    )}

                    {/* Show Delete only for pending/cancelled */}
                    {(order.status === 'pending' || order.status === 'cancelled') && (
                        <Button
                            title="Delete Order"
                            onPress={handleDelete}
                            variant="danger"
                            leftIcon={<Icon name="delete" size={16} color="white" />}
                            style={styles.actionButton}
                        />
                    )}
                </View>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: 16,
    },
    card: {
        marginBottom: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    status: {
        fontSize: 16,
        marginBottom: 16,
    },
    details: {
        gap: 12,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    detailLabel: {
        fontSize: 16,
    },
    detailValue: {
        fontSize: 16,
        fontWeight: '500',
    },
    actions: {
        gap: 12,
    },
    actionButton: {
        marginBottom: 8,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    errorText: {
        fontSize: 18,
        textAlign: 'center',
        marginVertical: 16,
    },
});

export default PurchaseOrderDetailScreen;