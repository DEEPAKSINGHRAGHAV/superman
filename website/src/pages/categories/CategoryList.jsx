import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Folder } from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Badge from '../../components/common/Badge';
import Table from '../../components/common/Table';
import Modal from '../../components/common/Modal';
import { categoriesAPI } from '../../services/api';
import { formatDate, debounce } from '../../utils/helpers';
import toast from 'react-hot-toast';

const CategoryList = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [formModal, setFormModal] = useState({ isOpen: false, category: null });
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, category: null });
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        parentCategory: '',
    });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        fetchCategories();
    }, []);

    useEffect(() => {
        if (formModal.category) {
            // Handle parentCategory - it might be an object (populated) or an ID
            let parentCategoryId = '';
            if (formModal.category.parentCategory) {
                if (typeof formModal.category.parentCategory === 'object' && formModal.category.parentCategory !== null) {
                    parentCategoryId = formModal.category.parentCategory._id || '';
                } else {
                    parentCategoryId = formModal.category.parentCategory;
                }
            }

            setFormData({
                name: formModal.category.name || '',
                description: formModal.category.description || '',
                parentCategory: parentCategoryId,
            });
        } else {
            setFormData({ name: '', description: '', parentCategory: '' });
        }
    }, [formModal.category]);

    const fetchCategories = async () => {
        try {
            setLoading(true);
            // Fetch all categories (no pagination limit) to show complete list
            const response = await categoriesAPI.getAll({
                search,
                limit: 1000,  // Fetch all categories, not just first 10
                isActive: 'all'  // Show all categories (active and inactive) for management
            });

            if (response && response.success) {
                setCategories(response.data || []);
            } else {
                setCategories([]);
            }
        } catch (error) {
            toast.error('Failed to load categories');
            console.error('Categories fetch error:', error);
            setCategories([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = debounce((value) => {
        setSearch(value);
        fetchCategories();
    }, 500);

    const handleSubmit = async () => {
        const newErrors = {};
        if (!formData.name) newErrors.name = 'Category name is required';

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        try {
            // Prepare form data - convert empty parentCategory to null
            const submitData = {
                ...formData,
                parentCategory: formData.parentCategory || null
            };

            let response;
            if (formModal.category) {
                response = await categoriesAPI.update(formModal.category._id, submitData);
            } else {
                response = await categoriesAPI.create(submitData);
            }

            if (response.success) {
                toast.success(`Category ${formModal.category ? 'updated' : 'created'} successfully`);
                setFormModal({ isOpen: false, category: null });
                fetchCategories();
            }
        } catch (error) {
            toast.error(error.message || 'Failed to save category');
        }
    };

    const handleDelete = async () => {
        if (!deleteModal.category) return;

        try {
            const response = await categoriesAPI.delete(deleteModal.category._id);
            if (response.success) {
                toast.success('Category deleted successfully');
                setDeleteModal({ isOpen: false, category: null });
                fetchCategories();
            }
        } catch (error) {
            toast.error(error.message || 'Failed to delete category');
        }
    };

    const parentCategories = Array.isArray(categories)
        ? categories.filter((cat) => cat && !cat.parentCategory)
        : [];

    const columns = [
        {
            key: 'name',
            label: 'Category',
            sortable: true,
            render: (row) => (
                <div className="flex items-center">
                    <Folder className="mr-2 text-primary-600" size={20} />
                    <div>
                        <p className="font-medium text-gray-900">{row.name}</p>
                        {row.description && (
                            <p className="text-sm text-gray-500">{row.description}</p>
                        )}
                    </div>
                </div>
            ),
        },
        {
            key: 'parentCategory',
            label: 'Parent',
            render: (row) => {
                if (!row.parentCategory) return '-';
                // Handle populated parentCategory object
                if (typeof row.parentCategory === 'object') {
                    return row.parentCategory.name || '-';
                }
                // Handle parentCategory as ID string
                return row.parentCategory;
            },
        },
        {
            key: 'productCount',
            label: 'Products',
            render: (row) => (
                <Badge variant="info">{row.productCount || 0}</Badge>
            ),
        },
        {
            key: 'isActive',
            label: 'Status',
            render: (row) => (
                <Badge variant={row.isActive ? 'success' : 'gray'}>
                    {row.isActive ? 'Active' : 'Inactive'}
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
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setFormModal({ isOpen: true, category: row });
                        }}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        title="Edit"
                    >
                        <Edit size={18} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setDeleteModal({ isOpen: true, category: row });
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
                    <h1 className="text-2xl font-bold text-gray-900">Category Management</h1>
                    <p className="text-gray-600 mt-1">Organize products into categories</p>
                </div>
                <Button
                    variant="primary"
                    icon={<Plus size={18} />}
                    onClick={() => setFormModal({ isOpen: true, category: null })}
                    className="mt-4 sm:mt-0"
                >
                    Add Category
                </Button>
            </div>

            {/* Search */}
            <Card>
                <Input
                    placeholder="Search categories..."
                    icon={<Search size={18} />}
                    onChange={(e) => handleSearch(e.target.value)}
                />
            </Card>

            {/* Table */}
            <Card noPadding>
                <Table columns={columns} data={categories} loading={loading} />
            </Card>

            {/* Form Modal */}
            <Modal
                isOpen={formModal.isOpen}
                onClose={() => setFormModal({ isOpen: false, category: null })}
                title={formModal.category ? 'Edit Category' : 'Add Category'}
                footer={
                    <>
                        <Button
                            variant="secondary"
                            onClick={() => setFormModal({ isOpen: false, category: null })}
                        >
                            Cancel
                        </Button>
                        <Button variant="primary" onClick={handleSubmit}>
                            {formModal.category ? 'Update' : 'Create'}
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <Input
                        label="Category Name"
                        name="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        error={errors.name}
                        required
                    />
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Parent Category
                        </label>
                        <select
                            name="parentCategory"
                            value={formData.parentCategory}
                            onChange={(e) => setFormData({ ...formData, parentCategory: e.target.value })}
                            className="input"
                        >
                            <option value="">None (Top Level)</option>
                            {parentCategories.map((cat) => (
                                <option key={cat._id} value={cat._id}>
                                    {cat.name}
                                </option>
                            ))}
                        </select>
                    </div>
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
                onClose={() => setDeleteModal({ isOpen: false, category: null })}
                title="Delete Category"
                footer={
                    <>
                        <Button
                            variant="secondary"
                            onClick={() => setDeleteModal({ isOpen: false, category: null })}
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
                    Are you sure you want to delete <strong>{deleteModal.category?.name}</strong>?
                </p>
            </Modal>
        </div>
    );
};

export default CategoryList;

