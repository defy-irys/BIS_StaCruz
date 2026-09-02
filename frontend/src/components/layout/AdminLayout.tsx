import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  PanelLeftClose,
  Search,
  ShieldCheck,
  UserCircle2,
  X,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { BarangayLogo } from "@/components/brand/BarangayLogo";
import { ADMIN_NAV, BARANGAY } from "@/lib/navigation";
import { hasPermission, useAuthStore } from "@/store/authStore";
import { notificationService } from "@/services/insightService";
import { fmtRelative } from "@/lib/format";
import type { AppNotification } from "@/types";
import { Badge } from "@/components/ui/primitives";
import { USING_MOCK_BACKEND } from "@/services/http";
import DailyCatchUp from "@/components/app/DailyCatchUp";

function Brand({ compact }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-3">
      <BarangayLogo size={38} className="rounded-full ring-1 ring-white/20 drop-shadow-sm" />
      {!compact && (
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-semibold text-white">BIMS-BIPS</p>
          <p className="truncate text-[11px] text-brand-200">
            {BARANGAY.name}, {BARANGAY.city}
          </p>
        </div>
      )}
    </div>
  );
}

function SidebarNav({ onNavigate, compact }: { onNavigate?: () => void; compact?: boolean }) {
  const user = useAuthStore((s) => s.user);

  return (
    <nav className="flex-1 space-y-4 overflow-y-auto px-2 pb-4" aria-label="Main navigation">
      {ADMIN_NAV.map((section) => {
        const visible = section.items.filter((i) => hasPermission(user, i.permission));
        if (visible.length === 0) return null;
        return (
          <div key={section.title}>
            {!compact && (
              <p className="px-2 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-widest text-brand-300/80">
                {section.title}
              </p>
            )}
            <ul className="space-y-0.5">
              {visible.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onClick={onNavigate}
                    title={compact ? item.label : undefined}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                        compact && "justify-center px-0",
                        isActive
                          ? "bg-brand-600/90 font-medium text-white"
                          : "text-brand-100/90 hover:bg-brand-800/70 hover:text-white",
                      )
                    }
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!compact && <span className="truncate">{item.label}</span>}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void notificationService.listForAdmin().then(setItems);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const unread = items.filter((n) => !n.read).length;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        aria-expanded={open}
        className="relative flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
            <p className="text-sm font-semibold text-slate-800">System notifications</p>
            <button
              type="button"
              className="text-xs font-medium text-brand-700 hover:underline"
              onClick={async () => {
                await notificationService.markAllRead("admin");
                setItems(await notificationService.listForAdmin());
              }}
            >
              Mark all read
            </button>
          </div>
          <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
            {items.length === 0 && (
              <li className="px-3 py-6 text-center text-xs text-slate-500">No notifications.</li>
            )}
            {items.map((n) => (
              <li key={n.id} className={cn("px-3 py-2.5", !n.read && "bg-brand-50/40")}>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-semibold text-slate-800">{n.title}</p>
                  <span className="shrink-0 text-[10px] text-slate-400">{fmtRelative(n.at)}</span>
                </div>
                <p className="mt-0.5 text-xs text-slate-600">{n.message}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function UserMenu() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  if (!user) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-md border border-slate-300 bg-white py-1 pl-1.5 pr-2 text-left hover:bg-slate-50"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded bg-brand-700 text-[11px] font-bold text-white">
          {user.fullName
            .split(" ")
            .map((p) => p[0])
            .slice(0, 2)
            .join("")}
        </span>
        <span className="hidden min-w-0 leading-tight sm:block">
          <span className="block truncate text-xs font-semibold text-slate-800">{user.fullName}</span>
          <span className="block truncate text-[10px] text-slate-500">{user.roleName}</span>
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-40 mt-2 w-64 rounded-md border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-200 px-3 py-2.5">
            <p className="text-sm font-semibold text-slate-900">{user.fullName}</p>
            <p className="text-xs text-slate-500">{user.email}</p>
            <div className="mt-1.5 flex items-center gap-1.5">
              <Badge tone="brand">
                <ShieldCheck className="h-3 w-3" />
                {user.roleName}
              </Badge>
              <span className="text-[10px] text-slate-400">{user.permissions.length} permissions</span>
            </div>
          </div>
          <div className="py-1">
            <Link
              to="/admin/settings"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              <UserCircle2 className="h-3.5 w-3.5" />
              Account & settings
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={async () => {
                setOpen(false);
                await logout();
                navigate("/login", { replace: true });
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-red-700 hover:bg-red-50"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    navigate(`/admin/residents?search=${encodeURIComponent(q)}`);
  };

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "no-print fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-brand-900/40 bg-brand-900 lg:flex",
          collapsed ? "w-16" : "w-60",
        )}
      >
        <Brand compact={collapsed} />
        <SidebarNav compact={collapsed} />
        <div className="border-t border-brand-800 px-2 py-2">
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-brand-200 hover:bg-brand-800 hover:text-white"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <PanelLeftClose className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="no-print fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setMobileOpen(false)} aria-hidden />
          <aside className="relative flex h-full w-64 flex-col bg-brand-900">
            <div className="flex items-center justify-between">
              <Brand />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="mr-2 rounded p-1.5 text-brand-200 hover:bg-brand-800"
                aria-label="Close navigation"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <SidebarNav onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className={cn("flex min-h-screen flex-col", collapsed ? "lg:pl-16" : "lg:pl-60")}>
        <header className="no-print sticky top-0 z-20 border-b border-slate-200 bg-white">
          <div className="flex h-14 items-center gap-3 px-3 sm:px-4">
            <button
              type="button"
              className="rounded-md border border-slate-300 p-1.5 text-slate-600 hover:bg-slate-50 lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="h-4 w-4" />
            </button>

            <div className="hidden min-w-0 flex-col leading-tight md:flex">
              <p className="truncate text-sm font-semibold text-slate-900">
                Barangay Information Management System
              </p>
              <p className="truncate text-[11px] text-slate-500">
                {BARANGAY.name} · {BARANGAY.district}, {BARANGAY.city}
              </p>
            </div>

            <form onSubmit={submitSearch} className="ml-auto hidden max-w-xs flex-1 sm:block" role="search">
              <label htmlFor="global-search" className="sr-only">
                Search residents
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  id="global-search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search residents…"
                  className="h-9 w-full rounded-md border border-slate-300 bg-white pl-8 pr-2.5 text-sm placeholder:text-slate-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
                />
              </div>
            </form>

            <div className="ml-auto flex items-center gap-2 sm:ml-0">
              {USING_MOCK_BACKEND && (
                <span className="hidden items-center gap-1 rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 xl:inline-flex">
                  SIMULATED DATA
                </span>
              )}
              <NotificationBell />
              <UserMenu />
            </div>
          </div>
        </header>

        <main className="flex-1 px-3 py-4 sm:px-4 lg:px-6">
          <Outlet />
        </main>

        <footer className="no-print border-t border-slate-200 bg-white px-4 py-3 text-[11px] text-slate-500">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p>
              BIMS-BIPS Prototype · {BARANGAY.name}, {BARANGAY.city} · Frontend simulation  data is not
              connected to a live backend.
            </p>
            <p>Build: prototype-0.9 · Service layer: mock</p>
          </div>
        </footer>
      </div>

      {/* Daily catch-up briefing  admin users only, once per calendar day. */}
      <DailyCatchUp />
    </div>
  );
}
