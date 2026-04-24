import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface TemplateConfig {
  id: string;
  name: string;
  description: string;
  isPredefined: boolean;
  autoCreated: boolean;
  createdAt: string;
}

const DEFAULT_TEMPLATES: TemplateConfig[] = [
  {
    id: 'template_jijian',
    name: '极简抽象',
    description: '留白明显、主体少、纯净克制、呼吸感',
    isPredefined: true,
    autoCreated: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'template_sichou',
    name: '丝绸流体',
    description: '曲线舒展、流动自然、飘逸、边缘柔顺',
    isPredefined: true,
    autoCreated: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'template_jihe',
    name: '几何',
    description: '几何切分明显、结构硬朗、线条秩序、工业科技感',
    isPredefined: true,
    autoCreated: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'template_huahui',
    name: '自然花卉',
    description: '花瓣、叶片、枝蔓等植物形态、有机装饰感',
    isPredefined: true,
    autoCreated: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'template_shanchuan',
    name: '山川湖海',
    description: '山体、水波、云雾、湖海、地貌自然景观',
    isPredefined: true,
    autoCreated: false,
    createdAt: new Date().toISOString(),
  },
];

interface TemplateStore {
  templates: TemplateConfig[];
  getTemplateByName: (name: string) => TemplateConfig | undefined;
  templateExists: (name: string) => boolean;
  addTemplate: (name: string, description?: string) => TemplateConfig | null;
  updateTemplate: (id: string, updates: Partial<Pick<TemplateConfig, 'name' | 'description'>>) => boolean;
  deleteTemplate: (id: string) => boolean;
  ensureTemplate: (name: string) => TemplateConfig;
  resetToDefaults: () => void;
}

function normalizeTemplateName(name: string): string {
  return name.trim();
}

export const useTemplateStore = create<TemplateStore>()(
  persist(
    (set, get) => ({
      templates: [...DEFAULT_TEMPLATES],

      getTemplateByName: (name) => {
        const n = normalizeTemplateName(name);
        return get().templates.find((t) => t.name === n);
      },

      templateExists: (name) => {
        return !!get().getTemplateByName(name);
      },

      addTemplate: (name, description = '') => {
        const n = normalizeTemplateName(name);
        if (!n || get().templateExists(n)) return null;
        const newTemplate: TemplateConfig = {
          id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          name: n,
          description: description || `${n}风格模板`,
          isPredefined: false,
          autoCreated: false,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ templates: [...state.templates, newTemplate] }));
        return newTemplate;
      },

      updateTemplate: (id, updates) => {
        const templates = get().templates;
        const idx = templates.findIndex((t) => t.id === id);
        if (idx === -1) return false;
        const existing = templates[idx];
        const newName = updates.name?.trim();
        if (newName && newName !== existing.name && get().templateExists(newName)) {
          return false; // name conflict
        }
        const updated = {
          ...existing,
          ...(newName ? { name: newName } : {}),
          ...(updates.description !== undefined ? { description: updates.description } : {}),
        };
        const newTemplates = [...templates];
        newTemplates[idx] = updated;
        set({ templates: newTemplates });
        return true;
      },

      deleteTemplate: (id) => {
        const templates = get().templates;
        const target = templates.find((t) => t.id === id);
        if (!target || target.isPredefined) return false;
        set({ templates: templates.filter((t) => t.id !== id) });
        return true;
      },

      ensureTemplate: (name) => {
        const existing = get().getTemplateByName(name);
        if (existing) return existing;
        const n = normalizeTemplateName(name);
        const newTemplate: TemplateConfig = {
          id: `template_auto_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          name: n,
          description: `自动识别的新模板：${n}`,
          isPredefined: false,
          autoCreated: true,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ templates: [...state.templates, newTemplate] }));
        return newTemplate;
      },

      resetToDefaults: () => {
        set({ templates: [...DEFAULT_TEMPLATES] });
      },
    }),
    {
      name: 'template-library',
    }
  )
);
