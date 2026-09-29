import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['img/*.jpg', 'icon.svg'],
      manifest: {
        name: 'Hub de Ehzra Thanaris',
        short_name: 'Ehzra',
        description: 'Grimório e ficha de combate do Ehzra Thanaris',
        lang: 'pt-BR',
        theme_color: '#141019',
        background_color: '#141019',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,webp,woff2}'],
        navigateFallback: '/index.html',
        // A API nunca vai para o cache: um redirect de login (Cloudflare Access) não pode virar resposta guardada.
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [],
      },
    }),
  ],
  server: { host: true, port: 5173 },
});
