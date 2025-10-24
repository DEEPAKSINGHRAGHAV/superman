import React from 'react';
import { Package } from 'lucide-react';
import Button from './Button';

const EmptyState = ({
    icon: Icon = Package,
    title = 'No data found',
    description = 'Get started by creating a new item',
    actionLabel,
    onAction,
}) => {
    return (
        <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="bg-gray-100 rounded-full p-6 mb-4">
                <Icon size={48} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
            <p className="text-gray-600 text-center mb-6 max-w-md">{description}</p>
            {actionLabel && onAction && (
                <Button variant="primary" onClick={onAction}>
                    {actionLabel}
                </Button>
            )}
        </div>
    );
};

export default EmptyState;

