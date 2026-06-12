"use client";

import {
  Bell,
  Boxes,
  Building2,
  ClipboardCheck,
  FileBarChart,
  Gauge,
  LayoutDashboard,
  Moon,
  PackageSearch,
  Search,
  ShieldCheck,
  Sparkles,
  Sun,
  Truck,
  UploadCloud,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inventory", label: "Inventory", icon: PackageSearch },
  { href: "/fifo", label: "FIFO", icon: Truck },
  { href: "/ftz", label: "FTZ / Tariffs", icon: ShieldCheck },
  { href: "/real-import", label: "Real ICC Data Import", icon: UploadCloud },
  { href: "/advisor", label: "Advisor", icon: Sparkles },
  { href: "/reports", label: "Reports", icon: FileBarChart },
  { href: "/warehouse", label: "3D Warehouse View", icon: Boxes },
  { href: "/receive", label: "Receive", icon: Building2 },
  { href: "/pull", label: "Pull", icon: ClipboardCheck },
  { href: "/labels", label: "Labels", icon: Boxes },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const [lightMode, setLightMode] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    document.body.classList.toggle("light-mode", lightMode);
  }, [lightMode]);

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Primary navigation">
        <Link className="brand" href="/dashboard" aria-label="Old Glory dashboard">
          <span className="brand-mark">OG</span>
          <span className="brand-copy">
            <span className="brand-title">Old Glory Warehouse</span>
            <span className="brand-subtitle">ICC Copper Storage</span>
          </span>
        </Link>

        <nav className="nav-list">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                className={`nav-item ${isActive ? "active" : ""}`}
                href={item.href}
                key={item.href}
                title={item.label}
              >
                <Icon size={18} aria-hidden="true" />
                <span className="nav-label">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="item-row">
            <span className="muted">Shift status</span>
            <span className="status-chip good">Open</span>
          </div>
          <div className="item-row">
            <span className="muted">Dock queue</span>
            <span className="strong">7 moves</span>
          </div>
        </div>
      </aside>

      <div className="content-shell">
        <header className="topbar">
          <Link className="search-box" role="search" href="/inventory">
            <Search size={18} aria-hidden="true" />
            <span>Search PO, supplier, part, box, location, FTZ lot</span>
          </Link>

          <div className="topbar-actions">
            <select className="facility-select" aria-label="Facility">
              <option>ICC - Newark FTZ</option>
              <option>ICC - Port Newark</option>
              <option>ICC - Export staging</option>
            </select>
            <button className="icon-button" type="button" title="Rate context">
              <Gauge size={18} aria-hidden="true" />
            </button>
            <button className="icon-button" type="button" title="Compliance queue">
              <ClipboardCheck size={18} aria-hidden="true" />
            </button>
            <button className="icon-button" type="button" title="Notifications">
              <Bell size={18} aria-hidden="true" />
            </button>
            <button
              className="icon-button"
              type="button"
              title="Toggle theme"
              onClick={() => setLightMode((value) => !value)}
            >
              {lightMode ? (
                <Moon size={18} aria-hidden="true" />
              ) : (
                <Sun size={18} aria-hidden="true" />
              )}
            </button>
            <button
              className="action-button primary"
              type="button"
              onClick={() => {
                router.push("/receive");
                window.dispatchEvent(new CustomEvent("old-glory-open-receive"));
              }}
            >
              <Building2 size={17} aria-hidden="true" />
              Receive Lot
            </button>
          </div>
        </header>

        <main className="main-content">{children}</main>
      </div>
    </div>
  );
}
