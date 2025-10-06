import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    PermissionsAndroid,
    Platform,
    Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../contexts/ThemeContext';

interface SafeBarcodeScannerProps {
    onScan: (data: string) => void;
    onClose: () => void;
}

export const SafeBarcodeScanner: React.FC<SafeBarcodeScannerProps> = ({
    onScan,
    onClose,
}) => {
    const { theme } = useTheme();
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [scanned, setScanned] = useState(false);
    const [mockBarcodes] = useState([
        '1234567890123',
        '9876543210987',
        '1111111111111',
        '2222222222222',
        '3333333333333',
    ]);
    const [currentBarcodeIndex, setCurrentBarcodeIndex] = useState(0);

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
            }
        } else {
            setHasPermission(true);
        }
    };

    const handleMockScan = () => {
        if (!scanned) {
            setScanned(true);
            const barcodeData = mockBarcodes[currentBarcodeIndex];
            console.log('Mock barcode scanned:', barcodeData);
            onScan(barcodeData);
        }
    };

    const handleNextBarcode = () => {
        setCurrentBarcodeIndex((prev) => (prev + 1) % mockBarcodes.length);
        setScanned(false);
    };

    const handleClose = () => {
        onClose();
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

    if (hasPermission === false) {
        return (
            <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
                <View style={styles.permissionContainer}>
                    <Icon name="camera-alt" size={64} color={theme.colors.error[500]} />
                    <Text style={[styles.permissionTitle, { color: theme.colors.text }]}>
                        Camera Permission Required
                    </Text>
                    <Text style={[styles.permissionText, { color: theme.colors.textSecondary }]}>
                        Please enable camera permission to scan barcodes
                    </Text>
                    <TouchableOpacity
                        style={[styles.permissionButton, { backgroundColor: theme.colors.primary[500] }]}
                        onPress={requestCameraPermission}
                    >
                        <Text style={styles.permissionButtonText}>Grant Permission</Text>
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

            {/* Mock Camera View */}
            <View style={styles.cameraContainer}>
                <View style={[styles.mockCamera, { backgroundColor: theme.colors.surface }]}>
                    <Icon name="qr-code-scanner" size={120} color={theme.colors.primary[500]} />
                    <Text style={[styles.mockText, { color: theme.colors.text }]}>
                        Mock Camera View
                    </Text>
                    <Text style={[styles.mockSubtext, { color: theme.colors.textSecondary }]}>
                        This is a demo scanner. Tap "Scan" to simulate barcode scanning.
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
                {!scanned ? (
                    <>
                        <Text style={[styles.instructionText, { color: theme.colors.text }]}>
                            Ready to scan barcode
                        </Text>
                        <TouchableOpacity
                            style={[styles.scanButton, { backgroundColor: theme.colors.primary[500] }]}
                            onPress={handleMockScan}
                        >
                            <Icon name="qr-code-scanner" size={24} color={theme.colors.white} />
                            <Text style={styles.scanButtonText}>Scan Barcode</Text>
                        </TouchableOpacity>
                    </>
                ) : (
                    <>
                        <Text style={[styles.successText, { color: theme.colors.success[500] }]}>
                            ✓ Barcode scanned successfully!
                        </Text>
                        <View style={styles.buttonRow}>
                            <TouchableOpacity
                                style={[styles.actionButton, { backgroundColor: theme.colors.primary[500] }]}
                                onPress={handleNextBarcode}
                            >
                                <Text style={styles.actionButtonText}>Scan Another</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionButton, { backgroundColor: theme.colors.secondary[500] }]}
                                onPress={handleClose}
                            >
                                <Text style={styles.actionButtonText}>Done</Text>
                            </TouchableOpacity>
                        </View>
                    </>
                )}
            </View>
        </View>
    );
};

const { width } = Dimensions.get('window');

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
    },
    mockCamera: {
        width: width - 40,
        height: width - 40,
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
    successText: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 20,
        textAlign: 'center',
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 15,
    },
    actionButton: {
        paddingHorizontal: 25,
        paddingVertical: 12,
        borderRadius: 20,
        minWidth: 120,
    },
    actionButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
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
