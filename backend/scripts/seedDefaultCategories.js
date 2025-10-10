const mongoose = require('mongoose');
const Category = require('../models/Category');
const User = require('../models/User');

require('dotenv').config({ path: './config.env' });

// Default categories matching the old hardcoded list for backward compatibility
const defaultCategoriesData = [
    {
        name: 'Grocery',
        slug: 'grocery',
        description: 'Essential grocery items and packaged foods',
        icon: 'shopping-cart',
        color: '#4CAF50',
        level: 0,
        sortOrder: 1,
        isFeatured: true,
        isActive: true
    },
    {
        name: 'Snacks',
        slug: 'snacks',
        description: 'Chips, crackers, nuts, and other snack items',
        icon: 'fastfood',
        color: '#FF9800',
        level: 0,
        sortOrder: 2,
        isFeatured: true,
        isActive: true
    },
    {
        name: 'Personal Care',
        slug: 'personal-care',
        description: 'Personal hygiene and beauty products',
        icon: 'face',
        color: '#E91E63',
        level: 0,
        sortOrder: 3,
        isFeatured: true,
        isActive: true
    },
    {
        name: 'Dairy',
        slug: 'dairy',
        description: 'Milk, cheese, yogurt, and other dairy products',
        icon: 'local-drink',
        color: '#2196F3',
        level: 0,
        sortOrder: 4,
        isFeatured: true,
        isActive: true
    },
    {
        name: 'Fruits & Vegetables',
        slug: 'fruits-vegetables',
        description: 'Fresh fruits and vegetables',
        icon: 'spa',
        color: '#8BC34A',
        level: 0,
        sortOrder: 5,
        isFeatured: true,
        isActive: true
    },
    {
        name: 'Meat & Seafood',
        slug: 'meat-seafood',
        description: 'Fresh and frozen meat, poultry, and seafood',
        icon: 'set-meal',
        color: '#F44336',
        level: 0,
        sortOrder: 6,
        isFeatured: false,
        isActive: true
    },
    {
        name: 'Bakery',
        slug: 'bakery',
        description: 'Bread, pastries, cakes, and baked goods',
        icon: 'cake',
        color: '#FF5722',
        level: 0,
        sortOrder: 7,
        isFeatured: false,
        isActive: true
    },
    {
        name: 'Beverages',
        slug: 'beverages',
        description: 'Soft drinks, juices, water, and other beverages',
        icon: 'local-bar',
        color: '#03A9F4',
        level: 0,
        sortOrder: 8,
        isFeatured: true,
        isActive: true
    },
    {
        name: 'Household',
        slug: 'household',
        description: 'Home and household essentials, cleaning supplies',
        icon: 'home',
        color: '#9C27B0',
        level: 0,
        sortOrder: 9,
        isFeatured: false,
        isActive: true
    },
    {
        name: 'Electronics',
        slug: 'electronics',
        description: 'Electronic devices and accessories',
        icon: 'phone-android',
        color: '#607D8B',
        level: 0,
        sortOrder: 10,
        isFeatured: false,
        isActive: true
    },
    {
        name: 'Other',
        slug: 'other',
        description: 'Miscellaneous items and other products',
        icon: 'category',
        color: '#9E9E9E',
        level: 0,
        sortOrder: 11,
        isFeatured: false,
        isActive: true
    }
];

async function seedDefaultCategories() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shivik_mart');
        console.log('✅ Connected to MongoDB');

        // Get admin user for createdBy field
        const adminUser = await User.findOne({ role: 'admin' });
        if (!adminUser) {
            console.log('❌ No admin user found. Please create an admin user first.');
            console.log('   Run: npm run create-admin');
            process.exit(1);
        }

        console.log('📂 Seeding default categories...');

        let created = 0;
        let skipped = 0;

        for (const categoryData of defaultCategoriesData) {
            // Check if category with this slug already exists
            const existingCategory = await Category.findOne({ slug: categoryData.slug });

            if (existingCategory) {
                console.log(`   ⏭️  Skipped: ${categoryData.name} (already exists)`);
                skipped++;
                continue;
            }

            // Create new category
            const category = await Category.create({
                ...categoryData,
                createdBy: adminUser._id
            });
            console.log(`   ✅ Created: ${category.name}`);
            created++;
        }

        console.log('\n🎉 Seeding complete!');
        console.log(`   ✅ Created: ${created} categories`);
        console.log(`   ⏭️  Skipped: ${skipped} categories (already existed)`);
        console.log(`   📊 Total: ${defaultCategoriesData.length} categories processed`);

        // Display all categories
        console.log('\n📋 Current categories in database:');
        const allCategories = await Category.find({ level: 0 }).sort({ sortOrder: 1 });
        allCategories.forEach((cat, index) => {
            const status = cat.isActive ? '🟢' : '🔴';
            const featured = cat.isFeatured ? '⭐' : '  ';
            console.log(`   ${index + 1}. ${status} ${featured} ${cat.name} (${cat.slug})`);
        });

        console.log('\n💡 Categories are now ready for use in the mobile app!');
        console.log('   Open the Product Addition page to see all categories.');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding categories:', error);
        process.exit(1);
    }
}

// Run the seeding function
seedDefaultCategories();

