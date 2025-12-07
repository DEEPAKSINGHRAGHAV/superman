const mongoose = require('mongoose');
const Product = require('../models/Product');
const BarcodeCounter = require('../models/BarcodeCounter');

class BarcodeService {
    /**
     * Calculate EAN-13 check digit
     * @param {string} barcode - 12-digit barcode without check digit
     * @returns {number} Check digit (0-9)
     */
    static calculateCheckDigit(barcode) {
        if (barcode.length !== 12) {
            throw new Error('Barcode must be 12 digits for EAN-13 check digit calculation');
        }

        let sum = 0;
        for (let i = 0; i < 12; i++) {
            const digit = parseInt(barcode[i]);
            // Odd positions (1-indexed) are multiplied by 1, even by 3
            // Since we're 0-indexed, even indices are multiplied by 1, odd by 3
            sum += (i % 2 === 0) ? digit : digit * 3;
        }

        const remainder = sum % 10;
        return remainder === 0 ? 0 : 10 - remainder;
    }

    /**
     * Generate EAN-13 barcode with prefix 21 (for internal products)
     * Format: 21 + 10-digit sequence + 1 check digit = 13 digits total
     * @param {number} sequence - Sequence number (0-9999999999)
     * @returns {string} Complete EAN-13 barcode
     */
    static generateEAN13(sequence) {
        if (sequence < 0 || sequence > 9999999999) {
            throw new Error('Sequence must be between 0 and 9999999999');
        }

        // Prefix for internal products
        const prefix = '21';
        
        // Pad sequence to 10 digits (EAN-13 needs 12 digits before check digit, prefix is 2, so sequence is 10)
        const sequenceStr = sequence.toString().padStart(10, '0');
        
        // Combine prefix and sequence (12 digits total before check digit)
        const barcodeWithoutCheck = prefix + sequenceStr;
        
        // Verify we have exactly 12 digits
        if (barcodeWithoutCheck.length !== 12) {
            throw new Error(`Invalid barcode length: expected 12 digits, got ${barcodeWithoutCheck.length}`);
        }
        
        // Calculate check digit
        const checkDigit = this.calculateCheckDigit(barcodeWithoutCheck);
        
        // Return complete 13-digit barcode
        return barcodeWithoutCheck + checkDigit.toString();
    }

    /**
     * Get the next sequence number for internal barcodes using atomic counter
     * Uses MongoDB atomic $inc operation for O(1) performance and race condition safety
     * @param {mongoose.ClientSession} session - Optional MongoDB session for transactions
     * @returns {Promise<number>} Next sequence number
     */
    static async getNextSequence(session = null) {
        try {
            // Atomic increment - O(1) operation, no race conditions
            const updateOptions = { 
                new: true,           // Return updated document
                upsert: true,        // Create if doesn't exist
                setDefaultsOnInsert: true
            };
            
            // Add session if provided (for transactions)
            if (session) {
                updateOptions.session = session;
            }
            
            const counter = await BarcodeCounter.findByIdAndUpdate(
                'barcode_sequence',
                { $inc: { sequence: 1 } },
                updateOptions
            );

            // Validate sequence is within valid range
            if (counter.sequence > 9999999999) {
                throw new Error('Barcode sequence has reached maximum value (9999999999)');
            }

            return counter.sequence;
        } catch (error) {
            console.error('Error getting next barcode sequence:', error);
            throw new Error(`Failed to generate barcode sequence: ${error.message}`);
        }
    }

    /**
     * Generate next available EAN-13 barcode for internal products
     * Uses atomic counter, so no race conditions or retries needed
     * @param {mongoose.ClientSession} session - Optional MongoDB session for transactions
     * @param {string} excludeProductId - Product ID to exclude from existence check (for updates)
     * @returns {Promise<string>} Next available barcode
     */
    static async generateNextBarcode(session = null, excludeProductId = null) {
        try {
            // Get next sequence atomically (no race conditions possible)
            const nextSequence = await this.getNextSequence(session);
            
            // Generate barcode from sequence
            const generatedBarcode = this.generateEAN13(nextSequence);
            
            // Optional: Verify barcode doesn't exist (safety check)
            // This should never happen with atomic counter, but good for safety
            // Exclude current product if provided (for update scenarios)
            const exists = await this.barcodeExists(generatedBarcode, excludeProductId, session);
            if (exists) {
                // This is extremely rare - indicates data corruption or manual intervention
                console.error(`WARNING: Generated barcode ${generatedBarcode} already exists! This should not happen with atomic counter.`);
                throw new Error('Barcode collision detected - please contact support');
            }
            
            return generatedBarcode;
        } catch (error) {
            console.error('Error generating barcode:', error);
            throw error; // Fail fast instead of silent fallback
        }
    }

    /**
     * Validate EAN-13 barcode format and check digit
     * @param {string} barcode - Barcode to validate
     * @returns {boolean} True if valid
     */
    static validateEAN13(barcode) {
        if (!barcode || typeof barcode !== 'string') {
            return false;
        }

        // Must be exactly 13 digits
        if (!/^\d{13}$/.test(barcode)) {
            return false;
        }

        // Extract first 12 digits and check digit
        const barcodeWithoutCheck = barcode.substring(0, 12);
        const providedCheckDigit = parseInt(barcode[12]);

        // Calculate expected check digit
        const calculatedCheckDigit = this.calculateCheckDigit(barcodeWithoutCheck);

        return providedCheckDigit === calculatedCheckDigit;
    }

    /**
     * Check if barcode already exists
     * @param {string} barcode - Barcode to check
     * @param {string} excludeProductId - Product ID to exclude from check (for updates)
     * @param {mongoose.ClientSession} session - Optional MongoDB session for transactions
     * @returns {Promise<boolean>} True if barcode exists
     */
    static async barcodeExists(barcode, excludeProductId = null, session = null) {
        if (!barcode || typeof barcode !== 'string') {
            return false;
        }
        
        const query = { barcode: barcode.trim() };
        if (excludeProductId) {
            // Convert to ObjectId if it's a valid ObjectId string
            if (mongoose.Types.ObjectId.isValid(excludeProductId)) {
                query._id = { $ne: new mongoose.Types.ObjectId(excludeProductId) };
            } else {
                query._id = { $ne: excludeProductId };
            }
        }
        
        const options = session ? { session } : {};
        const existing = await Product.findOne(query, null, options);
        return !!existing;
    }
}

module.exports = BarcodeService;

