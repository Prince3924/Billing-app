import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

const DATA_DIR = path.join(process.cwd(), 'data');
const SHOPS_FILE = path.join(DATA_DIR, 'shops.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJsonFile(filePath: string, fallback: any) {
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
  }
  return fallback;
}

function writeJsonFile(filePath: string, data: any) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
  }
}

// Memory caches
let shopsDb: Record<string, any> = readJsonFile(SHOPS_FILE, {});
let ordersDb: Record<string, any[]> = readJsonFile(ORDERS_FILE, {});

// 1. Sync Shop Catalog
app.post('/api/shops/sync', (req, res) => {
  const { shopId, shopInfo, products } = req.body || {};
  if (!shopId) {
    return res.status(400).json({ error: 'shopId is required' });
  }

  shopsDb[shopId] = {
    shopId,
    shopInfo: { ...shopInfo, id: shopId },
    products: products || [],
    updatedAt: new Date().toISOString(),
  };

  writeJsonFile(SHOPS_FILE, shopsDb);
  res.json({ success: true, shopId, updatedAt: shopsDb[shopId].updatedAt });
});

// 2. Public API: Fetch Shop & Rate List for Customer
app.get('/api/public/shop/:shopId', (req, res) => {
  const { shopId } = req.params;
  const shopData = shopsDb[shopId];

  if (!shopData) {
    return res.status(404).json({ error: 'Shop not found' });
  }

  res.json({
    shopId: shopData.shopId,
    shopInfo: shopData.shopInfo,
    products: shopData.products,
    updatedAt: shopData.updatedAt,
  });
});

// 3. Public API: Customer submits an order
app.post('/api/public/shop/:shopId/orders', (req, res) => {
  const { shopId } = req.params;
  const orderData = req.body;

  if (!orderData || !orderData.items) {
    return res.status(400).json({ error: 'Order items are required' });
  }

  const newOrder = {
    ...orderData,
    id: orderData.id || `ord_${Date.now()}`,
    orderNumber: orderData.orderNumber || `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
    date: orderData.date || new Date().toISOString(),
    shopId,
    status: orderData.status || 'New',
  };

  if (!ordersDb[shopId]) {
    ordersDb[shopId] = [];
  }
  const existingIdx = ordersDb[shopId].findIndex((o) => o.id === newOrder.id);
  if (existingIdx >= 0) {
    ordersDb[shopId][existingIdx] = { ...ordersDb[shopId][existingIdx], ...newOrder };
  } else {
    ordersDb[shopId].unshift(newOrder);
  }

  writeJsonFile(ORDERS_FILE, ordersDb);
  res.status(201).json({ success: true, order: newOrder });
});

// 4. Shopkeeper API: Fetch orders
app.get('/api/shops/:shopId/orders', (req, res) => {
  const { shopId } = req.params;
  const orders = ordersDb[shopId] || [];
  res.json(orders);
});

// 5. Shopkeeper API: Update order status
app.patch('/api/shops/:shopId/orders/:orderId', (req, res) => {
  const { shopId, orderId } = req.params;
  const { status } = req.body || {};

  const orders = ordersDb[shopId] || [];
  const target = orders.find((o) => o.id === orderId || o.orderNumber === orderId);

  if (!target) {
    return res.status(404).json({ error: 'Order not found' });
  }

  if (status) {
    target.status = status;
    writeJsonFile(ORDERS_FILE, ordersDb);
  }

  res.json({ success: true, order: target });
});

// 6. Owner API: Permanently delete a specific shop and its orders
app.delete('/api/shops/:shopId', (req, res) => {
  const cleanId = (req.params.shopId || '').trim().toLowerCase();
  if (!cleanId) {
    return res.status(400).json({ error: 'shopId is required' });
  }

  let deleted = false;
  if (cleanId in shopsDb) {
    delete shopsDb[cleanId];
    writeJsonFile(SHOPS_FILE, shopsDb);
    deleted = true;
  }
  if (cleanId in ordersDb) {
    delete ordersDb[cleanId];
    writeJsonFile(ORDERS_FILE, ordersDb);
    deleted = true;
  }

  res.json({ success: true, shopId: cleanId, deleted });
});

// Serve frontend static files in production
const distPath = path.join(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
