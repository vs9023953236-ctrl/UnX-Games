import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        // Vercel builds use static asset delivery; keep service-worker generation out of CI
        // until the function/static bundle is verified independently.
        disable: Boolean(process.env.VERCEL) || process.env.DISABLE_PWA === 'true',
        registerType: 'prompt',
        includeAssets: [
          'apple-touch-icon.png',
          'logo.png',
          'pwa-48x48.png',
          'pwa-72x72.png',
          'pwa-96x96.png',
          'pwa-128x128.png',
          'pwa-144x144.png',
          'pwa-152x152.png',
          'pwa-192x192.png',
          'pwa-384x384.png',
          'pwa-512x512.png',
          'pwa-maskable-512x512.png',
          'free-fire.webp',
          'manifest.json',
        ],
        manifest: {
          id: '/',
          name: 'Unx Games',
          short_name: 'Unx Games',
          description: "Nepal's #1 Game Top-Up & Voucher App",
          theme_color: '#F7F7FB',
          background_color: '#F7F7FB',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          scope: '/',
          categories: ['games', 'shopping', 'utilities', 'entertainment'],
          icons: [
            {
              src: '/pwa-48x48.png',
              sizes: '48x48',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-72x72.png',
              sizes: '72x72',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-96x96.png',
              sizes: '96x96',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-128x128.png',
              sizes: '128x128',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-144x144.png',
              sizes: '144x144',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-152x152.png',
              sizes: '152x152',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-384x384.png',
              sizes: '384x384',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
            {
              src: '/apple-touch-icon.png',
              sizes: '180x180',
              type: 'image/png',
              purpose: 'any',
            },
          ],
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 6000000, // 6MB
          cleanupOutdatedCaches: true,
          navigateFallback: '/index.html',
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2}'],
          runtimeCaching: [
            {
              // Google Fonts Stylesheets
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-stylesheets',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              // Google Fonts Webfonts
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-webfonts',
                expiration: {
                  maxEntries: 30,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              // External CDN game images (Unsplash)
              urlPattern: /^https:\/\/images\.unsplash\.com\/.*/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'external-game-images',
                expiration: {
                  maxEntries: 60,
                  maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              // R2 CDN official game & logo assets
              urlPattern: /^https:\/\/pub-f5b49392d8cb47b0b42800e81d2216c0\.r2\.dev\/.*/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'r2-game-assets',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              // Never cache Supabase auth or database requests (NetworkOnly) for safety
              urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
              handler: 'NetworkOnly',
            },
            {
              // Never cache API routes (NetworkOnly) for safety
              urlPattern: /\/api\/.*/i,
              handler: 'NetworkOnly',
            },
          ],
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
      dedupe: ['react', 'react-dom'],
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      chunkSizeWarningLimit: 3000,
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
        },
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true as const,
      hmr: false,
      watch: process.env.DISABLE_HMR === 'true' ? { ignored: ['**/*'] } : {},
    },
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(
        process.env.VITE_SUPABASE_URL || 'https://qctpwbrjxkxkpiohzkhw.supabase.co'
      ),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(
        process.env.VITE_SUPABASE_ANON_KEY || ''
      ),
      'import.meta.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL || ''),
    },
  };
});
