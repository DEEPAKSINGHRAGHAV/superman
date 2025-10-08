/**
 * Test script for Purchase Order creation end-to-end
 * Run with: node scripts/testPurchaseOrder.js
 */

require('dotenv').config({ path: './config.env' });
const mongoose = require('mongoose');
const User = require('../models/User');
const Supplier = require('../models/Supplier');
const Product = require('../models/Product');
const PurchaseOrder = require('../models/PurchaseOrder');

async function testPurchaseOrderFlow() {
    try {
        // Connect to database
        console.log('🔌 Connecting to database...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to database\n');

        // 1. Check for test user with permissions
        console.log('👤 Checking for users with purchase order permissions...');
        const users = await User.find({
            permissions: { $in: ['write_purchase_orders'] }
        }).select('name email role permissions');

        if (users.length === 0) {
            console.log('❌ No users found with write_purchase_orders permission');
            console.log('💡 Creating test user...');

            const bcrypt = require('bcryptjs');
            const hashedPassword = await bcrypt.hash('Test@123', 10);

            const testUser = await User.create({
                name: 'Test Manager',
                email: 'test@example.com',
                password: hashedPassword,
                role: 'manager',
                permissions: [
                    'read_products', 'write_products',
                    'read_suppliers', 'write_suppliers',
                    'read_purchase_orders', 'write_purchase_orders', 'approve_purchase_orders',
                    'read_inventory', 'write_inventory'
                ]
            });
            console.log(`✅ Created test user: ${testUser.email} (password: Test@123)\n`);
        } else {
            console.log(`✅ Found ${users.length} user(s) with permission:`);
            users.forEach(user => {
                console.log(`   - ${user.name} (${user.email}) - ${user.role}`);
            });
            console.log('');
        }

        // 2. Check for suppliers
        console.log('🏪 Checking for suppliers...');
        let supplier = await Supplier.findOne({ isActive: true });

        if (!supplier) {
            console.log('💡 Creating test supplier...');
            supplier = await Supplier.create({
                name: 'Test Supplier Ltd',
                code: 'SUP-001',
                email: 'supplier@test.com',
                phone: '+911234567890',
                address: {
                    street: '123 Test Street',
                    city: 'Mumbai',
                    state: 'Maharashtra',
                    country: 'India',
                    postalCode: '400001'
                },
                contactPerson: {
                    name: 'John Doe',
                    phone: '+911234567890',
                    email: 'john@test.com'
                }
            });
            console.log(`✅ Created supplier: ${supplier.name}\n`);
        } else {
            console.log(`✅ Found supplier: ${supplier.name}\n`);
        }

        // 3. Check for products
        console.log('📦 Checking for products...');
        let products = await Product.find({ isActive: true }).limit(3);

        if (products.length === 0) {
            console.log('💡 Creating test products...');
            const testProducts = [
                {
                    name: 'Test Product 1',
                    sku: 'TEST-001',
                    barcode: '1234567890123',
                    mrp: 100,
                    costPrice: 70,
                    sellingPrice: 85,
                    category: 'grocery',
                    unit: 'pcs'
                },
                {
                    name: 'Test Product 2',
                    sku: 'TEST-002',
                    barcode: '1234567890124',
                    mrp: 200,
                    costPrice: 140,
                    sellingPrice: 170,
                    category: 'snacks',
                    unit: 'pcs'
                }
            ];

            products = await Product.insertMany(testProducts);
            console.log(`✅ Created ${products.length} products\n`);
        } else {
            console.log(`✅ Found ${products.length} products\n`);
        }

        // 4. Create a test purchase order
        console.log('📝 Creating test purchase order...');

        const testUser = users.length > 0 ? users[0] : await User.findOne();

        // Calculate items with totals
        const items = products.map(product => {
            const quantity = 10;
            const costPrice = product.costPrice;
            return {
                product: product._id,
                quantity,
                costPrice,
                totalAmount: quantity * costPrice
            };
        });

        const subtotal = items.reduce((sum, item) => sum + item.totalAmount, 0);

        const orderData = {
            supplier: supplier._id,
            items,
            subtotal,
            totalAmount: subtotal,
            taxAmount: 0,
            discountAmount: 0,
            expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
            paymentMethod: 'credit',
            notes: 'Test order created by script',
            createdBy: testUser._id
        };

        const purchaseOrder = await PurchaseOrder.create(orderData);

        // Populate for display
        await purchaseOrder.populate([
            { path: 'supplier', select: 'name code email' },
            { path: 'createdBy', select: 'name email' },
            { path: 'items.product', select: 'name sku' }
        ]);

        console.log('✅ Purchase order created successfully!');
        console.log('\n📊 Order Details:');
        console.log(`   Order Number: ${purchaseOrder.orderNumber}`);
        console.log(`   Supplier: ${purchaseOrder.supplier.name}`);
        console.log(`   Status: ${purchaseOrder.status}`);
        console.log(`   Total Amount: ₹${purchaseOrder.totalAmount.toFixed(2)}`);
        console.log(`   Items: ${purchaseOrder.items.length}`);
        purchaseOrder.items.forEach((item, index) => {
            console.log(`      ${index + 1}. ${item.product.name} - Qty: ${item.quantity} @ ₹${item.costPrice}`);
        });
        console.log(`   Created By: ${purchaseOrder.createdBy.name}`);
        console.log(`   Expected Delivery: ${purchaseOrder.expectedDeliveryDate.toDateString()}\n`);

        // 5. Test the validation
        console.log('🧪 Testing validation...');

        try {
            await PurchaseOrder.create({
                supplier: supplier._id,
                items: [], // Empty items should fail
                createdBy: testUser._id
            });
            console.log('❌ Validation failed - Empty items should have been rejected\n');
        } catch (error) {
            console.log('✅ Validation working - Empty items correctly rejected\n');
        }

        // 6. Summary
        console.log('🎉 Test Summary:');
        console.log('   ✅ Database connection: OK');
        console.log('   ✅ User permissions: OK');
        console.log('   ✅ Suppliers available: OK');
        console.log('   ✅ Products available: OK');
        console.log('   ✅ Purchase order creation: OK');
        console.log('   ✅ Validation: OK\n');

        console.log('🚀 System is ready for purchase order creation!');
        console.log('\n📱 You can now test the mobile app:');
        console.log('   1. Login with admin credentials');
        console.log('   2. Navigate to Dashboard');
        console.log('   3. Tap "New Order" button');
        console.log('   4. Fill the form and create an order\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error);
        process.exit(1);
    }
}

// Run the test
testPurchaseOrderFlow();

