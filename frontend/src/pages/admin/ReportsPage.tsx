import { useState } from "react";
import { Download, FileSpreadsheet, Play, Printer, ScrollText } from "lucide-react";
import { reportService, type ReportKey, type ReportResult } from "@/services/insightService";
import { useAsync } from "@/hooks/useAsync";
import { PageHeader, PrototypeNotice, SectionHeader } from "@/components/ui/page";
import { Badge, Button, Card, CardHeader, Field, Select, Input } from "@/components/ui/primitives";
import { EmptyState, ErrorState, InlineLoading } from "@/components/ui/feedback";
import { TableWrap, Td, Th } from "@/components/ui/data";
import { fmtDateTime } from "@/lib/format";
import { hasPermission, useAuthStore } from "@/store/authStore";
import { toast } from "@/store/toastStore";
import { PUROK_OPTIONS } from "@/components/domain/ResidentForm";
import { BARANGAY } from "@/lib/navigation";
import { cn } from "@/utils/cn";

const today = new Date().toISOString().slice(0, 10);
const yearStart = `${new Date().getFullYear()}-01-01`;

export default function ReportsPage() {
  const user = useAuthStore((s) => s.user);
  const canGenerate = hasPermission(user, "reports.generate");

  const definitions = useAsync(() => reportService.listDefinitions(), []);
  const [selected, setSelected] = useState<ReportKey>("resident-population");
  const [from, setFrom] = useState(yearStart);
  const [to, setTo] = useState(today);
  const [purok, setPurok] = useState("");
  const [result, setResult] = useState<ReportResult | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setRunning(true);
    setError(null);
    try {
      const output = await reportService.generate(selected, { from, to, purok });
      setResult(output);
      toast.success("Report generated", `${output.definition.title} · ${output.rows.length} row(s).`);
    } catch (e) {
      const message = e instanceof Error ? e.message : "The report could not be generated.";
      setError(message);
      toast.error("Report generation failed", message);
    } finally {
      setRunning(false);
    }
  };

  const simulateExport = (format: "CSV" | "PDF") => {
    if (!result) return;
    toast.info(
      `${format} export simulated`,
      "File generation is handled by the backend reporting service. This prototype does not produce downloadable records.",
    );
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Reports"
        description="Generate operational and statistical summaries from barangay records."
        breadcrumbs={[{ label: "BIMS-BIPS", to: "/admin" }, { label: "Reports" }]}
      />

      <PrototypeNotice compact />

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader title="Report catalogue" description="Select a report to configure." icon={ScrollText} />
            {definitions.loading && <InlineLoading label="Loading report definitions…" />}
            {definitions.error && (
              <ErrorState title="Unable to load report list" description={definitions.error} onRetry={definitions.reload} />
            )}
            {definitions.data && (
              <ul className="divide-y divide-slate-100">
                {definitions.data.map((d) => (
                  <li key={d.key}>
                    <button
                      type="button"
                      onClick={() => setSelected(d.key)}
                      aria-pressed={selected === d.key}
                      className={cn(
                        "w-full px-4 py-2.5 text-left hover:bg-slate-50",
                        selected === d.key && "bg-brand-50/60",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-slate-800">{d.title}</p>
                        <Badge tone={selected === d.key ? "brand" : "neutral"}>{d.category}</Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">{d.description}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="Parameters" />
            <div className="space-y-3 p-4">
              <Field label="Date from" htmlFor="r-from">
                <Input id="r-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              </Field>
              <Field label="Date to" htmlFor="r-to">
                <Input id="r-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </Field>
              <Field label="Purok" htmlFor="r-purok" hint="Applies to population and household reports.">
                <Select id="r-purok" value={purok} onChange={(e) => setPurok(e.target.value)}>
                  <option value="">All puroks</option>
                  {PUROK_OPTIONS.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </Select>
              </Field>
              <Button className="w-full" onClick={generate} loading={running} disabled={!canGenerate}>
                <Play className="h-4 w-4" />
                Generate report
              </Button>
              {!canGenerate && (
                <p className="text-[11px] text-slate-500">
                  Your role can view the reports workspace but cannot generate outputs.
                </p>
              )}
            </div>
          </Card>
        </div>

        <Card className="min-h-96">
          <CardHeader
            title="Report preview"
            description={result ? `Generated ${fmtDateTime(result.generatedAt)}` : "Configure parameters and generate a report."}
            action={
              result && (
                <div className="no-print flex flex-wrap gap-2">
                  <Button variant="secondary" size="sm" onClick={() => window.print()}>
                    <Printer className="h-3.5 w-3.5" />
                    Print
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => simulateExport("CSV")}>
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                    Export CSV
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => simulateExport("PDF")}>
                    <Download className="h-3.5 w-3.5" />
                    Export PDF
                  </Button>
                </div>
              )
            }
          />

          {running && <InlineLoading label="Compiling report…" />}
          {error && !running && <ErrorState title="Unable to generate report" description={error} onRetry={generate} />}
          {!result && !running && !error && (
            <EmptyState
              icon={ScrollText}
              title="No report generated yet"
              description="Choose a report from the catalogue, set the reporting period, then select Generate report."
              action={
                canGenerate ? (
                  <Button size="sm" onClick={generate}>
                    <Play className="h-3.5 w-3.5" />
                    Generate report
                  </Button>
                ) : undefined
              }
            />
          )}

          {result && !running && (
            <div className="print-area p-4">
              <div className="border-b border-slate-200 pb-3 text-center">
                <p className="text-[11px] uppercase tracking-widest text-slate-500">
                  {BARANGAY.name} · {BARANGAY.city}
                </p>
                <h3 className="text-base font-semibold text-slate-900">{result.definition.title}</h3>
                <p className="text-xs text-slate-500">
                  {result.parameters.map((p) => `${p.label}: ${p.value}`).join("  ·  ")}
                </p>
              </div>

              {result.summary.length > 0 && (
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  {result.summary.map((s) => (
                    <div key={s.label} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{s.label}</p>
                      <p className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900">{s.value}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4">
                <SectionHeader title="Report data" description={`${result.rows.length} row(s)`} />
                {result.rows.length === 0 ? (
                  <p className="py-10 text-center text-sm text-slate-500">
                    No records matched the selected reporting period.
                  </p>
                ) : (
                  <TableWrap className="mt-2">
                    <thead>
                      <tr>
                        {result.columns.map((c) => (
                          <Th key={c}>{c}</Th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.rows.map((row, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          {row.map((cell, j) => (
                            <Td key={j} className={j === 0 ? "font-medium text-slate-800" : "tabular-nums"}>
                              {cell}
                            </Td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </TableWrap>
                )}
              </div>

              <p className="mt-4 rounded border border-amber-200 bg-amber-50 p-2 text-center text-[10px] text-amber-800">
                {result.note}
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
