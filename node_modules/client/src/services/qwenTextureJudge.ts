import { callChatCompletion } from './apiService';
import type {
  QwenSemanticResult,
  StyleTemplate,
  QwenTaskConfig,
  TemplateClassificationInfo,
} from '../types/screening';

function safeParseJson(raw: string): any {
  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();
  return JSON.parse(cleaned);
}

export interface TemplatePromptItem {
  name: string;
  description: string;
}

function buildUnifiedPrompt(
  currentTemplate: StyleTemplate,
  tasks: QwenTaskConfig,
  availableTemplates?: TemplatePromptItem[]
) {
  const parts: string[] = [
    `你是"AI灰度纹理设计图分析器"，只能输出 JSON。`,
  ];

  if (tasks.templateClassification) {
    const templateList =
      availableTemplates && availableTemplates.length > 0
        ? availableTemplates
        : [
            { name: '极简抽象', description: '留白明显、主体少、纯净克制、呼吸感' },
            { name: '丝绸流体', description: '曲线舒展、流动自然、飘逸、边缘柔顺' },
            { name: '几何', description: '几何切分明显、结构硬朗、线条秩序、工业科技感' },
            { name: '自然花卉', description: '花瓣、叶片、枝蔓等植物形态、有机装饰感' },
            { name: '山川湖海', description: '山体、水波、云雾、湖海、地貌自然景观' },
          ];

    const templateLines = templateList
      .map((t, i) => `${i + 1}. ${t.name} - ${t.description}`)
      .join('\n');

    parts.push(`
请判断这张图属于以下哪个模板：
${templateLines}

如果图片明显不属于以上任何模板，你可以返回一个全新的模板名称（不超过10个字），系统会自动为你创建该模板。

返回 predictedTemplate、templateConfidence(0~1)、candidateTemplates(按分数排序)、reasons(2~4条)。`);
  }

  parts.push(`当前分析模板：${currentTemplate}`);

  if (tasks.multiScore) {
    parts.push(`
请输出以下分数，范围 0-10：
- structureOrganization：结构组织感
- compositionFocus：构图焦点
- rhythmAndFlow：节奏与流向
- themeMatch：与当前模板匹配度
- manufacturabilityProxy：工艺可转译性
- artifactRisk：视觉伪影/不自然感风险，越高越差`);
  }

  if (tasks.templateReview) {
    parts.push(`
请输出以下布尔标记：
- structureCollapse
- aiArtifactVisible
- focusUnclear
- surfaceDirtyFeel
- overcrowded

若发现明显问题区域，返回 issueRegions，坐标使用 0~1000 归一化整数。`);
  }

  if (tasks.finalLabel) {
    parts.push(`
请输出 recommendedLabel，只能是：
- A_终稿候选
- B_优选保留
- C_待优化
- D_备选观察
- E_淘汰`);
  }

  if (tasks.summaryReason) {
    parts.push(`
请输出：
- summary：一句话总结
- reasons：2~4 条简洁原因`);
  }

  parts.push(`
未被请求的字段请返回 null 或空数组。
输出格式：
{
  ${tasks.templateClassification ? '"predictedTemplate": "极简抽象",\n  "templateConfidence": 0.86,\n  "candidateTemplates": [\n    { "template": "极简抽象", "score": 0.86 },\n    { "template": "丝绸流体", "score": 0.21 }\n  ],\n  "reasons": ["原因1"],' : ''}
  "semanticScores": ${tasks.multiScore ? `{
    "structureOrganization": 0,
    "compositionFocus": 0,
    "rhythmAndFlow": 0,
    "themeMatch": 0,
    "manufacturabilityProxy": 0,
    "artifactRisk": 0
  }` : 'null'},
  "decisionFlags": ${tasks.templateReview ? `{
    "structureCollapse": false,
    "aiArtifactVisible": false,
    "focusUnclear": false,
    "surfaceDirtyFeel": false,
    "overcrowded": false
  }` : 'null'},
  "issueRegions": [],
  "summary": ${tasks.summaryReason ? '""' : 'null'},
  "reasons": [],
  "recommendedLabel": ${tasks.finalLabel ? '"B_优选保留"' : 'null'}
}`);

  return parts.join('\n');
}

interface QwenJudgeArgs {
  apiBase: string;
  apiKey: string;
  model: string;
  base64Image: string;
  styleTemplate: StyleTemplate;
  tasks: QwenTaskConfig;
  availableTemplates?: TemplatePromptItem[];
}

export async function evaluateTextureWithQwen({
  apiBase,
  apiKey,
  model,
  base64Image,
  styleTemplate,
  tasks,
  availableTemplates,
}: QwenJudgeArgs): Promise<{
  qwenResult: Partial<QwenSemanticResult> & { raw?: string };
  templateClassification?: TemplateClassificationInfo;
}> {
  const prompt = buildUnifiedPrompt(styleTemplate, tasks, availableTemplates);

  const messages = [
    {
      role: 'user',
      content: [
        { type: 'text' as const, text: prompt },
        {
          type: 'image_url' as const,
          image_url: { url: base64Image, detail: 'low' as const },
        },
      ],
    },
  ];

  const res = await callChatCompletion(apiBase, apiKey, model, messages, {
    maxTokens: 1000,
    timeout: 120000,
  });

  if (res.error || !res.content) {
    throw new Error(res.error || 'Qwen 评审失败');
  }

  const parsed = safeParseJson(res.content);

  const qwenResult: Partial<QwenSemanticResult> & { raw?: string } = {
    styleTemplate: parsed.styleTemplate,
    semanticScores: parsed.semanticScores || null,
    decisionFlags: parsed.decisionFlags || null,
    issueRegions: parsed.issueRegions || [],
    summary: parsed.summary || '',
    reasons: parsed.reasons || [],
    recommendedLabel: parsed.recommendedLabel || null,
    raw: res.content,
  };

  let templateClassification: TemplateClassificationInfo | undefined;
  if (tasks.templateClassification) {
    templateClassification = {
      predictedTemplate: parsed.predictedTemplate,
      templateConfidence: parsed.templateConfidence ?? 0.5,
      candidateTemplates: parsed.candidateTemplates || [],
      reasons: parsed.reasons || [],
    };
  }

  return { qwenResult, templateClassification };
}

export function qwenSemanticScoreTo100(qwen?: Partial<QwenSemanticResult> | null): number {
  if (!qwen?.semanticScores) return 0;
  const s = qwen.semanticScores;
  return Math.round(
    (s.structureOrganization * 0.25 +
      s.compositionFocus * 0.15 +
      s.rhythmAndFlow * 0.2 +
      s.themeMatch * 0.2 +
      s.manufacturabilityProxy * 0.1 +
      (10 - s.artifactRisk) * 0.1) * 10
  );
}
