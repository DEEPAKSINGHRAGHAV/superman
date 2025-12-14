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
import { Modal } from '../components/ui/Modal';
import { PurchaseOrderFormData, Supplier, Product } from '../types';
import apiService from '../services/api';
import Icon from 'react-native-vector-icons/MaterialIcons';

const PurchaseOrderFormScreen: React.FC = () => {
    const { theme } = useTheme();
    const route = useRoute();
    const navigation = useNavigation();
    const { orderId } = route.params as { orderId?: string };

    // Get tomorrow's date in YYYY-MM-DD format (current date + 1)
    const getTomorrowDate = () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1); // Add 1 day
        const year = tomorrow.getFullYear();
        const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
        const day = String(tomorrow.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const [formData, setFormData] = useState<PurchaseOrderFormData>({
        supplier: '',
        items: [],
        expectedDeliveryDate: getTomorrowDate(),
        notes: '',
        paymentMethod: 'cash',
    });

    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedProduct, setSelectedProduct] = useState('');
    const [itemQuantity, setItemQuantity] = useState('');
    const [itemMRP, setItemMRP] = useState('');
    const [itemCostPrice, setItemCostPrice] = useState('');
    const [itemSellingPrice, setItemSellingPrice] = useState('');
    const [itemExpiryDate, setItemExpiryDate] = useState('');
    const [defaultMarkup] = useState(0.20); // 20% default markup

    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false);
    const [isLoadingProducts, setIsLoadingProducts] = useState(false);
    const [errors, setErrors] = useState<Partial<PurchaseOrderFormData>>({});
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showExpiryDatePicker, setShowExpiryDatePicker] = useState(false);
    const [orderStatus, setOrderStatus] = useState<string | null>(null);
    const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null); // Track which item is being edited
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Product batches (existing inventory)
    const [productBatches, setProductBatches] = useState<any[]>([]);
    const [loadingBatches, setLoadingBatches] = useState(false);
    const [showBatches, setShowBatches] = useState(false);

    useEffect(() => {
        loadSuppliers();
        // Don't load products on init - load lazily when modal opens
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
                setOrderStatus(order.status);
                setFormData({
                    supplier: typeof order.supplier === 'string' ? order.supplier : order.supplier._id,
                    items: order.items.map(item => {
                        // Extract product info - handle both populated object and string ID
                        const productObj = typeof item.product === 'object' ? item.product : null;
                        return {
                            product: productObj?._id || item.product,
                            productName: productObj?.name || 'Unknown Product', // Store name from populated data
                            productStock: productObj?.currentStock ?? 0, // Store stock from populated data
                            quantity: item.quantity,
                            costPrice: item.costPrice,
                            sellingPrice: item.sellingPrice || item.costPrice * 1.2,
                            mrp: item.mrp,
                            expiryDate: item.expiryDate,
                        };
                    }),
                    expectedDeliveryDate: order.expectedDeliveryDate ? order.expectedDeliveryDate.split('T')[0] : '',
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

    const handleExpiryDateChange = (event: any, selectedDate?: Date) => {
        // On Android, the picker closes automatically
        if (Platform.OS === 'android') {
            setShowExpiryDatePicker(false);
        }

        if (selectedDate) {
            const year = selectedDate.getFullYear();
            const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
            const day = String(selectedDate.getDate()).padStart(2, '0');
            const formattedDate = `${year}-${month}-${day}`;
            setItemExpiryDate(formattedDate);
        }
    };

    const formatDisplayDate = (dateString: string) => {
        if (!dateString) return 'Select date';

        // Handle both YYYY-MM-DD and ISO 8601 formats
        const date = dateString.includes('T') ? new Date(dateString) : new Date(dateString + 'T00:00:00');

        // Check if date is valid
        if (isNaN(date.getTime())) return 'Invalid date';

        const options: Intl.DateTimeFormatOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        };
        return date.toLocaleDateString('en-US', options);
    };

    // Fetch existing batches for a product
    const fetchProductBatches = async (productId: string) => {
        if (!productId) {
            setProductBatches([]);
            return;
        }
        try {
            setLoadingBatches(true);
            const response: any = await apiService.getBatchesByProduct(productId);
            // Response structure: { success: true, data: { batches: [...], ... } }
            if (response?.success && response?.data?.batches) {
                // Batches are already filtered by backend (active + currentQuantity > 0)
                setProductBatches(response.data.batches);
            } else {
                setProductBatches([]);
            }
        } catch (error) {
            console.error('Failed to fetch product batches:', error);
            setProductBatches([]);
        } finally {
            setLoadingBatches(false);
        }
    };

    // Handle product selection - auto-fill prices from product master
    const handleProductSelect = (productId: string) => {
        setSelectedProduct(productId);

        // Find the selected product
        const product = products.find(p => p._id === productId);
        if (product) {
            // Auto-fill cost price, selling price, and MRP from product
            setItemCostPrice(product.costPrice.toString());
            setItemSellingPrice(product.sellingPrice.toString());
            setItemMRP(product.mrp.toString());
            
            // Fetch existing batches for this product
            fetchProductBatches(productId);
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

            const mrp = itemMRP ? parseFloat(itemMRP) : undefined;
            addItemToList(selectedProduct, quantity, costPrice, sellingPrice, mrp, itemExpiryDate);
        } catch (error) {
            console.error('Error adding item:', error);
            Alert.alert('Error', 'Failed to add item. Please try again.');
        }
    };

    const addItemToList = (productId: string, quantity: number, costPrice: number, sellingPrice: number, mrp?: number, expiryDate?: string) => {
        // Get product info for display
        const product = products.find(p => p._id === productId);
        
        const newItem: any = {
            product: productId,
            productName: product?.name || 'Unknown Product', // For display only
            productStock: product?.currentStock ?? 0, // For display only
            quantity: quantity,
            costPrice: parseFloat(costPrice.toFixed(2)), // Round to 2 decimals
            sellingPrice: parseFloat(sellingPrice.toFixed(2)), // Round to 2 decimals
            totalAmount: parseFloat((quantity * costPrice).toFixed(2)), // Calculate total amount
        };

        if (mrp) {
            newItem.mrp = parseFloat(mrp.toFixed(2)); // Round to 2 decimals
        }

        if (expiryDate) {
            // Convert YYYY-MM-DD to ISO 8601 format (set time to noon UTC to avoid timezone issues)
            const date = new Date(expiryDate + 'T12:00:00.000Z');
            newItem.expiryDate = date.toISOString();
        }

        // Check if we're editing an existing item
        if (editingItemIndex !== null) {
            // Update existing item
            setFormData(prev => ({
                ...prev,
                items: prev.items.map((item, idx) => 
                    idx === editingItemIndex ? newItem : item
                ),
            }));
            Alert.alert('Success', 'Item updated successfully');
            setIsModalOpen(false);
        } else {
            // Add new item
            setFormData(prev => ({
                ...prev,
                items: [...prev.items, newItem],
            }));
        }

        // Reset item form
        setSelectedProduct('');
        setItemQuantity('');
        setItemMRP('');
        setItemCostPrice('');
        setItemSellingPrice('');
        setItemExpiryDate('');
        setEditingItemIndex(null);
        setProductBatches([]);
        setShowBatches(false);

        // Clear items error
        if (errors.items) {
            setErrors(prev => ({ ...prev, items: undefined }));
        }
    };

    // Store editing item's name and stock for display in modal
    const [editingItemName, setEditingItemName] = useState<string>('');
    const [editingItemStock, setEditingItemStock] = useState<number | null>(null);

    const handleEditItem = (index: number) => {
        const item = formData.items[index] as any;
        
        setSelectedProduct(item.product);
        setEditingItemName(item.productName || 'Unknown Product');
        setEditingItemStock(item.productStock ?? null);
        setItemQuantity(item.quantity.toString());
        setItemMRP(item.mrp ? item.mrp.toString() : '');
        setItemCostPrice(item.costPrice.toString());
        setItemSellingPrice(item.sellingPrice.toString());
        setItemExpiryDate(item.expiryDate ? (typeof item.expiryDate === 'string' ? item.expiryDate.split('T')[0] : '') : '');
        setEditingItemIndex(index);
        setIsModalOpen(true);
    };

    const handleCancelEdit = () => {
        setSelectedProduct('');
        setEditingItemName('');
        setEditingItemStock(null);
        setItemQuantity('');
        setItemMRP('');
        setItemCostPrice('');
        setItemSellingPrice('');
        setItemExpiryDate('');
        setEditingItemIndex(null);
        setIsModalOpen(false);
        setProductBatches([]);
        setShowBatches(false);
    };

    const handleAddNewItem = () => {
        // Reset form and open modal for adding new item
        setSelectedProduct('');
        setItemQuantity('');
        setItemMRP('');
        setItemCostPrice('');
        setItemSellingPrice('');
        setItemExpiryDate('');
        setEditingItemIndex(null);
        setIsModalOpen(true);
        
        // Load products lazily when modal opens (if not already loaded)
        if (products.length === 0) {
            loadProducts();
        }
    };

    const handleRemoveItem = (index: number) => {
        setFormData(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index),
        }));
    };

    const getProductName = (productIdOrItem: any) => {
        // If it's an object with productName (newly added item), use that
        if (typeof productIdOrItem === 'object') {
            if (productIdOrItem.productName) return productIdOrItem.productName;
            if (productIdOrItem.name) return productIdOrItem.name;
            return 'Unknown Product';
        }
        // For product ID, try to find in products array (may not be loaded)
        const product = products.find(p => p._id === productIdOrItem);
        return product?.name || 'Unknown Product';
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
                expectedDeliveryDate: formData.expectedDeliveryDate ? new Date(formData.expectedDeliveryDate + 'T12:00:00.000Z').toISOString() : undefined,
            };

            console.log('Creating purchase order with data:', JSON.stringify(orderData, null, 2));

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

    const isReadOnly = orderStatus === 'received';

    // Reusable Product Form Component
    const renderProductForm = () => (
        <ScrollView style={{ maxHeight: 400 }}>
            {/* Show product search only for new items, not when editing */}
            {editingItemIndex === null ? (
                <>
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

                    {selectedProduct && (() => {
                        const product = products.find(p => p._id === selectedProduct);
                        if (product) {
                            return (
                                <>
                                    <View style={[styles.selectedProductContainer, { backgroundColor: theme.colors.primary[50], borderColor: theme.colors.primary[200] }]}>
                                        <Text style={[styles.selectedProductText, { color: theme.colors.primary[900] }]}>
                                            Selected: {product.name} {product.sku && `(${product.sku})`}
                                            {product.currentStock !== undefined && (
                                                <Text style={[styles.stockText, { color: theme.colors.textSecondary }]}>
                                                    {' • '}Current Stock: {product.currentStock}
                                                </Text>
                                            )}
                                        </Text>
                                    </View>

                                    {/* Existing Batches Section */}
                                    <TouchableOpacity
                                        onPress={() => setShowBatches(!showBatches)}
                                        style={[styles.batchesToggle, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                                    >
                                        <View style={styles.batchesToggleContent}>
                                            <Icon name="inventory" size={18} color={theme.colors.primary['500']} />
                                            <Text style={[styles.batchesToggleText, { color: theme.colors.text }]}>
                                                Existing Inventory
                                                {!loadingBatches && productBatches.length > 0 && (
                                                    <Text style={{ color: theme.colors.primary['600'] }}>
                                                        {' '}({productBatches.length} batch{productBatches.length > 1 ? 'es' : ''})
                                                    </Text>
                                                )}
                                            </Text>
                                        </View>
                                        <Icon 
                                            name={showBatches ? "expand-less" : "expand-more"} 
                                            size={24} 
                                            color={theme.colors.textSecondary} 
                                        />
                                    </TouchableOpacity>

                                    {showBatches && (
                                        <View style={[styles.batchesContainer, { borderColor: theme.colors.border }]}>
                                            {loadingBatches ? (
                                                <View style={styles.batchesLoading}>
                                                    <Text style={[styles.batchesLoadingText, { color: theme.colors.textSecondary }]}>
                                                        Loading batches...
                                                    </Text>
                                                </View>
                                            ) : productBatches.length === 0 ? (
                                                <View style={[styles.noBatches, { backgroundColor: theme.colors.warning['50'] }]}>
                                                    <Icon name="info-outline" size={20} color={theme.colors.warning['600']} />
                                                    <Text style={[styles.noBatchesText, { color: theme.colors.warning['700'] }]}>
                                                        No existing batches. This will be the first batch.
                                                    </Text>
                                                </View>
                                            ) : (
                                                <>
                                                    {/* Batches Header */}
                                                    <View style={[styles.batchHeader, { backgroundColor: theme.colors.gray[100] }]}>
                                                        <Text style={[styles.batchHeaderCell, styles.batchCellBatch, { color: theme.colors.textSecondary }]}>
                                                            Batch
                                                        </Text>
                                                        <Text style={[styles.batchHeaderCell, styles.batchCellQty, { color: theme.colors.textSecondary }]}>
                                                            Qty
                                                        </Text>
                                                        <Text style={[styles.batchHeaderCell, styles.batchCellPrice, { color: theme.colors.textSecondary }]}>
                                                            Cost
                                                        </Text>
                                                        <Text style={[styles.batchHeaderCell, styles.batchCellPrice, { color: theme.colors.textSecondary }]}>
                                                            Sell
                                                        </Text>
                                                        <Text style={[styles.batchHeaderCell, styles.batchCellPrice, { color: theme.colors.textSecondary }]}>
                                                            MRP
                                                        </Text>
                                                    </View>
                                                    
                                                    {/* Batches Rows */}
                                                    {productBatches.map((batch: any, index: number) => (
                                                        <View 
                                                            key={batch._id || index} 
                                                            style={[
                                                                styles.batchRow, 
                                                                { borderBottomColor: theme.colors.border },
                                                                index === productBatches.length - 1 && { borderBottomWidth: 0 }
                                                            ]}
                                                        >
                                                            <View style={[styles.batchCell, styles.batchCellBatch]}>
                                                                <Text style={[styles.batchNumber, { color: theme.colors.text }]}>
                                                                    {batch.batchNumber?.slice(-8) || `B${index + 1}`}
                                                                </Text>
                                                                {batch.expiryDate && (
                                                                    <Text style={[
                                                                        styles.batchExpiry,
                                                                        { 
                                                                            color: new Date(batch.expiryDate) < new Date() 
                                                                                ? theme.colors.error['500']
                                                                                : new Date(batch.expiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                                                                                    ? theme.colors.warning['600']
                                                                                    : theme.colors.textSecondary
                                                                        }
                                                                    ]}>
                                                                        {formatDisplayDate(batch.expiryDate)}
                                                                    </Text>
                                                                )}
                                                            </View>
                                                            <Text style={[
                                                                styles.batchCell, 
                                                                styles.batchCellQty,
                                                                { 
                                                                    color: batch.currentQuantity <= 5 
                                                                        ? theme.colors.error['600'] 
                                                                        : theme.colors.text,
                                                                    fontWeight: '600'
                                                                }
                                                            ]}>
                                                                {batch.currentQuantity}
                                                            </Text>
                                                            <Text style={[styles.batchCell, styles.batchCellPrice, { color: theme.colors.textSecondary }]}>
                                                                ₹{batch.costPrice?.toFixed(0) || '0'}
                                                            </Text>
                                                            <Text style={[styles.batchCell, styles.batchCellPrice, { color: theme.colors.success['600'] }]}>
                                                                ₹{batch.sellingPrice?.toFixed(0) || '0'}
                                                            </Text>
                                                            <Text style={[styles.batchCell, styles.batchCellPrice, { color: theme.colors.textSecondary }]}>
                                                                ₹{batch.mrp?.toFixed(0) || '0'}
                                                            </Text>
                                                        </View>
                                                    ))}
                                                    
                                                    {/* Total Row */}
                                                    <View style={[styles.batchTotalRow, { backgroundColor: theme.colors.primary[50] }]}>
                                                        <Text style={[styles.batchTotalLabel, { color: theme.colors.primary['800'] }]}>
                                                            Total
                                                        </Text>
                                                        <Text style={[styles.batchTotalQty, { color: theme.colors.primary['800'] }]}>
                                                            {productBatches.reduce((sum: number, b: any) => sum + (b.currentQuantity || 0), 0)}
                                                        </Text>
                                                    </View>
                                                </>
                                            )}
                                        </View>
                                    )}
                                </>
                            );
                        }
                        return null;
                    })()}
                </>
            ) : (
                /* Show fixed product display when editing - use stored name/stock, no lookup needed */
                <View style={[styles.fixedProductContainer, { backgroundColor: theme.colors.gray[100], borderColor: theme.colors.gray[200] }]}>
                    <Text style={[styles.fixedProductLabel, { color: theme.colors.textSecondary }]}>Product</Text>
                    <Text style={[styles.fixedProductName, { color: theme.colors.text }]}>
                        {editingItemName || 'Unknown Product'}
                    </Text>
                    {editingItemStock !== null && (
                        <Text style={[styles.fixedProductStock, { color: theme.colors.primary['600'] }]}>
                            Current Stock: {editingItemStock}
                        </Text>
                    )}
                    <Text style={[styles.fixedProductNote, { color: theme.colors.textSecondary }]}>
                        Product cannot be changed while editing
                    </Text>
                </View>
            )}

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
                        label="MRP (₹)"
                        placeholder="0.00"
                        value={itemMRP}
                        onChangeText={setItemMRP}
                        keyboardType="decimal-pad"
                    />
                </View>
            </View>

            <View style={styles.itemInputRow}>
                <View style={styles.itemInputHalf}>
                    <Input
                        label="Cost Price (₹)"
                        placeholder="0.00"
                        value={itemCostPrice}
                        onChangeText={handleCostPriceChange}
                        keyboardType="decimal-pad"
                    />
                </View>
                <View style={styles.itemInputHalf}>
                    <Input
                        label="Selling Price (₹)"
                        placeholder="0.00"
                        value={itemSellingPrice}
                        onChangeText={setItemSellingPrice}
                        keyboardType="decimal-pad"
                    />
                </View>
            </View>

            <View style={styles.profitMarginRow}>
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

            {/* Expiry Date Picker */}
            <View style={styles.expiryDateContainer}>
                <Text style={[styles.expiryDateLabel, { color: theme.colors.text }]}>
                    Expiry Date (Optional)
                </Text>
                <TouchableOpacity
                    style={[styles.expiryDateButton, { borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
                    onPress={() => setShowExpiryDatePicker(true)}
                >
                    <Icon name="event" size={20} color={theme.colors.textSecondary} />
                    <Text style={[styles.expiryDateText, { color: itemExpiryDate ? theme.colors.text : theme.colors.textSecondary }]}>
                        {itemExpiryDate ? formatDisplayDate(itemExpiryDate) : 'Select expiry date'}
                    </Text>
                    {itemExpiryDate && (
                        <TouchableOpacity onPress={() => setItemExpiryDate('')} style={styles.clearDateButton}>
                            <Icon name="close" size={18} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    )}
                </TouchableOpacity>
            </View>

            {showExpiryDatePicker && (
                <DateTimePicker
                    value={itemExpiryDate ? new Date(itemExpiryDate + 'T00:00:00') : new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleExpiryDateChange}
                    minimumDate={new Date()}
                />
            )}

            {Platform.OS === 'ios' && showExpiryDatePicker && (
                <View style={styles.datePickerButtons}>
                    <Button
                        title="Done"
                        onPress={() => setShowExpiryDatePicker(false)}
                        variant="primary"
                        size="sm"
                    />
                </View>
            )}
        </ScrollView>
    );

    if (isLoading && orderId) {
        return <LoadingSpinner overlay text="Loading purchase order..." />;
    }

    return (
        <ScrollView style={getContainerStyle()}>
            <View style={styles.content}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                    {isReadOnly ? 'View Purchase Order' : 'Purchase Order Details'}
                </Text>
                {isReadOnly && (
                    <Text style={[styles.readOnlyText, { color: theme.colors.textSecondary }]}>
                        This order has been received and is read-only
                    </Text>
                )}

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
                    disabled={isReadOnly}
                />

                <TouchableOpacity
                    style={[styles.datePickerContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, opacity: isReadOnly ? 0.6 : 1 }]}
                    onPress={() => !isReadOnly && setShowDatePicker(true)}
                    activeOpacity={0.7}
                    disabled={isReadOnly}
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
                    disabled={isReadOnly}
                />

                <Input
                    label="Notes"
                    placeholder="Enter any additional notes"
                    value={formData.notes}
                    onChangeText={(text) => handleInputChange('notes', text)}
                    multiline
                    numberOfLines={3}
                    editable={!isReadOnly}
                />

                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                    Order Items ({formData.items.length})
                </Text>

                {/* Add Item Button - Hide if read-only */}
                {!isReadOnly && (
                    <Button
                        title="Add Item"
                        onPress={handleAddNewItem}
                        variant="outline"
                        leftIcon={<Icon name="add" size={16} color={theme.colors.primary['500']} />}
                        style={styles.addItemButton}
                    />
                )}

                {/* Items List */}
                {formData.items.length > 0 ? (
                    <View style={styles.itemsList}>
                        {formData.items.map((item, index) => (
                            <View
                                key={index}
                                style={[styles.itemCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                            >
                                <View style={styles.itemCardContent}>
                                    <View style={styles.itemNameRow}>
                                        <Text style={[styles.itemProductName, { color: theme.colors.text }]}>
                                            {(item as any).productName || getProductName(item.product)}
                                        </Text>
                                        <View style={[styles.stockBadge, { backgroundColor: theme.colors.primary[50] }]}>
                                            <Text style={[styles.stockBadgeText, { color: theme.colors.primary['600'] }]}>
                                                Stock: {(item as any).productStock ?? 'N/A'}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={styles.itemDetails}>
                                        <Text style={[styles.itemDetailText, { color: theme.colors.textSecondary }]}>
                                            Qty: {item.quantity}
                                        </Text>
                                        {item.mrp && (
                                            <>
                                                <Text style={[styles.itemDetailText, { color: theme.colors.textSecondary }]}>
                                                    •
                                                </Text>
                                                <Text style={[styles.itemDetailText, { color: theme.colors.textSecondary }]}>
                                                    MRP: ₹{item.mrp.toFixed(2)}
                                                </Text>
                                            </>
                                        )}
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
                                    {/* Expiry Date Badge - Prominently displayed */}
                                    {item.expiryDate && (
                                        <View style={[styles.expiryBadge, { backgroundColor: theme.colors.warning['50'], borderColor: theme.colors.warning['200'] }]}>
                                            <Icon name="event-busy" size={16} color={theme.colors.warning['600']} />
                                            <Text style={[styles.expiryBadgeText, { color: theme.colors.warning['700'] }]}>
                                                Expiry Date: {formatDisplayDate(typeof item.expiryDate === 'string' ? item.expiryDate : item.expiryDate)}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                                {!isReadOnly && (
                                <View style={styles.itemActions}>
                                    <TouchableOpacity
                                        onPress={() => handleEditItem(index)}
                                        style={styles.editButton}
                                    >
                                        <Icon name="edit" size={20} color={theme.colors.primary['500']} />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => handleRemoveItem(index)}
                                        style={styles.removeButton}
                                    >
                                        <Icon name="delete" size={20} color={theme.colors.error['500']} />
                                    </TouchableOpacity>
                                </View>
                                )}
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

                {!isReadOnly && (
                <Button
                    title={orderId ? 'Update Order' : 'Create Order'}
                    onPress={handleSubmit}
                    variant="primary"
                    size="lg"
                    fullWidth
                    loading={isLoading}
                    style={styles.submitButton}
                />
                )}
            </View>

            {/* Edit Item Modal */}
            <Modal
                visible={isModalOpen}
                onClose={handleCancelEdit}
                title={editingItemIndex !== null ? 'Edit Product' : 'Add Product'}
                size="lg"
            >
                {renderProductForm()}
                <View style={styles.modalButtons}>
                    <Button
                        title="Cancel"
                        onPress={handleCancelEdit}
                        variant="outline"
                        style={styles.modalButton}
                    />
                    <Button
                        title={editingItemIndex !== null ? 'Save' : 'Add Item'}
                        onPress={handleAddItem}
                        variant="primary"
                        leftIcon={<Icon name={editingItemIndex !== null ? "save" : "add"} size={16} color="white" />}
                        style={styles.modalButton}
                    />
                </View>
            </Modal>
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
    readOnlyText: {
        fontSize: 14,
        fontStyle: 'italic',
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
    editNotice: {
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        marginBottom: 12,
    },
    editNoticeText: {
        fontSize: 13,
        fontWeight: '500',
    },
    addItemButtons: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 8,
    },
    addItemButton: {
        flex: 1,
    },
    selectedProductContainer: {
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        marginTop: 8,
        marginBottom: 12,
    },
    selectedProductText: {
        fontSize: 14,
        fontWeight: '500',
    },
    stockText: {
        fontSize: 14,
        fontWeight: '400',
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
    profitMarginRow: {
        marginBottom: 16,
    },
    expiryDateContainer: {
        marginBottom: 16,
    },
    expiryDateLabel: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 8,
    },
    expiryDateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderWidth: 1,
        borderRadius: 8,
        gap: 8,
    },
    expiryDateText: {
        flex: 1,
        fontSize: 14,
    },
    clearDateButton: {
        padding: 4,
    },
    expiryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 8,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
    },
    expiryBadgeText: {
        fontSize: 13,
        fontWeight: '600',
        flex: 1,
    },
    expiryInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 6,
    },
    expiryText: {
        fontSize: 12,
        fontWeight: '500',
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
    itemNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    itemProductName: {
        fontSize: 16,
        fontWeight: '600',
    },
    stockBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        marginLeft: 8,
    },
    stockBadgeText: {
        fontSize: 12,
        fontWeight: '600',
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
    itemActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    editButton: {
        padding: 8,
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
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    modalButton: {
        flex: 1,
    },
    fixedProductContainer: {
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        marginBottom: 16,
    },
    fixedProductLabel: {
        fontSize: 12,
        fontWeight: '500',
        marginBottom: 4,
    },
    fixedProductName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    fixedProductStock: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 4,
    },
    fixedProductNote: {
        fontSize: 12,
        fontStyle: 'italic',
    },
    // Existing batches styles
    batchesToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        marginBottom: 8,
    },
    batchesToggleContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    batchesToggleText: {
        fontSize: 14,
        fontWeight: '500',
    },
    batchesContainer: {
        borderWidth: 1,
        borderRadius: 8,
        overflow: 'hidden',
        marginBottom: 12,
    },
    batchesLoading: {
        padding: 16,
        alignItems: 'center',
    },
    batchesLoadingText: {
        fontSize: 14,
    },
    noBatches: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        gap: 8,
    },
    noBatchesText: {
        flex: 1,
        fontSize: 13,
        fontWeight: '500',
    },
    batchHeader: {
        flexDirection: 'row',
        paddingHorizontal: 8,
        paddingVertical: 6,
    },
    batchHeaderCell: {
        fontSize: 10,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    batchRow: {
        flexDirection: 'row',
        paddingHorizontal: 8,
        paddingVertical: 8,
        borderBottomWidth: 1,
    },
    batchCell: {
        fontSize: 12,
    },
    batchCellBatch: {
        flex: 2,
    },
    batchCellQty: {
        flex: 1,
        textAlign: 'right',
    },
    batchCellPrice: {
        flex: 1.2,
        textAlign: 'right',
    },
    batchNumber: {
        fontSize: 12,
        fontWeight: '500',
    },
    batchExpiry: {
        fontSize: 10,
        marginTop: 2,
    },
    batchTotalRow: {
        flexDirection: 'row',
        paddingHorizontal: 8,
        paddingVertical: 8,
    },
    batchTotalLabel: {
        flex: 2,
        fontSize: 12,
        fontWeight: '700',
    },
    batchTotalQty: {
        flex: 1,
        textAlign: 'right',
        fontSize: 12,
        fontWeight: '700',
    },
});

export default PurchaseOrderFormScreen;