/**
 * Font registration for the Production Verification Report.
 *
 * IBM Plex Mono (OFL, bundled under client/public/fonts) is used for data
 * values, methodology notes, and disclaimers. Headings use the @react-pdf
 * built-in "Times-Roman" serif and body text uses the built-in "Helvetica" —
 * no extra files required.
 *
 * Registration is best-effort: if the .ttf files are missing at runtime the
 * report still renders (react-pdf falls back to a built-in font) instead of
 * throwing and 500-ing the route.
 */
import { Font } from "@react-pdf/renderer";
import path from "path";
import fs from "fs";

export const MONO_FAMILY = "IBM Plex Mono";

let registered = false;

/** Idempotently register the bundled report fonts. Safe to call per request. */
export function registerReportFonts(): void {
  if (registered) return;
  registered = true;

  // Resolved relative to the process working directory (repo root in both dev
  // `tsx` and the Render `node dist/index.cjs` start), where client/public ships.
  const fontsDir = path.resolve(process.cwd(), "client", "public", "fonts");
  const regular = path.join(fontsDir, "IBMPlexMono-Regular.ttf");
  const bold = path.join(fontsDir, "IBMPlexMono-Bold.ttf");

  try {
    if (fs.existsSync(regular) && fs.existsSync(bold)) {
      Font.register({
        family: MONO_FAMILY,
        fonts: [
          { src: regular, fontWeight: "normal" },
          { src: bold, fontWeight: "bold" },
        ],
      });
    }
  } catch {
    // Leave MONO_FAMILY unregistered; styles fall back to a built-in font.
  }

  // Avoid hyphenation in narrow table cells / data columns.
  Font.registerHyphenationCallback((word) => [word]);
}
