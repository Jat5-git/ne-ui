# PRD — One to Many · Multi-Channel Listing & Master Inventory OS

## Original Problem Statement
Multi-Channel Listing & Master Inventory Management System. Comprehensive UX + information architecture for a "One to Many" platform integrating Central Master Inventory, CSV Onboarding, Catalogue Templates, and Multi-Channel Listing Control (Amazon, Shopify, Flipkart, WooCommerce).

## User Choices (2026-02-03)
- Auth: skipped (demo mode)
- Channels: MOCKED sync (no real marketplace APIs)
- CSV import: full 4-step wizard (Upload → Map → Preview → Commit)
- Design: Modern SaaS dashboard — Swiss / high-contrast, Chivo + IBM Plex
- Seed data: 8 master products, 14 listings, 7 orders, 3 returns, 4 channels preloaded
- Framework note: user asked for Next.js; environment is React CRA — code written as Next-portable JSX components / pages

## Architecture
- **Frontend**: React 19 + React Router 7 + Tailwind + Shadcn UI + Recharts + Sonner + lucide-react
- **State**: React Context (`StoreContext`) with seeded demo data — no backend calls, fully client-side prototype
- **Backend**: default FastAPI template unchanged (mongo, /api/status). All data mocked client-side per user request ("just a design and working flow")

## Sidebar / Navigation
Overview: Dashboard, Analytics
Operations: Orders, Master Products, Listings & Channels, Returns
Setup & Assets: Channels, Catalogue

## Implemented (2026-02-16) — Product Editing, Segments, Request History, Alerts, Stock KPI Clicks
- **Bug fix — attribute update form**: ProductDetail's Attributes tab now actually saves. Previously `onChange` on ChannelAttributesEditor was a no-op — replaced with `updateProduct` calls that persist to StoreContext.
- **Master Products pencil Edit**: new `EditProductModal` opens from row action `edit-<id>` with three tabs — Master Fields (title/SKU/brand/category/MRP/cost/stock/weight), Channel Attributes (full editor), Sync to Channels (pick channels + fields to push). "Save only" persists to master, "Save & Sync" also pushes overrides to selected channel listings and logs a request.
- **Listings & Channels inline Edit**: pencil icons on both grouped-expanded rows and flat view rows open `EditListingModal` for channel_sku/title/price/stock/status; save updates listing and appends request history.
- **Segments (Operations)**: new state + CRUD (`createSegment/addProductsToSegment/removeProductFromSegment/deleteSegment`). Bulk-select on Master Products → "Create Segment" bulk action → CreateSegmentModal → creates and navigates to `/segments/<id>`. Segment detail shows a Master-Products-style table scoped to the segment with search + status + stock filters, bulk Sync Selected, List Unlisted, remove-from-segment, and per-row Edit. Two demo segments seeded (Hero SKUs, Footwear Collection).
- **Request History (Operations)**: every mutation now flows through `logRequest(action, target, detail, status, actor, durationMs)`. New page at `/requests` shows action, target, detail, requested-by, start time, completion time, and human duration; filterable by status/search.
- **Alerts (Setup)**: new `/alerts` page derives out_of_stock (listed products with available=0), low_stock (available ≤ 10), sync_error (listings with status=error), and request_error (requests with status=error) items. Severity + type + search filters. Click-through to the source entity (`/products/:id`, `/listings/:id`, `/requests`). Also supports `#alert-id` hash focus so any "error" click elsewhere can deep-link here.
- **Listings & Channels stock KPIs are actionable**: new Low Stock KPI card (≤ 10 available) alongside Out of Stock. Clicking either card toggles the `lf-stock` filter — a second click clears. Sync-errors card links to `/alerts`.
- **Sidebar + routes**: added Segments, Request History (Operations), Alerts (Setup) links + all corresponding `/segments`, `/segments/:id`, `/requests`, `/alerts` routes.

## Deferred to Phase 2 (asked but not built in this iteration)
- FastAPI/Neon backend persistence for all entities (state is still client-side; user's Node.js export in `/app/backend-nodejs/` remains the source-of-truth template).
- Analytics advanced filter condition builder (attribute + operator + AND/OR).
- Searchable dropdowns across the app.
- Dashboard: click-KPI to change date range, custom dashlet builder.

## Implemented (2026-02-15) — Revenue Attribution + Stock Management + Report Builder
- **Order-driven stock blocking**: Orders now carry `line_items[]` with master_id + qty + unit_price. Orders in placed/processing/shipped status *block* stock (visible as new "Blocked" column on Master Products & Listings/Channels). Available = Stock − Blocked. Delivered orders physically consume stock; cancelled orders release the block; returned orders restock.
- **Revenue lifecycle**: `revenueSummary` computes Pending (open orders), Confirmed (delivered orders), Refunded (from refunded returns), Net (Confirmed − Refunded). Dashboard + Analytics both show colour-coded KPI grid.
- **Order actions**: Orders page has status-advance buttons (Move to Processing → Mark Shipped → Mark Delivered), Cancel, and Return-flow modal with per-line-item selection + refund calculation + reason picker. Expandable row shows line items and current stock/revenue effect.
- **Returns actions**: Returns page has Confirm Pickup → Mark Received (auto-restocks) → Issue Refund (auto-deducts from revenue) flow, plus Reject. KPI cards for Total / In Progress / Refunded. Expandable rows show per-line stock + revenue impact.
- **Listings & Channels stock filter**: New `lf-stock` dropdown filters listings by All / In stock / Low (≤10) / Out of stock, plus Blocked & Available columns in both grouped and flat views.
- **Analytics Report Builder**: Four report types (Listings by Channel, Revenue by Order, Stock by Product, Channel Summary), multi-select channel chips, status/brand/category/stock-range/date filters, column picker, live preview (first 40 rows), and CSV export downloading only visible columns + all filtered rows.

## Implemented (2026-02-03)
- Global sidebar layout + top bar with breadcrumbs
- Dashboard: 4 KPI cards, revenue trend LineChart, channel-mix BarChart, real-time audit log, per-channel summary
- Analytics: area/pie/bar charts + top performers table
- Master Products: table with sync badges, filters, search, bulk select, row hover actions (Variants / View / List), inline **Variants** column showing count and axes
- CSV Import Wizard (4 steps): dropzone, sample download, auto-mapping, validation, preview with error highlighting, direct-list-to-channels option
- List-on-Channels drawer with progressive mock sync + toasts
- View Listings drawer (side panel) with per-channel metrics
- Listings & Channels page: KPI grid, filters, full listings table
- Listing Detail: 3 tabs (Overrides, Performance, History) with channel-specific title/bullets/price/discount/stock/category overrides, sales velocity chart, audit trail
- Orders (unified cross-channel table)
- Returns table
- Channels management (connect/disconnect, brand cards)
- Catalogue: Category Taxonomies (tree + details), Attribute Schemas, Brands & Media
- **Variants Management (2026-02-03)**: Full-side drawer showing option axes (Size/Color/Style/custom), per-variant stock + price editing, add new option values that auto-generate the cartesian variant SKUs, delete individual variants, add new axes on the fly, aggregate stock rollup, push-to-channels summary showing variants × channels total SKUs. Idempotent updates safe under StrictMode.

## Backlog / P1 / P2
- P1: Persist state to backend (Mongo models: Product, Listing, Channel, Order, Return, Category, Schema, Brand)
- P1: Real marketplace API integrations (SP-API, Shopify Admin, Flipkart, WooCommerce)
- P1: Auth (JWT or Emergent Google) — currently seeded single admin "Ananya Rao"
- P2: Bulk edit modal, saved views/filters, CSV export
- P2: A+ content editor, image uploads (S3), variant management
- P2: Notification center, sync worker dashboard
- P2: Order fulfillment workflow, refund pipeline
