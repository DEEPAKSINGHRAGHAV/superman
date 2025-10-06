import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, LoginRequest, LoginResponse } from '../types';
import apiService from '../services/api';

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (credentials: LoginRequest) => Promise<LoginResponse>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
    updateUser: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_STORAGE_KEY = 'user_data';
const TOKEN_STORAGE_KEY = 'auth_token';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Load user data from storage on app start
    useEffect(() => {
        const loadUserData = async () => {
            try {
                const [userData, token] = await Promise.all([
                    AsyncStorage.getItem(USER_STORAGE_KEY),
                    AsyncStorage.getItem(TOKEN_STORAGE_KEY),
                ]);

                if (userData && token) {
                    const parsedUser = JSON.parse(userData);
                    setUser(parsedUser);

                    // Verify token is still valid
                    try {
                        await apiService.getCurrentUser();
                    } catch (error) {
                        // Token is invalid, clear stored data
                        await clearStoredData();
                    }
                }
            } catch (error) {
                console.error('Error loading user data:', error);
                await clearStoredData();
            } finally {
                setIsLoading(false);
            }
        };

        loadUserData();
    }, []);

    const clearStoredData = async () => {
        try {
            await Promise.all([
                AsyncStorage.removeItem(USER_STORAGE_KEY),
                AsyncStorage.removeItem(TOKEN_STORAGE_KEY),
            ]);
            setUser(null);
        } catch (error) {
            console.error('Error clearing stored data:', error);
        }
    };

    const login = useCallback(async (credentials: LoginRequest): Promise<LoginResponse> => {
        try {
            setIsLoading(true);
            const response = await apiService.login(credentials);

            if (response.success && response.data?.user) {
                setUser(response.data.user);

                // Store user data and token
                await Promise.all([
                    AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(response.data.user)),
                    AsyncStorage.setItem(TOKEN_STORAGE_KEY, response.token || ''),
                ]);
            }

            return response;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const logout = useCallback(async (): Promise<void> => {
        try {
            setIsLoading(true);
            await apiService.logout();
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            await clearStoredData();
            setIsLoading(false);
        }
    }, []);

    const refreshUser = useCallback(async (): Promise<void> => {
        try {
            const response = await apiService.getCurrentUser();
            if (response.success && response.data) {
                setUser(response.data);
                await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(response.data));
            }
        } catch (error) {
            console.error('Error refreshing user:', error);
            // If refresh fails, user might be logged out
            await clearStoredData();
        }
    }, []);

    const updateUser = useCallback((userData: Partial<User>) => {
        if (user) {
            const updatedUser = { ...user, ...userData };
            setUser(updatedUser);
            AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
        }
    }, [user]);

    const value: AuthContextType = {
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refreshUser,
        updateUser,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

