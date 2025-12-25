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
import { CustomerCard, SearchBar, EmptyState } from '../components';
import { Button, LoadingSpinner } from '../components/ui';
import { Customer, CustomerFilters, RootStackParamList } from '../types';
import { SCREEN_NAMES } from '../constants';
import apiService from '../services/api';

type NavigationProp = StackNavigationProp<RootStackParamList>;

const CustomerListScreen: React.FC = () => {
    const { theme } = useTheme();
    const navigation = useNavigation<NavigationProp>();

    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState<CustomerFilters>({});
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const abortControllerRef = React.useRef<AbortController | null>(null);

    const loadCustomers = useCallback(async (page = 1, reset = false, customSearchQuery?: string) => {
        // Cancel previous request if exists
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        // Create new AbortController for this request
        const abortController = new AbortController();
        abortControllerRef.current = abortController;
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

            const searchFilters: CustomerFilters = {
                ...filters,
                search: currentSearchQuery || undefined,
            };

            const response = await apiService.getCustomers(
                searchFilters, 
                page, 
                20,
                { signal: abortController.signal }
            );

            // Check if request was aborted before updating state
            if (abortController.signal.aborted) {
                return;
            }

            if (response.success && response.data) {
                if (page === 1) {
                    setCustomers(response.data);
                } else {
                    setCustomers(prev => [...prev, ...response.data]);
                }

                setHasMore(response.pagination.hasNext);
                setCurrentPage(page);
            }
        } catch (error: any) {
            // Don't handle aborted requests as errors
            if (error.name === 'AbortError' || error.message === 'Request was cancelled') {
                return;
            }
            console.error('Error loading customers:', error);
            if (!abortController.signal.aborted) {
                setError(error.message || 'Failed to load customers');
            }
        } finally {
            if (!abortController.signal.aborted) {
                setIsLoading(false);
                setIsRefreshing(false);
                setIsLoadingMore(false);
            }
        }
    }, [filters, searchQuery]);

    useFocusEffect(
        useCallback(() => {
            loadCustomers(1, true);
        }, [loadCustomers])
    );

    const handleRefresh = useCallback(() => {
        setIsRefreshing(true);
        loadCustomers(1, false);
    }, [loadCustomers]);

    const handleLoadMore = useCallback(() => {
        if (!isLoadingMore && hasMore) {
            loadCustomers(currentPage + 1, false);
        }
    }, [isLoadingMore, hasMore, currentPage, loadCustomers]);

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
            loadCustomers(1, true, query);
        }, 500); // 500ms delay for better UX
    };

    // Cleanup timeout and abort controller on unmount
    useEffect(() => {
        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
                abortControllerRef.current = null;
            }
        };
    }, []);

    const handleCustomerPress = (customerId: string) => {
        navigation.navigate(SCREEN_NAMES.CUSTOMER_DETAIL as any, { customerId });
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

    const renderCustomer = ({ item }: { item: Customer }) => (
        <CustomerCard
            customer={item}
            onPress={() => handleCustomerPress(item._id)}
            showActions={false}
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
                icon="people"
                title="No customers found"
                subtitle={searchQuery
                    ? "Try adjusting your search"
                    : "Customers will appear here when they make purchases"
                }
                actionText={searchQuery ? "Clear Search" : undefined}
                onActionPress={searchQuery
                    ? () => {
                        setSearchQuery('');
                        setCurrentPage(1);
                        // Clear the search timeout if it's pending
                        if (searchTimeoutRef.current) {
                            clearTimeout(searchTimeoutRef.current);
                        }
                        // Immediately reload with no search query
                        loadCustomers(1, true, '');
                    }
                    : undefined
                }
            />
        );
    };

    if (isLoading && customers.length === 0) {
        return <LoadingSpinner overlay text="Loading customers..." />;
    }

    return (
        <View style={getContainerStyle()}>
            {/* Header */}
            <View style={getHeaderStyle()}>
                <View style={styles.headerContent}>
                    <Text style={getHeaderTitleStyle()}>Customers</Text>
                </View>
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
                <SearchBar
                    placeholder="Search customers by name, phone, or number..."
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
                        loadCustomers(1, true, '');
                    }}
                    showFilter={false}
                />
            </View>

            {/* Customers List */}
            <FlatList
                data={customers}
                renderItem={renderCustomer}
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

export default CustomerListScreen;



