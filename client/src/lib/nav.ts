// The public navigation, defined once.
//
// It used to be defined twice — an inline <nav> on the landing page and
// PUBLIC_NAV_LINKS in the shared Header — so the bar visibly changed when you
// moved from / to /method. Both now render this array.
//
// Order is the positioning: verification first, the securities application
// after it. `/verification` is the canonical path for the method page;
// `/method` still resolves for anyone holding an old link.

export interface PublicNavLink {
  href: string;
  label: string;
  testId: string;
  /** Leaves the SPA (opens the demo site). */
  external?: boolean;
}

export const PUBLIC_NAV_LINKS: readonly PublicNavLink[] = [
  { href: "/", label: "Home", testId: "link-home" },
  { href: "/verification", label: "Verification", testId: "link-verification" },
  {
    href: "https://demo.ecoxchange.net/benchmark",
    label: "Benchmark",
    testId: "link-benchmark",
    external: true,
  },
  { href: "/market", label: "Projects", testId: "link-projects" },
  { href: "/develop", label: "Developers", testId: "link-developers" },
  { href: "/faq", label: "FAQ", testId: "link-faq" },
  {
    href: "https://demo.ecoxchange.net/",
    label: "Live Demo",
    testId: "link-live-demo",
    external: true,
  },
] as const;

/** The call to action that closes the nav bar on every public page. */
export const REQUEST_ACCESS = {
  href: "/market#onboard",
  label: "Request Access →",
  testId: "link-request-access",
} as const;
