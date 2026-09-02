import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Building2,
  ClipboardList,
  FileBadge,
  FileText,
  Gauge,
  Home,
  Landmark,
  Map,
  ScrollText,
  Settings,
  ShieldCheck,
  UserCog,
  Users,
} from "lucide-react";
import type { Permission } from "@/types";

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  permission?: Permission | Permission[];
  /** Marks the item active only on an exact path match. */
  end?: boolean;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

/**
 * Single source of truth for administrative navigation AND route guards.
 * Route protection reads the same permission keys, so hiding a link and
 * blocking a URL can never drift apart.
 */
export const ADMIN_NAV: NavSection[] = [
  {
    title: "Overview",
    items: [{ label: "Dashboard", to: "/admin", icon: Gauge, end: true }],
  },
  {
    title: "Records",
    items: [
      { label: "Residents", to: "/admin/residents", icon: Users, permission: "residents.view" },
      { label: "Households", to: "/admin/households", icon: Home, permission: "households.view" },
      { label: "Officials", to: "/admin/officials", icon: Landmark, permission: "officials.view" },
    ],
  },
  {
    title: "Transactions",
    items: [
      { label: "Blotter", to: "/admin/blotter", icon: ClipboardList, permission: "blotter.view" },
      { label: "Certificates", to: "/admin/certificates", icon: FileText, permission: "certificates.view" },
      { label: "Clearances", to: "/admin/clearances", icon: FileBadge, permission: "clearances.view" },
    ],
  },
  {
    title: "Information",
    items: [
      { label: "Reports", to: "/admin/reports", icon: ScrollText, permission: "reports.view" },
      { label: "Analytics", to: "/admin/analytics", icon: BarChart3, permission: "analytics.view" },
      { label: "GIS Mapping", to: "/admin/gis", icon: Map, permission: "gis.view" },
    ],
  },
  {
    title: "Administration",
    items: [
      { label: "User Accounts", to: "/admin/users", icon: UserCog, permission: "users.view" },
      { label: "Roles & Permissions", to: "/admin/roles", icon: ShieldCheck, permission: "roles.view" },
      { label: "Settings", to: "/admin/settings", icon: Settings },
    ],
  },
];

export const BARANGAY = {
  name: "Barangay Sta. Cruz",
  city: "Quezon City",
  district: "District 1",
  region: "National Capital Region",
  address: "Barangay Hall, Sampaguita St., Brgy. Sta. Cruz, Quezon City",
  hotline: "(02) 8000-0000 (simulated)",
  icon: Building2,
};
