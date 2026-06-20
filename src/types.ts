export interface ClientProfile {
  clientName: string;
  industry: string;
  location: string;
  yearsOfOp: string;
  dangerLevel?: string;
  priorSupport: string;
  coreConcerns: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface Source {
  name: string;
  link: string;
}

export interface ChartItem {
  name: string;
  value: number;
  benchmark?: number;
}

export interface StatusItem {
  field: string;
  status: string;
  risk: "SAFE" | "CAUTION" | "DANGER" | string;
  diagnosis: string;
}

export interface SwotData {
  strength: string[];
  weakness: string[];
  opportunity: string[];
  threat: string[];
  sources: Source[];
}

export interface SolutionItem {
  concern: string;
  diagnosis: {
    text: string;
    sources: Source[];
  };
  guidelines: {
    text: string;
    sources: Source[];
  };
  kpi: {
    text: string;
  };
}

export interface RoadmapItem {
  phase: string;
  duration: string;
  tasks: string[];
  links: Array<{ title: string; url: string }>;
}

export interface HeatmapCell {
  x: number;
  y: number;
  density: number; // e.g., 0 to 10
  label: string; // e.g., "북서측 배후오피스"
  competitorNames?: string[];
}

export interface CompetitorHeatmapData {
  gridSize: number;
  centerLocationName: string;
  gridCells: HeatmapCell[];
  summaryText: string;
}

export interface ConsultingReport {
  summary: {
    clientName: string;
    industry: string;
    location: string;
    yearsOfOp: string;
    dangerLevel: "LOW" | "MEDIUM" | "HIGH" | string;
  };
  commercialAnalysis: {
    text: string;
    sources: Source[];
    chartsData: ChartItem[];
  };
  competitorHeatmap?: CompetitorHeatmapData;
  statusTable: StatusItem[];
  swot: SwotData;
  solutions: SolutionItem[];
  roadmap: RoadmapItem[];
  markdownReport: string;
  keyKeywords?: string[];
}
