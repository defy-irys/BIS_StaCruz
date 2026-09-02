import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ClipboardList,
  Home,
  Landmark,
  Layers,
  Maximize2,
  Minimize2,
  MousePointer2,
  Ruler,
  Search,
  SlidersHorizontal,
  Square,
  X,
} from "lucide-react";
import {
  GIS_LAYERS,
  gisService,
  type GisLayerKey,
  type GisSearchResult,
} from "@/services/gisService";
import MapCanvas, {
  type BasemapKey,
  type FocusRequest,
  type GisTool,
  type MapSelection,
} from "@/components/gis/MapCanvas";
import { useAsync, useDebounced } from "@/hooks/useAsync";
import { PageHeader, PrototypeNotice } from "@/components/ui/page";
import { Badge, Button, Field, Select } from "@/components/ui/primitives";
import { ErrorState, InlineLoading, StatusBadge } from "@/components/ui/feedback";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { PUROK_OPTIONS } from "@/components/domain/ResidentForm";
import { BLOTTER_STATUSES, INCIDENT_TYPES } from "@/services/blotterService";
import { BARANGAY } from "@/lib/navigation";
import { cn } from "@/utils/cn";

const LAYER_GROUPS = ["Administrative", "Population", "Government", "Peace & Order"] as const;

const defaultLayers = () =>
  GIS_LAYERS.reduce(
    (acc, l) => ({ ...acc, [l.key]: l.defaultVisible }),
    {} as Record<GisLayerKey, boolean>,
  );

interface HouseholdFilters {
  status: "" | "Active" | "Inactive";
  size: "" | "1-3" | "4-5" | "6+";
  purok: string;
}

interface IncidentFilters {
  status: string;
  type: string;
}

export default function GisPage() {
  const { data, loading, error, reload } = useAsync(() => gisService.getWorkspace(), []);

  const [layers, setLayers] = useState<Record<GisLayerKey, boolean>>(defaultLayers);
  const [hhFilters, setHhFilters] = useState<HouseholdFilters>({ status: "", size: "", purok: "" });
  const [incFilters, setIncFilters] = useState<IncidentFilters>({ status: "", type: "" });
  const [residentMetric, setResidentMetric] = useState<"members" | "voters">("members");
  const [tool, setTool] = useState<GisTool>("select");
  const [basemap, setBasemap] = useState<BasemapKey>("light");
  const [selected, setSelected] = useState<MapSelection | null>(null);
  const [focus, setFocus] = useState<FocusRequest | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [resizeToken, setResizeToken] = useState(0);

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounced(query, 280);
  const [results, setResults] = useState<GisSearchResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  /* ---------------- Search ----------------------------------------- */
  useEffect(() => {
    let cancelled = false;
    if (debouncedQuery.trim().length < 2) {
      setResults([]);
      return;
    }
    void gisService.search(debouncedQuery).then((r) => {
      if (!cancelled) {
        setResults(r);
        setSearchOpen(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  useEffect(() => {
    setResizeToken((t) => t + 1);
  }, [fullscreen, selected]);

  const pickResult = (r: GisSearchResult) => {
    // Ensure the target layer is visible and not filtered away.
    setLayers((l) => ({ ...l, [r.layer === "incident" ? "incidents" : r.layer === "facility" ? "facilities" : "households"]: true }));
    if (r.layer === "household") setHhFilters({ status: "", size: "", purok: "" });
    if (r.layer === "incident") setIncFilters({ status: "", type: "" });
    setSelected({ layer: r.layer, id: r.id });
    setFocus({ layer: r.layer, id: r.id, lat: r.lat, lng: r.lng, token: Date.now() });
    setSearchOpen(false);
    setQuery("");
    setTool("select");
  };

  /* ---------------- Filtered features ------------------------------ */
  const households = useMemo(() => {
    if (!data) return [];
    return data.households.filter((h) => {
      if (hhFilters.status && h.status !== hhFilters.status) return false;
      if (hhFilters.purok && h.purok !== hhFilters.purok) return false;
      if (hhFilters.size) {
        const n = h.memberCount;
        if (hhFilters.size === "1-3" && !(n >= 1 && n <= 3)) return false;
        if (hhFilters.size === "4-5" && !(n >= 4 && n <= 5)) return false;
        if (hhFilters.size === "6+" && n < 6) return false;
      }
      return true;
    });
  }, [data, hhFilters]);

  const incidents = useMemo(() => {
    if (!data) return [];
    return data.incidents.filter((b) => {
      if (incFilters.status && b.status !== incFilters.status) return false;
      if (incFilters.type && b.incidentType !== incFilters.type) return false;
      return true;
    });
  }, [data, incFilters]);

  /* ---------------- Selected feature attributes -------------------- */
  const selectedHousehold =
    selected?.layer === "household" ? households.find((h) => h.id === selected.id) ?? data?.households.find((h) => h.id === selected.id) : undefined;
  const selectedFacility =
    selected?.layer === "facility" ? data?.facilities.find((f) => f.id === selected.id) : undefined;
  const selectedIncident =
    selected?.layer === "incident" ? data?.incidents.find((b) => b.id === selected.id) : undefined;

  const toolButton = (t: GisTool, Icon: React.ComponentType<{ className?: string }>, label: string) => (
    <button
      key={t}
      type="button"
      onClick={() => setTool(t)}
      aria-pressed={tool === t}
      title={label}
      className={cn(
        "flex h-9 items-center gap-1.5 border-r border-slate-200 px-2.5 text-xs font-medium last:border-r-0",
        tool === t ? "bg-brand-50 text-brand-800" : "bg-white text-slate-600 hover:bg-slate-50",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="hidden xl:inline">{label}</span>
    </button>
  );

  return (
    <div className="space-y-4">
      {!fullscreen && (
        <>
          <PageHeader
            title="GIS Mapping"
            description="Geographic workspace for household mapping, facilities and incident locations in Barangay Sta. Cruz."
            breadcrumbs={[{ label: "BIMS-BIPS", to: "/admin" }, { label: "GIS Mapping" }]}
          />
          <PrototypeNotice compact />
        </>
      )}

      {loading && (
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <InlineLoading label="Loading GIS workspace…" />
        </div>
      )}
      {error && !loading && (
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <ErrorState title="Unable to load GIS data" description={error} onRetry={reload} />
        </div>
      )}

      {data && !loading && (
        <section
          aria-label="GIS workspace"
          className={cn(
            "flex flex-col overflow-hidden border border-slate-200 bg-white shadow-sm",
            fullscreen
              ? "fixed inset-0 z-40 rounded-none"
              : "h-[calc(100vh-15.5rem)] min-h-[560px] rounded-lg",
          )}
        >
          {/* ------------------------------------------------ Toolbar */}
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-2.5 py-2">
            <div className="relative min-w-64 flex-1 sm:max-w-md" ref={searchRef}>
              <label htmlFor="gis-search" className="sr-only">
                Search GIS features
              </label>
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                id="gis-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => results.length > 0 && setSearchOpen(true)}
                placeholder="Search household, resident, address, facility, case no.…"
                autoComplete="off"
                className="h-9 w-full rounded-md border border-slate-300 bg-white pl-8 pr-2.5 text-sm placeholder:text-slate-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
              />
              {searchOpen && results.length > 0 && (
                <ul className="absolute z-[600] mt-1 w-full overflow-hidden rounded-md border border-slate-200 bg-white py-1 shadow-lg">
                  {results.map((r) => (
                    <li key={`${r.layer}-${r.id}-${r.kind}-${r.label}`}>
                      <button
                        type="button"
                        onClick={() => pickResult(r)}
                        className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left hover:bg-slate-50"
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-slate-100 text-slate-500">
                          {r.kind === "Facility" ? (
                            <Landmark className="h-3.5 w-3.5" />
                          ) : r.kind === "Incident" ? (
                            <ClipboardList className="h-3.5 w-3.5" />
                          ) : (
                            <Home className="h-3.5 w-3.5" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-slate-800">{r.label}</span>
                          <span className="block truncate text-[11px] text-slate-500">{r.sublabel}</span>
                        </span>
                        <Badge tone="neutral">{r.kind}</Badge>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {searchOpen && debouncedQuery.trim().length >= 2 && results.length === 0 && (
                <div className="absolute z-[600] mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 shadow-lg">
                  No matching GIS features.
                </div>
              )}
            </div>

            <div className="flex overflow-hidden rounded-md border border-slate-300" role="group" aria-label="Map tools">
              {toolButton("select", MousePointer2, "Identify")}
              {toolButton("distance", Ruler, "Measure distance")}
              {toolButton("area", Square, "Measure area")}
            </div>

            <label className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="hidden lg:inline">Basemap</span>
              <select
                aria-label="Basemap"
                value={basemap}
                onChange={(e) => setBasemap(e.target.value as BasemapKey)}
                className="h-9 rounded-md border border-slate-300 bg-white px-2 text-xs focus:border-brand-600 focus:outline-none"
              >
                <option value="light">Light (CARTO)</option>
                <option value="streets">Streets (OSM)</option>
              </select>
            </label>

            <Button
              variant="secondary"
              size="sm"
              className="h-9"
              onClick={() => setFullscreen((v) => !v)}
              aria-label={fullscreen ? "Exit map workspace" : "Expand map workspace"}
            >
              {fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              <span className="hidden lg:inline">{fullscreen ? "Exit workspace" : "Expand"}</span>
            </Button>
          </div>

          {/* ------------------------------------------------ Body */}
          <div className="flex min-h-0 flex-1">
            {/* Left panel: layers / filters / legend */}
            <aside className="scrollbar-thin hidden w-64 shrink-0 overflow-y-auto border-r border-slate-200 bg-white md:block">
              <div className="border-b border-slate-200 px-3 py-2">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                  <Layers className="h-3.5 w-3.5" />
                  Map layers
                </p>
              </div>
              <div className="space-y-3 px-3 py-2.5">
                {LAYER_GROUPS.map((group) => {
                  const items = GIS_LAYERS.filter((l) => l.group === group);
                  if (items.length === 0) return null;
                  return (
                    <div key={group}>
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                        {group}
                      </p>
                      <ul className="space-y-0.5">
                        {items.map((l) => (
                          <li key={l.key}>
                            <label className="flex cursor-pointer items-start gap-2 rounded px-1.5 py-1 hover:bg-slate-50">
                              <input
                                type="checkbox"
                                className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-brand-700 focus:ring-brand-600"
                                checked={layers[l.key]}
                                onChange={() => setLayers((s) => ({ ...s, [l.key]: !s[l.key] }))}
                              />
                              <span className="min-w-0">
                                <span className="block text-xs font-medium text-slate-800">{l.label}</span>
                                <span className="block text-[10px] text-slate-500">{l.description}</span>
                              </span>
                            </label>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>

              {/* Filters */}
              <div className="border-y border-slate-200 px-3 py-2">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Filters
                </p>
              </div>
              <div className="space-y-3 px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Households</p>
                <Field label="Status" htmlFor="gf-status">
                  <Select
                    id="gf-status"
                    className="h-8 text-xs"
                    value={hhFilters.status}
                    onChange={(e) => setHhFilters((f) => ({ ...f, status: e.target.value as HouseholdFilters["status"] }))}
                  >
                    <option value="">All</option>
                    <option>Active</option>
                    <option>Inactive</option>
                  </Select>
                </Field>
                <Field label="Household size" htmlFor="gf-size">
                  <Select
                    id="gf-size"
                    className="h-8 text-xs"
                    value={hhFilters.size}
                    onChange={(e) => setHhFilters((f) => ({ ...f, size: e.target.value as HouseholdFilters["size"] }))}
                  >
                    <option value="">All sizes</option>
                    <option value="1-3">1–3 members</option>
                    <option value="4-5">4–5 members</option>
                    <option value="6+">6+ members</option>
                  </Select>
                </Field>
                <Field label="Purok" htmlFor="gf-purok">
                  <Select
                    id="gf-purok"
                    className="h-8 text-xs"
                    value={hhFilters.purok}
                    onChange={(e) => setHhFilters((f) => ({ ...f, purok: e.target.value }))}
                  >
                    <option value="">All puroks</option>
                    {PUROK_OPTIONS.map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </Select>
                </Field>

                <p className="pt-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  Resident density
                </p>
                <Field label="Metric" htmlFor="gf-metric">
                  <Select
                    id="gf-metric"
                    className="h-8 text-xs"
                    value={residentMetric}
                    onChange={(e) => setResidentMetric(e.target.value as "members" | "voters")}
                  >
                    <option value="members">Active residents</option>
                    <option value="voters">Registered voters</option>
                  </Select>
                </Field>

                <p className="pt-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Incidents</p>
                <Field label="Case status" htmlFor="gf-inc-status">
                  <Select
                    id="gf-inc-status"
                    className="h-8 text-xs"
                    value={incFilters.status}
                    onChange={(e) => setIncFilters((f) => ({ ...f, status: e.target.value }))}
                  >
                    <option value="">All statuses</option>
                    {BLOTTER_STATUSES.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Incident type" htmlFor="gf-inc-type">
                  <Select
                    id="gf-inc-type"
                    className="h-8 text-xs"
                    value={incFilters.type}
                    onChange={(e) => setIncFilters((f) => ({ ...f, type: e.target.value }))}
                  >
                    <option value="">All types</option>
                    {INCIDENT_TYPES.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </Select>
                </Field>
              </div>

              {/* Legend */}
              <div className="border-y border-slate-200 px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">Legend</p>
              </div>
              <ul className="space-y-1.5 px-3 py-2.5 pb-4 text-xs text-slate-700">
                {layers.households && (
                  <>
                    <li className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full border-2 border-white bg-brand-700 shadow-sm" />
                      Household (active)
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full border-2 border-white bg-slate-400 shadow-sm" />
                      Household (inactive)
                    </li>
                  </>
                )}
                {layers.residents && (
                  <li className="flex items-center gap-2">
                    <span
                      className={cn(
                        "h-3.5 w-3.5 rounded-full opacity-40",
                        residentMetric === "voters" ? "bg-violet-600" : "bg-brand-600",
                      )}
                    />
                    Resident density ({residentMetric === "voters" ? "voters" : "residents"})
                  </li>
                )}
                {layers.facilities && (
                  <li className="flex items-center gap-2">
                    <span className="flex h-3.5 w-3.5 items-center justify-center rounded-sm bg-brand-700 text-[8px] font-bold text-white">
                      G
                    </span>
                    Facility / office (by category)
                  </li>
                )}
                {layers.incidents && (
                  <li className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full border-2 border-white bg-amber-500 shadow-sm" />
                    Incident (colour = case status)
                  </li>
                )}
                {layers.boundary && (
                  <li className="flex items-center gap-2">
                    <span className="h-0 w-4 border-t-2 border-dashed border-brand-700" />
                    Barangay boundary (simulated)
                  </li>
                )}
                {layers.puroks && (
                  <li className="flex items-center gap-2">
                    <span className="h-0 w-4 border-t border-dashed border-slate-500" />
                    Purok reference area
                  </li>
                )}
                <li className="flex items-center gap-2 text-slate-500">
                  <span className="h-0 w-4 border-t-2 border-slate-300" />
                  Roads &amp; context  basemap
                </li>
              </ul>
            </aside>

            {/* Map */}
            <div className="relative min-w-0 flex-1">
              <MapCanvas
                households={layers.households || layers.residents ? households : []}
                facilities={data.facilities}
                incidents={incidents}
                puroks={data.puroks}
                layers={layers}
                residentMetric={residentMetric}
                selected={selected}
                tool={tool}
                basemap={basemap}
                focus={focus}
                resizeToken={resizeToken}
                onSelect={setSelected}
              />
            </div>

            {/* Right panel: feature information */}
            {selected && (selectedHousehold || selectedFacility || selectedIncident) && (
              <aside className="scrollbar-thin w-72 shrink-0 overflow-y-auto border-l border-slate-200 bg-white">
                <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                    {selectedHousehold ? "Household" : selectedFacility ? "Facility" : "Incident"}
                  </p>
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    aria-label="Close information panel"
                    className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {selectedHousehold && (
                  <div className="space-y-3 p-3">
                    <div>
                      <p className="font-mono text-sm font-semibold text-slate-900">
                        {selectedHousehold.householdNo}
                      </p>
                      <div className="mt-1">
                        <StatusBadge status={selectedHousehold.status} />
                      </div>
                    </div>
                    <dl className="space-y-2.5">
                      {[
                        ["Location", `${BARANGAY.name}, ${BARANGAY.city}`],
                        ["Address", `${selectedHousehold.address}, ${selectedHousehold.purok}`],
                        ["Household head", selectedHousehold.headName],
                        ["Members", String(selectedHousehold.memberCount)],
                        ["Registered residents", String(selectedHousehold.activeResidentCount)],
                        ["Registered voters", String(selectedHousehold.voterCount)],
                        ["Senior citizens", String(selectedHousehold.seniorCount)],
                        ["Tenure", selectedHousehold.householdType],
                        ["Contact (masked)", selectedHousehold.headContactMasked],
                        ["Registered on", fmtDate(selectedHousehold.dateRegistered)],
                      ].map(([label, value]) => (
                        <div key={label}>
                          <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                            {label}
                          </dt>
                          <dd className="text-sm text-slate-800">{value}</dd>
                        </div>
                      ))}
                      <div>
                        <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                          Coordinates (simulated)
                        </dt>
                        <dd className="font-mono text-xs text-slate-700">
                          {selectedHousehold.lat.toFixed(5)}° N, {selectedHousehold.lng.toFixed(5)}° E
                        </dd>
                      </div>
                    </dl>
                    <div className="space-y-2 border-t border-slate-200 pt-3">
                      <Link to={`/admin/households/${selectedHousehold.id}`} className="block">
                        <Button variant="secondary" size="sm" className="w-full">
                          <Home className="h-3.5 w-3.5" />
                          View household record
                        </Button>
                      </Link>
                      <Link
                        to={`/admin/residents?search=${encodeURIComponent(selectedHousehold.headName.split(" ").slice(-1)[0])}`}
                        className="block"
                      >
                        <Button variant="secondary" size="sm" className="w-full">
                          View residents
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}

                {selectedFacility && (
                  <div className="space-y-3 p-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{selectedFacility.name}</p>
                      <div className="mt-1">
                        <Badge tone="brand">{selectedFacility.category}</Badge>
                      </div>
                    </div>
                    <dl className="space-y-2.5">
                      {[
                        ["Location", `${BARANGAY.name}, ${BARANGAY.city}`],
                        ["Address", selectedFacility.address],
                        ["Contact", selectedFacility.contactNumber],
                      ].map(([label, value]) => (
                        <div key={label}>
                          <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                            {label}
                          </dt>
                          <dd className="text-sm text-slate-800">{value}</dd>
                        </div>
                      ))}
                      <div>
                        <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                          Description
                        </dt>
                        <dd className="text-xs leading-relaxed text-slate-600">
                          {selectedFacility.description}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                          Coordinates (simulated)
                        </dt>
                        <dd className="font-mono text-xs text-slate-700">
                          {selectedFacility.lat.toFixed(5)}° N, {selectedFacility.lng.toFixed(5)}° E
                        </dd>
                      </div>
                    </dl>
                    {selectedFacility.category === "Government" && (
                      <div className="border-t border-slate-200 pt-3">
                        <Link to="/admin/officials" className="block">
                          <Button variant="secondary" size="sm" className="w-full">
                            <Landmark className="h-3.5 w-3.5" />
                            View barangay officials
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                )}

                {selectedIncident && (
                  <div className="space-y-3 p-3">
                    <div>
                      <p className="font-mono text-sm font-semibold text-slate-900">
                        {selectedIncident.caseNo}
                      </p>
                      <div className="mt-1">
                        <StatusBadge status={selectedIncident.status} />
                      </div>
                    </div>
                    <dl className="space-y-2.5">
                      {[
                        ["Incident type", selectedIncident.incidentType],
                        ["Reported location", selectedIncident.location],
                        ["Reported at", fmtDateTime(selectedIncident.reportedAt)],
                        ["Assigned personnel", selectedIncident.assignedTo],
                      ].map(([label, value]) => (
                        <div key={label}>
                          <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                            {label}
                          </dt>
                          <dd className="text-sm text-slate-800">{value}</dd>
                        </div>
                      ))}
                      <div>
                        <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                          Map position (approximate, simulated)
                        </dt>
                        <dd className="font-mono text-xs text-slate-700">
                          {selectedIncident.lat.toFixed(5)}° N, {selectedIncident.lng.toFixed(5)}° E
                        </dd>
                      </div>
                    </dl>
                    <div className="border-t border-slate-200 pt-3">
                      <Link to={`/admin/blotter/${selectedIncident.id}`} className="block">
                        <Button variant="secondary" size="sm" className="w-full">
                          <ClipboardList className="h-3.5 w-3.5" />
                          Open blotter case
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}
              </aside>
            )}
          </div>

          {/* ------------------------------------------------ Status bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] text-slate-500">
            <p>
              Displaying{" "}
              <span className="font-semibold text-slate-700">
                {layers.households ? households.length : 0}
              </span>{" "}
              households ·{" "}
              <span className="font-semibold text-slate-700">
                {layers.facilities ? data.facilities.length : 0}
              </span>{" "}
              facilities ·{" "}
              <span className="font-semibold text-slate-700">
                {layers.incidents ? incidents.length : 0}
              </span>{" "}
              incidents
            </p>
            <p className="flex items-center gap-2">
              <span className="font-semibold text-amber-700">GIS DATA: Prototype / Simulated</span>
              <span aria-hidden>·</span>
              <span>Basemap © OpenStreetMap contributors</span>
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
