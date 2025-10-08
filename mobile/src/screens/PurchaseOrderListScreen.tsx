import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    RefreshControl,
    TouchableOpacity,
    ScrollView,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../contexts/ThemeContext';
import { PurchaseOrderCard, SearchBar, EmptyState } from '../components';
import { Button, LoadingSpinner } from '../components/ui';
import { PurchaseOrder, PurchaseOrderFilters, RootStackParamList } from '../types';
import { SCREEN_NAMES } from '../constants';
import apiService from '../services/api';

type NavigationProp = StackNavigationProp<RootStackParamList>;

const PurchaseOrderListScreen: React.FC = () => {
    const { theme } = useTheme();
    const navigation = useNavigation<NavigationProp>();

    const [orders, setOrders] = useState<PurchaseOrder[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState<PurchaseOrderFilters>({});
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

    const loadOrders = useCallback(async (page = 1, reset = false) => {
        try {
            if (page === 1) {
                setError(null);
                if (reset) {
                    setIsLoading(true);
                }
            } else {
                setIsLoadingMore(true);
            }

            const searchFilters: PurchaseOrderFilters = {
                ...filters,
                status: selectedStatus || undefined,
            };

            const response = await apiService.getPurchaseOrders(searchFilters, page, 20);

            if (response.success && response.data) {
                if (page === 1) {
                    setOrders(response.data);
                } else {
                    setOrders(prev => [...prev, ...response.data]);
                }

                setHasMore(response.pagination.hasNext);
                setCurrentPage(page);
            }
        } catch (error: any) {
            console.error('Error loading purchase orders:', error);
            setError(error.message || 'Failed to load purchase orders');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
            setIsLoadingMore(false);
        }
    }, [filters, selectedStatus]);

    useFocusEffect(
        useCallback(() => {
            loadOrders(1, true);
        }, [filters, selectedStatus])
        // Note: searchQuery is NOT in dependencies - search is handled by debounced handleSearch
    );

    const handleRefresh = useCallback(() => {
        setIsRefreshing(true);
        loadOrders(1, false);
    }, [loadOrders]);

    const handleLoadMore = useCallback(() => {
        if (!isLoadingMore && hasMore) {
            loadOrders(currentPage + 1, false);
        }
    }, [isLoadingMore, hasMore, currentPage, loadOrders]);

    // Use ref for debounce timeout
    const searchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    const handleSearch = (query: string) => {
        setSearchQuery(query);

        // Clear existing timeout
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        // Debounce search - reload after user stops typing
        // Note: Backend search needs to be implemented to use searchQuery
        searchTimeoutRef.current = setTimeout(() => {
            setCurrentPage(1);
            loadOrders(1, true);
        }, 800); // 800ms delay for better UX
    };

    const handleStatusFilter = useCallback((status: string | null) => {
        setSelectedStatus(status);
        setCurrentPage(1);
        loadOrders(1, true);
    }, [loadOrders]);

    const handleOrderPress = (orderId: string) => {
        navigation.navigate(SCREEN_NAMES.PURCHASE_ORDER_DETAIL as any, { orderId });
    };

    const handleEditOrder = (orderId: string) => {
        navigation.navigate(SCREEN_NAMES.PURCHASE_ORDER_FORM as any, { orderId });
    };

    const handleDeleteOrder = async (orderId: string) => {
        // Show confirmation and delete
        console.log('Delete order:', orderId);
        // TODO: Implement delete with confirmation
    };

    const handleAddOrder = () => {
        navigation.navigate(SCREEN_NAMES.PURCHASE_ORDER_FORM as any);
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

    const renderOrder = ({ item }: { item: PurchaseOrder }) => (
        <PurchaseOrderCard
            order={item}
            onPress={() => handleOrderPress(item._id)}
            onEdit={() => handleEditOrder(item._id)}
            onDelete={() => handleDeleteOrder(item._id)}
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
                icon="shopping-cart"
                title="No purchase orders found"
                subtitle={selectedStatus
                    ? "Try adjusting your filters"
                    : "Start by creating your first purchase order"
                }
                actionText={selectedStatus ? "Clear Filters" : "Create Order"}
                onActionPress={selectedStatus
                    ? () => {
                        setSelectedStatus(null);
                        loadOrders(1, true);
                    }
                    : handleAddOrder
                }
            />
        );
    };

    if (isLoading && orders.length === 0) {
        return <LoadingSpinner overlay text="Loading purchase orders..." />;
    }

    return (
        <View style={getContainerStyle()}>
            {/* Header */}
            <View style={getHeaderStyle()}>
                <View style={styles.headerContent}>
                    <Text style={getHeaderTitleStyle()}>Purchase Orders</Text>
                    <TouchableOpacity
                        onPress={handleAddOrder}
                        style={[styles.headerButton, { backgroundColor: theme.colors.primary['500'] }]}
                    >
                        <Icon name="add" size={20} color={theme.colors.white} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Search and Filters */}
            <View style={styles.searchContainer}>
                <SearchBar
                    placeholder="Search orders..."
                    value={searchQuery}
                    onChangeText={handleSearch}
                    showFilter={true}
                    onFilterPress={() => {
                        // Show filter modal
                        console.log('Show filters');
                    }}
                />

                {/* Status Filter Chips */}
                <View style={styles.statusFilters}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.statusScrollContent}
                    >
                        <TouchableOpacity
                            style={[
                                styles.statusChip,
                                {
                                    backgroundColor: selectedStatus === null ? theme.colors.primary['500'] : theme.colors.surface,
                                    borderColor: selectedStatus === null ? theme.colors.primary['500'] : theme.colors.border,
                                }
                            ]}
                            onPress={() => handleStatusFilter(null)}
                        >
                            <Text style={[
                                styles.statusChipText,
                                { color: selectedStatus === null ? theme.colors.white : theme.colors.text }
                            ]}>
                                All
                            </Text>
                        </TouchableOpacity>

                        {['pending', 'approved', 'ordered', 'received', 'cancelled'].map((status) => (
                            <TouchableOpacity
                                key={status}
                                style={[
                                    styles.statusChip,
                                    {
                                        backgroundColor: selectedStatus === status ? theme.colors.primary['500'] : theme.colors.surface,
                                        borderColor: selectedStatus === status ? theme.colors.primary['500'] : theme.colors.border,
                                    }
                                ]}
                                onPress={() => handleStatusFilter(status)}
                            >
                                <Text style={[
                                    styles.statusChipText,
                                    { color: selectedStatus === status ? theme.colors.white : theme.colors.text }
                                ]}>
                                    {status.charAt(0).toUpperCase() + status.slice(1)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </View>

            {/* Orders List */}
            <FlatList
                data={orders}
                renderItem={renderOrder}
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
    statusFilters: {
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    statusScrollContent: {
        paddingRight: 16,
    },
    statusChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        marginRight: 8,
    },
    statusChipText: {
        fontSize: 14,
        fontWeight: '500',
    },
    listContent: {
        paddingBottom: 20,
    },
    loadingMore: {
        paddingVertical: 20,
        alignItems: 'center',
    },
});

export default PurchaseOrderListScreen;