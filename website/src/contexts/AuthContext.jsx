import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import { TOKEN_KEY, USER_KEY } from '../config/constants';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Initialize auth state
    useEffect(() => {
        const initAuth = async () => {
            const token = localStorage.getItem(TOKEN_KEY);
            const savedUser = localStorage.getItem(USER_KEY);

            if (token && savedUser) {
                try {
                    const parsedUser = JSON.parse(savedUser);
                    setUser(parsedUser);
                    setIsAuthenticated(true);

                    // Fetch fresh user data
                    const response = await authAPI.getMe();
                    if (response.success) {
                        const userData = response.data.user;
                        setUser(userData);
                        localStorage.setItem(USER_KEY, JSON.stringify(userData));
                    }
                } catch (error) {
                    console.error('Auth initialization failed:', error);
                    logout();
                }
            }
            setLoading(false);
        };

        initAuth();
    }, []);

    const login = async (credentials) => {
        try {
            const response = await authAPI.login(credentials);

            if (response.success) {
                const { token, data } = response;
                const userData = data.user;

                localStorage.setItem(TOKEN_KEY, token);
                localStorage.setItem(USER_KEY, JSON.stringify(userData));

                setUser(userData);
                setIsAuthenticated(true);

                toast.success('Login successful!');
                return { success: true };
            }
        } catch (error) {
            toast.error(error.message || 'Login failed');
            return { success: false, error: error.message };
        }
    };

    const logout = async () => {
        try {
            await authAPI.logout();
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
            setUser(null);
            setIsAuthenticated(false);
            toast.success('Logged out successfully');
        }
    };

    const updateProfile = async (data) => {
        try {
            const response = await authAPI.updateProfile(data);

            if (response.success) {
                const userData = response.data.user;
                setUser(userData);
                localStorage.setItem(USER_KEY, JSON.stringify(userData));
                toast.success('Profile updated successfully');
                return { success: true };
            }
        } catch (error) {
            toast.error(error.message || 'Failed to update profile');
            return { success: false, error: error.message };
        }
    };

    const changePassword = async (data) => {
        try {
            const response = await authAPI.changePassword(data);

            if (response.success) {
                toast.success('Password changed successfully');
                return { success: true };
            }
        } catch (error) {
            toast.error(error.message || 'Failed to change password');
            return { success: false, error: error.message };
        }
    };

    const hasPermission = (permission) => {
        if (!user) return false;
        if (user.role === 'admin') return true;
        return user.permissions?.includes(permission);
    };

    const hasAnyPermission = (permissions) => {
        if (!user) return false;
        if (user.role === 'admin') return true;
        return permissions.some((permission) => user.permissions?.includes(permission));
    };

    const hasRole = (role) => {
        if (!user) return false;
        return user.role === role;
    };

    const value = {
        user,
        loading,
        isAuthenticated,
        login,
        logout,
        updateProfile,
        changePassword,
        hasPermission,
        hasAnyPermission,
        hasRole,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

