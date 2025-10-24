import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, Eye, Mail, Phone } from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Badge from '../../components/common/Badge';
import Table from '../../components/common/Table';
import Pagination from '../../components/common/Pagination';
import Modal from '../../components/common/Modal';
import { suppliersAPI } from '../../services/api';
import { formatDate, debounce } from '../../utils/helpers';
import toast from 'react-hot-toast';

const SupplierList = () => {
    const navigate = useNavigate();
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
    });
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, supplier: null });

    useEffect(() => {
        fetchSuppliers();
    }, [pagination.page, pagination.limit]);

    const fetchSuppliers = async () => {
        try {
            setLoading(true);
            const response = await suppliersAPI.getAll({
                page: pagination.page,
                limit: pagination.limit,
                search,
            });

            if (response.success) {
                setSuppliers(response.data);
                setPagination((prev) => ({
                    ...prev,
                    total: response.total,
                    totalPages: response.pagination.totalPages,
                }));
            }
        } catch (error) {
            toast.error('Failed to load suppliers');
            console.error('Suppliers fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = debounce((value) => {
        setSearch(value);
        setPagination((prev) => ({ ...prev, page: 1 }));
        fetchSuppliers();
    }, 500);

    const handleDelete = async () => {
        if (!deleteModal.supplier) return;

        try {
            const response = await suppliersAPI.delete(deleteModal.supplier._id);
            if (response.success) {
                toast.success('Supplier deleted successfully');
                setDeleteModal({ isOpen: false, supplier: null });
                fetchSuppliers();
            }
        } catch (error) {
            toast.error(error.message || 'Failed to delete supplier');
        }
    };

    const columns = [
        {
            key: 'name',
            label: 'Supplier',
            sortable: true,
            render: (row) => (
                <div>
                    <p className="font-medium text-gray-900">{row.name}</p>
                    <p className="text-sm text-gray-500">{row.supplierCode}</p>
                </div>
            ),
        },
        {
            key: 'contact',
            label: 'Contact',
            sortable: false,
            render: (row) => (
                <div className="space-y-1">
                    <div className="flex items-center text-sm text-gray-600">
                        <Mail size={14} className="mr-1" />
                        {row.contactPerson?.email || 'N/A'}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                        <Phone size={14} className="mr-1" />
                        {row.contactPerson?.phone || 'N/A'}
                    </div>
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
            key: 'gstNumber',
            label: 'GST Number',
            sortable: false,
            render: (row) => row.gstNumber || 'N/A',
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
            key: 'actions',
            label: 'Actions',
            sortable: false,
            render: (row) => (
                <div className="flex items-center space-x-2">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/suppliers/${row._id}`);
                        }}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        title="View"
                    >
                        <Eye size={18} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/suppliers/${row._id}/edit`);
                        }}
                        className="p-1 text-green-600 hover:bg-green-50 rounded"
                        title="Edit"
                    >
                        <Edit size={18} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setDeleteModal({ isOpen: true, supplier: row });
                        }}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                        title="Delete"
                    >
                        <Trash2 size={18} />
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
                    <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
                    <p className="text-gray-600 mt-1">Manage your supplier information</p>
                </div>
                <Button
                    variant="primary"
                    icon={<Plus size={18} />}
                    onClick={() => navigate('/suppliers/new')}
                    className="mt-4 sm:mt-0"
                >
                    Add Supplier
                </Button>
            </div>

            {/* Search */}
            <Card>
                <Input
                    placeholder="Search suppliers..."
                    icon={<Search size={18} />}
                    onChange={(e) => handleSearch(e.target.value)}
                />
            </Card>

            {/* Table */}
            <Card noPadding>
                <Table
                    columns={columns}
                    data={suppliers}
                    loading={loading}
                    onRowClick={(row) => navigate(`/suppliers/${row._id}`)}
                />
                <Pagination
                    currentPage={pagination.page}
                    totalPages={pagination.totalPages}
                    onPageChange={(page) => setPagination({ ...pagination, page })}
                    total={pagination.total}
                    pageSize={pagination.limit}
                />
            </Card>

            {/* Delete Modal */}
            <Modal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, supplier: null })}
                title="Delete Supplier"
                footer={
                    <>
                        <Button
                            variant="secondary"
                            onClick={() => setDeleteModal({ isOpen: false, supplier: null })}
                        >
                            Cancel
                        </Button>
                        <Button variant="danger" onClick={handleDelete}>
                            Delete
                        </Button>
                    </>
                }
            >
                <p className="text-gray-600">
                    Are you sure you want to delete <strong>{deleteModal.supplier?.name}</strong>?
                </p>
            </Modal>
        </div>
    );
};

export default SupplierList;

