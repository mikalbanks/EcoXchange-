import { useNavigate } from "react-router-dom";
import { BellRing, Play } from "lucide-react";
import { useAuth } from "../../context/AuthContext.js";
import type { Role } from "../../context/AuthContext.js";
import { useDemo } from "../../context/DemoContext.js";
import type { Audience, Scenario } from "../../context/DemoContext.js";

const SCENARIOS: { value: Scenario; label: string; hint: string; role: Role }[] = [
  {
    value: "verified",
    label: "Investor reviews measured production",
    hint:
      "PVDAQ inverter telemetry is compared with a NASA POWER model; the utility leg is explicitly labeled as derived.",
    role: "investor",
  },
  {
    value: "flagged",
    label: "Investor reviews simulated stress case",
    hint:
      "A clearly labeled Savannah fixture demonstrates repeated underperformance and the FLAGGED workflow.",
    role: "investor",
  },
];

const AUDIENCES: { value: Audience; label: string }[] = [
  { value: "solar_developer", label: "Solar Developer" },
  { value: "family_office", label: "Family Office" },
  { value: "ria_advisor", label: "RIA Advisor" },
  { value: "general", label: "General" },
];

export function DemoController() {
  const navigate = useNavigate();
  const { role, setRole } = useAuth();
  const { scenario, setScenario, audience, setAudience, enterDemo } = useDemo();

  const launch = () => {
    enterDemo();
    navigate(role === "developer" ? "/onboard" : "/investor");
  };

  return (
    <div className="min-h-screen bg-cream px-4 py-10">
      <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
        <div>
          <h1 className="font-heading text-3xl text-darkBg">
            EcoXchange Presenter Controls
          </h1>
          <p className="text-textMuted mt-1">
            Presentation controls for live demos.
          </p>
        </div>

        <section className="bg-white rounded-xl border border-paleGreen/60 p-6 space-y-3">
          <h2 className="font-heading text-lg text-darkBg">Current role</h2>
          <div className="inline-flex rounded-md border border-paleGreen/60 p-0.5">
            {(["investor", "developer"] as Role[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`rounded px-4 py-1.5 text-sm font-medium capitalize transition-colors duration-150 ${
                  role === r
                    ? "bg-medGreen text-white"
                    : "text-textMuted hover:text-darkBg"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-xl border border-paleGreen/60 p-6 space-y-3">
          <h2 className="font-heading text-lg text-darkBg">Demo scenarios</h2>
          <div className="space-y-2">
            {SCENARIOS.map((s) => (
              <label
                key={s.value}
                className="flex items-start gap-3 rounded-lg border border-paleGreen/50 p-3 cursor-pointer hover:bg-cream transition-colors duration-150"
              >
                <input
                  type="radio"
                  name="scenario"
                  className="mt-1 accent-medGreen"
                  checked={scenario === s.value}
                  onChange={() => {
                    setScenario(s.value);
                    setRole(s.role);
                  }}
                />
                <span>
                  <span className="block text-textDark font-medium">
                    {s.label}
                  </span>
                  <span className="block text-sm text-textMuted">{s.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-xl border border-paleGreen/60 p-6 space-y-3">
          <h2 className="font-heading text-lg text-darkBg">Audience preset</h2>
          <div className="flex flex-wrap gap-2">
            {AUDIENCES.map((a) => (
              <button
                key={a.value}
                type="button"
                onClick={() => setAudience(a.value)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium border transition-colors duration-150 ${
                  audience === a.value
                    ? "bg-darkBg text-white border-darkBg"
                    : "bg-white text-textMuted border-paleGreen/60 hover:text-darkBg"
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={launch}
            className="inline-flex items-center gap-2 rounded-md bg-medGreen px-6 py-3 text-white font-medium transition-colors duration-150 hover:bg-darkBg"
          >
            <Play className="h-5 w-5" /> Launch Demo
          </button>
          <button
            type="button"
            onClick={() => {
              enterDemo();
              setRole("developer");
              navigate("/developer/demo");
            }}
            className="inline-flex items-center gap-2 rounded-md border border-medGreen px-6 py-3 text-medGreen font-medium transition-colors duration-150 hover:bg-paleGreen/40"
          >
            <Play className="h-5 w-5" /> Developer Backtest Demo
          </button>
          <button
            type="button"
            onClick={() => {
              enterDemo();
              setRole("investor");
              // AppLayout reads-and-clears this param and fires the
              // distribution notification banner.
              navigate("/investor?simulate_distribution=1");
            }}
            className="inline-flex items-center gap-2 rounded-md border border-medGreen px-6 py-3 text-medGreen font-medium transition-colors duration-150 hover:bg-paleGreen/40"
          >
            <BellRing className="h-5 w-5" /> Simulate Distribution
          </button>
        </div>
      </div>
    </div>
  );
}
