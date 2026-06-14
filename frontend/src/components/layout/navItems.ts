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
  /** i18n translation key under the "sidebar" namespace. */
  labelKey: string;
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
 *
 * Labels now use i18n keys; the Sidebar component resolves them via t().
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    label: null,
    items: [{ labelKey: "sidebar.dashboard", to: "/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Operations",
    items: [
      { labelKey: "sidebar.salesOrders", to: "/sales", icon: ReceiptText },
      { labelKey: "sidebar.invoices", to: "/invoices", icon: FileText },
    ],
  },
  {
    label: "Production",
    items: [
      { labelKey: "sidebar.products", to: "/products", icon: Package },
      { labelKey: "sidebar.billsOfMaterials", to: "/bom", icon: Network },
      { labelKey: "sidebar.manufacturingOrders", to: "/manufacturing", icon: Factory },
    ],
  },
  {
    label: "Procurement",
    items: [
      { labelKey: "sidebar.purchaseOrders", to: "/purchase-orders", icon: ShoppingCart },
      { labelKey: "sidebar.inventory", to: "/inventory", icon: Warehouse },
    ],
  },
  {
    label: "Governance",
    items: [{ labelKey: "sidebar.auditLogs", to: "/audit-logs", icon: History }],
  },
];
