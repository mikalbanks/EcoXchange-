import { useState } from "react";
import type { ReactNode } from "react";
import { useCompliance } from "../ComplianceProvider.js";

// Self-certification gate state lives in sessionStorage — it expires when the
// tab closes and is never shared across sessions. This is NOT legal
// accreditation verification (that's Parallel Markets / Verify Investor); it
// is the standard Reg D 506(c) pre-screen shown before offering content.
const GATE_KEY = "ecoxchange_accred_self_cert";

function readGate(): boolean {
  try {
    return sessionStorage.getItem(GATE_KEY) === "true";
  } catch {
    return false;
  }
}

function writeGate(): void {
  try {
    sessionStorage.setItem(GATE_KEY, "true");
  } catch {
    // Private mode / quota — gate simply re-shows next navigation.
  }
}

/**
 * Full-page accredited-investor self-certification gate. Blocks offering
 * content in preview and live compliance modes; invisible in demo mode.
 */
export function AccreditationGate({ children }: { children: ReactNode }) {
  const { showAccreditationGate } = useCompliance();
  const [passed, setPassed] = useState(readGate);
  const [confirmed, setConfirmed] = useState(false);

  if (!showAccreditationGate || passed) return <>{children}</>;

  return (
    <div className="min-h-screen w-full bg-cream flex items-start sm:items-center justify-center px-4 py-10">
      <div className="w-full max-w-[560px]">
        <img
          src="/ecoxchange-logo.svg"
          alt="EcoXchange"
          className="mx-auto w-[120px]"
        />

        <h1 className="mt-8 text-center font-heading italic text-2xl text-darkBg">
          Investor Qualification Notice
        </h1>

        <p className="mt-6 text-sm leading-[1.7] text-textDark">
          The investment opportunities described on this platform are available
          exclusively to verified accredited investors under SEC Regulation D
          Rule 506(c).
        </p>

        <p className="mt-4 text-sm leading-[1.7] text-textDark">
          An accredited investor is defined as:
        </p>
        <ul className="mt-2 list-disc pl-5 text-sm leading-[1.7] text-textDark space-y-1">
          <li>
            An individual with income exceeding $200,000 ($300,000 with spouse)
            in each of the two most recent years, with a reasonable expectation
            of the same in the current year
          </li>
          <li>
            An individual with net worth exceeding $1,000,000 (excluding
            primary residence)
          </li>
          <li>Certain entities with assets exceeding $5,000,000</li>
        </ul>

        <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-lg border border-darkBg/20 bg-white p-4">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-medGreen"
          />
          <span className="text-sm leading-[1.7] text-textDark">
            I confirm that I am an accredited investor as defined by SEC Rule
            501 of Regulation D.
          </span>
        </label>

        <button
          type="button"
          disabled={!confirmed}
          onClick={() => {
            writeGate();
            setPassed(true);
          }}
          className="mt-6 w-full bg-darkBg py-3.5 text-sm font-medium uppercase tracking-wider text-cream transition-opacity duration-150 disabled:opacity-40"
        >
          Continue to Platform →
        </button>

        <p className="mt-6 text-center font-mono text-[10px] leading-relaxed text-textMuted">
          By continuing, you acknowledge that this self-certification does not
          replace formal accreditation verification, which is required before
          any investment.
        </p>
      </div>
    </div>
  );
}
