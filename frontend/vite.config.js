import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      devOptions: {
        enabled: true,
        type: 'module',
      },
      manifest: {
        name: 'Auditorium Booking System',
        short_name: 'Auditorium',
        description: 'Auditorium booking portal for National College campuses',
        theme_color: '#1e3a5f',
        background_color: '#f8fafc',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          if (id.includes('@fullcalendar')) return 'fullcalendar';
          if (id.includes('firebase/analytics') || id.includes('@firebase/analytics')) return 'firebase-analytics';
          if (id.includes('firebase/auth') || id.includes('@firebase/auth')) return 'firebase-auth';
          if (
            id.includes('firebase/firestore') ||
            id.includes('@firebase/firestore') ||
            id.includes('firebase/database') ||
            id.includes('@firebase/database') ||
            id.includes('firebase/storage') ||
            id.includes('@firebase/storage')
          ) {
            return 'firebase-data';
          }
          if (id.includes('firebase/app') || id.includes('@firebase/app') || id.includes('firebase')) {
            return 'firebase-core';
          }
          if (id.includes('react') || id.includes('scheduler')) return 'react-vendor';
        },
      },
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 3000,
  },
});
