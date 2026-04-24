export type StyleTemplate = string;

export type FinalLabel =
  | 'hard_reject'
  | 'A_终稿候选'
  | 'B_优选保留'
  | 'C_待优化'
  | 'D_备选观察'
  | 'E_淘汰';

export interface CvMetrics {
  width: number;
  height: number;
  blackClipRatio: number;
  whiteClipRatio: number;
  grayUtilization: number;
  bandingScore: number;
  edgeClarity: number;
  densityBalance: number;
  cleanliness: number;
  defectRisk: number;
}

export interface CvScoreBreakdown {
  grayQuality: number;
  textureStructure: number;
  designAesthetics: number;
  manufacturabilityProxy: number;
  themeMatchAndNovelty: number;
  total: number;
}

export interface IssueRegion {
  label: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  severity: 'low' | 'medium' | 'high';
}

export interface QwenSemanticResult {
  styleTemplate: StyleTemplate;
  semanticScores: {
    structureOrganization: number;
    compositionFocus: number;
    rhythmAndFlow: number;
    themeMatch: number;
    manufacturabilityProxy: number;
    artifactRisk: number;
  };
  decisionFlags: {
    structureCollapse: boolean;
    aiArtifactVisible: boolean;
    focusUnclear: boolean;
    surfaceDirtyFeel: boolean;
    overcrowded: boolean;
  };
  issueRegions: IssueRegion[];
  summary: string;
  reasons: string[];
  recommendedLabel: Exclude<FinalLabel, 'hard_reject'>;
  raw?: string;
}

export interface TemplateClassificationInfo {
  predictedTemplate: StyleTemplate;
  templateConfidence: number;
  candidateTemplates: {
    template: StyleTemplate;
    score: number;
  }[];
  reasons: string[];
}

export interface QwenTaskConfig {
  templateClassification: boolean;
  templateReview: boolean;
  multiScore: boolean;
  finalLabel: boolean;
  summaryReason: boolean;
}

export interface HybridJudgement {
  fileName: string;
  styleTemplate: StyleTemplate;
  templateClassification?: TemplateClassificationInfo;
  cvMetrics: CvMetrics;
  cvScore: CvScoreBreakdown;
  qwen?: QwenSemanticResult;
  qwenScore: number;
  finalScore: number;
  finalLabel: FinalLabel;
  keep: boolean;
  manualReviewRequired: boolean;
  confidence: number;
  summary: string;
  flags: string[];
}
