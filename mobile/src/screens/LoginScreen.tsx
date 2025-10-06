import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Alert,
    Image,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Button, Input, LoadingSpinner } from '../components/ui';
import { LoginRequest } from '../types';

const LoginScreen: React.FC = () => {
    const { theme, isDark } = useTheme();
    const { login, isLoading } = useAuth();

    const [formData, setFormData] = useState<LoginRequest>({
        email: '',
        password: '',
    });

    const [errors, setErrors] = useState<Partial<LoginRequest>>({});
    const [isFormValid, setIsFormValid] = useState(false);

    // Form validation
    useEffect(() => {
        const validateForm = () => {
            const newErrors: Partial<LoginRequest> = {};

            // Email validation
            if (!formData.email) {
                newErrors.email = 'Email is required';
            } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
                newErrors.email = 'Please enter a valid email address';
            }

            // Password validation
            if (!formData.password) {
                newErrors.password = 'Password is required';
            } else if (formData.password.length < 6) {
                newErrors.password = 'Password must be at least 6 characters';
            }

            setErrors(newErrors);
            setIsFormValid(Object.keys(newErrors).length === 0 && formData.email && formData.password);
        };

        validateForm();
    }, [formData]);

    const handleInputChange = (field: keyof LoginRequest, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));

        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };

    const handleLogin = async () => {
        if (!isFormValid) {
            Alert.alert('Validation Error', 'Please fix the errors before submitting');
            return;
        }

        try {
            const response = await login(formData);

            if (!response.success) {
                Alert.alert('Login Failed', response.message || 'Invalid credentials');
            }
        } catch (error: any) {
            console.error('Login error:', error);
            Alert.alert(
                'Login Error',
                error.message || 'An unexpected error occurred. Please try again.'
            );
        }
    };

    const getContainerStyle = () => ({
        ...styles.container,
        backgroundColor: theme.colors.background,
    });

    const getHeaderStyle = () => ({
        ...styles.header,
        backgroundColor: theme.colors.primary[500],
    });

    const getTitleStyle = () => ({
        ...styles.title,
        color: theme.colors.white,
    });

    const getSubtitleStyle = () => ({
        ...styles.subtitle,
        color: theme.colors.white,
    });

    const getFormContainerStyle = () => ({
        ...styles.formContainer,
        backgroundColor: theme.colors.surface,
    });

    const getWelcomeTextStyle = () => ({
        ...styles.welcomeText,
        color: theme.colors.text,
    });

    const getDescriptionStyle = () => ({
        ...styles.description,
        color: theme.colors.textSecondary,
    });

    return (
        <KeyboardAvoidingView
            style={getContainerStyle()}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Header */}
                <View style={getHeaderStyle()}>
                    <View style={styles.logoContainer}>
                        <View style={[styles.logo, { backgroundColor: theme.colors.white }]}>
                            <Text style={[styles.logoText, { color: theme.colors.primary[500] }]}>
                                SM
                            </Text>
                        </View>
                    </View>
                    <Text style={getTitleStyle()}>Shivik Mart</Text>
                    <Text style={getSubtitleStyle()}>Inventory Management System</Text>
                </View>

                {/* Form Container */}
                <View style={getFormContainerStyle()}>
                    <View style={styles.formContent}>
                        <Text style={getWelcomeTextStyle()}>Welcome Back!</Text>
                        <Text style={getDescriptionStyle()}>
                            Sign in to access your inventory dashboard
                        </Text>

                        <View style={styles.form}>
                            <Input
                                label="Email Address"
                                placeholder="Enter your email"
                                value={formData.email}
                                onChangeText={(text) => handleInputChange('email', text)}
                                error={errors.email}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                                leftIcon="email"
                                required
                            />

                            <Input
                                label="Password"
                                placeholder="Enter your password"
                                value={formData.password}
                                onChangeText={(text) => handleInputChange('password', text)}
                                error={errors.password}
                                secureTextEntry
                                leftIcon="lock"
                                required
                            />

                            <Button
                                title="Sign In"
                                onPress={handleLogin}
                                variant="primary"
                                size="lg"
                                fullWidth
                                loading={isLoading}
                                disabled={!isFormValid || isLoading}
                                style={styles.loginButton}
                            />

                            <View style={styles.footer}>
                                <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
                                    Forgot your password? Contact your administrator
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>
            </ScrollView>

            {isLoading && <LoadingSpinner overlay text="Signing in..." />}
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
    },
    header: {
        paddingTop: 60,
        paddingBottom: 40,
        paddingHorizontal: 24,
        alignItems: 'center',
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    logoContainer: {
        marginBottom: 16,
    },
    logo: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    logoText: {
        fontSize: 32,
        fontWeight: 'bold',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        opacity: 0.9,
    },
    formContainer: {
        flex: 1,
        marginTop: -20,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 32,
    },
    formContent: {
        paddingHorizontal: 24,
        paddingBottom: 24,
    },
    welcomeText: {
        fontSize: 24,
        fontWeight: '600',
        marginBottom: 8,
        textAlign: 'center',
    },
    description: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 24,
    },
    form: {
        gap: 16,
    },
    loginButton: {
        marginTop: 8,
    },
    footer: {
        alignItems: 'center',
        marginTop: 24,
    },
    footerText: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
});

export default LoginScreen;