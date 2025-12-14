import React, { useRef, useEffect, useImperativeHandle, useState } from 'react';
import { format, parse, isValid } from 'date-fns';

/**
 * Custom DateInput component that always displays dates in dd/mm/yyyy format
 * regardless of browser locale, while storing values in YYYY-MM-DD format for backend
 */
const DateInput = React.forwardRef(({
    label,
    value, // Expected in YYYY-MM-DD format (ISO date string)
    onChange,
    onBlur,
    placeholder = 'dd/mm/yyyy',
    error,
    disabled = false,
    required = false,
    className = '',
    min, // Expected in YYYY-MM-DD format
    max, // Expected in YYYY-MM-DD format
    ...props
}, ref) => {
    const inputRef = useRef(null);
    const [displayValue, setDisplayValue] = useState('');

    // Combine internal ref with forwarded ref
    useImperativeHandle(ref, () => inputRef.current, []);

    // Convert YYYY-MM-DD to dd/mm/yyyy for display
    const formatForDisplay = (isoDate) => {
        if (!isoDate) return '';
        try {
            const date = parse(isoDate, 'yyyy-MM-dd', new Date());
            if (isValid(date)) {
                return format(date, 'dd/MM/yyyy');
            }
        } catch (error) {
            console.error('Date formatting error:', error);
        }
        return '';
    };

    // Convert dd/mm/yyyy to YYYY-MM-DD for backend
    const parseFromDisplay = (displayValue) => {
        if (!displayValue || !displayValue.trim()) return '';
        
        // Remove any non-digit characters except slashes
        const cleaned = displayValue.replace(/[^\d/]/g, '');
        
        // Try to parse dd/mm/yyyy format
        try {
            const date = parse(cleaned, 'dd/MM/yyyy', new Date());
            if (isValid(date)) {
                return format(date, 'yyyy-MM-dd');
            }
        } catch (error) {
            // If parsing fails, return empty string
        }
        return '';
    };

    // Sync display value with prop value
    useEffect(() => {
        const formatted = formatForDisplay(value || '');
        setDisplayValue(formatted);
    }, [value]);

    // Handle input change - allow user to type dd/mm/yyyy
    const handleChange = (e) => {
        const inputValue = e.target.value;
        
        // Allow empty input
        if (!inputValue) {
            setDisplayValue('');
            onChange({ ...e, target: { ...e.target, value: '' } });
            return;
        }

        // Auto-format as user types (add slashes automatically)
        let formatted = inputValue.replace(/[^\d]/g, '');
        
        if (formatted.length > 2) {
            formatted = formatted.slice(0, 2) + '/' + formatted.slice(2);
        }
        if (formatted.length > 5) {
            formatted = formatted.slice(0, 5) + '/' + formatted.slice(5, 9);
        }

        // Update the display value
        setDisplayValue(formatted);
        
        // Only parse and convert to ISO format if we have a complete date (10 characters: dd/mm/yyyy)
        if (formatted.length === 10) {
            const isoDate = parseFromDisplay(formatted);
            if (isoDate) {
                onChange({ ...e, target: { ...e.target, value: isoDate } });
            }
        }
        // If the date is incomplete, don't call onChange to avoid clearing the parent's value
    };

    // Handle blur - validate and format the date
    const handleBlur = (e) => {
        const inputValue = displayValue;
        
        if (!inputValue || !inputValue.trim()) {
            if (onBlur) onBlur(e);
            return;
        }

        // Parse the input value
        const isoDate = parseFromDisplay(inputValue);
        
        if (isoDate) {
            // Validate min date
            if (min && isoDate < min) {
                const minDisplay = formatForDisplay(min);
                setDisplayValue(minDisplay);
                onChange({ ...e, target: { ...e.target, value: min } });
            }
            // Validate max date
            else if (max && isoDate > max) {
                const maxDisplay = formatForDisplay(max);
                setDisplayValue(maxDisplay);
                onChange({ ...e, target: { ...e.target, value: max } });
            }
            // Format correctly
            else {
                const formatted = formatForDisplay(isoDate);
                setDisplayValue(formatted);
                onChange({ ...e, target: { ...e.target, value: isoDate } });
            }
        } else {
            // Invalid date, clear the field
            setDisplayValue('');
            onChange({ ...e, target: { ...e.target, value: '' } });
        }

        if (onBlur) onBlur(e);
    };

    return (
        <div className={`mb-4 ${className}`}>
            {label && (
                <label htmlFor={props.name || props.id} className="block text-sm font-medium text-gray-700 mb-1">
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}
            <div className="relative">
                <input
                    ref={inputRef}
                    type="text"
                    id={props.name || props.id}
                    name={props.name}
                    value={displayValue}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder={placeholder}
                    disabled={disabled}
                    required={required}
                    maxLength={10}
                    className={`
                        w-full px-3 py-2 border rounded-lg transition-all duration-200
                        focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                        disabled:bg-gray-100 disabled:cursor-not-allowed
                        ${error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'}
                    `}
                    {...props}
                />
            </div>
            {error && (
                <p className="mt-1 text-sm text-red-600">{error}</p>
            )}
            {!error && (
                <p className="text-xs text-gray-500 mt-1">
                    Format: dd/mm/yyyy
                </p>
            )}
        </div>
    );
});

DateInput.displayName = 'DateInput';

export default DateInput;

