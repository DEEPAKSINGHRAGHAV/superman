import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../contexts/ThemeContext';
import { InventoryBatch, BatchSummary } from '../types';

interface BatchListProps {
    batchSummary: BatchSummary | null;
    onBatchPress?: (batch: InventoryBatch) => void;
    showHeader?: boolean;
}

export const BatchList: React.FC<BatchListProps> = ({
    batchSummary,
    onBatchPress,
    showHeader = true,
}) => {
    const { theme } = useTheme();

    if (!batchSummary || batchSummary.batches.length === 0) {
        return (
            <View style={[styles.emptyContainer, { backgroundColor: theme.colors.background }]}>
                <Icon name="inventory-2" size={48} color={theme.colors.gray[400]} />
                <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                    No batches available
                </Text>
            </View>
        );
    }

    const formatPrice = (price: number) => `₹${price.toFixed(2)}`;
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
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
            default:
                return theme.colors.gray[500];
        }
    };

    const getExpiryWarning = (daysUntilExpiry: number | null) => {
        if (!daysUntilExpiry) return null;
        if (daysUntilExpiry < 0) return { text: 'Expired', color: theme.colors.error[500] };
        if (daysUntilExpiry <= 7) return { text: `${daysUntilExpiry}d left`, color: theme.colors.error[500] };
        if (daysUntilExpiry <= 30) return { text: `${daysUntilExpiry}d left`, color: theme.colors.warning[500] };
        return { text: `${daysUntilExpiry}d left`, color: theme.colors.success[500] };
    };

    const renderBatch = ({ item: batch, index }: { item: InventoryBatch; index: number }) => {
        const expiryWarning = batch.daysUntilExpiry !== null && batch.daysUntilExpiry !== undefined
            ? getExpiryWarning(batch.daysUntilExpiry)
            : null;

        return (
            <TouchableOpacity
                style={[styles.batchCard, { backgroundColor: theme.colors.card }]}
                onPress={() => onBatchPress?.(batch)}
                activeOpacity={onBatchPress ? 0.7 : 1}
            >
                {/* Batch Header */}
                <View style={styles.batchHeader}>
                    <View style={styles.batchNumberContainer}>
                        <Icon name="qr-code" size={16} color={theme.colors.primary[500]} />
                        <Text style={[styles.batchNumber, { color: theme.colors.primary[500] }]}>
                            {batch.batchNumber}
                        </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(batch.status)}20` }]}>
                        <Text style={[styles.statusText, { color: getStatusColor(batch.status) }]}>
                            {batch.status.toUpperCase()}
                        </Text>
                    </View>
                </View>

                {/* Pricing Information */}
                <View style={styles.pricingRow}>
                    <View style={styles.priceItem}>
                        <Text style={[styles.priceLabel, { color: theme.colors.textSecondary }]}>
                            Cost Price
                        </Text>
                        <Text style={[styles.priceValue, { color: theme.colors.error[500] }]}>
                            {formatPrice(batch.costPrice)}
                        </Text>
                    </View>
                    <View style={styles.priceItem}>
                        <Text style={[styles.priceLabel, { color: theme.colors.textSecondary }]}>
                            Selling Price
                        </Text>
                        <Text style={[styles.priceValue, { color: theme.colors.success[500] }]}>
                            {formatPrice(batch.sellingPrice)}
                        </Text>
                    </View>
                    <View style={styles.priceItem}>
                        <Text style={[styles.priceLabel, { color: theme.colors.textSecondary }]}>
                            Margin
                        </Text>
                        <Text style={[styles.priceValue, { color: theme.colors.primary[500] }]}>
                            {batch.profitMargin ? `${batch.profitMargin.toFixed(1)}%` : 'N/A'}
                        </Text>
                    </View>
                </View>

                {/* Stock Information */}
                <View style={styles.stockRow}>
                    <View style={styles.stockItem}>
                        <Icon name="inventory" size={16} color={theme.colors.textSecondary} />
                        <Text style={[styles.stockText, { color: theme.colors.text }]}>
                            {batch.currentQuantity} / {batch.initialQuantity} units
                        </Text>
                    </View>
                    {batch.availableQuantity !== batch.currentQuantity && (
                        <View style={styles.stockItem}>
                            <Icon name="lock" size={14} color={theme.colors.warning[500]} />
                            <Text style={[styles.stockText, { color: theme.colors.warning[500] }]}>
                                {batch.reservedQuantity} reserved
                            </Text>
                        </View>
                    )}
                </View>

                {/* Date Information */}
                <View style={styles.dateRow}>
                    <View style={styles.dateItem}>
                        <Icon name="event" size={14} color={theme.colors.textSecondary} />
                        <Text style={[styles.dateText, { color: theme.colors.textSecondary }]}>
                            Purchased: {formatDate(batch.purchaseDate)}
                        </Text>
                    </View>
                    {batch.expiryDate && (
                        <View style={styles.dateItem}>
                            <Icon name="schedule" size={14} color={expiryWarning?.color || theme.colors.textSecondary} />
                            <Text style={[styles.dateText, { color: expiryWarning?.color || theme.colors.textSecondary }]}>
                                {expiryWarning?.text || formatDate(batch.expiryDate)}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Batch Value */}
                {batch.batchValue !== undefined && (
                    <View style={[styles.valueContainer, { backgroundColor: theme.colors.gray[100] }]}>
                        <Text style={[styles.valueLabel, { color: theme.colors.textSecondary }]}>
                            Batch Value:
                        </Text>
                        <Text style={[styles.valueAmount, { color: theme.colors.text }]}>
                            {formatPrice(batch.batchValue)}
                        </Text>
                    </View>
                )}

                {/* Location */}
                {batch.location && (
                    <View style={styles.locationRow}>
                        <Icon name="place" size={14} color={theme.colors.textSecondary} />
                        <Text style={[styles.locationText, { color: theme.colors.textSecondary }]}>
                            {batch.location}
                        </Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            {showHeader && (
                <View style={styles.headerContainer}>
                    <View style={styles.headerTitleRow}>
                        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
                            Batch Information
                        </Text>
                        <View style={[styles.batchCountBadge, { backgroundColor: theme.colors.primary[100] }]}>
                            <Text style={[styles.batchCountText, { color: theme.colors.primary[700] }]}>
                                {batchSummary.totalBatches} {batchSummary.totalBatches === 1 ? 'Batch' : 'Batches'}
                            </Text>
                        </View>
                    </View>

                    {/* Price Range Summary */}
                    <View style={[styles.summaryCard, { backgroundColor: theme.colors.gray[100] }]}>
                        <View style={styles.summaryRow}>
                            <View style={styles.summaryItem}>
                                <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
                                    Total Stock
                                </Text>
                                <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
                                    {batchSummary.totalQuantity} units
                                </Text>
                            </View>
                            <View style={styles.summaryDivider} />
                            <View style={styles.summaryItem}>
                                <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
                                    Cost Range
                                </Text>
                                <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
                                    {formatPrice(batchSummary.priceRange.minCostPrice)} - {formatPrice(batchSummary.priceRange.maxCostPrice)}
                                </Text>
                            </View>
                        </View>
                        <View style={[styles.summaryDividerHorizontal, { backgroundColor: theme.colors.gray[300] }]} />
                        <View style={styles.summaryRow}>
                            <View style={styles.summaryItem}>
                                <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
                                    Selling Range
                                </Text>
                                <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
                                    {formatPrice(batchSummary.priceRange.minSellingPrice)} - {formatPrice(batchSummary.priceRange.maxSellingPrice)}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>
            )}

            <FlatList
                data={batchSummary.batches}
                renderItem={renderBatch}
                keyExtractor={(item) => item._id}
                contentContainerStyle={styles.listContainer}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 48,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
    },
    headerContainer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    headerTitleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    batchCountBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    batchCountText: {
        fontSize: 12,
        fontWeight: '600',
    },
    summaryCard: {
        borderRadius: 8,
        padding: 12,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    summaryItem: {
        flex: 1,
        alignItems: 'center',
    },
    summaryLabel: {
        fontSize: 12,
        marginBottom: 4,
    },
    summaryValue: {
        fontSize: 14,
        fontWeight: '600',
    },
    summaryDivider: {
        width: 1,
        backgroundColor: '#E0E0E0',
        marginHorizontal: 8,
    },
    summaryDividerHorizontal: {
        height: 1,
        marginVertical: 8,
    },
    listContainer: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    separator: {
        height: 12,
    },
    batchCard: {
        borderRadius: 8,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    batchHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    batchNumberContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    batchNumber: {
        fontSize: 14,
        fontWeight: '600',
        fontFamily: 'monospace',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '600',
    },
    pricingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    priceItem: {
        flex: 1,
        alignItems: 'center',
    },
    priceLabel: {
        fontSize: 11,
        marginBottom: 4,
    },
    priceValue: {
        fontSize: 16,
        fontWeight: '600',
    },
    stockRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    stockItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    stockText: {
        fontSize: 13,
    },
    dateRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    dateItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    dateText: {
        fontSize: 11,
    },
    valueContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 8,
        borderRadius: 4,
        marginTop: 8,
    },
    valueLabel: {
        fontSize: 12,
    },
    valueAmount: {
        fontSize: 14,
        fontWeight: '600',
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 4,
    },
    locationText: {
        fontSize: 11,
        fontStyle: 'italic',
    },
});
