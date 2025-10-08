import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    FlatList,
    Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Button, Card, LoadingSpinner } from '../components/ui';
import { RootStackParamList, Product } from '../types';
import apiService from '../services/api';
import { CameraKitBarcodeScanner } from '../components/CameraKitBarcodeScanner';

type BillingScreenNavigationProp = StackNavigationProp<RootStackParamList>;

interface CartItem {
    product: Product;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    costPrice: number; // Actual FIFO cost price
    isEditingPrice?: boolean;
    batchInfo?: {
        batchNumber: string;
        availableQuantity: number;
    };
}

interface PaymentMethod {
    id: string;
    name: string;
    icon: string;
}

const PAYMENT_METHODS: PaymentMethod[] = [
    { id: 'cash', name: 'Cash', icon: 'money' },
    { id: 'card', name: 'Card', icon: 'credit-card' },
    { id: 'upi', name: 'UPI', icon: 'phone-android' },
    { id: 'wallet', name: 'Wallet', icon: 'account-balance-wallet' },
];

const BillingScreen: React.FC = () => {
    const { theme } = useTheme();
    const { user } = useAuth();
    const navigation = useNavigation<BillingScreenNavigationProp>();

    const [cart, setCart] = useState<CartItem[]>([]);
    const [showScanner, setShowScanner] = useState(false);
    const [showProductSearch, setShowProductSearch] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showReceiptModal, setShowReceiptModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Product[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('cash');
    const [amountReceived, setAmountReceived] = useState('');
    const [receiptData, setReceiptData] = useState<any>(null);

    // Calculate totals
    const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
    const tax = subtotal * 0; // 0% GST (No tax)
    const total = subtotal + tax;
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

    // Search products
    const searchProducts = async (query: string) => {
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const response = await apiService.searchProducts(query);
            if (response.success && response.data) {
                setSearchResults(response.data);
            }
        } catch (error: any) {
            console.error('Search error:', error);
        } finally {
            setIsSearching(false);
        }
    };

    // Handle barcode scan
    const handleBarcodeScan = async (barcode: string) => {
        setShowScanner(false);

        try {
            const response = await apiService.getProductByBarcode(barcode);
            if (response.success && response.data) {
                addToCart(response.data);
            } else {
                Alert.alert('Not Found', 'Product with this barcode not found');
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to find product');
        }
    };

    // Add product to cart with FIFO pricing
    const addToCart = async (product: Product) => {
        try {
            const existingItemIndex = cart.findIndex(item => item.product._id === product._id);

            if (existingItemIndex >= 0) {
                // Update quantity
                const updatedCart = [...cart];
                const newQuantity = updatedCart[existingItemIndex].quantity + 1;

                // Check stock
                if (newQuantity > product.currentStock) {
                    Alert.alert('Insufficient Stock', `Only ${product.currentStock} units available`);
                    return;
                }

                updatedCart[existingItemIndex].quantity = newQuantity;
                updatedCart[existingItemIndex].totalPrice = newQuantity * updatedCart[existingItemIndex].unitPrice;
                setCart(updatedCart);
            } else {
                // Add new item - fetch batch info for accurate FIFO pricing
                if (product.currentStock === 0) {
                    Alert.alert('Out of Stock', 'This product is out of stock');
                    return;
                }

                let unitPrice = product.sellingPrice;
                let costPrice = product.costPrice || 0;
                let batchInfo = undefined;

                try {
                    // Fetch batch information to get accurate FIFO price
                    const batchResponse = await apiService.getBatchesByProduct(product._id);

                    if (batchResponse.success && batchResponse.data?.batches?.length > 0) {
                        // Get oldest (FIFO) batch - first batch in the array
                        const oldestBatch = batchResponse.data.batches[0];
                        unitPrice = oldestBatch.sellingPrice;
                        costPrice = oldestBatch.costPrice;
                        batchInfo = {
                            batchNumber: oldestBatch.batchNumber,
                            availableQuantity: oldestBatch.currentQuantity || oldestBatch.availableQuantity
                        };
                    }
                } catch (error) {
                    console.log('Could not fetch batch info, using product prices:', error);
                    // Continue with product's default prices
                }

                const newItem: CartItem = {
                    product,
                    quantity: 1,
                    unitPrice,
                    costPrice,
                    totalPrice: unitPrice,
                    batchInfo,
                };
                setCart([...cart, newItem]);
            }

            setShowProductSearch(false);
            setSearchQuery('');
            setSearchResults([]);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to add product to cart');
        }
    };

    // Update quantity
    const updateQuantity = (productId: string, delta: number) => {
        const updatedCart = cart.map(item => {
            if (item.product._id === productId) {
                const newQuantity = item.quantity + delta;

                if (newQuantity <= 0) {
                    return null;
                }

                if (newQuantity > item.product.currentStock) {
                    Alert.alert('Insufficient Stock', `Only ${item.product.currentStock} units available`);
                    return item;
                }

                return {
                    ...item,
                    quantity: newQuantity,
                    totalPrice: newQuantity * item.unitPrice,
                };
            }
            return item;
        }).filter(item => item !== null) as CartItem[];

        setCart(updatedCart);
    };

    // Toggle price editing
    const togglePriceEdit = (productId: string) => {
        const updatedCart = cart.map(item => {
            if (item.product._id === productId) {
                return {
                    ...item,
                    isEditingPrice: !item.isEditingPrice,
                };
            }
            return item;
        });
        setCart(updatedCart);
    };

    // Update selling price
    const updateSellingPrice = (productId: string, newPrice: string) => {
        const price = parseFloat(newPrice);

        if (isNaN(price) || price < 0) {
            return;
        }

        const updatedCart = cart.map(item => {
            if (item.product._id === productId) {
                const itemCostPrice = item.costPrice; // Use FIFO cost price from cart item

                // Validate: selling price must be >= cost price (only if cost price exists)
                if (itemCostPrice > 0 && price < itemCostPrice) {
                    Alert.alert(
                        'Invalid Price',
                        `Selling price (₹${price.toFixed(2)}) cannot be less than FIFO cost price (₹${itemCostPrice.toFixed(2)})`
                    );
                    return item;
                }

                return {
                    ...item,
                    unitPrice: price,
                    totalPrice: item.quantity * price,
                    isEditingPrice: false,
                };
            }
            return item;
        });

        setCart(updatedCart);
    };

    // Remove item from cart
    const removeFromCart = (productId: string) => {
        setCart(cart.filter(item => item.product._id !== productId));
    };

    // Process payment
    const handlePayment = async () => {
        if (selectedPaymentMethod === 'cash') {
            const received = parseFloat(amountReceived);
            if (isNaN(received) || received < total) {
                Alert.alert('Invalid Amount', 'Amount received must be at least ₹' + total.toFixed(2));
                return;
            }
        }

        setIsProcessing(true);
        try {
            const saleItems = cart.map(item => ({
                productId: item.product._id,
                quantity: item.quantity,
                notes: `Sold at ₹${item.unitPrice}`,
            }));

            const referenceNumber = `BILL-${Date.now()}`;

            const response = await apiService.processSale(saleItems, referenceNumber);

            if (response.success) {
                // Generate receipt data
                const receipt = {
                    billNumber: referenceNumber,
                    date: new Date().toLocaleString(),
                    items: cart,
                    subtotal,
                    tax,
                    total,
                    paymentMethod: PAYMENT_METHODS.find(pm => pm.id === selectedPaymentMethod)?.name,
                    amountReceived: selectedPaymentMethod === 'cash' ? parseFloat(amountReceived) : total,
                    change: selectedPaymentMethod === 'cash' ? parseFloat(amountReceived) - total : 0,
                    cashier: user?.name,
                };

                setReceiptData(receipt);
                setShowPaymentModal(false);
                setShowReceiptModal(true);

                // Clear cart after successful payment
                setTimeout(() => {
                    setCart([]);
                    setAmountReceived('');
                    setSelectedPaymentMethod('cash');
                }, 1000);
            }
        } catch (error: any) {
            Alert.alert('Payment Failed', error.message || 'Failed to process payment');
        } finally {
            setIsProcessing(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
        }).format(amount);
    };

    const handleProductClick = (product: Product) => {
        navigation.navigate('ProductDetail', { productId: product._id });
    };

    const renderCartItem = ({ item }: { item: CartItem }) => {
        const costPrice = item.costPrice; // Use FIFO cost price from cart item
        const profitPerUnit = item.unitPrice - costPrice;
        const profitMargin = ((profitPerUnit / item.unitPrice) * 100).toFixed(1);
        const isProfitable = profitPerUnit >= 0;

        return (
            <Card variant="outlined" style={styles.cartItem}>
                <View style={styles.cartItemWrapper}>
                    {/* Product Info Section */}
                    <TouchableOpacity
                        onPress={() => handleProductClick(item.product)}
                        activeOpacity={0.7}
                        style={styles.productInfoSection}
                    >
                        <View style={styles.productHeader}>
                            <View style={styles.productDetails}>
                                <Text style={[styles.cartItemName, { color: theme.colors.text }]}>
                                    {item.product.name}
                                </Text>
                                <View style={styles.productMeta}>
                                    <Text style={[styles.productSku, { color: theme.colors.textSecondary }]}>
                                        {item.product.sku}
                                    </Text>
                                    {item.product.barcode && (
                                        <>
                                            <Text style={[styles.metaDivider, { color: theme.colors.textSecondary }]}>•</Text>
                                            <Text style={[styles.productBarcode, { color: theme.colors.textSecondary }]}>
                                                {item.product.barcode}
                                            </Text>
                                        </>
                                    )}
                                </View>
                                <View style={styles.priceInfo}>
                                    <Text style={[styles.costPriceLabel, { color: theme.colors.textSecondary }]}>
                                        Cost: {formatCurrency(costPrice)} {item.batchInfo && '(FIFO)'}
                                    </Text>
                                    {isProfitable && profitPerUnit > 0 && (
                                        <View style={[styles.profitBadge, { backgroundColor: theme.colors.success[100] }]}>
                                            <Icon name="trending-up" size={12} color={theme.colors.success[600]} />
                                            <Text style={[styles.profitText, { color: theme.colors.success[600] }]}>
                                                {profitMargin}% profit
                                            </Text>
                                        </View>
                                    )}
                                </View>
                                {item.batchInfo && (
                                    <Text style={[styles.batchInfoLabel, { color: theme.colors.textSecondary }]}>
                                        Batch: {item.batchInfo.batchNumber}
                                    </Text>
                                )}
                            </View>
                            <TouchableOpacity
                                onPress={() => removeFromCart(item.product._id)}
                                style={styles.removeButton}
                            >
                                <Icon name="close" size={20} color={theme.colors.error[500]} />
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>

                    {/* Controls Section - Row 1: Quantity & Price */}
                    <View style={styles.controlsRow}>
                        {/* Quantity Controls */}
                        <View style={styles.quantitySection}>
                            <Text style={[styles.controlLabel, { color: theme.colors.textSecondary }]}>
                                Quantity
                            </Text>
                            <View style={styles.quantityControls}>
                                <TouchableOpacity
                                    onPress={() => updateQuantity(item.product._id, -1)}
                                    style={[styles.quantityButton, { backgroundColor: theme.colors.error[100] }]}
                                >
                                    <Icon name="remove" size={16} color={theme.colors.error[500]} />
                                </TouchableOpacity>
                                <Text style={[styles.quantity, { color: theme.colors.text }]}>{item.quantity}</Text>
                                <TouchableOpacity
                                    onPress={() => updateQuantity(item.product._id, 1)}
                                    style={[styles.quantityButton, { backgroundColor: theme.colors.success[100] }]}
                                >
                                    <Icon name="add" size={16} color={theme.colors.success[500]} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Price Section */}
                        <View style={styles.priceSection}>
                            <Text style={[styles.controlLabel, { color: theme.colors.textSecondary }]}>
                                Selling Price
                            </Text>
                            {item.isEditingPrice ? (
                                <View style={styles.priceEditContainer}>
                                    <TextInput
                                        style={[styles.priceInput, {
                                            backgroundColor: theme.colors.white,
                                            color: theme.colors.text,
                                            borderColor: theme.colors.primary[500]
                                        }]}
                                        defaultValue={item.unitPrice.toString()}
                                        keyboardType="decimal-pad"
                                        autoFocus
                                        selectTextOnFocus
                                        onSubmitEditing={(e) => updateSellingPrice(item.product._id, e.nativeEvent.text)}
                                        onBlur={(e) => updateSellingPrice(item.product._id, e.nativeEvent.text)}
                                    />
                                </View>
                            ) : (
                                <TouchableOpacity
                                    onPress={() => togglePriceEdit(item.product._id)}
                                    style={styles.priceDisplay}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.priceValue, { color: theme.colors.text }]}>
                                        {formatCurrency(item.unitPrice)}
                                    </Text>
                                    <Icon name="edit" size={14} color={theme.colors.primary[500]} />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    {/* Controls Section - Row 2: Total */}
                    <View style={styles.totalRow}>
                        <View style={styles.totalContainer}>
                            <Text style={[styles.totalLabel, { color: theme.colors.textSecondary }]}>
                                Item Total
                            </Text>
                            <Text style={[styles.totalValue, { color: theme.colors.text }]}>
                                {formatCurrency(item.totalPrice)}
                            </Text>
                        </View>
                    </View>
                </View>
            </Card>
        );
    };

    const renderSearchResult = ({ item }: { item: Product }) => (
        <TouchableOpacity
            style={[styles.searchResultItem, { backgroundColor: theme.colors.background }]}
            onPress={() => addToCart(item)}
        >
            <View style={styles.searchResultInfo}>
                <Text style={[styles.searchResultName, { color: theme.colors.text }]}>{item.name}</Text>
                <Text style={[styles.searchResultDetails, { color: theme.colors.textSecondary }]}>
                    {item.sku} • Stock: {item.currentStock}
                </Text>
            </View>
            <Text style={[styles.searchResultPrice, { color: theme.colors.primary[500] }]}>
                {formatCurrency(item.sellingPrice)}
            </Text>
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: theme.colors.primary[500] }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Icon name="arrow-back" size={24} color={theme.colors.white} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.colors.white }]}>Billing</Text>
                <TouchableOpacity
                    onPress={() => {
                        Alert.alert(
                            'Clear Cart',
                            'Are you sure you want to clear all items?',
                            [
                                { text: 'Cancel', style: 'cancel' },
                                { text: 'Clear', style: 'destructive', onPress: () => setCart([]) },
                            ]
                        );
                    }}
                    style={styles.clearButton}
                >
                    <Icon name="delete-outline" size={24} color={theme.colors.white} />
                </TouchableOpacity>
            </View>

            {/* Add Product Actions */}
            <View style={styles.actionBar}>
                <Button
                    title="Scan Barcode"
                    onPress={() => setShowScanner(true)}
                    variant="primary"
                    size="sm"
                    leftIcon={<Icon name="qr-code-scanner" size={18} color="white" />}
                    style={styles.actionButton}
                />
                <Button
                    title="Manual Select"
                    onPress={() => setShowProductSearch(true)}
                    variant="outline"
                    size="sm"
                    leftIcon={<Icon name="search" size={18} color={theme.colors.primary[500]} />}
                    style={styles.actionButton}
                />
            </View>

            {/* Cart Items */}
            {cart.length > 0 ? (
                <FlatList
                    data={cart}
                    renderItem={renderCartItem}
                    keyExtractor={(item) => item.product._id}
                    contentContainerStyle={styles.cartList}
                    showsVerticalScrollIndicator={false}
                />
            ) : (
                <View style={styles.emptyCart}>
                    <Icon name="shopping-cart" size={64} color={theme.colors.gray[300]} />
                    <Text style={[styles.emptyCartText, { color: theme.colors.textSecondary }]}>
                        Cart is empty
                    </Text>
                    <Text style={[styles.emptyCartSubtext, { color: theme.colors.textSecondary }]}>
                        Scan barcode or search products to add items
                    </Text>
                </View>
            )}

            {/* Bill Summary */}
            {cart.length > 0 && (
                <View style={[styles.billSummary, { backgroundColor: theme.colors.white, borderTopColor: theme.colors.gray[200] }]}>
                    <View style={styles.summaryRow}>
                        <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
                            Items ({totalItems})
                        </Text>
                        <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
                            {formatCurrency(subtotal)}
                        </Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
                            GST (0%)
                        </Text>
                        <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
                            {formatCurrency(tax)}
                        </Text>
                    </View>
                    <View style={[styles.summaryRow, styles.totalRow]}>
                        <Text style={[styles.totalLabel, { color: theme.colors.text }]}>Total</Text>
                        <Text style={[styles.totalValue, { color: theme.colors.primary[500] }]}>
                            {formatCurrency(total)}
                        </Text>
                    </View>
                    <Button
                        title={`Pay ${formatCurrency(total)}`}
                        onPress={() => setShowPaymentModal(true)}
                        variant="primary"
                        size="lg"
                        fullWidth
                        style={styles.payButton}
                    />
                </View>
            )}

            {/* Barcode Scanner Modal */}
            <Modal
                visible={showScanner}
                animationType="slide"
                onRequestClose={() => setShowScanner(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={[styles.scannerHeader, { backgroundColor: theme.colors.primary[500] }]}>
                        <TouchableOpacity onPress={() => setShowScanner(false)}>
                            <Icon name="close" size={24} color={theme.colors.white} />
                        </TouchableOpacity>
                        <Text style={[styles.scannerTitle, { color: theme.colors.white }]}>Scan Barcode</Text>
                        <View style={{ width: 24 }} />
                    </View>
                    <CameraKitBarcodeScanner onScan={handleBarcodeScan} />
                </View>
            </Modal>

            {/* Product Search Modal */}
            <Modal
                visible={showProductSearch}
                animationType="slide"
                onRequestClose={() => setShowProductSearch(false)}
            >
                <View style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
                    <View style={[styles.searchHeader, { backgroundColor: theme.colors.primary[500] }]}>
                        <TouchableOpacity onPress={() => {
                            setShowProductSearch(false);
                            setSearchQuery('');
                            setSearchResults([]);
                        }}>
                            <Icon name="close" size={24} color={theme.colors.white} />
                        </TouchableOpacity>
                        <Text style={[styles.searchHeaderTitle, { color: theme.colors.white }]}>Search Products</Text>
                        <View style={{ width: 24 }} />
                    </View>
                    <View style={styles.searchContainer}>
                        <TextInput
                            style={[styles.searchInput, { backgroundColor: theme.colors.white, color: theme.colors.text }]}
                            placeholder="Search by name, SKU, or barcode..."
                            placeholderTextColor={theme.colors.textSecondary}
                            value={searchQuery}
                            onChangeText={(text) => {
                                setSearchQuery(text);
                                searchProducts(text);
                            }}
                            autoFocus
                        />
                    </View>
                    {isSearching ? (
                        <LoadingSpinner text="Searching..." />
                    ) : (
                        <FlatList
                            data={searchResults}
                            renderItem={renderSearchResult}
                            keyExtractor={(item) => item._id}
                            contentContainerStyle={styles.searchResults}
                            ListEmptyComponent={
                                searchQuery ? (
                                    <View style={styles.emptySearch}>
                                        <Icon name="search-off" size={48} color={theme.colors.gray[300]} />
                                        <Text style={[styles.emptySearchText, { color: theme.colors.textSecondary }]}>
                                            No products found
                                        </Text>
                                    </View>
                                ) : null
                            }
                        />
                    )}
                </View>
            </Modal>

            {/* Payment Modal */}
            <Modal
                visible={showPaymentModal}
                animationType="slide"
                transparent
                onRequestClose={() => setShowPaymentModal(false)}
            >
                <View style={styles.paymentModalOverlay}>
                    <View style={[styles.paymentModal, { backgroundColor: theme.colors.white }]}>
                        <View style={styles.paymentHeader}>
                            <Text style={[styles.paymentTitle, { color: theme.colors.text }]}>Payment</Text>
                            <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                                <Icon name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.paymentAmount}>
                            <Text style={[styles.paymentAmountLabel, { color: theme.colors.textSecondary }]}>
                                Total Amount
                            </Text>
                            <Text style={[styles.paymentAmountValue, { color: theme.colors.primary[500] }]}>
                                {formatCurrency(total)}
                            </Text>
                        </View>

                        <View style={styles.paymentMethods}>
                            <Text style={[styles.paymentMethodsTitle, { color: theme.colors.text }]}>
                                Payment Method
                            </Text>
                            <View style={styles.paymentMethodsGrid}>
                                {PAYMENT_METHODS.map((method) => (
                                    <TouchableOpacity
                                        key={method.id}
                                        style={[
                                            styles.paymentMethodButton,
                                            {
                                                backgroundColor:
                                                    selectedPaymentMethod === method.id
                                                        ? theme.colors.primary[100]
                                                        : theme.colors.gray[100],
                                                borderColor:
                                                    selectedPaymentMethod === method.id
                                                        ? theme.colors.primary[500]
                                                        : theme.colors.gray[200],
                                            },
                                        ]}
                                        onPress={() => setSelectedPaymentMethod(method.id)}
                                    >
                                        <Icon
                                            name={method.icon}
                                            size={28}
                                            color={
                                                selectedPaymentMethod === method.id
                                                    ? theme.colors.primary[500]
                                                    : theme.colors.gray[500]
                                            }
                                        />
                                        <Text
                                            style={[
                                                styles.paymentMethodText,
                                                {
                                                    color:
                                                        selectedPaymentMethod === method.id
                                                            ? theme.colors.primary[500]
                                                            : theme.colors.text,
                                                },
                                            ]}
                                        >
                                            {method.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {selectedPaymentMethod === 'cash' && (
                            <View style={styles.cashInput}>
                                <Text style={[styles.cashInputLabel, { color: theme.colors.text }]}>
                                    Amount Received
                                </Text>
                                <TextInput
                                    style={[styles.cashInputField, { backgroundColor: theme.colors.gray[100], color: theme.colors.text }]}
                                    placeholder="0.00"
                                    placeholderTextColor={theme.colors.textSecondary}
                                    keyboardType="numeric"
                                    value={amountReceived}
                                    onChangeText={setAmountReceived}
                                />
                                {amountReceived && parseFloat(amountReceived) >= total && (
                                    <Text style={[styles.changeText, { color: theme.colors.success[500] }]}>
                                        Change: {formatCurrency(parseFloat(amountReceived) - total)}
                                    </Text>
                                )}
                            </View>
                        )}

                        <Button
                            title="Complete Payment"
                            onPress={handlePayment}
                            variant="primary"
                            size="lg"
                            fullWidth
                            loading={isProcessing}
                            style={styles.completePaymentButton}
                        />
                    </View>
                </View>
            </Modal>

            {/* Receipt Modal */}
            <Modal
                visible={showReceiptModal}
                animationType="slide"
                transparent
                onRequestClose={() => setShowReceiptModal(false)}
            >
                <View style={styles.receiptModalOverlay}>
                    <View style={[styles.receiptModal, { backgroundColor: theme.colors.white }]}>
                        <View style={styles.receiptHeader}>
                            <Icon name="check-circle" size={48} color={theme.colors.success[500]} />
                            <Text style={[styles.receiptSuccessText, { color: theme.colors.text }]}>
                                Payment Successful!
                            </Text>
                        </View>

                        {receiptData && (
                            <ScrollView style={styles.receiptContent} showsVerticalScrollIndicator={false}>
                                <View style={styles.receiptInfo}>
                                    <Text style={[styles.receiptLabel, { color: theme.colors.textSecondary }]}>
                                        Bill No.
                                    </Text>
                                    <Text style={[styles.receiptValue, { color: theme.colors.text }]}>
                                        {receiptData.billNumber}
                                    </Text>
                                </View>
                                <View style={styles.receiptInfo}>
                                    <Text style={[styles.receiptLabel, { color: theme.colors.textSecondary }]}>
                                        Date & Time
                                    </Text>
                                    <Text style={[styles.receiptValue, { color: theme.colors.text }]}>
                                        {receiptData.date}
                                    </Text>
                                </View>
                                <View style={styles.receiptInfo}>
                                    <Text style={[styles.receiptLabel, { color: theme.colors.textSecondary }]}>
                                        Cashier
                                    </Text>
                                    <Text style={[styles.receiptValue, { color: theme.colors.text }]}>
                                        {receiptData.cashier}
                                    </Text>
                                </View>

                                <View style={[styles.receiptDivider, { backgroundColor: theme.colors.gray[200] }]} />

                                {receiptData.items.map((item: CartItem, index: number) => (
                                    <View key={index} style={styles.receiptItem}>
                                        <Text style={[styles.receiptItemName, { color: theme.colors.text }]}>
                                            {item.product.name} × {item.quantity}
                                        </Text>
                                        <Text style={[styles.receiptItemPrice, { color: theme.colors.text }]}>
                                            {formatCurrency(item.totalPrice)}
                                        </Text>
                                    </View>
                                ))}

                                <View style={[styles.receiptDivider, { backgroundColor: theme.colors.gray[200] }]} />

                                <View style={styles.receiptInfo}>
                                    <Text style={[styles.receiptLabel, { color: theme.colors.textSecondary }]}>
                                        Subtotal
                                    </Text>
                                    <Text style={[styles.receiptValue, { color: theme.colors.text }]}>
                                        {formatCurrency(receiptData.subtotal)}
                                    </Text>
                                </View>
                                <View style={styles.receiptInfo}>
                                    <Text style={[styles.receiptLabel, { color: theme.colors.textSecondary }]}>
                                        GST (0%)
                                    </Text>
                                    <Text style={[styles.receiptValue, { color: theme.colors.text }]}>
                                        {formatCurrency(receiptData.tax)}
                                    </Text>
                                </View>
                                <View style={styles.receiptInfo}>
                                    <Text style={[styles.receiptTotalLabel, { color: theme.colors.text }]}>
                                        Total
                                    </Text>
                                    <Text style={[styles.receiptTotalValue, { color: theme.colors.primary[500] }]}>
                                        {formatCurrency(receiptData.total)}
                                    </Text>
                                </View>

                                <View style={[styles.receiptDivider, { backgroundColor: theme.colors.gray[200] }]} />

                                <View style={styles.receiptInfo}>
                                    <Text style={[styles.receiptLabel, { color: theme.colors.textSecondary }]}>
                                        Payment Method
                                    </Text>
                                    <Text style={[styles.receiptValue, { color: theme.colors.text }]}>
                                        {receiptData.paymentMethod}
                                    </Text>
                                </View>
                                {receiptData.paymentMethod === 'Cash' && (
                                    <>
                                        <View style={styles.receiptInfo}>
                                            <Text style={[styles.receiptLabel, { color: theme.colors.textSecondary }]}>
                                                Amount Received
                                            </Text>
                                            <Text style={[styles.receiptValue, { color: theme.colors.text }]}>
                                                {formatCurrency(receiptData.amountReceived)}
                                            </Text>
                                        </View>
                                        <View style={styles.receiptInfo}>
                                            <Text style={[styles.receiptLabel, { color: theme.colors.success[500] }]}>
                                                Change
                                            </Text>
                                            <Text style={[styles.receiptValue, { color: theme.colors.success[500] }]}>
                                                {formatCurrency(receiptData.change)}
                                            </Text>
                                        </View>
                                    </>
                                )}
                            </ScrollView>
                        )}

                        <View style={styles.receiptActions}>
                            <Button
                                title="Print Receipt"
                                onPress={() => Alert.alert('Print', 'Print functionality coming soon')}
                                variant="outline"
                                size="md"
                                leftIcon={<Icon name="print" size={18} color={theme.colors.primary[500]} />}
                                style={styles.receiptActionButton}
                            />
                            <Button
                                title="Done"
                                onPress={() => {
                                    setShowReceiptModal(false);
                                    setReceiptData(null);
                                }}
                                variant="primary"
                                size="md"
                                style={styles.receiptActionButton}
                            />
                        </View>
                    </View>
                </View>
            </Modal>

        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 50,
        paddingBottom: 16,
        paddingHorizontal: 16,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '600',
    },
    clearButton: {
        padding: 8,
    },
    actionBar: {
        flexDirection: 'row',
        padding: 16,
        gap: 12,
    },
    actionButton: {
        flex: 1,
    },
    cartList: {
        padding: 16,
        paddingTop: 0,
    },
    cartItem: {
        marginBottom: 16,
        padding: 0,
        overflow: 'hidden',
    },
    cartItemWrapper: {
        padding: 14,
    },
    productInfoSection: {
        marginBottom: 12,
    },
    productHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    productDetails: {
        flex: 1,
        marginRight: 12,
    },
    cartItemName: {
        fontSize: 16,
        fontWeight: '600',
        lineHeight: 22,
        marginBottom: 6,
        flexWrap: 'wrap',
    },
    productMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        flexWrap: 'wrap',
    },
    productSku: {
        fontSize: 13,
        fontWeight: '500',
    },
    metaDivider: {
        marginHorizontal: 6,
        fontSize: 13,
    },
    productBarcode: {
        fontSize: 13,
        fontWeight: '500',
    },
    priceInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
    },
    costPriceLabel: {
        fontSize: 13,
    },
    profitBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
        gap: 4,
    },
    profitText: {
        fontSize: 11,
        fontWeight: '600',
    },
    batchInfoLabel: {
        fontSize: 11,
        fontWeight: '500',
        marginTop: 4,
    },
    removeButton: {
        padding: 4,
        marginTop: -4,
    },
    controlsRow: {
        flexDirection: 'row',
        gap: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
    },
    quantitySection: {
        flex: 1,
    },
    priceSection: {
        flex: 1,
    },
    controlLabel: {
        fontSize: 11,
        fontWeight: '500',
        marginBottom: 6,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    quantityControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    quantityButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    quantity: {
        fontSize: 16,
        fontWeight: '700',
        minWidth: 30,
        textAlign: 'center',
    },
    priceEditContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    priceInput: {
        height: 38,
        borderRadius: 8,
        borderWidth: 2,
        paddingHorizontal: 10,
        fontSize: 15,
        fontWeight: '600',
        minWidth: 100,
    },
    priceDisplay: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 6,
    },
    priceValue: {
        fontSize: 15,
        fontWeight: '600',
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingTop: 12,
        marginTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#E8E8E8',
    },
    totalContainer: {
        alignItems: 'flex-end',
    },
    totalLabel: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    totalValue: {
        fontSize: 18,
        fontWeight: '700',
    },
    emptyCart: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
    },
    emptyCartText: {
        fontSize: 18,
        fontWeight: '600',
        marginTop: 16,
        marginBottom: 8,
    },
    emptyCartSubtext: {
        fontSize: 14,
        textAlign: 'center',
    },
    billSummary: {
        padding: 16,
        borderTopWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 5,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    summaryLabel: {
        fontSize: 14,
    },
    summaryValue: {
        fontSize: 14,
        fontWeight: '500',
    },
    totalRow: {
        marginTop: 8,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
    },
    totalLabel: {
        fontSize: 18,
        fontWeight: '600',
    },
    totalValue: {
        fontSize: 20,
        fontWeight: '700',
    },
    payButton: {
        marginTop: 16,
    },
    modalContainer: {
        flex: 1,
    },
    scannerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 50,
        paddingBottom: 16,
        paddingHorizontal: 16,
    },
    scannerTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    searchHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 50,
        paddingBottom: 16,
        paddingHorizontal: 16,
    },
    searchHeaderTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    searchContainer: {
        padding: 16,
        paddingTop: 0,
    },
    searchInput: {
        height: 48,
        borderRadius: 8,
        paddingHorizontal: 16,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    searchResults: {
        padding: 16,
        paddingTop: 8,
    },
    searchResultItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderRadius: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    searchResultInfo: {
        flex: 1,
    },
    searchResultName: {
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 4,
    },
    searchResultDetails: {
        fontSize: 14,
    },
    searchResultPrice: {
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 12,
    },
    emptySearch: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 48,
    },
    emptySearchText: {
        fontSize: 16,
        marginTop: 16,
    },
    paymentModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    paymentModal: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 24,
        maxHeight: '80%',
    },
    paymentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    paymentTitle: {
        fontSize: 20,
        fontWeight: '600',
    },
    paymentAmount: {
        alignItems: 'center',
        marginBottom: 24,
    },
    paymentAmountLabel: {
        fontSize: 14,
        marginBottom: 8,
    },
    paymentAmountValue: {
        fontSize: 32,
        fontWeight: '700',
    },
    paymentMethods: {
        marginBottom: 24,
    },
    paymentMethodsTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
    },
    paymentMethodsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    paymentMethodButton: {
        flex: 1,
        minWidth: '45%',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        borderWidth: 2,
    },
    paymentMethodText: {
        fontSize: 14,
        fontWeight: '500',
        marginTop: 8,
    },
    cashInput: {
        marginBottom: 24,
    },
    cashInputLabel: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 8,
    },
    cashInputField: {
        height: 48,
        borderRadius: 8,
        paddingHorizontal: 16,
        fontSize: 18,
        fontWeight: '600',
    },
    changeText: {
        fontSize: 16,
        fontWeight: '600',
        marginTop: 8,
        textAlign: 'right',
    },
    completePaymentButton: {
        marginTop: 8,
    },
    receiptModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        padding: 24,
    },
    receiptModal: {
        borderRadius: 20,
        padding: 24,
        maxHeight: '90%',
    },
    receiptHeader: {
        alignItems: 'center',
        marginBottom: 24,
    },
    receiptSuccessText: {
        fontSize: 20,
        fontWeight: '600',
        marginTop: 12,
    },
    receiptContent: {
        marginBottom: 24,
    },
    receiptInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    receiptLabel: {
        fontSize: 14,
    },
    receiptValue: {
        fontSize: 14,
        fontWeight: '500',
    },
    receiptDivider: {
        height: 1,
        marginVertical: 16,
    },
    receiptItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    receiptItemName: {
        fontSize: 14,
        flex: 1,
    },
    receiptItemPrice: {
        fontSize: 14,
        fontWeight: '500',
    },
    receiptTotalLabel: {
        fontSize: 16,
        fontWeight: '600',
    },
    receiptTotalValue: {
        fontSize: 18,
        fontWeight: '700',
    },
    receiptActions: {
        flexDirection: 'row',
        gap: 12,
    },
    receiptActionButton: {
        flex: 1,
    },
});

export default BillingScreen;

