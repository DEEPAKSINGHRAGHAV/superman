const mongoose = require('mongoose');
const Category = require('../models/Category');
const Product = require('../models/Product');

require('dotenv').config({ path: './config.env' });

async function updateCategoryProductCounts() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shivik_mart');
        console.log('✅ Connected to MongoDB');

        console.log('📊 Updating category product counts...');

        // Get all categories
        const categories = await Category.find({});
        
        let updated = 0;
        let unchanged = 0;

        for (const category of categories) {
            const oldCount = category.productCount;
            
            // Count active products for this category
            const productCount = await Product.countDocuments({
                category: category.slug,
                isActive: true
            });

            // Update if count changed
            if (productCount !== oldCount) {
                category.productCount = productCount;
                await category.save();
                console.log(`   ✅ Updated "${category.name}": ${oldCount} → ${productCount} products`);
                updated++;
            } else {
                console.log(`   ⏭️  Skipped "${category.name}": ${productCount} products (unchanged)`);
                unchanged++;
            }
        }

        console.log('\n🎉 Update complete!');
        console.log(`   ✅ Updated: ${updated} categories`);
        console.log(`   ⏭️  Unchanged: ${unchanged} categories`);
        console.log(`   📊 Total: ${categories.length} categories processed`);

        // Show categories with products
        console.log('\n📋 Categories with products:');
        const categoriesWithProducts = await Category.find({ productCount: { $gt: 0 } })
            .sort({ productCount: -1 });
        
        if (categoriesWithProducts.length > 0) {
            categoriesWithProducts.forEach(cat => {
                console.log(`   • ${cat.name}: ${cat.productCount} product${cat.productCount !== 1 ? 's' : ''}`);
            });
        } else {
            console.log('   (No categories have products yet)');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error updating category product counts:', error);
        process.exit(1);
    }
}

// Run the update
updateCategoryProductCounts();

