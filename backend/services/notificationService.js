const nodemailer = require('nodemailer');
const Product = require('../models/Product');
const User = require('../models/User');

class NotificationService {
    constructor() {
        this.transporter = null;
        this.initializeTransporter();
    }

    /**
     * Initialize email transporter
     */
    initializeTransporter() {
        if (process.env.EMAIL_HOST && process.env.EMAIL_USER) {
            this.transporter = nodemailer.createTransporter({
                host: process.env.EMAIL_HOST,
                port: process.env.EMAIL_PORT || 587,
                secure: process.env.EMAIL_SECURE === 'true',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                }
            });
        }
    }

    /**
     * Send low stock alerts
     * @param {Array} lowStockProducts - Products with low stock
     * @param {Array} recipients - Email recipients
     * @returns {Promise<Object>} Notification result
     */
    async sendLowStockAlert(lowStockProducts, recipients = []) {
        if (lowStockProducts.length === 0) {
            return { success: true, message: 'No low stock products to alert' };
        }

        const subject = `Low Stock Alert - ${lowStockProducts.length} products need attention`;
        const html = this.generateLowStockEmailHTML(lowStockProducts);

        return await this.sendEmail(recipients, subject, html);
    }

    /**
     * Send expiring products alert
     * @param {Array} expiringProducts - Products expiring soon
     * @param {Array} recipients - Email recipients
     * @returns {Promise<Object>} Notification result
     */
    async sendExpiringProductsAlert(expiringProducts, recipients = []) {
        if (expiringProducts.length === 0) {
            return { success: true, message: 'No expiring products to alert' };
        }

        const subject = `Expiring Products Alert - ${expiringProducts.length} products expiring soon`;
        const html = this.generateExpiringProductsEmailHTML(expiringProducts);

        return await this.sendEmail(recipients, subject, html);
    }

    /**
     * Send purchase order approval request
     * @param {Object} purchaseOrder - Purchase order details
     * @param {Array} recipients - Email recipients
     * @returns {Promise<Object>} Notification result
     */
    async sendPurchaseOrderApprovalRequest(purchaseOrder, recipients = []) {
        const subject = `Purchase Order Approval Required - ${purchaseOrder.orderNumber}`;
        const html = this.generatePurchaseOrderEmailHTML(purchaseOrder);

        return await this.sendEmail(recipients, subject, html);
    }

    /**
     * Send inventory summary report
     * @param {Object} summary - Inventory summary data
     * @param {Array} recipients - Email recipients
     * @returns {Promise<Object>} Notification result
     */
    async sendInventorySummaryReport(summary, recipients = []) {
        const subject = `Daily Inventory Summary - ${new Date().toLocaleDateString()}`;
        const html = this.generateInventorySummaryEmailHTML(summary);

        return await this.sendEmail(recipients, subject, html);
    }

    /**
     * Send email notification
     * @param {Array} recipients - Email recipients
     * @param {string} subject - Email subject
     * @param {string} html - Email HTML content
     * @returns {Promise<Object>} Email result
     */
    async sendEmail(recipients, subject, html) {
        if (!this.transporter) {
            console.log('Email transporter not configured. Email would be sent to:', recipients);
            console.log('Subject:', subject);
            return { success: true, message: 'Email transporter not configured - logged to console' };
        }

        try {
            const mailOptions = {
                from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
                to: recipients.join(', '),
                subject,
                html
            };

            const result = await this.transporter.sendMail(mailOptions);
            return { success: true, messageId: result.messageId };

        } catch (error) {
            console.error('Email sending failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Generate low stock email HTML
     * @param {Array} products - Low stock products
     * @returns {string} HTML content
     */
    generateLowStockEmailHTML(products) {
        let html = `
            <h2>Low Stock Alert</h2>
            <p>The following products are running low on stock:</p>
            <table border="1" style="border-collapse: collapse; width: 100%;">
                <thead>
                    <tr style="background-color: #f2f2f2;">
                        <th style="padding: 8px;">Product Name</th>
                        <th style="padding: 8px;">SKU</th>
                        <th style="padding: 8px;">Current Stock</th>
                        <th style="padding: 8px;">Min Level</th>
                        <th style="padding: 8px;">Category</th>
                    </tr>
                </thead>
                <tbody>
        `;

        products.forEach(product => {
            html += `
                <tr>
                    <td style="padding: 8px;">${product.name}</td>
                    <td style="padding: 8px;">${product.sku}</td>
                    <td style="padding: 8px; color: ${product.currentStock === 0 ? 'red' : 'orange'};">${product.currentStock}</td>
                    <td style="padding: 8px;">${product.minStockLevel}</td>
                    <td style="padding: 8px;">${product.category}</td>
                </tr>
            `;
        });

        html += `
                </tbody>
            </table>
            <p><strong>Action Required:</strong> Please consider reordering these products to avoid stockouts.</p>
            <p>Generated on: ${new Date().toLocaleString()}</p>
        `;

        return html;
    }

    /**
     * Generate expiring products email HTML
     * @param {Array} products - Expiring products
     * @returns {string} HTML content
     */
    generateExpiringProductsEmailHTML(products) {
        let html = `
            <h2>Expiring Products Alert</h2>
            <p>The following products are expiring soon:</p>
            <table border="1" style="border-collapse: collapse; width: 100%;">
                <thead>
                    <tr style="background-color: #f2f2f2;">
                        <th style="padding: 8px;">Product Name</th>
                        <th style="padding: 8px;">SKU</th>
                        <th style="padding: 8px;">Expiry Date</th>
                        <th style="padding: 8px;">Current Stock</th>
                        <th style="padding: 8px;">Category</th>
                    </tr>
                </thead>
                <tbody>
        `;

        products.forEach(product => {
            const daysUntilExpiry = Math.ceil((new Date(product.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
            const color = daysUntilExpiry <= 7 ? 'red' : daysUntilExpiry <= 15 ? 'orange' : 'black';

            html += `
                <tr>
                    <td style="padding: 8px;">${product.name}</td>
                    <td style="padding: 8px;">${product.sku}</td>
                    <td style="padding: 8px; color: ${color};">${new Date(product.expiryDate).toLocaleDateString()}</td>
                    <td style="padding: 8px;">${product.currentStock}</td>
                    <td style="padding: 8px;">${product.category}</td>
                </tr>
            `;
        });

        html += `
                </tbody>
            </table>
            <p><strong>Action Required:</strong> Please check these products and take appropriate action (discount, return, etc.).</p>
            <p>Generated on: ${new Date().toLocaleString()}</p>
        `;

        return html;
    }

    /**
     * Generate purchase order email HTML
     * @param {Object} purchaseOrder - Purchase order data
     * @returns {string} HTML content
     */
    generatePurchaseOrderEmailHTML(purchaseOrder) {
        let html = `
            <h2>Purchase Order Approval Required</h2>
            <p><strong>Order Number:</strong> ${purchaseOrder.orderNumber}</p>
            <p><strong>Supplier:</strong> ${purchaseOrder.supplier?.name || 'N/A'}</p>
            <p><strong>Total Amount:</strong> ₹${purchaseOrder.totalAmount?.toFixed(2) || '0.00'}</p>
            <p><strong>Expected Delivery:</strong> ${purchaseOrder.expectedDeliveryDate ? new Date(purchaseOrder.expectedDeliveryDate).toLocaleDateString() : 'Not specified'}</p>
            
            <h3>Items:</h3>
            <table border="1" style="border-collapse: collapse; width: 100%;">
                <thead>
                    <tr style="background-color: #f2f2f2;">
                        <th style="padding: 8px;">Product</th>
                        <th style="padding: 8px;">Quantity</th>
                        <th style="padding: 8px;">Cost Price</th>
                        <th style="padding: 8px;">Total</th>
                    </tr>
                </thead>
                <tbody>
        `;

        if (purchaseOrder.items && purchaseOrder.items.length > 0) {
            purchaseOrder.items.forEach(item => {
                html += `
                    <tr>
                        <td style="padding: 8px;">${item.product?.name || 'N/A'}</td>
                        <td style="padding: 8px;">${item.quantity}</td>
                        <td style="padding: 8px;">₹${item.costPrice?.toFixed(2) || '0.00'}</td>
                        <td style="padding: 8px;">₹${item.totalAmount?.toFixed(2) || '0.00'}</td>
                    </tr>
                `;
            });
        }

        html += `
                </tbody>
            </table>
            <p><strong>Action Required:</strong> Please review and approve this purchase order.</p>
            <p>Generated on: ${new Date().toLocaleString()}</p>
        `;

        return html;
    }

    /**
     * Generate inventory summary email HTML
     * @param {Object} summary - Inventory summary data
     * @returns {string} HTML content
     */
    generateInventorySummaryEmailHTML(summary) {
        const html = `
            <h2>Daily Inventory Summary</h2>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 20px;">
                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px;">
                    <h3 style="margin: 0; color: #333;">Total Products</h3>
                    <p style="font-size: 24px; margin: 10px 0; color: #007bff;">${summary.totalProducts || 0}</p>
                </div>
                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px;">
                    <h3 style="margin: 0; color: #333;">Total Stock</h3>
                    <p style="font-size: 24px; margin: 10px 0; color: #28a745;">${summary.totalStock || 0}</p>
                </div>
                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px;">
                    <h3 style="margin: 0; color: #333;">Inventory Value</h3>
                    <p style="font-size: 24px; margin: 10px 0; color: #ffc107;">₹${(summary.totalValue || 0).toFixed(2)}</p>
                </div>
                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px;">
                    <h3 style="margin: 0; color: #333;">Low Stock Items</h3>
                    <p style="font-size: 24px; margin: 10px 0; color: ${(summary.lowStockCount || 0) > 0 ? '#dc3545' : '#28a745'};">${summary.lowStockCount || 0}</p>
                </div>
            </div>
            <p>Generated on: ${new Date().toLocaleString()}</p>
        `;

        return html;
    }

    /**
     * Get notification recipients based on roles
     * @param {Array} roles - User roles to notify
     * @returns {Promise<Array>} Email addresses
     */
    async getNotificationRecipients(roles = ['admin', 'manager']) {
        try {
            const users = await User.find({
                role: { $in: roles },
                isActive: true
            }).select('email name');

            return users.map(user => user.email).filter(email => email);
        } catch (error) {
            console.error('Error fetching notification recipients:', error);
            return [];
        }
    }

    /**
     * Schedule daily notifications
     * @returns {Promise<Object>} Scheduled notifications result
     */
    async scheduleDailyNotifications() {
        try {
            const recipients = await this.getNotificationRecipients();

            if (recipients.length === 0) {
                return { success: false, message: 'No recipients found' };
            }

            const results = [];

            // Send low stock alerts
            const lowStockProducts = await Product.findLowStock();
            if (lowStockProducts.length > 0) {
                const lowStockResult = await this.sendLowStockAlert(lowStockProducts, recipients);
                results.push({ type: 'lowStock', ...lowStockResult });
            }

            // Send expiring products alerts (using batch-based expiry)
            const InventoryService = require('./inventoryService');
            const expiringProducts = await InventoryService.getExpiringProducts(30);
            if (expiringProducts.length > 0) {
                const expiringResult = await this.sendExpiringProductsAlert(expiringProducts, recipients);
                results.push({ type: 'expiringProducts', ...expiringResult });
            }

            return { success: true, results };

        } catch (error) {
            console.error('Error scheduling daily notifications:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = NotificationService;
