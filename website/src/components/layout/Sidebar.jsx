import React from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    Package,
    Users,
    ShoppingCart,
    Warehouse,
    Tag,
    Folder,
    TrendingUp,
    Settings,
    UserCircle,
    CreditCard,
    AlertTriangle,
    Clock,
    Receipt,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const Sidebar = ({ isOpen, onClose }) => {
    const { user, hasPermission } = useAuth();

    const navigation = [
        {
            name: 'Dashboard',
            href: '/dashboard',
            icon: LayoutDashboard,
            permission: null,
        },
        {
            name: 'Billing / POS',
            href: '/billing',
            icon: CreditCard,
            permission: null,
        },
        {
            name: 'Sales History',
            href: '/billing/sales-history',
            icon: Receipt,
            permission: 'read_inventory',
        },
        {
            name: 'Products',
            href: '/products',
            icon: Package,
            permission: 'read_products',
        },
        {
            name: 'Suppliers',
            href: '/suppliers',
            icon: Users,
            permission: 'read_suppliers',
        },
        {
            name: 'Purchase Orders',
            href: '/purchase-orders',
            icon: ShoppingCart,
            permission: 'read_purchase_orders',
        },
        {
            name: 'Inventory',
            href: '/inventory',
            icon: Warehouse,
            permission: 'read_inventory',
        },
        {
            name: 'Batches',
            href: '/batches',
            icon: TrendingUp,
            permission: 'read_inventory',
        },
        {
            name: 'Batch History',
            href: '/batches/history',
            icon: Clock,
            permission: 'read_inventory',
        },
        {
            name: 'Expiring Products',
            href: '/batches/expiring',
            icon: AlertTriangle,
            permission: 'read_inventory',
        },
        {
            name: 'Brands',
            href: '/brands',
            icon: Tag,
            permission: 'manage_brands',
        },
        {
            name: 'Categories',
            href: '/categories',
            icon: Folder,
            permission: 'manage_categories',
        },
        {
            name: 'Users',
            href: '/users',
            icon: UserCircle,
            permission: 'manage_users',
        },
    ];

    const filteredNavigation = navigation.filter(
        (item) => !item.permission || hasPermission(item.permission)
    );

    return (
        <>
            {/* Mobile overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
          fixed lg:static inset-y-0 left-0 z-30
          w-64 bg-white border-r border-gray-200
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
            >
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="flex items-center justify-center h-16 px-4 border-b border-gray-200">
                        <h1 className="text-xl font-bold text-primary-600">ShivikMart</h1>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 overflow-y-auto py-4 custom-scrollbar">
                        <div className="px-3 space-y-1">
                            {filteredNavigation.map((item) => (
                                <NavLink
                                    key={item.name}
                                    to={item.href}
                                    end={item.href === '/billing'} // Only exact match for /billing
                                    onClick={() => onClose && onClose()}
                                    className={({ isActive }) =>
                                        `flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${isActive
                                            ? 'bg-primary-50 text-primary-600'
                                            : 'text-gray-700 hover:bg-gray-50'
                                        }`
                                    }
                                >
                                    <item.icon className="mr-3 h-5 w-5" />
                                    {item.name}
                                </NavLink>
                            ))}
                        </div>
                    </nav>

                    {/* User info */}
                    <div className="p-4 border-t border-gray-200">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-semibold">
                                    {user?.name?.charAt(0).toUpperCase()}
                                </div>
                            </div>
                            <div className="ml-3 flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                    {user?.name}
                                </p>
                                <p className="text-xs text-gray-500 truncate capitalize">
                                    {user?.role}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;

