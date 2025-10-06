const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:8001/api/v1';

// Helper function to make API requests
async function apiRequest(method, endpoint, data = null, headers = {}) {
    try {
        const config = {
            method,
            url: `${BASE_URL}${endpoint}`,
            headers: {
                'Content-Type': 'application/json',
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
        return result.data.token;
    } else {
        console.log('❌ Login failed:', result.error);
        return null;
    }
}

async function testProductSearch(token) {
    console.log('\n🔍 Testing Product Search...');
    const result = await apiRequest('GET', '/products/search?search=Test&limit=10', null, {
        Authorization: `Bearer ${token}`
    });
    if (result.success) {
        console.log('✅ Product search works');
        return true;
    } else {
        console.log('❌ Product search failed:', result.error);
        return false;
    }
}

async function testProductCategories(token) {
    console.log('\n📂 Testing Product Categories...');
    const result = await apiRequest('GET', '/products/categories', null, {
        Authorization: `Bearer ${token}`
    });
    if (result.success) {
        console.log('✅ Product categories work');
        return true;
    } else {
        console.log('❌ Product categories failed:', result.error);
        return false;
    }
}

// Main test runner
async function runTests() {
    console.log('🚀 Testing API with Fresh Connection...\n');

    // Test health route first
    await testHealthRoute();

    // Test login
    const token = await testLogin();

    if (token) {
        // Test other endpoints with token
        await testProductSearch(token);
        await testProductCategories(token);
    }

    console.log('\n✅ Test completed');
}

// Run tests
runTests().catch(console.error);
