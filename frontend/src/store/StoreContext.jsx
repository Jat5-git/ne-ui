import React, { createContext, useContext, useState, useCallback } from "react";
import { MASTER_PRODUCTS, LISTINGS, ORDERS, RETURNS, CHANNELS, CATEGORIES, ATTRIBUTE_SCHEMAS, BRANDS, AUDIT_LOG } from "@/data/seed";

const StoreContext = createContext(null);

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

  const addProducts = useCallback((newRows) => {
    setProducts(prev => [...newRows, ...prev]);
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
        last_synced: new Date().toISOString().slice(0, 16).replace("T", " "),
        units_sold_30d: 0,
        revenue_30d: 0,
      }));
    setListings(prev => [...newListings, ...prev]);

    const now = new Date().toISOString().slice(0, 16).replace("T", " ");
    const newLogs = channelKeys.map(ch => ({
      ts: now,
      actor: "Ananya (Admin)",
      event: "Listing published",
      detail: `${product.sku} → ${ch.charAt(0).toUpperCase() + ch.slice(1)}`,
      level: "success",
    }));
    setAuditLog(prev => [...newLogs, ...prev]);
  }, [products, listings]);

  const updateListing = useCallback((listingId, patch) => {
    setListings(prev => prev.map(l => l.id === listingId ? { ...l, ...patch, last_synced: new Date().toISOString().slice(0, 16).replace("T", " ") } : l));
    setAuditLog(prev => [{
      ts: new Date().toISOString().slice(0, 16).replace("T", " "),
      actor: "Ananya (Admin)",
      event: "Listing updated",
      detail: `Listing ${listingId} — ${Object.keys(patch).join(", ")}`,
      level: "info",
    }, ...prev]);
  }, []);

  const toggleChannel = useCallback((channelId) => {
    setChannels(prev => prev.map(c => c.id === channelId ? { ...c, status: c.status === "connected" ? "disconnected" : "connected" } : c));
  }, []);

  return (
    <StoreContext.Provider value={{
      products, listings, orders, returns, channels, categories, schemas, brands, auditLog,
      addProducts, listProductOnChannels, updateListing, toggleChannel,
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
