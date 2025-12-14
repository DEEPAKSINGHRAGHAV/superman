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
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * USAGE SCENARIOS:
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 1. FRESH DATABASE (New Installation):
 *    - No action needed
 *    - Counter is auto-created on first product via upsert in getNextSequence()
 *    - First product gets sequence 1 → barcode 2100000000018
 * 
 * 2. DATA MIGRATION (Importing Existing Client Data):
 *    - After importing products with existing "21" prefix barcodes
 *    - Run: node backend/scripts/syncBarcodeCounter.js
 *    - This finds the highest existing sequence and sets counter to continue from there
 *    - Prevents barcode collisions with imported data
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
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

// Note: _id is already indexed by default in MongoDB, no need to create custom index
// MongoDB doesn't allow overwriting the default _id index

module.exports = mongoose.model('BarcodeCounter', barcodeCounterSchema);

