import {
  Factory,
  FileText,
  History,
  LayoutDashboard,
  type LucideIcon,
  Network,
  Package,
  ReceiptText,
  ShoppingCart,
  Warehouse,
} from "lucide-react";

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
}

export interface NavSection {
  /** Section label shown above the group; null for the top-level entry. */
  label: string | null;
  items: NavItem[];
}

/**
 * Sidebar information architecture grouped by business workflow
 * (Operations → Production → Procurement → Governance). Section labels give
 * orientation without removing any existing route.
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    label: null,
    items: [{ label: "Dashboard", to: "/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Operations",
    items: [
      { label: "Sales Orders", to: "/sales", icon: ReceiptText },
      { label: "Invoices", to: "/invoices", icon: FileText },
    ],
  },
  {
    label: "Production",
    items: [
      { label: "Products", to: "/products", icon: Package },
      { label: "Bills of Materials", to: "/bom", icon: Network },
      { label: "Manufacturing Orders", to: "/manufacturing", icon: Factory },
    ],
  },
  {
    label: "Procurement",
    items: [
      { label: "Purchase Orders", to: "/purchase-orders", icon: ShoppingCart },
      { label: "Inventory", to: "/inventory", icon: Warehouse },
    ],
  },
  {
    label: "Governance",
    items: [{ label: "Audit Logs", to: "/audit-logs", icon: History }],
  },
];
