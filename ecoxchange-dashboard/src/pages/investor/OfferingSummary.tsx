import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, MapPin } from "lucide-react";
import { getOfferingBySlug } from "../../data/offerings.js";
import { Section } from "../../components/offering/Section.js";
import { OfferingHero } from "../../components/offering/OfferingHero.js";
import { StatStrip } from "../../components/offering/StatStrip.js";
import { DeveloperCard } from "../../components/offering/DeveloperCard.js";
import { VerificationSummary } from "../../components/offering/VerificationSummary.js";
import { FinancialGrid } from "../../components/offering/FinancialGrid.js";
import { DocumentList } from "../../components/offering/DocumentList.js";
import {
  RiskFactors,
  RiskFactorsHeader,
} from "../../components/offering/RiskFactors.js";
import { LegalDisclaimer } from "../../components/offering/LegalDisclaimer.js";
import { ProjectMap } from "../../components/offering/ProjectMap.js";
import { PhotoGallery } from "../../components/offering/PhotoGallery.js";
import { ErrorState } from "../../components/shared/ErrorState.js";
import { EmptyState } from "../../components/shared/EmptyState.js";
import { CardSkeleton } from "../../components/shared/LoadingState.js";
import type { OfferingSummary as OfferingSummaryType } from "../../types/offerings.js";

export function OfferingSummary() {
  const { slug = "" } = useParams();
  const [offering, setOffering] = useState<OfferingSummaryType | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "empty">(
    "loading",
  );

  const load = useCallback(() => {
    setStatus("loading");
    setOffering(null);
    getOfferingBySlug(slug)
      .then((res) => {
        if (!res) return setStatus("empty");
        setOffering(res);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, [slug]);

  useEffect(load, [load]);

  if (status === "loading") {
    return (
      <div className="space-y-6">
        <BackLink />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="space-y-6">
        <BackLink />
        <ErrorState onRetry={load} />
      </div>
    );
  }
  if (status === "empty" || !offering) {
    return (
      <div className="space-y-6">
        <BackLink />
        <EmptyState
          title="Offering not found"
          message="We couldn’t find this offering. It may have closed or been removed."
          cta={{ label: "Back to Marketplace", to: "/investor/marketplace" }}
        />
      </div>
    );
  }

  const { project } = offering;

  return (
    <div className="space-y-10">
      <BackLink />

      <OfferingHero offering={offering} />

      <Section id="overview" title="Project Overview">
        <p className="max-w-3xl leading-relaxed text-darkBg">
          {offering.description}
        </p>
        <div className="mt-5">
          <StatStrip offering={offering} />
        </div>
      </Section>

      <Section id="thesis" title="Investment Thesis">
        <p className="max-w-3xl leading-relaxed text-darkBg">
          {offering.investment_thesis}
        </p>
      </Section>

      <Section id="location" title="Location & Site">
        <ProjectMap
          latitude={project.latitude}
          longitude={project.longitude}
          label={offering.headline}
        />
        <p className="mt-3 flex items-center gap-2 text-sm text-textMuted">
          <MapPin className="h-4 w-4" />
          {project.latitude.toFixed(2)}, {project.longitude.toFixed(2)} ·{" "}
          {project.capacity_kw_dc / 1000} MW · {project.offtake_type.replace(/_/g, " ")}
        </p>
        <div className="mt-5">
          <PhotoGallery photos={offering.site_photos} />
        </div>
      </Section>

      <Section id="developer" title="Developer Profile">
        <DeveloperCard offering={offering} />
      </Section>

      <Section id="verification" title="Production Verification">
        <VerificationSummary offering={offering} />
      </Section>

      <Section id="financials" title="Financial Summary">
        <FinancialGrid offering={offering} />
      </Section>

      <Section id="documents" title="Documents">
        <DocumentList documents={offering.documents} />
      </Section>

      <Section id="risks" title={<RiskFactorsHeader />}>
        <RiskFactors risks={offering.risk_factors} />
      </Section>

      <Section id="legal" title="Legal Disclaimers">
        <LegalDisclaimer />
      </Section>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      to="/investor/marketplace"
      className="inline-flex items-center gap-1 text-sm font-medium text-medGreen hover:text-darkBg"
    >
      <ArrowLeft className="h-4 w-4" /> Back to Marketplace
    </Link>
  );
}
