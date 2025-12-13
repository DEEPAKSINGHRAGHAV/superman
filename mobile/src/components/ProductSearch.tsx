import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../contexts/ThemeContext';
import { Product } from '../types';
import apiService from '../services/api';

interface ProductSearchProps {
    onProductSelect: (product: Product) => void;
    placeholder?: string;
    showStockInfo?: boolean;
    showPrice?: boolean;
    maxResults?: number;
    minSearchLength?: number;
    debounceMs?: number;
    style?: any;
    autoFocus?: boolean;
    disabled?: boolean;
}

const ProductSearch = forwardRef<any, ProductSearchProps>(({
    onProductSelect,
    placeholder = "Search products by name, SKU, or barcode...",
    showStockInfo = true,
    showPrice = true,
    maxResults = 20,
    minSearchLength = 1,
    debounceMs = 300,
    style,
    autoFocus = false,
    disabled = false,
}, ref) => {
    const { theme } = useTheme();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Product[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
    const inputRef = useRef<TextInput>(null);

    // Expose focus method via ref
    useImperativeHandle(ref, () => ({
        focus: () => {
            inputRef.current?.focus();
        },
        blur: () => {
            inputRef.current?.blur();
        },
    }));

    // Debounced search effect
    useEffect(() => {
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }

        if (searchQuery && searchQuery.length >= minSearchLength) {
            const timeout = setTimeout(() => {
                performSearch(searchQuery);
            }, debounceMs);
            setSearchTimeout(timeout);
        } else if (searchQuery.length === 0) {
            setSearchResults([]);
            setShowResults(false);
        }

        return () => {
            if (searchTimeout) {
                clearTimeout(searchTimeout);
            }
        };
    }, [searchQuery, minSearchLength, debounceMs]);

    const performSearch = async (query: string) => {
        try {
            setIsSearching(true);
            setShowResults(true);

            const response = await apiService.searchProducts(query, maxResults);

            if (response.success && response.data) {
                // Filter and limit results consistently
                const validProducts = Array.isArray(response.data)
                    ? response.data
                        .filter(product =>
                            product &&
                            product._id &&
                            product.name
                            // Don't filter by stock - show all products including out of stock
                        )
                        .slice(0, maxResults)
                    : [];

                setSearchResults(validProducts);
            } else {
                setSearchResults([]);
            }
        } catch (error) {
            console.error('Product search error:', error);
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    const handleInputChange = (text: string) => {
        setSearchQuery(text);
    };

    const handleProductSelect = (product: Product) => {
        if (onProductSelect) {
            onProductSelect(product);
        }
        setSearchQuery('');
        setSearchResults([]);
        setShowResults(false);
    };

    const handleInputFocus = () => {
        if (searchResults.length > 0) {
            setShowResults(true);
        }
    };

    const handleInputBlur = () => {
        // Delay hiding results to allow for clicks
        setTimeout(() => setShowResults(false), 150);
    };

    const getStockStatus = (stock: number, minStock: number = 0) => {
        if (stock === 0) return { text: 'Out of Stock', color: theme.colors.error[500] };
        if (stock <= minStock) return { text: 'Low Stock', color: theme.colors.warning[500] };
        return { text: `Stock: ${stock}`, color: theme.colors.success[500] };
    };

    const renderProduct = ({ item }: { item: Product }) => {
        if (!item || !item._id || !item.name) return null;

        const isOutOfStock = (item.currentStock || 0) === 0;
        const stockStatus = getStockStatus(item.currentStock || 0, item.minStockLevel || 0);

        return (
            <TouchableOpacity
                style={[
                    styles.productItem,
                    {
                        backgroundColor: theme.colors.surface,
                        borderBottomColor: theme.colors.border,
                        opacity: isOutOfStock ? 0.6 : 1, // Make out of stock items appear dimmed
                    }
                ]}
                onPress={() => !isOutOfStock && handleProductSelect(item)}
                disabled={isOutOfStock}
            >
                <View style={styles.productContent}>
                    <View style={styles.productInfo}>
                        <Text style={[
                            styles.productName,
                            {
                                color: isOutOfStock ? theme.colors.textSecondary : theme.colors.text
                            }
                        ]}>
                            {item.name}
                        </Text>
                        <Text style={[styles.productSku, { color: theme.colors.textSecondary }]}>
                            {item.sku || 'N/A'} {item.barcode && `• ${item.barcode}`}
                        </Text>
                        {showStockInfo && (
                            <View style={styles.stockContainer}>
                                <Text style={[styles.stockText, { color: stockStatus.color }]}>
                                    {stockStatus.text}
                                </Text>
                            </View>
                        )}
                    </View>
                    {showPrice && (
                        <View style={styles.priceContainer}>
                            <Text style={[
                                styles.priceText,
                                {
                                    color: isOutOfStock ? theme.colors.textSecondary : theme.colors.primary[500]
                                }
                            ]}>
                                ₹{item.sellingPrice || 0}
                            </Text>
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    const renderEmptySearch = () => {
        if (isSearching) return null;
        if (!searchQuery || searchQuery.length < minSearchLength) return null;

        return (
            <View style={[styles.emptyContainer, { backgroundColor: theme.colors.surface }]}>
                <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                    No products found for "{searchQuery}"
                </Text>
                <Text style={[styles.emptySubtext, { color: theme.colors.textSecondary }]}>
                    Try a different search term
                </Text>
            </View>
        );
    };

    const getContainerStyle = () => ({
        ...styles.container,
        ...style,
    });

    const getInputStyle = () => ({
        ...styles.input,
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.border,
        color: theme.colors.text,
    });

    return (
        <View style={getContainerStyle()}>
            <View style={[styles.searchContainer, { backgroundColor: theme.colors.surface }]}>
                <Icon
                    name="search"
                    size={20}
                    color={theme.colors.textSecondary}
                    style={styles.searchIcon}
                />
                <TextInput
                    ref={inputRef}
                    style={getInputStyle()}
                    placeholder={placeholder}
                    placeholderTextColor={theme.colors.placeholder}
                    value={searchQuery}
                    onChangeText={handleInputChange}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    autoFocus={autoFocus}
                    editable={!disabled}
                />
                {isSearching && (
                    <ActivityIndicator
                        size="small"
                        color={theme.colors.primary[500]}
                        style={styles.loadingIndicator}
                    />
                )}
            </View>

            {showResults && (
                <View style={[styles.resultsContainer, { backgroundColor: theme.colors.surface }]}>
                    {isSearching ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="small" color={theme.colors.primary[500]} />
                            <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
                                Searching...
                            </Text>
                        </View>
                    ) : searchResults.length > 0 ? (
                        <FlatList
                            data={searchResults}
                            renderItem={renderProduct}
                            keyExtractor={(item) => item._id}
                            style={styles.resultsList}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                        />
                    ) : (
                        renderEmptySearch()
                    )}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        zIndex: 1000,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    searchIcon: {
        marginRight: 8,
    },
    input: {
        flex: 1,
        fontSize: 16,
        paddingVertical: 4,
    },
    loadingIndicator: {
        marginLeft: 8,
    },
    resultsContainer: {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        maxHeight: 300,
        borderWidth: 1,
        borderTopWidth: 0,
        borderBottomLeftRadius: 8,
        borderBottomRightRadius: 8,
        zIndex: 1001,
    },
    resultsList: {
        maxHeight: 300,
    },
    productItem: {
        padding: 12,
        borderBottomWidth: 1,
    },
    productContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    productInfo: {
        flex: 1,
    },
    productName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    productSku: {
        fontSize: 14,
        marginBottom: 4,
    },
    stockContainer: {
        marginTop: 2,
    },
    stockText: {
        fontSize: 12,
        fontWeight: '500',
    },
    priceContainer: {
        alignItems: 'flex-end',
    },
    priceText: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    loadingText: {
        marginLeft: 8,
        fontSize: 14,
    },
    emptyContainer: {
        padding: 20,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
        marginBottom: 4,
    },
    emptySubtext: {
        fontSize: 14,
    },
});

ProductSearch.displayName = 'ProductSearch';

export default ProductSearch;
