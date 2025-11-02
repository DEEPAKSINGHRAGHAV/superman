const mongoose = require('mongoose');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
require('dotenv').config({ path: './config.env' });

// Connect to MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shivik_mart', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✅ Connected to MongoDB');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
};

const generateCurlCommand = async () => {
    try {
        await connectDB();

        // Fetch all products
        const products = await Product.find({ isActive: true }).select('_id name sku costPrice sellingPrice mrp').lean();

        if (products.length === 0) {
            console.log('❌ No active products found in the database.');
            process.exit(1);
        }

        // Fetch suppliers
        const suppliers = await Supplier.find().select('_id name code').limit(1).lean();

        if (suppliers.length === 0) {
            console.log('❌ No suppliers found in the database. Please create a supplier first.');
            process.exit(1);
        }

        const supplier = suppliers[0];
        console.log(`\n📦 Found ${products.length} active products`);
        console.log(`🏢 Using supplier: ${supplier.name} (${supplier.code}) - ID: ${supplier._id}\n`);

        // Build items array - each product with quantity 50
        const items = products.map(product => {
            const quantity = 50;
            const costPrice = product.costPrice || 10; // Default to 10 if not set
            const sellingPrice = product.sellingPrice || costPrice * 1.2; // Default 20% markup
            const totalAmount = quantity * costPrice;

            return {
                product: product._id.toString(),
                quantity: quantity,
                costPrice: costPrice,
                sellingPrice: sellingPrice,
                mrp: product.mrp || sellingPrice * 1.1, // Default MRP 10% above selling price
                totalAmount: totalAmount
            };
        });

        // Calculate totals
        const subtotal = items.reduce((sum, item) => sum + item.totalAmount, 0);
        const taxAmount = 0;
        const discountAmount = 0;
        const totalAmount = subtotal + taxAmount - discountAmount;

        // Build the request body
        const requestBody = {
            supplier: supplier._id.toString(),
            items: items,
            subtotal: subtotal,
            taxAmount: taxAmount,
            discountAmount: discountAmount,
            totalAmount: totalAmount,
            expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
            notes: `Purchase order for all ${products.length} products, each with quantity 50`,
            paymentMethod: 'credit',
            paymentStatus: 'pending'
        };

        // Generate the curl command
        const apiVersion = process.env.API_VERSION || 'v1';
        const port = process.env.PORT || 8000;
        const baseUrl = `http://localhost:${port}/api/${apiVersion}`;

        // Escape JSON for curl (Windows PowerShell friendly)
        const jsonBody = JSON.stringify(requestBody, null, 2);

        console.log('📋 Generated curl command:\n');
        console.log('===========================================');
        console.log('curl -X POST "' + baseUrl + '/purchase-orders" \\');
        console.log('  -H "Content-Type: application/json" \\');
        console.log('  -H "Authorization: Bearer YOUR_TOKEN_HERE" \\');
        console.log('  -d @- << EOF');
        console.log(jsonBody);
        console.log('EOF');
        console.log('===========================================\n');

        // Also provide a Windows PowerShell friendly version
        console.log('🔧 Windows PowerShell version:\n');
        console.log('===========================================');
        const powershellBody = jsonBody.replace(/"/g, '\\"').replace(/\n/g, ' ');
        console.log(`$headers = @{`);
        console.log(`    "Content-Type" = "application/json"`);
        console.log(`    "Authorization" = "Bearer YOUR_TOKEN_HERE"`);
        console.log(`}`);
        console.log(`$body = @'`);
        console.log(jsonBody);
        console.log(`'@`);
        console.log(`Invoke-RestMethod -Uri "${baseUrl}/purchase-orders" -Method Post -Headers $headers -Body $body`);
        console.log('===========================================\n');

        // Save to file for easy copy-paste
        const fs = require('fs');
        const curlScript = `#!/bin/bash
# Purchase Order Creation Script
# Generated on ${new Date().toISOString()}
# Products: ${products.length}, Supplier: ${supplier.name}

curl -X POST "${baseUrl}/purchase-orders" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \\
  -d '${JSON.stringify(requestBody)}'
`;

        fs.writeFileSync('create_purchase_order.sh', curlScript);
        console.log('✅ Saved curl command to: create_purchase_order.sh\n');

        // Display summary
        console.log('📊 Purchase Order Summary:');
        console.log(`   Supplier: ${supplier.name} (${supplier._id})`);
        console.log(`   Total Items: ${items.length}`);
        console.log(`   Total Quantity: ${items.reduce((sum, item) => sum + item.quantity, 0)}`);
        console.log(`   Subtotal: ₹${subtotal.toFixed(2)}`);
        console.log(`   Total Amount: ₹${totalAmount.toFixed(2)}\n`);

        // List first 10 products as preview
        console.log('📦 Products in this order (first 10):');
        products.slice(0, 10).forEach((product, index) => {
            const item = items[index];
            console.log(`   ${index + 1}. ${product.name} (SKU: ${product.sku}) - Qty: 50, Cost: ₹${item.costPrice.toFixed(2)}`);
        });
        if (products.length > 10) {
            console.log(`   ... and ${products.length - 10} more products\n`);
        }

        console.log('\n⚠️  Remember to replace YOUR_TOKEN_HERE with your actual JWT token!');
        console.log('   You can get a token by logging in via: POST /api/v1/auth/login\n');

        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error generating curl command:', error);
        await mongoose.connection.close();
        process.exit(1);
    }
};

generateCurlCommand();

