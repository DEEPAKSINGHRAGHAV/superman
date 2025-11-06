import React, { useState, useEffect } from 'react';
import { Receipt, Calendar, Eye, Printer, TrendingUp, DollarSign, Package } from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import Loading from '../../components/common/Loading';
import ThermalReceipt from '../../components/billing/ThermalReceipt';
import { inventoryAPI } from '../../services/api';
import { formatDate, formatCurrency, formatDateTime } from '../../utils/helpers';
import toast from 'react-hot-toast';

// Helper function to get today's date in YYYY-MM-DD format
const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const SalesHistory = () => {
    const [bills, setBills] = useState([]);
    const [selectedBill, setSelectedBill] = useState(null);
    const [showReceiptModal, setShowReceiptModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
    });
    const [filters, setFilters] = useState({
        startDate: getTodayDate(), // Default to current day
        endDate: getTodayDate(), // Default to current day
        billNumber: '',
    });
    const [summary, setSummary] = useState({
        totalBills: 0,
        totalRevenue: 0,
        totalProfit: 0,
    });

    useEffect(() => {
        fetchData();
    }, [pagination.page, filters]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const params = {
                page: pagination.page,
                limit: pagination.limit,
            };

            if (filters.startDate) params.startDate = filters.startDate;
            if (filters.endDate) params.endDate = filters.endDate;
            if (filters.billNumber) params.billNumber = filters.billNumber;

            const response = await inventoryAPI.getSalesHistory(params);

            if (response.success) {
                setBills(response.data);
                setPagination((prev) => ({
                    ...prev,
                    total: response.total,
                    totalPages: response.pagination?.totalPages || 1,
                }));

                // Use summary from backend (calculated from all matching bills, not just current page)
                if (response.summary) {
                    setSummary({
                        totalBills: response.summary.totalBills || 0,
                        totalRevenue: response.summary.totalRevenue || 0,
                        totalProfit: response.summary.totalProfit || 0,
                    });
                } else {
                    // Fallback to calculating from current page if summary not available
                    const totalRevenue = response.data.reduce((sum, bill) => sum + (bill.subtotal || 0), 0);
                    const totalProfit = response.data.reduce((sum, bill) => sum + (bill.profit || 0), 0);
                    setSummary({
                        totalBills: response.total,
                        totalRevenue,
                        totalProfit,
                    });
                }
            }
        } catch (error) {
            toast.error(error.message || 'Failed to load sales history');
            console.error('Sales history fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleViewReceipt = (bill) => {
        // Use exact receipt data as stored at billing time
        const receiptData = {
            billNumber: bill.billNumber,
            date: formatDateTime(bill.date),
            items: bill.items.map(item => ({
                product: item.product,
                quantity: item.quantity,
                unitPrice: item.sellingPrice, // Exact price shown at billing
                totalPrice: item.total, // Exact total shown at billing
            })),
            subtotal: bill.subtotal, // Exact subtotal shown at billing
            tax: bill.tax || 0,
            total: bill.total, // Exact total shown at billing
            paymentMethod: bill.paymentMethod || 'Cash', // Exact payment method used
            amountReceived: bill.amountReceived || bill.total,
            change: bill.change || 0, // Exact change given
            cashier: bill.cashier?.name || 'N/A',
        };
        setSelectedBill(receiptData);
        setShowReceiptModal(true);
    };

    const handlePrintReceipt = (bill) => {
        // Use exact receipt data as stored at billing time
        const receiptData = {
            billNumber: bill.billNumber,
            date: formatDateTime(bill.date),
            items: bill.items.map(item => ({
                product: item.product,
                quantity: item.quantity,
                unitPrice: item.sellingPrice, // Exact price shown at billing
                totalPrice: item.total, // Exact total shown at billing
            })),
            subtotal: bill.subtotal, // Exact subtotal shown at billing
            tax: bill.tax || 0,
            total: bill.total, // Exact total shown at billing
            paymentMethod: bill.paymentMethod || 'Cash', // Exact payment method used
            amountReceived: bill.amountReceived || bill.total,
            change: bill.change || 0, // Exact change given
            cashier: bill.cashier?.name || 'N/A',
        };
        setSelectedBill(receiptData);
        setTimeout(() => {
            window.print();
        }, 100);
    };

    const handleFilterChange = (key, value) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
        setPagination((prev) => ({ ...prev, page: 1 })); // Reset to first page on filter change
    };

    const clearFilters = () => {
        setFilters({
            startDate: getTodayDate(), // Reset to current day
            endDate: getTodayDate(), // Reset to current day
            billNumber: '',
        });
        setPagination((prev) => ({ ...prev, page: 1 }));
    };

    if (loading && bills.length === 0) {
        return <Loading text="Loading sales history..." />;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Sales History</h1>
                <p className="text-gray-600 mt-1">View and manage past sales bills</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Total Bills</p>
                            <p className="text-2xl font-bold text-gray-900 mt-2">
                                {formatCurrency(summary.totalBills, '')}
                            </p>
                        </div>
                        <div className="bg-blue-500 p-3 rounded-lg">
                            <Receipt className="text-white" size={24} />
                        </div>
                    </div>
                </Card>

                <Card>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                            <p className="text-2xl font-bold text-gray-900 mt-2">
                                {formatCurrency(summary.totalRevenue)}
                            </p>
                        </div>
                        <div className="bg-green-500 p-3 rounded-lg">
                            <DollarSign className="text-white" size={24} />
                        </div>
                    </div>
                </Card>

                <Card>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Total Profit</p>
                            <p className="text-2xl font-bold text-gray-900 mt-2">
                                {formatCurrency(summary.totalProfit)}
                            </p>
                        </div>
                        <div className="bg-purple-500 p-3 rounded-lg">
                            <TrendingUp className="text-white" size={24} />
                        </div>
                    </div>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="flex flex-col">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Start Date
                        </label>
                        <Input
                            type="date"
                            value={filters.startDate}
                            onChange={(e) => handleFilterChange('startDate', e.target.value)}
                        />
                    </div>
                    <div className="flex flex-col">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            End Date
                        </label>
                        <Input
                            type="date"
                            value={filters.endDate}
                            onChange={(e) => handleFilterChange('endDate', e.target.value)}
                        />
                    </div>
                    <div className="flex flex-col">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Bill Number
                        </label>
                        <Input
                            type="text"
                            placeholder="Search bill number..."
                            value={filters.billNumber}
                            onChange={(e) => handleFilterChange('billNumber', e.target.value)}
                        />
                    </div>
                    <div className="flex flex-col">
                        <label className="block text-sm font-medium text-gray-700 mb-1 opacity-0">
                            Actions
                        </label>
                        <Button
                            variant="outline"
                            onClick={clearFilters}
                            className="w-full"
                        >
                            Clear Filters
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Bills List */}
            <Card title="Sales Bills" noPadding>
                {bills.length === 0 ? (
                    <div className="p-12 text-center">
                        <Receipt className="mx-auto text-gray-400 mb-4" size={48} />
                        <p className="text-lg font-semibold text-gray-600">No sales bills found</p>
                        <p className="text-gray-500 mt-1">
                            {Object.values(filters).some(f => f)
                                ? 'Try adjusting your filters'
                                : 'Sales bills will appear here once you start processing sales'}
                        </p>
                    </div>
                ) : (
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
                                {bills.map((bill) => (
                                    <tr key={bill.billNumber} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-semibold text-gray-900">
                                                {bill.billNumber}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                {formatDateTime(bill.date)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                {bill.cashier?.name || 'N/A'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <Package size={16} className="text-gray-400" />
                                                <span className="text-sm text-gray-900">
                                                    {bill.totalItems} {bill.totalItems === 1 ? 'item' : 'items'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-semibold text-gray-900">
                                                {formatCurrency(bill.subtotal)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-semibold text-green-600">
                                                    {formatCurrency(bill.profit)}
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    ({bill.profitMargin}%)
                                                </span>
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
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
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

export default SalesHistory;

