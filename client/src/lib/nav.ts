export interface PublicNavLink {
  href: string;
  label: string;
  testId: string;
  external?: boolean;
}

export const PUBLIC_NAV_LINKS: readonly PublicNavLink[] = [
  { href: "/develop", label: "For Developers", testId: "link-developers" },
  { href: "/market", label: "Clean-Energy Buyers", testId: "link-energy-buyers" },
  { href: "/market#capital", label: "Capital Partners", testId: "link-capital-partners" },
  { href: "/verification", label: "Platform", testId: "link-platform" },
  { href: "/faq", label: "FAQ", testId: "link-faq" },
] as const;

export const REQUEST_ACCESS = {
  href: "/develop#submit",
  label: "Submit a Project →",
  testId: "link-submit-project",
} as const;
