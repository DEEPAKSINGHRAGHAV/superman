require('dotenv').config({ path: './config.env' });
const mongoose = require('mongoose');
const InventoryBatch = require('../models/InventoryBatch');
const Product = require('../models/Product');

// Connect to database
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✅ MongoDB Connected...\n');
    } catch (err) {
        console.error('❌ MongoDB connection error:', err);
        process.exit(1);
    }
};

// Test date handling
const testDateHandling = () => {
    console.log('=== Testing Date Handling ===\n');

    // Test 1: Today's date normalization
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    console.log('Today (normalized):', today.toISOString());

    // Test 2: Future date
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 3);
    futureDate.setHours(0, 0, 0, 0);
    console.log('Future date (+3 days):', futureDate.toISOString());

    // Test 3: Past date
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 3);
    pastDate.setHours(0, 0, 0, 0);
    console.log('Past date (-3 days):', pastDate.toISOString());

    console.log('\n✅ Date handling working correctly\n');
};

// Test batch expiry logic
const testBatchExpiry = async () => {
    console.log('=== Testing Batch Expiry Logic ===\n');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find batches with different expiry statuses
    const expiredBatches = await InventoryBatch.find({
        status: 'active',
        expiryDate: { $lt: today },
        currentQuantity: { $gt: 0 }
    }).limit(5);

    const expiringSoonBatches = await InventoryBatch.find({
        status: 'active',
        expiryDate: {
            $gte: today,
            $lte: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000)
        },
        currentQuantity: { $gt: 0 }
    }).limit(5);

    const validBatches = await InventoryBatch.find({
        status: 'active',
        expiryDate: { $gt: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000) },
        currentQuantity: { $gt: 0 }
    }).limit(5);

    console.log(`📊 Batch Statistics:`);
    console.log(`   Expired (should be marked): ${expiredBatches.length}`);
    console.log(`   Expiring Soon (≤3 days): ${expiringSoonBatches.length}`);
    console.log(`   Valid (>3 days): ${validBatches.length}`);

    if (expiredBatches.length > 0) {
        console.log('\n⚠️  WARNING: Found expired batches that need to be marked!');
        console.log('   Run: npm run check-expired\n');

        expiredBatches.forEach((batch, index) => {
            const daysAgo = Math.floor((today - new Date(batch.expiryDate)) / (1000 * 60 * 60 * 24));
            console.log(`   ${index + 1}. Batch ${batch.batchNumber}`);
            console.log(`      Expired ${daysAgo} days ago (${new Date(batch.expiryDate).toLocaleDateString()})`);
            console.log(`      Quantity: ${batch.currentQuantity}`);
        });
    } else {
        console.log('\n✅ No expired active batches found');
    }

    if (expiringSoonBatches.length > 0) {
        console.log('\n⚠️  Batches Expiring Soon:');
        expiringSoonBatches.forEach((batch, index) => {
            const daysLeft = Math.ceil((new Date(batch.expiryDate) - today) / (1000 * 60 * 60 * 24));
            console.log(`   ${index + 1}. Batch ${batch.batchNumber}`);
            console.log(`      Expires in ${daysLeft} day(s) (${new Date(batch.expiryDate).toLocaleDateString()})`);
            console.log(`      Quantity: ${batch.currentQuantity}`);
        });
    }

    console.log('\n');
};

// Test product batch availability
const testProductBatchAvailability = async () => {
    console.log('=== Testing Product Batch Availability ===\n');

    const products = await Product.find({
        isActive: true,
        currentStock: { $gt: 0 }
    }).limit(5);

    for (const product of products) {
        const batches = await InventoryBatch.find({
            product: product._id,
            status: 'active',
            currentQuantity: { $gt: 0 }
        }).sort({ purchaseDate: 1 });

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const validBatches = batches.filter(batch => {
            if (!batch.expiryDate) return true;
            const expiryDate = new Date(batch.expiryDate);
            expiryDate.setHours(0, 0, 0, 0);
            return expiryDate >= today;
        });

        console.log(`📦 Product: ${product.name}`);
        console.log(`   Total Batches: ${batches.length}`);
        console.log(`   Valid Batches: ${validBatches.length}`);

        if (validBatches.length === 0 && batches.length > 0) {
            console.log(`   ⚠️  WARNING: All batches expired!`);
        } else if (validBatches.length > 0) {
            const oldestValid = validBatches[0];
            if (oldestValid.expiryDate) {
                const daysLeft = Math.ceil((new Date(oldestValid.expiryDate) - today) / (1000 * 60 * 60 * 24));
                console.log(`   Oldest batch expires in: ${daysLeft} day(s)`);
            }
        }
        console.log('');
    }
};

// Main execution
const main = async () => {
    try {
        console.log('🧪 Expiry Functionality Test Suite\n');
        console.log('='.repeat(50) + '\n');

        await connectDB();

        // Run tests
        testDateHandling();
        await testBatchExpiry();
        await testProductBatchAvailability();

        console.log('='.repeat(50));
        console.log('\n✅ All tests completed!');
        console.log('\n💡 Next Steps:');
        console.log('   1. If expired batches found, run: npm run check-expired');
        console.log('   2. Test in mobile app by adding products to cart');
        console.log('   3. Verify warnings show for expiring batches');
        console.log('   4. Verify expired batches cannot be sold\n');

    } catch (error) {
        console.error('\n❌ Test failed:', error);
    } finally {
        await mongoose.connection.close();
        console.log('Database connection closed.');
        process.exit(0);
    }
};

main();

