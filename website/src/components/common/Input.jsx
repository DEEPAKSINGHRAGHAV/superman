import React, { useRef, useEffect, useImperativeHandle } from 'react';

const Input = React.forwardRef(({
    label,
    type = 'text',
    name,
    value,
    onChange,
    onBlur,
    placeholder,
    error,
    disabled = false,
    required = false,
    className = '',
    icon,
    ...props
}, ref) => {
    const inputRef = useRef(null);

    // Combine internal ref with forwarded ref
    useImperativeHandle(ref, () => inputRef.current, []);

    useEffect(() => {
        const input = inputRef.current;
        if (!input || type !== 'number') return;

        const handleWheel = (e) => {
            // Prevent scroll from incrementing/decrementing number inputs when focused
            if (document.activeElement === input) {
                e.preventDefault();
                e.stopPropagation();
            }
        };

        input.addEventListener('wheel', handleWheel, { passive: false });

        return () => {
            input.removeEventListener('wheel', handleWheel);
        };
    }, [type]);

    return (
        <div className={`mb-4 ${className}`}>
            {label && (
                <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}
            <div className="relative">
                {icon && (
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        {icon}
                    </div>
                )}
                <input
                    ref={inputRef}
                    type={type}
                    id={name}
                    name={name}
                    value={value}
                    onChange={onChange}
                    onBlur={onBlur}
                    placeholder={placeholder}
                    disabled={disabled}
                    required={required}
                    className={`
            w-full px-3 py-2 border rounded-lg transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
            disabled:bg-gray-100 disabled:cursor-not-allowed
            ${icon ? 'pl-10' : ''}
            ${error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'}
          `}
                    {...props}
                />
            </div>
            {error && (
                <p className="mt-1 text-sm text-red-600">{error}</p>
            )}
        </div>
    );
});

Input.displayName = 'Input';

export default Input;

