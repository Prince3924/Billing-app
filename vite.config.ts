import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig, Plugin} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

function shopApiPlugin(): Plugin {
  const DATA_DIR = path.resolve('data');
  const SHOPS_FILE = path.join(DATA_DIR, 'shops.json');
  const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const loadData = (file: string) => {
    try {
      if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf-8'));
    } catch {}
    return {};
  };

  const saveData = (file: string, data: any) => {
    try {
      fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
    } catch {}
  };

  const shopsDb: Record<string, any> = loadData(SHOPS_FILE);
  const ordersDb: Record<string, any[]> = loadData(ORDERS_FILE);

  return {
    name: 'shop-cloud-api-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url || '';
        if (!url.startsWith('/api/')) {
          return next();
        }

        const readBody = (callback: (body: any) => void) => {
          let data = '';
          req.on('data', (chunk) => { data += chunk; });
          req.on('end', () => {
            try {
              callback(data ? JSON.parse(data) : {});
            } catch {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
          });
        };

        // 1. POST /api/shops/sync
        if (url === '/api/shops/sync' && req.method === 'POST') {
          return readBody((body) => {
            const { shopId, shopInfo, products } = body;
            if (!shopId) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ error: 'shopId required' }));
            }
            shopsDb[shopId] = {
              shopInfo: shopInfo || {},
              products: products || [],
              updatedAt: new Date().toISOString(),
            };
            saveData(SHOPS_FILE, shopsDb);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, shopId }));
          });
        }

        // 2. GET /api/public/shop/:shopId
        const publicShopMatch = url.match(/^\/api\/public\/shop\/([^?]+)/);
        if (publicShopMatch && req.method === 'GET') {
          const shopId = decodeURIComponent(publicShopMatch[1]);
          const entry = shopsDb[shopId];
          res.setHeader('Content-Type', 'application/json');
          if (!entry) {
            res.statusCode = 404;
            return res.end(JSON.stringify({ error: 'Shop not found' }));
          }
          return res.end(JSON.stringify({
            shopInfo: entry.shopInfo,
            products: entry.products,
            updatedAt: entry.updatedAt,
          }));
        }

        // 3. POST /api/public/shop/:shopId/orders
        const publicOrderMatch = url.match(/^\/api\/public\/shop\/([^/]+)\/orders/);
        if (publicOrderMatch && req.method === 'POST') {
          const shopId = decodeURIComponent(publicOrderMatch[1]);
          return readBody((order) => {
            if (!ordersDb[shopId]) ordersDb[shopId] = [];
            const orderId = order.id || 'ord_' + Date.now();
            const withMeta = {
              ...order,
              id: orderId,
              orderNumber: order.orderNumber || `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
              date: order.date || new Date().toISOString(),
              status: order.status || 'New',
              shopId,
              receivedAt: new Date().toISOString(),
            };
            const existingIdx = ordersDb[shopId].findIndex((o: any) => o.id === orderId);
            if (existingIdx >= 0) {
              ordersDb[shopId][existingIdx] = { ...ordersDb[shopId][existingIdx], ...withMeta };
            } else {
              ordersDb[shopId].unshift(withMeta);
            }
            saveData(ORDERS_FILE, ordersDb);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, order: withMeta }));
          });
        }

        // 4. GET /api/shops/:shopId/orders
        const shopOrdersMatch = url.match(/^\/api\/shops\/([^/]+)\/orders$/);
        if (shopOrdersMatch && req.method === 'GET') {
          const shopId = decodeURIComponent(shopOrdersMatch[1]);
          const orders = ordersDb[shopId] || [];
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify(orders));
        }

        // 5. PATCH /api/shops/:shopId/orders/:orderId
        const orderPatchMatch = url.match(/^\/api\/shops\/([^/]+)\/orders\/([^?]+)/);
        if (orderPatchMatch && req.method === 'PATCH') {
          const shopId = decodeURIComponent(orderPatchMatch[1]);
          const orderId = decodeURIComponent(orderPatchMatch[2]);
          return readBody((body) => {
            const list = ordersDb[shopId] || [];
            const found = list.find((o: any) => o.id === orderId || o.orderNumber === orderId);
            if (found && body.status) {
              found.status = body.status;
              saveData(ORDERS_FILE, ordersDb);
            }
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, order: found || null }));
          });
        }

        // 6. GET /api/admin/shops
        if (url === '/api/admin/shops' && req.method === 'GET') {
          if (!shopsDb['y-k-electricals-8742']) {
            shopsDb['y-k-electricals-8742'] = {
              shopInfo: {
                id: 'y-k-electricals-8742',
                name: 'Y.K. Electricals',
                address: '',
                mobile: '',
              },
              products: [],
              updatedAt: new Date().toISOString(),
            };
            saveData(SHOPS_FILE, shopsDb);
          }
          const list = Object.entries(shopsDb).map(([id, entry]: [string, any]) => ({
            shopId: id,
            ownerCode: `${id}-955`,
            name: entry?.shopInfo?.name || id,
            mobile: entry?.shopInfo?.mobile || '',
            address: entry?.shopInfo?.address || '',
            productCount: Array.isArray(entry?.products) ? entry.products.length : 0,
            updatedAt: entry?.updatedAt || null,
          }));
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ shops: list }));
        }

        // 7. POST /api/admin/shops
        if (url === '/api/admin/shops' && req.method === 'POST') {
          return readBody((body) => {
            const name = String(body.name || '').trim();
            if (!name) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ error: 'Shop name is required' }));
            }
            const cleanSlug =
              name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '')
                .slice(0, 24) || 'shop';
            let shopId = body.shopId ? String(body.shopId).trim().toLowerCase() : '';
            if (!shopId) {
              do {
                const rand = Math.floor(1000 + Math.random() * 9000);
                shopId = `${cleanSlug}-${rand}`;
              } while (shopsDb[shopId]);
            }
            const ownerCode = `${shopId}-955`;
            const shopInfo = {
              id: shopId,
              name,
              mobile: String(body.mobile || '').trim(),
              address: String(body.address || '').trim(),
              tagline: String(body.tagline || '').trim(),
            };
            shopsDb[shopId] = {
              shopInfo,
              products: [],
              updatedAt: new Date().toISOString(),
            };
            saveData(SHOPS_FILE, shopsDb);
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ success: true, shopId, ownerCode, shopInfo }));
          });
        }

        // 8. POST /api/shops/verify-owner
        if (url === '/api/shops/verify-owner' && req.method === 'POST') {
          return readBody((body) => {
            const rawCode = String(body.ownerCode || '').trim().toLowerCase().replace(/\s+/g, '');
            res.setHeader('Content-Type', 'application/json');
            if (!rawCode) {
              res.statusCode = 401;
              return res.end(JSON.stringify({ valid: false, error: 'Wrong Code' }));
            }
            const shopId = rawCode.endsWith('-955') && rawCode.length > 4
              ? rawCode.slice(0, -4)
              : rawCode;
            if (!shopId) {
              res.statusCode = 401;
              return res.end(JSON.stringify({ valid: false, error: 'Wrong Code' }));
            }
            if (shopId === 'y-k-electricals-8742' && !shopsDb[shopId]) {
              shopsDb[shopId] = {
                shopInfo: {
                  id: shopId,
                  name: 'Y.K. Electricals',
                  address: '',
                  mobile: '',
                },
                products: [],
                updatedAt: new Date().toISOString(),
              };
              saveData(SHOPS_FILE, shopsDb);
            }
            const entry = shopsDb[shopId];
            if (!entry) {
              res.statusCode = 401;
              return res.end(JSON.stringify({ valid: false, error: 'Wrong Code' }));
            }
            return res.end(
              JSON.stringify({
                valid: true,
                shopId,
                ownerCode: `${shopId}-955`,
                shopInfo: entry.shopInfo || { id: shopId, name: shopId, address: '', mobile: '' },
                products: Array.isArray(entry.products) ? entry.products : [],
              })
            );
          });
        }

        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      shopApiPlugin(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icon.svg'],
        manifest: {
          id: '/',
          name: 'Billing App - Stock & Billing Khata',
          short_name: 'Billing App',
          description: 'Billing App - Simple Stock, Billing and Khata App for small shops.',
          theme_color: '#0f172a',
          background_color: '#0f172a',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
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
          ],
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          navigateFallbackDenylist: [/^\/api\//],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve('.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

