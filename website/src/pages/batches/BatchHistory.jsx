import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Layers, Package, Calendar, TrendingUp, RefreshCw, Filter, History, ArrowDownCircle, ArrowUpCircle, AlertTriangle, Search } from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Input from '../../components/common/Input';
import Loading from '../../components/common/Loading';
import Pagination from '../../components/common/Pagination';
import { batchesAPI, inventoryAPI } from '../../services/api';
import { formatCurrency, formatDate, formatNumber, debounce } from '../../utils/helpers';
import toast from 'react-hot-toast';

const STATUS_FILTERS = [
    { label: 'All', value: 'all' },
    { label: 'Active', value: 'active' },
    { label: 'Depleted', value: 'depleted' },
    { label: 'Expired', value: 'expired' },
    { label: 'Damaged', value: 'damaged' },
    { label: 'Returned', value: 'returned' },
];

const TABS = [
    { id: 'batches', label: 'Batch Records', icon: Layers },
    { id: 'movements', label: 'Stock Movements', icon: History },
];

const BatchHistory = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const productId = searchParams.get('product');

    const [activeTab, setActiveTab] = useState('batches');
    const [batches, setBatches] = useState([]);
    const [movements, setMovements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedFilter, setSelectedFilter] = useState('all');
    const [batchSearch, setBatchSearch] = useState('');
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
    });

    useEffect(() => {
        if (activeTab === 'batches') {
            fetchBatches();
        } else {
            fetchMovements();
        }
    }, [selectedFilter, pagination.page, productId, activeTab, batchSearch]);

    const fetchBatches = async () => {
        try {
            setLoading(true);
            const params = {
                page: pagination.page,
                limit: pagination.limit,
                ...(productId && { product: productId }),
                ...(selectedFilter !== 'all' && { status: selectedFilter }),
                ...(batchSearch && { batchNumber: batchSearch }),
            };

            const response = await batchesAPI.getAll(params);
            if (response.success) {
                setBatches(response.data || []);
                setPagination(prev => ({
                    ...prev,
                    total: response.total || 0,
                    totalPages: response.pages || Math.ceil((response.total || 0) / prev.limit),
                }));
            }
        } catch (error) {
            toast.error('Failed to load batch history');
            console.error('Batch history fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchMovements = async () => {
        try {
            setLoading(true);
            const params = {
                page: pagination.page,
                limit: pagination.limit,
                ...(productId && { product: productId }),
            };

            const response = await inventoryAPI.getMovements(params);
            if (response.success) {
                setMovements(response.data || []);
                setPagination(prev => ({
                    ...prev,
                    total: response.total || 0,
                    totalPages: response.pagination?.totalPages || Math.ceil((response.total || 0) / prev.limit),
                }));
            }
        } catch (error) {
            toast.error('Failed to load stock movements');
            console.error('Movements fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleBatchSearch = debounce((value) => {
        setBatchSearch(value);
        setPagination(prev => ({ ...prev, page: 1 }));
    }, 500);

    const getStatusColor = (status) => {
        switch (status) {
            case 'active': return 'green';
            case 'depleted': return 'gray';
            case 'expired': return 'red';
            case 'damaged': return 'orange';
            case 'returned': return 'blue';
            default: return 'gray';
        }
    };

    const getMovementTypeColor = (type) => {
        switch (type) {
            case 'purchase': return 'green';
            case 'sale': return 'blue';
            case 'adjustment': return 'yellow';
            case 'damage': return 'red';
            case 'expired': return 'red';
            case 'return': return 'purple';
            default: return 'gray';
        }
    };

    const getMovementIcon = (type, quantity) => {
        if (quantity > 0) {
            return <ArrowUpCircle size={20} className="text-green-600" />;
        } else {
            return <ArrowDownCircle size={20} className="text-red-600" />;
        }
    };

    if (loading && (batches.length === 0 && movements.length === 0)) {
        return <Loading text="Loading history..." />;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                        <Layers size={24} className="text-blue-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            {productId ? 'Product Batch History' : 'Batch History'}
                        </h1>
                        <p className="text-gray-600 mt-1">View batch records and stock movement audit trail</p>
                    </div>
                </div>
                <Button
                    variant="secondary"
                    icon={<RefreshCw size={18} />}
                    onClick={activeTab === 'batches' ? fetchBatches : fetchMovements}
                    className="mt-4 sm:mt-0"
                >
                    Refresh
                </Button>
            </div>

            {/* Tabs */}
            <Card>
                <div className="flex space-x-4 border-b border-gray-200 pb-4 mb-4">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => {
                                setActiveTab(tab.id);
                                setPagination(prev => ({ ...prev, page: 1 }));
                            }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                                activeTab === tab.id
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            <tab.icon size={18} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Filters for Batches Tab */}
                {activeTab === 'batches' && (
                    <div className="space-y-4">
                        <div className="flex items-center space-x-4">
                            <div className="flex-1">
                                <Input
                                    placeholder="Search by batch number..."
                                    icon={<Search size={18} />}
                                    onChange={(e) => handleBatchSearch(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex items-center space-x-2 flex-wrap gap-2">
                            <Filter size={18} className="text-gray-600" />
                            <span className="text-sm font-medium text-gray-700">Status:</span>
                            {STATUS_FILTERS.map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => {
                                        setSelectedFilter(option.value);
                                        setPagination(prev => ({ ...prev, page: 1 }));
                                    }}
                                    className={`px-3 py-1.5 rounded-lg font-medium text-sm transition-colors ${
                                        selectedFilter === option.value
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Info for Movements Tab */}
                {activeTab === 'movements' && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
                        <History size={18} className="text-blue-600 mt-0.5" />
                        <div>
                            <p className="text-sm font-medium text-blue-800">Stock Movement Audit Trail</p>
                            <p className="text-xs text-blue-700 mt-1">
                                Shows all stock changes including purchases, sales, adjustments, and depletions.
                            </p>
                        </div>
                    </div>
                )}
            </Card>

            {/* Content */}
            {activeTab === 'batches' ? (
                /* Batch Records */
                batches.length === 0 ? (
                    <Card>
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="p-4 bg-gray-100 rounded-full mb-4">
                                <Layers size={48} className="text-gray-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Batches Found</h3>
                            <p className="text-gray-600 text-center">
                                No {selectedFilter !== 'all' ? selectedFilter : ''} batches available.
                                {batchSearch && ` Try a different search term.`}
                            </p>
                        </div>
                    </Card>
                ) : (
                    <>
                        <div className="space-y-4">
                            {batches.map((batch) => (
                                <Card key={batch._id}>
                                    <div className="space-y-4">
                                        {/* Header */}
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center space-x-3">
                                                <h3 className="text-lg font-semibold text-gray-900">{batch.batchNumber}</h3>
                                                <Badge variant={getStatusColor(batch.status)}>
                                                    {batch.status?.charAt(0).toUpperCase() + batch.status?.slice(1)}
                                                </Badge>
                                            </div>
                                        </div>

                                        {/* Product Info */}
                                        {!productId && batch.product && (
                                            <button
                                                onClick={() => navigate(`/products/${batch.product._id}`)}
                                                className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors w-full text-left"
                                            >
                                                <Package size={16} className="text-gray-600" />
                                                <span className="font-medium text-gray-900">{batch.product.name}</span>
                                                <span className="text-sm text-gray-600">({batch.product.sku})</span>
                                            </button>
                                        )}

                                        {/* Quantity Info */}
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="text-center p-3 bg-blue-50 rounded-lg">
                                                <p className="text-sm text-blue-600 font-medium">Initial Qty</p>
                                                <p className="text-xl font-bold text-blue-900 mt-1">{batch.initialQuantity}</p>
                                            </div>
                                            <div className="text-center p-3 bg-green-50 rounded-lg">
                                                <p className="text-sm text-green-600 font-medium">Current Qty</p>
                                                <p className="text-xl font-bold text-green-900 mt-1">{batch.currentQuantity}</p>
                                            </div>
                                            <div className="text-center p-3 bg-purple-50 rounded-lg">
                                                <p className="text-sm text-purple-600 font-medium">Available</p>
                                                <p className="text-xl font-bold text-purple-900 mt-1">{batch.availableQuantity}</p>
                                            </div>
                                        </div>

                                        {/* Price Info */}
                                        <div className="grid grid-cols-3 gap-4">
                                            <div>
                                                <p className="text-sm text-gray-600">Cost Price</p>
                                                <p className="font-semibold text-gray-900 mt-1">{formatCurrency(batch.costPrice)}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-600">Selling Price</p>
                                                <p className="font-semibold text-gray-900 mt-1">{formatCurrency(batch.sellingPrice)}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-600">Profit Margin</p>
                                                <p className="font-semibold text-green-600 mt-1 flex items-center space-x-1">
                                                    <TrendingUp size={16} />
                                                    <span>{batch.profitMargin || 0}%</span>
                                                </p>
                                            </div>
                                        </div>

                                        {/* Date Info */}
                                        <div className="flex items-center justify-between pt-4 border-t">
                                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                                                <Calendar size={14} />
                                                <span>Purchased: {formatDate(batch.purchaseDate)}</span>
                                            </div>
                                            {batch.expiryDate && (
                                                <div className={`px-3 py-1 rounded-lg ${
                                                    batch.isExpired
                                                        ? 'bg-red-50 border border-red-200'
                                                        : batch.daysUntilExpiry <= 7
                                                            ? 'bg-orange-50 border border-orange-200'
                                                            : 'bg-blue-50 border border-blue-200'
                                                }`}>
                                                    <p className={`text-xs font-semibold ${
                                                        batch.isExpired
                                                            ? 'text-red-700'
                                                            : batch.daysUntilExpiry <= 7
                                                                ? 'text-orange-700'
                                                                : 'text-blue-700'
                                                    }`}>
                                                        {batch.isExpired ? 'EXPIRED' : 'Expires'}
                                                    </p>
                                                    <p className={`text-sm font-medium ${
                                                        batch.isExpired
                                                            ? 'text-red-900'
                                                            : batch.daysUntilExpiry <= 7
                                                                ? 'text-orange-900'
                                                                : 'text-blue-900'
                                                    }`}>
                                                        {formatDate(batch.expiryDate)}
                                                        {batch.daysUntilExpiry > 0 && ` (${batch.daysUntilExpiry} days left)`}
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Additional Info */}
                                        {(batch.supplier || batch.purchaseOrder) && (
                                            <div className="flex items-center justify-between text-sm text-gray-600 pt-2 border-t">
                                                {batch.supplier && (
                                                    <span>Supplier: {batch.supplier.name}</span>
                                                )}
                                                {batch.purchaseOrder && (
                                                    <span>PO: {batch.purchaseOrder.orderNumber}</span>
                                                )}
                                            </div>
                                        )}

                                        {/* Current Value */}
                                        {batch.currentQuantity > 0 && (
                                            <div className="p-3 bg-blue-50 rounded-lg">
                                                <p className="text-sm text-blue-700 font-medium text-center">
                                                    Current Value: <span className="text-lg font-bold">{formatCurrency(batch.batchValue || batch.currentQuantity * batch.costPrice)}</span>
                                                </p>
                                            </div>
                                        )}

                                        {/* Depleted Info */}
                                        {batch.currentQuantity === 0 && (
                                            <div className="p-3 bg-gray-100 rounded-lg border border-gray-200">
                                                <p className="text-sm text-gray-700 font-medium text-center flex items-center justify-center gap-2">
                                                    <AlertTriangle size={16} className="text-gray-500" />
                                                    This batch is depleted (0 units remaining)
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </Card>
                            ))}
                        </div>

                        {/* Pagination */}
                        <Card noPadding>
                            <Pagination
                                currentPage={pagination.page}
                                totalPages={pagination.totalPages}
                                onPageChange={(page) => setPagination({ ...pagination, page })}
                                total={pagination.total}
                                pageSize={pagination.limit}
                            />
                        </Card>
                    </>
                )
            ) : (
                /* Stock Movements Tab */
                movements.length === 0 ? (
                    <Card>
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="p-4 bg-gray-100 rounded-full mb-4">
                                <History size={48} className="text-gray-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Stock Movements</h3>
                            <p className="text-gray-600 text-center">
                                No stock movements recorded yet.
                            </p>
                        </div>
                    </Card>
                ) : (
                    <>
                        <div className="space-y-3">
                            {movements.map((movement) => (
                                <Card key={movement._id}>
                                    <div className="flex items-start gap-4">
                                        {/* Icon */}
                                        <div className={`p-2 rounded-lg ${
                                            movement.quantity > 0 ? 'bg-green-100' : 'bg-red-100'
                                        }`}>
                                            {getMovementIcon(movement.movementType, movement.quantity)}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-medium text-gray-900">
                                                            {movement.product?.name || 'Unknown Product'}
                                                        </p>
                                                        <Badge variant={getMovementTypeColor(movement.movementType)} size="sm">
                                                            {movement.movementType?.toUpperCase()}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-sm text-gray-500 mt-0.5">
                                                        {movement.product?.sku}
                                                        {movement.batchNumber && ` • Batch: ${movement.batchNumber}`}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className={`text-lg font-bold ${
                                                        movement.quantity > 0 ? 'text-green-600' : 'text-red-600'
                                                    }`}>
                                                        {movement.quantity > 0 ? '+' : ''}{formatNumber(movement.quantity)}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {movement.previousStock} → {movement.newStock}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Details */}
                                            <div className="mt-3 p-2 bg-gray-50 rounded-lg">
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                                                    {movement.reason && (
                                                        <div className="col-span-2">
                                                            <span className="text-gray-500">Reason: </span>
                                                            <span className="text-gray-900">{movement.reason}</span>
                                                        </div>
                                                    )}
                                                    {movement.unitCost && (
                                                        <div>
                                                            <span className="text-gray-500">Unit Cost: </span>
                                                            <span className="text-gray-900">{formatCurrency(movement.unitCost)}</span>
                                                        </div>
                                                    )}
                                                    {movement.totalCost && (
                                                        <div>
                                                            <span className="text-gray-500">Total: </span>
                                                            <span className="text-gray-900">{formatCurrency(movement.totalCost)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                {movement.notes && (
                                                    <p className="text-sm text-gray-600 mt-2 pt-2 border-t border-gray-200">
                                                        {movement.notes}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Footer */}
                                            <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                                                <span>
                                                    By: {movement.createdBy?.name || 'System'}
                                                </span>
                                                <span>
                                                    {formatDate(movement.createdAt)} at {new Date(movement.createdAt).toLocaleTimeString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>

                        {/* Pagination */}
                        <Card noPadding>
                            <Pagination
                                currentPage={pagination.page}
                                totalPages={pagination.totalPages}
                                onPageChange={(page) => setPagination({ ...pagination, page })}
                                total={pagination.total}
                                pageSize={pagination.limit}
                            />
                        </Card>
                    </>
                )
            )}
        </div>
    );
};

export default BatchHistory;
