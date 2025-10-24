import axios from 'axios';
import { API_URL, TOKEN_KEY } from '../config/constants';

// Create axios instance
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem(TOKEN_KEY);
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor
api.interceptors.response.use(
    (response) => {
        return response.data;
    },
    (error) => {
        if (error.response) {
            // Server responded with error status
            const { status, data } = error.response;

            if (status === 401) {
                // Unauthorized - clear token and redirect to login
                localStorage.removeItem(TOKEN_KEY);
                window.location.href = '/login';
            }

            return Promise.reject({
                status,
                message: data.message || 'An error occurred',
                errors: data.errors || [],
            });
        } else if (error.request) {
            // Request made but no response
            return Promise.reject({
                message: 'Network error. Please check your connection.',
            });
        } else {
            // Something else happened
            return Promise.reject({
                message: error.message || 'An unexpected error occurred',
            });
        }
    }
);

export default api;

// Auth API
export const authAPI = {
    login: (credentials) => api.post('/auth/login', credentials),
    register: (userData) => api.post('/auth/register', userData),
    getMe: () => api.get('/auth/me'),
    updateProfile: (data) => api.put('/auth/me', data),
    changePassword: (data) => api.put('/auth/change-password', data),
    logout: () => api.post('/auth/logout'),
    refreshToken: () => api.post('/auth/refresh'),
    forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
    resetPassword: (data) => api.put('/auth/reset-password', data),
};

// Products API
export const productsAPI = {
    getAll: (params) => api.get('/products', { params }),
    getById: (id) => api.get(`/products/${id}`),
    getByBarcode: (barcode) => api.get(`/products/barcode/${barcode}`),
    search: (query) => api.get('/products/search', { params: { search: query, limit: 20 } }),
    create: (data) => api.post('/products', data),
    update: (id, data) => api.put(`/products/${id}`, data),
    delete: (id) => api.delete(`/products/${id}`),
    updateStock: (id, data) => api.patch(`/products/${id}/stock`, data),
    getStockHistory: (id, params) => api.get(`/products/${id}/stock-history`, { params }),
    getLowStock: () => api.get('/products/low-stock'),
    getInventorySummary: () => api.get('/products/inventory-summary'),
    getStats: () => api.get('/products/stats/overview'),
};

// Suppliers API
export const suppliersAPI = {
    getAll: (params) => api.get('/suppliers', { params }),
    getById: (id) => api.get(`/suppliers/${id}`),
    create: (data) => api.post('/suppliers', data),
    update: (id, data) => api.put(`/suppliers/${id}`, data),
    delete: (id) => api.delete(`/suppliers/${id}`),
    getStats: (id) => api.get(`/suppliers/${id}/stats`),
};

// Purchase Orders API
export const purchaseOrdersAPI = {
    getAll: (params) => api.get('/purchase-orders', { params }),
    getById: (id) => api.get(`/purchase-orders/${id}`),
    create: (data) => api.post('/purchase-orders', data),
    update: (id, data) => api.put(`/purchase-orders/${id}`, data),
    delete: (id) => api.delete(`/purchase-orders/${id}`),
    approve: (id) => api.patch(`/purchase-orders/${id}/approve`),
    receive: (id, data) => api.patch(`/purchase-orders/${id}/receive`, data),
    cancel: (id, reason) => api.patch(`/purchase-orders/${id}/cancel`, { reason }),
    getStats: () => api.get('/purchase-orders/stats'),
};

// Inventory API
export const inventoryAPI = {
    getMovements: (params) => api.get('/inventory/movements', { params }),
    createMovement: (data) => api.post('/inventory/movements', data),
    getSummary: () => api.get('/inventory/summary'),
    getLowStock: () => api.get('/inventory/low-stock'),
    getExpiringBatches: (days) => api.get('/inventory/expiring', { params: { days } }),
};

// Batches API
export const batchesAPI = {
    getAll: (params) => api.get('/batches', { params }),
    getById: (id) => api.get(`/batches/${id}`),
    getByProduct: (productId) => api.get(`/batches/product/${productId}`),
    create: (data) => api.post('/batches', data),
    update: (id, data) => api.put(`/batches/${id}`, data),
    adjust: (id, data) => api.patch(`/batches/${id}/adjust`, data),
    getExpiring: (days) => api.get('/batches/expiring', { params: { days } }),
    getHistory: (id) => api.get(`/batches/${id}/history`),
};

// Brands API
export const brandsAPI = {
    getAll: (params) => api.get('/brands', { params }),
    getById: (id) => api.get(`/brands/${id}`),
    create: (data) => api.post('/brands', data),
    update: (id, data) => api.put(`/brands/${id}`, data),
    delete: (id) => api.delete(`/brands/${id}`),
    verify: (id) => api.patch(`/brands/${id}/verify`),
    getStats: (id) => api.get(`/brands/${id}/stats`),
};

// Categories API
export const categoriesAPI = {
    getAll: (params) => api.get('/categories', { params }),
    getById: (id) => api.get(`/categories/${id}`),
    create: (data) => api.post('/categories', data),
    update: (id, data) => api.put(`/categories/${id}`, data),
    delete: (id) => api.delete(`/categories/${id}`),
    getWithSubcategories: () => api.get('/categories/hierarchy'),
    getStats: (id) => api.get(`/categories/${id}/stats`),
};

// Users API
export const usersAPI = {
    getAll: (params) => api.get('/users', { params }),
    getById: (id) => api.get(`/users/${id}`),
    create: (data) => api.post('/users', data),
    update: (id, data) => api.put(`/users/${id}`, data),
    delete: (id) => api.delete(`/users/${id}`),
    activate: (id) => api.patch(`/users/${id}/activate`),
    deactivate: (id) => api.patch(`/users/${id}/deactivate`),
    updatePermissions: (id, permissions) => api.patch(`/users/${id}/permissions`, { permissions }),
};

