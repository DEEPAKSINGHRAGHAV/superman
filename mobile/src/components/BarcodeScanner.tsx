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
import { RNCamera } from 'react-native-camera';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../contexts/ThemeContext';

interface BarcodeScannerProps {
    onScan: (data: string) => void;
    onClose: () => void;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
    onScan,
    onClose,
}) => {
    const { theme } = useTheme();
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [scanned, setScanned] = useState(false);

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

    const handleBarCodeRead = ({ data }: { data: string }) => {
        if (!scanned) {
            setScanned(true);
            onScan(data);
            onClose();
        }
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
        <View style={styles.container}>
            <RNCamera
                style={styles.camera}
                type={RNCamera.Constants.Type.back}
                flashMode={RNCamera.Constants.FlashMode.auto}
                onBarCodeRead={handleBarCodeRead}
                barCodeTypes={[
                    RNCamera.Constants.BarCodeType.qr,
                    RNCamera.Constants.BarCodeType.ean13,
                    RNCamera.Constants.BarCodeType.ean8,
                    RNCamera.Constants.BarCodeType.code128,
                    RNCamera.Constants.BarCodeType.upc_a,
                    RNCamera.Constants.BarCodeType.upc_e,
                ]}
            >
                <View style={styles.overlay}>
                    {/* Header */}
                    <View style={[styles.header, { backgroundColor: theme.colors.overlay }]}>
                        <Text style={[styles.headerTitle, { color: theme.colors.white }]}>
                            Scan Barcode
                        </Text>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={handleClose}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Icon name="close" size={24} color={theme.colors.white} />
                        </TouchableOpacity>
                    </View>

                    {/* Scanning Area */}
                    <View style={styles.scanningArea}>
                        <View style={styles.scanningFrame}>
                            <View style={[styles.corner, styles.topLeft, { borderColor: theme.colors.primary[500] }]} />
                            <View style={[styles.corner, styles.topRight, { borderColor: theme.colors.primary[500] }]} />
                            <View style={[styles.corner, styles.bottomLeft, { borderColor: theme.colors.primary[500] }]} />
                            <View style={[styles.corner, styles.bottomRight, { borderColor: theme.colors.primary[500] }]} />
                        </View>
                    </View>

                    {/* Instructions */}
                    <View style={[styles.instructions, { backgroundColor: theme.colors.overlay }]}>
                        <Text style={[styles.instructionText, { color: theme.colors.white }]}>
                            Position the barcode within the frame
                        </Text>
                        <Text style={[styles.instructionSubtext, { color: theme.colors.white }]}>
                            The barcode will be scanned automatically
                        </Text>
                    </View>
                </View>
            </RNCamera>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    camera: {
        flex: 1,
    },
    overlay: {
        flex: 1,
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
    closeButton: {
        padding: 8,
    },
    scanningArea: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scanningFrame: {
        width: 250,
        height: 250,
        position: 'relative',
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
    instructions: {
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


