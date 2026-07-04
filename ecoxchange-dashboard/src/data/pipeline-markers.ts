// Pipeline & target-market markers for the Portfolio map (differentiation
// spec §1.2). One active project (Savannah, verified) plus target-state
// programs identified from DSIRE program analysis. Yields are modeled
// estimates and must carry disclosure marks wherever rendered.

export type MarkerStatus = "active" | "pipeline" | "target_market";

export interface ProjectMarker {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  capacityKw: number;
  status: MarkerStatus;
  program?: string;
  estimatedYield?: string;
  verificationStatus?: string;
  /** Internal route for active projects ("View Project →"). */
  projectPath?: string;
}

export const PIPELINE_MARKERS: ProjectMarker[] = [
  {
    id: "savannah-5mw",
    name: "Savannah Community Solar 5MW",
    latitude: 32.08,
    longitude: -81.09,
    capacityKw: 5000,
    status: "active",
    program: "GA Community Solar",
    estimatedYield: "~8.5%",
    verificationStatus: "VERIFIED",
    projectPath: "/investor/project/demo-savannah-5mw",
  },
  {
    id: "ny-pipeline-1",
    name: "New York VDER Target",
    latitude: 42.65,
    longitude: -73.75,
    capacityKw: 3000,
    status: "pipeline",
    program: "NY VDER (~9.8%)",
  },
  {
    id: "il-pipeline-1",
    name: "Illinois ABP Target",
    latitude: 41.88,
    longitude: -87.63,
    capacityKw: 4000,
    status: "pipeline",
    program: "IL ABP (~9.7%)",
  },
  {
    id: "ma-pipeline-1",
    name: "Massachusetts SMART Target",
    latitude: 42.36,
    longitude: -71.06,
    capacityKw: 2000,
    status: "pipeline",
    program: "MA SMART (~9.0%)",
  },
  {
    id: "az-target",
    name: "Arizona Commercial Target",
    latitude: 33.45,
    longitude: -112.07,
    capacityKw: 1000,
    status: "target_market",
  },
];
