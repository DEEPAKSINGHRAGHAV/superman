import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Package, Calendar, DollarSign, TrendingDown, Filter, RefreshCw, Clock, AlertCircle } from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Loading from '../../components/common/Loading';
import { inventoryAPI } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/helpers';
import toast from 'react-hot-toast';

const FILTER_OPTIONS = [
    { label: '7 Days', value: 7, icon: <AlertCircle size={16} /> },
    { label: '15 Days', value: 15, icon: <Clock size={16} /> },
    { label: '30 Days', value: 30, icon: <Calendar size={16} /> },
    { label: '60 Days', value: 60, icon: <Calendar size={16} /> },
];

const ExpiringProducts = () => {
    const navigate = useNavigate();
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedFilter, setSelectedFilter] = useState(30);

    useEffect(() => {
        fetchExpiringBatches();
    }, [selectedFilter]);

    const fetchExpiringBatches = async () => {
        try {
            setLoading(true);
            const response = await inventoryAPI.getExpiringBatches(selectedFilter);
            if (response.success) {
                setBatches(response.data || []);
            }
        } catch (error) {
            toast.error('Failed to load expiring products');
            console.error('Expiring batches fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    const getExpiryColor = (daysUntilExpiry) => {
        if (daysUntilExpiry <= 0) return 'red';
        if (daysUntilExpiry <= 7) return 'red';
        if (daysUntilExpiry <= 15) return 'orange';
        return 'yellow';
    };

    const getExpiryText = (daysUntilExpiry) => {
        if (daysUntilExpiry <= 0) return 'EXPIRED';
        if (daysUntilExpiry === 1) return '1 day left';
        return `${daysUntilExpiry} days left`;
    };

    // Calculate summary statistics
    const totalBatches = batches.length;
    const totalQuantity = batches.reduce((sum, batch) => sum + (batch.currentQuantity || 0), 0);
    const totalValueAtRisk = batches.reduce((sum, batch) => sum + (batch.valueAtRisk || 0), 0);
    const expiredCount = batches.filter(b => (b.daysUntilExpiry || 0) <= 0).length;

    if (loading) {
        return <Loading text="Loading expiring products..." />;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-orange-100 rounded-lg">
                        <AlertTriangle size={24} className="text-orange-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Expiring Products</h1>
                        <p className="text-gray-600 mt-1">Monitor products approaching expiry</p>
                    </div>
                </div>
                <Button
                    variant="secondary"
                    icon={<RefreshCw size={18} />}
                    onClick={fetchExpiringBatches}
                    className="mt-4 sm:mt-0"
                >
                    Refresh
                </Button>
            </div>

            {/* Summary Cards */}
            {batches.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Total Batches</p>
                                <p className="text-2xl font-bold text-gray-900 mt-1">{totalBatches}</p>
                            </div>
                            <div className="p-3 bg-blue-100 rounded-lg">
                                <Package size={24} className="text-blue-600" />
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Total Quantity</p>
                                <p className="text-2xl font-bold text-gray-900 mt-1">{totalQuantity}</p>
                            </div>
                            <div className="p-3 bg-purple-100 rounded-lg">
                                <Package size={24} className="text-purple-600" />
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Value at Risk</p>
                                <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(totalValueAtRisk)}</p>
                            </div>
                            <div className="p-3 bg-red-100 rounded-lg">
                                <DollarSign size={24} className="text-red-600" />
                            </div>
                        </div>
                    </Card>

                    {expiredCount > 0 && (
                        <Card className="bg-red-50 border-red-200">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-red-700">Already Expired</p>
                                    <p className="text-2xl font-bold text-red-700 mt-1">{expiredCount}</p>
                                </div>
                                <div className="p-3 bg-red-200 rounded-lg">
                                    <AlertTriangle size={24} className="text-red-700" />
                                </div>
                            </div>
                        </Card>
                    )}
                </div>
            )}

            {/* Filter Chips */}
            <Card>
                <div className="flex items-center space-x-2 flex-wrap gap-2">
                    <Filter size={18} className="text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">Show expiring within:</span>
                    {FILTER_OPTIONS.map((option) => (
                        <button
                            key={option.value}
                            onClick={() => setSelectedFilter(option.value)}
                            className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center space-x-2 transition-colors ${selectedFilter === option.value
                                    ? 'bg-orange-500 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            {option.icon}
                            <span>{option.label}</span>
                        </button>
                    ))}
                </div>
            </Card>

            {/* Batch List */}
            {batches.length === 0 ? (
                <Card>
                    <div className="flex flex-col items-center justify-center py-12">
                        <div className="p-4 bg-green-100 rounded-full mb-4">
                            <Package size={48} className="text-green-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Expiring Products</h3>
                        <p className="text-gray-600 text-center">
                            No products expiring in the next {selectedFilter} days.
                        </p>
                    </div>
                </Card>
            ) : (
                <div className="space-y-4">
                    {batches.map((batch) => {
                        const expiryColor = getExpiryColor(batch.daysUntilExpiry || 0);
                        const isExpired = (batch.daysUntilExpiry || 0) <= 0;

                        return (
                            <Card key={batch._id} className={isExpired ? 'border-2 border-red-500' : ''}>
                                <div className="space-y-4">
                                    {/* Product Header */}
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <button
                                                onClick={() => navigate(`/products/${batch.product?._id}`)}
                                                className="text-left hover:text-blue-600 transition-colors"
                                            >
                                                <h3 className="text-lg font-semibold text-gray-900">
                                                    {batch.product?.name || 'Unknown Product'}
                                                </h3>
                                                <p className="text-sm text-gray-600 mt-1">
                                                    SKU: {batch.product?.sku || 'N/A'}
                                                </p>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Expiry Warning Banner */}
                                    <div className={`p-4 rounded-lg flex items-center space-x-3 ${isExpired
                                            ? 'bg-red-100 border border-red-200'
                                            : expiryColor === 'red'
                                                ? 'bg-red-50 border border-red-200'
                                                : expiryColor === 'orange'
                                                    ? 'bg-orange-50 border border-orange-200'
                                                    : 'bg-yellow-50 border border-yellow-200'
                                        }`}>
                                        <AlertTriangle
                                            size={20}
                                            className={
                                                isExpired || expiryColor === 'red'
                                                    ? 'text-red-600'
                                                    : expiryColor === 'orange'
                                                        ? 'text-orange-600'
                                                        : 'text-yellow-600'
                                            }
                                        />
                                        <div className="flex-1">
                                            <p className={`font-bold ${isExpired || expiryColor === 'red'
                                                    ? 'text-red-900'
                                                    : expiryColor === 'orange'
                                                        ? 'text-orange-900'
                                                        : 'text-yellow-900'
                                                }`}>
                                                {getExpiryText(batch.daysUntilExpiry || 0)}
                                            </p>
                                            {batch.expiryDate && (
                                                <p className={`text-sm ${isExpired || expiryColor === 'red'
                                                        ? 'text-red-700'
                                                        : expiryColor === 'orange'
                                                            ? 'text-orange-700'
                                                            : 'text-yellow-700'
                                                    }`}>
                                                    Expiry Date: {formatDate(batch.expiryDate)}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Batch Details */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div>
                                            <p className="text-sm text-gray-600">Batch Number</p>
                                            <p className="font-medium text-gray-900 mt-1">{batch.batchNumber || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">Quantity</p>
                                            <p className="font-semibold text-gray-900 mt-1">{batch.currentQuantity || 0} units</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">Value at Risk</p>
                                            <p className="font-bold text-red-600 mt-1">{formatCurrency(batch.valueAtRisk || 0)}</p>
                                        </div>
                                        {batch.supplier?.name && (
                                            <div>
                                                <p className="text-sm text-gray-600">Supplier</p>
                                                <p className="font-medium text-gray-900 mt-1">{batch.supplier.name}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="pt-4 border-t flex items-center space-x-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => navigate(`/batches?product=${batch.product?._id}`)}
                                        >
                                            View All Batches
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default ExpiringProducts;


