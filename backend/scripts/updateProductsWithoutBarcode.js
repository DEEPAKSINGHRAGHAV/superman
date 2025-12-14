/**
 * Update Products Without Barcode Script
 * 
 * This script finds all products that don't have a barcode and assigns them
 * sequential barcodes using the current barcode management system.
 * 
 * Features:
 * - Automatically takes MongoDB backup before making changes
 * - Shows count and list of all products that will be updated
 * - Asks for confirmation (Y/N) before proceeding
 * - Only updates products without barcodes (null, undefined, or empty string)
 * - Uses atomic barcode generation to prevent duplicates
 * - Processes products in batches for efficiency
 * - Provides detailed progress reporting
 * - Safe to run multiple times (idempotent)
 * 
 * Usage: node scripts/updateProductsWithoutBarcode.js
 * 
 * Options:
 *   --skip-backup    Skip the automatic backup step
 */

// Load environment variables from config.env
const path = require('path');
const fs = require('fs');
const readline = require('readline');
const { execSync } = require('child_process');

// Try multiple possible paths for config.env
const possiblePaths = [
    path.join(__dirname, '..', 'config.env'),  // From scripts/ directory
    path.join(process.cwd(), 'config.env'),   // From current working directory
    './config.env'                             // Relative path
];

let configPath = null;
for (const possiblePath of possiblePaths) {
    if (fs.existsSync(possiblePath)) {
        configPath = possiblePath;
        break;
    }
}

if (!configPath) {
    console.error('❌ config.env file not found!');
    console.error('   Tried paths:');
    possiblePaths.forEach(p => console.error(`     - ${p}`));
    process.exit(1);
}

require('dotenv').config({ path: configPath });

const mongoose = require('mongoose');
const Product = require('../models/Product');
const BarcodeService = require('../services/barcodeService');

// Configuration
const BATCH_SIZE = 100; // Process products in batches
const MAX_RETRIES = 3; // Maximum retries for failed updates
const SKIP_BACKUP = process.argv.includes('--skip-backup');

/**
 * Create MongoDB backup using mongodump
 * @returns {Promise<string>} Path to backup folder
 */
const createBackup = async () => {
    const mongoUri = process.env.MONGODB_URI;
    
    if (!mongoUri) {
        throw new Error('MONGODB_URI not found');
    }

    // Create backup folder with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupDir = path.join(__dirname, '..', 'backups', `backup_${timestamp}`);
    
    // Ensure backups directory exists
    const backupsDir = path.join(__dirname, '..', 'backups');
    if (!fs.existsSync(backupsDir)) {
        fs.mkdirSync(backupsDir, { recursive: true });
    }

    console.log('\n💾 CREATING DATABASE BACKUP...');
    console.log('─'.repeat(50));
    console.log(`   Backup location: ${backupDir}`);
    
    try {
        // Run mongodump command
        const command = `mongodump --uri="${mongoUri}" --out="${backupDir}"`;
        
        console.log('   Running mongodump...');
        execSync(command, { 
            stdio: ['pipe', 'pipe', 'pipe'],
            timeout: 300000 // 5 minute timeout
        });
        
        console.log('   ✅ Backup completed successfully!');
        console.log('─'.repeat(50));
        
        return backupDir;
    } catch (error) {
        // Check if mongodump is installed
        if (error.message.includes('command not found') || error.message.includes('not recognized')) {
            console.log('   ⚠️  mongodump not found. Please install MongoDB Database Tools.');
            console.log('   📥 Download: https://www.mongodb.com/try/download/database-tools');
            throw new Error('mongodump not installed');
        }
        
        console.error('   ❌ Backup failed:', error.message);
        throw error;
    }
};

/**
 * Prompt user for confirmation
 * @param {string} question - Question to ask
 * @returns {Promise<boolean>} True if user confirms
 */
const askConfirmation = (question) => {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            const normalized = answer.trim().toLowerCase();
            resolve(normalized === 'y' || normalized === 'yes');
        });
    });
};

/**
 * Connect to MongoDB
 */
const connectDB = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI;
        
        if (!mongoUri) {
            console.error('❌ MONGODB_URI not found in environment variables!');
            process.exit(1);
        }
        
        console.log('🔗 Connecting to MongoDB...');
        const maskedUri = mongoUri.replace(/:[^:@]+@/, ':****@');
        console.log(`📋 URI (masked): ${maskedUri}`);
        
        await mongoose.connect(mongoUri);
        
        console.log('✅ Connected to MongoDB');
        console.log(`📊 Database: ${mongoose.connection.db.databaseName}`);
    } catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
        process.exit(1);
    }
};

/**
 * Check if a product has a valid barcode
 */
const hasBarcode = (product) => {
    if (!product || product.barcode === null || product.barcode === undefined) {
        return false;
    }
    if (typeof product.barcode === 'string' && product.barcode.trim().length > 0) {
        return true;
    }
    return false;
};

/**
 * Get query for products without barcodes
 */
const getQueryForProductsWithoutBarcode = () => {
    return {
        $or: [
            { barcode: { $exists: false } },
            { barcode: null },
            { barcode: '' }
        ]
    };
};

/**
 * Update a single product with a new barcode
 */
const updateProductBarcode = async (product, barcode) => {
    try {
        const currentProduct = await Product.findById(product._id).select('barcode').lean();
        
        if (!currentProduct) {
            return { success: false, reason: 'not_found' };
        }
        
        if (hasBarcode(currentProduct)) {
            return { success: false, reason: 'already_has_barcode', barcode: currentProduct.barcode };
        }

        await Product.findByIdAndUpdate(
            product._id,
            { $set: { barcode: barcode } },
            { runValidators: true }
        );

        return { success: true };
    } catch (error) {
        if (error.code === 11000 || error.message?.includes('duplicate key')) {
            return { success: false, reason: 'duplicate', error: error.message };
        }
        throw error;
    }
};

/**
 * Main function to update products without barcodes
 */
const updateProductsWithoutBarcode = async () => {
    console.log('\n' + '═'.repeat(70));
    console.log('          BARCODE ASSIGNMENT SCRIPT');
    console.log('═'.repeat(70) + '\n');

    const query = getQueryForProductsWithoutBarcode();

    // Get counts
    const totalProducts = await Product.countDocuments({});
    const productsWithBarcode = await Product.countDocuments({ 
        barcode: { $exists: true, $ne: null, $ne: '' } 
    });
    const productsWithoutBarcode = await Product.countDocuments(query);

    console.log('📊 PRODUCT SUMMARY:');
    console.log('─'.repeat(50));
    console.log(`   Total products in database:     ${totalProducts}`);
    console.log(`   Products WITH barcodes:         ${productsWithBarcode}`);
    console.log(`   Products WITHOUT barcodes:      ${productsWithoutBarcode}`);
    console.log('─'.repeat(50));

    if (productsWithoutBarcode === 0) {
        console.log('\n✅ All products already have barcodes! Nothing to do.\n');
        return;
    }

    // Fetch ALL products without barcodes
    console.log(`\n📋 LIST OF PRODUCTS WITHOUT BARCODES (${productsWithoutBarcode} products):`);
    console.log('─'.repeat(70));
    
    const allProductsWithoutBarcode = await Product.find(query)
        .select('name sku category')
        .sort({ name: 1 })
        .lean();

    // Display all products in a table format
    console.log(`${'#'.padStart(5)} | ${'SKU'.padEnd(20)} | ${'Name'.padEnd(40)}`);
    console.log('─'.repeat(70));
    
    allProductsWithoutBarcode.forEach((product, index) => {
        const num = String(index + 1).padStart(5);
        const sku = (product.sku || 'N/A').substring(0, 20).padEnd(20);
        const name = (product.name || 'N/A').substring(0, 40).padEnd(40);
        console.log(`${num} | ${sku} | ${name}`);
    });
    
    console.log('─'.repeat(70));
    console.log(`\n⚠️  This will assign barcodes to ${productsWithoutBarcode} products.`);
    console.log('   Each product will get a unique EAN-13 barcode with prefix "21".');
    
    if (SKIP_BACKUP) {
        console.log('   ⚠️  Backup will be SKIPPED (--skip-backup flag detected).\n');
    } else {
        console.log('   💾 A database backup will be created before proceeding.\n');
    }

    // Ask for confirmation
    const confirmed = await askConfirmation('Do you want to proceed? (Y/N): ');

    if (!confirmed) {
        console.log('\n❌ Operation cancelled by user.\n');
        return;
    }

    // Create backup before making changes
    if (!SKIP_BACKUP) {
        try {
            const backupPath = await createBackup();
            console.log(`\n📁 Backup saved to: ${backupPath}`);
        } catch (backupError) {
            console.error('\n❌ Backup failed:', backupError.message);
            const proceedWithoutBackup = await askConfirmation('\n⚠️  Do you want to proceed WITHOUT backup? (Y/N): ');
            if (!proceedWithoutBackup) {
                console.log('\n❌ Operation cancelled. Please install mongodump and try again.\n');
                return;
            }
            console.log('\n⚠️  Proceeding without backup...');
        }
    } else {
        console.log('\n⚠️  Skipping backup as requested...');
    }

    console.log('\n🚀 Starting barcode assignment...\n');

    // Process products
    const stats = {
        success: 0,
        skipped: 0,
        failed: 0,
        errors: []
    };

    for (let i = 0; i < allProductsWithoutBarcode.length; i++) {
        const product = allProductsWithoutBarcode[i];
        const progress = `[${i + 1}/${allProductsWithoutBarcode.length}]`;

        try {
            // Generate barcode with retry logic
            let barcode;
            let retries = 0;
            let generated = false;

            while (retries < MAX_RETRIES && !generated) {
                try {
                    barcode = await BarcodeService.generateNextBarcode();
                    generated = true;
                } catch (error) {
                    retries++;
                    if (retries >= MAX_RETRIES) {
                        throw new Error(`Failed to generate barcode: ${error.message}`);
                    }
                    await new Promise(resolve => setTimeout(resolve, 100 * retries));
                }
            }

            // Update product
            const result = await updateProductBarcode(product, barcode);
            
            if (result.success) {
                console.log(`${progress} ✅ ${product.sku} → ${barcode}`);
                stats.success++;
            } else if (result.reason === 'already_has_barcode') {
                console.log(`${progress} ⏭️  ${product.sku} (already has: ${result.barcode})`);
                stats.skipped++;
            } else {
                console.log(`${progress} ⚠️  ${product.sku} - ${result.reason}`);
                stats.skipped++;
            }

        } catch (error) {
            console.error(`${progress} ❌ ${product.sku} - Error: ${error.message}`);
            stats.failed++;
            stats.errors.push({
                sku: product.sku,
                name: product.name,
                error: error.message
            });
        }

        // Small delay every 50 products to avoid overwhelming the database
        if ((i + 1) % 50 === 0) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    // Print summary
    console.log('\n' + '═'.repeat(70));
    console.log('📊 FINAL SUMMARY');
    console.log('═'.repeat(70));
    console.log(`   ✅ Successfully updated:  ${stats.success} products`);
    console.log(`   ⏭️  Skipped:               ${stats.skipped} products`);
    console.log(`   ❌ Failed:                 ${stats.failed} products`);
    console.log('═'.repeat(70));

    if (stats.errors.length > 0) {
        console.log('\n❌ ERRORS:');
        stats.errors.forEach((err, idx) => {
            console.log(`   ${idx + 1}. ${err.sku} - ${err.error}`);
        });
    }

    // Verify results
    const remainingCount = await Product.countDocuments(query);
    if (remainingCount > 0) {
        console.log(`\n⚠️  ${remainingCount} products still don't have barcodes.`);
    } else {
        console.log('\n✅ All products now have barcodes!');
    }
};

/**
 * Main execution
 */
const main = async () => {
    try {
        await connectDB();
        await updateProductsWithoutBarcode();
    } catch (error) {
        console.error('\n❌ Script failed:', error.message);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('\n✅ Database connection closed\n');
        process.exit(0);
    }
};

// Run the script
main();
