import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Layout from './components/layout/Layout';

// Auth Pages
import Login from './pages/auth/Login';

// Main Pages
import Dashboard from './pages/Dashboard';
import ProductList from './pages/products/ProductList';
import ProductDetail from './pages/products/ProductDetail';
import ProductForm from './pages/products/ProductForm';
import SupplierList from './pages/suppliers/SupplierList';
import SupplierDetail from './pages/suppliers/SupplierDetail';
import SupplierForm from './pages/suppliers/SupplierForm';
import PurchaseOrderList from './pages/purchase-orders/PurchaseOrderList';
import PurchaseOrderForm from './pages/purchase-orders/PurchaseOrderForm';
import InventoryList from './pages/inventory/InventoryList';
import BatchList from './pages/batches/BatchList';
import BatchHistory from './pages/batches/BatchHistory';
import ExpiringProducts from './pages/batches/ExpiringProducts';
import BrandList from './pages/brands/BrandList';
import CategoryList from './pages/categories/CategoryList';
import UserList from './pages/users/UserList';
import BillingScreen from './pages/billing/BillingScreen';

function App() {
    return (
        <AuthProvider>
            <Toaster
                position="top-right"
                toastOptions={{
                    duration: 4000,
                    style: {
                        background: '#363636',
                        color: '#fff',
                    },
                    success: {
                        duration: 3000,
                        iconTheme: {
                            primary: '#10b981',
                            secondary: '#fff',
                        },
                    },
                    error: {
                        duration: 4000,
                        iconTheme: {
                            primary: '#ef4444',
                            secondary: '#fff',
                        },
                    },
                }}
            />

            <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<Login />} />

                {/* Protected Routes */}
                <Route
                    path="/"
                    element={
                        <ProtectedRoute>
                            <Layout />
                        </ProtectedRoute>
                    }
                >
                    <Route index element={<Navigate to="/dashboard" replace />} />
                    <Route path="dashboard" element={<Dashboard />} />

                    {/* Products */}
                    <Route path="products">
                        <Route index element={<ProductList />} />
                        <Route path="new" element={<ProductForm />} />
                        <Route path=":id" element={<ProductDetail />} />
                        <Route path=":id/edit" element={<ProductForm />} />
                    </Route>

                    {/* Suppliers */}
                    <Route path="suppliers">
                        <Route index element={<SupplierList />} />
                        <Route path="new" element={<SupplierForm />} />
                        <Route path=":id" element={<SupplierDetail />} />
                        <Route path=":id/edit" element={<SupplierForm />} />
                    </Route>

                    {/* Purchase Orders */}
                    <Route path="purchase-orders">
                        <Route index element={<PurchaseOrderList />} />
                        <Route path="new" element={<PurchaseOrderForm />} />
                        <Route path=":id" element={<PurchaseOrderForm />} />
                    </Route>

                    {/* Inventory */}
                    <Route path="inventory" element={<InventoryList />} />

                    {/* Batches */}
                    <Route path="batches">
                        <Route index element={<BatchList />} />
                        <Route path="history" element={<BatchHistory />} />
                        <Route path="expiring" element={<ExpiringProducts />} />
                    </Route>

                    {/* Billing */}
                    <Route path="billing" element={<BillingScreen />} />

                    {/* Brands */}
                    <Route path="brands" element={<BrandList />} />

                    {/* Categories */}
                    <Route path="categories" element={<CategoryList />} />

                    {/* Users */}
                    <Route path="users" element={<UserList />} />

                    {/* Settings */}
                    <Route path="profile" element={<div className="p-6">Profile Coming Soon</div>} />
                    <Route path="settings" element={<div className="p-6">Settings Coming Soon</div>} />
                </Route>

                {/* 404 */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
        </AuthProvider>
    );
}

export default App;

