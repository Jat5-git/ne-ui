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

  const addProducts = useCallback((newRows) => {
    setProducts(prev => [...newRows, ...prev]);
    setVariants(prev => {
      const next = { ...prev };
      newRows.forEach(r => { next[r.id] = []; });
      return next;
    });
  }, []);

  const listProductOnChannels = useCallback((productId, channelKeys) => {
    setProducts(prev => prev.map(p => {
      if (p.id !== productId) return p;
      const merged = Array.from(new Set([...(p.channels || []), ...channelKeys]));
      return { ...p, channels: merged, status: merged.length ? "listed" : "unlisted" };
    }));

    const product = products.find(p => p.id === productId);
    if (!product) return;
    const price_mul = { amazon: 1.05, shopify: 1.10, flipkart: 1.02, woocommerce: 1.08 };
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
        stock: Math.round(product.stock / (channelKeys.length + (product.channels?.length || 0)) || product.stock),
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
    let addedAxis = false;
    setProducts(prev => prev.map(p => {
      if (p.id !== productId) return p;
      const axes = [...(p.option_axes || [])];
      const idx = axes.findIndex(a => a.name === axisName);
      if (idx === -1) {
        axes.push({ name: axisName, values: [value] });
        addedAxis = true;
      } else {
        if (axes[idx].values.includes(value)) return p;
        axes[idx] = { ...axes[idx], values: [...axes[idx].values, value] };
      }
      return { ...p, option_axes: axes };
    }));

    // Generate new variants combining new value with all existing option combos on other axes
    setVariants(prev => {
      const existing = prev[productId] || [];
      // Idempotency guard: skip if variants for this axis-value already exist
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
