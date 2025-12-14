import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
    // Load env file based on `mode` in the current working directory.
    const env = loadEnv(mode, process.cwd(), '');
    const apiUrl = env.VITE_API_URL || 'http://localhost:8000';
    const isDev = mode === 'development';

    return {
        plugins: [react()],
        optimizeDeps: {
            include: ['react-window'],
        },
        server: {
            port: 3000,
            // Proxy only in development mode
            ...(isDev && {
                proxy: {
                    '/api': {
                        target: apiUrl,
                        changeOrigin: true,
                    },
                },
            }),
        },
        build: {
            outDir: 'dist',
            sourcemap: mode === 'development',
        },
    };
});

