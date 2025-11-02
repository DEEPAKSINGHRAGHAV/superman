import React, { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import Input from './Input';
import Loading from './Loading';
import { productsAPI } from '../../services/api';
import { formatCurrency } from '../../utils/helpers';
import toast from 'react-hot-toast';

const ProductSearch = React.forwardRef(({
    onProductSelect,
    placeholder = "Search products by name, SKU, or barcode...",
    showStockInfo = true,
    showPrice = true,
    maxResults = 20,
    minSearchLength = 1,
    debounceMs = 300,
    className = "",
    autoFocus = false,
    disabled = false,
    allowOutOfStock = false  // When true, allows selection of out-of-stock products (e.g., in purchase orders)
}, ref) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const resultsContainerRef = useRef(null);
    const itemRefs = useRef([]);

    // Reset highlighted index when search query changes
    useEffect(() => {
        setHighlightedIndex(-1);
    }, [searchQuery]);

    // Reset highlighted index when search results change
    useEffect(() => {
        setHighlightedIndex(-1);
        itemRefs.current = [];
    }, [searchResults]);

    // Scroll highlighted item into view
    useEffect(() => {
        if (highlightedIndex >= 0 && itemRefs.current[highlightedIndex]) {
            itemRefs.current[highlightedIndex].scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
            });
        }
    }, [highlightedIndex]);

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
        setHighlightedIndex(-1);
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

    const handleKeyDown = (e) => {
        if (!showResults || searchResults.length === 0) {
            return;
        }

        // Filter out disabled products for keyboard navigation
        const selectableResults = searchResults.filter((product) => {
            const isOutOfStock = (product.currentStock || 0) === 0;
            return allowOutOfStock || !isOutOfStock;
        });

        if (selectableResults.length === 0) {
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setHighlightedIndex((prev) => {
                    const nextIndex = prev < selectableResults.length - 1 ? prev + 1 : prev;
                    return nextIndex;
                });
                break;

            case 'ArrowUp':
                e.preventDefault();
                setHighlightedIndex((prev) => {
                    const nextIndex = prev > 0 ? prev - 1 : -1;
                    return nextIndex;
                });
                break;

            case 'Enter':
                e.preventDefault();
                if (highlightedIndex >= 0 && highlightedIndex < selectableResults.length) {
                    handleProductSelect(selectableResults[highlightedIndex]);
                } else if (selectableResults.length > 0) {
                    // Select first item if none highlighted
                    handleProductSelect(selectableResults[0]);
                }
                break;

            case 'Escape':
                e.preventDefault();
                setShowResults(false);
                setHighlightedIndex(-1);
                break;

            default:
                break;
        }
    };

    const handleMouseEnter = (index) => {
        // Update highlighted index when mouse hovers, keeping keyboard and mouse in sync
        setHighlightedIndex(index);
    };

    const getStockStatus = (stock, minStock = 0) => {
        if (stock === 0) return { text: 'Out of Stock', class: 'bg-red-100 text-red-700' };
        if (stock <= minStock) return { text: 'Low Stock', class: 'bg-orange-100 text-orange-700' };
        return { text: `Stock: ${stock}`, class: 'bg-green-100 text-green-700' };
    };

    return (
        <div className={`relative ${className}`}>
            <Input
                ref={ref}
                placeholder={placeholder}
                icon={<Search size={18} />}
                value={searchQuery}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
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

            {!isSearching && showResults && searchResults.length > 0 && (() => {
                // Calculate selectable results once outside the map for efficiency
                const selectableResults = searchResults.filter((p) => {
                    if (!p || !p._id || !p.name) return false;
                    const pOutOfStock = (p.currentStock || 0) === 0;
                    return allowOutOfStock || !pOutOfStock;
                });

                // Create a map for quick lookup of selectable index by product ID
                const productToSelectableIndex = new Map();
                selectableResults.forEach((p, idx) => {
                    productToSelectableIndex.set(p._id, idx);
                });

                return (
                    <div
                        ref={resultsContainerRef}
                        className="absolute top-full left-0 right-0 z-10 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-64 overflow-y-auto"
                    >
                        {searchResults.map((product, index) => {
                            if (!product || !product._id || !product.name) return null;

                            const isOutOfStock = (product.currentStock || 0) === 0;
                            const isLowStock = (product.currentStock || 0) <= 5;
                            const stockStatus = getStockStatus(product.currentStock, product.minStockLevel || 0);

                            // Only disable out-of-stock products if allowOutOfStock is false
                            // This allows purchase orders to add any product regardless of stock level
                            const shouldDisable = !allowOutOfStock && isOutOfStock;

                            // Get selectable index from the map
                            const selectableIndex = productToSelectableIndex.get(product._id);
                            const isHighlighted = selectableIndex !== undefined && selectableIndex === highlightedIndex;

                            return (
                                <button
                                    key={product._id}
                                    ref={(el) => {
                                        if (el && !shouldDisable && selectableIndex !== undefined) {
                                            itemRefs.current[selectableIndex] = el;
                                        }
                                    }}
                                    onClick={() => !shouldDisable && handleProductSelect(product)}
                                    onMouseEnter={() => !shouldDisable && selectableIndex !== undefined && handleMouseEnter(selectableIndex)}
                                    disabled={shouldDisable}
                                    className={`w-full p-3 text-left transition-colors border-b border-gray-100 last:border-b-0 ${shouldDisable
                                            ? 'opacity-60 cursor-not-allowed'
                                            : isHighlighted
                                                ? 'bg-blue-50 hover:bg-blue-100'
                                                : 'hover:bg-gray-50'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <p className={`font-medium ${shouldDisable ? 'text-gray-500' : 'text-gray-900'}`}>
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
                                                <p className={`text-lg font-bold ${shouldDisable ? 'text-gray-500' : 'text-blue-600'}`}>
                                                    {formatCurrency(product.sellingPrice || 0)}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                );
            })()}
        </div>
    );
});

ProductSearch.displayName = 'ProductSearch';

export default ProductSearch;
