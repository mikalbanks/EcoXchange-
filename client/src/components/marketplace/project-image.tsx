/**
 * Visual identity for a marketplace listing.
 *
 * When a listing carries a photograph of the physical system we render it with
 * its credit line. Otherwise we draw a deterministic site card: an oblique view
 * of the actual array, built from the asset's own attributes — mounting type,
 * capacity, resource region, latitude — rather than a stock image that would
 * imply a site we have not seen.
 *
 * The drawing is seeded from the listing id, so a given asset always looks the
 * same, and two assets never look identical.
 */

interface ProjectImageAttrs {
  id: string;
  name: string;
  state: string;
  county: string | null;
  capacityMW: number;
  arrayType: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
  imageCredit: string | null;
  imageLicense: string | null;
}

type Mounting = "SINGLE_AXIS_TRACKER" | "FIXED_TILT" | "ROOFTOP";

function mountingOf(arrayType: string | null): Mounting {
  const t = (arrayType ?? "").toUpperCase();
  if (t.includes("ROOF")) return "ROOFTOP";
  if (t.includes("FIXED")) return "FIXED_TILT";
  return "SINGLE_AXIS_TRACKER";
}

function mountingLabel(m: Mounting): string {
  return m === "ROOFTOP" ? "Rooftop" : m === "FIXED_TILT" ? "Fixed tilt" : "Single-axis tracker";
}

/** Ground palette by resource region — desert, plains, humid southeast, northeast. */
const TERRAIN: Record<string, { near: string; far: string; sky: string; haze: string }> = {
  SOUTHWEST: { near: "#8a6b43", far: "#b8946a", sky: "#3d6ea8", haze: "#e0b988" },
  SOUTH_CENTRAL: { near: "#7d7043", far: "#a89a68", sky: "#3f6fa3", haze: "#dcc98f" },
  SOUTHEAST: { near: "#4a6b41", far: "#75946a", sky: "#4877a6", haze: "#cfd9a8" },
  MIDWEST: { near: "#5c6b3c", far: "#8b9663", sky: "#456f9e", haze: "#d3d3a0" },
  NORTHEAST: { near: "#46603f", far: "#6f8663", sky: "#4a6f92", haze: "#c3cdb4" },
};

const SOUTHWEST = new Set(["ARIZONA", "NEVADA", "NEW MEXICO", "UTAH", "CALIFORNIA"]);
const SOUTH_CENTRAL = new Set(["TEXAS", "OKLAHOMA", "KANSAS", "COLORADO", "ARKANSAS", "LOUISIANA"]);
const SOUTHEAST = new Set([
  "FLORIDA", "GEORGIA", "ALABAMA", "MISSISSIPPI", "SOUTH CAROLINA", "NORTH CAROLINA",
  "TENNESSEE", "VIRGINIA",
]);
const NORTHEAST = new Set([
  "MAINE", "NEW HAMPSHIRE", "VERMONT", "MASSACHUSETTS", "RHODE ISLAND", "CONNECTICUT",
  "NEW YORK", "NEW JERSEY", "PENNSYLVANIA", "MARYLAND", "DELAWARE", "WASHINGTON", "OREGON",
]);

function regionOf(state: string): string {
  const s = (state ?? "").trim().toUpperCase();
  if (SOUTHWEST.has(s)) return "SOUTHWEST";
  if (SOUTH_CENTRAL.has(s)) return "SOUTH_CENTRAL";
  if (SOUTHEAST.has(s)) return "SOUTHEAST";
  if (NORTHEAST.has(s)) return "NORTHEAST";
  return "MIDWEST";
}

/** Small deterministic PRNG so a listing's card never changes between renders. */
function seededRandom(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let s = h >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}

const W = 400;
const H = 190;
const HORIZON = 74;

function GroundMountArray({ seed, mounting, gid }: { seed: string; mounting: Mounting; gid: string }) {
  const rand = seededRandom(seed);
  const rows: JSX.Element[] = [];
  const rowCount = 7;

  const tracker = mounting === "SINGLE_AXIS_TRACKER";

  for (let r = 0; r < rowCount; r++) {
    // Rows recede toward the horizon: nearer rows sit lower, run wider and
    // stand taller, which is what gives the card its depth.
    const t = r / (rowCount - 1);
    const y = HORIZON + 8 + Math.pow(t, 1.8) * (H - HORIZON - 30);
    // Panel face height grows sharply with proximity so the array reads as an
    // array rather than as a set of thin stripes.
    const faceH = 4 + Math.pow(t, 1.35) * 30;
    const inset = 52 * (1 - t) - 16;
    const x0 = inset;
    const x1 = W - inset;
    // A tracker row leans as one; fixed tilt is steeper and uniform. The lean
    // is what visually distinguishes the two mounting types.
    const skew = tracker ? faceH * (0.16 + rand() * 0.06) : faceH * 0.4;
    const shadowH = 2 + t * 5;

    const panelCount = Math.max(4, Math.round(5 + t * 4));
    const gap = 2 + t * 4;
    const span = (x1 - x0 - gap * (panelCount - 1)) / panelCount;

    // Shadow the row casts on the ground, anchoring it to the terrain.
    rows.push(
      <ellipse
        key={`sh-${r}`}
        cx={(x0 + x1) / 2}
        cy={y + shadowH * 0.6}
        rx={(x1 - x0) / 2}
        ry={shadowH}
        fill="#000"
        opacity={0.1 + t * 0.1}
      />,
    );

    for (let p = 0; p < panelCount; p++) {
      const px = x0 + p * (span + gap);
      rows.push(
        <g key={`${r}-${p}`}>
          {/* Panel face, leaning toward the sun. */}
          <path
            d={`M${px + skew} ${y - faceH} L${px + skew + span} ${y - faceH} L${px + span} ${y} L${px} ${y} Z`}
            fill={`url(#${gid}-pv)`}
            opacity={0.72 + t * 0.28}
          />
          {/* Bright upper edge — the glass catching light. */}
          <path
            d={`M${px + skew} ${y - faceH} L${px + skew + span} ${y - faceH}`}
            stroke="#7fb2d8"
            strokeWidth={0.8 + t * 0.7}
            opacity={0.45 + t * 0.3}
          />
          {/* Cell division down the middle of each module. */}
          <path
            d={`M${px + skew / 2 + span / 2} ${y - faceH / 2} L${px + span / 2} ${y}`}
            stroke="#0b1b2b"
            strokeWidth={0.5}
            opacity={0.35}
          />
        </g>,
      );
    }

    // Torque tube for trackers; pile stubs for fixed tilt.
    if (tracker) {
      rows.push(
        <line
          key={`tt-${r}`}
          x1={x0 + skew / 2}
          y1={y - faceH / 2}
          x2={x1 + skew / 2}
          y2={y - faceH / 2}
          stroke="#3b4046"
          strokeWidth={0.5 + t * 0.8}
          opacity={0.5}
        />,
      );
    } else {
      for (let p = 0; p <= panelCount; p += 2) {
        const px = x0 + p * (span + gap);
        rows.push(
          <line
            key={`pl-${r}-${p}`}
            x1={px + skew * 0.5}
            y1={y - faceH * 0.5}
            x2={px + skew * 0.5}
            y2={y}
            stroke="#3b4046"
            strokeWidth={0.5 + t * 0.5}
            opacity={0.4}
          />,
        );
      }
    }
  }
  return <>{rows}</>;
}

function RooftopArray({ seed, gid }: { seed: string; gid: string }) {
  const rand = seededRandom(seed);
  const buildings: JSX.Element[] = [];
  // Three flat-roof industrial buildings at different depths, panels gridded on top.
  const specs = [
    { x: 14, y: 128, w: 168, h: 44, depth: 22 },
    { x: 196, y: 116, w: 138, h: 38, depth: 18 },
    { x: 96, y: 96, w: 118, h: 26, depth: 13 },
  ];

  specs.forEach((b, i) => {
    const roofY = b.y - b.depth;
    buildings.push(
      <g key={`b-${i}`}>
        {/* facade */}
        <rect x={b.x} y={b.y} width={b.w} height={b.h} fill="#cfd4d9" opacity={0.92} />
        <rect x={b.x} y={b.y} width={b.w} height={b.h} fill="#0b1b2b" opacity={0.12} />
        {/* roof plane */}
        <path
          d={`M${b.x} ${b.y} L${b.x + b.w} ${b.y} L${b.x + b.w - 12} ${roofY} L${b.x + 12} ${roofY} Z`}
          fill="#e6e9ec"
        />
      </g>,
    );

    // Panel grid on the roof plane.
    const cols = Math.round(b.w / 26);
    const rowsN = 3;
    for (let r = 0; r < rowsN; r++) {
      const ry = roofY + ((b.depth - 3) * (r + 0.4)) / rowsN;
      const shrink = 12 * (1 - (r + 0.4) / rowsN);
      for (let c = 0; c < cols; c++) {
        const pw = (b.w - 2 * shrink - 8) / cols;
        const px = b.x + shrink + 4 + c * pw;
        if (rand() < 0.08) continue; // roof penetrations, skylights, HVAC
        buildings.push(
          <rect
            key={`p-${i}-${r}-${c}`}
            x={px}
            y={ry}
            width={Math.max(2, pw - 2)}
            height={Math.max(1.6, (b.depth - 4) / rowsN - 1)}
            fill={`url(#${gid}-pv)`}
            opacity={0.55 + r * 0.15}
          />,
        );
      }
    }
  });

  return <>{buildings}</>;
}

export function ProjectImage({ project }: { project: ProjectImageAttrs }) {
  if (project.imageUrl) {
    return (
      <figure className="m-0">
        <img
          src={project.imageUrl}
          alt={project.imageAlt ?? `${project.name} solar array`}
          className="w-full h-[190px] object-cover rounded-t-md"
          loading="lazy"
        />
        {(project.imageCredit || project.imageLicense) && (
          <figcaption className="px-3 pt-1 text-[10px] text-muted-foreground">
            {project.imageCredit}
            {project.imageCredit && project.imageLicense ? " · " : ""}
            {project.imageLicense}
          </figcaption>
        )}
      </figure>
    );
  }

  const mounting = mountingOf(project.arrayType);
  const region = regionOf(project.state);
  const palette = TERRAIN[region] ?? TERRAIN.MIDWEST;
  const seed = project.id;
  const gid = `pv-${project.id.replace(/[^a-zA-Z0-9]/g, "")}`;

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-[190px] rounded-t-md"
        role="img"
        aria-label={`Schematic site view of ${project.name}: ${project.capacityMW.toFixed(1)} megawatts, ${mountingLabel(mounting).toLowerCase()}, ${project.county ?? ""} ${project.state}`}
        data-testid={`site-card-${project.id}`}
      >
        <defs>
          <linearGradient id={`${gid}-sky`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={palette.sky} />
            <stop offset="100%" stopColor={palette.haze} />
          </linearGradient>
          <linearGradient id={`${gid}-ground`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={palette.far} />
            <stop offset="100%" stopColor={palette.near} />
          </linearGradient>
          <linearGradient id={`${gid}-pv`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1c3f63" />
            <stop offset="55%" stopColor="#14314e" />
            <stop offset="100%" stopColor="#0d2138" />
          </linearGradient>
          <linearGradient id={`${gid}-scrim`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000" stopOpacity="0.55" />
          </linearGradient>
        </defs>

        <rect width={W} height={HORIZON} fill={`url(#${gid}-sky)`} />
        <rect y={HORIZON} width={W} height={H - HORIZON} fill={`url(#${gid}-ground)`} />

        <circle cx={W * 0.78} cy={HORIZON - 30} r={11} fill="#fff3d6" opacity={0.85} />

        {/* Horizon line and a faint ridge for depth. */}
        <path
          d={`M0 ${HORIZON} L${W} ${HORIZON}`}
          stroke="#0b1b2b"
          strokeWidth={0.8}
          opacity={0.25}
        />

        {mounting === "ROOFTOP" ? (
          <RooftopArray seed={seed} gid={gid} />
        ) : (
          <GroundMountArray seed={seed} mounting={mounting} gid={gid} />
        )}

        {/* Legibility scrim behind the stamp. */}
        <rect y={H - 46} width={W} height={46} fill={`url(#${gid}-scrim)`} />
        <text x={12} y={H - 24} fill="#fff" fontSize={17} fontWeight={600} fontFamily="ui-sans-serif, system-ui">
          {project.capacityMW.toFixed(project.capacityMW < 10 ? 2 : 1)} MW
        </text>
        <text
          x={12}
          y={H - 10}
          fill="#fff"
          fontSize={9.5}
          opacity={0.82}
          letterSpacing={1.1}
          fontFamily="ui-monospace, SFMono-Regular, monospace"
        >
          {mountingLabel(mounting).toUpperCase()}
          {project.county ? ` · ${project.county.toUpperCase()}, ${project.state.toUpperCase()}` : ` · ${project.state.toUpperCase()}`}
        </text>
      </svg>
      <figcaption className="px-3 pt-1 text-[10px] text-muted-foreground">
        Schematic site view generated from the asset's mounting type, capacity and location — not a
        photograph of the site.
      </figcaption>
    </figure>
  );
}
