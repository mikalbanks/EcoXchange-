interface Row {
  label: string;
  traditional: string;
  ecoxchange: string;
  savings: string;
}

const ROWS: Row[] = [
  {
    label: "All-in cost (Year 1, $2.5M raise)",
    traditional: "$325,000–$500,000",
    ecoxchange: "~$125,000–$175,000",
    savings: "55–65%",
  },
  {
    label: "Time to capital",
    traditional: "3–9 months",
    ecoxchange: "2–6 weeks",
    savings: "—",
  },
  {
    label: "Ongoing annual admin",
    traditional: "$25,000–$40,000/yr",
    ecoxchange: "~$31,000/yr (platform)",
    savings: "—",
  },
];

export function CostComparisonTable() {
  return (
    <div className="bg-white rounded-lg border border-paleGreen/60 overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-paleGreen/40 text-textMuted uppercase text-xs">
          <tr>
            <th className="px-4 py-3 text-left"></th>
            <th className="px-4 py-3 text-left">Traditional Reg D</th>
            <th className="px-4 py-3 text-left">EcoXchange</th>
            <th className="px-4 py-3 text-left">Savings</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-paleGreen/40">
          {ROWS.map((r) => (
            <tr key={r.label}>
              <td className="px-4 py-3 font-medium text-textDark">{r.label}</td>
              <td className="px-4 py-3 text-textDark">{r.traditional}</td>
              <td className="px-4 py-3 text-medGreen font-medium">
                {r.ecoxchange}
              </td>
              <td className="px-4 py-3 text-darkBg">{r.savings}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
