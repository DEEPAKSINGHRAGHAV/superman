import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Mail, MapPin, TrendingUp, Package, DollarSign, ShoppingCart, BarChart3, Eye, Printer } from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Loading from '../../components/common/Loading';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import ThermalReceipt from '../../components/billing/ThermalReceipt';
import { customersAPI } from '../../services/api';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/helpers';
import toast from 'react-hot-toast';

const CustomerDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 0,
    });
    const [bills, setBills] = useState([]);
    const [selectedBill, setSelectedBill] = useState(null);
    const [showReceiptModal, setShowReceiptModal] = useState(false);

    useEffect(() => {
        let isMounted = true;
        const abortController = new AbortController();

        const fetchData = async () => {
            if (!id) return;
            
            try {
                setLoading(true);
                const response = await customersAPI.getAnalytics(id, {
                    page: pagination.page,
                    limit: pagination.limit,
                }, abortController.signal);

                if (!isMounted) return;

                if (response.success && response.data) {
                    setData(response.data);
                    setBills(response.data.bills.data);
                    setPagination(prev => ({
                        ...prev,
                        total: response.data.bills.pagination.totalBills,
                        totalPages: response.data.bills.pagination.totalPages,
                    }));
                }
            } catch (error) {
                if (!isMounted || abortController.signal.aborted) return;
                toast.error('Failed to load customer details');
                console.error('Customer fetch error:', error);
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchData();

        // Cleanup: Cancel request and prevent state updates on unmount
        return () => {
            isMounted = false;
            abortController.abort();
        };
    }, [id, pagination.page]);

    const formatBillForReceipt = (bill) => {
        // Format bill data for ThermalReceipt component
        return {
            billNumber: bill.billNumber,
            date: formatDateTime(bill.createdAt),
            items: bill.items.map(item => ({
                product: {
                    name: item.productName,
                    mrp: item.unitPrice, // Use unitPrice as MRP for display (since we don't have actual MRP stored)
                    sku: item.productSku,
                },
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.totalPrice,
            })),
            subtotal: bill.subtotal,
            tax: bill.taxAmount || 0,
            total: bill.totalAmount,
            paymentMethod: bill.paymentMethod || 'Cash',
            amountReceived: bill.amountReceived || bill.totalAmount,
            change: bill.change || 0,
            cashier: bill.cashierName || (typeof bill.cashier === 'object' ? bill.cashier?.name : 'N/A'),
        };
    };

    const handleViewReceipt = (bill) => {
        const receiptData = formatBillForReceipt(bill);
        setSelectedBill(receiptData);
        setShowReceiptModal(true);
    };

    const handlePrintReceipt = (bill) => {
        const receiptData = formatBillForReceipt(bill);
        setSelectedBill(receiptData);
        setTimeout(() => {
            window.print();
        }, 100);
    };

    if (loading && !data) {
        return <Loading text="Loading customer data..." />;
    }

    if (!data) {
        return (
            <div className="flex flex-col items-center justify-center py-12">
                <Package size={64} className="text-gray-400 mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Customer Not Found</h2>
                <p className="text-gray-600 mb-4">The customer you're looking for doesn't exist.</p>
                <Button onClick={() => navigate('/customers')}>Back to Customers</Button>
            </div>
        );
    }

    const { customer, analytics, topItems, paymentMethodBreakdown, monthlyTrend } = data;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <button
                        onClick={() => navigate('/customers')}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            {customer.name || 'Walk-in Customer'}
                        </h1>
                        <p className="text-gray-600 mt-1">Customer ID: {customer.customerNumber}</p>
                    </div>
                </div>
                <Badge variant={customer.isActive ? 'success' : 'gray'}>
                    {customer.isActive ? 'Active' : 'Inactive'}
                </Badge>
            </div>

            {/* Customer Basic Info */}
            <Card>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {customer.phone && (
                        <div className="flex items-center space-x-2">
                            <Phone size={18} className="text-gray-400" />
                            <span className="text-gray-700">{customer.phone}</span>
                        </div>
                    )}
                    {customer.email && (
                        <div className="flex items-center space-x-2">
                            <Mail size={18} className="text-gray-400" />
                            <span className="text-gray-700">{customer.email}</span>
                        </div>
                    )}
                    {customer.address && (
                        <div className="flex items-start space-x-2">
                            <MapPin size={18} className="text-gray-400 mt-1" />
                            <span className="text-gray-700">
                                {customer.formattedAddress || 
                                    `${customer.address.street || ''} ${customer.address.city || ''} ${customer.address.state || ''} ${customer.address.pincode || ''}`.trim() || 
                                    'No address'}
                            </span>
                        </div>
                    )}
                    {customer.notes && (
                        <div className="md:col-span-2">
                            <p className="text-sm text-gray-600">
                                <strong>Notes:</strong> {customer.notes}
                            </p>
                        </div>
                    )}
                </div>
            </Card>

            {/* Analytics Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 mb-1">Total Bills</p>
                            <p className="text-2xl font-bold text-gray-900">{analytics.totalBills}</p>
                        </div>
                        <ShoppingCart size={32} className="text-blue-500" />
                    </div>
                </Card>

                <Card>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
                            <p className="text-2xl font-bold text-green-600">
                                {formatCurrency(analytics.totalRevenue)}
                            </p>
                        </div>
                        <DollarSign size={32} className="text-green-500" />
                    </div>
                </Card>

                <Card>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 mb-1">Total Profit</p>
                            <p className="text-2xl font-bold text-orange-600">
                                {formatCurrency(analytics.totalProfit)}
                            </p>
                        </div>
                        <TrendingUp size={32} className="text-orange-500" />
                    </div>
                </Card>

                <Card>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 mb-1">Items Bought</p>
                            <p className="text-2xl font-bold text-purple-600">{analytics.totalItems}</p>
                        </div>
                        <Package size={32} className="text-purple-500" />
                    </div>
                </Card>
            </div>

            {/* Additional Analytics */}
            <Card>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Statistics</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <p className="text-sm text-gray-600">Average Bill Value</p>
                        <p className="text-lg font-semibold text-gray-900">
                            {formatCurrency(analytics.averageBillValue)}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Profit Margin</p>
                        <p className="text-lg font-semibold text-gray-900">
                            {analytics.profitMargin.toFixed(2)}%
                        </p>
                    </div>
                    {analytics.firstPurchaseDate && (
                        <div>
                            <p className="text-sm text-gray-600">First Purchase</p>
                            <p className="text-lg font-semibold text-gray-900">
                                {formatDate(analytics.firstPurchaseDate)}
                            </p>
                        </div>
                    )}
                    {analytics.lastPurchaseDate && (
                        <div>
                            <p className="text-sm text-gray-600">Last Purchase</p>
                            <p className="text-lg font-semibold text-gray-900">
                                {formatDate(analytics.lastPurchaseDate)}
                            </p>
                        </div>
                    )}
                </div>
            </Card>

            {/* Top 10 Most Bought Items */}
            {topItems.length > 0 && (
                <Card>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900">Top 10 Most Bought Items</h2>
                        <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full">
                            <BarChart3 size={14} className="text-gray-500" />
                            <span className="text-xs text-gray-600 italic">Based on last 2000 bills</span>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Product
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                        Quantity
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {topItems.map((item, index) => (
                                    <tr key={index} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">
                                                    {item.productName}
                                                </p>
                                                <p className="text-xs text-gray-500">SKU: {item.productSku}</p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-900 text-right font-semibold">
                                            {item.totalQuantity} units
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* Payment Method Breakdown */}
            {paymentMethodBreakdown.length > 0 && (
                <Card>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Methods</h2>
                    <div className="space-y-3">
                        {paymentMethodBreakdown.map((method, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div>
                                    <p className="font-medium text-gray-900">{method.paymentMethod}</p>
                                    <p className="text-sm text-gray-600">{method.count} bills</p>
                                </div>
                                <p className="text-lg font-semibold text-gray-900">
                                    {formatCurrency(method.totalAmount)}
                                </p>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Bills List */}
            <Card title={`Purchase History (${analytics.totalBills} bills)`} noPadding>
                {bills.length === 0 ? (
                    <div className="p-12 text-center">
                        <Package className="mx-auto text-gray-400 mb-4" size={48} />
                        <p className="text-lg font-semibold text-gray-600">No bills found</p>
                        <p className="text-gray-500 mt-1">Purchase history will appear here once bills are created</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Bill Number
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Date & Time
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Cashier
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Items
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Total
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Profit
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {bills.map((bill) => {
                                        const totalItems = bill.items ? bill.items.reduce((sum, item) => sum + (item.quantity || 0), 0) : 0;
                                        return (
                                            <tr key={bill._id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-semibold text-gray-900">
                                                        {bill.billNumber}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">
                                                        {bill.formattedDate || formatDateTime(bill.createdAt)}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">
                                                        {bill.cashier?.name || bill.cashierName || 'N/A'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <Package size={16} className="text-gray-400" />
                                                        <span className="text-sm text-gray-900">
                                                            {totalItems} {totalItems === 1 ? 'item' : 'items'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-semibold text-gray-900">
                                                        {formatCurrency(bill.totalAmount)}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-semibold text-green-600">
                                                            {formatCurrency(bill.profit || 0)}
                                                        </span>
                                                        {bill.profitMargin !== undefined && (
                                                            <span className="text-xs text-gray-500">
                                                                ({bill.profitMargin.toFixed(1)}%)
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => handleViewReceipt(bill)}
                                                            className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                                                        >
                                                            <Eye size={16} />
                                                            View
                                                        </button>
                                                        <button
                                                            onClick={() => handlePrintReceipt(bill)}
                                                            className="text-green-600 hover:text-green-900 flex items-center gap-1"
                                                        >
                                                            <Printer size={16} />
                                                            Print
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        {bills.length > 0 && (
                            <div className="px-6 py-4 border-t border-gray-200">
                                <Pagination
                                    currentPage={pagination.page}
                                    totalPages={pagination.totalPages}
                                    onPageChange={(page) => setPagination({ ...pagination, page })}
                                    total={pagination.total}
                                    pageSize={pagination.limit}
                                />
                            </div>
                        )}
                    </>
                )}
            </Card>

            {/* Receipt Preview Modal */}
            <Modal
                isOpen={showReceiptModal}
                onClose={() => {
                    setShowReceiptModal(false);
                    setSelectedBill(null);
                }}
                title="Receipt Preview"
                size="lg"
            >
                <div className="flex justify-center">
                    <ThermalReceipt
                        receiptData={selectedBill}
                        showControls={false}
                    />
                </div>
                <div className="flex justify-end gap-2 mt-4">
                    <Button
                        variant="outline"
                        onClick={() => {
                            setShowReceiptModal(false);
                            setSelectedBill(null);
                        }}
                    >
                        Close
                    </Button>
                    <Button
                        onClick={() => {
                            if (selectedBill) {
                                setTimeout(() => {
                                    window.print();
                                }, 100);
                            }
                        }}
                    >
                        <Printer size={16} className="mr-2" />
                        Print Receipt
                    </Button>
                </div>
            </Modal>

            {/* Hidden Printable Receipt */}
            {selectedBill && (
                <div
                    className="print-only"
                    style={{
                        position: 'absolute',
                        left: '-9999px',
                        top: 0,
                        width: '58mm',
                        zIndex: -1,
                        pointerEvents: 'none'
                    }}
                >
                    <ThermalReceipt
                        receiptData={selectedBill}
                        showControls={false}
                    />
                </div>
            )}
        </div>
    );
};

export default CustomerDetail;

