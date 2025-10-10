# Category Setup Guide

## Quick Start

After the category system integration fix, you need to populate the database with the default categories to ensure backward compatibility with existing products.

## Step-by-Step Setup

### 1. Navigate to Backend Directory

```bash
cd backend
```

### 2. Run the Category Seed Script

```bash
npm run seed-categories
```

This will create the following 11 default categories in your database:

1. 🛒 **Grocery** - Essential grocery items and packaged foods
2. 🍟 **Snacks** - Chips, crackers, nuts, and other snack items
3. 💄 **Personal Care** - Personal hygiene and beauty products
4. 🥛 **Dairy** - Milk, cheese, yogurt, and other dairy products
5. 🥗 **Fruits & Vegetables** - Fresh fruits and vegetables
6. 🍖 **Meat & Seafood** - Fresh and frozen meat, poultry, and seafood
7. 🍰 **Bakery** - Bread, pastries, cakes, and baked goods
8. 🥤 **Beverages** - Soft drinks, juices, water, and other beverages
9. 🏠 **Household** - Home and household essentials, cleaning supplies
10. 📱 **Electronics** - Electronic devices and accessories
11. 📦 **Other** - Miscellaneous items and other products

### Expected Output

```
✅ Connected to MongoDB
📂 Seeding default categories...
   ✅ Created: Grocery
   ✅ Created: Snacks
   ✅ Created: Personal Care
   ✅ Created: Dairy
   ✅ Created: Fruits & Vegetables
   ✅ Created: Meat & Seafood
   ✅ Created: Bakery
   ✅ Created: Beverages
   ✅ Created: Household
   ✅ Created: Electronics
   ✅ Created: Other

🎉 Seeding complete!
   ✅ Created: 11 categories
   ⏭️  Skipped: 0 categories (already existed)
   📊 Total: 11 categories processed

📋 Current categories in database:
   1. 🟢 ⭐ Grocery (grocery)
   2. 🟢 ⭐ Snacks (snacks)
   3. 🟢 ⭐ Personal Care (personal-care)
   4. 🟢 ⭐ Dairy (dairy)
   5. 🟢 ⭐ Fruits & Vegetables (fruits-vegetables)
   6. 🟢    Meat & Seafood (meat-seafood)
   7. 🟢    Bakery (bakery)
   8. 🟢 ⭐ Beverages (beverages)
   9. 🟢    Household (household)
   10. 🟢    Electronics (electronics)
   11. 🟢    Other (other)

💡 Categories are now ready for use in the mobile app!
   Open the Product Addition page to see all categories.
```

## What Happens When You Run It?

1. **Connects to Database** - Uses your MongoDB connection from `config.env`
2. **Checks Admin User** - Requires an admin user to exist (for `createdBy` field)
3. **Creates Categories** - Creates each category if it doesn't exist
4. **Skips Existing** - Won't duplicate categories if they already exist
5. **Displays Summary** - Shows what was created/skipped

## Troubleshooting

### Error: "No admin user found"

If you see this error:
```
❌ No admin user found. Please create an admin user first.
   Run: npm run create-admin
```

**Solution**: Create an admin user first
```bash
npm run create-admin
```

Then run the category seed script again:
```bash
npm run seed-categories
```

### Error: "Connection failed"

If you see connection errors, check:
1. MongoDB is running
2. `config.env` has correct `MONGODB_URI`
3. Database name matches your setup

### Categories Already Exist

If you run the script multiple times:
- Existing categories will be skipped (not duplicated)
- Only new categories will be created
- Safe to run multiple times

## Verify in Mobile App

After seeding:

1. **Start Backend Server**
   ```bash
   npm run dev
   ```

2. **Open Mobile App**
   - Navigate to Products → Add Product
   - Check the category chips
   - All 11 categories should appear

3. **Test Admin Section**
   - Navigate to Admin → Categories
   - All categories should be listed
   - You can edit, activate/deactivate, or add more

## Adding More Categories

You can add more categories directly from the mobile app:

1. Go to **Admin → Categories**
2. Tap the **+ (Add)** button
3. Fill in category details:
   - Name (e.g., "Frozen Foods")
   - Slug (auto-generated, e.g., "frozen-foods")
   - Description
   - Icon (Material icon name)
   - Color (hex code)
   - Sort Order
   - Active status

4. Save
5. The new category will immediately appear in product form

## Category Structure

Each category has these fields:

```typescript
{
    name: string,           // Display name (e.g., "Grocery")
    slug: string,          // URL-friendly ID (e.g., "grocery")
    description: string,   // Category description
    icon: string,          // Material icon name
    color: string,         // Hex color (#4CAF50)
    level: number,         // Hierarchy (0 = main, 1 = sub)
    sortOrder: number,     // Display order
    isActive: boolean,     // Active status
    isFeatured: boolean,   // Featured flag
    createdBy: ObjectId,   // Admin who created it
}
```

## Backward Compatibility

The seeded categories match the old hardcoded categories exactly:

| Old Hardcoded | New Slug | Status |
|---------------|----------|---------|
| grocery | grocery | ✅ Same |
| snacks | snacks | ✅ Same |
| personal-care | personal-care | ✅ Same |
| dairy | dairy | ✅ Same |
| fruits-vegetables | fruits-vegetables | ✅ Same |
| meat-seafood | meat-seafood | ✅ Same |
| bakery | bakery | ✅ Same |
| beverages | beverages | ✅ Same |
| household | household | ✅ Same |
| electronics | electronics | ✅ Same |
| other | other | ✅ Same |

**Result**: All existing products with old categories will work seamlessly with the new system!

## Advanced: Seed Full Categories

If you want a more comprehensive category structure with subcategories, you can also run:

```bash
node scripts/seedBrandsAndCategories.js
```

This creates:
- 7 main categories
- 13 subcategories
- Sample brands

**Warning**: This will delete existing categories and brands!

## Summary

1. ✅ Run `npm run seed-categories` once to populate default categories
2. ✅ Categories will appear in Product Addition page
3. ✅ Categories will appear in Admin Categories section
4. ✅ Both systems are now fully interlinked
5. ✅ Add more categories anytime from admin section

For more details, see: `CATEGORY_SYSTEM_FIX.md`

