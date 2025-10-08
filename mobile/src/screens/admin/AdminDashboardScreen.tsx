import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { RootStackParamList } from '../../types';
import { SCREEN_NAMES, COLORS } from '../../constants';
import { Card } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import apiService from '../../services/api';

type AdminDashboardNavigationProp = StackNavigationProp<RootStackParamList>;

interface AdminStats {
    brands: {
        total: number;
        verified: number;
        active: number;
    };
    categories: {
        total: number;
        main: number;
        subcategories: number;
        featured: number;
    };
    products: {
        total: number;
        withBrands: number;
        withCategories: number;
    };
}

const AdminDashboardScreen: React.FC = () => {
    const navigation = useNavigation<AdminDashboardNavigationProp>();
    const { theme, isDark } = useTheme();
    const { user } = useAuth();
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadStats = async () => {
        try {
            setLoading(true);
            const [brandsResponse, categoriesResponse, productsResponse] = await Promise.all([
                apiService.getBrandStats(),
                apiService.getCategoryStats(),
                apiService.getProductStats()
            ]);

            setStats({
                brands: {
                    total: brandsResponse.data?.overview?.totalBrands || 0,
                    verified: brandsResponse.data?.overview?.verifiedBrands || 0,
                    active: brandsResponse.data?.overview?.totalBrands || 0
                },
                categories: {
                    total: categoriesResponse.data?.overview?.totalCategories || 0,
                    main: categoriesResponse.data?.overview?.mainCategories || 0,
                    subcategories: categoriesResponse.data?.overview?.subcategories || 0,
                    featured: categoriesResponse.data?.overview?.featuredCategories || 0
                },
                products: {
                    total: productsResponse.data?.overview?.totalProducts || 0,
                    withBrands: 0, // This would need to be calculated
                    withCategories: productsResponse.data?.overview?.totalProducts || 0
                }
            });
        } catch (error: any) {
            console.error('Error loading admin stats:', error);
            const errorMessage = error.message || 'Failed to load admin statistics';
            console.error('Detailed error:', {
                message: error.message,
                response: error.response,
                status: error.status
            });
            Alert.alert('Error', `Failed to load admin statistics: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadStats();
        setRefreshing(false);
    };

    useEffect(() => {
        loadStats();
    }, []);

    const adminActions = [
        {
            title: 'Manage Brands',
            description: 'Add, edit, and manage product brands',
            icon: 'business',
            color: '#4CAF50',
            onPress: () => navigation.navigate(SCREEN_NAMES.BRAND_LIST as any)
        },
        {
            title: 'Manage Categories',
            description: 'Organize products with categories and subcategories',
            icon: 'category',
            color: '#2196F3',
            onPress: () => navigation.navigate(SCREEN_NAMES.CATEGORY_LIST as any)
        },
        {
            title: 'Manage Suppliers',
            description: 'Add, edit, and manage suppliers',
            icon: 'local-shipping',
            color: '#FF5722',
            onPress: () => navigation.navigate(SCREEN_NAMES.SUPPLIER_LIST as any)
        },
        {
            title: 'Purchase Orders',
            description: 'View and manage purchase orders',
            icon: 'shopping-cart',
            color: '#00BCD4',
            onPress: () => navigation.navigate(SCREEN_NAMES.PURCHASE_ORDER_LIST as any)
        },
        {
            title: 'User Management',
            description: 'Manage user accounts and permissions',
            icon: 'people',
            color: '#FF9800',
            onPress: () => {
                // TODO: Implement user management
                Alert.alert('Coming Soon', 'User management feature will be available soon');
            }
        },
        {
            title: 'System Settings',
            description: 'Configure system-wide settings',
            icon: 'settings',
            color: '#9C27B0',
            onPress: () => {
                // TODO: Implement system settings
                Alert.alert('Coming Soon', 'System settings feature will be available soon');
            }
        }
    ];

    const styles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.colors.background,
        },
        header: {
            padding: 20,
            backgroundColor: theme.colors.primary,
        },
        headerTitle: {
            fontSize: 24,
            fontWeight: 'bold',
            color: theme.colors.surface,
            marginBottom: 4,
        },
        headerSubtitle: {
            fontSize: 16,
            color: theme.colors.surface,
            opacity: 0.8,
        },
        content: {
            flex: 1,
            padding: 16,
        },
        statsContainer: {
            marginBottom: 24,
        },
        statsTitle: {
            fontSize: 18,
            fontWeight: '600',
            color: theme.colors.text,
            marginBottom: 16,
        },
        statsGrid: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
        },
        statCard: {
            width: '48%',
            marginBottom: 12,
        },
        statValue: {
            fontSize: 24,
            fontWeight: 'bold',
            color: theme.colors.primary,
            marginBottom: 4,
        },
        statLabel: {
            fontSize: 14,
            color: theme.colors.textSecondary,
        },
        actionsContainer: {
            marginBottom: 24,
        },
        actionsTitle: {
            fontSize: 18,
            fontWeight: '600',
            color: theme.colors.text,
            marginBottom: 16,
        },
        actionCard: {
            marginBottom: 12,
            padding: 16,
            borderRadius: 12,
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.colors.border,
        },
        actionHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 8,
        },
        actionIcon: {
            width: 40,
            height: 40,
            borderRadius: 20,
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 12,
        },
        actionTitle: {
            fontSize: 16,
            fontWeight: '600',
            color: theme.colors.text,
            flex: 1,
        },
        actionDescription: {
            fontSize: 14,
            color: theme.colors.textSecondary,
            marginLeft: 52,
        },
        loadingContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
        },
        emptyState: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
        },
        emptyStateText: {
            fontSize: 16,
            color: theme.colors.textSecondary,
            textAlign: 'center',
            marginTop: 16,
        },
    });

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <LoadingSpinner size="large" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Admin Dashboard</Text>
                <Text style={styles.headerSubtitle}>
                    Welcome back, {user?.name || 'Admin'}
                </Text>
            </View>

            <ScrollView
                style={styles.content}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {/* Statistics */}
                {stats && (
                    <View style={styles.statsContainer}>
                        <Text style={styles.statsTitle}>Overview</Text>
                        <View style={styles.statsGrid}>
                            <Card style={styles.statCard}>
                                <Text style={styles.statValue}>{stats.brands.total}</Text>
                                <Text style={styles.statLabel}>Total Brands</Text>
                            </Card>
                            <Card style={styles.statCard}>
                                <Text style={styles.statValue}>{stats.brands.verified}</Text>
                                <Text style={styles.statLabel}>Verified Brands</Text>
                            </Card>
                            <Card style={styles.statCard}>
                                <Text style={styles.statValue}>{stats.categories.total}</Text>
                                <Text style={styles.statLabel}>Categories</Text>
                            </Card>
                            <Card style={styles.statCard}>
                                <Text style={styles.statValue}>{stats.categories.subcategories}</Text>
                                <Text style={styles.statLabel}>Subcategories</Text>
                            </Card>
                        </View>
                    </View>
                )}

                {/* Admin Actions */}
                <View style={styles.actionsContainer}>
                    <Text style={styles.actionsTitle}>Quick Actions</Text>
                    {adminActions.map((action, index) => (
                        <TouchableOpacity
                            key={index}
                            style={styles.actionCard}
                            onPress={action.onPress}
                            activeOpacity={0.7}
                        >
                            <View style={styles.actionHeader}>
                                <View style={[styles.actionIcon, { backgroundColor: action.color }]}>
                                    <Icon name={action.icon} size={20} color="#FFFFFF" />
                                </View>
                                <Text style={styles.actionTitle}>{action.title}</Text>
                            </View>
                            <Text style={styles.actionDescription}>{action.description}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>
        </View>
    );
};

export default AdminDashboardScreen;
