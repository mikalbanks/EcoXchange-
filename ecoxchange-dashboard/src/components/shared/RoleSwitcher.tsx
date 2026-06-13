import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.js";
import type { Role } from "../../context/AuthContext.js";

interface Props {
  // Where to send the user when they switch role. Defaults route investors to
  // the portfolio and developers to the onboarding flow (the only developer
  // surface shipped so far).
  compact?: boolean;
}

const ROLE_DEST: Record<Role, string> = {
  investor: "/investor",
  developer: "/onboard",
};

const ROLE_LABEL: Record<Role, string> = {
  investor: "Investor",
  developer: "Developer",
};

export function RoleSwitcher({ compact = false }: Props) {
  const { role, setRole } = useAuth();
  const navigate = useNavigate();

  const choose = (next: Role) => {
    setRole(next);
    navigate(ROLE_DEST[next]);
  };

  return (
    <div className="inline-flex rounded-md border border-white/20 p-0.5">
      {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => choose(r)}
          className={`rounded px-3 py-1 font-medium transition-colors duration-150 ${
            compact ? "text-xs" : "text-sm"
          } ${
            role === r
              ? "bg-accentBrt text-darkBg"
              : "text-paleGreen hover:text-white"
          }`}
        >
          {ROLE_LABEL[r]}
        </button>
      ))}
    </div>
  );
}
