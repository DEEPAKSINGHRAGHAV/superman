import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Edit, Trash2, Eye, Package } from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Badge from '../../components/common/Badge';
import Table from '../../components/common/Table';
import Pagination from '../../components/common/Pagination';
import Modal from '../../components/common/Modal';
import { productsAPI } from '../../services/api';
import { formatCurrency, formatDate, getStockStatus, debounce } from '../../utils/helpers';
import toast from 'react-hot-toast';

const ProductList = () => {
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [filters, setFilters] = useState({
        isActive: 'true',
        lowStock: '',
        category: '',
    });
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
    });
    const [sortConfig, setSortConfig] = useState({
        sortBy: 'createdAt',
        sortOrder: 'desc',
    });
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, product: null });

    useEffect(() => {
        fetchProducts();
    }, [pagination.page, pagination.limit, sortConfig, filters]);

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const response = await productsAPI.getAll({
                page: pagination.page,
                limit: pagination.limit,
                search,
                ...sortConfig,
                ...filters,
            });

            if (response.success) {
                setProducts(response.data);
                setPagination((prev) => ({
                    ...prev,
                    total: response.total,
                    totalPages: response.pagination.totalPages,
                }));
            }
        } catch (error) {
            toast.error('Failed to load products');
            console.error('Products fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = debounce((value) => {
        setSearch(value);
        setPagination((prev) => ({ ...prev, page: 1 }));
        // Trigger immediate fetch with new search value
        fetchProductsWithSearch(value);
    }, 300);

    const fetchProductsWithSearch = async (searchValue) => {
        try {
            setLoading(true);
            const response = await productsAPI.getAll({
                page: 1, // Reset to first page for search
                limit: pagination.limit,
                search: searchValue,
                ...sortConfig,
                ...filters,
            });

            if (response.success) {
                setProducts(response.data);
                setPagination((prev) => ({
                    ...prev,
                    total: response.total,
                    totalPages: response.pagination.totalPages,
                }));
            }
        } catch (error) {
            toast.error('Failed to load products');
            console.error('Products fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSort = (column, order) => {
        setSortConfig({ sortBy: column, sortOrder: order });
    };

    const handleDelete = async () => {
        if (!deleteModal.product) return;

        try {
            const response = await productsAPI.delete(deleteModal.product._id);
            if (response.success) {
                toast.success('Product deleted successfully');
                setDeleteModal({ isOpen: false, product: null });
                fetchProducts();
            }
        } catch (error) {
            toast.error(error.message || 'Failed to delete product');
        }
    };

    const columns = [
        {
            key: 'name',
            label: 'Product',
            sortable: true,
            render: (row) => (
                <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 bg-gray-100 rounded flex items-center justify-center">
                        <Package size={20} className="text-gray-600" />
                    </div>
                    <div className="ml-3">
                        <p className="font-medium text-gray-900">{row.name}</p>
                        <p className="text-sm text-gray-500">{row.sku}</p>
                    </div>
                </div>
            ),
        },
        {
            key: 'category',
            label: 'Category',
            sortable: true,
            render: (row) => row.category || 'N/A',
        },
        {
            key: 'brand',
            label: 'Brand',
            sortable: true,
            render: (row) => row.brand || 'N/A',
        },
        {
            key: 'currentStock',
            label: 'Stock',
            sortable: true,
            render: (row) => {
                const status = getStockStatus(row.currentStock, row.minStockLevel);
                return (
                    <div>
                        <p className="font-medium">{row.currentStock}</p>
                        <Badge variant={status.color} size="sm">
                            {status.status}
                        </Badge>
                    </div>
                );
            },
        },
        {
            key: 'sellingPrice',
            label: 'Price',
            sortable: true,
            render: (row) => (
                <div>
                    <p className="font-medium">{formatCurrency(row.sellingPrice)}</p>
                    <p className="text-xs text-gray-500">MRP: {formatCurrency(row.mrp)}</p>
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
            key: 'actions',
            label: 'Actions',
            sortable: false,
            render: (row) => (
                <div className="flex items-center space-x-2">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/products/${row._id}`);
                        }}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        title="View"
                    >
                        <Eye size={18} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/products/${row._id}/edit`);
                        }}
                        className="p-1 text-green-600 hover:bg-green-50 rounded"
                        title="Edit"
                    >
                        <Edit size={18} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setDeleteModal({ isOpen: true, product: row });
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
                    <h1 className="text-2xl font-bold text-gray-900">Products</h1>
                    <p className="text-gray-600 mt-1">Manage your product inventory</p>
                </div>
                <Button
                    variant="primary"
                    icon={<Plus size={18} />}
                    onClick={() => navigate('/products/new')}
                    className="mt-4 sm:mt-0"
                >
                    Add Product
                </Button>
            </div>

            {/* Filters */}
            <Card>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Input
                        placeholder="Search products..."
                        icon={<Search size={18} />}
                        onChange={(e) => handleSearch(e.target.value)}
                    />
                    <select
                        value={filters.isActive}
                        onChange={(e) => setFilters({ ...filters, isActive: e.target.value })}
                        className="input"
                    >
                        <option value="">All Status</option>
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                    </select>
                    <select
                        value={filters.lowStock}
                        onChange={(e) => setFilters({ ...filters, lowStock: e.target.value })}
                        className="input"
                    >
                        <option value="">All Stock Levels</option>
                        <option value="true">Low Stock Only</option>
                    </select>
                    <Button variant="outline" icon={<Filter size={18} />} onClick={fetchProducts}>
                        Apply Filters
                    </Button>
                </div>
            </Card>

            {/* Table */}
            <Card noPadding>
                <Table
                    columns={columns}
                    data={products}
                    loading={loading}
                    onSort={handleSort}
                    sortColumn={sortConfig.sortBy}
                    sortOrder={sortConfig.sortOrder}
                    onRowClick={(row) => navigate(`/products/${row._id}`)}
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
                onClose={() => setDeleteModal({ isOpen: false, product: null })}
                title="Delete Product"
                footer={
                    <>
                        <Button
                            variant="secondary"
                            onClick={() => setDeleteModal({ isOpen: false, product: null })}
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
                    Are you sure you want to delete <strong>{deleteModal.product?.name}</strong>? This action
                    will deactivate the product.
                </p>
            </Modal>
        </div>
    );
};

export default ProductList;

