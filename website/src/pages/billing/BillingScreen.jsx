import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Search, Minus, Plus, Trash2, Edit2, Check, X, Scan, CreditCard, Banknote, Smartphone, Wallet, Printer, CheckCircle } from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import Loading from '../../components/common/Loading';
import ProductSearch from '../../components/common/ProductSearch';
import { productsAPI, batchesAPI, inventoryAPI } from '../../services/api';
import { formatCurrency } from '../../utils/helpers';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const PAYMENT_METHODS = [
    { id: 'cash', name: 'Cash', icon: <Banknote size={24} /> },
    { id: 'card', name: 'Card', icon: <CreditCard size={24} /> },
    { id: 'upi', name: 'UPI', icon: <Smartphone size={24} /> },
    { id: 'wallet', name: 'Wallet', icon: <Wallet size={24} /> },
];

const BillingScreen = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [cart, setCart] = useState([]);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showReceiptModal, setShowReceiptModal] = useState(false);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('cash');
    const [amountReceived, setAmountReceived] = useState('');
    const [receiptData, setReceiptData] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const addToCart = async (product) => {
        try {
            const existingItemIndex = cart.findIndex(item => item.product._id === product._id);

            if (existingItemIndex >= 0) {
                // Update quantity
                const updatedCart = [...cart];
                const newQuantity = updatedCart[existingItemIndex].quantity + 1;

                if (newQuantity > product.currentStock) {
                    toast.error(`Only ${product.currentStock} units available`);
                    return;
                }

                updatedCart[existingItemIndex].quantity = newQuantity;
                updatedCart[existingItemIndex].totalPrice = parseFloat((newQuantity * updatedCart[existingItemIndex].unitPrice).toFixed(2));
                setCart(updatedCart);
            } else {
                // Add new item
                if (product.currentStock === 0) {
                    toast.error('This product is out of stock');
                    return;
                }

                let unitPrice = product.sellingPrice;
                let costPrice = product.costPrice || 0;
                let batchInfo = undefined;

                try {
                    // Fetch batch information for FIFO pricing
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

                        const oldestBatch = validBatches[0];
                        unitPrice = parseFloat(oldestBatch.sellingPrice.toFixed(2));
                        costPrice = parseFloat(oldestBatch.costPrice.toFixed(2));
                        batchInfo = {
                            batchNumber: oldestBatch.batchNumber,
                            availableQuantity: oldestBatch.currentQuantity || oldestBatch.availableQuantity
                        };

                        // Warning for expiring soon
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
                    isEditingPrice: false,
                };
                setCart([...cart, newItem]);
                toast.success(`${product.name} added to cart`);
            }
        } catch (error) {
            toast.error(error.message || 'Failed to add product to cart');
        }
    };

    const updateQuantity = (productId, delta) => {
        const updatedCart = cart.map(item => {
            if (item.product._id === productId) {
                const newQuantity = item.quantity + delta;

                if (newQuantity <= 0) return null;
                if (newQuantity > item.product.currentStock) {
                    toast.error(`Only ${item.product.currentStock} units available`);
                    return item;
                }

                return {
                    ...item,
                    quantity: newQuantity,
                    totalPrice: parseFloat((newQuantity * item.unitPrice).toFixed(2)),
                };
            }
            return item;
        }).filter(item => item !== null);

        setCart(updatedCart);
    };

    const togglePriceEdit = (productId) => {
        const updatedCart = cart.map(item => {
            if (item.product._id === productId) {
                return { ...item, isEditingPrice: !item.isEditingPrice };
            }
            return item;
        });
        setCart(updatedCart);
    };

    const updateSellingPrice = (productId, newPrice) => {
        const price = parseFloat(newPrice);
        if (isNaN(price) || price < 0) return;

        const updatedCart = cart.map(item => {
            if (item.product._id === productId) {
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

    const removeFromCart = (productId) => {
        setCart(cart.filter(item => item.product._id !== productId));
    };

    const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
    const tax = subtotal * 0; // 0% GST
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

            // Process sale through inventory API
            const response = await inventoryAPI.createMovement({
                type: 'sale',
                items: saleItems,
                referenceNumber,
            });

            if (response.success) {
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
                toast.success('Payment processed successfully');

                // Clear cart after 1 second
                setTimeout(() => {
                    setCart([]);
                    setAmountReceived('');
                    setSelectedPaymentMethod('cash');
                }, 1000);
            }
        } catch (error) {
            toast.error(error.message || 'Failed to process payment');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                        <ShoppingCart size={24} className="text-blue-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Billing / POS</h1>
                        <p className="text-gray-600 mt-1">Process sales and manage billing</p>
                    </div>
                </div>
                <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                        if (cart.length > 0 && window.confirm('Are you sure you want to clear the cart?')) {
                            setCart([]);
                        }
                    }}
                    icon={<Trash2 size={18} />}
                >
                    Clear Cart
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Panel - Product Search and Cart */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Search */}
                    <Card>
                        <ProductSearch
                            placeholder="Search products by name, SKU, or barcode..."
                            onProductSelect={addToCart}
                            showStockInfo={true}
                            showPrice={true}
                            maxResults={20}
                            minSearchLength={2}
                            debounceMs={250}
                            autoFocus={true}
                        />
                    </Card>

                    {/* Cart Items */}
                    <div className="space-y-3">
                        {cart.length === 0 ? (
                            <Card>
                                <div className="flex flex-col items-center justify-center py-12">
                                    <ShoppingCart size={64} className="text-gray-300 mb-4" />
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Cart is Empty</h3>
                                    <p className="text-gray-600">Search and add products to start billing</p>
                                </div>
                            </Card>
                        ) : (
                            cart.map((item) => {
                                const profitPerUnit = item.unitPrice - item.costPrice;
                                const profitMargin = ((profitPerUnit / item.unitPrice) * 100).toFixed(1);

                                return (
                                    <Card key={item.product._id}>
                                        <div className="space-y-3">
                                            {/* Product Header */}
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <h3 className="font-semibold text-gray-900">{item.product.name}</h3>
                                                    <p className="text-sm text-gray-600">{item.product.sku}</p>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        Cost: {formatCurrency(item.costPrice)} {item.batchInfo && '(FIFO)'}
                                                        {profitPerUnit >= 0 && profitPerUnit > 0 && (
                                                            <span className="ml-2 text-green-600 font-medium">
                                                                {profitMargin}% profit
                                                            </span>
                                                        )}
                                                    </p>
                                                    {item.batchInfo && (
                                                        <p className="text-xs text-gray-500">
                                                            Batch: {item.batchInfo.batchNumber}
                                                        </p>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => removeFromCart(item.product._id)}
                                                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>

                                            {/* Controls */}
                                            <div className="flex items-center justify-between">
                                                {/* Quantity */}
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-sm text-gray-600">Qty:</span>
                                                    <button
                                                        onClick={() => updateQuantity(item.product._id, -1)}
                                                        className="p-1 bg-red-100 text-red-600 rounded hover:bg-red-200"
                                                    >
                                                        <Minus size={16} />
                                                    </button>
                                                    <span className="font-bold text-lg w-8 text-center">{item.quantity}</span>
                                                    <button
                                                        onClick={() => updateQuantity(item.product._id, 1)}
                                                        className="p-1 bg-green-100 text-green-600 rounded hover:bg-green-200"
                                                    >
                                                        <Plus size={16} />
                                                    </button>
                                                </div>

                                                {/* Price */}
                                                <div className="flex items-center space-x-2">
                                                    {item.isEditingPrice ? (
                                                        <div className="flex items-center space-x-2">
                                                            <Input
                                                                type="number"
                                                                defaultValue={item.unitPrice}
                                                                onBlur={(e) => updateSellingPrice(item.product._id, e.target.value)}
                                                                onKeyPress={(e) => {
                                                                    if (e.key === 'Enter') {
                                                                        updateSellingPrice(item.product._id, e.target.value);
                                                                    }
                                                                }}
                                                                className="w-24"
                                                                autoFocus
                                                            />
                                                            <button
                                                                onClick={() => togglePriceEdit(item.product._id)}
                                                                className="p-1 text-gray-600"
                                                            >
                                                                <X size={18} />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <span className="font-semibold text-lg">
                                                                {formatCurrency(item.unitPrice)}
                                                            </span>
                                                            <button
                                                                onClick={() => togglePriceEdit(item.product._id)}
                                                                className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                                            >
                                                                <Edit2 size={16} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Total */}
                                            <div className="pt-3 border-t flex items-center justify-between">
                                                <span className="text-sm font-medium text-gray-600">Item Total</span>
                                                <span className="text-xl font-bold text-gray-900">
                                                    {formatCurrency(item.totalPrice)}
                                                </span>
                                            </div>
                                        </div>
                                    </Card>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Right Panel - Bill Summary */}
                <div className="lg:col-span-1">
                    <Card className="sticky top-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">Bill Summary</h2>

                        <div className="space-y-3 mb-4">
                            <div className="flex items-center justify-between">
                                <span className="text-gray-600">Items ({totalItems})</span>
                                <span className="font-medium">{formatCurrency(subtotal)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-600">GST (0%)</span>
                                <span className="font-medium">{formatCurrency(tax)}</span>
                            </div>
                            <div className="pt-3 border-t flex items-center justify-between">
                                <span className="text-lg font-bold text-gray-900">Total</span>
                                <span className="text-2xl font-bold text-blue-600">{formatCurrency(total)}</span>
                            </div>
                        </div>

                        <Button
                            variant="primary"
                            size="lg"
                            fullWidth
                            onClick={() => setShowPaymentModal(true)}
                            disabled={cart.length === 0}
                        >
                            Pay {formatCurrency(total)}
                        </Button>
                    </Card>
                </div>
            </div>

            {/* Payment Modal */}
            <Modal
                isOpen={showPaymentModal}
                onClose={() => setShowPaymentModal(false)}
                title="Payment"
                size="lg"
            >
                <div className="space-y-6">
                    {/* Total Amount */}
                    <div className="text-center p-6 bg-blue-50 rounded-lg">
                        <p className="text-sm text-gray-600 mb-2">Total Amount</p>
                        <p className="text-4xl font-bold text-blue-600">{formatCurrency(total)}</p>
                    </div>

                    {/* Payment Methods */}
                    <div>
                        <p className="font-medium text-gray-900 mb-3">Payment Method</p>
                        <div className="grid grid-cols-2 gap-3">
                            {PAYMENT_METHODS.map((method) => (
                                <button
                                    key={method.id}
                                    onClick={() => setSelectedPaymentMethod(method.id)}
                                    className={`p-4 border-2 rounded-lg flex flex-col items-center space-y-2 transition-colors ${selectedPaymentMethod === method.id
                                        ? 'border-blue-500 bg-blue-50 text-blue-600'
                                        : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    {method.icon}
                                    <span className="font-medium">{method.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Cash Input */}
                    {selectedPaymentMethod === 'cash' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Amount Received
                            </label>
                            <Input
                                type="number"
                                placeholder="0.00"
                                value={amountReceived}
                                onChange={(e) => setAmountReceived(e.target.value)}
                                autoFocus
                            />
                            {amountReceived && parseFloat(amountReceived) >= total && (
                                <p className="text-green-600 font-semibold mt-2">
                                    Change: {formatCurrency(parseFloat(amountReceived) - total)}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-3">
                        <Button
                            variant="secondary"
                            fullWidth
                            onClick={() => setShowPaymentModal(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            fullWidth
                            onClick={handlePayment}
                            disabled={isProcessing}
                        >
                            {isProcessing ? 'Processing...' : 'Complete Payment'}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Receipt Modal */}
            <Modal
                isOpen={showReceiptModal}
                onClose={() => {
                    setShowReceiptModal(false);
                    setReceiptData(null);
                }}
                title="Payment Successful"
                size="lg"
            >
                {receiptData && (
                    <div className="space-y-6">
                        {/* Success Icon */}
                        <div className="flex flex-col items-center">
                            <div className="p-4 bg-green-100 rounded-full mb-4">
                                <CheckCircle size={48} className="text-green-600" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">Payment Successful!</h3>
                        </div>

                        {/* Receipt Details */}
                        <div className="space-y-3 border-t border-b py-4">
                            <div className="flex items-center justify-between">
                                <span className="text-gray-600">Bill No.</span>
                                <span className="font-mono font-medium">{receiptData.billNumber}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-600">Date & Time</span>
                                <span className="font-medium">{receiptData.date}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-600">Cashier</span>
                                <span className="font-medium">{receiptData.cashier}</span>
                            </div>
                        </div>

                        {/* Items */}
                        <div className="space-y-2">
                            {receiptData.items.map((item, index) => (
                                <div key={index} className="flex items-center justify-between text-sm">
                                    <span className="text-gray-700">
                                        {item.product.name} × {item.quantity}
                                    </span>
                                    <span className="font-medium">{formatCurrency(item.totalPrice)}</span>
                                </div>
                            ))}
                        </div>

                        {/* Totals */}
                        <div className="space-y-2 border-t pt-4">
                            <div className="flex items-center justify-between">
                                <span className="text-gray-600">Subtotal</span>
                                <span className="font-medium">{formatCurrency(receiptData.subtotal)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-600">GST (0%)</span>
                                <span className="font-medium">{formatCurrency(receiptData.tax)}</span>
                            </div>
                            <div className="flex items-center justify-between text-lg font-bold">
                                <span>Total</span>
                                <span className="text-blue-600">{formatCurrency(receiptData.total)}</span>
                            </div>
                        </div>

                        {/* Payment Info */}
                        <div className="space-y-2 border-t pt-4">
                            <div className="flex items-center justify-between">
                                <span className="text-gray-600">Payment Method</span>
                                <span className="font-medium">{receiptData.paymentMethod}</span>
                            </div>
                            {receiptData.paymentMethod === 'Cash' && (
                                <>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-600">Amount Received</span>
                                        <span className="font-medium">{formatCurrency(receiptData.amountReceived)}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-green-600 font-semibold">
                                        <span>Change</span>
                                        <span>{formatCurrency(receiptData.change)}</span>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center space-x-3">
                            <Button
                                variant="outline"
                                fullWidth
                                icon={<Printer size={18} />}
                                onClick={() => toast.info('Print functionality coming soon')}
                            >
                                Print Receipt
                            </Button>
                            <Button
                                variant="primary"
                                fullWidth
                                onClick={() => {
                                    setShowReceiptModal(false);
                                    setReceiptData(null);
                                }}
                            >
                                Done
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default BillingScreen;


