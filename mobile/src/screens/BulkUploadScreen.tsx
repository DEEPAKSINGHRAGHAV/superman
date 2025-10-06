import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../contexts/ThemeContext';
import { Button, Card, LoadingSpinner } from '../components/ui';
import { ProductFormData } from '../types';
import apiService from '../services/api';

const BulkUploadScreen: React.FC = () => {
    const { theme } = useTheme();
    const navigation = useNavigation();

    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const handleFileSelect = () => {
        // This would typically open a file picker
        // For now, we'll simulate file selection
        Alert.alert(
            'File Selection',
            'File picker would open here. Please implement file selection functionality.',
            [{ text: 'OK' }]
        );
    };

    const handleTemplateDownload = () => {
        // This would download a CSV template
        Alert.alert(
            'Download Template',
            'CSV template would be downloaded here. Please implement template download functionality.',
            [{ text: 'OK' }]
        );
    };

    const handleBulkUpload = async () => {
        try {
            setIsUploading(true);
            setUploadProgress(0);

            // Simulate upload progress
            const interval = setInterval(() => {
                setUploadProgress(prev => {
                    if (prev >= 100) {
                        clearInterval(interval);
                        setIsUploading(false);
                        Alert.alert('Success', 'Bulk upload completed successfully!');
                        return 100;
                    }
                    return prev + 10;
                });
            }, 200);

        } catch (error) {
            console.error('Bulk upload error:', error);
            Alert.alert('Error', 'Failed to upload products');
            setIsUploading(false);
        }
    };

    const getContainerStyle = () => ({
        ...styles.container,
        backgroundColor: theme.colors.background,
    });

    const getTitleStyle = () => ({
        ...styles.title,
        color: theme.colors.text,
    });

    const getSubtitleStyle = () => ({
        ...styles.subtitle,
        color: theme.colors.textSecondary,
    });

    return (
        <ScrollView style={getContainerStyle()}>
            <View style={styles.content}>
                <Text style={getTitleStyle()}>Bulk Upload Products</Text>
                <Text style={getSubtitleStyle()}>
                    Upload multiple products at once using a CSV file
                </Text>

                <Card variant="elevated" style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Icon name="cloud-upload" size={32} color={theme.colors.primary[500]} />
                        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
                            Upload CSV File
                        </Text>
                    </View>

                    <Text style={[styles.cardDescription, { color: theme.colors.textSecondary }]}>
                        Select a CSV file containing product data to upload multiple products at once.
                    </Text>

                    <Button
                        title="Select File"
                        onPress={handleFileSelect}
                        variant="outline"
                        leftIcon={<Icon name="folder-open" size={16} color={theme.colors.primary[500]} />}
                        style={styles.selectButton}
                    />
                </Card>

                <Card variant="elevated" style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Icon name="download" size={32} color={theme.colors.success[500]} />
                        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
                            Download Template
                        </Text>
                    </View>

                    <Text style={[styles.cardDescription, { color: theme.colors.textSecondary }]}>
                        Download our CSV template to ensure your data is formatted correctly.
                    </Text>

                    <Button
                        title="Download Template"
                        onPress={handleTemplateDownload}
                        variant="outline"
                        leftIcon={<Icon name="file-download" size={16} color={theme.colors.success[500]} />}
                        style={styles.downloadButton}
                    />
                </Card>

                <Card variant="elevated" style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Icon name="info" size={32} color={theme.colors.info[500]} />
                        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
                            Upload Guidelines
                        </Text>
                    </View>

                    <View style={styles.guidelines}>
                        <Text style={[styles.guidelineItem, { color: theme.colors.textSecondary }]}>
                            • CSV file should have headers in the first row
                        </Text>
                        <Text style={[styles.guidelineItem, { color: theme.colors.textSecondary }]}>
                            • Required fields: Name, SKU, Cost Price, Selling Price
                        </Text>
                        <Text style={[styles.guidelineItem, { color: theme.colors.textSecondary }]}>
                            • Maximum file size: 10MB
                        </Text>
                        <Text style={[styles.guidelineItem, { color: theme.colors.textSecondary }]}>
                            • Maximum 1000 products per upload
                        </Text>
                        <Text style={[styles.guidelineItem, { color: theme.colors.textSecondary }]}>
                            • Duplicate SKUs will be skipped
                        </Text>
                    </View>
                </Card>

                {isUploading && (
                    <Card variant="elevated" style={styles.progressCard}>
                        <Text style={[styles.progressTitle, { color: theme.colors.text }]}>
                            Uploading Products...
                        </Text>
                        <View style={[styles.progressBar, { backgroundColor: theme.colors.gray[200] }]}>
                            <View
                                style={[
                                    styles.progressFill,
                                    {
                                        backgroundColor: theme.colors.primary[500],
                                        width: `${uploadProgress}%`
                                    }
                                ]}
                            />
                        </View>
                        <Text style={[styles.progressText, { color: theme.colors.textSecondary }]}>
                            {uploadProgress}% Complete
                        </Text>
                    </Card>
                )}

                <Button
                    title="Start Upload"
                    onPress={handleBulkUpload}
                    variant="primary"
                    size="lg"
                    fullWidth
                    loading={isUploading}
                    disabled={isUploading}
                    style={styles.uploadButton}
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
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 24,
    },
    card: {
        marginBottom: 16,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginLeft: 12,
    },
    cardDescription: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 16,
    },
    selectButton: {
        marginBottom: 8,
    },
    downloadButton: {
        marginBottom: 8,
    },
    guidelines: {
        gap: 8,
    },
    guidelineItem: {
        fontSize: 14,
        lineHeight: 20,
    },
    progressCard: {
        marginBottom: 16,
    },
    progressTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
        textAlign: 'center',
    },
    progressBar: {
        height: 8,
        borderRadius: 4,
        marginBottom: 8,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 4,
    },
    progressText: {
        fontSize: 14,
        textAlign: 'center',
    },
    uploadButton: {
        marginTop: 8,
    },
});

export default BulkUploadScreen;