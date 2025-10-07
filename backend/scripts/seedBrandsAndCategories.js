const mongoose = require('mongoose');
const Brand = require('../models/Brand');
const Category = require('../models/Category');
const User = require('../models/User');

require('dotenv').config({ path: './config.env' });

// Sample brands data - Grocery and Food focused
const brandsData = [
    // Beverages
    {
        name: 'Coca-Cola',
        description: 'The world\'s most popular soft drink brand',
        website: 'https://www.coca-cola.com',
        contactEmail: 'contact@coca-cola.com',
        country: 'United States',
        foundedYear: 1886,
        category: 'food-beverage',
        isVerified: true
    },
    {
        name: 'PepsiCo',
        description: 'American multinational food, snack, and beverage corporation',
        website: 'https://www.pepsico.com',
        contactEmail: 'contact@pepsico.com',
        country: 'United States',
        foundedYear: 1965,
        category: 'food-beverage',
        isVerified: true
    },
    {
        name: 'Nestlé',
        description: 'Swiss multinational food and drink processing conglomerate',
        website: 'https://www.nestle.com',
        contactEmail: 'contact@nestle.com',
        country: 'Switzerland',
        foundedYear: 1866,
        category: 'food-beverage',
        isVerified: true
    },

    // Snack Brands
    {
        name: 'Frito-Lay',
        description: 'American subsidiary of PepsiCo that manufactures, markets, and sells corn chips, potato chips, and other snack foods',
        website: 'https://www.fritolay.com',
        contactEmail: 'contact@fritolay.com',
        country: 'United States',
        foundedYear: 1961,
        category: 'food-beverage',
        isVerified: true
    },
    {
        name: 'Lay\'s',
        description: 'Brand of potato chips as well as the name of the company that founded the chip brand',
        website: 'https://www.lays.com',
        contactEmail: 'contact@lays.com',
        country: 'United States',
        foundedYear: 1932,
        category: 'food-beverage',
        isVerified: true
    },
    {
        name: 'Doritos',
        description: 'American brand of flavored tortilla chips produced since 1964',
        website: 'https://www.doritos.com',
        contactEmail: 'contact@doritos.com',
        country: 'United States',
        foundedYear: 1964,
        category: 'food-beverage',
        isVerified: true
    },
    {
        name: 'Pringles',
        description: 'Brand of stackable potato-based crisps',
        website: 'https://www.pringles.com',
        contactEmail: 'contact@pringles.com',
        country: 'United States',
        foundedYear: 1967,
        category: 'food-beverage',
        isVerified: true
    },
    {
        name: 'Cheetos',
        description: 'Brand of cheese-flavored puffs and corn snacks',
        website: 'https://www.cheetos.com',
        contactEmail: 'contact@cheetos.com',
        country: 'United States',
        foundedYear: 1948,
        category: 'food-beverage',
        isVerified: true
    },

    // Dairy Brands
    {
        name: 'Amul',
        description: 'Indian dairy cooperative society',
        website: 'https://www.amul.com',
        contactEmail: 'contact@amul.com',
        country: 'India',
        foundedYear: 1946,
        category: 'food-beverage',
        isVerified: true
    },
    {
        name: 'Mother Dairy',
        description: 'Indian dairy products company',
        website: 'https://www.motherdairy.com',
        contactEmail: 'contact@motherdairy.com',
        country: 'India',
        foundedYear: 1974,
        category: 'food-beverage',
        isVerified: true
    },

    // Personal Care
    {
        name: 'Unilever',
        description: 'British-Dutch multinational consumer goods company',
        website: 'https://www.unilever.com',
        contactEmail: 'contact@unilever.com',
        country: 'United Kingdom',
        foundedYear: 1929,
        category: 'personal-care',
        isVerified: true
    },
    {
        name: 'Procter & Gamble',
        description: 'American multinational consumer goods corporation',
        website: 'https://www.pg.com',
        contactEmail: 'contact@pg.com',
        country: 'United States',
        foundedYear: 1837,
        category: 'personal-care',
        isVerified: true
    },

    // Household
    {
        name: 'Reckitt Benckiser',
        description: 'British multinational consumer goods company',
        website: 'https://www.rb.com',
        contactEmail: 'contact@rb.com',
        country: 'United Kingdom',
        foundedYear: 1999,
        category: 'household',
        isVerified: true
    }
];

// Sample categories data
const categoriesData = [
    {
        name: 'Food & Beverages',
        slug: 'food-beverages',
        description: 'All food and beverage products',
        icon: 'restaurant',
        color: '#4CAF50',
        level: 0,
        sortOrder: 1,
        isFeatured: true,
        metaTitle: 'Food & Beverages - Fresh and Delicious',
        metaDescription: 'Browse our wide selection of fresh food and beverages'
    },
    {
        name: 'Personal Care',
        slug: 'personal-care',
        description: 'Personal hygiene and beauty products',
        icon: 'face',
        color: '#E91E63',
        level: 0,
        sortOrder: 2,
        isFeatured: true,
        metaTitle: 'Personal Care - Beauty and Hygiene',
        metaDescription: 'Essential personal care and beauty products'
    },
    {
        name: 'Household',
        slug: 'household',
        description: 'Home and household essentials',
        icon: 'home',
        color: '#FF9800',
        level: 0,
        sortOrder: 3,
        isFeatured: true,
        metaTitle: 'Household - Home Essentials',
        metaDescription: 'Everything you need for your home'
    },
    {
        name: 'Electronics',
        slug: 'electronics',
        description: 'Electronic devices and accessories',
        icon: 'phone-android',
        color: '#2196F3',
        level: 0,
        sortOrder: 4,
        isFeatured: true,
        metaTitle: 'Electronics - Latest Technology',
        metaDescription: 'Latest electronic devices and accessories'
    },
    {
        name: 'Clothing',
        slug: 'clothing',
        description: 'Fashion and apparel',
        icon: 'checkroom',
        color: '#9C27B0',
        level: 0,
        sortOrder: 5,
        isFeatured: false,
        metaTitle: 'Clothing - Fashion & Style',
        metaDescription: 'Trendy clothing and fashion accessories'
    },
    {
        name: 'Automotive',
        slug: 'automotive',
        description: 'Automotive parts and accessories',
        icon: 'directions-car',
        color: '#607D8B',
        level: 0,
        sortOrder: 6,
        isFeatured: false,
        metaTitle: 'Automotive - Car Parts & Accessories',
        metaDescription: 'Quality automotive parts and accessories'
    },
    {
        name: 'Pharmaceutical',
        slug: 'pharmaceutical',
        description: 'Health and pharmaceutical products',
        icon: 'local-pharmacy',
        color: '#F44336',
        level: 0,
        sortOrder: 7,
        isFeatured: false,
        metaTitle: 'Pharmaceutical - Health & Wellness',
        metaDescription: 'Essential health and pharmaceutical products'
    }
];

// Subcategories data (will be created after main categories)
const subcategoriesData = [
    // Food & Beverages subcategories
    {
        name: 'Dairy Products',
        slug: 'dairy-products',
        description: 'Milk, cheese, yogurt, and other dairy products',
        icon: 'local-drink',
        color: '#4CAF50',
        level: 1,
        sortOrder: 1,
        parentCategorySlug: 'food-beverages'
    },
    {
        name: 'Bakery Items',
        slug: 'bakery-items',
        description: 'Bread, pastries, cakes, and baked goods',
        icon: 'cake',
        color: '#4CAF50',
        level: 1,
        sortOrder: 2,
        parentCategorySlug: 'food-beverages'
    },
    {
        name: 'Chips & Snacks',
        slug: 'chips-snacks',
        description: 'Potato chips, corn chips, crackers, nuts, and other snack foods',
        icon: 'fastfood',
        color: '#4CAF50',
        level: 1,
        sortOrder: 3,
        parentCategorySlug: 'food-beverages'
    },
    {
        name: 'Beverages',
        slug: 'beverages',
        description: 'Soft drinks, juices, water, and other beverages',
        icon: 'local-bar',
        color: '#4CAF50',
        level: 1,
        sortOrder: 4,
        parentCategorySlug: 'food-beverages'
    },
    {
        name: 'Frozen Foods',
        slug: 'frozen-foods',
        description: 'Frozen vegetables, meals, ice cream, and frozen snacks',
        icon: 'ac-unit',
        color: '#4CAF50',
        level: 1,
        sortOrder: 5,
        parentCategorySlug: 'food-beverages'
    },

    // Personal Care subcategories
    {
        name: 'Skincare',
        slug: 'skincare',
        description: 'Face creams, lotions, and skincare products',
        icon: 'face',
        color: '#E91E63',
        level: 1,
        sortOrder: 1,
        parentCategorySlug: 'personal-care'
    },
    {
        name: 'Hair Care',
        slug: 'hair-care',
        description: 'Shampoo, conditioner, and hair styling products',
        icon: 'content-cut',
        color: '#E91E63',
        level: 1,
        sortOrder: 2,
        parentCategorySlug: 'personal-care'
    },
    {
        name: 'Oral Care',
        slug: 'oral-care',
        description: 'Toothpaste, toothbrushes, and oral hygiene products',
        icon: 'health-and-safety',
        color: '#E91E63',
        level: 1,
        sortOrder: 3,
        parentCategorySlug: 'personal-care'
    },

    // Household subcategories
    {
        name: 'Cleaning Supplies',
        slug: 'cleaning-supplies',
        description: 'Detergents, disinfectants, and cleaning products',
        icon: 'cleaning-services',
        color: '#FF9800',
        level: 1,
        sortOrder: 1,
        parentCategorySlug: 'household'
    },
    {
        name: 'Kitchenware',
        slug: 'kitchenware',
        description: 'Cooking utensils, dishes, and kitchen accessories',
        icon: 'kitchen',
        color: '#FF9800',
        level: 1,
        sortOrder: 2,
        parentCategorySlug: 'household'
    },

    // Electronics subcategories
    {
        name: 'Mobile Phones',
        slug: 'mobile-phones',
        description: 'Smartphones and mobile accessories',
        icon: 'phone-android',
        color: '#2196F3',
        level: 1,
        sortOrder: 1,
        parentCategorySlug: 'electronics'
    },
    {
        name: 'Computers',
        slug: 'computers',
        description: 'Laptops, desktops, and computer accessories',
        icon: 'computer',
        color: '#2196F3',
        level: 1,
        sortOrder: 2,
        parentCategorySlug: 'electronics'
    },
    {
        name: 'Home Appliances',
        slug: 'home-appliances',
        description: 'Refrigerators, washing machines, and home appliances',
        icon: 'home-repair-service',
        color: '#2196F3',
        level: 1,
        sortOrder: 3,
        parentCategorySlug: 'electronics'
    }
];

async function seedBrandsAndCategories() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shivik_mart');
        console.log('✅ Connected to MongoDB');

        // Get admin user for createdBy field
        const adminUser = await User.findOne({ role: 'admin' });
        if (!adminUser) {
            console.log('❌ No admin user found. Please create an admin user first.');
            process.exit(1);
        }

        // Clear existing data
        console.log('🗑️  Clearing existing brands and categories...');
        await Brand.deleteMany({});
        await Category.deleteMany({});

        // Create brands
        console.log('🏢 Creating brands...');
        const createdBrands = [];
        for (const brandData of brandsData) {
            const brand = await Brand.create({
                ...brandData,
                createdBy: adminUser._id
            });
            createdBrands.push(brand);
            console.log(`   ✅ Created brand: ${brand.name}`);
        }

        // Create main categories
        console.log('📂 Creating main categories...');
        const createdCategories = [];
        for (const categoryData of categoriesData) {
            const category = await Category.create({
                ...categoryData,
                createdBy: adminUser._id
            });
            createdCategories.push(category);
            console.log(`   ✅ Created category: ${category.name}`);
        }

        // Create subcategories
        console.log('📁 Creating subcategories...');
        for (const subcategoryData of subcategoriesData) {
            const parentCategory = createdCategories.find(cat => cat.slug === subcategoryData.parentCategorySlug);
            if (parentCategory) {
                const subcategory = await Category.create({
                    ...subcategoryData,
                    parentCategory: parentCategory._id,
                    createdBy: adminUser._id
                });
                console.log(`   ✅ Created subcategory: ${subcategory.name} under ${parentCategory.name}`);

                // Update parent category's subcategory count
                await parentCategory.updateSubcategoryCount();
            }
        }

        // Update all categories' subcategory counts
        console.log('📊 Updating category statistics...');
        for (const category of createdCategories) {
            await category.updateSubcategoryCount();
        }

        console.log('✅ Successfully seeded brands and categories!');
        console.log(`   📊 Created ${createdBrands.length} brands`);
        console.log(`   📂 Created ${createdCategories.length} main categories`);
        console.log(`   📁 Created ${subcategoriesData.length} subcategories`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding brands and categories:', error);
        process.exit(1);
    }
}

// Run the seeding function
seedBrandsAndCategories();
