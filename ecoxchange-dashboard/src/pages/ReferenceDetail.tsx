import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { loadReferenceDetail } from "../data/reference.js";
import { ProductionChartLazy as ProductionChart } from "../components/ProductionChartLazy.js";
import { DataSourceAttribution } from "../compliance/components/DataSourceAttribution.js";
import { StatCard } from "../components/StatCard.js";
import { YieldTable } from "../components/YieldTable.js";
import { EiaComparisonStats } from "../components/reference/EiaComparisonStats.js";
import {
  CardSkeleton,
  ChartSkeleton,
  Shimmer,
  StatCardSkeleton,
  TableSkeleton,
} from "../components/Skeleton.js";
import { formatMonthLong } from "../utils/formatters.js";
import type { ProjectBundle } from "../utils/types.js";

export function ReferenceDetail() {
  const { id = "" } = useParams();
  const [bundle, setBundle] = useState<ProjectBundle | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    loadReferenceDetail(id).then((b) => {
      if (b) setBundle(b);
      else setNotFound(true);
    });
  }, [id]);

  if (notFound) {
    return (
      <div className="space-y-4">
        <Link
          to="/reference"
          className="text-medGreen hover:text-darkBg transition-colors duration-150"
        >
          ← Back to Reference Library
        </Link>
        <p className="text-textMuted">No reference plant with id {id}.</p>
      </div>
    );
  }

  if (!bundle) {
    return (
      <div className="space-y-6">
        <Shimmer className="h-5 w-48" />
        <Shimmer className="h-9 w-96 max-w-full" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
        <ChartSkeleton />
        <CardSkeleton lines={4} />
        <TableSkeleton />
      </div>
    );
  }

  const { project, verification_records: records, summary } = bundle;
  const latest = records[records.length - 1];

  return (
    <div className="space-y-8 animate-fade-in">
      <Link
        to="/reference"
        className="inline-flex items-center gap-1 text-medGreen hover:text-darkBg transition-colors duration-150"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Reference Library
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl text-darkBg">{project.name}</h1>
          <p className="text-textMuted mt-1">
            {project.location} · {project.capacity_kw.toLocaleString()} kW DC ·{" "}
            {project.tilt_deg}° tilt · commissioned{" "}
            {project.commissioning_date}
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-paleGreen/60 text-darkBg text-xs px-3 py-1 font-medium">
          USPVDB Reference · validated against EIA Form 923
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Annual Output"
          value={`${summary.annual_production_mwh.toLocaleString()} MWh`}
          sublabel={latest ? formatMonthLong(latest.period_start) : "—"}
        />
        <StatCard
          label="Capacity Factor"
          value={`${summary.capacity_factor_pct.toFixed(1)}%`}
        />
        <StatCard
          label="Verified Months"
          value={`${summary.months_verified} / ${records.length}`}
        />
      </div>

      <div className="bg-white rounded-lg border border-paleGreen/60 p-5">
        <h2 className="font-heading text-xl text-darkBg mb-3">
          Monthly Production · EIA Actual vs Engine Expected
        </h2>
        <ProductionChart records={records} />
        <DataSourceAttribution
          sources={[
            { name: "EIA Form 923", type: "public_data" },
            { name: "USPVDB", type: "public_data" },
            { name: "EcoXchange Verification Engine", type: "model" },
          ]}
          engineVersion="v2.0.0"
          isEstimate
        />
      </div>

      <EiaComparisonStats records={records} />

      <div>
        <h2 className="font-heading text-xl text-darkBg mb-3">
          Monthly Detail
        </h2>
        <YieldTable projectId={project.id} records={records} />
      </div>
    </div>
  );
}
