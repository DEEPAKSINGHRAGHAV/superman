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

    const loadProducts = useCallback(async (page = 1, reset = false) => {
        try {
            if (page === 1) {
                setError(null);
                if (reset) {
                    setIsLoading(true);
                }
            } else {
                setIsLoadingMore(true);
            }

            const searchFilters: ProductFilters = {
                ...filters,
                search: searchQuery || undefined,
                category: selectedCategory || undefined,
            };

            console.log('Loading products with filters:', searchFilters);
            const response = await apiService.getProducts(searchFilters, page, 20);

            if (response.success && response.data) {
                if (page === 1) {
                    setProducts(response.data);
                } else {
                    setProducts(prev => [...prev, ...response.data]);
                }

                setHasMore(response.pagination.hasNext);
                setCurrentPage(page);
            }
        } catch (error: any) {
            console.error('Error loading products:', error);
            setError(error.message || 'Failed to load products');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
            setIsLoadingMore(false);
        }
    }, [filters, searchQuery, selectedCategory]);

    useFocusEffect(
        useCallback(() => {
            loadProducts(1, true);
        }, [loadProducts])
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

    const handleSearch = useCallback((query: string) => {
        setSearchQuery(query);
        setCurrentPage(1);
        // Debounce search - reload after user stops typing
        const timeoutId = setTimeout(() => {
            loadProducts(1, true);
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [loadProducts]);

    const handleCategoryFilter = useCallback((category: string | null) => {
        setSelectedCategory(category);
        setCurrentPage(1);
        loadProducts(1, true);
    }, [loadProducts]);

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
        // Navigate to barcode scanner
        console.log('Scan barcode');
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

    const renderProduct = ({ item }: { item: Product }) => (
        <ProductCard
            product={item}
            onPress={() => handleProductPress(item._id)}
            onEdit={() => handleEditProduct(item._id)}
            showActions={true}
        />
    );

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
                        loadProducts(1, true);
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

            {/* Search and Filters */}
            <View style={styles.searchContainer}>
                <SearchBar
                    placeholder="Search products..."
                    value={searchQuery}
                    onChangeText={handleSearch}
                    showFilter={true}
                    onFilterPress={() => {
                        // Show filter modal
                        console.log('Show filters');
                    }}
                />

                <FilterChips
                    selectedCategory={selectedCategory}
                    onCategorySelect={handleCategoryFilter}
                />
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
                contentContainerStyle={styles.listContent}
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
    searchContainer: {
        paddingVertical: 8,
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