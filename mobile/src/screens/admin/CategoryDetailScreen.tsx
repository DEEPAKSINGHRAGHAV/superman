import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    RefreshControl
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { useTheme } from '../../contexts/ThemeContext';
import { RootStackParamList, Category } from '../../types';
import { SCREEN_NAMES } from '../../constants';
import { Card } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import api from '../../services/api';

type CategoryDetailNavigationProp = StackNavigationProp<RootStackParamList>;
type CategoryDetailRouteProp = RouteProp<RootStackParamList, 'CategoryDetail'>;

const CategoryDetailScreen: React.FC = () => {
    const navigation = useNavigation<CategoryDetailNavigationProp>();
    const route = useRoute<CategoryDetailRouteProp>();
    const { theme, isDark } = useTheme();

    const { categoryId } = route.params;
    const [category, setCategory] = useState<Category | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Set up navigation header with edit button
    React.useLayoutEffect(() => {
        if (category) {
            navigation.setOptions({
                headerRight: () => (
                    <TouchableOpacity
                        onPress={() => navigation.navigate(SCREEN_NAMES.CATEGORY_FORM as any, { categoryId: category._id })}
                        style={{
                            marginRight: 12,
                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                            borderRadius: 8,
                            padding: 8,
                            borderWidth: 1,
                            borderColor: 'rgba(255, 255, 255, 0.3)',
                        }}
                        activeOpacity={0.7}
                    >
                        <Icon name="edit" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                ),
            });
        }
    }, [navigation, category]);

    const loadCategory = async () => {
        try {
            setLoading(true);
            const response = await api.getCategory(categoryId);
            setCategory(response.data);
        } catch (error) {
            console.error('Error loading category:', error);
            Alert.alert('Error', 'Failed to load category details');
            navigation.goBack();
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadCategory();
    };

    const handleToggleStatus = async () => {
        if (!category) return;

        try {
            await api.toggleCategoryStatus(categoryId);
            setCategory(prev => prev ? { ...prev, isActive: !prev.isActive } : null);
            Alert.alert('Success', `Category ${category.isActive ? 'deactivated' : 'activated'} successfully`);
        } catch (error) {
            console.error('Error toggling category status:', error);
            Alert.alert('Error', 'Failed to update category status');
        }
    };

    const handleToggleFeatured = async () => {
        if (!category) return;

        try {
            await api.toggleCategoryFeatured(categoryId);
            setCategory(prev => prev ? { ...prev, isFeatured: !prev.isFeatured } : null);
            Alert.alert('Success', `Category ${category.isFeatured ? 'unfeatured' : 'featured'} successfully`);
        } catch (error) {
            console.error('Error toggling category featured status:', error);
            Alert.alert('Error', 'Failed to update category featured status');
        }
    };

    const handleDelete = () => {
        if (!category) return;

        Alert.alert(
            'Delete Category',
            `Are you sure you want to delete "${category.name}"? This action cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await api.deleteCategory(categoryId);
                            Alert.alert('Success', 'Category deleted successfully');
                            navigation.goBack();
                        } catch (error) {
                            console.error('Error deleting category:', error);
                            Alert.alert('Error', 'Failed to delete category');
                        }
                    }
                }
            ]
        );
    };

    useEffect(() => {
        loadCategory();
    }, [categoryId]);

    const styles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.colors.background,
        },
        content: {
            flex: 1,
            padding: 16,
        },
        categoryHeader: {
            alignItems: 'center',
            marginBottom: 24,
        },
        categoryIcon: {
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: theme.colors.surface,
            marginBottom: 16,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 3,
        },
        categoryName: {
            fontSize: 24,
            fontWeight: 'bold',
            color: theme.colors.text,
            textAlign: 'center',
            marginBottom: 8,
        },
        categorySlug: {
            fontSize: 16,
            color: theme.colors.textSecondary,
            textAlign: 'center',
            fontFamily: 'monospace',
            marginBottom: 8,
        },
        statusContainer: {
            flexDirection: 'row',
            gap: 8,
            marginTop: 12,
        },
        statusBadge: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 16,
            gap: 4,
        },
        statusText: {
            fontSize: 12,
            color: '#FFFFFF',
            fontWeight: '500',
        },
        section: {
            marginBottom: 24,
        },
        sectionTitle: {
            fontSize: 18,
            fontWeight: '600',
            color: theme.colors.text,
            marginBottom: 12,
        },
        infoRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
        },
        infoLabel: {
            fontSize: 14,
            color: theme.colors.textSecondary,
            flex: 1,
        },
        infoValue: {
            fontSize: 14,
            color: theme.colors.text,
            flex: 2,
            textAlign: 'right',
        },
        description: {
            fontSize: 14,
            color: theme.colors.text,
            lineHeight: 20,
        },
        statsGrid: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 12,
        },
        statCard: {
            flex: 1,
            minWidth: '45%',
            alignItems: 'center',
            padding: 16,
            backgroundColor: theme.colors.surface,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: theme.colors.border,
        },
        statValue: {
            fontSize: 24,
            fontWeight: 'bold',
            color: theme.colors.primary,
            marginBottom: 4,
        },
        statLabel: {
            fontSize: 12,
            color: theme.colors.textSecondary,
            textAlign: 'center',
        },
        subcategoriesList: {
            marginTop: 12,
        },
        subcategoryItem: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 8,
            paddingHorizontal: 12,
            backgroundColor: theme.colors.surface,
            borderRadius: 8,
            marginBottom: 8,
        },
        subcategoryIcon: {
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: theme.colors.background,
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 12,
        },
        subcategoryName: {
            fontSize: 14,
            color: theme.colors.text,
            flex: 1,
        },
        subcategoryStats: {
            fontSize: 12,
            color: theme.colors.textSecondary,
        },
        actionButtons: {
            flexDirection: 'row',
            gap: 12,
            marginTop: 24,
        },
        primaryButton: {
            flex: 1,
            backgroundColor: theme.colors.primary,
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 8,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
        },
        secondaryButton: {
            flex: 1,
            backgroundColor: theme.colors.surface,
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: theme.colors.border,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
        },
        dangerButton: {
            flex: 1,
            backgroundColor: '#F44336',
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 8,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
        },
        buttonText: {
            color: '#FFFFFF',
            fontSize: 14,
            fontWeight: '500',
        },
        secondaryButtonText: {
            color: theme.colors.text,
            fontSize: 14,
            fontWeight: '500',
        },
        loadingContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
        },
    });

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <LoadingSpinner size="large" />
            </View>
        );
    }

    if (!category) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={{ color: theme.colors.text }}>Category not found</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView
                style={styles.content}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {/* Category Header */}
                <View style={styles.categoryHeader}>
                    <View style={[styles.categoryIcon, { borderColor: category.color || theme.colors.primary }]}>
                        <Icon
                            name={category.icon || 'category'}
                            size={32}
                            color={category.color || theme.colors.primary}
                        />
                    </View>
                    <Text style={styles.categoryName}>{category.name}</Text>
                    <Text style={styles.categorySlug}>/{category.slug}</Text>
                    <View style={styles.statusContainer}>
                        {category.isFeatured && (
                            <View style={[styles.statusBadge, { backgroundColor: '#FF9800' }]}>
                                <Icon name="star" size={12} color="#FFFFFF" />
                                <Text style={styles.statusText}>Featured</Text>
                            </View>
                        )}
                        <View style={[
                            styles.statusBadge,
                            { backgroundColor: category.isActive ? '#4CAF50' : '#F44336' }
                        ]}>
                            <Text style={styles.statusText}>
                                {category.isActive ? 'Active' : 'Inactive'}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Description */}
                {category.description && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Description</Text>
                        <Text style={styles.description}>{category.description}</Text>
                    </View>
                )}

                {/* Category Information */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Category Information</Text>
                    <Card>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Level</Text>
                            <Text style={styles.infoValue}>
                                {category.level === 0 ? 'Main Category' : 'Subcategory'}
                            </Text>
                        </View>
                        {category.parentCategory && (
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Parent Category</Text>
                                <Text style={styles.infoValue}>
                                    {(category.parentCategory as Category).name}
                                </Text>
                            </View>
                        )}
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Sort Order</Text>
                            <Text style={styles.infoValue}>{category.sortOrder}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Color</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <View style={{
                                    width: 20,
                                    height: 20,
                                    borderRadius: 10,
                                    backgroundColor: category.color || theme.colors.primary
                                }} />
                                <Text style={styles.infoValue}>{category.color || '#3B82F6'}</Text>
                            </View>
                        </View>
                    </Card>
                </View>

                {/* Statistics */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Statistics</Text>
                    <View style={styles.statsGrid}>
                        <View style={styles.statCard}>
                            <Text style={styles.statValue}>{category.productCount}</Text>
                            <Text style={styles.statLabel}>Products</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={styles.statValue}>{category.subcategoryCount}</Text>
                            <Text style={styles.statLabel}>Subcategories</Text>
                        </View>
                    </View>
                </View>

                {/* Subcategories */}
                {category.subcategories && category.subcategories.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Subcategories</Text>
                        <View style={styles.subcategoriesList}>
                            {category.subcategories.map((subcategory) => (
                                <TouchableOpacity
                                    key={subcategory._id}
                                    style={styles.subcategoryItem}
                                    onPress={() => navigation.navigate(SCREEN_NAMES.CATEGORY_DETAIL as any, { categoryId: subcategory._id })}
                                >
                                    <View style={[styles.subcategoryIcon, { backgroundColor: subcategory.color || theme.colors.primary }]}>
                                        <Icon
                                            name={subcategory.icon || 'category'}
                                            size={12}
                                            color="#FFFFFF"
                                        />
                                    </View>
                                    <Text style={styles.subcategoryName}>{subcategory.name}</Text>
                                    <Text style={styles.subcategoryStats}>
                                        {subcategory.productCount} products
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}

                {/* SEO Information */}
                {(category.metaTitle || category.metaDescription) && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>SEO Information</Text>
                        <Card>
                            {category.metaTitle && (
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Meta Title</Text>
                                    <Text style={styles.infoValue}>{category.metaTitle}</Text>
                                </View>
                            )}
                            {category.metaDescription && (
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Meta Description</Text>
                                    <Text style={styles.infoValue}>{category.metaDescription}</Text>
                                </View>
                            )}
                        </Card>
                    </View>
                )}

                {/* Additional Information */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Additional Information</Text>
                    <Card>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Created</Text>
                            <Text style={styles.infoValue}>
                                {new Date(category.createdAt).toLocaleDateString()}
                            </Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Last Updated</Text>
                            <Text style={styles.infoValue}>
                                {new Date(category.updatedAt).toLocaleDateString()}
                            </Text>
                        </View>
                    </Card>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={() => navigation.navigate(SCREEN_NAMES.CATEGORY_FORM as any, { categoryId: category._id })}
                    >
                        <Icon name="edit" size={16} color="#FFFFFF" />
                        <Text style={styles.buttonText}>Edit Category</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={handleToggleStatus}
                    >
                        <Icon
                            name={category.isActive ? 'pause' : 'play-arrow'}
                            size={16}
                            color={theme.colors.text}
                        />
                        <Text style={styles.secondaryButtonText}>
                            {category.isActive ? 'Deactivate' : 'Activate'}
                        </Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.actionButtons}>
                    <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={handleToggleFeatured}
                    >
                        <Icon
                            name={category.isFeatured ? 'star' : 'star-border'}
                            size={16}
                            color={theme.colors.text}
                        />
                        <Text style={styles.secondaryButtonText}>
                            {category.isFeatured ? 'Unfeature' : 'Feature'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.dangerButton}
                        onPress={handleDelete}
                    >
                        <Icon name="delete" size={16} color="#FFFFFF" />
                        <Text style={styles.buttonText}>Delete</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
};

export default CategoryDetailScreen;
