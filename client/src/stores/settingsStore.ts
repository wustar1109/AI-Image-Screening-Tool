import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  loadApiServices,
  saveApiServices,
  DEFAULT_API_SERVICES,
  ApiService,
  ApiServicesData,
} from '../services/apiService';
import type { QwenTaskConfig } from '../types/screening';

interface SettingsState {
  // 当前激活的服务配置
  currentServiceName: string;
  apiKey: string;
  modelName: string;
  baseUrl: string;

  // 服务列表
  services: Record<string, ApiService>;

  // QwenVL 任务开关
  qwenTasks: QwenTaskConfig;

  // 服务管理方法
  setCurrentService: (name: string) => void;
  addService: (service: ApiService) => void;
  updateService: (name: string, service: Partial<ApiService>) => void;
  deleteService: (name: string) => void;
  setApiKey: (key: string) => void;
  setModelName: (name: string) => void;
  setBaseUrl: (url: string) => void;
  resetToDefaults: () => void;
  setQwenTask: (key: keyof QwenTaskConfig, value: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => {
      // 初始加载
      const initialData = loadApiServices();
      const currentService = initialData.services[initialData.currentService]
        || DEFAULT_API_SERVICES[initialData.currentService]
        || {
          name: 'OpenAI',
          apiBase: 'https://api.openai.com/v1',
          apiKey: '',
        };

      return {
        currentServiceName: initialData.currentService,
        apiKey: currentService.apiKey,
        modelName: 'deepseek-ai/DeepSeek-V3',
        baseUrl: currentService.apiBase,

        services: initialData.services,

        qwenTasks: {
          templateClassification: true,
          templateReview: true,
          multiScore: true,
          finalLabel: false,
          summaryReason: false,
        },

        setCurrentService: (name: string) => {
          const service = get().services[name] || DEFAULT_API_SERVICES[name];
          if (service) {
            set({
              currentServiceName: name,
              apiKey: service.apiKey,
              baseUrl: service.apiBase,
            });
            // 保存当前选择，但不自动将该服务加入 services（只有点击保存配置后才加入）
            const data: ApiServicesData = {
              services: get().services,
              currentService: name,
            };
            saveApiServices(data);
          }
        },

        addService: (service: ApiService) => {
          const services = { ...get().services, [service.name]: service };
          set({ services });
          const data: ApiServicesData = {
            services,
            currentService: get().currentServiceName,
          };
          saveApiServices(data);
        },

        updateService: (name: string, updates: Partial<ApiService>) => {
          const existing = get().services[name];
          if (existing) {
            const services = {
              ...get().services,
              [name]: { ...existing, ...updates },
            };
            set({ services });

            // 如果更新的是当前服务，同步更新当前配置
            if (name === get().currentServiceName) {
              set({
                apiKey: updates.apiKey ?? get().apiKey,
                baseUrl: updates.apiBase ?? get().baseUrl,
              });
            }

            const data: ApiServicesData = {
              services,
              currentService: get().currentServiceName,
            };
            saveApiServices(data);
          }
        },

        deleteService: (name: string) => {
          const services = { ...get().services };
          if (!services[name]) return;

          delete services[name];

          // 如果删除的是当前服务，切换到第一个已保存的服务，或回退到默认内置服务
          let newCurrentService = get().currentServiceName;
          let newApiKey = get().apiKey;
          let newBaseUrl = get().baseUrl;

          if (name === get().currentServiceName) {
            const savedNames = Object.keys(services);
            if (savedNames.length > 0) {
              newCurrentService = savedNames[0];
              newApiKey = services[newCurrentService].apiKey;
              newBaseUrl = services[newCurrentService].apiBase;
            } else {
              // 没有已保存的服务时，回退到默认内置服务
              newCurrentService = '硅基流动 (SiliconFlow)';
              newApiKey = DEFAULT_API_SERVICES[newCurrentService]?.apiKey ?? '';
              newBaseUrl = DEFAULT_API_SERVICES[newCurrentService]?.apiBase ?? 'https://api.siliconflow.cn/v1';
            }
          }

          set({
            services,
            currentServiceName: newCurrentService,
            apiKey: newApiKey,
            baseUrl: newBaseUrl,
          });

          const data: ApiServicesData = {
            services,
            currentService: newCurrentService,
          };
          saveApiServices(data);
        },

        setApiKey: (apiKey: string) => {
          set({ apiKey });
          // 同步更新当前服务
          const currentName = get().currentServiceName;
          const services = { ...get().services };
          if (!services[currentName]) {
            // 首次保存该服务：从默认配置创建
            const defaultService = DEFAULT_API_SERVICES[currentName];
            services[currentName] = {
              name: currentName,
              apiBase: defaultService?.apiBase ?? get().baseUrl,
              apiKey,
            };
          } else {
            services[currentName] = { ...services[currentName], apiKey };
          }
          set({ services });
          const data: ApiServicesData = {
            services,
            currentService: currentName,
          };
          saveApiServices(data);
        },

        setModelName: (modelName: string) => set({ modelName }),

        setBaseUrl: (baseUrl: string) => {
          set({ baseUrl });
          // 同步更新当前服务
          const currentName = get().currentServiceName;
          const services = { ...get().services };
          if (!services[currentName]) {
            // 首次保存该服务：从默认配置创建
            const defaultService = DEFAULT_API_SERVICES[currentName];
            services[currentName] = {
              name: currentName,
              apiBase: baseUrl,
              apiKey: defaultService?.apiKey ?? get().apiKey,
            };
          } else {
            services[currentName] = { ...services[currentName], apiBase: baseUrl };
          }
          set({ services });
          const data: ApiServicesData = {
            services,
            currentService: currentName,
          };
          saveApiServices(data);
        },

        setQwenTask: (key, value) =>
          set((state) => ({
            qwenTasks: {
              ...state.qwenTasks,
              [key]: value,
            },
          })),

        resetToDefaults: () => {
          const defaultData = {
            services: {},
            currentService: '硅基流动 (SiliconFlow)',
          };
          saveApiServices(defaultData);
          set({
            services: defaultData.services,
            currentServiceName: defaultData.currentService,
            apiKey: '',
            modelName: 'deepseek-ai/DeepSeek-V3',
            baseUrl: 'https://api.siliconflow.cn/v1',
            qwenTasks: {
              templateClassification: true,
              templateReview: true,
              multiScore: true,
              finalLabel: false,
              summaryReason: true,
            },
          });
        },
      };
    },
    {
      name: 'settings-storage',
    }
  )
);
