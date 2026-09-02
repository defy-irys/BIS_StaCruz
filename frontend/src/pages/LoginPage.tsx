import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CircleAlert, Eye, EyeOff, LogIn, ShieldCheck } from "lucide-react";
import { BarangayLogo } from "@/components/brand/BarangayLogo";
import { Button, Field, Input } from "@/components/ui/primitives";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/services/authService";
import { useAuthStore } from "@/store/authStore";
import { landingPathFor } from "@/routes/guards";
import { BARANGAY } from "@/lib/navigation";
import { toast } from "@/store/toastStore";

const schema = z.object({
  identifier: z.string().min(1, "Enter your username or email address."),
  password: z.string().min(1, "Enter your password."),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const login = useAuthStore((s) => s.login);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { identifier: "", password: "" },
  });

  if (user) {
    const from = (location.state as { from?: string } | null)?.from;
    return <Navigate to={from && from !== "/login" ? from : landingPathFor(user.role)} replace />;
  }

  const onSubmit = async (values: FormValues) => {
    clearError();
    try {
      const authenticated = await login(values);
      toast.success("Signed in", `Welcome back, ${authenticated.fullName}.`);
      navigate(landingPathFor(authenticated.role), { replace: true });
    } catch {
      /* error surfaced through the store */
    }
  };

  const useAccount = (identifier: string) => {
    setValue("identifier", identifier, { shouldValidate: true });
    setValue("password", DEMO_PASSWORD, { shouldValidate: true });
    clearError();
  };

  return (
    <div className="min-h-screen bg-slate-100 lg:grid lg:grid-cols-[1.1fr_1fr]">
      {/* Institutional panel */}
      <section className="hidden flex-col justify-between bg-brand-900 p-10 text-white lg:flex">
        <div>
          <div className="flex items-center gap-3">
            <BarangayLogo size={60} className="rounded-full ring-1 ring-white/25 drop-shadow" />
            <div className="leading-tight">
              <p className="text-lg font-semibold">BIMS-BIPS</p>
              <p className="text-xs text-brand-200">
                Barangay Information Management System · Barangay Inhabitant Profiling System
              </p>
            </div>
          </div>

          <div className="mt-12 max-w-lg">
            <h1 className="text-2xl font-semibold leading-snug">
              {BARANGAY.name}, {BARANGAY.city}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-brand-100">
              A unified records platform for resident profiling, household registry, document
              issuance, incident recording and barangay reporting.
            </p>

            <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5 text-sm">
              {[
                ["Resident profiling", "Household-linked inhabitant records"],
                ["Document issuance", "Certificates and clearances workflow"],
                ["Peace & order", "Blotter and incident case management"],
                ["Reports & analytics", "Population and transaction summaries"],
              ].map(([t, d]) => (
                <div key={t}>
                  <dt className="font-medium text-white">{t}</dt>
                  <dd className="mt-0.5 text-xs text-brand-200">{d}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <p className="max-w-lg text-[11px] leading-relaxed text-brand-300">
          Disclaimer: This is not the final design. Everything shown may be subject to change. This is
          a functional prototype using simulated data for demonstration purposes.
        </p>
      </section>

      {/* Sign-in form */}
      <section className="flex min-h-screen items-center justify-center p-5 sm:p-8">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <BarangayLogo size={44} className="drop-shadow-sm" />
            <div className="leading-tight">
              <p className="text-base font-semibold text-slate-900">BIMS-BIPS</p>
              <p className="text-[11px] text-slate-500">
                {BARANGAY.name}, {BARANGAY.city}
              </p>
            </div>
          </div>

          <h2 className="text-lg font-semibold text-slate-900">Sign in to your account</h2>
          <p className="mt-1 text-sm text-slate-500">
            Use your barangay-issued credentials. Resident accounts are redirected to the mobile
            self-service portal.
          </p>

          {error && (
            <div
              role="alert"
              className="mt-4 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
            >
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-4" noValidate>
            <Field label="Username or email" htmlFor="identifier" required error={errors.identifier?.message}>
              <Input
                id="identifier"
                autoComplete="username"
                placeholder="e.g. admin.ventura"
                invalid={!!errors.identifier}
                aria-describedby={errors.identifier ? "identifier-error" : undefined}
                {...register("identifier")}
              />
            </Field>

            <Field label="Password" htmlFor="password" required error={errors.password?.message}>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="pr-9"
                  invalid={!!errors.password}
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>

            <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
              <LogIn className="h-4 w-4" />
              Sign in
            </Button>
          </form>

          <div className="mt-6 rounded-md border border-slate-200 bg-white p-3">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-brand-700" />
              <p className="text-xs font-semibold text-slate-800">Demonstration accounts</p>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              Password for every simulated account:{" "}
              <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[10px]">{DEMO_PASSWORD}</code>
            </p>
            <ul className="mt-2 divide-y divide-slate-100">
              {DEMO_ACCOUNTS.map((a) => (
                <li key={a.identifier}>
                  <button
                    type="button"
                    onClick={() => useAccount(a.identifier)}
                    className="flex w-full items-center justify-between gap-2 py-1.5 text-left hover:bg-slate-50"
                  >
                    <span className="min-w-0">
                      <span className="block text-xs font-medium text-slate-800">{a.label}</span>
                      <span className="block truncate text-[11px] text-slate-500">{a.hint}</span>
                    </span>
                    <code className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
                      {a.identifier}
                    </code>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-5 text-[11px] leading-relaxed text-slate-500 lg:hidden">
            Disclaimer: This is not the final design. Everything shown may be subject to change.
          </p>
        </div>
      </section>
    </div>
  );
}
