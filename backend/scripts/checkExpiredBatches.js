require('dotenv').config({ path: './config.env' });
const mongoose = require('mongoose');
const ExpiryCheckService = require('../services/expiryCheckService');

// Connect to database
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('MongoDB Connected...');
    } catch (err) {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    }
};

// Run expiry check
const runExpiryCheck = async () => {
    try {
        console.log('\n=== Starting Expiry Check ===\n');
        console.log('Checking for expired batches...');

        const result = await ExpiryCheckService.checkAndUpdateExpiredBatches();

        console.log('\n=== Expiry Check Results ===');
        console.log('Success:', result.success);
        console.log('Timestamp:', result.timestamp);
        console.log('Total Checked:', result.totalChecked);
        console.log('Batches Updated:', result.batchesUpdated?.length || 0);

        if (result.batchesUpdated && result.batchesUpdated.length > 0) {
            console.log('\n=== Updated Batches ===');
            result.batchesUpdated.forEach((batch, index) => {
                console.log(`\n${index + 1}. Batch: ${batch.batchNumber}`);
                console.log(`   Batch ID: ${batch.batchId}`);
                console.log(`   Product ID: ${batch.productId}`);
                console.log(`   Quantity Removed: ${batch.quantityRemoved}`);
                console.log(`   Expiry Date: ${batch.expiryDate}`);
            });
        } else {
            console.log('\nNo expired batches found.');
        }

        if (result.errors && result.errors.length > 0) {
            console.log('\n=== Errors ===');
            result.errors.forEach((error, index) => {
                console.log(`\n${index + 1}. Batch: ${error.batchNumber}`);
                console.log(`   Error: ${error.error}`);
            });
        }

        // Get statistics
        console.log('\n=== Getting Expiry Statistics ===');
        const stats = await ExpiryCheckService.getExpiryStatistics();

        console.log('\nExpired (not yet marked):');
        console.log('  Batches:', stats.expired.totalBatches);
        console.log('  Quantity:', stats.expired.totalQuantity);
        console.log('  Value at Risk: ₹', stats.expired.totalValue.toFixed(2));

        console.log('\nExpiring Soon (next 30 days):');
        console.log('  Batches:', stats.expiringSoon.totalBatches);
        console.log('  Quantity:', stats.expiringSoon.totalQuantity);
        console.log('  Value at Risk: ₹', stats.expiringSoon.totalValue.toFixed(2));

        console.log('\nTotal Active Batches:');
        console.log('  Batches:', stats.totalActive.totalBatches);
        console.log('  Quantity:', stats.totalActive.totalQuantity);
        console.log('  Total Value: ₹', stats.totalActive.totalValue.toFixed(2));

        console.log('\n=== Expiry Check Complete ===\n');

    } catch (error) {
        console.error('\nError during expiry check:', error);
        throw error;
    }
};

// Main execution
const main = async () => {
    await connectDB();
    await runExpiryCheck();
    await mongoose.connection.close();
    console.log('Database connection closed.');
    process.exit(0);
};

main().catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
});

