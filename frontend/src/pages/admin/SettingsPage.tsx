import { Building2, Database, Info, Server, ShieldCheck, UserCircle2 } from "lucide-react";
import { DetailList, PageHeader, PrototypeNotice } from "@/components/ui/page";
import { Badge, Card, CardHeader } from "@/components/ui/primitives";
import { useAuthStore } from "@/store/authStore";
import { BARANGAY } from "@/lib/navigation";
import { API_BASE_URL, USING_MOCK_BACKEND } from "@/services/http";
import { fmtDateTime } from "@/lib/format";

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Settings"
        description="Barangay profile, account information and the technical configuration of this prototype."
        breadcrumbs={[{ label: "BIMS-BIPS", to: "/admin" }, { label: "Settings" }]}
      />

      <PrototypeNotice />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Barangay profile" icon={Building2} description="Reference information used across documents." />
          <div className="p-4">
            <DetailList
              items={[
                { label: "Barangay", value: BARANGAY.name },
                { label: "City / municipality", value: BARANGAY.city },
                { label: "District", value: BARANGAY.district },
                { label: "Region", value: BARANGAY.region },
                { label: "Barangay hall address", value: BARANGAY.address },
                { label: "Hotline", value: BARANGAY.hotline },
              ]}
            />
            <p className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              Barangay profile editing will be wired to <code className="font-mono">PATCH /settings/barangay</code>{" "}
              once the backend is available. Fields are read-only in this prototype.
            </p>
          </div>
        </Card>

        <Card>
          <CardHeader title="My account" icon={UserCircle2} description="Signed-in session details." />
          <div className="p-4">
            <DetailList
              items={[
                { label: "Full name", value: user?.fullName },
                { label: "Username", value: user?.username },
                { label: "Email", value: user?.email },
                { label: "Position", value: user?.position },
                { label: "Role", value: <Badge tone="brand">{user?.roleName}</Badge> },
                { label: "Last login", value: fmtDateTime(user?.lastLoginAt) },
              ]}
            />
            <div className="mt-4">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <ShieldCheck className="h-3.5 w-3.5" />
                Granted permissions ({user?.permissions.length ?? 0})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(user?.permissions ?? []).map((p) => (
                  <code key={p} className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
                    {p}
                  </code>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Technical configuration"
          icon={Server}
          description="How this frontend is expected to connect to the production backend."
        />
        <div className="grid gap-4 p-4 lg:grid-cols-2">
          <DetailList
            columns={1}
            items={[
              {
                label: "Data source",
                value: (
                  <span className="flex items-center gap-1.5">
                    <Badge tone={USING_MOCK_BACKEND ? "warning" : "success"}>
                      {USING_MOCK_BACKEND ? "Mock service layer" : "Live API"}
                    </Badge>
                    <span className="text-xs text-slate-500">
                      {USING_MOCK_BACKEND ? "In-memory simulated records" : "FastAPI"}
                    </span>
                  </span>
                ),
              },
              { label: "Configured API base URL", value: <code className="font-mono text-xs">{API_BASE_URL}</code> },
              { label: "Auth scheme", value: "JWT access + refresh tokens (simulated)" },
              { label: "Identifier type", value: "String / UUID  no integer ID assumptions" },
            ]}
          />
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <Database className="h-3.5 w-3.5" />
              Planned integration path
            </p>
            <pre className="mt-2 overflow-x-auto whitespace-pre rounded bg-white p-2.5 font-mono text-[11px] leading-relaxed text-slate-600">
{`pages / components
      ↓
services/*Service.ts      ← replace method bodies only
      ↓
services/http.ts (axios)
      ↓
FastAPI · routers → services → repositories
      ↓
SQLAlchemy → PostgreSQL`}
            </pre>
            <p className="mt-2 flex items-start gap-1.5 text-[11px] text-slate-500">
              <Info className="mt-0.5 h-3 w-3 shrink-0" />
              No component imports mock data directly, so switching to the live API does not require UI changes.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
