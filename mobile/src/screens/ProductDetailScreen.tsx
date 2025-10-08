import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../contexts/ThemeContext';
import { Button, Card, LoadingSpinner } from '../components/ui';
import { BatchList } from '../components';
import { Product, BatchSummary } from '../types';
import apiService from '../services/api';

const ProductDetailScreen: React.FC = () => {
    const { theme } = useTheme();
    const route = useRoute();
    const navigation = useNavigation();
    const { productId } = route.params as { productId: string };

    const [product, setProduct] = useState<Product | null>(null);
    const [batchSummary, setBatchSummary] = useState<BatchSummary | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingBatches, setIsLoadingBatches] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showBatches, setShowBatches] = useState(true);

    useEffect(() => {
        loadProduct();
        loadBatches();
    }, [productId]);

    const loadProduct = async () => {
        try {
            setIsLoading(true);
            const response = await apiService.getProduct(productId);

            if (response.success && response.data) {
                setProduct(response.data);
            } else {
                setError('Product not found');
            }
        } catch (error: any) {
            console.error('Error loading product:', error);
            setError(error.message || 'Failed to load product');
        } finally {
            setIsLoading(false);
        }
    };

    const loadBatches = async () => {
        try {
            setIsLoadingBatches(true);
            const response = await apiService.getBatchesByProduct(productId);

            if (response.success && response.data) {
                setBatchSummary(response.data);
            }
        } catch (error: any) {
            console.error('Error loading batches:', error);
            // Don't show error for batches, just log it
        } finally {
            setIsLoadingBatches(false);
        }
    };

    const handleEdit = () => {
        navigation.navigate('ProductForm', { productId });
    };

    const handleDelete = () => {
        Alert.alert(
            'Delete Product',
            'Are you sure you want to delete this product?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await apiService.deleteProduct(productId);
                            navigation.goBack();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete product');
                        }
                    },
                },
            ]
        );
    };

    const getContainerStyle = () => ({
        ...styles.container,
        backgroundColor: theme.colors.background,
    });

    if (isLoading) {
        return <LoadingSpinner overlay text="Loading product..." />;
    }

    if (error || !product) {
        return (
            <View style={getContainerStyle()}>
                <View style={styles.errorContainer}>
                    <Icon name="error" size={64} color={theme.colors.error[500]} />
                    <Text style={[styles.errorText, { color: theme.colors.text }]}>
                        {error || 'Product not found'}
                    </Text>
                    <Button
                        title="Go Back"
                        onPress={() => navigation.goBack()}
                        variant="primary"
                    />
                </View>
            </View>
        );
    }

    return (
        <ScrollView style={getContainerStyle()}>
            <View style={styles.content}>
                {/* Product Information Card */}
                <Card variant="elevated" style={styles.card}>
                    <Text style={[styles.title, { color: theme.colors.text }]}>
                        {product.name}
                    </Text>
                    <Text style={[styles.sku, { color: theme.colors.textSecondary }]}>
                        SKU: {product.sku}
                    </Text>
                    {product.barcode && (
                        <Text style={[styles.barcode, { color: theme.colors.textSecondary }]}>
                            Barcode: {product.barcode}
                        </Text>
                    )}

                    <View style={styles.details}>
                        <View style={styles.detailRow}>
                            <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                                Category:
                            </Text>
                            <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                                {product.category}
                            </Text>
                        </View>

                        {product.brand && (
                            <View style={styles.detailRow}>
                                <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                                    Brand:
                                </Text>
                                <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                                    {product.brand}
                                </Text>
                            </View>
                        )}

                        <View style={styles.detailRow}>
                            <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                                Current Stock:
                            </Text>
                            <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                                {product.currentStock} {product.unit}
                            </Text>
                        </View>

                        <View style={styles.detailRow}>
                            <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                                MRP:
                            </Text>
                            <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                                ₹{product.mrp.toFixed(2)}
                            </Text>
                        </View>

                        <View style={styles.detailRow}>
                            <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                                Selling Price:
                            </Text>
                            <Text style={[styles.detailValue, { color: theme.colors.success[600] }]}>
                                ₹{product.sellingPrice.toFixed(2)}
                            </Text>
                        </View>

                        <View style={styles.detailRow}>
                            <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                                Cost Price:
                            </Text>
                            <Text style={[styles.detailValue, { color: theme.colors.error[600] }]}>
                                ₹{product.costPrice.toFixed(2)}
                            </Text>
                        </View>

                        {product.profitMargin && (
                            <View style={styles.detailRow}>
                                <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                                    Profit Margin:
                                </Text>
                                <Text style={[styles.detailValue, { color: theme.colors.primary[600] }]}>
                                    {product.profitMargin}%
                                </Text>
                            </View>
                        )}
                    </View>
                </Card>

                {/* Batch Information Section */}
                {batchSummary && batchSummary.totalBatches > 0 && (
                    <Card variant="elevated" style={styles.card}>
                        <TouchableOpacity
                            style={styles.batchHeader}
                            onPress={() => setShowBatches(!showBatches)}
                        >
                            <View style={styles.batchHeaderLeft}>
                                <Icon name="layers" size={20} color={theme.colors.primary[500]} />
                                <Text style={[styles.batchHeaderTitle, { color: theme.colors.text }]}>
                                    Batch Tracking
                                </Text>
                                <View style={[styles.batchCountBadge, { backgroundColor: theme.colors.primary[100] }]}>
                                    <Text style={[styles.batchCountText, { color: theme.colors.primary[700] }]}>
                                        {batchSummary.totalBatches}
                                    </Text>
                                </View>
                            </View>
                            <Icon
                                name={showBatches ? 'expand-less' : 'expand-more'}
                                size={24}
                                color={theme.colors.textSecondary}
                            />
                        </TouchableOpacity>

                        {showBatches && (
                            <View style={styles.batchContent}>
                                {isLoadingBatches ? (
                                    <LoadingSpinner text="Loading batches..." />
                                ) : (
                                    <BatchList
                                        batchSummary={batchSummary}
                                        showHeader={false}
                                    />
                                )}
                            </View>
                        )}
                    </Card>
                )}

                {/* Note about batch tracking */}
                {(!batchSummary || batchSummary.totalBatches === 0) && (
                    <Card variant="outlined" style={styles.infoCard}>
                        <View style={styles.infoContent}>
                            <Icon name="info" size={20} color={theme.colors.info[500]} />
                            <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                                No batches found. Product prices shown above are the latest defaults.
                                Batches will be created when receiving purchase orders.
                            </Text>
                        </View>
                    </Card>
                )}

                {/* Action Buttons */}
                <View style={styles.actions}>
                    <Button
                        title="Edit Product"
                        onPress={handleEdit}
                        variant="primary"
                        leftIcon={<Icon name="edit" size={16} color="white" />}
                        style={styles.actionButton}
                    />
                    <Button
                        title="Delete Product"
                        onPress={handleDelete}
                        variant="danger"
                        leftIcon={<Icon name="delete" size={16} color="white" />}
                        style={styles.actionButton}
                    />
                </View>
            </View>
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
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    sku: {
        fontSize: 16,
        marginBottom: 4,
    },
    barcode: {
        fontSize: 14,
        marginBottom: 16,
        fontFamily: 'monospace',
    },
    details: {
        gap: 12,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    detailLabel: {
        fontSize: 16,
    },
    detailValue: {
        fontSize: 16,
        fontWeight: '500',
    },
    batchHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
    },
    batchHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    batchHeaderTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    batchCountBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    batchCountText: {
        fontSize: 12,
        fontWeight: '600',
    },
    batchContent: {
        marginTop: 12,
        minHeight: 200,
    },
    infoCard: {
        marginBottom: 16,
    },
    infoContent: {
        flexDirection: 'row',
        gap: 12,
        alignItems: 'flex-start',
    },
    infoText: {
        flex: 1,
        fontSize: 14,
        lineHeight: 20,
    },
    actions: {
        gap: 12,
    },
    actionButton: {
        marginBottom: 8,
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

export default ProductDetailScreen;