import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, FileQuestion, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/primitives";
import { useAuthStore } from "@/store/authStore";
import { landingPathFor } from "@/routes/guards";

function Shell({
  icon: Icon,
  code,
  title,
  message,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  code: string;
  title: string;
  message: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-slate-50">
          <Icon className="h-6 w-6 text-slate-500" />
        </div>
        <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-slate-400">{code}</p>
        <h1 className="mt-1 text-xl font-semibold text-slate-900">{title}</h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600">{message}</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">{children}</div>
      </div>
    </div>
  );
}

export function UnauthorizedPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  return (
    <Shell
      icon={ShieldAlert}
      code="403 · Forbidden"
      title="You do not have access to this module"
      message={
        user
          ? `Your account is assigned the "${user.roleName}" role, which does not include the permissions required for this page. Contact the barangay system administrator if you believe this is an error.`
          : "You must sign in with an authorised account to view this page."
      }
    >
      <Button variant="secondary" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4" />
        Go back
      </Button>
      <Link to={landingPathFor(user?.role)}>
        <Button>Return to my workspace</Button>
      </Link>
    </Shell>
  );
}

export function NotFoundPage() {
  const user = useAuthStore((s) => s.user);
  return (
    <Shell
      icon={FileQuestion}
      code="404 · Not found"
      title="Page not found"
      message="The page you requested does not exist in this prototype. It may have been moved, or the module has not been implemented for this build."
    >
      <Link to={landingPathFor(user?.role)}>
        <Button>Return to my workspace</Button>
      </Link>
    </Shell>
  );
}
