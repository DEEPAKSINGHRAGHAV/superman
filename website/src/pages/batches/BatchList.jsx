import React, { useState, useEffect } from 'react';
import { Search, AlertTriangle, MoreVertical, MinusCircle, Trash2, RotateCcw, AlertCircle } from 'lucide-react';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Table from '../../components/common/Table';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import { batchesAPI } from '../../services/api';
import { formatDate, formatNumber, getDaysUntilExpiry, getExpiryStatus, debounce } from '../../utils/helpers';
import toast from 'react-hot-toast';

const BatchList = () => {
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(false);
    const [batchNumberSearch, setBatchNumberSearch] = useState('');
    const [productSearch, setProductSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('active');
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
    });

    // Modal states
    const [selectedBatch, setSelectedBatch] = useState(null);
    const [showAdjustModal, setShowAdjustModal] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [showActionsModal, setShowActionsModal] = useState(false);
    
    // Form states
    const [adjustQuantity, setAdjustQuantity] = useState('');
    const [adjustReason, setAdjustReason] = useState('');
    const [newStatus, setNewStatus] = useState('');
    const [statusReason, setStatusReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

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
    const handleBatchNumberSearch = debounce((value) => {
        setBatchNumberSearch(value);
        setPagination((prev) => ({ ...prev, page: 1 }));
    }, 500);

    const handleProductSearch = debounce((value) => {
        setProductSearch(value);
        setPagination((prev) => ({ ...prev, page: 1 }));
    }, 500);

    // Clear all filters
    const clearFilters = () => {
        setBatchNumberSearch('');
        setProductSearch('');
        setStatusFilter('active');
        setPagination((prev) => ({ ...prev, page: 1 }));
    };

    // Handle quantity adjustment
    const handleAdjustQuantity = async () => {
        if (!adjustQuantity || isNaN(parseInt(adjustQuantity))) {
            toast.error('Please enter a valid quantity');
            return;
        }

        if (!adjustReason.trim()) {
            toast.error('Please provide a reason for adjustment');
            return;
        }

        try {
            setIsSubmitting(true);
            const response = await batchesAPI.adjust(selectedBatch._id, {
                quantity: parseInt(adjustQuantity),
                reason: adjustReason,
            });

            if (response.success) {
                toast.success(`Batch quantity adjusted by ${adjustQuantity}`);
                setShowAdjustModal(false);
                resetForms();
                fetchBatches();
            }
        } catch (error) {
            toast.error(error.message || 'Failed to adjust quantity');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle status update
    const handleUpdateStatus = async () => {
        if (!newStatus) {
            toast.error('Please select a status');
            return;
        }

        if (!statusReason.trim()) {
            toast.error('Please provide a reason');
            return;
        }

        try {
            setIsSubmitting(true);
            const response = await batchesAPI.updateStatus(
                selectedBatch._id,
                newStatus,
                statusReason
            );

            if (response.success) {
                toast.success(`Batch marked as ${newStatus}`);
                setShowStatusModal(false);
                resetForms();
                fetchBatches();
            }
        } catch (error) {
            toast.error(error.message || 'Failed to update status');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Quick deplete (set quantity to 0)
    const handleQuickDeplete = async () => {
        if (!selectedBatch) return;
        
        if (!window.confirm(`Are you sure you want to deplete entire batch ${selectedBatch.batchNumber}?\n\nThis will set quantity to 0 and cannot be undone.`)) {
            return;
        }

        try {
            setIsSubmitting(true);
            const response = await batchesAPI.adjust(selectedBatch._id, {
                quantity: -selectedBatch.currentQuantity,
                reason: 'Full batch depletion - manual adjustment',
            });

            if (response.success) {
                toast.success(`Batch ${selectedBatch.batchNumber} depleted`);
                setShowActionsModal(false);
                resetForms();
                fetchBatches();
            }
        } catch (error) {
            toast.error(error.message || 'Failed to deplete batch');
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForms = () => {
        setSelectedBatch(null);
        setAdjustQuantity('');
        setAdjustReason('');
        setNewStatus('');
        setStatusReason('');
    };

    const openActionsModal = (batch) => {
        setSelectedBatch(batch);
        setShowActionsModal(true);
    };

    const openAdjustModal = (batch = null) => {
        if (batch) setSelectedBatch(batch);
        setShowActionsModal(false);
        setShowAdjustModal(true);
    };

    const openStatusModal = (batch = null, status = '') => {
        if (batch) setSelectedBatch(batch);
        setNewStatus(status);
        setShowActionsModal(false);
        setShowStatusModal(true);
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
                        openActionsModal(row);
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

            {/* Adjust Quantity Modal */}
            <Modal
                isOpen={showAdjustModal}
                onClose={() => {
                    setShowAdjustModal(false);
                    resetForms();
                }}
                title="Adjust Batch Quantity"
                size="md"
                footer={
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowAdjustModal(false);
                                resetForms();
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleAdjustQuantity}
                            loading={isSubmitting}
                        >
                            Apply Adjustment
                        </Button>
                    </div>
                }
            >
                {selectedBatch && (
                    <div className="space-y-4">
                        {/* Batch Info */}
                        <div className="bg-gray-50 rounded-lg p-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-medium text-gray-900">{selectedBatch.product?.name}</p>
                                    <p className="text-sm text-gray-500">Batch: {selectedBatch.batchNumber}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-bold text-gray-900">{selectedBatch.currentQuantity}</p>
                                    <p className="text-sm text-gray-500">Current Qty</p>
                                </div>
                            </div>
                        </div>

                        {/* Adjustment Input */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Adjustment Quantity
                            </label>
                            <input
                                type="number"
                                value={adjustQuantity}
                                onChange={(e) => setAdjustQuantity(e.target.value)}
                                className="input"
                                placeholder="e.g., -50 to reduce, +10 to add"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Use negative numbers to reduce, positive to add.
                                {adjustQuantity && !isNaN(parseInt(adjustQuantity)) && (
                                    <span className="font-medium ml-2">
                                        New quantity: {Math.max(0, selectedBatch.currentQuantity + parseInt(adjustQuantity))}
                                    </span>
                                )}
                            </p>
                        </div>

                        {/* Reason */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Reason <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                value={adjustReason}
                                onChange={(e) => setAdjustReason(e.target.value)}
                                className="input"
                                rows={3}
                                placeholder="e.g., Inventory count adjustment, Items found damaged, Shrinkage..."
                            />
                        </div>

                        {/* Warning */}
                        {adjustQuantity && parseInt(adjustQuantity) < 0 && Math.abs(parseInt(adjustQuantity)) >= selectedBatch.currentQuantity && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
                                <AlertTriangle className="text-yellow-600 mt-0.5" size={16} />
                                <p className="text-sm text-yellow-800">
                                    This will deplete the entire batch (set quantity to 0).
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </Modal>

            {/* Update Status Modal */}
            <Modal
                isOpen={showStatusModal}
                onClose={() => {
                    setShowStatusModal(false);
                    resetForms();
                }}
                title={`Mark Batch as ${newStatus ? newStatus.charAt(0).toUpperCase() + newStatus.slice(1) : ''}`}
                size="md"
                footer={
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowStatusModal(false);
                                resetForms();
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant={newStatus === 'damaged' || newStatus === 'expired' ? 'danger' : 'primary'}
                            onClick={handleUpdateStatus}
                            loading={isSubmitting}
                        >
                            Confirm
                        </Button>
                    </div>
                }
            >
                {selectedBatch && (
                    <div className="space-y-4">
                        {/* Warning */}
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="text-red-600 mt-0.5" size={20} />
                                <div>
                                    <p className="font-medium text-red-800">This action will:</p>
                                    <ul className="text-sm text-red-700 mt-1 list-disc ml-4">
                                        <li>Set batch quantity to <strong>0</strong></li>
                                        <li>Reduce product stock by <strong>{selectedBatch.currentQuantity}</strong> units</li>
                                        <li>Mark batch status as <strong>{newStatus}</strong></li>
                                        <li>Create an audit trail record</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {/* Batch Info */}
                        <div className="bg-gray-50 rounded-lg p-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-gray-500">Product</p>
                                    <p className="font-medium">{selectedBatch.product?.name}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Batch Number</p>
                                    <p className="font-medium">{selectedBatch.batchNumber}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Current Quantity</p>
                                    <p className="font-medium text-red-600">{selectedBatch.currentQuantity} units</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Value at Cost</p>
                                    <p className="font-medium">₹{formatNumber(selectedBatch.currentQuantity * selectedBatch.costPrice)}</p>
                                </div>
                            </div>
                        </div>

                        {/* Status Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                New Status
                            </label>
                            <div className="flex gap-2">
                                {['damaged', 'expired', 'returned'].map((status) => (
                                    <button
                                        key={status}
                                        onClick={() => setNewStatus(status)}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                            newStatus === status
                                                ? status === 'returned' 
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-red-600 text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                    >
                                        {status.charAt(0).toUpperCase() + status.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Reason */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Reason <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                value={statusReason}
                                onChange={(e) => setStatusReason(e.target.value)}
                                className="input"
                                rows={3}
                                placeholder={
                                    newStatus === 'damaged' ? 'e.g., Water damage, Broken packaging, Contamination...' :
                                    newStatus === 'expired' ? 'e.g., Past expiry date, Quality degradation...' :
                                    'e.g., Supplier return, Quality issue return...'
                                }
                            />
                        </div>
                    </div>
                )}
            </Modal>

            {/* Actions Modal - Popup Menu */}
            <Modal
                isOpen={showActionsModal}
                onClose={() => {
                    setShowActionsModal(false);
                    setSelectedBatch(null);
                }}
                title="Batch Actions"
                size="sm"
            >
                {selectedBatch && (
                    <div className="space-y-4">
                        {/* Batch Info Header */}
                        <div className="bg-gray-50 rounded-lg p-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-medium text-gray-900">{selectedBatch.product?.name}</p>
                                    <p className="text-sm text-gray-500">Batch: {selectedBatch.batchNumber}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xl font-bold text-gray-900">{selectedBatch.currentQuantity}</p>
                                    <p className="text-xs text-gray-500">units</p>
                                </div>
                            </div>
                            <div className="mt-2 pt-2 border-t border-gray-200 flex justify-between text-sm">
                                <span className="text-gray-500">Cost: ₹{formatNumber(selectedBatch.costPrice)}</span>
                                <span className="text-gray-500">Sell: ₹{formatNumber(selectedBatch.sellingPrice)}</span>
                                <span className="font-medium text-blue-600">Value: ₹{formatNumber(selectedBatch.currentQuantity * selectedBatch.costPrice)}</span>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="space-y-2">
                            <button
                                onClick={() => openAdjustModal()}
                                className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-lg border border-gray-200 flex items-center gap-3 transition-colors"
                            >
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <MinusCircle size={18} className="text-blue-600" />
                                </div>
                                <div>
                                    <p className="font-medium">Adjust Quantity</p>
                                    <p className="text-xs text-gray-500">Increase or decrease batch quantity</p>
                                </div>
                            </button>

                            <button
                                onClick={handleQuickDeplete}
                                disabled={isSubmitting}
                                className="w-full px-4 py-3 text-left text-sm text-red-700 hover:bg-red-50 rounded-lg border border-red-200 flex items-center gap-3 transition-colors"
                            >
                                <div className="p-2 bg-red-100 rounded-lg">
                                    <Trash2 size={18} className="text-red-600" />
                                </div>
                                <div>
                                    <p className="font-medium">Deplete Entire Batch</p>
                                    <p className="text-xs text-red-500">Set quantity to 0 (cannot be undone)</p>
                                </div>
                            </button>

                            <div className="border-t border-gray-200 pt-2 mt-2">
                                <p className="text-xs text-gray-500 mb-2 px-1">Mark batch status as:</p>
                                
                                <button
                                    onClick={() => openStatusModal(null, 'damaged')}
                                    className="w-full px-4 py-3 text-left text-sm text-orange-700 hover:bg-orange-50 rounded-lg border border-orange-200 flex items-center gap-3 transition-colors mb-2"
                                >
                                    <div className="p-2 bg-orange-100 rounded-lg">
                                        <AlertCircle size={18} className="text-orange-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium">Mark as Damaged</p>
                                        <p className="text-xs text-orange-500">Physical damage, contamination</p>
                                    </div>
                                </button>

                                <button
                                    onClick={() => openStatusModal(null, 'expired')}
                                    className="w-full px-4 py-3 text-left text-sm text-red-700 hover:bg-red-50 rounded-lg border border-red-200 flex items-center gap-3 transition-colors mb-2"
                                >
                                    <div className="p-2 bg-red-100 rounded-lg">
                                        <AlertTriangle size={18} className="text-red-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium">Mark as Expired</p>
                                        <p className="text-xs text-red-500">Past expiry date</p>
                                    </div>
                                </button>

                                <button
                                    onClick={() => openStatusModal(null, 'returned')}
                                    className="w-full px-4 py-3 text-left text-sm text-blue-700 hover:bg-blue-50 rounded-lg border border-blue-200 flex items-center gap-3 transition-colors"
                                >
                                    <div className="p-2 bg-blue-100 rounded-lg">
                                        <RotateCcw size={18} className="text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium">Mark as Returned</p>
                                        <p className="text-xs text-blue-500">Returned to supplier</p>
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* Cancel Button */}
                        <div className="pt-2 border-t border-gray-200">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowActionsModal(false);
                                    setSelectedBatch(null);
                                }}
                                className="w-full"
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default BatchList;
