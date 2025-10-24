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
import { productsAPI, purchaseOrdersAPI, inventoryAPI } from '../services/api';
import { formatCurrency, formatNumber, formatDate } from '../utils/helpers';
import toast from 'react-hot-toast';

const Dashboard = () => {
    const [stats, setStats] = useState(null);
    const [lowStockProducts, setLowStockProducts] = useState([]);
    const [expiringBatches, setExpiringBatches] = useState([]);
    const [recentPOs, setRecentPOs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const [statsData, lowStock, expiring, pos] = await Promise.all([
                productsAPI.getStats(),
                productsAPI.getLowStock(),
                inventoryAPI.getExpiringBatches(30),
                purchaseOrdersAPI.getAll({ limit: 5, sortBy: 'createdAt', sortOrder: 'desc' }),
            ]);

            if (statsData.success) {
                setStats(statsData.data);
            }

            if (lowStock.success) {
                setLowStockProducts(lowStock.data);
            }

            if (expiring.success) {
                setExpiringBatches(expiring.data);
            }

            if (pos.success) {
                setRecentPOs(pos.data);
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
                <Card title="Expiring Soon" subtitle={`${expiringBatches.length} batches expiring in 30 days`}>
                    <div className="space-y-3">
                        {expiringBatches.slice(0, 5).map((batch) => (
                            <div key={batch._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex-1">
                                    <p className="font-medium text-gray-900">{batch.product?.name || 'N/A'}</p>
                                    <p className="text-sm text-gray-600">Batch: {batch.batchNumber}</p>
                                </div>
                                <div className="text-right">
                                    <Badge variant="danger">{formatDate(batch.expiryDate)}</Badge>
                                    <p className="text-xs text-gray-500 mt-1">{batch.currentQuantity} units</p>
                                </div>
                            </div>
                        ))}
                        {expiringBatches.length === 0 && (
                            <p className="text-center text-gray-500 py-4">No batches expiring soon!</p>
                        )}
                    </div>
                </Card>
            </div>

            {/* Recent Purchase Orders */}
            <Card title="Recent Purchase Orders" subtitle="Latest purchase activities">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">PO Number</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {recentPOs.map((po) => (
                                <tr key={po._id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {po.poNumber}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {po.supplier?.name || 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {formatCurrency(po.totalAmount)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <Badge variant={po.status === 'approved' ? 'success' : po.status === 'pending' ? 'warning' : 'gray'}>
                                            {po.status}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {formatDate(po.createdAt)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {recentPOs.length === 0 && (
                        <p className="text-center text-gray-500 py-8">No purchase orders yet</p>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default Dashboard;

