import React, { useState, useRef, useEffect } from 'react';
import { Minus, Plus, Trash2, Edit2, X, Banknote, Smartphone, Printer, CheckCircle, Receipt } from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import Loading from '../../components/common/Loading';
import ProductSearch from '../../components/common/ProductSearch';
import ThermalReceipt from '../../components/billing/ThermalReceipt';
import { batchesAPI, inventoryAPI } from '../../services/api';
import { formatCurrency } from '../../utils/helpers';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const PAYMENT_METHODS = [
    { id: 'cash', name: 'Cash', icon: <Banknote size={32} /> },
    { id: 'upi', name: 'UPI', icon: <Smartphone size={32} /> },
];

const BillingScreen = () => {
    const { user } = useAuth();
    const [cart, setCart] = useState([]);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('upi');
    const [amountReceived, setAmountReceived] = useState('');
    const [receiptData, setReceiptData] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showReceiptModal, setShowReceiptModal] = useState(false);
    const [isPaymentCompleted, setIsPaymentCompleted] = useState(false);
    const productSearchRef = useRef(null);
    const amountReceivedRef = useRef(null);
    const shouldRefocusRef = useRef(true);

    // Helper function to get the actual input element
    const getInputElement = () => {
        if (!productSearchRef.current) return null;
        
        // Try direct access (if ref is the input element)
        if (productSearchRef.current.tagName === 'INPUT') {
            return productSearchRef.current;
        }
        
        // Try to find input within the ref (if ref is a container)
        const input = productSearchRef.current.querySelector?.('input') || 
                     productSearchRef.current.inputRef?.current ||
                     productSearchRef.current;
        
        return input && input.tagName === 'INPUT' ? input : null;
    };

    // Helper function to refocus the search input
    const refocusSearch = () => {
        if (isPaymentCompleted || !shouldRefocusRef.current) return;
        
        const inputElement = getInputElement();
        if (inputElement && typeof inputElement.focus === 'function') {
            // Use requestAnimationFrame for smoother focus
            requestAnimationFrame(() => {
                inputElement.focus();
            });
        }
    };

    // Keep search bar focused at all times
    useEffect(() => {
        if (isPaymentCompleted) return;

        // Initial focus
        setTimeout(refocusSearch, 200);

        // Refocus on any click outside search results and modals
        const handleClick = (e) => {
            // Don't refocus if clicking on search results dropdown
            if (e.target.closest('.absolute.top-full')) {
                return;
            }
            // Don't refocus if clicking on modals
            if (e.target.closest('[role="dialog"]') || e.target.closest('.modal')) {
                return;
            }
            // Don't refocus if clicking on amount received input or its container
            const amountInputElement = amountReceivedRef.current?.querySelector?.('input') || 
                                      amountReceivedRef.current?.inputRef?.current ||
                                      amountReceivedRef.current;
            if (e.target === amountInputElement || e.target.closest('[data-amount-input-container]')) {
                // Focus the amount input when clicking on it or its container
                if (amountInputElement && typeof amountInputElement.focus === 'function') {
                    setTimeout(() => {
                        amountInputElement.focus();
                    }, 50);
                }
                return;
            }
            // Don't refocus if clicking on price edit input or its container
            if (e.target.closest('[data-price-edit-container]') || 
                (e.target.tagName === 'INPUT' && e.target.closest('[data-price-edit-container]'))) {
                // Focus the price input when clicking on it or its container
                const priceInput = e.target.tagName === 'INPUT' ? e.target : 
                                  e.target.closest('[data-price-edit-container]')?.querySelector('input');
                if (priceInput && typeof priceInput.focus === 'function') {
                    setTimeout(() => {
                        priceInput.focus();
                        priceInput.select(); // Select all text for easy editing
                    }, 50);
                }
                return;
            }
            // Don't refocus if clicking on input fields (like price edit)
            if (e.target.tagName === 'INPUT') {
                const inputElement = getInputElement();
                if (e.target !== inputElement) {
                    return; // Don't refocus if clicking on other inputs
                }
            }
            // Refocus after a short delay to allow the click to complete
            setTimeout(refocusSearch, 100);
        };

        // Refocus when search loses focus
        const handleBlur = (e) => {
            const inputElement = getInputElement();
            // Only refocus if the blur is from our search input
            if (e.target === inputElement && shouldRefocusRef.current) {
                setTimeout(refocusSearch, 100);
            }
        };

        // Add event listeners
        document.addEventListener('click', handleClick, true);
        
        // Listen for blur on the input element
        const inputElement = getInputElement();
        if (inputElement) {
            inputElement.addEventListener('blur', handleBlur);
        }

        return () => {
            document.removeEventListener('click', handleClick, true);
            if (inputElement) {
                inputElement.removeEventListener('blur', handleBlur);
            }
        };
    }, [isPaymentCompleted]); // Re-run when payment status changes

    // Refocus after cart changes (new items added, quantity updated)
    useEffect(() => {
        if (!isPaymentCompleted) {
            setTimeout(refocusSearch, 150);
        }
    }, [cart, isPaymentCompleted]); // Refocus whenever cart changes

    // Focus amount received input when cash payment method is selected
    useEffect(() => {
        if (selectedPaymentMethod === 'cash' && !isPaymentCompleted && amountReceivedRef.current) {
            const inputElement = amountReceivedRef.current.querySelector?.('input') || 
                               amountReceivedRef.current.inputRef?.current ||
                               amountReceivedRef.current;
            if (inputElement && typeof inputElement.focus === 'function') {
                setTimeout(() => {
                    inputElement.focus();
                }, 100);
            }
        }
    }, [selectedPaymentMethod, isPaymentCompleted]);

    /**
     * Generate unique identifier for a cart item
     * Uses productId + batchNumber to uniquely identify each cart item
     */
    const getCartItemId = (item) => {
        const batchNumber = item.batchInfo?.batchNumber || item.assignedBatch?.batchNumber;
        return batchNumber ? `${item.product._id}_${batchNumber}` : item.product._id;
    };

    /**
     * Find next available batch for a product
     * Checks existing cart items to see which batches are already used and finds the next available one
     */
    const findNextAvailableBatch = (productId, allBatches, existingCartItems) => {
        // Get all batches already assigned in cart for this product
        const usedBatchNumbers = existingCartItems
            .filter(item => item.product._id === productId && item.assignedBatch)
            .map(item => item.assignedBatch.batchNumber);

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

    const addToCart = async (product) => {
        try {
            // Check if product already exists in cart
            const existingItems = cart.filter(item => item.product._id === product._id);

            if (existingItems.length > 0) {
                // Product already in cart - check if we can add to existing item or need new item
                if (product.currentStock === 0) {
                    toast.error('This product is out of stock');
                    return;
                }

                let allBatches = undefined;
                try {
                    const batchResponse = await batchesAPI.getByProduct(product._id);
                    if (batchResponse.success && batchResponse.data?.batches?.length > 0) {
                        const batches = batchResponse.data.batches;
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);

                        const validBatches = batches.filter((batch) => {
                            if (!batch.currentQuantity || batch.currentQuantity <= 0) return false;
                            if (!batch.expiryDate) return true;
                            const expiryDate = new Date(batch.expiryDate);
                            expiryDate.setHours(0, 0, 0, 0);
                            return expiryDate >= today;
                        });

                        if (validBatches.length === 0) {
                            toast.error(`All batches for "${product.name}" have expired`);
                            return;
                        }

                        allBatches = validBatches;

                        // Find next available batch
                        const nextBatch = findNextAvailableBatch(product._id, validBatches, cart);

                        if (!nextBatch) {
                            toast.error(`Insufficient stock for "${product.name}"`);
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
                            
                            // Calculate total quantity for this product in cart
                            const totalQuantityInCart = existingItems.reduce((sum, item) => sum + item.quantity, 0);
                            
                            // Check if adding 1 more would exceed stock
                            if (totalQuantityInCart + 1 > product.currentStock) {
                                toast.error(`Only ${product.currentStock} units available. Already have ${totalQuantityInCart} in cart.`);
                                return;
                            }
                            
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
                        // Calculate total quantity for this product in cart
                        const totalQuantityInCart = existingItems.reduce((sum, item) => sum + item.quantity, 0);
                        
                        // Check if adding 1 more would exceed stock
                        if (totalQuantityInCart + 1 > product.currentStock) {
                            toast.error(`Only ${product.currentStock} units available. Already have ${totalQuantityInCart} in cart.`);
                            return;
                        }

                        const batchInfo = {
                            batchNumber: nextBatch.batchNumber,
                            availableQuantity: nextBatch.currentQuantity || nextBatch.availableQuantity
                        };

                        const newItem = {
                            product,
                            quantity: 1,
                            unitPrice: parseFloat(nextBatch.sellingPrice.toFixed(2)),
                            costPrice: parseFloat(nextBatch.costPrice.toFixed(2)),
                            totalPrice: parseFloat(nextBatch.sellingPrice.toFixed(2)),
                            batchInfo,
                            assignedBatch: nextBatch, // Store the assigned batch
                            allBatches,
                            isEditingPrice: false,
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
                        if (newQuantity > product.currentStock) {
                            toast.error(`Only ${product.currentStock} units available`);
                            return item;
                        }
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
                if (product.currentStock === 0) {
                    toast.error('This product is out of stock');
                    return;
                }

                let unitPrice = product.sellingPrice;
                let costPrice = product.costPrice || 0;
                let batchInfo = undefined;
                let allBatches = undefined;

                try {
                    const batchResponse = await batchesAPI.getByProduct(product._id);

                    if (batchResponse.success && batchResponse.data?.batches?.length > 0) {
                        const batches = batchResponse.data.batches;
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);

                        const validBatches = batches.filter((batch) => {
                            if (!batch.currentQuantity || batch.currentQuantity <= 0) return false;
                            if (!batch.expiryDate) return true;
                            const expiryDate = new Date(batch.expiryDate);
                            expiryDate.setHours(0, 0, 0, 0);
                            return expiryDate >= today;
                        });

                        if (validBatches.length === 0) {
                            toast.error(`All batches for "${product.name}" have expired`);
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

                        // Check expiry warning for oldest batch
                        if (oldestBatch.expiryDate) {
                            const expiryDate = new Date(oldestBatch.expiryDate);
                            const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

                            if (daysUntilExpiry <= 3 && daysUntilExpiry > 0) {
                                const proceed = window.confirm(
                                    `Warning: The batch for "${product.name}" will expire in ${daysUntilExpiry} day(s).\n\nExpiry Date: ${expiryDate.toLocaleDateString()}\nBatch: ${batchInfo.batchNumber}\n\nAdd to cart anyway?`
                                );
                                if (!proceed) return;
                            }
                        }
                    }
                } catch (error) {
                    console.log('Could not fetch batch info, using product prices:', error);
                }

                const newItem = {
                    product,
                    quantity: 1,
                    unitPrice: parseFloat(unitPrice.toFixed(2)),
                    costPrice: parseFloat(costPrice.toFixed(2)),
                    totalPrice: parseFloat(unitPrice.toFixed(2)),
                    batchInfo,
                    assignedBatch: allBatches ? allBatches[0] : undefined, // Store the assigned batch for this cart item
                    allBatches,
                    isEditingPrice: false,
                };
                setCart([newItem, ...cart]);
            }
        } catch (error) {
            toast.error(error.message || 'Failed to add product to cart');
        }
    };

    const updateQuantity = async (itemIdentifier, delta) => {
        // itemIdentifier can be productId (legacy) or unique item ID (productId_batchNumber)
        let itemToUpdate;
        if (typeof itemIdentifier === 'string' && itemIdentifier.includes('_')) {
            // It's a unique ID (productId_batchNumber)
            // Split from the right to handle cases where batchNumber might contain underscores
            const lastUnderscoreIndex = itemIdentifier.lastIndexOf('_');
            const productId = itemIdentifier.substring(0, lastUnderscoreIndex);
            const batchNumber = itemIdentifier.substring(lastUnderscoreIndex + 1);
            
            itemToUpdate = cart.find(item => 
                item.product._id === productId && 
                (item.batchInfo?.batchNumber === batchNumber || item.assignedBatch?.batchNumber === batchNumber)
            );
        } else {
            // Legacy: just productId - find first match
            itemToUpdate = cart.find(item => item.product._id === itemIdentifier);
        }
        
        if (!itemToUpdate) return;

        const newQuantity = itemToUpdate.quantity + delta;
        
        if (newQuantity <= 0) {
            // Remove item if quantity becomes 0
            setCart(cart.filter(item => item !== itemToUpdate));
            return;
        }

        const productId = itemToUpdate.product._id;
        
        // Calculate total quantity for this product across all cart items
        const allItemsForProduct = cart.filter(item => item.product._id === productId);
        const currentTotalQuantity = allItemsForProduct.reduce((sum, item) => sum + item.quantity, 0);
        const newTotalQuantity = currentTotalQuantity - itemToUpdate.quantity + newQuantity;

        // Check if new total quantity exceeds product stock
        if (newTotalQuantity > itemToUpdate.product.currentStock) {
            toast.error(`Only ${itemToUpdate.product.currentStock} units available. Already have ${currentTotalQuantity - itemToUpdate.quantity} in cart.`);
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
                    
                    // Check if there's no next batch available or we've exhausted all batches
                    if (!nextBatch || nextBatch.batchNumber === itemToUpdate.assignedBatch.batchNumber) {
                        // No more batches available - show error with total stock
                        toast.error(`Only ${itemToUpdate.product.currentStock} units available in total. Already have ${currentTotalQuantity - itemToUpdate.quantity} in cart.`);
                        return;
                    }
                    
                    if (nextBatch.batchNumber !== itemToUpdate.assignedBatch.batchNumber) {
                        // Different batch available - keep current item at max batch quantity, add to next batch item
                        const maxQuantityForCurrentBatch = availableInBatch;
                        const remainingQuantity = newQuantity - maxQuantityForCurrentBatch;
                        
                        // Check if remaining quantity doesn't exceed stock
                        const remainingTotal = currentTotalQuantity - itemToUpdate.quantity + maxQuantityForCurrentBatch + remainingQuantity;
                        if (remainingTotal > itemToUpdate.product.currentStock) {
                            toast.error(`Only ${itemToUpdate.product.currentStock} units available in total. Already have ${currentTotalQuantity - itemToUpdate.quantity} in cart.`);
                            return;
                        }
                        
                        // Check if there's already an existing cart item with the next batch
                        const existingNextBatchItem = cart.find(item => 
                            item.product._id === productId && 
                            (item.batchInfo?.batchNumber === nextBatch.batchNumber || 
                             item.assignedBatch?.batchNumber === nextBatch.batchNumber)
                        );
                        
                        if (existingNextBatchItem) {
                            // Add to existing item with next batch instead of creating new one
                            const newNextBatchQuantity = existingNextBatchItem.quantity + remainingQuantity;
                            
                            // Just add to existing next batch item
                            const updatedCart = cart.map(item => {
                                if (item === itemToUpdate) {
                                    return {
                                        ...item,
                                        quantity: maxQuantityForCurrentBatch,
                                        totalPrice: parseFloat((maxQuantityForCurrentBatch * item.unitPrice).toFixed(2))
                                    };
                                } else if (item === existingNextBatchItem) {
                                    return {
                                        ...item,
                                        quantity: newNextBatchQuantity,
                                        totalPrice: parseFloat((newNextBatchQuantity * item.unitPrice).toFixed(2))
                                    };
                                }
                                return item;
                            });
                            setCart(updatedCart);
                        } else {
                            // No existing item with next batch, create new item
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
                            const newItem = {
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
                                isEditingPrice: false,
                            };
                            setCart([newItem, ...updatedCart]);
                        }
                        return;
                    }
                } else {
                    // No batches available - show error with total stock
                    toast.error(`Only ${itemToUpdate.product.currentStock} units available in total. Batch exhausted and no more batches available.`);
                    return;
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

    const togglePriceEdit = (itemIdentifier) => {
        // itemIdentifier can be either:
        // - A unique key string (productId_batchNumber or productId_index)
        // - An object reference
        const updatedCart = cart.map((item, index) => {
            // If it's a string identifier (productId_batchNumber)
            if (typeof itemIdentifier === 'string' && itemIdentifier.includes('_')) {
                // Split from the right to handle cases where batchNumber might contain underscores
                const lastUnderscoreIndex = itemIdentifier.lastIndexOf('_');
                const productId = itemIdentifier.substring(0, lastUnderscoreIndex);
                const batchNumber = itemIdentifier.substring(lastUnderscoreIndex + 1);
                
                if (item.product._id === productId && 
                    (item.batchInfo?.batchNumber === batchNumber || 
                     item.assignedBatch?.batchNumber === batchNumber)) {
                    return { ...item, isEditingPrice: !item.isEditingPrice };
                }
            } 
            // If it's just productId (legacy support), find first match
            else if (typeof itemIdentifier === 'string') {
                if (item.product._id === itemIdentifier) {
                    return { ...item, isEditingPrice: !item.isEditingPrice };
                }
            }
            // If it's the item object itself
            else if (item === itemIdentifier) {
                return { ...item, isEditingPrice: !item.isEditingPrice };
            }
            return item;
        });
        setCart(updatedCart);
    };

    const updateSellingPrice = (itemIdentifier, newPrice) => {
        const price = parseFloat(newPrice);
        if (isNaN(price) || price < 0) return;

        const updatedCart = cart.map((item, index) => {
            let shouldUpdate = false;
            
            // If it's a string identifier (productId_batchNumber)
            if (typeof itemIdentifier === 'string' && itemIdentifier.includes('_')) {
                // Split from the right to handle cases where batchNumber might contain underscores
                const lastUnderscoreIndex = itemIdentifier.lastIndexOf('_');
                const productId = itemIdentifier.substring(0, lastUnderscoreIndex);
                const batchNumber = itemIdentifier.substring(lastUnderscoreIndex + 1);
                
                if (item.product._id === productId && 
                    (item.batchInfo?.batchNumber === batchNumber || 
                     item.assignedBatch?.batchNumber === batchNumber)) {
                    shouldUpdate = true;
                }
            } 
            // If it's just productId (legacy support), find first match
            else if (typeof itemIdentifier === 'string') {
                if (item.product._id === itemIdentifier) {
                    shouldUpdate = true;
                }
            }
            // If it's the item object itself
            else if (item === itemIdentifier) {
                shouldUpdate = true;
            }

            if (shouldUpdate) {
                if (item.costPrice > 0 && price < item.costPrice) {
                    toast.error(`Selling price cannot be less than cost price (${formatCurrency(item.costPrice)})`);
                    return item;
                }
                return {
                    ...item,
                    unitPrice: price,
                    totalPrice: parseFloat((item.quantity * price).toFixed(2)),
                    isEditingPrice: false,
                };
            }
            return item;
        });
        setCart(updatedCart);
    };

    const removeFromCart = (itemIdentifier) => {
        // itemIdentifier can be productId (legacy) or unique item ID (productId_batchNumber)
        if (typeof itemIdentifier === 'string' && itemIdentifier.includes('_')) {
            // It's a unique ID (productId_batchNumber)
            // Split from the right to handle cases where batchNumber might contain underscores
            const lastUnderscoreIndex = itemIdentifier.lastIndexOf('_');
            const productId = itemIdentifier.substring(0, lastUnderscoreIndex);
            const batchNumber = itemIdentifier.substring(lastUnderscoreIndex + 1);
            
            setCart(cart.filter(item => 
                !(item.product._id === productId && 
                  (item.batchInfo?.batchNumber === batchNumber || item.assignedBatch?.batchNumber === batchNumber))
            ));
        } else {
            // Legacy: just productId - remove first match
            setCart(cart.filter(item => item.product._id !== itemIdentifier));
        }
    };

    const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
    const tax = subtotal * 0;
    const total = subtotal + tax;
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

    const handlePayment = async () => {
        if (selectedPaymentMethod === 'cash') {
            const received = parseFloat(amountReceived);
            if (isNaN(received) || received < total) {
                toast.error(`Amount received must be at least ${formatCurrency(total)}`);
                return;
            }
        }

        setIsProcessing(true);
        try {
            const saleItems = cart.map(item => ({
                productId: item.product._id,
                quantity: item.quantity,
                notes: `Sold at ${formatCurrency(item.unitPrice)}`,
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
                subtotal: subtotal,
                tax: tax,
                total: total,
                paymentMethod: PAYMENT_METHODS.find(pm => pm.id === selectedPaymentMethod)?.name || 'Cash',
                amountReceived: selectedPaymentMethod === 'cash' ? parseFloat(amountReceived) : total,
                change: selectedPaymentMethod === 'cash' ? parseFloat(amountReceived) - total : 0,
                cashier: user?.name,
            };

            const response = await inventoryAPI.processSale({
                saleItems,
                referenceNumber,
                receiptData, // Send complete receipt data to be stored
            });

            if (response.success) {
                setReceiptData(receiptData);
                setIsPaymentCompleted(true); // Mark payment as completed
                toast.success('Payment processed successfully');

                // Don't clear immediately - let user see receipt and print
            }
        } catch (error) {
            toast.error(error.message || 'Failed to process payment');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Simple Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg">
                <div className="max-w-7xl mx-auto px-6 py-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-bold mb-1">BILLING / POS</h1>
                            {cart.length > 0 && (
                                <p className="text-blue-100 text-sm">
                                    {totalItems} {totalItems === 1 ? 'item' : 'items'} in cart
                                </p>
                            )}
                        </div>
                        {cart.length > 0 && !isPaymentCompleted && (
                            <button
                                onClick={() => {
                                    if (window.confirm('Clear all items from cart?')) {
                                        setCart([]);
                                        setAmountReceived('');
                                        setSelectedPaymentMethod('upi');
                                        setReceiptData(null);
                                        setShowReceiptModal(false);
                                        // Focus the product search input
                                        setTimeout(() => {
                                            if (productSearchRef.current) {
                                                productSearchRef.current.focus();
                                            }
                                        }, 100);
                                    }
                                }}
                                className="px-4 py-1.5 bg-red-500 hover:bg-red-600 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
                            >
                                <Trash2 size={16} />
                                Clear Cart
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-4">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Panel - Search & Cart */}
                    <div className={`lg:col-span-2 space-y-4 ${isPaymentCompleted ? 'opacity-50 pointer-events-none' : ''}`}>
                        {/* Product Search - ALWAYS VISIBLE, AUTO-FOCUSED */}
                        <Card className="p-4">
                            <ProductSearch
                                ref={productSearchRef}
                                placeholder="Scan barcode or type product name..."
                                onProductSelect={addToCart}
                                showStockInfo={true}
                                showPrice={true}
                                maxResults={20}
                                minSearchLength={1}
                                debounceMs={250}
                                autoFocus={!isPaymentCompleted}
                                disabled={isPaymentCompleted}
                            />
                            <p className="text-xs text-gray-500 mt-2 text-center">
                                {isPaymentCompleted ? 'Payment completed. Click "New Sale" to start a new transaction.' : 'Scan barcode or type to search • Press Enter to add'}
                            </p>
                        </Card>

                        {/* Cart Items */}
                        <div className="space-y-2">
                            {cart.length === 0 ? (
                                <Card className="p-12">
                                    <div className="flex flex-col items-center justify-center text-center">
                                        <p className="text-2xl font-bold text-gray-400 mb-2">Cart is Empty</p>
                                        <p className="text-gray-500">Scan or search products to start billing</p>
                                    </div>
                                </Card>
                            ) : (
                                cart.map((item) => (
                                    <Card key={item.product._id} noPadding className="overflow-hidden">
                                        <div className="flex items-center gap-2 px-3 py-1">
                                            {/* Product Name - Compact */}
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-base font-bold text-gray-900 truncate">{item.product.name}</h3>
                                                <p className="text-xs text-gray-500">#{item.product.sku}</p>
                                            </div>

                                            {/* Quantity Controls - Inline */}
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => !isPaymentCompleted && updateQuantity(getCartItemId(item), -1)}
                                                    disabled={isPaymentCompleted}
                                                    className={`w-8 h-8 bg-red-100 hover:bg-red-200 text-red-600 rounded flex items-center justify-center transition-colors ${isPaymentCompleted ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    aria-label="Decrease"
                                                >
                                                    <Minus size={16} />
                                                </button>
                                                <div className="bg-gray-50 px-3 py-1 rounded min-w-[40px] text-center">
                                                    <span className="text-base font-bold text-gray-900">{item.quantity}</span>
                                                </div>
                                                <button
                                                    onClick={() => !isPaymentCompleted && updateQuantity(getCartItemId(item), 1)}
                                                    disabled={isPaymentCompleted}
                                                    className={`w-8 h-8 bg-green-100 hover:bg-green-200 text-green-600 rounded flex items-center justify-center transition-colors ${isPaymentCompleted ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    aria-label="Increase"
                                                >
                                                    <Plus size={16} />
                                                </button>
                                            </div>

                                            {/* Price - Inline */}
                                            <div className="flex items-center gap-2 min-w-[100px]">
                                                {item.isEditingPrice ? (
                                                    <div className="flex items-center gap-1" data-price-edit-container>
                                                        <Input
                                                            type="number"
                                                            defaultValue={item.unitPrice}
                                                            onFocus={(e) => {
                                                                // Ensure focus is maintained and select text
                                                                shouldRefocusRef.current = false;
                                                                e.target.select();
                                                            }}
                                                            onBlur={(e) => {
                                                                updateSellingPrice(getCartItemId(item), e.target.value);
                                                                // Re-enable search refocus and focus immediately
                                                                shouldRefocusRef.current = true;
                                                                setTimeout(() => {
                                                                    refocusSearch();
                                                                }, 100);
                                                            }}
                                                            onKeyPress={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    updateSellingPrice(getCartItemId(item), e.target.value);
                                                                    // Re-enable search refocus and focus immediately
                                                                    shouldRefocusRef.current = true;
                                                                    setTimeout(() => {
                                                                        refocusSearch();
                                                                    }, 100);
                                                                }
                                                            }}
                                                            className="w-20 text-sm font-bold text-center py-1"
                                                            autoFocus
                                                        />
                                                        <button
                                                            onClick={() => togglePriceEdit(getCartItemId(item))}
                                                            className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => !isPaymentCompleted && togglePriceEdit(getCartItemId(item))}
                                                        disabled={isPaymentCompleted}
                                                        className={`flex items-center gap-1 px-2 py-1 hover:bg-blue-50 rounded transition-colors ${isPaymentCompleted ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    >
                                                        <span className="text-sm font-bold text-gray-900">
                                                            {formatCurrency(item.unitPrice)}
                                                        </span>
                                                        <Edit2 size={14} className="text-blue-600" />
                                                    </button>
                                                )}
                                            </div>

                                            {/* Item Total */}
                                            <div className="text-right min-w-[100px]">
                                                <span className="text-base font-bold text-blue-600">
                                                    {formatCurrency(item.totalPrice)}
                                                </span>
                                            </div>

                                            {/* Remove Button */}
                                            <button
                                                onClick={() => !isPaymentCompleted && removeFromCart(getCartItemId(item))}
                                                disabled={isPaymentCompleted}
                                                className={`p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded transition-colors flex-shrink-0 ${isPaymentCompleted ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                aria-label="Remove"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </Card>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Right Panel - Bill Summary & Payment */}
                    <div className="lg:col-span-1">
                        <Card className="sticky top-6 p-4">
                            <h2 className="text-lg font-bold text-gray-900 mb-3 uppercase">BILL SUMMARY</h2>

                            <div className="space-y-2 mb-4">
                                <div className="flex items-center justify-between text-base">
                                    <span className="text-gray-600">Items ({totalItems})</span>
                                    <span className="font-semibold">{formatCurrency(subtotal)}</span>
                                </div>
                                <div className="flex items-center justify-between text-base">
                                    <span className="text-gray-600">Tax (0%)</span>
                                    <span className="font-semibold">{formatCurrency(tax)}</span>
                                </div>
                                <div className="pt-2 border-t-2 border-gray-300 flex items-center justify-between">
                                    <span className="text-lg font-bold text-gray-900 uppercase">TOTAL</span>
                                    <span className="text-2xl font-bold text-blue-600">{formatCurrency(total)}</span>
                                </div>
                            </div>

                            {/* Payment Method Selection */}
                            {!isPaymentCompleted && (
                                <div className="mb-4">
                                    <label className="block text-xs font-bold text-gray-700 mb-2 uppercase">PAYMENT METHOD</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {PAYMENT_METHODS.map((method) => (
                                            <button
                                                key={method.id}
                                                onClick={() => {
                                                    setSelectedPaymentMethod(method.id);
                                                    if (method.id !== 'cash') {
                                                        setAmountReceived('');
                                                        // Refocus search when switching away from cash
                                                        setTimeout(refocusSearch, 100);
                                                    }
                                                }}
                                                className={`p-2 border-2 rounded-lg flex flex-col items-center gap-1 transition-all ${selectedPaymentMethod === method.id
                                                    ? 'border-blue-500 bg-blue-50 text-blue-600 shadow-md'
                                                    : 'border-gray-300 hover:border-gray-400 bg-white'
                                                    }`}
                                            >
                                                <div className="text-blue-600 scale-90">{method.icon}</div>
                                                <span className="font-bold text-xs">{method.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Cash Amount Received - Only for Cash */}
                            {selectedPaymentMethod === 'cash' && !isPaymentCompleted && (
                                <div className="mb-4" data-amount-input-container>
                                    <label 
                                        className="block text-xs font-bold text-gray-700 mb-1.5 uppercase cursor-pointer"
                                        onClick={() => {
                                            const amountInputElement = amountReceivedRef.current?.querySelector?.('input') || 
                                                                      amountReceivedRef.current?.inputRef?.current ||
                                                                      amountReceivedRef.current;
                                            if (amountInputElement && typeof amountInputElement.focus === 'function') {
                                                amountInputElement.focus();
                                            }
                                        }}
                                    >
                                        AMOUNT RECEIVED
                                    </label>
                                    <Input
                                        ref={amountReceivedRef}
                                        type="number"
                                        placeholder="Enter amount..."
                                        value={amountReceived}
                                        onChange={(e) => setAmountReceived(e.target.value)}
                                        onFocus={(e) => {
                                            // Ensure focus is maintained
                                            shouldRefocusRef.current = false;
                                        }}
                                        onBlur={(e) => {
                                            // Re-enable search refocus after blur
                                            setTimeout(() => {
                                                shouldRefocusRef.current = true;
                                            }, 200);
                                        }}
                                        className="!mb-0 [&>div>input]:text-lg [&>div>input]:font-bold [&>div>input]:text-center [&>div>input]:py-2 [&>div>input]:border-2 [&>div>input]:border-blue-500 [&>div>input]:focus:border-blue-500 [&>div>input]:focus:ring-2 [&>div>input]:focus:ring-blue-500"
                                    />
                                    {amountReceived && !isNaN(parseFloat(amountReceived)) && (
                                        <div className="mt-2">
                                            {parseFloat(amountReceived) >= total ? (
                                                <div className="p-2 bg-green-50 rounded-lg text-center border-2 border-green-500">
                                                    <p className="text-xs font-bold text-green-700 mb-0.5 uppercase">CHANGE TO GIVE</p>
                                                    <p className="text-xl font-bold text-green-700">
                                                        {formatCurrency(parseFloat(amountReceived) - total)}
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="p-2 bg-red-50 rounded-lg text-center border-2 border-red-500">
                                                    <p className="text-xs font-bold text-red-700 mb-0.5 uppercase">INSUFFICIENT</p>
                                                    <p className="text-base font-bold text-red-700">
                                                        Need {formatCurrency(total - parseFloat(amountReceived))} more
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Complete Payment Button - Hide after successful payment */}
                            {!isPaymentCompleted && (
                                <button
                                    onClick={handlePayment}
                                    disabled={
                                        cart.length === 0 ||
                                        isProcessing ||
                                        (selectedPaymentMethod === 'cash' && (!amountReceived || parseFloat(amountReceived) < total))
                                    }
                                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-xl p-3 font-bold text-base transition-colors flex items-center justify-center gap-2 shadow-lg mb-2"
                                >
                                    {isProcessing ? (
                                        <>
                                            <Loading />
                                            <span>Processing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle size={20} />
                                            <span>COMPLETE PAYMENT</span>
                                        </>
                                    )}
                                </button>
                            )}

                            {/* Receipt Actions - Only show after payment */}
                            {receiptData && (
                                <>
                                    <div className="flex gap-2 mb-2">
                                        <button
                                            onClick={() => setShowReceiptModal(true)}
                                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl p-3 font-bold text-base transition-colors flex items-center justify-center gap-2 shadow-lg"
                                        >
                                            <Receipt size={20} />
                                            <span>PREVIEW RECEIPT</span>
                                        </button>
                                        <button
                                            onClick={() => {
                                                setTimeout(() => {
                                                    window.print();
                                                }, 100);
                                            }}
                                            className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-xl p-3 font-bold text-base transition-colors flex items-center justify-center gap-2 shadow-lg"
                                        >
                                            <Printer size={20} />
                                            <span>PRINT</span>
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setReceiptData(null);
                                            setCart([]);
                                            setAmountReceived('');
                                            setSelectedPaymentMethod('upi');
                                            setShowReceiptModal(false);
                                            setIsPaymentCompleted(false); // Re-enable for new sale
                                            // Focus the product search input
                                            setTimeout(() => {
                                                if (productSearchRef.current) {
                                                    productSearchRef.current.focus();
                                                }
                                            }, 100);
                                        }}
                                        className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl p-2 font-semibold text-sm transition-colors"
                                    >
                                        New Sale
                                    </button>
                                </>
                            )}
                        </Card>
                    </div>
                </div>
            </div>

            {/* Receipt Preview Modal */}
            <Modal
                isOpen={showReceiptModal}
                onClose={() => setShowReceiptModal(false)}
                title="Receipt Preview"
                size="lg"
            >
                <div className="flex justify-center">
                    <ThermalReceipt
                        receiptData={receiptData}
                        showControls={false}
                    />
                </div>
            </Modal>

            {/* Hidden Printable Receipt - Always in DOM for printing */}
            {receiptData && (
                <div
                    className="print-only"
                    style={{
                        position: 'absolute',
                        left: '-9999px',
                        top: 0,
                        width: '58mm',
                        zIndex: -1,
                        pointerEvents: 'none'
                    }}
                >
                    <ThermalReceipt
                        receiptData={receiptData}
                        showControls={false}
                    />
                </div>
            )}
        </div>
    );
};

export default BillingScreen;
