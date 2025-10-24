/**
 * Environment Configuration
 * Handles different environments (development, production)
 */

export type Environment = 'development' | 'production';

interface EnvironmentConfig {
    apiBaseUrl: string;
    environment: Environment;
    enableLogging: boolean;
    enableDebug: boolean;
}

// Detect environment
const isDevelopment = __DEV__;

// Development Configuration
const developmentConfig: EnvironmentConfig = {
    apiBaseUrl: 'http://localhost:8000/api/v1',
    environment: 'development',
    enableLogging: true,
    enableDebug: true,
};

// Production Configuration
const productionConfig: EnvironmentConfig = {
    apiBaseUrl: 'https://api.shivikmart.com/api/v1',
    environment: 'production',
    enableLogging: false,
    enableDebug: false,
};

// Select config based on environment
const config: EnvironmentConfig = isDevelopment ? developmentConfig : productionConfig;

// Export individual values for convenience
export const { apiBaseUrl, environment, enableLogging, enableDebug } = config;

// Export full config
export default config;

// Helper functions
export const isProduction = () => environment === 'production';
export const isDev = () => environment === 'development';

// Console log wrapper that respects environment
export const envLog = (...args: any[]) => {
    if (enableLogging) {
        console.log('[ShivikMart]', ...args);
    }
};

export const envDebug = (...args: any[]) => {
    if (enableDebug) {
        console.debug('[DEBUG]', ...args);
    }
};

export const envError = (...args: any[]) => {
    // Always log errors
    console.error('[ERROR]', ...args);
};

export const envWarn = (...args: any[]) => {
    if (enableLogging) {
        console.warn('[WARN]', ...args);
    }
};

// Display current configuration on app start
if (enableLogging) {
    console.log('='.repeat(50));
    console.log('🚀 ShivikMart Mobile - Environment Configuration');
    console.log('='.repeat(50));
    console.log('Environment:', environment.toUpperCase());
    console.log('API Base URL:', apiBaseUrl);
    console.log('Logging:', enableLogging ? 'ENABLED' : 'DISABLED');
    console.log('Debug Mode:', enableDebug ? 'ENABLED' : 'DISABLED');
    console.log('='.repeat(50));
}

