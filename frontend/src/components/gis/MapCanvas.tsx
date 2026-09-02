import { useEffect, useRef } from "react";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  BARANGAY_BOUNDARY,
  GEO_ANCHOR,
  type FacilityFeature,
  type GisFeatureLayer,
  type GisLayerKey,
  type HouseholdFeature,
  type IncidentFeature,
  type PurokArea,
} from "@/services/gisService";

/**
 * Imperative Leaflet wrapper for the GIS workspace.
 *
 * QMC used as placeholder.
 *
 * All feature coordinates are SIMULATED prototype data.
 */

export type GisTool = "select" | "distance" | "area";
export type BasemapKey = "light" | "streets";

export interface MapSelection {
  layer: GisFeatureLayer;
  id: string;
}

export interface FocusRequest extends MapSelection {
  lat: number;
  lng: number;
  token: number;
}

interface MapCanvasProps {
  households: HouseholdFeature[];
  facilities: FacilityFeature[];
  incidents: IncidentFeature[];
  puroks: PurokArea[];
  layers: Record<GisLayerKey, boolean>;
  residentMetric: "members" | "voters";
  selected: MapSelection | null;
  tool: GisTool;
  basemap: BasemapKey;
  focus: FocusRequest | null;
  resizeToken: number;
  onSelect: (selection: MapSelection | null) => void;
}

const BASEMAPS: Record<BasemapKey, { url: string; attribution: string }> = {
  light: {
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
  streets: {
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
};

const STYLE = {
  household: { active: "#245693", inactive: "#94a3b8", selected: "#dc2626" },
  incident: {
    Pending: "#d97706",
    "Under Investigation": "#0284c7",
    Resolved: "#059669",
    Closed: "#64748b",
  } as Record<string, string>,
  facility: {
    Government: "#245693",
    Health: "#059669",
    Education: "#7c3aed",
    Community: "#0891b2",
    Safety: "#b91c1c",
  } as Record<string, string>,
};

const FACILITY_GLYPH: Record<string, string> = {
  Government: "G",
  Health: "H",
  Education: "E",
  Community: "C",
  Safety: "S",
};

function fmtDistance(m: number) {
  return m < 1000 ? `${m.toFixed(0)} m` : `${(m / 1000).toFixed(2)} km`;
}

function fmtArea(m2: number) {
  if (m2 < 10000) return `${m2.toFixed(0)} m²`;
  return `${(m2 / 10000).toFixed(2)} ha · ${(m2 / 1e6).toFixed(3)} km²`;
}

/** Approximate geodesic polygon area (same approach as Leaflet.GeometryUtil). */
function geodesicArea(latLngs: L.LatLng[]) {
  const R = 6378137;
  const n = latLngs.length;
  if (n < 3) return 0;
  let area = 0;
  const rad = Math.PI / 180;
  for (let i = 0; i < n; i++) {
    const p1 = latLngs[i];
    const p2 = latLngs[(i + 1) % n];
    area += (p2.lng - p1.lng) * rad * (2 + Math.sin(p1.lat * rad) + Math.sin(p2.lat * rad));
  }
  return Math.abs((area * R * R) / 2);
}

export default function MapCanvas({
  households,
  facilities,
  incidents,
  puroks,
  layers,
  residentMetric,
  selected,
  tool,
  basemap,
  focus,
  resizeToken,
  onSelect,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileRef = useRef<L.TileLayer | null>(null);

  const groupsRef = useRef<Record<GisLayerKey, L.LayerGroup>>({} as Record<GisLayerKey, L.LayerGroup>);
  const markerIndex = useRef<Map<string, L.CircleMarker | L.Marker>>(new Map());

  const toolRef = useRef<GisTool>(tool);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const coordRef = useRef<HTMLSpanElement>(null);
  const zoomRef = useRef<HTMLSpanElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);

  const measureState = useRef<{
    points: L.LatLng[];
    group: L.LayerGroup | null;
    finished: boolean;
  }>({ points: [], group: null, finished: false });

  /* ---------------- Map initialisation (once) ---------------------- */
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [GEO_ANCHOR.lat, GEO_ANCHOR.lng],
      zoom: 15,
      zoomControl: false,
      doubleClickZoom: false,
      attributionControl: true,
    });
    map.attributionControl.setPrefix(false);
    mapRef.current = map;

    (Object.keys({
      boundary: 1, puroks: 1, residents: 1, households: 1, facilities: 1, incidents: 1,
    }) as GisLayerKey[]).forEach((key) => {
      groupsRef.current[key] = L.layerGroup();
    });

    const measureGroup = L.layerGroup().addTo(map);
    measureState.current.group = measureGroup;

    map.on("mousemove", (e: L.LeafletMouseEvent) => {
      if (coordRef.current) {
        coordRef.current.textContent = `${e.latlng.lat.toFixed(5)}° N, ${e.latlng.lng.toFixed(5)}° E`;
      }
    });
    map.on("zoomend", () => {
      if (zoomRef.current) zoomRef.current.textContent = `Zoom ${map.getZoom()}`;
    });
    if (zoomRef.current) zoomRef.current.textContent = `Zoom ${map.getZoom()}`;

    /* Measurement + background-deselect click handling */
    map.on("click", (e: L.LeafletMouseEvent) => {
      const mode = toolRef.current;
      if (mode === "select") {
        onSelectRef.current(null);
        return;
      }
      const st = measureState.current;
      if (st.finished) {
        st.group?.clearLayers();
        st.points = [];
        st.finished = false;
      }
      st.points.push(e.latlng);
      redrawMeasurement(mode);
    });
    map.on("dblclick", () => {
      const mode = toolRef.current;
      if (mode === "select") return;
      const st = measureState.current;
      if (st.points.length >= (mode === "area" ? 3 : 2)) {
        st.finished = true;
        redrawMeasurement(mode, true);
      }
    });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && toolRef.current !== "select") {
        clearMeasurement();
      }
    };
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function clearMeasurement() {
    const st = measureState.current;
    st.group?.clearLayers();
    st.points = [];
    st.finished = false;
    if (measureRef.current) measureRef.current.style.display = "none";
  }

  function redrawMeasurement(mode: GisTool, final = false) {
    const st = measureState.current;
    const map = mapRef.current;
    if (!map || !st.group) return;
    st.group.clearLayers();

    st.points.forEach((p) => {
      L.circleMarker(p, {
        radius: 4,
        color: "#0f172a",
        weight: 2,
        fillColor: "#ffffff",
        fillOpacity: 1,
      }).addTo(st.group!);
    });

    let readout = "";
    if (mode === "distance" && st.points.length >= 1) {
      if (st.points.length >= 2) {
        L.polyline(st.points, {
          color: "#0f172a",
          weight: 2,
          dashArray: final ? undefined : "5 4",
        }).addTo(st.group);
        let total = 0;
        for (let i = 1; i < st.points.length; i++) total += map.distance(st.points[i - 1], st.points[i]);
        readout = `Distance  ${fmtDistance(total)}${final ? "" : " (double-click to finish)"}`;
      } else {
        readout = "Distance  click the next point";
      }
    }
    if (mode === "area" && st.points.length >= 1) {
      if (st.points.length >= 3) {
        L.polygon(st.points, {
          color: "#0f172a",
          weight: 2,
          fillColor: "#0f172a",
          fillOpacity: 0.08,
          dashArray: final ? undefined : "5 4",
        }).addTo(st.group);
        readout = `Area  ${fmtArea(geodesicArea(st.points))}${final ? "" : " (double-click to finish)"}`;
      } else {
        readout = `Area  ${st.points.length}/3 points placed`;
      }
    }
    if (measureRef.current) {
      measureRef.current.style.display = readout ? "block" : "none";
      measureRef.current.textContent = readout;
    }
  }

  /* ---------------- Tool mode ------------------------------------- */
  useEffect(() => {
    toolRef.current = tool;
    const map = mapRef.current;
    if (!map) return;
    map.getContainer().style.cursor = tool === "select" ? "" : "crosshair";
    if (tool === "select") clearMeasurement();
  }, [tool]);

  /* ---------------- Basemap --------------------------------------- */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (tileRef.current) tileRef.current.remove();
    tileRef.current = L.tileLayer(BASEMAPS[basemap].url, {
      attribution: BASEMAPS[basemap].attribution,
      maxZoom: 19,
    }).addTo(map);
  }, [basemap]);

  /* ---------------- Static layers: boundary + puroks --------------- */
  useEffect(() => {
    const g = groupsRef.current.boundary;
    if (!g) return;
    g.clearLayers();
    L.polygon(BARANGAY_BOUNDARY, {
      color: "#245693",
      weight: 2,
      dashArray: "6 4",
      fillColor: "#245693",
      fillOpacity: 0.05,
      interactive: false,
    }).addTo(g);
  }, []);

  useEffect(() => {
    const g = groupsRef.current.puroks;
    if (!g) return;
    g.clearLayers();
    puroks.forEach((p) => {
      L.circle([p.lat, p.lng], {
        radius: p.radius,
        color: "#64748b",
        weight: 1,
        dashArray: "4 4",
        fillColor: "#64748b",
        fillOpacity: 0.04,
        interactive: false,
      })
        .bindTooltip(`${p.purok} · ${p.households} households`, {
          permanent: true,
          direction: "center",
          className: "gis-purok-label",
        })
        .addTo(g);
    });
  }, [puroks]);

  /* ---------------- Households ------------------------------------- */
  useEffect(() => {
    const g = groupsRef.current.households;
    if (!g) return;
    g.clearLayers();
    households.forEach((h) => {
      const isSelected = selected?.layer === "household" && selected.id === h.id;
      const marker = L.circleMarker([h.lat, h.lng], {
        radius: isSelected ? 9 : 6,
        color: isSelected ? STYLE.household.selected : "#ffffff",
        weight: isSelected ? 3 : 1.5,
        fillColor:
          h.status === "Active" ? STYLE.household.active : STYLE.household.inactive,
        fillOpacity: 0.95,
      })
        .bindTooltip(h.householdNo, { direction: "top", offset: [0, -6], className: "gis-tooltip" })
        .on("click", (e) => {
          if (toolRef.current !== "select") return;
          L.DomEvent.stopPropagation(e);
          onSelectRef.current({ layer: "household", id: h.id });
        });
      marker.addTo(g);
      markerIndex.current.set(`household:${h.id}`, marker);
    });
  }, [households, selected]);

  /* ---------------- Resident density ------------------------------- */
  useEffect(() => {
    const g = groupsRef.current.residents;
    if (!g) return;
    g.clearLayers();
    households.forEach((h) => {
      const count = residentMetric === "voters" ? h.voterCount : h.activeResidentCount;
      if (count === 0) return;
      L.circleMarker([h.lat, h.lng], {
        radius: 5 + count * 1.6,
        stroke: false,
        fillColor: residentMetric === "voters" ? "#7c3aed" : "#245693",
        fillOpacity: 0.18,
        interactive: false,
      }).addTo(g);
    });
  }, [households, residentMetric]);

  /* ---------------- Facilities ------------------------------------- */
  useEffect(() => {
    const g = groupsRef.current.facilities;
    if (!g) return;
    g.clearLayers();
    facilities.forEach((f) => {
      const isSelected = selected?.layer === "facility" && selected.id === f.id;
      const color = STYLE.facility[f.category] ?? "#245693";
      const icon = L.divIcon({
        className: "",
        iconSize: [22, 22],
        iconAnchor: [11, 11],
        html: `<div style="width:22px;height:22px;border-radius:5px;background:${color};color:#fff;display:flex;align-items:center;justify-content:center;font:700 11px/1 Inter,system-ui,sans-serif;border:2px solid ${isSelected ? "#dc2626" : "#ffffff"};box-shadow:0 1px 2px rgba(15,23,42,.35)">${FACILITY_GLYPH[f.category] ?? "F"}</div>`,
      });
      const marker = L.marker([f.lat, f.lng], { icon })
        .bindTooltip(f.name, { direction: "top", offset: [0, -10], className: "gis-tooltip" })
        .on("click", (e) => {
          if (toolRef.current !== "select") return;
          L.DomEvent.stopPropagation(e);
          onSelectRef.current({ layer: "facility", id: f.id });
        });
      marker.addTo(g);
      markerIndex.current.set(`facility:${f.id}`, marker);
    });
  }, [facilities, selected]);

  /* ---------------- Incidents -------------------------------------- */
  useEffect(() => {
    const g = groupsRef.current.incidents;
    if (!g) return;
    g.clearLayers();
    incidents.forEach((b) => {
      const isSelected = selected?.layer === "incident" && selected.id === b.id;
      const marker = L.circleMarker([b.lat, b.lng], {
        radius: isSelected ? 9 : 6,
        color: isSelected ? STYLE.household.selected : "#ffffff",
        weight: isSelected ? 3 : 1.5,
        fillColor: STYLE.incident[b.status] ?? "#d97706",
        fillOpacity: 0.95,
      })
        .bindTooltip(`${b.caseNo}`, { direction: "top", offset: [0, -6], className: "gis-tooltip" })
        .on("click", (e) => {
          if (toolRef.current !== "select") return;
          L.DomEvent.stopPropagation(e);
          onSelectRef.current({ layer: "incident", id: b.id });
        });
      marker.addTo(g);
      markerIndex.current.set(`incident:${b.id}`, marker);
    });
  }, [incidents, selected]);

  /* ---------------- Layer visibility ------------------------------- */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    (Object.keys(groupsRef.current) as GisLayerKey[]).forEach((key) => {
      const group = groupsRef.current[key];
      if (layers[key] && !map.hasLayer(group)) group.addTo(map);
      if (!layers[key] && map.hasLayer(group)) group.remove();
    });
  }, [layers]);

  /* ---------------- Focus (search result / external centering) ----- */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focus) return;
    map.setView([focus.lat, focus.lng], Math.max(map.getZoom(), 17), { animate: true });
  }, [focus]);

  /* ---------------- Container resize (fullscreen toggle) ----------- */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const t = setTimeout(() => map.invalidateSize(), 120);
    return () => clearTimeout(t);
  }, [resizeToken]);

  const zoomIn = () => mapRef.current?.zoomIn();
  const zoomOut = () => mapRef.current?.zoomOut();
  const resetExtent = () =>
    mapRef.current?.fitBounds(L.latLngBounds(BARANGAY_BOUNDARY), { padding: [24, 24] });

  const controlBtn =
    "flex h-8 w-8 items-center justify-center border-b border-slate-200 bg-white text-slate-600 last:border-b-0 hover:bg-slate-50 hover:text-slate-900";

  return (
    <div className="isolate relative h-full w-full">
      <div ref={containerRef} className="h-full w-full bg-slate-100" role="application" aria-label="Barangay Sta. Cruz GIS map" />

      {/* Zoom / extent controls */}
      <div className="absolute left-3 top-3 z-[500] overflow-hidden rounded-md border border-slate-300 shadow-sm">
        <button type="button" className={controlBtn} onClick={zoomIn} aria-label="Zoom in" title="Zoom in">
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 3v10M3 8h10" strokeLinecap="round" />
          </svg>
        </button>
        <button type="button" className={controlBtn} onClick={zoomOut} aria-label="Zoom out" title="Zoom out">
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 8h10" strokeLinecap="round" />
          </svg>
        </button>
        <button type="button" className={controlBtn} onClick={resetExtent} aria-label="Zoom to barangay extent" title="Zoom to barangay extent">
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M2 5V2h3M11 2h3v3M14 11v3h-3M5 14H2v-3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Measurement readout */}
      <div
        ref={measureRef}
        style={{ display: "none" }}
        className="absolute bottom-8 left-1/2 z-[500] -translate-x-1/2 rounded-md border border-slate-300 bg-white px-3 py-1.5 font-mono text-xs text-slate-800 shadow-sm"
      />

      {/* Coordinate / zoom readout */}
      <div className="pointer-events-none absolute bottom-1 left-1 z-[500] flex items-center gap-3 rounded border border-slate-200 bg-white/90 px-2 py-0.5 font-mono text-[10px] text-slate-600">
        <span ref={coordRef}></span>
        <span ref={zoomRef} />
        <span>WGS 84</span>
      </div>

      {/* Data source notice */}
      <div className="pointer-events-none absolute right-1 top-1 z-[500] rounded border border-amber-200 bg-amber-50/95 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
        SIMULATED GIS DATA  NOT OFFICIAL
      </div>
    </div>
  );
}
