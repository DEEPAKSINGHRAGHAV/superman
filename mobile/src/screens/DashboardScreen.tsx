import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    TouchableOpacity,
    Dimensions,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { StatsCard, SearchBar, EmptyState } from '../components';
import { Button, Card, LoadingSpinner } from '../components/ui';
import { InventorySummary, DashboardStats, RootStackParamList } from '../types';
import apiService from '../services/api';
import { SCREEN_NAMES } from '../constants';

type DashboardScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const DashboardScreen: React.FC = () => {
    const { theme } = useTheme();
    const { user, logout } = useAuth();
    const navigation = useNavigation<DashboardScreenNavigationProp>();

    const screenWidth = Dimensions.get('window').width;
    const isSmallScreen = screenWidth < 400;

    const [stats, setStats] = useState<DashboardStats>({
        totalProducts: 0,
        lowStockItems: 0,
        totalValue: 0,
        pendingOrders: 0,
    });

    const [inventorySummary, setInventorySummary] = useState<InventorySummary | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadDashboardData = useCallback(async () => {
        try {
            setError(null);

            // Load dashboard stats and inventory summary in parallel
            const [statsResponse, inventoryResponse] = await Promise.all([
                apiService.getInventorySummary(),
                apiService.getInventorySummary(),
            ]);

            if (statsResponse.success && statsResponse.data) {
                const summary = statsResponse.data;
                setStats({
                    totalProducts: summary.totalProducts,
                    lowStockItems: summary.lowStockCount,
                    totalValue: summary.totalValue,
                    pendingOrders: 0, // This would come from purchase orders API
                });
                setInventorySummary(summary);
            }
        } catch (error: any) {
            console.error('Error loading dashboard data:', error);
            setError(error.message || 'Failed to load dashboard data');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadDashboardData();
        }, [loadDashboardData])
    );

    const handleRefresh = useCallback(() => {
        setIsRefreshing(true);
        loadDashboardData();
    }, [loadDashboardData]);

    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const handleAddProduct = () => {
        navigation.navigate(SCREEN_NAMES.PRODUCT_FORM, {});
    };

    const handleScanBarcode = () => {
        navigation.navigate(SCREEN_NAMES.BARCODE_SCANNER);
    };

    const handleNewOrder = () => {
        navigation.navigate(SCREEN_NAMES.PURCHASE_ORDER_FORM, {});
    };

    const handleBatchValuation = () => {
        navigation.navigate(SCREEN_NAMES.BATCH_VALUATION);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const getContainerStyle = () => ({
        ...styles.container,
        backgroundColor: theme.colors.background,
    });

    const getHeaderStyle = () => ({
        ...styles.header,
        backgroundColor: theme.colors.primary[500],
    });

    const getWelcomeTextStyle = () => ({
        ...styles.welcomeText,
        color: theme.colors.white,
    });

    const getSubtitleStyle = () => ({
        ...styles.subtitle,
        color: theme.colors.white,
    });

    const getSectionTitleStyle = () => ({
        ...styles.sectionTitle,
        color: theme.colors.text,
    });

    const getResponsiveStyles = () => ({
        content: {
            ...styles.content,
            paddingHorizontal: isSmallScreen ? 12 : 16,
        },
        actionButtonContainer: {
            ...styles.actionButtonContainer,
            maxWidth: isSmallScreen ? '45%' : '30%',
        },
    });

    if (isLoading) {
        return <LoadingSpinner overlay text="Loading dashboard..." />;
    }

    if (error) {
        return (
            <View style={getContainerStyle()}>
                <View style={getHeaderStyle()}>
                    <View style={styles.headerContent}>
                        <View>
                            <Text style={getWelcomeTextStyle()}>Welcome back!</Text>
                            <Text style={getSubtitleStyle()}>{user?.name || 'User'}</Text>
                        </View>
                        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                            <Icon name="logout" size={24} color={theme.colors.white} />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.content}>
                    <EmptyState
                        icon="error"
                        title="Something went wrong"
                        subtitle={error}
                        actionText="Try Again"
                        onActionPress={handleRefresh}
                    />
                </View>
            </View>
        );
    }

    return (
        <View style={getContainerStyle()}>
            {/* Header */}
            <View style={getHeaderStyle()}>
                <View style={styles.headerContent}>
                    <View>
                        <Text style={getWelcomeTextStyle()}>Welcome back!</Text>
                        <Text style={getSubtitleStyle()}>{user?.name || 'User'}</Text>
                    </View>
                    <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                        <Icon name="logout" size={24} color={theme.colors.white} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Content */}
            <ScrollView
                style={getResponsiveStyles().content}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={handleRefresh}
                        tintColor={theme.colors.primary[500]}
                    />
                }
                showsVerticalScrollIndicator={false}
            >
                {/* Quick Actions */}
                <View style={styles.section}>
                    <Text style={getSectionTitleStyle()}>Quick Actions</Text>
                    <View style={styles.quickActions}>
                        <View style={getResponsiveStyles().actionButtonContainer}>
                            <Button
                                title="Add Product"
                                onPress={handleAddProduct}
                                variant="primary"
                                size="sm"
                                leftIcon={<Icon name="add" size={16} color="white" />}
                                style={styles.actionButton}
                            />
                        </View>
                        <View style={getResponsiveStyles().actionButtonContainer}>
                            <Button
                                title="Barcode"
                                onPress={handleScanBarcode}
                                variant="outline"
                                size="sm"
                                leftIcon={<Icon name="qr-code-scanner" size={16} color={theme.colors.primary[500]} />}
                                style={styles.actionButton}
                            />
                        </View>
                        <View style={getResponsiveStyles().actionButtonContainer}>
                            <Button
                                title="New Order"
                                onPress={handleNewOrder}
                                variant="outline"
                                size="sm"
                                leftIcon={<Icon name="shopping-cart" size={16} color={theme.colors.primary[500]} />}
                                style={styles.actionButton}
                            />
                        </View>
                    </View>
                    <View style={styles.quickActionsSecondRow}>
                        <TouchableOpacity
                            style={[styles.batchValuationCard, { backgroundColor: theme.colors.primary[50] }]}
                            onPress={handleBatchValuation}
                            activeOpacity={0.7}
                        >
                            <View style={styles.batchValuationContent}>
                                <View style={[styles.batchValuationIcon, { backgroundColor: theme.colors.primary[500] }]}>
                                    <Icon name="assessment" size={28} color={theme.colors.white} />
                                </View>
                                <View style={styles.batchValuationText}>
                                    <Text style={[styles.batchValuationTitle, { color: theme.colors.text }]}>
                                        Inventory Valuation
                                    </Text>
                                    <Text style={[styles.batchValuationSubtitle, { color: theme.colors.textSecondary }]}>
                                        View batch-wise profit analysis
                                    </Text>
                                </View>
                                <Icon name="chevron-right" size={24} color={theme.colors.primary[500]} />
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Stats Cards */}
                <View style={styles.section}>
                    <Text style={getSectionTitleStyle()}>Overview</Text>
                    <View style={styles.statsGrid}>
                        <StatsCard
                            title="Total Products"
                            value={stats.totalProducts}
                            icon="inventory"
                            color="#3B82F6"
                            trend={{ value: 12, isPositive: true }}
                        />
                        <StatsCard
                            title="Low Stock Items"
                            value={stats.lowStockItems}
                            icon="warning"
                            color="#F59E0B"
                            trend={{ value: 5, isPositive: false }}
                        />
                        <StatsCard
                            title="Inventory Value"
                            value={formatCurrency(stats.totalValue)}
                            icon="account-balance-wallet"
                            color="#10B981"
                            trend={{ value: 8, isPositive: true }}
                        />
                        <StatsCard
                            title="Pending Orders"
                            value={stats.pendingOrders}
                            icon="pending"
                            color="#8B5CF6"
                        />
                    </View>
                </View>

                {/* Recent Activity */}
                <View style={styles.section}>
                    <Text style={getSectionTitleStyle()}>Recent Activity</Text>
                    <Card variant="elevated" style={styles.activityCard}>
                        <View style={styles.activityItem}>
                            <View style={[styles.activityIcon, { backgroundColor: theme.colors.success[50] }]}>
                                <Icon name="add" size={20} color={theme.colors.success[500]} />
                            </View>
                            <View style={styles.activityContent}>
                                <Text style={[styles.activityTitle, { color: theme.colors.text }]}>
                                    New product added
                                </Text>
                                <Text style={[styles.activitySubtitle, { color: theme.colors.textSecondary }]}>
                                    Apple iPhone 15 Pro - 2 hours ago
                                </Text>
                            </View>
                        </View>

                        <View style={styles.activityItem}>
                            <View style={[styles.activityIcon, { backgroundColor: theme.colors.warning[50] }]}>
                                <Icon name="warning" size={20} color={theme.colors.warning[500]} />
                            </View>
                            <View style={styles.activityContent}>
                                <Text style={[styles.activityTitle, { color: theme.colors.text }]}>
                                    Low stock alert
                                </Text>
                                <Text style={[styles.activitySubtitle, { color: theme.colors.textSecondary }]}>
                                    Samsung Galaxy S24 - 4 hours ago
                                </Text>
                            </View>
                        </View>

                        <View style={styles.activityItem}>
                            <View style={[styles.activityIcon, { backgroundColor: theme.colors.info[50] }]}>
                                <Icon name="shopping-cart" size={20} color={theme.colors.info[500]} />
                            </View>
                            <View style={styles.activityContent}>
                                <Text style={[styles.activityTitle, { color: theme.colors.text }]}>
                                    Purchase order received
                                </Text>
                                <Text style={[styles.activitySubtitle, { color: theme.colors.textSecondary }]}>
                                    Order #PO-2024-001 - 6 hours ago
                                </Text>
                            </View>
                        </View>
                    </Card>
                </View>

                {/* Bottom Spacing */}
                <View style={styles.bottomSpacing} />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingTop: 50,
        paddingBottom: 20,
        paddingHorizontal: 20,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    welcomeText: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 16,
        opacity: 0.9,
    },
    logoutButton: {
        padding: 8,
    },
    content: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 8,
    },
    section: {
        marginTop: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
        marginHorizontal: 4,
    },
    quickActions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 8,
        marginBottom: 8,
    },
    actionButtonContainer: {
        flex: 1,
        minWidth: 100,
        maxWidth: '30%',
    },
    actionButton: {
        width: '100%',
    },
    quickActionsSecondRow: {
        marginTop: 12,
    },
    batchValuationCard: {
        borderRadius: 12,
        padding: 16,
        marginHorizontal: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    batchValuationContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    batchValuationIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    batchValuationText: {
        flex: 1,
    },
    batchValuationTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    batchValuationSubtitle: {
        fontSize: 13,
        lineHeight: 18,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 8,
    },
    activityCard: {
        padding: 16,
    },
    activityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0, 0, 0, 0.1)',
    },
    activityIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    activityContent: {
        flex: 1,
    },
    activityTitle: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 2,
    },
    activitySubtitle: {
        fontSize: 12,
    },
    bottomSpacing: {
        height: 20,
    },
});

export default DashboardScreen;