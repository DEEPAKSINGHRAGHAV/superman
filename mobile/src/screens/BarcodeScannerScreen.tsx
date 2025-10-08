import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { HighQualityBarcodeScanner, BatchList } from '../components';
import { Button, Card, LoadingSpinner } from '../components/ui';
import { useTheme } from '../contexts/ThemeContext';
import { BatchSummary, Product } from '../types';
import apiService from '../services/api';

const BarcodeScannerScreen: React.FC = () => {
    const navigation = useNavigation();
    const { theme } = useTheme();

    const [showBatchModal, setShowBatchModal] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [batchSummary, setBatchSummary] = useState<BatchSummary | null>(null);
    const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
    const [scannedBarcode, setScannedBarcode] = useState<string>('');

    const handleBarcodeScanned = async (data: string) => {
        console.log('Barcode scanned:', data);
        setScannedBarcode(data);

        try {
            setIsLoading(true);

            // Fetch batch information by barcode
            const batchResponse = await apiService.getBatchesByProduct(data);

            if (batchResponse.success && batchResponse.data) {
                setBatchSummary(batchResponse.data);
                setShowBatchModal(true);
            } else {
                // If no batches found, try to find the product
                Alert.alert(
                    'Product Found',
                    `No batch information available for barcode: ${data}`,
                    [
                        {
                            text: 'OK',
                            onPress: () => {
                                // Optionally navigate to product detail
                            },
                        },
                    ]
                );
            }
        } catch (error: any) {
            console.error('Error fetching batch info:', error);
            Alert.alert(
                'Product Not Found',
                `No product found with barcode: ${data}`,
                [
                    {
                        text: 'Scan Again',
                        onPress: () => {
                            // Reset and allow scanning again
                        },
                    },
                ]
            );
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        navigation.goBack();
    };

    const handleCloseBatchModal = () => {
        setShowBatchModal(false);
        setBatchSummary(null);
        setScannedProduct(null);
    };

    const handleViewProductDetail = () => {
        if (batchSummary?.productId) {
            handleCloseBatchModal();
            handleClose();
            navigation.navigate('ProductDetail', { productId: batchSummary.productId });
        }
    };

    return (
        <>
            <HighQualityBarcodeScanner
                onScan={handleBarcodeScanned}
                onClose={handleClose}
            />

            {/* Loading Overlay */}
            {isLoading && <LoadingSpinner overlay text="Fetching batch information..." />}

            {/* Batch Information Modal */}
            <Modal
                visible={showBatchModal}
                animationType="slide"
                transparent={true}
                onRequestClose={handleCloseBatchModal}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
                        {/* Modal Header */}
                        <View style={[styles.modalHeader, { borderBottomColor: theme.colors.gray[200] }]}>
                            <View style={styles.modalHeaderContent}>
                                <Icon name="qr-code" size={24} color={theme.colors.primary[500]} />
                                <View style={styles.modalTitleContainer}>
                                    <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                                        {batchSummary?.productName || 'Product'}
                                    </Text>
                                    <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]}>
                                        Barcode: {scannedBarcode}
                                    </Text>
                                </View>
                            </View>
                            <TouchableOpacity onPress={handleCloseBatchModal} style={styles.closeButton}>
                                <Icon name="close" size={24} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        {/* Batch Summary Stats */}
                        {batchSummary && (
                            <View style={[styles.statsContainer, { backgroundColor: theme.colors.gray[50] }]}>
                                <View style={styles.statItem}>
                                    <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                                        Total Stock
                                    </Text>
                                    <Text style={[styles.statValue, { color: theme.colors.text }]}>
                                        {batchSummary.totalQuantity} units
                                    </Text>
                                </View>
                                <View style={[styles.statDivider, { backgroundColor: theme.colors.gray[300] }]} />
                                <View style={styles.statItem}>
                                    <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                                        Batches
                                    </Text>
                                    <Text style={[styles.statValue, { color: theme.colors.text }]}>
                                        {batchSummary.totalBatches}
                                    </Text>
                                </View>
                                <View style={[styles.statDivider, { backgroundColor: theme.colors.gray[300] }]} />
                                <View style={styles.statItem}>
                                    <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                                        Price Range
                                    </Text>
                                    <Text style={[styles.statValue, { color: theme.colors.text }]}>
                                        ₹{batchSummary.priceRange.minSellingPrice} - ₹{batchSummary.priceRange.maxSellingPrice}
                                    </Text>
                                </View>
                            </View>
                        )}

                        {/* Batch List */}
                        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                            {batchSummary && (
                                <BatchList
                                    batchSummary={batchSummary}
                                    showHeader={false}
                                />
                            )}
                        </ScrollView>

                        {/* Modal Actions */}
                        <View style={styles.modalActions}>
                            <Button
                                title="View Product Details"
                                onPress={handleViewProductDetail}
                                variant="primary"
                                leftIcon={<Icon name="info" size={16} color="white" />}
                            />
                            <Button
                                title="Close"
                                onPress={handleCloseBatchModal}
                                variant="secondary"
                            />
                        </View>
                    </View>
                </View>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        height: '85%',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
    },
    modalHeaderContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    modalTitleContainer: {
        flex: 1,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    modalSubtitle: {
        fontSize: 12,
        marginTop: 2,
        fontFamily: 'monospace',
    },
    closeButton: {
        padding: 4,
    },
    statsContainer: {
        flexDirection: 'row',
        padding: 16,
        justifyContent: 'space-around',
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 12,
        marginBottom: 4,
    },
    statValue: {
        fontSize: 16,
        fontWeight: '600',
    },
    statDivider: {
        width: 1,
        marginHorizontal: 8,
    },
    modalContent: {
        flex: 1,
    },
    modalActions: {
        padding: 16,
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
    },
});

export default BarcodeScannerScreen;