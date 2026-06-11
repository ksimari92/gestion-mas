import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.ico', 'icons/*.png'],
            manifest: {
                name: 'Gestión MAS',
                short_name: 'MAS',
                description: 'Sistema de Gestión Agropecuaria',
                theme_color: '#1B4332',
                background_color: '#F8F9FA',
                display: 'standalone',
                orientation: 'portrait',
                start_url: '/',
                icons: [
                    {
                        src: 'icons/icon-192.png',
                        sizes: '192x192',
                        type: 'image/png',
                        purpose: 'any maskable'
                    },
                    {
                        src: 'icons/icon-512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any maskable'
                    }
                ]
            }
        })
    ],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, './src'),
        },
        dedupe: ["react", "react-dom"],
    },
    server: {
        port: 5173,
        host: true
    },
    build: {
        target: 'esnext',
        minify: 'esbuild',
        sourcemap: false
    }
});
