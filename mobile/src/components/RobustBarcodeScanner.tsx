import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    PermissionsAndroid,
    Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../contexts/ThemeContext';

interface RobustBarcodeScannerProps {
    onScan: (data: string) => void;
    onClose: () => void;
}

export const RobustBarcodeScanner: React.FC<RobustBarcodeScannerProps> = ({
    onScan,
    onClose,
}) => {
    const { theme } = useTheme();
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [scanned, setScanned] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);

    useEffect(() => {
        requestCameraPermission();
    }, []);

    const requestCameraPermission = async () => {
        if (Platform.OS === 'android') {
            try {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.CAMERA,
                    {
                        title: 'Camera Permission',
                        message: 'This app needs access to camera to scan barcodes',
                        buttonNeutral: 'Ask Me Later',
                        buttonNegative: 'Cancel',
                        buttonPositive: 'OK',
                    }
                );
                setHasPermission(granted === PermissionsAndroid.RESULTS.GRANTED);
            } catch (err) {
                console.warn(err);
                setHasPermission(false);
                setCameraError('Permission request failed');
            }
        } else {
            setHasPermission(true);
        }
    };

    const handleManualInput = () => {
        Alert.prompt(
            'Enter Barcode',
            'Type the barcode number manually:',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Scan',
                    onPress: (text) => {
                        if (text && text.trim()) {
                            onScan(text.trim());
                        }
                    }
                }
            ],
            'plain-text'
        );
    };

    const handleSampleBarcode = (barcode: string) => {
        setScanned(true);
        onScan(barcode);
    };

    const handleClose = () => {
        onClose();
    };

    const handleReset = () => {
        setScanned(false);
    };

    if (hasPermission === null) {
        return (
            <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
                <View style={styles.permissionContainer}>
                    <Text style={[styles.permissionText, { color: theme.colors.text }]}>
                        Requesting camera permission...
                    </Text>
                </View>
            </View>
        );
    }

    if (hasPermission === false || cameraError) {
        return (
            <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
                <View style={styles.permissionContainer}>
                    <Icon name="camera-alt" size={64} color={theme.colors.error[500]} />
                    <Text style={[styles.permissionTitle, { color: theme.colors.text }]}>
                        Camera Not Available
                    </Text>
                    <Text style={[styles.permissionText, { color: theme.colors.textSecondary }]}>
                        {cameraError || 'Camera permission is required to scan barcodes'}
                    </Text>
                    <TouchableOpacity
                        style={[styles.permissionButton, { backgroundColor: theme.colors.primary[500] }]}
                        onPress={requestCameraPermission}
                    >
                        <Text style={styles.permissionButtonText}>Try Again</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.closeButton, { borderColor: theme.colors.border }]}
                        onPress={handleClose}
                    >
                        <Text style={[styles.closeButtonText, { color: theme.colors.text }]}>
                            Close
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

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

            {/* Camera Placeholder */}
            <View style={styles.cameraContainer}>
                <View style={[styles.mockCamera, { backgroundColor: theme.colors.surface }]}>
                    <Icon name="camera-alt" size={120} color={theme.colors.primary[500]} />
                    <Text style={[styles.mockText, { color: theme.colors.text }]}>
                        Camera Scanner
                    </Text>
                    <Text style={[styles.mockSubtext, { color: theme.colors.textSecondary }]}>
                        Real camera scanning will be available soon
                    </Text>
                </View>

                {/* Scanning Frame */}
                <View style={styles.scanningFrame}>
                    <View style={[styles.corner, styles.topLeft, { borderColor: theme.colors.primary[500] }]} />
                    <View style={[styles.corner, styles.topRight, { borderColor: theme.colors.primary[500] }]} />
                    <View style={[styles.corner, styles.bottomLeft, { borderColor: theme.colors.primary[500] }]} />
                    <View style={[styles.corner, styles.bottomRight, { borderColor: theme.colors.primary[500] }]} />
                </View>
            </View>

            {/* Controls */}
            <View style={[styles.controls, { backgroundColor: theme.colors.surface }]}>
                <Text style={[styles.instructionText, { color: theme.colors.text }]}>
                    Use manual input or sample barcodes below
                </Text>

                <TouchableOpacity
                    style={[styles.scanButton, { backgroundColor: theme.colors.primary[500] }]}
                    onPress={handleManualInput}
                >
                    <Icon name="keyboard" size={24} color={theme.colors.white} />
                    <Text style={styles.scanButtonText}>Enter Barcode Manually</Text>
                </TouchableOpacity>

                <Text style={[styles.divider, { color: theme.colors.textSecondary }]}>
                    Or try these sample barcodes:
                </Text>

                <View style={styles.quickButtons}>
                    {['1234567890123', '9876543210987', '1111111111111'].map((barcode) => (
                        <TouchableOpacity
                            key={barcode}
                            style={[styles.quickButton, { borderColor: theme.colors.border }]}
                            onPress={() => handleSampleBarcode(barcode)}
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
    cameraContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        paddingHorizontal: 20,
    },
    mockCamera: {
        width: '100%',
        height: 300,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#e0e0e0',
        borderStyle: 'dashed',
    },
    mockText: {
        fontSize: 18,
        fontWeight: '600',
        marginTop: 16,
        marginBottom: 8,
    },
    mockSubtext: {
        fontSize: 14,
        textAlign: 'center',
        paddingHorizontal: 20,
    },
    scanningFrame: {
        position: 'absolute',
        width: 250,
        height: 250,
    },
    corner: {
        position: 'absolute',
        width: 30,
        height: 30,
        borderWidth: 3,
    },
    topLeft: {
        top: 0,
        left: 0,
        borderRightWidth: 0,
        borderBottomWidth: 0,
    },
    topRight: {
        top: 0,
        right: 0,
        borderLeftWidth: 0,
        borderBottomWidth: 0,
    },
    bottomLeft: {
        bottom: 0,
        left: 0,
        borderRightWidth: 0,
        borderTopWidth: 0,
    },
    bottomRight: {
        bottom: 0,
        right: 0,
        borderLeftWidth: 0,
        borderTopWidth: 0,
    },
    controls: {
        paddingVertical: 30,
        paddingHorizontal: 20,
        alignItems: 'center',
    },
    instructionText: {
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 20,
        textAlign: 'center',
    },
    scanButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 30,
        paddingVertical: 15,
        borderRadius: 25,
        marginBottom: 20,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    scanButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    divider: {
        fontSize: 14,
        marginBottom: 15,
        textAlign: 'center',
    },
    quickButtons: {
        width: '100%',
        gap: 10,
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
    permissionContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    permissionTitle: {
        fontSize: 20,
        fontWeight: '600',
        marginTop: 20,
        marginBottom: 12,
        textAlign: 'center',
    },
    permissionText: {
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 32,
    },
    permissionButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    permissionButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    closeButtonText: {
        fontSize: 16,
        fontWeight: '500',
    },
});
