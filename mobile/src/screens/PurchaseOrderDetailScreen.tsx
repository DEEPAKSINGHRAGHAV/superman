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
                    <Icon name="error" size={64} color={theme.colors.error[500]} />
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
                    <Button
                        title="Edit Order"
                        onPress={handleEdit}
                        variant="primary"
                        leftIcon={<Icon name="edit" size={16} color="white" />}
                        style={styles.actionButton}
                    />
                    <Button
                        title="Delete Order"
                        onPress={handleDelete}
                        variant="danger"
                        leftIcon={<Icon name="delete" size={16} color="white" />}
                        style={styles.actionButton}
                    />
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