import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Alert,
    PermissionsAndroid,
    Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { RNCamera } from 'react-native-camera';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../contexts/ThemeContext';
import { BarcodeScanner } from '../components';

const BarcodeScannerScreen: React.FC = () => {
    const { theme } = useTheme();
    const navigation = useNavigation();
    const route = useRoute();
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);

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

    const handleBarcodeScanned = (data: string) => {
        console.log('Barcode scanned:', data);

        // Call the callback function if provided
        if (route.params?.onScan) {
            route.params.onScan(data);
        }

        // Navigate back
        navigation.goBack();
    };

    const handleClose = () => {
        navigation.goBack();
    };

    return (
        <BarcodeScanner
            onScan={handleBarcodeScanned}
            onClose={handleClose}
        />
    );
};

export default BarcodeScannerScreen;