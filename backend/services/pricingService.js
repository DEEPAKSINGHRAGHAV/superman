const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');
const mongoose = require('mongoose');

class PricingService {
    /**
     * Calculate profit margin for a product
     * @param {number} costPrice - Cost price
     * @param {number} sellingPrice - Selling price
     * @returns {number} Profit margin percentage
     */
    static calculateProfitMargin(costPrice, sellingPrice) {
        if (sellingPrice === 0) return 0;
        return ((sellingPrice - costPrice) / sellingPrice) * 100;
    }

    /**
     * Calculate markup for a product
     * @param {number} costPrice - Cost price
     * @param {number} sellingPrice - Selling price
     * @returns {number} Markup percentage
     */
    static calculateMarkup(costPrice, sellingPrice) {
        if (costPrice === 0) return 0;
        return ((sellingPrice - costPrice) / costPrice) * 100;
    }

    /**
     * Calculate selling price with desired margin
     * @param {number} costPrice - Cost price
     * @param {number} marginPercentage - Desired margin percentage
     * @returns {number} Calculated selling price
     */
    static calculateSellingPriceWithMargin(costPrice, marginPercentage) {
        return costPrice / (1 - (marginPercentage / 100));
    }

    /**
     * Calculate selling price with desired markup
     * @param {number} costPrice - Cost price
     * @param {number} markupPercentage - Desired markup percentage
     * @returns {number} Calculated selling price
     */
    static calculateSellingPriceWithMarkup(costPrice, markupPercentage) {
        return costPrice * (1 + (markupPercentage / 100));
    }

    /**
     * Update product pricing
     * @param {string} productId - Product ID
     * @param {Object} pricingData - New pricing data
     * @param {string} updatedBy - User ID who updated
     * @returns {Promise<Object>} Updated product
     */
    static async updateProductPricing(productId, pricingData, updatedBy) {
        const {
            costPrice,
            sellingPrice,
            mrp,
            reason = 'Manual price update'
        } = pricingData;

        // Validate pricing logic
        if (sellingPrice < costPrice) {
            throw new Error('Selling price cannot be less than cost price');
        }

        if (mrp && sellingPrice > mrp) {
            throw new Error('Selling price cannot be greater than MRP');
        }

        const product = await Product.findById(productId);
        if (!product) {
            throw new Error('Product not found');
        }

        // Store old prices for history
        const oldPricing = {
            costPrice: product.costPrice,
            sellingPrice: product.sellingPrice,
            mrp: product.mrp
        };

        // Update product
        const updatedProduct = await Product.findByIdAndUpdate(
            productId,
            {
                costPrice,
                sellingPrice,
                mrp,
                updatedAt: new Date()
            },
            { new: true }
        );

        // Log price change (you might want to create a PriceHistory model)
        console.log(`Price updated for product ${productId}:`, {
            old: oldPricing,
            new: { costPrice, sellingPrice, mrp },
            updatedBy,
            reason,
            timestamp: new Date()
        });

        return updatedProduct;
    }

    /**
     * Bulk update pricing for multiple products
     * @param {Array} pricingUpdates - Array of pricing updates
     * @param {string} updatedBy - User ID
     * @returns {Promise<Array>} Results of updates
     */
    static async bulkUpdatePricing(pricingUpdates, updatedBy) {
        const results = [];

        for (const update of pricingUpdates) {
            try {
                const result = await this.updateProductPricing(
                    update.productId,
                    update.pricingData,
                    updatedBy
                );
                results.push({ success: true, product: result });
            } catch (error) {
                results.push({
                    success: false,
                    productId: update.productId,
                    error: error.message
                });
            }
        }

        return results;
    }

    /**
     * Get pricing analytics for all products
     * @returns {Promise<Object>} Pricing analytics
     */
    static async getPricingAnalytics() {
        const analytics = await Product.aggregate([
            { $match: { isActive: true } },
            {
                $addFields: {
                    profitMargin: {
                        $multiply: [
                            {
                                $divide: [
                                    { $subtract: ['$sellingPrice', '$costPrice'] },
                                    '$sellingPrice'
                                ]
                            },
                            100
                        ]
                    },
                    markup: {
                        $multiply: [
                            {
                                $divide: [
                                    { $subtract: ['$sellingPrice', '$costPrice'] },
                                    '$costPrice'
                                ]
                            },
                            100
                        ]
                    },
                    inventoryValue: {
                        $multiply: ['$currentStock', '$costPrice']
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    totalProducts: { $sum: 1 },
                    averageCostPrice: { $avg: '$costPrice' },
                    averageSellingPrice: { $avg: '$sellingPrice' },
                    averageMRP: { $avg: '$mrp' },
                    averageProfitMargin: { $avg: '$profitMargin' },
                    averageMarkup: { $avg: '$markup' },
                    totalInventoryValue: { $sum: '$inventoryValue' },
                    totalPotentialRevenue: {
                        $sum: { $multiply: ['$currentStock', '$sellingPrice'] }
                    },
                    lowMarginProducts: {
                        $sum: {
                            $cond: [
                                { $lt: ['$profitMargin', 10] },
                                1,
                                0
                            ]
                        }
                    },
                    highMarginProducts: {
                        $sum: {
                            $cond: [
                                { $gt: ['$profitMargin', 50] },
                                1,
                                0
                            ]
                        }
                    }
                }
            }
        ]);

        return analytics[0] || {};
    }

    /**
     * Get category-wise pricing analytics
     * @returns {Promise<Array>} Category pricing analytics
     */
    static async getCategoryPricingAnalytics() {
        return await Product.aggregate([
            { $match: { isActive: true } },
            {
                $addFields: {
                    profitMargin: {
                        $multiply: [
                            {
                                $divide: [
                                    { $subtract: ['$sellingPrice', '$costPrice'] },
                                    '$sellingPrice'
                                ]
                            },
                            100
                        ]
                    },
                    inventoryValue: {
                        $multiply: ['$currentStock', '$costPrice']
                    }
                }
            },
            {
                $group: {
                    _id: '$category',
                    totalProducts: { $sum: 1 },
                    averageCostPrice: { $avg: '$costPrice' },
                    averageSellingPrice: { $avg: '$sellingPrice' },
                    averageMRP: { $avg: '$mrp' },
                    averageProfitMargin: { $avg: '$profitMargin' },
                    totalInventoryValue: { $sum: '$inventoryValue' },
                    totalPotentialRevenue: {
                        $sum: { $multiply: ['$currentStock', '$sellingPrice'] }
                    }
                }
            },
            { $sort: { averageProfitMargin: -1 } }
        ]);
    }

    /**
     * Find products with low profit margins
     * @param {number} threshold - Margin threshold percentage
     * @returns {Promise<Array>} Products with low margins
     */
    static async findLowMarginProducts(threshold = 15) {
        return await Product.find({
            isActive: true,
            $expr: {
                $lt: [
                    {
                        $multiply: [
                            {
                                $divide: [
                                    { $subtract: ['$sellingPrice', '$costPrice'] },
                                    '$sellingPrice'
                                ]
                            },
                            100
                        ]
                    },
                    threshold
                ]
            }
        })
            .select('name sku costPrice sellingPrice mrp category currentStock')
            .sort({ sellingPrice: 1 });
    }

    /**
     * Find products with high profit margins
     * @param {number} threshold - Margin threshold percentage
     * @returns {Promise<Array>} Products with high margins
     */
    static async findHighMarginProducts(threshold = 40) {
        return await Product.find({
            isActive: true,
            $expr: {
                $gt: [
                    {
                        $multiply: [
                            {
                                $divide: [
                                    { $subtract: ['$sellingPrice', '$costPrice'] },
                                    '$sellingPrice'
                                ]
                            },
                            100
                        ]
                    },
                    threshold
                ]
            }
        })
            .select('name sku costPrice sellingPrice mrp category currentStock')
            .sort({ sellingPrice: -1 });
    }

    /**
     * Calculate price recommendations based on cost changes
     * @param {string} productId - Product ID
     * @param {number} newCostPrice - New cost price
     * @param {number} desiredMargin - Desired margin percentage
     * @returns {Object} Price recommendations
     */
    static calculatePriceRecommendations(productId, newCostPrice, desiredMargin = 25) {
        const currentMargin = this.calculateProfitMargin(newCostPrice, newCostPrice);
        const recommendedSellingPrice = this.calculateSellingPriceWithMargin(newCostPrice, desiredMargin);

        return {
            productId,
            currentCostPrice: newCostPrice,
            recommendedSellingPrice,
            currentMargin: 0,
            desiredMargin,
            marginDifference: desiredMargin - currentMargin,
            priceIncrease: recommendedSellingPrice - newCostPrice,
            percentageIncrease: ((recommendedSellingPrice - newCostPrice) / newCostPrice) * 100
        };
    }

    /**
     * Get pricing trends for a product
     * @param {string} productId - Product ID
     * @param {number} days - Number of days to look back
     * @returns {Promise<Array>} Pricing trend data
     */
    static async getPricingTrends(productId, days = 30) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // This would require a PriceHistory model to track price changes over time
        // For now, we'll return current pricing info
        const product = await Product.findById(productId)
            .select('name sku costPrice sellingPrice mrp updatedAt');

        if (!product) {
            throw new Error('Product not found');
        }

        return [{
            date: product.updatedAt,
            costPrice: product.costPrice,
            sellingPrice: product.sellingPrice,
            mrp: product.mrp,
            profitMargin: this.calculateProfitMargin(product.costPrice, product.sellingPrice)
        }];
    }
}

module.exports = PricingService;
