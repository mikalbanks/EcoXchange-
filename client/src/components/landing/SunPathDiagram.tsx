import { useEffect, useRef } from "react";
import { PUBLICATION_MAD_PCT, PUBLICATION_N } from "@shared/benchmark";

export function SunPathDiagram() {
  const ticksRef = useRef<SVGGElement>(null);

  useEffect(() => {
    const g = ticksRef.current;
    if (!g) return;
    while (g.firstChild) g.removeChild(g.firstChild);

    const cx = 240;
    const cy = 240;
    const R = 220;
    const ns = "http://www.w3.org/2000/svg";

    for (let d = 0; d < 360; d++) {
      const len = d % 15 === 0 ? 11 : d % 5 === 0 ? 6 : 2.5;
      const lw = d % 15 === 0 ? 0.9 : d % 5 === 0 ? 0.5 : 0.3;
      const a = ((d - 90) * Math.PI) / 180;
      const x1 = cx + R * Math.cos(a);
      const y1 = cy + R * Math.sin(a);
      const x2 = cx + (R - len) * Math.cos(a);
      const y2 = cy + (R - len) * Math.sin(a);
      const ln = document.createElementNS(ns, "line");
      ln.setAttribute("x1", x1.toFixed(2));
      ln.setAttribute("y1", y1.toFixed(2));
      ln.setAttribute("x2", x2.toFixed(2));
      ln.setAttribute("y2", y2.toFixed(2));
      ln.setAttribute("stroke-width", String(lw));
      g.appendChild(ln);
    }
  }, []);

  return (
    <figure className="diagram-frame">
      <div className="diagram-label label">Fig. I · Diurnal Sun-Path · Lat. 35°00′ N</div>
      <svg viewBox="0 0 480 480" xmlns="http://www.w3.org/2000/svg" aria-labelledby="sun-path-title">
        <title id="sun-path-title">Diurnal sun path diagram at latitude 35 degrees north</title>
        <g stroke="#d4e0d6" fill="none" strokeWidth="0.6" strokeDasharray="1 3">
          <circle cx="240" cy="240" r="196" />
          <circle cx="240" cy="240" r="148" />
          <circle cx="240" cy="240" r="100" />
          <circle cx="240" cy="240" r="52" />
        </g>
        <circle cx="240" cy="240" r="226" fill="none" stroke="#004d1a" strokeWidth="1.2" />
        <circle cx="240" cy="240" r="220" fill="none" stroke="#004d1a" strokeWidth="0.4" />
        <line x1="14" y1="240" x2="466" y2="240" stroke="#d4e0d6" strokeWidth="1" />
        <g ref={ticksRef} stroke="#004d1a" />
        <path d="M 14,240 Q 240,38 466,240" fill="none" stroke="#004d1a" strokeWidth="1.4" />
        <path
          d="M 14,240 Q 240,130 466,240"
          fill="none"
          stroke="#5a6b5c"
          strokeWidth="0.9"
          strokeDasharray="6 6"
        />
        <path
          d="M 14,240 Q 240,196 466,240"
          fill="none"
          stroke="#5a6b5c"
          strokeWidth="0.7"
          strokeDasharray="3 4"
        />
        <circle cx="240" cy="240" r="5" fill="#004d1a" />
        <circle cx="240" cy="240" r="12" fill="none" stroke="#004d1a" strokeWidth="0.6" />
        <g transform="translate(310,110)">
          <line x1="-24" y1="0" x2="24" y2="0" stroke="#76c945" strokeWidth="0.8" />
          <line x1="0" y1="-24" x2="0" y2="24" stroke="#76c945" strokeWidth="0.8" />
          <circle cx="0" cy="0" r="7" fill="#76c945" />
          <circle cx="0" cy="0" r="13" fill="none" stroke="#76c945" strokeWidth="1" />
        </g>
        <text x="338" y="114" fontFamily="JetBrains Mono" fontSize="9.5" fill="#5aaa2e">
          OBS. 04 · 14:37 LST
        </text>
        <text x="240" y="18" textAnchor="middle" fontFamily="Gloock" fontSize="18" fill="#004d1a">
          N
        </text>
        <text x="240" y="470" textAnchor="middle" fontFamily="Gloock" fontSize="18" fill="#004d1a">
          S
        </text>
        <text x="12" y="246" textAnchor="start" fontFamily="Gloock" fontSize="18" fill="#004d1a">
          W
        </text>
        <text x="468" y="246" textAnchor="end" fontFamily="Gloock" fontSize="18" fill="#004d1a">
          E
        </text>
        <text
          x="240"
          y="452"
          textAnchor="middle"
          fontFamily="Instrument Serif"
          fontStyle="italic"
          fontSize="11"
          fill="#5a6b5c"
        >
          fig. I · diurnal sun-path, lat. 35°00′ N
        </text>
      </svg>
      <div className="diagram-caption label">
        OBS. 04 · ±{PUBLICATION_MAD_PCT.toFixed(1)}% mean absolute deviation · n ={" "}
        {PUBLICATION_N.toLocaleString("en-US")} plants
      </div>
    </figure>
  );
}
