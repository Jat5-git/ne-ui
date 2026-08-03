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

## Implemented (2026-02-03)
- Global sidebar layout + top bar with breadcrumbs
- Dashboard: 4 KPI cards, revenue trend LineChart, channel-mix BarChart, real-time audit log, per-channel summary
- Analytics: area/pie/bar charts + top performers table
- Master Products: table with sync badges, filters, search, bulk select, row hover actions (View / Edit / List)
- CSV Import Wizard (4 steps): dropzone, sample download, auto-mapping, validation, preview with error highlighting, direct-list-to-channels option
- List-on-Channels drawer with progressive mock sync + toasts
- View Listings drawer (side panel) with per-channel metrics
- Listings & Channels page: KPI grid, filters, full listings table
- Listing Detail: 3 tabs (Overrides, Performance, History) with channel-specific title/bullets/price/discount/stock/category overrides, sales velocity chart, audit trail
- Orders (unified cross-channel table)
- Returns table
- Channels management (connect/disconnect, brand cards)
- Catalogue: Category Taxonomies (tree + details), Attribute Schemas, Brands & Media

## Backlog / P1 / P2
- P1: Persist state to backend (Mongo models: Product, Listing, Channel, Order, Return, Category, Schema, Brand)
- P1: Real marketplace API integrations (SP-API, Shopify Admin, Flipkart, WooCommerce)
- P1: Auth (JWT or Emergent Google) — currently seeded single admin "Ananya Rao"
- P2: Bulk edit modal, saved views/filters, CSV export
- P2: A+ content editor, image uploads (S3), variant management
- P2: Notification center, sync worker dashboard
- P2: Order fulfillment workflow, refund pipeline
