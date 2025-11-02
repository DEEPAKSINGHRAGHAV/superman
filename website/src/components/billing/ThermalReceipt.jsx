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
                .thermal-receipt-print,
                .thermal-receipt-print * {
                    visibility: visible;
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
                            Thank you for your visit!
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="receipt-divider">━━━━━━━━━━━━━━━━━━━━</div>

                    {/* Bill Info */}
                    <div className="receipt-section">
                        <div className="receipt-row">
                            <span>Bill No:</span>
                            <span className="receipt-value">{receiptData.billNumber}</span>
                        </div>
                        <div className="receipt-row">
                            <span>Date:</span>
                            <span className="receipt-value">{receiptData.date}</span>
                        </div>
                        {receiptData.cashier && (
                            <div className="receipt-row">
                                <span>Cashier:</span>
                                <span className="receipt-value">{receiptData.cashier}</span>
                            </div>
                        )}
                    </div>

                    {/* Divider */}
                    <div className="receipt-divider">━━━━━━━━━━━━━━━━━━━━</div>

                    {/* Items */}
                    <div className="receipt-section">
                        <div className="receipt-items-header">
                            <span>Item</span>
                            <span>Qty</span>
                            <span>Price</span>
                        </div>
                        {receiptData.items.map((item, index) => (
                            <div key={index} className="receipt-item">
                                <div className="receipt-item-name">{item.product.name}</div>
                                <div className="receipt-item-details">
                                    <span>{item.quantity} × {formatCurrency(item.unitPrice)}</span>
                                    <span className="receipt-item-total">{formatCurrency(item.totalPrice)}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Divider */}
                    <div className="receipt-divider">━━━━━━━━━━━━━━━━━━━━</div>

                    {/* Totals */}
                    <div className="receipt-section">
                        <div className="receipt-row">
                            <span>Subtotal:</span>
                            <span className="receipt-value">{formatCurrency(receiptData.subtotal)}</span>
                        </div>
                        <div className="receipt-row">
                            <span>GST (0%):</span>
                            <span className="receipt-value">{formatCurrency(receiptData.tax)}</span>
                        </div>
                        <div className="receipt-row receipt-total">
                            <span>TOTAL:</span>
                            <span className="receipt-value">{formatCurrency(receiptData.total)}</span>
                        </div>
                    </div>

                    {/* Payment Info */}
                    <div className="receipt-divider">━━━━━━━━━━━━━━━━━━━━</div>
                    <div className="receipt-section">
                        <div className="receipt-row">
                            <span>Payment:</span>
                            <span className="receipt-value">{receiptData.paymentMethod}</span>
                        </div>
                        {receiptData.paymentMethod === 'Cash' && (
                            <>
                                <div className="receipt-row">
                                    <span>Received:</span>
                                    <span className="receipt-value">{formatCurrency(receiptData.amountReceived)}</span>
                                </div>
                                <div className="receipt-row">
                                    <span>Change:</span>
                                    <span className="receipt-value">{formatCurrency(receiptData.change)}</span>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="receipt-divider">━━━━━━━━━━━━━━━━━━━━</div>
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

