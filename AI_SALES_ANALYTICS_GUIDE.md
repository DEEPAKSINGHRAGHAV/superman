# AI Sales Analytics: Market Basket Implementation Guide

This document serves as a complete reference guide for the Data Mining and Market Basket Analysis features implemented in the ShivikMart POS system. It details the transition from the initial LLM strategy to the pure math-based algorithmic approach, along with the exact paths of the files that power these features.

---

## 🎯 Architecture Summary

We pivoted away from using external Generative AI (LLMs) because parsing large volumes of transactional data via natural language is slow, costly, and mathematically inaccurate for finding association patterns. 

Instead, we built **Market Basket Analysis (MBA)** directly into your NodeJS backend. Using a custom algorithm (inspired by FP-Growth/Apriori), the system analyzes the `items` array of your `Bill` documents to calculate precise product associations. 

The AI engine extracts three metrics:
1.  **Support:** How often specific products appear together overall.
2.  **Confidence:** The exact percentage chance that buying Product A leads to buying Product B.
3.  **Lift:** The multiplier effect showing how much the sale of Product B is accelerated by Product A.

These insights are then pushed to:
1.  **The Dashboard:** As a visual reporting tool for store owners.
2.  **The Checkout POS:** As real-time upsell suggestions for cashiers.

---

## 📁 What Was Implemented and Where

### 1. The Core AI Engine (Backend)
This is where the heavy lifting happens. It queries the database, extracts baskets, and computes the mathematical associations.

*   **File:** `backend/services/marketBasketService.js` **[NEW]**
    *   *What it does:* Houses the `MarketBasketService` class.
    *   *Key Methods:* 
        *   `getAssociationRules()`: Looks back 90 days, finds frequent 1-itemsets, builds 2-itemsets (pairs), and calculates Lift and Confidence.
        *   `getCartSuggestions(cartProductIds)`: Takes live cart contents and returns the top 5 `consequent` products that the customer is statistically likely to buy, appending the full MongoDB product objects for the frontend to render.

### 2. The API Layer (Backend)
This exposes the MBA engine to the React frontend.

*   **File:** `backend/routes/analyticsRoutes.js` **[NEW]**
    *   *What it does:* Defines the express routes needed to query patterns.
    *   *Key Endpoints:*
        *   `GET /api/v1/analytics/basket-patterns`: Retrieves the global high-lift association rules.
        *   `POST /api/v1/analytics/cart-suggestions`: Accepts an array of product IDs currently in a shopping cart and returns live upsell suggestions.

*   **File:** `backend/routes/index.js` **[MODIFIED]**
    *   *What changed:* Hooked up the new `analyticsRoutes` into the main Express router under the `/api/v1/analytics` path.

### 3. The API Integration (Frontend)
The React service layer configured to talk to our new backend routes.

*   **File:** `website/src/services/api.js` **[MODIFIED]**
    *   *What changed:* Appended `analyticsAPI` at the bottom of the file which exports `getBasketPatterns` and `getCartSuggestions` mapped to Axios requests.

### 4. Admin Reporting / Visuals (Frontend)
The place where store owners can review AI findings to adjust physical store layouts or create promotional bundles.

*   **File:** `website/src/pages/Dashboard.jsx` **[MODIFIED]**
    *   *What changed:*
        *   Added `analyticsAPI` to the data-fetching `useEffect` during dashboard load.
        *   Appended a new **"Sales Patterns"** UI block below the Low Stock and Expiring packages sections. 
        *   This section renders a dynamic grid showing high-confidence pairings formatted simply: `[Item A] ➔ [Item B] (Lift: 2.5x)`.

### 5. Real-Time Cashier Upselling (Frontend)
The revenue-generating feature directly in the cashier's workflow.

*   **File:** `website/src/pages/billing/BillingScreen.jsx` **[MODIFIED]**
    *   *What changed:*
        *   Added local state `const [upsellSuggestions, setUpsellSuggestions]`.
        *   Created a `useEffect` that listens to `cart` changes (debounced by 500ms). Whenever the cart changes, it sends the current cart IDs to the backend.
        *   Injected a **"Customers also bought..."** tray right under the massive barcode scanner UI.
        *   When suggestions render, clicking on them triggers the native `addToCart` function, instantly appending the suggested item to the bill.

---

## 🛠️ How to Tweak the AI Algorithm

If you find that the AI is generating too many weak suggestions, or not enough suggestions at all, you can easily tweak the engine thresholds in the backend.

Open `backend/services/marketBasketService.js` and look at the default parameters:

```javascript
// Defaults to looking back 90 days, needing at least 1% support and 20% confidence
const {
    days = 90, 
    minSupport = 0.01,   // Increase this (e.g. 0.05) to only show highly frequent pairs
    minConfidence = 0.20 // Increase this (e.g. 0.50) to only show highly certain pairs
} = options;
```

Similarly, the live cart suggestions use a much lower threshold (`minSupport: 0.005`) to ensure a cashier always gets at least some helpful tips during a transaction. You can modify those parameters directly inside the `getCartSuggestions` method to fine-tune the system's aggressiveness.
