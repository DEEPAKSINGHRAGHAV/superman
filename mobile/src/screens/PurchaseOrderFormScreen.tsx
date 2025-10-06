import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { Button, Input, LoadingSpinner } from '../components/ui';
import { PurchaseOrderFormData } from '../types';
import apiService from '../services/api';

const PurchaseOrderFormScreen: React.FC = () => {
    const { theme } = useTheme();
    const route = useRoute();
    const navigation = useNavigation();
    const { orderId } = route.params as { orderId?: string };

    const [formData, setFormData] = useState<PurchaseOrderFormData>({
        supplier: '',
        items: [],
        expectedDeliveryDate: '',
        notes: '',
        paymentMethod: 'credit',
    });

    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<Partial<PurchaseOrderFormData>>({});

    useEffect(() => {
        if (orderId) {
            loadOrder();
        }
    }, [orderId]);

    const loadOrder = async () => {
        try {
            setIsLoading(true);
            const response = await apiService.getPurchaseOrder(orderId!);

            if (response.success && response.data) {
                const order = response.data;
                setFormData({
                    supplier: typeof order.supplier === 'string' ? order.supplier : order.supplier._id,
                    items: order.items.map(item => ({
                        product: typeof item.product === 'string' ? item.product : item.product._id,
                        quantity: item.quantity,
                        costPrice: item.costPrice,
                    })),
                    expectedDeliveryDate: order.expectedDeliveryDate || '',
                    notes: order.notes || '',
                    paymentMethod: order.paymentMethod,
                });
            }
        } catch (error) {
            console.error('Error loading purchase order:', error);
            Alert.alert('Error', 'Failed to load purchase order');
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (field: keyof PurchaseOrderFormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));

        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };

    const validateForm = () => {
        const newErrors: Partial<PurchaseOrderFormData> = {};

        if (!formData.supplier.trim()) {
            newErrors.supplier = 'Supplier is required';
        }

        if (formData.items.length === 0) {
            newErrors.items = 'At least one item is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) {
            Alert.alert('Validation Error', 'Please fix the errors before submitting');
            return;
        }

        try {
            setIsLoading(true);

            if (orderId) {
                await apiService.updatePurchaseOrder(orderId, formData);
                Alert.alert('Success', 'Purchase order updated successfully');
            } else {
                await apiService.createPurchaseOrder(formData);
                Alert.alert('Success', 'Purchase order created successfully');
            }

            navigation.goBack();
        } catch (error: any) {
            console.error('Error saving purchase order:', error);
            Alert.alert('Error', error.message || 'Failed to save purchase order');
        } finally {
            setIsLoading(false);
        }
    };

    const getContainerStyle = () => ({
        ...styles.container,
        backgroundColor: theme.colors.background,
    });

    if (isLoading && orderId) {
        return <LoadingSpinner overlay text="Loading purchase order..." />;
    }

    return (
        <ScrollView style={getContainerStyle()}>
            <View style={styles.content}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                    Purchase Order Details
                </Text>

                <Input
                    label="Supplier"
                    placeholder="Select supplier"
                    value={formData.supplier}
                    onChangeText={(text) => handleInputChange('supplier', text)}
                    error={errors.supplier}
                    required
                />

                <Input
                    label="Expected Delivery Date"
                    placeholder="Select delivery date"
                    value={formData.expectedDeliveryDate}
                    onChangeText={(text) => handleInputChange('expectedDeliveryDate', text)}
                />

                <Input
                    label="Payment Method"
                    placeholder="Select payment method"
                    value={formData.paymentMethod}
                    onChangeText={(text) => handleInputChange('paymentMethod', text)}
                />

                <Input
                    label="Notes"
                    placeholder="Enter any additional notes"
                    value={formData.notes}
                    onChangeText={(text) => handleInputChange('notes', text)}
                    multiline
                    numberOfLines={3}
                />

                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                    Order Items
                </Text>

                <View style={[styles.itemsContainer, { backgroundColor: theme.colors.surface }]}>
                    <Text style={[styles.itemsPlaceholder, { color: theme.colors.textSecondary }]}>
                        Items will be added here
                    </Text>
                    <Button
                        title="Add Item"
                        onPress={() => {
                            // Navigate to add item screen
                            console.log('Add item');
                        }}
                        variant="outline"
                        size="sm"
                    />
                </View>

                <Button
                    title={orderId ? 'Update Order' : 'Create Order'}
                    onPress={handleSubmit}
                    variant="primary"
                    size="lg"
                    fullWidth
                    loading={isLoading}
                    style={styles.submitButton}
                />
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
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginTop: 16,
        marginBottom: 12,
    },
    itemsContainer: {
        padding: 16,
        borderRadius: 8,
        marginBottom: 16,
        alignItems: 'center',
    },
    itemsPlaceholder: {
        fontSize: 16,
        marginBottom: 12,
    },
    submitButton: {
        marginTop: 24,
    },
});

export default PurchaseOrderFormScreen;