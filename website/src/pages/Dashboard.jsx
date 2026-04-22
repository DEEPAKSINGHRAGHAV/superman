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
    CheckCircle,
} from 'lucide-react';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import { productsAPI, inventoryAPI, analyticsAPI } from '../services/api';
import { formatCurrency, formatNumber, formatDate } from '../utils/helpers';
import toast from 'react-hot-toast';

const Dashboard = () => {
    const [stats, setStats] = useState(null);
    const [lowStockProducts, setLowStockProducts] = useState([]);
    const [expiringBatches, setExpiringBatches] = useState([]);
    const [salesPatterns, setSalesPatterns] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const [statsData, lowStock, expiring, patternsData] = await Promise.all([
                productsAPI.getStats(),
                productsAPI.getLowStock(),
                inventoryAPI.getExpiringBatches(30),
                analyticsAPI.getBasketPatterns({ limit: 5 })
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

            if (patternsData && patternsData.success) {
                setSalesPatterns(patternsData.data || []);
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
            iconColor: 'text-blue-600',
            bgLight: 'bg-blue-50',
            change: '+12%',
            trend: 'up',
        },
        {
            title: 'Total Stock Value',
            value: formatCurrency(stats?.overview?.totalValue || 0),
            icon: DollarSign,
            iconColor: 'text-green-600',
            bgLight: 'bg-green-50',
            change: '+8%',
            trend: 'up',
        },
        {
            title: 'Low Stock Items',
            value: stats?.overview?.lowStockCount || 0,
            icon: AlertTriangle,
            iconColor: 'text-yellow-600',
            bgLight: 'bg-yellow-50',
            change: '-3%',
            trend: 'down',
        },
        {
            title: 'Total Stock Units',
            value: formatNumber(stats?.overview?.totalStock || 0),
            icon: TrendingUp,
            iconColor: 'text-purple-600',
            bgLight: 'bg-purple-50',
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
        <div className="space-y-8">
            {/* Header */}
            <div>
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-xs font-bold text-blue-600 tracking-wider uppercase">Overview</span>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
                <p className="text-sm font-medium text-gray-500 mt-1">Welcome back! Here's what's happening today.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((stat, index) => (
                    <div key={index} className="bg-white rounded-[1.5rem] border border-gray-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 p-6 relative overflow-hidden group hover:-translate-y-1">
                        <div className="flex items-center justify-between mb-4 relative z-10">
                            <div className={`${stat.bgLight} p-3 rounded-2xl`}>
                                <stat.icon className={stat.iconColor} size={24} strokeWidth={2.5} />
                            </div>
                            <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${stat.trend === 'up' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                {stat.trend === 'up' ? <ArrowUp size={14} strokeWidth={3} /> : <ArrowDown size={14} strokeWidth={3} />}
                                <span>{stat.change}</span>
                            </div>
                        </div>
                        <div className="relative z-10">
                            <p className="text-[2rem] leading-none font-bold text-gray-900 tracking-tighter">{stat.value}</p>
                            <p className="text-sm font-semibold text-gray-500 mt-2">{stat.title}</p>
                        </div>
                        {/* Decorative background circle */}
                        <div className="absolute -bottom-6 -right-6 w-32 h-32 rounded-full bg-gradient-to-br from-gray-50 to-gray-100/50 opacity-0 group-hover:opacity-100 group-hover:scale-150 transition-all duration-500 pointer-events-none" />
                    </div>
                ))}
            </div>

            {/* Charts and Lists */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-8">
                {/* Low Stock Products */}
                <div className="bg-white rounded-[1.5rem] border border-gray-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] p-6 flex flex-col h-full">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Low Stock Alert</h2>
                            <p className="text-sm font-medium text-gray-500 mt-1">{lowStockProducts.length} items need attention</p>
                        </div>
                        <div className="p-3 bg-yellow-50 text-yellow-600 rounded-2xl">
                            <AlertTriangle size={24} strokeWidth={2.5} />
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col">
                        <div className="space-y-3 flex-1">
                            {lowStockProducts.slice(0, 5).map((product) => (
                                <div key={product._id} className="flex items-center justify-between p-4 bg-gray-50 hover:bg-white border-2 border-transparent hover:border-gray-100 hover:shadow-sm transition-all rounded-2xl group">
                                    <div className="flex-1 min-w-0 pr-4">
                                        <p className="font-semibold text-gray-900 truncate tracking-tight">{product.name}</p>
                                        <p className="text-sm font-medium text-gray-500 mt-0.5 tracking-wide">#{product.sku}</p>
                                    </div>
                                    <div className="text-right whitespace-nowrap">
                                        <div className="inline-flex items-center justify-center px-4 py-1.5 bg-red-50/80 group-hover:bg-red-50 text-red-600 rounded-xl font-bold text-lg mb-1 transition-colors">
                                            {product.currentStock}
                                        </div>
                                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest leading-none">Min: {product.minStockLevel}</p>
                                    </div>
                                </div>
                            ))}
                            {lowStockProducts.length === 0 && (
                                <div className="h-full min-h-[250px] flex flex-col items-center justify-center text-center">
                                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                                        <Package size={32} className="text-blue-500" strokeWidth={2} />
                                    </div>
                                    <p className="text-lg font-bold text-gray-900 tracking-tight">Stock is looking good!</p>
                                    <p className="text-sm font-medium text-gray-500 mt-1">All products are well above minimum levels.</p>
                                </div>
                            )}
                        </div>
                        
                        {lowStockProducts.length > 5 && (
                            <div className="mt-6 text-center">
                                <a 
                                    href="/inventory?filter=low-stock" 
                                    className="inline-flex items-center justify-center w-full px-6 py-3 bg-gray-50 hover:bg-gray-100 text-gray-700 font-semibold rounded-xl transition-colors tracking-wide text-sm border border-gray-200"
                                >
                                    Review all {lowStockProducts.length} low stock items
                                </a>
                            </div>
                        )}
                    </div>
                </div>

                {/* Expiring Batches */}
                <div className="bg-white rounded-[1.5rem] border border-gray-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] p-6 flex flex-col h-full">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Expiring Soon</h2>
                            <p className="text-sm font-medium text-gray-500 mt-1">{expiringBatches.length} products expiring in 30 days</p>
                        </div>
                        <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
                            <ShoppingCart size={24} strokeWidth={2.5} />
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col">
                        {expiringBatches.length > 0 ? (
                            <div className="overflow-x-auto flex-1">
                                <table className="w-full text-left border-separate border-spacing-y-2">
                                    <thead>
                                        <tr>
                                            <th className="px-4 pb-2 text-xs font-bold text-gray-400 uppercase tracking-widest w-1/2">Product</th>
                                            <th className="px-4 pb-2 text-xs font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">Status / Qty</th>
                                            <th className="px-4 pb-2 text-xs font-bold text-gray-400 uppercase tracking-widest text-right whitespace-nowrap">Expiry</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm">
                                        {expiringBatches.slice(0, 5).map((batch) => {
                                            const isExpired = (batch.daysUntilExpiry || 0) <= 0;
                                            const isUrgent = (batch.daysUntilExpiry || 0) <= 7;
                                            return (
                                                <tr 
                                                    key={batch._id} 
                                                    className="group"
                                                >
                                                    <td className="px-4 py-3 bg-gray-50 group-hover:bg-white border-y border-l border-transparent group-hover:border-gray-100 rounded-l-2xl transition-colors">
                                                        <div className="font-semibold text-gray-900 tracking-tight truncate max-w-[180px]">{batch.product?.name || 'Unknown'}</div>
                                                        <div className="text-xs font-medium text-gray-500 mt-0.5 tracking-wide">#{batch.product?.sku || 'N/A'}</div>
                                                    </td>
                                                    <td className="px-4 py-3 bg-gray-50 group-hover:bg-white border-y border-transparent group-hover:border-gray-100 transition-colors">
                                                        <div className="flex flex-col gap-1 items-start">
                                                            {isExpired ? (
                                                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold tracking-wider uppercase bg-red-100 text-red-700">Expired</span>
                                                            ) : isUrgent ? (
                                                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold tracking-wider uppercase bg-orange-100 text-orange-700">{batch.daysUntilExpiry || 0}d left</span>
                                                            ) : (
                                                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold tracking-wider uppercase bg-gray-200 text-gray-700">{batch.daysUntilExpiry || 0}d left</span>
                                                            )}
                                                            <span className="text-xs font-semibold text-gray-900">{batch.currentQuantity || 0} units</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 bg-gray-50 group-hover:bg-white border-y border-r border-transparent group-hover:border-gray-100 rounded-r-2xl text-right transition-colors">
                                                        <div className="text-sm font-bold text-gray-600">
                                                            {batch.expiryDate ? formatDate(batch.expiryDate) : 'N/A'}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="h-full min-h-[250px] flex flex-col items-center justify-center text-center">
                                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4">
                                    <CheckCircle size={32} className="text-green-500" strokeWidth={2} />
                                </div>
                                <p className="text-lg font-bold text-gray-900 tracking-tight">No Expiring Batches!</p>
                                <p className="text-sm font-medium text-gray-500 mt-1">All inventory batches are well within their shelf life.</p>
                            </div>
                        )}
                        
                        {expiringBatches.length > 5 && (
                            <div className="mt-6 text-center">
                                <a 
                                    href="/batches/expiring" 
                                    className="inline-flex items-center justify-center w-full px-6 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded-xl transition-colors tracking-wide text-sm"
                                >
                                    Review all {expiringBatches.length} expiring batches
                                </a>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Sales Patterns (Market Basket Analysis) */}
            <div className="bg-white rounded-[1.5rem] border border-gray-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 tracking-tight">Sales Patterns</h2>
                        <p className="text-sm font-medium text-gray-500 mt-1">Frequently bought together items discovered by AI Data Mining</p>
                    </div>
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                        <TrendingUp size={24} strokeWidth={2.5} />
                    </div>
                </div>

                {salesPatterns.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                        {salesPatterns.map((pattern, idx) => (
                            <div key={idx} className="bg-gradient-to-br from-indigo-50/50 to-white border border-indigo-100 p-4 rounded-2xl hover:shadow-md transition-all group">
                                <div className="flex flex-col h-full justify-between">
                                    <div>
                                        <div className="text-xs font-bold text-indigo-600 tracking-wider uppercase mb-2">Confidence: {pattern.confidence}%</div>
                                        <h3 className="font-bold text-gray-900 leading-snug">
                                            {pattern.antecedent.name}
                                        </h3>
                                        <div className="my-1 text-gray-400">
                                            <ArrowDown size={16} className="rotate-0 md:-rotate-90 md:ml-2" />
                                        </div>
                                        <h3 className="font-bold text-indigo-900 leading-snug">
                                            {pattern.consequent.name}
                                        </h3>
                                    </div>
                                    <div className="mt-4 pt-3 border-t border-indigo-100 flex items-center justify-between">
                                        <span className="text-xs font-medium text-gray-500">Pair Lift: {pattern.lift}x</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-8 flex flex-col items-center justify-center text-center">
                        <Package size={32} className="text-gray-300 mb-3" />
                        <p className="text-sm font-medium text-gray-500">Not enough sales data to generate reliable patterns yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;

