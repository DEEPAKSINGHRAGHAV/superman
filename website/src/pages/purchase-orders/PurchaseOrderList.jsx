import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Eye, CheckCircle, XCircle } from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Badge from '../../components/common/Badge';
import Table from '../../components/common/Table';
import Pagination from '../../components/common/Pagination';
import { purchaseOrdersAPI } from '../../services/api';
import { formatCurrency, formatDate, debounce } from '../../utils/helpers';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const PurchaseOrderList = () => {
    const navigate = useNavigate();
    const { hasPermission } = useAuth();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [filters, setFilters] = useState({
        status: '',
    });
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
    });

    useEffect(() => {
        fetchOrders();
    }, [pagination.page, pagination.limit, filters]);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const response = await purchaseOrdersAPI.getAll({
                page: pagination.page,
                limit: pagination.limit,
                search,
                ...filters,
            });

            if (response.success) {
                setOrders(response.data);
                setPagination((prev) => ({
                    ...prev,
                    total: response.total,
                    totalPages: response.pagination.totalPages,
                }));
            }
        } catch (error) {
            toast.error('Failed to load purchase orders');
            console.error('Purchase orders fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = debounce((value) => {
        setSearch(value);
        setPagination((prev) => ({ ...prev, page: 1 }));
        fetchOrders();
    }, 500);

    const handleApprove = async (id, e) => {
        e.stopPropagation();
        try {
            const response = await purchaseOrdersAPI.approve(id);
            if (response.success) {
                toast.success('Purchase order approved');
                fetchOrders();
            }
        } catch (error) {
            toast.error(error.message || 'Failed to approve purchase order');
        }
    };

    const handleCancel = async (id, e) => {
        e.stopPropagation();
        try {
            const response = await purchaseOrdersAPI.cancel(id, 'Cancelled by user');
            if (response.success) {
                toast.success('Purchase order cancelled');
                fetchOrders();
            }
        } catch (error) {
            toast.error(error.message || 'Failed to cancel purchase order');
        }
    };

    const getStatusVariant = (status) => {
        const variants = {
            pending: 'warning',
            approved: 'info',
            ordered: 'info',
            received: 'success',
            cancelled: 'danger',
        };
        return variants[status] || 'gray';
    };

    const columns = [
        {
            key: 'orderNumber',
            label: 'PO Number',
            sortable: true,
            render: (row) => (
                <div>
                    <p className="font-medium text-gray-900">{row.orderNumber}</p>
                    <p className="text-xs text-gray-500">{formatDate(row.orderDate)}</p>
                </div>
            ),
        },
        {
            key: 'supplier',
            label: 'Supplier',
            sortable: false,
            render: (row) => row.supplier?.name || 'N/A',
        },
        {
            key: 'items',
            label: 'Items',
            sortable: false,
            render: (row) => `${row.items?.length || 0} items`,
        },
        {
            key: 'totalAmount',
            label: 'Total Amount',
            sortable: true,
            render: (row) => (
                <div>
                    <p className="font-medium">{formatCurrency(row.totalAmount)}</p>
                    {row.taxAmount > 0 && (
                        <p className="text-xs text-gray-500">GST: {formatCurrency(row.taxAmount)}</p>
                    )}
                </div>
            ),
        },
        {
            key: 'status',
            label: 'Status',
            sortable: false,
            render: (row) => (
                <Badge variant={getStatusVariant(row.status)}>
                    {row.status?.toUpperCase()}
                </Badge>
            ),
        },
        {
            key: 'actions',
            label: 'Actions',
            sortable: false,
            render: (row) => (
                <div className="flex items-center space-x-2">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/purchase-orders/${row._id}`);
                        }}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        title="View"
                    >
                        <Eye size={18} />
                    </button>
                    {row.status === 'pending' && hasPermission('approve_purchase_orders') && (
                        <button
                            onClick={(e) => handleApprove(row._id, e)}
                            className="p-1 text-green-600 hover:bg-green-50 rounded"
                            title="Approve"
                        >
                            <CheckCircle size={18} />
                        </button>
                    )}
                    {row.status === 'pending' && (
                        <button
                            onClick={(e) => handleCancel(row._id, e)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="Cancel"
                        >
                            <XCircle size={18} />
                        </button>
                    )}
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
                    <p className="text-gray-600 mt-1">Manage purchase orders and inventory receipts</p>
                </div>
                {hasPermission('write_purchase_orders') && (
                    <Button
                        variant="primary"
                        icon={<Plus size={18} />}
                        onClick={() => navigate('/purchase-orders/new')}
                        className="mt-4 sm:mt-0"
                    >
                        Create PO
                    </Button>
                )}
            </div>

            {/* Filters */}
            <Card>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input
                        placeholder="Search purchase orders..."
                        icon={<Search size={18} />}
                        onChange={(e) => handleSearch(e.target.value)}
                    />
                    <select
                        value={filters.status}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                        className="input"
                    >
                        <option value="">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="ordered">Ordered</option>
                        <option value="received">Received</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                </div>
            </Card>

            {/* Table */}
            <Card noPadding>
                <Table
                    columns={columns}
                    data={orders}
                    loading={loading}
                    onRowClick={(row) => navigate(`/purchase-orders/${row._id}`)}
                />
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

export default PurchaseOrderList;

