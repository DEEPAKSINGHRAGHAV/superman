const Bill = require('../models/Bill');
const Product = require('../models/Product');
const mongoose = require('mongoose');

class MarketBasketService {
    /**
     * Discovers frequent itemsets and association rules using a simplified Apriori approach
     * @param {Object} options Configuration options
     * @param {number} options.days Lookback period in days (default 90)
     * @param {number} options.minSupport Minimum support threshold 0-1 (e.g. 0.01)
     * @param {number} options.minConfidence Minimum confidence threshold 0-1 (e.g. 0.20)
     * @param {number} options.limit Max rules to return
     * @returns {Promise<Array>} List of association rules
     */
    static async getAssociationRules(options = {}) {
        const {
            days = 90,
            minSupport = 0.01,
            minConfidence = 0.20,
            limit = 50
        } = options;

        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            // Filter out bills with 1 or zero items since they don't form pairs
            const bills = await Bill.find({
                createdAt: { $gte: startDate }
            }).select('items.product items.productName').lean();

            const baskets = bills
                .map(bill => bill.items.map(item => item.product.toString()))
                .filter(basket => basket.length > 1);

            const totalTransactions = baskets.length;
            if (totalTransactions === 0) return [];

            // 1. Calculate 1-itemset frequencies
            const itemCounts = {};
            const productNames = {}; // Cache names

            bills.forEach(bill => {
                const uniqueItems = new Set();
                bill.items.forEach(item => {
                    const id = item.product.toString();
                    if (!uniqueItems.has(id)) {
                        itemCounts[id] = (itemCounts[id] || 0) + 1;
                        productNames[id] = item.productName;
                        uniqueItems.add(id);
                    }
                });
            });

            // 2. Filter 1-itemsets by min support
            const frequentItems = new Set();
            for (const [item, count] of Object.entries(itemCounts)) {
                if (count / totalTransactions >= minSupport) {
                    frequentItems.add(item);
                }
            }

            // 3. Calculate 2-itemset (pairs) frequencies
            const pairCounts = {};
            baskets.forEach(basket => {
                const b = Array.from(new Set(basket)).filter(item => frequentItems.has(item));
                
                for (let i = 0; i < b.length; i++) {
                    for (let j = i + 1; j < b.length; j++) {
                        // Create a stable pair key "A,B" where A < B alphabetically for uniqueness
                        const item1 = b[i];
                        const item2 = b[j];
                        const pair = item1 < item2 ? `${item1},${item2}` : `${item2},${item1}`;
                        pairCounts[pair] = (pairCounts[pair] || 0) + 1;
                    }
                }
            });

            // 4. Generate association rules (A => B and B => A)
            const rules = [];

            for (const [pairKey, pairCount] of Object.entries(pairCounts)) {
                const pairSupport = pairCount / totalTransactions;
                
                if (pairSupport < minSupport) continue;

                const [itemA, itemB] = pairKey.split(',');

                const countA = itemCounts[itemA];
                const countB = itemCounts[itemB];

                const supportA = countA / totalTransactions;
                const supportB = countB / totalTransactions;

                // Rule A => B
                const confidenceAtoB = pairSupport / supportA;
                const liftAtoB = confidenceAtoB / supportB;

                if (confidenceAtoB >= minConfidence && liftAtoB > 1) {
                    rules.push({
                        antecedent: { id: itemA, name: productNames[itemA] },
                        consequent: { id: itemB, name: productNames[itemB] },
                        support: Number((pairSupport * 100).toFixed(2)),
                        confidence: Number((confidenceAtoB * 100).toFixed(2)),
                        lift: Number(liftAtoB.toFixed(2)),
                        transactionsCombined: pairCount
                    });
                }

                // Rule B => A
                const confidenceBtoA = pairSupport / supportB;
                const liftBtoA = confidenceBtoA / supportA;

                if (confidenceBtoA >= minConfidence && liftBtoA > 1) {
                    rules.push({
                        antecedent: { id: itemB, name: productNames[itemB] },
                        consequent: { id: itemA, name: productNames[itemA] },
                        support: Number((pairSupport * 100).toFixed(2)),
                        confidence: Number((confidenceBtoA * 100).toFixed(2)),
                        lift: Number(liftBtoA.toFixed(2)),
                        transactionsCombined: pairCount
                    });
                }
            }

            // Sort by lift (highest first), then confidence
            rules.sort((a, b) => b.lift - a.lift || b.confidence - a.confidence);

            return rules.slice(0, limit);

        } catch (error) {
            console.error('Error in Market Basket Analysis:', error);
            throw error;
        }
    }

    /**
     * Get real-time upselling suggestions for a specific cart
     * @param {Array<string>} cartProductIds List of product IDs in cart
     * @returns {Promise<Array>} List of suggested product objects
     */
    static async getCartSuggestions(cartProductIds) {
        if (!cartProductIds || cartProductIds.length === 0) return [];

        try {
            // Fetch cached or active rules
            const rules = await this.getAssociationRules({
                days: 60, // Shorter lookback for more recent trends
                minSupport: 0.005, // Lower support for more granular suggestions
                limit: 200
            });

            // Find all rules where the antecedent (Item A) is in the current cart
            const matchingRules = rules.filter(rule => 
                cartProductIds.includes(rule.antecedent.id) &&
                !cartProductIds.includes(rule.consequent.id) // Don't suggest what they already have
            );

            // Group by consequent to avoid duplicates (if A -> C and B -> C, we only suggest C once)
            const suggestionsMap = new Map();
            matchingRules.forEach(rule => {
                if (!suggestionsMap.has(rule.consequent.id)) {
                    suggestionsMap.set(rule.consequent.id, rule);
                } else {
                    // Keep the one with the highest lift
                    if (rule.lift > suggestionsMap.get(rule.consequent.id).lift) {
                        suggestionsMap.set(rule.consequent.id, rule);
                    }
                }
            });

            const topSuggestions = Array.from(suggestionsMap.values())
                .sort((a, b) => b.lift - a.lift)
                .slice(0, 5); // Return top 5 suggestions
                
            // Fetch the full product objects for the frontend
            const productIds = topSuggestions.map(rule => rule.consequent.id);
            const products = await Product.find({ _id: { $in: productIds } }).lean();
            
            return topSuggestions.map(rule => {
                const product = products.find(p => p._id.toString() === rule.consequent.id);
                return {
                    ...rule,
                    product
                };
            }).filter(s => s.product); // Filter out any missing products

        } catch (error) {
            console.error('Error getting cart suggestions:', error);
            return [];
        }
    }
}

module.exports = MarketBasketService;
