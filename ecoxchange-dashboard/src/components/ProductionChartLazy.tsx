import { Suspense, lazy } from "react";
import type { ComponentProps } from "react";
import { LazyMount } from "./shared/LazyMount.js";
import { ChartSkeleton } from "./shared/LoadingState.js";

const ProductionChart = lazy(() =>
  import("./ProductionChart.js").then((m) => ({ default: m.ProductionChart })),
);

/**
 * Drop-in replacement for ProductionChart that defers loading the Recharts
 * chunk until the chart area approaches the viewport, showing the existing
 * ChartSkeleton meanwhile (mobile performance budget: don't hydrate charts
 * that are below the fold).
 */
export function ProductionChartLazy(
  props: ComponentProps<typeof ProductionChart>,
) {
  return (
    <LazyMount placeholder={<ChartSkeleton />}>
      <Suspense fallback={<ChartSkeleton />}>
        <ProductionChart {...props} />
      </Suspense>
    </LazyMount>
  );
}
