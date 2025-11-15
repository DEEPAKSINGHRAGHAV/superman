import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Save, Eye } from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import ProductSearch from '../../components/common/ProductSearch';
import { purchaseOrdersAPI, suppliersAPI, productsAPI } from '../../services/api';
import toast from 'react-hot-toast';

const PurchaseOrderForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditMode = Boolean(id);

    // Get tomorrow's date in YYYY-MM-DD format
    const getTomorrowDate = () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
    };

    const [formData, setFormData] = useState({
        supplier: '',
        items: [],
        expectedDeliveryDate: getTomorrowDate(),
        notes: '',
        paymentMethod: 'credit',
    });

    const [suppliers, setSuppliers] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(false);
    const [errors, setErrors] = useState({});

    // Item form fields
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [itemQuantity, setItemQuantity] = useState('');
    const [itemMRP, setItemMRP] = useState('');
    const [itemCostPrice, setItemCostPrice] = useState('');
    const [itemSellingPrice, setItemSellingPrice] = useState('');
    const [itemExpiryDate, setItemExpiryDate] = useState('');
    const defaultMarkup = 0.20; // 20% default markup

    // Refs for input fields to enable auto-focus and keyboard navigation
    const productSearchRef = useRef(null);
    const quantityRef = useRef(null);
    const mrpRef = useRef(null);
    const costPriceRef = useRef(null);
    const sellingPriceRef = useRef(null);
    const expiryDateRef = useRef(null);

    useEffect(() => {
        fetchDropdownData();
        if (isEditMode) {
            fetchOrder();
        }
    }, [id]);

    const fetchDropdownData = async () => {
        try {
            const [suppliersRes, productsRes] = await Promise.all([
                suppliersAPI.getAll({ limit: 100 }),
                productsAPI.getAll({ limit: 100, isActive: 'true' }),
            ]);

            if (suppliersRes.success) {
                setSuppliers(suppliersRes.data);
            }

            if (productsRes.success) {
                setProducts(productsRes.data);
            }
        } catch (error) {
            console.error('Failed to fetch dropdown data:', error);
            toast.error('Failed to load suppliers or products');
        }
    };

    const fetchOrder = async () => {
        try {
            setFetchLoading(true);
            const response = await purchaseOrdersAPI.getById(id);
            if (response.success && response.data) {
                const order = response.data;
                setFormData({
                    supplier: typeof order.supplier === 'string' ? order.supplier : order.supplier._id,
                    items: order.items.map(item => {
                        const productObject = item.product && typeof item.product === 'object' ? item.product : null;
                        const productId = typeof item.product === 'string'
                            ? item.product
                            : productObject?._id || '';

                        return {
                            product: productId,
                            productName: productObject?.name || item.productName || '',
                            quantity: item.quantity,
                            costPrice: item.costPrice,
                            sellingPrice: item.sellingPrice || item.costPrice * 1.2,
                            mrp: item.mrp,
                            expiryDate: item.expiryDate ? item.expiryDate.split('T')[0] : '',
                            totalAmount: item.quantity * item.costPrice,
                        };
                    }),
                    expectedDeliveryDate: order.expectedDeliveryDate ? order.expectedDeliveryDate.split('T')[0] : getTomorrowDate(),
                    notes: order.notes || '',
                    paymentMethod: order.paymentMethod || 'credit',
                });
            }
        } catch (error) {
            toast.error('Failed to load purchase order');
            navigate('/purchase-orders');
        } finally {
            setFetchLoading(false);
        }
    };

    const handleProductSelect = (product) => {
        if (!product || !product._id) return;

        setSelectedProduct(product);
        setItemCostPrice(product.costPrice?.toString() || '');
        setItemSellingPrice(product.sellingPrice?.toString() || '');
        setItemMRP(product.mrp?.toString() || '');

        // Auto-focus quantity field after product selection
        // Use setTimeout to ensure the DOM has updated
        setTimeout(() => {
            quantityRef.current?.focus();
        }, 100);
    };

    const handleCostPriceChange = (value) => {
        setItemCostPrice(value);
        const cost = parseFloat(value);
        if (!isNaN(cost) && cost > 0) {
            const calculatedSellingPrice = cost * (1 + defaultMarkup);
            setItemSellingPrice(calculatedSellingPrice.toFixed(2));
        } else {
            setItemSellingPrice('');
        }
    };

    const calculateMargin = (cost, selling) => {
        if (cost === 0) return 0;
        return ((selling - cost) / cost) * 100;
    };

    const handleAddItem = () => {
        if (!selectedProduct || !selectedProduct._id) {
            toast.error('Please select a product');
            return;
        }

        const quantity = parseInt(itemQuantity);
        if (!itemQuantity || isNaN(quantity) || quantity <= 0) {
            toast.error('Please enter a valid quantity');
            return;
        }

        const costPrice = parseFloat(itemCostPrice);
        if (!itemCostPrice || isNaN(costPrice) || costPrice <= 0) {
            toast.error('Please enter a valid cost price');
            return;
        }

        const sellingPrice = parseFloat(itemSellingPrice);
        if (!itemSellingPrice || isNaN(sellingPrice) || sellingPrice <= 0) {
            toast.error('Please enter a valid selling price');
            return;
        }

        if (sellingPrice < costPrice) {
            if (!window.confirm('Selling price is less than cost price. This will result in a loss. Do you want to continue?')) {
                return;
            }
        }

        const newItem = {
            product: selectedProduct._id,
            productName: selectedProduct.name || '',
            quantity: quantity,
            costPrice: parseFloat(costPrice.toFixed(2)),
            sellingPrice: parseFloat(sellingPrice.toFixed(2)),
            totalAmount: parseFloat((quantity * costPrice).toFixed(2)),
        };

        if (itemMRP) {
            newItem.mrp = parseFloat(parseFloat(itemMRP).toFixed(2));
        }

        if (itemExpiryDate) {
            newItem.expiryDate = new Date(itemExpiryDate + 'T12:00:00.000Z').toISOString();
        }

        setFormData(prev => ({
            ...prev,
            items: [...prev.items, newItem],
        }));

        // Reset item form
        setSelectedProduct(null);
        setItemQuantity('');
        setItemMRP('');
        setItemCostPrice('');
        setItemSellingPrice('');
        setItemExpiryDate('');

        // Refocus on product search field for next item (after a short delay to allow form reset)
        setTimeout(() => {
            productSearchRef.current?.focus();
        }, 100);
    };

    const handleRemoveItem = (index) => {
        setFormData(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index),
        }));
    };

    const getProductName = (item) => {
        // First check if productName is stored in the item
        if (item.productName) {
            return item.productName;
        }
        // Fallback to lookup from products array
        const product = products.find(p => p._id === item.product);
        return product?.name || item.product;
    };

    const validateForm = () => {
        const newErrors = {};

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
            toast.error('Please fix the errors before submitting');
            return;
        }

        try {
            setLoading(true);

            const itemsWithTotals = formData.items.map(item => {
                const { productName, ...itemData } = item; // Exclude productName from backend payload
                return {
                    ...itemData,
                    totalAmount: item.quantity * item.costPrice,
                };
            });

            const subtotal = itemsWithTotals.reduce((sum, item) => sum + item.totalAmount, 0);

            const orderData = {
                ...formData,
                items: itemsWithTotals,
                subtotal,
                totalAmount: subtotal,
                taxAmount: 0,
                discountAmount: 0,
                expectedDeliveryDate: formData.expectedDeliveryDate ? new Date(formData.expectedDeliveryDate + 'T12:00:00.000Z').toISOString() : undefined,
            };

            if (isEditMode) {
                await purchaseOrdersAPI.update(id, orderData);
                toast.success('Purchase order updated successfully');
            } else {
                await purchaseOrdersAPI.create(orderData);
                toast.success('Purchase order created successfully');
            }

            navigate('/purchase-orders');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save purchase order');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    const totalAmount = formData.items.reduce((sum, item) => sum + (item.quantity * item.costPrice), 0);

    if (fetchLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-600">Loading purchase order...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center space-x-4">
                <button
                    onClick={() => navigate('/purchase-orders')}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                >
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {isEditMode ? 'Edit Purchase Order' : 'Create Purchase Order'}
                    </h1>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Form */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Supplier and Basic Info */}
                    <Card>
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Details</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Supplier <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={formData.supplier}
                                    onChange={(e) => setFormData(prev => ({ ...prev, supplier: e.target.value }))}
                                    className="input"
                                >
                                    <option value="">Select supplier</option>
                                    {suppliers.map(supplier => (
                                        <option key={supplier._id} value={supplier._id}>
                                            {supplier.name}
                                        </option>
                                    ))}
                                </select>
                                {errors.supplier && (
                                    <p className="text-red-500 text-sm mt-1">{errors.supplier}</p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Expected Delivery Date
                                    </label>
                                    <Input
                                        type="date"
                                        value={formData.expectedDeliveryDate}
                                        onChange={(e) => setFormData(prev => ({ ...prev, expectedDeliveryDate: e.target.value }))}
                                        min={new Date().toISOString().split('T')[0]}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Payment Method
                                    </label>
                                    <select
                                        value={formData.paymentMethod}
                                        onChange={(e) => setFormData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                                        className="input"
                                    >
                                        <option value="cash">Cash</option>
                                        <option value="credit">Credit</option>
                                        <option value="cheque">Cheque</option>
                                        <option value="online">Online</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Notes
                                </label>
                                <textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                    className="input"
                                    rows="3"
                                    placeholder="Enter any additional notes"
                                />
                            </div>
                        </div>
                    </Card>

                    {/* Add Item Form */}
                    <Card>
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Product</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Product
                                </label>
                                <ProductSearch
                                    ref={productSearchRef}
                                    onProductSelect={handleProductSelect}
                                    placeholder="Search products by name, SKU, or barcode..."
                                    showStockInfo={true}
                                    showPrice={true}
                                    maxResults={20}
                                    allowOutOfStock={true}
                                />
                                {selectedProduct && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            window.open(`/products/${selectedProduct._id}`, '_blank', 'noopener,noreferrer');
                                        }}
                                        className="mt-2 w-full p-2 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors cursor-pointer text-left group"
                                        title="Click to view product details in new tab"
                                    >
                                        <p className="text-sm font-medium text-blue-900 group-hover:text-blue-700 flex items-center gap-2">
                                            <span>Selected: {selectedProduct.name} {selectedProduct.sku && `(${selectedProduct.sku})`}</span>
                                            <Eye
                                                size={14}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-700"
                                            />
                                        </p>
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Quantity
                                    </label>
                                    <Input
                                        ref={quantityRef}
                                        type="number"
                                        placeholder="0"
                                        value={itemQuantity}
                                        onChange={(e) => setItemQuantity(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                mrpRef.current?.focus();
                                            }
                                        }}
                                        min="1"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        MRP (₹)
                                    </label>
                                    <Input
                                        ref={mrpRef}
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={itemMRP}
                                        onChange={(e) => setItemMRP(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                costPriceRef.current?.focus();
                                            }
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Cost Price (₹) <span className="text-red-500">*</span>
                                    </label>
                                    <Input
                                        ref={costPriceRef}
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={itemCostPrice}
                                        onChange={(e) => handleCostPriceChange(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                sellingPriceRef.current?.focus();
                                            }
                                        }}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Selling Price (₹) <span className="text-red-500">*</span>
                                    </label>
                                    <Input
                                        ref={sellingPriceRef}
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={itemSellingPrice}
                                        onChange={(e) => setItemSellingPrice(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                expiryDateRef.current?.focus();
                                            }
                                        }}
                                    />
                                    {itemCostPrice && itemSellingPrice && (
                                        <p className={`text-xs mt-1 ${calculateMargin(parseFloat(itemCostPrice), parseFloat(itemSellingPrice)) < 0 ? 'text-red-500' : 'text-green-600'}`}>
                                            Margin: {calculateMargin(parseFloat(itemCostPrice), parseFloat(itemSellingPrice)).toFixed(1)}%
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Expiry Date (Optional)
                                </label>
                                <Input
                                    ref={expiryDateRef}
                                    type="date"
                                    value={itemExpiryDate}
                                    onChange={(e) => setItemExpiryDate(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            // If Enter is pressed on expiry date, trigger Add Item
                                            handleAddItem();
                                        }
                                    }}
                                    min={new Date().toISOString().split('T')[0]}
                                />
                            </div>

                            <Button
                                variant="outline"
                                icon={<Plus size={18} />}
                                onClick={handleAddItem}
                            >
                                Add Item
                            </Button>
                        </div>
                    </Card>

                    {/* Items List */}
                    <Card>
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">
                            Order Items ({formData.items.length})
                        </h2>
                        {formData.items.length > 0 ? (
                            <div className="space-y-3">
                                {formData.items.map((item, index) => (
                                    <div
                                        key={index}
                                        className="border border-gray-200 rounded-lg p-4 flex justify-between items-start"
                                    >
                                        <div className="flex-1">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    window.open(`/products/${item.product}`, '_blank', 'noopener,noreferrer');
                                                }}
                                                className="group flex items-center gap-2 font-semibold text-gray-900 mb-2 hover:text-blue-600 transition-colors cursor-pointer"
                                                title="View product details in new tab"
                                            >
                                                <span>{getProductName(item)}</span>
                                                <Eye
                                                    size={16}
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-600"
                                                />
                                            </button>
                                            <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                                                <span>Qty: {item.quantity}</span>
                                                {item.mrp && <span>• MRP: ₹{item.mrp.toFixed(2)}</span>}
                                                <span>• Cost: ₹{item.costPrice.toFixed(2)}</span>
                                                <span>• Sell: ₹{item.sellingPrice.toFixed(2)}</span>
                                                <span className="text-blue-600 font-semibold">
                                                    • Total: ₹{(item.quantity * item.costPrice).toFixed(2)}
                                                </span>
                                                <span className="text-green-600 font-semibold">
                                                    • Margin: {calculateMargin(item.costPrice, item.sellingPrice).toFixed(1)}%
                                                </span>
                                            </div>
                                            {item.expiryDate && (
                                                <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-yellow-50 border border-yellow-200 rounded-md">
                                                    <span className="text-sm text-yellow-700 font-semibold">
                                                        Expiry: {formatDate(item.expiryDate)}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => handleRemoveItem(index)}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                            title="Remove item"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                ))}
                                <div className="border-t pt-4 mt-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-lg font-semibold text-gray-900">Total Amount:</span>
                                        <span className="text-2xl font-bold text-blue-600">
                                            ₹{totalAmount.toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-12 text-gray-500">
                                <p>No items added yet</p>
                            </div>
                        )}
                        {errors.items && (
                            <p className="text-red-500 text-sm mt-2">{errors.items}</p>
                        )}
                    </Card>
                </div>

                {/* Summary Sidebar */}
                <div className="lg:col-span-1">
                    <Card>
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Summary</h2>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Items:</span>
                                <span className="font-medium">{formData.items.length}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Total Quantity:</span>
                                <span className="font-medium">
                                    {formData.items.reduce((sum, item) => sum + item.quantity, 0)}
                                </span>
                            </div>
                            <div className="border-t pt-3 mt-3">
                                <div className="flex justify-between text-lg font-semibold">
                                    <span>Total Amount:</span>
                                    <span className="text-blue-600">₹{totalAmount.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 space-y-3">
                            <Button
                                variant="primary"
                                icon={<Save size={18} />}
                                onClick={handleSubmit}
                                loading={loading}
                                className="w-full"
                            >
                                {isEditMode ? 'Update Order' : 'Create Order'}
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => navigate('/purchase-orders')}
                                className="w-full"
                            >
                                Cancel
                            </Button>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default PurchaseOrderForm;

