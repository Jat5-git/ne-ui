import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import { MASTER_PRODUCTS, LISTINGS, ORDERS, RETURNS, CHANNELS, CATEGORIES, ATTRIBUTE_SCHEMAS, BRANDS, AUDIT_LOG, VARIANTS } from "@/data/seed";

const StoreContext = createContext(null);

const nowStamp = () => new Date().toISOString().slice(0, 16).replace("T", " ");
const nowISO = () => new Date().toISOString();

const BLOCKING_STATUSES = ["placed", "processing", "shipped"];
const DELIVERED_STATUS = "delivered";
const RESTOCKING_RETURN = ["received", "refunded"];
const REFUNDED_STATUS = "refunded";
const LOW_STOCK_THRESHOLD = 10;

const orderTotal = (o) => (o.line_items || []).reduce((s, li) => s + li.qty * li.unit_price, 0);
const orderQty   = (o) => (o.line_items || []).reduce((s, li) => s + li.qty, 0);
const returnRefund = (r) => (r.line_items || []).reduce((s, li) => s + li.refund_amount, 0);
const returnQty  = (r) => (r.line_items || []).reduce((s, li) => s + li.qty, 0);

const buildVariantSku = (masterSku, options) => {
  const map = { "Obsidian": "OBS", "Chalk White": "CHW", "Ember Red": "EMR", "Slate Grey": "SLG", "Forest Green": "FGR", "Off White": "OFW", "Navy": "NVY", "Midnight": "MID", "Silver": "SLV", "Rose Gold": "RSG", "Sport Band": "SPT", "Milanese Loop": "MIL", "Black": "BLK", "Coral": "CRL", "Matte Black": "MTB", "Brushed Steel": "BST" };
  const suffix = Object.values(options).map(v => map[v] || v.replace(/[^A-Za-z0-9]/g, "").slice(0, 3).toUpperCase()).join("-");
  return `${masterSku}-${suffix}`;
};

export const StoreProvider = ({ children }) => {
  const [products, setProducts] = useState(MASTER_PRODUCTS);
  const [listings, setListings] = useState(LISTINGS);
  const [orders, setOrders] = useState(ORDERS);
  const [returns, setReturns] = useState(RETURNS);
  const [channels, setChannels] = useState(CHANNELS);
  const [categories] = useState(CATEGORIES);
  const [schemas] = useState(ATTRIBUTE_SCHEMAS);
  const [brands] = useState(BRANDS);
  const [auditLog, setAuditLog] = useState(AUDIT_LOG);
  const [variants, setVariants] = useState(VARIANTS);
  const [segments, setSegments] = useState([
    { id: "seg_hero", name: "Hero SKUs", description: "Top-selling flagship products", product_ids: ["mp_001", "mp_004"], created_at: "2026-02-10 09:00", created_by: "Ananya Rao" },
    { id: "seg_footwear", name: "Footwear Collection", description: "All shoes & sneakers for Q1 push", product_ids: ["mp_001", "mp_002", "mp_003", "mp_008"], created_at: "2026-02-05 14:30", created_by: "Ananya Rao" },
  ]);
  const [requestHistory, setRequestHistory] = useState([
    { id: "req_1", action: "Segment created", target: "Hero SKUs", started_at: "2026-02-10 09:00:00", completed_at: "2026-02-10 09:00:02", status: "success", actor: "Ananya Rao", detail: "2 products bundled" },
    { id: "req_2", action: "Bulk sync", target: "STR-RUN-001 → 3 channels", started_at: "2026-02-14 09:12:00", completed_at: "2026-02-14 09:12:14", status: "success", actor: "Sync Worker", detail: "Stock + price synced" },
    { id: "req_3", action: "Listing published", target: "STR-RUN-002 → Flipkart", started_at: "2026-02-13 18:14:00", completed_at: "2026-02-13 18:14:03", status: "success", actor: "Ananya Rao", detail: "SKU created on channel" },
    { id: "req_4", action: "Sync error", target: "PLS-WCH-102 → Flipkart", started_at: "2026-02-14 08:45:00", completed_at: "2026-02-14 08:45:01", status: "error", actor: "Sync Worker", detail: "Missing HSN Code" },
  ]);
  const [attributes, setAttributes] = useState(() => [
    { id: "attr_gtin",    key: "gtin",         label: "GTIN (UPC/EAN)",     type: "text",     options: [], channels: ["amazon","flipkart"], required: true, hint: "12-13 digit barcode", system: true },
    { id: "attr_hsn",     key: "hsn_code",     label: "HSN Code",           type: "text",     options: [], channels: ["global"],           required: true, hint: "8-digit HSN for India", system: true },
    { id: "attr_gst",     key: "gst_rate",     label: "GST Rate (%)",       type: "select",   options: ["0","5","12","18","28"], channels: ["global"], required: true, system: true },
    { id: "attr_bul1",    key: "bullet_1",     label: "Amazon Bullet 1",    type: "text",     options: [], channels: ["amazon"],           required: true, hint: "Max 500 chars", system: true },
    { id: "attr_desc",    key: "description",  label: "Long Description",   type: "textarea", options: [], channels: ["global"],           required: true, hint: "Max 2000 chars", system: true },
    { id: "attr_model",   key: "model_number", label: "Model Number",       type: "text",     options: [], channels: ["flipkart","amazon"],required: true, system: true },
    { id: "attr_vendor",  key: "vendor",       label: "Shopify Vendor",     type: "text",     options: [], channels: ["shopify"],          required: true, system: true },
    { id: "attr_regprc",  key: "regular_price",label: "Woo Regular Price",  type: "number",   options: [], channels: ["woocommerce"],      required: true, system: true },
    { id: "attr_coo",     key: "country_of_origin", label: "Country of Origin", type: "select", options: ["India","China","Vietnam","USA","Germany"], channels: ["global"], required: true, system: true },
    { id: "attr_gender",  key: "gender",       label: "Gender",             type: "select",   options: ["Men","Women","Unisex","Boys","Girls"], channels: ["global"], required: false, system: false },
    { id: "attr_material",key: "material",     label: "Material",           type: "text",     options: [], channels: ["global"],           required: false, system: false },
    { id: "attr_warr",    key: "warranty_months", label: "Warranty (months)", type: "number", options: [], channels: ["global"],           required: false, system: false },
  ]);

  const logEvent = useCallback((event, detail, level = "info", actor = "Ananya Rao") => {
    setAuditLog(prev => [{ ts: nowStamp(), actor, event, detail, level }, ...prev]);
  }, []);

  // Central request history logger — every user/system action goes here
  const logRequest = useCallback((action, target, detail = "", status = "success", actor = "Ananya Rao", durationMs = 800) => {
    const started = new Date();
    const completed = new Date(started.getTime() + durationMs);
    setRequestHistory(prev => [{
      id: `req_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      action, target, detail, status, actor,
      started_at: started.toISOString().slice(0, 19).replace("T", " "),
      completed_at: completed.toISOString().slice(0, 19).replace("T", " "),
    }, ...prev]);
  }, []);

  // -------------------- BLOCKED STOCK --------------------
  const blockedIndex = useMemo(() => {
    const map = {};
    orders.forEach(o => {
      if (!BLOCKING_STATUSES.includes(o.status)) return;
      (o.line_items || []).forEach(li => {
        if (!map[li.master_id]) map[li.master_id] = { total: 0, byChannel: {} };
        map[li.master_id].total += li.qty;
        map[li.master_id].byChannel[o.channel] = (map[li.master_id].byChannel[o.channel] || 0) + li.qty;
      });
    });
    return map;
  }, [orders]);

  const blockedForProduct = useCallback((productId) => blockedIndex[productId]?.total || 0, [blockedIndex]);
  const blockedForChannel = useCallback((productId, channel) => blockedIndex[productId]?.byChannel[channel] || 0, [blockedIndex]);

  // -------------------- REVENUE --------------------
  const revenueSummary = useMemo(() => {
    let pending = 0, confirmed = 0, refunded = 0;
    orders.forEach(o => {
      const t = orderTotal(o);
      if (BLOCKING_STATUSES.includes(o.status)) pending += t;
      else if (o.status === DELIVERED_STATUS) confirmed += t;
    });
    returns.forEach(r => { if (r.status === REFUNDED_STATUS) refunded += returnRefund(r); });
    return { pending, confirmed, refunded, net: confirmed - refunded };
  }, [orders, returns]);

  const revenueByChannel = useMemo(() => {
    const acc = {};
    channels.forEach(c => { acc[c.key] = { pending: 0, confirmed: 0, refunded: 0, net: 0, units: 0 }; });
    orders.forEach(o => {
      const ch = o.channel; if (!acc[ch]) return;
      const t = orderTotal(o), q = orderQty(o);
      if (BLOCKING_STATUSES.includes(o.status)) { acc[ch].pending += t; acc[ch].units += q; }
      else if (o.status === DELIVERED_STATUS)   { acc[ch].confirmed += t; acc[ch].units += q; }
    });
    returns.forEach(r => { if (r.status === REFUNDED_STATUS && acc[r.channel]) acc[r.channel].refunded += returnRefund(r); });
    Object.keys(acc).forEach(k => acc[k].net = acc[k].confirmed - acc[k].refunded);
    return acc;
  }, [orders, returns, channels]);

  // -------------------- STOCK HELPERS --------------------
  const effectiveStock = useCallback((listing) => {
    const p = products.find(x => x.id === listing.master_id);
    if (!p) return listing.stock;
    return p.stock_mode === "central" ? p.stock : listing.stock;
  }, [products]);

  const availableStock = useCallback((productId) => {
    const p = products.find(x => x.id === productId);
    if (!p) return 0;
    return Math.max(0, p.stock - blockedForProduct(productId));
  }, [products, blockedForProduct]);

  const availableForListing = useCallback((listing) => {
    const p = products.find(x => x.id === listing.master_id);
    if (!p) return 0;
    const raw = p.stock_mode === "central" ? p.stock : listing.stock;
    return Math.max(0, raw - blockedForChannel(listing.master_id, listing.channel));
  }, [products, blockedForChannel]);

  const productListings = useCallback((productId) => listings.filter(l => l.master_id === productId), [listings]);

  const productStockView = useCallback((productId) => {
    const p = products.find(x => x.id === productId);
    if (!p) return { mode: "central", total: 0, allocations: {}, unallocated: 0 };
    const rows = listings.filter(l => l.master_id === productId);
    if (p.stock_mode === "central") {
      return { mode: "central", total: p.stock, allocations: {}, unallocated: 0, channels_visible: rows.map(r => r.channel) };
    }
    const allocations = {};
    rows.forEach(r => { allocations[r.channel] = r.stock; });
    const allocated_sum = Object.values(allocations).reduce((a, b) => a + b, 0);
    return { mode: "allocated", total: p.stock, allocations, unallocated: Math.max(0, p.stock - allocated_sum), channels_visible: rows.map(r => r.channel) };
  }, [products, listings]);

  // -------------------- DELIVERED / RETURNED counters (order-driven, date-aware) --------------------
  // deliveredIndex: qty delivered per (product, channel) — used by Master Products "Delivered" column.
  // Returns received/refunded net-off from delivered totals so the number reflects actual sold units.
  const deliveredIndex = useMemo(() => {
    const map = {};
    orders.forEach(o => {
      if (o.status !== DELIVERED_STATUS) return;
      (o.line_items || []).forEach(li => {
        if (!map[li.master_id]) map[li.master_id] = { total: 0, byChannel: {}, byDate: [] };
        map[li.master_id].total += li.qty;
        map[li.master_id].byChannel[o.channel] = (map[li.master_id].byChannel[o.channel] || 0) + li.qty;
        map[li.master_id].byDate.push({ date: o.date, qty: li.qty, channel: o.channel, unit_price: li.unit_price });
      });
    });
    // Subtract restocked returns
    returns.forEach(r => {
      if (!RESTOCKING_RETURN.includes(r.status)) return;
      (r.line_items || []).forEach(li => {
        if (!map[li.master_id]) return;
        map[li.master_id].total = Math.max(0, map[li.master_id].total - li.qty);
        map[li.master_id].byChannel[r.channel] = Math.max(0, (map[li.master_id].byChannel[r.channel] || 0) - li.qty);
      });
    });
    return map;
  }, [orders, returns]);

  const deliveredForProduct = useCallback((productId) => deliveredIndex[productId]?.total || 0, [deliveredIndex]);
  const deliveredForChannel = useCallback((productId, channel) => deliveredIndex[productId]?.byChannel[channel] || 0, [deliveredIndex]);

  // Sold + revenue for a listing scoped to a date range (from/to are ISO strings YYYY-MM-DD)
  const soldForListingInRange = useCallback((masterId, channel, from, to) => {
    let units = 0, revenue = 0;
    orders.forEach(o => {
      if (o.status !== DELIVERED_STATUS) return;
      if (channel && o.channel !== channel) return;
      if (from && o.date < from) return;
      if (to && o.date > to) return;
      (o.line_items || []).forEach(li => {
        if (li.master_id !== masterId) return;
        units += li.qty;
        revenue += li.qty * li.unit_price;
      });
    });
    return { units, revenue };
  }, [orders]);

  // Top N products sold per channel (based on delivered qty, all-time)
  const topProductsByChannel = useCallback((n = 5) => {
    const acc = {};
    orders.forEach(o => {
      if (o.status !== DELIVERED_STATUS) return;
      if (!acc[o.channel]) acc[o.channel] = {};
      (o.line_items || []).forEach(li => {
        if (!acc[o.channel][li.master_id]) acc[o.channel][li.master_id] = { qty: 0, revenue: 0 };
        acc[o.channel][li.master_id].qty += li.qty;
        acc[o.channel][li.master_id].revenue += li.qty * li.unit_price;
      });
    });
    const result = {};
    Object.entries(acc).forEach(([ch, byProd]) => {
      result[ch] = Object.entries(byProd)
        .map(([pid, v]) => ({ master_id: pid, ...v, product: products.find(p => p.id === pid) }))
        .filter(x => x.product)
        .sort((a, b) => b.qty - a.qty)
        .slice(0, n);
    });
    return result;
  }, [orders, products]);

  // Unique users (system-wide) for RequestHistory filter — derived from actors in the log
  const users = useMemo(() => {
    const set = new Set();
    requestHistory.forEach(r => set.add(r.actor));
    auditLog.forEach(a => set.add(a.actor));
    set.add("Ananya Rao"); set.add("Sync Worker");
    return Array.from(set).sort();
  }, [requestHistory, auditLog]);
  const alerts = useMemo(() => {
    const items = [];
    products.forEach(p => {
      const avail = Math.max(0, p.stock - (blockedIndex[p.id]?.total || 0));
      if (avail === 0 && p.status === "listed") items.push({ id: `alert_oos_${p.id}`, severity: "critical", type: "out_of_stock", title: "Out of stock", entity_type: "product", entity_id: p.id, entity_label: `${p.sku} · ${p.title}`, message: `${p.title} is out of stock across all channels`, action: `/products/${p.id}`, action_label: "Open product", detected_at: p.updated });
      else if (avail > 0 && avail <= LOW_STOCK_THRESHOLD && p.status === "listed") items.push({ id: `alert_low_${p.id}`, severity: "warning", type: "low_stock", title: "Low stock", entity_type: "product", entity_id: p.id, entity_label: `${p.sku} · ${p.title}`, message: `Only ${avail} units available (threshold ≤ ${LOW_STOCK_THRESHOLD})`, action: `/products/${p.id}`, action_label: "Open product", detected_at: p.updated });
    });
    listings.forEach(l => {
      if (l.status === "error") items.push({ id: `alert_sync_${l.id}`, severity: "critical", type: "sync_error", title: "Sync failed", entity_type: "listing", entity_id: l.id, entity_label: `${l.channel_sku} · ${l.channel_label}`, message: `Listing failed to sync on ${l.channel_label}. Common causes: missing HSN, malformed GTIN, category mismatch.`, action: `/listings/${l.id}`, action_label: "Open listing", detected_at: l.last_synced });
    });
    requestHistory.forEach(r => {
      if (r.status === "error") items.push({ id: `alert_req_${r.id}`, severity: "warning", type: "request_error", title: r.action, entity_type: "request", entity_id: r.id, entity_label: r.target, message: r.detail || "Request failed. Check request history for details.", action: "/requests", action_label: "View history", detected_at: r.started_at });
    });
    return items;
  }, [products, listings, requestHistory, blockedIndex]);

  // -------------------- PRODUCT & LISTING ACTIONS --------------------
  const addProducts = useCallback((newRows) => {
    setProducts(prev => [...newRows.map(r => ({ stock_mode: "central", ...r })), ...prev]);
    setVariants(prev => {
      const next = { ...prev };
      newRows.forEach(r => { next[r.id] = []; });
      return next;
    });
    newRows.forEach(r => logRequest("Product created", r.sku, `${r.title} added to master inventory`));
  }, [logRequest]);

  // NEW: edit any master product fields (title, MRP, cost, stock, attributes etc)
  const updateProduct = useCallback((productId, patch) => {
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, ...patch, updated: new Date().toISOString().slice(0, 10) } : p));
    const p = products.find(x => x.id === productId);
    if (p) {
      logEvent("Product updated", `${p.sku} — ${Object.keys(patch).join(", ")}`, "info");
      logRequest("Product updated", p.sku, `Fields: ${Object.keys(patch).join(", ")}`);
    }
  }, [products, logEvent, logRequest]);

  // NEW: push updated master data down to selected channel listings (mock sync)
  const pushProductToChannels = useCallback((productId, channelKeys, fieldsToSync = ["title", "price", "stock"]) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    setListings(prev => prev.map(l => {
      if (l.master_id !== productId || !channelKeys.includes(l.channel)) return l;
      const price_mul = { amazon: 1.05, shopify: 1.10, flipkart: 1.02, woocommerce: 1.08 };
      const patch = {};
      if (fieldsToSync.includes("title")) patch.title = product.title;
      if (fieldsToSync.includes("price")) patch.price = Math.round(product.mrp * (price_mul[l.channel] || 1));
      if (fieldsToSync.includes("stock") && product.stock_mode === "central") patch.stock = product.stock;
      return { ...l, ...patch, last_synced: nowStamp() };
    }));
    logEvent("Sync to channels", `${product.sku} → ${channelKeys.join(", ")}`, "success");
    logRequest("Sync to channels", `${product.sku} → ${channelKeys.length} channels`, `Fields: ${fieldsToSync.join(", ")} · Channels: ${channelKeys.join(", ")}`, "success", "Ananya Rao", 1200);
  }, [products, logEvent, logRequest]);

  const listProductOnChannels = useCallback((productId, channelKeys) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    setProducts(prev => prev.map(p => {
      if (p.id !== productId) return p;
      const merged = Array.from(new Set([...(p.channels || []), ...channelKeys]));
      return { ...p, channels: merged, status: merged.length ? "listed" : "unlisted" };
    }));
    const price_mul = { amazon: 1.05, shopify: 1.10, flipkart: 1.02, woocommerce: 1.08 };
    const totalChannels = channelKeys.length + (product.channels?.length || 0);
    const evenSplit = totalChannels > 0 ? Math.floor(product.stock / totalChannels) : product.stock;
    const newListings = channelKeys
      .filter(ch => !listings.some(l => l.master_id === productId && l.channel === ch))
      .map((ch, idx) => ({
        id: `lst_new_${productId}_${ch}_${Date.now()}_${idx}`,
        master_id: productId, master_sku: product.sku, title: product.title, image: product.image,
        channel: ch, channel_label: ch.charAt(0).toUpperCase() + ch.slice(1),
        channel_sku: `${ch.slice(0, 3).toUpperCase()}-${product.sku}`,
        status: "active", stock: evenSplit,
        price: Math.round(product.mrp * (price_mul[ch] || 1)),
        last_synced: nowStamp(), units_sold_30d: 0, revenue_30d: 0,
      }));
    setListings(prev => [...newListings, ...prev]);
    channelKeys.forEach(ch => {
      logEvent("Listing published", `${product.sku} → ${ch}`, "success");
      logRequest("Listing published", `${product.sku} → ${ch}`, `New channel listing created`);
    });
  }, [products, listings, logEvent, logRequest]);

  const updateListing = useCallback((listingId, patch) => {
    setListings(prev => prev.map(l => l.id === listingId ? { ...l, ...patch, last_synced: nowStamp() } : l));
    logEvent("Listing updated", `Listing ${listingId} — ${Object.keys(patch).join(", ")}`);
    logRequest("Listing updated", listingId, `Fields: ${Object.keys(patch).join(", ")}`);
  }, [logEvent, logRequest]);

  const toggleChannel = useCallback((channelId) => {
    setChannels(prev => prev.map(c => c.id === channelId ? { ...c, status: c.status === "connected" ? "disconnected" : "connected" } : c));
  }, []);

  // -------------------- STOCK ALLOCATION --------------------
  const setStockMode = useCallback((productId, mode) => {
    const p = products.find(x => x.id === productId);
    if (!p) return;
    const rows = listings.filter(l => l.master_id === productId);
    setProducts(prev => prev.map(x => {
      if (x.id !== productId) return x;
      let newMaster = x.stock;
      if (mode === "central" && x.stock_mode === "allocated") newMaster = rows.reduce((s, r) => s + r.stock, 0);
      return { ...x, stock_mode: mode, stock: newMaster };
    }));
    if (mode === "allocated" && p.stock_mode === "central" && rows.length > 0) {
      const per = Math.floor(p.stock / rows.length);
      const remainder = p.stock - per * rows.length;
      setListings(prev => prev.map(l => {
        if (l.master_id !== productId) return l;
        const idx = rows.findIndex(r => r.id === l.id);
        const extra = idx === 0 ? remainder : 0;
        return { ...l, stock: per + extra, last_synced: nowStamp() };
      }));
    }
    logEvent("Stock mode changed", `${p.sku}: ${p.stock_mode} → ${mode}`, "success");
  }, [products, listings, logEvent]);

  const updateCentralStock = useCallback((productId, newStock) => {
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, stock: Math.max(0, newStock) } : p));
    const p = products.find(x => x.id === productId);
    if (p) logEvent("Central stock updated", `${p.sku}: ${p.stock} → ${newStock} units`, "info");
  }, [products, logEvent]);

  const updateChannelAllocation = useCallback((productId, channelKey, newStock) => {
    setListings(prev => prev.map(l => (l.master_id === productId && l.channel === channelKey) ? { ...l, stock: Math.max(0, newStock), last_synced: nowStamp() } : l));
    const p = products.find(x => x.id === productId);
    if (p) logEvent("Channel allocation updated", `${p.sku} → ${channelKey}: ${newStock} units`, "info");
  }, [products, logEvent]);

  const autoBalance = useCallback((productId) => {
    const p = products.find(x => x.id === productId);
    if (!p) return;
    const rows = listings.filter(l => l.master_id === productId);
    if (rows.length === 0) return;
    const per = Math.floor(p.stock / rows.length);
    const remainder = p.stock - per * rows.length;
    setListings(prev => prev.map(l => {
      if (l.master_id !== productId) return l;
      const idx = rows.findIndex(r => r.id === l.id);
      return { ...l, stock: per + (idx === 0 ? remainder : 0), last_synced: nowStamp() };
    }));
    logEvent("Auto-balanced allocations", `${p.sku}: ${p.stock} units spread across ${rows.length} channels`, "success");
  }, [products, listings, logEvent]);

  const setMasterPool = useCallback((productId, total) => {
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, stock: Math.max(0, total) } : p));
  }, []);

  // -------------------- ORDER LIFECYCLE --------------------
  const applyOrderDelivery = useCallback((order) => {
    setProducts(prev => prev.map(p => {
      const li = (order.line_items || []).filter(x => x.master_id === p.id);
      if (li.length === 0) return p;
      const totalQty = li.reduce((s, x) => s + x.qty, 0);
      return { ...p, stock: Math.max(0, p.stock - totalQty) };
    }));
    setListings(prev => prev.map(l => {
      const prod = products.find(p => p.id === l.master_id);
      if (!prod || prod.stock_mode !== "allocated") return l;
      if (l.channel !== order.channel) return l;
      const q = (order.line_items || []).filter(x => x.master_id === l.master_id).reduce((s, x) => s + x.qty, 0);
      if (q === 0) return l;
      return { ...l, stock: Math.max(0, l.stock - q), units_sold_30d: (l.units_sold_30d || 0) + q, revenue_30d: (l.revenue_30d || 0) + q * l.price, last_synced: nowStamp() };
    }));
  }, [products]);

  const updateOrderStatus = useCallback((orderId, newStatus) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    const prevStatus = order.status;
    if (prevStatus === newStatus) return;
    const validForward = { placed: ["processing", "cancelled"], processing: ["shipped", "cancelled"], shipped: ["delivered", "cancelled"], delivered: ["returned"], cancelled: [], returned: [] };
    if (!(validForward[prevStatus] || []).includes(newStatus)) {
      logEvent("Order status invalid", `${order.channel_order_id}: ${prevStatus} → ${newStatus} rejected`, "error");
      return;
    }
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    if (newStatus === "delivered") {
      applyOrderDelivery(order);
      logEvent("Order delivered", `${order.channel_order_id}: revenue ₹${orderTotal(order).toLocaleString("en-IN")} confirmed`, "success");
      logRequest("Order delivered", order.channel_order_id, `${orderQty(order)} units, ₹${orderTotal(order).toLocaleString("en-IN")}`);
    } else if (newStatus === "cancelled") {
      logEvent("Order cancelled", `${order.channel_order_id}: ${orderQty(order)} units released`, "info");
      logRequest("Order cancelled", order.channel_order_id, `${orderQty(order)} units released`);
    } else {
      logEvent("Order status updated", `${order.channel_order_id}: ${prevStatus} → ${newStatus}`, "info");
      logRequest("Order status updated", order.channel_order_id, `${prevStatus} → ${newStatus}`);
    }
  }, [orders, applyOrderDelivery, logEvent, logRequest]);

  // -------------------- RETURNS LIFECYCLE --------------------
  const applyReturnRestock = useCallback((ret) => {
    setProducts(prev => prev.map(p => {
      const li = (ret.line_items || []).filter(x => x.master_id === p.id);
      if (li.length === 0) return p;
      const q = li.reduce((s, x) => s + x.qty, 0);
      return { ...p, stock: p.stock + q };
    }));
    setListings(prev => prev.map(l => {
      const prod = products.find(p => p.id === l.master_id);
      if (!prod || prod.stock_mode !== "allocated") return l;
      if (l.channel !== ret.channel) return l;
      const q = (ret.line_items || []).filter(x => x.master_id === l.master_id).reduce((s, x) => s + x.qty, 0);
      if (q === 0) return l;
      return { ...l, stock: l.stock + q, last_synced: nowStamp() };
    }));
  }, [products]);

  const updateReturnStatus = useCallback((returnId, newStatus) => {
    const ret = returns.find(r => r.id === returnId);
    if (!ret) return;
    const prevStatus = ret.status;
    if (prevStatus === newStatus) return;
    const prevRestocked = RESTOCKING_RETURN.includes(prevStatus);
    const nextRestocked = RESTOCKING_RETURN.includes(newStatus);
    if (!prevRestocked && nextRestocked) applyReturnRestock(ret);
    setReturns(prev => prev.map(r => r.id === returnId ? { ...r, status: newStatus } : r));
    if (newStatus === "refunded") {
      logEvent("Return refunded", `${ret.id}: refund ₹${returnRefund(ret).toLocaleString("en-IN")}`, "info");
      logRequest("Return refunded", ret.id, `₹${returnRefund(ret).toLocaleString("en-IN")} deducted from revenue`);
    } else if (newStatus === "received") {
      logEvent("Return received", `${ret.id}: ${returnQty(ret)} units restocked`, "success");
      logRequest("Return received", ret.id, `${returnQty(ret)} units restocked`);
    } else {
      logEvent("Return status updated", `${ret.id}: ${prevStatus} → ${newStatus}`, "info");
      logRequest("Return status updated", ret.id, `${prevStatus} → ${newStatus}`);
    }
  }, [returns, applyReturnRestock, logEvent, logRequest]);

  const createReturn = useCallback((orderId, items, reason) => {
    const order = orders.find(o => o.id === orderId);
    if (!order || order.status !== "delivered") return;
    const ret = { id: `ret_${Date.now().toString().slice(-6)}`, order_id: orderId, channel: order.channel, reason: reason || "Not specified", status: "requested", date: nowStamp().slice(0, 10), line_items: items };
    setReturns(prev => [ret, ...prev]);
    logEvent("Return created", `${ret.id} for ${order.channel_order_id}`, "info");
    logRequest("Return created", `${ret.id} · ${order.channel_order_id}`, `${items.reduce((s, i) => s + i.qty, 0)} units`);
  }, [orders, logEvent, logRequest]);

  // -------------------- SEGMENTS --------------------
  const createSegment = useCallback((name, description, product_ids) => {
    const seg = { id: `seg_${Date.now().toString().slice(-6)}`, name, description: description || "", product_ids: product_ids || [], created_at: nowStamp(), created_by: "Ananya Rao" };
    setSegments(prev => [seg, ...prev]);
    logRequest("Segment created", name, `${(product_ids || []).length} products bundled`);
    return seg.id;
  }, [logRequest]);

  const addProductsToSegment = useCallback((segmentId, product_ids) => {
    setSegments(prev => prev.map(s => {
      if (s.id !== segmentId) return s;
      const merged = Array.from(new Set([...(s.product_ids || []), ...product_ids]));
      return { ...s, product_ids: merged };
    }));
    const seg = segments.find(s => s.id === segmentId);
    if (seg) logRequest("Segment updated", seg.name, `+${product_ids.length} products`);
  }, [segments, logRequest]);

  const removeProductFromSegment = useCallback((segmentId, productId) => {
    setSegments(prev => prev.map(s => s.id === segmentId ? { ...s, product_ids: (s.product_ids || []).filter(p => p !== productId) } : s));
  }, []);

  const deleteSegment = useCallback((segmentId) => {
    const seg = segments.find(s => s.id === segmentId);
    setSegments(prev => prev.filter(s => s.id !== segmentId));
    if (seg) logRequest("Segment deleted", seg.name, "");
  }, [segments, logRequest]);

  // -------------------- VARIANTS --------------------
  const getVariants = useCallback((productId) => variants[productId] || [], [variants]);
  const updateVariant = useCallback((productId, variantId, patch) => {
    setVariants(prev => ({ ...prev, [productId]: (prev[productId] || []).map(v => v.id === variantId ? { ...v, ...patch } : v) }));
    logEvent("Variant updated", `${patch.sku || variantId} — ${Object.keys(patch).join(", ")}`);
  }, [logEvent]);
  const deleteVariant = useCallback((productId, variantId) => {
    setVariants(prev => ({ ...prev, [productId]: (prev[productId] || []).filter(v => v.id !== variantId) }));
    logEvent("Variant deleted", variantId, "info");
  }, [logEvent]);
  const addOptionValue = useCallback((productId, axisName, value) => {
    const product = products.find(p => p.id === productId);
    if (!product || !value.trim()) return;
    setProducts(prev => prev.map(p => {
      if (p.id !== productId) return p;
      const axes = [...(p.option_axes || [])];
      const idx = axes.findIndex(a => a.name === axisName);
      if (idx === -1) axes.push({ name: axisName, values: [value] });
      else { if (axes[idx].values.includes(value)) return p; axes[idx] = { ...axes[idx], values: [...axes[idx].values, value] }; }
      return { ...p, option_axes: axes };
    }));
    setVariants(prev => {
      const existing = prev[productId] || [];
      if (existing.some(v => v.options && v.options[axisName] === value)) return prev;
      const otherAxes = (product.option_axes || []).filter(a => a.name !== axisName);
      const otherCombos = otherAxes.length === 0 ? [{}] : otherAxes.reduce((acc, ax) => {
        if (acc.length === 0) return ax.values.map(v => ({ [ax.name]: v }));
        return acc.flatMap(row => ax.values.map(v => ({ ...row, [ax.name]: v })));
      }, []);
      const newRows = otherCombos.map((combo, i) => {
        const options = { ...combo, [axisName]: value };
        return { id: `var_${productId}_${axisName}_${value}_${i}`.replace(/\s+/g, "_"), product_id: productId, options, sku: buildVariantSku(product.sku, options), stock: 0, price: product.mrp, image: product.image };
      });
      return { ...prev, [productId]: [...existing, ...newRows] };
    });
    logEvent("Variant option added", `${product.sku}: ${axisName} = ${value}`, "success");
  }, [products, logEvent]);
  const addAxis = useCallback((productId, axisName) => {
    if (!axisName.trim()) return;
    setProducts(prev => prev.map(p => {
      if (p.id !== productId) return p;
      const axes = [...(p.option_axes || [])];
      if (axes.some(a => a.name === axisName)) return p;
      axes.push({ name: axisName, values: [] });
      return { ...p, option_axes: axes };
    }));
  }, []);
  const totalStock = useCallback((productId) => {
    const vs = variants[productId] || [];
    if (vs.length === 0) { const p = products.find(x => x.id === productId); return p?.stock || 0; }
    return vs.reduce((s, v) => s + v.stock, 0);
  }, [variants, products]);

  return (
    <StoreContext.Provider value={{
      products, listings, orders, returns, channels, categories, schemas, brands, auditLog, variants, attributes,
      segments, requestHistory, alerts,
      deliveredForProduct, deliveredForChannel, soldForListingInRange, topProductsByChannel, users,
      addProducts, updateProduct, pushProductToChannels, listProductOnChannels, updateListing, toggleChannel,
      getVariants, updateVariant, deleteVariant, addOptionValue, addAxis, totalStock,
      effectiveStock, productListings, productStockView,
      setStockMode, updateCentralStock, updateChannelAllocation, autoBalance, setMasterPool,
      blockedForProduct, blockedForChannel, availableStock, availableForListing,
      updateOrderStatus, updateReturnStatus, createReturn,
      revenueSummary, revenueByChannel,
      orderTotal, orderQty, returnRefund, returnQty,
      createSegment, addProductsToSegment, removeProductFromSegment, deleteSegment,
      logRequest,
      LOW_STOCK_THRESHOLD,
      addAttribute: (attr) => setAttributes(prev => [{ ...attr, id: `attr_${Date.now()}` }, ...prev]),
      updateAttribute: (id, patch) => setAttributes(prev => prev.map(a => a.id === id ? { ...a, ...patch } : a)),
      deleteAttribute: (id) => setAttributes(prev => prev.filter(a => a.id !== id)),
      attributesForChannels: (chKeys) => {
        const set = new Set(chKeys);
        return attributes.filter(a => a.channels.includes("global") || a.channels.some(c => set.has(c)));
      },
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
};
