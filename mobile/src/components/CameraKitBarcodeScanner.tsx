import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    Platform,
} from 'react-native';
import { Camera, CameraType } from 'react-native-camera-kit';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../contexts/ThemeContext';

interface CameraKitBarcodeScannerProps {
    onScan: (data: string) => void;
}

export const CameraKitBarcodeScanner: React.FC<CameraKitBarcodeScannerProps> = ({
    onScan,
}) => {
    const { theme } = useTheme();
    const [scanned, setScanned] = useState(false);
    const [torchMode, setTorchMode] = useState<'on' | 'off'>('off');
    const [zoomMode, setZoomMode] = useState<'on' | 'off'>('off');

    const handleBarCodeRead = (event: any) => {
        if (!scanned && event?.nativeEvent?.codeStringValue) {
            const barcodeData = event.nativeEvent.codeStringValue;
            console.log('Barcode scanned:', barcodeData);
            setScanned(true);
            onScan(barcodeData);
        }
    };

    const handleReset = () => {
        setScanned(false);
    };

    const toggleTorch = () => {
        setTorchMode(torchMode === 'on' ? 'off' : 'on');
    };

    const toggleZoom = () => {
        setZoomMode(zoomMode === 'on' ? 'off' : 'on');
    };

    return (
        <View style={styles.container}>
            {/* Camera View */}
            <Camera
                style={styles.camera}
                scanBarcode={!scanned}
                onReadCode={handleBarCodeRead}
                showFrame={true}
                laserColor={theme.colors.primary[500]}
                frameColor={theme.colors.primary[500]}
                torchMode={torchMode}
                zoomMode={zoomMode}
                cameraType={CameraType.Back}
            />

            {/* Overlay */}
            <View style={styles.overlay}>
                {/* Top Controls */}
                <View style={[styles.topControls, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                    <TouchableOpacity
                        style={styles.controlButton}
                        onPress={toggleTorch}
                    >
                        <Icon
                            name={torchMode === 'on' ? 'flash-on' : 'flash-off'}
                            size={28}
                            color={torchMode === 'on' ? theme.colors.warning[500] : theme.colors.white}
                        />
                        <Text style={[styles.controlText, { color: theme.colors.white }]}>
                            Flash
                        </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                        style={styles.controlButton}
                        onPress={toggleZoom}
                    >
                        <Icon
                            name={zoomMode === 'on' ? 'zoom-in' : 'zoom-out'}
                            size={28}
                            color={zoomMode === 'on' ? theme.colors.primary[500] : theme.colors.white}
                        />
                        <Text style={[styles.controlText, { color: theme.colors.white }]}>
                            Zoom
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Scanning Frame */}
                <View style={styles.scanningArea}>
                    <View style={styles.scanningFrame}>
                        <View style={[styles.corner, styles.topLeft, { borderColor: theme.colors.primary[500] }]} />
                        <View style={[styles.corner, styles.topRight, { borderColor: theme.colors.primary[500] }]} />
                        <View style={[styles.corner, styles.bottomLeft, { borderColor: theme.colors.primary[500] }]} />
                        <View style={[styles.corner, styles.bottomRight, { borderColor: theme.colors.primary[500] }]} />
                    </View>
                </View>

                {/* Bottom Instructions */}
                <View style={[styles.instructions, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
                    {scanned ? (
                        <>
                            <Icon name="check-circle" size={48} color={theme.colors.success[500]} />
                            <Text style={[styles.successText, { color: theme.colors.success[500] }]}>
                                Barcode Scanned Successfully!
                            </Text>
                            <TouchableOpacity
                                style={[styles.resetButton, { backgroundColor: theme.colors.primary[500] }]}
                                onPress={handleReset}
                            >
                                <Text style={styles.resetButtonText}>Scan Another</Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <>
                            <Text style={[styles.instructionText, { color: theme.colors.white }]}>
                                Position barcode within the frame
                            </Text>
                            <Text style={[styles.instructionSubtext, { color: theme.colors.white }]}>
                                The barcode will be scanned automatically
                            </Text>
                        </>
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
    topControls: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingTop: 60,
        paddingBottom: 20,
        paddingHorizontal: 20,
    },
    controlButton: {
        alignItems: 'center',
        padding: 12,
    },
    controlText: {
        fontSize: 12,
        marginTop: 4,
        fontWeight: '500',
    },
    scanningArea: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scanningFrame: {
        width: 280,
        height: 280,
        position: 'relative',
    },
    corner: {
        position: 'absolute',
        width: 40,
        height: 40,
        borderWidth: 4,
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
        paddingVertical: 30,
        paddingHorizontal: 20,
        alignItems: 'center',
        minHeight: 150,
        justifyContent: 'center',
    },
    instructionText: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 8,
        textAlign: 'center',
    },
    instructionSubtext: {
        fontSize: 14,
        opacity: 0.9,
        textAlign: 'center',
    },
    successText: {
        fontSize: 18,
        fontWeight: '600',
        marginTop: 12,
        marginBottom: 16,
        textAlign: 'center',
    },
    resetButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
        marginTop: 8,
    },
    resetButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
});

