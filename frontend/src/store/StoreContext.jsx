import React, { createContext, useContext, useState, useCallback } from "react";
import { MASTER_PRODUCTS, LISTINGS, ORDERS, RETURNS, CHANNELS, CATEGORIES, ATTRIBUTE_SCHEMAS, BRANDS, AUDIT_LOG, VARIANTS } from "@/data/seed";

const StoreContext = createContext(null);

const nowStamp = () => new Date().toISOString().slice(0, 16).replace("T", " ");

const buildVariantSku = (masterSku, options) => {
  const map = { "Obsidian": "OBS", "Chalk White": "CHW", "Ember Red": "EMR", "Slate Grey": "SLG", "Forest Green": "FGR", "Off White": "OFW", "Navy": "NVY", "Midnight": "MID", "Silver": "SLV", "Rose Gold": "RSG", "Sport Band": "SPT", "Milanese Loop": "MIL", "Black": "BLK", "Coral": "CRL", "Matte Black": "MTB", "Brushed Steel": "BST" };
  const suffix = Object.values(options).map(v => map[v] || v.replace(/[^A-Za-z0-9]/g, "").slice(0, 3).toUpperCase()).join("-");
  return `${masterSku}-${suffix}`;
};

export const StoreProvider = ({ children }) => {
  const [products, setProducts] = useState(MASTER_PRODUCTS);
  const [listings, setListings] = useState(LISTINGS);
  const [orders] = useState(ORDERS);
  const [returns] = useState(RETURNS);
  const [channels, setChannels] = useState(CHANNELS);
  const [categories] = useState(CATEGORIES);
  const [schemas] = useState(ATTRIBUTE_SCHEMAS);
  const [brands] = useState(BRANDS);
  const [auditLog, setAuditLog] = useState(AUDIT_LOG);
  const [variants, setVariants] = useState(VARIANTS);

  const logEvent = (event, detail, level = "info", actor = "Ananya (Admin)") => {
    setAuditLog(prev => [{ ts: nowStamp(), actor, event, detail, level }, ...prev]);
  };

  // ---- Stock resolution helpers ----
  // In "central" mode, every channel listing shares product.stock.
  // In "allocated" mode, each listing carries its own stock number.
  const effectiveStock = useCallback((listing) => {
    const p = products.find(x => x.id === listing.master_id);
    if (!p) return listing.stock;
    return p.stock_mode === "central" ? p.stock : listing.stock;
  }, [products]);

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

  // ---- Product & listing actions ----
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
    // Even split when adding new channels (allocated mode); central mode ignores stock field.
    const totalChannels = channelKeys.length + (product.channels?.length || 0);
    const evenSplit = totalChannels > 0 ? Math.floor(product.stock / totalChannels) : product.stock;

    const newListings = channelKeys
      .filter(ch => !listings.some(l => l.master_id === productId && l.channel === ch))
      .map((ch, idx) => ({
        id: `lst_new_${productId}_${ch}_${Date.now()}_${idx}`,
        master_id: productId,
        master_sku: product.sku,
        title: product.title,
        image: product.image,
        channel: ch,
        channel_label: ch.charAt(0).toUpperCase() + ch.slice(1),
        channel_sku: `${ch.slice(0, 3).toUpperCase()}-${product.sku}`,
        status: "active",
        stock: evenSplit,
        price: Math.round(product.mrp * (price_mul[ch] || 1)),
        last_synced: nowStamp(),
        units_sold_30d: 0,
        revenue_30d: 0,
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

  // ---- Stock allocation actions ----
  const setStockMode = useCallback((productId, mode) => {
    const p = products.find(x => x.id === productId);
    if (!p) return;
    const rows = listings.filter(l => l.master_id === productId);
    setProducts(prev => prev.map(x => {
      if (x.id !== productId) return x;
      let newMaster = x.stock;
      if (mode === "central" && x.stock_mode === "allocated") {
        // Sum current allocations into the master pool
        newMaster = rows.reduce((s, r) => s + r.stock, 0);
      }
      return { ...x, stock_mode: mode, stock: newMaster };
    }));

    if (mode === "allocated" && p.stock_mode === "central" && rows.length > 0) {
      // Distribute master stock evenly across channels
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

  // ---- Variant actions ----
  const getVariants = useCallback((productId) => variants[productId] || [], [variants]);

  const updateVariant = useCallback((productId, variantId, patch) => {
    setVariants(prev => ({
      ...prev,
      [productId]: (prev[productId] || []).map(v => v.id === variantId ? { ...v, ...patch } : v),
    }));
    logEvent("Variant updated", `${patch.sku || variantId} — ${Object.keys(patch).join(", ")}`);
  }, []);

  const deleteVariant = useCallback((productId, variantId) => {
    setVariants(prev => ({
      ...prev,
      [productId]: (prev[productId] || []).filter(v => v.id !== variantId),
    }));
    logEvent("Variant deleted", variantId, "info");
  }, []);

  const addOptionValue = useCallback((productId, axisName, value) => {
    const product = products.find(p => p.id === productId);
    if (!product || !value.trim()) return;

    setProducts(prev => prev.map(p => {
      if (p.id !== productId) return p;
      const axes = [...(p.option_axes || [])];
      const idx = axes.findIndex(a => a.name === axisName);
      if (idx === -1) {
        axes.push({ name: axisName, values: [value] });
      } else {
        if (axes[idx].values.includes(value)) return p;
        axes[idx] = { ...axes[idx], values: [...axes[idx].values, value] };
      }
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
        return {
          id: `var_${productId}_${axisName}_${value}_${i}`.replace(/\s+/g, "_"),
          product_id: productId,
          options,
          sku: buildVariantSku(product.sku, options),
          stock: 0,
          price: product.mrp,
          image: product.image,
        };
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
    if (vs.length === 0) {
      const p = products.find(x => x.id === productId);
      return p?.stock || 0;
    }
    return vs.reduce((s, v) => s + v.stock, 0);
  }, [variants, products]);

  return (
    <StoreContext.Provider value={{
      products, listings, orders, returns, channels, categories, schemas, brands, auditLog, variants,
      addProducts, listProductOnChannels, updateListing, toggleChannel,
      getVariants, updateVariant, deleteVariant, addOptionValue, addAxis, totalStock,
      effectiveStock, productListings, productStockView,
      setStockMode, updateCentralStock, updateChannelAllocation, autoBalance, setMasterPool,
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
