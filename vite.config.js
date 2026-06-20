/* eslint-disable no-undef */
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import fs from 'fs'
import { pathToFileURL } from 'url'

// Helper to parse json body in connect middleware
function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
}

// Custom Vite plugin to handle /api serverless functions locally
const apiPlugin = () => ({
  name: 'vite-plugin-api',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      if (req.url && req.url.startsWith('/api/')) {
        const urlPath = req.url.split('?')[0];
        const apiFilePath = path.join(process.cwd(), `${urlPath}.js`);
        
        if (fs.existsSync(apiFilePath)) {
          try {
            if (req.method === 'POST' || req.method === 'PUT') {
              req.body = await parseBody(req);
            }
            
            const customRes = {
              statusCode: 200,
              status(code) {
                res.statusCode = code;
                return this;
              },
              json(data) {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(data));
                return this;
              },
              setHeader(name, value) {
                res.setHeader(name, value);
                return this;
              }
            };
            
            const fileUrl = `${pathToFileURL(apiFilePath).href}?t=${Date.now()}`;
            const module = await import(fileUrl);
            if (module.default) {
              await module.default(req, customRes);
            } else {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Handler does not export a default function.' }));
            }
          } catch (err) {
            console.error("Error executing API dev middleware:", err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message || 'Internal Dev Server Error' }));
          }
        } else {
          res.statusCode = 404;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: `Endpoint ${urlPath} not found.` }));
        }
      } else {
        next();
      }
    });
  }
});

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  console.log("vite.config.js: Loaded env keys:", Object.keys(env).filter(k => k.includes('FIREBASE') || k.includes('AWS')));
  Object.assign(process.env, env);

  return {
    plugins: [
      apiPlugin(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      workbox: {
        clientsClaim: true,
        skipWaiting: true,
        cleanupOutdatedCaches: true
      },
      manifest: {
        name: 'NearBudy',
        short_name: 'NearBudy',
        description: 'Private Campus Network',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  optimizeDeps: {
    include: ['@capgo/capacitor-social-login']
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react')) return 'vendor-react';
            if (id.includes('firebase')) return 'vendor-firebase';
            if (id.includes('lucide-react') || id.includes('leaflet')) return 'vendor-ui';
            return 'vendor';
          }
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
}
})
