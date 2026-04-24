import type { StyleTemplate } from './screening';

export interface TemplateCandidate {
  template: StyleTemplate;
  score: number;
}

export interface TemplateClassificationResult {
  predictedTemplate: StyleTemplate;
  templateConfidence: number;
  candidateTemplates: TemplateCandidate[];
  reasons: string[];
  raw?: string;
}
