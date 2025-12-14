import { useState, useCallback } from 'react';
import { batchesAPI } from '../services/api';
import toast from 'react-hot-toast';

/**
 * Custom hook for batch actions (adjust quantity, update status, deplete)
 * Follows Single Responsibility Principle - handles only batch action logic
 * 
 * @param {Object} options - Configuration options
 * @param {Function} options.onSuccess - Callback after successful action (e.g., refresh data)
 * @returns {Object} Batch action state and handlers
 */
const useBatchActions = ({ onSuccess } = {}) => {
    // Modal visibility states
    const [showActionsModal, setShowActionsModal] = useState(false);
    const [showAdjustModal, setShowAdjustModal] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);

    // Selected batch and form states
    const [selectedBatch, setSelectedBatch] = useState(null);
    const [adjustQuantity, setAdjustQuantity] = useState('');
    const [adjustReason, setAdjustReason] = useState('');
    const [newStatus, setNewStatus] = useState('');
    const [statusReason, setStatusReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Reset all form states
    const resetForms = useCallback(() => {
        setSelectedBatch(null);
        setAdjustQuantity('');
        setAdjustReason('');
        setNewStatus('');
        setStatusReason('');
    }, []);

    // Close all modals
    const closeAllModals = useCallback(() => {
        setShowActionsModal(false);
        setShowAdjustModal(false);
        setShowStatusModal(false);
        resetForms();
    }, [resetForms]);

    // Open actions modal for a batch
    const openActionsModal = useCallback((batch) => {
        setSelectedBatch(batch);
        setShowActionsModal(true);
    }, []);

    // Open adjust quantity modal
    const openAdjustModal = useCallback((batch = null) => {
        if (batch) setSelectedBatch(batch);
        setShowActionsModal(false);
        setShowAdjustModal(true);
    }, []);

    // Open status update modal
    const openStatusModal = useCallback((batch = null, status = '') => {
        if (batch) setSelectedBatch(batch);
        setNewStatus(status);
        setShowActionsModal(false);
        setShowStatusModal(true);
    }, []);

    // Handle quantity adjustment
    const handleAdjustQuantity = useCallback(async () => {
        if (!adjustQuantity || isNaN(parseInt(adjustQuantity))) {
            toast.error('Please enter a valid quantity');
            return;
        }

        if (!adjustReason.trim()) {
            toast.error('Please provide a reason for adjustment');
            return;
        }

        try {
            setIsSubmitting(true);
            const response = await batchesAPI.adjust(selectedBatch._id, {
                quantity: parseInt(adjustQuantity),
                reason: adjustReason,
            });

            if (response.success) {
                toast.success(`Batch quantity adjusted by ${adjustQuantity}`);
                setShowAdjustModal(false);
                resetForms();
                onSuccess?.();
            }
        } catch (error) {
            toast.error(error.message || 'Failed to adjust quantity');
        } finally {
            setIsSubmitting(false);
        }
    }, [adjustQuantity, adjustReason, selectedBatch, resetForms, onSuccess]);

    // Handle status update
    const handleUpdateStatus = useCallback(async () => {
        if (!newStatus) {
            toast.error('Please select a status');
            return;
        }

        if (!statusReason.trim()) {
            toast.error('Please provide a reason');
            return;
        }

        try {
            setIsSubmitting(true);
            const response = await batchesAPI.updateStatus(
                selectedBatch._id,
                newStatus,
                statusReason
            );

            if (response.success) {
                toast.success(`Batch marked as ${newStatus}`);
                setShowStatusModal(false);
                resetForms();
                onSuccess?.();
            }
        } catch (error) {
            toast.error(error.message || 'Failed to update status');
        } finally {
            setIsSubmitting(false);
        }
    }, [newStatus, statusReason, selectedBatch, resetForms, onSuccess]);

    // Quick deplete (set quantity to 0)
    const handleQuickDeplete = useCallback(async () => {
        if (!selectedBatch) return;

        if (!window.confirm(
            `Are you sure you want to deplete entire batch ${selectedBatch.batchNumber}?\n\nThis will set quantity to 0 and cannot be undone.`
        )) {
            return;
        }

        try {
            setIsSubmitting(true);
            const response = await batchesAPI.adjust(selectedBatch._id, {
                quantity: -selectedBatch.currentQuantity,
                reason: 'Full batch depletion - manual adjustment',
            });

            if (response.success) {
                toast.success(`Batch ${selectedBatch.batchNumber} depleted`);
                setShowActionsModal(false);
                resetForms();
                onSuccess?.();
            }
        } catch (error) {
            toast.error(error.message || 'Failed to deplete batch');
        } finally {
            setIsSubmitting(false);
        }
    }, [selectedBatch, resetForms, onSuccess]);

    return {
        // Modal states
        showActionsModal,
        showAdjustModal,
        showStatusModal,
        setShowActionsModal,
        setShowAdjustModal,
        setShowStatusModal,

        // Selected batch
        selectedBatch,
        setSelectedBatch,

        // Form states
        adjustQuantity,
        setAdjustQuantity,
        adjustReason,
        setAdjustReason,
        newStatus,
        setNewStatus,
        statusReason,
        setStatusReason,
        isSubmitting,

        // Actions
        openActionsModal,
        openAdjustModal,
        openStatusModal,
        handleAdjustQuantity,
        handleUpdateStatus,
        handleQuickDeplete,
        resetForms,
        closeAllModals,
    };
};

export default useBatchActions;

