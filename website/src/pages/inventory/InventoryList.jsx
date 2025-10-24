import React, { useState, useEffect } from 'react';
import { Package, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Table from '../../components/common/Table';
import Pagination from '../../components/common/Pagination';
import { inventoryAPI, productsAPI } from '../../services/api';
import { formatDate, formatNumber } from '../../utils/helpers';
import toast from 'react-hot-toast';

const InventoryList = () => {
    const [movements, setMovements] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
    });

    useEffect(() => {
        fetchData();
    }, [pagination.page]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [movementsRes, summaryRes] = await Promise.all([
                inventoryAPI.getMovements({
                    page: pagination.page,
                    limit: pagination.limit,
                }),
                inventoryAPI.getSummary(),
            ]);

            if (movementsRes.success) {
                setMovements(movementsRes.data);
                setPagination((prev) => ({
                    ...prev,
                    total: movementsRes.total,
                    totalPages: movementsRes.pagination?.totalPages || 1,
                }));
            }

            if (summaryRes.success) {
                setSummary(summaryRes.data);
            }
        } catch (error) {
            toast.error('Failed to load inventory data');
            console.error('Inventory fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    const getMovementIcon = (type) => {
        switch (type) {
            case 'in':
            case 'purchase':
                return <TrendingUp className="text-green-600" size={18} />;
            case 'out':
            case 'sale':
                return <TrendingDown className="text-red-600" size={18} />;
            default:
                return <AlertCircle className="text-yellow-600" size={18} />;
        }
    };

    const getMovementColor = (type) => {
        switch (type) {
            case 'in':
            case 'purchase':
                return 'success';
            case 'out':
            case 'sale':
                return 'danger';
            default:
                return 'warning';
        }
    };

    const columns = [
        {
            key: 'product',
            label: 'Product',
            render: (row) => (
                <div>
                    <p className="font-medium text-gray-900">{row.product?.name || 'N/A'}</p>
                    <p className="text-sm text-gray-500">{row.product?.sku || 'N/A'}</p>
                </div>
            ),
        },
        {
            key: 'movementType',
            label: 'Type',
            render: (row) => (
                <div className="flex items-center space-x-2">
                    {getMovementIcon(row.movementType)}
                    <Badge variant={getMovementColor(row.movementType)}>
                        {row.movementType?.toUpperCase()}
                    </Badge>
                </div>
            ),
        },
        {
            key: 'quantity',
            label: 'Quantity',
            render: (row) => (
                <span className="font-medium">
                    {row.movementType === 'in' ? '+' : '-'}
                    {formatNumber(row.quantity)}
                </span>
            ),
        },
        {
            key: 'stockBefore',
            label: 'Stock Before',
            render: (row) => formatNumber(row.stockBefore || 0),
        },
        {
            key: 'stockAfter',
            label: 'Stock After',
            render: (row) => formatNumber(row.stockAfter || 0),
        },
        {
            key: 'reason',
            label: 'Reason',
            render: (row) => row.reason || 'N/A',
        },
        {
            key: 'createdAt',
            label: 'Date',
            render: (row) => formatDate(row.createdAt),
        },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
                <p className="text-gray-600 mt-1">Track stock movements and inventory levels</p>
            </div>

            {/* Summary Cards */}
            {summary && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Total Products</p>
                                <p className="text-2xl font-bold text-gray-900 mt-2">
                                    {formatNumber(summary.totalProducts || 0)}
                                </p>
                            </div>
                            <div className="bg-blue-500 p-3 rounded-lg">
                                <Package className="text-white" size={24} />
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Total Stock</p>
                                <p className="text-2xl font-bold text-gray-900 mt-2">
                                    {formatNumber(summary.totalStock || 0)}
                                </p>
                            </div>
                            <div className="bg-green-500 p-3 rounded-lg">
                                <TrendingUp className="text-white" size={24} />
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
                                <p className="text-2xl font-bold text-gray-900 mt-2">
                                    {formatNumber(summary.lowStockProducts || 0)}
                                </p>
                            </div>
                            <div className="bg-yellow-500 p-3 rounded-lg">
                                <AlertCircle className="text-white" size={24} />
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* Movements Table */}
            <Card title="Recent Stock Movements" noPadding>
                <Table columns={columns} data={movements} loading={loading} />
                <Pagination
                    currentPage={pagination.page}
                    totalPages={pagination.totalPages}
                    onPageChange={(page) => setPagination({ ...pagination, page })}
                    total={pagination.total}
                    pageSize={pagination.limit}
                />
            </Card>
        </div>
    );
};

export default InventoryList;

