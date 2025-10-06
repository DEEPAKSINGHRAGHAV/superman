const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:8001/api/v1';
let authToken = '';
let testProductId = '';
let testSupplierId = '';

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
async function testHealthRoute() {
    console.log('\n🏥 Testing Health Route...');
    const result = await apiRequest('GET', '/health');
    if (result.success) {
        console.log('✅ Health route works');
        return true;
    } else {
        console.log('❌ Health route failed:', result.error);
        return false;
    }
}

async function testLogin() {
    console.log('\n🔐 Testing Login...');
    const result = await apiRequest('POST', '/auth/login', {
        email: 'admin@shivikmart.com',
        password: 'admin123'
    });
    if (result.success) {
        console.log('✅ Login successful');
        authToken = result.data.token;
        return true;
    } else {
        console.log('❌ Login failed:', result.error);
        return false;
    }
}

async function testProductSearch() {
    console.log('\n🔍 Testing Product Search...');
    const result = await apiRequest('GET', '/products/search?search=Test&limit=10');
    if (result.success) {
        console.log('✅ Product search works');
        return true;
    } else {
        console.log('❌ Product search failed:', result.error);
        return false;
    }
}

async function testProductCategories() {
    console.log('\n📂 Testing Product Categories...');
    const result = await apiRequest('GET', '/products/categories');
    if (result.success) {
        console.log('✅ Product categories work');
        return true;
    } else {
        console.log('❌ Product categories failed:', result.error);
        return false;
    }
}

async function testSupplierStatistics() {
    console.log('\n📊 Testing Supplier Statistics...');
    const result = await apiRequest('GET', '/suppliers/statistics');
    if (result.success) {
        console.log('✅ Supplier statistics work');
        return true;
    } else {
        console.log('❌ Supplier statistics failed:', result.error);
        return false;
    }
}

async function testInventorySummary() {
    console.log('\n📊 Testing Inventory Summary...');
    const result = await apiRequest('GET', '/products/inventory-summary');
    if (result.success) {
        console.log('✅ Inventory summary works');
        return true;
    } else {
        console.log('❌ Inventory summary failed:', result.error);
        return false;
    }
}

async function testLowStockAlerts() {
    console.log('\n⚠️ Testing Low Stock Alerts...');
    const result = await apiRequest('GET', '/products/low-stock');
    if (result.success) {
        console.log('✅ Low stock alerts work');
        return true;
    } else {
        console.log('❌ Low stock alerts failed:', result.error);
        return false;
    }
}

async function testCreateProduct() {
    console.log('\n📦 Testing Product Creation...');
    const timestamp = Date.now();
    const result = await apiRequest('POST', '/products', {
        name: `Test Product ${timestamp}`,
        sku: `TEST${timestamp}`,
        barcode: `1234567890${timestamp}`,
        mrp: 100,
        costPrice: 80,
        sellingPrice: 90,
        currentStock: 50,
        minStockLevel: 10,
        maxStockLevel: 100,
        category: 'grocery',
        brand: 'Test Brand',
        unit: 'pcs'
    });
    if (result.success) {
        console.log('✅ Product creation works');
        testProductId = result.data.data._id;
        return true;
    } else {
        console.log('❌ Product creation failed:', result.error);
        return false;
    }
}

async function testCreateSupplier() {
    console.log('\n🏢 Testing Supplier Creation...');
    const timestamp = Date.now();
    const result = await apiRequest('POST', '/suppliers', {
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
        gstNumber: '12ABCDE1234F1Z5',
        panNumber: 'ABCDE1234F',
        creditLimit: 100000,
        paymentTerms: 30
    });
    if (result.success) {
        console.log('✅ Supplier creation works');
        testSupplierId = result.data.data._id;
        return true;
    } else {
        console.log('❌ Supplier creation failed:', result.error);
        return false;
    }
}

async function testCreatePurchaseOrder() {
    console.log('\n🛒 Testing Purchase Order Creation...');
    const result = await apiRequest('POST', '/purchase-orders', {
        supplier: testSupplierId,
        items: [{
            product: testProductId,
            quantity: 10,
            costPrice: 80,
            totalAmount: 800
        }],
        subtotal: 800,
        taxAmount: 144,
        discountAmount: 0,
        totalAmount: 944,
        expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        notes: 'Test purchase order'
    });
    if (result.success) {
        console.log('✅ Purchase order creation works');
        console.log('   Order Number:', result.data.data.orderNumber);
        return true;
    } else {
        console.log('❌ Purchase order creation failed:', result.error);
        return false;
    }
}

// Main test runner
async function runTests() {
    console.log('🚀 Testing Fixed API Issues...\n');

    const tests = [
        { name: 'Health Route', fn: testHealthRoute },
        { name: 'Login', fn: testLogin },
        { name: 'Product Search', fn: testProductSearch },
        { name: 'Product Categories', fn: testProductCategories },
        { name: 'Supplier Statistics', fn: testSupplierStatistics },
        { name: 'Inventory Summary', fn: testInventorySummary },
        { name: 'Low Stock Alerts', fn: testLowStockAlerts },
        { name: 'Create Product', fn: testCreateProduct },
        { name: 'Create Supplier', fn: testCreateSupplier },
        { name: 'Create Purchase Order', fn: testCreatePurchaseOrder }
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
            // Add delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
            console.log(`❌ ${test.name} failed with error:`, error.message);
            failed++;
        }
    }

    console.log('\n📊 Test Results Summary:');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
}

// Run tests
runTests().catch(console.error);
