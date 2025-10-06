const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
require('dotenv').config({ path: './config.env' });

async function createAdminUser() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shivik_mart');
        console.log('✅ Connected to MongoDB');

        // Check if admin user already exists
        const existingAdmin = await User.findOne({ email: 'admin@shivikmart.com' });
        if (existingAdmin) {
            console.log('✅ Admin user already exists');
            process.exit(0);
        }

        // Create admin user
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('admin123', salt);

        const adminUser = await User.create({
            name: 'Admin User',
            email: 'admin@shivikmart.com',
            password: hashedPassword,
            role: 'admin',
            permissions: [
                'read_products', 'write_products', 'delete_products',
                'read_suppliers', 'write_suppliers', 'delete_suppliers',
                'read_purchase_orders', 'write_purchase_orders', 'approve_purchase_orders',
                'read_inventory', 'write_inventory', 'adjust_inventory',
                'read_reports', 'write_reports',
                'manage_users', 'manage_settings'
            ],
            isActive: true
        });

        console.log('✅ Admin user created successfully');
        console.log('   Email: admin@shivikmart.com');
        console.log('   Password: admin123');
        console.log('   Role: admin');
        console.log('   User ID:', adminUser._id);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating admin user:', error);
        process.exit(1);
    }
}

createAdminUser();
