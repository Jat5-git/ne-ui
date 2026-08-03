// Seed demo data for the Multi-Channel Listing platform
// Structured to feel like real business data (SKUs, channels, listings, orders)

export const CHANNELS = [
  { id: "ch_amz", key: "amazon", name: "Amazon India", status: "connected", connected_at: "2025-11-04", listings: 148, revenue_30d: 328400, color: "#FF9900" },
  { id: "ch_shp", key: "shopify", name: "Shopify Store", status: "connected", connected_at: "2025-10-12", listings: 132, revenue_30d: 214900, color: "#7AB55C" },
  { id: "ch_flp", key: "flipkart", name: "Flipkart Seller", status: "connected", connected_at: "2025-12-08", listings: 96, revenue_30d: 168300, color: "#2874F0" },
  { id: "ch_woo", key: "woocommerce", name: "WooCommerce Site", status: "error", connected_at: "2025-11-27", listings: 74, revenue_30d: 92100, color: "#7F54B3" },
];

export const CATEGORIES = [
  { id: "cat_foot", name: "Footwear", parent: null, count: 42, amazon_id: "AMZ-4210", shopify_type: "Shoes" },
  { id: "cat_run", name: "Running Shoes", parent: "cat_foot", count: 18, amazon_id: "AMZ-4218", shopify_type: "Athletic Shoes" },
  { id: "cat_cas", name: "Casual Sneakers", parent: "cat_foot", count: 14, amazon_id: "AMZ-4219", shopify_type: "Sneakers" },
  { id: "cat_elec", name: "Electronics", parent: null, count: 28, amazon_id: "AMZ-1030", shopify_type: "Electronics" },
  { id: "cat_wear", name: "Wearables", parent: "cat_elec", count: 12, amazon_id: "AMZ-1044", shopify_type: "Smart Watches" },
  { id: "cat_home", name: "Home & Kitchen", parent: null, count: 19, amazon_id: "AMZ-7801", shopify_type: "Home" },
  { id: "cat_appl", name: "Small Appliances", parent: "cat_home", count: 11, amazon_id: "AMZ-7812", shopify_type: "Appliances" },
];

export const ATTRIBUTE_SCHEMAS = [
  { id: "sch_foot", name: "Footwear Standard", fields: ["Size Scale (UK/US/EU)", "Sole Material", "Upper Material", "Color", "Gender", "Closure Type"], categories: ["Running Shoes", "Casual Sneakers"], used_by: 32 },
  { id: "sch_elec", name: "Electronics Base", fields: ["Brand", "Model", "Battery Life", "Warranty", "Connectivity", "Weight"], categories: ["Wearables"], used_by: 12 },
  { id: "sch_appl", name: "Appliance Spec", fields: ["Wattage", "Voltage", "Capacity", "Warranty", "Country of Origin"], categories: ["Small Appliances"], used_by: 11 },
];

export const BRANDS = [
  { id: "br_stride", name: "Stride Athletics", assets: 42, primary_color: "#0A0A0A" },
  { id: "br_pulse", name: "Pulse Tech", assets: 28, primary_color: "#002FA7" },
  { id: "br_hearth", name: "Hearth & Co.", assets: 19, primary_color: "#8B4513" },
];

const IMG_SHOE = "https://images.pexels.com/photos/12628400/pexels-photo-12628400.jpeg?auto=compress&cs=tinysrgb&w=200";
const IMG_WATCH = "https://images.pexels.com/photos/8217430/pexels-photo-8217430.jpeg?auto=compress&cs=tinysrgb&w=200";
const IMG_COFFEE = "https://images.unsplash.com/photo-1565452344518-47faca79dc69?auto=format&fit=crop&w=200&q=80";

export const MASTER_PRODUCTS = [
  { id: "mp_001", sku: "STR-RUN-001", title: "Stride Velocity Runner V3", brand: "Stride Athletics", category: "Running Shoes", mrp: 6499, cost: 2100, stock: 240, weight: 0.42, image: IMG_SHOE, channels: ["amazon", "shopify", "flipkart"], status: "listed", updated: "2026-02-14" },
  { id: "mp_002", sku: "STR-RUN-002", title: "Stride Trail Grip Pro", brand: "Stride Athletics", category: "Running Shoes", mrp: 7299, cost: 2450, stock: 158, weight: 0.48, image: IMG_SHOE, channels: ["amazon", "shopify"], status: "listed", updated: "2026-02-11" },
  { id: "mp_003", sku: "STR-CAS-010", title: "Stride Everyday Canvas", brand: "Stride Athletics", category: "Casual Sneakers", mrp: 3199, cost: 980, stock: 412, weight: 0.36, image: IMG_SHOE, channels: ["amazon", "shopify", "flipkart", "woocommerce"], status: "listed", updated: "2026-02-13" },
  { id: "mp_004", sku: "PLS-WCH-101", title: "Pulse Aero Smart Watch", brand: "Pulse Tech", category: "Wearables", mrp: 12499, cost: 4600, stock: 84, weight: 0.05, image: IMG_WATCH, channels: ["amazon", "shopify"], status: "listed", updated: "2026-02-10" },
  { id: "mp_005", sku: "PLS-WCH-102", title: "Pulse Fit Band Slim", brand: "Pulse Tech", category: "Wearables", mrp: 4999, cost: 1600, stock: 0, weight: 0.03, image: IMG_WATCH, channels: ["amazon"], status: "listed", updated: "2026-02-09" },
  { id: "mp_006", sku: "HRT-CFM-201", title: "Hearth Barista Coffee Maker", brand: "Hearth & Co.", category: "Small Appliances", mrp: 14999, cost: 5900, stock: 62, weight: 4.8, image: IMG_COFFEE, channels: ["shopify", "woocommerce"], status: "listed", updated: "2026-02-08" },
  { id: "mp_007", sku: "HRT-BLR-210", title: "Hearth Silent Blender 900W", brand: "Hearth & Co.", category: "Small Appliances", mrp: 8499, cost: 2900, stock: 38, weight: 3.2, image: IMG_COFFEE, channels: [], status: "draft", updated: "2026-02-05" },
  { id: "mp_008", sku: "STR-RUN-003", title: "Stride Marathon Elite", brand: "Stride Athletics", category: "Running Shoes", mrp: 9499, cost: 3400, stock: 96, weight: 0.44, image: IMG_SHOE, channels: [], status: "unlisted", updated: "2026-02-02" },
];

const buildListings = () => {
  const rows = [];
  const price_multiplier = { amazon: 1.05, shopify: 1.10, flipkart: 1.02, woocommerce: 1.08 };
  const statuses_pool = ["active", "active", "active", "active", "paused", "error"];
  let i = 0;
  MASTER_PRODUCTS.forEach(p => {
    p.channels.forEach(ch => {
      const chLabel = ch.charAt(0).toUpperCase() + ch.slice(1);
      const price = Math.round(p.mrp * (price_multiplier[ch] || 1.0));
      const stock = Math.max(0, Math.round(p.stock / (p.channels.length || 1) - (i % 5) * 3));
      const status = statuses_pool[i % statuses_pool.length];
      rows.push({
        id: `lst_${i.toString().padStart(3, "0")}`,
        master_id: p.id,
        master_sku: p.sku,
        title: p.title,
        image: p.image,
        channel: ch,
        channel_label: chLabel,
        channel_sku: `${ch.slice(0, 3).toUpperCase()}-${p.sku}`,
        status,
        stock,
        price,
        last_synced: `2026-02-1${(i % 4) + 1} 09:${(i * 7) % 60}`.padEnd(16, "0"),
        units_sold_30d: 8 + (i * 3) % 40,
        revenue_30d: (8 + (i * 3) % 40) * price,
      });
      i++;
    });
  });
  return rows;
};

export const LISTINGS = buildListings();

export const ORDERS = [
  { id: "ord_10241", channel: "amazon", channel_order_id: "AMZ-402-9931", customer: "Ravi K.", items: 2, total: 12998, status: "shipped", date: "2026-02-14" },
  { id: "ord_10242", channel: "shopify", channel_order_id: "SHP-#4021", customer: "Maya S.", items: 1, total: 6499, status: "processing", date: "2026-02-14" },
  { id: "ord_10243", channel: "flipkart", channel_order_id: "FLP-OD119", customer: "Arjun P.", items: 3, total: 15497, status: "delivered", date: "2026-02-13" },
  { id: "ord_10244", channel: "amazon", channel_order_id: "AMZ-402-9945", customer: "Neha D.", items: 1, total: 12499, status: "shipped", date: "2026-02-13" },
  { id: "ord_10245", channel: "shopify", channel_order_id: "SHP-#4028", customer: "Karan M.", items: 2, total: 22497, status: "pending", date: "2026-02-12" },
  { id: "ord_10246", channel: "woocommerce", channel_order_id: "WOO-8812", customer: "Priya L.", items: 1, total: 14999, status: "delivered", date: "2026-02-11" },
  { id: "ord_10247", channel: "flipkart", channel_order_id: "FLP-OD120", customer: "Sameer T.", items: 1, total: 3199, status: "cancelled", date: "2026-02-10" },
];

export const RETURNS = [
  { id: "ret_301", order_id: "ord_10243", channel: "flipkart", sku: "STR-CAS-010", reason: "Wrong size", status: "in_transit", date: "2026-02-13" },
  { id: "ret_302", order_id: "ord_10246", channel: "woocommerce", sku: "HRT-CFM-201", reason: "Defective", status: "received", date: "2026-02-12" },
  { id: "ret_303", order_id: "ord_10244", channel: "amazon", sku: "PLS-WCH-101", reason: "Changed mind", status: "refunded", date: "2026-02-11" },
];

export const AUDIT_LOG = [
  { ts: "2026-02-14 09:12", actor: "Sync Worker", event: "Stock synced", detail: "STR-RUN-001 → Amazon (stock: 82)", level: "info" },
  { ts: "2026-02-14 09:08", actor: "Ananya (Admin)", event: "Price updated", detail: "STR-RUN-001 → Shopify: ₹7,149 (+5%)", level: "info" },
  { ts: "2026-02-14 08:45", actor: "Sync Worker", event: "Sync error", detail: "PLS-WCH-102 → Flipkart: SKU rejected (missing HSN)", level: "error" },
  { ts: "2026-02-13 22:30", actor: "Sync Worker", event: "Stock synced", detail: "All Amazon listings (148 SKUs)", level: "info" },
  { ts: "2026-02-13 18:14", actor: "Ananya (Admin)", event: "Listing published", detail: "STR-RUN-002 → Flipkart", level: "success" },
];

export const REVENUE_TREND = [
  { day: "Feb 08", amazon: 42000, shopify: 28000, flipkart: 19000, woocommerce: 11000 },
  { day: "Feb 09", amazon: 38000, shopify: 31000, flipkart: 22000, woocommerce: 12500 },
  { day: "Feb 10", amazon: 51000, shopify: 34000, flipkart: 24000, woocommerce: 13000 },
  { day: "Feb 11", amazon: 47000, shopify: 29000, flipkart: 21000, woocommerce: 12200 },
  { day: "Feb 12", amazon: 55000, shopify: 36000, flipkart: 26500, woocommerce: 14000 },
  { day: "Feb 13", amazon: 62000, shopify: 41000, flipkart: 28000, woocommerce: 15200 },
  { day: "Feb 14", amazon: 58000, shopify: 39000, flipkart: 27500, woocommerce: 14100 },
];

export const CSV_SAMPLE = `sku,title,brand,category,mrp,cost,stock,weight_kg
DEMO-001,Runner Air Max,Stride Athletics,Running Shoes,5999,1900,150,0.40
DEMO-002,Casual Loafer Suede,Stride Athletics,Casual Sneakers,3499,1100,220,0.38
DEMO-003,Smart Band Lite,Pulse Tech,Wearables,2999,900,80,0.03
`;
