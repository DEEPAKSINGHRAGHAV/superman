const mongoose = require('mongoose');
const BarcodeCounter = require('./BarcodeCounter');

const customerSchema = new mongoose.Schema({
    // Sequential Customer ID (e.g., CUST0001, CUST0002)
    customerNumber: {
        type: String,
        unique: true,
        required: true,
        trim: true,
        uppercase: true
    },
    
    // Basic Information
    name: {
        type: String,
        required: false, // Optional
        trim: true,
        minlength: [2, 'Name must be at least 2 characters long'],
        maxlength: [100, 'Name cannot exceed 100 characters']
    },
    
    // Contact Information
    phone: {
        type: String,
        required: false, // Optional
        unique: true,
        sparse: true, // Allow multiple null/undefined values
        trim: true,
        match: [/^[\+]?[1-9][\d]{9,10}$/, 'Please enter a valid 10-digit phone number']
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    
    // Address (Optional)
    address: {
        street: {
            type: String,
            trim: true,
            maxlength: [200, 'Street address cannot exceed 200 characters']
        },
        city: {
            type: String,
            trim: true,
            maxlength: [50, 'City name cannot exceed 50 characters']
        },
        state: {
            type: String,
            trim: true,
            maxlength: [50, 'State name cannot exceed 50 characters']
        },
        pincode: {
            type: String,
            trim: true,
            match: [/^\d{6}$/, 'Pincode must be 6 digits']
        },
        country: {
            type: String,
            default: 'India',
            trim: true
        }
    },
    
    // Customer Status
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    
    // Additional Information
    notes: {
        type: String,
        trim: true,
        maxlength: [500, 'Notes cannot exceed 500 characters']
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for better query performance
// Note: phone and customerNumber already have indexes from unique: true
customerSchema.index({ name: 1 }); // For search functionality
customerSchema.index({ isActive: 1, createdAt: -1 }); // For filtering active customers

// Static method to generate next customer number
customerSchema.statics.generateCustomerNumber = async function () {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        // Atomically increment the counter using BarcodeCounter collection
        // Uses same collection but different _id ('customer_sequence' vs 'barcode_sequence')
        const result = await BarcodeCounter.findByIdAndUpdate(
            'customer_sequence',
            { $inc: { sequence: 1 } },
            { 
                upsert: true, // Create if doesn't exist
                new: true,
                session 
            }
        );
        
        await session.commitTransaction();
        
        // Format as CUST0001, CUST0002, etc. (4-digit padding)
        const sequence = result.sequence;
        const customerNumber = `CUST${String(sequence).padStart(4, '0')}`;
        
        return customerNumber;
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
};

// Static method to find or create customer by phone
customerSchema.statics.findOrCreateByPhone = async function (phone, customerData = {}) {
    // If no phone provided, return null
    if (!phone || !phone.trim()) {
        return null;
    }
    
    // Normalize phone number (remove spaces, dashes, etc.)
    let normalizedPhone = phone.replace(/[\s\-\(\)]/g, '');
    
    // Remove country code prefix if present (+91 or 91)
    if (normalizedPhone.startsWith('+91')) {
        normalizedPhone = normalizedPhone.substring(3);
    } else if (normalizedPhone.startsWith('91') && normalizedPhone.length === 12) {
        normalizedPhone = normalizedPhone.substring(2);
    }
    
    // Validate phone number (must be exactly 10 digits)
    if (!/^[6-9]\d{9}$/.test(normalizedPhone)) {
        throw new Error('Please enter a valid 10-digit Indian phone number');
    }
    
    // Try to find existing customer
    let customer = await this.findOne({ phone: normalizedPhone });
    
    if (customer) {
        // Update customer data if provided
        if (Object.keys(customerData).length > 0) {
            if (customerData.name && customerData.name.trim()) {
                customer.name = customerData.name.trim();
            }
            if (customerData.email !== undefined) customer.email = customerData.email;
            if (customerData.address !== undefined) customer.address = customerData.address;
            if (customerData.notes !== undefined) customer.notes = customerData.notes;
            await customer.save();
        }
        return customer;
    }
    
    // Create new customer
    const customerNumber = await this.generateCustomerNumber();
    
    // Ensure name is not empty string - use default if empty or undefined
    const customerName = (customerData.name && customerData.name.trim()) 
        ? customerData.name.trim() 
        : 'Walk-in Customer';
    
    customer = await this.create({
        customerNumber,
        phone: normalizedPhone,
        name: customerName,
        email: customerData.email,
        address: customerData.address,
        notes: customerData.notes,
        isActive: true
    });
    
    return customer;
};

// Virtual for formatted address
customerSchema.virtual('formattedAddress').get(function () {
    if (!this.address || !this.address.street) return '';
    
    const parts = [
        this.address.street,
        this.address.city,
        this.address.state,
        this.address.pincode,
        this.address.country
    ].filter(Boolean);
    
    return parts.join(', ');
});

// Instance method to get customer summary
customerSchema.methods.getSummary = function () {
    return `${this.name} (${this.phone}) - ${this.customerNumber}`;
};

module.exports = mongoose.model('Customer', customerSchema);

