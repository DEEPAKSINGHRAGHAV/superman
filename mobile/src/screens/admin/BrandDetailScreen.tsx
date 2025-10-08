import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    RefreshControl
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { useTheme } from '../../contexts/ThemeContext';
import { RootStackParamList, Brand } from '../../types';
import { SCREEN_NAMES, BRAND_CATEGORIES } from '../../constants';
import { Card } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import api from '../../services/api';

type BrandDetailNavigationProp = StackNavigationProp<RootStackParamList>;
type BrandDetailRouteProp = RouteProp<RootStackParamList, 'BrandDetail'>;

const BrandDetailScreen: React.FC = () => {
    const navigation = useNavigation<BrandDetailNavigationProp>();
    const route = useRoute<BrandDetailRouteProp>();
    const { theme, isDark } = useTheme();

    const { brandId } = route.params;
    const [brand, setBrand] = useState<Brand | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Set up navigation header with edit button
    React.useLayoutEffect(() => {
        if (brand) {
            navigation.setOptions({
                headerRight: () => (
                    <TouchableOpacity
                        onPress={() => navigation.navigate(SCREEN_NAMES.BRAND_FORM as any, { brandId: brand._id })}
                        style={{
                            marginRight: 12,
                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                            borderRadius: 8,
                            padding: 8,
                            borderWidth: 1,
                            borderColor: 'rgba(255, 255, 255, 0.3)',
                        }}
                        activeOpacity={0.7}
                    >
                        <Icon name="edit" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                ),
            });
        }
    }, [navigation, brand]);

    const loadBrand = async () => {
        try {
            setLoading(true);
            const response = await api.getBrand(brandId);
            setBrand(response.data);
        } catch (error) {
            console.error('Error loading brand:', error);
            Alert.alert('Error', 'Failed to load brand details');
            navigation.goBack();
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadBrand();
    };

    const handleToggleStatus = async () => {
        if (!brand) return;

        try {
            await api.toggleBrandStatus(brandId);
            setBrand(prev => prev ? { ...prev, isActive: !prev.isActive } : null);
            Alert.alert('Success', `Brand ${brand.isActive ? 'deactivated' : 'activated'} successfully`);
        } catch (error) {
            console.error('Error toggling brand status:', error);
            Alert.alert('Error', 'Failed to update brand status');
        }
    };

    const handleToggleVerification = async () => {
        if (!brand) return;

        try {
            await api.verifyBrand(brandId);
            setBrand(prev => prev ? { ...prev, isVerified: !prev.isVerified } : null);
            Alert.alert('Success', `Brand ${brand.isVerified ? 'unverified' : 'verified'} successfully`);
        } catch (error) {
            console.error('Error toggling brand verification:', error);
            Alert.alert('Error', 'Failed to update brand verification');
        }
    };

    const handleDelete = () => {
        if (!brand) return;

        Alert.alert(
            'Delete Brand',
            `Are you sure you want to delete "${brand.name}"? This action cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await api.deleteBrand(brandId);
                            Alert.alert('Success', 'Brand deleted successfully');
                            navigation.goBack();
                        } catch (error) {
                            console.error('Error deleting brand:', error);
                            Alert.alert('Error', 'Failed to delete brand');
                        }
                    }
                }
            ]
        );
    };

    useEffect(() => {
        loadBrand();
    }, [brandId]);

    const styles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.colors.background,
        },
        content: {
            flex: 1,
            padding: 16,
        },
        brandHeader: {
            alignItems: 'center',
            marginBottom: 24,
        },
        brandLogo: {
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: theme.colors.surface,
            marginBottom: 16,
            justifyContent: 'center',
            alignItems: 'center',
        },
        brandName: {
            fontSize: 24,
            fontWeight: 'bold',
            color: theme.colors.text,
            textAlign: 'center',
            marginBottom: 8,
        },
        brandCategory: {
            fontSize: 16,
            color: theme.colors.textSecondary,
            textAlign: 'center',
            textTransform: 'capitalize',
        },
        statusContainer: {
            flexDirection: 'row',
            gap: 8,
            marginTop: 12,
        },
        statusBadge: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 16,
            gap: 4,
        },
        statusText: {
            fontSize: 12,
            color: '#FFFFFF',
            fontWeight: '500',
        },
        section: {
            marginBottom: 24,
        },
        sectionTitle: {
            fontSize: 18,
            fontWeight: '600',
            color: theme.colors.text,
            marginBottom: 12,
        },
        infoRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
        },
        infoLabel: {
            fontSize: 14,
            color: theme.colors.textSecondary,
            flex: 1,
        },
        infoValue: {
            fontSize: 14,
            color: theme.colors.text,
            flex: 2,
            textAlign: 'right',
        },
        description: {
            fontSize: 14,
            color: theme.colors.text,
            lineHeight: 20,
        },
        statsGrid: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 12,
        },
        statCard: {
            flex: 1,
            minWidth: '45%',
            alignItems: 'center',
            padding: 16,
            backgroundColor: theme.colors.surface,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: theme.colors.border,
        },
        statValue: {
            fontSize: 24,
            fontWeight: 'bold',
            color: theme.colors.primary,
            marginBottom: 4,
        },
        statLabel: {
            fontSize: 12,
            color: theme.colors.textSecondary,
            textAlign: 'center',
        },
        actionButtons: {
            flexDirection: 'row',
            gap: 12,
            marginTop: 24,
        },
        primaryButton: {
            flex: 1,
            backgroundColor: theme.colors.primary,
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 8,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
        },
        secondaryButton: {
            flex: 1,
            backgroundColor: theme.colors.surface,
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: theme.colors.border,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
        },
        dangerButton: {
            flex: 1,
            backgroundColor: '#F44336',
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 8,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
        },
        buttonText: {
            color: '#FFFFFF',
            fontSize: 14,
            fontWeight: '500',
        },
        secondaryButtonText: {
            color: theme.colors.text,
            fontSize: 14,
            fontWeight: '500',
        },
        loadingContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
        },
    });

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <LoadingSpinner size="large" />
            </View>
        );
    }

    if (!brand) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={{ color: theme.colors.text }}>Brand not found</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView
                style={styles.content}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {/* Brand Header */}
                <View style={styles.brandHeader}>
                    <View style={styles.brandLogo}>
                        {brand.logo ? (
                            <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
                                Logo
                            </Text>
                        ) : (
                            <Icon name="business" size={32} color={theme.colors.textSecondary} />
                        )}
                    </View>
                    <Text style={styles.brandName}>{brand.name}</Text>
                    <Text style={styles.brandCategory}>
                        {BRAND_CATEGORIES.find(cat => cat === brand.category) || brand.category}
                    </Text>
                    <View style={styles.statusContainer}>
                        {brand.isVerified && (
                            <View style={[styles.statusBadge, { backgroundColor: '#4CAF50' }]}>
                                <Icon name="verified" size={12} color="#FFFFFF" />
                                <Text style={styles.statusText}>Verified</Text>
                            </View>
                        )}
                        <View style={[
                            styles.statusBadge,
                            { backgroundColor: brand.isActive ? '#4CAF50' : '#F44336' }
                        ]}>
                            <Text style={styles.statusText}>
                                {brand.isActive ? 'Active' : 'Inactive'}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Description */}
                {brand.description && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Description</Text>
                        <Text style={styles.description}>{brand.description}</Text>
                    </View>
                )}

                {/* Contact Information */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Contact Information</Text>
                    <Card>
                        {brand.website && (
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Website</Text>
                                <Text style={styles.infoValue}>{brand.website}</Text>
                            </View>
                        )}
                        {brand.contactEmail && (
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Email</Text>
                                <Text style={styles.infoValue}>{brand.contactEmail}</Text>
                            </View>
                        )}
                        {brand.contactPhone && (
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Phone</Text>
                                <Text style={styles.infoValue}>{brand.contactPhone}</Text>
                            </View>
                        )}
                        {brand.country && (
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Country</Text>
                                <Text style={styles.infoValue}>{brand.country}</Text>
                            </View>
                        )}
                    </Card>
                </View>

                {/* Statistics */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Statistics</Text>
                    <View style={styles.statsGrid}>
                        <View style={styles.statCard}>
                            <Text style={styles.statValue}>{brand.productCount}</Text>
                            <Text style={styles.statLabel}>Products</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={styles.statValue}>{brand.rating.average.toFixed(1)}</Text>
                            <Text style={styles.statLabel}>Rating</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={styles.statValue}>{brand.rating.count}</Text>
                            <Text style={styles.statLabel}>Reviews</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={styles.statValue}>{brand.totalSales}</Text>
                            <Text style={styles.statLabel}>Total Sales</Text>
                        </View>
                    </View>
                </View>

                {/* Additional Information */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Additional Information</Text>
                    <Card>
                        {brand.foundedYear && (
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Founded Year</Text>
                                <Text style={styles.infoValue}>{brand.foundedYear}</Text>
                            </View>
                        )}
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Created</Text>
                            <Text style={styles.infoValue}>
                                {new Date(brand.createdAt).toLocaleDateString()}
                            </Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Last Updated</Text>
                            <Text style={styles.infoValue}>
                                {new Date(brand.updatedAt).toLocaleDateString()}
                            </Text>
                        </View>
                    </Card>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={() => navigation.navigate(SCREEN_NAMES.BRAND_FORM as any, { brandId: brand._id })}
                    >
                        <Icon name="edit" size={16} color="#FFFFFF" />
                        <Text style={styles.buttonText}>Edit Brand</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={handleToggleStatus}
                    >
                        <Icon
                            name={brand.isActive ? 'pause' : 'play-arrow'}
                            size={16}
                            color={theme.colors.text}
                        />
                        <Text style={styles.secondaryButtonText}>
                            {brand.isActive ? 'Deactivate' : 'Activate'}
                        </Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.actionButtons}>
                    <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={handleToggleVerification}
                    >
                        <Icon
                            name={brand.isVerified ? 'verified-user' : 'verified'}
                            size={16}
                            color={theme.colors.text}
                        />
                        <Text style={styles.secondaryButtonText}>
                            {brand.isVerified ? 'Unverify' : 'Verify'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.dangerButton}
                        onPress={handleDelete}
                    >
                        <Icon name="delete" size={16} color="#FFFFFF" />
                        <Text style={styles.buttonText}>Delete</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
};

export default BrandDetailScreen;
