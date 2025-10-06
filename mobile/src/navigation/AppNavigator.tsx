import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

// Screens
import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import ProductListScreen from '../screens/ProductListScreen';
import ProductDetailScreen from '../screens/ProductDetailScreen';
import ProductFormScreen from '../screens/ProductFormScreen';
import SupplierListScreen from '../screens/SupplierListScreen';
import SupplierDetailScreen from '../screens/SupplierDetailScreen';
import SupplierFormScreen from '../screens/SupplierFormScreen';
import PurchaseOrderListScreen from '../screens/PurchaseOrderListScreen';
import PurchaseOrderDetailScreen from '../screens/PurchaseOrderDetailScreen';
import PurchaseOrderFormScreen from '../screens/PurchaseOrderFormScreen';
import InventoryTrackingScreen from '../screens/InventoryTrackingScreen';
import BarcodeScannerScreen from '../screens/BarcodeScannerScreen';
import BulkUploadScreen from '../screens/BulkUploadScreen';

import { RootStackParamList } from '../types';
import { COLORS, SCREEN_NAMES } from '../constants';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

// Main Tab Navigator
const MainTabNavigator = () => {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName: string;

                    switch (route.name) {
                        case SCREEN_NAMES.DASHBOARD:
                            iconName = 'dashboard';
                            break;
                        case SCREEN_NAMES.PRODUCT_LIST:
                            iconName = 'inventory';
                            break;
                        case SCREEN_NAMES.SUPPLIER_LIST:
                            iconName = 'business';
                            break;
                        case SCREEN_NAMES.PURCHASE_ORDER_LIST:
                            iconName = 'shopping-cart';
                            break;
                        case SCREEN_NAMES.INVENTORY_TRACKING:
                            iconName = 'track-changes';
                            break;
                        default:
                            iconName = 'help';
                    }

                    return <Icon name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: '#3B82F6',
                tabBarInactiveTintColor: '#6B7280',
                tabBarStyle: {
                    backgroundColor: '#FFFFFF',
                    borderTopColor: '#E5E7EB',
                    paddingBottom: 5,
                    paddingTop: 5,
                    height: 60,
                },
                headerShown: false,
            })}
        >
            <Tab.Screen
                name={SCREEN_NAMES.DASHBOARD}
                component={DashboardScreen}
                options={{ title: 'Dashboard' }}
            />
            <Tab.Screen
                name={SCREEN_NAMES.PRODUCT_LIST}
                component={ProductListScreen}
                options={{ title: 'Products' }}
            />
            <Tab.Screen
                name={SCREEN_NAMES.SUPPLIER_LIST}
                component={SupplierListScreen}
                options={{ title: 'Suppliers' }}
            />
            <Tab.Screen
                name={SCREEN_NAMES.PURCHASE_ORDER_LIST}
                component={PurchaseOrderListScreen}
                options={{ title: 'Orders' }}
            />
            <Tab.Screen
                name={SCREEN_NAMES.INVENTORY_TRACKING}
                component={InventoryTrackingScreen}
                options={{ title: 'Tracking' }}
            />
        </Tab.Navigator>
    );
};

// Root Stack Navigator
const AppNavigator = () => {
    const { theme, isDark } = useTheme();
    const { isAuthenticated, isLoading } = useAuth();

    return (
        <NavigationContainer>
            <StatusBar
                barStyle={isDark ? 'light-content' : 'dark-content'}
                backgroundColor="#3B82F6"
            />
            <Stack.Navigator
                screenOptions={{
                    headerStyle: {
                        backgroundColor: '#3B82F6',
                    },
                    headerTintColor: '#FFFFFF',
                    headerTitleStyle: {
                        fontWeight: 'bold',
                    },
                }}
            >
                {!isAuthenticated ? (
                    <Stack.Screen
                        name={SCREEN_NAMES.LOGIN}
                        component={LoginScreen}
                        options={{ headerShown: false }}
                    />
                ) : (
                    <>
                        <Stack.Screen
                            name="MainTabs"
                            component={MainTabNavigator}
                            options={{ headerShown: false }}
                        />

                        {/* Product Screens */}
                        <Stack.Screen
                            name={SCREEN_NAMES.PRODUCT_DETAIL}
                            component={ProductDetailScreen}
                            options={{ title: 'Product Details' }}
                        />
                        <Stack.Screen
                            name={SCREEN_NAMES.PRODUCT_FORM}
                            component={ProductFormScreen}
                            options={{ title: 'Add/Edit Product' }}
                        />

                        {/* Supplier Screens */}
                        <Stack.Screen
                            name={SCREEN_NAMES.SUPPLIER_DETAIL}
                            component={SupplierDetailScreen}
                            options={{ title: 'Supplier Details' }}
                        />
                        <Stack.Screen
                            name={SCREEN_NAMES.SUPPLIER_FORM}
                            component={SupplierFormScreen}
                            options={{ title: 'Add/Edit Supplier' }}
                        />

                        {/* Purchase Order Screens */}
                        <Stack.Screen
                            name={SCREEN_NAMES.PURCHASE_ORDER_DETAIL}
                            component={PurchaseOrderDetailScreen}
                            options={{ title: 'Order Details' }}
                        />
                        <Stack.Screen
                            name={SCREEN_NAMES.PURCHASE_ORDER_FORM}
                            component={PurchaseOrderFormScreen}
                            options={{ title: 'Create/Edit Order' }}
                        />

                        {/* Utility Screens */}
                        <Stack.Screen
                            name={SCREEN_NAMES.BARCODE_SCANNER}
                            component={BarcodeScannerScreen}
                            options={{ title: 'Scan Barcode' }}
                        />
                        <Stack.Screen
                            name={SCREEN_NAMES.BULK_UPLOAD}
                            component={BulkUploadScreen}
                            options={{ title: 'Bulk Upload' }}
                        />
                    </>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
};

export default AppNavigator;
