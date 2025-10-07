import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { useTheme } from '../../contexts/ThemeContext';
import { RootStackParamList, Category, CategoryFormData } from '../../types';
import { SCREEN_NAMES, CATEGORY_ICONS } from '../../constants';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { api } from '../../services/api';

type CategoryFormNavigationProp = StackNavigationProp<RootStackParamList>;
type CategoryFormRouteProp = RouteProp<RootStackParamList, 'CategoryForm'>;

const CategoryFormScreen: React.FC = () => {
    const navigation = useNavigation<CategoryFormNavigationProp>();
    const route = useRoute<CategoryFormRouteProp>();
    const { theme, isDark } = useTheme();
    
    const { categoryId, parentCategoryId } = route.params || {};
    const isEditing = !!categoryId;
    const isSubcategory = !!parentCategoryId;

    const [formData, setFormData] = useState<CategoryFormData>({
        name: '',
        slug: '',
        description: '',
        icon: 'category',
        color: '#3B82F6',
        image: '',
        parentCategory: parentCategoryId,
        sortOrder: 0,
        metaTitle: '',
        metaDescription: '',
        keywords: []
    });

    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(isEditing);
    const [errors, setErrors] = useState<Partial<CategoryFormData>>({});
    const [parentCategories, setParentCategories] = useState<Category[]>([]);

    useEffect(() => {
        if (isEditing) {
            loadCategory();
        }
        loadParentCategories();
    }, [categoryId]);

    const loadCategory = async () => {
        try {
            setInitialLoading(true);
            const response = await api.get(`/categories/${categoryId}`);
            const category: Category = response.data.data;
            
            setFormData({
                name: category.name,
                slug: category.slug,
                description: category.description || '',
                icon: category.icon || 'category',
                color: category.color || '#3B82F6',
                image: category.image || '',
                parentCategory: category.parentCategory ? (category.parentCategory as Category)._id : undefined,
                sortOrder: category.sortOrder,
                metaTitle: category.metaTitle || '',
                metaDescription: category.metaDescription || '',
                keywords: category.keywords || []
            });
        } catch (error) {
            console.error('Error loading category:', error);
            Alert.alert('Error', 'Failed to load category details');
            navigation.goBack();
        } finally {
            setInitialLoading(false);
        }
    };

    const loadParentCategories = async () => {
        try {
            const response = await api.get('/categories/main');
            setParentCategories(response.data.data);
        } catch (error) {
            console.error('Error loading parent categories:', error);
        }
    };

    const validateForm = (): boolean => {
        const newErrors: Partial<CategoryFormData> = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Category name is required';
        } else if (formData.name.trim().length < 2) {
            newErrors.name = 'Category name must be at least 2 characters';
        }

        if (formData.slug && !/^[a-z0-9-]+$/.test(formData.slug)) {
            newErrors.slug = 'Slug can only contain lowercase letters, numbers, and hyphens';
        }

        if (formData.color && !/^#[0-9A-F]{6}$/i.test(formData.color)) {
            newErrors.color = 'Please enter a valid hex color code';
        }

        if (formData.image && !/^https?:\/\/.+/.test(formData.image)) {
            newErrors.image = 'Please enter a valid image URL';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) {
            return;
        }

        try {
            setLoading(true);
            
            const submitData = {
                ...formData,
                name: formData.name.trim(),
                slug: formData.slug?.trim() || undefined,
                description: formData.description?.trim() || undefined,
                image: formData.image?.trim() || undefined,
                metaTitle: formData.metaTitle?.trim() || undefined,
                metaDescription: formData.metaDescription?.trim() || undefined,
                keywords: formData.keywords?.filter(k => k.trim()) || []
            };

            if (isEditing) {
                await api.put(`/categories/${categoryId}`, submitData);
                Alert.alert('Success', 'Category updated successfully');
            } else {
                await api.post('/categories', submitData);
                Alert.alert('Success', 'Category created successfully');
            }

            navigation.goBack();
        } catch (error: any) {
            console.error('Error saving category:', error);
            const errorMessage = error.response?.data?.message || 'Failed to save category';
            Alert.alert('Error', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (field: keyof CategoryFormData, value: string | number | string[]) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };

    const generateSlug = (name: string) => {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim('-');
    };

    const styles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.colors.background,
        },
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 16,
            backgroundColor: theme.colors.surface,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
        },
        headerTitle: {
            fontSize: 20,
            fontWeight: 'bold',
            color: theme.colors.text,
        },
        backButton: {
            padding: 8,
        },
        content: {
            flex: 1,
            padding: 16,
        },
        form: {
            flex: 1,
        },
        section: {
            marginBottom: 24,
        },
        sectionTitle: {
            fontSize: 18,
            fontWeight: '600',
            color: theme.colors.text,
            marginBottom: 16,
        },
        inputRow: {
            flexDirection: 'row',
            gap: 12,
        },
        inputHalf: {
            flex: 1,
        },
        iconContainer: {
            marginBottom: 16,
        },
        iconTitle: {
            fontSize: 16,
            fontWeight: '500',
            color: theme.colors.text,
            marginBottom: 8,
        },
        iconGrid: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
        },
        iconChip: {
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: theme.colors.border,
        },
        iconChipSelected: {
            backgroundColor: theme.colors.primary,
            borderColor: theme.colors.primary,
        },
        iconChipText: {
            fontSize: 12,
            color: theme.colors.text,
        },
        iconChipTextSelected: {
            color: '#FFFFFF',
        },
        colorContainer: {
            marginBottom: 16,
        },
        colorTitle: {
            fontSize: 16,
            fontWeight: '500',
            color: theme.colors.text,
            marginBottom: 8,
        },
        colorRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
        },
        colorPreview: {
            width: 40,
            height: 40,
            borderRadius: 20,
            borderWidth: 2,
            borderColor: theme.colors.border,
        },
        parentCategoryContainer: {
            marginBottom: 16,
        },
        parentCategoryTitle: {
            fontSize: 16,
            fontWeight: '500',
            color: theme.colors.text,
            marginBottom: 8,
        },
        parentCategoryPicker: {
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: 8,
            padding: 12,
            backgroundColor: theme.colors.surface,
        },
        parentCategoryText: {
            fontSize: 16,
            color: theme.colors.text,
        },
        parentCategoryPlaceholder: {
            fontSize: 16,
            color: theme.colors.textSecondary,
        },
        buttonContainer: {
            paddingTop: 16,
            paddingBottom: 32,
        },
        loadingContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
        },
    });

    if (initialLoading) {
        return (
            <View style={styles.loadingContainer}>
                <LoadingSpinner size="large" />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView 
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Icon name="arrow-back" size={24} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                    {isEditing ? 'Edit Category' : isSubcategory ? 'Add Subcategory' : 'Add Category'}
                </Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.content}>
                <View style={styles.form}>
                    {/* Basic Information */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Basic Information</Text>
                        
                        <Input
                            label="Category Name *"
                            value={formData.name}
                            onChangeText={(value) => {
                                handleInputChange('name', value);
                                if (!formData.slug) {
                                    handleInputChange('slug', generateSlug(value));
                                }
                            }}
                            error={errors.name}
                            placeholder="Enter category name"
                            style={{ marginBottom: 16 }}
                        />

                        <Input
                            label="Slug"
                            value={formData.slug}
                            onChangeText={(value) => handleInputChange('slug', value)}
                            error={errors.slug}
                            placeholder="category-slug"
                            style={{ marginBottom: 16 }}
                        />

                        <Input
                            label="Description"
                            value={formData.description}
                            onChangeText={(value) => handleInputChange('description', value)}
                            error={errors.description}
                            placeholder="Enter category description"
                            multiline
                            numberOfLines={3}
                            style={{ marginBottom: 16 }}
                        />

                        <View style={styles.inputRow}>
                            <View style={styles.inputHalf}>
                                <Input
                                    label="Sort Order"
                                    value={formData.sortOrder?.toString() || '0'}
                                    onChangeText={(value) => handleInputChange('sortOrder', parseInt(value) || 0)}
                                    error={errors.sortOrder}
                                    placeholder="0"
                                    keyboardType="numeric"
                                />
                            </View>
                            <View style={styles.inputHalf}>
                                <Input
                                    label="Image URL"
                                    value={formData.image}
                                    onChangeText={(value) => handleInputChange('image', value)}
                                    error={errors.image}
                                    placeholder="https://example.com/image.jpg"
                                    keyboardType="url"
                                />
                            </View>
                        </View>
                    </View>

                    {/* Visual Settings */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Visual Settings</Text>
                        
                        <View style={styles.iconContainer}>
                            <Text style={styles.iconTitle}>Icon</Text>
                            <View style={styles.iconGrid}>
                                {CATEGORY_ICONS.slice(0, 12).map((icon) => (
                                    <TouchableOpacity
                                        key={icon}
                                        style={[
                                            styles.iconChip,
                                            formData.icon === icon && styles.iconChipSelected
                                        ]}
                                        onPress={() => handleInputChange('icon', icon)}
                                    >
                                        <Text style={[
                                            styles.iconChipText,
                                            formData.icon === icon && styles.iconChipTextSelected
                                        ]}>
                                            {icon}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View style={styles.colorContainer}>
                            <Text style={styles.colorTitle}>Color</Text>
                            <View style={styles.colorRow}>
                                <View style={[styles.colorPreview, { backgroundColor: formData.color }]} />
                                <Input
                                    value={formData.color}
                                    onChangeText={(value) => handleInputChange('color', value)}
                                    error={errors.color}
                                    placeholder="#3B82F6"
                                    style={{ flex: 1 }}
                                />
                            </View>
                        </View>
                    </View>

                    {/* Parent Category */}
                    {!isSubcategory && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Parent Category</Text>
                            <View style={styles.parentCategoryContainer}>
                                <Text style={styles.parentCategoryTitle}>Parent Category (Optional)</Text>
                                <TouchableOpacity
                                    style={styles.parentCategoryPicker}
                                    onPress={() => {
                                        // TODO: Implement category picker modal
                                        Alert.alert('Coming Soon', 'Category picker will be available soon');
                                    }}
                                >
                                    <Text style={
                                        formData.parentCategory 
                                            ? styles.parentCategoryText 
                                            : styles.parentCategoryPlaceholder
                                    }>
                                        {formData.parentCategory 
                                            ? parentCategories.find(cat => cat._id === formData.parentCategory)?.name || 'Select parent category'
                                            : 'Select parent category (optional)'
                                        }
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {/* SEO Settings */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>SEO Settings</Text>
                        
                        <Input
                            label="Meta Title"
                            value={formData.metaTitle}
                            onChangeText={(value) => handleInputChange('metaTitle', value)}
                            error={errors.metaTitle}
                            placeholder="SEO title for search engines"
                            style={{ marginBottom: 16 }}
                        />

                        <Input
                            label="Meta Description"
                            value={formData.metaDescription}
                            onChangeText={(value) => handleInputChange('metaDescription', value)}
                            error={errors.metaDescription}
                            placeholder="SEO description for search engines"
                            multiline
                            numberOfLines={2}
                            style={{ marginBottom: 16 }}
                        />
                    </View>
                </View>
            </ScrollView>

            <View style={styles.buttonContainer}>
                <Button
                    title={isEditing ? 'Update Category' : 'Create Category'}
                    onPress={handleSubmit}
                    loading={loading}
                    disabled={loading}
                />
            </View>
        </KeyboardAvoidingView>
    );
};

export default CategoryFormScreen;
