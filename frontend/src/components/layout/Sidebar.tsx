import { Boxes, LifeBuoy, Plus, Settings } from "lucide-react";
import { NavLink } from "react-router-dom";

import { NAV_SECTIONS } from "@/components/layout/navItems";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";

export function Sidebar() {
  return (
    <aside className="flex h-screen w-sidebar-width flex-col border-r border-outline-variant/60 bg-surface-container-lowest">
      {/* Brand */}
      <div className="flex h-header-height items-center gap-3 border-b border-outline-variant/60 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-on-primary">
          <Boxes className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <p className="text-title-sm font-bold text-on-surface">Mini ERP</p>
          <p className="text-label-upper uppercase text-on-surface-variant">Enterprise Edition</p>
        </div>
      </div>

      {/* Primary action */}
      <div className="px-4 pt-4">
        <Button className="w-full" size="lg">
          <Plus className="h-4 w-4" />
          New Record
        </Button>
      </div>

      {/* Navigation */}
      <nav className="scrollbar-thin mt-4 flex-1 space-y-4 overflow-y-auto px-3 pb-4">
        {NAV_SECTIONS.map((section, i) => (
          <div key={section.label ?? `top-${i}`} className="space-y-1">
            {section.label && (
              <p className="px-3 pb-1 pt-2 text-label-upper uppercase tracking-wide text-on-surface-variant/70">
                {section.label}
              </p>
            )}
            {section.items.map(({ label, to, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-body-md transition-colors",
                    isActive
                      ? "bg-secondary-container font-semibold text-primary"
                      : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface",
                  )
                }
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span>{label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="space-y-1 border-t border-outline-variant/60 px-3 py-4">
        <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-body-md text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface">
          <Settings className="h-5 w-5" />
          Settings
        </button>
        <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-body-md text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface">
          <LifeBuoy className="h-5 w-5" />
          Support
        </button>
      </div>
    </aside>
  );
}
