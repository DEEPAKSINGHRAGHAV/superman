import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Edit, Trash2, ArrowLeft, Building, Phone, Mail, MapPin, TrendingUp, Package } from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Loading from '../../components/common/Loading';
import Modal from '../../components/common/Modal';
import { suppliersAPI } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/helpers';
import toast from 'react-hot-toast';

const SupplierDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [supplier, setSupplier] = useState(null);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [deleteModal, setDeleteModal] = useState(false);

    useEffect(() => {
        if (id) {
            fetchSupplier();
            fetchStats();
        }
    }, [id]);

    const fetchSupplier = async () => {
        try {
            setLoading(true);
            const response = await suppliersAPI.getById(id);
            if (response.success) {
                setSupplier(response.data);
            }
        } catch (error) {
            toast.error('Failed to load supplier details');
            console.error('Supplier fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await suppliersAPI.getStats(id);
            if (response.success) {
                setStats(response.data);
            }
        } catch (error) {
            console.error('Stats fetch error:', error);
        }
    };

    const handleDelete = async () => {
        try {
            const response = await suppliersAPI.delete(id);
            if (response.success) {
                toast.success('Supplier deleted successfully');
                navigate('/suppliers');
            }
        } catch (error) {
            toast.error(error.message || 'Failed to delete supplier');
        }
    };

    if (loading) {
        return <Loading text="Loading supplier..." />;
    }

    if (!supplier) {
        return (
            <div className="flex flex-col items-center justify-center py-12">
                <Building size={64} className="text-gray-400 mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Supplier Not Found</h2>
                <p className="text-gray-600 mb-4">The supplier you're looking for doesn't exist.</p>
                <Button onClick={() => navigate('/suppliers')}>Back to Suppliers</Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <button
                        onClick={() => navigate('/suppliers')}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{supplier.name}</h1>
                        <p className="text-gray-600 mt-1">Supplier ID: {supplier.supplierCode || supplier._id}</p>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <Button
                        variant="secondary"
                        icon={<Edit size={18} />}
                        onClick={() => navigate(`/suppliers/${id}/edit`)}
                    >
                        Edit
                    </Button>
                    <Button
                        variant="danger"
                        icon={<Trash2 size={18} />}
                        onClick={() => setDeleteModal(true)}
                    >
                        Delete
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Total Orders</p>
                                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalOrders || 0}</p>
                            </div>
                            <div className="p-3 bg-blue-100 rounded-lg">
                                <Package size={24} className="text-blue-600" />
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Total Amount</p>
                                <p className="text-2xl font-bold text-gray-900 mt-1">
                                    {formatCurrency(stats.totalAmount || 0)}
                                </p>
                            </div>
                            <div className="p-3 bg-green-100 rounded-lg">
                                <TrendingUp size={24} className="text-green-600" />
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Active Products</p>
                                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.activeProducts || 0}</p>
                            </div>
                            <div className="p-3 bg-purple-100 rounded-lg">
                                <Package size={24} className="text-purple-600" />
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* Supplier Information Card */}
            <Card>
                <div className="space-y-4">
                    <div className="flex items-center space-x-2 text-lg font-semibold">
                        <Building size={20} />
                        <span>Supplier Information</span>
                    </div>

                    {supplier.contactPerson && (
                        <div className="flex items-center justify-between py-2 border-b">
                            <span className="text-gray-600">Contact Person</span>
                            <span className="font-medium">{supplier.contactPerson}</span>
                        </div>
                    )}

                    {supplier.email && (
                        <div className="flex items-center justify-between py-2 border-b">
                            <span className="text-gray-600 flex items-center space-x-2">
                                <Mail size={16} />
                                <span>Email</span>
                            </span>
                            <a href={`mailto:${supplier.email}`} className="font-medium text-blue-600 hover:underline">
                                {supplier.email}
                            </a>
                        </div>
                    )}

                    {supplier.phone && (
                        <div className="flex items-center justify-between py-2 border-b">
                            <span className="text-gray-600 flex items-center space-x-2">
                                <Phone size={16} />
                                <span>Phone</span>
                            </span>
                            <a href={`tel:${supplier.phone}`} className="font-medium text-blue-600 hover:underline">
                                {supplier.phone}
                            </a>
                        </div>
                    )}

                    {supplier.address && (
                        <div className="py-2 border-b">
                            <div className="flex items-center space-x-2 text-gray-600 mb-2">
                                <MapPin size={16} />
                                <span>Address</span>
                            </div>
                            <p className="text-gray-900 ml-6">{supplier.address}</p>
                        </div>
                    )}

                    {supplier.gst && (
                        <div className="flex items-center justify-between py-2 border-b">
                            <span className="text-gray-600">GST Number</span>
                            <span className="font-mono font-medium">{supplier.gst}</span>
                        </div>
                    )}

                    {supplier.pan && (
                        <div className="flex items-center justify-between py-2 border-b">
                            <span className="text-gray-600">PAN Number</span>
                            <span className="font-mono font-medium">{supplier.pan}</span>
                        </div>
                    )}

                    <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-gray-600">Status</span>
                        <Badge variant={supplier.isActive ? 'success' : 'gray'}>
                            {supplier.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                    </div>

                    {supplier.paymentTerms && (
                        <div className="flex items-center justify-between py-2 border-b">
                            <span className="text-gray-600">Payment Terms</span>
                            <span className="font-medium">{supplier.paymentTerms}</span>
                        </div>
                    )}

                    {supplier.notes && (
                        <div className="pt-4 border-t">
                            <span className="text-gray-600 block mb-2">Notes</span>
                            <p className="text-gray-800">{supplier.notes}</p>
                        </div>
                    )}

                    <div className="pt-4 border-t text-sm text-gray-500">
                        <p>Created: {formatDate(supplier.createdAt)}</p>
                        <p>Last Updated: {formatDate(supplier.updatedAt)}</p>
                    </div>
                </div>
            </Card>

            {/* Delete Modal */}
            <Modal
                isOpen={deleteModal}
                onClose={() => setDeleteModal(false)}
                title="Delete Supplier"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setDeleteModal(false)}>
                            Cancel
                        </Button>
                        <Button variant="danger" onClick={handleDelete}>
                            Delete
                        </Button>
                    </>
                }
            >
                <p className="text-gray-600">
                    Are you sure you want to delete <strong>{supplier.name}</strong>? This action will deactivate the supplier.
                </p>
            </Modal>
        </div>
    );
};

export default SupplierDetail;


