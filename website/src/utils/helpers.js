import { format, parseISO } from 'date-fns';
import { DATE_FORMAT, DATETIME_FORMAT } from '../config/constants';

/**
 * Format date string
 */
export const formatDate = (date, dateFormat = DATE_FORMAT) => {
    if (!date) return '';
    try {
        const parsedDate = typeof date === 'string' ? parseISO(date) : date;
        return format(parsedDate, dateFormat);
    } catch (error) {
        console.error('Date formatting error:', error);
        return '';
    }
};

/**
 * Format date with time
 */
export const formatDateTime = (date) => {
    return formatDate(date, DATETIME_FORMAT);
};

/**
 * Format currency
 */
export const formatCurrency = (amount, currency = '₹') => {
    if (amount === null || amount === undefined) return `${currency}0`;
    const num = parseFloat(amount);
    const formatted = num.toFixed(2);
    // Remove .00 if decimal part is zero
    if (formatted.endsWith('.00')) {
        return `${currency}${formatted.slice(0, -3)}`;
    }
    return `${currency}${formatted}`;
};

/**
 * Format number with commas
 */
export const formatNumber = (num) => {
    if (num === null || num === undefined) return '0';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

/**
 * Calculate percentage
 */
export const calculatePercentage = (value, total) => {
    if (!total || total === 0) return 0;
    return ((value / total) * 100).toFixed(2);
};

/**
 * Truncate text
 */
export const truncateText = (text, maxLength = 50) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
};

/**
 * Get initials from name
 */
export const getInitials = (name) => {
    if (!name) return '';
    const parts = name.split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

/**
 * Debounce function
 */
export const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

/**
 * Download file
 */
export const downloadFile = (data, filename, type = 'text/csv') => {
    const blob = new Blob([data], { type });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
};

/**
 * Get status badge color
 */
export const getStatusColor = (status) => {
    const colors = {
        active: 'success',
        inactive: 'gray',
        pending: 'warning',
        approved: 'info',
        received: 'success',
        cancelled: 'danger',
        draft: 'gray',
        true: 'success',
        false: 'gray',
    };
    return colors[status?.toString()?.toLowerCase()] || 'gray';
};

/**
 * Validate email
 */
export const isValidEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
};

/**
 * Validate phone number
 */
export const isValidPhone = (phone) => {
    const regex = /^[\+]?[1-9][\d]{0,15}$/;
    return regex.test(phone);
};

/**
 * Generate random ID
 */
export const generateId = () => {
    return Math.random().toString(36).substr(2, 9);
};

/**
 * Check if object is empty
 */
export const isEmpty = (obj) => {
    return Object.keys(obj).length === 0;
};

/**
 * Deep clone object
 */
export const deepClone = (obj) => {
    return JSON.parse(JSON.stringify(obj));
};

/**
 * Sort array of objects
 */
export const sortBy = (array, key, order = 'asc') => {
    return [...array].sort((a, b) => {
        const aVal = a[key];
        const bVal = b[key];

        if (aVal < bVal) return order === 'asc' ? -1 : 1;
        if (aVal > bVal) return order === 'asc' ? 1 : -1;
        return 0;
    });
};

/**
 * Group array by key
 */
export const groupBy = (array, key) => {
    return array.reduce((result, item) => {
        const group = item[key];
        if (!result[group]) {
            result[group] = [];
        }
        result[group].push(item);
        return result;
    }, {});
};

/**
 * Calculate stock status
 */
export const getStockStatus = (currentStock, minStockLevel) => {
    if (currentStock === 0) return { status: 'Out of Stock', color: 'danger' };
    if (currentStock <= minStockLevel) return { status: 'Low Stock', color: 'warning' };
    return { status: 'In Stock', color: 'success' };
};

/**
 * Calculate days until expiry
 */
export const getDaysUntilExpiry = (expiryDate) => {
    if (!expiryDate) return null;
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
};

/**
 * Get expiry status
 */
export const getExpiryStatus = (expiryDate) => {
    const days = getDaysUntilExpiry(expiryDate);
    if (days === null) return { status: 'N/A', color: 'gray' };
    if (days < 0) return { status: 'Expired', color: 'danger' };
    if (days <= 7) return { status: 'Expiring Soon', color: 'danger' };
    if (days <= 30) return { status: 'Near Expiry', color: 'warning' };
    return { status: 'Good', color: 'success' };
};

