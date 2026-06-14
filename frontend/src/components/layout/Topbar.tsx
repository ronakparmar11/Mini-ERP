import { LogOut, Search, Settings } from "lucide-react";
import { useState } from "react";

import { NotificationDropdown } from "@/components/common/NotificationDropdown";
import { useAuth } from "@/features/auth/AuthContext";
import { cn } from "@/utils/cn";

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Topbar() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="flex h-header-height shrink-0 items-center gap-4 border-b border-outline-variant/60 bg-surface-container-lowest px-6">
      {/* Global search (UI shell — wired to real search in a later phase) */}
      <div className="relative max-w-xl flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
        <input
          type="search"
          placeholder="Search orders, products, lots…"
          className="w-full rounded-lg border border-outline-variant bg-surface-container-low py-2 pl-10 pr-3 text-body-md text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <div className="ml-auto flex items-center gap-1">
        <NotificationDropdown />
        <IconButton label="Settings">
          <Settings className="h-5 w-5" />
        </IconButton>

        {/* User menu */}
        <div className="relative ml-2">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            onBlur={() => window.setTimeout(() => setMenuOpen(false), 120)}
            className="flex items-center gap-2 rounded-full p-0.5 transition-colors hover:bg-surface-container"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-body-sm font-semibold text-on-primary">
              {user ? initials(user.name) : "?"}
            </span>
          </button>

          {menuOpen && user && (
            <div className="absolute right-0 top-12 z-20 w-56 animate-fade-in rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-1.5 shadow-lg">
              <div className="px-3 py-2">
                <p className="truncate text-body-md font-semibold text-on-surface">{user.name}</p>
                <p className="truncate text-body-sm text-on-surface-variant">{user.email}</p>
                <span className="mt-1 inline-block rounded-full bg-secondary-container px-2 py-0.5 text-label-upper uppercase text-primary">
                  {user.role}
                </span>
              </div>
              <div className="my-1 h-px bg-outline-variant/50" />
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  logout();
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-body-md text-error transition-colors hover:bg-error-container/40"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function IconButton({
  children,
  label,
  className,
}: {
  children: React.ReactNode;
  label: string;
  className?: string;
}) {
  return (
    <button
      aria-label={label}
      title={label}
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface",
        className,
      )}
    >
      {children}
    </button>
  );
}
