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
import { useAuth } from '../../contexts/AuthContext';
import { RootStackParamList, Brand, BrandFilters } from '../../types';
import { SCREEN_NAMES, COLORS, BRAND_CATEGORIES } from '../../constants';
import { Card } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { SkeletonList } from '../../components/ui/SkeletonLoader';
import { SearchBar } from '../../components/SearchBar';
import { FilterChips } from '../../components/FilterChips';
import { EmptyState } from '../../components/EmptyState';
import apiService from '../../services/api';

type BrandListNavigationProp = StackNavigationProp<RootStackParamList>;

const BrandListScreen: React.FC = () => {
    const navigation = useNavigation<BrandListNavigationProp>();
    const { theme, isDark } = useTheme();
    const { user } = useAuth();
    const [brands, setBrands] = useState<Brand[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState<BrandFilters>({
        isActive: undefined,
        sortBy: 'name',
        sortOrder: 'asc'
    });
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isSearching, setIsSearching] = useState(false);
    const [totalResults, setTotalResults] = useState(0);
    const [initialLoading, setInitialLoading] = useState(true);

    const loadBrands = async (pageNum = 1, reset = false, customSearch?: string | null) => {
        try {
            // Only show searching indicator if we already have data
            if (pageNum === 1 && brands.length > 0) {
                setIsSearching(true);
            }

            // Use custom search if provided, otherwise use state
            const searchTerm = customSearch !== undefined && customSearch !== null ? customSearch : searchQuery;

            const filterParams = {
                search: searchTerm || undefined,
                isActive: filters.isActive,
                category: filters.category,
                sortBy: filters.sortBy,
                sortOrder: filters.sortOrder
            };

            const response = await apiService.getBrands(filterParams, pageNum, 20);
            const newBrands = response.data;

            if (reset || pageNum === 1) {
                setBrands(newBrands);
                setTotalResults(newBrands.length);
            } else {
                setBrands(prev => [...prev, ...newBrands]);
                setTotalResults(prev => prev + newBrands.length);
            }

            setHasMore(newBrands.length === 20);

            // After first successful load, mark initial loading as complete
            if (initialLoading) {
                setInitialLoading(false);
            }
        } catch (error) {
            console.error('Error loading brands:', error);
            Alert.alert('Error', 'Failed to load brands');
        } finally {
            setLoading(false);
            setRefreshing(false);
            setIsSearching(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        setPage(1);
        await loadBrands(1, true);
    };

    const searchTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    const onSearch = (query: string) => {
        setSearchQuery(query);

        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        // Optimized debounce for better perceived performance
        searchTimeoutRef.current = setTimeout(() => {
            setPage(1);
            loadBrands(1, true);
        }, 400);
    };

    const onClearSearch = () => {
        setSearchQuery('');

        // Clear any pending search
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        // Immediately reload with empty search (pass '' explicitly to override state)
        setPage(1);
        loadBrands(1, true, '');
    };

    const onFilterChange = (newFilters: Partial<BrandFilters>) => {
        setFilters(prev => ({ ...prev, ...newFilters }));
        setPage(1);
    };

    const loadMore = () => {
        if (!loading && hasMore) {
            const nextPage = page + 1;
            setPage(nextPage);
            loadBrands(nextPage);
        }
    };

    const handleDeleteBrand = async (brandId: string, brandName: string) => {
        Alert.alert(
            'Delete Brand',
            `Are you sure you want to delete "${brandName}"? This action cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await apiService.deleteBrand(brandId);
                            setBrands(prev => prev.filter(brand => brand._id !== brandId));
                            Alert.alert('Success', 'Brand deleted successfully');
                        } catch (error) {
                            console.error('Error deleting brand:', error);
                            Alert.alert('Error', 'Failed to delete brand');
                        }
                    }
                }
            ]
        );
    };

    const handleToggleStatus = async (brandId: string, currentStatus: boolean) => {
        try {
            await apiService.toggleBrandStatus(brandId);
            setBrands(prev => prev.map(brand =>
                brand._id === brandId
                    ? { ...brand, isActive: !currentStatus }
                    : brand
            ));
        } catch (error) {
            console.error('Error toggling brand status:', error);
            Alert.alert('Error', 'Failed to update brand status');
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadBrands(1, true);
        }, [filters.isActive, filters.category, filters.sortBy, filters.sortOrder])
        // Note: searchQuery is NOT in dependencies - search is handled by debounced onSearch
    );

    const renderBrandCard = ({ item }: { item: Brand }) => (
        <Card style={styles.brandCard}>
            <TouchableOpacity
                onPress={() => navigation.navigate(SCREEN_NAMES.BRAND_DETAIL as any, { brandId: item._id })}
                activeOpacity={0.7}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.brandTitleRow}>
                        <View style={styles.brandIconContainer}>
                            <Icon
                                name={item.isVerified ? "verified" : "business"}
                                size={24}
                                color={item.isVerified ? '#4CAF50' : theme.colors.primary[500]}
                            />
                        </View>
                        <View style={styles.brandMainInfo}>
                            <Text style={styles.brandName}>{item.name}</Text>
                            <Text style={styles.brandCategory}>
                                {item.category.replace('-', ' ').toUpperCase()}
                            </Text>
                        </View>
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

                {item.description && (
                    <Text style={styles.brandDescription} numberOfLines={2}>
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
                        <Icon name="star" size={18} color="#FFB300" />
                        <Text style={styles.statValue}>{item.rating.average.toFixed(1)}</Text>
                        <Text style={styles.statLabel}>Rating</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Icon name="reviews" size={18} color={theme.colors.primary[500]} />
                        <Text style={styles.statValue}>{item.rating.count}</Text>
                        <Text style={styles.statLabel}>Reviews</Text>
                    </View>
                </View>

                <View style={styles.actionRow}>
                    <TouchableOpacity
                        style={styles.quickAction}
                        onPress={(e) => {
                            e.stopPropagation();
                            navigation.navigate(SCREEN_NAMES.BRAND_FORM as any, { brandId: item._id });
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
                            handleDeleteBrand(item._id, item.name);
                        }}
                        activeOpacity={0.7}
                    >
                        <Icon name="delete-outline" size={20} color="#F44336" />
                    </TouchableOpacity>

                    <View style={{ flex: 1 }} />

                    <TouchableOpacity
                        style={styles.viewDetailsButton}
                        onPress={() => navigation.navigate(SCREEN_NAMES.BRAND_DETAIL as any, { brandId: item._id })}
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

    const categoryOptions = [
        { label: 'All Categories', value: undefined },
        ...BRAND_CATEGORIES.map(cat => ({
            label: cat.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()),
            value: cat
        }))
    ];
    */

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
        brandCard: {
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
        brandTitleRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
        },
        brandIconContainer: {
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: theme.colors.surface,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 2,
            borderColor: theme.colors.border,
        },
        brandMainInfo: {
            flex: 1,
        },
        brandName: {
            fontSize: 18,
            fontWeight: '700',
            color: theme.colors.text,
            marginBottom: 4,
        },
        brandCategory: {
            fontSize: 11,
            color: theme.colors.textSecondary,
            fontWeight: '600',
            letterSpacing: 0.5,
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
        brandDescription: {
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

    /* FILTER FUNCTIONS - Keep for future use
    const getActiveFilterCount = () => {
        let count = 0;
        if (filters.isActive !== undefined) count++;
        if (filters.category) count++;
        return count;
    };
    */

    const clearAllFilters = () => {
        // Clear any pending search
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        setSearchQuery('');
        setFilters({
            isActive: undefined,
            category: undefined,
            sortBy: 'name',
            sortOrder: 'asc'
        });
        setPage(1);

        // Immediately reload with empty search (pass '' explicitly to override state)
        loadBrands(1, true, '');
    };

    const toggleSort = (field: 'name' | 'createdAt') => {
        if (filters.sortBy === field) {
            onFilterChange({ sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc' });
        } else {
            onFilterChange({ sortBy: field, sortOrder: 'asc' });
        }
    };

    // const activeFilterCount = getActiveFilterCount(); // Commented out with filters
    const hasActiveSearch = searchQuery.length > 0; // Only check search now

    return (
        <View style={styles.container}>
            {/* Search bar and filters - ALWAYS visible */}
            <View style={styles.headerSection}>
                <View style={styles.searchContainer}>
                    <SearchBar
                        placeholder="Search brands by name..."
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
                        title="Category"
                        options={categoryOptions}
                        selectedValue={filters.category}
                        onValueChange={(value) => onFilterChange({ category: value })}
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
                                filters.sortBy === 'createdAt' && styles.sortButtonActive
                            ]}
                            onPress={() => toggleSort('createdAt')}
                            activeOpacity={0.7}
                        >
                            <Text style={[
                                styles.sortButtonText,
                                filters.sortBy === 'createdAt' && styles.sortButtonTextActive
                            ]}>
                                Date
                            </Text>
                            {filters.sortBy === 'createdAt' && (
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

            {/* List area - shows initial loader OR list with search overlay */}
            <View style={{ flex: 1, position: 'relative' }}>
                {initialLoading ? (
                    // Initial page load - show centered spinner
                    <View style={styles.loadingContainer}>
                        <LoadingSpinner size="lg" />
                    </View>
                ) : (
                    // Data loaded - show list
                    <>
                        <FlatList
                            data={brands}
                            renderItem={renderBrandCard}
                            keyExtractor={(item) => item._id}
                            refreshControl={
                                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                            }
                            onEndReached={loadMore}
                            onEndReachedThreshold={0.1}
                            ListEmptyComponent={
                                <EmptyState
                                    icon="business"
                                    title="No Brands Found"
                                    subtitle={searchQuery
                                        ? `No brands found matching "${searchQuery}"`
                                        : "No brands match your filters. Try adjusting them."
                                    }
                                />
                            }
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.listContainer}
                            keyboardShouldPersistTaps="handled"
                            keyboardDismissMode="on-drag"
                        />

                        {/* Loading overlay when searching - only covers list area */}
                        {isSearching && (
                            <View style={styles.loadingOverlay}>
                                <View style={styles.loadingCard}>
                                    <LoadingSpinner size="md" />
                                    <Text style={[styles.loadingText, { color: theme.colors.text }]}>
                                        Searching brands...
                                    </Text>
                                </View>
                            </View>
                        )}
                    </>
                )}
            </View>

            <TouchableOpacity
                style={styles.fab}
                onPress={() => navigation.navigate(SCREEN_NAMES.BRAND_FORM as any)}
                activeOpacity={0.8}
            >
                <Icon name="add" size={28} color="#FFFFFF" />
            </TouchableOpacity>
        </View>
    );
};

export default BrandListScreen;

