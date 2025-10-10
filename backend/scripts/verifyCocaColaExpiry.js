/**
 * Verification script to check if Coca Cola batch appears in API endpoints
 * Run with: node scripts/verifyCocaColaExpiry.js
 */

require('dotenv').config({ path: './config.env' });
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const PurchaseOrder = require('../models/PurchaseOrder');
const InventoryBatch = require('../models/InventoryBatch');
const StockMovement = require('../models/StockMovement');

async function verifyAPIs() {
    try {
        console.log('🔍 Verifying Coca Cola Expiry in API Endpoints...\n');

        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI);

        // 1. Verify Expiring Products API
        console.log('1️⃣  EXPIRING PRODUCTS API (GET /api/v1/batches/expiring)');
        console.log('═══════════════════════════════════════════════════════\n');

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
            .populate('purchaseOrder', 'orderNumber')
            .sort({ expiryDate: 1 });

        console.log(`📊 Total Expiring Batches: ${expiringBatches.length}\n`);

        if (expiringBatches.length > 0) {
            console.log('📦 Expiring Batches:');
            console.log('─────────────────────────────────────────────────────\n');

            expiringBatches.forEach((batch, index) => {
                const daysUntilExpiry = Math.ceil((batch.expiryDate - now) / (1000 * 60 * 60 * 24));
                const isCocaCola = batch.product.name.toLowerCase().includes('coca cola');

                console.log(`${index + 1}. ${isCocaCola ? '🥤 ' : ''}${batch.product.name}`);
                console.log(`   Batch Number: ${batch.batchNumber}`);
                console.log(`   Quantity: ${batch.currentQuantity}`);
                console.log(`   Expiry Date: ${batch.expiryDate.toLocaleDateString()}`);
                console.log(`   Days Until Expiry: ${daysUntilExpiry} days`);
                console.log(`   Status: ${batch.status}`);
                console.log(`   Supplier: ${batch.supplier?.name || 'N/A'}`);
                console.log(`   PO Number: ${batch.purchaseOrder?.orderNumber || 'N/A'}`);

                if (isCocaCola) {
                    console.log(`   ✅ FOUND OUR COCA COLA BATCH!`);
                }
                console.log('');
            });
        } else {
            console.log('⚠️  No expiring batches found\n');
        }

        // 2. Verify Batch History API
        console.log('2️⃣  BATCH HISTORY API (GET /api/v1/batches/history/:productId)');
        console.log('═══════════════════════════════════════════════════════\n');

        // Get the Coca Cola batch
        const cocaColaBatch = await InventoryBatch.findOne({
            batchNumber: 'BATCH251010004'
        }).populate('product', 'name sku');

        if (cocaColaBatch) {
            console.log(`✅ Found Coca Cola Batch: ${cocaColaBatch.batchNumber}\n`);

            // Get all batches for this product
            const allBatches = await InventoryBatch.find({
                product: cocaColaBatch.product._id
            })
                .populate('supplier', 'name')
                .populate('purchaseOrder', 'orderNumber')
                .sort({ createdAt: -1 });

            console.log(`📦 Total Batches for ${cocaColaBatch.product.name}: ${allBatches.length}\n`);

            if (allBatches.length > 0) {
                console.log('Batch History:');
                console.log('─────────────────────────────────────────────────────\n');

                allBatches.slice(0, 10).forEach((batch, index) => {
                    const isOurBatch = batch.batchNumber === 'BATCH251010004';

                    console.log(`${index + 1}. ${isOurBatch ? '⭐ ' : ''}Batch: ${batch.batchNumber}`);
                    console.log(`   Initial Qty: ${batch.initialQuantity}`);
                    console.log(`   Current Qty: ${batch.currentQuantity}`);
                    console.log(`   Cost Price: ₹${batch.costPrice}`);
                    console.log(`   Selling Price: ₹${batch.sellingPrice}`);
                    console.log(`   Expiry: ${batch.expiryDate?.toLocaleDateString() || 'N/A'}`);
                    console.log(`   Status: ${batch.status}`);
                    console.log(`   Created: ${batch.createdAt.toLocaleDateString()}`);
                    console.log(`   PO: ${batch.purchaseOrder?.orderNumber || 'N/A'}`);

                    if (isOurBatch) {
                        console.log(`   ✅ THIS IS OUR TEST BATCH!`);
                    }
                    console.log('');
                });
            }
        } else {
            console.log('❌ Coca Cola batch not found!\n');
        }

        // 3. Check Stock Movements
        console.log('3️⃣  STOCK MOVEMENTS (Batch Activity)');
        console.log('═══════════════════════════════════════════════════════\n');

        if (cocaColaBatch) {
            const movements = await StockMovement.find({
                batch: cocaColaBatch._id
            })
                .populate('product', 'name')
                .populate('createdBy', 'name email')
                .sort({ createdAt: -1 });

            console.log(`📊 Total Movements for Batch ${cocaColaBatch.batchNumber}: ${movements.length}\n`);

            if (movements.length > 0) {
                console.log('Stock Movements:');
                console.log('─────────────────────────────────────────────────────\n');

                movements.forEach((movement, index) => {
                    console.log(`${index + 1}. Type: ${movement.type}`);
                    console.log(`   Product: ${movement.product.name}`);
                    console.log(`   Quantity: ${movement.quantity}`);
                    console.log(`   Date: ${movement.createdAt.toLocaleString()}`);
                    console.log(`   Reference: ${movement.reference || 'N/A'}`);
                    console.log(`   Notes: ${movement.notes || 'N/A'}`);
                    console.log(`   Created By: ${movement.createdBy?.name || 'System'}`);
                    console.log('');
                });
            } else {
                console.log('ℹ️  No stock movements recorded yet\n');
            }
        }

        // 4. Summary
        console.log('═══════════════════════════════════════════════════════');
        console.log('📱 MOBILE APP VERIFICATION STEPS:');
        console.log('═══════════════════════════════════════════════════════\n');
        console.log('1. Open Mobile App');
        console.log('2. Login with credentials');
        console.log('3. Navigate to "Expiring Products" screen');
        console.log('   → You should see: Coca Cola 500ml (BATCH251010004)');
        console.log('   → Shows "Expires in 5 days"');
        console.log('   → Status should be "active"');
        console.log('   → Quantity: 10 units\n');
        console.log('4. Navigate to "Batch History" screen');
        console.log('   → Search for "Coca Cola" or "BATCH251010004"');
        console.log('   → Should see batch details with expiry date');
        console.log('   → Can view movements (if any)\n');
        console.log('5. Navigate to "Purchase Orders" screen');
        console.log('   → Look for order PO251010917');
        console.log('   → Status should be "received"');
        console.log('   → Can see batch association\n');
        console.log('═══════════════════════════════════════════════════════');

        process.exit(0);
    } catch (error) {
        console.error('❌ Verification failed:', error.message);
        console.error(error);
        process.exit(1);
    }
}

// Run verification
verifyAPIs();

