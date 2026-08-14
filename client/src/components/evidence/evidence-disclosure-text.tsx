import React from "react";
import type { EvidenceDisclosure } from "@shared/evidence-disclosure";

export function EvidenceDisclosureText({
  evidence,
  loading = false,
  descriptionTestId,
}: {
  evidence: EvidenceDisclosure;
  loading?: boolean;
  descriptionTestId?: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground">
        {loading ? "CHECKING EVIDENCE" : evidence.badge}
      </p>
      <h2 className="mt-1 text-lg font-semibold text-foreground">
        {loading ? "Loading source provenance" : evidence.title}
      </h2>
      <p
        className="mt-1 max-w-3xl text-base leading-relaxed text-muted-foreground"
        data-testid={descriptionTestId}
      >
        {loading
          ? "The page will label the source once provenance is available."
          : evidence.description}
      </p>
    </div>
  );
}
