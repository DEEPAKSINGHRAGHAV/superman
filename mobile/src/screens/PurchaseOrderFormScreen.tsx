import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Alert,
    TouchableOpacity,
    Platform,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../contexts/ThemeContext';
import { Button, Input, LoadingSpinner, SearchableDropdown } from '../components/ui';
import { PurchaseOrderFormData, Supplier, Product } from '../types';
import apiService from '../services/api';
import Icon from 'react-native-vector-icons/MaterialIcons';

const PurchaseOrderFormScreen: React.FC = () => {
    const { theme } = useTheme();
    const route = useRoute();
    const navigation = useNavigation();
    const { orderId } = route.params as { orderId?: string };

    // Get today's date in YYYY-MM-DD format
    const getTodayDate = () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const [formData, setFormData] = useState<PurchaseOrderFormData>({
        supplier: '',
        items: [],
        expectedDeliveryDate: getTodayDate(),
        notes: '',
        paymentMethod: 'cash',
    });

    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedProduct, setSelectedProduct] = useState('');
    const [itemQuantity, setItemQuantity] = useState('');
    const [itemCostPrice, setItemCostPrice] = useState('');
    const [itemSellingPrice, setItemSellingPrice] = useState('');
    const [defaultMarkup] = useState(0.20); // 20% default markup

    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false);
    const [isLoadingProducts, setIsLoadingProducts] = useState(false);
    const [errors, setErrors] = useState<Partial<PurchaseOrderFormData>>({});
    const [showDatePicker, setShowDatePicker] = useState(false);

    useEffect(() => {
        loadSuppliers();
        loadProducts();
        if (orderId) {
            loadOrder();
        }
    }, [orderId]);

    const loadSuppliers = async () => {
        try {
            setIsLoadingSuppliers(true);
            const response = await apiService.getSuppliers({}, 1, 100);
            if (response.success && response.data) {
                setSuppliers(response.data);
            }
        } catch (error) {
            console.error('Error loading suppliers:', error);
        } finally {
            setIsLoadingSuppliers(false);
        }
    };

    const loadProducts = async () => {
        try {
            setIsLoadingProducts(true);
            const response = await apiService.getProducts({}, 1, 100);
            if (response.success && response.data) {
                setProducts(response.data);
            }
        } catch (error) {
            console.error('Error loading products:', error);
        } finally {
            setIsLoadingProducts(false);
        }
    };

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
                        sellingPrice: item.sellingPrice || item.costPrice * 1.2, // Use saved or calculate with 20% markup
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

    const handleDateChange = (event: any, selectedDate?: Date) => {
        // On Android, the picker closes automatically
        if (Platform.OS === 'android') {
            setShowDatePicker(false);
        }

        if (selectedDate) {
            const year = selectedDate.getFullYear();
            const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
            const day = String(selectedDate.getDate()).padStart(2, '0');
            const formattedDate = `${year}-${month}-${day}`;
            setFormData(prev => ({ ...prev, expectedDeliveryDate: formattedDate }));
        }
    };

    const formatDisplayDate = (dateString: string) => {
        if (!dateString) return 'Select date';

        const date = new Date(dateString + 'T00:00:00');
        const options: Intl.DateTimeFormatOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        };
        return date.toLocaleDateString('en-US', options);
    };

    // Handle product selection - auto-fill prices from product master
    const handleProductSelect = (productId: string) => {
        setSelectedProduct(productId);

        // Find the selected product
        const product = products.find(p => p._id === productId);
        if (product) {
            // Auto-fill cost price and selling price from product
            setItemCostPrice(product.costPrice.toString());
            setItemSellingPrice(product.sellingPrice.toString());
        }
    };

    // Handle cost price change - auto-calculate selling price with markup
    const handleCostPriceChange = (value: string) => {
        setItemCostPrice(value);

        const cost = parseFloat(value);
        if (!isNaN(cost) && cost > 0) {
            // Auto-calculate selling price with default markup
            const calculatedSellingPrice = cost * (1 + defaultMarkup);
            setItemSellingPrice(calculatedSellingPrice.toFixed(2));
        } else {
            setItemSellingPrice('');
        }
    };

    // Calculate profit margin
    const calculateMargin = (cost: number, selling: number): number => {
        if (cost === 0) return 0;
        return ((selling - cost) / cost) * 100;
    };

    const handleAddItem = () => {
        try {
            if (!selectedProduct) {
                Alert.alert('Validation Error', 'Please select a product');
                return;
            }

            const quantity = parseInt(itemQuantity);
            if (!itemQuantity || isNaN(quantity) || quantity <= 0) {
                Alert.alert('Validation Error', 'Please enter a valid quantity');
                return;
            }

            const costPrice = parseFloat(itemCostPrice);
            if (!itemCostPrice || isNaN(costPrice) || costPrice <= 0) {
                Alert.alert('Validation Error', 'Please enter a valid cost price');
                return;
            }

            const sellingPrice = parseFloat(itemSellingPrice);
            if (!itemSellingPrice || isNaN(sellingPrice) || sellingPrice <= 0) {
                Alert.alert('Validation Error', 'Please enter a valid selling price');
                return;
            }

            if (sellingPrice < costPrice) {
                Alert.alert('Warning', 'Selling price is less than cost price. This will result in a loss. Do you want to continue?', [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Continue',
                        onPress: () => addItemToList(selectedProduct, quantity, costPrice, sellingPrice)
                    }
                ]);
                return;
            }

            addItemToList(selectedProduct, quantity, costPrice, sellingPrice);
        } catch (error) {
            console.error('Error adding item:', error);
            Alert.alert('Error', 'Failed to add item. Please try again.');
        }
    };

    const addItemToList = (productId: string, quantity: number, costPrice: number, sellingPrice: number) => {
        const newItem = {
            product: productId,
            quantity: quantity,
            costPrice: costPrice,
            sellingPrice: sellingPrice,
        };

        setFormData(prev => ({
            ...prev,
            items: [...prev.items, newItem],
        }));

        // Reset item form
        setSelectedProduct('');
        setItemQuantity('');
        setItemCostPrice('');
        setItemSellingPrice('');

        // Clear items error
        if (errors.items) {
            setErrors(prev => ({ ...prev, items: undefined }));
        }
    };

    const handleRemoveItem = (index: number) => {
        setFormData(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index),
        }));
    };

    const getProductName = (productId: string) => {
        const product = products.find(p => p._id === productId);
        return product?.name || productId;
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

            // Calculate totals for each item and overall order
            const itemsWithTotals = formData.items.map(item => ({
                ...item,
                totalAmount: item.quantity * item.costPrice,
            }));

            const subtotal = itemsWithTotals.reduce((sum, item) => sum + item.totalAmount, 0);
            const totalAmount = subtotal; // Add tax/discount logic here if needed

            const orderData = {
                ...formData,
                items: itemsWithTotals,
                subtotal,
                totalAmount,
                taxAmount: 0,
                discountAmount: 0,
            };

            if (orderId) {
                await apiService.updatePurchaseOrder(orderId, orderData);
                Alert.alert('Success', 'Purchase order updated successfully');
            } else {
                await apiService.createPurchaseOrder(orderData);
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

                <SearchableDropdown
                    label="Supplier"
                    placeholder="Select supplier"
                    value={formData.supplier}
                    onSelect={(value) => handleInputChange('supplier', value)}
                    options={suppliers}
                    optionLabelKey="name"
                    optionValueKey="_id"
                    required
                    error={errors.supplier as string}
                    loading={isLoadingSuppliers}
                    searchPlaceholder="Search suppliers..."
                    emptyMessage="No suppliers available"
                />

                <TouchableOpacity
                    style={[styles.datePickerContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                    onPress={() => setShowDatePicker(true)}
                    activeOpacity={0.7}
                >
                    <View style={styles.datePickerContent}>
                        <Icon name="calendar-today" size={20} color={theme.colors.primary['500']} />
                        <View style={styles.dateTextContainer}>
                            <Text style={[styles.dateLabel, { color: theme.colors.textSecondary }]}>
                                Expected Delivery Date
                            </Text>
                            <Text style={[styles.dateValue, { color: theme.colors.text }]}>
                                {formatDisplayDate(formData.expectedDeliveryDate)}
                            </Text>
                        </View>
                    </View>
                    <Icon name="chevron-right" size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>

                {showDatePicker && (
                    <DateTimePicker
                        value={formData.expectedDeliveryDate ? new Date(formData.expectedDeliveryDate + 'T00:00:00') : new Date()}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={handleDateChange}
                        minimumDate={new Date()}
                    />
                )}

                {Platform.OS === 'ios' && showDatePicker && (
                    <View style={styles.datePickerButtons}>
                        <Button
                            title="Done"
                            onPress={() => setShowDatePicker(false)}
                            variant="primary"
                            size="sm"
                        />
                    </View>
                )}

                <SearchableDropdown
                    label="Payment Method"
                    placeholder="Select payment method"
                    value={formData.paymentMethod}
                    onSelect={(value) => handleInputChange('paymentMethod', value)}
                    options={[
                        { name: 'Cash', value: 'cash' },
                        { name: 'Credit', value: 'credit' },
                        { name: 'UPI', value: 'upi' },
                        { name: 'Bank Transfer', value: 'bank_transfer' },
                    ]}
                    optionLabelKey="name"
                    optionValueKey="value"
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
                    Order Items ({formData.items.length})
                </Text>

                {/* Add Item Form */}
                <View style={[styles.addItemContainer, { backgroundColor: theme.colors.surface }]}>
                    <Text style={[styles.addItemTitle, { color: theme.colors.text }]}>Add Product</Text>

                    <SearchableDropdown
                        label="Product"
                        placeholder="Select product"
                        value={selectedProduct}
                        onSelect={(value) => handleProductSelect(value)}
                        options={products}
                        optionLabelKey="name"
                        optionValueKey="_id"
                        loading={isLoadingProducts}
                        searchPlaceholder="Search products..."
                        emptyMessage="No products available"
                    />

                    <View style={styles.itemInputRow}>
                        <View style={styles.itemInputHalf}>
                            <Input
                                label="Quantity"
                                placeholder="0"
                                value={itemQuantity}
                                onChangeText={setItemQuantity}
                                keyboardType="numeric"
                            />
                        </View>
                        <View style={styles.itemInputHalf}>
                            <Input
                                label="Cost Price (₹)"
                                placeholder="0.00"
                                value={itemCostPrice}
                                onChangeText={handleCostPriceChange}
                                keyboardType="decimal-pad"
                            />
                        </View>
                    </View>

                    <View style={styles.itemInputRow}>
                        <View style={styles.itemInputHalf}>
                            <Input
                                label="Selling Price (₹)"
                                placeholder="0.00"
                                value={itemSellingPrice}
                                onChangeText={setItemSellingPrice}
                                keyboardType="decimal-pad"
                            />
                        </View>
                        <View style={styles.itemInputHalf}>
                            {itemCostPrice && itemSellingPrice && (
                                <View style={styles.marginIndicator}>
                                    <Text style={[styles.marginLabel, { color: theme.colors.textSecondary }]}>
                                        Profit Margin
                                    </Text>
                                    <Text style={[
                                        styles.marginValue,
                                        {
                                            color: calculateMargin(parseFloat(itemCostPrice), parseFloat(itemSellingPrice)) < 0
                                                ? theme.colors.error['500']
                                                : theme.colors.success['500']
                                        }
                                    ]}>
                                        {calculateMargin(parseFloat(itemCostPrice), parseFloat(itemSellingPrice)).toFixed(1)}%
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>

                    <Button
                        title="Add Item"
                        onPress={handleAddItem}
                        variant="outline"
                        size="sm"
                        leftIcon={<Icon name="add" size={16} color={theme.colors.primary['500']} />}
                    />
                </View>

                {/* Items List */}
                {formData.items.length > 0 ? (
                    <View style={styles.itemsList}>
                        {formData.items.map((item, index) => (
                            <View
                                key={index}
                                style={[styles.itemCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                            >
                                <View style={styles.itemCardContent}>
                                    <Text style={[styles.itemProductName, { color: theme.colors.text }]}>
                                        {getProductName(item.product)}
                                    </Text>
                                    <View style={styles.itemDetails}>
                                        <Text style={[styles.itemDetailText, { color: theme.colors.textSecondary }]}>
                                            Qty: {item.quantity}
                                        </Text>
                                        <Text style={[styles.itemDetailText, { color: theme.colors.textSecondary }]}>
                                            •
                                        </Text>
                                        <Text style={[styles.itemDetailText, { color: theme.colors.textSecondary }]}>
                                            Cost: ₹{item.costPrice.toFixed(2)}
                                        </Text>
                                        <Text style={[styles.itemDetailText, { color: theme.colors.textSecondary }]}>
                                            •
                                        </Text>
                                        <Text style={[styles.itemDetailText, { color: theme.colors.textSecondary }]}>
                                            Sell: ₹{item.sellingPrice.toFixed(2)}
                                        </Text>
                                    </View>
                                    <View style={styles.itemDetails}>
                                        <Text style={[styles.itemDetailText, { color: theme.colors.primary['600'], fontWeight: '600' }]}>
                                            Total Cost: ₹{(item.quantity * item.costPrice).toFixed(2)}
                                        </Text>
                                        <Text style={[styles.itemDetailText, { color: theme.colors.textSecondary }]}>
                                            •
                                        </Text>
                                        <Text style={[styles.itemDetailText, { color: theme.colors.success['600'], fontWeight: '600' }]}>
                                            Margin: {calculateMargin(item.costPrice, item.sellingPrice).toFixed(1)}%
                                        </Text>
                                    </View>
                                </View>
                                <TouchableOpacity
                                    onPress={() => handleRemoveItem(index)}
                                    style={styles.removeButton}
                                >
                                    <Icon name="delete" size={20} color={theme.colors.error['500']} />
                                </TouchableOpacity>
                            </View>
                        ))}
                        <View style={[styles.totalCard, { backgroundColor: theme.colors.primary['50'] }]}>
                            <Text style={[styles.totalLabel, { color: theme.colors.text }]}>
                                Total Amount:
                            </Text>
                            <Text style={[styles.totalAmount, { color: theme.colors.primary['600'] }]}>
                                ₹{formData.items.reduce((sum, item) => sum + (item.quantity * item.costPrice), 0).toFixed(2)}
                            </Text>
                        </View>
                    </View>
                ) : (
                    <View style={[styles.emptyItems, { backgroundColor: theme.colors.surface }]}>
                        <Icon name="shopping-cart" size={48} color={theme.colors.textSecondary} />
                        <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                            No items added yet
                        </Text>
                    </View>
                )}

                {errors.items && (
                    <Text style={styles.errorText}>{errors.items as string}</Text>
                )}

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
    datePickerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 8,
        borderWidth: 1,
        marginBottom: 16,
    },
    datePickerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    dateTextContainer: {
        flex: 1,
    },
    dateLabel: {
        fontSize: 12,
        fontWeight: '500',
        marginBottom: 2,
    },
    dateValue: {
        fontSize: 16,
        fontWeight: '600',
    },
    datePickerButtons: {
        alignItems: 'flex-end',
        marginTop: 8,
        marginBottom: 16,
    },
    addItemContainer: {
        padding: 16,
        borderRadius: 8,
        marginBottom: 16,
    },
    addItemTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
    },
    itemInputRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
    },
    itemInputHalf: {
        flex: 1,
    },
    marginIndicator: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 12,
    },
    marginLabel: {
        fontSize: 12,
        fontWeight: '500',
        marginBottom: 4,
    },
    marginValue: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    itemsList: {
        marginBottom: 16,
    },
    itemCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        marginBottom: 8,
    },
    itemCardContent: {
        flex: 1,
    },
    itemProductName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    itemDetails: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
    },
    itemDetailText: {
        fontSize: 14,
    },
    removeButton: {
        padding: 8,
    },
    totalCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderRadius: 8,
        marginTop: 8,
    },
    totalLabel: {
        fontSize: 16,
        fontWeight: '600',
    },
    totalAmount: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    emptyItems: {
        padding: 32,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 16,
    },
    emptyText: {
        fontSize: 16,
        marginTop: 12,
    },
    errorText: {
        color: '#EF4444',
        fontSize: 14,
        marginTop: -8,
        marginBottom: 16,
    },
    submitButton: {
        marginTop: 24,
        marginBottom: 24,
    },
});

export default PurchaseOrderFormScreen;