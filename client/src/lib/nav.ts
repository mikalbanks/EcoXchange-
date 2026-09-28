export interface PublicNavLink { href: string; label: string; testId: string; external?: boolean; }
export const PUBLIC_NAV_LINKS: readonly PublicNavLink[] = [
  { href: "/#solution", label: "Solution", testId: "link-solution" },
  { href: "/#how-it-works", label: "How It Works", testId: "link-how-it-works" },
  { href: "/#partners", label: "Partners", testId: "link-partners" },
  { href: "/der-network", label: "DER Network", testId: "link-der-network" },
  { href: "/faq", label: "FAQ", testId: "link-faq" },
] as const;
export const REQUEST_ACCESS = { href: "mailto:contact@ecoxchange.net?subject=Data-center%20power%20gap", label: "Discuss a Power Gap →", testId: "link-discuss-power-gap" } as const;
