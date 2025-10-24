import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    RefreshControl,
    TouchableOpacity,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../contexts/ThemeContext';
import { ProductCard, SearchBar, EmptyState, FilterChips } from '../components';
import { Button, LoadingSpinner } from '../components/ui';
import { Product, ProductFilters, RootStackParamList } from '../types';
import { SCREEN_NAMES } from '../constants';
import apiService from '../services/api';

type ProductListScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const ProductListScreen: React.FC = () => {
    const { theme } = useTheme();
    const navigation = useNavigation<ProductListScreenNavigationProp>();

    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState<ProductFilters>({});
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [categories, setCategories] = useState<Array<{ label: string; value: string }>>([]);
    const [totalCount, setTotalCount] = useState<number>(0);
    const [isSearching, setIsSearching] = useState(false);
    const [hasActiveSearch, setHasActiveSearch] = useState(false);

    const loadProducts = useCallback(async (page = 1, reset = false, customSearchQuery?: string) => {
        try {
            if (page === 1) {
                setError(null);
                // Only show full page loader on initial load or when explicitly resetting without search
                if (reset && !customSearchQuery && !searchQuery.trim()) {
                    setIsLoading(true);
                }
            } else {
                setIsLoadingMore(true);
            }

            // Use provided search query or current state value
            const currentSearchQuery = customSearchQuery !== undefined ? customSearchQuery : searchQuery;
            console.log('loadProducts called with:', { page, reset, customSearchQuery, currentSearchQuery, selectedCategory });

            let response;

            // Simplified search logic - use fuzzy search for pure text search, regular search for filtered queries
            if (currentSearchQuery && currentSearchQuery.trim() && !selectedCategory && Object.keys(filters).length === 0) {
                console.log('Using advanced fuzzy search for:', currentSearchQuery);
                try {
                    const fuzzyResponse = await apiService.searchProducts(currentSearchQuery, 50);

                    if (fuzzyResponse.success && fuzzyResponse.data) {
                        // Convert to paginated response format for consistency
                        response = {
                            success: true,
                            data: fuzzyResponse.data,
                            total: fuzzyResponse.data?.length || 0,
                            pagination: {
                                currentPage: 1,
                                totalPages: 1,
                                hasNext: false,
                                hasPrev: false,
                                limit: 50
                            }
                        };
                    } else {
                        console.warn('Fuzzy search failed, falling back to regular search');
                        // Fallback to regular search if fuzzy search fails
                        const searchFilters: ProductFilters = {
                            ...filters,
                            search: currentSearchQuery,
                            category: selectedCategory || undefined,
                        };
                        response = await apiService.getProducts(searchFilters, page, 20);
                    }
                } catch (fuzzyError) {
                    console.warn('Fuzzy search error, falling back to regular search:', fuzzyError);
                    // Fallback to regular search if fuzzy search throws error
                    const searchFilters: ProductFilters = {
                        ...filters,
                        search: currentSearchQuery,
                        category: selectedCategory || undefined,
                    };
                    response = await apiService.getProducts(searchFilters, page, 20);
                }
            } else {
                // Use regular endpoint with pagination and category filter
                const searchFilters: ProductFilters = {
                    ...filters,
                    search: currentSearchQuery || undefined,
                    category: selectedCategory || undefined,
                };

                console.log('Loading products with filters:', searchFilters);
                response = await apiService.getProducts(searchFilters, page, 20);
            }

            if (response && response.success && response.data) {
                // Ensure data is an array and filter out invalid products
                const validProducts = Array.isArray(response.data)
                    ? response.data.filter(product => product && product._id && product.name)
                    : [];

                if (page === 1) {
                    setProducts(validProducts);
                } else {
                    setProducts(prev => [...prev, ...validProducts]);
                }

                setHasMore(response.pagination?.hasNext || false);
                setCurrentPage(page);
                setTotalCount(response.total || 0);
            } else {
                console.warn('Invalid response format:', response);
                if (page === 1) {
                    setProducts([]);
                }
            }
        } catch (error: any) {
            console.error('Error loading products:', error);
            const errorMessage = error.message || 'Failed to load products';
            setError(errorMessage);

            // If it's a network error, keep existing products visible
            if (error.message && error.message.includes('Cannot connect')) {
                // Don't clear products on network error, just show error message
                console.log('Network error, keeping existing products visible');
            } else if (page === 1) {
                // Only clear products on page 1 for non-network errors
                setProducts([]);
            }
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
            setIsLoadingMore(false);
            setIsSearching(false);
        }
    }, [filters, selectedCategory, searchQuery]);

    // Load categories on mount
    useEffect(() => {
        const loadCategories = async () => {
            try {
                // Fetch categories from Category model (database) instead of Product.distinct
                const response = await apiService.getCategories({ isActive: true, level: 0 }, 1, 100);
                if (response.success && response.data) {
                    const categoryOptions = [
                        { label: 'All', value: null as string | null },
                        ...response.data.map((cat: any) => ({
                            label: cat.name,
                            value: cat.slug || cat._id
                        }))
                    ];
                    setCategories(categoryOptions);
                }
            } catch (error) {
                console.error('Error loading categories:', error);
                // Set default categories if API fails
                setCategories([{ label: 'All', value: null }]);
            }
        };
        loadCategories();
    }, []);

    // Reload products when category filter changes
    useEffect(() => {
        // Skip initial render
        if (selectedCategory !== null || products.length > 0) {
            loadProducts(1, true);
        }
    }, [selectedCategory]);

    useFocusEffect(
        useCallback(() => {
            // Only reload if there's no active search and not currently searching
            if (!hasActiveSearch && !isSearching && !searchQuery.trim()) {
                console.log('useFocusEffect: Reloading products (no active search)');
                loadProducts(1, true);
            } else {
                console.log('useFocusEffect: Skipping reload (hasActiveSearch:', hasActiveSearch, 'isSearching:', isSearching, 'searchQuery:', searchQuery, ')');
            }
        }, [hasActiveSearch, isSearching, searchQuery, loadProducts])
    );

    const handleRefresh = useCallback(() => {
        setIsRefreshing(true);
        loadProducts(1, false);
    }, [loadProducts]);

    const handleLoadMore = useCallback(() => {
        if (!isLoadingMore && hasMore) {
            loadProducts(currentPage + 1, false);
        }
    }, [isLoadingMore, hasMore, currentPage, loadProducts]);

    // Use ref for debounce timeout
    const searchTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleSearch = (query: string) => {
        console.log('handleSearch called with:', query);

        // Clear existing timeout
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        // Update search query state immediately
        setSearchQuery(query);

        // Show searching indicator
        if (query.trim()) {
            setIsSearching(true);
            setHasActiveSearch(true);
        } else {
            // If query is empty, clear search immediately without full page loader
            setIsSearching(false);
            setHasActiveSearch(false);
            setCurrentPage(1);
            // Don't clear products immediately - let the search handle it smoothly
            loadProducts(1, false, ''); // Use reset=false to avoid full page loader
            return;
        }

        // Debounce search - reload after user stops typing
        searchTimeoutRef.current = setTimeout(() => {
            console.log('Executing debounced search for:', query);
            setCurrentPage(1);
            setIsSearching(false);
            // Pass the query explicitly to avoid stale closure, use reset=false for search
            loadProducts(1, false, query);
        }, 300); // Reduced delay for better responsiveness
    };

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, []);

    // Reset search state when component unmounts or when navigating away
    useEffect(() => {
        return () => {
            // Clear search state when component unmounts
            setSearchQuery('');
            setIsSearching(false);
            setHasActiveSearch(false);
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, []);

    const handleCategoryFilter = useCallback((category: string | null) => {
        setSelectedCategory(category);
        // Products will be reloaded by the useEffect watching selectedCategory
    }, []);

    const handleProductPress = (productId: string) => {
        // Navigate to product detail
        navigation.navigate('ProductDetail', { productId });
    };

    const handleEditProduct = (productId: string) => {
        // Navigate to edit product
        navigation.navigate('ProductForm', { productId });
    };


    const handleAddProduct = () => {
        // Navigate to add product
        navigation.navigate('ProductForm', {});
    };

    const handleScanBarcode = () => {
        navigation.navigate('BarcodeScanner' as any);
    };

    const getContainerStyle = () => ({
        ...styles.container,
        backgroundColor: theme.colors.background,
    });

    const getHeaderStyle = () => ({
        ...styles.header,
        backgroundColor: theme.colors.surface,
        borderBottomColor: theme.colors.border,
    });

    const getHeaderTitleStyle = () => ({
        ...styles.headerTitle,
        color: theme.colors.text,
    });

    const renderProduct = ({ item }: { item: Product }) => {
        try {
            // Validate product data before rendering
            if (!item || !item._id || !item.name) {
                console.warn('Invalid product data:', item);
                return null;
            }

            return (
                <ProductCard
                    product={item}
                    onPress={() => handleProductPress(item._id)}
                    onEdit={() => handleEditProduct(item._id)}
                    showActions={true}
                />
            );
        } catch (error) {
            console.error('Error rendering product card:', error, item);
            return null;
        }
    };

    const renderFooter = () => {
        if (!isLoadingMore) return null;

        return (
            <View style={styles.loadingMore}>
                <LoadingSpinner size="sm" text="Loading more..." />
            </View>
        );
    };

    const renderEmpty = () => {
        if (isLoading) return null;

        // Show error state if there's an error
        if (error) {
            return (
                <EmptyState
                    icon="error"
                    title="Unable to load products"
                    subtitle={error}
                    actionText="Retry"
                    onActionPress={() => {
                        setError(null);
                        loadProducts(1, true);
                    }}
                />
            );
        }

        return (
            <EmptyState
                icon="inventory"
                title="No products found"
                subtitle={searchQuery || selectedCategory
                    ? "Try adjusting your search or filters"
                    : "Start by adding your first product"
                }
                actionText={searchQuery || selectedCategory ? "Clear Filters" : "Add Product"}
                onActionPress={searchQuery || selectedCategory
                    ? () => {
                        setSearchQuery('');
                        setSelectedCategory(null);
                        setCurrentPage(1);
                        setIsSearching(false);
                        setHasActiveSearch(false);
                        setError(null);
                        // Clear the search timeout if it's pending
                        if (searchTimeoutRef.current) {
                            clearTimeout(searchTimeoutRef.current);
                        }
                        // Immediately reload with no filters, use reset=false to avoid full loader
                        loadProducts(1, false, '');
                    }
                    : handleAddProduct
                }
            />
        );
    };

    if (isLoading && products.length === 0) {
        return <LoadingSpinner overlay text="Loading products..." />;
    }

    return (
        <View style={getContainerStyle()}>
            {/* Header */}
            <View style={getHeaderStyle()}>
                <View style={styles.headerContent}>
                    <Text style={getHeaderTitleStyle()}>Products</Text>
                    <View style={styles.headerActions}>
                        <TouchableOpacity
                            onPress={handleScanBarcode}
                            style={[styles.headerButton, { backgroundColor: theme.colors.primary[50] }]}
                        >
                            <Icon name="qr-code-scanner" size={20} color={theme.colors.primary[500]} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleAddProduct}
                            style={[styles.headerButton, { backgroundColor: theme.colors.primary[500] }]}
                        >
                            <Icon name="add" size={20} color={theme.colors.white} />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* Error Banner for Network Issues */}
            {error && products.length > 0 && (
                <View style={[styles.errorBanner, { backgroundColor: theme.colors.error[50] }]}>
                    <Icon name="error-outline" size={16} color={theme.colors.error[500]} />
                    <Text style={[styles.errorBannerText, { color: theme.colors.error[700] }]} numberOfLines={1}>
                        {error}
                    </Text>
                    <TouchableOpacity onPress={() => {
                        setError(null);
                        loadProducts(1, true);
                    }}>
                        <Text style={[styles.errorBannerAction, { color: theme.colors.error[500] }]}>
                            Retry
                        </Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Search and Filters */}
            <View style={styles.searchContainer}>
                <SearchBar
                    placeholder="Search products..."
                    value={searchQuery}
                    onChangeText={handleSearch}
                    onClear={() => {
                        console.log('Search cleared');
                        setSearchQuery('');
                        setCurrentPage(1);
                        setIsSearching(false);
                        setHasActiveSearch(false);
                        // Clear the search timeout if it's pending
                        if (searchTimeoutRef.current) {
                            clearTimeout(searchTimeoutRef.current);
                        }
                        // Immediately reload with no search query, use reset=false to avoid full loader
                        loadProducts(1, false, '');
                    }}
                    showFilter={true}
                    onFilterPress={() => {
                        // Show filter modal
                        console.log('Show filters');
                    }}
                    resultCount={searchQuery || selectedCategory ? totalCount : undefined}
                />

                {isSearching && (
                    <View style={styles.searchingIndicator}>
                        <LoadingSpinner size="sm" />
                        <Text style={[styles.searchingText, { color: theme.colors.textSecondary }]}>
                            Searching...
                        </Text>
                    </View>
                )}

                {searchQuery && !selectedCategory && !isSearching && products.length > 0 && (
                    <View style={styles.searchHint}>
                        <Icon name="auto-awesome" size={12} color={theme.colors.primary[500]} />
                        <Text style={[styles.searchHintText, { color: theme.colors.textSecondary }]}>
                            Smart search with typo tolerance active
                        </Text>
                    </View>
                )}

                {searchQuery && !selectedCategory && !isSearching && products.length === 0 && (
                    <View style={styles.noResultsHint}>
                        <Icon name="search-off" size={16} color={theme.colors.textSecondary} />
                        <Text style={[styles.noResultsText, { color: theme.colors.textSecondary }]}>
                            No products found for "{searchQuery}"
                        </Text>
                    </View>
                )}

                {categories.length > 0 && (
                    <FilterChips
                        options={categories}
                        selectedValue={selectedCategory}
                        onValueChange={handleCategoryFilter}
                        style={styles.filterChips}
                    />
                )}
            </View>

            {/* Products List */}
            <FlatList
                data={products}
                renderItem={renderProduct}
                keyExtractor={(item) => item._id}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={handleRefresh}
                        tintColor={theme.colors.primary[500]}
                    />
                }
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.1}
                ListFooterComponent={renderFooter}
                ListEmptyComponent={renderEmpty}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="always"
                keyboardDismissMode="none"
                contentContainerStyle={styles.listContent}
                maintainVisibleContentPosition={{
                    minIndexForVisible: 0,
                    autoscrollToTopThreshold: 10
                }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingTop: 50,
        paddingBottom: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    headerActions: {
        flexDirection: 'row',
        gap: 12,
    },
    headerButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        gap: 8,
    },
    errorBannerText: {
        flex: 1,
        fontSize: 12,
        fontWeight: '500',
    },
    errorBannerAction: {
        fontSize: 12,
        fontWeight: '600',
    },
    searchContainer: {
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    searchingIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        gap: 8,
    },
    searchingText: {
        fontSize: 12,
        fontStyle: 'italic',
    },
    searchHint: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 4,
        gap: 4,
    },
    searchHintText: {
        fontSize: 11,
        fontStyle: 'italic',
    },
    noResultsHint: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        gap: 4,
    },
    noResultsText: {
        fontSize: 12,
        fontStyle: 'italic',
    },
    filterChips: {
        marginTop: 12,
        marginBottom: 2,
    },
    listContent: {
        paddingBottom: 20,
    },
    loadingMore: {
        paddingVertical: 20,
        alignItems: 'center',
    },
});

export default ProductListScreen;