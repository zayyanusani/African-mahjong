import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [],
      manifest: {
        name: 'AfriMahjong',
        short_name: 'AfriMahjong',
        description: 'Play. Explore. Discover Africa.',
        theme_color: '#123d2b',
        background_color: '#f6f3e9',
        display: 'standalone',
        start_url: '/',
        icons: []
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2}'] }
    })
  ]
});