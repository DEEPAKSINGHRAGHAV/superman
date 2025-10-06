import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Theme, ColorScheme, lightTheme, darkTheme } from '../theme';

interface ThemeContextType {
    theme: Theme;
    colorScheme: ColorScheme;
    isDark: boolean;
    toggleTheme: () => void;
    setTheme: (scheme: ColorScheme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'theme_preference';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const systemColorScheme = useColorScheme();
    const [colorScheme, setColorScheme] = useState<ColorScheme>(systemColorScheme || 'light');
    const [isLoaded, setIsLoaded] = useState(false);

    // Load saved theme preference
    useEffect(() => {
        const loadThemePreference = async () => {
            try {
                const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
                if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
                    setColorScheme(savedTheme);
                } else {
                    setColorScheme(systemColorScheme || 'light');
                }
            } catch (error) {
                console.error('Error loading theme preference:', error);
                setColorScheme(systemColorScheme || 'light');
            } finally {
                setIsLoaded(true);
            }
        };

        loadThemePreference();
    }, [systemColorScheme]);

    // Save theme preference
    const saveThemePreference = async (scheme: ColorScheme) => {
        try {
            await AsyncStorage.setItem(THEME_STORAGE_KEY, scheme);
        } catch (error) {
            console.error('Error saving theme preference:', error);
        }
    };

    const toggleTheme = () => {
        const newScheme = colorScheme === 'light' ? 'dark' : 'light';
        setColorScheme(newScheme);
        saveThemePreference(newScheme);
    };

    const setTheme = (scheme: ColorScheme) => {
        setColorScheme(scheme);
        saveThemePreference(scheme);
    };

    const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
    const isDark = colorScheme === 'dark';

    // Don't render until theme is loaded
    if (!isLoaded) {
        return null;
    }

    const value: ThemeContextType = {
        theme,
        colorScheme,
        isDark,
        toggleTheme,
        setTheme,
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = (): ThemeContextType => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

