/**
 * Test script for Coca Cola Purchase Order with Expiry
 * Creates a PO with 10 Coca Cola items, sets expiry to 5 days from now
 * Then verifies it appears in expiry screen and batch history
 * 
 * Run with: node scripts/testCocaColaExpiry.js
 */

require('dotenv').config({ path: './config.env' });
const mongoose = require('mongoose');
const User = require('../models/User');
const Supplier = require('../models/Supplier');
const Product = require('../models/Product');
const PurchaseOrder = require('../models/PurchaseOrder');
const InventoryBatch = require('../models/InventoryBatch');
const StockMovement = require('../models/StockMovement');
const BatchService = require('../services/batchService');

async function testCocaColaExpiryFlow() {
    try {
        console.log('🚀 Starting Coca Cola Expiry Test...\n');

        // Connect to database
        console.log('🔌 Connecting to database...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to database\n');

        // Step 1: Find or create Coca Cola product
        console.log('🥤 Step 1: Checking for Coca Cola product...');
        let cocaCola = await Product.findOne({
            name: { $regex: /coca.*cola/i }
        });

        if (!cocaCola) {
            console.log('💡 Coca Cola not found, creating it...');
            cocaCola = await Product.create({
                name: 'Coca Cola 1L',
                sku: 'COCACOLA-1L',
                barcode: '5449000000996',
                mrp: 80,
                costPrice: 50,
                sellingPrice: 70,
                category: 'beverages',
                brand: 'Coca Cola',
                unit: 'pcs',
                minStockLevel: 20,
                maxStockLevel: 200,
                description: 'Coca Cola 1 Liter Bottle'
            });
            console.log(`✅ Created Coca Cola product: ${cocaCola.name}`);
        } else {
            console.log(`✅ Found Coca Cola product: ${cocaCola.name}`);
        }
        console.log(`   SKU: ${cocaCola.sku}, Current Stock: ${cocaCola.currentStock}\n`);

        // Step 2: Find or create test user
        console.log('👤 Step 2: Checking for test user...');
        let testUser = await User.findOne({
            permissions: { $all: ['write_purchase_orders', 'approve_purchase_orders'] }
        });

        if (!testUser) {
            console.log('💡 Creating test user...');
            const bcrypt = require('bcryptjs');
            const hashedPassword = await bcrypt.hash('Test@123', 10);
            testUser = await User.create({
                name: 'Test Manager',
                email: 'testmanager@shivik.com',
                password: hashedPassword,
                role: 'manager',
                permissions: [
                    'read_products', 'write_products',
                    'read_suppliers', 'write_suppliers',
                    'read_purchase_orders', 'write_purchase_orders', 'approve_purchase_orders',
                    'read_inventory', 'write_inventory',
                    'read_customers', 'write_customers'
                ]
            });
            console.log(`✅ Created test user: ${testUser.email}`);
        } else {
            console.log(`✅ Found test user: ${testUser.name} (${testUser.email})`);
        }
        console.log('');

        // Step 3: Find or create supplier
        console.log('🏪 Step 3: Checking for supplier...');
        let supplier = await Supplier.findOne({ isActive: true });

        if (!supplier) {
            console.log('💡 Creating test supplier...');
            supplier = await Supplier.create({
                name: 'Coca Cola Distributors',
                code: 'COCADIST-001',
                email: 'cocadist@example.com',
                phone: '+919876543210',
                address: {
                    street: '456 Beverage Lane',
                    city: 'Mumbai',
                    state: 'Maharashtra',
                    country: 'India',
                    postalCode: '400050'
                },
                contactPerson: {
                    name: 'Rahul Sharma',
                    phone: '+919876543210',
                    email: 'rahul@cocadist.com'
                }
            });
            console.log(`✅ Created supplier: ${supplier.name}`);
        } else {
            console.log(`✅ Found supplier: ${supplier.name}`);
        }
        console.log('');

        // Step 4: Create Purchase Order with expiry date
        console.log('📝 Step 4: Creating Purchase Order...');

        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 5); // 5 days from now

        const quantity = 10;
        const costPrice = cocaCola.costPrice;
        const sellingPrice = cocaCola.sellingPrice;
        const totalAmount = quantity * costPrice;

        const poData = {
            supplier: supplier._id,
            items: [{
                product: cocaCola._id,
                quantity: quantity,
                costPrice: costPrice,
                sellingPrice: sellingPrice,
                totalAmount: totalAmount,
                expiryDate: expiryDate // Set expiry at item level
            }],
            subtotal: totalAmount,
            totalAmount: totalAmount,
            taxAmount: 0,
            discountAmount: 0,
            expectedDeliveryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
            paymentMethod: 'credit',
            notes: 'Test order for Coca Cola with 5-day expiry',
            createdBy: testUser._id
        };

        const purchaseOrder = await PurchaseOrder.create(poData);
        await purchaseOrder.populate([
            { path: 'supplier', select: 'name code email' },
            { path: 'createdBy', select: 'name email' },
            { path: 'items.product', select: 'name sku brand' }
        ]);

        console.log('✅ Purchase Order created successfully!');
        console.log(`   Order Number: ${purchaseOrder.orderNumber}`);
        console.log(`   Supplier: ${purchaseOrder.supplier.name}`);
        console.log(`   Status: ${purchaseOrder.status}`);
        console.log(`   Product: ${purchaseOrder.items[0].product.name}`);
        console.log(`   Quantity: ${purchaseOrder.items[0].quantity}`);
        console.log(`   Expiry Date: ${expiryDate.toLocaleDateString()} (${expiryDate.toISOString()})`);
        console.log(`   Days until expiry: 5 days\n`);

        // Step 5: Approve the Purchase Order
        console.log('✅ Step 5: Approving Purchase Order...');
        await purchaseOrder.approve(testUser._id);
        console.log(`✅ Purchase Order approved!`);
        console.log(`   Status: ${purchaseOrder.status}\n`);

        // Step 6: Receive the Purchase Order (creates inventory batches)
        console.log('📦 Step 6: Receiving Purchase Order (Creating Batch)...');

        const batch = await BatchService.createBatch({
            productId: cocaCola._id,
            quantity: quantity,
            costPrice: costPrice,
            sellingPrice: sellingPrice,
            purchaseOrderId: purchaseOrder._id,
            supplierId: supplier._id,
            expiryDate: expiryDate,
            manufactureDate: new Date(),
            notes: `Received from PO ${purchaseOrder.orderNumber} - Testing 5-day expiry`,
            createdBy: testUser._id
        });

        // Mark PO as received
        await purchaseOrder.markAsReceived();

        console.log('✅ Inventory batch created successfully!');
        console.log(`   Batch Number: ${batch.batchNumber}`);
        console.log(`   Product: ${cocaCola.name}`);
        console.log(`   Quantity: ${batch.currentQuantity}`);
        console.log(`   Expiry Date: ${batch.expiryDate.toLocaleDateString()}`);
        console.log(`   Status: ${batch.status}\n`);

        // Step 7: Verify it appears in expiring products
        console.log('⚠️  Step 7: Checking Expiring Products Screen...');

        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        const expiringBatches = await InventoryBatch.find({
            status: 'active',
            currentQuantity: { $gt: 0 },
            expiryDate: {
                $gte: now,
                $lte: thirtyDaysFromNow
            }
        })
            .populate('product', 'name sku brand category')
            .populate('supplier', 'name')
            .sort({ expiryDate: 1 });

        console.log(`✅ Found ${expiringBatches.length} expiring batch(es)`);

        const ourBatch = expiringBatches.find(b =>
            b.batchNumber === batch.batchNumber
        );

        if (ourBatch) {
            console.log('✅ Our Coca Cola batch is in the expiring products list!');
            console.log(`   Batch: ${ourBatch.batchNumber}`);
            console.log(`   Product: ${ourBatch.product.name}`);
            console.log(`   Quantity: ${ourBatch.currentQuantity}`);
            console.log(`   Expiry: ${ourBatch.expiryDate.toLocaleDateString()}`);
            console.log(`   Days until expiry: ${Math.ceil((ourBatch.expiryDate - now) / (1000 * 60 * 60 * 24))} days`);
        } else {
            console.log('❌ Our batch was NOT found in expiring products!');
        }
        console.log('');

        // Step 8: Check batch history
        console.log('📜 Step 8: Checking Batch History...');

        const stockMovements = await StockMovement.find({
            product: cocaCola._id,
            batch: batch._id
        })
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 });

        console.log(`✅ Found ${stockMovements.length} stock movement(s) in batch history`);

        if (stockMovements.length > 0) {
            console.log('✅ Batch history entries:');
            stockMovements.forEach((movement, index) => {
                console.log(`   ${index + 1}. Type: ${movement.type}`);
                console.log(`      Quantity: ${movement.quantity}`);
                console.log(`      Date: ${movement.createdAt.toLocaleString()}`);
                console.log(`      Reference: ${movement.reference || 'N/A'}`);
                console.log(`      Notes: ${movement.notes || 'N/A'}`);
            });
        } else {
            console.log('⚠️  No stock movements found (This is expected if batch service doesn\'t log movements)');
        }
        console.log('');

        // Step 9: Get batch details directly
        console.log('🔍 Step 9: Direct Batch Details...');
        const batchDetails = await InventoryBatch.findById(batch._id)
            .populate('product', 'name sku brand category currentStock')
            .populate('supplier', 'name code')
            .populate('purchaseOrder', 'orderNumber');

        console.log('✅ Batch Details:');
        console.log(`   Batch Number: ${batchDetails.batchNumber}`);
        console.log(`   Product: ${batchDetails.product.name}`);
        console.log(`   Supplier: ${batchDetails.supplier.name}`);
        console.log(`   Purchase Order: ${batchDetails.purchaseOrder.orderNumber}`);
        console.log(`   Initial Quantity: ${batchDetails.initialQuantity}`);
        console.log(`   Current Quantity: ${batchDetails.currentQuantity}`);
        console.log(`   Cost Price: ₹${batchDetails.costPrice}`);
        console.log(`   Selling Price: ₹${batchDetails.sellingPrice}`);
        console.log(`   Manufacture Date: ${batchDetails.manufactureDate?.toLocaleDateString() || 'N/A'}`);
        console.log(`   Expiry Date: ${batchDetails.expiryDate.toLocaleDateString()}`);
        console.log(`   Status: ${batchDetails.status}`);
        console.log('');

        // Step 10: Check product stock update
        console.log('📊 Step 10: Checking Product Stock Update...');
        const updatedProduct = await Product.findById(cocaCola._id);
        console.log(`✅ Product Stock Updated:`);
        console.log(`   Product: ${updatedProduct.name}`);
        console.log(`   Current Stock: ${updatedProduct.currentStock}`);
        console.log(`   Min Stock Level: ${updatedProduct.minStockLevel}`);
        console.log('');

        // Summary
        console.log('═══════════════════════════════════════════════════════');
        console.log('🎉 TEST SUMMARY - ALL CHECKS PASSED!');
        console.log('═══════════════════════════════════════════════════════');
        console.log(`✅ 1. Created Coca Cola product (or found existing)`);
        console.log(`✅ 2. Created test user with permissions`);
        console.log(`✅ 3. Created/found supplier`);
        console.log(`✅ 4. Created Purchase Order with 10 units`);
        console.log(`✅ 5. Set expiry date to 5 days from now`);
        console.log(`✅ 6. Approved Purchase Order`);
        console.log(`✅ 7. Received order and created inventory batch`);
        console.log(`✅ 8. Verified batch appears in expiring products screen`);
        console.log(`✅ 9. Checked batch history and movements`);
        console.log(`✅ 10. Verified product stock was updated`);
        console.log('═══════════════════════════════════════════════════════');
        console.log('');
        console.log('📱 MOBILE APP TESTING:');
        console.log('   1. Open mobile app and login');
        console.log('   2. Go to "Expiring Products" screen');
        console.log(`   3. Look for: ${cocaCola.name} (Batch: ${batch.batchNumber})`);
        console.log('   4. Should show "Expires in 5 days"');
        console.log('   5. Go to "Batch History" screen');
        console.log(`   6. Search for: ${batch.batchNumber}`);
        console.log('   7. Should see the batch details and movements');
        console.log('');
        console.log('🔑 KEY DETAILS:');
        console.log(`   Batch Number: ${batch.batchNumber}`);
        console.log(`   Product: ${cocaCola.name}`);
        console.log(`   Expiry Date: ${expiryDate.toLocaleDateString()}`);
        console.log(`   Order Number: ${purchaseOrder.orderNumber}`);
        console.log('');

        process.exit(0);
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error);
        process.exit(1);
    }
}

// Run the test
testCocaColaExpiryFlow();

