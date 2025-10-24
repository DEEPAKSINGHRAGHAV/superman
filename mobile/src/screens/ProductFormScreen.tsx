import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Alert,
    TouchableOpacity,
    Modal,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { Button, Input, LoadingSpinner, SearchableDropdown } from '../components/ui';
import { HighQualityBarcodeScanner } from '../components';
import { ProductFormData } from '../types';
import apiService from '../services/api';

const ProductFormScreen: React.FC = () => {
    const { theme } = useTheme();
    const route = useRoute();
    const navigation = useNavigation();
    const { productId } = route.params as { productId?: string };

    const [formData, setFormData] = useState<ProductFormData>({
        name: '',
        description: '',
        sku: '',
        barcode: '',
        mrp: 0,
        costPrice: 0,
        sellingPrice: 0,
        currentStock: 0,
        minStockLevel: 0,
        maxStockLevel: 1000,
        category: 'grocery',
        subcategory: '',
        brand: '',
        unit: 'pcs',
        weight: 0,
        dimensions: {
            length: 0,
            width: 0,
            height: 0,
        },
        expiryDate: '',
        batchNumber: '',
    });

    // String state for money input fields
    const [costPriceInput, setCostPriceInput] = useState('');
    const [mrpInput, setMrpInput] = useState('');
    const [sellingPriceInput, setSellingPriceInput] = useState('');


    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<Partial<ProductFormData>>({});
    const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
    const [brands, setBrands] = useState<any[]>([]);
    const [brandsLoading, setBrandsLoading] = useState(false);
    const [categories, setCategories] = useState<any[]>([]);
    const [categoriesLoading, setCategoriesLoading] = useState(false);

    const units = [
        { name: 'Pieces', value: 'pcs' },
        { name: 'Kilogram', value: 'kg' },
        { name: 'Liter', value: 'liter' },
        { name: 'Gram', value: 'gram' },
        { name: 'Milliliter', value: 'ml' },
        { name: 'Box', value: 'box' },
        { name: 'Pack', value: 'pack' },
    ];

    useEffect(() => {
        loadBrands();
        loadCategories();
        if (productId) {
            loadProduct();
        }
    }, [productId]);

    const loadBrands = async () => {
        try {
            setBrandsLoading(true);
            const response = await apiService.getBrands({ isActive: true }, 1, 100);
            if (response.success && response.data) {
                setBrands(response.data);
            }
        } catch (error) {
            console.error('Error loading brands:', error);
            // Don't show alert for brands loading error, just log it
        } finally {
            setBrandsLoading(false);
        }
    };

    const loadCategories = async () => {
        try {
            setCategoriesLoading(true);
            const response = await apiService.getCategories({ isActive: true, level: 0 }, 1, 100);
            if (response.success && response.data) {
                // Sort by sortOrder to match admin display
                const sortedCategories = response.data.sort((a: any, b: any) => a.sortOrder - b.sortOrder);
                setCategories(sortedCategories);
            }
        } catch (error) {
            console.error('Error loading categories:', error);
            // Don't show alert for categories loading error, just log it
        } finally {
            setCategoriesLoading(false);
        }
    };

    const loadProduct = async () => {
        try {
            setIsLoading(true);
            const response = await apiService.getProduct(productId!);

            if (response.success && response.data) {
                const product = response.data;
                setFormData({
                    name: product.name,
                    description: product.description || '',
                    sku: product.sku,
                    barcode: product.barcode || '',
                    mrp: product.mrp,
                    costPrice: product.costPrice,
                    sellingPrice: product.sellingPrice,
                    currentStock: product.currentStock,
                    minStockLevel: product.minStockLevel,
                    maxStockLevel: product.maxStockLevel,
                    category: product.category,
                    subcategory: product.subcategory || '',
                    brand: product.brand || '',
                    unit: product.unit,
                    weight: product.weight || 0,
                    dimensions: product.dimensions || { length: 0, width: 0, height: 0 },
                    expiryDate: product.expiryDate || '',
                    batchNumber: product.batchNumber || '',
                });
                // Initialize string input values
                setCostPriceInput(product.costPrice.toString());
                setMrpInput(product.mrp.toString());
                setSellingPriceInput(product.sellingPrice.toString());
            }
        } catch (error) {
            console.error('Error loading product:', error);
            Alert.alert('Error', 'Failed to load product');
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (field: keyof ProductFormData, value: string | number) => {
        setFormData(prev => ({ ...prev, [field]: value }));

        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };

    const handleBarcodeScan = (barcode: string) => {
        setFormData(prev => ({ ...prev, barcode }));
        setShowBarcodeScanner(false);
    };

    const handleOpenBarcodeScanner = () => {
        setShowBarcodeScanner(true);
    };

    const handleCloseBarcodeScanner = () => {
        setShowBarcodeScanner(false);
    };

    const validateForm = () => {
        const newErrors: Partial<ProductFormData> = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Product name is required';
        }

        if (!formData.sku.trim()) {
            newErrors.sku = 'SKU is required';
        } else if (!/^[A-Z0-9-_]+$/.test(formData.sku)) {
            newErrors.sku = 'SKU can only contain uppercase letters, numbers, hyphens, and underscores';
        }

        if (!formData.mrp || formData.mrp <= 0) {
            newErrors.mrp = 'MRP must be greater than 0';
        }

        if (formData.barcode && formData.barcode.trim().length > 0) {
            if (formData.barcode.trim().length < 8 || formData.barcode.trim().length > 20) {
                newErrors.barcode = 'Barcode must be between 8 and 20 characters';
            } else if (!/^[0-9]+$/.test(formData.barcode.trim())) {
                newErrors.barcode = 'Barcode must contain only numbers';
            }
        }

        if (!formData.costPrice || formData.costPrice <= 0) {
            newErrors.costPrice = 'Cost price must be greater than 0';
        }

        if (!formData.sellingPrice || formData.sellingPrice <= 0) {
            newErrors.sellingPrice = 'Selling price must be greater than 0';
        }

        if (formData.costPrice >= formData.sellingPrice) {
            newErrors.sellingPrice = 'Selling price must be greater than cost price';
        }

        if (!formData.category) {
            newErrors.category = 'Category is required';
        }

        const allowedUnits = ['pcs', 'kg', 'liter', 'gram', 'ml', 'box', 'pack'];
        if (formData.unit && !allowedUnits.includes(formData.unit.toLowerCase())) {
            newErrors.unit = 'Invalid unit. Allowed units: pcs, kg, liter, gram, ml, box, pack';
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

            // Ensure all required fields are properly set
            const submitData = {
                ...formData,
                // Ensure numeric fields are properly converted and rounded to 2 decimals
                mrp: parseFloat(Number(formData.mrp).toFixed(2)),
                costPrice: parseFloat(Number(formData.costPrice).toFixed(2)),
                sellingPrice: parseFloat(Number(formData.sellingPrice).toFixed(2)),
                currentStock: Number(formData.currentStock),
                minStockLevel: Number(formData.minStockLevel),
                maxStockLevel: Number(formData.maxStockLevel),
                weight: formData.weight ? Number(formData.weight) : undefined,
                // Ensure category is set
                category: formData.category || 'grocery',
                // Ensure unit is set
                unit: formData.unit || 'pcs',
                // Remove empty barcode to avoid validation issues
                barcode: formData.barcode && formData.barcode.trim() ? formData.barcode.trim() : undefined,
            };

            // Debug: Log the form data being sent
            console.log('Form data being sent:', JSON.stringify(submitData, null, 2));

            if (productId) {
                await apiService.updateProduct(productId, submitData);
                Alert.alert('Success', 'Product updated successfully');
            } else {
                await apiService.createProduct(submitData);
                Alert.alert('Success', 'Product created successfully');
            }

            navigation.goBack();
        } catch (error: any) {
            console.error('Error saving product:', error);

            // Handle validation errors from backend
            if (error.message && error.message.includes('validation')) {
                Alert.alert('Validation Error', error.message);
            } else {
                Alert.alert('Error', error.message || 'Failed to save product');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const getContainerStyle = () => ({
        ...styles.container,
        backgroundColor: theme.colors.background,
    });

    if (isLoading && productId) {
        return <LoadingSpinner overlay text="Loading product..." />;
    }

    return (
        <>
            <ScrollView style={getContainerStyle()}>
                <View style={styles.content}>
                    <Input
                        label="Product Name"
                        placeholder="Enter product name"
                        value={formData.name}
                        onChangeText={(text) => handleInputChange('name', text)}
                        error={errors.name}
                        required
                    />

                    <Input
                        label="Description"
                        placeholder="Enter product description"
                        value={formData.description}
                        onChangeText={(text) => handleInputChange('description', text)}
                        multiline
                        numberOfLines={3}
                    />

                    <Input
                        label="SKU"
                        placeholder="Enter SKU (A-Z, 0-9, -, _)"
                        value={formData.sku}
                        onChangeText={(text) => handleInputChange('sku', text.toUpperCase())}
                        error={errors.sku}
                        required
                    />

                    <View style={styles.categorySection}>
                        <Text style={[styles.categoryLabel, { color: theme.colors.text }]}>
                            Category * {categoriesLoading && '(Loading...)'}
                        </Text>
                        <View style={styles.categoryGridContainer}>
                            {categories.map((category) => {
                                const isSelected = formData.category === category.slug || formData.category === category.name;
                                return (
                                    <TouchableOpacity
                                        key={category._id || category.slug}
                                        style={[
                                            styles.categoryChip,
                                            {
                                                backgroundColor: isSelected
                                                    ? theme.colors.primary[500]
                                                    : theme.colors.surface,
                                                borderColor: isSelected
                                                    ? theme.colors.primary[500]
                                                    : theme.colors.border,
                                                borderWidth: isSelected ? 2 : 1,
                                            }
                                        ]}
                                        onPress={() => {
                                            console.log('Selected category:', category.slug, category.name);
                                            // Use slug for consistency with backend
                                            handleInputChange('category', category.slug);
                                        }}
                                    >
                                        <Text style={[
                                            styles.categoryChipText,
                                            {
                                                color: isSelected
                                                    ? theme.colors.white
                                                    : theme.colors.text,
                                                fontWeight: isSelected ? 'bold' : '500'
                                            }
                                        ]}>
                                            {isSelected ? '✓ ' : ''}
                                            {category.name}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    <Input
                        label="Barcode (Optional)"
                        placeholder="Enter barcode (8-20 digits)"
                        value={formData.barcode}
                        onChangeText={(text) => handleInputChange('barcode', text.trim())}
                        keyboardType="numeric"
                        error={errors.barcode}
                        rightIcon="camera-alt"
                        onRightIconPress={handleOpenBarcodeScanner}
                    />

                    <Input
                        label="Cost Price"
                        placeholder="Enter cost price"
                        value={costPriceInput}
                        onChangeText={(text) => {
                            setCostPriceInput(text);
                            const num = parseFloat(text) || 0;
                            handleInputChange('costPrice', num);
                        }}
                        keyboardType="decimal-pad"
                        error={errors.costPrice}
                        required
                    />

                    <Input
                        label="MRP"
                        placeholder="Enter MRP"
                        value={mrpInput}
                        onChangeText={(text) => {
                            setMrpInput(text);
                            const num = parseFloat(text) || 0;
                            handleInputChange('mrp', num);
                        }}
                        keyboardType="decimal-pad"
                        error={errors.mrp}
                        required
                    />

                    <Input
                        label="Selling Price"
                        placeholder="Enter selling price"
                        value={sellingPriceInput}
                        onChangeText={(text) => {
                            setSellingPriceInput(text);
                            const num = parseFloat(text) || 0;
                            handleInputChange('sellingPrice', num);
                        }}
                        keyboardType="decimal-pad"
                        error={errors.sellingPrice}
                        required
                    />

                    <Input
                        label="Minimum Stock Level"
                        placeholder="Enter minimum stock level"
                        value={formData.minStockLevel.toString()}
                        onChangeText={(text) => handleInputChange('minStockLevel', parseInt(text) || 0)}
                        keyboardType="numeric"
                    />

                    <Input
                        label="Maximum Stock Level"
                        placeholder="Enter maximum stock level"
                        value={formData.maxStockLevel.toString()}
                        onChangeText={(text) => handleInputChange('maxStockLevel', parseInt(text) || 0)}
                        keyboardType="numeric"
                    />

                    <SearchableDropdown
                        label="Brand"
                        placeholder="Select a brand"
                        value={formData.brand}
                        onSelect={(value) => handleInputChange('brand', value)}
                        options={brands}
                        optionLabelKey="name"
                        optionValueKey="name"
                        loading={brandsLoading}
                        searchPlaceholder="Search brands..."
                        emptyMessage="No brands available. Please create a brand first in admin settings."
                    />

                    <SearchableDropdown
                        label="Unit"
                        placeholder="Select a unit"
                        value={formData.unit}
                        onSelect={(value) => handleInputChange('unit', value)}
                        options={units}
                        optionLabelKey="name"
                        optionValueKey="value"
                        searchPlaceholder="Search units..."
                        emptyMessage="No units available"
                    />

                    <Button
                        title={productId ? 'Update Product' : 'Create Product'}
                        onPress={handleSubmit}
                        variant="primary"
                        size="lg"
                        fullWidth
                        loading={isLoading}
                        style={styles.submitButton}
                    />
                </View>
            </ScrollView>

            {/* Barcode Scanner Modal */}
            <Modal
                visible={showBarcodeScanner}
                animationType="slide"
                presentationStyle="fullScreen"
            >
                <HighQualityBarcodeScanner
                    onScan={handleBarcodeScan}
                    onClose={handleCloseBarcodeScanner}
                />
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: 16,
    },
    submitButton: {
        marginTop: 24,
    },
    categorySection: {
        marginBottom: 16,
    },
    categoryLabel: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 8,
    },
    categoryGridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginRight: -8,
    },
    categoryChip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        minWidth: 80,
        alignItems: 'center',
        marginRight: 8,
        marginBottom: 8,
    },
    categoryChipText: {
        fontSize: 14,
        fontWeight: '500',
    },
    categoryList: {
        maxHeight: 300,
    },
    categoryItem: {
        padding: 12,
        borderBottomWidth: 1,
    },
    categoryItemText: {
        fontSize: 16,
    },
});

export default ProductFormScreen;