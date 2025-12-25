import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Eye, Phone, Mail, MapPin } from 'lucide-react';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Badge from '../../components/common/Badge';
import Table from '../../components/common/Table';
import Pagination from '../../components/common/Pagination';
import { customersAPI } from '../../services/api';
import { formatDate, debounce } from '../../utils/helpers';
import toast from 'react-hot-toast';

const CustomerList = () => {
    const navigate = useNavigate();
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
    });

    useEffect(() => {
        let isMounted = true;
        
        const fetchData = async () => {
            try {
                setLoading(true);
                const response = await customersAPI.getAll({
                    page: pagination.page,
                    limit: pagination.limit,
                    search,
                });

                if (isMounted && response.success) {
                    setCustomers(response.data);
                    setPagination((prev) => ({
                        ...prev,
                        total: response.total,
                        totalPages: response.pagination.totalPages,
                    }));
                }
            } catch (error) {
                if (isMounted) {
                    toast.error('Failed to load customers');
                    console.error('Customers fetch error:', error);
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };
        
        fetchData();
        
        // Cleanup: Prevent state updates after unmount
        return () => {
            isMounted = false;
        };
    }, [pagination.page, pagination.limit, search]);


    const handleSearch = debounce((value) => {
        setSearch(value);
        setPagination((prev) => ({ ...prev, page: 1 }));
    }, 500);

    const columns = [
        {
            key: 'name',
            label: 'Customer',
            sortable: true,
            render: (row) => (
                <div>
                    <p className="font-medium text-gray-900">
                        {row.name || 'Walk-in Customer'}
                    </p>
                    <p className="text-sm text-gray-500">{row.customerNumber}</p>
                </div>
            ),
        },
        {
            key: 'contact',
            label: 'Contact',
            sortable: false,
            render: (row) => (
                <div className="space-y-1">
                    {row.phone && (
                        <div className="flex items-center text-sm text-gray-600">
                            <Phone size={14} className="mr-1" />
                            {row.phone}
                        </div>
                    )}
                    {row.email && (
                        <div className="flex items-center text-sm text-gray-600">
                            <Mail size={14} className="mr-1" />
                            {row.email}
                        </div>
                    )}
                    {!row.phone && !row.email && (
                        <span className="text-sm text-gray-400">No contact info</span>
                    )}
                </div>
            ),
        },
        {
            key: 'address',
            label: 'Address',
            sortable: false,
            render: (row) => (
                <div className="text-sm text-gray-600">
                    {row.address?.city && row.address?.state
                        ? `${row.address.city}, ${row.address.state}`
                        : 'N/A'}
                </div>
            ),
        },
        {
            key: 'isActive',
            label: 'Status',
            sortable: false,
            render: (row) => (
                <Badge variant={row.isActive ? 'success' : 'gray'}>
                    {row.isActive ? 'Active' : 'Inactive'}
                </Badge>
            ),
        },
        {
            key: 'createdAt',
            label: 'Created',
            sortable: false,
            render: (row) => formatDate(row.createdAt),
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
                            navigate(`/customers/${row._id}`);
                        }}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        title="View Details"
                    >
                        <Eye size={18} />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
                    <p className="text-gray-600 mt-1">View and manage customer information</p>
                </div>
            </div>

            {/* Search */}
            <Card>
                <Input
                    placeholder="Search customers by name, phone, or customer number..."
                    icon={<Search size={18} />}
                    onChange={(e) => handleSearch(e.target.value)}
                />
            </Card>

            {/* Table */}
            <Card noPadding>
                <Table
                    columns={columns}
                    data={customers}
                    loading={loading}
                    onRowClick={(row) => navigate(`/customers/${row._id}`)}
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

export default CustomerList;



