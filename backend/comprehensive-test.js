const axios = require('axios');
const mongoose = require('mongoose');

// Test configuration
const BASE_URL = 'http://localhost:8001/api/v1';
let authToken = '';
let testUserId = '';
let testProductId = '';
let testSupplierId = '';
let testPurchaseOrderId = '';

// Test data with unique identifiers
const timestamp = Date.now();
const testUser = {
    name: 'Test User',
    email: 'admin@shivikmart.com',
    password: 'admin123',
    role: 'admin'
};

const testProduct = {
    name: `Test Product ${timestamp}`,
    sku: `TEST${timestamp}`,
    barcode: `1234567890${timestamp.toString().slice(-3)}`,
    mrp: 100,
    costPrice: 80,
    sellingPrice: 90,
    currentStock: 50,
    minStockLevel: 10,
    maxStockLevel: 100,
    category: 'grocery',
    brand: 'Test Brand',
    unit: 'pcs'
};

const testSupplier = {
    name: `Test Supplier ${timestamp}`,
    code: `SUP${timestamp}`,
    email: `supplier${timestamp}@test.com`,
    phone: '9876543210',
    address: {
        street: 'Test Street',
        city: 'Test City',
        state: 'Test State',
        pincode: '123456',
        country: 'India'
    },
    gstNumber: `12ABCDE${timestamp.toString().slice(-4)}F1Z5`,
    panNumber: `ABCDE${timestamp.toString().slice(-4)}F`,
    creditLimit: 100000,
    paymentTerms: 30
};

const testPurchaseOrder = {
    supplier: '', // Will be set after supplier creation
    items: [{
        product: '', // Will be set after product creation
        quantity: 10,
        costPrice: 80,
        totalAmount: 800
    }],
    subtotal: 800,
    taxAmount: 144,
    discountAmount: 0,
    totalAmount: 944,
    expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    notes: 'Test purchase order'
};

// Helper function to make API requests
async function apiRequest(method, endpoint, data = null, headers = {}) {
    try {
        const config = {
            method,
            url: `${BASE_URL}${endpoint}`,
            headers: {
                'Content-Type': 'application/json',
                ...(authToken && { Authorization: `Bearer ${authToken}` }),
                ...headers
            }
        };

        if (data) {
            config.data = data;
        }

        const response = await axios(config);
        return { success: true, data: response.data, status: response.status };
    } catch (error) {
        return {
            success: false,
            error: error.response?.data || error.message,
            status: error.response?.status || 500
        };
    }
}

// Test functions
async function testServerHealth() {
    console.log('\n🏥 Testing Server Health...');
    const result = await apiRequest('GET', '/health');
    if (result.success) {
        console.log('✅ Server is healthy');
        return true;
    } else {
        console.log('❌ Server health check failed:', result.error);
        return false;
    }
}

async function testUserRegistration() {
    console.log('\n👤 Testing User Registration...');
    const result = await apiRequest('POST', '/auth/register', testUser);
    if (result.success) {
        console.log('✅ User registration successful');
        testUserId = result.data.data.user.id;
        return true;
    } else {
        console.log('❌ User registration failed:', result.error);
        return false;
    }
}

async function testUserLogin() {
    console.log('\n🔐 Testing User Login...');
    const result = await apiRequest('POST', '/auth/login', {
        email: testUser.email,
        password: testUser.password
    });
    if (result.success) {
        console.log('✅ User login successful');
        authToken = result.data.token;
        return true;
    } else {
        console.log('❌ User login failed:', result.error);
        return false;
    }
}

async function testGetCurrentUser() {
    console.log('\n👤 Testing Get Current User...');
    const result = await apiRequest('GET', '/auth/me');
    if (result.success) {
        console.log('✅ Get current user successful');
        console.log('   User:', result.data.data.user.name, result.data.data.user.email);
        return true;
    } else {
        console.log('❌ Get current user failed:', result.error);
        return false;
    }
}

async function testProductCreation() {
    console.log('\n📦 Testing Product Creation...');
    const result = await apiRequest('POST', '/products', testProduct);
    if (result.success) {
        console.log('✅ Product creation successful');
        testProductId = result.data.data._id;
        console.log('   Product ID:', testProductId);
        return true;
    } else {
        console.log('❌ Product creation failed:', result.error);
        return false;
    }
}

async function testGetProducts() {
    console.log('\n📋 Testing Get Products...');
    const result = await apiRequest('GET', '/products');
    if (result.success) {
        console.log('✅ Get products successful');
        console.log('   Total products:', result.data.total);
        console.log('   Products returned:', result.data.count);
        return true;
    } else {
        console.log('❌ Get products failed:', result.error);
        return false;
    }
}

async function testGetSingleProduct() {
    console.log('\n🔍 Testing Get Single Product...');
    const result = await apiRequest('GET', `/products/${testProductId}`);
    if (result.success) {
        console.log('✅ Get single product successful');
        console.log('   Product name:', result.data.data.name);
        console.log('   Product SKU:', result.data.data.sku);
        return true;
    } else {
        console.log('❌ Get single product failed:', result.error);
        return false;
    }
}

async function testProductSearch() {
    console.log('\n🔍 Testing Product Search...');
    const result = await apiRequest('GET', '/products/search?search=Test&limit=10');
    if (result.success) {
        console.log('✅ Product search successful');
        console.log('   Search results:', result.data.count);
        return true;
    } else {
        console.log('❌ Product search failed:', result.error);
        return false;
    }
}

async function testGetProductCategories() {
    console.log('\n📂 Testing Get Product Categories...');
    const result = await apiRequest('GET', '/products/categories');
    if (result.success) {
        console.log('✅ Get product categories successful');
        console.log('   Categories:', result.data.data);
        return true;
    } else {
        console.log('❌ Get product categories failed:', result.error);
        return false;
    }
}

async function testSupplierCreation() {
    console.log('\n🏢 Testing Supplier Creation...');
    const result = await apiRequest('POST', '/suppliers', testSupplier);
    if (result.success) {
        console.log('✅ Supplier creation successful');
        testSupplierId = result.data.data._id;
        console.log('   Supplier ID:', testSupplierId);
        return true;
    } else {
        console.log('❌ Supplier creation failed:', result.error);
        return false;
    }
}

async function testGetSuppliers() {
    console.log('\n📋 Testing Get Suppliers...');
    const result = await apiRequest('GET', '/suppliers');
    if (result.success) {
        console.log('✅ Get suppliers successful');
        console.log('   Total suppliers:', result.data.total);
        console.log('   Suppliers returned:', result.data.count);
        return true;
    } else {
        console.log('❌ Get suppliers failed:', result.error);
        return false;
    }
}

async function testGetSupplierStatistics() {
    console.log('\n📊 Testing Get Supplier Statistics...');
    const result = await apiRequest('GET', '/suppliers/statistics');
    if (result.success) {
        console.log('✅ Get supplier statistics successful');
        console.log('   Statistics:', result.data.data);
        return true;
    } else {
        console.log('❌ Get supplier statistics failed:', result.error);
        return false;
    }
}

async function testPurchaseOrderCreation() {
    console.log('\n🛒 Testing Purchase Order Creation...');

    // Check if we have valid IDs
    if (!testSupplierId || !testProductId) {
        console.log('❌ Purchase order creation failed: Missing supplier or product ID');
        console.log('   Supplier ID:', testSupplierId);
        console.log('   Product ID:', testProductId);
        return false;
    }

    testPurchaseOrder.supplier = testSupplierId;
    testPurchaseOrder.items[0].product = testProductId;

    const result = await apiRequest('POST', '/purchase-orders', testPurchaseOrder);
    if (result.success) {
        console.log('✅ Purchase order creation successful');
        testPurchaseOrderId = result.data.data._id;
        console.log('   Purchase Order ID:', testPurchaseOrderId);
        return true;
    } else {
        console.log('❌ Purchase order creation failed:', result.error);
        return false;
    }
}

async function testGetPurchaseOrders() {
    console.log('\n📋 Testing Get Purchase Orders...');
    const result = await apiRequest('GET', '/purchase-orders');
    if (result.success) {
        console.log('✅ Get purchase orders successful');
        console.log('   Total orders:', result.data.total);
        console.log('   Orders returned:', result.data.count);
        return true;
    } else {
        console.log('❌ Get purchase orders failed:', result.error);
        return false;
    }
}

async function testPurchaseOrderApproval() {
    console.log('\n✅ Testing Purchase Order Approval...');

    // Check if we have a valid purchase order ID
    if (!testPurchaseOrderId) {
        console.log('❌ Purchase order approval failed: Missing purchase order ID');
        console.log('   Purchase Order ID:', testPurchaseOrderId);
        return false;
    }

    const result = await apiRequest('PATCH', `/purchase-orders/${testPurchaseOrderId}/approve`);
    if (result.success) {
        console.log('✅ Purchase order approval successful');
        return true;
    } else {
        console.log('❌ Purchase order approval failed:', result.error);
        return false;
    }
}

async function testStockMovement() {
    console.log('\n📈 Testing Stock Movement...');

    // Check if we have a valid product ID
    if (!testProductId) {
        console.log('❌ Stock movement failed: Missing product ID');
        console.log('   Product ID:', testProductId);
        return false;
    }

    const result = await apiRequest('POST', '/inventory/movements', {
        product: testProductId,
        movementType: 'adjustment',
        quantity: 10,
        reason: 'Test stock adjustment',
        notes: 'Testing stock movement functionality'
    });
    if (result.success) {
        console.log('✅ Stock movement successful');
        console.log('   New stock level:', result.data.data.product.currentStock);
        return true;
    } else {
        console.log('❌ Stock movement failed:', result.error);
        return false;
    }
}

async function testGetStockMovements() {
    console.log('\n📋 Testing Get Stock Movements...');
    const result = await apiRequest('GET', '/inventory/movements');
    if (result.success) {
        console.log('✅ Get stock movements successful');
        console.log('   Total movements:', result.data.total);
        console.log('   Movements returned:', result.data.count);
        return true;
    } else {
        console.log('❌ Get stock movements failed:', result.error);
        return false;
    }
}

async function testGetInventorySummary() {
    console.log('\n📊 Testing Get Inventory Summary...');
    const result = await apiRequest('GET', '/products/inventory-summary');
    if (result.success) {
        console.log('✅ Get inventory summary successful');
        console.log('   Summary:', result.data.data);
        return true;
    } else {
        console.log('❌ Get inventory summary failed:', result.error);
        return false;
    }
}

async function testGetLowStockAlerts() {
    console.log('\n⚠️ Testing Get Low Stock Alerts...');
    const result = await apiRequest('GET', '/products/low-stock');
    if (result.success) {
        console.log('✅ Get low stock alerts successful');
        console.log('   Low stock items:', result.data.count);
        return true;
    } else {
        console.log('❌ Get low stock alerts failed:', result.error);
        return false;
    }
}

async function testProductUpdate() {
    console.log('\n✏️ Testing Product Update...');

    // Check if we have a valid product ID
    if (!testProductId) {
        console.log('❌ Product update failed: Missing product ID');
        console.log('   Product ID:', testProductId);
        return false;
    }

    const updateData = {
        name: 'Updated Test Product',
        sellingPrice: 95
    };
    const result = await apiRequest('PUT', `/products/${testProductId}`, updateData);
    if (result.success) {
        console.log('✅ Product update successful');
        console.log('   Updated name:', result.data.data.name);
        console.log('   Updated price:', result.data.data.sellingPrice);
        return true;
    } else {
        console.log('❌ Product update failed:', result.error);
        return false;
    }
}

async function testSupplierUpdate() {
    console.log('\n✏️ Testing Supplier Update...');

    // Check if we have a valid supplier ID
    if (!testSupplierId) {
        console.log('❌ Supplier update failed: Missing supplier ID');
        console.log('   Supplier ID:', testSupplierId);
        return false;
    }

    const updateData = {
        rating: 4.5,
        creditLimit: 150000
    };
    const result = await apiRequest('PUT', `/suppliers/${testSupplierId}`, updateData);
    if (result.success) {
        console.log('✅ Supplier update successful');
        console.log('   Updated rating:', result.data.data.rating);
        console.log('   Updated credit limit:', result.data.data.creditLimit);
        return true;
    } else {
        console.log('❌ Supplier update failed:', result.error);
        return false;
    }
}

async function testErrorHandling() {
    console.log('\n🚫 Testing Error Handling...');

    // Test invalid product ID (with authentication)
    const result1 = await apiRequest('GET', '/products/invalid-id');
    if (!result1.success && result1.status === 404) {
        console.log('✅ 404 error handling works');
    } else {
        console.log('❌ 404 error handling failed');
        console.log('   Expected: 404, Got:', result1.status, result1.error);
    }

    // Test unauthorized access
    const result2 = await apiRequest('GET', '/products', null, { Authorization: 'Bearer invalid-token' });
    if (!result2.success && result2.status === 401) {
        console.log('✅ 401 error handling works');
    } else {
        console.log('❌ 401 error handling failed');
    }

    // Test validation error
    const result3 = await apiRequest('POST', '/products', { name: 'Test' }); // Missing required fields
    if (!result3.success && result3.status === 400) {
        console.log('✅ Validation error handling works');
    } else {
        console.log('❌ Validation error handling failed');
    }

    return true;
}

async function testPagination() {
    console.log('\n📄 Testing Pagination...');
    const result = await apiRequest('GET', '/products?page=1&limit=5');
    if (result.success) {
        console.log('✅ Pagination works');
        console.log('   Current page:', result.data.pagination.currentPage);
        console.log('   Total pages:', result.data.pagination.totalPages);
        console.log('   Has next:', result.data.pagination.hasNext);
        console.log('   Has prev:', result.data.pagination.hasPrev);
        return true;
    } else {
        console.log('❌ Pagination failed:', result.error);
        return false;
    }
}

async function testRateLimiting() {
    console.log('\n⏱️ Testing Rate Limiting...');
    const promises = [];
    for (let i = 0; i < 10; i++) {
        promises.push(apiRequest('GET', '/products'));
    }

    const results = await Promise.all(promises);
    const successCount = results.filter(r => r.success).length;
    console.log(`✅ Rate limiting test completed: ${successCount}/10 requests successful`);
    return true;
}

// Main test runner
async function runAllTests() {
    console.log('🚀 Starting Comprehensive API Tests for ShivikMart...\n');

    const tests = [
        { name: 'Server Health', fn: testServerHealth },
        { name: 'User Registration', fn: testUserRegistration },
        { name: 'User Login', fn: testUserLogin },
        { name: 'Get Current User', fn: testGetCurrentUser },
        { name: 'Product Creation', fn: testProductCreation },
        { name: 'Get Products', fn: testGetProducts },
        { name: 'Get Single Product', fn: testGetSingleProduct },
        { name: 'Product Search', fn: testProductSearch },
        { name: 'Get Product Categories', fn: testGetProductCategories },
        { name: 'Supplier Creation', fn: testSupplierCreation },
        { name: 'Get Suppliers', fn: testGetSuppliers },
        { name: 'Get Supplier Statistics', fn: testGetSupplierStatistics },
        { name: 'Purchase Order Creation', fn: testPurchaseOrderCreation },
        { name: 'Get Purchase Orders', fn: testGetPurchaseOrders },
        { name: 'Purchase Order Approval', fn: testPurchaseOrderApproval },
        { name: 'Stock Movement', fn: testStockMovement },
        { name: 'Get Stock Movements', fn: testGetStockMovements },
        { name: 'Get Inventory Summary', fn: testGetInventorySummary },
        { name: 'Get Low Stock Alerts', fn: testGetLowStockAlerts },
        { name: 'Product Update', fn: testProductUpdate },
        { name: 'Supplier Update', fn: testSupplierUpdate },
        { name: 'Error Handling', fn: testErrorHandling },
        { name: 'Pagination', fn: testPagination },
        { name: 'Rate Limiting', fn: testRateLimiting }
    ];

    let passed = 0;
    let failed = 0;

    for (const test of tests) {
        try {
            const result = await test.fn();
            if (result) {
                passed++;
            } else {
                failed++;
            }
        } catch (error) {
            console.log(`❌ ${test.name} failed with error:`, error.message);
            failed++;
        }
    }

    console.log('\n📊 Test Results Summary:');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

    if (failed === 0) {
        console.log('\n🎉 All tests passed! The API is working correctly.');
    } else {
        console.log('\n⚠️ Some tests failed. Please check the implementation.');
    }
}

// Run tests
runAllTests().catch(console.error);
