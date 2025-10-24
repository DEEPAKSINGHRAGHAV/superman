import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft } from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
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
        gstRate: '18',
        minStockLevel: '10',
        maxStockLevel: '1000',
        isActive: true,
    });

    const [brands, setBrands] = useState([]);
    const [categories, setCategories] = useState([]);
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(false);

    useEffect(() => {
        fetchDropdownData();
        if (isEditMode) {
            fetchProduct();
        }
    }, [id]);

    const fetchDropdownData = async () => {
        try {
            const [brandsRes, categoriesRes] = await Promise.all([
                brandsAPI.getAll({ limit: 1000 }),
                categoriesAPI.getAll({ limit: 1000 }),
            ]);

            if (brandsRes.success) {
                setBrands(brandsRes.data);
            }

            if (categoriesRes.success) {
                setCategories(categoriesRes.data);
            }
        } catch (error) {
            console.error('Failed to fetch dropdown data:', error);
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
                    sku: product.sku || '',
                    barcode: product.barcode || '',
                    description: product.description || '',
                    category: product.category || '',
                    subcategory: product.subcategory || '',
                    brand: product.brand || '',
                    unit: product.unit || 'pcs',
                    costPrice: product.costPrice || '',
                    sellingPrice: product.sellingPrice || '',
                    mrp: product.mrp || '',
                    gstRate: product.gstRate || '18',
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
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
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

            // Convert string numbers to actual numbers
            const submitData = {
                ...formData,
                costPrice: parseFloat(formData.costPrice),
                sellingPrice: parseFloat(formData.sellingPrice),
                mrp: parseFloat(formData.mrp),
                gstRate: parseFloat(formData.gstRate),
                minStockLevel: parseInt(formData.minStockLevel),
                maxStockLevel: parseInt(formData.maxStockLevel),
            };

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
                                        label="Product Name"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        error={errors.name}
                                        required
                                    />
                                </div>
                                <Input
                                    label="SKU"
                                    name="sku"
                                    value={formData.sku}
                                    onChange={handleChange}
                                    error={errors.sku}
                                    required
                                />
                                <Input
                                    label="Barcode"
                                    name="barcode"
                                    value={formData.barcode}
                                    onChange={handleChange}
                                    error={errors.barcode}
                                />
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Description
                                    </label>
                                    <textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleChange}
                                        rows={3}
                                        className="input"
                                    />
                                </div>
                            </div>
                        </Card>

                        {/* Pricing */}
                        <Card title="Pricing" className="mt-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                    label="Cost Price"
                                    name="costPrice"
                                    type="number"
                                    step="0.01"
                                    value={formData.costPrice}
                                    onChange={handleChange}
                                    error={errors.costPrice}
                                    required
                                />
                                <Input
                                    label="Selling Price"
                                    name="sellingPrice"
                                    type="number"
                                    step="0.01"
                                    value={formData.sellingPrice}
                                    onChange={handleChange}
                                    error={errors.sellingPrice}
                                    required
                                />
                                <Input
                                    label="MRP"
                                    name="mrp"
                                    type="number"
                                    step="0.01"
                                    value={formData.mrp}
                                    onChange={handleChange}
                                    error={errors.mrp}
                                    required
                                />
                                <Input
                                    label="GST Rate (%)"
                                    name="gstRate"
                                    type="number"
                                    step="0.01"
                                    value={formData.gstRate}
                                    onChange={handleChange}
                                />
                            </div>
                        </Card>
                    </div>

                    {/* Sidebar */}
                    <div>
                        <Card title="Classification">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Category <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        name="category"
                                        value={formData.category}
                                        onChange={handleChange}
                                        className={`input ${errors.category ? 'input-error' : ''}`}
                                        required
                                    >
                                        <option value="">Select Category</option>
                                        {categories.map((cat) => (
                                            <option key={cat._id} value={cat.name}>
                                                {cat.name}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.category && <p className="mt-1 text-sm text-red-600">{errors.category}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                                    <select
                                        name="brand"
                                        value={formData.brand}
                                        onChange={handleChange}
                                        className="input"
                                    >
                                        <option value="">Select Brand</option>
                                        {brands.map((brand) => (
                                            <option key={brand._id} value={brand.name}>
                                                {brand.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

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

