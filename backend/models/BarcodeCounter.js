const mongoose = require('mongoose');

/**
 * BarcodeCounter Model
 * 
 * Atomic counter collection for O(1) barcode sequence generation.
 * Uses MongoDB's atomic $inc operation to prevent race conditions.
 * 
 * Structure:
 * - _id: 'barcode_sequence' (fixed ID for single document)
 * - sequence: Current sequence number (0 to 9999999999)
 * 
 * Performance: O(1) - constant time regardless of product count
 */
const barcodeCounterSchema = new mongoose.Schema({
    _id: {
        type: String,
        default: 'barcode_sequence',
        required: true
    },
    sequence: {
        type: Number,
        default: 0,
        required: true,
        min: 0,
        max: 9999999999 // EAN-13 max sequence (10 digits: 0-9999999999)
    }
}, {
    timestamps: false, // No need for timestamps on counter
    collection: 'barcodecounters' // Explicit collection name
});

// Ensure index for fast lookup (though _id is already indexed by default)
barcodeCounterSchema.index({ _id: 1 }, { unique: true });

module.exports = mongoose.model('BarcodeCounter', barcodeCounterSchema);

