import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    Alert,
    ScrollView,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { useTheme } from '../../contexts/ThemeContext';
import { RootStackParamList, Category, CategoryFilters } from '../../types';
import { SCREEN_NAMES, COLORS, CATEGORY_ICONS } from '../../constants';
import { Card } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { SkeletonList } from '../../components/ui/SkeletonLoader';
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
    const [isSearching, setIsSearching] = useState(false);
    const [totalResults, setTotalResults] = useState(0);
    const [initialLoading, setInitialLoading] = useState(true);

    const loadCategories = async (pageNum = 1, reset = false, customSearch?: string | null) => {
        try {
            if (pageNum === 1 && categories.length > 0) {
                setIsSearching(true);
            }

            const searchTerm = customSearch !== undefined && customSearch !== null ? customSearch : searchQuery;

            const filterParams = {
                search: searchTerm || undefined,
                isActive: filters.isActive,
                level: filters.level,
                sortBy: filters.sortBy,
                sortOrder: filters.sortOrder
            };

            const response = await apiService.getCategories(filterParams, pageNum, 20);
            const newCategories = response.data;

            if (reset || pageNum === 1) {
                setCategories(newCategories);
                setTotalResults(newCategories.length);
            } else {
                setCategories(prev => [...prev, ...newCategories]);
                setTotalResults(prev => prev + newCategories.length);
            }

            setHasMore(newCategories.length === 20);

            if (initialLoading) {
                setInitialLoading(false);
            }
        } catch (error) {
            console.error('Error loading categories:', error);
            Alert.alert('Error', 'Failed to load categories');
        } finally {
            setLoading(false);
            setRefreshing(false);
            setIsSearching(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        setPage(1);
        await loadCategories(1, true);
    };

    const searchTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    const onSearch = (query: string) => {
        setSearchQuery(query);

        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        searchTimeoutRef.current = setTimeout(() => {
            setPage(1);
            loadCategories(1, true);
        }, 400);
    };

    const onClearSearch = () => {
        setSearchQuery('');

        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        setPage(1);
        loadCategories(1, true, '');
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
        }, [filters.isActive, filters.level, filters.sortBy, filters.sortOrder])
    );

    const renderCategoryCard = ({ item }: { item: Category }) => (
        <Card style={styles.categoryCard}>
            <TouchableOpacity
                onPress={() => navigation.navigate(SCREEN_NAMES.CATEGORY_DETAIL as any, { categoryId: item._id })}
                activeOpacity={0.7}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.categoryTitleRow}>
                        <View style={styles.categoryIconContainer}>
                            <Icon
                                name={item.icon || 'category'}
                                size={24}
                                color={item.color || theme.colors.primary[500]}
                            />
                        </View>
                        <View style={styles.categoryMainInfo}>
                            <Text style={styles.categoryName}>{item.name}</Text>
                            <Text style={styles.categorySlug}>/{item.slug}</Text>
                        </View>
                        <View style={styles.statusContainer}>
                            {item.isFeatured && (
                                <View style={styles.featuredBadge}>
                                    <Icon name="star" size={16} color="#FF9800" />
                                </View>
                            )}
                            <View style={[
                                styles.statusIndicator,
                                { backgroundColor: item.isActive ? '#E8F5E9' : '#FFEBEE' }
                            ]}>
                                <View style={[
                                    styles.statusDot,
                                    { backgroundColor: item.isActive ? '#4CAF50' : '#F44336' }
                                ]} />
                            </View>
                        </View>
                    </View>
                </View>

                {item.parentCategory && (
                    <Text style={styles.parentCategory}>
                        📁 {(item.parentCategory as Category).name}
                    </Text>
                )}

                {item.description && (
                    <Text style={styles.categoryDescription} numberOfLines={2}>
                        {item.description}
                    </Text>
                )}

                <View style={styles.statsRow}>
                    <View style={styles.statBox}>
                        <Icon name="inventory-2" size={18} color={theme.colors.primary[500]} />
                        <Text style={styles.statValue}>{item.productCount}</Text>
                        <Text style={styles.statLabel}>Products</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Icon name="category" size={18} color={theme.colors.secondary[500]} />
                        <Text style={styles.statValue}>{item.subcategoryCount}</Text>
                        <Text style={styles.statLabel}>Subcategories</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Icon name="sort" size={18} color={theme.colors.textSecondary} />
                        <Text style={styles.statValue}>{item.sortOrder}</Text>
                        <Text style={styles.statLabel}>Order</Text>
                    </View>
                </View>

                <View style={styles.actionRow}>
                    <TouchableOpacity
                        style={styles.quickAction}
                        onPress={(e) => {
                            e.stopPropagation();
                            navigation.navigate(SCREEN_NAMES.CATEGORY_FORM as any, { categoryId: item._id });
                        }}
                        activeOpacity={0.7}
                    >
                        <Icon name="edit" size={20} color={theme.colors.primary[500]} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.quickAction}
                        onPress={(e) => {
                            e.stopPropagation();
                            handleToggleStatus(item._id, item.isActive);
                        }}
                        activeOpacity={0.7}
                    >
                        <Icon
                            name={item.isActive ? 'toggle-on' : 'toggle-off'}
                            size={20}
                            color={item.isActive ? '#4CAF50' : '#9E9E9E'}
                        />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.quickAction}
                        onPress={(e) => {
                            e.stopPropagation();
                            handleToggleFeatured(item._id, item.isFeatured);
                        }}
                        activeOpacity={0.7}
                    >
                        <Icon
                            name={item.isFeatured ? 'star' : 'star-border'}
                            size={20}
                            color={item.isFeatured ? '#FF9800' : '#9E9E9E'}
                        />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.quickAction}
                        onPress={(e) => {
                            e.stopPropagation();
                            handleDeleteCategory(item._id, item.name);
                        }}
                        activeOpacity={0.7}
                    >
                        <Icon name="delete-outline" size={20} color="#F44336" />
                    </TouchableOpacity>

                    <View style={{ flex: 1 }} />

                    <TouchableOpacity
                        style={styles.viewDetailsButton}
                        onPress={() => navigation.navigate(SCREEN_NAMES.CATEGORY_DETAIL as any, { categoryId: item._id })}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.viewDetailsText} numberOfLines={1}>Detail</Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </Card>
    );

    /* FILTER OPTIONS - Keep for future use
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

    const getActiveFilterCount = () => {
        let count = 0;
        if (filters.isActive !== undefined) count++;
        if (filters.level !== undefined) count++;
        return count;
    };
    */

    const clearAllFilters = () => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        setSearchQuery('');
        setFilters({
            isActive: undefined,
            level: undefined,
            sortBy: 'sortOrder',
            sortOrder: 'asc'
        });
        setPage(1);

        loadCategories(1, true, '');
    };

    const toggleSort = (field: 'name' | 'sortOrder' | 'createdAt') => {
        if (filters.sortBy === field) {
            onFilterChange({ sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc' });
        } else {
            onFilterChange({ sortBy: field, sortOrder: 'asc' });
        }
    };

    // const activeFilterCount = getActiveFilterCount(); // Commented out with filters
    const hasActiveSearch = searchQuery.length > 0; // Only check search now

    const styles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.colors.background,
        },
        headerSection: {
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 8,
            backgroundColor: theme.colors.background,
        },
        searchContainer: {
            marginBottom: 12,
        },
        filterSection: {
            marginBottom: 8,
        },
        sortSection: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: 8,
            paddingHorizontal: 4,
        },
        sortLabel: {
            fontSize: 14,
            fontWeight: '500',
            color: theme.colors.text,
        },
        sortButtons: {
            flexDirection: 'row',
            gap: 8,
        },
        sortButton: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.surface,
        },
        sortButtonActive: {
            backgroundColor: theme.colors.primary[500],
            borderColor: theme.colors.primary[500],
        },
        sortButtonText: {
            fontSize: 13,
            color: theme.colors.text,
            marginRight: 4,
        },
        sortButtonTextActive: {
            color: '#FFFFFF',
        },
        activeFiltersContainer: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
            marginTop: 8,
        },
        activeFilterChip: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.colors.primary[500],
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 16,
            gap: 4,
        },
        activeFilterText: {
            fontSize: 12,
            color: '#FFFFFF',
            fontWeight: '500',
        },
        listContainer: {
            paddingHorizontal: 16,
            paddingBottom: 100,
        },
        categoryCard: {
            marginBottom: 16,
            padding: 16,
            elevation: 2,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
        },
        cardHeader: {
            marginBottom: 12,
        },
        categoryTitleRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
        },
        categoryIconContainer: {
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: theme.colors.surface,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 2,
            borderColor: theme.colors.border,
        },
        categoryMainInfo: {
            flex: 1,
        },
        categoryName: {
            fontSize: 18,
            fontWeight: '700',
            color: theme.colors.text,
            marginBottom: 4,
        },
        categorySlug: {
            fontSize: 11,
            color: theme.colors.textSecondary,
            fontFamily: 'monospace',
            fontWeight: '600',
        },
        statusContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
        },
        featuredBadge: {
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: '#FFF3E0',
            justifyContent: 'center',
            alignItems: 'center',
        },
        statusIndicator: {
            width: 40,
            height: 40,
            borderRadius: 20,
            justifyContent: 'center',
            alignItems: 'center',
        },
        statusDot: {
            width: 12,
            height: 12,
            borderRadius: 6,
        },
        parentCategory: {
            fontSize: 12,
            color: theme.colors.textSecondary,
            marginBottom: 8,
        },
        categoryDescription: {
            fontSize: 14,
            color: theme.colors.textSecondary,
            lineHeight: 20,
            marginBottom: 16,
        },
        statsRow: {
            flexDirection: 'row',
            backgroundColor: theme.colors.surface,
            borderRadius: 12,
            padding: 12,
            marginBottom: 12,
            gap: 8,
        },
        statBox: {
            flex: 1,
            alignItems: 'center',
            gap: 4,
        },
        statValue: {
            fontSize: 16,
            fontWeight: '700',
            color: theme.colors.text,
        },
        statLabel: {
            fontSize: 11,
            color: theme.colors.textSecondary,
            textAlign: 'center',
        },
        actionRow: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
            gap: 12,
        },
        quickAction: {
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: theme.colors.surface,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: theme.colors.border,
        },
        viewDetailsButton: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.colors.surface,
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: theme.colors.primary[500],
            flexShrink: 1,
            minWidth: 70,
        },
        viewDetailsText: {
            fontSize: 13,
            fontWeight: '600',
            color: theme.colors.primary[500],
            flexShrink: 1,
        },
        loadingContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
        },
        loadingOverlay: {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 10,
        },
        loadingCard: {
            backgroundColor: theme.colors.surface,
            paddingVertical: 24,
            paddingHorizontal: 32,
            borderRadius: 16,
            alignItems: 'center',
            elevation: 4,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 8,
        },
        loadingText: {
            marginTop: 12,
            fontSize: 14,
            fontWeight: '500',
        },
        fab: {
            position: 'absolute',
            right: 20,
            bottom: 20,
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: theme.colors.primary[500],
            justifyContent: 'center',
            alignItems: 'center',
            elevation: 8,
            shadowColor: theme.colors.primary[500],
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
        },
    });

    return (
        <View style={styles.container}>
            <View style={styles.headerSection}>
                <View style={styles.searchContainer}>
                    <SearchBar
                        placeholder="Search categories..."
                        value={searchQuery}
                        onChangeText={onSearch}
                        onClear={onClearSearch}
                        resultCount={hasActiveSearch ? totalResults : undefined}
                    />
                </View>

                {/* FILTERS COMMENTED OUT - Keep for future use
                <View style={styles.filterSection}>
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
                */}

                <View style={styles.sortSection}>
                    <Text style={styles.sortLabel}>Sort by:</Text>
                    <View style={styles.sortButtons}>
                        <TouchableOpacity
                            style={[
                                styles.sortButton,
                                filters.sortBy === 'name' && styles.sortButtonActive
                            ]}
                            onPress={() => toggleSort('name')}
                            activeOpacity={0.7}
                        >
                            <Text style={[
                                styles.sortButtonText,
                                filters.sortBy === 'name' && styles.sortButtonTextActive
                            ]}>
                                Name
                            </Text>
                            {filters.sortBy === 'name' && (
                                <Icon
                                    name={filters.sortOrder === 'asc' ? 'arrow-upward' : 'arrow-downward'}
                                    size={14}
                                    color="#FFFFFF"
                                />
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.sortButton,
                                filters.sortBy === 'sortOrder' && styles.sortButtonActive
                            ]}
                            onPress={() => toggleSort('sortOrder')}
                            activeOpacity={0.7}
                        >
                            <Text style={[
                                styles.sortButtonText,
                                filters.sortBy === 'sortOrder' && styles.sortButtonTextActive
                            ]}>
                                Order
                            </Text>
                            {filters.sortBy === 'sortOrder' && (
                                <Icon
                                    name={filters.sortOrder === 'asc' ? 'arrow-upward' : 'arrow-downward'}
                                    size={14}
                                    color="#FFFFFF"
                                />
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                {hasActiveSearch && (
                    <View style={styles.activeFiltersContainer}>
                        <TouchableOpacity
                            style={styles.activeFilterChip}
                            onPress={clearAllFilters}
                            activeOpacity={0.7}
                        >
                            <Icon name="clear-all" size={14} color="#FFFFFF" />
                            <Text style={styles.activeFilterText}>Clear All</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            <View style={{ flex: 1, position: 'relative' }}>
                {initialLoading ? (
                    <View style={styles.loadingContainer}>
                        <LoadingSpinner size="lg" />
                    </View>
                ) : (
                    <>
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
                                    subtitle={searchQuery
                                        ? `No categories found matching "${searchQuery}"`
                                        : "No categories match your filters. Try adjusting them."
                                    }
                                />
                            }
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.listContainer}
                            keyboardShouldPersistTaps="handled"
                            keyboardDismissMode="on-drag"
                        />

                        {isSearching && (
                            <View style={styles.loadingOverlay}>
                                <View style={styles.loadingCard}>
                                    <LoadingSpinner size="md" />
                                    <Text style={[styles.loadingText, { color: theme.colors.text }]}>
                                        Searching categories...
                                    </Text>
                                </View>
                            </View>
                        )}
                    </>
                )}
            </View>

            <TouchableOpacity
                style={styles.fab}
                onPress={() => navigation.navigate(SCREEN_NAMES.CATEGORY_FORM as any)}
                activeOpacity={0.8}
            >
                <Icon name="add" size={28} color="#FFFFFF" />
            </TouchableOpacity>
        </View>
    );
};

export default CategoryListScreen;
