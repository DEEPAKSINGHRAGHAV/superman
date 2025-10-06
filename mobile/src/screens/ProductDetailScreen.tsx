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
import { Product } from '../types';
import apiService from '../services/api';

const ProductDetailScreen: React.FC = () => {
    const { theme } = useTheme();
    const route = useRoute();
    const navigation = useNavigation();
    const { productId } = route.params as { productId: string };

    const [product, setProduct] = useState<Product | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadProduct();
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
                <Card variant="elevated" style={styles.card}>
                    <Text style={[styles.title, { color: theme.colors.text }]}>
                        {product.name}
                    </Text>
                    <Text style={[styles.sku, { color: theme.colors.textSecondary }]}>
                        SKU: {product.sku}
                    </Text>

                    <View style={styles.details}>
                        <View style={styles.detailRow}>
                            <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                                Category:
                            </Text>
                            <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                                {product.category}
                            </Text>
                        </View>

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
                                Selling Price:
                            </Text>
                            <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                                ₹{product.sellingPrice}
                            </Text>
                        </View>

                        <View style={styles.detailRow}>
                            <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                                Cost Price:
                            </Text>
                            <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                                ₹{product.costPrice}
                            </Text>
                        </View>
                    </View>
                </Card>

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
        marginBottom: 16,
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