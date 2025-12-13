import React, { useState, useEffect } from 'react';
import {
    Package,
    ShoppingCart,
    TrendingUp,
    AlertTriangle,
    DollarSign,
    Users,
    ArrowUp,
    ArrowDown,
} from 'lucide-react';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import { productsAPI, inventoryAPI } from '../services/api';
import { formatCurrency, formatNumber, formatDate } from '../utils/helpers';
import toast from 'react-hot-toast';

const Dashboard = () => {
    const [stats, setStats] = useState(null);
    const [lowStockProducts, setLowStockProducts] = useState([]);
    const [expiringBatches, setExpiringBatches] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const [statsData, lowStock, expiring] = await Promise.all([
                productsAPI.getStats(),
                productsAPI.getLowStock(),
                inventoryAPI.getExpiringBatches(30),
            ]);

            if (statsData.success) {
                setStats(statsData.data);
            }

            if (lowStock.success) {
                setLowStockProducts(lowStock.data);
            }

            if (expiring.success) {
                // Transform product-level data to batch-level format
                const transformedBatches = (expiring.data || []).map((product) => {
                    const today = new Date();
                    const expiryDate = product.expiryDate ? new Date(product.expiryDate) : null;
                    const daysUntilExpiry = expiryDate 
                        ? Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24))
                        : 0;
                    
                    const valueAtRisk = (product.expiringQuantity || 0) * (product.costPrice || 0);
                    
                    return {
                        _id: product._id,
                        product: {
                            _id: product._id,
                            name: product.name,
                            sku: product.sku
                        },
                        batchNumber: product.expiringBatchCount > 1 
                            ? `${product.expiringBatchCount} batches` 
                            : 'N/A',
                        currentQuantity: product.expiringQuantity || 0,
                        expiryDate: product.expiryDate,
                        daysUntilExpiry,
                        valueAtRisk,
                        expiringBatchCount: product.expiringBatchCount
                    };
                });
                // Sort by daysUntilExpiry (ascending - most urgent/expired first)
                const sortedBatches = transformedBatches.sort((a, b) => {
                    return (a.daysUntilExpiry || 0) - (b.daysUntilExpiry || 0);
                });
                setExpiringBatches(sortedBatches);
            }
        } catch (error) {
            toast.error('Failed to load dashboard data');
            console.error('Dashboard error:', error);
        } finally {
            setLoading(false);
        }
    };

    const statCards = [
        {
            title: 'Total Products',
            value: stats?.overview?.totalProducts || 0,
            icon: Package,
            color: 'bg-blue-500',
            change: '+12%',
            trend: 'up',
        },
        {
            title: 'Total Stock Value',
            value: formatCurrency(stats?.overview?.totalValue || 0),
            icon: DollarSign,
            color: 'bg-green-500',
            change: '+8%',
            trend: 'up',
        },
        {
            title: 'Low Stock Items',
            value: stats?.overview?.lowStockCount || 0,
            icon: AlertTriangle,
            color: 'bg-yellow-500',
            change: '-3%',
            trend: 'down',
        },
        {
            title: 'Total Stock Units',
            value: formatNumber(stats?.overview?.totalStock || 0),
            icon: TrendingUp,
            color: 'bg-purple-500',
            change: '+15%',
            trend: 'up',
        },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-600 mt-1">Welcome back! Here's what's happening today.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((stat, index) => (
                    <Card key={index} className="hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                                <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
                                <div className="flex items-center mt-2">
                                    {stat.trend === 'up' ? (
                                        <ArrowUp size={16} className="text-green-500" />
                                    ) : (
                                        <ArrowDown size={16} className="text-red-500" />
                                    )}
                                    <span
                                        className={`text-sm font-medium ml-1 ${stat.trend === 'up' ? 'text-green-500' : 'text-red-500'
                                            }`}
                                    >
                                        {stat.change}
                                    </span>
                                    <span className="text-sm text-gray-500 ml-1">vs last month</span>
                                </div>
                            </div>
                            <div className={`${stat.color} p-3 rounded-lg`}>
                                <stat.icon className="text-white" size={24} />
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Charts and Lists */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Low Stock Products */}
                <Card title="Low Stock Alert" subtitle={`${lowStockProducts.length} items need attention`}>
                    <div className="space-y-3">
                        {lowStockProducts.slice(0, 5).map((product) => (
                            <div key={product._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex-1">
                                    <p className="font-medium text-gray-900">{product.name}</p>
                                    <p className="text-sm text-gray-600">{product.sku}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-semibold text-red-600">{product.currentStock}</p>
                                    <p className="text-xs text-gray-500">Min: {product.minStockLevel}</p>
                                </div>
                            </div>
                        ))}
                        {lowStockProducts.length === 0 && (
                            <p className="text-center text-gray-500 py-4">All products are well stocked!</p>
                        )}
                    </div>
                </Card>

                {/* Expiring Batches */}
                <Card title="Expiring Soon" subtitle={`${expiringBatches.length} products expiring in 30 days`}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Days</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Expiry</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {expiringBatches.slice(0, 10).map((batch) => {
                                    const isExpired = (batch.daysUntilExpiry || 0) <= 0;
                                    const isUrgent = (batch.daysUntilExpiry || 0) <= 7;
                                    return (
                                        <tr 
                                            key={batch._id} 
                                            className={`hover:bg-gray-50 ${isExpired ? 'bg-red-50' : isUrgent ? 'bg-orange-50' : ''}`}
                                        >
                                            <td className="px-3 py-2">
                                                <div className="font-medium text-gray-900">{batch.product?.name || 'Unknown'}</div>
                                                <div className="text-xs text-gray-500">{batch.product?.sku || 'N/A'}</div>
                                            </td>
                                            <td className="px-3 py-2">
                                                <Badge 
                                                    variant={isExpired ? 'danger' : isUrgent ? 'warning' : 'info'}
                                                >
                                                    {isExpired ? 'Expired' : `${batch.daysUntilExpiry || 0}d`}
                                                </Badge>
                                            </td>
                                            <td className="px-3 py-2 text-gray-900">{batch.currentQuantity || 0}</td>
                                            <td className="px-3 py-2 text-gray-600 text-xs">
                                                {batch.expiryDate ? formatDate(batch.expiryDate) : 'N/A'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {expiringBatches.length === 0 && (
                            <p className="text-center text-gray-500 py-4">No batches expiring soon!</p>
                        )}
                        {expiringBatches.length > 10 && (
                            <div className="mt-3 text-center">
                                <a 
                                    href="/batches/expiring" 
                                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                                >
                                    View all {expiringBatches.length} expiring products →
                                </a>
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default Dashboard;

