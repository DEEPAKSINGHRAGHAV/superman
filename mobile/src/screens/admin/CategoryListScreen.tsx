import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    Alert
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { useTheme } from '../../contexts/ThemeContext';
import { RootStackParamList, Category, CategoryFilters } from '../../types';
import { SCREEN_NAMES, COLORS, CATEGORY_ICONS } from '../../constants';
import { Card } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { SearchBar } from '../../components/SearchBar';
import { FilterChips } from '../../components/FilterChips';
import { EmptyState } from '../../components/EmptyState';
import apiService from '../../services/api';

type CategoryListNavigationProp = StackNavigationProp<RootStackParamList>;

const CategoryListScreen: React.FC = () => {
    const navigation = useNavigation<CategoryListNavigationProp>();
    const { theme, isDark } = useTheme();

    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState<CategoryFilters>({
        isActive: true,
        sortBy: 'sortOrder',
        sortOrder: 'asc'
    });
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    const loadCategories = async (pageNum = 1, reset = false) => {
        try {
            if (pageNum === 1) setLoading(true);

            const filterParams = {
                search: searchQuery || undefined,
                isActive: filters.isActive,
                level: filters.level,
                sortBy: filters.sortBy,
                sortOrder: filters.sortOrder
            };

            const response = await apiService.getCategories(filterParams, pageNum, 20);
            const newCategories = response.data;

            if (reset || pageNum === 1) {
                setCategories(newCategories);
            } else {
                setCategories(prev => [...prev, ...newCategories]);
            }

            setHasMore(newCategories.length === 20);
        } catch (error) {
            console.error('Error loading categories:', error);
            Alert.alert('Error', 'Failed to load categories');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        setPage(1);
        await loadCategories(1, true);
    };

    const onSearch = (query: string) => {
        setSearchQuery(query);
        setPage(1);
        loadCategories(1, true);
    };

    const onFilterChange = (newFilters: Partial<CategoryFilters>) => {
        setFilters(prev => ({ ...prev, ...newFilters }));
        setPage(1);
    };

    const loadMore = () => {
        if (!loading && hasMore) {
            const nextPage = page + 1;
            setPage(nextPage);
            loadCategories(nextPage);
        }
    };

    const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
        Alert.alert(
            'Delete Category',
            `Are you sure you want to delete "${categoryName}"? This action cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await apiService.deleteCategory(categoryId);
                            setCategories(prev => prev.filter(category => category._id !== categoryId));
                            Alert.alert('Success', 'Category deleted successfully');
                        } catch (error) {
                            console.error('Error deleting category:', error);
                            Alert.alert('Error', 'Failed to delete category');
                        }
                    }
                }
            ]
        );
    };

    const handleToggleStatus = async (categoryId: string, currentStatus: boolean) => {
        try {
            await apiService.toggleCategoryStatus(categoryId);
            setCategories(prev => prev.map(category =>
                category._id === categoryId
                    ? { ...category, isActive: !currentStatus }
                    : category
            ));
        } catch (error) {
            console.error('Error toggling category status:', error);
            Alert.alert('Error', 'Failed to update category status');
        }
    };

    const handleToggleFeatured = async (categoryId: string, currentFeatured: boolean) => {
        try {
            await apiService.toggleCategoryFeatured(categoryId);
            setCategories(prev => prev.map(category =>
                category._id === categoryId
                    ? { ...category, isFeatured: !currentFeatured }
                    : category
            ));
        } catch (error) {
            console.error('Error toggling category featured status:', error);
            Alert.alert('Error', 'Failed to update category featured status');
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadCategories(1, true);
        }, [searchQuery, filters])
    );

    const renderCategoryCard = ({ item }: { item: Category }) => (
        <Card style={styles.categoryCard}>
            <TouchableOpacity
                onPress={() => navigation.navigate(SCREEN_NAMES.CATEGORY_DETAIL as any, { categoryId: item._id })}
                activeOpacity={0.7}
            >
                <View style={styles.categoryHeader}>
                    <View style={styles.categoryInfo}>
                        <View style={styles.categoryIconContainer}>
                            <Icon
                                name={item.icon || 'category'}
                                size={24}
                                color={item.color || theme.colors.primary}
                            />
                        </View>
                        <View style={styles.categoryDetails}>
                            <Text style={styles.categoryName}>{item.name}</Text>
                            <Text style={styles.categorySlug}>/{item.slug}</Text>
                            {item.parentCategory && (
                                <Text style={styles.parentCategory}>
                                    Parent: {(item.parentCategory as Category).name}
                                </Text>
                            )}
                        </View>
                    </View>
                    <View style={styles.categoryStatus}>
                        {item.isFeatured && (
                            <View style={[styles.statusBadge, { backgroundColor: '#FF9800' }]}>
                                <Icon name="star" size={12} color="#FFFFFF" />
                                <Text style={styles.statusText}>Featured</Text>
                            </View>
                        )}
                        <View style={[
                            styles.statusBadge,
                            { backgroundColor: item.isActive ? '#4CAF50' : '#F44336' }
                        ]}>
                            <Text style={styles.statusText}>
                                {item.isActive ? 'Active' : 'Inactive'}
                            </Text>
                        </View>
                    </View>
                </View>

                {item.description && (
                    <Text style={styles.categoryDescription} numberOfLines={2}>
                        {item.description}
                    </Text>
                )}

                <View style={styles.categoryStats}>
                    <View style={styles.statItem}>
                        <Icon name="inventory" size={16} color={theme.colors.textSecondary} />
                        <Text style={styles.statText}>{item.productCount} products</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Icon name="category" size={16} color={theme.colors.textSecondary} />
                        <Text style={styles.statText}>{item.subcategoryCount} subcategories</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Icon name="sort" size={16} color={theme.colors.textSecondary} />
                        <Text style={styles.statText}>Order: {item.sortOrder}</Text>
                    </View>
                </View>

                <View style={styles.categoryActions}>
                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
                        onPress={() => navigation.navigate(SCREEN_NAMES.CATEGORY_FORM as any, { categoryId: item._id })}
                    >
                        <Icon name="edit" size={16} color="#FFFFFF" />
                        <Text style={styles.actionButtonText}>Edit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.actionButton,
                            { backgroundColor: item.isActive ? '#F44336' : '#4CAF50' }
                        ]}
                        onPress={() => handleToggleStatus(item._id, item.isActive)}
                    >
                        <Icon
                            name={item.isActive ? 'pause' : 'play-arrow'}
                            size={16}
                            color="#FFFFFF"
                        />
                        <Text style={styles.actionButtonText}>
                            {item.isActive ? 'Deactivate' : 'Activate'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.actionButton,
                            { backgroundColor: item.isFeatured ? '#FF9800' : '#9C27B0' }
                        ]}
                        onPress={() => handleToggleFeatured(item._id, item.isFeatured)}
                    >
                        <Icon
                            name={item.isFeatured ? 'star' : 'star-border'}
                            size={16}
                            color="#FFFFFF"
                        />
                        <Text style={styles.actionButtonText}>
                            {item.isFeatured ? 'Unfeature' : 'Feature'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: '#FF5722' }]}
                        onPress={() => handleDeleteCategory(item._id, item.name)}
                    >
                        <Icon name="delete" size={16} color="#FFFFFF" />
                        <Text style={styles.actionButtonText}>Delete</Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </Card>
    );

    const filterOptions = [
        { label: 'All', value: undefined },
        { label: 'Active', value: true },
        { label: 'Inactive', value: false }
    ];

    const levelOptions = [
        { label: 'All Levels', value: undefined },
        { label: 'Main Categories', value: 0 },
        { label: 'Subcategories', value: 1 }
    ];

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
        addButton: {
            backgroundColor: theme.colors.primary,
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 8,
            flexDirection: 'row',
            alignItems: 'center',
        },
        addButtonText: {
            color: '#FFFFFF',
            fontWeight: '600',
            marginLeft: 4,
        },
        content: {
            flex: 1,
            padding: 16,
        },
        searchContainer: {
            marginBottom: 16,
        },
        filtersContainer: {
            marginBottom: 16,
        },
        categoryCard: {
            marginBottom: 12,
            padding: 16,
        },
        categoryHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 8,
        },
        categoryInfo: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
        },
        categoryIconContainer: {
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: theme.colors.surface,
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 12,
        },
        categoryDetails: {
            flex: 1,
        },
        categoryName: {
            fontSize: 18,
            fontWeight: '600',
            color: theme.colors.text,
            marginBottom: 2,
        },
        categorySlug: {
            fontSize: 12,
            color: theme.colors.textSecondary,
            fontFamily: 'monospace',
        },
        parentCategory: {
            fontSize: 12,
            color: theme.colors.textSecondary,
            fontStyle: 'italic',
        },
        categoryStatus: {
            flexDirection: 'row',
            gap: 8,
        },
        statusBadge: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 12,
            gap: 4,
        },
        statusText: {
            fontSize: 12,
            color: '#FFFFFF',
            fontWeight: '500',
        },
        categoryDescription: {
            fontSize: 14,
            color: theme.colors.textSecondary,
            marginBottom: 12,
            lineHeight: 20,
        },
        categoryStats: {
            flexDirection: 'row',
            marginBottom: 16,
            gap: 16,
        },
        statItem: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
        },
        statText: {
            fontSize: 14,
            color: theme.colors.textSecondary,
        },
        categoryActions: {
            flexDirection: 'row',
            gap: 6,
        },
        actionButton: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 8,
            paddingHorizontal: 8,
            borderRadius: 6,
            gap: 4,
        },
        actionButtonText: {
            color: '#FFFFFF',
            fontSize: 11,
            fontWeight: '500',
        },
        loadingContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
        },
    });

    if (loading && categories.length === 0) {
        return (
            <View style={styles.loadingContainer}>
                <LoadingSpinner size="large" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Categories</Text>
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => navigation.navigate(SCREEN_NAMES.CATEGORY_FORM as any)}
                >
                    <Icon name="add" size={20} color="#FFFFFF" />
                    <Text style={styles.addButtonText}>Add Category</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                <View style={styles.searchContainer}>
                    <SearchBar
                        placeholder="Search categories..."
                        value={searchQuery}
                        onChangeText={onSearch}
                    />
                </View>

                <View style={styles.filtersContainer}>
                    <FilterChips
                        title="Status"
                        options={filterOptions}
                        selectedValue={filters.isActive}
                        onValueChange={(value) => onFilterChange({ isActive: value })}
                    />
                    <FilterChips
                        title="Level"
                        options={levelOptions}
                        selectedValue={filters.level}
                        onValueChange={(value) => onFilterChange({ level: value })}
                    />
                </View>

                <FlatList
                    data={categories}
                    renderItem={renderCategoryCard}
                    keyExtractor={(item) => item._id}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    onEndReached={loadMore}
                    onEndReachedThreshold={0.1}
                    ListEmptyComponent={
                        <EmptyState
                            icon="category"
                            title="No Categories Found"
                            message="No categories match your current filters. Try adjusting your search or filters."
                        />
                    }
                    showsVerticalScrollIndicator={false}
                />
            </View>
        </View>
    );
};

export default CategoryListScreen;
