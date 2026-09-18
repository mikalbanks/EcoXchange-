export interface PublicNavLink {
  href: string;
  label: string;
  testId: string;
  external?: boolean;
}

export const PUBLIC_NAV_LINKS: readonly PublicNavLink[] = [
  { href: "/market", label: "For Data Centers", testId: "link-data-centers" },
  { href: "/develop", label: "DER & Project Partners", testId: "link-der-partners" },
  { href: "/verification", label: "How It Works", testId: "link-platform" },
  { href: "/faq", label: "FAQ", testId: "link-faq" },
] as const;

export const REQUEST_ACCESS = {
  href: "/market#readiness",
  label: "Assess a Site →",
  testId: "link-assess-site",
} as const;
