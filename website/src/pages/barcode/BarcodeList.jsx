import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Download, CheckSquare, Square, Search } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { productsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { debounce } from '../../utils/helpers';
import * as XLSX from 'xlsx';

const BarcodeList = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedProducts, setSelectedProducts] = useState(new Set());
    const [searchInput, setSearchInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const parentRef = useRef(null);

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const response = await productsAPI.getCustomBarcodes();

            if (response.success) {
                setProducts(response.data || []);
            }
        } catch (error) {
            toast.error('Failed to load products');
            console.error('Products fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    // Filter products based on search query
    const filteredProducts = useMemo(() => {
        if (!searchQuery.trim()) {
            return products;
        }

        const query = searchQuery.toLowerCase().trim();
        return products.filter((product) => {
            const name = (product.name || '').toLowerCase();
            const barcode = (product.barcode || '').toLowerCase();
            const price = (product.sellingPrice || 0).toString();

            return (
                name.includes(query) ||
                barcode.includes(query) ||
                price.includes(query)
            );
        });
    }, [products, searchQuery]);

    // Virtualizer setup
    const virtualizer = useVirtualizer({
        count: filteredProducts.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 65,
        overscan: 5,
    });

    const debouncedSetSearchQuery = debounce((value) => {
        setSearchQuery(value);
    }, 300);

    const handleSearch = (value) => {
        // Remove apostrophes (from Excel copy-paste)
        const cleanValue = value.replace(/'/g, '');
        setSearchInput(cleanValue);
        debouncedSetSearchQuery(cleanValue);
    };

    const handleSelectAll = () => {
        const filteredIds = new Set(filteredProducts.map((p) => p._id));
        const allSelected = filteredProducts.every((p) => selectedProducts.has(p._id));

        if (allSelected) {
            // Deselect all filtered products
            const newSelected = new Set(selectedProducts);
            filteredIds.forEach((id) => newSelected.delete(id));
            setSelectedProducts(newSelected);
        } else {
            // Select all filtered products
            const newSelected = new Set(selectedProducts);
            filteredIds.forEach((id) => newSelected.add(id));
            setSelectedProducts(newSelected);
        }
    };

    const handleSelectProduct = (productId) => {
        const newSelected = new Set(selectedProducts);
        if (newSelected.has(productId)) {
            newSelected.delete(productId);
        } else {
            newSelected.add(productId);
        }
        setSelectedProducts(newSelected);
    };

    const handleDownload = () => {
        if (selectedProducts.size === 0) {
            toast.error('Please select at least one product to download');
            return;
        }

        try {
            // Get selected products by matching IDs
            const selectedData = products
                .filter((product) => selectedProducts.has(product._id))
                .map((product) => ({
                    Name: product.name || '',
                    Price: product.sellingPrice || 0,
                    Barcode: product.barcode ? `'${product.barcode}` : '',
                }));

            // Create workbook and worksheet
            const worksheet = XLSX.utils.json_to_sheet(selectedData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');

            // Set column widths
            worksheet['!cols'] = [
                { wch: 30 }, // Name
                { wch: 15 }, // Price
                { wch: 20 }, // Barcode
            ];

            // Generate Excel file
            const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `barcode-products-${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            toast.success(`Downloaded ${selectedProducts.size} product(s) successfully`);
        } catch (error) {
            toast.error('Failed to download Excel file');
            console.error('Download error:', error);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Barcode Products</h1>
                    <p className="text-gray-600 mt-1">
                        Products with custom barcodes starting with "21"
                    </p>
                </div>
                <Button
                    variant="primary"
                    icon={<Download size={18} />}
                    onClick={handleDownload}
                    className="mt-4 sm:mt-0"
                    disabled={selectedProducts.size === 0}
                >
                    Download Excel ({selectedProducts.size})
                </Button>
            </div>

            {/* Search */}
            <Card>
                <Input
                    placeholder="Search by name, barcode, or price..."
                    icon={<Search size={18} />}
                    value={searchInput}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="mb-0"
                />
            </Card>

            {/* Products List */}
            <Card noPadding>
                {loading ? (
                    <div className="p-8 text-center text-gray-500">Loading products...</div>
                ) : products.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        No products found with barcodes starting with "21"
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        No products match your search query
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        {/* Table Header - Fixed */}
                        <div className="bg-gray-50 border-b border-gray-200">
                            <div className="flex min-w-[800px]">
                                <div className="w-12 px-6 py-3 flex items-center">
                                    <button
                                        onClick={handleSelectAll}
                                        className="flex items-center justify-center"
                                        title={
                                            filteredProducts.every((p) => selectedProducts.has(p._id))
                                                ? 'Deselect All'
                                                : 'Select All'
                                        }
                                    >
                                        {filteredProducts.every((p) => selectedProducts.has(p._id)) &&
                                            filteredProducts.length > 0 ? (
                                            <CheckSquare size={20} className="text-primary-600" />
                                        ) : (
                                            <Square size={20} className="text-gray-400" />
                                        )}
                                    </button>
                                </div>
                                <div className="flex-1 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Name
                                </div>
                                <div className="flex-1 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Price
                                </div>
                                <div className="flex-1 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Barcode
                                </div>
                            </div>
                        </div>

                        {/* Virtualized List */}
                        <div
                            ref={parentRef}
                            className="bg-white overflow-auto"
                            style={{
                                height: Math.min(600, filteredProducts.length * 65),
                                maxHeight: '600px',
                            }}
                        >
                            <div
                                style={{
                                    height: `${virtualizer.getTotalSize()}px`,
                                    width: '100%',
                                    position: 'relative',
                                }}
                            >
                                {virtualizer.getVirtualItems().map((virtualRow) => {
                                    const product = filteredProducts[virtualRow.index];
                                    const isSelected = selectedProducts.has(product._id);
                                    
                                    return (
                                        <div
                                            key={virtualRow.key}
                                            style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                width: '100%',
                                                height: `${virtualRow.size}px`,
                                                transform: `translateY(${virtualRow.start}px)`,
                                                minWidth: '800px',
                                            }}
                                            className={`flex items-center border-b border-gray-200 hover:bg-gray-50 ${
                                                isSelected ? 'bg-primary-50' : 'bg-white'
                                            }`}
                                        >
                                            <div className="w-12 px-6 flex items-center">
                                                <button
                                                    onClick={() => handleSelectProduct(product._id)}
                                                    className="flex items-center justify-center"
                                                >
                                                    {isSelected ? (
                                                        <CheckSquare size={20} className="text-primary-600" />
                                                    ) : (
                                                        <Square size={20} className="text-gray-400" />
                                                    )}
                                                </button>
                                            </div>
                                            <div className="flex-1 px-6 py-4">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {product.name || 'N/A'}
                                                </div>
                                            </div>
                                            <div className="flex-1 px-6 py-4">
                                                <div className="text-sm text-gray-900">
                                                    ₹{product.sellingPrice?.toFixed(2) || '0.00'}
                                                </div>
                                            </div>
                                            <div className="flex-1 px-6 py-4">
                                                <div className="text-sm font-mono text-gray-900">
                                                    {product.barcode || 'N/A'}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Footer Info */}
                        {searchQuery && (
                            <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-600">
                                Showing {filteredProducts.length} of {products.length} products
                            </div>
                        )}
                    </div>
                )}
            </Card>
        </div>
    );
};

export default BarcodeList;

