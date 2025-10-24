import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Loading from '../../components/common/Loading';
import { suppliersAPI } from '../../services/api';
import toast from 'react-hot-toast';

const SupplierForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditing = Boolean(id);

    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        contactPerson: '',
        email: '',
        phone: '',
        address: '',
        gst: '',
        pan: '',
        paymentTerms: '',
        notes: '',
        isActive: true,
    });

    useEffect(() => {
        if (isEditing) {
            fetchSupplier();
        }
    }, [id]);

    const fetchSupplier = async () => {
        try {
            setLoading(true);
            const response = await suppliersAPI.getById(id);
            if (response.success) {
                setFormData(response.data);
            }
        } catch (error) {
            toast.error('Failed to load supplier details');
            console.error('Supplier fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Basic validation
        if (!formData.name) {
            toast.error('Supplier name is required');
            return;
        }

        try {
            setSubmitting(true);
            const response = isEditing
                ? await suppliersAPI.update(id, formData)
                : await suppliersAPI.create(formData);

            if (response.success) {
                toast.success(`Supplier ${isEditing ? 'updated' : 'created'} successfully`);
                navigate(isEditing ? `/suppliers/${id}` : '/suppliers');
            }
        } catch (error) {
            toast.error(error.message || `Failed to ${isEditing ? 'update' : 'create'} supplier`);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <Loading text="Loading supplier..." />;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center space-x-4">
                <button
                    onClick={() => navigate('/suppliers')}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <ArrowLeft size={24} />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {isEditing ? 'Edit Supplier' : 'Add New Supplier'}
                    </h1>
                    <p className="text-gray-600 mt-1">
                        {isEditing ? 'Update supplier information' : 'Create a new supplier'}
                    </p>
                </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
                <Card>
                    <div className="space-y-6">
                        {/* Basic Information */}
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Supplier Name <span className="text-red-500">*</span>
                                    </label>
                                    <Input
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        placeholder="Enter supplier name"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Contact Person
                                    </label>
                                    <Input
                                        name="contactPerson"
                                        value={formData.contactPerson}
                                        onChange={handleChange}
                                        placeholder="Enter contact person name"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Email
                                    </label>
                                    <Input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="Enter email address"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Phone
                                    </label>
                                    <Input
                                        type="tel"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        placeholder="Enter phone number"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Payment Terms
                                    </label>
                                    <Input
                                        name="paymentTerms"
                                        value={formData.paymentTerms}
                                        onChange={handleChange}
                                        placeholder="e.g., Net 30 days"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Address
                                    </label>
                                    <textarea
                                        name="address"
                                        value={formData.address}
                                        onChange={handleChange}
                                        rows={3}
                                        className="input"
                                        placeholder="Enter full address"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Tax Information */}
                        <div className="border-t pt-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Tax Information</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        GST Number
                                    </label>
                                    <Input
                                        name="gst"
                                        value={formData.gst}
                                        onChange={handleChange}
                                        placeholder="Enter GST number"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        PAN Number
                                    </label>
                                    <Input
                                        name="pan"
                                        value={formData.pan}
                                        onChange={handleChange}
                                        placeholder="Enter PAN number"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Additional Information */}
                        <div className="border-t pt-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Notes
                                    </label>
                                    <textarea
                                        name="notes"
                                        value={formData.notes}
                                        onChange={handleChange}
                                        rows={4}
                                        className="input"
                                        placeholder="Enter any additional notes or comments"
                                    />
                                </div>

                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="isActive"
                                        name="isActive"
                                        checked={formData.isActive}
                                        onChange={handleChange}
                                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                    <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                                        Active Supplier
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="border-t pt-6 flex items-center space-x-3">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => navigate('/suppliers')}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                variant="primary"
                                icon={<Save size={18} />}
                                disabled={submitting}
                            >
                                {submitting ? 'Saving...' : isEditing ? 'Update Supplier' : 'Create Supplier'}
                            </Button>
                        </div>
                    </div>
                </Card>
            </form>
        </div>
    );
};

export default SupplierForm;


