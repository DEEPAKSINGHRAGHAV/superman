import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import './BarcodeLabel.css';

const BarcodeLabel = ({ product, onClose, onPrint, showControls = true }) => {
    const barcodeRef = useRef(null);
    const printRef = useRef(null);

    useEffect(() => {
        // Generate barcode when component mounts or product changes
        if (product?.barcode && barcodeRef.current) {
            try {
                // Optimized for thermal printing and scanner readability
                // EAN-13 requires proper quiet zones and bar thickness
                // Width: 0.6-0.8 is optimal for thermal printers (too high causes bars to merge)
                // Height: 11mm for better scanning - taller bars are easier to scan
                JsBarcode(barcodeRef.current, product.barcode, {
                    format: 'EAN13',
                    width: 0.7, // Optimal for thermal printing - not too thick to avoid merging
                    height: 11, // Increased height for easier scanning - fits in 15mm label
                    displayValue: true,
                    fontSize: 4, // Compact font for label
                    margin: 0, // No margin - we control spacing with CSS
                    marginTop: 0,
                    marginBottom: 0,
                    marginLeft: 0,
                    marginRight: 0,
                    background: '#ffffff',
                    lineColor: '#000000', // Pure black for maximum contrast
                    textMargin: 0.5, // Minimal margin for barcode numbers
                    textPosition: 'bottom',
                    valid: function(valid) {
                        if (!valid) {
                            console.warn('Invalid barcode format for EAN-13');
                        }
                    }
                });
                
                // Optimize SVG for thermal printing - remove top spacing, ensure dark bars
                // Wait a bit for JsBarcode to finish rendering
                setTimeout(() => {
                    const container = barcodeRef.current;
                    if (container) {
                        const svgElement = container.querySelector('svg');
                        
                        if (svgElement) {
                            // Remove all margins and padding from SVG element
                            svgElement.style.margin = '0';
                            svgElement.style.padding = '0';
                            svgElement.style.display = 'block';
                            svgElement.style.verticalAlign = 'top';
                            svgElement.style.marginTop = '0';
                            
                            // ROOT CAUSE FIX: jsbarcode calculates total height including text area
                            // When textPosition is 'bottom', bars start at y=0 but viewBox includes full height
                            // We need to find the actual topmost content and adjust viewBox accordingly
                            
                            // Get all groups (jsbarcode wraps content in groups with transforms)
                            const groups = svgElement.querySelectorAll('g');
                            const allRects = svgElement.querySelectorAll('rect');
                            const allTexts = svgElement.querySelectorAll('text');
                            
                            // Find the absolute topmost Y coordinate of any visible element
                            let absoluteTopY = Infinity;
                            
                            // Check all rects (barcode bars) - these should be at the top
                            allRects.forEach(rect => {
                                let y = parseFloat(rect.getAttribute('y')) || 0;
                                
                                // Walk up the DOM tree to account for group transforms
                                let parent = rect.parentElement;
                                while (parent && parent !== svgElement) {
                                    if (parent.tagName === 'g') {
                                        const transform = parent.getAttribute('transform');
                                        if (transform) {
                                            const match = transform.match(/translate\([^,]+,\s*([^)]+)\)/);
                                            if (match) {
                                                y += parseFloat(match[1]) || 0;
                                            }
                                        }
                                    }
                                    parent = parent.parentElement;
                                }
                                
                                if (y < absoluteTopY) {
                                    absoluteTopY = y;
                                }
                            });
                            
                            // If no rects found, check groups directly
                            if (absoluteTopY === Infinity) {
                                groups.forEach(group => {
                                    const transform = group.getAttribute('transform');
                                    if (transform) {
                                        const match = transform.match(/translate\([^,]+,\s*([^)]+)\)/);
                                        if (match) {
                                            const y = parseFloat(match[1]) || 0;
                                            if (y < absoluteTopY) {
                                                absoluteTopY = y;
                                            }
                                        }
                                    }
                                });
                            }
                            
                            // If we still don't have a value, default to 0
                            if (absoluteTopY === Infinity) {
                                absoluteTopY = 0;
                            }
                            
                            // Get current viewBox
                            const viewBox = svgElement.getAttribute('viewBox');
                            if (viewBox) {
                                const values = viewBox.split(' ').map(v => parseFloat(v));
                                if (values.length === 4) {
                                    const [x, y, width, height] = values;
                                    
                                    // AGGRESSIVE FIX: Force viewBox to start at Y=0 and remove all top spacing
                                    // Strategy: Find the actual topmost content, then:
                                    // 1. Move all groups up to eliminate any Y translation
                                    // 2. Adjust viewBox to start at 0
                                    // 3. Adjust height to maintain content
                                    
                                    let topOffsetToRemove = 0;
                                    
                                    // Case 1: If viewBox Y is non-zero, that's top spacing
                                    if (y > 0) {
                                        topOffsetToRemove = y;
                                    }
                                    
                                    // Case 2: If absoluteTopY > 0, we have group-based top spacing
                                    if (absoluteTopY > 0.1 && absoluteTopY > topOffsetToRemove) {
                                        topOffsetToRemove = absoluteTopY;
                                    }
                                    
                                    // Case 3: Check if any group has positive Y translation (marginTop)
                                    groups.forEach(group => {
                                        const transform = group.getAttribute('transform');
                                        if (transform) {
                                            const match = transform.match(/translate\([^,]+,\s*([^)]+)\)/);
                                            if (match) {
                                                const translateY = parseFloat(match[1]) || 0;
                                                if (translateY > 0 && translateY > topOffsetToRemove) {
                                                    topOffsetToRemove = translateY;
                                                }
                                            }
                                        }
                                    });
                                    
                                    // Apply the fix if we found any top spacing
                                    if (topOffsetToRemove > 0.01) {
                                        // Move all groups up by removing Y translation
                                        groups.forEach(group => {
                                            const transform = group.getAttribute('transform');
                                            if (transform) {
                                                const match = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
                                                if (match) {
                                                    const translateX = parseFloat(match[1]) || 0;
                                                    const translateY = parseFloat(match[2]) || 0;
                                                    const newTranslateY = Math.max(0, translateY - topOffsetToRemove);
                                                    group.setAttribute('transform', `translate(${translateX}, ${newTranslateY})`);
                                                }
                                            }
                                        });
                                        
                                        // Force viewBox to start at Y=0
                                        // Adjust height to account for removed top space
                                        const newHeight = height - topOffsetToRemove + (y > 0 ? y : 0);
                                        svgElement.setAttribute('viewBox', `${x} 0 ${width} ${newHeight}`);
                                        
                                        // Adjust height attribute to match
                                        const currentHeight = parseFloat(svgElement.getAttribute('height'));
                                        if (currentHeight) {
                                            svgElement.setAttribute('height', (currentHeight - topOffsetToRemove) + 'px');
                                        }
                                    } else if (y > 0) {
                                        // ViewBox Y is non-zero but no group offset found
                                        // Just adjust viewBox to start at 0
                                        const newHeight = height + y;
                                        svgElement.setAttribute('viewBox', `${x} 0 ${width} ${newHeight}`);
                                        
                                        const currentHeight = parseFloat(svgElement.getAttribute('height'));
                                        if (currentHeight) {
                                            svgElement.setAttribute('height', (currentHeight + y) + 'px');
                                        }
                                    }
                                }
                            }
                            
                            // Ensure all barcode bars (rect elements) are pure black
                            // CRITICAL: Only set fill on rect elements, NOT on the SVG itself
                            // Setting fill on SVG causes entire area to become black
                            allRects.forEach(rect => {
                                rect.setAttribute('fill', '#000000'); // Pure black bars
                                rect.setAttribute('stroke', 'none'); // No stroke
                            });
                            
                            // Style text elements for readability
                            allTexts.forEach(text => {
                                text.setAttribute('fill', '#000000'); // Pure black text
                            });
                            
                            // Set SVG to align to top - use xMidYMin to align to top edge
                            svgElement.setAttribute('preserveAspectRatio', 'xMidYMin meet');
                            
                            // Force overflow visible to prevent clipping
                            svgElement.style.overflow = 'visible';
                            
                            // Force container to align to top
                            container.style.marginTop = '0';
                            container.style.paddingTop = '0';
                            container.style.verticalAlign = 'top';
                            
                            // Final check: If viewBox Y is still non-zero, force it to 0
                            const finalViewBox = svgElement.getAttribute('viewBox');
                            if (finalViewBox) {
                                const finalValues = finalViewBox.split(' ').map(v => parseFloat(v));
                                if (finalValues.length === 4 && finalValues[1] > 0) {
                                    // Force viewBox Y to 0
                                    const [x, y, w, h] = finalValues;
                                    svgElement.setAttribute('viewBox', `${x} 0 ${w} ${h + y}`);
                                    
                                    // Adjust height
                                    const finalHeight = parseFloat(svgElement.getAttribute('height'));
                                    if (finalHeight) {
                                        svgElement.setAttribute('height', (finalHeight + y) + 'px');
                                    }
                                }
                            }
                        }
                    }
                }, 50); // Wait for jsbarcode to finish rendering
            } catch (error) {
                console.error('Error generating barcode:', error);
            }
        }
    }, [product?.barcode]);

    useEffect(() => {
        // Add print styles to document when component mounts
        const style = document.createElement('style');
        style.id = 'barcode-label-print-styles';
        style.textContent = `
            @media print {
                @page {
                    size: 50mm 15mm !important;
                    margin: 0 !important;
                    padding: 0 !important;
                }
                * {
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                    color-adjust: exact !important;
                }
                body * {
                    visibility: hidden;
                }
                .barcode-label-print,
                .barcode-label-print * {
                    visibility: visible !important;
                }
                .barcode-label-print {
                    position: absolute !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 50mm !important;
                    height: 15mm !important;
                    max-width: 50mm !important;
                    min-width: 50mm !important;
                    max-height: 15mm !important;
                    min-height: 15mm !important;
                    padding: 0 !important;
                    margin: 0 !important;
                    box-shadow: none !important;
                    border: none !important;
                    background: white !important;
                    page-break-after: auto !important;
                    font-family: Arial, sans-serif !important;
                    font-size: 7pt !important;
                    line-height: 0 !important;
                    color: #000000 !important;
                    overflow: hidden !important;
                    box-sizing: border-box !important;
                }
                /* DO NOT set fill on SVG - only on rect elements */
                .barcode-label-print .barcode-svg svg {
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                    color-adjust: exact !important;
                }
                /* Only set fill on rect elements (barcode bars) */
                .barcode-label-print .barcode-svg svg rect {
                    fill: #000000 !important;
                    stroke: none !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                    color-adjust: exact !important;
                }
                .no-print,
                .no-print * {
                    display: none !important;
                }
            }
        `;

        // Remove existing style if present
        const existingStyle = document.getElementById('barcode-label-print-styles');
        if (existingStyle) {
            document.head.removeChild(existingStyle);
        }

        document.head.appendChild(style);

        return () => {
            const styleToRemove = document.getElementById('barcode-label-print-styles');
            if (styleToRemove) {
                document.head.removeChild(styleToRemove);
            }
        };
    }, []);

    const handlePrint = () => {
        if (onPrint) {
            onPrint();
        } else {
            window.print();
        }
    };

    if (!product) {
        return null;
    }

    const sellingPrice = product.sellingPrice || 0;
    
    // Format price: remove .00 for whole numbers
    const formatPrice = (price) => {
        if (price % 1 === 0) {
            return `₹${price}`;
        }
        return `₹${price.toFixed(2)}`;
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
                {/* Preview */}
                <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-4">Barcode Label Preview</h3>
                    <div className="border-2 border-dashed border-gray-300 p-4 bg-white">
                        <div className="barcode-label-print" ref={printRef}>
                            <div className="barcode-label-container">
                                {/* Left side - 80% for Barcode */}
                                <div className="barcode-section">
                                    {/* Barcode */}
                                    <div className="barcode-wrapper">
                                        <svg ref={barcodeRef} className="barcode-svg"></svg>
                                    </div>
                                </div>
                                
                                {/* Right side - 20% for Price */}
                                <div className="price-section">
                                    <div className="price-label">{formatPrice(sellingPrice)}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2 text-center">
                        Label size: 50mm × 15mm
                    </p>
                </div>

                {/* Controls */}
                {showControls && (
                    <div className="flex gap-3 justify-end">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium transition-colors"
                        >
                            Close
                        </button>
                        <button
                            onClick={handlePrint}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                            Print Label
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BarcodeLabel;

