import { ArrowRight } from "./icons";

export function trackEvent(name, detail = {}) {
  try {
    if (localStorage.getItem("ecoxchange-analytics") !== "granted") return;
    navigator.sendBeacon?.("/api/event", new Blob([JSON.stringify({ name, path: window.location.pathname, detail, timestamp: new Date().toISOString() })], { type: "application/json" }));
  } catch { /* Browsing still works when storage is unavailable. */ }
}
export function ButtonLink({ href, children, variant = "primary", onClick }) {
  return <a className={`button button--${variant}`} href={href} onClick={onClick}>{children}<ArrowRight aria-hidden="true" /></a>;
}

