import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Badge from '../../components/common/Badge';
import Table from '../../components/common/Table';
import Pagination from '../../components/common/Pagination';
import Modal from '../../components/common/Modal';
import { usersAPI } from '../../services/api';
import { formatDate, getInitials, debounce } from '../../utils/helpers';
import toast from 'react-hot-toast';

const UserList = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
    });
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, user: null });

    useEffect(() => {
        fetchUsers();
    }, [pagination.page, pagination.limit]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await usersAPI.getAll({
                page: pagination.page,
                limit: pagination.limit,
                search,
            });

            if (response.success) {
                setUsers(response.data);
                setPagination((prev) => ({
                    ...prev,
                    total: response.total,
                    totalPages: response.pagination.totalPages,
                }));
            }
        } catch (error) {
            toast.error('Failed to load users');
            console.error('Users fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = debounce((value) => {
        setSearch(value);
        setPagination((prev) => ({ ...prev, page: 1 }));
        fetchUsers();
    }, 500);

    const handleToggleStatus = async (id, isActive, e) => {
        e.stopPropagation();
        try {
            const response = isActive
                ? await usersAPI.deactivate(id)
                : await usersAPI.activate(id);

            if (response.success) {
                toast.success(`User ${isActive ? 'deactivated' : 'activated'} successfully`);
                fetchUsers();
            }
        } catch (error) {
            toast.error(error.message || 'Failed to update user status');
        }
    };

    const handleDelete = async () => {
        if (!deleteModal.user) return;

        try {
            const response = await usersAPI.delete(deleteModal.user._id);
            if (response.success) {
                toast.success('User deleted successfully');
                setDeleteModal({ isOpen: false, user: null });
                fetchUsers();
            }
        } catch (error) {
            toast.error(error.message || 'Failed to delete user');
        }
    };

    const getRoleColor = (role) => {
        const colors = {
            admin: 'danger',
            manager: 'warning',
            employee: 'info',
            viewer: 'gray',
        };
        return colors[role] || 'gray';
    };

    const columns = [
        {
            key: 'name',
            label: 'User',
            sortable: true,
            render: (row) => (
                <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-semibold">
                        {getInitials(row.name)}
                    </div>
                    <div className="ml-3">
                        <p className="font-medium text-gray-900">{row.name}</p>
                        <p className="text-sm text-gray-500">{row.email}</p>
                    </div>
                </div>
            ),
        },
        {
            key: 'phone',
            label: 'Phone',
            render: (row) => row.phone || 'N/A',
        },
        {
            key: 'role',
            label: 'Role',
            render: (row) => (
                <Badge variant={getRoleColor(row.role)}>
                    {row.role?.toUpperCase()}
                </Badge>
            ),
        },
        {
            key: 'lastLogin',
            label: 'Last Login',
            render: (row) => row.lastLogin ? formatDate(row.lastLogin) : 'Never',
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
            key: 'actions',
            label: 'Actions',
            render: (row) => (
                <div className="flex items-center space-x-2">
                    <button
                        onClick={(e) => handleToggleStatus(row._id, row.isActive, e)}
                        className={`p-1 rounded ${row.isActive
                                ? 'text-red-600 hover:bg-red-50'
                                : 'text-green-600 hover:bg-green-50'
                            }`}
                        title={row.isActive ? 'Deactivate' : 'Activate'}
                    >
                        {row.isActive ? <XCircle size={18} /> : <CheckCircle size={18} />}
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            // Navigate to edit page
                        }}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        title="Edit"
                    >
                        <Edit size={18} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setDeleteModal({ isOpen: true, user: row });
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
                    <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
                    <p className="text-gray-600 mt-1">Manage system users and permissions</p>
                </div>
                <Button
                    variant="primary"
                    icon={<Plus size={18} />}
                    onClick={() => {/* Navigate to create page */ }}
                    className="mt-4 sm:mt-0"
                >
                    Add User
                </Button>
            </div>

            {/* Search */}
            <Card>
                <Input
                    placeholder="Search users by name or email..."
                    icon={<Search size={18} />}
                    onChange={(e) => handleSearch(e.target.value)}
                />
            </Card>

            {/* Table */}
            <Card noPadding>
                <Table columns={columns} data={users} loading={loading} />
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
                onClose={() => setDeleteModal({ isOpen: false, user: null })}
                title="Delete User"
                footer={
                    <>
                        <Button
                            variant="secondary"
                            onClick={() => setDeleteModal({ isOpen: false, user: null })}
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
                    Are you sure you want to delete <strong>{deleteModal.user?.name}</strong>?
                </p>
            </Modal>
        </div>
    );
};

export default UserList;

