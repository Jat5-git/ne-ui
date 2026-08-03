import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, BarChart3, ShoppingCart, Package, Radio, Undo2, Plug, BookOpen, Boxes, Search, Command, Settings, Layers, History, AlertTriangle } from "lucide-react";

const NAV = [
  {
    section: "Overview",
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard, testid: "nav-dashboard" },
      { to: "/analytics", label: "Analytics", icon: BarChart3, testid: "nav-analytics" },
    ],
  },
  {
    section: "Operations",
    items: [
      { to: "/orders", label: "Orders", icon: ShoppingCart, testid: "nav-orders" },
      { to: "/products", label: "Master Products", icon: Package, testid: "nav-products" },
      { to: "/listings", label: "Listings & Channels", icon: Radio, testid: "nav-listings" },
      { to: "/segments", label: "Segments", icon: Layers, testid: "nav-segments" },
      { to: "/returns", label: "Returns", icon: Undo2, testid: "nav-returns" },
      { to: "/requests", label: "Request History", icon: History, testid: "nav-requests" },
    ],
  },
  {
    section: "Setup & Assets",
    items: [
      { to: "/channels", label: "Channels", icon: Plug, testid: "nav-channels" },
      { to: "/catalogue", label: "Catalogue", icon: BookOpen, testid: "nav-catalogue" },
      { to: "/settings", label: "Attribute Management", icon: Settings, testid: "nav-settings" },
      { to: "/alerts", label: "Alerts", icon: AlertTriangle, testid: "nav-alerts" },
    ],
  },
];

export default function Sidebar() {
  const location = useLocation();
  return (
    <aside className="w-[240px] shrink-0 border-r border-[var(--border)] bg-white flex flex-col h-screen sticky top-0" data-testid="app-sidebar">
      <div className="px-4 py-5 border-b border-[var(--border)] flex items-center gap-2">
        <div className="w-7 h-7 bg-[var(--primary)] text-white flex items-center justify-center font-black text-sm" style={{ fontFamily: "Chivo" }}>1</div>
        <div>
          <div className="text-[13px] font-semibold font-display tracking-tight leading-none">One to Many</div>
          <div className="text-[10px] text-[var(--fg-muted)] tracking-widest uppercase mt-1">Multi-Channel OS</div>
        </div>
      </div>

      <div className="px-3 py-3 border-b border-[var(--border)]">
        <button data-testid="sidebar-search" className="w-full flex items-center gap-2 px-2.5 py-1.5 border border-[var(--border)] rounded-sm text-[12px] text-[var(--fg-muted)] hover:bg-[var(--surface)] transition-colors">
          <Search size={13} />
          <span>Quick search…</span>
          <span className="ml-auto flex items-center gap-1">
            <span className="kbd">⌘</span><span className="kbd">K</span>
          </span>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {NAV.map(group => (
          <div key={group.section}>
            <div className="section-label">{group.section}</div>
            {group.items.map(item => {
              const Icon = item.icon;
              const active = location.pathname === item.to || (item.to !== "/" && location.pathname.startsWith(item.to));
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  data-testid={item.testid}
                  className={`side-link ${active ? "active" : ""}`}
                >
                  <Icon size={15} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-[var(--border)] p-3 flex items-center gap-2 text-[12px]">
        <div className="w-7 h-7 bg-neutral-900 text-white flex items-center justify-center rounded-sm font-medium">A</div>
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">Ananya Rao</div>
          <div className="text-[10px] text-[var(--fg-muted)] truncate">Admin · Stride HQ</div>
        </div>
        <Boxes size={14} className="text-[var(--fg-muted)]" />
      </div>
    </aside>
  );
}
