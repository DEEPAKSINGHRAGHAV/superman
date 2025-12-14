/**
 * Update Products Without Barcode Script
 * 
 * This script finds all products that don't have a barcode and assigns them
 * sequential barcodes using the current barcode management system.
 * 
 * Features:
 * - Only updates products without barcodes (null, undefined, or empty string)
 * - Uses atomic barcode generation to prevent duplicates
 * - Processes products in batches for efficiency
 * - Provides detailed progress reporting
 * - Handles errors gracefully with retry logic
 * - Safe to run multiple times (idempotent)
 * 
 * Usage: node scripts/updateProductsWithoutBarcode.js
 */

// Load environment variables from config.env
const path = require('path');
const fs = require('fs');

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

// Debug: Check if MONGODB_URI is loaded
console.log('🔍 Environment check:');
console.log(`   Config file: ${configPath}`);
console.log(`   File exists: ${fs.existsSync(configPath) ? '✅' : '❌'}`);
console.log(`   MONGODB_URI loaded: ${process.env.MONGODB_URI ? '✅ Yes' : '❌ No'}`);
if (process.env.MONGODB_URI) {
    const maskedUri = process.env.MONGODB_URI.replace(/:[^:@]+@/, ':****@');
    console.log(`   URI (masked): ${maskedUri}`);
} else {
    console.error('   ⚠️  MONGODB_URI is not set!');
    console.error('   Please check your config.env file.');
}
console.log('');

const mongoose = require('mongoose');
const Product = require('../models/Product');
const BarcodeService = require('../services/barcodeService');

// Configuration
const BATCH_SIZE = 100; // Process products in batches
const MAX_RETRIES = 3; // Maximum retries for failed updates

/**
 * Connect to MongoDB
 */
const connectDB = async () => {
    try {
        // Load environment variables
        const mongoUri = process.env.MONGODB_URI;
        
        if (!mongoUri) {
            console.error('❌ MONGODB_URI not found in environment variables!');
            console.error('   Please check your config.env file.');
            console.error('   Current working directory:', process.cwd());
            process.exit(1);
        }
        
        console.log('🔗 Connecting to MongoDB...');
        console.log(`📋 URI (masked): ${mongoUri.replace(/:[^:@]+@/, ':****@')}`);
        
        await mongoose.connect(mongoUri);
        
        const dbName = mongoose.connection.db.databaseName;
        const dbHost = mongoose.connection.host;
        console.log('✅ Connected to MongoDB');
        console.log(`📊 Database name: ${dbName}`);
        console.log(`📊 Database host: ${dbHost}`);
    } catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
        console.error('   Please verify your MONGODB_URI in config.env is correct.');
        process.exit(1);
    }
};

/**
 * Check if a product has a valid barcode
 * @param {Object} product - Product document
 * @returns {boolean} True if product has a valid barcode
 */
const hasBarcode = (product) => {
    // Handle case where barcode key doesn't exist (undefined)
    // Handle case where barcode is null
    // Handle case where barcode is empty string
    if (!product || product.barcode === null || product.barcode === undefined) {
        return false;
    }
    
    // Check if it's a non-empty string
    if (typeof product.barcode === 'string' && product.barcode.trim().length > 0) {
        return true;
    }
    
    return false;
};

/**
 * Update a single product with a new barcode
 * @param {Object} product - Product document
 * @param {string} barcode - Generated barcode
 * @returns {Promise<boolean>} True if update was successful
 */
const updateProductBarcode = async (product, barcode) => {
    try {
        // Double-check that product still doesn't have a barcode (race condition protection)
        // Use lean() to get raw document - if barcode key doesn't exist, it won't be in the object
        const currentProduct = await Product.findById(product._id).select('barcode').lean();
        
        if (!currentProduct) {
            console.log(`   ⚠️  Product ${product._id} not found`);
            return false;
        }
        
        if (hasBarcode(currentProduct)) {
            console.log(`   ⚠️  Product ${product._id} already has barcode: ${currentProduct.barcode}`);
            return false;
        }

        // Update product with new barcode
        // This will add the barcode field if it doesn't exist, or update it if it's null/empty
        await Product.findByIdAndUpdate(
            product._id,
            { $set: { barcode: barcode } },
            { runValidators: true, upsert: false }
        );

        return true;
    } catch (error) {
        // Handle duplicate key error (shouldn't happen with atomic generation, but safety check)
        if (error.code === 11000 || error.message?.includes('duplicate key')) {
            console.error(`   ❌ Duplicate barcode error for product ${product._id}: ${barcode}`);
            return false;
        }
        throw error;
    }
};

/**
 * Process a batch of products
 * @param {Array} products - Array of product documents
 * @param {number} batchNumber - Current batch number
 * @param {number} totalProducts - Total number of products to process
 * @returns {Promise<Object>} Statistics about the batch
 */
const processBatch = async (products, batchNumber, totalProducts) => {
    const stats = {
        success: 0,
        skipped: 0,
        failed: 0,
        errors: []
    };

    console.log(`\n📦 Processing batch ${batchNumber} (${products.length} products)...`);

    for (let i = 0; i < products.length; i++) {
        const product = products[i];
        const productNumber = (batchNumber - 1) * BATCH_SIZE + i + 1;
        const progress = `[${productNumber}/${totalProducts}]`;

        try {
            // Double-check product doesn't have barcode
            if (hasBarcode(product)) {
                console.log(`   ${progress} ⏭️  Skipped "${product.name}" (${product.sku}): Already has barcode`);
                stats.skipped++;
                continue;
            }

            // Generate barcode using the service (atomic, no duplicates)
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
                        throw new Error(`Failed to generate barcode after ${MAX_RETRIES} attempts: ${error.message}`);
                    }
                    console.log(`   ${progress} ⚠️  Retry ${retries}/${MAX_RETRIES} for "${product.name}"`);
                    // Wait a bit before retry (exponential backoff)
                    await new Promise(resolve => setTimeout(resolve, 100 * retries));
                }
            }

            // Update product with barcode
            const updated = await updateProductBarcode(product, barcode);
            
            if (updated) {
                console.log(`   ${progress} ✅ Updated "${product.name}" (${product.sku}): ${barcode}`);
                stats.success++;
            } else {
                stats.skipped++;
            }

        } catch (error) {
            console.error(`   ${progress} ❌ Error processing "${product.name}" (${product.sku}):`, error.message);
            stats.failed++;
            stats.errors.push({
                productId: product._id,
                productName: product.name,
                sku: product.sku,
                error: error.message
            });
        }
    }

    return stats;
};

/**
 * Main function to update products without barcodes
 */
const updateProductsWithoutBarcode = async () => {
    try {
        console.log('🔄 Starting barcode update for products without barcodes...\n');

        // Diagnostic: Check total products and barcode distribution
        const dbName = mongoose.connection.db.databaseName;
        const collectionName = Product.collection.name;
        
        console.log(`📊 Database: ${dbName}`);
        console.log(`📊 Collection: ${collectionName}`);
        
        // List all collections to verify we're in the right database
        try {
            const collections = await mongoose.connection.db.listCollections().toArray();
            const collectionNames = collections.map(c => c.name).sort();
            console.log(`📊 Available collections (${collectionNames.length}): ${collectionNames.join(', ')}`);
        } catch (e) {
            console.log(`⚠️  Could not list collections: ${e.message}`);
        }
        
        const totalProducts = await Product.countDocuments({});
        console.log(`📊 Total products in collection "${collectionName}": ${totalProducts}`);
        
        if (totalProducts === 0) {
            console.log('\n⚠️  No products found in database. Possible issues:');
            console.log(`   1. Wrong database? Current: ${dbName}`);
            console.log(`   2. Wrong collection? Current: ${collectionName}`);
            console.log(`   3. Products in different collection?`);
            console.log(`   4. Check MongoDB Compass - what database/collection are you querying?`);
            console.log('\n💡 To fix:');
            console.log(`   - Verify MONGODB_URI in config.env matches your Compass connection`);
            console.log(`   - Check if collection name in Compass matches "${collectionName}"`);
            return;
        }
        
        // Try different query approaches to find products without barcodes
        // Approach 1: Using $or with $exists: false, null, and empty string
        // This is the most straightforward - finds products where:
        // - barcode key doesn't exist at all
        // - barcode key exists but is null
        // - barcode key exists but is empty string
        let query1 = {
            $or: [
                { barcode: { $exists: false } },  // Key doesn't exist (like your example)
                { barcode: null },                // Key exists but is null
                { barcode: '' }                   // Key exists but is empty string
            ]
        };
        
        // Approach 2: Using $in for null and empty (sometimes more reliable)
        let query2 = {
            $or: [
                { barcode: { $exists: false } },
                { barcode: { $in: [null, ''] } }
            ]
        };
        
        // Approach 3: Using $nor to exclude products WITH valid barcodes
        // This finds all products that DON'T have a valid barcode
        let query3 = {
            $nor: [
                { barcode: { $exists: true, $ne: null, $ne: '' } }
            ]
        };
        
        // Test each query
        let count1 = 0, count2 = 0, count3 = 0;
        try {
            count1 = await Product.countDocuments(query1);
            console.log(`✅ Query 1 test: Found ${count1} products`);
        } catch (e) {
            console.log(`❌ Query 1 failed: ${e.message}`);
        }
        
        try {
            count2 = await Product.countDocuments(query2);
            console.log(`✅ Query 2 test: Found ${count2} products`);
        } catch (e) {
            console.log(`❌ Query 2 failed: ${e.message}`);
        }
        
        try {
            count3 = await Product.countDocuments(query3);
            console.log(`✅ Query 3 test: Found ${count3} products`);
        } catch (e) {
            console.log(`❌ Query 3 failed: ${e.message}`);
        }
        
        // Direct test: Find products where barcode key doesn't exist (like your example)
        let countNoKey = 0;
        try {
            countNoKey = await Product.countDocuments({ barcode: { $exists: false } });
            console.log(`✅ Direct test (no barcode key): Found ${countNoKey} products\n`);
        } catch (e) {
            console.log(`❌ Direct test failed: ${e.message}\n`);
        }
        
        // Count products with valid barcodes
        let productsWithBarcode = 0;
        try {
            productsWithBarcode = await Product.countDocuments({ 
                barcode: { $exists: true, $ne: null, $ne: '' } 
            });
        } catch (e) {
            console.log(`⚠️  Count with barcode failed: ${e.message}`);
        }
        
        // Count products where barcode key doesn't exist
        let productsWithoutBarcodeKey = 0;
        try {
            productsWithoutBarcodeKey = await Product.countDocuments({ 
                barcode: { $exists: false } 
            });
        } catch (e) {
            console.log(`⚠️  Count without key failed: ${e.message}`);
        }
        
        // Count products where barcode key exists but is null
        let productsWithNullBarcode = 0;
        try {
            productsWithNullBarcode = await Product.countDocuments({ 
                barcode: null 
            });
        } catch (e) {
            console.log(`⚠️  Count null barcode failed: ${e.message}`);
        }
        
        // Count products where barcode key exists but is empty string
        let productsWithEmptyBarcode = 0;
        try {
            productsWithEmptyBarcode = await Product.countDocuments({ 
                barcode: '' 
            });
        } catch (e) {
            console.log(`⚠️  Count empty barcode failed: ${e.message}`);
        }
        
        console.log(`\n📊 Breakdown:`);
        console.log(`   Products with valid barcodes: ${productsWithBarcode}`);
        console.log(`   Products without barcode key: ${productsWithoutBarcodeKey} (like your example)`);
        console.log(`   Products with barcode = null: ${productsWithNullBarcode}`);
        console.log(`   Products with barcode = '' (empty): ${productsWithEmptyBarcode}`);
        console.log(`   Products without barcodes (calculated): ${totalProducts - productsWithBarcode}`);
        console.log(`\n📊 Query Results:`);
        console.log(`   Query 1 found: ${count1} products`);
        console.log(`   Query 2 found: ${count2} products`);
        console.log(`   Query 3 found: ${count3} products`);
        console.log(`   Direct test (no key): ${countNoKey} products\n`);

        // Use the query that found the most products (or the simplest one that works)
        const queries = [
            { query: query1, count: count1, name: 'query1 ($or with $exists)' },
            { query: query2, count: count2, name: 'query2 ($or with $in)' },
            { query: query3, count: count3, name: 'query3 ($or with $not)' }
        ];
        
        // Filter out failed queries (count = 0 or error)
        const validQueries = queries.filter(q => q.count > 0);
        
        if (validQueries.length === 0) {
            console.log('❌ All queries returned 0 results. Checking if all products have barcodes...');
            
            // Try to get a sample of products to see what's happening
            const sampleProducts = await Product.find({})
                .select('name sku barcode')
                .limit(10)
                .lean();
            
            if (sampleProducts.length > 0) {
                console.log('\n📋 Sample products from database:');
                sampleProducts.forEach((p, idx) => {
                    const hasKey = 'barcode' in p;
                    const barcodeValue = !hasKey ? 'KEY MISSING' :
                                      p.barcode === null ? 'null' : 
                                      p.barcode === undefined ? 'undefined' : 
                                      p.barcode === '' ? 'empty string ""' : 
                                      `"${p.barcode}"`;
                    console.log(`   ${idx + 1}. ${p.name} (${p.sku}) - barcode: ${barcodeValue}`);
                });
            }
            
            if (productsWithBarcode === totalProducts) {
                console.log('\n✅ All products already have barcodes!');
                return;
            } else {
                console.log('\n⚠️  Unable to find products without barcodes. Please check the query logic.');
                return;
            }
        }
        
        // Use the query with the highest count
        // Deep clone the query to prevent any modifications
        const bestQuery = validQueries.reduce((max, curr) => curr.count > max.count ? curr : max);
        const query = JSON.parse(JSON.stringify(bestQuery.query)); // Deep clone
        const totalCount = bestQuery.count;
        
        console.log(`📊 Using ${bestQuery.name} - found ${totalCount} products without barcodes`);
        console.log(`📋 Query being used:`, JSON.stringify(query, null, 2));
        
        // Verify the query actually finds products by fetching a sample using Mongoose
        const verifyProductsMongoose = await Product.find(query).limit(1).lean();
        console.log(`✅ Mongoose query test: Found ${verifyProductsMongoose.length} product(s)`);
        
        if (verifyProductsMongoose.length > 0) {
            const sample = verifyProductsMongoose[0];
            const hasKey = 'barcode' in sample;
            const barcodeStatus = !hasKey ? 'KEY MISSING' :
                                sample.barcode === null ? 'null' :
                                sample.barcode === undefined ? 'undefined' :
                                sample.barcode === '' ? 'empty string' :
                                `"${sample.barcode}"`;
            console.log(`   Sample product: "${sample.name}" (${sample.sku}) - barcode: ${barcodeStatus}`);
        }
        
        // Also test using native MongoDB collection (bypass Mongoose) for comparison
        try {
            const collection = mongoose.connection.db.collection(Product.collection.name);
            const verifyProductsNative = await collection.find(query).limit(1).toArray();
            console.log(`✅ Native MongoDB query test: Found ${verifyProductsNative.length} product(s)`);
            
            if (verifyProductsNative.length !== verifyProductsMongoose.length) {
                console.log(`\n⚠️  WARNING: Query results differ between Mongoose and native MongoDB!`);
                console.log(`   Mongoose: ${verifyProductsMongoose.length}, Native: ${verifyProductsNative.length}`);
            }
        } catch (nativeError) {
            console.log(`⚠️  Native collection test failed: ${nativeError.message}`);
        }
        
        console.log('');

        // Diagnostic: Get sample products to see what barcode values exist
        // Sample products without barcodes
        try {
            const sampleProductsWithoutBarcode = await Product.find(query)
                .select('name sku barcode')
                .limit(5)
                .lean();
            
            if (sampleProductsWithoutBarcode.length > 0) {
                console.log('📋 Sample products WITHOUT barcodes (first 5):');
                sampleProductsWithoutBarcode.forEach((p, idx) => {
                    const hasKey = 'barcode' in p;
                    const barcodeValue = !hasKey ? 'KEY MISSING' :
                                      p.barcode === null ? 'null' : 
                                      p.barcode === undefined ? 'undefined' : 
                                      p.barcode === '' ? 'empty string ""' : 
                                      `"${p.barcode}"`;
                    console.log(`   ${idx + 1}. ${p.name} (${p.sku}) - barcode: ${barcodeValue}`);
                });
            }
            
            // Sample products with barcodes for comparison
            const sampleProductsWithBarcode = await Product.find({ 
                barcode: { $exists: true, $ne: null, $ne: '' } 
            })
                .select('name sku barcode')
                .limit(3)
                .lean();
            
            if (sampleProductsWithBarcode.length > 0) {
                console.log('\n📋 Sample products WITH barcodes (first 3):');
                sampleProductsWithBarcode.forEach((p, idx) => {
                    console.log(`   ${idx + 1}. ${p.name} (${p.sku}) - barcode: "${p.barcode}"`);
                });
            }
            console.log('');
        } catch (e) {
            console.log(`⚠️  Error getting sample products: ${e.message}\n`);
        }

        if (totalCount === 0) {
            console.log('✅ No products need barcode updates. All products already have barcodes!');
            console.log('\n💡 If you expected to find products, try:');
            console.log('   1. Check if the collection name is correct (should be "products")');
            console.log('   2. Verify the query in MongoDB Compass matches what the script is using');
            console.log('   3. Check if products exist in the database');
            return;
        }

        // Confirm before proceeding (optional - can be removed for automation)
        console.log('\n⚠️  This will update barcodes for all products without barcodes.');
        console.log('   The script is safe to run multiple times (idempotent).\n');

        // Process products in batches
        const totalStats = {
            success: 0,
            skipped: 0,
            failed: 0,
            errors: []
        };

        let batchNumber = 1;
        let skip = 0;
        let hasMore = true;

        while (hasMore) {
            // Fetch batch of products
            let products = [];
            
            // Always use Mongoose, but log the exact query being used
            try {
                products = await Product.find(query)
                    .select('_id name sku barcode')
                    .sort({ createdAt: 1 })
                    .skip(skip)
                    .limit(BATCH_SIZE)
                    .lean();
                
                console.log(`   🔍 Fetched ${products.length} products (skip: ${skip}, limit: ${BATCH_SIZE})`);
                
                // Debug: Show first product's barcode status if any found
                if (products.length > 0) {
                    const firstProduct = products[0];
                    const hasKey = 'barcode' in firstProduct;
                    const barcodeStatus = !hasKey ? 'KEY MISSING' :
                                        firstProduct.barcode === null ? 'null' :
                                        firstProduct.barcode === undefined ? 'undefined' :
                                        firstProduct.barcode === '' ? 'empty string' :
                                        `"${firstProduct.barcode}"`;
                    console.log(`   📝 First product sample: "${firstProduct.name}" - barcode: ${barcodeStatus}`);
                }
            } catch (fetchError) {
                console.error(`   ❌ Error fetching products: ${fetchError.message}`);
                console.error(`   Query used:`, JSON.stringify(query, null, 2));
                hasMore = false;
                break;
            }

            if (products.length === 0) {
                console.log(`   ℹ️  No more products found. Ending batch processing.`);
                hasMore = false;
                break;
            }

            // Process batch
            const batchStats = await processBatch(products, batchNumber, totalCount);

            // Accumulate stats
            totalStats.success += batchStats.success;
            totalStats.skipped += batchStats.skipped;
            totalStats.failed += batchStats.failed;
            totalStats.errors.push(...batchStats.errors);

            // Check if there are more products
            skip += BATCH_SIZE;
            hasMore = products.length === BATCH_SIZE;
            batchNumber++;

            // Small delay between batches to avoid overwhelming the database
            if (hasMore) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        // Print summary
        console.log('\n' + '='.repeat(60));
        console.log('📊 SUMMARY');
        console.log('='.repeat(60));
        console.log(`✅ Successfully updated: ${totalStats.success} products`);
        console.log(`⏭️  Skipped: ${totalStats.skipped} products`);
        console.log(`❌ Failed: ${totalStats.failed} products`);
        console.log(`📦 Total processed: ${totalCount} products`);

        if (totalStats.errors.length > 0) {
            console.log('\n❌ Errors encountered:');
            totalStats.errors.forEach((error, index) => {
                console.log(`   ${index + 1}. Product: "${error.productName}" (SKU: ${error.sku})`);
                console.log(`      Error: ${error.error}`);
            });
        }

        // Verify results
        const remainingCount = await Product.countDocuments(query);
        if (remainingCount > 0) {
            console.log(`\n⚠️  Warning: ${remainingCount} products still don't have barcodes.`);
            console.log('   This might be due to errors or products added during script execution.');
        } else {
            console.log('\n✅ All products now have barcodes!');
        }

        console.log('\n✅ Script completed successfully!');

    } catch (error) {
        console.error('\n❌ Fatal error updating products:', error);
        throw error;
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
        console.error('❌ Script failed:', error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('\n✅ Database connection closed');
        process.exit(0);
    }
};

// Run the script
main();

