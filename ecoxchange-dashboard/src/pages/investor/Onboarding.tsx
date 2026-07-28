import { Check, Clock } from "lucide-react";

interface Step {
  title: string;
  detail: string;
  done: boolean;
}

const STEPS: Step[] = [
  {
    title: "Create Account",
    detail: "Email and name captured — mock account active.",
    done: true,
  },
  {
    title: "Verify Accreditation",
    detail: "Integration with North Capital / Sumsub (via Polymath) — pending compliance setup.",
    done: false,
  },
  {
    title: "KYC / AML Check",
    detail: "Identity verification — pending compliance setup.",
    done: false,
  },
  {
    title: "Create Wallet",
    detail: "Web3Auth MPC wallet (via Polymath) — pending compliance setup.",
    done: false,
  },
  {
    title: "Fund & Subscribe",
    detail: "Fund your wallet and subscribe to an offering — pending compliance setup.",
    done: false,
  },
];

export function Onboarding() {
  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="font-heading text-3xl text-darkBg">Investor Onboarding</h1>
        <p className="text-textMuted mt-1">
          A preview of the accreditation and subscription flow. Live steps unlock
          after securities counsel.
        </p>
      </div>

      <ol className="space-y-4">
        {STEPS.map((step, i) => (
          <li
            key={step.title}
            className="bg-white rounded-xl border border-paleGreen/60 p-5 flex items-start gap-4"
          >
            <div
              className={`mt-0.5 h-9 w-9 shrink-0 rounded-full flex items-center justify-center ${
                step.done
                  ? "bg-accentBrt/20 text-accentBrt"
                  : "bg-paleGreen/40 text-textMuted"
              }`}
            >
              {step.done ? (
                <Check className="h-5 w-5" />
              ) : (
                <Clock className="h-5 w-5" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="font-heading text-lg text-darkBg">
                  {i + 1}. {step.title}
                </h2>
                {step.done ? (
                  <span className="rounded-full bg-accentBrt/20 px-2 py-0.5 text-[11px] font-medium text-medGreen">
                    Complete
                  </span>
                ) : (
                  <span className="rounded-full bg-paleGreen/40 px-2 py-0.5 text-[11px] font-medium text-textMuted">
                    Coming Soon — Pending Compliance Setup
                  </span>
                )}
              </div>
              <p className="text-sm text-textMuted mt-1">{step.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
