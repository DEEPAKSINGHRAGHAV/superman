import React, { useState, useEffect } from 'react';
import { Search, AlertTriangle } from 'lucide-react';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Badge from '../../components/common/Badge';
import Table from '../../components/common/Table';
import Pagination from '../../components/common/Pagination';
import { batchesAPI } from '../../services/api';
import { formatDate, formatNumber, getDaysUntilExpiry, getExpiryStatus, debounce } from '../../utils/helpers';
import toast from 'react-hot-toast';

const BatchList = () => {
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
    });

    useEffect(() => {
        fetchBatches();
    }, [pagination.page, pagination.limit]);

    const fetchBatches = async () => {
        try {
            setLoading(true);
            const response = await batchesAPI.getAll({
                page: pagination.page,
                limit: pagination.limit,
                search,
            });

            if (response.success) {
                setBatches(response.data);
                setPagination((prev) => ({
                    ...prev,
                    total: response.total,
                    totalPages: response.pagination.totalPages,
                }));
            }
        } catch (error) {
            toast.error('Failed to load batches');
            console.error('Batches fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = debounce((value) => {
        setSearch(value);
        setPagination((prev) => ({ ...prev, page: 1 }));
        fetchBatches();
    }, 500);

    const columns = [
        {
            key: 'batchNumber',
            label: 'Batch Number',
            sortable: true,
            render: (row) => (
                <div>
                    <p className="font-medium text-gray-900">{row.batchNumber}</p>
                    <p className="text-xs text-gray-500">{row.product?.name || 'N/A'}</p>
                </div>
            ),
        },
        {
            key: 'product',
            label: 'Product',
            render: (row) => (
                <div>
                    <p className="text-gray-900">{row.product?.name || 'N/A'}</p>
                    <p className="text-xs text-gray-500">{row.product?.sku || 'N/A'}</p>
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
            key: 'manufacturingDate',
            label: 'Mfg Date',
            render: (row) => formatDate(row.manufacturingDate),
        },
        {
            key: 'expiryDate',
            label: 'Expiry Date',
            render: (row) => {
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
                const expiryStatus = getExpiryStatus(row.expiryDate);
                return <Badge variant={expiryStatus.color}>{expiryStatus.status}</Badge>;
            },
        },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Batch Tracking</h1>
                <p className="text-gray-600 mt-1">Monitor batch inventory and expiry dates</p>
            </div>

            {/* Alert */}
            <Card className="bg-yellow-50 border-yellow-200">
                <div className="flex items-start">
                    <AlertTriangle className="text-yellow-600 mt-0.5" size={20} />
                    <div className="ml-3">
                        <h3 className="text-sm font-medium text-yellow-800">Expiry Monitoring Active</h3>
                        <p className="text-sm text-yellow-700 mt-1">
                            Batches expiring within 30 days are highlighted. Review and take action accordingly.
                        </p>
                    </div>
                </div>
            </Card>

            {/* Search */}
            <Card>
                <Input
                    placeholder="Search batches by batch number or product..."
                    icon={<Search size={18} />}
                    onChange={(e) => handleSearch(e.target.value)}
                />
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
        </div>
    );
};

export default BatchList;

