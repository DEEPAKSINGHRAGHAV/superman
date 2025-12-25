import React from 'react';
import { MinusCircle, Trash2, RotateCcw, AlertTriangle, AlertCircle } from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { formatNumber } from '../../utils/helpers';

/**
 * BatchActionsModals - Reusable component for batch action modals
 * Follows Single Responsibility Principle - handles only batch action UI
 * Follows Interface Segregation - accepts only the props it needs
 * 
 * @param {Object} props
 * @param {Object} props.batchActions - State and handlers from useBatchActions hook
 * @param {string} props.productName - Optional product name for display context
 * @param {boolean} props.compact - Use compact styling (for sidebars)
 */
const BatchActionsModals = ({ batchActions, productName = 'Product', compact = false }) => {
    const {
        showActionsModal,
        showAdjustModal,
        showStatusModal,
        setShowActionsModal,
        setShowAdjustModal,
        setShowStatusModal,
        selectedBatch,
        setSelectedBatch,
        adjustQuantity,
        setAdjustQuantity,
        adjustReason,
        setAdjustReason,
        newStatus,
        setNewStatus,
        statusReason,
        setStatusReason,
        isSubmitting,
        openAdjustModal,
        openStatusModal,
        handleAdjustQuantity,
        handleUpdateStatus,
        handleQuickDeplete,
        resetForms,
    } = batchActions;

    if (!selectedBatch) return null;

    return (
        <>
            {/* Actions Modal - Main Menu */}
            <Modal
                isOpen={showActionsModal}
                onClose={() => {
                    setShowActionsModal(false);
                    setSelectedBatch(null);
                }}
                title="Batch Actions"
                size="sm"
            >
                <div className={compact ? "space-y-3" : "space-y-4"}>
                    {/* Batch Info Header */}
                    <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className={`font-medium text-gray-900 ${compact ? 'text-sm' : ''}`}>
                                    {selectedBatch.product?.name || productName}
                                </p>
                                <p className="text-xs text-gray-500">Batch: {selectedBatch.batchNumber}</p>
                            </div>
                            <div className="text-right">
                                <p className={`font-bold text-gray-900 ${compact ? 'text-lg' : 'text-xl'}`}>
                                    {selectedBatch.currentQuantity}
                                </p>
                                <p className="text-xs text-gray-500">units</p>
                            </div>
                        </div>
                        {!compact && (
                            <div className="mt-2 pt-2 border-t border-gray-200 flex justify-between text-sm">
                                <span className="text-gray-500">Cost: ₹{formatNumber(selectedBatch.costPrice)}</span>
                                <span className="text-gray-500">Sell: ₹{formatNumber(selectedBatch.sellingPrice)}</span>
                                <span className="font-medium text-blue-600">
                                    Value: ₹{formatNumber(selectedBatch.currentQuantity * selectedBatch.costPrice)}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2">
                        <button
                            onClick={() => openAdjustModal()}
                            className={`w-full text-left text-sm text-gray-700 hover:bg-gray-50 rounded-lg border border-gray-200 flex items-center gap-${compact ? '2' : '3'} transition-colors ${compact ? 'px-3 py-2' : 'px-4 py-3'}`}
                        >
                            {compact ? (
                                <MinusCircle size={16} className="text-blue-600" />
                            ) : (
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <MinusCircle size={18} className="text-blue-600" />
                                </div>
                            )}
                            <div>
                                <p className={`font-medium ${compact ? 'text-xs' : ''}`}>Adjust Quantity</p>
                                {!compact && <p className="text-xs text-gray-500">Increase or decrease batch quantity</p>}
                            </div>
                        </button>

                        <button
                            onClick={handleQuickDeplete}
                            disabled={isSubmitting}
                            className={`w-full text-left text-sm text-red-700 hover:bg-red-50 rounded-lg border border-red-200 flex items-center gap-${compact ? '2' : '3'} transition-colors ${compact ? 'px-3 py-2' : 'px-4 py-3'}`}
                        >
                            {compact ? (
                                <Trash2 size={16} className="text-red-600" />
                            ) : (
                                <div className="p-2 bg-red-100 rounded-lg">
                                    <Trash2 size={18} className="text-red-600" />
                                </div>
                            )}
                            <div>
                                <p className={`font-medium ${compact ? 'text-xs' : ''}`}>Deplete Entire Batch</p>
                                {!compact && <p className="text-xs text-red-500">Set quantity to 0 (cannot be undone)</p>}
                            </div>
                        </button>

                        <div className="border-t border-gray-200 pt-2 mt-2">
                            <p className="text-xs text-gray-500 mb-2 px-1">Mark batch status as:</p>
                            
                            {compact ? (
                                <div className="grid grid-cols-3 gap-1">
                                    <button
                                        onClick={() => openStatusModal(null, 'damaged')}
                                        className="px-2 py-1.5 text-xs text-orange-700 hover:bg-orange-50 rounded border border-orange-200 transition-colors"
                                    >
                                        Damaged
                                    </button>
                                    <button
                                        onClick={() => openStatusModal(null, 'expired')}
                                        className="px-2 py-1.5 text-xs text-red-700 hover:bg-red-50 rounded border border-red-200 transition-colors"
                                    >
                                        Expired
                                    </button>
                                    <button
                                        onClick={() => openStatusModal(null, 'returned')}
                                        className="px-2 py-1.5 text-xs text-blue-700 hover:bg-blue-50 rounded border border-blue-200 transition-colors"
                                    >
                                        Returned
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <button
                                        onClick={() => openStatusModal(null, 'damaged')}
                                        className="w-full px-4 py-3 text-left text-sm text-orange-700 hover:bg-orange-50 rounded-lg border border-orange-200 flex items-center gap-3 transition-colors mb-2"
                                    >
                                        <div className="p-2 bg-orange-100 rounded-lg">
                                            <AlertCircle size={18} className="text-orange-600" />
                                        </div>
                                        <div>
                                            <p className="font-medium">Mark as Damaged</p>
                                            <p className="text-xs text-orange-500">Physical damage, contamination</p>
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => openStatusModal(null, 'expired')}
                                        className="w-full px-4 py-3 text-left text-sm text-red-700 hover:bg-red-50 rounded-lg border border-red-200 flex items-center gap-3 transition-colors mb-2"
                                    >
                                        <div className="p-2 bg-red-100 rounded-lg">
                                            <AlertTriangle size={18} className="text-red-600" />
                                        </div>
                                        <div>
                                            <p className="font-medium">Mark as Expired</p>
                                            <p className="text-xs text-red-500">Past expiry date</p>
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => openStatusModal(null, 'returned')}
                                        className="w-full px-4 py-3 text-left text-sm text-blue-700 hover:bg-blue-50 rounded-lg border border-blue-200 flex items-center gap-3 transition-colors"
                                    >
                                        <div className="p-2 bg-blue-100 rounded-lg">
                                            <RotateCcw size={18} className="text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="font-medium">Mark as Returned</p>
                                            <p className="text-xs text-blue-500">Returned to supplier</p>
                                        </div>
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Cancel Button */}
                    <div className="pt-2 border-t border-gray-200">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowActionsModal(false);
                                setSelectedBatch(null);
                            }}
                            className="w-full"
                            size={compact ? 'sm' : 'md'}
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Adjust Quantity Modal */}
            <Modal
                isOpen={showAdjustModal}
                onClose={() => {
                    setShowAdjustModal(false);
                    resetForms();
                }}
                title="Adjust Batch Quantity"
                size="md"
                footer={
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowAdjustModal(false);
                                resetForms();
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleAdjustQuantity}
                            loading={isSubmitting}
                        >
                            Apply Adjustment
                        </Button>
                    </div>
                }
            >
                <div className="space-y-4">
                    {/* Batch Info */}
                    <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="font-medium text-gray-900">
                                    {selectedBatch.product?.name || productName}
                                </p>
                                <p className="text-sm text-gray-500">Batch: {selectedBatch.batchNumber}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-2xl font-bold text-gray-900">{selectedBatch.currentQuantity}</p>
                                <p className="text-sm text-gray-500">Current Qty</p>
                            </div>
                        </div>
                    </div>

                    {/* Adjustment Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Adjustment Quantity
                        </label>
                        <input
                            type="number"
                            value={adjustQuantity}
                            onChange={(e) => setAdjustQuantity(e.target.value)}
                            className="input"
                            placeholder="e.g., -50 to reduce, +10 to add"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Use negative numbers to reduce, positive to add.
                            {adjustQuantity && !isNaN(parseInt(adjustQuantity)) && (
                                <span className="font-medium ml-2">
                                    New quantity: {Math.max(0, selectedBatch.currentQuantity + parseInt(adjustQuantity))}
                                </span>
                            )}
                        </p>
                    </div>

                    {/* Reason */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Reason <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            value={adjustReason}
                            onChange={(e) => setAdjustReason(e.target.value)}
                            className="input"
                            rows={3}
                            placeholder="e.g., Inventory count adjustment, Items found damaged, Shrinkage..."
                        />
                    </div>

                    {/* Warning */}
                    {adjustQuantity && parseInt(adjustQuantity) < 0 && Math.abs(parseInt(adjustQuantity)) >= selectedBatch.currentQuantity && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
                            <AlertTriangle className="text-yellow-600 mt-0.5" size={16} />
                            <p className="text-sm text-yellow-800">
                                This will deplete the entire batch (set quantity to 0).
                            </p>
                        </div>
                    )}
                </div>
            </Modal>

            {/* Update Status Modal */}
            <Modal
                isOpen={showStatusModal}
                onClose={() => {
                    setShowStatusModal(false);
                    resetForms();
                }}
                title={`Mark Batch as ${newStatus ? newStatus.charAt(0).toUpperCase() + newStatus.slice(1) : ''}`}
                size="md"
                footer={
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowStatusModal(false);
                                resetForms();
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant={newStatus === 'damaged' || newStatus === 'expired' ? 'danger' : 'primary'}
                            onClick={handleUpdateStatus}
                            loading={isSubmitting}
                        >
                            Confirm
                        </Button>
                    </div>
                }
            >
                <div className="space-y-4">
                    {/* Warning */}
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="text-red-600 mt-0.5" size={20} />
                            <div>
                                <p className="font-medium text-red-800">This action will:</p>
                                <ul className="text-sm text-red-700 mt-1 list-disc ml-4">
                                    <li>Set batch quantity to <strong>0</strong></li>
                                    <li>Reduce product stock by <strong>{selectedBatch.currentQuantity}</strong> units</li>
                                    <li>Mark batch status as <strong>{newStatus}</strong></li>
                                    <li>Create an audit trail record</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Batch Info */}
                    <div className="bg-gray-50 rounded-lg p-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-gray-500">Product</p>
                                <p className="font-medium">{selectedBatch.product?.name || productName}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Batch Number</p>
                                <p className="font-medium">{selectedBatch.batchNumber}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Current Quantity</p>
                                <p className="font-medium text-red-600">{selectedBatch.currentQuantity} units</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Value at Cost</p>
                                <p className="font-medium">₹{formatNumber(selectedBatch.currentQuantity * selectedBatch.costPrice)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Status Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            New Status
                        </label>
                        <div className="flex gap-2">
                            {['damaged', 'expired', 'returned'].map((status) => (
                                <button
                                    key={status}
                                    onClick={() => setNewStatus(status)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                        newStatus === status
                                            ? status === 'returned' 
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-red-600 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    {status.charAt(0).toUpperCase() + status.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Reason */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Reason <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            value={statusReason}
                            onChange={(e) => setStatusReason(e.target.value)}
                            className="input"
                            rows={3}
                            placeholder={
                                newStatus === 'damaged' ? 'e.g., Water damage, Broken packaging, Contamination...' :
                                newStatus === 'expired' ? 'e.g., Past expiry date, Quality degradation...' :
                                'e.g., Supplier return, Quality issue return...'
                            }
                        />
                    </div>
                </div>
            </Modal>
        </>
    );
};

export default BatchActionsModals;







