const express = require('express');
const router = express.Router();
const MarketBasketService = require('../services/marketBasketService');
const { protect } = require('../middleware/auth');

// @route   GET /api/VERSION/analytics/basket-patterns
// @desc    Get association rules for products (frequently bought together)
// @access  Private
router.get('/basket-patterns', protect, async (req, res) => {
    try {
        const { days = 90, limit = 50, minSupport = 0.01, minConfidence = 0.20 } = req.query;
        
        const rules = await MarketBasketService.getAssociationRules({
            days: parseInt(days),
            limit: parseInt(limit),
            minSupport: parseFloat(minSupport),
            minConfidence: parseFloat(minConfidence)
        });
        
        res.status(200).json({
            success: true,
            count: rules.length,
            data: rules
        });
    } catch (error) {
        console.error('Error fetching basket patterns:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate market basket patterns',
            error: error.message
        });
    }
});

// @route   POST /api/VERSION/analytics/cart-suggestions
// @desc    Get real-time suggestions based on current cart
// @access  Private
router.post('/cart-suggestions', protect, async (req, res) => {
    try {
        const { cartProductIds } = req.body;
        
        if (!cartProductIds || !Array.isArray(cartProductIds)) {
            return res.status(400).json({
                success: false,
                message: 'Please provide an array of cartProductIds'
            });
        }

        const suggestions = await MarketBasketService.getCartSuggestions(cartProductIds);
        
        res.status(200).json({
            success: true,
            count: suggestions.length,
            data: suggestions
        });
    } catch (error) {
        console.error('Error generating cart suggestions:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate suggestions',
            error: error.message
        });
    }
});

module.exports = router;
