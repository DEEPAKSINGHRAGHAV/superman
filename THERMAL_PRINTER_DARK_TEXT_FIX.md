# Thermal Printer Dark Text Enhancement

## Problem
Text was printing too light on thermal paper, making receipts difficult to read.

## Solution
Updated CSS with optimized settings for dark, bold text on thermal printers.

## Changes Made

### 1. **Increased Font Sizes**
- Base font: **10pt → 12pt** (preview), **13pt** (print)
- Title: **14pt → 16pt** (preview), **18pt** (print)
- Item names: **9pt → 12pt** (preview), **13pt** (print)
- Total amount: **11pt → 14pt** (preview), **16pt** (print)
- Footer: **10pt → 13pt** (preview), **14pt** (print)

### 2. **Maximum Font Weight**
- All text now uses **font-weight: 700-900** (bold to black)
- Headers: **font-weight: 900** (black/heaviest)
- Regular text: **font-weight: 700-800** (bold)
- Values: **font-weight: 900** (black)

### 3. **Pure Black Color**
- Changed from `color: black` to `color: #000000` (explicit pure black)
- Removed all gray colors (`#555`, `#333`) - everything is now pure black
- Applied `color: #000000 !important` in print media for maximum darkness

### 4. **Text Shadow for Extra Darkness**
- Added `text-shadow: 0.5px-1px` to enhance text darkness
- Applied to titles, headers, and important values
- Helps create thicker, darker lines on thermal paper

### 5. **Enhanced Print Settings**
- Added `!important` flags to all print styles to override browser defaults
- Set `print-color-adjust: exact` to prevent color optimization
- Increased line-height for better readability (1.2 → 1.5)

### 6. **Thicker Borders**
- Changed borders from `1px dashed` to `2px-3px solid`
- All borders are now pure black (#000000)

## Technical Details

### CSS Properties Used
```css
/* Maximum darkness */
color: #000000 !important;
font-weight: 900 !important;
text-shadow: 1px 1px 0px #000 !important;
-webkit-print-color-adjust: exact !important;
print-color-adjust: exact !important;
```

### Font Sizes (Print Mode)
- **Title**: 18pt
- **Headers**: 12pt
- **Body text**: 13pt
- **Item names**: 13pt
- **Item details**: 11pt
- **Total**: 16pt
- **Footer**: 14pt

### Font Weights (Print Mode)
- **Title**: 900 (black)
- **Headers**: 900 (black)
- **Item names**: 800 (extra bold)
- **Values**: 900 (black)
- **Body**: 700-800 (bold)

## Additional Recommendations

### Printer Settings
1. **Increase Print Density/Darkness** in printer settings:
   - Windows: Devices and Printers → Right-click printer → Printing Preferences → Increase Darkness
   - Set to maximum or near-maximum (varies by printer model)

2. **Paper Quality**:
   - Use high-quality thermal paper
   - Ensure paper is stored in cool, dry place
   - Avoid old or degraded paper

3. **Print Speed**:
   - Slower print speeds often produce darker prints
   - Adjust in printer preferences if available

4. **Maintenance**:
   - Clean printhead regularly with isopropyl alcohol
   - Check for dust/residue on printhead
   - Ensure printer is properly calibrated

### Browser Print Settings
When printing:
1. Select your thermal printer
2. Set paper size to **58mm** or **2 inches**
3. Ensure margins are set to **0** or **None**
4. Don't use "Save as PDF" - print directly to thermal printer
5. In Chrome/Edge: Check "More settings" → Ensure "Background graphics" is enabled (if available)

## Testing
After these changes:
1. Complete a sale transaction
2. Preview the receipt (should show larger, bolder text)
3. Click "Print Receipt"
4. Print to your thermal printer
5. Verify text is dark and clear on paper

## Expected Results
- ✅ Text is significantly darker and more readable
- ✅ All fonts are larger and bolder
- ✅ Pure black color (#000000) ensures maximum contrast
- ✅ Text shadows add extra thickness for clarity
- ✅ Headers and important values stand out clearly

## Notes
- Preview may look slightly different from print due to browser rendering
- Actual print darkness also depends on printer hardware settings
- Some printers may need manual darkness adjustment in driver settings
- Text shadows in CSS help, but printer density setting is also important

---

**Version**: 2.0.0  
**Last Updated**: January 2024  
**Status**: ✅ Enhanced for Maximum Darkness

