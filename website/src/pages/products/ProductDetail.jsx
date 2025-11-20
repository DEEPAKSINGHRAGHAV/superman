import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Edit, Trash2, ArrowLeft, Package, DollarSign, BarChart, Layers, Clock, AlertCircle, Printer } from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Loading from '../../components/common/Loading';
import Modal from '../../components/common/Modal';
import BarcodeLabel from '../../components/products/BarcodeLabel';
import { productsAPI, batchesAPI } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/helpers';
import toast from 'react-hot-toast';

const ProductDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [product, setProduct] = useState(null);
    const [batchSummary, setBatchSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadingBatches, setLoadingBatches] = useState(false);
    const [showBatches, setShowBatches] = useState(true);
    const [deleteModal, setDeleteModal] = useState(false);
    const [showBarcodeLabel, setShowBarcodeLabel] = useState(false);

    useEffect(() => {
        if (id) {
            fetchProduct();
            fetchBatches();
        }
    }, [id]);

    const fetchProduct = async () => {
        try {
            setLoading(true);
            const response = await productsAPI.getById(id);
            if (response.success) {
                setProduct(response.data);
            }
        } catch (error) {
            toast.error('Failed to load product details');
            console.error('Product fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchBatches = async () => {
        try {
            setLoadingBatches(true);
            const response = await batchesAPI.getByProduct(id);
            if (response.success) {
                setBatchSummary(response.data);
            }
        } catch (error) {
            console.error('Batches fetch error:', error);
        } finally {
            setLoadingBatches(false);
        }
    };

    const handleDelete = async () => {
        try {
            const response = await productsAPI.delete(id);
            if (response.success) {
                toast.success('Product deleted successfully');
                navigate('/products');
            }
        } catch (error) {
            toast.error(error.message || 'Failed to delete product');
        }
    };

    if (loading) {
        return <Loading text="Loading product..." />;
    }

    if (!product) {
        return (
            <div className="flex flex-col items-center justify-center py-12">
                <Package size={64} className="text-gray-400 mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Product Not Found</h2>
                <p className="text-gray-600 mb-4">The product you're looking for doesn't exist.</p>
                <Button onClick={() => navigate('/products')}>Back to Products</Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <button
                        onClick={() => navigate('/products')}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
                        <p className="text-gray-600 mt-1">SKU: {product.sku}</p>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    {product.barcode && (
                        <Button
                            variant="secondary"
                            icon={<Printer size={18} />}
                            onClick={() => setShowBarcodeLabel(true)}
                        >
                            Print Label
                        </Button>
                    )}
                    <Button
                        variant="secondary"
                        icon={<Edit size={18} />}
                        onClick={() => navigate(`/products/${id}/edit`)}
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

            {/* Product Information Card */}
            <Card>
                <div className="space-y-4">
                    <div className="flex items-center space-x-2 text-lg font-semibold">
                        <Package size={20} />
                        <span>Product Information</span>
                    </div>

                    {product.barcode && (
                        <div className="flex items-center justify-between py-2 border-b">
                            <span className="text-gray-600">Barcode</span>
                            <span className="font-mono font-medium">{product.barcode}</span>
                        </div>
                    )}

                    <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-gray-600">Category</span>
                        <span className="font-medium">{product.category || 'N/A'}</span>
                    </div>

                    {product.brand && (
                        <div className="flex items-center justify-between py-2 border-b">
                            <span className="text-gray-600">Brand</span>
                            <span className="font-medium">{product.brand}</span>
                        </div>
                    )}

                    <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-gray-600">Current Stock</span>
                        <span className="font-medium text-lg">{product.currentStock} {product.unit}</span>
                    </div>

                    <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-gray-600">Minimum Stock Level</span>
                        <span className="font-medium">{product.minStockLevel || 0} {product.unit}</span>
                    </div>

                    <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-gray-600">MRP</span>
                        <span className="font-medium">{formatCurrency(product.mrp)}</span>
                    </div>

                    <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-gray-600">Selling Price</span>
                        <span className="font-medium text-green-600">{formatCurrency(product.sellingPrice)}</span>
                    </div>

                    <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-gray-600">Cost Price</span>
                        <span className="font-medium text-red-600">{formatCurrency(product.costPrice)}</span>
                    </div>

                    {product.profitMargin !== undefined && (
                        <div className="flex items-center justify-between py-2">
                            <span className="text-gray-600">Profit Margin</span>
                            <span className="font-medium text-blue-600">{product.profitMargin}%</span>
                        </div>
                    )}

                    {product.description && (
                        <div className="pt-4 border-t">
                            <span className="text-gray-600 block mb-2">Description</span>
                            <p className="text-gray-800">{product.description}</p>
                        </div>
                    )}
                </div>
            </Card>

            {/* Batch Information */}
            {batchSummary && batchSummary.totalBatches > 0 && (
                <Card>
                    <button
                        onClick={() => setShowBatches(!showBatches)}
                        className="flex items-center justify-between w-full text-left"
                    >
                        <div className="flex items-center space-x-3">
                            <Layers size={20} className="text-blue-500" />
                            <span className="text-lg font-semibold">Active Batches</span>
                            <Badge variant="primary">{batchSummary.totalBatches}</Badge>
                        </div>
                        <span className="text-gray-400">{showBatches ? '−' : '+'}</span>
                    </button>

                    {showBatches && (
                        <div className="mt-4 space-y-3">
                            {loadingBatches ? (
                                <Loading text="Loading batches..." />
                            ) : (
                                <>
                                    {batchSummary.batches && batchSummary.batches.map((batch) => (
                                        <div key={batch._id} className="p-4 bg-gray-50 rounded-lg border">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="font-medium">{batch.batchNumber}</span>
                                                <Badge variant={batch.status === 'active' ? 'success' : 'warning'}>
                                                    {batch.status}
                                                </Badge>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                <div>
                                                    <span className="text-gray-600">Quantity:</span>
                                                    <span className="ml-2 font-medium">{batch.currentQuantity}</span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-600">Cost:</span>
                                                    <span className="ml-2 font-medium">{formatCurrency(batch.costPrice)}</span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-600">Selling:</span>
                                                    <span className="ml-2 font-medium">{formatCurrency(batch.sellingPrice)}</span>
                                                </div>
                                                {batch.expiryDate && (
                                                    <div>
                                                        <span className="text-gray-600">Expires:</span>
                                                        <span className="ml-2 font-medium">{formatDate(batch.expiryDate)}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    <button
                                        onClick={() => navigate(`/batches?product=${id}`)}
                                        className="w-full py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200 flex items-center justify-center space-x-2"
                                    >
                                        <Clock size={18} />
                                        <span>View All Batches (Including History)</span>
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </Card>
            )}

            {/* No Batches Info */}
            {(!batchSummary || batchSummary.totalBatches === 0) && (
                <Card>
                    <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg">
                        <AlertCircle size={20} className="text-blue-500 mt-0.5" />
                        <div>
                            <p className="text-sm text-blue-900 font-medium">No Batches Found</p>
                            <p className="text-sm text-blue-700 mt-1">
                                Product prices shown above are the latest defaults. Batches will be created when receiving purchase orders.
                            </p>
                        </div>
                    </div>
                </Card>
            )}

            {/* Delete Modal */}
            <Modal
                isOpen={deleteModal}
                onClose={() => setDeleteModal(false)}
                title="Delete Product"
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
                    Are you sure you want to delete <strong>{product.name}</strong>? This action will deactivate the product.
                </p>
            </Modal>

            {/* Barcode Label Print Modal */}
            {showBarcodeLabel && product && (
                <BarcodeLabel
                    product={product}
                    onClose={() => setShowBarcodeLabel(false)}
                    onPrint={() => {
                        window.print();
                    }}
                />
            )}
        </div>
    );
};

export default ProductDetail;


