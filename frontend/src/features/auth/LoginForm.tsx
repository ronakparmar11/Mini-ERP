import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Lock, Mail } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/features/auth/AuthContext";
import { getApiErrorMessage } from "@/utils/apiError";

const schema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
  remember: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

export function LoginForm() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState<string | null>(null);

  const from = (location.state as { from?: string } | null)?.from ?? "/dashboard";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "", remember: false },
  });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      await login({ email: values.email, password: values.password });
      navigate(from, { replace: true });
    } catch (err) {
      setServerError(getApiErrorMessage(err, "Invalid email or password"));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      {serverError && (
        <div
          role="alert"
          className="rounded-lg border border-error-container bg-error-container/40 px-4 py-3 text-body-sm text-on-error-container"
        >
          {serverError}
        </div>
      )}

      <div>
        <Label htmlFor="email">Email Address</Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-outline-variant" />
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="name@company.com"
            className="pl-10"
            {...register("email")}
          />
        </div>
        {errors.email && <p className="mt-1.5 text-body-sm text-error">{errors.email.message}</p>}
      </div>

      <div>
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-outline-variant" />
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            className="pl-10"
            {...register("password")}
          />
        </div>
        {errors.password && (
          <p className="mt-1.5 text-body-sm text-error">{errors.password.message}</p>
        )}
      </div>

      <div className="flex items-center justify-between">
        <label className="flex cursor-pointer items-center gap-2 text-body-sm text-on-surface-variant">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary"
            {...register("remember")}
          />
          Remember me
        </label>
        <button
          type="button"
          className="text-body-sm font-semibold text-primary transition-colors hover:text-primary-container"
        >
          Forgot password?
        </button>
      </div>

      <Button type="submit" size="lg" className="group w-full" disabled={isSubmitting}>
        <span>{isSubmitting ? "Signing in…" : "Login to Dashboard"}</span>
        <ArrowRight className="h-[18px] w-[18px] transition-transform group-hover:translate-x-1" />
      </Button>
    </form>
  );
}
