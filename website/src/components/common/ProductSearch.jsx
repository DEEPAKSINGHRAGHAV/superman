import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import Input from './Input';
import Loading from './Loading';
import { productsAPI } from '../../services/api';
import { formatCurrency } from '../../utils/helpers';
import toast from 'react-hot-toast';

const ProductSearch = ({
    onProductSelect,
    placeholder = "Search products by name, SKU, or barcode...",
    showStockInfo = true,
    showPrice = true,
    maxResults = 20,
    minSearchLength = 1,
    debounceMs = 300,
    className = "",
    autoFocus = false,
    disabled = false
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showResults, setShowResults] = useState(false);

    // Debounced search effect
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery && searchQuery.length >= minSearchLength) {
                performSearch(searchQuery);
            } else if (searchQuery.length === 0) {
                setSearchResults([]);
                setShowResults(false);
            }
        }, debounceMs);

        return () => clearTimeout(timer);
    }, [searchQuery, minSearchLength, debounceMs]);

    const performSearch = async (query) => {
        try {
            setIsSearching(true);
            setShowResults(true);

            // Use the dedicated search endpoint for consistency
            const response = await productsAPI.search(query);

            if (response.success && response.data) {
                // Filter and limit results consistently
                const validProducts = Array.isArray(response.data)
                    ? response.data
                        .filter(product =>
                            product &&
                            product._id &&
                            product.name
                            // Don't filter by stock - show all products including out of stock
                        )
                        .slice(0, maxResults)
                    : [];

                setSearchResults(validProducts);
            } else {
                setSearchResults([]);
            }
        } catch (error) {
            console.error('Product search error:', error);
            toast.error('Search failed. Please try again.');
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    const handleInputChange = (e) => {
        setSearchQuery(e.target.value);
    };

    const handleProductSelect = (product) => {
        if (onProductSelect) {
            onProductSelect(product);
        }
        setSearchQuery('');
        setSearchResults([]);
        setShowResults(false);
    };

    const handleInputFocus = () => {
        if (searchResults.length > 0) {
            setShowResults(true);
        }
    };

    const handleInputBlur = () => {
        // Delay hiding results to allow for clicks
        setTimeout(() => setShowResults(false), 150);
    };

    const getStockStatus = (stock, minStock = 0) => {
        if (stock === 0) return { text: 'Out of Stock', class: 'bg-red-100 text-red-700' };
        if (stock <= minStock) return { text: 'Low Stock', class: 'bg-orange-100 text-orange-700' };
        return { text: `Stock: ${stock}`, class: 'bg-green-100 text-green-700' };
    };

    return (
        <div className={`relative ${className}`}>
            <Input
                placeholder={placeholder}
                icon={<Search size={18} />}
                value={searchQuery}
                onChange={handleInputChange}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                autoFocus={autoFocus}
                disabled={disabled}
            />

            {isSearching && (
                <div className="absolute top-full left-0 right-0 z-10 bg-white border border-gray-200 rounded-lg shadow-lg mt-1">
                    <Loading text="Searching..." />
                </div>
            )}

            {!isSearching && showResults && searchQuery && searchResults.length === 0 && (
                <div className="absolute top-full left-0 right-0 z-10 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 p-4 text-center text-gray-500">
                    <p>No products found for "{searchQuery}"</p>
                    <p className="text-sm mt-1">Try a different search term</p>
                </div>
            )}

            {!isSearching && showResults && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-10 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-64 overflow-y-auto">
                    {searchResults.map((product) => {
                        if (!product || !product._id || !product.name) return null;

                        const isOutOfStock = (product.currentStock || 0) === 0;
                        const isLowStock = (product.currentStock || 0) <= 5;
                        const stockStatus = getStockStatus(product.currentStock, product.minStockLevel || 0);

                        return (
                            <button
                                key={product._id}
                                onClick={() => !isOutOfStock && handleProductSelect(product)}
                                disabled={isOutOfStock}
                                className={`w-full p-3 text-left transition-colors border-b border-gray-100 last:border-b-0 ${isOutOfStock
                                        ? 'opacity-60 cursor-not-allowed'
                                        : 'hover:bg-gray-50'
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <p className={`font-medium ${isOutOfStock ? 'text-gray-500' : 'text-gray-900'}`}>
                                            {product.name}
                                        </p>
                                        <p className="text-sm text-gray-600">
                                            {product.sku || 'N/A'} {product.barcode && `• ${product.barcode}`}
                                        </p>
                                        {showStockInfo && (
                                            <div className="mt-1">
                                                <span className={`text-xs px-2 py-1 rounded ${stockStatus.class}`}>
                                                    {stockStatus.text}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    {showPrice && (
                                        <div className="text-right">
                                            <p className={`text-lg font-bold ${isOutOfStock ? 'text-gray-500' : 'text-blue-600'}`}>
                                                {formatCurrency(product.sellingPrice || 0)}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default ProductSearch;
