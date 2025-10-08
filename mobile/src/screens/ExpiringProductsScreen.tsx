import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../contexts/ThemeContext';
import { Card, LoadingSpinner, EmptyState } from '../components/ui';
import { RootStackParamList } from '../types';
import apiService from '../services/api';

type ExpiringProductsScreenNavigationProp = StackNavigationProp<RootStackParamList>;

interface ExpiringBatch {
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
    currentQuantity: number;
    availableQuantity: number;
    purchaseDate: string;
    expiryDate: string;
    daysUntilExpiry: number;
    isExpiringSoon: boolean;
    valueAtRisk: number;
    supplier?: {
        name: string;
    };
}

type FilterDays = 7 | 15 | 30 | 60 | 'expired';

const FILTER_OPTIONS: { label: string; value: FilterDays; icon: string }[] = [
    { label: '7 Days', value: 7, icon: 'warning' },
    { label: '15 Days', value: 15, icon: 'schedule' },
    { label: '30 Days', value: 30, icon: 'event' },
    { label: '60 Days', value: 60, icon: 'date-range' },
    { label: 'Expired', value: 'expired', icon: 'error' },
];

const ExpiringProductsScreen: React.FC = () => {
    const { theme } = useTheme();
    const navigation = useNavigation<ExpiringProductsScreenNavigationProp>();

    const [batches, setBatches] = useState<ExpiringBatch[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [selectedFilter, setSelectedFilter] = useState<FilterDays>(30);

    const loadExpiringBatches = useCallback(async (refresh: boolean = false) => {
        try {
            if (refresh) {
                setIsRefreshing(true);
            } else {
                setIsLoading(true);
            }

            let response;
            if (selectedFilter === 'expired') {
                // Get expired batches using status filter
                response = await apiService.getBatches({ status: 'expired' });
                if (response.success && response.data) {
                    // Map the data to include calculated fields
                    const expiredBatches = response.data.map((batch: any) => ({
                        ...batch,
                        product: batch.product || { _id: '', name: 'Unknown', sku: '' },
                        daysUntilExpiry: batch.expiryDate
                            ? Math.ceil(((new Date(batch.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
                            : 0,
                        isExpiringSoon: false,
                        valueAtRisk: (batch.currentQuantity || 0) * (batch.costPrice || 0)
                    }));
                    setBatches(expiredBatches);
                } else {
                    setBatches([]);
                }
            } else {
                response = await apiService.getExpiringBatches(selectedFilter as number);
                if (response.success && response.data) {
                    const validBatches = response.data.map((batch: any) => ({
                        ...batch,
                        product: batch.product || { _id: '', name: 'Unknown', sku: '' },
                        valueAtRisk: (batch.currentQuantity || 0) * (batch.costPrice || 0)
                    }));
                    setBatches(validBatches);
                } else {
                    setBatches([]);
                }
            }
        } catch (error: any) {
            console.error('Error loading expiring batches:', error);
            setBatches([]); // Set empty array on error to prevent blank screen
            Alert.alert(
                'Error',
                error.message || 'Failed to load expiring products. Please try again.',
                [{ text: 'OK' }]
            );
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [selectedFilter]);

    useFocusEffect(
        useCallback(() => {
            loadExpiringBatches();
        }, [loadExpiringBatches])
    );

    const handleRefresh = () => {
        loadExpiringBatches(true);
    };

    const handleFilterChange = (filter: FilterDays) => {
        setSelectedFilter(filter);
    };

    const handleProductPress = (productId: string) => {
        navigation.navigate('ProductDetail', { productId });
    };

    const handleBatchHistoryPress = (productId: string) => {
        navigation.navigate('BatchHistory', { productId });
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

    const getExpiryColor = (daysUntilExpiry: number) => {
        if (daysUntilExpiry <= 0) return theme.colors.error[500];
        if (daysUntilExpiry <= 7) return theme.colors.error[500];
        if (daysUntilExpiry <= 15) return theme.colors.warning[500];
        return theme.colors.info[500];
    };

    const getExpiryIcon = (daysUntilExpiry: number) => {
        if (daysUntilExpiry <= 0) return 'error';
        if (daysUntilExpiry <= 7) return 'warning';
        if (daysUntilExpiry <= 15) return 'schedule';
        return 'event';
    };

    const getExpiryText = (daysUntilExpiry: number) => {
        if (daysUntilExpiry <= 0) return 'EXPIRED';
        if (daysUntilExpiry === 1) return '1 day left';
        return `${daysUntilExpiry} days left`;
    };

    const renderBatchCard = ({ item }: { item: ExpiringBatch }) => {
        if (!item || !item.product) {
            return null;
        }

        const expiryColor = getExpiryColor(item.daysUntilExpiry || 0);
        const expiryIcon = getExpiryIcon(item.daysUntilExpiry || 0);

        return (
            <Card variant="outlined" style={[styles.batchCard, (item.daysUntilExpiry || 0) <= 0 && { borderColor: theme.colors.error[500], borderWidth: 2 }]}>
                {/* Header */}
                <TouchableOpacity
                    onPress={() => item.product?._id && handleProductPress(item.product._id)}
                    activeOpacity={0.7}
                    disabled={!item.product?._id}
                >
                    <View style={styles.cardHeader}>
                        <View style={styles.headerLeft}>
                            <Text style={[styles.productName, { color: theme.colors.text }]}>
                                {item.product?.name || 'Unknown Product'}
                            </Text>
                            <Text style={[styles.productSku, { color: theme.colors.textSecondary }]}>
                                {item.product?.sku || 'N/A'}
                            </Text>
                        </View>
                        <Icon name="chevron-right" size={20} color={theme.colors.textSecondary} />
                    </View>
                </TouchableOpacity>

                {/* Expiry Warning */}
                <View style={[styles.expiryBanner, { backgroundColor: expiryColor + '20' }]}>
                    <Icon name={expiryIcon} size={20} color={expiryColor} />
                    <Text style={[styles.expiryText, { color: expiryColor }]}>
                        {getExpiryText(item.daysUntilExpiry || 0)}
                    </Text>
                    {item.expiryDate && (
                        <Text style={[styles.expiryDate, { color: expiryColor }]}>
                            (Expiry: {formatDate(item.expiryDate)})
                        </Text>
                    )}
                </View>

                {/* Batch Details */}
                <View style={styles.batchDetails}>
                    <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                            Batch Number:
                        </Text>
                        <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                            {item.batchNumber || 'N/A'}
                        </Text>
                    </View>

                    <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                            Quantity:
                        </Text>
                        <Text style={[styles.detailValue, { color: theme.colors.text, fontWeight: '600' }]}>
                            {item.currentQuantity || 0} units
                        </Text>
                    </View>

                    <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                            Value at Risk:
                        </Text>
                        <Text style={[styles.detailValue, { color: theme.colors.error[500], fontWeight: '700' }]}>
                            {formatCurrency(item.valueAtRisk || 0)}
                        </Text>
                    </View>

                    {item.supplier?.name && (
                        <View style={styles.detailRow}>
                            <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                                Supplier:
                            </Text>
                            <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                                {item.supplier.name}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Actions */}
                {item.product?._id && (
                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: theme.colors.primary[50] }]}
                            onPress={() => handleBatchHistoryPress(item.product._id)}
                        >
                            <Icon name="history" size={16} color={theme.colors.primary[500]} />
                            <Text style={[styles.actionText, { color: theme.colors.primary[500] }]}>
                                View All Batches
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </Card>
        );
    };

    // Calculate summary statistics
    const totalBatches = batches.length;
    const totalQuantity = batches.reduce((sum, batch) => sum + (batch.currentQuantity || 0), 0);
    const totalValueAtRisk = batches.reduce((sum, batch) => sum + (batch.valueAtRisk || 0), 0);
    const expiredCount = batches.filter(b => (b.daysUntilExpiry || 0) <= 0).length;

    if (isLoading) {
        return (
            <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
                <LoadingSpinner text="Loading expiring products..." />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: theme.colors.warning[500] }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Icon name="arrow-back" size={24} color={theme.colors.white} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.colors.white }]}>
                    Expiring Products
                </Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Summary Cards */}
            {batches.length > 0 && (
                <View style={styles.summaryContainer}>
                    <View style={[styles.summaryCard, { backgroundColor: theme.colors.white }]}>
                        <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
                            Total Batches
                        </Text>
                        <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
                            {totalBatches}
                        </Text>
                    </View>
                    <View style={[styles.summaryCard, { backgroundColor: theme.colors.white }]}>
                        <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
                            Total Quantity
                        </Text>
                        <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
                            {totalQuantity}
                        </Text>
                    </View>
                    <View style={[styles.summaryCard, { backgroundColor: theme.colors.white }]}>
                        <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
                            Value at Risk
                        </Text>
                        <Text style={[styles.summaryValue, { color: theme.colors.error[500] }]}>
                            {formatCurrency(totalValueAtRisk)}
                        </Text>
                    </View>
                    {selectedFilter !== 'expired' && expiredCount > 0 && (
                        <View style={[styles.summaryCard, { backgroundColor: theme.colors.error[50] }]}>
                            <Text style={[styles.summaryLabel, { color: theme.colors.error[700] }]}>
                                Already Expired
                            </Text>
                            <Text style={[styles.summaryValue, { color: theme.colors.error[700] }]}>
                                {expiredCount}
                            </Text>
                        </View>
                    )}
                </View>
            )}

            {/* Filter Chips */}
            <View style={styles.filterSection}>
                <FlatList
                    horizontal
                    data={FILTER_OPTIONS}
                    keyExtractor={(item) => item.value.toString()}
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
                                            ? theme.colors.warning[500]
                                            : theme.colors.gray[100],
                                },
                            ]}
                        >
                            <Icon
                                name={item.icon}
                                size={16}
                                color={selectedFilter === item.value ? theme.colors.white : theme.colors.text}
                            />
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
                    icon="check-circle"
                    title="No Expiring Products"
                    message={
                        selectedFilter === 'expired'
                            ? 'No expired batches found.'
                            : `No products expiring in the next ${selectedFilter} days.`
                    }
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
    summaryContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: 16,
        gap: 12,
    },
    summaryCard: {
        flex: 1,
        minWidth: '45%',
        padding: 12,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    summaryLabel: {
        fontSize: 11,
        fontWeight: '500',
        marginBottom: 4,
    },
    summaryValue: {
        fontSize: 20,
        fontWeight: '700',
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
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 8,
        gap: 6,
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
        flex: 1,
    },
    productName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    productSku: {
        fontSize: 12,
    },
    expiryBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
        marginBottom: 12,
        gap: 8,
    },
    expiryText: {
        fontSize: 14,
        fontWeight: '700',
    },
    expiryDate: {
        fontSize: 12,
        fontWeight: '500',
    },
    batchDetails: {
        gap: 8,
        marginBottom: 12,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    detailLabel: {
        fontSize: 13,
    },
    detailValue: {
        fontSize: 13,
    },
    actions: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 8,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10,
        borderRadius: 8,
        gap: 6,
    },
    actionText: {
        fontSize: 13,
        fontWeight: '600',
    },
});

export default ExpiringProductsScreen;

