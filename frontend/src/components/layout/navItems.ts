import {
  Factory,
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

/** Primary navigation — mirrors the Stitch sidebar order exactly. */
export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Products", to: "/products", icon: Package },
  { label: "Sales Orders", to: "/sales", icon: ReceiptText },
  { label: "Purchase Orders", to: "/purchase", icon: ShoppingCart },
  { label: "Bills of Materials", to: "/boms", icon: Network },
  { label: "Manufacturing Orders", to: "/manufacturing", icon: Factory },
  { label: "Inventory", to: "/inventory", icon: Warehouse },
  { label: "Audit Logs", to: "/audit", icon: History },
];
