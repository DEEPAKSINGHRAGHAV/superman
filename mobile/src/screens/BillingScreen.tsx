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
    KeyboardAvoidingView,
    Platform,
    Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Button, Card, LoadingSpinner } from '../components/ui';
import ProductSearch from '../components/ProductSearch';
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
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('cash');
    const [amountReceived, setAmountReceived] = useState('');
    const [receiptData, setReceiptData] = useState<any>(null);

    // Calculate totals
    const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
    const tax = subtotal * 0; // 0% GST (No tax)
    const total = subtotal + tax;
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);


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
                updatedCart[existingItemIndex].totalPrice = parseFloat((newQuantity * updatedCart[existingItemIndex].unitPrice).toFixed(2));
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
                        const batches = batchResponse.data.batches;

                        // Filter out expired batches and check if oldest available batch is valid
                        const today = new Date();
                        today.setHours(0, 0, 0, 0); // Reset to start of day for accurate comparison

                        const validBatches = batches.filter((batch: any) => {
                            // Must have current quantity
                            if (!batch.currentQuantity || batch.currentQuantity <= 0) return false;

                            // No expiry date means always valid
                            if (!batch.expiryDate) return true;

                            // Parse expiry date and compare
                            const expiryDate = new Date(batch.expiryDate);
                            expiryDate.setHours(0, 0, 0, 0); // Reset to start of day

                            // Batch is valid if expiry date is today or in the future
                            return expiryDate >= today;
                        });

                        if (validBatches.length === 0) {
                            Alert.alert(
                                'Expired Stock',
                                `All batches for "${product.name}" have expired and cannot be sold. Please remove expired batches from inventory or contact management.`,
                                [{ text: 'OK' }]
                            );
                            return;
                        }

                        // Get oldest valid (FIFO) batch
                        const oldestBatch = validBatches[0];

                        // Extract batch info first
                        unitPrice = parseFloat(oldestBatch.sellingPrice.toFixed(2));
                        costPrice = parseFloat(oldestBatch.costPrice.toFixed(2));
                        batchInfo = {
                            batchNumber: oldestBatch.batchNumber,
                            availableQuantity: oldestBatch.currentQuantity || oldestBatch.availableQuantity
                        };

                        // Check if batch is expiring soon (within 3 days) and show warning
                        if (oldestBatch.expiryDate) {
                            const expiryDate = new Date(oldestBatch.expiryDate);
                            const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

                            if (daysUntilExpiry <= 3 && daysUntilExpiry > 0) {
                                // Show warning and wait for user response
                                return new Promise((resolve) => {
                                    Alert.alert(
                                        'Warning: Expiring Soon',
                                        `The batch for "${product.name}" will expire in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}.\n\nExpiry Date: ${expiryDate.toLocaleDateString()}\nBatch: ${batchInfo.batchNumber}`,
                                        [
                                            {
                                                text: 'Cancel',
                                                style: 'cancel',
                                                onPress: () => {
                                                    resolve(null); // Don't add to cart
                                                }
                                            },
                                            {
                                                text: 'Add Anyway',
                                                style: 'default',
                                                onPress: () => {
                                                    // Actually add to cart
                                                    const newItem: CartItem = {
                                                        product,
                                                        quantity: 1,
                                                        unitPrice,
                                                        costPrice,
                                                        totalPrice: unitPrice,
                                                        batchInfo,
                                                    };
                                                    setCart([...cart, newItem]);
                                                    setShowProductSearch(false);
                                                    resolve(newItem);
                                                }
                                            }
                                        ]
                                    );
                                });
                            }
                        }

                        // If no warning needed, add to cart normally
                        const newItem: CartItem = {
                            product,
                            quantity: 1,
                            unitPrice,
                            costPrice,
                            totalPrice: unitPrice,
                            batchInfo,
                        };
                        setCart([...cart, newItem]);
                    } else if (batchResponse.success && batchResponse.data?.batches?.length === 0) {
                        // No non-expired batches available
                        Alert.alert(
                            'No Valid Batches',
                            `This product has no available non-expired batches. Please check inventory or add new stock.`,
                            [{ text: 'OK' }]
                        );
                        return;
                    }
                } catch (error) {
                    console.log('Could not fetch batch info, using product prices:', error);
                    // Continue with product's default prices
                }

                // Round prices to 2 decimals
                unitPrice = parseFloat(unitPrice.toFixed(2));
                costPrice = parseFloat(costPrice.toFixed(2));

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
                    totalPrice: parseFloat((newQuantity * item.unitPrice).toFixed(2)), // Round to 2 decimals
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
        const price = parseFloat(parseFloat(newPrice).toFixed(2)); // Round to 2 decimals

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
                    totalPrice: parseFloat((item.quantity * price).toFixed(2)), // Round total to 2 decimals
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
                    {/* Product Name - BIG and CLEAR */}
                    <View style={styles.productHeader}>
                        <View style={styles.productDetails}>
                            <Text style={[styles.cartItemName, { color: theme.colors.text }]} numberOfLines={2}>
                                {item.product.name}
                            </Text>
                            <Text style={[styles.productCode, { color: theme.colors.textSecondary }]}>
                                Code: {item.product.sku}
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => removeFromCart(item.product._id)}
                            style={[styles.removeButton, { backgroundColor: theme.colors.error[500] + '15' }]}
                            accessibilityLabel={`Remove ${item.product.name} from cart`}
                            accessibilityRole="button"
                        >
                            <Icon name="close" size={24} color={theme.colors.error[500]} />
                        </TouchableOpacity>
                    </View>

                    {/* Quantity Controls - EXTRA LARGE */}
                    <View style={styles.quantitySectionContainer}>
                        <Text style={[styles.quantityLabel, { color: theme.colors.textSecondary }]}>
                            QUANTITY
                        </Text>
                        <View style={styles.quantityControls}>
                            <TouchableOpacity
                                onPress={() => updateQuantity(item.product._id, -1)}
                                style={[styles.quantityButton, styles.quantityButtonMinus, { backgroundColor: theme.colors.error[100] }]}
                                accessibilityLabel="Decrease quantity"
                                accessibilityRole="button"
                            >
                                <Icon name="remove" size={28} color={theme.colors.error[500]} />
                            </TouchableOpacity>
                            <View style={[styles.quantityDisplay, { backgroundColor: theme.colors.gray[50] }]}>
                                <Text style={[styles.quantityNumber, { color: theme.colors.text }]}>
                                    {item.quantity}
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => updateQuantity(item.product._id, 1)}
                                style={[styles.quantityButton, styles.quantityButtonPlus, { backgroundColor: theme.colors.success[100] }]}
                                accessibilityLabel="Increase quantity"
                                accessibilityRole="button"
                            >
                                <Icon name="add" size={28} color={theme.colors.success[500]} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Price Section - CLEAR */}
                    <View style={styles.priceSectionContainer}>
                        <View style={styles.priceRow}>
                            <Text style={[styles.priceLabel, { color: theme.colors.textSecondary }]}>
                                PRICE PER UNIT
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
                                        onSubmitEditing={(e) => {
                                            updateSellingPrice(item.product._id, e.nativeEvent.text);
                                        }}
                                        onBlur={() => {
                                            // Toggle back if user clicks away without submitting
                                            togglePriceEdit(item.product._id);
                                        }}
                                        placeholder="0.00"
                                        placeholderTextColor={theme.colors.textSecondary}
                                        accessibilityLabel="Edit price per unit"
                                    />
                                </View>
                            ) : (
                                <TouchableOpacity
                                    onPress={() => togglePriceEdit(item.product._id)}
                                    style={styles.priceDisplay}
                                    activeOpacity={0.7}
                                    accessibilityLabel={`Price per unit: ${formatCurrency(item.unitPrice)}. Tap to edit`}
                                    accessibilityRole="button"
                                >
                                    <Text style={[styles.priceValue, { color: theme.colors.text }]}>
                                        {formatCurrency(item.unitPrice)}
                                    </Text>
                                    <Icon name="edit" size={18} color={theme.colors.primary[500]} />
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Item Total - BIG and CLEAR */}
                        <View style={[styles.itemTotalRow, { borderTopColor: theme.colors.gray[200] }]}>
                            <Text style={[styles.itemTotalLabel, { color: theme.colors.text }]}>
                                ITEM TOTAL
                            </Text>
                            <Text style={[styles.itemTotalValue, { color: theme.colors.primary[500] }]}>
                                {formatCurrency(item.totalPrice)}
                            </Text>
                        </View>
                    </View>
                </View>
            </Card>
        );
    };


    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]} accessibilityLabel="Billing screen">
            {/* Simple Header */}
            <View style={[styles.header, { backgroundColor: theme.colors.primary[500] }]}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backButton}
                    accessibilityLabel="Go back"
                    accessibilityRole="button"
                >
                    <Icon name="arrow-back" size={28} color={theme.colors.white} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={[styles.headerTitle, { color: theme.colors.white }]}>BILLING</Text>
                    {cart.length > 0 && (
                        <Text style={[styles.headerSubtitle, { color: theme.colors.white }]}>
                            {totalItems} {totalItems === 1 ? 'item' : 'items'} in cart
                        </Text>
                    )}
                </View>
                {cart.length > 0 && (
                    <TouchableOpacity
                        onPress={() => {
                            Alert.alert(
                                'Clear All Items?',
                                'This will remove all items from your cart.',
                                [
                                    { text: 'No, Keep Items', style: 'cancel' },
                                    { text: 'Yes, Clear All', style: 'destructive', onPress: () => setCart([]) },
                                ]
                            );
                        }}
                        style={styles.clearButton}
                        accessibilityLabel="Clear cart"
                        accessibilityRole="button"
                    >
                        <Icon name="delete-outline" size={28} color={theme.colors.white} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Main Action Buttons - EXTRA LARGE for easy tapping */}
            {cart.length === 0 && (
                <View style={styles.mainActionsContainer}>
                    <Text style={[styles.instructionText, { color: theme.colors.textSecondary }]}>
                        Start by adding products to cart
                    </Text>
                    <TouchableOpacity
                        style={[styles.megaButton, styles.scanButton, { backgroundColor: theme.colors.primary[500] }]}
                        onPress={() => setShowScanner(true)}
                        activeOpacity={0.8}
                        accessibilityLabel="Scan barcode to add product"
                        accessibilityRole="button"
                    >
                        <View style={styles.megaButtonContent}>
                            <Icon name="qr-code-scanner" size={48} color={theme.colors.white} />
                            <Text style={styles.megaButtonText}>SCAN BARCODE</Text>
                            <Text style={styles.megaButtonSubtext}>Point camera at product barcode</Text>
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.megaButton, styles.searchButton, { backgroundColor: theme.colors.white, borderColor: theme.colors.primary[500] }]}
                        onPress={() => setShowProductSearch(true)}
                        activeOpacity={0.8}
                        accessibilityLabel="Search for product manually"
                        accessibilityRole="button"
                    >
                        <View style={styles.megaButtonContent}>
                            <Icon name="search" size={48} color={theme.colors.primary[500]} />
                            <Text style={[styles.megaButtonText, { color: theme.colors.primary[500] }]}>SEARCH PRODUCT</Text>
                            <Text style={[styles.megaButtonSubtext, { color: theme.colors.textSecondary }]}>Type product name or code</Text>
                        </View>
                    </TouchableOpacity>
                </View>
            )}

            {/* Cart Items with Add More Button */}
            {cart.length > 0 && (
                <>
                    <View style={styles.addMoreContainer}>
                        <TouchableOpacity
                            style={[styles.addMoreButton, { backgroundColor: theme.colors.gray[100], borderColor: theme.colors.primary[500] }]}
                            onPress={() => setShowProductSearch(true)}
                            activeOpacity={0.7}
                            accessibilityLabel="Add more products"
                            accessibilityRole="button"
                        >
                            <Icon name="add" size={28} color={theme.colors.primary[500]} />
                            <Text style={[styles.addMoreText, { color: theme.colors.primary[500] }]}>
                                ADD MORE PRODUCTS
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <FlatList
                        data={cart}
                        renderItem={renderCartItem}
                        keyExtractor={(item) => item.product._id}
                        contentContainerStyle={styles.cartList}
                        showsVerticalScrollIndicator={false}
                        ListFooterComponent={<View style={{ height: 20 }} />}
                    />
                </>
            )}

            {/* Bill Summary - EXTRA LARGE and CLEAR */}
            {cart.length > 0 && (
                <View style={[styles.billSummary, { backgroundColor: theme.colors.white, borderTopColor: theme.colors.gray[200] }]}>
                    <View style={styles.summaryHeader}>
                        <Text style={[styles.summaryHeaderText, { color: theme.colors.textSecondary }]}>
                            BILL SUMMARY
                        </Text>
                    </View>

                    <View style={styles.summaryDetails}>
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
                                Tax (0%)
                            </Text>
                            <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
                                {formatCurrency(tax)}
                            </Text>
                        </View>
                        <View style={[styles.summaryRow, styles.totalRow]}>
                            <Text style={[styles.totalLabel, { color: theme.colors.text }]}>TOTAL AMOUNT</Text>
                            <Text style={[styles.totalValue, { color: theme.colors.primary[500] }]}>
                                {formatCurrency(total)}
                            </Text>
                        </View>
                    </View>

                    {/* MEGA PAY BUTTON */}
                    <TouchableOpacity
                        style={[styles.megaPayButton, { backgroundColor: theme.colors.primary[500] }]}
                        onPress={() => setShowPaymentModal(true)}
                        activeOpacity={0.8}
                        accessibilityLabel={`Pay ${formatCurrency(total)}`}
                        accessibilityRole="button"
                    >
                        <View style={styles.megaPayButtonContent}>
                            <Icon name="payment" size={32} color={theme.colors.white} />
                            <View style={styles.megaPayButtonTextContainer}>
                                <Text style={styles.megaPayButtonLabel}>TAP TO PAY</Text>
                                <Text style={styles.megaPayButtonAmount}>{formatCurrency(total)}</Text>
                            </View>
                        </View>
                    </TouchableOpacity>
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
                        }}>
                            <Icon name="close" size={24} color={theme.colors.white} />
                        </TouchableOpacity>
                        <Text style={[styles.searchHeaderTitle, { color: theme.colors.white }]}>Search Products</Text>
                        <View style={{ width: 24 }} />
                    </View>
                    <View style={styles.searchContainer}>
                        <ProductSearch
                            placeholder="Type product name, SKU, barcode, or brand..."
                            onProductSelect={addToCart}
                            showStockInfo={true}
                            showPrice={true}
                            maxResults={50}
                            minSearchLength={2}
                            debounceMs={300}
                            autoFocus={true}
                        />
                    </View>
                </View>
            </Modal>

            {/* Payment Modal - SIMPLIFIED */}
            <Modal
                visible={showPaymentModal}
                animationType="slide"
                transparent
                onRequestClose={() => setShowPaymentModal(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.paymentModalOverlay}
                >
                    <View style={[styles.paymentModal, { backgroundColor: theme.colors.white }]}>
                        <View style={styles.paymentHeader}>
                            <Text style={[styles.paymentTitle, { color: theme.colors.text }]}>PAYMENT</Text>
                            <TouchableOpacity
                                onPress={() => setShowPaymentModal(false)}
                                accessibilityLabel="Close payment"
                                accessibilityRole="button"
                            >
                                <Icon name="close" size={28} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            style={styles.paymentContent}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                        >
                            {/* Total Amount - EXTRA LARGE */}
                            <View style={[styles.paymentAmount, { backgroundColor: theme.colors.primary[50] }]}>
                                <Text style={[styles.paymentAmountLabel, { color: theme.colors.textSecondary }]}>
                                    TOTAL TO PAY
                                </Text>
                                <Text style={[styles.paymentAmountValue, { color: theme.colors.primary[500] }]}>
                                    {formatCurrency(total)}
                                </Text>
                            </View>

                            {/* Payment Methods - LARGE BUTTONS */}
                            <View style={styles.paymentMethods}>
                                <Text style={[styles.paymentMethodsTitle, { color: theme.colors.text }]}>
                                    SELECT PAYMENT METHOD
                                </Text>
                                <View style={styles.paymentMethodsGrid}>
                                    {PAYMENT_METHODS.map((method) => (
                                        <TouchableOpacity
                                            key={method.id}
                                            style={[
                                                styles.paymentMethodButtonLarge,
                                                {
                                                    backgroundColor:
                                                        selectedPaymentMethod === method.id
                                                            ? theme.colors.primary[500]
                                                            : theme.colors.gray[100],
                                                    borderColor:
                                                        selectedPaymentMethod === method.id
                                                            ? theme.colors.primary[500]
                                                            : theme.colors.gray[300],
                                                },
                                            ]}
                                            onPress={() => setSelectedPaymentMethod(method.id)}
                                            activeOpacity={0.7}
                                            accessibilityLabel={`Select ${method.name} payment`}
                                            accessibilityRole="button"
                                        >
                                            <Icon
                                                name={method.icon}
                                                size={36}
                                                color={
                                                    selectedPaymentMethod === method.id
                                                        ? theme.colors.white
                                                        : theme.colors.gray[600]
                                                }
                                            />
                                            <Text
                                                style={[
                                                    styles.paymentMethodTextLarge,
                                                    {
                                                        color:
                                                            selectedPaymentMethod === method.id
                                                                ? theme.colors.white
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

                            {/* Cash Input - SIMPLE and CLEAR */}
                            {selectedPaymentMethod === 'cash' && (
                                <View style={styles.cashInput}>
                                    <Text style={[styles.cashInputLabel, { color: theme.colors.text }]}>
                                        ENTER CASH RECEIVED
                                    </Text>
                                    <TextInput
                                        style={[styles.cashInputFieldLarge, {
                                            backgroundColor: theme.colors.gray[50],
                                            color: theme.colors.text,
                                            borderColor: theme.colors.primary[500]
                                        }]}
                                        placeholder="Enter amount..."
                                        placeholderTextColor={theme.colors.textSecondary}
                                        keyboardType="decimal-pad"
                                        value={amountReceived}
                                        onChangeText={setAmountReceived}
                                        autoFocus
                                        accessibilityLabel="Enter cash amount received"
                                    />
                                    {amountReceived && !isNaN(parseFloat(amountReceived)) && (
                                        <View style={styles.changeContainer}>
                                            {parseFloat(amountReceived) >= total ? (
                                                <View style={[styles.changeDisplay, { backgroundColor: theme.colors.success[50] }]}>
                                                    <Text style={[styles.changeLabel, { color: theme.colors.success[700] }]}>
                                                        CHANGE TO GIVE BACK
                                                    </Text>
                                                    <Text style={[styles.changeAmount, { color: theme.colors.success[700] }]}>
                                                        {formatCurrency(parseFloat(amountReceived) - total)}
                                                    </Text>
                                                </View>
                                            ) : (
                                                <View style={[styles.changeDisplay, { backgroundColor: theme.colors.error[500] + '15' }]}>
                                                    <Text style={[styles.changeLabel, { color: theme.colors.error[700] }]}>
                                                        INSUFFICIENT AMOUNT
                                                    </Text>
                                                    <Text style={[styles.changeAmount, { color: theme.colors.error[700] }]}>
                                                        Need {formatCurrency(total - parseFloat(amountReceived))} more
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                    )}
                                </View>
                            )}
                        </ScrollView>

                        {/* Complete Payment Button - MEGA SIZE */}
                        <View style={styles.paymentButtonContainer}>
                            <TouchableOpacity
                                style={[styles.completePaymentButtonLarge, {
                                    backgroundColor: isProcessing ? theme.colors.gray[400] : theme.colors.primary[500]
                                }]}
                                onPress={handlePayment}
                                disabled={isProcessing || (selectedPaymentMethod === 'cash' && (!amountReceived || parseFloat(amountReceived) < total))}
                                activeOpacity={0.8}
                                accessibilityLabel="Complete payment"
                                accessibilityRole="button"
                            >
                                {isProcessing ? (
                                    <LoadingSpinner size="sm" color={theme.colors.white} />
                                ) : (
                                    <>
                                        <Icon name="check-circle" size={32} color={theme.colors.white} />
                                        <Text style={styles.completePaymentButtonText}>
                                            COMPLETE PAYMENT
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
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
        paddingBottom: 20,
        paddingHorizontal: 20,
        minHeight: 80,
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
    },
    backButton: {
        padding: 12,
        minWidth: 48,
        minHeight: 48,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '700',
        letterSpacing: 1,
    },
    headerSubtitle: {
        fontSize: 14,
        fontWeight: '500',
        marginTop: 4,
        opacity: 0.9,
    },
    clearButton: {
        padding: 12,
        minWidth: 48,
        minHeight: 48,
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Main Action Buttons
    mainActionsContainer: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
        alignItems: 'stretch',
    },
    instructionText: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 32,
        fontWeight: '500',
    },
    megaButton: {
        borderRadius: 16,
        padding: 32,
        marginBottom: 20,
        borderWidth: 3,
        minHeight: 180,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 8,
    },
    megaButtonContent: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    megaButtonText: {
        fontSize: 20,
        fontWeight: '700',
        marginTop: 16,
        letterSpacing: 1,
        color: '#FFFFFF',
    },
    megaButtonSubtext: {
        fontSize: 14,
        marginTop: 8,
        fontWeight: '500',
        opacity: 0.9,
        color: '#FFFFFF',
    },
    scanButton: {
        // Already styled via backgroundColor prop
    },
    searchButton: {
        borderWidth: 3,
    },
    // Add More Button
    addMoreContainer: {
        padding: 16,
        paddingTop: 20,
    },
    addMoreButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        borderWidth: 2,
        gap: 12,
    },
    addMoreText: {
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.5,
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
        marginBottom: 20,
        padding: 0,
        overflow: 'hidden',
        marginHorizontal: 16,
    },
    cartItemWrapper: {
        padding: 20,
    },
    productHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    productDetails: {
        flex: 1,
        marginRight: 16,
    },
    cartItemName: {
        fontSize: 20,
        fontWeight: '700',
        lineHeight: 28,
        marginBottom: 8,
    },
    productCode: {
        fontSize: 14,
        fontWeight: '500',
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
        padding: 12,
        borderRadius: 12,
        minWidth: 48,
        minHeight: 48,
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Quantity Section
    quantitySectionContainer: {
        marginBottom: 20,
    },
    quantityLabel: {
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    quantityControls: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
    },
    quantityButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
    },
    quantityButtonMinus: {
        borderColor: '#E57373',
    },
    quantityButtonPlus: {
        borderColor: '#81C784',
    },
    quantityDisplay: {
        minWidth: 80,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    quantityNumber: {
        fontSize: 28,
        fontWeight: '700',
    },
    // Price Section
    priceSectionContainer: {
        paddingTop: 20,
        borderTopWidth: 2,
        borderTopColor: '#E0E0E0',
    },
    priceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    priceLabel: {
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    priceEditContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    priceInput: {
        height: 48,
        borderRadius: 12,
        borderWidth: 2,
        paddingHorizontal: 16,
        fontSize: 18,
        fontWeight: '700',
        minWidth: 120,
        textAlign: 'right',
    },
    priceDisplay: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    priceValue: {
        fontSize: 20,
        fontWeight: '700',
    },
    itemTotalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 16,
        borderTopWidth: 2,
    },
    itemTotalLabel: {
        fontSize: 16,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    itemTotalValue: {
        fontSize: 24,
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
        padding: 24,
        borderTopWidth: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 8,
    },
    summaryHeader: {
        marginBottom: 20,
    },
    summaryHeaderText: {
        fontSize: 14,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    summaryDetails: {
        marginBottom: 24,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    summaryLabel: {
        fontSize: 16,
        fontWeight: '500',
    },
    summaryValue: {
        fontSize: 16,
        fontWeight: '600',
    },
    totalRow: {
        marginTop: 12,
        paddingTop: 16,
        borderTopWidth: 2,
        borderTopColor: '#E0E0E0',
    },
    totalLabel: {
        fontSize: 18,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    totalValue: {
        fontSize: 28,
        fontWeight: '700',
    },
    // Mega Pay Button
    megaPayButton: {
        borderRadius: 16,
        padding: 20,
        minHeight: 80,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
    },
    megaPayButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    megaPayButtonTextContainer: {
        alignItems: 'flex-start',
    },
    megaPayButtonLabel: {
        fontSize: 14,
        fontWeight: '600',
        letterSpacing: 1,
        color: '#FFFFFF',
        opacity: 0.9,
    },
    megaPayButtonAmount: {
        fontSize: 24,
        fontWeight: '700',
        color: '#FFFFFF',
        marginTop: 2,
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
    searchInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        position: 'relative',
    },
    searchIcon: {
        position: 'absolute',
        left: 14,
        zIndex: 1,
    },
    searchInput: {
        flex: 1,
        height: 50,
        borderRadius: 10,
        paddingLeft: 42,
        paddingRight: 42,
        fontSize: 15,
        borderWidth: 1.5,
        borderColor: '#E0E0E0',
    },
    clearSearchButton: {
        position: 'absolute',
        right: 12,
        padding: 4,
    },
    searchHint: {
        fontSize: 12,
        marginTop: 8,
        marginLeft: 4,
        fontStyle: 'italic',
    },
    searchingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    searchResults: {
        padding: 16,
        paddingTop: 8,
    },
    searchResultItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 14,
        borderRadius: 10,
        marginBottom: 10,
        borderWidth: 1.5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    searchResultInfo: {
        flex: 1,
        marginRight: 12,
    },
    searchResultName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 6,
        lineHeight: 22,
    },
    searchResultDetails: {
        fontSize: 13,
        marginBottom: 8,
        lineHeight: 18,
    },
    stockBadgeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    stockBadge: {
        fontSize: 12,
        fontWeight: '600',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        overflow: 'hidden',
    },
    searchResultPriceContainer: {
        alignItems: 'flex-end',
        justifyContent: 'center',
        gap: 4,
    },
    searchResultPrice: {
        fontSize: 17,
        fontWeight: '700',
    },
    emptySearch: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        paddingHorizontal: 32,
    },
    emptySearchText: {
        fontSize: 18,
        fontWeight: '600',
        marginTop: 16,
        marginBottom: 8,
        textAlign: 'center',
    },
    emptySearchSubtext: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
    paymentModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'flex-end',
    },
    paymentModal: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '90%',
        paddingTop: 28,
    },
    paymentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
        paddingHorizontal: 24,
    },
    paymentTitle: {
        fontSize: 24,
        fontWeight: '700',
        letterSpacing: 1,
    },
    paymentContent: {
        paddingHorizontal: 24,
    },
    paymentAmount: {
        alignItems: 'center',
        marginBottom: 32,
        padding: 24,
        borderRadius: 16,
    },
    paymentAmountLabel: {
        fontSize: 14,
        marginBottom: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    paymentAmountValue: {
        fontSize: 42,
        fontWeight: '700',
    },
    paymentMethods: {
        marginBottom: 32,
    },
    paymentMethodsTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 16,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    paymentMethodsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    paymentMethodButtonLarge: {
        flex: 1,
        minWidth: '45%',
        alignItems: 'center',
        padding: 20,
        borderRadius: 16,
        borderWidth: 3,
        minHeight: 120,
        justifyContent: 'center',
        gap: 12,
    },
    paymentMethodTextLarge: {
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    cashInput: {
        marginBottom: 24,
    },
    cashInputLabel: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    cashInputFieldLarge: {
        height: 64,
        borderRadius: 12,
        paddingHorizontal: 20,
        fontSize: 24,
        fontWeight: '700',
        borderWidth: 3,
        textAlign: 'center',
    },
    changeContainer: {
        marginTop: 16,
    },
    changeDisplay: {
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    changeLabel: {
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 8,
    },
    changeAmount: {
        fontSize: 28,
        fontWeight: '700',
    },
    paymentButtonContainer: {
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: Platform.OS === 'ios' ? 40 : 28,
        borderTopWidth: 2,
        borderTopColor: '#E0E0E0',
    },
    completePaymentButtonLarge: {
        borderRadius: 16,
        padding: 20,
        minHeight: 72,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
    },
    completePaymentButtonText: {
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: 1,
        color: '#FFFFFF',
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

