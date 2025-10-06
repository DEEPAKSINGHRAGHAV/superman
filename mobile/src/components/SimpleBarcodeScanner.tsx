import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    TextInput,
    Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../contexts/ThemeContext';
import { Input } from './ui';

interface SimpleBarcodeScannerProps {
    onScan: (data: string) => void;
    onClose: () => void;
}

export const SimpleBarcodeScanner: React.FC<SimpleBarcodeScannerProps> = ({
    onScan,
    onClose,
}) => {
    const { theme } = useTheme();
    const [barcodeInput, setBarcodeInput] = useState('');
    const [scanningMode, setScanningMode] = useState<'input' | 'camera'>('input');

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

    const tryCameraMode = () => {
        Alert.alert(
            'Camera Scanner',
            'Camera scanning is not available yet. Please use manual input or try the sample barcodes below.',
            [
                { text: 'OK', onPress: () => setScanningMode('input') }
            ]
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: theme.colors.primary[500] }]}>
                <Text style={[styles.headerTitle, { color: theme.colors.white }]}>
                    Barcode Scanner
                </Text>
                <TouchableOpacity
                    style={styles.closeButton}
                    onPress={handleClose}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Icon name="close" size={24} color={theme.colors.white} />
                </TouchableOpacity>
            </View>

            {/* Mode Selector */}
            <View style={styles.modeSelector}>
                <TouchableOpacity
                    style={[
                        styles.modeButton,
                        scanningMode === 'input' && { backgroundColor: theme.colors.primary[500] }
                    ]}
                    onPress={() => setScanningMode('input')}
                >
                    <Icon
                        name="keyboard"
                        size={20}
                        color={scanningMode === 'input' ? theme.colors.white : theme.colors.text}
                    />
                    <Text style={[
                        styles.modeButtonText,
                        scanningMode === 'input' && { color: theme.colors.white }
                    ]}>
                        Manual Input
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.modeButton,
                        scanningMode === 'camera' && { backgroundColor: theme.colors.primary[500] }
                    ]}
                    onPress={tryCameraMode}
                >
                    <Icon
                        name="camera-alt"
                        size={20}
                        color={scanningMode === 'camera' ? theme.colors.white : theme.colors.text}
                    />
                    <Text style={[
                        styles.modeButtonText,
                        scanningMode === 'camera' && { color: theme.colors.white }
                    ]}>
                        Camera Scan
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Content */}
            <View style={styles.content}>
                {scanningMode === 'input' ? (
                    <>
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
                    </>
                ) : (
                    <>
                        <View style={styles.iconContainer}>
                            <Icon name="camera-alt" size={80} color={theme.colors.primary[500]} />
                        </View>

                        <Text style={[styles.title, { color: theme.colors.text }]}>
                            Camera Scanner
                        </Text>
                        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                            Camera scanning feature is coming soon!
                        </Text>

                        <TouchableOpacity
                            style={[styles.submitButton, { backgroundColor: theme.colors.primary[500] }]}
                            onPress={tryCameraMode}
                        >
                            <Icon name="camera-alt" size={24} color={theme.colors.white} />
                            <Text style={styles.submitButtonText}>Try Camera Scanner</Text>
                        </TouchableOpacity>
                    </>
                )}

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
    modeSelector: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 10,
        gap: 10,
    },
    modeButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        backgroundColor: 'transparent',
    },
    modeButtonText: {
        marginLeft: 8,
        fontSize: 14,
        fontWeight: '500',
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 20,
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
