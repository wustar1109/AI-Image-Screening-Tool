// API 服务管理模块
// 参考 last.py 的 API 调用模式

export interface ApiService {
  name: string;
  apiBase: string;
  apiKey: string;
}

export interface ApiServicesData {
  services: Record<string, ApiService>;
  currentService: string;
}

// 内置默认 API 服务商
export const DEFAULT_API_SERVICES: Record<string, ApiService> = {
  'OpenAI': {
    name: 'OpenAI',
    apiBase: 'https://api.openai.com/v1',
    apiKey: '',
  },
  'LM Studio': {
    name: 'LM Studio',
    apiBase: 'http://localhost:1234/v1',
    apiKey: 'lm-studio',
  },
  'Ollama': {
    name: 'Ollama',
    apiBase: 'http://localhost:11434/v1',
    apiKey: 'ollama',
  },
  '硅基流动 (SiliconFlow)': {
    name: '硅基流动 (SiliconFlow)',
    apiBase: 'https://api.siliconflow.cn/v1',
    apiKey: '',
  },
};

// 存储键名
const STORAGE_KEY = 'api_services_data';

// 加载 API 服务配置
export function loadApiServices(): ApiServicesData {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load API services:', e);
  }

  // 首次使用：services 为空，但提供一个默认当前服务
  return {
    services: {},
    currentService: '硅基流动 (SiliconFlow)',
  };
}

// 保存 API 服务配置
export function saveApiServices(data: ApiServicesData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save API services:', e);
  }
}

// 判断是否为视觉/多模态模型
export function isVisionModel(modelId: string): boolean {
  const lowerModel = modelId.toLowerCase();
  const visionKeywords = [
    'vision', 'vl', 'omni', 'image', 'qwen-vl', 'qwen2.5-vl', 'qwen-vl',
    'glm-vl', 'glm-4v', 'glm-5v', 'deepseek-vl', 'minimax-vl', 'kimi-vl',
    'moonshot-vl', 'qwen2.5-vl', 'qwen2-vl', 'qwen1.5-vl', 'baichuan-vl',
    'yi-vl', 'llava', 'llama-vision', 'internvl', 'pixtral', 'mistral-large',
    'anthropic-claude', 'gpt-4o', 'gpt-4v', 'gemini', 'claude-3', 'claude-4',
    'minimax-m2', 'm2.1', 'm2.5', 'glm-4.7', 'glm-5', 'kimi-k2', 'kimi-k2.5',
  ];

  return visionKeywords.some((keyword) => lowerModel.includes(keyword));
}

// 检测可用模型列表
export async function detectModels(
  apiBase: string,
  apiKey: string,
  timeout: number = 5000,
  filterVisionOnly: boolean = true
): Promise<{ models: string[]; allModels: string[]; error?: string }> {
  if (!apiBase || !apiKey) {
    return { models: [], allModels: [], error: '请填写 API 地址和密钥' };
  }

  try {
    const url = `${apiBase}/models`;
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${apiKey}`,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      return { models: [], allModels: [], error: `请求失败: ${response.status} ${errorText}` };
    }

    const data = await response.json();
    const allModels = (data.data || [])
      .map((m: { id?: string }) => m.id)
      .filter(Boolean) as string[];

    // 过滤视觉/多模态模型
    const visionModels = filterVisionOnly
      ? allModels.filter(isVisionModel)
      : allModels;

    return { models: visionModels, allModels };
  } catch (e: any) {
    if (e.name === 'AbortError') {
      return { models: [], allModels: [], error: '请求超时' };
    }
    return { models: [], allModels: [], error: `检测失败: ${e.message}` };
  }
}

// 调用 Chat Completions API
export async function callChatCompletion(
  apiBase: string,
  apiKey: string,
  model: string,
  messages: Array<{
    role: string;
    content: Array<{ type: string; text?: string; image_url?: { url: string; detail?: string } }>;
  }>,
  options: {
    maxTokens?: number;
    timeout?: number;
  } = {}
): Promise<{ content: string | null; error?: string }> {
  const { maxTokens = 1000, timeout = 120000 } = options;

  if (!apiBase || !apiKey) {
    return { content: null, error: '请填写 API 地址和密钥' };
  }

  try {
    const url = `${apiBase}/chat/completions`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    };

    const body = {
      model,
      messages,
      max_tokens: maxTokens,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      return { content: null, error: `API 错误: ${response.status} ${errorText}` };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || null;

    return { content };
  } catch (e: any) {
    if (e.name === 'AbortError') {
      return { content: null, error: '请求超时' };
    }
    return { content: null, error: `请求失败: ${e.message}` };
  }
}

// 文件转换为 Base64 Data URL
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // 确保格式为 data:mime/type;base64,xxx
      if (!result.startsWith('data:')) {
        const mimeType = file.type || 'image/jpeg';
        resolve(`data:${mimeType};base64,${result.split(',')[1]}`);
      } else {
        resolve(result);
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// 压缩图片后转为 Base64 Data URL（用于 QwenVL，减少体积和传输时间）
export async function fileToCompressedBase64(
  file: File,
  maxSide = 896,
  quality = 0.78
): Promise<string> {
  const bitmap = await createImageBitmap(file);

  let { width, height } = bitmap;
  const scale = Math.min(1, maxSide / Math.max(width, height));
  width = Math.round(width * scale);
  height = Math.round(height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法创建 canvas 上下文');

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return canvas.toDataURL('image/jpeg', quality);
}

// 获取文件的 MIME 类型
export function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    bmp: 'image/bmp',
  };
  return mimeTypes[ext || ''] || 'image/jpeg';
}

// 分析图片（调用 AI）
export async function analyzeImage(
  apiBase: string,
  apiKey: string,
  model: string,
  imageFile: File,
  prompt: string = '你是一位专业的图片质量评估专家。请分析这张图片，评估其质量、构图、清晰度、色彩等方面，并给出是否值得保留的建议。请用中文回复。',
  options: {
    maxTokens?: number;
    timeout?: number;
  } = {}
): Promise<{ result: string | null; error?: string }> {
  const { maxTokens = 500, timeout = 120000 } = options;

  try {
    const base64Image = await fileToBase64(imageFile);

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

        const apiResult = await callChatCompletion(apiBase, apiKey, model, messages, {
      maxTokens,
      timeout,
    });
    return { result: apiResult.content, error: apiResult.error };
  } catch (e: any) {
    return { result: null, error: `图片处理失败: ${e.message}` };
  }
}
