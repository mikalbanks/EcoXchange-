import type { ReactNode } from "react";

// Anchored content section with a consistent heading, used to assemble the
// long-scroll offering summary page.
export function Section({
  id,
  title,
  children,
}: {
  id?: string;
  title: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="mb-4 flex items-center gap-2 font-heading text-2xl text-darkBg">
        {title}
      </h2>
      {children}
    </section>
  );
}
