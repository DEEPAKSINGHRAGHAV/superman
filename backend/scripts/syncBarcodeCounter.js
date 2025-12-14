/**
 * Sync Barcode Counter Script
 * 
 * This script syncs the barcode counter with existing barcodes in the database.
 * It finds the highest sequence number from existing "21" prefix barcodes and 
 * sets the counter to that value so the next generated barcode continues the sequence.
 * 
 * WHEN TO RUN:
 * ============
 * 1. FRESH DATABASE: Not needed - the system auto-creates counter on first product
 * 
 * 2. DATA MIGRATION: Run ONCE after importing client data that has existing EAN-13 
 *    barcodes with "21" prefix. This ensures new barcodes don't collide with imported ones.
 *    
 *    Example: Client has products with barcodes 2100000000015, 2100000000022, etc.
 *    Running this script will set counter to the highest sequence, so next product
 *    gets the next available sequence.
 * 
 * Usage: 
 *   cd backend
 *   node scripts/syncBarcodeCounter.js
 * 
 * Options:
 *   --dry-run    Show what would happen without making changes
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'config.env') });
const mongoose = require('mongoose');
const Product = require('../models/Product');
const BarcodeCounter = require('../models/BarcodeCounter');

const isDryRun = process.argv.includes('--dry-run');

const connectDB = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/shivik_mart';
        // Mask password in URI for logging (if present)
        const maskedUri = mongoUri.replace(/:([^:@]+)@/, ':****@');
        console.log(`🔗 MongoDB URI: ${maskedUri}`);
        
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
};

/**
 * Calculate EAN-13 check digit for preview
 */
const calculateCheckDigit = (barcode12) => {
    let sum = 0;
    for (let i = 0; i < 12; i++) {
        const digit = parseInt(barcode12[i]);
        sum += (i % 2 === 0) ? digit : digit * 3;
    }
    const remainder = sum % 10;
    return remainder === 0 ? 0 : 10 - remainder;
};

const syncCounter = async () => {
    try {
        console.log('\n🔄 Syncing barcode counter with existing barcodes...');
        if (isDryRun) {
            console.log('   (DRY RUN - no changes will be made)\n');
        } else {
            console.log('');
        }

        // Get current counter value
        const currentCounter = await BarcodeCounter.findById('barcode_sequence');
        console.log(`📊 Current counter value: ${currentCounter?.sequence ?? 'NOT SET (will be created)'}`);

        // Find all products with barcodes starting with "21" (internal barcodes)
        // Use range query for better performance
        const products = await Product.find({
            barcode: { 
                $gte: '2100000000000',
                $lt: '2200000000000',
                $exists: true, 
                $ne: null 
            }
        })
        .select('barcode name')
        .lean();

        console.log(`📦 Found ${products.length} products with "21" prefix barcodes`);

        if (products.length === 0) {
            if (isDryRun) {
                console.log('\n📝 DRY RUN: Would set counter to 0 (no existing barcodes)');
            } else {
                await BarcodeCounter.findByIdAndUpdate(
                    'barcode_sequence',
                    { sequence: 0 },
                    { upsert: true }
                );
                console.log('\n✅ Counter set to 0 (no existing barcodes)');
            }
            console.log('   Next product will get sequence 1 → barcode: 2100000000018');
            return;
        }

        // Extract sequence numbers from barcodes
        const barcodeData = products
            .map(product => {
                const barcode = product.barcode;
                if (!barcode || barcode.length !== 13 || !barcode.startsWith('21')) {
                    return null;
                }
                const sequenceStr = barcode.substring(2, 12);
                const sequence = parseInt(sequenceStr, 10);
                return { barcode, sequence, name: product.name };
            })
            .filter(item => item !== null && !isNaN(item.sequence));

        if (barcodeData.length === 0) {
            console.log('⚠️ No valid sequences found in existing barcodes');
            if (!isDryRun) {
                await BarcodeCounter.findByIdAndUpdate(
                    'barcode_sequence',
                    { sequence: 0 },
                    { upsert: true }
                );
            }
            return;
        }

        // Find maximum sequence
        const maxItem = barcodeData.reduce((max, item) => 
            item.sequence > max.sequence ? item : max
        );
        
        console.log(`\n📈 Highest sequence found:`);
        console.log(`   Sequence: ${maxItem.sequence}`);
        console.log(`   Barcode:  ${maxItem.barcode}`);
        console.log(`   Product:  ${maxItem.name}`);

        // Calculate next barcode for preview
        const nextSequence = maxItem.sequence + 1;
        const nextBarcode12 = '21' + String(nextSequence).padStart(10, '0');
        const nextCheckDigit = calculateCheckDigit(nextBarcode12);
        const nextFullBarcode = nextBarcode12 + nextCheckDigit;

        if (isDryRun) {
            console.log(`\n📝 DRY RUN: Would set counter to ${maxItem.sequence}`);
        } else {
            await BarcodeCounter.findByIdAndUpdate(
                'barcode_sequence',
                { sequence: maxItem.sequence },
                { upsert: true }
            );
            console.log(`\n✅ Counter synced to: ${maxItem.sequence}`);
        }
        
        console.log(`\n📋 Next product will get:`);
        console.log(`   Sequence: ${nextSequence}`);
        console.log(`   Barcode:  ${nextFullBarcode}`);

    } catch (error) {
        console.error('❌ Error syncing counter:', error);
        throw error;
    }
};

const main = async () => {
    console.log('═══════════════════════════════════════════════════════');
    console.log('        BARCODE COUNTER SYNC SCRIPT');
    console.log('═══════════════════════════════════════════════════════');
    
    await connectDB();
    await syncCounter();
    await mongoose.connection.close();
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log(isDryRun ? '   DRY RUN COMPLETE - No changes made' : '   ✅ SYNC COMPLETE');
    console.log('═══════════════════════════════════════════════════════\n');
    process.exit(0);
};

main();

