import React from "react";

export function ChannelChip({ channel, size = "sm" }) {
  const map = {
    amazon: { cls: "chip-amazon", label: "Amazon", dot: "#FF9900" },
    shopify: { cls: "chip-shopify", label: "Shopify", dot: "#7AB55C" },
    flipkart: { cls: "chip-flipkart", label: "Flipkart", dot: "#2874F0" },
    woocommerce: { cls: "chip-woo", label: "Woo", dot: "#7F54B3" },
  };
  const c = map[channel] || { cls: "", label: channel, dot: "#9CA3AF" };
  return (
    <span className={`chip ${c.cls}`} data-testid={`chip-${channel}`}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }}></span>
      {c.label}
    </span>
  );
}

export function StatusPill({ status }) {
  const map = {
    active: { bg: "#E7F7EF", fg: "#00734D", label: "Active" },
    listed: { bg: "#E7F7EF", fg: "#00734D", label: "Listed" },
    synced: { bg: "#E7F7EF", fg: "#00734D", label: "Synced" },
    paused: { bg: "#FFF6DE", fg: "#8A6300", label: "Paused" },
    pending: { bg: "#FFF6DE", fg: "#8A6300", label: "Pending" },
    processing: { bg: "#E7EEFF", fg: "#0033A0", label: "Processing" },
    shipped: { bg: "#E7EEFF", fg: "#0033A0", label: "Shipped" },
    delivered: { bg: "#E7F7EF", fg: "#00734D", label: "Delivered" },
    draft: { bg: "#F3F4F6", fg: "#6B7280", label: "Draft" },
    unlisted: { bg: "#F3F4F6", fg: "#6B7280", label: "Unlisted" },
    error: { bg: "#FDECEA", fg: "#A31D0F", label: "Error" },
    cancelled: { bg: "#FDECEA", fg: "#A31D0F", label: "Cancelled" },
    refunded: { bg: "#FDECEA", fg: "#A31D0F", label: "Refunded" },
    received: { bg: "#E7F7EF", fg: "#00734D", label: "Received" },
    in_transit: { bg: "#FFF6DE", fg: "#8A6300", label: "In Transit" },
    requested: { bg: "#FFF6DE", fg: "#8A6300", label: "Requested" },
    rejected: { bg: "#F3F4F6", fg: "#6B7280", label: "Rejected" },
    placed: { bg: "#FFF6DE", fg: "#8A6300", label: "Placed" },
    returned: { bg: "#FDECEA", fg: "#A31D0F", label: "Returned" },
    connected: { bg: "#E7F7EF", fg: "#00734D", label: "Connected" },
    disconnected: { bg: "#F3F4F6", fg: "#6B7280", label: "Disconnected" },
  };
  const s = map[status] || { bg: "#F3F4F6", fg: "#6B7280", label: status };
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium rounded-sm"
      style={{ background: s.bg, color: s.fg }}
      data-testid={`status-${status}`}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.fg }}></span>
      {s.label}
    </span>
  );
}

export function SyncBadge({ count }) {
  if (count === 0) return <span className="text-[11px] text-[var(--fg-muted)]">Not listed</span>;
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[var(--fg)]">
      <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]"></span>
      Listed on {count} {count === 1 ? "channel" : "channels"}
    </span>
  );
}
