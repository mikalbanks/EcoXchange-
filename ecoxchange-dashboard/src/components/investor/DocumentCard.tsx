import { FileText, Lock } from "lucide-react";

interface Props {
  title: string;
  description: string;
  pending?: boolean;
}

// Placeholder document tile. Real documents arrive via Supabase Storage once the
// compliance layer is in place — until then every card shows a "pending" state.
export function DocumentCard({ title, description, pending = true }: Props) {
  return (
    <div className="bg-white rounded-xl border border-paleGreen/60 p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div className="h-10 w-10 rounded-lg bg-paleGreen/40 flex items-center justify-center">
          <FileText className="h-5 w-5 text-medGreen" />
        </div>
        {pending ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-paleGreen/40 px-2 py-0.5 text-[11px] font-medium text-textMuted">
            <Lock className="h-3 w-3" /> Pending compliance
          </span>
        ) : null}
      </div>
      <div>
        <h3 className="font-heading text-lg text-darkBg">{title}</h3>
        <p className="text-sm text-textMuted mt-1">{description}</p>
      </div>
      <button
        type="button"
        disabled={pending}
        className="mt-auto self-start text-sm font-medium text-medGreen disabled:text-textMuted/60 disabled:cursor-not-allowed"
      >
        {pending ? "Unavailable" : "Download"}
      </button>
    </div>
  );
}
