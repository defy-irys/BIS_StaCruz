import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Bell, FileText, Home, LogOut, User, Inbox } from "lucide-react";
import { BarangayLogo } from "@/components/brand/BarangayLogo";
import { cn } from "@/utils/cn";
import { useAuthStore } from "@/store/authStore";
import { BARANGAY } from "@/lib/navigation";

const TABS = [
  { to: "/portal", label: "Home", icon: Home, end: true },
  { to: "/portal/requests", label: "Requests", icon: Inbox, end: false },
  { to: "/portal/documents", label: "Documents", icon: FileText, end: false },
  { to: "/portal/profile", label: "Profile", icon: User, end: false },
];

export default function PortalLayout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-100">
      {/* The resident experience is mobile-first; on desktop it is framed
          inside a phone-width column so it stays demonstrable. */}
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col border-slate-200 bg-slate-50 shadow-sm sm:border-x">
        <header className="sticky top-0 z-20 bg-brand-800 text-white">
          <div className="flex items-center gap-2.5 px-4 py-3">
            <BarangayLogo size={38} className="rounded-full ring-1 ring-white/30 drop-shadow-sm" />
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-sm font-semibold">{BARANGAY.name}</p>
              <p className="truncate text-[11px] text-brand-100">Resident Self-Service Portal</p>
            </div>
            <NavLink
              to="/portal/notifications"
              className="rounded-md p-2 hover:bg-white/10"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
            </NavLink>
            <button
              type="button"
              aria-label="Sign out"
              className="rounded-md p-2 hover:bg-white/10"
              onClick={async () => {
                await logout();
                navigate("/login", { replace: true });
              }}
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 pb-24 pt-4">
          <Outlet />
        </main>

        <nav
          className="fixed bottom-0 left-1/2 z-20 w-full max-w-md -translate-x-1/2 border-t border-slate-200 bg-white"
          aria-label="Resident portal navigation"
        >
          <ul className="grid grid-cols-4">
            {TABS.map((t) => (
              <li key={t.to}>
                <NavLink
                  to={t.to}
                  end={t.end}
                  className={({ isActive }) =>
                    cn(
                      "flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[11px] font-medium",
                      isActive ? "text-brand-800" : "text-slate-500",
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <t.icon className={cn("h-5 w-5", isActive && "text-brand-700")} />
                      <span>{t.label}</span>
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
          <p className="border-t border-slate-100 px-3 py-1 text-center text-[9px] text-slate-400">
            Prototype · simulated data · signed in as {user?.fullName ?? "guest"}
          </p>
        </nav>
      </div>
    </div>
  );
}
