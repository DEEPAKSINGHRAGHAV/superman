import React, { useState, useEffect, useRef } from 'react';
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
    assignedBatch?: any; // The specific batch assigned to this cart item
    allBatches?: any[]; // Store all batches for finding next available batch
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
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('upi');
    const [amountReceived, setAmountReceived] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [customerInfo, setCustomerInfo] = useState<any>(null);
    const [isLoadingCustomer, setIsLoadingCustomer] = useState(false);
    const [receiptData, setReceiptData] = useState<any>(null);
    const [editingPriceValues, setEditingPriceValues] = useState<Record<string, string>>({});
    const productSearchRef = useRef<any>(null);
    const amountReceivedRef = useRef<TextInput>(null);
    const customerPhoneRef = useRef<TextInput>(null);

    // Calculate totals
    const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
    const tax = subtotal * 0; // 0% GST (No tax)
    const total = subtotal + tax;
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

    // Lookup or create customer by phone
    const handleCustomerPhoneLookup = async (phone: string) => {
        // Normalize phone number (remove spaces, dashes, etc.)
        const normalizedPhone = phone.replace(/[\s\-\(\)]/g, '');
        
        // Remove country code prefix if present (+91 or 91)
        let cleanedPhone = normalizedPhone;
        if (normalizedPhone.startsWith('+91')) {
            cleanedPhone = normalizedPhone.substring(3);
        } else if (normalizedPhone.startsWith('91') && normalizedPhone.length === 12) {
            cleanedPhone = normalizedPhone.substring(2);
        }
        
        // Only proceed if phone is exactly 10 digits (valid Indian phone number)
        if (!cleanedPhone || cleanedPhone.length !== 10 || !/^[6-9]\d{9}$/.test(cleanedPhone)) {
            setCustomerInfo(null);
            if (!phone) {
                setCustomerName('');
            }
            return;
        }

        setIsLoadingCustomer(true);
        try {
            const response = await apiService.findOrCreateCustomer({
                phone: cleanedPhone,
                name: (customerName && customerName.trim()) ? customerName.trim() : undefined
            });

            if (response.success && response.data) {
                setCustomerInfo(response.data);
                if (response.data.name && !customerName) {
                    setCustomerName(response.data.name);
                }
                if (response.message === 'New customer created') {
                    Alert.alert('Success', `New customer created: ${response.data.customerNumber}`);
                }
            }
        } catch (error: any) {
            console.error('Customer lookup error:', error);
            // Continue without customer if lookup fails
            setCustomerInfo(null);
            Alert.alert('Error', error.message || 'Failed to lookup customer');
        } finally {
            setIsLoadingCustomer(false);
        }
    };

    // Debounced phone lookup - only fires when phone is exactly 10 digits
    useEffect(() => {
        // Normalize phone number for validation
        const normalizedPhone = customerPhone ? customerPhone.replace(/[\s\-\(\)]/g, '') : '';
        let cleanedPhone = normalizedPhone;
        if (normalizedPhone.startsWith('+91')) {
            cleanedPhone = normalizedPhone.substring(3);
        } else if (normalizedPhone.startsWith('91') && normalizedPhone.length === 12) {
            cleanedPhone = normalizedPhone.substring(2);
        }
        
        // Extract only digits to check length
        const digitsOnly = cleanedPhone ? cleanedPhone.replace(/\D/g, '') : '';
        
        // Clear customer info immediately if phone is not exactly 10 digits
        if (digitsOnly.length !== 10) {
            setCustomerInfo(null);
            setIsLoadingCustomer(false);
            // Clear customer name when phone becomes incomplete
            if (digitsOnly.length < 10) {
                setCustomerName('');
            }
        }
        
        // Only call API if phone is exactly 10 digits (valid Indian number)
        const isValidPhone = digitsOnly.length === 10 && /^[6-9]\d{9}$/.test(digitsOnly);
        
        const timeoutId = setTimeout(() => {
            if (isValidPhone) {
                handleCustomerPhoneLookup(customerPhone);
            }
        }, 500); // Wait 500ms after user stops typing

        return () => clearTimeout(timeoutId);
    }, [customerPhone]);

    /**
     * Find next available batch for a product
     * Checks existing cart items to see which batches are already used and finds the next available one
     */
    const findNextAvailableBatch = (productId: string, allBatches: any[], existingCartItems: CartItem[]): any => {
        // Get all batches already assigned in cart for this product
        const usedBatchNumbers = existingCartItems
            .filter(item => item.product._id === productId && item.assignedBatch)
            .map(item => item.assignedBatch?.batchNumber);

        // Find the first batch that hasn't been used yet or has remaining quantity
        for (const batch of allBatches) {
            const batchNumber = batch.batchNumber;
            const alreadyUsed = usedBatchNumbers.includes(batchNumber);
            
            if (!alreadyUsed) {
                // New batch, use it
                return batch;
            } else {
                // Batch already in cart, check if it has remaining quantity
                const existingItem = existingCartItems.find(
                    item => item.product._id === productId && 
                    item.assignedBatch?.batchNumber === batchNumber
                );
                
                if (existingItem) {
                    const usedQuantity = existingItem.quantity;
                    const availableQuantity = batch.currentQuantity || batch.availableQuantity || 0;
                    if (usedQuantity < availableQuantity) {
                        // This batch still has available quantity, reuse it
                        return batch;
                    }
                    // This batch is exhausted, continue to next batch
                    continue;
                }
            }
        }

        return null; // No available batch found
    };

    // Auto-open product search modal on initial load when cart is empty
    useEffect(() => {
        if (cart.length === 0 && !showProductSearch && !showScanner && !showPaymentModal) {
            // Auto-open search modal on initial load
            setShowProductSearch(true);
        }
    }, []); // Run only on mount

    // Keep search bar focused when product search modal is open
    useEffect(() => {
        if (showProductSearch && productSearchRef.current) {
            // Focus the search input when modal opens
            setTimeout(() => {
                productSearchRef.current?.focus();
            }, 300);
        }
    }, [showProductSearch]);

    // Refocus search after cart changes (new items added, quantity updated)
    useEffect(() => {
        if (showProductSearch && productSearchRef.current) {
            setTimeout(() => {
                productSearchRef.current?.focus();
            }, 200);
        }
    }, [cart, showProductSearch]);

    // Focus amount received input when cash payment method is selected
    useEffect(() => {
        if (selectedPaymentMethod === 'cash' && amountReceivedRef.current && showPaymentModal) {
            setTimeout(() => {
                amountReceivedRef.current?.focus();
            }, 200);
        }
    }, [selectedPaymentMethod, showPaymentModal]);


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

            // Check if product already exists in cart
            const existingItems = cart.filter(item => item.product._id === product._id);

            if (existingItems.length > 0) {
                // Product already in cart - check if we can add to existing item or need new item
                if (product.currentStock === 0) {
                    Alert.alert('Out of Stock', 'This product is out of stock');
                    return;
                }

                // Calculate total quantity for this product in cart
                const totalQuantityInCart = existingItems.reduce((sum, item) => sum + item.quantity, 0);
                
                // Check if adding 1 more would exceed stock
                if (totalQuantityInCart + 1 > product.currentStock) {
                    Alert.alert('Insufficient Stock', `Only ${product.currentStock} units available. Already have ${totalQuantityInCart} in cart.`);
                    return;
                }

                let allBatches = undefined;
                try {
                    const batchResponse = await apiService.getBatchesByProduct(product._id);
                    if (batchResponse.success && batchResponse.data?.batches?.length > 0) {
                        const batches = batchResponse.data.batches;
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);

                        const validBatches = batches.filter((batch: any) => {
                            if (!batch.currentQuantity || batch.currentQuantity <= 0) return false;
                            if (!batch.expiryDate) return true;
                            const expiryDate = new Date(batch.expiryDate);
                            expiryDate.setHours(0, 0, 0, 0);
                            return expiryDate >= today;
                        });

                        if (validBatches.length === 0) {
                            Alert.alert('Expired Stock', `All batches for "${product.name}" have expired`);
                            return;
                        }

                        allBatches = validBatches;

                        // Find next available batch
                        const nextBatch = findNextAvailableBatch(product._id, validBatches, cart);

                        if (!nextBatch) {
                            Alert.alert('Insufficient Stock', `Insufficient stock for "${product.name}"`);
                            return;
                        }

                        // Check if we can add to an existing item with the same batch
                        const existingItemWithBatch = existingItems.find(
                            item => item.assignedBatch?.batchNumber === nextBatch.batchNumber
                        );

                        if (existingItemWithBatch) {
                            // Same batch - increase quantity of existing item
                            const availableQuantity = nextBatch.currentQuantity || nextBatch.availableQuantity || 0;
                            const newQuantity = existingItemWithBatch.quantity + 1;
                            
                            if (newQuantity > availableQuantity) {
                                // Current batch exhausted, need new item with next batch
                                // This will be handled below by creating new item
                            } else {
                                // Can add to existing item
                                const updatedCart = cart.map(item => {
                                    if (item === existingItemWithBatch) {
                                        return {
                                            ...item,
                                            quantity: newQuantity,
                                            totalPrice: parseFloat((newQuantity * item.unitPrice).toFixed(2))
                                        };
                                    }
                                    return item;
                                });
                                setCart(updatedCart);
                                return;
                            }
                        }

                        // Need to create new cart item with next batch (different price or exhausted batch)
                        const batchInfo = {
                            batchNumber: nextBatch.batchNumber,
                            availableQuantity: nextBatch.currentQuantity || nextBatch.availableQuantity
                        };

                        const newItem: CartItem = {
                            product,
                            quantity: 1,
                            unitPrice: parseFloat(nextBatch.sellingPrice.toFixed(2)),
                            costPrice: parseFloat(nextBatch.costPrice.toFixed(2)),
                            totalPrice: parseFloat(nextBatch.sellingPrice.toFixed(2)),
                            batchInfo,
                            assignedBatch: nextBatch,
                            allBatches,
                        };
                        setCart([newItem, ...cart]);
                        return;
                    }
                } catch (error) {
                    console.log('Could not fetch batch info:', error);
                }

                // Fallback: no batch info, just increase quantity of first existing item
                const firstItem = existingItems[0];
                const updatedCart = cart.map(item => {
                    if (item === firstItem) {
                        const newQuantity = item.quantity + 1;
                        return {
                            ...item,
                            quantity: newQuantity,
                            totalPrice: parseFloat((newQuantity * item.unitPrice).toFixed(2))
                        };
                    }
                    return item;
                });
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
                let allBatches = undefined;

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

                        // Store all batches for finding next available batch
                        allBatches = validBatches;

                        // Use the oldest batch (FIFO - first in first out)
                        const oldestBatch = validBatches[0];
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
                                                        assignedBatch: allBatches ? allBatches[0] : undefined,
                                                        allBatches,
                                                    };
                                                    setCart([newItem, ...cart]);
                                                    // Keep modal open and refocus
                                                    setTimeout(() => {
                                                        if (productSearchRef.current) {
                                                            productSearchRef.current.focus();
                                                        }
                                                    }, 100);
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
                            assignedBatch: allBatches ? allBatches[0] : undefined,
                            allBatches,
                        };
                        setCart([newItem, ...cart]);
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
                    assignedBatch: allBatches ? allBatches[0] : undefined,
                    allBatches,
                };
                setCart([newItem, ...cart]);
            }

            // Keep search modal open and refocus
            setTimeout(() => {
                if (productSearchRef.current) {
                    productSearchRef.current.focus();
                }
            }, 100);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to add product to cart');
        }
    };

    // Update quantity
    const updateQuantity = (productId: string, delta: number) => {
        const itemToUpdate = cart.find(item => item.product._id === productId);
        if (!itemToUpdate) return;

        const newQuantity = itemToUpdate.quantity + delta;
        
        if (newQuantity <= 0) {
            // Remove item if quantity becomes 0
            setCart(cart.filter(item => item !== itemToUpdate));
            return;
        }

        // Calculate total quantity for this product across all cart items
        const allItemsForProduct = cart.filter(item => item.product._id === productId);
        const currentTotalQuantity = allItemsForProduct.reduce((sum, item) => sum + item.quantity, 0);
        const newTotalQuantity = currentTotalQuantity - itemToUpdate.quantity + newQuantity;

        // Check if new total quantity exceeds product stock
        if (newTotalQuantity > itemToUpdate.product.currentStock) {
            Alert.alert('Insufficient Stock', `Only ${itemToUpdate.product.currentStock} units available. Already have ${currentTotalQuantity - itemToUpdate.quantity} in cart.`);
            return;
        }

        // Check if assigned batch has enough quantity
        if (itemToUpdate.assignedBatch) {
            const availableInBatch = itemToUpdate.assignedBatch.currentQuantity || 
                                     itemToUpdate.assignedBatch.availableQuantity || 0;
            
            if (newQuantity > availableInBatch) {
                // Batch exhausted, need to create new item with next batch
                if (itemToUpdate.allBatches && itemToUpdate.allBatches.length > 0) {
                    const nextBatch = findNextAvailableBatch(productId, itemToUpdate.allBatches, cart);
                    
                    if (nextBatch && nextBatch.batchNumber !== itemToUpdate.assignedBatch.batchNumber) {
                        // Different batch available - keep current item at max batch quantity, add new item
                        const maxQuantityForCurrentBatch = availableInBatch;
                        const remainingQuantity = newQuantity - maxQuantityForCurrentBatch;
                        
                        // Check if remaining quantity doesn't exceed stock
                        const remainingTotal = currentTotalQuantity - itemToUpdate.quantity + maxQuantityForCurrentBatch + remainingQuantity;
                        if (remainingTotal > itemToUpdate.product.currentStock) {
                            Alert.alert('Insufficient Stock', `Only ${itemToUpdate.product.currentStock} units available.`);
                            return;
                        }
                        
                        const updatedCart = cart.map(item => {
                            if (item === itemToUpdate) {
                                return {
                                    ...item,
                                    quantity: maxQuantityForCurrentBatch,
                                    totalPrice: parseFloat((maxQuantityForCurrentBatch * item.unitPrice).toFixed(2))
                                };
                            }
                            return item;
                        });

                        // Add remaining quantity as new item with next batch
                        const newItem: CartItem = {
                            product: itemToUpdate.product,
                            quantity: remainingQuantity,
                            unitPrice: parseFloat(nextBatch.sellingPrice.toFixed(2)),
                            costPrice: parseFloat(nextBatch.costPrice.toFixed(2)),
                            totalPrice: parseFloat((remainingQuantity * nextBatch.sellingPrice).toFixed(2)),
                            batchInfo: {
                                batchNumber: nextBatch.batchNumber,
                                availableQuantity: nextBatch.currentQuantity || nextBatch.availableQuantity
                            },
                            assignedBatch: nextBatch,
                            allBatches: itemToUpdate.allBatches,
                        };
                        setCart([newItem, ...updatedCart]);
                        return;
                    }
                }
            }
        }

        // Normal case: just update quantity (same batch, same price)
        const updatedCart = cart.map(item => {
            if (item === itemToUpdate) {
                return {
                    ...item,
                    quantity: newQuantity,
                    totalPrice: parseFloat((newQuantity * item.unitPrice).toFixed(2)),
                };
            }
            return item;
        });
        setCart(updatedCart);
    };

    // Toggle price editing
    const togglePriceEdit = (productId: string) => {
        const updatedCart = cart.map(item => {
            if (item.product._id === productId) {
                const isStartingEdit = !item.isEditingPrice;
                return {
                    ...item,
                    isEditingPrice: !item.isEditingPrice,
                };
            }
            return item;
        });
        setCart(updatedCart);
        
        // Initialize editing value when starting to edit
        const item = cart.find(i => i.product._id === productId);
        if (item && !item.isEditingPrice) {
            setEditingPriceValues(prev => ({
                ...prev,
                [productId]: item.unitPrice.toString()
            }));
        }
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
        
        // Clear editing price value
        setEditingPriceValues(prev => {
            const newValues = { ...prev };
            delete newValues[productId];
            return newValues;
        });
        
        // Refocus search after price update
        if (showProductSearch && productSearchRef.current) {
            setTimeout(() => {
                productSearchRef.current?.focus();
            }, 150);
        }
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

            // Prepare complete receipt data as shown to customer
            const receiptData = {
                billNumber: referenceNumber,
                date: new Date().toLocaleString(),
                items: cart.map(item => ({
                    product: {
                        _id: item.product._id,
                        name: item.product.name,
                        sku: item.product.sku,
                        category: item.product.category,
                        mrp: item.product.mrp
                    },
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    totalPrice: item.totalPrice,
                    costPrice: item.costPrice || 0
                })),
                subtotal,
                tax,
                total,
                paymentMethod: PAYMENT_METHODS.find(pm => pm.id === selectedPaymentMethod)?.name,
                amountReceived: selectedPaymentMethod === 'cash' ? parseFloat(amountReceived) : total,
                change: selectedPaymentMethod === 'cash' ? parseFloat(amountReceived) - total : 0,
                cashier: user?.name,
                customerPhone: customerPhone || null,
                customerName: customerName || customerInfo?.name || null,
                customerEmail: customerInfo?.email || null,
            };

            const response = await apiService.processSale({
                saleItems,
                referenceNumber,
                receiptData, // Send complete receipt data to be stored
            });

            if (response.success) {
                // Use the receipt data we prepared
                const receipt = receiptData;

                setReceiptData(receipt);
                setShowPaymentModal(false);
                setShowReceiptModal(true);

                // Clear cart after successful payment
                setTimeout(() => {
                    setCart([]);
                    setAmountReceived('');
                    setCustomerPhone('');
                    setCustomerName('');
                    setCustomerInfo(null);
                    setSelectedPaymentMethod('upi');
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
                                        value={editingPriceValues[item.product._id] || item.unitPrice.toString()}
                                        onChangeText={(text) => {
                                            setEditingPriceValues(prev => ({
                                                ...prev,
                                                [item.product._id]: text
                                            }));
                                        }}
                                        keyboardType="decimal-pad"
                                        autoFocus
                                        selectTextOnFocus
                                        onSubmitEditing={(e) => {
                                            updateSellingPrice(item.product._id, e.nativeEvent.text);
                                            // Refocus search will happen in updateSellingPrice
                                        }}
                                        onBlur={() => {
                                            // Save price on blur (treat as final enter)
                                            const newPrice = editingPriceValues[item.product._id] || item.unitPrice.toString();
                                            updateSellingPrice(item.product._id, newPrice);
                                            // Refocus search will happen in updateSellingPrice
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
                            ref={productSearchRef}
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

                            {/* Customer Phone Number - Optional */}
                            <View style={styles.customerPhoneSection}>
                                <Text style={[styles.customerPhoneLabel, { color: theme.colors.text }]}>
                                    CUSTOMER PHONE (OPTIONAL)
                                </Text>
                                <View style={{ position: 'relative' }}>
                                    <TextInput
                                        ref={customerPhoneRef}
                                        style={[styles.customerPhoneInput, {
                                            backgroundColor: theme.colors.gray[50],
                                            color: theme.colors.text,
                                            borderColor: theme.colors.gray[300],
                                            paddingRight: isLoadingCustomer ? 50 : 16
                                        }]}
                                        placeholder="Enter phone number..."
                                        placeholderTextColor={theme.colors.textSecondary}
                                        keyboardType="phone-pad"
                                        value={customerPhone}
                                        onChangeText={(text) => {
                                            // Limit to 10 digits (allow spaces/dashes for formatting, but limit actual digits)
                                            const digitsOnly = text.replace(/\D/g, '');
                                            // Allow up to 10 digits
                                            if (digitsOnly.length <= 10) {
                                                setCustomerPhone(text);
                                            }
                                        }}
                                        maxLength={14} // Allow for formatting like +91 98765 43210
                                        accessibilityLabel="Enter customer phone number"
                                    />
                                    {isLoadingCustomer && (
                                        <View style={{
                                            position: 'absolute',
                                            right: 12,
                                            top: 0,
                                            bottom: 0,
                                            justifyContent: 'center',
                                            alignItems: 'center'
                                        }}>
                                            <LoadingSpinner size="sm" color={theme.colors.primary[500]} />
                                        </View>
                                    )}
                                </View>
                                {customerInfo && (
                                    <View style={[styles.customerInfoDisplay, { backgroundColor: theme.colors.success[50] }]}>
                                        <Text style={[styles.customerInfoText, { color: theme.colors.success[700] }]}>
                                            {customerInfo.customerNumber} - {customerInfo.name}
                                        </Text>
                                        {customerInfo.phone && (
                                            <Text style={[styles.customerInfoPhone, { color: theme.colors.success[600] }]}>
                                                {customerInfo.phone}
                                            </Text>
                                        )}
                                    </View>
                                )}
                                {(() => {
                                    // Check if phone is valid (10 digits)
                                    const normalizedPhone = customerPhone ? customerPhone.replace(/[\s\-\(\)]/g, '') : '';
                                    let cleanedPhone = normalizedPhone;
                                    if (normalizedPhone.startsWith('+91')) {
                                        cleanedPhone = normalizedPhone.substring(3);
                                    } else if (normalizedPhone.startsWith('91') && normalizedPhone.length === 12) {
                                        cleanedPhone = normalizedPhone.substring(2);
                                    }
                                    const isValidPhone = cleanedPhone && cleanedPhone.length === 10 && /^[6-9]\d{9}$/.test(cleanedPhone);
                                    return isValidPhone && !customerInfo && isLoadingCustomer;
                                })() && (
                                    <View style={[styles.customerInfoDisplay, { backgroundColor: theme.colors.primary[50] }]}>
                                        <Text style={[styles.customerInfoText, { color: theme.colors.primary[600] }]}>
                                            Looking up customer...
                                        </Text>
                                    </View>
                                )}
                                {(customerInfo || customerPhone) && (
                                    <TextInput
                                        style={[styles.customerNameInput, {
                                            backgroundColor: theme.colors.gray[50],
                                            color: theme.colors.text,
                                            borderColor: theme.colors.gray[300]
                                        }]}
                                        placeholder="Customer name (optional)"
                                        placeholderTextColor={theme.colors.textSecondary}
                                        value={customerName}
                                        onChangeText={setCustomerName}
                                        accessibilityLabel="Enter customer name"
                                    />
                                )}
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
                                            onPress={() => {
                                                setSelectedPaymentMethod(method.id);
                                                // Focus amount input if cash is selected
                                                if (method.id === 'cash' && showPaymentModal) {
                                                    setTimeout(() => {
                                                        amountReceivedRef.current?.focus();
                                                    }, 200);
                                                }
                                            }}
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
                                    <TouchableOpacity
                                        onPress={() => {
                                            amountReceivedRef.current?.focus();
                                        }}
                                        activeOpacity={1}
                                    >
                                        <Text style={[styles.cashInputLabel, { color: theme.colors.text }]}>
                                            ENTER CASH RECEIVED
                                        </Text>
                                    </TouchableOpacity>
                                    <TextInput
                                        ref={amountReceivedRef}
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
                                        onFocus={() => {
                                            // Input is focused, ensure it stays focused
                                        }}
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
    customerPhoneSection: {
        marginBottom: 32,
    },
    customerPhoneLabel: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    customerPhoneInput: {
        height: 56,
        borderRadius: 12,
        paddingHorizontal: 16,
        fontSize: 16,
        borderWidth: 2,
        marginBottom: 12,
    },
    customerNameInput: {
        height: 56,
        borderRadius: 12,
        paddingHorizontal: 16,
        fontSize: 16,
        borderWidth: 2,
        marginTop: 12,
    },
    customerInfoDisplay: {
        padding: 12,
        borderRadius: 12,
        marginTop: 8,
    },
    customerInfoText: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 4,
    },
    customerInfoPhone: {
        fontSize: 12,
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

