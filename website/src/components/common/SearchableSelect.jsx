import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, X, Search } from 'lucide-react';

const SearchableSelect = ({
    label,
    name,
    value,
    onChange,
    options = [],
    placeholder = 'Select...',
    error,
    disabled = false,
    required = false,
    className = '',
    getOptionValue = (option) => option.value,
    getOptionLabel = (option) => option.label,
    searchable = true,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const wrapperRef = useRef(null);
    const inputRef = useRef(null);
    const dropdownRef = useRef(null);

    // Find selected option
    const selectedOption = options.find(opt => getOptionValue(opt) === value);

    // Filter options based on search term
    const filteredOptions = searchable && searchTerm
        ? options.filter(option => {
            const label = getOptionLabel(option).toLowerCase();
            return label.includes(searchTerm.toLowerCase());
        })
        : options;

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
                setSearchTerm('');
                setHighlightedIndex(-1);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // Focus search input when dropdown opens
    useEffect(() => {
        if (isOpen && inputRef.current && searchable) {
            inputRef.current.focus();
        }
    }, [isOpen, searchable]);

    // Scroll highlighted item into view
    useEffect(() => {
        if (highlightedIndex >= 0 && dropdownRef.current) {
            const highlightedElement = dropdownRef.current.children[highlightedIndex];
            if (highlightedElement) {
                highlightedElement.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [highlightedIndex]);

    const handleToggle = () => {
        if (!disabled) {
            setIsOpen(!isOpen);
            if (!isOpen) {
                setSearchTerm('');
                setHighlightedIndex(-1);
            }
        }
    };

    const handleSelect = (option) => {
        const optionValue = getOptionValue(option);
        onChange({
            target: {
                name,
                value: optionValue
            }
        });
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
    };

    const handleClear = (e) => {
        e.stopPropagation();
        onChange({
            target: {
                name,
                value: ''
            }
        });
        setSearchTerm('');
    };

    const handleKeyDown = (e) => {
        if (!isOpen) {
            if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
                e.preventDefault();
                setIsOpen(true);
            }
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setHighlightedIndex(prev =>
                    prev < filteredOptions.length - 1 ? prev + 1 : prev
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setHighlightedIndex(prev => (prev > 0 ? prev - 1 : -1));
                break;
            case 'Enter':
                e.preventDefault();
                if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
                    handleSelect(filteredOptions[highlightedIndex]);
                }
                break;
            case 'Escape':
                e.preventDefault();
                setIsOpen(false);
                setSearchTerm('');
                setHighlightedIndex(-1);
                break;
            default:
                break;
        }
    };

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
        setHighlightedIndex(-1);
    };

    return (
        <div className={`mb-4 ${className}`} ref={wrapperRef}>
            {label && (
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}
            <div className="relative">
                {isOpen && searchable ? (
                    <div
                        className={`
                            w-full px-3 py-2 border rounded-lg transition-all duration-200
                            focus-within:outline-none focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent
                            ${error ? 'border-red-500 focus-within:ring-red-500' : 'border-gray-300'}
                            bg-white flex items-center
                        `}
                    >
                        <Search
                            size={16}
                            className="text-gray-400 mr-2 flex-shrink-0"
                        />
                        <input
                            ref={inputRef}
                            type="text"
                            value={searchTerm}
                            onChange={handleSearchChange}
                            onKeyDown={handleKeyDown}
                            placeholder="Search..."
                            className="flex-1 outline-none bg-transparent"
                            onClick={(e) => e.stopPropagation()}
                        />
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsOpen(false);
                                setSearchTerm('');
                                setHighlightedIndex(-1);
                            }}
                            className="text-gray-400 hover:text-gray-600 p-0.5 ml-2 flex-shrink-0"
                            aria-label="Close"
                        >
                            <X size={16} />
                        </button>
                    </div>
                ) : (
                    <div
                        className={`
                            w-full px-3 py-2 border rounded-lg transition-all duration-200
                            focus-within:outline-none focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent
                            disabled:bg-gray-100 disabled:cursor-not-allowed
                            cursor-pointer flex items-center justify-between
                            ${error ? 'border-red-500 focus-within:ring-red-500' : 'border-gray-300'}
                            ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
                        `}
                        onClick={handleToggle}
                        onKeyDown={handleKeyDown}
                        tabIndex={disabled ? -1 : 0}
                        role="combobox"
                        aria-expanded={isOpen}
                        aria-haspopup="listbox"
                    >
                        <span className={`flex-1 truncate ${!selectedOption && !value ? 'text-gray-500' : ''}`}>
                            {selectedOption ? getOptionLabel(selectedOption) : value || placeholder}
                        </span>
                        <div className="flex items-center space-x-1 ml-2">
                            {value && !disabled && (
                                <button
                                    type="button"
                                    onClick={handleClear}
                                    className="text-gray-400 hover:text-gray-600 p-0.5"
                                    aria-label="Clear selection"
                                >
                                    <X size={16} />
                                </button>
                            )}
                            <ChevronDown
                                size={18}
                                className={`text-gray-400 transition-transform ${isOpen ? 'transform rotate-180' : ''}`}
                            />
                        </div>
                    </div>
                )}

                {isOpen && (
                    <div
                        className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden"
                        ref={dropdownRef}
                    >
                        <div className="max-h-60 overflow-y-auto">
                            {filteredOptions.length > 0 ? (
                                filteredOptions.map((option, index) => {
                                    const optionValue = getOptionValue(option);
                                    const optionLabel = getOptionLabel(option);
                                    const isHighlighted = index === highlightedIndex;
                                    const isSelected = optionValue === value;

                                    return (
                                        <div
                                            key={optionValue}
                                            className={`
                                                px-3 py-2 cursor-pointer transition-colors
                                                ${isHighlighted ? 'bg-primary-50 text-primary-900' : 'hover:bg-gray-50'}
                                                ${isSelected ? 'bg-primary-100 font-medium' : ''}
                                            `}
                                            onClick={() => handleSelect(option)}
                                            onMouseEnter={() => setHighlightedIndex(index)}
                                        >
                                            {optionLabel}
                                        </div>
                                    );
                                })
                            ) : options.length === 0 ? (
                                <div className="px-3 py-4 text-center text-gray-500 text-sm">
                                    No options available
                                </div>
                            ) : (
                                <div className="px-3 py-4 text-center text-gray-500 text-sm">
                                    No options found matching "{searchTerm}"
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        </div>
    );
};

export default SearchableSelect;

