import React, { useState, useEffect, useCallback } from 'react';
import { Search, MoreVertical, AlertCircle } from 'lucide-react';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Badge from '../../components/common/Badge';
import Table from '../../components/common/Table';
import Pagination from '../../components/common/Pagination';
import BatchActionsModals from '../../components/batches/BatchActionsModals';
import useBatchActions from '../../hooks/useBatchActions';
import { batchesAPI } from '../../services/api';
import { formatDate, formatNumber, getDaysUntilExpiry, getExpiryStatus, debounce } from '../../utils/helpers';

const BatchList = () => {
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(false);
    const [batchNumberInput, setBatchNumberInput] = useState('');
    const [batchNumberSearch, setBatchNumberSearch] = useState('');
    const [productInput, setProductInput] = useState('');
    const [productSearch, setProductSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('active');
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
    });

    // Batch actions hook - shared logic for adjust/status/deplete actions
    const batchActions = useBatchActions({
        onSuccess: useCallback(() => fetchBatches(), []),
    });

    // Fetch batches when filters change
    useEffect(() => {
        fetchBatches();
    }, [pagination.page, pagination.limit, statusFilter, batchNumberSearch, productSearch]);


    const fetchBatches = async () => {
        try {
            setLoading(true);
            const params = {
                page: pagination.page,
                limit: pagination.limit,
            };
            
            // Add batch number search
            if (batchNumberSearch && batchNumberSearch.trim()) {
                params.batchNumber = batchNumberSearch.trim();
            }
            
            // Add product search
            if (productSearch && productSearch.trim()) {
                params.productSearch = productSearch.trim();
            }
            
            // Only add status if not 'all'
            if (statusFilter !== 'all') {
                params.status = statusFilter;
            }
            
            const response = await batchesAPI.getAll(params);

            if (response.success) {
                setBatches(response.data);
                setPagination((prev) => ({
                    ...prev,
                    total: response.total,
                    totalPages: response.pages || Math.ceil(response.total / prev.limit),
                }));
            }
        } catch (error) {
            toast.error('Failed to load batches');
            console.error('Batches fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    // Debounced search handlers
    const debouncedBatchNumberSearch = debounce((value) => {
        setBatchNumberSearch(value);
        setPagination((prev) => ({ ...prev, page: 1 }));
    }, 500);

    const debouncedProductSearch = debounce((value) => {
        setProductSearch(value);
        setPagination((prev) => ({ ...prev, page: 1 }));
    }, 500);

    const handleBatchNumberSearch = (value) => {
        // Remove apostrophes (from Excel copy-paste)
        const cleanValue = value.replace(/'/g, '');
        setBatchNumberInput(cleanValue);
        debouncedBatchNumberSearch(cleanValue);
    };

    const handleProductSearch = (value) => {
        // Remove apostrophes (from Excel copy-paste)
        const cleanValue = value.replace(/'/g, '');
        setProductInput(cleanValue);
        debouncedProductSearch(cleanValue);
    };

    // Clear all filters
    const clearFilters = () => {
        setBatchNumberInput('');
        setBatchNumberSearch('');
        setProductInput('');
        setProductSearch('');
        setStatusFilter('active');
        setPagination((prev) => ({ ...prev, page: 1 }));
    };

    const columns = [
        {
            key: 'batchNumber',
            label: 'Batch Number',
            sortable: true,
            render: (row) => (
                <div>
                    <p className="font-medium text-gray-900">{row.batchNumber}</p>
                    <p className="text-xs text-gray-500">{row.product?.sku || 'N/A'}</p>
                </div>
            ),
        },
        {
            key: 'product',
            label: 'Product',
            render: (row) => (
                <div>
                    <p className="text-gray-900">{row.product?.name || 'N/A'}</p>
                </div>
            ),
        },
        {
            key: 'pricing',
            label: 'Pricing',
            render: (row) => (
                <div>
                    <p className="text-gray-900">₹{formatNumber(row.sellingPrice)}</p>
                    <p className="text-xs text-gray-500">Cost: ₹{formatNumber(row.costPrice)}</p>
                </div>
            ),
        },
        {
            key: 'currentQuantity',
            label: 'Quantity',
            render: (row) => (
                <div>
                    <p className="font-medium">{formatNumber(row.currentQuantity)}</p>
                    <p className="text-xs text-gray-500">
                        Initial: {formatNumber(row.initialQuantity)}
                    </p>
                </div>
            ),
        },
        {
            key: 'expiryDate',
            label: 'Expiry Date',
            render: (row) => {
                if (!row.expiryDate) {
                    return <span className="text-gray-400">No expiry</span>;
                }
                const status = getExpiryStatus(row.expiryDate);
                const daysLeft = getDaysUntilExpiry(row.expiryDate);

                return (
                    <div>
                        <p className="text-gray-900">{formatDate(row.expiryDate)}</p>
                        <Badge variant={status.color} size="sm">
                            {daysLeft !== null && daysLeft >= 0
                                ? `${daysLeft} days left`
                                : status.status}
                        </Badge>
                    </div>
                );
            },
        },
        {
            key: 'status',
            label: 'Status',
            render: (row) => {
                const statusColors = {
                    active: 'success',
                    depleted: 'gray',
                    expired: 'danger',
                    damaged: 'danger',
                    returned: 'warning',
                };
                return (
                    <Badge variant={statusColors[row.status] || 'gray'}>
                        {row.status?.toUpperCase()}
                    </Badge>
                );
            },
        },
        {
            key: 'actions',
            label: 'Actions',
            render: (row) => (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        batchActions.openActionsModal(row);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    disabled={row.status === 'depleted' || row.currentQuantity === 0}
                    title={row.currentQuantity === 0 ? 'No actions available for depleted batch' : 'Batch actions'}
                >
                    <MoreVertical size={18} className={row.currentQuantity === 0 ? 'text-gray-300' : 'text-gray-600'} />
                </button>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Batch Management</h1>
                <p className="text-gray-600 mt-1">Manage batch inventory, adjust quantities, and handle stock issues</p>
            </div>

            {/* Info Card */}
            <Card className="bg-blue-50 border-blue-200">
                <div className="flex items-start">
                    <AlertCircle className="text-blue-600 mt-0.5" size={20} />
                    <div className="ml-3">
                        <h3 className="text-sm font-medium text-blue-800">Batch Adjustment Guide</h3>
                        <ul className="text-sm text-blue-700 mt-1 list-disc ml-4">
                            <li><strong>Adjust Quantity:</strong> Use for inventory count corrections, shrinkage, or partial damage</li>
                            <li><strong>Deplete Entire Batch:</strong> Sets quantity to 0 (use for complete loss)</li>
                            <li><strong>Mark as Damaged/Expired/Returned:</strong> Sets quantity to 0 and updates status for reporting</li>
                        </ul>
                    </div>
                </div>
            </Card>

            {/* Filters */}
            <Card>
                <div className="space-y-4">
                    {/* Search Bars - Side by Side */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Search by Batch Number
                            </label>
                            <Input
                                placeholder="e.g., BATCH251108001"
                                icon={<Search size={18} />}
                                value={batchNumberInput}
                                onChange={(e) => handleBatchNumberSearch(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Search by Product
                            </label>
                            <Input
                                placeholder="Product name, SKU, or barcode..."
                                icon={<Search size={18} />}
                                value={productInput}
                                onChange={(e) => handleProductSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Status Filters and Clear Button */}
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex flex-wrap gap-2">
                            {['all', 'active', 'depleted', 'expired', 'damaged', 'returned'].map((status) => (
                                <button
                                    key={status}
                                    onClick={() => {
                                        setStatusFilter(status);
                                        setPagination(prev => ({ ...prev, page: 1 }));
                                    }}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                        statusFilter === status
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    {status.charAt(0).toUpperCase() + status.slice(1)}
                                </button>
                            ))}
                        </div>
                        
                        {/* Clear Filters Button */}
                        {(batchNumberSearch || productSearch || statusFilter !== 'active') && (
                            <button
                                onClick={clearFilters}
                                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                Clear Filters
                            </button>
                        )}
                    </div>

                    {/* Active Filters Display */}
                    {(batchNumberSearch || productSearch) && (
                        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                            <span className="text-sm text-gray-500">Active filters:</span>
                            {batchNumberSearch && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                                    Batch: {batchNumberSearch}
                                </span>
                            )}
                            {productSearch && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                    Product: {productSearch}
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </Card>

            {/* Table */}
            <Card noPadding>
                <Table columns={columns} data={batches} loading={loading} />
                <Pagination
                    currentPage={pagination.page}
                    totalPages={pagination.totalPages}
                    onPageChange={(page) => setPagination({ ...pagination, page })}
                    total={pagination.total}
                    pageSize={pagination.limit}
                />
            </Card>

            {/* Batch Actions Modals - Shared Component */}
            <BatchActionsModals batchActions={batchActions} />
        </div>
    );
};

export default BatchList;
