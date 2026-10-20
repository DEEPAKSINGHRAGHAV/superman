import React, { useState, useMemo } from 'react';
import { Printer, ClipboardList } from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Select from '../../components/common/Select';
import Input from '../../components/common/Input';
import Table from '../../components/common/Table';
import EmptyState from '../../components/common/EmptyState';
import { stockCountSheetAPI } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/helpers';
import toast from 'react-hot-toast';
import '../../components/billing/ThermalReceipt.css';
import './StockCountSheet.css';

const BATCH_SIZE = 100;

const StockCountSheet = () => {
    const [minStock, setMinStock] = useState(1);

    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState(null);
    const [truncated, setTruncated] = useState(false);
    const [batchIndex, setBatchIndex] = useState(0);

    const batches = useMemo(() => {
        if (!items) return [];
        const chunks = [];
        for (let i = 0; i < items.length; i += BATCH_SIZE) {
            chunks.push(items.slice(i, i + BATCH_SIZE));
        }
        return chunks;
    }, [items]);

    const totalValue = useMemo(
        () => (items || []).reduce((sum, item) => sum + item.totalValue, 0),
        [items]
    );

    const handleLoad = async () => {
        try {
            setLoading(true);
            setItems(null);
            setBatchIndex(0);

            const response = await stockCountSheetAPI.get({ minStock });

            if (response.success) {
                setItems(response.data);
                setTruncated(!!response.truncated);
                if (response.data.length === 0) {
                    toast('No products match this filter', { icon: 'ℹ️' });
                }
                if (response.truncated) {
                    toast.error(
                        'This list hit the maximum size and may be missing products. Contact support before relying on it for a full audit.',
                        { duration: 8000 }
                    );
                }
            }
        } catch (error) {
            toast.error(error.message || 'Failed to load count sheet');
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const currentBatch = batches[batchIndex] || [];
    const batchStart = batchIndex * BATCH_SIZE;
    const batchTotal = currentBatch.reduce((sum, item) => sum + item.totalValue, 0);

    const columns = [
        {
            key: 'index',
            label: '#',
            render: (row) => batchStart + currentBatch.indexOf(row) + 1,
        },
        {
            key: 'name',
            label: 'Item Name',
            render: (row) => (
                <div>
                    <p className="font-medium text-gray-900">{row.name}</p>
                    <p className="text-sm text-gray-500">{row.sku}</p>
                </div>
            ),
        },
        {
            key: 'currentStock',
            label: 'Count',
            render: (row) => `${row.currentStock} ${row.unit || 'pcs'}`,
        },
        {
            key: 'costPrice',
            label: 'Cost Price',
            render: (row) => formatCurrency(row.costPrice),
        },
        {
            key: 'totalValue',
            label: 'Total',
            render: (row) => formatCurrency(row.totalValue),
        },
    ];

    return (
        <div className="space-y-6">
            <div className="no-print">
                <h1 className="text-2xl font-bold text-gray-900">Stock Count Sheet</h1>
                <p className="text-gray-600 mt-1">
                    Print a paper sheet of products to physically count, in batches of {BATCH_SIZE} - ordered by
                    database id, since category/brand are not reliably set on every product
                </p>
            </div>

            <Card className="no-print">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
                    <Input
                        label="Minimum stock (show items with stock above this)"
                        type="number"
                        min="0"
                        value={minStock}
                        onChange={(e) => setMinStock(e.target.value)}
                    />
                    <Button variant="primary" onClick={handleLoad} loading={loading} className="mt-6">
                        Load Count Sheet
                    </Button>
                </div>
            </Card>

            {truncated && (
                <div className="no-print bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 text-sm font-medium">
                    This list hit the maximum size the system allows and may not include every product.
                    Do not treat this as a complete audit - contact support to raise the limit.
                </div>
            )}

            {items && items.length === 0 && (
                <EmptyState
                    icon={ClipboardList}
                    title="No products found"
                    description="No active products have stock above the minimum you set."
                />
            )}

            {items && items.length > 0 && (
                <>
                    <Card className="no-print">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <p className="text-sm text-gray-600">
                                    <span className="font-semibold text-gray-900">{items.length}</span> items ·
                                    Total value{' '}
                                    <span className="font-semibold text-gray-900">{formatCurrency(totalValue)}</span> ·
                                    Split into{' '}
                                    <span className="font-semibold text-gray-900">{batches.length}</span> print
                                    batch{batches.length > 1 ? 'es' : ''} of up to {BATCH_SIZE}
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <Select
                                    value={batchIndex}
                                    onChange={(e) => setBatchIndex(Number(e.target.value))}
                                    className="mb-0 min-w-[220px]"
                                    options={batches.map((batch, idx) => ({
                                        value: idx,
                                        label: `Batch ${idx + 1} of ${batches.length} (items ${idx * BATCH_SIZE + 1}-${idx * BATCH_SIZE + batch.length})`,
                                    }))}
                                />
                                <Button variant="primary" icon={<Printer size={18} />} onClick={handlePrint}>
                                    Print This Batch
                                </Button>
                            </div>
                        </div>
                    </Card>

                    {/* On-screen view: a normal table of the current batch */}
                    <Card noPadding className="no-print" title={`Batch ${batchIndex + 1} of ${batches.length}`}>
                        <Table columns={columns} data={currentBatch} />
                    </Card>

                    {/* Print-only view: same batch, formatted like a till receipt */}
                    <div className="stock-count-print-only">
                        <div className="thermal-receipt-container">
                            <div className="thermal-receipt-preview">
                                <div className="thermal-receipt-print">
                                    <div className="receipt-header">
                                        <div className="receipt-title">SHIVIKMART</div>
                                        <div className="receipt-address">Stock Count Sheet</div>
                                    </div>

                                    <div className="receipt-divider">━━━━━━━━━━━━━━━━━━━━</div>

                                    <div className="receipt-section">
                                        <div className="receipt-row receipt-bill-info">
                                            <span>Batch:</span>
                                            <span className="receipt-value">{batchIndex + 1} of {batches.length}</span>
                                        </div>
                                        <div className="receipt-row receipt-bill-info">
                                            <span>Items:</span>
                                            <span className="receipt-value">
                                                {batchStart + 1}-{batchStart + currentBatch.length} of {items.length}
                                            </span>
                                        </div>
                                        <div className="receipt-row receipt-bill-info">
                                            <span>Date:</span>
                                            <span className="receipt-value">{formatDate(new Date())}</span>
                                        </div>
                                    </div>

                                    <div className="receipt-divider">━━━━━━━━━━━━━━━━━━━━</div>

                                    <div className="receipt-section">
                                        <div className="receipt-items-header-compact">
                                            <span>Item (Cost x Count)</span>
                                            <span>Total</span>
                                        </div>
                                        {currentBatch.map((item, idx) => (
                                            <div key={item._id} className="receipt-item-compact">
                                                <div className="receipt-item-name">
                                                    {batchStart + idx + 1}. {item.name}
                                                </div>
                                                <div className="receipt-item-sku">SKU: {item.sku}</div>
                                                <div className="receipt-item-price-line">
                                                    <span className="receipt-price">
                                                        {formatCurrency(item.costPrice)}
                                                    </span>
                                                    <span className="receipt-qty">
                                                        x{item.currentStock} {item.unit || 'pcs'}
                                                    </span>
                                                    <span className="receipt-total-price">
                                                        {formatCurrency(item.totalValue)}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="receipt-section">
                                        <div className="receipt-row receipt-total">
                                            <span>Batch Total:</span>
                                            <span className="receipt-value">{formatCurrency(batchTotal)}</span>
                                        </div>
                                    </div>

                                    <div className="receipt-footer">
                                        <div className="receipt-thankyou">— End of Batch {batchIndex + 1} —</div>
                                    </div>
                                    <div className="receipt-spacer"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default StockCountSheet;
