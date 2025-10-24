import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

const Table = ({
    columns,
    data,
    loading = false,
    onSort,
    sortColumn,
    sortOrder,
    onRowClick,
    emptyMessage = 'No data available',
}) => {
    const handleSort = (column) => {
        if (column.sortable && onSort) {
            const newOrder =
                sortColumn === column.key && sortOrder === 'asc' ? 'desc' : 'asc';
            onSort(column.key, newOrder);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="flex items-center justify-center py-12 text-gray-500">
                {emptyMessage}
            </div>
        );
    }

    return (
        <div className="overflow-x-auto custom-scrollbar">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        {columns.map((column) => (
                            <th
                                key={column.key}
                                scope="col"
                                className={`
                  px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider
                  ${column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''}
                `}
                                onClick={() => column.sortable && handleSort(column)}
                            >
                                <div className="flex items-center space-x-1">
                                    <span>{column.label}</span>
                                    {column.sortable && sortColumn === column.key && (
                                        <span>
                                            {sortOrder === 'asc' ? (
                                                <ChevronUp size={16} />
                                            ) : (
                                                <ChevronDown size={16} />
                                            )}
                                        </span>
                                    )}
                                </div>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {data.map((row, rowIndex) => (
                        <tr
                            key={row.id || rowIndex}
                            className={`
                ${onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''}
                transition-colors duration-150
              `}
                            onClick={() => onRowClick && onRowClick(row)}
                        >
                            {columns.map((column) => (
                                <td
                                    key={`${row.id || rowIndex}-${column.key}`}
                                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                                >
                                    {column.render ? column.render(row) : row[column.key]}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default Table;

