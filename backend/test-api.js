const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config({ path: './config.env' });

async function createTestUser() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Check if user already exists
        const existingUser = await User.findOne({ email: 'admin@test.com' });
        if (existingUser) {
            console.log('✅ Test user already exists');
            return existingUser;
        }

        // Create test user
        const hashedPassword = await bcrypt.hash('password123', 10);
        const user = new User({
            name: 'Test Admin',
            email: 'admin@test.com',
            password: hashedPassword,
            role: 'admin',
            permissions: [
                'read_products', 'write_products', 'delete_products',
                'read_suppliers', 'write_suppliers', 'delete_suppliers',
                'read_purchase_orders', 'write_purchase_orders', 'approve_purchase_orders',
                'read_inventory', 'write_inventory', 'adjust_inventory',
                'read_reports', 'write_reports',
                'manage_users', 'manage_settings'
            ]
        });

        await user.save();
        console.log('✅ Test user created successfully');
        return user;
    } catch (error) {
        console.error('❌ Error creating test user:', error);
        throw error;
    } finally {
        await mongoose.disconnect();
    }
}

// Run if called directly
if (require.main === module) {
    createTestUser().then(() => {
        console.log('Test user setup complete');
        process.exit(0);
    }).catch(error => {
        console.error('Setup failed:', error);
        process.exit(1);
    });
}

module.exports = createTestUser;
