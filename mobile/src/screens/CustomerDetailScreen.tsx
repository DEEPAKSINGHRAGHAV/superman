import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    FlatList,
    RefreshControl,
    Modal,
    Alert,
} from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../contexts/ThemeContext';
import { Card, LoadingSpinner, Button } from '../components/ui';
import { CustomerDetailData, Bill, RootStackParamList } from '../types';
import apiService from '../services/api';

const CustomerDetailScreen: React.FC = () => {
    const { theme } = useTheme();
    const route = useRoute();
    const navigation = useNavigation();
    const { customerId } = route.params as { customerId: string };

    const [data, setData] = useState<CustomerDetailData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 0,
    });
    const [bills, setBills] = useState<Bill[]>([]);
    const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
    const [showReceiptModal, setShowReceiptModal] = useState(false);
    const abortControllerRef = React.useRef<AbortController | null>(null);

    const loadCustomerData = useCallback(async (page = 1) => {
        // Cancel previous request if exists
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        // Create new AbortController for this request
        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        try {
            setIsLoading(true);
            setError(null);

            const response = await apiService.getCustomerAnalytics(
                customerId, 
                page, 
                50, // Use 50 per page as default
                { signal: abortController.signal }
            );

            // Check if request was aborted before updating state
            if (abortController.signal.aborted) {
                return;
            }

            if (response.success && response.data) {
                setData(response.data);
                setBills(response.data.bills.data);
                setPagination({
                    page: response.data.bills.pagination.currentPage,
                    limit: response.data.bills.pagination.limit,
                    total: response.data.bills.pagination.totalBills,
                    totalPages: response.data.bills.pagination.totalPages,
                });
            } else {
                setError('Customer not found');
            }
        } catch (error: any) {
            // Don't handle aborted requests as errors
            if (error.name === 'AbortError' || error.message === 'Request was cancelled') {
                return;
            }
            console.error('Error loading customer data:', error);
            if (!abortController.signal.aborted) {
                setError(error.message || 'Failed to load customer data');
            }
        } finally {
            if (!abortController.signal.aborted) {
                setIsLoading(false);
                setIsRefreshing(false);
            }
        }
    }, [customerId]);

    useFocusEffect(
        useCallback(() => {
            loadCustomerData(1);
            
            // Cleanup: abort request on unmount
            return () => {
                if (abortControllerRef.current) {
                    abortControllerRef.current.abort();
                    abortControllerRef.current = null;
                }
            };
        }, [loadCustomerData])
    );

    const handleRefresh = useCallback(() => {
        setIsRefreshing(true);
        loadCustomerData(1);
    }, [loadCustomerData]);

    const handlePageChange = useCallback((page: number) => {
        if (page >= 1 && page <= pagination.totalPages) {
            loadCustomerData(page);
        }
    }, [pagination.totalPages, loadCustomerData]);

    const formatCurrency = (amount: number) => {
        return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const formatDateTime = (dateString: string) => {
        return new Date(dateString).toLocaleString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const handleViewReceipt = (bill: Bill) => {
        setSelectedBill(bill);
        setShowReceiptModal(true);
    };

    const handlePrintReceipt = (bill: Bill) => {
        // For mobile, we'll show an alert with print option
        // In a real app, you might integrate with a print service
        Alert.alert(
            'Print Receipt',
            `Print receipt for ${bill.billNumber}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Print',
                    onPress: () => {
                        // You can integrate with a print library here
                        // For now, we'll just show the receipt modal
                        handleViewReceipt(bill);
                    },
                },
            ]
        );
    };

    const getContainerStyle = () => ({
        ...styles.container,
        backgroundColor: theme.colors.background,
    });

    if (isLoading && !data) {
        return <LoadingSpinner overlay text="Loading customer data..." />;
    }

    if (error || !data) {
        return (
            <View style={getContainerStyle()}>
                <View style={styles.errorContainer}>
                    <Icon name="error" size={64} color={theme.colors.error[500]} />
                    <Text style={[styles.errorText, { color: theme.colors.text }]}>
                        {error || 'Customer not found'}
                    </Text>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={[styles.backButton, { backgroundColor: theme.colors.primary[500] }]}
                    >
                        <Text style={styles.backButtonText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    const { customer, analytics, topItems, paymentMethodBreakdown, monthlyTrend } = data;

    return (
        <ScrollView
            style={getContainerStyle()}
            refreshControl={
                <RefreshControl
                    refreshing={isRefreshing}
                    onRefresh={handleRefresh}
                    tintColor={theme.colors.primary[500]}
                />
            }
        >
            <View style={styles.content}>
                {/* Customer Basic Info */}
                <Card variant="elevated" style={styles.card}>
                    <View style={styles.headerRow}>
                        <View style={styles.headerContent}>
                            <Text style={[styles.title, { color: theme.colors.text }]}>
                                {customer.name || 'Walk-in Customer'}
                            </Text>
                            <Text style={[styles.customerNumber, { color: theme.colors.textSecondary }]}>
                                {customer.customerNumber}
                            </Text>
                        </View>
                        <View style={[
                            styles.statusBadge,
                            { backgroundColor: customer.isActive ? theme.colors.success[100] : theme.colors.error[100] }
                        ]}>
                            <Text style={[
                                styles.statusText,
                                { color: customer.isActive ? theme.colors.success[700] : theme.colors.error[700] }
                            ]}>
                                {customer.isActive ? 'Active' : 'Inactive'}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.details}>
                        {customer.phone && (
                            <View style={styles.detailRow}>
                                <Icon name="phone" size={18} color={theme.colors.textSecondary} />
                                <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                                    {customer.phone}
                                </Text>
                            </View>
                        )}

                        {customer.email && (
                            <View style={styles.detailRow}>
                                <Icon name="email" size={18} color={theme.colors.textSecondary} />
                                <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                                    {customer.email}
                                </Text>
                            </View>
                        )}

                        {customer.address && (
                            <View style={styles.detailRow}>
                                <Icon name="location-on" size={18} color={theme.colors.textSecondary} />
                                <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                                    {customer.formattedAddress || 'No address'}
                                </Text>
                            </View>
                        )}

                        {customer.notes && (
                            <View style={styles.detailRow}>
                                <Icon name="notes" size={18} color={theme.colors.textSecondary} />
                                <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                                    {customer.notes}
                                </Text>
                            </View>
                        )}
                    </View>
                </Card>

                {/* Analytics Summary */}
                <Card variant="elevated" style={styles.card}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        Analytics Summary
                    </Text>

                    <View style={styles.statsGrid}>
                        <View style={styles.statCard}>
                            <Text style={[styles.statValue, { color: theme.colors.primary[500] }]}>
                                {analytics.totalBills}
                            </Text>
                            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                                Total Bills
                            </Text>
                        </View>

                        <View style={styles.statCard}>
                            <Text style={[styles.statValue, { color: theme.colors.success[500] }]}>
                                {formatCurrency(analytics.totalRevenue)}
                            </Text>
                            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                                Total Revenue
                            </Text>
                        </View>

                        <View style={styles.statCard}>
                            <Text style={[styles.statValue, { color: theme.colors.warning[500] }]}>
                                {formatCurrency(analytics.totalProfit)}
                            </Text>
                            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                                Total Profit
                            </Text>
                        </View>

                        <View style={styles.statCard}>
                            <Text style={[styles.statValue, { color: theme.colors.info[500] }]}>
                                {analytics.totalItems}
                            </Text>
                            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                                Items Bought
                            </Text>
                        </View>
                    </View>

                    <View style={styles.additionalStats}>
                        <View style={styles.additionalStatRow}>
                            <Text style={[styles.additionalStatLabel, { color: theme.colors.textSecondary }]}>
                                Average Bill Value:
                            </Text>
                            <Text style={[styles.additionalStatValue, { color: theme.colors.text }]}>
                                {formatCurrency(analytics.averageBillValue)}
                            </Text>
                        </View>

                        <View style={styles.additionalStatRow}>
                            <Text style={[styles.additionalStatLabel, { color: theme.colors.textSecondary }]}>
                                Profit Margin:
                            </Text>
                            <Text style={[styles.additionalStatValue, { color: theme.colors.text }]}>
                                {analytics.profitMargin.toFixed(2)}%
                            </Text>
                        </View>

                        {analytics.firstPurchaseDate && (
                            <View style={styles.additionalStatRow}>
                                <Text style={[styles.additionalStatLabel, { color: theme.colors.textSecondary }]}>
                                    First Purchase:
                                </Text>
                                <Text style={[styles.additionalStatValue, { color: theme.colors.text }]}>
                                    {formatDate(analytics.firstPurchaseDate)}
                                </Text>
                            </View>
                        )}

                        {analytics.lastPurchaseDate && (
                            <View style={styles.additionalStatRow}>
                                <Text style={[styles.additionalStatLabel, { color: theme.colors.textSecondary }]}>
                                    Last Purchase:
                                </Text>
                                <Text style={[styles.additionalStatValue, { color: theme.colors.text }]}>
                                    {formatDate(analytics.lastPurchaseDate)}
                                </Text>
                            </View>
                        )}
                    </View>
                </Card>

                {/* Top 10 Most Bought Items */}
                {topItems.length > 0 && (
                    <Card variant="elevated" style={styles.card}>
                        <View style={styles.sectionHeader}>
                            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                                Top 10 Most Bought Items
                            </Text>
                            <View style={styles.infoBadge}>
                                <Icon name="info" size={14} color={theme.colors.textSecondary} style={{ marginRight: 4 }} />
                                <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                                    Based on last 2000 bills
                                </Text>
                            </View>
                        </View>
                        {topItems.map((item, index) => (
                            <View key={index} style={styles.topItemRow}>
                                <View style={styles.topItemInfo}>
                                    <Text style={[styles.topItemName, { color: theme.colors.text }]}>
                                        {item.productName}
                                    </Text>
                                    <Text style={[styles.topItemSku, { color: theme.colors.textSecondary }]}>
                                        SKU: {item.productSku}
                                    </Text>
                                </View>
                                <Text style={[styles.topItemQuantity, { color: theme.colors.primary[500] }]}>
                                    {item.totalQuantity} units
                                </Text>
                            </View>
                        ))}
                    </Card>
                )}

                {/* Payment Method Breakdown */}
                {paymentMethodBreakdown.length > 0 && (
                    <Card variant="elevated" style={styles.card}>
                        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                            Payment Methods
                        </Text>
                        {paymentMethodBreakdown.map((method, index) => (
                            <View key={index} style={styles.paymentMethodRow}>
                                <Text style={[styles.paymentMethodName, { color: theme.colors.text }]}>
                                    {method.paymentMethod}
                                </Text>
                                <View style={styles.paymentMethodStats}>
                                    <Text style={[styles.paymentMethodCount, { color: theme.colors.textSecondary }]}>
                                        {method.count} bills
                                    </Text>
                                    <Text style={[styles.paymentMethodAmount, { color: theme.colors.text }]}>
                                        {formatCurrency(method.totalAmount)}
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </Card>
                )}

                {/* Bills List */}
                <Card variant="elevated" style={styles.card}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        Purchase History ({analytics.totalBills} bills)
                    </Text>
                    {bills.length === 0 ? (
                        <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                            No bills found
                        </Text>
                    ) : (
                        <>
                            {bills.map((bill) => {
                                const totalItems = bill.items ? bill.items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) : 0;
                                return (
                                    <View key={bill._id} style={styles.billRow}>
                                        <TouchableOpacity
                                            style={styles.billInfo}
                                            onPress={() => handleViewReceipt(bill)}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={[styles.billNumber, { color: theme.colors.text }]}>
                                                {bill.billNumber}
                                            </Text>
                                            <Text style={[styles.billDate, { color: theme.colors.textSecondary }]}>
                                                {bill.formattedDate || formatDateTime(bill.createdAt)}
                                            </Text>
                                            <Text style={[styles.billCashier, { color: theme.colors.textSecondary }]}>
                                                {bill.cashierName || (typeof bill.cashier === 'object' ? bill.cashier?.name : 'N/A')} • {totalItems} {totalItems === 1 ? 'item' : 'items'}
                                            </Text>
                                        </TouchableOpacity>
                                        <View style={styles.billAmount}>
                                            <Text style={[styles.billTotal, { color: theme.colors.success[500] }]}>
                                                {formatCurrency(bill.totalAmount)}
                                            </Text>
                                            <Text style={[styles.billProfit, { color: theme.colors.textSecondary }]}>
                                                Profit: {formatCurrency(bill.profit || 0)}
                                            </Text>
                                        </View>
                                        <View style={styles.billActions}>
                                            <TouchableOpacity
                                                onPress={() => handleViewReceipt(bill)}
                                                style={[styles.billActionButton, { backgroundColor: theme.colors.primary[50] }]}
                                            >
                                                <Icon name="visibility" size={18} color={theme.colors.primary[500]} />
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                onPress={() => handlePrintReceipt(bill)}
                                                style={[styles.billActionButton, { backgroundColor: theme.colors.success[50] }]}
                                            >
                                                <Icon name="print" size={18} color={theme.colors.success[500]} />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                );
                            })}
                            
                            {/* Pagination Controls */}
                            {pagination.totalPages > 1 && (
                                <View style={styles.paginationContainer}>
                                    <TouchableOpacity
                                        onPress={() => handlePageChange(pagination.page - 1)}
                                        disabled={pagination.page === 1}
                                        style={[
                                            styles.paginationButton,
                                            { backgroundColor: theme.colors.primary[500] },
                                            pagination.page === 1 && styles.paginationButtonDisabled
                                        ]}
                                    >
                                        <Icon name="chevron-left" size={20} color="white" />
                                    </TouchableOpacity>
                                    
                                    <View style={styles.paginationInfo}>
                                        <Text style={[styles.paginationText, { color: theme.colors.text }]}>
                                            Page {pagination.page} of {pagination.totalPages}
                                        </Text>
                                        <Text style={[styles.paginationSubtext, { color: theme.colors.textSecondary }]}>
                                            {(pagination.page - 1) * pagination.limit + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                                        </Text>
                                    </View>
                                    
                                    <TouchableOpacity
                                        onPress={() => handlePageChange(pagination.page + 1)}
                                        disabled={pagination.page === pagination.totalPages}
                                        style={[
                                            styles.paginationButton,
                                            { backgroundColor: theme.colors.primary[500] },
                                            pagination.page === pagination.totalPages && styles.paginationButtonDisabled
                                        ]}
                                    >
                                        <Icon name="chevron-right" size={20} color="white" />
                                    </TouchableOpacity>
                                </View>
                            )}
                        </>
                    )}
                </Card>
            </View>

            {/* Receipt Modal */}
            <Modal
                visible={showReceiptModal}
                animationType="slide"
                transparent
                onRequestClose={() => {
                    setShowReceiptModal(false);
                    setSelectedBill(null);
                }}
            >
                <View style={styles.receiptModalOverlay}>
                    <View style={[styles.receiptModal, { backgroundColor: theme.colors.white }]}>
                        <View style={styles.receiptHeader}>
                            <Text style={[styles.receiptTitle, { color: theme.colors.text }]}>
                                Receipt
                            </Text>
                            <TouchableOpacity
                                onPress={() => {
                                    setShowReceiptModal(false);
                                    setSelectedBill(null);
                                }}
                                style={styles.receiptCloseButton}
                            >
                                <Icon name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>

                        {selectedBill && (
                            <ScrollView style={styles.receiptContent} showsVerticalScrollIndicator={false}>
                                <View style={styles.receiptInfo}>
                                    <Text style={[styles.receiptLabel, { color: theme.colors.textSecondary }]}>
                                        Bill No.
                                    </Text>
                                    <Text style={[styles.receiptValue, { color: theme.colors.text }]}>
                                        {selectedBill.billNumber}
                                    </Text>
                                </View>
                                <View style={styles.receiptInfo}>
                                    <Text style={[styles.receiptLabel, { color: theme.colors.textSecondary }]}>
                                        Date & Time
                                    </Text>
                                    <Text style={[styles.receiptValue, { color: theme.colors.text }]}>
                                        {selectedBill.formattedDate || formatDateTime(selectedBill.createdAt)}
                                    </Text>
                                </View>
                                <View style={styles.receiptInfo}>
                                    <Text style={[styles.receiptLabel, { color: theme.colors.textSecondary }]}>
                                        Cashier
                                    </Text>
                                    <Text style={[styles.receiptValue, { color: theme.colors.text }]}>
                                        {selectedBill.cashierName || (typeof selectedBill.cashier === 'object' ? selectedBill.cashier?.name : 'N/A')}
                                    </Text>
                                </View>

                                <View style={[styles.receiptDivider, { backgroundColor: theme.colors.gray[200] }]} />

                                {selectedBill.items.map((item, index) => (
                                    <View key={index} style={styles.receiptItem}>
                                        <View style={styles.receiptItemInfo}>
                                            <Text style={[styles.receiptItemName, { color: theme.colors.text }]}>
                                                {item.productName}
                                            </Text>
                                            <Text style={[styles.receiptItemSku, { color: theme.colors.textSecondary }]}>
                                                SKU: {item.productSku} × {item.quantity}
                                            </Text>
                                        </View>
                                        <Text style={[styles.receiptItemPrice, { color: theme.colors.text }]}>
                                            {formatCurrency(item.totalPrice)}
                                        </Text>
                                    </View>
                                ))}

                                <View style={[styles.receiptDivider, { backgroundColor: theme.colors.gray[200] }]} />

                                <View style={styles.receiptInfo}>
                                    <Text style={[styles.receiptLabel, { color: theme.colors.textSecondary }]}>
                                        Subtotal
                                    </Text>
                                    <Text style={[styles.receiptValue, { color: theme.colors.text }]}>
                                        {formatCurrency(selectedBill.subtotal)}
                                    </Text>
                                </View>
                                {selectedBill.taxAmount > 0 && (
                                    <View style={styles.receiptInfo}>
                                        <Text style={[styles.receiptLabel, { color: theme.colors.textSecondary }]}>
                                            Tax
                                        </Text>
                                        <Text style={[styles.receiptValue, { color: theme.colors.text }]}>
                                            {formatCurrency(selectedBill.taxAmount)}
                                        </Text>
                                    </View>
                                )}
                                {selectedBill.discountAmount > 0 && (
                                    <View style={styles.receiptInfo}>
                                        <Text style={[styles.receiptLabel, { color: theme.colors.textSecondary }]}>
                                            Discount
                                        </Text>
                                        <Text style={[styles.receiptValue, { color: theme.colors.success[500] }]}>
                                            -{formatCurrency(selectedBill.discountAmount)}
                                        </Text>
                                    </View>
                                )}
                                <View style={styles.receiptInfo}>
                                    <Text style={[styles.receiptTotalLabel, { color: theme.colors.text }]}>
                                        Total
                                    </Text>
                                    <Text style={[styles.receiptTotalValue, { color: theme.colors.primary[500] }]}>
                                        {formatCurrency(selectedBill.totalAmount)}
                                    </Text>
                                </View>

                                <View style={[styles.receiptDivider, { backgroundColor: theme.colors.gray[200] }]} />

                                <View style={styles.receiptInfo}>
                                    <Text style={[styles.receiptLabel, { color: theme.colors.textSecondary }]}>
                                        Payment Method
                                    </Text>
                                    <Text style={[styles.receiptValue, { color: theme.colors.text }]}>
                                        {selectedBill.paymentMethod}
                                    </Text>
                                </View>
                                {selectedBill.paymentMethod === 'Cash' && (
                                    <>
                                        <View style={styles.receiptInfo}>
                                            <Text style={[styles.receiptLabel, { color: theme.colors.textSecondary }]}>
                                                Amount Received
                                            </Text>
                                            <Text style={[styles.receiptValue, { color: theme.colors.text }]}>
                                                {formatCurrency(selectedBill.amountReceived)}
                                            </Text>
                                        </View>
                                        {selectedBill.change > 0 && (
                                            <View style={styles.receiptInfo}>
                                                <Text style={[styles.receiptLabel, { color: theme.colors.success[500] }]}>
                                                    Change
                                                </Text>
                                                <Text style={[styles.receiptValue, { color: theme.colors.success[500] }]}>
                                                    {formatCurrency(selectedBill.change)}
                                                </Text>
                                            </View>
                                        )}
                                    </>
                                )}
                            </ScrollView>
                        )}

                        <View style={styles.receiptActions}>
                            <Button
                                title="Print"
                                onPress={() => {
                                    if (selectedBill) {
                                        handlePrintReceipt(selectedBill);
                                    }
                                }}
                                variant="outline"
                                size="md"
                                leftIcon={<Icon name="print" size={18} color={theme.colors.primary[500]} />}
                                style={styles.receiptActionButton}
                            />
                            <Button
                                title="Close"
                                onPress={() => {
                                    setShowReceiptModal(false);
                                    setSelectedBill(null);
                                }}
                                variant="primary"
                                size="md"
                                style={styles.receiptActionButton}
                            />
                        </View>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: 16,
    },
    card: {
        marginBottom: 16,
        padding: 16,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    headerContent: {
        flex: 1,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    customerNumber: {
        fontSize: 14,
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    details: {
        gap: 12,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    detailValue: {
        fontSize: 14,
        flex: 1,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        flex: 1,
    },
    infoBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        backgroundColor: 'rgba(0, 0, 0, 0.05)',
    },
    infoText: {
        fontSize: 11,
        fontStyle: 'italic',
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 16,
    },
    statCard: {
        flex: 1,
        minWidth: '45%',
        alignItems: 'center',
        padding: 12,
        backgroundColor: 'rgba(0, 0, 0, 0.02)',
        borderRadius: 8,
    },
    statValue: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        textAlign: 'center',
    },
    additionalStats: {
        gap: 8,
    },
    additionalStatRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    additionalStatLabel: {
        fontSize: 14,
    },
    additionalStatValue: {
        fontSize: 14,
        fontWeight: '500',
    },
    topItemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0, 0, 0, 0.05)',
    },
    topItemInfo: {
        flex: 1,
        marginRight: 12,
    },
    topItemName: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 4,
    },
    topItemSku: {
        fontSize: 12,
    },
    topItemQuantity: {
        fontSize: 16,
        fontWeight: '600',
    },
    paymentMethodRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0, 0, 0, 0.05)',
    },
    paymentMethodName: {
        fontSize: 14,
        fontWeight: '500',
    },
    paymentMethodStats: {
        alignItems: 'flex-end',
    },
    paymentMethodCount: {
        fontSize: 12,
        marginBottom: 2,
    },
    paymentMethodAmount: {
        fontSize: 14,
        fontWeight: '600',
    },
    billRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0, 0, 0, 0.05)',
    },
    billActions: {
        flexDirection: 'row',
        gap: 8,
        marginLeft: 8,
    },
    billActionButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    billInfo: {
        flex: 1,
    },
    billNumber: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 4,
    },
    billDate: {
        fontSize: 12,
    },
    billAmount: {
        alignItems: 'flex-end',
    },
    billTotal: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    billProfit: {
        fontSize: 12,
    },
    billCashier: {
        fontSize: 11,
        marginTop: 2,
    },
    paginationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 8,
        marginTop: 8,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0, 0, 0, 0.1)',
    },
    paginationButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        minWidth: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    paginationButtonDisabled: {
        opacity: 0.5,
    },
    paginationInfo: {
        flex: 1,
        alignItems: 'center',
        marginHorizontal: 12,
    },
    paginationText: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 2,
    },
    paginationSubtext: {
        fontSize: 12,
    },
    emptyText: {
        fontSize: 14,
        textAlign: 'center',
        paddingVertical: 20,
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
    backButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
        marginTop: 16,
    },
    backButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    receiptModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    receiptModal: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '90%',
        paddingBottom: 20,
    },
    receiptHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0, 0, 0, 0.1)',
    },
    receiptTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    receiptCloseButton: {
        padding: 8,
    },
    receiptContent: {
        flex: 1,
        padding: 20,
    },
    receiptInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    receiptLabel: {
        fontSize: 14,
    },
    receiptValue: {
        fontSize: 14,
        fontWeight: '500',
    },
    receiptTotalLabel: {
        fontSize: 16,
        fontWeight: '600',
    },
    receiptTotalValue: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    receiptDivider: {
        height: 1,
        marginVertical: 16,
    },
    receiptItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0, 0, 0, 0.05)',
    },
    receiptItemInfo: {
        flex: 1,
        marginRight: 12,
    },
    receiptItemName: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 4,
    },
    receiptItemSku: {
        fontSize: 12,
    },
    receiptItemPrice: {
        fontSize: 14,
        fontWeight: '600',
    },
    receiptActions: {
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 20,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0, 0, 0, 0.1)',
    },
    receiptActionButton: {
        flex: 1,
    },
});

export default CustomerDetailScreen;

