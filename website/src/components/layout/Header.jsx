import React from 'react';
import { Menu, Bell, Search, LogOut, User, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../common/Button';

const Header = ({ onMenuClick }) => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <header className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
            <div className="flex items-center justify-between h-16 px-4 lg:px-6">
                {/* Left side */}
                <div className="flex items-center">
                    <button
                        onClick={onMenuClick}
                        className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 lg:hidden"
                    >
                        <Menu size={24} />
                    </button>

                    {/* Search bar - hidden on mobile */}
                    <div className="hidden md:flex items-center ml-4">
                        <div className="relative">
                            <Search
                                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                                size={20}
                            />
                            <input
                                type="text"
                                placeholder="Search products..."
                                className="w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                onFocus={() => navigate('/products')}
                            />
                        </div>
                    </div>
                </div>

                {/* Right side */}
                <div className="flex items-center space-x-2">
                    {/* Notifications */}
                    <button className="relative p-2 rounded-lg text-gray-600 hover:bg-gray-100">
                        <Bell size={20} />
                        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                    </button>

                    {/* User menu */}
                    <div className="relative group">
                        <button className="flex items-center space-x-2 p-2 rounded-lg text-gray-600 hover:bg-gray-100">
                            <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-semibold">
                                {user?.name?.charAt(0).toUpperCase()}
                            </div>
                            <span className="hidden md:block text-sm font-medium text-gray-900">
                                {user?.name}
                            </span>
                        </button>

                        {/* Dropdown */}
                        <div className="hidden group-hover:block absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                            <button
                                onClick={() => navigate('/profile')}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                                <User size={16} className="mr-2" />
                                Profile
                            </button>
                            <button
                                onClick={() => navigate('/settings')}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                                <Settings size={16} className="mr-2" />
                                Settings
                            </button>
                            <hr className="my-1 border-gray-200" />
                            <button
                                onClick={handleLogout}
                                className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                            >
                                <LogOut size={16} className="mr-2" />
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;

