import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../contexts/ThemeContext';
import { Card, LoadingSpinner } from '../components/ui';
import { InventoryValuation } from '../types';
import apiService from '../services/api';

const BatchValuationScreen: React.FC = () => {
    const { theme } = useTheme();
    const navigation = useNavigation();

    const [valuation, setValuation] = useState<InventoryValuation | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadValuation();
    }, []);

    const loadValuation = async (isRefresh = false) => {
        try {
            if (isRefresh) {
                setIsRefreshing(true);
            } else {
                setIsLoading(true);
            }
            setError(null);

            const response = await apiService.getInventoryValuation();

            if (response.success && response.data) {
                setValuation(response.data);
            } else {
                setError('Failed to load valuation data');
            }
        } catch (error: any) {
            console.error('Error loading valuation:', error);
            setError(error.message || 'Failed to load valuation');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    const formatCurrency = (amount: number) => `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const formatPercent = (value: number) => `${value.toFixed(2)}%`;

    if (isLoading) {
        return <LoadingSpinner overlay text="Loading inventory valuation..." />;
    }

    if (error || !valuation) {
        return (
            <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
                <View style={styles.errorContainer}>
                    <Icon name="error" size={64} color={theme.colors.error[500]} />
                    <Text style={[styles.errorText, { color: theme.colors.text }]}>
                        {error || 'Failed to load valuation'}
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: theme.colors.background }]}
            refreshControl={
                <RefreshControl
                    refreshing={isRefreshing}
                    onRefresh={() => loadValuation(true)}
                    colors={[theme.colors.primary[500]]}
                />
            }
        >
            {/* Header Summary Card */}
            <Card variant="elevated" style={styles.summaryCard}>
                <Text style={[styles.summaryTitle, { color: theme.colors.text }]}>
                    Inventory Valuation Summary
                </Text>

                <View style={styles.summaryGrid}>
                    <View style={styles.summaryItem}>
                        <Icon name="category" size={20} color={theme.colors.primary[500]} />
                        <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
                            Products
                        </Text>
                        <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
                            {valuation.summary.totalProducts}
                        </Text>
                    </View>

                    <View style={styles.summaryItem}>
                        <Icon name="layers" size={20} color={theme.colors.info[500]} />
                        <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
                            Batches
                        </Text>
                        <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
                            {valuation.summary.totalBatches}
                        </Text>
                    </View>

                    <View style={styles.summaryItem}>
                        <Icon name="inventory" size={20} color={theme.colors.success[500]} />
                        <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
                            Total Units
                        </Text>
                        <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
                            {valuation.summary.totalQuantity}
                        </Text>
                    </View>
                </View>

                <View style={[styles.divider, { backgroundColor: theme.colors.gray[200] }]} />

                <View style={styles.financialSummary}>
                    <View style={styles.financialRow}>
                        <Text style={[styles.financialLabel, { color: theme.colors.textSecondary }]}>
                            Total Cost Value
                        </Text>
                        <Text style={[styles.financialValue, { color: theme.colors.error[600] }]}>
                            {formatCurrency(valuation.summary.totalCostValue)}
                        </Text>
                    </View>

                    <View style={styles.financialRow}>
                        <Text style={[styles.financialLabel, { color: theme.colors.textSecondary }]}>
                            Total Selling Value
                        </Text>
                        <Text style={[styles.financialValue, { color: theme.colors.success[600] }]}>
                            {formatCurrency(valuation.summary.totalSellingValue)}
                        </Text>
                    </View>

                    <View style={[styles.divider, { backgroundColor: theme.colors.gray[200] }]} />

                    <View style={styles.financialRow}>
                        <Text style={[styles.financialLabel, { color: theme.colors.text, fontWeight: '600' }]}>
                            Potential Profit
                        </Text>
                        <Text style={[styles.potentialProfit, { color: theme.colors.primary[600] }]}>
                            {formatCurrency(valuation.summary.totalPotentialProfit)}
                        </Text>
                    </View>

                    <View style={[styles.profitMarginBadge, { backgroundColor: theme.colors.primary[100] }]}>
                        <Text style={[styles.profitMarginText, { color: theme.colors.primary[700] }]}>
                            Average Margin: {formatPercent(
                                (valuation.summary.totalPotentialProfit / valuation.summary.totalSellingValue) * 100
                            )}
                        </Text>
                    </View>
                </View>
            </Card>

            {/* Product List */}
            <View style={styles.productsSection}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                    Product-wise Valuation
                </Text>
                <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
                    Sorted by total cost value (highest first)
                </Text>

                {valuation.products.map((product, index) => (
                    <TouchableOpacity
                        key={product.productId}
                        style={[styles.productCard, { backgroundColor: theme.colors.card }]}
                        onPress={() => navigation.navigate('ProductDetail', { productId: product.productId })}
                        activeOpacity={0.7}
                    >
                        {/* Product Header */}
                        <View style={styles.productHeader}>
                            <View style={styles.productHeaderLeft}>
                                <View style={[styles.rankBadge, { backgroundColor: theme.colors.primary[100] }]}>
                                    <Text style={[styles.rankText, { color: theme.colors.primary[700] }]}>
                                        #{index + 1}
                                    </Text>
                                </View>
                                <View style={styles.productInfo}>
                                    <Text style={[styles.productName, { color: theme.colors.text }]}>
                                        {product.productName}
                                    </Text>
                                    <Text style={[styles.productSku, { color: theme.colors.textSecondary }]}>
                                        {product.productSku}
                                    </Text>
                                </View>
                            </View>
                            <Icon name="chevron-right" size={20} color={theme.colors.textSecondary} />
                        </View>

                        {/* Batch Count and Stock */}
                        <View style={styles.productStats}>
                            <View style={styles.statPill}>
                                <Icon name="layers" size={14} color={theme.colors.info[500]} />
                                <Text style={[styles.statPillText, { color: theme.colors.text }]}>
                                    {product.totalBatches} {product.totalBatches === 1 ? 'batch' : 'batches'}
                                </Text>
                            </View>
                            <View style={styles.statPill}>
                                <Icon name="inventory" size={14} color={theme.colors.success[500]} />
                                <Text style={[styles.statPillText, { color: theme.colors.text }]}>
                                    {product.totalQuantity} units
                                </Text>
                            </View>
                        </View>

                        {/* Pricing Information */}
                        <View style={styles.pricingGrid}>
                            <View style={styles.pricingItem}>
                                <Text style={[styles.pricingLabel, { color: theme.colors.textSecondary }]}>
                                    Avg Cost
                                </Text>
                                <Text style={[styles.pricingValue, { color: theme.colors.error[600] }]}>
                                    {formatCurrency(product.weightedAvgCostPrice)}
                                </Text>
                            </View>
                            <View style={styles.pricingItem}>
                                <Text style={[styles.pricingLabel, { color: theme.colors.textSecondary }]}>
                                    Avg Selling
                                </Text>
                                <Text style={[styles.pricingValue, { color: theme.colors.success[600] }]}>
                                    {formatCurrency(product.weightedAvgSellingPrice)}
                                </Text>
                            </View>
                            <View style={styles.pricingItem}>
                                <Text style={[styles.pricingLabel, { color: theme.colors.textSecondary }]}>
                                    Margin
                                </Text>
                                <Text style={[styles.pricingValue, { color: theme.colors.primary[600] }]}>
                                    {formatPercent(product.profitMargin)}
                                </Text>
                            </View>
                        </View>

                        {/* Financial Summary */}
                        <View style={[styles.financialBox, { backgroundColor: theme.colors.gray[50] }]}>
                            <View style={styles.financialBoxRow}>
                                <Text style={[styles.financialBoxLabel, { color: theme.colors.textSecondary }]}>
                                    Total Cost Value
                                </Text>
                                <Text style={[styles.financialBoxValue, { color: theme.colors.text }]}>
                                    {formatCurrency(product.totalCostValue)}
                                </Text>
                            </View>
                            <View style={styles.financialBoxRow}>
                                <Text style={[styles.financialBoxLabel, { color: theme.colors.textSecondary }]}>
                                    Potential Revenue
                                </Text>
                                <Text style={[styles.financialBoxValue, { color: theme.colors.text }]}>
                                    {formatCurrency(product.totalSellingValue)}
                                </Text>
                            </View>
                            <View style={[styles.divider, { backgroundColor: theme.colors.gray[300], marginVertical: 6 }]} />
                            <View style={styles.financialBoxRow}>
                                <Text style={[styles.financialBoxLabel, { color: theme.colors.text, fontWeight: '600' }]}>
                                    Potential Profit
                                </Text>
                                <Text style={[styles.profitValue, { color: theme.colors.primary[600] }]}>
                                    {formatCurrency(product.potentialProfit)}
                                </Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                ))}
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    summaryCard: {
        margin: 16,
    },
    summaryTitle: {
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 16,
    },
    summaryGrid: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 16,
    },
    summaryItem: {
        alignItems: 'center',
        gap: 6,
    },
    summaryLabel: {
        fontSize: 12,
    },
    summaryValue: {
        fontSize: 18,
        fontWeight: '600',
    },
    divider: {
        height: 1,
        marginVertical: 12,
    },
    financialSummary: {
        gap: 8,
    },
    financialRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    financialLabel: {
        fontSize: 14,
    },
    financialValue: {
        fontSize: 16,
        fontWeight: '500',
    },
    potentialProfit: {
        fontSize: 20,
        fontWeight: '700',
    },
    profitMarginBadge: {
        alignSelf: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 16,
        marginTop: 8,
    },
    profitMarginText: {
        fontSize: 14,
        fontWeight: '600',
    },
    productsSection: {
        padding: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 4,
    },
    sectionSubtitle: {
        fontSize: 12,
        marginBottom: 12,
    },
    productCard: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    productHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    productHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    rankBadge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    rankText: {
        fontSize: 12,
        fontWeight: '700',
    },
    productInfo: {
        flex: 1,
    },
    productName: {
        fontSize: 16,
        fontWeight: '600',
    },
    productSku: {
        fontSize: 12,
        marginTop: 2,
    },
    productStats: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
    },
    statPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        backgroundColor: '#F5F5F5',
        borderRadius: 12,
    },
    statPillText: {
        fontSize: 11,
    },
    pricingGrid: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 12,
    },
    pricingItem: {
        alignItems: 'center',
    },
    pricingLabel: {
        fontSize: 11,
        marginBottom: 4,
    },
    pricingValue: {
        fontSize: 14,
        fontWeight: '600',
    },
    financialBox: {
        borderRadius: 8,
        padding: 12,
    },
    financialBoxRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    financialBoxLabel: {
        fontSize: 13,
    },
    financialBoxValue: {
        fontSize: 14,
        fontWeight: '500',
    },
    profitValue: {
        fontSize: 16,
        fontWeight: '700',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    errorText: {
        fontSize: 18,
        textAlign: 'center',
        marginVertical: 16,
    },
});

export default BatchValuationScreen;
