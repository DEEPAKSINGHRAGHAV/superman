// User Types
export interface User {
    id: string;
    name: string;
    email: string;
    phone?: string;
    isActive: boolean;
    role: 'admin' | 'manager' | 'employee' | 'viewer';
    permissions: string[];
    lastLogin?: string;
    createdAt: string;
    updatedAt: string;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface LoginResponse {
    success: boolean;
    message: string;
    token: string;
    data: {
        user: User;
    };
}

// Product Types
export interface Product {
    _id: string;
    name: string;
    description?: string;
    sku: string;
    barcode?: string;
    mrp: number;
    costPrice: number;
    sellingPrice: number;
    currentStock: number;
    minStockLevel: number;
    maxStockLevel: number;
    category: 'grocery' | 'dairy' | 'fruits-vegetables' | 'meat-seafood' | 'bakery' | 'beverages' | 'snacks' | 'personal-care' | 'household' | 'electronics' | 'other';
    subcategory?: string;
    brand?: string;
    unit: 'pcs' | 'kg' | 'liter' | 'gram' | 'ml' | 'box' | 'pack';
    weight?: number;
    dimensions?: {
        length?: number;
        width?: number;
        height?: number;
    };
    isActive: boolean;
    expiryDate?: string;
    batchNumber?: string;
    images?: string[];
    tags?: string[];
    featured: boolean;
    rating: {
        average: number;
        count: number;
    };
    createdBy?: {
        _id: string;
        name: string;
        email: string;
    };
    createdAt: string;
    updatedAt: string;
    // Virtual fields
    isAvailable?: boolean;
    isLowStock?: boolean;
    formattedMRP?: string;
    formattedCostPrice?: string;
    formattedSellingPrice?: string;
    profitMargin?: string;
    inventoryValue?: number;
}

// Supplier Types
export interface Supplier {
    _id: string;
    name: string;
    code: string;
    email: string;
    phone?: string;
    alternatePhone?: string;
    address: {
        street?: string;
        city?: string;
        state?: string;
        pincode?: string;
        country: string;
    };
    gstNumber?: string;
    panNumber?: string;
    creditLimit: number;
    paymentTerms: number;
    isActive: boolean;
    rating: number;
    totalOrders: number;
    totalAmount: number;
    contactPerson?: {
        name?: string;
        designation?: string;
        phone?: string;
        email?: string;
    };
    createdBy?: {
        _id: string;
        name: string;
        email: string;
    };
    createdAt: string;
    updatedAt: string;
    // Virtual fields
    fullAddress?: string;
    summary?: Partial<Supplier>;
}

// Customer Types
export interface Customer {
    _id: string;
    customerNumber: string;
    name: string;
    phone?: string;
    email?: string;
    address?: {
        street?: string;
        city?: string;
        state?: string;
        pincode?: string;
        country?: string;
    };
    notes?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    formattedAddress?: string;
}

export interface CustomerAnalytics {
    totalBills: number;
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    totalItems: number;
    averageBillValue: number;
    averageProfitMargin: number;
    profitMargin: number;
    firstPurchaseDate: string | null;
    lastPurchaseDate: string | null;
}

export interface CustomerTopItem {
    product: string;
    productName: string;
    productSku: string;
    totalQuantity: number;
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    timesPurchased: number;
}

export interface CustomerPaymentMethod {
    paymentMethod: string;
    count: number;
    totalAmount: number;
}

export interface CustomerMonthlyTrend {
    month: string;
    revenue: number;
    profit: number;
    bills: number;
}

export interface CustomerDetailData {
    customer: Customer;
    analytics: CustomerAnalytics;
    topItems: CustomerTopItem[];
    paymentMethodBreakdown: CustomerPaymentMethod[];
    monthlyTrend: CustomerMonthlyTrend[];
    bills: {
        data: Bill[];
        pagination: {
            currentPage: number;
            totalPages: number;
            totalBills: number;
            hasNext: boolean;
            hasPrev: boolean;
            limit: number;
        };
    };
}

export interface CustomerFilters {
    search?: string;
    phone?: string;
    isActive?: boolean;
}

export interface Bill {
    _id: string;
    billNumber: string;
    items: Array<{
        product: string;
        productName: string;
        productSku: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
        costPrice: number;
        batchNumber?: string;
    }>;
    subtotal: number;
    taxAmount: number;
    discountAmount: number;
    totalAmount: number;
    totalCost: number;
    profit: number;
    profitMargin: number;
    paymentMethod: string;
    amountReceived: number;
    change: number;
    customer?: string;
    customerNumber?: string;
    customerName?: string;
    customerPhone?: string;
    cashier: string | User;
    cashierName: string;
    referenceNumber?: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
    formattedDate?: string;
}

// Purchase Order Types
export interface PurchaseOrderItem {
    product: string | Product;
    quantity: number;
    costPrice: number;
    sellingPrice?: number;
    mrp?: number;
    totalAmount: number;
    expiryDate?: string;
}

export interface PurchaseOrder {
    _id: string;
    orderNumber: string;
    supplier: string | Supplier;
    items: PurchaseOrderItem[];
    subtotal: number;
    taxAmount: number;
    discountAmount: number;
    totalAmount: number;
    status: 'pending' | 'approved' | 'ordered' | 'received' | 'cancelled';
    orderDate: string;
    expectedDeliveryDate?: string;
    actualDeliveryDate?: string;
    notes?: string;
    paymentMethod: 'cash' | 'credit' | 'cheque' | 'online' | 'other';
    paymentStatus: 'pending' | 'partial' | 'paid';
    createdBy: string | User;
    approvedBy?: string | User;
    approvedAt?: string;
    createdAt: string;
    updatedAt: string;
    // Virtual fields
    orderSummary?: Partial<PurchaseOrder>;
    daysUntilDelivery?: number;
}

// Stock Movement Types
export interface StockMovement {
    _id: string;
    product: string | Product;
    movementType: 'purchase' | 'sale' | 'adjustment' | 'return' | 'damage' | 'transfer' | 'expired';
    quantity: number;
    previousStock: number;
    newStock: number;
    referenceId?: string;
    referenceNumber?: string;
    referenceType?: 'purchase_order' | 'sale' | 'adjustment' | 'return' | 'transfer';
    reason?: string;
    notes?: string;
    location?: string;
    unitCost?: number;
    totalCost?: number;
    batchNumber?: string;
    expiryDate?: string;
    createdBy: string | User;
    createdAt: string;
    // Virtual fields
    direction?: 'in' | 'out';
    absoluteQuantity?: number;
    formattedDate?: string;
}

// Batch Tracking Types
export interface InventoryBatch {
    _id: string;
    product: string | Product;
    batchNumber: string;
    costPrice: number;
    sellingPrice: number;
    mrp?: number;
    initialQuantity: number;
    currentQuantity: number;
    reservedQuantity: number;
    availableQuantity: number;
    purchaseOrder?: string;
    supplier?: string | Supplier;
    purchaseDate: string;
    expiryDate?: string;
    manufactureDate?: string;
    status: 'active' | 'depleted' | 'expired' | 'damaged' | 'returned';
    location?: string;
    notes?: string;
    createdBy: string | User;
    createdAt: string;
    updatedAt: string;
    // Virtual fields
    isDepleted?: boolean;
    isExpired?: boolean;
    daysUntilExpiry?: number | null;
    profitMargin?: number;
    batchValue?: number;
    potentialRevenue?: number;
}

export interface BatchSummary {
    productId: string;
    productName: string;
    productSku: string;
    barcode?: string;
    totalBatches: number;
    totalQuantity: number;
    priceRange: {
        minCostPrice: number;
        maxCostPrice: number;
        minSellingPrice: number;
        maxSellingPrice: number;
    };
    batches: InventoryBatch[];
}

export interface BatchSaleResult {
    success: boolean;
    quantitySold: number;
    batchesUsed: Array<{
        batchId: string;
        batchNumber: string;
        quantity: number;
        costPrice: number;
        sellingPrice: number;
        totalCost: number;
        totalRevenue: number;
    }>;
    totalCost: number;
    totalRevenue: number;
    profit: number;
    profitMargin: string;
    averageCostPrice: number;
    averageSellingPrice: number;
}

export interface InventoryValuation {
    summary: {
        totalProducts: number;
        totalBatches: number;
        totalQuantity: number;
        totalCostValue: number;
        totalSellingValue: number;
        totalPotentialProfit: number;
    };
    products: Array<{
        productId: string;
        productName: string;
        productSku: string;
        barcode?: string;
        category?: string;
        totalBatches: number;
        totalQuantity: number;
        totalCostValue: number;
        totalSellingValue: number;
        potentialProfit: number;
        profitMargin: number;
        weightedAvgCostPrice: number;
        weightedAvgSellingPrice: number;
        batches: Array<{
            batchNumber: string;
            quantity: number;
            costPrice: number;
            sellingPrice: number;
            purchaseDate: string;
            expiryDate?: string;
        }>;
    }>;
}

export interface BatchFormData {
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
}

// Inventory Types
export interface InventorySummary {
    totalProducts: number;
    totalStock: number;
    totalValue: number;
    lowStockCount: number;
    outOfStockCount: number;
}

export interface CategorySummary {
    _id: string;
    totalProducts: number;
    totalStock: number;
    totalValue: number;
    lowStockCount: number;
}

// API Response Types
export interface ApiResponse<T> {
    success: boolean;
    message?: string;
    data?: T;
    error?: string;
}

export interface PaginatedResponse<T> {
    success: boolean;
    count: number;
    total: number;
    pagination: {
        currentPage: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
        limit: number;
    };
    data: T[];
}

// Navigation Types
export type RootStackParamList = {
    Auth: undefined;
    Main: undefined;
    Login: undefined;
    Dashboard: undefined;
    ProductList: undefined;
    ProductDetail: { productId: string };
    ProductForm: { productId?: string };
    SupplierList: undefined;
    SupplierDetail: { supplierId: string };
    SupplierForm: { supplierId?: string };
    PurchaseOrderList: undefined;
    PurchaseOrderDetail: { orderId: string };
    PurchaseOrderForm: { orderId?: string };
    InventoryTracking: undefined;
    StockMovements: undefined;
    BarcodeScanner: undefined;
    BulkUpload: undefined;
    BatchValuation: undefined;
    BatchHistory: { productId?: string };
    ExpiringProducts: undefined;
    Billing: undefined;
    CustomerList: undefined;
    CustomerDetail: { customerId: string };
    // Admin Screens
    AdminDashboard: undefined;
    BrandList: undefined;
    BrandDetail: { brandId: string };
    BrandForm: { brandId?: string };
    CategoryList: undefined;
    CategoryDetail: { categoryId: string };
    CategoryForm: { categoryId?: string };
    SubcategoryList: { parentCategoryId: string };
    SubcategoryForm: { categoryId?: string; parentCategoryId?: string };
};

export type MainTabParamList = {
    Dashboard: undefined;
    Products: undefined;
    Suppliers: undefined;
    PurchaseOrders: undefined;
    Inventory: undefined;
    Admin: undefined;
};

export type ProductsStackParamList = {
    ProductList: undefined;
    ProductDetail: { productId: string };
    ProductForm: { productId?: string };
    BarcodeScanner: { onScan: (data: string) => void };
};

export type SuppliersStackParamList = {
    SupplierList: undefined;
    SupplierDetail: { supplierId: string };
    SupplierForm: { supplierId?: string };
};

export type PurchaseOrdersStackParamList = {
    PurchaseOrderList: undefined;
    PurchaseOrderDetail: { orderId: string };
    PurchaseOrderForm: { orderId?: string };
};

export type InventoryStackParamList = {
    InventoryTracking: undefined;
    StockMovements: undefined;
    BulkUpload: undefined;
};

export type AdminStackParamList = {
    AdminDashboard: undefined;
    BrandList: undefined;
    BrandDetail: { brandId: string };
    BrandForm: { brandId?: string };
    CategoryList: undefined;
    CategoryDetail: { categoryId: string };
    CategoryForm: { categoryId?: string };
    SubcategoryList: { parentCategoryId: string };
    SubcategoryForm: { categoryId?: string; parentCategoryId?: string };
};

// Form Types
export interface ProductFormData {
    name: string;
    description?: string;
    sku: string;
    barcode?: string;
    mrp: number;
    costPrice: number;
    sellingPrice: number;
    currentStock: number;
    minStockLevel: number;
    maxStockLevel: number;
    category: string;
    subcategory?: string;
    brand?: string;
    unit: string;
    weight?: number;
    dimensions?: {
        length?: number;
        width?: number;
        height?: number;
    };
    expiryDate?: string;
    batchNumber?: string;
}

export interface SupplierFormData {
    name: string;
    code: string;
    email: string;
    phone?: string;
    alternatePhone?: string;
    address: {
        street?: string;
        city?: string;
        state?: string;
        pincode?: string;
        country: string;
    };
    gstNumber?: string;
    panNumber?: string;
    creditLimit: number;
    paymentTerms: number;
    contactPerson?: {
        name?: string;
        designation?: string;
        phone?: string;
        email?: string;
    };
}

export interface PurchaseOrderFormData {
    supplier: string;
    items: {
        product: string;
        quantity: number;
        costPrice: number;
        sellingPrice: number;
        mrp?: number;
        expiryDate?: string;
    }[];
    expectedDeliveryDate?: string;
    notes?: string;
    paymentMethod: string;
}

export interface StockAdjustmentFormData {
    adjustments: {
        productId: string;
        quantity: number;
    }[];
    reason: string;
}

// Chart Data Types
export interface ChartData {
    labels: string[];
    datasets: {
        data: number[];
        color?: (opacity: number) => string;
        strokeWidth?: number;
    }[];
}

export interface DashboardStats {
    totalProducts: number;
    lowStockItems: number;
    totalValue: number;
    pendingOrders: number;
}

// Filter Types
export interface ProductFilters {
    category?: string;
    search?: string;
    isActive?: boolean;
    lowStock?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface SupplierFilters {
    search?: string;
    isActive?: boolean;
    city?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface PurchaseOrderFilters {
    status?: string;
    supplier?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface StockMovementFilters {
    product?: string;
    movementType?: string;
    startDate?: string;
    endDate?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

// Error Types
export interface ValidationError {
    field: string;
    message: string;
    value?: any;
}

export interface ApiError {
    success: false;
    message: string;
    errors?: ValidationError[];
}

// Utility Types
export type LoadingState = 'idle' | 'loading' | 'succeeded' | 'failed';

export interface AsyncState<T> {
    data: T | null;
    loading: LoadingState;
    error: string | null;
}

// Brand Types
export interface Brand {
    _id: string;
    name: string;
    description?: string;
    logo?: string;
    website?: string;
    contactEmail?: string;
    contactPhone?: string;
    country?: string;
    foundedYear?: number;
    category: 'food-beverage' | 'personal-care' | 'household' | 'electronics' | 'clothing' | 'automotive' | 'pharmaceutical' | 'other';
    isActive: boolean;
    isVerified: boolean;
    rating: {
        average: number;
        count: number;
    };
    productCount: number;
    totalSales: number;
    createdBy: {
        _id: string;
        name: string;
        email: string;
    };
    updatedBy?: {
        _id: string;
        name: string;
        email: string;
    };
    createdAt: string;
    updatedAt: string;
    // Virtual fields
    status?: string;
    formattedRating?: string;
    age?: number;
}

// Category Types
export interface Category {
    _id: string;
    name: string;
    slug: string;
    description?: string;
    icon?: string;
    color?: string;
    image?: string;
    parentCategory?: string | Category;
    level: number;
    path?: string;
    isActive: boolean;
    isFeatured: boolean;
    sortOrder: number;
    productCount: number;
    subcategoryCount: number;
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
    createdBy: {
        _id: string;
        name: string;
        email: string;
    };
    updatedBy?: {
        _id: string;
        name: string;
        email: string;
    };
    createdAt: string;
    updatedAt: string;
    // Virtual fields
    status?: string;
    fullPath?: string;
    subcategories?: Category[];
}

// Admin Form Types
export interface BrandFormData {
    name: string;
    description?: string;
    logo?: string;
    website?: string;
    contactEmail?: string;
    contactPhone?: string;
    country?: string;
    foundedYear?: number;
    category: string;
}

export interface CategoryFormData {
    name: string;
    slug?: string;
    description?: string;
    icon?: string;
    color?: string;
    image?: string;
    parentCategory?: string;
    sortOrder?: number;
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
}

// Admin Filter Types
export interface BrandFilters {
    search?: string;
    category?: string;
    isActive?: boolean;
    isVerified?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface CategoryFilters {
    search?: string;
    level?: number;
    parentCategory?: string;
    isActive?: boolean;
    isFeatured?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}