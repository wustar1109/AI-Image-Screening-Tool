import { mapScoreToLabel } from '../config/screeningRules';
import type {
  HybridJudgement,
  StyleTemplate,
  QwenTaskConfig,
} from '../types/screening';
import { computeCvMetrics, scoreCvMetrics } from '../utils/cvMetrics';
import { fileToCompressedBase64 } from './apiService';
import { evaluateTextureWithQwen, qwenSemanticScoreTo100 } from './qwenTextureJudge';
import { useTemplateStore } from '../stores/templateStore';

interface AnalyzeTextureArgs {
  apiBase: string;
  apiKey: string;
  model: string;
  imageFile: File;
  qwenTasks: QwenTaskConfig;
  manualTemplate?: StyleTemplate;
}

const DEFAULT_TEMPLATE: StyleTemplate = '极简抽象';

function hasAnyReviewTask(tasks: QwenTaskConfig) {
  return (
    tasks.templateClassification ||
    tasks.templateReview ||
    tasks.multiScore ||
    tasks.finalLabel ||
    tasks.summaryReason
  );
}

export async function analyzeTextureDesign({
  apiBase,
  apiKey,
  model,
  imageFile,
  qwenTasks,
  manualTemplate,
}: AnalyzeTextureArgs): Promise<HybridJudgement> {
  // Step 0：并行执行 CV 指标计算 和 图片压缩（压缩后的图用于 Qwen API 上传）
  const needQwen = hasAnyReviewTask(qwenTasks);
  const [cvMetrics, compressedBase64] = await Promise.all([
    computeCvMetrics(imageFile),
    needQwen ? fileToCompressedBase64(imageFile, 896, 0.78) : Promise.resolve(''),
  ]);

  // Step 1：Qwen 统一调用（模板分类 + 多维评分 + 审稿 + 标签 + 原因）
  let selectedTemplate: StyleTemplate = manualTemplate || DEFAULT_TEMPLATE;
  let templateClassification;
  let qwen: any = undefined;
  let qwenScore = 0;
  let manualReviewRequired = false;
  const flags: string[] = [];

  if (needQwen) {
    try {
      const templateStore = useTemplateStore.getState();
      const availableTemplates = templateStore.templates.map((t) => ({
        name: t.name,
        description: t.description,
      }));

      const { qwenResult, templateClassification: tc } = await evaluateTextureWithQwen({
        apiBase,
        apiKey,
        model,
        base64Image: compressedBase64,
        styleTemplate: selectedTemplate,
        tasks: qwenTasks,
        availableTemplates,
      });

      qwen = qwenResult;

      if (qwenTasks.templateClassification && tc) {
        templateClassification = tc;
        // 确保模板存在于模板库中，不存在则自动创建
        const ensured = templateStore.ensureTemplate(tc.predictedTemplate);
        selectedTemplate = ensured.name;
      }

      if (qwenTasks.multiScore) {
        qwenScore = qwenSemanticScoreTo100(qwen);
      }

      if (
        qwenTasks.templateReview &&
        qwen?.decisionFlags &&
        (qwen.decisionFlags.aiArtifactVisible || qwen.decisionFlags.structureCollapse)
      ) {
        manualReviewRequired = true;
        flags.push('qwen_review_warning');
      }
    } catch {
      manualReviewRequired = true;
      flags.push('qwen_unavailable');
    }
  }

  if (!templateClassification) {
    templateClassification = {
      predictedTemplate: selectedTemplate,
      templateConfidence: manualTemplate ? 1 : 0.5,
      candidateTemplates: [{ template: selectedTemplate, score: manualTemplate ? 1 : 0.5 }],
      reasons: manualTemplate ? ['用户手动指定模板'] : ['未启用 Qwen，使用默认模板'],
    };
  }


  // Step 2：本地 CV 分（使用最终选定的模板）
  const cvScore = scoreCvMetrics(cvMetrics, selectedTemplate);

  // Step 3：融合总分
  const finalScore =
    qwenTasks.multiScore && qwenScore > 0
      ? Math.round(cvScore.total * 0.6 + qwenScore * 0.4)
      : cvScore.total;

  // Step 4：最终标签
  const finalLabel =
    qwenTasks.finalLabel && qwen?.recommendedLabel
      ? qwen.recommendedLabel
      : mapScoreToLabel(finalScore);

  const hasScoringTask =
    qwenTasks.multiScore || qwenTasks.templateReview || qwenTasks.finalLabel;
  // 纯模板分类模式下不做淘汰，所有图片默认保留
  const keep = hasScoringTask
    ? finalLabel === 'A_终稿候选' || finalLabel === 'B_优选保留'
    : true;

  // Step 5：总结（只显示已开启任务对应的信息）
  const summaryParts: string[] = [];
  if (qwenTasks.templateClassification || manualTemplate) {
    summaryParts.push(`模板：${selectedTemplate}`);
  }
  if (hasScoringTask) {
    summaryParts.push(`总分：${finalScore}`);
    summaryParts.push(`标签：${finalLabel}`);
  }
  if (summaryParts.length === 0) {
    summaryParts.push(`模板：${selectedTemplate}`);
  }
  const summary =
    qwenTasks.summaryReason && qwen?.summary
      ? qwen.summary
      : summaryParts.join('｜');

  const confidence = Number(
    Math.max(
      0.45,
      Math.min(
        0.98,
        0.55 +
          (templateClassification?.templateConfidence || 0.5) * 0.15 +
          (qwenTasks.multiScore && qwenScore > 0 ? 0.15 : 0) +
          Math.min(finalScore / 200, 0.2)
      )
    ).toFixed(2)
  );

  return {
    fileName: imageFile.name,
    styleTemplate: selectedTemplate,
    templateClassification,
    cvMetrics,
    cvScore,
    qwen,
    qwenScore,
    finalScore,
    finalLabel,
    keep,
    manualReviewRequired,
    confidence,
    summary,
    flags,
  };
}
