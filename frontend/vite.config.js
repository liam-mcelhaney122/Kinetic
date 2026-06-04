import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    if (mode === 'production') {
        const required = ['VITE_API_URL', 'VITE_CLERK_PUBLISHABLE_KEY'];
        const missing = required.filter((k) => !env[k]);
        if (missing.length) {
            throw new Error(`Missing required env vars for production build: ${missing.join(', ')}`);
        }
    }
    return {
        plugins: [
            react(),
            tailwindcss(),
            VitePWA({
                registerType: 'autoUpdate',
                includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
                manifest: {
                    name: 'Kinetic',
                    short_name: 'Kinetic',
                    description: 'Personal strength training',
                    theme_color: '#b7102a',
                    background_color: '#f9f9f9',
                    display: 'standalone',
                    orientation: 'portrait',
                    start_url: '/',
                    icons: [
                        { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
                        { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
                        {
                            src: 'pwa-512x512.png',
                            sizes: '512x512',
                            type: 'image/png',
                            purpose: 'maskable',
                        },
                    ],
                },
                workbox: {
                    globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
                },
            }),
        ],
        server: {
            host: true,
            port: 5173,
        },
    };
});
