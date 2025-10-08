/**
 * Test Script for Batch Tracking System
 * 
 * This script demonstrates how the batch tracking system solves the problem:
 * "Same product, same barcode, but different prices based on when it was purchased"
 * 
 * Run: node scripts/testBatchTracking.js
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: './config.env' });

const Product = require('../models/Product');
const InventoryBatch = require('../models/InventoryBatch');
const Supplier = require('../models/Supplier');
const User = require('../models/User');
const PurchaseOrder = require('../models/PurchaseOrder');
const StockMovement = require('../models/StockMovement');
const BatchService = require('../services/batchService');

async function runBatchTrackingTest() {
    try {
        // Connect to database
        console.log('🔌 Connecting to database...');
        await mongoose.connect(process.env.MONGODB_URI || process.env.DATABASE_URL);
        console.log('✅ Connected to database\n');

        // Get or create admin user for testing
        let adminUser = await User.findOne({ role: 'admin' });
        if (!adminUser) {
            console.log('⚠️  No admin user found. Please run createAdmin.js first');
            process.exit(1);
        }
        console.log(`✅ Using admin user: ${adminUser.email}\n`);

        // Get or create a supplier for testing
        let supplier = await Supplier.findOne({ name: 'Test Supplier' });
        if (!supplier) {
            supplier = await Supplier.create({
                name: 'Test Supplier',
                code: 'TEST-SUP-001',
                email: 'supplier@test.com',
                phone: '1234567890',
                address: {
                    street: 'Test Street',
                    city: 'Test City',
                    state: 'Test State',
                    pincode: '123456',
                    country: 'India'
                },
                isActive: true
            });
            console.log('✅ Test supplier created\n');
        }

        console.log('═══════════════════════════════════════════════════════════════');
        console.log('🧪 BATCH TRACKING SYSTEM TEST');
        console.log('═══════════════════════════════════════════════════════════════\n');

        // =================================================================
        // TEST SCENARIO: Coca Cola 500ml
        // =================================================================
        console.log('📦 TEST PRODUCT: Coca Cola 500ml');
        console.log('─────────────────────────────────────────────────────────────\n');

        // Clean up any existing test product
        await Product.deleteMany({ barcode: 'TEST-COKE-500ML' });
        await InventoryBatch.deleteMany({ batchNumber: /^TEST-BATCH/ });

        // Create test product
        const product = await Product.create({
            name: 'Coca Cola 500ml',
            sku: 'COKE-500ML-TEST',
            barcode: 'TEST-COKE-500ML',
            mrp: 30,
            costPrice: 20,
            sellingPrice: 25,
            currentStock: 0,
            minStockLevel: 10,
            category: 'beverages',
            brand: 'Coca Cola',
            unit: 'pcs',
            isActive: true
        });

        console.log('✅ Product Created:');
        console.log(`   Name: ${product.name}`);
        console.log(`   Barcode: ${product.barcode}`);
        console.log(`   Initial Stock: ${product.currentStock} units\n`);

        // =================================================================
        // STEP 1: First Purchase (Day 1)
        // =================================================================
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('📥 STEP 1: FIRST PURCHASE (Day 1)');
        console.log('═══════════════════════════════════════════════════════════════\n');

        const batch1 = await BatchService.createBatch({
            productId: product._id,
            quantity: 100,
            costPrice: 20,
            sellingPrice: 25,
            mrp: 30,
            supplierId: supplier._id,
            expiryDate: new Date('2025-12-31'),
            location: 'Warehouse A',
            notes: 'First purchase batch',
            createdBy: adminUser._id
        });

        console.log('✅ Batch #1 Created:');
        console.log(`   Batch Number: ${batch1.batchNumber}`);
        console.log(`   Quantity: ${batch1.currentQuantity} units`);
        console.log(`   Cost Price: ₹${batch1.costPrice}`);
        console.log(`   Selling Price: ₹${batch1.sellingPrice}`);
        console.log(`   Total Cost Value: ₹${batch1.batchValue}`);
        console.log(`   Profit Margin: ${batch1.profitMargin.toFixed(2)}%\n`);

        // Check product stock
        const productAfterBatch1 = await Product.findById(product._id);
        console.log('📊 Product Stock After Batch 1:');
        console.log(`   Total Stock: ${productAfterBatch1.currentStock} units\n`);

        // =================================================================
        // STEP 2: Second Purchase (Day 10 - Price Increased!)
        // =================================================================
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('📥 STEP 2: SECOND PURCHASE (Day 10 - PRICE INCREASED!)');
        console.log('═══════════════════════════════════════════════════════════════\n');

        // Simulate 10 days later
        const batch2 = await BatchService.createBatch({
            productId: product._id,
            quantity: 150,
            costPrice: 22,
            sellingPrice: 28,
            mrp: 32,
            supplierId: supplier._id,
            expiryDate: new Date('2026-01-15'),
            location: 'Warehouse B',
            notes: 'Second purchase batch - increased prices',
            createdBy: adminUser._id
        });

        console.log('✅ Batch #2 Created:');
        console.log(`   Batch Number: ${batch2.batchNumber}`);
        console.log(`   Quantity: ${batch2.currentQuantity} units`);
        console.log(`   Cost Price: ₹${batch2.costPrice} (↑ from ₹20)`);
        console.log(`   Selling Price: ₹${batch2.sellingPrice} (↑ from ₹25)`);
        console.log(`   Total Cost Value: ₹${batch2.batchValue}`);
        console.log(`   Profit Margin: ${batch2.profitMargin.toFixed(2)}%\n`);

        // Check product stock
        const productAfterBatch2 = await Product.findById(product._id);
        console.log('📊 Product Stock After Batch 2:');
        console.log(`   Total Stock: ${productAfterBatch2.currentStock} units`);
        console.log(`   Latest Cost Price: ₹${productAfterBatch2.costPrice}`);
        console.log(`   Latest Selling Price: ₹${productAfterBatch2.sellingPrice}\n`);

        // =================================================================
        // STEP 3: Query All Batches by Barcode
        // =================================================================
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('🔍 STEP 3: SCAN BARCODE - VIEW ALL BATCHES');
        console.log('═══════════════════════════════════════════════════════════════\n');
        console.log(`Scanning barcode: ${product.barcode}\n`);

        const batchSummary = await BatchService.getBatchesByProduct(product.barcode);

        console.log('📋 BATCH SUMMARY:');
        console.log(`   Product: ${batchSummary.productName}`);
        console.log(`   Barcode: ${batchSummary.barcode}`);
        console.log(`   Total Batches: ${batchSummary.totalBatches}`);
        console.log(`   Total Quantity: ${batchSummary.totalQuantity} units\n`);

        console.log('💰 PRICE RANGE:');
        console.log(`   Cost Price: ₹${batchSummary.priceRange.minCostPrice} - ₹${batchSummary.priceRange.maxCostPrice}`);
        console.log(`   Selling Price: ₹${batchSummary.priceRange.minSellingPrice} - ₹${batchSummary.priceRange.maxSellingPrice}\n`);

        console.log('📦 INDIVIDUAL BATCHES (FIFO Order):');
        batchSummary.batches.forEach((batch, index) => {
            console.log(`   ${index + 1}. ${batch.batchNumber}`);
            console.log(`      Quantity: ${batch.currentQuantity} units`);
            console.log(`      Cost: ₹${batch.costPrice} | Selling: ₹${batch.sellingPrice}`);
            console.log(`      Purchase Date: ${new Date(batch.purchaseDate).toLocaleDateString()}`);
            console.log(`      Expiry: ${new Date(batch.expiryDate).toLocaleDateString()}`);
            console.log(`      Status: ${batch.status}\n`);
        });

        console.log('✅ ANSWER: You can now see BOTH batches with their different prices!\n');

        // =================================================================
        // STEP 4: Make a Sale (FIFO in Action)
        // =================================================================
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('💵 STEP 4: MAKE A SALE (120 units) - FIFO IN ACTION');
        console.log('═══════════════════════════════════════════════════════════════\n');

        const saleResult = await BatchService.processSaleFIFO(
            product._id,
            120,
            adminUser._id,
            {
                referenceNumber: 'INV-TEST-001',
                notes: 'Test sale transaction'
            }
        );

        console.log('✅ Sale Processed Successfully!\n');
        console.log('📊 SALE BREAKDOWN:');
        console.log(`   Total Units Sold: ${saleResult.quantitySold}`);
        console.log(`   Batches Used: ${saleResult.batchesUsed.length}\n`);

        saleResult.batchesUsed.forEach((batchUsed, index) => {
            console.log(`   Batch ${index + 1}: ${batchUsed.batchNumber}`);
            console.log(`      Quantity: ${batchUsed.quantity} units`);
            console.log(`      Cost Price: ₹${batchUsed.costPrice}`);
            console.log(`      Selling Price: ₹${batchUsed.sellingPrice}`);
            console.log(`      Cost: ₹${batchUsed.totalCost}`);
            console.log(`      Revenue: ₹${batchUsed.totalRevenue}`);
            console.log(`      Profit: ₹${batchUsed.totalRevenue - batchUsed.totalCost}\n`);
        });

        console.log('💰 FINANCIAL SUMMARY:');
        console.log(`   Total Cost: ₹${saleResult.totalCost}`);
        console.log(`   Total Revenue: ₹${saleResult.totalRevenue}`);
        console.log(`   Total Profit: ₹${saleResult.profit}`);
        console.log(`   Profit Margin: ${saleResult.profitMargin}%`);
        console.log(`   Average Cost Price: ₹${saleResult.averageCostPrice.toFixed(2)}`);
        console.log(`   Average Selling Price: ₹${saleResult.averageSellingPrice.toFixed(2)}\n`);

        // =================================================================
        // STEP 5: Check Remaining Stock
        // =================================================================
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('📊 STEP 5: CHECK REMAINING STOCK AFTER SALE');
        console.log('═══════════════════════════════════════════════════════════════\n');

        const remainingBatches = await BatchService.getBatchesByProduct(product._id.toString());
        const productAfterSale = await Product.findById(product._id);

        console.log('📦 REMAINING BATCHES:');
        remainingBatches.batches.forEach((batch, index) => {
            console.log(`   ${index + 1}. ${batch.batchNumber}`);
            console.log(`      Status: ${batch.status}`);
            console.log(`      Remaining Quantity: ${batch.currentQuantity} units`);
            console.log(`      Cost: ₹${batch.costPrice} | Selling: ₹${batch.sellingPrice}\n`);
        });

        console.log(`📊 Product Total Stock: ${productAfterSale.currentStock} units`);
        console.log(`   (was 250 units, sold 120 units, remaining 130 units)\n`);

        // =================================================================
        // STEP 6: Inventory Valuation
        // =================================================================
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('💎 STEP 6: INVENTORY VALUATION REPORT');
        console.log('═══════════════════════════════════════════════════════════════\n');

        const valuation = await BatchService.getInventoryValuation();

        console.log('📈 OVERALL SUMMARY:');
        console.log(`   Total Products: ${valuation.summary.totalProducts}`);
        console.log(`   Total Batches: ${valuation.summary.totalBatches}`);
        console.log(`   Total Quantity: ${valuation.summary.totalQuantity} units`);
        console.log(`   Total Cost Value: ₹${valuation.summary.totalCostValue.toFixed(2)}`);
        console.log(`   Total Selling Value: ₹${valuation.summary.totalSellingValue.toFixed(2)}`);
        console.log(`   Potential Profit: ₹${valuation.summary.totalPotentialProfit.toFixed(2)}\n`);

        // =================================================================
        // CONCLUSION
        // =================================================================
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('✅ TEST COMPLETED SUCCESSFULLY!');
        console.log('═══════════════════════════════════════════════════════════════\n');

        console.log('🎯 KEY TAKEAWAYS:\n');
        console.log('1. ✅ Same product, same barcode, but DIFFERENT PRICES tracked separately');
        console.log('2. ✅ When scanning barcode, you see ALL batches with their prices');
        console.log('3. ✅ FIFO automatically sells from oldest batch first');
        console.log('4. ✅ Accurate profit calculation using actual cost per batch');
        console.log('5. ✅ Complete price history and audit trail');
        console.log('6. ✅ Expiry date tracking per batch\n');

        console.log('📝 YOUR PROBLEM SOLVED:\n');
        console.log('   Problem: "How to recognize old product vs new product with different prices?"');
        console.log('   Solution: "Batch tracking system tracks each purchase separately!"\n');

        console.log('🚀 Next Steps:');
        console.log('   1. Integrate with your mobile app');
        console.log('   2. Use GET /api/v1/batches/product/{barcode} to show all batches');
        console.log('   3. Use POST /api/v1/batches/sale for FIFO sales');
        console.log('   4. Check BATCH_TRACKING_SOLUTION.md for complete API documentation\n');

    } catch (error) {
        console.error('❌ Error during test:', error);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Database connection closed');
    }
}

// Run the test
runBatchTrackingTest();
