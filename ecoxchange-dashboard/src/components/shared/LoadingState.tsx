// Re-export the existing skeleton primitives under a "LoadingState" name so new
// pages have one obvious place to import loading UI from. Reuses the shimmer
// components already used across V1 — no new markup.
export {
  Shimmer,
  StatCardSkeleton,
  ProjectCardSkeleton,
  ChartSkeleton,
  CardSkeleton,
  TableSkeleton,
  MapSkeleton,
} from "../Skeleton.js";
