const mongoose = require('mongoose');
const User = require('../models/User');
const Product = require('../models/Product');
require('dotenv').config({ path: './config.env' });

// Sample data
const sampleUsers = [
    {
        name: 'John Doe',
        email: 'john.doe@example.com',
        age: 30,
        role: 'admin'
    },
    {
        name: 'Jane Smith',
        email: 'jane.smith@example.com',
        age: 25,
        role: 'user'
    },
    {
        name: 'Bob Johnson',
        email: 'bob.johnson@example.com',
        age: 35,
        role: 'moderator'
    }
];

const sampleProducts = [
    {
        name: 'Wireless Bluetooth Headphones',
        description: 'High-quality wireless headphones with noise cancellation',
        price: 99.99,
        category: 'electronics',
        stock: 50,
        images: ['https://example.com/headphones1.jpg'],
        tags: ['wireless', 'bluetooth', 'noise-cancellation'],
        featured: true,
        rating: { average: 4.5, count: 120 }
    },
    {
        name: 'Cotton T-Shirt',
        description: 'Comfortable 100% cotton t-shirt in various colors',
        price: 19.99,
        category: 'clothing',
        stock: 100,
        images: ['https://example.com/tshirt1.jpg'],
        tags: ['cotton', 'casual', 'comfortable'],
        featured: false,
        rating: { average: 4.2, count: 85 }
    },
    {
        name: 'JavaScript Programming Book',
        description: 'Complete guide to modern JavaScript development',
        price: 49.99,
        category: 'books',
        stock: 25,
        images: ['https://example.com/jsbook1.jpg'],
        tags: ['programming', 'javascript', 'web-development'],
        featured: true,
        rating: { average: 4.8, count: 200 }
    },
    {
        name: 'Coffee Maker',
        description: 'Automatic drip coffee maker with programmable timer',
        price: 79.99,
        category: 'home',
        stock: 15,
        images: ['https://example.com/coffeemaker1.jpg'],
        tags: ['coffee', 'kitchen', 'appliance'],
        featured: false,
        rating: { average: 4.3, count: 65 }
    },
    {
        name: 'Yoga Mat',
        description: 'Non-slip yoga mat for home and studio practice',
        price: 29.99,
        category: 'sports',
        stock: 40,
        images: ['https://example.com/yogamat1.jpg'],
        tags: ['yoga', 'fitness', 'exercise'],
        featured: false,
        rating: { average: 4.6, count: 90 }
    }
];

const seedDatabase = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shivik_mart', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log('✅ Connected to MongoDB');

        // Clear existing data
        await User.deleteMany({});
        await Product.deleteMany({});
        console.log('🗑️ Cleared existing data');

        // Insert sample users
        const users = await User.insertMany(sampleUsers);
        console.log(`👥 Created ${users.length} users`);

        // Insert sample products
        const products = await Product.insertMany(sampleProducts);
        console.log(`📦 Created ${products.length} products`);

        console.log('🌱 Database seeded successfully!');
        console.log('\nSample data created:');
        console.log('- Users:', users.map(u => u.name).join(', '));
        console.log('- Products:', products.map(p => p.name).join(', '));

    } catch (error) {
        console.error('❌ Error seeding database:', error);
    } finally {
        // Close connection
        await mongoose.connection.close();
        console.log('🔌 Database connection closed');
        process.exit(0);
    }
};

// Run the seed function
seedDatabase();
