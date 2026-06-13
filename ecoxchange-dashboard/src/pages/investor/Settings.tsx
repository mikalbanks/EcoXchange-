import { useAuth } from "../../context/AuthContext.js";

export function Settings() {
  const { user } = useAuth();

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="font-heading text-3xl text-darkBg">Settings</h1>
        <p className="text-textMuted mt-1">
          Manage your profile and notification preferences.
        </p>
      </div>

      <section className="bg-white rounded-xl border border-paleGreen/60 p-6 space-y-4 max-w-2xl">
        <h2 className="font-heading text-xl text-darkBg">Profile</h2>
        <Field label="Name" value={user.name} />
        <Field label="Email" value={user.email} />
        <p className="text-xs text-textMuted">
          Profile editing and authentication arrive with the Privy integration
          (pending securities counsel).
        </p>
      </section>

      <section className="bg-white rounded-xl border border-paleGreen/60 p-6 space-y-4 max-w-2xl">
        <h2 className="font-heading text-xl text-darkBg">Notifications</h2>
        <Toggle label="Monthly yield summary" />
        <Toggle label="Verification status changes" />
        <Toggle label="New offering announcements" />
        <p className="text-xs text-textMuted">
          Preferences are illustrative — delivery is not yet wired.
        </p>
      </section>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-textMuted">
        {label}
      </div>
      <div className="mt-1 text-textDark">{value}</div>
    </div>
  );
}

function Toggle({ label }: { label: string }) {
  return (
    <label className="flex items-center justify-between gap-4 cursor-not-allowed opacity-80">
      <span className="text-sm text-textDark">{label}</span>
      <span className="relative inline-flex h-6 w-11 items-center rounded-full bg-paleGreen/70">
        <span className="inline-block h-5 w-5 translate-x-1 rounded-full bg-white shadow" />
      </span>
    </label>
  );
}
