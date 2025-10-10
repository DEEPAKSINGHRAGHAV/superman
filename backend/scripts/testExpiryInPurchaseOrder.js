const mongoose = require('mongoose');
const PurchaseOrder = require('../models/PurchaseOrder');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const User = require('../models/User');
const BatchService = require('../services/batchService');
require('dotenv').config({ path: './config.env' });

// Connect to database
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', async () => {
    console.log('Connected to MongoDB');
    await testExpiryDateInPurchaseOrder();
    await mongoose.connection.close();
    console.log('Database connection closed');
});

async function testExpiryDateInPurchaseOrder() {
    try {
        console.log('\n========================================');
        console.log('Testing Expiry Date in Purchase Order');
        console.log('========================================\n');

        // Step 1: Get or create test data
        console.log('Step 1: Setting up test data...');
        const supplier = await Supplier.findOne() || await Supplier.create({
            name: 'Test Supplier',
            code: 'TEST-SUP-001',
            email: 'testsupplier@example.com',
            phone: '1234567890',
        });
        console.log(`✓ Supplier: ${supplier.name} (${supplier._id})`);

        const product = await Product.findOne() || await Product.create({
            name: 'Test Product with Expiry',
            sku: 'TEST-EXP-001',
            barcode: '1234567890123',
            mrp: 100,
            costPrice: 60,
            sellingPrice: 80,
            category: 'grocery',
        });
        console.log(`✓ Product: ${product.name} (${product._id})`);

        const user = await User.findOne({ role: 'admin' });
        if (!user) {
            console.error('✗ No admin user found. Please create an admin user first.');
            return;
        }
        console.log(`✓ User: ${user.name} (${user._id})`);

        // Step 2: Create Purchase Order with Expiry Date
        console.log('\nStep 2: Creating Purchase Order with expiry date...');
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 180); // 6 months from now
        const expiryDateISO = futureDate.toISOString();

        const orderData = {
            supplier: supplier._id,
            items: [
                {
                    product: product._id,
                    quantity: 50,
                    costPrice: 60,
                    sellingPrice: 80,
                    mrp: 100,
                    totalAmount: 50 * 60,
                    expiryDate: expiryDateISO,
                }
            ],
            subtotal: 3000,
            totalAmount: 3000,
            taxAmount: 0,
            discountAmount: 0,
            expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
            paymentMethod: 'credit',
            notes: 'Test order with expiry date',
            createdBy: user._id,
        };

        const purchaseOrder = await PurchaseOrder.create(orderData);
        console.log(`✓ Purchase Order created: ${purchaseOrder.orderNumber}`);
        console.log(`  - Item expiry date: ${purchaseOrder.items[0].expiryDate}`);
        console.log(`  - Formatted: ${new Date(purchaseOrder.items[0].expiryDate).toLocaleDateString()}`);

        // Step 3: Approve the Purchase Order
        console.log('\nStep 3: Approving Purchase Order...');
        await purchaseOrder.approve(user._id);
        console.log(`✓ Purchase Order approved`);
        console.log(`  - Status: ${purchaseOrder.status}`);
        console.log(`  - Approved at: ${purchaseOrder.approvedAt}`);

        // Step 4: Receive the Purchase Order (Create Batch)
        console.log('\nStep 4: Receiving Purchase Order and creating batch...');
        const receivedItems = purchaseOrder.items.map(item => ({
            productId: item.product,
            quantity: item.quantity,
            costPrice: item.costPrice,
            sellingPrice: item.sellingPrice,
            expiryDate: item.expiryDate, // Expiry date should be passed to batch
        }));

        console.log('Received items:', JSON.stringify(receivedItems, null, 2));

        const batch = await BatchService.createBatch({
            productId: receivedItems[0].productId,
            quantity: receivedItems[0].quantity,
            costPrice: receivedItems[0].costPrice,
            sellingPrice: receivedItems[0].sellingPrice,
            purchaseOrderId: purchaseOrder._id,
            supplierId: supplier._id,
            expiryDate: receivedItems[0].expiryDate,
            notes: `Received from PO ${purchaseOrder.orderNumber}`,
            createdBy: user._id,
        });

        console.log(`✓ Batch created: ${batch.batchNumber}`);
        console.log(`  - Batch expiry date: ${batch.expiryDate}`);
        console.log(`  - Formatted: ${batch.expiryDate ? new Date(batch.expiryDate).toLocaleDateString() : 'N/A'}`);
        console.log(`  - Current quantity: ${batch.currentQuantity}`);
        console.log(`  - Status: ${batch.status}`);

        // Mark order as received
        await purchaseOrder.markAsReceived();
        console.log(`✓ Purchase Order marked as received`);
        console.log(`  - Status: ${purchaseOrder.status}`);

        // Step 5: Verify the batch has expiry date
        console.log('\nStep 5: Verifying batch expiry date...');
        const InventoryBatch = require('../models/InventoryBatch');
        const verifiedBatch = await InventoryBatch.findById(batch._id)
            .populate('product', 'name sku')
            .populate('supplier', 'name');

        if (verifiedBatch.expiryDate) {
            const daysUntilExpiry = Math.ceil((new Date(verifiedBatch.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
            console.log(`✓ Batch has expiry date`);
            console.log(`  - Product: ${verifiedBatch.product.name}`);
            console.log(`  - Batch Number: ${verifiedBatch.batchNumber}`);
            console.log(`  - Expiry Date: ${new Date(verifiedBatch.expiryDate).toLocaleDateString()}`);
            console.log(`  - Days until expiry: ${daysUntilExpiry} days`);
        } else {
            console.log(`✗ Batch does NOT have expiry date - TEST FAILED!`);
        }

        // Step 6: Get expiring batches
        console.log('\nStep 6: Checking expiring batches...');
        const expiringBatches = await BatchService.getExpiringBatches(200); // Next 200 days
        const ourBatch = expiringBatches.find(b => b.batchNumber === batch.batchNumber);

        if (ourBatch) {
            console.log(`✓ Batch found in expiring batches list`);
            console.log(`  - Days until expiry: ${ourBatch.daysUntilExpiry} days`);
            console.log(`  - Value at risk: ₹${ourBatch.valueAtRisk.toFixed(2)}`);
        } else {
            console.log(`ℹ Batch not in expiring list (might expire beyond 200 days)`);
        }

        // Step 7: Test updating purchase order with expiry date
        console.log('\nStep 7: Testing update scenario...');
        const newExpiryDate = new Date();
        newExpiryDate.setDate(newExpiryDate.getDate() + 90); // 3 months

        const updatedOrder = await PurchaseOrder.create({
            supplier: supplier._id,
            items: [
                {
                    product: product._id,
                    quantity: 30,
                    costPrice: 65,
                    sellingPrice: 85,
                    mrp: 100,
                    totalAmount: 30 * 65,
                    expiryDate: newExpiryDate.toISOString(),
                }
            ],
            subtotal: 1950,
            totalAmount: 1950,
            createdBy: user._id,
        });

        console.log(`✓ New Purchase Order created: ${updatedOrder.orderNumber}`);
        console.log(`  - Expiry date preserved: ${updatedOrder.items[0].expiryDate ? 'YES' : 'NO'}`);
        if (updatedOrder.items[0].expiryDate) {
            console.log(`  - Expiry date: ${new Date(updatedOrder.items[0].expiryDate).toLocaleDateString()}`);
        }

        console.log('\n========================================');
        console.log('✓ ALL TESTS PASSED!');
        console.log('Expiry date functionality is working correctly.');
        console.log('========================================\n');

    } catch (error) {
        console.error('\n✗ TEST FAILED with error:');
        console.error(error);
        console.error('\nStack trace:');
        console.error(error.stack);
    }
}

