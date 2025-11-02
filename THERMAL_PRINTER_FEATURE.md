# Thermal Printer Receipt Feature

## Overview

The billing section now includes a thermal printer receipt feature with preview functionality, optimized for 58mm (2 inch) thermal printers.

## Features

### ✅ Receipt Preview
- View the receipt before printing
- Optimized layout for 58mm thermal printers
- Shows all transaction details:
  - Bill number and date
  - Cashier name
  - Itemized list with quantities and prices
  - Subtotal, tax, and total amounts
  - Payment method and change (if cash)

### ✅ Print Functionality
- Browser-based printing that works with any thermal printer
- Automatically formats receipt for 58mm width
- Uses CSS print media queries for optimal formatting
- Only prints the receipt content (hides UI elements)

## How to Use

### 1. Complete a Sale
1. Add items to cart in the billing section
2. Click "Pay" button
3. Select payment method and complete payment

### 2. Preview Receipt
- After successful payment, a modal opens showing:
  - Payment success confirmation
  - **Receipt preview** - formatted exactly as it will print
  - Print and Done buttons

### 3. Print Receipt
1. Review the receipt preview
2. Click **"Print Receipt"** button
3. Browser print dialog opens
4. Select your thermal printer from the list
5. Set page size to **58mm** or **2 inches** (if option available)
6. Click **Print**

## Printer Setup

### Windows
1. Ensure your thermal printer is connected and installed
2. In the print dialog:
   - Select your thermal printer
   - Set paper size to **58mm** or **Custom: 58mm width**
   - Ensure margins are set to **0** or **None**

### Common Thermal Printer Brands
- Epson TM series
- Star Micronics
- Bixolon
- Xprinter
- Citizen

## Receipt Format

The receipt includes:
```
━━━━━━━━━━━━━━━━━━━━
      SHIVIK MART
  Thank you for your visit!
━━━━━━━━━━━━━━━━━━━━
Bill No: BILL-1234567890
Date: 1/15/2024, 2:30:45 PM
Cashier: Admin User
━━━━━━━━━━━━━━━━━━━━
Item          Qty    Price
Product Name
  2 × ₹50.00    ₹100.00
━━━━━━━━━━━━━━━━━━━━
Subtotal:        ₹450.00
GST (0%):         ₹0.00
TOTAL:          ₹450.00
━━━━━━━━━━━━━━━━━━━━
Payment: Cash
Received:      ₹500.00
Change:         ₹50.00
━━━━━━━━━━━━━━━━━━━━
     Thank You!
    Visit Again
```

## Technical Details

### Components
- **ThermalReceipt.jsx**: Receipt preview and print component
- **ThermalReceipt.css**: Styling optimized for 58mm thermal printers

### Print CSS
- Uses `@page { size: 58mm auto; }` for thermal printer formatting
- Hides all UI elements except receipt content during print
- Monospace font (Courier New) for consistent character width
- Optimized spacing and layout for narrow receipts

### Browser Compatibility
- Works with all modern browsers (Chrome, Edge, Firefox, Safari)
- Uses standard CSS print media queries
- No additional plugins or drivers required (browser native printing)

## Troubleshooting

### Receipt is too wide
- Check printer settings in print dialog
- Ensure paper size is set to **58mm** or **2 inches**
- Try adjusting page margins to **0**

### Text is cut off
- Some printers may need adjustment in printer settings
- Try setting page margins to minimum (0.1mm)
- Check printer driver settings for paper width

### Print dialog doesn't show thermal printer
- Ensure printer is installed and connected
- Check Windows printer settings
- Restart the application and try again

### Receipt prints but formatting is off
- Most browsers will respect the CSS print styles
- If using a specific printer driver, adjust paper width settings
- Some printers have built-in receipt formatting that may override CSS

## Future Enhancements

Potential improvements:
- Direct printer API integration (requires Electron or backend service)
- Custom receipt templates
- Print queue management
- Receipt history and reprint
- Email/SMS receipt delivery

## Notes

- The preview shows exactly how the receipt will look when printed
- Print formatting is handled by CSS, ensuring consistency
- Works with any thermal printer that supports 58mm paper
- No additional software installation required

---

**Version**: 1.0.0  
**Last Updated**: January 2024  
**Status**: ✅ Complete and Ready for Use

