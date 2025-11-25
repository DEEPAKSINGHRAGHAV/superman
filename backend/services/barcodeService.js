const mongoose = require('mongoose');
const Product = require('../models/Product');

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
     * Get the next sequence number for internal barcodes
     * Finds the highest existing barcode with prefix 21 and increments
     * @returns {Promise<number>} Next sequence number
     */
    static async getNextSequence() {
        try {
            // Find all products with barcodes starting with "21"
            const products = await Product.find({
                barcode: { $regex: /^21/, $exists: true, $ne: null }
            })
            .select('barcode')
            .lean();

            if (products.length === 0) {
                // No existing barcodes with prefix 21, start from 0
                return 0;
            }

            // Extract sequence numbers from barcodes
            const sequences = products
                .map(product => {
                    const barcode = product.barcode;
                    if (!barcode || barcode.length !== 13 || !barcode.startsWith('21')) {
                        return null;
                    }
                    // Extract sequence (digits 2-12, 0-indexed: 2-12, which is 10 digits)
                    const sequenceStr = barcode.substring(2, 12);
                    return parseInt(sequenceStr, 10);
                })
                .filter(seq => seq !== null && !isNaN(seq));

            if (sequences.length === 0) {
                return 0;
            }

            // Find maximum sequence and increment
            const maxSequence = Math.max(...sequences);
            return maxSequence + 1;
        } catch (error) {
            console.error('Error getting next barcode sequence:', error);
            // Fallback: try to find any barcode and use a safe default
            const productCount = await Product.countDocuments();
            // Use product count as a rough estimate, but ensure it's within valid range
            return Math.min(productCount, 9999999999);
        }
    }

    /**
     * Generate next available EAN-13 barcode for internal products
     * Includes retry mechanism to handle race conditions
     * @param {number} maxRetries - Maximum number of retry attempts (default: 5)
     * @returns {Promise<string>} Next available barcode
     */
    static async generateNextBarcode(maxRetries = 5) {
        let lastSequence = null;
        
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                // Get next sequence (will be higher than lastSequence if we're retrying)
                let nextSequence = await this.getNextSequence();
                
                // If we're retrying and got the same sequence, increment manually
                if (lastSequence !== null && nextSequence <= lastSequence) {
                    nextSequence = lastSequence + 1;
                }
                
                const generatedBarcode = this.generateEAN13(nextSequence);
                lastSequence = nextSequence;
                
                // Verify the generated barcode doesn't already exist (race condition check)
                const exists = await this.barcodeExists(generatedBarcode);
                if (!exists) {
                    return generatedBarcode;
                }
                
                // If barcode exists, increment sequence and retry
                if (attempt < maxRetries - 1) {
                    console.warn(`Generated barcode ${generatedBarcode} already exists, retrying with next sequence... (attempt ${attempt + 1}/${maxRetries})`);
                    // Small delay to allow other concurrent requests to complete
                    await new Promise(resolve => setTimeout(resolve, 50 * (attempt + 1)));
                }
            } catch (error) {
                console.error(`Error generating barcode (attempt ${attempt + 1}/${maxRetries}):`, error);
                if (attempt === maxRetries - 1) {
                    throw error;
                }
                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, 50 * (attempt + 1)));
            }
        }
        
        // If all retries failed due to collisions, use lastSequence + 1
        if (lastSequence !== null) {
            return this.generateEAN13(lastSequence + 1);
        }
        
        // Fallback: try one more time with a fresh sequence
        const nextSequence = await this.getNextSequence();
        return this.generateEAN13(nextSequence);
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
     * @returns {Promise<boolean>} True if barcode exists
     */
    static async barcodeExists(barcode, excludeProductId = null) {
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
        const existing = await Product.findOne(query);
        return !!existing;
    }
}

module.exports = BarcodeService;

