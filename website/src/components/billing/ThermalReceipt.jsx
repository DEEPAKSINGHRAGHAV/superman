import React, { useRef, useEffect } from 'react';
import { formatCurrency } from '../../utils/helpers';
import './ThermalReceipt.css';

const ThermalReceipt = ({ receiptData, onClose, onPrint, showControls = false }) => {
    const printRef = useRef(null);

    useEffect(() => {
        // Add print styles to document when component mounts
        const style = document.createElement('style');
        style.id = 'thermal-receipt-print-styles';
        style.textContent = `
            @media print {
                @page {
                    size: 58mm auto;
                    margin: 0;
                    padding: 0;
                }
                body * {
                    visibility: hidden;
                }
                .print-only {
                    visibility: visible !important;
                    display: block !important;
                    position: absolute !important;
                    left: 0 !important;
                    top: 0 !important;
                }
                .print-only * {
                    visibility: visible !important;
                }
                .thermal-receipt-print,
                .thermal-receipt-print * {
                    visibility: visible !important;
                }
                .thermal-receipt-print {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 58mm;
                    max-width: 58mm;
                }
                .no-print,
                .no-print * {
                    display: none !important;
                }
            }
        `;

        // Remove existing style if present
        const existingStyle = document.getElementById('thermal-receipt-print-styles');
        if (existingStyle) {
            document.head.removeChild(existingStyle);
        }

        document.head.appendChild(style);

        return () => {
            const styleToRemove = document.getElementById('thermal-receipt-print-styles');
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

    if (!receiptData) return null;

    return (
        <div className="thermal-receipt-container">
            {/* Preview */}
            <div className="thermal-receipt-preview">
                <div className="thermal-receipt-print" ref={printRef}>
                    {/* Header */}
                    <div className="receipt-header">
                        <div className="receipt-title">SHIVIK MART</div>
                        <div className="receipt-address">
                            Sabse sasta, Sabse accha!
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="receipt-divider">━━━━━━━━━━━━━━━━━━━━</div>

                    {/* Bill Info */}
                    <div className="receipt-section">
                        <div className="receipt-row receipt-bill-info">
                            <span>Bill No:</span>
                            <span className="receipt-value">{receiptData.billNumber}</span>
                        </div>
                        <div className="receipt-row receipt-bill-info">
                            <span>Date:</span>
                            <span className="receipt-value">{receiptData.date}</span>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="receipt-divider">━━━━━━━━━━━━━━━━━━━━</div>

                    {/* Items */}
                    <div className="receipt-section">
                        <div className="receipt-items-header-compact">
                            <span>Item</span>
                            <span>Total</span>
                        </div>
                        {receiptData.items.map((item, index) => {
                            const mrp = item.product.mrp;
                            const unitPrice = item.unitPrice;
                            const showMRP = mrp > unitPrice;

                            return (
                                <div key={index} className="receipt-item-compact">
                                    <div className="receipt-item-name">{item.product.name}</div>
                                    <div className="receipt-item-price-line">
                                        {showMRP && (
                                            <span className="receipt-mrp">
                                                <span className="receipt-mrp-label">MRP</span>
                                                <span className="receipt-mrp-price receipt-strikethrough">{formatCurrency(mrp)}</span>
                                            </span>
                                        )}
                                        <span className="receipt-price">{formatCurrency(unitPrice)}</span>
                                        <span className="receipt-qty">x{item.quantity}</span>
                                        <span className="receipt-total-price">{formatCurrency(item.totalPrice)}</span>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Final Pay - Right after all products */}
                        {(() => {
                            // Get the actual total from receiptData (billing screen total)
                            const actualTotal = parseFloat((receiptData.total || 0).toFixed(2));
                            const finalPayPrice = actualTotal;

                            return (
                                <div className="receipt-row receipt-total">
                                    <span>Final Pay:</span>
                                    <span className="receipt-value">{formatCurrency(finalPayPrice)}</span>
                                </div>
                            );
                        })()}
                    </div>

                    {/* Totals - Hidden for now, can be re-enabled later */}
                    {false && (() => {
                        // Calculate Total MRP and Total Discount for display
                        // IMPORTANT: Use item.totalPrice from cart to match billing screen calculations
                        // The billing screen rounds per-item totals, so we must use the same values
                        let totalMRP = 0;
                        let totalDiscount = 0;

                        receiptData.items.forEach(item => {
                            const mrp = parseFloat(item.product.mrp);
                            const unitPrice = parseFloat(item.unitPrice || 0);
                            const qty = parseFloat(item.quantity || 0);

                            // Only include in totals if MRP is greater than unit price
                            if (mrp > unitPrice) {
                                // Calculate item-level MRP and discount for display purposes only
                                const itemMRPTotal = mrp * qty;
                                const itemDiscountPerUnit = mrp - unitPrice;
                                const itemDiscountTotal = itemDiscountPerUnit * qty;

                                // Accumulate totals for display
                                totalMRP += itemMRPTotal;
                                totalDiscount += itemDiscountTotal;
                            }
                        });

                        // Round final totals to 2 decimal places
                        totalMRP = Math.round(totalMRP * 100) / 100;
                        totalDiscount = Math.round(totalDiscount * 100) / 100;

                        return (
                            <div className="receipt-section">
                                <div className="receipt-row receipt-totals-row">
                                    <span>Total MRP:</span>
                                    <span className="receipt-value">{formatCurrency(totalMRP)}</span>
                                </div>
                                {totalDiscount > 0 && (
                                    <div className="receipt-row receipt-totals-row">
                                        <span>Total Discount:</span>
                                        <span className="receipt-value">-{formatCurrency(totalDiscount)}</span>
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                    {/* Footer */}
                    <div className="receipt-footer">
                        <div className="receipt-thankyou">Thank You!</div>
                        <div className="receipt-thankyou">Visit Again</div>
                    </div>
                    <div className="receipt-spacer"></div>
                </div>
            </div>

            {/* Controls - Only show if showControls prop is true */}
            {showControls && (
                <div className="receipt-controls no-print">
                    <button
                        onClick={handlePrint}
                        className="receipt-btn receipt-btn-print"
                    >
                        🖨️ Print Receipt
                    </button>
                    <button
                        onClick={onClose}
                        className="receipt-btn receipt-btn-close"
                    >
                        Close
                    </button>
                </div>
            )}
        </div>
    );
};

export default ThermalReceipt;

