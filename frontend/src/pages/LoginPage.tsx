import { Boxes, Sparkles } from "lucide-react";
import { Navigate } from "react-router-dom";

import { FullPageSpinner } from "@/components/common/Spinner";
import { LoginForm } from "@/features/auth/LoginForm";
import { useAuth } from "@/features/auth/AuthContext";

export function LoginPage() {
  const { status } = useAuth();

  if (status === "loading") return <FullPageSpinner />;
  if (status === "authenticated") return <Navigate to="/dashboard" replace />;

  return (
    <div className="flex min-h-screen w-full bg-surface">
      {/* Left brand panel */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-surface-container-high p-12 lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-40 mix-blend-multiply"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 30%, rgba(79,70,229,0.18) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(103,244,183,0.14) 0%, transparent 40%)",
          }}
        />
        <div className="z-10 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-on-primary shadow-sm">
            <Boxes className="h-6 w-6" />
          </div>
          <h1 className="text-headline-md font-bold text-on-surface">Mini ERP</h1>
        </div>

        <div className="z-10 flex flex-grow items-center justify-center py-12">
          <div className="relative aspect-square w-full max-w-lg overflow-hidden rounded-2xl border border-outline-variant bg-gradient-to-br from-inverse-surface via-primary/40 to-primary-container shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-t from-surface-container-high/90 via-surface-container-high/10 to-transparent" />
            <div className="absolute bottom-8 left-8 right-8 rounded-xl border border-white/50 bg-white/70 p-6 shadow-lg backdrop-blur-md">
              <div className="mb-4 flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-title-sm text-on-surface">Real-time Sync</p>
                  <p className="text-body-sm text-on-surface-variant">Active modules updated</p>
                </div>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container-low">
                <div className="h-full w-3/4 animate-pulse rounded-full bg-primary" />
              </div>
            </div>
          </div>
        </div>

        <div className="z-10 max-w-md">
          <h2 className="mb-4 text-display-lg text-on-surface">Inventory-driven ERP.</h2>
          <p className="text-body-md leading-relaxed text-on-surface-variant">
            Streamline your supply chain, manage manufacturing orders, and gain total control over
            your enterprise resources with precision and clarity.
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex w-full items-center justify-center bg-surface p-6 sm:p-12 lg:w-1/2">
        <div className="w-full max-w-md">
          <div className="mb-10 text-center lg:text-left">
            <h2 className="mb-2 text-display-lg text-on-surface">Welcome back</h2>
            <p className="text-body-md text-on-surface-variant">
              Please enter your details to access your dashboard.
            </p>
          </div>
          <LoginForm />
          <div className="mt-8 border-t border-outline-variant/30 pt-6 text-center">
            <p className="text-body-sm text-on-surface-variant">
              Don't have an account?
              <button className="ml-1 font-semibold text-primary hover:text-primary-container">
                Contact Support
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
