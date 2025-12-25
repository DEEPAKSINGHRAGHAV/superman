const mongoose = require('mongoose');
const BarcodeCounter = require('./BarcodeCounter');

// Note: mongoose must be imported at top level for session support

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

// Static method to find or create customer by phone (ATOMIC - prevents race conditions)
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
    
    // Use transaction to prevent race conditions
    // Note: We use a single transaction for the entire operation
    // generateCustomerNumber uses its own transaction, so we call it first
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        // First, try to find existing customer within transaction (with read concern)
        let customer = await this.findOne({ phone: normalizedPhone })
            .session(session)
            .lean(false); // Return document, not plain object
        
        if (customer) {
            // Update customer data if provided
            if (Object.keys(customerData).length > 0) {
                if (customerData.name && customerData.name.trim()) {
                    customer.name = customerData.name.trim();
                }
                if (customerData.email !== undefined) customer.email = customerData.email;
                if (customerData.address !== undefined) customer.address = customerData.address;
                if (customerData.notes !== undefined) customer.notes = customerData.notes;
                await customer.save({ session });
            }
            await session.commitTransaction();
            return customer;
        }
        
        // Customer doesn't exist - create new one atomically
        // Generate customer number first (it uses its own transaction, but that's okay)
        // We'll handle the race condition with duplicate key error handling
        const customerNumber = await this.generateCustomerNumber();
        
        // Ensure name is not empty string - use default if empty or undefined
        const customerName = (customerData.name && customerData.name.trim()) 
            ? customerData.name.trim() 
            : 'Walk-in Customer';
        
        // Create customer within transaction
        // Use create with array to support session
        const newCustomers = await this.create([{
            customerNumber,
            phone: normalizedPhone,
            name: customerName,
            email: customerData.email,
            address: customerData.address,
            notes: customerData.notes,
            isActive: true
        }], { session });
        
        await session.commitTransaction();
        return newCustomers[0];
    } catch (error) {
        await session.abortTransaction();
        
        // Handle duplicate key error (race condition occurred - another request created customer)
        if (error.code === 11000 && error.keyPattern && error.keyPattern.phone) {
            // Another request created the customer - retry find operation
            const customer = await this.findOne({ phone: normalizedPhone });
            if (customer) {
                // Update if data provided
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
        }
        throw error;
    } finally {
        session.endSession();
    }
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

