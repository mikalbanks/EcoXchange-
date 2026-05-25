interface Props {
  label: string;
  value: string;
  sublabel?: string;
}

export function StatCard({ label, value, sublabel }: Props) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-paleGreen/60 p-5">
      <div className="text-xs uppercase tracking-wide text-textMuted">{label}</div>
      <div className="mt-2 font-heading text-3xl text-darkBg">{value}</div>
      {sublabel ? (
        <div className="mt-1 text-sm text-textMuted">{sublabel}</div>
      ) : null}
    </div>
  );
}
