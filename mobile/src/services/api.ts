import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    Product,
    Supplier,
    PurchaseOrder,
    StockMovement,
    User,
    LoginRequest,
    LoginResponse,
    ApiResponse,
    PaginatedResponse,
    InventorySummary,
    CategorySummary,
    ProductFilters,
    SupplierFilters,
    PurchaseOrderFilters,
    StockMovementFilters,
    ProductFormData,
    SupplierFormData,
    PurchaseOrderFormData,
    StockAdjustmentFormData,
} from '../types';

import { API_BASE_URL } from '../constants';

class ApiService {
    private baseURL: string;
    private token: string | null = null;

    constructor(baseURL: string = API_BASE_URL) {
        this.baseURL = baseURL;
        this.loadToken();
    }

    private async loadToken() {
        try {
            const token = await AsyncStorage.getItem('auth_token');
            if (token) {
                this.token = token;
            }
        } catch (error) {
            console.error('Error loading token:', error);
        }
    }

    async setToken(token: string) {
        this.token = token;
        try {
            await AsyncStorage.setItem('auth_token', token);
        } catch (error) {
            console.error('Error saving token:', error);
        }
    }

    async clearToken() {
        this.token = null;
        try {
            await AsyncStorage.removeItem('auth_token');
        } catch (error) {
            console.error('Error clearing token:', error);
        }
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const url = `${this.baseURL}${endpoint}`;

        const config: RequestInit = {
            headers: {
                'Content-Type': 'application/json',
                ...(this.token && { Authorization: `Bearer ${this.token}` }),
                ...options.headers,
            },
            ...options,
        };

        try {
            console.log('API Request:', { url, method: config.method || 'GET' });

            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                // Handle authentication errors
                if (response.status === 401) {
                    await this.clearToken();
                    throw new Error('Authentication failed. Please login again.');
                }

                // Handle validation errors with detailed messages
                if (response.status === 400 && data.errors && Array.isArray(data.errors)) {
                    const errorMessages = data.errors.map((err: any) => `${err.field}: ${err.message}`).join(', ');
                    throw new Error(`Validation failed: ${errorMessages}`);
                }

                throw new Error(data.message || 'Something went wrong');
            }

            return data;
        } catch (error: any) {
            console.error('API Error:', error);
            console.error('API Error Details:', {
                url,
                method: config.method || 'GET',
                baseURL: this.baseURL,
                endpoint,
                errorName: error.name,
                errorMessage: error.message,
            });

            // Handle network errors more clearly
            if (error.message === 'Network request failed' || error.name === 'TypeError') {
                throw new Error(
                    `Cannot connect to server at ${this.baseURL}. ` +
                    `Please check:\n` +
                    `1. Backend server is running\n` +
                    `2. Correct IP address and port\n` +
                    `3. Network connectivity\n` +
                    `Original error: ${error.message}`
                );
            }

            throw error;
        }
    }

    // Authentication
    async login(credentials: LoginRequest): Promise<LoginResponse> {
        const response = await this.request<LoginResponse>('/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials),
        });

        if (response.success && response.token) {
            await this.setToken(response.token);
        }

        return response;
    }

    async logout(): Promise<void> {
        try {
            await this.request('/auth/logout', { method: 'POST' });
        } finally {
            await this.clearToken();
        }
    }

    async getCurrentUser(): Promise<ApiResponse<User>> {
        return this.request('/auth/me');
    }

    async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<any>> {
        return this.request('/auth/change-password', {
            method: 'PUT',
            body: JSON.stringify({ currentPassword, newPassword }),
        });
    }

    async updateProfile(profileData: { name?: string; phone?: string }): Promise<ApiResponse<User>> {
        return this.request('/auth/me', {
            method: 'PUT',
            body: JSON.stringify(profileData),
        });
    }

    // Products
    async getProducts(filters?: ProductFilters, page = 1, limit = 20): Promise<PaginatedResponse<Product>> {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
        });

        // Add filters only if they have values
        if (filters) {
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    params.append(key, value.toString());
                }
            });
        }

        const url = `/products?${params.toString()}`;
        console.log('API Request URL:', url);
        return this.request(url);
    }

    async getProduct(id: string): Promise<ApiResponse<Product>> {
        return this.request(`/products/${id}`);
    }

    async searchProducts(query: string, limit = 20): Promise<ApiResponse<Product[]>> {
        return this.request(`/products/search?search=${encodeURIComponent(query)}&limit=${limit}`);
    }

    async getProductCategories(): Promise<ApiResponse<string[]>> {
        return this.request('/products/categories');
    }

    async getLowStockProducts(): Promise<ApiResponse<Product[]>> {
        return this.request('/products/low-stock');
    }

    async getInventorySummary(): Promise<ApiResponse<InventorySummary>> {
        return this.request('/products/inventory-summary');
    }

    async createProduct(productData: ProductFormData): Promise<ApiResponse<Product>> {
        return this.request('/products', {
            method: 'POST',
            body: JSON.stringify(productData),
        });
    }

    async bulkCreateProducts(products: ProductFormData[]): Promise<ApiResponse<Product[]>> {
        return this.request('/products/bulk', {
            method: 'POST',
            body: JSON.stringify({ products }),
        });
    }

    async updateProduct(id: string, productData: Partial<ProductFormData>): Promise<ApiResponse<Product>> {
        return this.request(`/products/${id}`, {
            method: 'PUT',
            body: JSON.stringify(productData),
        });
    }

    async updateProductStock(
        id: string,
        quantity: number,
        movementType: string,
        reason?: string,
        notes?: string
    ): Promise<ApiResponse<any>> {
        return this.request(`/products/${id}/stock`, {
            method: 'PATCH',
            body: JSON.stringify({
                quantity,
                movementType,
                reason,
                notes,
            }),
        });
    }

    async getProductStockHistory(
        id: string,
        page = 1,
        limit = 50,
        filters?: Partial<StockMovementFilters>
    ): Promise<PaginatedResponse<StockMovement>> {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
            ...filters,
        });

        return this.request(`/products/${id}/stock-history?${params.toString()}`);
    }

    async deleteProduct(id: string): Promise<ApiResponse<any>> {
        return this.request(`/products/${id}`, {
            method: 'DELETE',
        });
    }

    // Suppliers
    async getSuppliers(filters?: SupplierFilters, page = 1, limit = 20): Promise<PaginatedResponse<Supplier>> {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
            ...filters,
        });

        return this.request(`/suppliers?${params.toString()}`);
    }

    async getSupplier(id: string): Promise<ApiResponse<Supplier>> {
        return this.request(`/suppliers/${id}`);
    }

    async getSupplierStatistics(): Promise<ApiResponse<any>> {
        return this.request('/suppliers/statistics');
    }

    async getTopRatedSuppliers(limit = 10): Promise<ApiResponse<Supplier[]>> {
        return this.request(`/suppliers/top-rated?limit=${limit}`);
    }

    async getSuppliersByCity(city: string): Promise<ApiResponse<Supplier[]>> {
        return this.request(`/suppliers/by-city/${encodeURIComponent(city)}`);
    }

    async createSupplier(supplierData: SupplierFormData): Promise<ApiResponse<Supplier>> {
        return this.request('/suppliers', {
            method: 'POST',
            body: JSON.stringify(supplierData),
        });
    }

    async updateSupplier(id: string, supplierData: Partial<SupplierFormData>): Promise<ApiResponse<Supplier>> {
        return this.request(`/suppliers/${id}`, {
            method: 'PUT',
            body: JSON.stringify(supplierData),
        });
    }

    async updateSupplierRating(id: string, rating: number): Promise<ApiResponse<Supplier>> {
        return this.request(`/suppliers/${id}/rating`, {
            method: 'PATCH',
            body: JSON.stringify({ rating }),
        });
    }

    async updateSupplierStats(id: string, orderAmount: number): Promise<ApiResponse<Supplier>> {
        return this.request(`/suppliers/${id}/stats`, {
            method: 'PATCH',
            body: JSON.stringify({ orderAmount }),
        });
    }

    async deleteSupplier(id: string): Promise<ApiResponse<any>> {
        return this.request(`/suppliers/${id}`, {
            method: 'DELETE',
        });
    }

    // Purchase Orders
    async getPurchaseOrders(filters?: PurchaseOrderFilters, page = 1, limit = 20): Promise<PaginatedResponse<PurchaseOrder>> {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
            ...filters,
        });

        return this.request(`/purchase-orders?${params.toString()}`);
    }

    async getPurchaseOrder(id: string): Promise<ApiResponse<PurchaseOrder>> {
        return this.request(`/purchase-orders/${id}`);
    }

    async getPurchaseOrderStatistics(): Promise<ApiResponse<any>> {
        return this.request('/purchase-orders/statistics');
    }

    async getPendingPurchaseOrders(): Promise<ApiResponse<PurchaseOrder[]>> {
        return this.request('/purchase-orders/pending');
    }

    async getOverduePurchaseOrders(): Promise<ApiResponse<PurchaseOrder[]>> {
        return this.request('/purchase-orders/overdue');
    }

    async getMonthlyPurchaseOrders(year: number, month: number): Promise<ApiResponse<PurchaseOrder[]>> {
        return this.request(`/purchase-orders/monthly/${year}/${month}`);
    }

    async createPurchaseOrder(orderData: PurchaseOrderFormData): Promise<ApiResponse<PurchaseOrder>> {
        return this.request('/purchase-orders', {
            method: 'POST',
            body: JSON.stringify(orderData),
        });
    }

    async updatePurchaseOrder(id: string, orderData: Partial<PurchaseOrderFormData>): Promise<ApiResponse<PurchaseOrder>> {
        return this.request(`/purchase-orders/${id}`, {
            method: 'PUT',
            body: JSON.stringify(orderData),
        });
    }

    async approvePurchaseOrder(id: string): Promise<ApiResponse<PurchaseOrder>> {
        return this.request(`/purchase-orders/${id}/approve`, {
            method: 'PATCH',
        });
    }

    async receivePurchaseOrder(id: string, receivedItems: any[]): Promise<ApiResponse<any>> {
        return this.request(`/purchase-orders/${id}/receive`, {
            method: 'PATCH',
            body: JSON.stringify({ receivedItems }),
        });
    }

    async cancelPurchaseOrder(id: string, reason?: string): Promise<ApiResponse<PurchaseOrder>> {
        return this.request(`/purchase-orders/${id}/cancel`, {
            method: 'PATCH',
            body: JSON.stringify({ reason }),
        });
    }

    async deletePurchaseOrder(id: string): Promise<ApiResponse<any>> {
        return this.request(`/purchase-orders/${id}`, {
            method: 'DELETE',
        });
    }

    // Inventory
    async getStockMovements(filters?: StockMovementFilters, page = 1, limit = 50): Promise<PaginatedResponse<StockMovement>> {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
            ...filters,
        });

        return this.request(`/inventory/movements?${params.toString()}`);
    }

    async getStockMovement(id: string): Promise<ApiResponse<StockMovement>> {
        return this.request(`/inventory/movements/${id}`);
    }

    async getDailyStockSummary(date?: string): Promise<ApiResponse<any>> {
        const params = date ? `?date=${date}` : '';
        return this.request(`/inventory/analytics${params}`);
    }

    async getCategoryWiseSummary(): Promise<ApiResponse<CategorySummary[]>> {
        return this.request('/inventory/category-summary');
    }

    async getLowStockAlerts(): Promise<ApiResponse<Product[]>> {
        return this.request('/products/low-stock');
    }

    async getExpiringProducts(daysAhead = 30): Promise<ApiResponse<Product[]>> {
        return this.request(`/inventory/analytics?period=${daysAhead}`);
    }

    async getProductStockHistory(
        productId: string,
        page = 1,
        limit = 50,
        filters?: Partial<StockMovementFilters>
    ): Promise<PaginatedResponse<StockMovement>> {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
            ...filters,
        });

        return this.request(`/inventory/products/${productId}/history?${params.toString()}`);
    }

    async createStockMovement(movementData: {
        product: string;
        movementType: string;
        quantity: number;
        reason?: string;
        notes?: string;
        unitCost?: number;
    }): Promise<ApiResponse<any>> {
        return this.request('/inventory/movements', {
            method: 'POST',
            body: JSON.stringify(movementData),
        });
    }

    async processStockAdjustment(adjustmentData: StockAdjustmentFormData): Promise<ApiResponse<any>> {
        return this.request('/inventory/adjustments', {
            method: 'POST',
            body: JSON.stringify(adjustmentData),
        });
    }

    async processSale(saleData: {
        saleItems: { productId: string; quantity: number }[];
        referenceNumber?: string;
    }): Promise<ApiResponse<any>> {
        return this.request('/inventory/sales', {
            method: 'POST',
            body: JSON.stringify(saleData),
        });
    }

    async getInventoryAnalytics(period = 30): Promise<ApiResponse<any>> {
        return this.request(`/inventory/analytics?period=${period}`);
    }

    // Brands
    async getBrands(filters?: any, page = 1, limit = 20): Promise<PaginatedResponse<any>> {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
        });

        // Add filters only if they have values
        if (filters) {
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    params.append(key, value.toString());
                }
            });
        }

        const url = `/brands?${params.toString()}`;
        return this.request(url);
    }

    async getBrand(id: string): Promise<ApiResponse<any>> {
        return this.request(`/brands/${id}`);
    }

    async createBrand(brandData: any): Promise<ApiResponse<any>> {
        return this.request('/brands', {
            method: 'POST',
            body: JSON.stringify(brandData),
        });
    }

    async updateBrand(id: string, brandData: any): Promise<ApiResponse<any>> {
        return this.request(`/brands/${id}`, {
            method: 'PUT',
            body: JSON.stringify(brandData),
        });
    }

    async deleteBrand(id: string): Promise<ApiResponse<any>> {
        return this.request(`/brands/${id}`, {
            method: 'DELETE',
        });
    }

    async toggleBrandStatus(id: string): Promise<ApiResponse<any>> {
        return this.request(`/brands/${id}/toggle-status`, {
            method: 'PATCH',
        });
    }

    async verifyBrand(id: string): Promise<ApiResponse<any>> {
        return this.request(`/brands/${id}/verify`, {
            method: 'PATCH',
        });
    }

    // Categories
    async getCategories(filters?: any, page = 1, limit = 20): Promise<PaginatedResponse<any>> {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
        });

        // Add filters only if they have values
        if (filters) {
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    params.append(key, value.toString());
                }
            });
        }

        const url = `/categories?${params.toString()}`;
        return this.request(url);
    }

    async getCategory(id: string): Promise<ApiResponse<any>> {
        return this.request(`/categories/${id}`);
    }

    async getMainCategories(): Promise<ApiResponse<any>> {
        return this.request('/categories/main');
    }

    async createCategory(categoryData: any): Promise<ApiResponse<any>> {
        return this.request('/categories', {
            method: 'POST',
            body: JSON.stringify(categoryData),
        });
    }

    async updateCategory(id: string, categoryData: any): Promise<ApiResponse<any>> {
        return this.request(`/categories/${id}`, {
            method: 'PUT',
            body: JSON.stringify(categoryData),
        });
    }

    async deleteCategory(id: string): Promise<ApiResponse<any>> {
        return this.request(`/categories/${id}`, {
            method: 'DELETE',
        });
    }

    async toggleCategoryStatus(id: string): Promise<ApiResponse<any>> {
        return this.request(`/categories/${id}/toggle-status`, {
            method: 'PATCH',
        });
    }

    async toggleCategoryFeatured(id: string): Promise<ApiResponse<any>> {
        return this.request(`/categories/${id}/toggle-featured`, {
            method: 'PATCH',
        });
    }

    // Batch Tracking APIs
    async getBatches(filters?: {
        status?: string;
        product?: string;
        expiringInDays?: number;
        page?: number;
        limit?: number;
    }): Promise<PaginatedResponse<any>> {
        const params = new URLSearchParams();

        if (filters) {
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    params.append(key, value.toString());
                }
            });
        }

        return this.request(`/batches?${params.toString()}`);
    }

    async getBatchesByProduct(productIdOrBarcode: string): Promise<ApiResponse<any>> {
        return this.request(`/batches/product/${productIdOrBarcode}`);
    }

    async getExpiringBatches(days = 30): Promise<ApiResponse<any>> {
        return this.request(`/batches/expiring?days=${days}`);
    }

    async getInventoryValuation(): Promise<ApiResponse<any>> {
        return this.request('/batches/valuation');
    }

    async getBatchDetails(batchIdOrNumber: string): Promise<ApiResponse<any>> {
        return this.request(`/batches/${batchIdOrNumber}`);
    }

    async createBatch(batchData: {
        productId: string;
        quantity: number;
        costPrice: number;
        sellingPrice: number;
        mrp?: number;
        purchaseOrderId?: string;
        supplierId?: string;
        expiryDate?: string;
        manufactureDate?: string;
        location?: string;
        notes?: string;
    }): Promise<ApiResponse<any>> {
        return this.request('/batches', {
            method: 'POST',
            body: JSON.stringify(batchData),
        });
    }

    async processBatchSale(saleData: {
        productId: string;
        quantity: number;
        referenceNumber?: string;
        notes?: string;
    }): Promise<ApiResponse<any>> {
        return this.request('/batches/sale', {
            method: 'POST',
            body: JSON.stringify(saleData),
        });
    }

    async updateBatchStatus(
        batchId: string,
        status: 'expired' | 'damaged' | 'returned' | 'active',
        reason?: string
    ): Promise<ApiResponse<any>> {
        return this.request(`/batches/${batchId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status, reason }),
        });
    }

    async adjustBatchQuantity(
        batchId: string,
        quantity: number,
        reason?: string
    ): Promise<ApiResponse<any>> {
        return this.request(`/batches/${batchId}/adjust`, {
            method: 'PATCH',
            body: JSON.stringify({ quantity, reason }),
        });
    }

    // Admin statistics methods
    async getBrandStats(): Promise<ApiResponse<any>> {
        return this.request('/brands/stats/overview');
    }

    async getCategoryStats(): Promise<ApiResponse<any>> {
        return this.request('/categories/stats/overview');
    }

    async getProductStats(): Promise<ApiResponse<any>> {
        return this.request('/products/stats/overview');
    }
}

export default new ApiService();