/**
 * Sync Barcode Counter Script
 * 
 * This script syncs the barcode counter with existing barcodes in the database.
 * It finds the highest sequence number from existing barcodes and sets the counter to that value.
 * 
 * Usage: node scripts/syncBarcodeCounter.js
 */

require('dotenv').config({ path: './config.env' });
const mongoose = require('mongoose');
const Product = require('../models/Product');
const BarcodeCounter = require('../models/BarcodeCounter');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shivik_mart', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✅ Connected to MongoDB');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
};

const syncCounter = async () => {
    try {
        console.log('🔄 Syncing barcode counter with existing barcodes...\n');

        // Find all products with barcodes starting with "21" (internal barcodes)
        const products = await Product.find({
            barcode: { 
                $regex: /^21\d{11}$/, // EAN-13 with prefix 21
                $exists: true, 
                $ne: null 
            }
        })
        .select('barcode')
        .lean();

        console.log(`📊 Found ${products.length} products with prefix "21" barcodes`);

        if (products.length === 0) {
            // No existing barcodes, set counter to 0
            await BarcodeCounter.findByIdAndUpdate(
                'barcode_sequence',
                { sequence: 0 },
                { upsert: true }
            );
            console.log('✅ Counter set to 0 (no existing barcodes)');
            return;
        }

        // Extract sequence numbers from barcodes
        const sequences = products
            .map(product => {
                const barcode = product.barcode;
                if (!barcode || barcode.length !== 13 || !barcode.startsWith('21')) {
                    return null;
                }
                // Extract sequence (digits 2-12, which is 10 digits)
                const sequenceStr = barcode.substring(2, 12);
                return parseInt(sequenceStr, 10);
            })
            .filter(seq => seq !== null && !isNaN(seq));

        if (sequences.length === 0) {
            console.log('⚠️ No valid sequences found, setting counter to 0');
            await BarcodeCounter.findByIdAndUpdate(
                'barcode_sequence',
                { sequence: 0 },
                { upsert: true }
            );
            return;
        }

        // Find maximum sequence
        const maxSequence = Math.max(...sequences);
        console.log(`📈 Maximum sequence found: ${maxSequence}`);

        // Set counter to max sequence (next barcode will be maxSequence + 1)
        await BarcodeCounter.findByIdAndUpdate(
            'barcode_sequence',
            { sequence: maxSequence },
            { upsert: true }
        );

        console.log(`✅ Counter synced to sequence: ${maxSequence}`);
        console.log(`📝 Next barcode will be: ${maxSequence + 1}`);
        console.log(`🔢 Next barcode value: 21${String(maxSequence + 1).padStart(10, '0')}...`);

    } catch (error) {
        console.error('❌ Error syncing counter:', error);
        throw error;
    }
};

const main = async () => {
    await connectDB();
    await syncCounter();
    await mongoose.connection.close();
    console.log('\n✅ Sync complete!');
    process.exit(0);
};

main();

