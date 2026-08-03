import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import { MASTER_PRODUCTS, LISTINGS, ORDERS, RETURNS, CHANNELS, CATEGORIES, ATTRIBUTE_SCHEMAS, BRANDS, AUDIT_LOG, VARIANTS } from "@/data/seed";

const StoreContext = createContext(null);

const nowStamp = () => new Date().toISOString().slice(0, 16).replace("T", " ");

// Status buckets used by stock + revenue logic
const BLOCKING_STATUSES = ["placed", "processing", "shipped"];   // stock is reserved, revenue is PENDING
const DELIVERED_STATUS = "delivered";                            // stock consumed, revenue CONFIRMED
const RESTOCKING_RETURN = ["received", "refunded"];              // stock returned to shelf
const REFUNDED_STATUS = "refunded";                              // revenue subtracted

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
  const [attributes, setAttributes] = useState(() => [
    { id: "attr_gtin",    key: "gtin",         label: "GTIN (UPC/EAN)",     type: "text",     options: [],                                              channels: ["amazon","flipkart"], required: true,  hint: "12-13 digit barcode", system: true },
    { id: "attr_hsn",     key: "hsn_code",     label: "HSN Code",           type: "text",     options: [],                                              channels: ["global"],           required: true,  hint: "8-digit HSN for India", system: true },
    { id: "attr_gst",     key: "gst_rate",     label: "GST Rate (%)",       type: "select",   options: ["0","5","12","18","28"],                        channels: ["global"],           required: true,  system: true },
    { id: "attr_bul1",    key: "bullet_1",     label: "Amazon Bullet 1",    type: "text",     options: [],                                              channels: ["amazon"],           required: true,  hint: "Max 500 chars", system: true },
    { id: "attr_desc",    key: "description",  label: "Long Description",   type: "textarea", options: [],                                              channels: ["global"],           required: true,  hint: "Max 2000 chars", system: true },
    { id: "attr_model",   key: "model_number", label: "Model Number",       type: "text",     options: [],                                              channels: ["flipkart","amazon"],required: true,  system: true },
    { id: "attr_vendor",  key: "vendor",       label: "Shopify Vendor",     type: "text",     options: [],                                              channels: ["shopify"],          required: true,  system: true },
    { id: "attr_regprc",  key: "regular_price",label: "Woo Regular Price",  type: "number",   options: [],                                              channels: ["woocommerce"],      required: true,  system: true },
    { id: "attr_coo",     key: "country_of_origin", label: "Country of Origin", type: "select", options: ["India","China","Vietnam","USA","Germany"], channels: ["global"],           required: true,  system: true },
    { id: "attr_gender",  key: "gender",       label: "Gender",             type: "select",   options: ["Men","Women","Unisex","Boys","Girls"],         channels: ["global"],           required: false, system: false },
    { id: "attr_material",key: "material",     label: "Material",           type: "text",     options: [],                                              channels: ["global"],           required: false, system: false },
    { id: "attr_warr",    key: "warranty_months", label: "Warranty (months)", type: "number", options: [],                                              channels: ["global"],           required: false, system: false },
  ]);

  const logEvent = (event, detail, level = "info", actor = "Ananya (Admin)") => {
    setAuditLog(prev => [{ ts: nowStamp(), actor, event, detail, level }, ...prev]);
  };

  // -------------------- BLOCKED STOCK (from open orders) --------------------
  // A line item blocks stock when its parent order is placed/processing/shipped.
  const blockedIndex = useMemo(() => {
    // { [master_id]: { total: number, byChannel: { [channel]: number } } }
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

  // -------------------- REVENUE ATTRIBUTION --------------------
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

  // Available = on-hand stock − blocked (for view/decisions)
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

  // -------------------- PRODUCT & LISTING ACTIONS --------------------
  const addProducts = useCallback((newRows) => {
    setProducts(prev => [...newRows.map(r => ({ stock_mode: "central", ...r })), ...prev]);
    setVariants(prev => {
      const next = { ...prev };
      newRows.forEach(r => { next[r.id] = []; });
      return next;
    });
  }, []);

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
    channelKeys.forEach(ch => logEvent("Listing published", `${product.sku} → ${ch.charAt(0).toUpperCase() + ch.slice(1)}`, "success"));
  }, [products, listings]);

  const updateListing = useCallback((listingId, patch) => {
    setListings(prev => prev.map(l => l.id === listingId ? { ...l, ...patch, last_synced: nowStamp() } : l));
    logEvent("Listing updated", `Listing ${listingId} — ${Object.keys(patch).join(", ")}`);
  }, []);

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
  }, [products, listings]);

  const updateCentralStock = useCallback((productId, newStock) => {
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, stock: Math.max(0, newStock) } : p));
    const p = products.find(x => x.id === productId);
    if (p) logEvent("Central stock updated", `${p.sku}: ${p.stock} → ${newStock} units`, "info");
  }, [products]);

  const updateChannelAllocation = useCallback((productId, channelKey, newStock) => {
    setListings(prev => prev.map(l => (l.master_id === productId && l.channel === channelKey) ? { ...l, stock: Math.max(0, newStock), last_synced: nowStamp() } : l));
    const p = products.find(x => x.id === productId);
    if (p) logEvent("Channel allocation updated", `${p.sku} → ${channelKey.charAt(0).toUpperCase() + channelKey.slice(1)}: ${newStock} units`, "info");
  }, [products]);

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
  }, [products, listings]);

  const setMasterPool = useCallback((productId, total) => {
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, stock: Math.max(0, total) } : p));
  }, []);

  // -------------------- ORDER LIFECYCLE (drives stock + revenue) --------------------
  // On DELIVERED: reduce on-hand stock (product.stock, and listing.stock in allocated mode) permanently.
  // On CANCELLED (from blocking state): no stock change (blocking simply drops off).
  // Blocked totals are recomputed from live orders, so no explicit release step is needed.
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

    // Guard invalid moves; allow flexible progression + cancellation from any pre-delivered state.
    const validForward = { placed: ["processing", "cancelled"], processing: ["shipped", "cancelled"], shipped: ["delivered", "cancelled"], delivered: ["returned"], cancelled: [], returned: [] };
    if (!(validForward[prevStatus] || []).includes(newStatus)) {
      logEvent("Order status invalid", `${order.channel_order_id}: ${prevStatus} → ${newStatus} rejected`, "error");
      return;
    }

    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));

    if (newStatus === "delivered") {
      applyOrderDelivery(order);
      logEvent("Order delivered", `${order.channel_order_id}: revenue ₹${orderTotal(order).toLocaleString("en-IN")} confirmed, ${orderQty(order)} units consumed`, "success");
    } else if (newStatus === "cancelled") {
      logEvent("Order cancelled", `${order.channel_order_id}: ${orderQty(order)} units released back to available stock`, "info");
    } else {
      logEvent("Order status updated", `${order.channel_order_id}: ${prevStatus} → ${newStatus}`, "info");
    }
  }, [orders, applyOrderDelivery]);

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

    // Handle restock: only apply once when transitioning INTO received/refunded from a non-restocked state
    const prevRestocked = RESTOCKING_RETURN.includes(prevStatus);
    const nextRestocked = RESTOCKING_RETURN.includes(newStatus);
    if (!prevRestocked && nextRestocked) applyReturnRestock(ret);

    setReturns(prev => prev.map(r => r.id === returnId ? { ...r, status: newStatus } : r));

    if (newStatus === "refunded") {
      logEvent("Return refunded", `${ret.id}: refund ₹${returnRefund(ret).toLocaleString("en-IN")} deducted from revenue`, "info");
    } else if (newStatus === "received") {
      logEvent("Return received", `${ret.id}: ${returnQty(ret)} units restocked`, "success");
    } else {
      logEvent("Return status updated", `${ret.id}: ${prevStatus} → ${newStatus}`, "info");
    }
  }, [returns, applyReturnRestock]);

  const createReturn = useCallback((orderId, items, reason) => {
    const order = orders.find(o => o.id === orderId);
    if (!order || order.status !== "delivered") return;
    const ret = {
      id: `ret_${Date.now().toString().slice(-6)}`,
      order_id: orderId,
      channel: order.channel,
      reason: reason || "Not specified",
      status: "requested",
      date: nowStamp().slice(0, 10),
      line_items: items,
    };
    setReturns(prev => [ret, ...prev]);
    logEvent("Return created", `${ret.id} for ${order.channel_order_id}: ${items.reduce((s, i) => s + i.qty, 0)} units`, "info");
  }, [orders]);

  // -------------------- VARIANTS --------------------
  const getVariants = useCallback((productId) => variants[productId] || [], [variants]);
  const updateVariant = useCallback((productId, variantId, patch) => {
    setVariants(prev => ({ ...prev, [productId]: (prev[productId] || []).map(v => v.id === variantId ? { ...v, ...patch } : v) }));
    logEvent("Variant updated", `${patch.sku || variantId} — ${Object.keys(patch).join(", ")}`);
  }, []);
  const deleteVariant = useCallback((productId, variantId) => {
    setVariants(prev => ({ ...prev, [productId]: (prev[productId] || []).filter(v => v.id !== variantId) }));
    logEvent("Variant deleted", variantId, "info");
  }, []);
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
  }, [products]);
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
      // product/listing
      addProducts, listProductOnChannels, updateListing, toggleChannel,
      // variants
      getVariants, updateVariant, deleteVariant, addOptionValue, addAxis, totalStock,
      // stock
      effectiveStock, productListings, productStockView,
      setStockMode, updateCentralStock, updateChannelAllocation, autoBalance, setMasterPool,
      blockedForProduct, blockedForChannel, availableStock, availableForListing,
      // orders + returns
      updateOrderStatus, updateReturnStatus, createReturn,
      // revenue
      revenueSummary, revenueByChannel,
      // computed helpers used by exports
      orderTotal, orderQty, returnRefund, returnQty,
      // attributes
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
