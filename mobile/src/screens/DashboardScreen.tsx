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
import { StatsCard, EmptyState } from '../components';
import { LoadingSpinner } from '../components/ui';
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

    const handleScanBarcode = () => {
        navigation.navigate(SCREEN_NAMES.BARCODE_SCANNER);
    };

    const handleNewOrder = () => {
        navigation.navigate(SCREEN_NAMES.PURCHASE_ORDER_FORM, {});
    };

    const handleBatchValuation = () => {
        navigation.navigate(SCREEN_NAMES.BATCH_VALUATION);
    };

    const handleExpiringProducts = () => {
        navigation.navigate(SCREEN_NAMES.EXPIRING_PRODUCTS);
    };

    const handleBilling = () => {
        navigation.navigate(SCREEN_NAMES.BILLING);
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

                    {/* Primary Actions Grid - 2x2 */}
                    <View style={styles.quickActionsGrid}>
                        {/* Billing - Primary Action */}
                        <TouchableOpacity
                            style={[styles.quickActionCard, { backgroundColor: '#10B981' }]}
                            onPress={handleBilling}
                            activeOpacity={0.8}
                        >
                            <View style={styles.quickActionIconContainer}>
                                <Icon name="receipt-long" size={32} color="#FFFFFF" />
                            </View>
                            <Text style={styles.quickActionTitle}>Billing</Text>
                            <Text style={styles.quickActionSubtitle}>Point of Sale</Text>
                        </TouchableOpacity>

                        {/* Barcode Scanner */}
                        <TouchableOpacity
                            style={[styles.quickActionCard, { backgroundColor: '#3B82F6' }]}
                            onPress={handleScanBarcode}
                            activeOpacity={0.8}
                        >
                            <View style={styles.quickActionIconContainer}>
                                <Icon name="qr-code-scanner" size={32} color="#FFFFFF" />
                            </View>
                            <Text style={styles.quickActionTitle}>Scan Product</Text>
                            <Text style={styles.quickActionSubtitle}>Barcode Lookup</Text>
                        </TouchableOpacity>

                        {/* New Purchase Order */}
                        <TouchableOpacity
                            style={[styles.quickActionCard, { backgroundColor: '#F59E0B' }]}
                            onPress={handleNewOrder}
                            activeOpacity={0.8}
                        >
                            <View style={styles.quickActionIconContainer}>
                                <Icon name="shopping-cart" size={32} color="#FFFFFF" />
                            </View>
                            <Text style={styles.quickActionTitle}>New Order</Text>
                            <Text style={styles.quickActionSubtitle}>Purchase Order</Text>
                        </TouchableOpacity>

                        {/* Inventory Valuation */}
                        <TouchableOpacity
                            style={[styles.quickActionCard, { backgroundColor: '#8B5CF6' }]}
                            onPress={handleBatchValuation}
                            activeOpacity={0.8}
                        >
                            <View style={styles.quickActionIconContainer}>
                                <Icon name="trending-up" size={32} color="#FFFFFF" />
                            </View>
                            <Text style={styles.quickActionTitle}>Valuation</Text>
                            <Text style={styles.quickActionSubtitle}>Profit Analysis</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Expiring Products - Full Width Alert Card */}
                    <TouchableOpacity
                        style={[styles.expiringAlertCard, {
                            backgroundColor: theme.colors.error[50],
                            borderColor: theme.colors.error[200],
                        }]}
                        onPress={handleExpiringProducts}
                        activeOpacity={0.7}
                    >
                        <View style={styles.expiringAlertContent}>
                            <View style={[styles.expiringAlertIcon, { backgroundColor: theme.colors.error[500] }]}>
                                <Icon name="event-busy" size={24} color={theme.colors.white} />
                            </View>
                            <View style={styles.expiringAlertText}>
                                <Text style={[styles.expiringAlertTitle, { color: theme.colors.error[700] }]}>
                                    Expiring Products Alert
                                </Text>
                                <Text style={[styles.expiringAlertSubtitle, { color: theme.colors.error[600] }]}>
                                    Check items expiring soon or expired
                                </Text>
                            </View>
                            <Icon name="chevron-right" size={24} color={theme.colors.error[500]} />
                        </View>
                    </TouchableOpacity>
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
    quickActionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 16,
    },
    quickActionCard: {
        width: '48%',
        aspectRatio: 1,
        borderRadius: 16,
        padding: 16,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
    },
    quickActionIconContainer: {
        marginBottom: 12,
    },
    quickActionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 4,
        textAlign: 'center',
    },
    quickActionSubtitle: {
        fontSize: 12,
        color: '#FFFFFF',
        opacity: 0.9,
        textAlign: 'center',
    },
    expiringAlertCard: {
        borderRadius: 14,
        padding: 16,
        borderWidth: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 3,
    },
    expiringAlertContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    expiringAlertIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    expiringAlertText: {
        flex: 1,
    },
    expiringAlertTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 4,
    },
    expiringAlertSubtitle: {
        fontSize: 13,
        lineHeight: 18,
        fontWeight: '500',
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 8,
    },
    bottomSpacing: {
        height: 20,
    },
});

export default DashboardScreen;