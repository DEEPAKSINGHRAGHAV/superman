import React, { useState, useEffect, useRef } from 'react';
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
import { Camera } from 'react-native-camera-kit';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../contexts/ThemeContext';

interface HighQualityBarcodeScannerProps {
    onScan: (data: string) => void;
    onClose: () => void;
}

export const HighQualityBarcodeScanner: React.FC<HighQualityBarcodeScannerProps> = ({
    onScan,
    onClose,
}) => {
    const { theme } = useTheme();
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [scanned, setScanned] = useState(false);
    const [torchEnabled, setTorchEnabled] = useState(false);
    const cameraRef = useRef<any>(null);

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

    const handleBarcodeRead = (event: any) => {
        if (!scanned && event.nativeEvent.codeStringValue) {
            setScanned(true);
            console.log('Barcode detected:', event.nativeEvent.codeStringValue);
            onScan(event.nativeEvent.codeStringValue);
        }
    };

    const toggleTorch = () => {
        setTorchEnabled(!torchEnabled);
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
        <View style={styles.container}>
            <Camera
                ref={cameraRef}
                style={styles.camera}
                showFrame={true}
                scanBarcode={!scanned}
                laserColor={theme.colors.primary[500]}
                frameColor={theme.colors.primary[500]}
                onReadCode={handleBarcodeRead}
                torchMode={torchEnabled ? 'on' : 'off'}
                cameraType="back"
                focusMode="on"
                zoomMode="off"
            />

            {/* Custom Overlay */}
            <View style={styles.overlay}>
                {/* Header */}
                <View style={[styles.header, { backgroundColor: theme.colors.overlay }]}>
                    <Text style={[styles.headerTitle, { color: theme.colors.white }]}>
                        High Quality Scanner
                    </Text>
                    <View style={styles.headerButtons}>
                        <TouchableOpacity
                            style={styles.torchButton}
                            onPress={toggleTorch}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Icon
                                name={torchEnabled ? "flash-on" : "flash-off"}
                                size={24}
                                color={torchEnabled ? theme.colors.warning[500] : theme.colors.white}
                            />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={handleClose}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Icon name="close" size={24} color={theme.colors.white} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Instructions */}
                <View style={[styles.instructions, { backgroundColor: theme.colors.overlay }]}>
                    <Text style={[styles.instructionText, { color: theme.colors.white }]}>
                        {scanned ? 'Barcode scanned successfully!' : 'Position the barcode within the frame'}
                    </Text>
                    <Text style={[styles.instructionSubtext, { color: theme.colors.white }]}>
                        {scanned ? 'Tap "Scan Again" to scan another barcode' : 'This scanner uses native camera quality'}
                    </Text>
                    {scanned && (
                        <TouchableOpacity
                            style={[styles.resetButton, { backgroundColor: theme.colors.primary[500] }]}
                            onPress={handleReset}
                        >
                            <Text style={styles.resetButtonText}>Scan Again</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </View>
    );
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    camera: {
        flex: 1,
        width: width,
        height: height,
    },
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'transparent',
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
    headerButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    torchButton: {
        padding: 8,
    },
    closeButton: {
        padding: 8,
    },
    instructions: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingVertical: 20,
        paddingHorizontal: 20,
        alignItems: 'center',
    },
    instructionText: {
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 4,
        textAlign: 'center',
    },
    instructionSubtext: {
        fontSize: 14,
        opacity: 0.8,
        textAlign: 'center',
        marginBottom: 16,
    },
    resetButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
        marginTop: 12,
    },
    resetButtonText: {
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
