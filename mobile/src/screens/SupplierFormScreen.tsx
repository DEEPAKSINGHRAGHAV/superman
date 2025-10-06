import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { Button, Input, LoadingSpinner } from '../components/ui';
import { SupplierFormData } from '../types';
import apiService from '../services/api';

const SupplierFormScreen: React.FC = () => {
    const { theme } = useTheme();
    const route = useRoute();
    const navigation = useNavigation();
    const { supplierId } = route.params as { supplierId?: string };

    const [formData, setFormData] = useState<SupplierFormData>({
        name: '',
        code: '',
        email: '',
        phone: '',
        alternatePhone: '',
        address: {
            street: '',
            city: '',
            state: '',
            pincode: '',
            country: 'India',
        },
        gstNumber: '',
        panNumber: '',
        creditLimit: 0,
        paymentTerms: 30,
        contactPerson: {
            name: '',
            designation: '',
            phone: '',
            email: '',
        },
    });

    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<Partial<SupplierFormData>>({});

    useEffect(() => {
        if (supplierId) {
            loadSupplier();
        }
    }, [supplierId]);

    const loadSupplier = async () => {
        try {
            setIsLoading(true);
            const response = await apiService.getSupplier(supplierId!);

            if (response.success && response.data) {
                const supplier = response.data;
                setFormData({
                    name: supplier.name,
                    code: supplier.code,
                    email: supplier.email,
                    phone: supplier.phone || '',
                    alternatePhone: supplier.alternatePhone || '',
                    address: supplier.address,
                    gstNumber: supplier.gstNumber || '',
                    panNumber: supplier.panNumber || '',
                    creditLimit: supplier.creditLimit,
                    paymentTerms: supplier.paymentTerms,
                    contactPerson: supplier.contactPerson || {
                        name: '',
                        designation: '',
                        phone: '',
                        email: '',
                    },
                });
            }
        } catch (error) {
            console.error('Error loading supplier:', error);
            Alert.alert('Error', 'Failed to load supplier');
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (field: keyof SupplierFormData, value: string | number) => {
        setFormData(prev => ({ ...prev, [field]: value }));

        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };

    const handleAddressChange = (field: keyof SupplierFormData['address'], value: string) => {
        setFormData(prev => ({
            ...prev,
            address: { ...prev.address, [field]: value }
        }));
    };

    const validateForm = () => {
        const newErrors: Partial<SupplierFormData> = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Supplier name is required';
        }

        if (!formData.code.trim()) {
            newErrors.code = 'Supplier code is required';
        }

        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Please enter a valid email address';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) {
            Alert.alert('Validation Error', 'Please fix the errors before submitting');
            return;
        }

        try {
            setIsLoading(true);

            if (supplierId) {
                await apiService.updateSupplier(supplierId, formData);
                Alert.alert('Success', 'Supplier updated successfully');
            } else {
                await apiService.createSupplier(formData);
                Alert.alert('Success', 'Supplier created successfully');
            }

            navigation.goBack();
        } catch (error: any) {
            console.error('Error saving supplier:', error);
            Alert.alert('Error', error.message || 'Failed to save supplier');
        } finally {
            setIsLoading(false);
        }
    };

    const getContainerStyle = () => ({
        ...styles.container,
        backgroundColor: theme.colors.background,
    });

    if (isLoading && supplierId) {
        return <LoadingSpinner overlay text="Loading supplier..." />;
    }

    return (
        <ScrollView style={getContainerStyle()}>
            <View style={styles.content}>
                <Input
                    label="Supplier Name"
                    placeholder="Enter supplier name"
                    value={formData.name}
                    onChangeText={(text) => handleInputChange('name', text)}
                    error={errors.name}
                    required
                />

                <Input
                    label="Supplier Code"
                    placeholder="Enter supplier code"
                    value={formData.code}
                    onChangeText={(text) => handleInputChange('code', text)}
                    error={errors.code}
                    required
                />

                <Input
                    label="Email"
                    placeholder="Enter email address"
                    value={formData.email}
                    onChangeText={(text) => handleInputChange('email', text)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    error={errors.email}
                    required
                />

                <Input
                    label="Phone"
                    placeholder="Enter phone number"
                    value={formData.phone}
                    onChangeText={(text) => handleInputChange('phone', text)}
                    keyboardType="phone-pad"
                />

                <Input
                    label="Street Address"
                    placeholder="Enter street address"
                    value={formData.address.street}
                    onChangeText={(text) => handleAddressChange('street', text)}
                />

                <Input
                    label="City"
                    placeholder="Enter city"
                    value={formData.address.city}
                    onChangeText={(text) => handleAddressChange('city', text)}
                />

                <Input
                    label="State"
                    placeholder="Enter state"
                    value={formData.address.state}
                    onChangeText={(text) => handleAddressChange('state', text)}
                />

                <Input
                    label="Pincode"
                    placeholder="Enter pincode"
                    value={formData.address.pincode}
                    onChangeText={(text) => handleAddressChange('pincode', text)}
                    keyboardType="numeric"
                />

                <Input
                    label="GST Number"
                    placeholder="Enter GST number"
                    value={formData.gstNumber}
                    onChangeText={(text) => handleInputChange('gstNumber', text)}
                />

                <Input
                    label="PAN Number"
                    placeholder="Enter PAN number"
                    value={formData.panNumber}
                    onChangeText={(text) => handleInputChange('panNumber', text)}
                />

                <Input
                    label="Credit Limit"
                    placeholder="Enter credit limit"
                    value={formData.creditLimit.toString()}
                    onChangeText={(text) => handleInputChange('creditLimit', parseFloat(text) || 0)}
                    keyboardType="numeric"
                />

                <Input
                    label="Payment Terms (Days)"
                    placeholder="Enter payment terms"
                    value={formData.paymentTerms.toString()}
                    onChangeText={(text) => handleInputChange('paymentTerms', parseInt(text) || 30)}
                    keyboardType="numeric"
                />

                <Button
                    title={supplierId ? 'Update Supplier' : 'Create Supplier'}
                    onPress={handleSubmit}
                    variant="primary"
                    size="lg"
                    fullWidth
                    loading={isLoading}
                    style={styles.submitButton}
                />
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
    submitButton: {
        marginTop: 24,
    },
});

export default SupplierFormScreen;