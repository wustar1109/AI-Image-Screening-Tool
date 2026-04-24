import { HARD_REJECT_THRESHOLDS, STYLE_WEIGHTS } from '../config/screeningRules';
import type { CvMetrics, CvScoreBreakdown, StyleTemplate } from '../types/screening';

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

async function fileToImageBitmap(file: File): Promise<ImageBitmap> {
  return await createImageBitmap(file);
}

async function extractImageData(file: File): Promise<ImageData> {
  const bitmap = await fileToImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('无法创建 canvas 上下文');

  ctx.drawImage(bitmap, 0, 0);
  const imageData = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
  bitmap.close();
  return imageData;
}

export async function computeCvMetrics(file: File): Promise<CvMetrics> {
  const imageData = await extractImageData(file);
  const { data, width, height } = imageData;
  const totalPixels = width * height;

  let blackClip = 0;
  let whiteClip = 0;

  const grayLevels = new Uint8Array(totalPixels);
  const grayPresence = new Uint8Array(256);

  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);

    grayLevels[p] = gray;
    grayPresence[gray] = 1;

    if (gray <= 8) blackClip++;
    if (gray >= 247) whiteClip++;
  }

  let uniqueGrayLevels = 0;
  for (let i = 0; i < 256; i++) uniqueGrayLevels += grayPresence[i];
  const grayUtilization = uniqueGrayLevels / 256;

  const idx = (x: number, y: number) => y * width + x;

  let lapVarianceAccumulator = 0;
  let lapMean = 0;
  let validCount = 0;

  let lowDiffNeighbors = 0;
  let allNeighbors = 0;
  let edgePixels = 0;
  let microNoise = 0;
  let brokenEdges = 0;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const c = grayLevels[idx(x, y)];
      const l = grayLevels[idx(x - 1, y)];
      const r = grayLevels[idx(x + 1, y)];
      const t = grayLevels[idx(x, y - 1)];
      const b = grayLevels[idx(x, y + 1)];

      const lap = Math.abs(4 * c - l - r - t - b);
      lapMean += lap;
      lapVarianceAccumulator += lap * lap;
      validCount++;

      const gx = r - l;
      const gy = b - t;
      const grad = Math.sqrt(gx * gx + gy * gy);

      if (grad > 24) edgePixels++;
      if (grad > 4 && grad < 18) microNoise++;

      const diffs = [Math.abs(c - l), Math.abs(c - r), Math.abs(c - t), Math.abs(c - b)];
      allNeighbors += diffs.length;
      lowDiffNeighbors += diffs.filter((d) => d <= 1).length;

      const verySharpBreaks = diffs.filter((d) => d > 48).length;
      if (verySharpBreaks >= 3) brokenEdges++;
    }
  }

  const lapMeanNorm = validCount ? lapMean / validCount : 0;
  const lapVariance = validCount
    ? lapVarianceAccumulator / validCount - lapMeanNorm * lapMeanNorm
    : 0;

  const edgeClarity = clamp01(lapVariance / 1800);
  const plateauRatio = allNeighbors ? lowDiffNeighbors / allNeighbors : 0;
  const bandingScore = clamp01(
    (1 - Math.min(grayUtilization / 0.65, 1)) * 0.7 + plateauRatio * 0.3
  );

  const edgeRatio = validCount ? edgePixels / validCount : 0;
  const densityBalance = clamp01(1 - Math.abs(edgeRatio - 0.16) / 0.16);
  const cleanliness = clamp01(1 - microNoise / Math.max(validCount, 1) / 0.35);

  const brokenEdgeRatio = validCount ? brokenEdges / validCount : 0;
  const defectRisk = clamp01(
    brokenEdgeRatio * 2.6 +
      (1 - cleanliness) * 0.45 +
      Math.max(0, bandingScore - 0.35) * 0.45
  );

  return {
    width,
    height,
    blackClipRatio: blackClip / totalPixels,
    whiteClipRatio: whiteClip / totalPixels,
    grayUtilization,
    bandingScore,
    edgeClarity,
    densityBalance,
    cleanliness,
    defectRisk,
  };
}

export function evaluateHardReject(metrics: CvMetrics) {
  const reasons: string[] = [];

  if (Math.min(metrics.width, metrics.height) < HARD_REJECT_THRESHOLDS.minResolutionEdge) {
    reasons.push('resolution_too_small');
  }
  if (metrics.blackClipRatio > HARD_REJECT_THRESHOLDS.blackClipRatioMax) {
    reasons.push('excessive_black_clip');
  }
  if (metrics.whiteClipRatio > HARD_REJECT_THRESHOLDS.whiteClipRatioMax) {
    reasons.push('excessive_white_clip');
  }
  if (metrics.bandingScore > HARD_REJECT_THRESHOLDS.bandingScoreMax) {
    reasons.push('severe_banding');
  }
  if (metrics.defectRisk > HARD_REJECT_THRESHOLDS.defectRiskMax) {
    reasons.push('image_defect');
  }

  return {
    hardReject: reasons.length > 0,
    reasons,
  };
}

function templateThemeProxy(metrics: CvMetrics, template: StyleTemplate) {
  switch (template) {
    case '极简抽象':
      return clamp01(metrics.cleanliness * 0.45 + metrics.grayUtilization * 0.3 + (1 - metrics.densityBalance) * 0.25);
    case '丝绸流体':
      return clamp01(metrics.edgeClarity * 0.25 + metrics.densityBalance * 0.35 + (1 - metrics.bandingScore) * 0.4);
    case '几何':
      return clamp01(metrics.edgeClarity * 0.55 + metrics.cleanliness * 0.2 + metrics.densityBalance * 0.25);
    case '自然花卉':
      return clamp01(metrics.densityBalance * 0.35 + (1 - metrics.bandingScore) * 0.35 + metrics.cleanliness * 0.3);
    case '山川湖海':
      return clamp01(metrics.grayUtilization * 0.35 + (1 - metrics.bandingScore) * 0.4 + metrics.densityBalance * 0.25);
    default:
      return 0.5;
  }
}

export function scoreCvMetrics(
  metrics: CvMetrics,
  template: StyleTemplate
): CvScoreBreakdown {
  const weights = STYLE_WEIGHTS[template] || {
    grayQuality: 25,
    textureStructure: 25,
    designAesthetics: 25,
    manufacturabilityProxy: 15,
    themeMatchAndNovelty: 10,
  };

  const grayQualityBase = clamp01(
    (1 - metrics.blackClipRatio / 0.15) * 0.25 +
      (1 - metrics.whiteClipRatio / 0.12) * 0.25 +
      metrics.grayUtilization * 0.2 +
      (1 - metrics.bandingScore) * 0.3
  );

  const textureStructureBase = clamp01(
    metrics.edgeClarity * 0.55 + metrics.densityBalance * 0.45
  );

  const aestheticsBase = clamp01(
    metrics.cleanliness * 0.35 +
      (1 - metrics.bandingScore) * 0.35 +
      metrics.densityBalance * 0.3
  );

  const manufacturabilityBase = clamp01(
    metrics.cleanliness * 0.55 +
      (1 - metrics.defectRisk) * 0.25 +
      metrics.edgeClarity * 0.2
  );

  const themeNoveltyBase = templateThemeProxy(metrics, template);

  const grayQuality = Math.round(grayQualityBase * weights.grayQuality);
  const textureStructure = Math.round(textureStructureBase * weights.textureStructure);
  const designAesthetics = Math.round(aestheticsBase * weights.designAesthetics);
  const manufacturabilityProxy = Math.round(manufacturabilityBase * weights.manufacturabilityProxy);
  const themeMatchAndNovelty = Math.round(themeNoveltyBase * weights.themeMatchAndNovelty);

  const total =
    grayQuality +
    textureStructure +
    designAesthetics +
    manufacturabilityProxy +
    themeMatchAndNovelty;

  return {
    grayQuality,
    textureStructure,
    designAesthetics,
    manufacturabilityProxy,
    themeMatchAndNovelty,
    total,
  };
}
