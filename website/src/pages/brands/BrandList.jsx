import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, CheckCircle } from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Badge from '../../components/common/Badge';
import Table from '../../components/common/Table';
import Modal from '../../components/common/Modal';
import { brandsAPI } from '../../services/api';
import { formatDate, debounce } from '../../utils/helpers';
import toast from 'react-hot-toast';

const BrandList = () => {
    const [brands, setBrands] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [formModal, setFormModal] = useState({ isOpen: false, brand: null });
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, brand: null });
    const [formData, setFormData] = useState({
        name: '',
        description: '',
    });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        fetchBrands();
    }, []);

    useEffect(() => {
        if (formModal.brand) {
            setFormData({
                name: formModal.brand.name || '',
                description: formModal.brand.description || '',
            });
        } else {
            setFormData({ name: '', description: '' });
        }
    }, [formModal.brand]);

    const fetchBrands = async () => {
        try {
            setLoading(true);
            const response = await brandsAPI.getAll({ search });

            if (response.success) {
                setBrands(response.data);
            }
        } catch (error) {
            toast.error('Failed to load brands');
            console.error('Brands fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = debounce((value) => {
        setSearch(value);
        fetchBrands();
    }, 500);

    const handleSubmit = async () => {
        const newErrors = {};
        if (!formData.name) newErrors.name = 'Brand name is required';

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        try {
            let response;
            if (formModal.brand) {
                response = await brandsAPI.update(formModal.brand._id, formData);
            } else {
                response = await brandsAPI.create(formData);
            }

            if (response.success) {
                toast.success(`Brand ${formModal.brand ? 'updated' : 'created'} successfully`);
                setFormModal({ isOpen: false, brand: null });
                fetchBrands();
            }
        } catch (error) {
            toast.error(error.message || 'Failed to save brand');
        }
    };

    const handleDelete = async () => {
        if (!deleteModal.brand) return;

        try {
            const response = await brandsAPI.delete(deleteModal.brand._id);
            if (response.success) {
                toast.success('Brand deleted successfully');
                setDeleteModal({ isOpen: false, brand: null });
                fetchBrands();
            }
        } catch (error) {
            toast.error(error.message || 'Failed to delete brand');
        }
    };

    const handleVerify = async (id, e) => {
        e.stopPropagation();
        try {
            const response = await brandsAPI.verify(id);
            if (response.success) {
                toast.success('Brand verified successfully');
                fetchBrands();
            }
        } catch (error) {
            toast.error(error.message || 'Failed to verify brand');
        }
    };

    const columns = [
        {
            key: 'name',
            label: 'Brand Name',
            sortable: true,
            render: (row) => (
                <div>
                    <p className="font-medium text-gray-900">{row.name}</p>
                    {row.description && (
                        <p className="text-sm text-gray-500">{row.description}</p>
                    )}
                </div>
            ),
        },
        {
            key: 'productCount',
            label: 'Products',
            render: (row) => row.productCount || 0,
        },
        {
            key: 'isVerified',
            label: 'Status',
            render: (row) => (
                <Badge variant={row.isVerified ? 'success' : 'warning'}>
                    {row.isVerified ? 'Verified' : 'Unverified'}
                </Badge>
            ),
        },
        {
            key: 'createdAt',
            label: 'Created',
            render: (row) => formatDate(row.createdAt),
        },
        {
            key: 'actions',
            label: 'Actions',
            render: (row) => (
                <div className="flex items-center space-x-2">
                    {!row.isVerified && (
                        <button
                            onClick={(e) => handleVerify(row._id, e)}
                            className="p-1 text-green-600 hover:bg-green-50 rounded"
                            title="Verify"
                        >
                            <CheckCircle size={18} />
                        </button>
                    )}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setFormModal({ isOpen: true, brand: row });
                        }}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        title="Edit"
                    >
                        <Edit size={18} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setDeleteModal({ isOpen: true, brand: row });
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
                    <h1 className="text-2xl font-bold text-gray-900">Brand Management</h1>
                    <p className="text-gray-600 mt-1">Manage product brands</p>
                </div>
                <Button
                    variant="primary"
                    icon={<Plus size={18} />}
                    onClick={() => setFormModal({ isOpen: true, brand: null })}
                    className="mt-4 sm:mt-0"
                >
                    Add Brand
                </Button>
            </div>

            {/* Search */}
            <Card>
                <Input
                    placeholder="Search brands..."
                    icon={<Search size={18} />}
                    onChange={(e) => handleSearch(e.target.value)}
                />
            </Card>

            {/* Table */}
            <Card noPadding>
                <Table columns={columns} data={brands} loading={loading} />
            </Card>

            {/* Form Modal */}
            <Modal
                isOpen={formModal.isOpen}
                onClose={() => setFormModal({ isOpen: false, brand: null })}
                title={formModal.brand ? 'Edit Brand' : 'Add Brand'}
                footer={
                    <>
                        <Button
                            variant="secondary"
                            onClick={() => setFormModal({ isOpen: false, brand: null })}
                        >
                            Cancel
                        </Button>
                        <Button variant="primary" onClick={handleSubmit}>
                            {formModal.brand ? 'Update' : 'Create'}
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <Input
                        label="Brand Name"
                        name="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        error={errors.name}
                        required
                    />
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description
                        </label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={3}
                            className="input"
                        />
                    </div>
                </div>
            </Modal>

            {/* Delete Modal */}
            <Modal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, brand: null })}
                title="Delete Brand"
                footer={
                    <>
                        <Button
                            variant="secondary"
                            onClick={() => setDeleteModal({ isOpen: false, brand: null })}
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
                    Are you sure you want to delete <strong>{deleteModal.brand?.name}</strong>?
                </p>
            </Modal>
        </div>
    );
};

export default BrandList;

