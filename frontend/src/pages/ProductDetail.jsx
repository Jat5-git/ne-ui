import React, { useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Topbar from "@/components/Topbar";
import { useStore } from "@/store/StoreContext";
import { ChannelChip, StatusPill } from "@/components/Pills";
import { ArrowLeft, Radio, Layers, Boxes, Split, ExternalLink, Info, TrendingUp, ShoppingCart, IndianRupee, Percent, Image as ImageIcon } from "lucide-react";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import ListChannelDrawer from "@/components/ListChannelDrawer";
import VariantsDrawer from "@/components/VariantsDrawer";
import StockAllocationDrawer from "@/components/StockAllocationDrawer";
import ImageGallery from "@/components/ImageGallery";
import ChannelAttributesEditor from "@/components/ChannelAttributesEditor";

const fmt = (n) => "₹" + (n || 0).toLocaleString("en-IN");
const CHANNEL_COLORS = { amazon: "#FF9900", shopify: "#7AB55C", flipkart: "#2874F0", woocommerce: "#7F54B3" };

// Deterministic 30-day time series per channel from a 30-day total
const buildTrend = (rows, days) => {
  const trend = [];
  for (let d = days - 1; d >= 0; d--) {
    const date = new Date();
    date.setDate(date.getDate() - d);
    const label = date.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
    const point = { day: label };
    rows.forEach(r => {
      const avg = r.units_sold_30d / 30;
      const seed = (d * 13 + r.channel.length * 7) % 100;
      const noise = ((seed / 100) - 0.5) * avg * 1.2;
      const units = Math.max(0, Math.round(avg + noise));
      point[r.channel] = (point[r.channel] || 0) + units;
      point[`${r.channel}_rev`] = (point[`${r.channel}_rev`] || 0) + units * r.price;
    });
    trend.push(point);
  }
  return trend;
};

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "attributes", label: "Attributes & Schema" },
  { key: "variants", label: "Variants" },
  { key: "performance", label: "Performance" },
  { key: "history", label: "History" },
];

const DATE_RANGES = [
  { key: "7", label: "Last 7 days" },
  { key: "14", label: "Last 14 days" },
  { key: "30", label: "Last 30 days" },
  { key: "90", label: "Last 90 days" },
];

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { products, listings, getVariants, effectiveStock, auditLog, categories, schemas, brands, updateProduct } = useStore();
  const product = products.find(p => p.id === id);
  const [tab, setTab] = useState("overview");
  const [dateRange, setDateRange] = useState("30");
  const [chFilter, setChFilter] = useState("all");
  const [listDrawer, setListDrawer] = useState(false);
  const [varDrawer, setVarDrawer] = useState(false);
  const [stockDrawer, setStockDrawer] = useState(false);

  const productListings = useMemo(() => listings.filter(l => l.master_id === id), [listings, id]);
  const variants = useMemo(() => getVariants(id || ""), [getVariants, id]);
  const category = useMemo(() => categories.find(c => c.name === product?.category), [categories, product]);
  const schema = useMemo(() => schemas.find(s => s.categories.includes(product?.category || "")), [schemas, product]);
  const brand = useMemo(() => brands.find(b => b.name === product?.brand), [brands, product]);

  const filteredRows = useMemo(() => chFilter === "all" ? productListings : productListings.filter(r => r.channel === chFilter), [productListings, chFilter]);
  const days = parseInt(dateRange, 10);
  const trend = useMemo(() => buildTrend(filteredRows, days), [filteredRows, days]);
  // Deterministic conversion-rate per product (2.0–5.5%), stable across renders and filters
  const convRate = useMemo(() => {
    const seed = (product?.id || "").split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    return (2 + (seed % 35) / 10).toFixed(1);
  }, [product]);
  // Scale window: derived numbers change with date range
  const windowFactor = days / 30;

  if (!product) {
    return (
      <>
        <Topbar title="Product not found" />
        <div className="p-8"><Link to="/products" className="text-[13px] text-[var(--primary)]">← Back to Master Products</Link></div>
      </>
    );
  }

  const totalUnits = Math.round(filteredRows.reduce((s, r) => s + r.units_sold_30d, 0) * windowFactor);
  const totalRev = Math.round(filteredRows.reduce((s, r) => s + r.revenue_30d, 0) * windowFactor);
  const aov = totalUnits > 0 ? Math.round(totalRev / totalUnits) : 0;
  const totalStock = filteredRows.reduce((s, r) => s + effectiveStock(r), 0);
  const activeCount = filteredRows.filter(r => r.status === "active").length;

  const relatedLogs = auditLog.filter(a => a.detail.includes(product.sku));

  return (
    <>
      <Topbar
        breadcrumb={<Link to="/products" className="hover:underline flex items-center gap-1"><ArrowLeft size={11} />Master Products</Link>}
        title={product.title}
        subtitle={
          <span className="flex items-center gap-2 flex-wrap">
            <span className="tabular text-[11px] text-[var(--fg-muted)]">{product.sku}</span>
            <span className="text-[var(--fg-muted)]">·</span>
            <StatusPill status={product.status} />
            <span className="text-[var(--fg-muted)]">·</span>
            <span className={`inline-flex items-center px-1.5 py-0.5 border text-[9px] uppercase tracking-widest font-medium ${product.stock_mode === "central" ? "border-[var(--border)] text-[var(--fg-muted)]" : "border-[var(--primary)] text-[var(--primary)] bg-[#F0F4FF]"}`}>
              {product.stock_mode === "central" ? <Boxes size={9} className="mr-0.5" /> : <Split size={9} className="mr-0.5" />}
              {product.stock_mode === "central" ? "Central Pool" : "Allocated"}
            </span>
            <span className="tabular text-[11px]">{product.stock} units master pool</span>
          </span>
        }
        actions={
          <>
            <button data-testid="pd-variants-btn" onClick={() => setVarDrawer(true)} className="px-3 py-1.5 text-[12px] border border-[var(--border)] hover:bg-[var(--surface)] flex items-center gap-1.5 transition-colors">
              <Layers size={12} />Variants ({variants.length})
            </button>
            <button data-testid="pd-stock-btn" onClick={() => setStockDrawer(true)} className="px-3 py-1.5 text-[12px] border border-[var(--border)] hover:bg-[var(--surface)] flex items-center gap-1.5 transition-colors">
              <Boxes size={12} />Stock
            </button>
            <button data-testid="pd-list-btn" onClick={() => setListDrawer(true)} className="px-3 py-1.5 text-[12px] bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] flex items-center gap-1.5 transition-colors">
              <Radio size={12} />List on Channel
            </button>
          </>
        }
      />

      <div className="border-b border-[var(--border)] px-8 sticky top-[81px] bg-white/95 backdrop-blur-xl z-10">
        <div className="flex gap-6">
          {TABS.map(t => (
            <button
              key={t.key}
              data-testid={`pd-tab-${t.key}`}
              onClick={() => setTab(t.key)}
              className={`py-3 text-[13px] border-b-2 transition-colors ${tab === t.key ? "border-[var(--primary)] text-[var(--fg)] font-medium" : "border-transparent text-[var(--fg-muted)] hover:text-[var(--fg)]"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-8" data-testid="pd-content">
        {tab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="border border-[var(--border)] p-6">
                <div className="flex gap-6">
                  <div className="w-64 shrink-0">
                    <ImageGallery images={product.images || [product.image]} title={product.title} primaryImage={product.image} size="md" />
                  </div>
                  <div className="flex-1 space-y-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold flex items-center gap-2">
                        Product
                        <span className="inline-flex items-center gap-1 text-[10px] text-[var(--fg-muted)] normal-case tracking-normal">
                          <ImageIcon size={10} />
                          {(product.images || []).length || 1} image{((product.images || []).length || 1) !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="font-display font-black text-2xl tracking-tight mt-1">{product.title}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-[13px]">
                      <div>
                        <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)]">Brand</div>
                        <div className="font-medium mt-0.5">{product.brand}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)]">Category</div>
                        <div className="font-medium mt-0.5">{product.category}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)]">MRP</div>
                        <div className="font-medium tabular mt-0.5">{fmt(product.mrp)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)]">Cost</div>
                        <div className="font-medium tabular mt-0.5">{fmt(product.cost)} <span className="text-[10px] text-[var(--fg-muted)]">· {(((product.mrp - product.cost) / product.mrp) * 100).toFixed(0)}% margin</span></div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)]">Weight</div>
                        <div className="font-medium tabular mt-0.5">{product.weight} kg</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)]">Last Updated</div>
                        <div className="font-medium tabular mt-0.5">{product.updated}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-4 border border-[var(--border)]" data-testid="pd-quick-kpis">
                <div className="p-4 border-r border-[var(--border)]">
                  <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Channels Live</div>
                  <div className="text-2xl font-display font-black tabular mt-1">{product.channels.length}</div>
                </div>
                <div className="p-4 border-r border-[var(--border)]">
                  <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Variants</div>
                  <div className="text-2xl font-display font-black tabular mt-1">{variants.length}</div>
                </div>
                <div className="p-4 border-r border-[var(--border)]">
                  <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Units Sold (30d)</div>
                  <div className="text-2xl font-display font-black tabular mt-1">{totalUnits}</div>
                </div>
                <div className="p-4">
                  <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Revenue (30d)</div>
                  <div className="text-2xl font-display font-black tabular mt-1">{fmt(totalRev)}</div>
                </div>
              </div>

              <div className="border border-[var(--border)]">
                <div className="px-5 py-3 border-b border-[var(--border)] bg-[var(--surface)] flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Live Listings</span>
                  <span className="text-[11px] text-[var(--fg-muted)] tabular">{productListings.length} channels</span>
                </div>
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="p-3 text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">Channel</th>
                      <th className="p-3 text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">Channel SKU</th>
                      <th className="p-3 text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">Status</th>
                      <th className="p-3 text-right text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">Stock</th>
                      <th className="p-3 text-right text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">Price</th>
                      <th className="p-3 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {productListings.map(r => (
                      <tr key={r.id} className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--surface)]">
                        <td className="p-3"><ChannelChip channel={r.channel} /></td>
                        <td className="p-3 tabular text-[11px]">{r.channel_sku}</td>
                        <td className="p-3"><StatusPill status={r.status} /></td>
                        <td className={`p-3 text-right tabular ${effectiveStock(r) === 0 ? "text-[var(--danger)] font-medium" : ""}`}>{effectiveStock(r)}</td>
                        <td className="p-3 text-right tabular font-medium">{fmt(r.price)}</td>
                        <td className="p-3"><Link to={`/listings/${r.id}`} className="p-1 hover:bg-white block"><ExternalLink size={12} className="text-[var(--fg-muted)]" /></Link></td>
                      </tr>
                    ))}
                    {productListings.length === 0 && (
                      <tr><td colSpan={6} className="p-8 text-center text-[12px] text-[var(--fg-muted)]">Not listed on any channel yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-4">
              {brand && (
                <div className="border border-[var(--border)] p-5">
                  <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold mb-3">Brand</div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 flex items-center justify-center text-white font-display font-black" style={{ background: brand.primary_color }}>{brand.name.charAt(0)}</div>
                    <div>
                      <div className="font-display text-base font-black tracking-tight">{brand.name}</div>
                      <div className="text-[11px] text-[var(--fg-muted)] tabular">{brand.assets} media assets</div>
                    </div>
                  </div>
                </div>
              )}

              {category && (
                <div className="border border-[var(--border)] p-5">
                  <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold mb-3">Category Mapping</div>
                  <div className="font-medium text-[14px]">{category.name}</div>
                  <div className="text-[11px] text-[var(--fg-muted)] mt-1">{category.count} products in this category</div>
                  <div className="mt-3 space-y-2 text-[12px]">
                    <div className="flex justify-between"><span className="text-[var(--fg-muted)]">Amazon Cat ID</span><span className="tabular font-medium">{category.amazon_id}</span></div>
                    <div className="flex justify-between"><span className="text-[var(--fg-muted)]">Shopify Type</span><span className="font-medium">{category.shopify_type}</span></div>
                  </div>
                </div>
              )}

              <div className="border border-[var(--border)] p-5">
                <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold mb-3">Inventory</div>
                <div className="space-y-2 text-[12px]">
                  <div className="flex justify-between"><span className="text-[var(--fg-muted)]">Master Pool</span><span className="tabular font-medium">{product.stock}</span></div>
                  <div className="flex justify-between"><span className="text-[var(--fg-muted)]">Total Variants</span><span className="tabular font-medium">{variants.length}</span></div>
                  <div className="flex justify-between"><span className="text-[var(--fg-muted)]">In Channels</span><span className="tabular font-medium">{totalStock}</span></div>
                  <div className="flex justify-between"><span className="text-[var(--fg-muted)]">Stock Mode</span><span className="font-medium">{product.stock_mode === "central" ? "Central Pool" : "Allocated"}</span></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "attributes" && (
          <div className="space-y-6">
            <ChannelAttributesEditor
              category={product.category}
              values={product.channel_attributes || {}}
              onChange={(next) => updateProduct(product.id, { channel_attributes: next })}
              customAttrs={product.custom_attributes || {}}
              onCustomChange={(next) => updateProduct(product.id, { custom_attributes: next })}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="border border-[var(--border)] p-5">
                <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold mb-3">Option Axes</div>
                {(product.option_axes || []).length === 0 && <div className="text-[12px] text-[var(--fg-muted)] italic">No option axes defined.</div>}
                {(product.option_axes || []).map(axis => (
                  <div key={axis.name} className="mb-3 last:mb-0">
                    <div className="flex items-baseline justify-between mb-1.5">
                      <span className="text-[12px] font-medium">{axis.name}</span>
                      <span className="text-[10px] text-[var(--fg-muted)] tabular">{axis.values.length} values</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {axis.values.map(v => <span key={v} className="chip">{v}</span>)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="border border-[var(--border)] p-5">
                <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold mb-3">Master Attributes</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[12px]">
                  <span className="text-[var(--fg-muted)]">SKU</span><span className="tabular font-medium">{product.sku}</span>
                  <span className="text-[var(--fg-muted)]">Brand</span><span className="font-medium">{product.brand}</span>
                  <span className="text-[var(--fg-muted)]">Category</span><span className="font-medium">{product.category}</span>
                  <span className="text-[var(--fg-muted)]">Weight</span><span className="tabular font-medium">{product.weight} kg</span>
                  <span className="text-[var(--fg-muted)]">MRP</span><span className="tabular font-medium">{fmt(product.mrp)}</span>
                  <span className="text-[var(--fg-muted)]">Cost</span><span className="tabular font-medium">{fmt(product.cost)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "variants" && (
          <div className="border border-[var(--border)]">
            <div className="px-5 py-3 border-b border-[var(--border)] bg-[var(--surface)] flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Variants ({variants.length})</span>
              <button data-testid="pd-manage-variants" onClick={() => setVarDrawer(true)} className="px-3 py-1 text-[11px] border border-[var(--border)] bg-white hover:bg-[var(--surface-2)]">Manage</button>
            </div>
            {variants.length === 0 ? (
              <div className="p-10 text-center text-[13px] text-[var(--fg-muted)]">No variants configured. Click Manage to add option axes and generate SKUs.</div>
            ) : (
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    {(product.option_axes || []).map(a => <th key={a.name} className="p-2.5 text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">{a.name}</th>)}
                    <th className="p-2.5 text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">Variant SKU</th>
                    <th className="p-2.5 text-right text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">Stock</th>
                    <th className="p-2.5 text-right text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {variants.map(v => (
                    <tr key={v.id} className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--surface)]">
                      {(product.option_axes || []).map(a => <td key={a.name} className="p-2.5"><span className="chip">{v.options[a.name] || "—"}</span></td>)}
                      <td className="p-2.5 tabular text-[11px]">{v.sku}</td>
                      <td className={`p-2.5 text-right tabular ${v.stock === 0 ? "text-[var(--danger)]" : ""}`}>{v.stock}</td>
                      <td className="p-2.5 text-right tabular font-medium">{fmt(v.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === "performance" && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap p-4 border border-[var(--border)] bg-[var(--surface)]" data-testid="perf-filters">
              <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold mr-2">Date Range</div>
              <div className="flex items-center border border-[var(--border)] divide-x divide-[var(--border)] bg-white">
                {DATE_RANGES.map(r => (
                  <button key={r.key} data-testid={`perf-range-${r.key}`} onClick={() => setDateRange(r.key)} className={`px-3 py-1.5 text-[12px] transition-colors ${dateRange === r.key ? "bg-[var(--fg)] text-white" : "hover:bg-[var(--surface)]"}`}>{r.label}</button>
                ))}
              </div>
              <div className="w-px h-6 bg-[var(--border)] mx-1"></div>
              <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold mr-2">Channel</div>
              <div className="flex items-center border border-[var(--border)] divide-x divide-[var(--border)] bg-white">
                <button data-testid="perf-ch-all" onClick={() => setChFilter("all")} className={`px-3 py-1.5 text-[12px] transition-colors ${chFilter === "all" ? "bg-[var(--fg)] text-white" : "hover:bg-[var(--surface)]"}`}>All</button>
                {product.channels.map(c => (
                  <button key={c} data-testid={`perf-ch-${c}`} onClick={() => setChFilter(c)} className={`px-3 py-1.5 text-[12px] capitalize transition-colors ${chFilter === c ? "bg-[var(--fg)] text-white" : "hover:bg-[var(--surface)]"}`}>{c}</button>
                ))}
              </div>
              <div className="ml-auto text-[11px] text-[var(--fg-muted)] tabular">{filteredRows.length} listing{filteredRows.length !== 1 ? "s" : ""} · {days} days</div>
            </div>

            <div className="grid grid-cols-4 border border-[var(--border)]">
              <div className="p-4 border-r border-[var(--border)] flex items-start justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Units Sold</div>
                  <div className="text-2xl font-display font-black tabular mt-1">{totalUnits}</div>
                </div>
                <ShoppingCart size={14} className="text-[var(--fg-muted)] mt-1" />
              </div>
              <div className="p-4 border-r border-[var(--border)] flex items-start justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Revenue</div>
                  <div className="text-2xl font-display font-black tabular mt-1">{fmt(totalRev)}</div>
                </div>
                <IndianRupee size={14} className="text-[var(--fg-muted)] mt-1" />
              </div>
              <div className="p-4 border-r border-[var(--border)] flex items-start justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Avg Order Value</div>
                  <div className="text-2xl font-display font-black tabular mt-1">{fmt(aov)}</div>
                </div>
                <TrendingUp size={14} className="text-[var(--fg-muted)] mt-1" />
              </div>
              <div className="p-4 flex items-start justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Conv. Rate</div>
                  <div className="text-2xl font-display font-black tabular mt-1">{(2.4 + Math.random() * 2).toFixed(1)}%</div>
                </div>
                <Percent size={14} className="text-[var(--fg-muted)] mt-1" />
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 border border-[var(--border)] p-6" data-testid="perf-units-chart">
                <div className="flex items-baseline justify-between mb-4">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Sales Velocity</div>
                    <div className="font-display text-lg font-black tracking-tight mt-0.5">Units sold · {days} days</div>
                  </div>
                  <div className="flex gap-3 text-[11px]">
                    {filteredRows.map(r => (
                      <span key={r.channel} className="flex items-center gap-1.5"><span className="w-2 h-2" style={{ background: CHANNEL_COLORS[r.channel] }}></span>{r.channel_label}</span>
                    ))}
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={trend}>
                    <defs>
                      {filteredRows.map(r => (
                        <linearGradient key={r.channel} id={`grad-${r.channel}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={CHANNEL_COLORS[r.channel]} stopOpacity={0.35} />
                          <stop offset="100%" stopColor={CHANNEL_COLORS[r.channel]} stopOpacity={0} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="2 2" stroke="#E5E7EB" />
                    <XAxis dataKey="day" tick={{ fontSize: 10, fontFamily: "IBM Plex Mono" }} stroke="#9CA3AF" interval={Math.max(0, Math.floor(days / 8))} />
                    <YAxis tick={{ fontSize: 10, fontFamily: "IBM Plex Mono" }} stroke="#9CA3AF" />
                    <Tooltip contentStyle={{ fontSize: 12, border: "1px solid #E5E7EB", borderRadius: 2 }} />
                    {filteredRows.map(r => (
                      <Area key={r.channel} type="monotone" dataKey={r.channel} stroke={CHANNEL_COLORS[r.channel]} fill={`url(#grad-${r.channel})`} strokeWidth={2} stackId="1" />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="border border-[var(--border)] p-6" data-testid="perf-channel-share">
                <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Channel Share · Revenue</div>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={filteredRows.map(r => ({ name: r.channel_label, value: r.revenue_30d, channel: r.channel }))} dataKey="value" nameKey="name" innerRadius={45} outerRadius={85} paddingAngle={2}>
                      {filteredRows.map((r, i) => <Cell key={i} fill={CHANNEL_COLORS[r.channel]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12 }} formatter={(v) => fmt(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-1.5 mt-2">
                  {filteredRows.map(r => {
                    const pct = totalRev > 0 ? (r.revenue_30d / totalRev) * 100 : 0;
                    return (
                      <div key={r.channel} className="flex items-center justify-between text-[11px] py-0.5">
                        <span className="flex items-center gap-1.5"><span className="w-2 h-2" style={{ background: CHANNEL_COLORS[r.channel] }}></span>{r.channel_label}</span>
                        <span className="tabular">{pct.toFixed(0)}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="border border-[var(--border)] p-6" data-testid="perf-rev-chart">
                <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Revenue trend · {days} days</div>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={trend}>
                    <CartesianGrid strokeDasharray="2 2" stroke="#E5E7EB" />
                    <XAxis dataKey="day" tick={{ fontSize: 10, fontFamily: "IBM Plex Mono" }} stroke="#9CA3AF" interval={Math.max(0, Math.floor(days / 8))} />
                    <YAxis tick={{ fontSize: 10, fontFamily: "IBM Plex Mono" }} stroke="#9CA3AF" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={{ fontSize: 12 }} formatter={(v) => fmt(v)} />
                    {filteredRows.map(r => (
                      <Line key={r.channel} type="monotone" dataKey={`${r.channel}_rev`} stroke={CHANNEL_COLORS[r.channel]} strokeWidth={2} dot={false} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="border border-[var(--border)] p-6" data-testid="perf-channel-bar">
                <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Units by channel · {days} days</div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={filteredRows.map(r => ({ name: r.channel_label, units: r.units_sold_30d, channel: r.channel }))} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="2 2" stroke="#E5E7EB" />
                    <XAxis type="number" tick={{ fontSize: 10, fontFamily: "IBM Plex Mono" }} stroke="#9CA3AF" />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="#6B7280" width={70} />
                    <Tooltip contentStyle={{ fontSize: 12 }} />
                    <Bar dataKey="units">
                      {filteredRows.map((r, i) => <Cell key={i} fill={CHANNEL_COLORS[r.channel]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="border border-[var(--border)]" data-testid="perf-channel-table">
              <div className="px-5 py-3 border-b border-[var(--border)] bg-[var(--surface)]">
                <span className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Channel Performance Breakdown</span>
              </div>
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="p-3 text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">Channel</th>
                    <th className="p-3 text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">Status</th>
                    <th className="p-3 text-right text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">Units</th>
                    <th className="p-3 text-right text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">Revenue</th>
                    <th className="p-3 text-right text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">AOV</th>
                    <th className="p-3 text-right text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map(r => {
                    const rUnits = Math.round(r.units_sold_30d * windowFactor);
                    const rRev = Math.round(r.revenue_30d * windowFactor);
                    const share = totalRev > 0 ? (rRev / totalRev) * 100 : 0;
                    const rAov = rUnits > 0 ? Math.round(rRev / rUnits) : 0;
                    return (
                      <tr key={r.id} className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--surface)]">
                        <td className="p-3"><ChannelChip channel={r.channel} /></td>
                        <td className="p-3"><StatusPill status={r.status} /></td>
                        <td className="p-3 text-right tabular">{rUnits}</td>
                        <td className="p-3 text-right tabular font-medium">{fmt(rRev)}</td>
                        <td className="p-3 text-right tabular text-[var(--fg-muted)]">{fmt(rAov)}</td>
                        <td className="p-3 text-right">
                          <div className="inline-flex items-center gap-2 justify-end">
                            <div className="w-16 h-1.5 bg-[var(--surface-2)] relative">
                              <div className="absolute inset-y-0 left-0" style={{ width: `${share}%`, background: CHANNEL_COLORS[r.channel] }}></div>
                            </div>
                            <span className="tabular text-[11px] w-8 text-right">{share.toFixed(0)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredRows.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-[12px] text-[var(--fg-muted)]">No listings match the filters.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "history" && (
          <div className="border border-[var(--border)]">
            <div className="px-5 py-3 border-b border-[var(--border)] bg-[var(--surface)] flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Audit Trail — {product.sku}</span>
              <span className="text-[11px] text-[var(--fg-muted)] tabular">{relatedLogs.length} events</span>
            </div>
            {relatedLogs.length === 0 ? (
              <div className="p-10 text-center text-[13px] text-[var(--fg-muted)]">No audit events for this product yet.</div>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {relatedLogs.map((log, i) => (
                  <div key={i} className="px-5 py-3 flex items-start gap-4 text-[13px]">
                    <span className="tabular text-[11px] text-[var(--fg-muted)] w-32 shrink-0">{log.ts}</span>
                    <span className={`w-1.5 h-1.5 rounded-full mt-2 ${log.level === "error" ? "bg-[var(--danger)]" : log.level === "success" ? "bg-[var(--success)]" : "bg-[var(--fg-muted)]"}`}></span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{log.event}</div>
                      <div className="text-[12px] text-[var(--fg-muted)]">{log.detail}</div>
                    </div>
                    <span className="text-[11px] text-[var(--fg-muted)]">{log.actor}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {listDrawer && <ListChannelDrawer product={product} onClose={() => setListDrawer(false)} />}
      {varDrawer && <VariantsDrawer product={product} onClose={() => setVarDrawer(false)} />}
      {stockDrawer && <StockAllocationDrawer product={product} onClose={() => setStockDrawer(false)} />}
    </>
  );
}
