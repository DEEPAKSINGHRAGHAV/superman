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
import { SupplierCard, SearchBar, EmptyState } from '../components';
import { Button, LoadingSpinner } from '../components/ui';
import { Supplier, SupplierFilters, RootStackParamList } from '../types';
import { SCREEN_NAMES } from '../constants';
import apiService from '../services/api';

type NavigationProp = StackNavigationProp<RootStackParamList>;

const SupplierListScreen: React.FC = () => {
    const { theme } = useTheme();
    const navigation = useNavigation<NavigationProp>();

    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState<SupplierFilters>({});
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    const loadSuppliers = useCallback(async (page = 1, reset = false, customSearchQuery?: string) => {
        try {
            if (page === 1) {
                setError(null);
                if (reset) {
                    setIsLoading(true);
                }
            } else {
                setIsLoadingMore(true);
            }

            // Use provided search query or current state value
            const currentSearchQuery = customSearchQuery !== undefined ? customSearchQuery : searchQuery;

            const searchFilters: SupplierFilters = {
                ...filters,
                search: currentSearchQuery || undefined,
            };

            const response = await apiService.getSuppliers(searchFilters, page, 20);

            if (response.success && response.data) {
                if (page === 1) {
                    setSuppliers(response.data);
                } else {
                    setSuppliers(prev => [...prev, ...response.data]);
                }

                setHasMore(response.pagination.hasNext);
                setCurrentPage(page);
            }
        } catch (error: any) {
            console.error('Error loading suppliers:', error);
            setError(error.message || 'Failed to load suppliers');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
            setIsLoadingMore(false);
        }
    }, [filters, searchQuery]);

    useFocusEffect(
        useCallback(() => {
            loadSuppliers(1, true);
        }, [loadSuppliers])
    );

    const handleRefresh = useCallback(() => {
        setIsRefreshing(true);
        loadSuppliers(1, false);
    }, [loadSuppliers]);

    const handleLoadMore = useCallback(() => {
        if (!isLoadingMore && hasMore) {
            loadSuppliers(currentPage + 1, false);
        }
    }, [isLoadingMore, hasMore, currentPage, loadSuppliers]);

    // Use ref for debounce timeout
    const searchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    const handleSearch = (query: string) => {
        setSearchQuery(query);

        // Clear existing timeout
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        // Debounce search - reload after user stops typing
        searchTimeoutRef.current = setTimeout(() => {
            setCurrentPage(1);
            loadSuppliers(1, true, query);
        }, 500); // 500ms delay for better UX
    };

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, []);

    const handleSupplierPress = (supplierId: string) => {
        navigation.navigate(SCREEN_NAMES.SUPPLIER_DETAIL as any, { supplierId });
    };

    const handleEditSupplier = (supplierId: string) => {
        navigation.navigate(SCREEN_NAMES.SUPPLIER_FORM as any, { supplierId });
    };

    const handleDeleteSupplier = async (supplierId: string) => {
        // Show confirmation and delete
        console.log('Delete supplier:', supplierId);
        // TODO: Implement delete with confirmation
    };

    const handleAddSupplier = () => {
        navigation.navigate(SCREEN_NAMES.SUPPLIER_FORM as any);
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

    const renderSupplier = ({ item }: { item: Supplier }) => (
        <SupplierCard
            supplier={item}
            onPress={() => handleSupplierPress(item._id)}
            onEdit={() => handleEditSupplier(item._id)}
            onDelete={() => handleDeleteSupplier(item._id)}
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
                icon="business"
                title="No suppliers found"
                subtitle={searchQuery
                    ? "Try adjusting your search"
                    : "Start by adding your first supplier"
                }
                actionText={searchQuery ? "Clear Search" : "Add Supplier"}
                onActionPress={searchQuery
                    ? () => {
                        setSearchQuery('');
                        setCurrentPage(1);
                        // Clear the search timeout if it's pending
                        if (searchTimeoutRef.current) {
                            clearTimeout(searchTimeoutRef.current);
                        }
                        // Immediately reload with no search query
                        loadSuppliers(1, true, '');
                    }
                    : handleAddSupplier
                }
            />
        );
    };

    if (isLoading && suppliers.length === 0) {
        return <LoadingSpinner overlay text="Loading suppliers..." />;
    }

    return (
        <View style={getContainerStyle()}>
            {/* Header */}
            <View style={getHeaderStyle()}>
                <View style={styles.headerContent}>
                    <Text style={getHeaderTitleStyle()}>Suppliers</Text>
                    <TouchableOpacity
                        onPress={handleAddSupplier}
                        style={[styles.headerButton, { backgroundColor: theme.colors.primary['500'] }]}
                    >
                        <Icon name="add" size={20} color={theme.colors.white} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
                <SearchBar
                    placeholder="Search suppliers..."
                    value={searchQuery}
                    onChangeText={handleSearch}
                    onClear={() => {
                        setSearchQuery('');
                        setCurrentPage(1);
                        // Clear the search timeout if it's pending
                        if (searchTimeoutRef.current) {
                            clearTimeout(searchTimeoutRef.current);
                        }
                        // Immediately reload with no search query
                        loadSuppliers(1, true, '');
                    }}
                    showFilter={true}
                    onFilterPress={() => {
                        // Show filter modal
                        console.log('Show filters');
                    }}
                />
            </View>

            {/* Suppliers List */}
            <FlatList
                data={suppliers}
                renderItem={renderSupplier}
                keyExtractor={(item) => item._id}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={handleRefresh}
                        tintColor={theme.colors.primary['500']}
                    />
                }
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.1}
                ListFooterComponent={renderFooter}
                ListEmptyComponent={renderEmpty}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
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

export default SupplierListScreen;