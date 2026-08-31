import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'EPS Tracker',
        short_name: 'EPS',
        description: 'Gestion des dispenses EPS',
        theme_color: '#2563eb',
        background_color: '#f3f4f6',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            // Version "maskable" : permet a Android d'integrer l'icone
            // a la forme du lanceur au lieu de l'afficher dans un carre blanc.
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        // Les justificatifs peuvent etre volumineux : on releve la limite
        // de mise en cache par defaut (2 Mo) pour le bundle applicatif.
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024
      }
    })
  ],
})
