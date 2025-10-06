import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    PermissionsAndroid,
    Platform,
} from 'react-native';
import { Camera, useCameraDevice, useCodeScanner, useCameraPermission, useCameraDevices, useCameraFormat } from 'react-native-vision-camera';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../contexts/ThemeContext';

interface RealBarcodeScannerProps {
    onScan: (data: string) => void;
    onClose: () => void;
}

export const RealBarcodeScanner: React.FC<RealBarcodeScannerProps> = ({
    onScan,
    onClose,
}) => {
    const { theme } = useTheme();
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [scanned, setScanned] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [torchEnabled, setTorchEnabled] = useState(false);
    const cameraRef = useRef<Camera>(null);
    const device = useCameraDevice('back');

    // Get the best camera format for maximum quality
    const format = useCameraFormat(device, [
        { videoResolution: 'max' }, // Use maximum available resolution first
        { photoResolution: 'max' }, // Use maximum photo resolution
        { fps: 60 }, // Try 60fps first for smoother experience
        { videoAspectRatio: 16 / 9 }, // Prefer 16:9 aspect ratio
    ]);

    // Fallback format if 60fps is not available
    const fallbackFormat = useCameraFormat(device, [
        { videoResolution: 'max' },
        { photoResolution: 'max' },
        { fps: 30 },
        { videoAspectRatio: 16 / 9 },
    ]);

    // Use the best available format
    const selectedFormat = format || fallbackFormat;

    useEffect(() => {
        requestCameraPermission();
    }, []);

    // Debug camera format info
    useEffect(() => {
        if (selectedFormat) {
            console.log('Selected Camera Format:', {
                videoWidth: selectedFormat.videoWidth,
                videoHeight: selectedFormat.videoHeight,
                fps: selectedFormat.fps,
                videoAspectRatio: selectedFormat.videoAspectRatio,
                photoWidth: selectedFormat.photoWidth,
                photoHeight: selectedFormat.photoHeight,
                pixelFormat: selectedFormat.pixelFormat,
                supportsVideoHdr: selectedFormat.supportsVideoHdr,
                supportsPhotoHdr: selectedFormat.supportsPhotoHdr,
            });
        }
    }, [selectedFormat]);

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

    const handleBarcodeDetected = (barcodeData: string) => {
        if (!scanned && barcodeData) {
            setScanned(true);
            console.log('Barcode detected:', barcodeData);
            onScan(barcodeData);
        }
    };

    const codeScanner = useCodeScanner({
        codeTypes: ['qr', 'ean-13', 'ean-8', 'code-128'],
        onCodeScanned: (codes) => {
            if (codes.length > 0) {
                handleBarcodeDetected(codes[0].value || '');
            }
        }
    });

    const handleClose = () => {
        onClose();
    };

    const handleReset = () => {
        setScanned(false);
    };

    const handleCameraPress = async () => {
        try {
            if (cameraRef.current && device?.supportsFocus) {
                await cameraRef.current.focus({ x: 0.5, y: 0.5 });
                setIsFocused(true);
                setTimeout(() => setIsFocused(false), 1000);
            }
        } catch (error) {
            console.log('Focus error:', error);
            // Fallback: just show visual feedback even if focus fails
            setIsFocused(true);
            setTimeout(() => setIsFocused(false), 1000);
        }
    };

    const toggleTorch = () => {
        setTorchEnabled(!torchEnabled);
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

    if (!device) {
        return (
            <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
                <View style={styles.permissionContainer}>
                    <Icon name="camera-alt" size={64} color={theme.colors.error[500]} />
                    <Text style={[styles.permissionTitle, { color: theme.colors.text }]}>
                        Camera Not Available
                    </Text>
                    <Text style={[styles.permissionText, { color: theme.colors.textSecondary }]}>
                        No camera device found on this device
                    </Text>
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
            <TouchableOpacity
                style={styles.cameraContainer}
                activeOpacity={1}
                onPress={handleCameraPress}
            >
                <Camera
                    ref={cameraRef}
                    style={styles.camera}
                    device={device}
                    format={selectedFormat}
                    isActive={true}
                    codeScanner={codeScanner}
                    enableZoomGesture={false}
                    enableFpsGraph={false}
                    focusable={true}
                    enableAutoFocus={true}
                    focusMode="auto"
                    enableDepthData={false}
                    enablePortraitEffectsMatteDelivery={false}
                    enableHighQualityPhotos={true}
                    photoQualityBalance="quality"
                    pixelFormat="yuv"
                    enableHdr={selectedFormat?.supportsVideoHdr ? true : false}
                    enableLowLightBoost={true}
                    enableStabilizationMode="auto"
                    enableMicrophone={false}
                    enableLocation={false}
                    enableBufferCompression={false}
                    enableFrameProcessor={false}
                    torch={torchEnabled ? "on" : "off"}
                    video={true}
                    audio={false}
                    videoStabilizationMode="auto"
                    enableNightMode={true}
                    enableAutoFocus={true}
                    enableAutoExposure={true}
                    enableAutoWhiteBalance={true}
                />
            </TouchableOpacity>

            {/* Overlay */}
            <View style={styles.overlay}>
                {/* Header */}
                <View style={[styles.header, { backgroundColor: theme.colors.overlay }]}>
                    <Text style={[styles.headerTitle, { color: theme.colors.white }]}>
                        Scan Barcode
                    </Text>
                    <View style={styles.headerButtons}>
                        {device?.hasTorch && (
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
                        )}
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={handleClose}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Icon name="close" size={24} color={theme.colors.white} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Scanning Area */}
                <View style={styles.scanningArea}>
                    <View style={styles.scanningFrame}>
                        <View style={[styles.corner, styles.topLeft, { borderColor: theme.colors.primary[500] }]} />
                        <View style={[styles.corner, styles.topRight, { borderColor: theme.colors.primary[500] }]} />
                        <View style={[styles.corner, styles.bottomLeft, { borderColor: theme.colors.primary[500] }]} />
                        <View style={[styles.corner, styles.bottomRight, { borderColor: theme.colors.primary[500] }]} />
                    </View>

                    {/* Focus Indicator */}
                    {isFocused && (
                        <View style={styles.focusIndicator}>
                            <View style={[styles.focusRing, { borderColor: theme.colors.primary[500] }]} />
                        </View>
                    )}
                </View>

                {/* Instructions */}
                <View style={[styles.instructions, { backgroundColor: theme.colors.overlay }]}>
                    <Text style={[styles.instructionText, { color: theme.colors.white }]}>
                        {scanned ? 'Barcode scanned successfully!' : 'Position the barcode within the frame'}
                    </Text>
                    <Text style={[styles.instructionSubtext, { color: theme.colors.white }]}>
                        {scanned ? 'Tap "Scan Again" to scan another barcode' : 'Tap anywhere to focus • The barcode will be scanned automatically'}
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    cameraContainer: {
        flex: 1,
    },
    camera: {
        flex: 1,
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
    focusIndicator: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        marginTop: -25,
        marginLeft: -25,
    },
    focusRing: {
        width: 50,
        height: 50,
        borderRadius: 25,
        borderWidth: 2,
        backgroundColor: 'transparent',
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
