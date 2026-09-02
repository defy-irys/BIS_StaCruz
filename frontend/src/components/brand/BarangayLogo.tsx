import { useId, useState } from "react";
import { cn } from "@/utils/cn";

export const BRAND_LOGO_SRC = "/brand-logo.png";

type AssetState = "unknown" | "ok" | "fail";
let assetState: AssetState = "unknown";

const INK = "#111111";
const PH_BLUE = "#0038a8";
const PH_RED = "#ce1126";
const ROYAL = "#1643b8";
const GOLD = "#fcd116";

/** Five-point star polygon points centered at (cx, cy). */
function starPoints(cx: number, cy: number, outer = 8, inner = 3.3) {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = ((-90 + i * 36) * Math.PI) / 180;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(" ");
}

export function BarangayLogo({
  size = 36,
  className,
  label = "Official seal of Barangay Sta. Cruz, First District, Quezon City",
}: {
  size?: number;
  className?: string;
  label?: string;
}) {
  const [state, setState] = useState<AssetState>(assetState);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const topArc = `sealTopArc${uid}`;
  const bottomArc = `sealBottomArc${uid}`;

  const markAsset = (next: AssetState) => {
    assetState = next;
    setState(next);
  };

  /* Local asset available → use it, contained and undistorted. */
  if (state === "ok") {
    return (
      <img
        src={BRAND_LOGO_SRC}
        alt={label}
        width={size}
        height={size}
        className={cn("shrink-0 object-contain", className)}
        onError={() => markAsset("fail")}
      />
    );
  }

  return (
    <>
      {/* Invisible probe: switches every instance to the local asset once it loads. */}
      {state === "unknown" && (
        <img
          src={BRAND_LOGO_SRC}
          alt=""
          aria-hidden
          className="pointer-events-none fixed h-px w-px opacity-0"
          onLoad={() => markAsset("ok")}
          onError={() => markAsset("fail")}
        />
      )}
      <svg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        role="img"
        aria-label={label}
        className={cn("shrink-0", className)}
      >
        {/* disc + rim */}
        <circle cx="100" cy="100" r="97" fill="#d9d9db" />
        <circle cx="100" cy="100" r="95" fill="#f7f7f8" />
        <circle cx="100" cy="100" r="88" fill="none" stroke={INK} strokeWidth="2.6" />
        <circle cx="100" cy="100" r="57.5" fill="none" stroke={INK} strokeWidth="2.6" />

        {/* shield sectors */}
        <path d="M100 100 L51.5 72 A56 56 0 0 1 148.5 72 Z" fill="#fbfbfc" />
        <path d="M100 100 L100 156 A56 56 0 0 1 51.5 72 Z" fill={PH_BLUE} />
        <path d="M100 100 L148.5 72 A56 56 0 0 1 100 156 Z" fill={PH_RED} />
        <path
          d="M51.5 72 L100 100 L148.5 72 M100 100 L100 156"
          fill="none"
          stroke={ROYAL}
          strokeWidth="4.5"
          strokeLinecap="round"
        />
        <circle cx="100" cy="100" r="56" fill="none" stroke={INK} strokeWidth="2.4" />

        {/* cross, ring and dove (white sector) */}
        <g>
          <rect x="98.4" y="50" width="3.2" height="50" fill={ROYAL} />
          <rect x="85" y="66.4" width="30" height="3.2" fill={ROYAL} />
          <circle cx="100" cy="68" r="10" fill="none" stroke={ROYAL} strokeWidth="2.2" />
          <path
            d="M92.5 70.5c3.2-.6 5.4-2.2 6.6-4.6.9 1.7 2.5 2.6 4.8 2.7-1 .9-2 1.5-3.2 1.8 1.7.6 3.4.6 5.1.1-1.8 2.7-4.7 3.8-8 3.2-1.6.9-3.4 1-5.3.2 1.3-.9 2-1.9 2.4-3z"
            fill="#ffffff"
            stroke={ROYAL}
            strokeWidth="0.8"
          />
        </g>

        {/* city skyline (blue sector) */}
        <g fill={INK}>
          <rect x="58" y="126" width="35" height="2.4" />
          <rect x="60.5" y="111" width="5" height="15" />
          <rect x="66.5" y="104" width="6" height="22" />
          <rect x="73.5" y="97" width="7.5" height="29" />
          <rect x="82" y="106" width="5.5" height="20" />
          <rect x="88.5" y="113" width="4" height="13" />
          <rect x="76.6" y="93" width="1.4" height="4" />
        </g>

        {/* mountain chevrons (red sector) */}
        <g fill="none" stroke={INK} strokeWidth="4.4" strokeLinejoin="miter">
          <path d="M110 125 L122 110 L130 120" />
          <path d="M117 125 L127 112.5 L136 124" />
          <path d="M126 125 L134.5 114 L143 125" />
        </g>

        {/* gold stars */}
        <polygon points={starPoints(28, 100)} fill={GOLD} />
        <polygon points={starPoints(172, 100)} fill={GOLD} />
        <polygon points={starPoints(100, 172, 7.4, 3.1)} fill={GOLD} />

        {/* arc lettering */}
        <text
          fill={INK}
          fontFamily="'Arial Black','Helvetica Neue',Arial,sans-serif"
          fontSize="15"
          fontWeight="900"
          letterSpacing="2"
        >
          <textPath href={`#${topArc}`} startOffset="50%" textAnchor="middle">
            BARANGAY STA. CRUZ
          </textPath>
        </text>
        <text
          fill={INK}
          fontFamily="'Arial Black','Helvetica Neue',Arial,sans-serif"
          fontSize="13"
          fontWeight="900"
          letterSpacing="1.4"
        >
          <textPath href={`#${bottomArc}`} startOffset="26%" textAnchor="middle">
            FIRST DISTRICT
          </textPath>
        </text>
        <text
          fill={INK}
          fontFamily="'Arial Black','Helvetica Neue',Arial,sans-serif"
          fontSize="13"
          fontWeight="900"
          letterSpacing="1.4"
        >
          <textPath href={`#${bottomArc}`} startOffset="74%" textAnchor="middle">
            QUEZON CITY
          </textPath>
        </text>

        {/* shared arc definitions (referenced by the lettering above) */}
        <defs>
          <path id={topArc} d="M 34 100 A 66 66 0 0 1 166 100" fill="none" />
          <path id={bottomArc} d="M 22 100 A 78 78 0 0 0 178 100" fill="none" />
        </defs>
      </svg>
    </>
  );
}
