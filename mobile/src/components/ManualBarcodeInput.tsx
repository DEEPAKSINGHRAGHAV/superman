import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../contexts/ThemeContext';
import { Input } from './ui';

interface ManualBarcodeInputProps {
    onScan: (data: string) => void;
    onClose: () => void;
}

export const ManualBarcodeInput: React.FC<ManualBarcodeInputProps> = ({
    onScan,
    onClose,
}) => {
    const { theme } = useTheme();
    const [barcodeInput, setBarcodeInput] = useState('');

    const handleSubmit = () => {
        if (barcodeInput.trim()) {
            onScan(barcodeInput.trim());
            setBarcodeInput('');
        } else {
            Alert.alert('Invalid Input', 'Please enter a valid barcode');
        }
    };

    const handleClose = () => {
        onClose();
    };

    const handleQuickBarcode = (barcode: string) => {
        setBarcodeInput(barcode);
        onScan(barcode);
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: theme.colors.primary[500] }]}>
                <Text style={[styles.headerTitle, { color: theme.colors.white }]}>
                    Enter Barcode
                </Text>
                <TouchableOpacity
                    style={styles.closeButton}
                    onPress={handleClose}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Icon name="close" size={24} color={theme.colors.white} />
                </TouchableOpacity>
            </View>

            {/* Content */}
            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <Icon name="qr-code" size={80} color={theme.colors.primary[500]} />
                </View>

                <Text style={[styles.title, { color: theme.colors.text }]}>
                    Enter Barcode Manually
                </Text>
                <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                    Type or paste the barcode number below
                </Text>

                <Input
                    placeholder="Enter barcode number..."
                    value={barcodeInput}
                    onChangeText={setBarcodeInput}
                    keyboardType="numeric"
                    autoFocus={true}
                    style={styles.input}
                />

                <TouchableOpacity
                    style={[
                        styles.submitButton,
                        {
                            backgroundColor: barcodeInput.trim() ? theme.colors.primary[500] : theme.colors.grey[300]
                        }
                    ]}
                    onPress={handleSubmit}
                    disabled={!barcodeInput.trim()}
                >
                    <Icon name="check" size={24} color={theme.colors.white} />
                    <Text style={styles.submitButtonText}>Submit Barcode</Text>
                </TouchableOpacity>

                <Text style={[styles.divider, { color: theme.colors.textSecondary }]}>
                    Or try these sample barcodes:
                </Text>

                <View style={styles.quickButtons}>
                    {['1234567890123', '9876543210987', '1111111111111'].map((barcode) => (
                        <TouchableOpacity
                            key={barcode}
                            style={[styles.quickButton, { borderColor: theme.colors.border }]}
                            onPress={() => handleQuickBarcode(barcode)}
                        >
                            <Text style={[styles.quickButtonText, { color: theme.colors.text }]}>
                                {barcode}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 50,
        paddingBottom: 20,
        paddingHorizontal: 20,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    closeButton: {
        padding: 8,
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 40,
        alignItems: 'center',
    },
    iconContainer: {
        marginBottom: 30,
    },
    title: {
        fontSize: 24,
        fontWeight: '600',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        marginBottom: 40,
        textAlign: 'center',
        lineHeight: 24,
    },
    input: {
        marginBottom: 30,
        width: '100%',
    },
    submitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 30,
        paddingVertical: 15,
        borderRadius: 25,
        marginBottom: 40,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    submitButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    divider: {
        fontSize: 14,
        marginBottom: 20,
        textAlign: 'center',
    },
    quickButtons: {
        width: '100%',
        gap: 12,
    },
    quickButton: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        backgroundColor: 'transparent',
    },
    quickButtonText: {
        fontSize: 14,
        textAlign: 'center',
        fontFamily: 'monospace',
    },
});
