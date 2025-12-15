import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft } from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import SearchableSelect from '../../components/common/SearchableSelect';
import { productsAPI, brandsAPI, categoriesAPI } from '../../services/api';
import toast from 'react-hot-toast';

const ProductForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditMode = Boolean(id);

    const [formData, setFormData] = useState({
        name: '',
        sku: '',
        barcode: '',
        description: '',
        category: '',
        subcategory: '',
        brand: '',
        unit: 'pcs',
        costPrice: '',
        sellingPrice: '',
        mrp: '',
        gstRate: '0',
        minStockLevel: '10',
        maxStockLevel: '1000',
        isActive: true,
    });

    const [brands, setBrands] = useState([]);
    const [categories, setCategories] = useState([]);
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(false);

    // Refs for input fields to enable auto-focus and keyboard navigation
    const nameRef = useRef(null);
    const skuRef = useRef(null);
    const barcodeRef = useRef(null);
    const descriptionRef = useRef(null);
    const costPriceRef = useRef(null);
    const sellingPriceRef = useRef(null);
    const mrpRef = useRef(null);
    const gstRateRef = useRef(null);

    useEffect(() => {
        fetchDropdownData();
        if (isEditMode) {
            fetchProduct();
        } else {
            // Auto-focus on product name field when creating new product
            setTimeout(() => {
                nameRef.current?.focus();
            }, 100);
        }
    }, [id]);

    const fetchDropdownData = async () => {
        try {
            const [brandsRes, categoriesRes] = await Promise.all([
                brandsAPI.getAll({ limit: 1000 }),
                categoriesAPI.getAll({ limit: 1000, isActive: 'true' }),
            ]);

            if (brandsRes && brandsRes.success) {
                setBrands(brandsRes.data || []);
            }

            if (categoriesRes && categoriesRes.success) {
                setCategories(categoriesRes.data || []);
            } else {
                console.error('Categories API response:', categoriesRes);
            }
        } catch (error) {
            console.error('Failed to fetch dropdown data:', error);
            toast.error('Failed to load categories and brands');
        }
    };

    const fetchProduct = async () => {
        try {
            setFetchLoading(true);
            const response = await productsAPI.getById(id);
            if (response.success) {
                const product = response.data;
                setFormData({
                    name: product.name || '',
                    sku: product.sku ? product.sku.replace(/\s/g, '').toUpperCase() : '',
                    barcode: product.barcode || '',
                    description: product.description || '',
                    category: product.category || '',
                    subcategory: product.subcategory || '',
                    brand: product.brand || '',
                    unit: product.unit || 'pcs',
                    costPrice: product.costPrice || '',
                    sellingPrice: product.sellingPrice || '',
                    mrp: product.mrp || '',
                    gstRate: product.gstRate !== undefined && product.gstRate !== null ? String(product.gstRate) : '0',
                    minStockLevel: product.minStockLevel || '10',
                    maxStockLevel: product.maxStockLevel || '1000',
                    isActive: product.isActive !== undefined ? product.isActive : true,
                });
            }
        } catch (error) {
            toast.error('Failed to load product');
            navigate('/products');
        } finally {
            setFetchLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;

        // Special handling for SKU: remove spaces and convert to uppercase
        let processedValue = value;
        if (name === 'sku') {
            processedValue = value.replace(/\s/g, '').toUpperCase();
        }

        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : processedValue,
        }));
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: '' }));
        }
    };

    const validate = () => {
        const newErrors = {};

        if (!formData.name) newErrors.name = 'Product name is required';
        if (!formData.sku) newErrors.sku = 'SKU is required';
        if (!formData.category) newErrors.category = 'Category is required';

        // Only validate price fields when creating a new product
        // In edit mode, prices are auto-managed by inventory batches
        if (!isEditMode) {
            if (!formData.costPrice) newErrors.costPrice = 'Cost price is required';
            if (!formData.sellingPrice) newErrors.sellingPrice = 'Selling price is required';
            if (!formData.mrp) newErrors.mrp = 'MRP is required';

            if (formData.costPrice && parseFloat(formData.costPrice) < 0) {
                newErrors.costPrice = 'Cost price must be positive';
            }

            if (formData.sellingPrice && parseFloat(formData.sellingPrice) < 0) {
                newErrors.sellingPrice = 'Selling price must be positive';
            }

            if (formData.mrp && parseFloat(formData.mrp) < 0) {
                newErrors.mrp = 'MRP must be positive';
            }
        }

        return newErrors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const newErrors = validate();
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        try {
            setLoading(true);

            // Convert string numbers to actual numbers and ensure category is lowercase slug
            // Ensure SKU is uppercase and has no spaces
            const cleanedBarcode = formData.barcode?.trim();

            const submitData = {
                ...formData,
                sku: formData.sku ? formData.sku.replace(/\s/g, '').toUpperCase() : '',
                category: formData.category ? formData.category.toLowerCase().trim() : '',
                gstRate: parseFloat(formData.gstRate),
                minStockLevel: parseInt(formData.minStockLevel),
                maxStockLevel: parseInt(formData.maxStockLevel),
            };

            // Only include price fields when creating a new product
            // In edit mode, prices are auto-managed by inventory batches
            if (!isEditMode) {
                submitData.costPrice = parseFloat(formData.costPrice);
                submitData.sellingPrice = parseFloat(formData.sellingPrice);
                submitData.mrp = parseFloat(formData.mrp);
            } else {
                // Remove price fields from update request - they are managed by batches
                delete submitData.costPrice;
                delete submitData.sellingPrice;
                delete submitData.mrp;
            }

            if (cleanedBarcode) {
                submitData.barcode = cleanedBarcode;
            } else {
                delete submitData.barcode;
            }

            let response;
            if (isEditMode) {
                response = await productsAPI.update(id, submitData);
            } else {
                response = await productsAPI.create(submitData);
            }

            if (response.success) {
                toast.success(`Product ${isEditMode ? 'updated' : 'created'} successfully`);
                navigate('/products');
            }
        } catch (error) {
            toast.error(error.message || `Failed to ${isEditMode ? 'update' : 'create'} product`);
        } finally {
            setLoading(false);
        }
    };

    if (fetchLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center space-x-4">
                <Button variant="ghost" icon={<ArrowLeft size={18} />} onClick={() => navigate('/products')}>
                    Back
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {isEditMode ? 'Edit Product' : 'Add New Product'}
                    </h1>
                    <p className="text-gray-600 mt-1">
                        {isEditMode ? 'Update product information' : 'Create a new product'}
                    </p>
                </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Basic Information */}
                    <div className="lg:col-span-2">
                        <Card title="Basic Information">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <Input
                                        ref={nameRef}
                                        label="Product Name"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                skuRef.current?.focus();
                                            }
                                        }}
                                        error={errors.name}
                                        required
                                    />
                                </div>
                                <Input
                                    ref={skuRef}
                                    label="SKU"
                                    name="sku"
                                    value={formData.sku}
                                    onChange={handleChange}
                                    onPaste={(e) => {
                                        // Handle paste: remove spaces and convert to uppercase
                                        e.preventDefault();
                                        const pastedText = e.clipboardData.getData('text');
                                        const processedValue = pastedText.replace(/\s/g, '').toUpperCase();
                                        setFormData((prev) => ({
                                            ...prev,
                                            sku: processedValue,
                                        }));
                                        if (errors.sku) {
                                            setErrors((prev) => ({ ...prev, sku: '' }));
                                        }
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            barcodeRef.current?.focus();
                                        }
                                    }}
                                    error={errors.sku}
                                    required
                                />
                                <Input
                                    ref={barcodeRef}
                                    label="Barcode"
                                    name="barcode"
                                    value={formData.barcode}
                                    onChange={handleChange}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            costPriceRef.current?.focus();
                                        }
                                    }}
                                    error={errors.barcode}
                                />
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Description
                                    </label>
                                    <textarea
                                        ref={descriptionRef}
                                        name="description"
                                        value={formData.description}
                                        onChange={handleChange}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Tab' && !e.shiftKey) {
                                                // Tab moves to next field
                                                e.preventDefault();
                                                costPriceRef.current?.focus();
                                            } else if (e.key === 'Enter' && e.ctrlKey) {
                                                // Ctrl+Enter submits the form
                                                e.preventDefault();
                                                handleSubmit(e);
                                            }
                                            // Enter allows new line (default behavior)
                                        }}
                                        rows={3}
                                        className="input"
                                    />
                                </div>
                            </div>
                        </Card>

                        {/* Pricing */}
                        <Card title={isEditMode ? "Pricing (Auto-managed by batches)" : "Pricing"} className="mt-6">
                            {isEditMode && (
                                <p className="text-sm text-gray-500 mb-4">
                                    Prices are automatically updated from inventory batches (FIFO). 
                                    Update prices through Purchase Orders instead.
                                </p>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                    ref={costPriceRef}
                                    label="Cost Price"
                                    name="costPrice"
                                    type="number"
                                    step="0.01"
                                    value={formData.costPrice}
                                    onChange={handleChange}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            sellingPriceRef.current?.focus();
                                        }
                                    }}
                                    error={errors.costPrice}
                                    required
                                    disabled={isEditMode}
                                />
                                <Input
                                    ref={sellingPriceRef}
                                    label="Selling Price"
                                    name="sellingPrice"
                                    type="number"
                                    step="0.01"
                                    value={formData.sellingPrice}
                                    onChange={handleChange}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            mrpRef.current?.focus();
                                        }
                                    }}
                                    error={errors.sellingPrice}
                                    required
                                    disabled={isEditMode}
                                />
                                <Input
                                    ref={mrpRef}
                                    label="MRP"
                                    name="mrp"
                                    type="number"
                                    step="0.01"
                                    value={formData.mrp}
                                    onChange={handleChange}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            gstRateRef.current?.focus();
                                        }
                                    }}
                                    error={errors.mrp}
                                    required
                                    disabled={isEditMode}
                                />
                                <Input
                                    ref={gstRateRef}
                                    label="GST Rate (%)"
                                    name="gstRate"
                                    type="number"
                                    step="0.01"
                                    value={formData.gstRate}
                                    onChange={handleChange}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            // Move to category dropdown or submit if all required fields filled
                                            const categorySelect = document.querySelector('select[name="category"]');
                                            categorySelect?.focus();
                                        }
                                    }}
                                />
                            </div>
                        </Card>
                    </div>

                    {/* Sidebar */}
                    <div>
                        <Card title="Classification">
                            <div className="space-y-4">
                                <SearchableSelect
                                    label="Category"
                                    name="category"
                                    value={formData.category}
                                    onChange={handleChange}
                                    options={categories.map((cat) => ({
                                        value: cat.slug || cat.name?.toLowerCase().replace(/\s+/g, '-'),
                                        label: cat.name,
                                        _id: cat._id
                                    }))}
                                    placeholder="Select Category"
                                    error={errors.category}
                                    required
                                    searchable={true}
                                />

                                <SearchableSelect
                                    label="Brand"
                                    name="brand"
                                    value={formData.brand}
                                    onChange={handleChange}
                                    options={brands.map((brand) => ({
                                        value: brand.name,
                                        label: brand.name,
                                        _id: brand._id
                                    }))}
                                    placeholder="Select Brand"
                                    searchable={true}
                                />

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                                    <select name="unit" value={formData.unit} onChange={handleChange} className="input">
                                        <option value="pcs">Pieces</option>
                                        <option value="kg">Kilogram</option>
                                        <option value="g">Gram</option>
                                        <option value="l">Liter</option>
                                        <option value="ml">Milliliter</option>
                                        <option value="box">Box</option>
                                        <option value="pack">Pack</option>
                                    </select>
                                </div>
                            </div>
                        </Card>

                        <Card title="Stock Settings" className="mt-6">
                            <div className="space-y-4">
                                <Input
                                    label="Min Stock Level"
                                    name="minStockLevel"
                                    type="number"
                                    value={formData.minStockLevel}
                                    onChange={handleChange}
                                />
                                <Input
                                    label="Max Stock Level"
                                    name="maxStockLevel"
                                    type="number"
                                    value={formData.maxStockLevel}
                                    onChange={handleChange}
                                />

                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="isActive"
                                        name="isActive"
                                        checked={formData.isActive}
                                        onChange={handleChange}
                                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                                    />
                                    <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                                        Active Product
                                    </label>
                                </div>
                            </div>
                        </Card>

                        <div className="mt-6 space-y-3">
                            <Button
                                type="submit"
                                variant="primary"
                                fullWidth
                                loading={loading}
                                icon={<Save size={18} />}
                            >
                                {isEditMode ? 'Update Product' : 'Create Product'}
                            </Button>
                            <Button
                                type="button"
                                variant="secondary"
                                fullWidth
                                onClick={() => navigate('/products')}
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default ProductForm;

