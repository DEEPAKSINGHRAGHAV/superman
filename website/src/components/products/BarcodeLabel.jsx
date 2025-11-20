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
                // Calculate optimal barcode size for 50mm x 15mm label
                // Total height: 15mm, need to fit barcode + text
                JsBarcode(barcodeRef.current, product.barcode, {
                    format: 'EAN13',
                    width: 0.5, // Thinner bars for better fit
                    height: 8, // Reduced height to fit with text in 15mm
                    displayValue: true,
                    fontSize: 4, // Smaller font for barcode numbers
                    margin: 0, // No margin - we control spacing with CSS
                    marginTop: 0,
                    marginBottom: 0,
                    marginLeft: 0,
                    marginRight: 0,
                    background: '#ffffff',
                    lineColor: '#000000',
                    textMargin: 0, // No margin for barcode numbers
                    textPosition: 'bottom',
                });
                
                // Aggressively remove all spacing from the generated SVG
                const svg = barcodeRef.current;
                if (svg) {
                    // Remove all margins and padding
                    svg.style.margin = '0';
                    svg.style.padding = '0';
                    svg.style.display = 'block';
                    svg.style.verticalAlign = 'top';
                    svg.style.marginTop = '0';
                    svg.style.marginBottom = '0';
                    svg.style.marginLeft = '0';
                    svg.style.marginRight = '0';
                    
                    // Remove viewBox padding if any
                    const viewBox = svg.getAttribute('viewBox');
                    if (viewBox) {
                        const values = viewBox.split(' ');
                        if (values.length === 4) {
                            // Ensure viewBox starts at 0,0 with no padding
                            svg.setAttribute('viewBox', `0 0 ${values[2]} ${values[3]}`);
                        }
                    }
                    
                    // Remove any default spacing from internal elements
                    const textElements = svg.querySelectorAll('text');
                    textElements.forEach(text => {
                        text.style.margin = '0';
                        text.style.padding = '0';
                    });
                    
                    // Remove spacing from rect elements (barcode bars)
                    const rectElements = svg.querySelectorAll('rect');
                    rectElements.forEach(rect => {
                        rect.style.margin = '0';
                        rect.style.padding = '0';
                    });
                    
                    // Set SVG to have no internal spacing
                    svg.setAttribute('preserveAspectRatio', 'none');
                }
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
                    size: 50mm 15mm;
                    margin: 0;
                    padding: 0;
                }
                body * {
                    visibility: hidden;
                }
                .barcode-label-print,
                .barcode-label-print * {
                    visibility: visible !important;
                }
                .barcode-label-print {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 50mm !important;
                    height: 15mm !important;
                    max-width: 50mm !important;
                    min-width: 50mm !important;
                    max-height: 15mm !important;
                    min-height: 15mm !important;
                    padding: 0 !important;
                    margin: 0 !important;
                    box-shadow: none;
                    border: none;
                    background: white !important;
                    page-break-after: auto;
                    font-family: Arial, sans-serif !important;
                    font-size: 7pt !important;
                    line-height: 1 !important;
                    color: #000000 !important;
                    overflow: hidden !important;
                    box-sizing: border-box !important;
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
                                    <div className="price-label">₹{sellingPrice.toFixed(2)}</div>
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

