const BarcodeService = require('./barcodeService');

/**
 * Barcode Handler Service
 * 
 * Handles barcode validation, generation, and processing logic
 * Extracted from routes to eliminate code duplication and improve maintainability
 */
class BarcodeHandler {
    /**
     * Check if barcode value is empty
     * @param {any} barcodeValue - Barcode value to check
     * @returns {boolean} True if barcode is empty
     */
    static isEmptyBarcode(barcodeValue) {
        return (
            barcodeValue === null ||
            barcodeValue === undefined ||
            barcodeValue === '' ||
            (typeof barcodeValue === 'string' && barcodeValue.trim() === '')
        );
    }

    /**
     * Trim and normalize barcode value
     * @param {any} barcodeValue - Barcode value to normalize
     * @returns {string} Trimmed barcode string
     */
    static normalizeBarcode(barcodeValue) {
        if (typeof barcodeValue === 'string') {
            return barcodeValue.trim();
        }
        return String(barcodeValue).trim();
    }

    /**
     * Validate EAN-13 barcode format
     * @param {string} barcode - Barcode to validate
     * @returns {Object} { valid: boolean, error?: string }
     */
    static validateBarcodeFormat(barcode) {
        // Check if it looks like an EAN-13 barcode (13 digits)
        if (barcode.length === 13 && /^\d{13}$/.test(barcode)) {
            const isValidEAN13 = BarcodeService.validateEAN13(barcode);
            if (!isValidEAN13) {
                return {
                    valid: false,
                    error: 'Invalid EAN-13 barcode format (check digit mismatch)'
                };
            }
        }
        return { valid: true };
    }

    /**
     * Process barcode for product creation/update
     * Handles auto-generation, validation, and uniqueness checks
     * 
     * @param {Object} options - Processing options
     * @param {any} options.barcodeValue - Barcode value from request
     * @param {boolean} options.hasBarcodeInRequest - Whether barcode field is in request
     * @param {string} options.excludeProductId - Product ID to exclude from uniqueness check (for updates)
     * @param {mongoose.ClientSession} options.session - MongoDB session for transactions
     * @returns {Promise<Object>} { barcode: string, generated: boolean } or throws error
     */
    static async processBarcode({
        barcodeValue,
        hasBarcodeInRequest = true,
        excludeProductId = null,
        session = null
    }) {
        // Case 1: Barcode field not in request (treat as intentionally cleared)
        if (!hasBarcodeInRequest) {
            const generatedBarcode = await BarcodeService.generateNextBarcode(session);
            return {
                barcode: generatedBarcode,
                generated: true
            };
        }

        // Case 2: Barcode field is in request
        const isEmpty = this.isEmptyBarcode(barcodeValue);

        if (isEmpty) {
            // Barcode is empty/cleared - generate new one
            const generatedBarcode = await BarcodeService.generateNextBarcode(session);
            return {
                barcode: generatedBarcode,
                generated: true
            };
        }

        // Case 3: Barcode has a value - validate and use it
        const trimmedBarcode = this.normalizeBarcode(barcodeValue);

        if (!trimmedBarcode) {
            // Empty string after trim - generate barcode
            const generatedBarcode = await BarcodeService.generateNextBarcode(session);
            return {
                barcode: generatedBarcode,
                generated: true
            };
        }

        // Validate EAN-13 format if applicable
        const formatValidation = this.validateBarcodeFormat(trimmedBarcode);
        if (!formatValidation.valid) {
            throw new Error(formatValidation.error);
        }

        // Check if barcode already exists
        const exists = await BarcodeService.barcodeExists(trimmedBarcode, excludeProductId, session);
        if (exists) {
            const errorMessage = excludeProductId
                ? 'Barcode already exists on another product'
                : 'Barcode already exists';
            throw new Error(errorMessage);
        }

        return {
            barcode: trimmedBarcode,
            generated: false
        };
    }
}

module.exports = BarcodeHandler;

