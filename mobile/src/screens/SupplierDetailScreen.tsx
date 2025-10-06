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
import { Supplier } from '../types';
import apiService from '../services/api';

const SupplierDetailScreen: React.FC = () => {
    const { theme } = useTheme();
    const route = useRoute();
    const navigation = useNavigation();
    const { supplierId } = route.params as { supplierId: string };

    const [supplier, setSupplier] = useState<Supplier | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadSupplier();
    }, [supplierId]);

    const loadSupplier = async () => {
        try {
            setIsLoading(true);
            const response = await apiService.getSupplier(supplierId);

            if (response.success && response.data) {
                setSupplier(response.data);
            } else {
                setError('Supplier not found');
            }
        } catch (error: any) {
            console.error('Error loading supplier:', error);
            setError(error.message || 'Failed to load supplier');
        } finally {
            setIsLoading(false);
        }
    };

    const handleEdit = () => {
        navigation.navigate('SupplierForm', { supplierId });
    };

    const handleDelete = () => {
        Alert.alert(
            'Delete Supplier',
            'Are you sure you want to delete this supplier?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await apiService.deleteSupplier(supplierId);
                            navigation.goBack();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete supplier');
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
        return <LoadingSpinner overlay text="Loading supplier..." />;
    }

    if (error || !supplier) {
        return (
            <View style={getContainerStyle()}>
                <View style={styles.errorContainer}>
                    <Icon name="error" size={64} color={theme.colors.error[500]} />
                    <Text style={[styles.errorText, { color: theme.colors.text }]}>
                        {error || 'Supplier not found'}
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
                        {supplier.name}
                    </Text>
                    <Text style={[styles.code, { color: theme.colors.textSecondary }]}>
                        Code: {supplier.code}
                    </Text>

                    <View style={styles.details}>
                        <View style={styles.detailRow}>
                            <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                                Email:
                            </Text>
                            <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                                {supplier.email}
                            </Text>
                        </View>

                        {supplier.phone && (
                            <View style={styles.detailRow}>
                                <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                                    Phone:
                                </Text>
                                <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                                    {supplier.phone}
                                </Text>
                            </View>
                        )}

                        <View style={styles.detailRow}>
                            <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                                Rating:
                            </Text>
                            <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                                {supplier.rating}/5
                            </Text>
                        </View>

                        <View style={styles.detailRow}>
                            <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                                Total Orders:
                            </Text>
                            <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                                {supplier.totalOrders}
                            </Text>
                        </View>
                    </View>
                </Card>

                <View style={styles.actions}>
                    <Button
                        title="Edit Supplier"
                        onPress={handleEdit}
                        variant="primary"
                        leftIcon={<Icon name="edit" size={16} color="white" />}
                        style={styles.actionButton}
                    />
                    <Button
                        title="Delete Supplier"
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
    code: {
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

export default SupplierDetailScreen;