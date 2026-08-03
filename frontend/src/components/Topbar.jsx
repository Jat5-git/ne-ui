import React from "react";
import { Bell, HelpCircle, Zap } from "lucide-react";

export default function Topbar({ title, subtitle, actions, breadcrumb }) {
  return (
    <div className="border-b border-[var(--border)] bg-white sticky top-0 z-20 backdrop-blur-xl bg-white/90" data-testid="topbar">
      <div className="px-8 py-4 flex items-center gap-6">
        <div className="flex-1 min-w-0">
          {breadcrumb && (
            <div className="text-[11px] text-[var(--fg-muted)] tracking-wider uppercase mb-1">{breadcrumb}</div>
          )}
          <h1 className="text-[22px] font-display font-black tracking-tight leading-none" data-testid="page-title">{title}</h1>
          {subtitle && <div className="text-[12px] text-[var(--fg-muted)] mt-1.5">{subtitle}</div>}
        </div>
        <div className="flex items-center gap-2">
          {actions}
          <div className="w-px h-6 bg-[var(--border)] mx-1" />
          <button className="p-2 hover:bg-[var(--surface)] rounded-sm transition-colors" data-testid="topbar-help"><HelpCircle size={16} /></button>
          <button className="p-2 hover:bg-[var(--surface)] rounded-sm transition-colors relative" data-testid="topbar-notif">
            <Bell size={16} />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[var(--danger)] rounded-full"></span>
          </button>
          <button className="p-2 hover:bg-[var(--surface)] rounded-sm transition-colors" data-testid="topbar-sync">
            <Zap size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
