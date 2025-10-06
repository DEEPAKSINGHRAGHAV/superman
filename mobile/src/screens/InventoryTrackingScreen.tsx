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
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../contexts/ThemeContext';
import { StockMovementCard, SearchBar, EmptyState, StatsCard } from '../components';
import { Button, LoadingSpinner, Card } from '../components/ui';
import { StockMovement, StockMovementFilters } from '../types';
import apiService from '../services/api';

const InventoryTrackingScreen: React.FC = () => {
    const { theme } = useTheme();

    const [movements, setMovements] = useState<StockMovement[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState<StockMovementFilters>({});
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [selectedType, setSelectedType] = useState<string | null>(null);
    const [summary, setSummary] = useState<any>(null);

    const loadMovements = useCallback(async (page = 1, reset = false) => {
        try {
            if (page === 1) {
                setError(null);
                if (reset) {
                    setIsLoading(true);
                }
            } else {
                setIsLoadingMore(true);
            }

            const searchFilters: StockMovementFilters = {
                ...filters,
                movementType: selectedType || undefined,
            };

            const response = await apiService.getStockMovements(searchFilters, page, 20);

            if (response.success && response.data) {
                if (page === 1) {
                    setMovements(response.data);
                } else {
                    setMovements(prev => [...prev, ...response.data]);
                }

                setHasMore(response.pagination.hasNext);
                setCurrentPage(page);
            }
        } catch (error: any) {
            console.error('Error loading stock movements:', error);
            setError(error.message || 'Failed to load stock movements');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
            setIsLoadingMore(false);
        }
    }, [filters, selectedType]);

    const loadSummary = useCallback(async () => {
        try {
            const response = await apiService.getDailyStockSummary();
            if (response.success && response.data) {
                setSummary(response.data);
            }
        } catch (error) {
            console.error('Error loading summary:', error);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadMovements(1, true);
            loadSummary();
        }, [loadMovements, loadSummary])
    );

    const handleRefresh = useCallback(() => {
        setIsRefreshing(true);
        loadMovements(1, false);
        loadSummary();
    }, [loadMovements, loadSummary]);

    const handleLoadMore = useCallback(() => {
        if (!isLoadingMore && hasMore) {
            loadMovements(currentPage + 1, false);
        }
    }, [isLoadingMore, hasMore, currentPage, loadMovements]);

    const handleTypeFilter = useCallback((type: string | null) => {
        setSelectedType(type);
        setCurrentPage(1);
        loadMovements(1, true);
    }, [loadMovements]);

    const handleMovementPress = (movementId: string) => {
        // Navigate to movement detail
        console.log('Navigate to movement:', movementId);
    };

    const handleAdjustStock = () => {
        // Navigate to stock adjustment
        console.log('Adjust stock');
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

    const renderMovement = ({ item }: { item: StockMovement }) => (
        <StockMovementCard
            movement={item}
            onPress={() => handleMovementPress(item._id)}
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
                icon="track-changes"
                title="No stock movements found"
                subtitle={selectedType
                    ? "Try adjusting your filters"
                    : "Stock movements will appear here as you manage inventory"
                }
                actionText={selectedType ? "Clear Filters" : "Adjust Stock"}
                onActionPress={selectedType
                    ? () => {
                        setSelectedType(null);
                        loadMovements(1, true);
                    }
                    : handleAdjustStock
                }
            />
        );
    };

    if (isLoading && movements.length === 0) {
        return <LoadingSpinner overlay text="Loading stock movements..." />;
    }

    return (
        <View style={getContainerStyle()}>
            {/* Header */}
            <View style={getHeaderStyle()}>
                <View style={styles.headerContent}>
                    <Text style={getHeaderTitleStyle()}>Inventory Tracking</Text>
                    <TouchableOpacity
                        onPress={handleAdjustStock}
                        style={[styles.headerButton, { backgroundColor: theme.colors.primary[500] }]}
                    >
                        <Icon name="tune" size={20} color={theme.colors.white} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Summary Cards */}
            {summary && (
                <View style={styles.summaryContainer}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.summaryScrollContent}
                    >
                        <StatsCard
                            title="Today's Movements"
                            value={summary.totalMovements || 0}
                            icon="swap-horiz"
                            color={theme.colors.primary[500]}
                        />
                        <StatsCard
                            title="Stock In"
                            value={summary.stockIn || 0}
                            icon="add-shopping-cart"
                            color={theme.colors.success[500]}
                        />
                        <StatsCard
                            title="Stock Out"
                            value={summary.stockOut || 0}
                            icon="remove-shopping-cart"
                            color={theme.colors.error[500]}
                        />
                        <StatsCard
                            title="Adjustments"
                            value={summary.adjustments || 0}
                            icon="tune"
                            color={theme.colors.warning[500]}
                        />
                    </ScrollView>
                </View>
            )}

            {/* Search and Filters */}
            <View style={styles.searchContainer}>
                <SearchBar
                    placeholder="Search movements..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    showFilter={true}
                    onFilterPress={() => {
                        // Show filter modal
                        console.log('Show filters');
                    }}
                />

                {/* Movement Type Filter Chips */}
                <View style={styles.typeFilters}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.typeScrollContent}
                    >
                        <TouchableOpacity
                            style={[
                                styles.typeChip,
                                {
                                    backgroundColor: selectedType === null ? theme.colors.primary[500] : theme.colors.surface,
                                    borderColor: selectedType === null ? theme.colors.primary[500] : theme.colors.border,
                                }
                            ]}
                            onPress={() => handleTypeFilter(null)}
                        >
                            <Text style={[
                                styles.typeChipText,
                                { color: selectedType === null ? theme.colors.white : theme.colors.text }
                            ]}>
                                All
                            </Text>
                        </TouchableOpacity>

                        {['purchase', 'sale', 'adjustment', 'return', 'damage', 'transfer', 'expired'].map((type) => (
                            <TouchableOpacity
                                key={type}
                                style={[
                                    styles.typeChip,
                                    {
                                        backgroundColor: selectedType === type ? theme.colors.primary[500] : theme.colors.surface,
                                        borderColor: selectedType === type ? theme.colors.primary[500] : theme.colors.border,
                                    }
                                ]}
                                onPress={() => handleTypeFilter(type)}
                            >
                                <Text style={[
                                    styles.typeChipText,
                                    { color: selectedType === type ? theme.colors.white : theme.colors.text }
                                ]}>
                                    {type.charAt(0).toUpperCase() + type.slice(1)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </View>

            {/* Movements List */}
            <FlatList
                data={movements}
                renderItem={renderMovement}
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
    headerButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    summaryContainer: {
        paddingVertical: 8,
    },
    summaryScrollContent: {
        paddingHorizontal: 16,
    },
    searchContainer: {
        paddingVertical: 8,
    },
    typeFilters: {
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    typeScrollContent: {
        paddingRight: 16,
    },
    typeChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        marginRight: 8,
    },
    typeChipText: {
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

export default InventoryTrackingScreen;