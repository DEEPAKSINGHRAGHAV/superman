import React from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { HighQualityBarcodeScanner } from '../components';

const BarcodeScannerScreen: React.FC = () => {
    const navigation = useNavigation();

    const handleBarcodeScanned = (data: string) => {
        console.log('Barcode scanned:', data);

        // Show alert with scanned data
        Alert.alert(
            'Barcode Scanned',
            `Barcode: ${data}`,
            [
                {
                    text: 'OK',
                    onPress: () => navigation.goBack(),
                },
            ]
        );
    };

    const handleClose = () => {
        navigation.goBack();
    };

    return (
        <HighQualityBarcodeScanner
            onScan={handleBarcodeScanned}
            onClose={handleClose}
        />
    );
};

export default BarcodeScannerScreen;