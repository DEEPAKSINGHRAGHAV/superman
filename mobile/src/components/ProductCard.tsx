import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../contexts/ThemeContext';
import { Product } from '../types';
import { Card } from './ui';

interface ProductCardProps {
    product: Product;
    onPress: () => void;
    onEdit?: () => void;
    showActions?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({
    product,
    onPress,
    onEdit,
    showActions = false,
}) => {
    const { theme } = useTheme();

    // Safety checks with default values
    const currentStock = product.currentStock ?? 0;
    const minStockLevel = product.minStockLevel ?? 0;
    const sellingPrice = product.sellingPrice ?? 0;
    const mrp = product.mrp ?? 0;
    const images = product.images ?? [];
    const createdAt = product.createdAt ?? new Date().toISOString();
    const expiryDate = product.expiryDate;

    const getStockStatusColor = () => {
        if (currentStock === 0) {
            return theme.colors.error[500];
        } else if (currentStock <= minStockLevel) {
            return theme.colors.warning[500];
        }
        return theme.colors.success[500];
    };

    const getStockStatusText = () => {
        if (currentStock === 0) {
            return 'Out of Stock';
        } else if (currentStock <= minStockLevel) {
            return 'Low Stock';
        }
        return 'In Stock';
    };

    const formatPrice = (price: number) => {
        return `₹${price.toFixed(2)}`;
    };

    const formatCategory = (category: string) => {
        if (!category) return 'Other';
        return category.split('-').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    };

    return (
        <Card
            variant="elevated"
            onPress={onPress}
            style={styles.card}
        >
            <View style={styles.header}>
                <View style={styles.titleContainer}>
                    <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={2}>
                        {product.name}
                    </Text>
                    <Text style={[styles.sku, { color: theme.colors.textSecondary }]}>
                        SKU: {product.sku}
                    </Text>
                </View>

                {showActions && onEdit && (
                    <View style={styles.actions}>
                        <TouchableOpacity
                            onPress={onEdit}
                            style={[styles.actionButton, { backgroundColor: theme.colors.primary[50] }]}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <Icon name="edit" size={16} color={theme.colors.primary[500]} />
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            <View style={styles.content}>
                <View style={styles.imageContainer}>
                    {images.length > 0 ? (
                        <Image
                            source={{ uri: images[0] }}
                            style={styles.image}
                            resizeMode="cover"
                        />
                    ) : (
                        <View style={[styles.placeholderImage, { backgroundColor: theme.colors.gray[200] }]}>
                            <Icon name="image" size={32} color={theme.colors.gray[400]} />
                        </View>
                    )}
                </View>

                <View style={styles.details}>
                    <View style={styles.categoryContainer}>
                        <Text style={[styles.category, { color: theme.colors.primary[500] }]}>
                            {formatCategory(product.category)}
                        </Text>
                        {product.brand && (
                            <Text style={[styles.brand, { color: theme.colors.textSecondary }]}>
                                {product.brand}
                            </Text>
                        )}
                    </View>

                    <View style={styles.pricing}>
                        <Text style={[styles.sellingPrice, { color: theme.colors.text }]}>
                            {formatPrice(sellingPrice)}
                        </Text>
                        <Text style={[styles.mrp, { color: theme.colors.textSecondary }]}>
                            MRP: {formatPrice(mrp)}
                        </Text>
                    </View>

                    <View style={styles.stockContainer}>
                        <View style={styles.stockInfo}>
                            <Text style={[styles.stockLabel, { color: theme.colors.textSecondary }]}>
                                Stock:
                            </Text>
                            <Text style={[styles.stockValue, { color: theme.colors.text }]}>
                                {currentStock} {product.unit || 'pcs'}
                            </Text>
                        </View>
                        <View style={[styles.stockStatus, { backgroundColor: getStockStatusColor() }]}>
                            <Text style={styles.stockStatusText}>
                                {getStockStatusText()}
                            </Text>
                        </View>
                    </View>

                    {product.description && (
                        <Text style={[styles.description, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                            {product.description}
                        </Text>
                    )}
                </View>
            </View>

            <View style={styles.footer}>
                <View style={styles.metaInfo}>
                    <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
                        Added {new Date(createdAt).toLocaleDateString()}
                    </Text>
                    {expiryDate && (
                        <Text style={[styles.metaText, { color: theme.colors.warning[500] }]}>
                            Expires: {new Date(expiryDate).toLocaleDateString()}
                        </Text>
                    )}
                </View>
            </View>
        </Card>
    );
};

const styles = StyleSheet.create({
    card: {
        marginHorizontal: 16,
        marginVertical: 8,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    titleContainer: {
        flex: 1,
        marginRight: 12,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        lineHeight: 22,
    },
    sku: {
        fontSize: 12,
        marginTop: 2,
    },
    actions: {
        flexDirection: 'row',
        gap: 8,
    },
    actionButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        flexDirection: 'row',
        marginBottom: 12,
    },
    imageContainer: {
        marginRight: 12,
    },
    image: {
        width: 60,
        height: 60,
        borderRadius: 8,
    },
    placeholderImage: {
        width: 60,
        height: 60,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    details: {
        flex: 1,
    },
    categoryContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    category: {
        fontSize: 12,
        fontWeight: '500',
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        marginRight: 8,
    },
    brand: {
        fontSize: 12,
        fontStyle: 'italic',
    },
    pricing: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    sellingPrice: {
        fontSize: 16,
        fontWeight: '600',
        marginRight: 8,
    },
    mrp: {
        fontSize: 12,
        textDecorationLine: 'line-through',
    },
    stockContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    stockInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    stockLabel: {
        fontSize: 12,
        marginRight: 4,
    },
    stockValue: {
        fontSize: 12,
        fontWeight: '500',
    },
    stockStatus: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    stockStatusText: {
        fontSize: 10,
        fontWeight: '500',
        color: 'white',
    },
    description: {
        fontSize: 12,
        lineHeight: 16,
    },
    footer: {
        borderTopWidth: 1,
        borderTopColor: 'rgba(0, 0, 0, 0.1)',
        paddingTop: 8,
    },
    metaInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    metaText: {
        fontSize: 10,
    },
});

