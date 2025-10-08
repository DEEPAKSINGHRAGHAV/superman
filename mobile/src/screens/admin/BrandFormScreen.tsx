import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { useTheme } from '../../contexts/ThemeContext';
import { RootStackParamList, Brand, BrandFormData } from '../../types';
import { SCREEN_NAMES, BRAND_CATEGORIES } from '../../constants';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import api from '../../services/api';

type BrandFormNavigationProp = StackNavigationProp<RootStackParamList>;
type BrandFormRouteProp = RouteProp<RootStackParamList, 'BrandForm'>;

const BrandFormScreen: React.FC = () => {
    const navigation = useNavigation<BrandFormNavigationProp>();
    const route = useRoute<BrandFormRouteProp>();
    const { theme, isDark } = useTheme();

    const { brandId } = route.params || {};
    const isEditing = !!brandId;

    const [formData, setFormData] = useState<BrandFormData>({
        name: '',
        description: '',
        logo: '',
        website: '',
        contactEmail: '',
        contactPhone: '',
        country: '',
        foundedYear: undefined,
        category: 'other'
    });

    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(isEditing);
    const [errors, setErrors] = useState<Partial<BrandFormData>>({});

    useEffect(() => {
        if (isEditing) {
            loadBrand();
        }
    }, [brandId]);

    const loadBrand = async () => {
        try {
            setInitialLoading(true);
            const response = await api.getBrand(brandId);
            const brand: Brand = response.data;

            setFormData({
                name: brand.name,
                description: brand.description || '',
                logo: brand.logo || '',
                website: brand.website || '',
                contactEmail: brand.contactEmail || '',
                contactPhone: brand.contactPhone || '',
                country: brand.country || '',
                foundedYear: brand.foundedYear,
                category: brand.category
            });
        } catch (error) {
            console.error('Error loading brand:', error);
            Alert.alert('Error', 'Failed to load brand details');
            navigation.goBack();
        } finally {
            setInitialLoading(false);
        }
    };

    const validateForm = (): boolean => {
        const newErrors: Partial<BrandFormData> = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Brand name is required';
        } else if (formData.name.trim().length < 2) {
            newErrors.name = 'Brand name must be at least 2 characters';
        }

        if (formData.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
            newErrors.contactEmail = 'Please enter a valid email address';
        }

        if (formData.website && !/^https?:\/\/.+/.test(formData.website)) {
            newErrors.website = 'Please enter a valid website URL';
        }

        if (formData.foundedYear && (formData.foundedYear < 1800 || formData.foundedYear > new Date().getFullYear())) {
            newErrors.foundedYear = 'Founded year must be between 1800 and current year';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) {
            return;
        }

        try {
            setLoading(true);

            // Clean up data - remove empty strings and ensure proper types
            const submitData: any = {
                name: formData.name.trim(),
                category: formData.category
            };

            // Add optional fields only if they have values
            if (formData.description?.trim()) {
                submitData.description = formData.description.trim();
            }
            if (formData.logo?.trim()) {
                submitData.logo = formData.logo.trim();
            }
            if (formData.website?.trim()) {
                submitData.website = formData.website.trim();
            }
            if (formData.contactEmail?.trim()) {
                submitData.contactEmail = formData.contactEmail.trim();
            }
            if (formData.contactPhone?.trim()) {
                submitData.contactPhone = formData.contactPhone.trim();
            }
            if (formData.country?.trim()) {
                submitData.country = formData.country.trim();
            }
            if (formData.foundedYear) {
                submitData.foundedYear = formData.foundedYear;
            }

            if (isEditing) {
                await api.updateBrand(brandId, submitData);
                Alert.alert('Success', 'Brand updated successfully');
            } else {
                await api.createBrand(submitData);
                Alert.alert('Success', 'Brand created successfully');
            }

            navigation.goBack();
        } catch (error: any) {
            console.error('Error saving brand:', error);
            const errorMessage = error.message || 'Failed to save brand';
            Alert.alert('Error', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (field: keyof BrandFormData, value: string | number) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };

    const styles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.colors.background,
        },
        content: {
            flex: 1,
            padding: 16,
        },
        form: {
            flex: 1,
        },
        section: {
            marginBottom: 24,
        },
        sectionTitle: {
            fontSize: 18,
            fontWeight: '600',
            color: theme.colors.text,
            marginBottom: 16,
        },
        inputRow: {
            flexDirection: 'row',
            gap: 12,
        },
        inputHalf: {
            flex: 1,
        },
        categoryContainer: {
            marginBottom: 16,
        },
        categoryTitle: {
            fontSize: 16,
            fontWeight: '500',
            color: theme.colors.text,
            marginBottom: 8,
        },
        categoryGrid: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
        },
        categoryChip: {
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: theme.colors.border,
        },
        categoryChipSelected: {
            backgroundColor: theme.colors.primary,
            borderColor: theme.colors.primary,
        },
        categoryChipText: {
            fontSize: 14,
            color: theme.colors.text,
        },
        categoryChipTextSelected: {
            color: '#FFFFFF',
        },
        buttonContainer: {
            paddingTop: 16,
            paddingBottom: 32,
        },
        loadingContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
        },
    });

    if (initialLoading) {
        return (
            <View style={styles.loadingContainer}>
                <LoadingSpinner size="large" />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView style={styles.content}>
                <View style={styles.form}>
                    {/* Basic Information */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Basic Information</Text>

                        <Input
                            label="Brand Name *"
                            value={formData.name}
                            onChangeText={(value) => handleInputChange('name', value)}
                            error={errors.name}
                            placeholder="Enter brand name"
                            style={{ marginBottom: 16 }}
                        />

                        <Input
                            label="Description"
                            value={formData.description}
                            onChangeText={(value) => handleInputChange('description', value)}
                            error={errors.description}
                            placeholder="Enter brand description"
                            multiline
                            numberOfLines={3}
                            style={{ marginBottom: 16 }}
                        />

                        <View style={styles.categoryContainer}>
                            <Text style={styles.categoryTitle}>Category *</Text>
                            <View style={styles.categoryGrid}>
                                {BRAND_CATEGORIES.map((category) => (
                                    <TouchableOpacity
                                        key={category}
                                        style={[
                                            styles.categoryChip,
                                            formData.category === category && styles.categoryChipSelected
                                        ]}
                                        onPress={() => handleInputChange('category', category)}
                                    >
                                        <Text style={[
                                            styles.categoryChipText,
                                            formData.category === category && styles.categoryChipTextSelected
                                        ]}>
                                            {category.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </View>

                    {/* Contact Information */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Contact Information</Text>

                        <Input
                            label="Website"
                            value={formData.website}
                            onChangeText={(value) => handleInputChange('website', value)}
                            error={errors.website}
                            placeholder="https://example.com"
                            keyboardType="url"
                            style={{ marginBottom: 16 }}
                        />

                        <View style={styles.inputRow}>
                            <View style={styles.inputHalf}>
                                <Input
                                    label="Contact Email"
                                    value={formData.contactEmail}
                                    onChangeText={(value) => handleInputChange('contactEmail', value)}
                                    error={errors.contactEmail}
                                    placeholder="contact@brand.com"
                                    keyboardType="email-address"
                                />
                            </View>
                            <View style={styles.inputHalf}>
                                <Input
                                    label="Contact Phone"
                                    value={formData.contactPhone}
                                    onChangeText={(value) => handleInputChange('contactPhone', value)}
                                    error={errors.contactPhone}
                                    placeholder="+1 (555) 123-4567"
                                    keyboardType="phone-pad"
                                />
                            </View>
                        </View>
                    </View>

                    {/* Additional Information */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Additional Information</Text>

                        <Input
                            label="Logo URL"
                            value={formData.logo}
                            onChangeText={(value) => handleInputChange('logo', value)}
                            error={errors.logo}
                            placeholder="https://example.com/logo.png"
                            keyboardType="url"
                            style={{ marginBottom: 16 }}
                        />

                        <View style={styles.inputRow}>
                            <View style={styles.inputHalf}>
                                <Input
                                    label="Country"
                                    value={formData.country}
                                    onChangeText={(value) => handleInputChange('country', value)}
                                    error={errors.country}
                                    placeholder="United States"
                                />
                            </View>
                            <View style={styles.inputHalf}>
                                <Input
                                    label="Founded Year"
                                    value={formData.foundedYear?.toString() || ''}
                                    onChangeText={(value) => {
                                        const year = value.trim() ? parseInt(value, 10) : undefined;
                                        handleInputChange('foundedYear', !isNaN(year!) && year ? year : undefined);
                                    }}
                                    error={errors.foundedYear}
                                    placeholder="2020"
                                    keyboardType="numeric"
                                />
                            </View>
                        </View>
                    </View>
                </View>
            </ScrollView>

            <View style={styles.buttonContainer}>
                <Button
                    title={isEditing ? 'Update Brand' : 'Create Brand'}
                    onPress={handleSubmit}
                    loading={loading}
                    disabled={loading}
                />
            </View>
        </KeyboardAvoidingView>
    );
};

export default BrandFormScreen;
