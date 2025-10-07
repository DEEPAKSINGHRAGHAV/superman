import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    Alert,
    TextInput
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { RootStackParamList, Brand, BrandFilters } from '../../types';
import { SCREEN_NAMES, COLORS, BRAND_CATEGORIES } from '../../constants';
import { Card } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { SearchBar } from '../../components/SearchBar';
import { FilterChips } from '../../components/FilterChips';
import { EmptyState } from '../../components/EmptyState';
import apiService from '../../services/api';

type BrandListNavigationProp = StackNavigationProp<RootStackParamList>;

const BrandListScreen: React.FC = () => {
    const navigation = useNavigation<BrandListNavigationProp>();
    const { theme, isDark } = useTheme();
    const { user } = useAuth();
    const [brands, setBrands] = useState<Brand[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState<BrandFilters>({
        isActive: undefined, // Show all brands by default
        sortBy: 'name',
        sortOrder: 'asc'
    });
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    const loadBrands = async (pageNum = 1, reset = false) => {
        try {
            if (pageNum === 1) setLoading(true);

            const filterParams = {
                search: searchQuery || undefined,
                isActive: filters.isActive,
                category: filters.category,
                sortBy: filters.sortBy,
                sortOrder: filters.sortOrder
            };

            console.log('Loading brands with params:', filterParams);
            const response = await apiService.getBrands(filterParams, pageNum, 20);
            console.log('API response:', response);
            const newBrands = response.data;
            console.log('Brands data:', newBrands);

            if (reset || pageNum === 1) {
                setBrands(newBrands);
            } else {
                setBrands(prev => [...prev, ...newBrands]);
            }

            setHasMore(newBrands.length === 20);
        } catch (error) {
            console.error('Error loading brands:', error);
            Alert.alert('Error', 'Failed to load brands');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        setPage(1);
        await loadBrands(1, true);
    };

    const onSearch = (query: string) => {
        setSearchQuery(query);
        setPage(1);
        loadBrands(1, true);
    };

    const onFilterChange = (newFilters: Partial<BrandFilters>) => {
        setFilters(prev => ({ ...prev, ...newFilters }));
        setPage(1);
    };

    const loadMore = () => {
        if (!loading && hasMore) {
            const nextPage = page + 1;
            setPage(nextPage);
            loadBrands(nextPage);
        }
    };

    const handleDeleteBrand = async (brandId: string, brandName: string) => {
        Alert.alert(
            'Delete Brand',
            `Are you sure you want to delete "${brandName}"? This action cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await apiService.deleteBrand(brandId);
                            setBrands(prev => prev.filter(brand => brand._id !== brandId));
                            Alert.alert('Success', 'Brand deleted successfully');
                        } catch (error) {
                            console.error('Error deleting brand:', error);
                            Alert.alert('Error', 'Failed to delete brand');
                        }
                    }
                }
            ]
        );
    };

    const handleToggleStatus = async (brandId: string, currentStatus: boolean) => {
        try {
            await apiService.toggleBrandStatus(brandId);
            setBrands(prev => prev.map(brand =>
                brand._id === brandId
                    ? { ...brand, isActive: !currentStatus }
                    : brand
            ));
        } catch (error) {
            console.error('Error toggling brand status:', error);
            Alert.alert('Error', 'Failed to update brand status');
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadBrands(1, true);
        }, [searchQuery, filters.isActive, filters.category, filters.sortBy, filters.sortOrder])
    );

    const renderBrandCard = ({ item }: { item: Brand }) => (
        <Card style={styles.brandCard}>
            <TouchableOpacity
                onPress={() => navigation.navigate(SCREEN_NAMES.BRAND_DETAIL as any, { brandId: item._id })}
                activeOpacity={0.7}
            >
                <View style={styles.brandHeader}>
                    <View style={styles.brandInfo}>
                        <Text style={styles.brandName}>{item.name}</Text>
                        <Text style={styles.brandCategory}>
                            {BRAND_CATEGORIES.find(cat => cat === item.category) || item.category}
                        </Text>
                    </View>
                    <View style={styles.brandStatus}>
                        {item.isVerified && (
                            <View style={[styles.statusBadge, { backgroundColor: '#4CAF50' }]}>
                                <Icon name="verified" size={12} color="#FFFFFF" />
                                <Text style={styles.statusText}>Verified</Text>
                            </View>
                        )}
                        <View style={[
                            styles.statusBadge,
                            { backgroundColor: item.isActive ? '#4CAF50' : '#F44336' }
                        ]}>
                            <Text style={styles.statusText}>
                                {item.isActive ? 'Active' : 'Inactive'}
                            </Text>
                        </View>
                    </View>
                </View>

                {item.description && (
                    <Text style={styles.brandDescription} numberOfLines={2}>
                        {item.description}
                    </Text>
                )}

                <View style={styles.brandStats}>
                    <View style={styles.statItem}>
                        <Icon name="inventory" size={16} color={theme.colors.textSecondary} />
                        <Text style={styles.statText}>{item.productCount} products</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Icon name="star" size={16} color={theme.colors.textSecondary} />
                        <Text style={styles.statText}>
                            {item.rating.average.toFixed(1)} ({item.rating.count})
                        </Text>
                    </View>
                </View>

                <View style={styles.brandActions}>
                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
                        onPress={() => navigation.navigate(SCREEN_NAMES.BRAND_FORM as any, { brandId: item._id })}
                    >
                        <Icon name="edit" size={16} color="#FFFFFF" />
                        <Text style={styles.actionButtonText}>Edit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.actionButton,
                            { backgroundColor: item.isActive ? '#F44336' : '#4CAF50' }
                        ]}
                        onPress={() => handleToggleStatus(item._id, item.isActive)}
                    >
                        <Icon
                            name={item.isActive ? 'pause' : 'play-arrow'}
                            size={16}
                            color="#FFFFFF"
                        />
                        <Text style={styles.actionButtonText}>
                            {item.isActive ? 'Deactivate' : 'Activate'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: '#FF5722' }]}
                        onPress={() => handleDeleteBrand(item._id, item.name)}
                    >
                        <Icon name="delete" size={16} color="#FFFFFF" />
                        <Text style={styles.actionButtonText}>Delete</Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </Card>
    );

    const filterOptions = [
        { label: 'All', value: undefined },
        { label: 'Active', value: true },
        { label: 'Inactive', value: false }
    ];

    const categoryOptions = [
        { label: 'All Categories', value: undefined },
        ...BRAND_CATEGORIES.map(cat => ({
            label: cat.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()),
            value: cat
        }))
    ];

    const styles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.colors.background,
        },
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 16,
            backgroundColor: theme.colors.surface,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
        },
        headerTitle: {
            fontSize: 20,
            fontWeight: 'bold',
            color: theme.colors.text,
        },
        addButton: {
            backgroundColor: theme.colors.primary,
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 8,
            flexDirection: 'row',
            alignItems: 'center',
        },
        addButtonText: {
            color: '#FFFFFF',
            fontWeight: '600',
            marginLeft: 4,
        },
        content: {
            flex: 1,
            padding: 16,
        },
        searchContainer: {
            marginBottom: 16,
        },
        filtersContainer: {
            marginBottom: 16,
        },
        brandCard: {
            marginBottom: 12,
            padding: 16,
        },
        brandHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 8,
        },
        brandInfo: {
            flex: 1,
        },
        brandName: {
            fontSize: 18,
            fontWeight: '600',
            color: theme.colors.text,
            marginBottom: 4,
        },
        brandCategory: {
            fontSize: 14,
            color: theme.colors.textSecondary,
            textTransform: 'capitalize',
        },
        brandStatus: {
            flexDirection: 'row',
            gap: 8,
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
            color: '#FFFFFF',
            fontWeight: '500',
        },
        brandDescription: {
            fontSize: 14,
            color: theme.colors.textSecondary,
            marginBottom: 12,
            lineHeight: 20,
        },
        brandStats: {
            flexDirection: 'row',
            marginBottom: 16,
            gap: 16,
        },
        statItem: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
        },
        statText: {
            fontSize: 14,
            color: theme.colors.textSecondary,
        },
        brandActions: {
            flexDirection: 'row',
            gap: 8,
        },
        actionButton: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 8,
            paddingHorizontal: 12,
            borderRadius: 6,
            gap: 4,
        },
        actionButtonText: {
            color: '#FFFFFF',
            fontSize: 12,
            fontWeight: '500',
        },
        loadingContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
        },
    });

    if (loading && brands.length === 0) {
        return (
            <View style={styles.loadingContainer}>
                <LoadingSpinner size="large" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Brands</Text>
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => navigation.navigate(SCREEN_NAMES.BRAND_FORM as any)}
                >
                    <Icon name="add" size={20} color="#FFFFFF" />
                    <Text style={styles.addButtonText}>Add Brand</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                <View style={styles.searchContainer}>
                    <SearchBar
                        placeholder="Search brands..."
                        value={searchQuery}
                        onChangeText={onSearch}
                    />
                </View>

                <View style={styles.filtersContainer}>
                    <FilterChips
                        title="Status"
                        options={filterOptions}
                        selectedValue={filters.isActive}
                        onValueChange={(value) => onFilterChange({ isActive: value })}
                    />
                    <FilterChips
                        title="Category"
                        options={categoryOptions}
                        selectedValue={filters.category}
                        onValueChange={(value) => onFilterChange({ category: value })}
                    />
                </View>

                <FlatList
                    data={brands}
                    renderItem={renderBrandCard}
                    keyExtractor={(item) => item._id}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    onEndReached={loadMore}
                    onEndReachedThreshold={0.1}
                    ListEmptyComponent={
                        <EmptyState
                            icon="business"
                            title="No Brands Found"
                            message="No brands match your current filters. Try adjusting your search or filters."
                        />
                    }
                    showsVerticalScrollIndicator={false}
                />
            </View>
        </View>
    );
};

export default BrandListScreen;
