-- ================================================================
-- One to Many · Multi-Channel Listing OS · Postgres schema (Neon)
-- Multi-tenant, shared-schema, tenant_id-scoped.
-- ================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

-- ============ TENANTS (root of the tenant tree) ============
CREATE TABLE tenants (
  id            TEXT PRIMARY KEY,                     -- ULID
  name          TEXT NOT NULL,
  slug          CITEXT UNIQUE NOT NULL,               -- for subdomain routing
  plan          TEXT NOT NULL DEFAULT 'starter',      -- starter | growth | scale
  status        TEXT NOT NULL DEFAULT 'active',       -- active | suspended | trial
  settings      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ USERS ============
CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  tenant_id     TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email         CITEXT NOT NULL,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'member',       -- owner | admin | member | viewer
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, email)
);
CREATE INDEX idx_users_tenant ON users(tenant_id);

-- ============ CATALOGUE ============
CREATE TABLE brands (
  id            TEXT PRIMARY KEY,
  tenant_id     TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  primary_color TEXT,
  logo_url      TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, name)
);
CREATE INDEX idx_brands_tenant ON brands(tenant_id);

CREATE TABLE categories (
  id             TEXT PRIMARY KEY,
  tenant_id      TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  parent_id      TEXT REFERENCES categories(id) ON DELETE SET NULL,
  amazon_id      TEXT,
  shopify_type   TEXT,
  flipkart_id    TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_categories_tenant ON categories(tenant_id);
CREATE INDEX idx_categories_parent ON categories(parent_id);

CREATE TABLE attribute_schemas (
  id          TEXT PRIMARY KEY,
  tenant_id   TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  fields      JSONB NOT NULL DEFAULT '[]'::jsonb,     -- [{name, type, required}]
  category_ids TEXT[] DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_schemas_tenant ON attribute_schemas(tenant_id);

-- ============ MASTER PRODUCTS ============
CREATE TABLE products (
  id            TEXT PRIMARY KEY,
  tenant_id     TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sku           TEXT NOT NULL,
  title         TEXT NOT NULL,
  brand_id      TEXT REFERENCES brands(id) ON DELETE SET NULL,
  category_id   TEXT REFERENCES categories(id) ON DELETE SET NULL,
  mrp           NUMERIC(12,2) NOT NULL DEFAULT 0,
  cost          NUMERIC(12,2) NOT NULL DEFAULT 0,
  stock         INTEGER NOT NULL DEFAULT 0,           -- master pool
  weight_kg     NUMERIC(8,3) DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'draft',        -- draft | listed | unlisted
  stock_mode    TEXT NOT NULL DEFAULT 'central',      -- central | allocated
  option_axes   JSONB NOT NULL DEFAULT '[]'::jsonb,   -- [{name, values:[]}]
  attributes    JSONB NOT NULL DEFAULT '{}'::jsonb,   -- schema-driven attribute values
  images        JSONB NOT NULL DEFAULT '[]'::jsonb,   -- string[] URLs, primary is [0]
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, sku)
);
CREATE INDEX idx_products_tenant ON products(tenant_id);
CREATE INDEX idx_products_status ON products(tenant_id, status);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_search ON products USING gin (to_tsvector('simple', title || ' ' || sku));

-- ============ VARIANTS (Size × Color × Style etc.) ============
CREATE TABLE variants (
  id           TEXT PRIMARY KEY,
  tenant_id    TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id   TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku          TEXT NOT NULL,                          -- master_sku + suffix
  options      JSONB NOT NULL,                         -- {Size:"UK 8", Color:"Obsidian"}
  stock        INTEGER NOT NULL DEFAULT 0,
  price        NUMERIC(12,2),                          -- override; NULL = use master mrp
  image_url    TEXT,                                   -- optional per-variant hero
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, sku)
);
CREATE INDEX idx_variants_product ON variants(product_id);
CREATE INDEX idx_variants_tenant ON variants(tenant_id);

-- ============ CHANNELS ============
CREATE TABLE channels (
  id               TEXT PRIMARY KEY,
  tenant_id        TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  key              TEXT NOT NULL,                     -- amazon | shopify | flipkart | woocommerce
  name             TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'disconnected',
  credentials      JSONB NOT NULL DEFAULT '{}'::jsonb, -- ENCRYPTED at rest via KMS in prod
  webhook_secret   TEXT,
  connected_at     TIMESTAMPTZ,
  last_sync_at     TIMESTAMPTZ,
  UNIQUE (tenant_id, key)
);
CREATE INDEX idx_channels_tenant ON channels(tenant_id);

-- ============ LISTINGS (per-channel deployment of a product) ============
CREATE TABLE listings (
  id             TEXT PRIMARY KEY,
  tenant_id      TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id     TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id     TEXT REFERENCES variants(id) ON DELETE CASCADE, -- nullable: product-level listing
  channel_id     TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  channel_sku    TEXT NOT NULL,
  external_id    TEXT,                                 -- marketplace's own ID
  status         TEXT NOT NULL DEFAULT 'active',       -- active | paused | error
  stock          INTEGER NOT NULL DEFAULT 0,           -- allocated only; ignored when product.stock_mode='central'
  price          NUMERIC(12,2) NOT NULL,
  title_override TEXT,
  bullets        JSONB DEFAULT '[]'::jsonb,
  category_map   TEXT,
  last_sync_at   TIMESTAMPTZ,
  last_error     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, channel_id, channel_sku)
);
CREATE INDEX idx_listings_tenant ON listings(tenant_id);
CREATE INDEX idx_listings_product ON listings(product_id);
CREATE INDEX idx_listings_channel ON listings(channel_id);
CREATE INDEX idx_listings_status ON listings(tenant_id, status);

-- ============ ORDERS ============
CREATE TABLE orders (
  id                TEXT PRIMARY KEY,
  tenant_id         TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  channel_id        TEXT NOT NULL REFERENCES channels(id) ON DELETE RESTRICT,
  channel_order_id  TEXT NOT NULL,
  customer_name     TEXT,
  customer_email    CITEXT,
  status            TEXT NOT NULL DEFAULT 'pending',  -- pending|processing|shipped|delivered|cancelled
  items_count       INTEGER NOT NULL DEFAULT 0,
  subtotal          NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax               NUMERIC(12,2) NOT NULL DEFAULT 0,
  total             NUMERIC(12,2) NOT NULL DEFAULT 0,
  placed_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  raw               JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (tenant_id, channel_id, channel_order_id)
);
CREATE INDEX idx_orders_tenant ON orders(tenant_id);
CREATE INDEX idx_orders_placed ON orders(tenant_id, placed_at DESC);

CREATE TABLE order_items (
  id           TEXT PRIMARY KEY,
  tenant_id    TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_id     TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  listing_id   TEXT REFERENCES listings(id) ON DELETE SET NULL,
  variant_id   TEXT REFERENCES variants(id) ON DELETE SET NULL,
  qty          INTEGER NOT NULL,
  unit_price   NUMERIC(12,2) NOT NULL,
  total        NUMERIC(12,2) NOT NULL
);
CREATE INDEX idx_order_items_order ON order_items(order_id);

-- ============ RETURNS ============
CREATE TABLE returns (
  id           TEXT PRIMARY KEY,
  tenant_id    TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_id     TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  channel_id   TEXT NOT NULL REFERENCES channels(id) ON DELETE RESTRICT,
  sku          TEXT NOT NULL,
  reason       TEXT,
  status       TEXT NOT NULL DEFAULT 'requested',    -- requested | in_transit | received | refunded
  amount       NUMERIC(12,2) DEFAULT 0,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_returns_tenant ON returns(tenant_id);

-- ============ AUDIT LOG ============
CREATE TABLE audit_log (
  id           BIGSERIAL PRIMARY KEY,
  tenant_id    TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id      TEXT REFERENCES users(id) ON DELETE SET NULL,
  entity_type  TEXT NOT NULL,                        -- product | listing | channel | order …
  entity_id    TEXT,
  event        TEXT NOT NULL,                        -- Listing published / Stock synced …
  detail       TEXT,
  level        TEXT NOT NULL DEFAULT 'info',         -- info | success | warning | error
  metadata     JSONB DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_tenant_time ON audit_log(tenant_id, created_at DESC);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);

-- ============ SYNC JOBS (background workers) ============
CREATE TABLE sync_jobs (
  id           TEXT PRIMARY KEY,
  tenant_id    TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  channel_id   TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  kind         TEXT NOT NULL,                        -- publish | stock_sync | price_sync | pull_orders
  payload      JSONB NOT NULL DEFAULT '{}'::jsonb,
  status       TEXT NOT NULL DEFAULT 'queued',       -- queued | running | done | failed
  attempts     INTEGER NOT NULL DEFAULT 0,
  last_error   TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at   TIMESTAMPTZ,
  finished_at  TIMESTAMPTZ
);
CREATE INDEX idx_sync_jobs_status ON sync_jobs(status, scheduled_at);
CREATE INDEX idx_sync_jobs_tenant ON sync_jobs(tenant_id);

-- ============ ROW-LEVEL SECURITY (defence in depth) ============
-- Enable RLS on every tenant-scoped table so a bug in application code
-- can never leak another tenant's data.
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'users','brands','categories','attribute_schemas','products','variants',
    'channels','listings','orders','order_items','returns','audit_log','sync_jobs'
  ]) LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING (tenant_id = current_setting(''app.tenant_id'', true))',
      t
    );
  END LOOP;
END $$;

-- The app sets `SET LOCAL app.tenant_id = '<tenant>'` at the start of every request.
-- See src/db/tenantContext.js
