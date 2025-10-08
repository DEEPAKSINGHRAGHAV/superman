import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
} from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../contexts/ThemeContext';
import { Card, LoadingSpinner, EmptyState } from '../components/ui';
import { RootStackParamList } from '../types';
import apiService from '../services/api';

type BatchHistoryScreenNavigationProp = StackNavigationProp<RootStackParamList>;

interface Batch {
    _id: string;
    batchNumber: string;
    product: {
        _id: string;
        name: string;
        sku: string;
        barcode?: string;
    };
    costPrice: number;
    sellingPrice: number;
    initialQuantity: number;
    currentQuantity: number;
    availableQuantity: number;
    purchaseDate: string;
    expiryDate?: string;
    status: 'active' | 'depleted' | 'expired' | 'damaged' | 'returned';
    supplier?: {
        name: string;
    };
    purchaseOrder?: {
        orderNumber: string;
    };
    daysUntilExpiry?: number;
    isExpired: boolean;
    batchValue: number;
    profitMargin: string;
}

type FilterStatus = 'all' | 'active' | 'depleted' | 'expired' | 'damaged';

const STATUS_FILTERS: { label: string; value: FilterStatus }[] = [
    { label: 'All', value: 'all' },
    { label: 'Active', value: 'active' },
    { label: 'Depleted', value: 'depleted' },
    { label: 'Expired', value: 'expired' },
    { label: 'Damaged', value: 'damaged' },
];

const BatchHistoryScreen: React.FC = () => {
    const { theme } = useTheme();
    const navigation = useNavigation<BatchHistoryScreenNavigationProp>();
    const route = useRoute();
    const { productId } = (route.params as { productId?: string }) || {};

    const [batches, setBatches] = useState<Batch[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [selectedFilter, setSelectedFilter] = useState<FilterStatus>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    const loadBatches = async (page: number = 1, refresh: boolean = false) => {
        try {
            if (refresh) {
                setIsRefreshing(true);
            } else if (page === 1) {
                setIsLoading(true);
            } else {
                setIsLoadingMore(true);
            }

            const params: any = {
                page,
                limit: 20,
                ...(productId && { product: productId }),
                ...(selectedFilter !== 'all' && { status: selectedFilter }),
            };

            const response = await apiService.getBatches(params);

            if (response.success && response.data) {
                if (page === 1) {
                    setBatches(response.data);
                } else {
                    setBatches(prev => [...prev, ...response.data]);
                }
                setHasMore(response.page < response.pages);
                setCurrentPage(page);
            }
        } catch (error: any) {
            console.error('Error loading batches:', error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
            setIsLoadingMore(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadBatches(1);
        }, [selectedFilter, productId])
    );

    const handleRefresh = () => {
        loadBatches(1, true);
    };

    const handleLoadMore = () => {
        if (!isLoadingMore && hasMore) {
            loadBatches(currentPage + 1);
        }
    };

    const handleFilterChange = (filter: FilterStatus) => {
        setSelectedFilter(filter);
        setCurrentPage(1);
    };

    const handleProductPress = (productId: string) => {
        navigation.navigate('ProductDetail', { productId });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return theme.colors.success[500];
            case 'depleted':
                return theme.colors.gray[500];
            case 'expired':
                return theme.colors.error[500];
            case 'damaged':
                return theme.colors.warning[500];
            case 'returned':
                return theme.colors.info[500];
            default:
                return theme.colors.gray[500];
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'active':
                return 'check-circle';
            case 'depleted':
                return 'remove-circle';
            case 'expired':
                return 'warning';
            case 'damaged':
                return 'error';
            case 'returned':
                return 'undo';
            default:
                return 'info';
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    };

    const renderBatchCard = ({ item }: { item: Batch }) => {
        const statusColor = getStatusColor(item.status);
        const statusIcon = getStatusIcon(item.status);

        return (
            <Card variant="outlined" style={styles.batchCard}>
                {/* Header */}
                <View style={styles.cardHeader}>
                    <View style={styles.headerLeft}>
                        <Text style={[styles.batchNumber, { color: theme.colors.text }]}>
                            {item.batchNumber}
                        </Text>
                        <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                            <Icon name={statusIcon} size={14} color={statusColor} />
                            <Text style={[styles.statusText, { color: statusColor }]}>
                                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Product Info */}
                {!productId && item.product && (
                    <TouchableOpacity
                        onPress={() => handleProductPress(item.product._id)}
                        style={styles.productSection}
                    >
                        <Icon name="inventory-2" size={16} color={theme.colors.textSecondary} />
                        <Text style={[styles.productName, { color: theme.colors.text }]}>
                            {item.product.name}
                        </Text>
                        <Icon name="chevron-right" size={16} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                )}

                {/* Quantity Info */}
                <View style={styles.infoRow}>
                    <View style={styles.infoItem}>
                        <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>
                            Initial Qty
                        </Text>
                        <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                            {item.initialQuantity}
                        </Text>
                    </View>
                    <View style={styles.infoItem}>
                        <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>
                            Current Qty
                        </Text>
                        <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                            {item.currentQuantity}
                        </Text>
                    </View>
                    <View style={styles.infoItem}>
                        <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>
                            Available
                        </Text>
                        <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                            {item.availableQuantity}
                        </Text>
                    </View>
                </View>

                {/* Price Info */}
                <View style={styles.infoRow}>
                    <View style={styles.infoItem}>
                        <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>
                            Cost Price
                        </Text>
                        <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                            {formatCurrency(item.costPrice)}
                        </Text>
                    </View>
                    <View style={styles.infoItem}>
                        <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>
                            Selling Price
                        </Text>
                        <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                            {formatCurrency(item.sellingPrice)}
                        </Text>
                    </View>
                    <View style={styles.infoItem}>
                        <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>
                            Profit
                        </Text>
                        <Text style={[styles.infoValue, { color: theme.colors.success[500] }]}>
                            {item.profitMargin}%
                        </Text>
                    </View>
                </View>

                {/* Date Info */}
                <View style={styles.dateSection}>
                    <View style={styles.dateItem}>
                        <Icon name="event" size={14} color={theme.colors.textSecondary} />
                        <Text style={[styles.dateText, { color: theme.colors.textSecondary }]}>
                            Purchased: {formatDate(item.purchaseDate)}
                        </Text>
                    </View>
                    {item.expiryDate && (
                        <View style={styles.dateItem}>
                            <Icon
                                name="schedule"
                                size={14}
                                color={item.isExpired ? theme.colors.error[500] : theme.colors.textSecondary}
                            />
                            <Text
                                style={[
                                    styles.dateText,
                                    {
                                        color: item.isExpired
                                            ? theme.colors.error[500]
                                            : theme.colors.textSecondary,
                                    },
                                ]}
                            >
                                Expires: {formatDate(item.expiryDate)}
                                {item.daysUntilExpiry !== undefined &&
                                    ` (${item.daysUntilExpiry > 0 ? `${item.daysUntilExpiry} days` : 'Expired'})`}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Supplier & PO Info */}
                {(item.supplier || item.purchaseOrder) && (
                    <View style={styles.additionalInfo}>
                        {item.supplier && (
                            <Text style={[styles.smallText, { color: theme.colors.textSecondary }]}>
                                <Icon name="business" size={12} color={theme.colors.textSecondary} />{' '}
                                {item.supplier.name}
                            </Text>
                        )}
                        {item.purchaseOrder && (
                            <Text style={[styles.smallText, { color: theme.colors.textSecondary }]}>
                                <Icon name="description" size={12} color={theme.colors.textSecondary} />{' '}
                                {item.purchaseOrder.orderNumber}
                            </Text>
                        )}
                    </View>
                )}

                {/* Batch Value (for non-depleted batches) */}
                {item.currentQuantity > 0 && (
                    <View style={[styles.valueBadge, { backgroundColor: theme.colors.primary[50] }]}>
                        <Text style={[styles.valueText, { color: theme.colors.primary[700] }]}>
                            Current Value: {formatCurrency(item.batchValue)}
                        </Text>
                    </View>
                )}
            </Card>
        );
    };

    if (isLoading) {
        return <LoadingSpinner overlay text="Loading batch history..." />;
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: theme.colors.primary[500] }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Icon name="arrow-back" size={24} color={theme.colors.white} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.colors.white }]}>
                    {productId ? 'Product Batch History' : 'All Batches'}
                </Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Filter Chips */}
            <View style={styles.filterSection}>
                <FlatList
                    horizontal
                    data={STATUS_FILTERS}
                    keyExtractor={(item) => item.value}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterList}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            onPress={() => handleFilterChange(item.value)}
                            style={[
                                styles.filterChip,
                                {
                                    backgroundColor:
                                        selectedFilter === item.value
                                            ? theme.colors.primary[500]
                                            : theme.colors.gray[100],
                                },
                            ]}
                        >
                            <Text
                                style={[
                                    styles.filterChipText,
                                    {
                                        color:
                                            selectedFilter === item.value
                                                ? theme.colors.white
                                                : theme.colors.text,
                                    },
                                ]}
                            >
                                {item.label}
                            </Text>
                        </TouchableOpacity>
                    )}
                />
            </View>

            {/* Batch List */}
            {batches.length === 0 ? (
                <EmptyState
                    icon="inventory"
                    title="No Batches Found"
                    message={`No ${selectedFilter !== 'all' ? selectedFilter : ''} batches available.`}
                />
            ) : (
                <FlatList
                    data={batches}
                    renderItem={renderBatchCard}
                    keyExtractor={(item) => item._id}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
                    }
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={
                        isLoadingMore ? (
                            <View style={styles.loadingMore}>
                                <LoadingSpinner text="Loading more..." />
                            </View>
                        ) : null
                    }
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 50,
        paddingBottom: 16,
        paddingHorizontal: 16,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '600',
    },
    filterSection: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    filterList: {
        paddingHorizontal: 16,
        gap: 8,
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 8,
    },
    filterChipText: {
        fontSize: 14,
        fontWeight: '500',
    },
    listContent: {
        padding: 16,
    },
    batchCard: {
        marginBottom: 16,
        padding: 16,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    batchNumber: {
        fontSize: 16,
        fontWeight: '600',
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
        fontWeight: '600',
    },
    productSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: '#F5F5F5',
        borderRadius: 8,
        marginBottom: 12,
    },
    productName: {
        flex: 1,
        fontSize: 14,
        fontWeight: '500',
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    infoItem: {
        flex: 1,
        alignItems: 'center',
    },
    infoLabel: {
        fontSize: 11,
        fontWeight: '500',
        marginBottom: 4,
    },
    infoValue: {
        fontSize: 14,
        fontWeight: '600',
    },
    dateSection: {
        gap: 6,
        marginBottom: 8,
    },
    dateItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    dateText: {
        fontSize: 12,
    },
    additionalInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#E8E8E8',
        marginTop: 8,
    },
    smallText: {
        fontSize: 11,
    },
    valueBadge: {
        marginTop: 12,
        padding: 8,
        borderRadius: 8,
        alignItems: 'center',
    },
    valueText: {
        fontSize: 13,
        fontWeight: '600',
    },
    loadingMore: {
        paddingVertical: 20,
    },
});

export default BatchHistoryScreen;

