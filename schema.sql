-- Stackwell Shop — D1 (SQLite) Schema
-- Run with: npm run db:migrate

-- ─────────────────────────────────────────
-- PRODUCTS
-- ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  fulfillment_type TEXT NOT NULL CHECK(fulfillment_type IN ('physical', 'printful', 'digital')),
  category TEXT,
  thumbnail_url TEXT,
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Variants for a product (sizes, colors, formats, etc.)
CREATE TABLE IF NOT EXISTS product_variants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,         -- e.g. "Black / Large", "PDF", "12oz"
  sku TEXT,
  price REAL NOT NULL,        -- what the customer pays
  cost REAL,                  -- what it costs us (optional, for margin tracking)
  stock INTEGER,              -- NULL = unlimited (digital/printful)
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Fulfillment-specific metadata — separate tables per provider
-- so core product schema stays clean

CREATE TABLE IF NOT EXISTS product_meta_printful (
  product_id INTEGER PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  printful_sync_product_id INTEGER UNIQUE,
  last_synced_at TEXT
);

CREATE TABLE IF NOT EXISTS variant_meta_printful (
  variant_id INTEGER PRIMARY KEY REFERENCES product_variants(id) ON DELETE CASCADE,
  printful_sync_variant_id INTEGER UNIQUE NOT NULL,
  printful_variant_id INTEGER,
  color TEXT,
  size TEXT
);

CREATE TABLE IF NOT EXISTS variant_meta_digital (
  variant_id INTEGER PRIMARY KEY REFERENCES product_variants(id) ON DELETE CASCADE,
  r2_key TEXT NOT NULL,       -- path in R2 bucket
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT
);

CREATE TABLE IF NOT EXISTS variant_meta_physical (
  variant_id INTEGER PRIMARY KEY REFERENCES product_variants(id) ON DELETE CASCADE,
  weight_grams INTEGER,
  dimensions TEXT             -- JSON: {l, w, h} in cm
);

-- ─────────────────────────────────────────
-- PRODUCT IMAGES
-- ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS product_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  r2_key TEXT,                -- local R2 upload
  external_url TEXT,          -- Printful CDN or external
  alt_text TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────
-- ORDERS
-- ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,

  -- Shipping (NULL for digital-only orders)
  shipping_address_line1 TEXT,
  shipping_address_line2 TEXT,
  shipping_city TEXT,
  shipping_province TEXT,
  shipping_postal_code TEXT,
  shipping_country TEXT DEFAULT 'CA',

  subtotal REAL NOT NULL,
  shipping_cost REAL NOT NULL DEFAULT 0,
  tax REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL,

  -- Payment
  payment_intent_id TEXT,
  payment_status TEXT DEFAULT 'pending' CHECK(payment_status IN ('pending', 'paid', 'failed', 'refunded')),

  -- Fulfillment
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')),
  fulfillment_order_id TEXT,    -- external order ID (e.g. Printful order ID)
  fulfillment_provider TEXT,    -- 'printful' | 'manual' | 'digital'
  tracking_number TEXT,
  tracking_url TEXT,

  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  variant_id INTEGER NOT NULL REFERENCES product_variants(id),
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL,
  total_price REAL NOT NULL,
  fulfillment_type TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Digital download tokens — generated after payment
CREATE TABLE IF NOT EXISTS download_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_item_id INTEGER NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  download_count INTEGER DEFAULT 0,
  max_downloads INTEGER DEFAULT 5,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────
-- SETTINGS
-- ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);
CREATE INDEX IF NOT EXISTS idx_products_fulfillment_type ON products(fulfillment_type);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_variants_product_id ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_download_tokens_token ON download_tokens(token);

-- ─────────────────────────────────────────
-- DEFAULT SETTINGS
-- ─────────────────────────────────────────

INSERT OR IGNORE INTO settings (key, value) VALUES
  ('store_name', 'My Store'),
  ('store_email', 'store@example.com'),
  ('currency', 'CAD'),
  ('gst_rate', '5'),
  ('pst_rate', '7'),
  ('default_markup_percent', '40'),
  ('free_shipping_threshold', '0'),
  ('max_download_attempts', '5'),
  ('download_expiry_hours', '48');
