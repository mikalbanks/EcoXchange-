/**
 * Core brand element (Spec 03 §6.3): olive § section tag in IBM Plex Mono
 * uppercase. Marks the start of every major page section.
 */
export function SectionTag({ children }: { children: string }) {
  return (
    <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.08em] text-olive">
      § {children}
    </p>
  );
}
