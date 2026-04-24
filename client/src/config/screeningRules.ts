import type { FinalLabel } from '../types/screening';

export const HARD_REJECT_THRESHOLDS = {
  minResolutionEdge: 768,
  blackClipRatioMax: 0.15,
  whiteClipRatioMax: 0.12,
  bandingScoreMax: 0.65,
  defectRiskMax: 0.72,
};

export const STYLE_WEIGHTS: Record<
  string,
  {
    grayQuality: number;
    textureStructure: number;
    designAesthetics: number;
    manufacturabilityProxy: number;
    themeMatchAndNovelty: number;
  }
> = {
  极简抽象: {
    grayQuality: 30,
    textureStructure: 18,
    designAesthetics: 27,
    manufacturabilityProxy: 15,
    themeMatchAndNovelty: 10,
  },
  丝绸流体: {
    grayQuality: 26,
    textureStructure: 26,
    designAesthetics: 26,
    manufacturabilityProxy: 10,
    themeMatchAndNovelty: 12,
  },
  几何: {
    grayQuality: 18,
    textureStructure: 34,
    designAesthetics: 18,
    manufacturabilityProxy: 20,
    themeMatchAndNovelty: 10,
  },
  自然花卉: {
    grayQuality: 22,
    textureStructure: 24,
    designAesthetics: 24,
    manufacturabilityProxy: 12,
    themeMatchAndNovelty: 18,
  },
  山川湖海: {
    grayQuality: 24,
    textureStructure: 22,
    designAesthetics: 24,
    manufacturabilityProxy: 10,
    themeMatchAndNovelty: 20,
  },
};

export const FINAL_LABEL_THRESHOLDS: Array<{ min: number; label: FinalLabel }> = [
  { min: 90, label: 'A_终稿候选' },
  { min: 80, label: 'B_优选保留' },
  { min: 70, label: 'C_待优化' },
  { min: 60, label: 'D_备选观察' },
  { min: 0, label: 'E_淘汰' },
];

export function mapScoreToLabel(score: number): Exclude<FinalLabel, 'hard_reject'> {
  return FINAL_LABEL_THRESHOLDS.find((item) => score >= item.min)!
    .label as Exclude<FinalLabel, 'hard_reject'>;
}
