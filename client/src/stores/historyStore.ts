import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { HybridJudgement, QwenTaskConfig } from '../types/screening';

export interface ScreeningRecord {
  id: string;
  date: string;
  name: string;
  files: string[];
  previews: string[]; // Blob URLs won't persist in localStorage
  results: Record<string, string>;
  structuredResults?: Record<string, HybridJudgement>;
  keepIndices: number[];
  qwenTasks?: QwenTaskConfig;
  isFavorite: boolean;
}

interface HistoryStore {
  records: ScreeningRecord[];
  searchQuery: string;
  addRecord: (
    record: Omit<ScreeningRecord, 'id' | 'date' | 'name' | 'isFavorite'>
  ) => string;
  getRecord: (id: string) => ScreeningRecord | undefined;
  updateRecord: (id: string, updates: Partial<Pick<ScreeningRecord, 'name' | 'isFavorite'>>) => void;
  deleteRecord: (id: string) => void;
  clearHistory: () => void;
  setSearchQuery: (query: string) => void;
}

export const useHistoryStore = create<HistoryStore>()(
  persist(
    (set, get) => ({
      records: [],
      searchQuery: '',

      addRecord: (record) => {
        const id = `screening_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const newRecord: ScreeningRecord = {
          ...record,
          id,
          name: `筛选项目 ${new Date().toLocaleDateString('zh-CN')}`,
          date: new Date().toISOString(),
          isFavorite: false,
        };
        set((state) => ({
          records: [newRecord, ...state.records],
        }));
        return id;
      },

      getRecord: (id) => {
        return get().records.find((r) => r.id === id);
      },

      updateRecord: (id, updates) => {
        set((state) => ({
          records: state.records.map((r) =>
            r.id === id ? { ...r, ...updates } : r
          ),
        }));
      },

      deleteRecord: (id) => {
        set((state) => ({
          records: state.records.filter((r) => r.id !== id),
        }));
      },

      clearHistory: () => {
        set({ records: [] });
      },

      setSearchQuery: (query) => {
        set({ searchQuery: query });
      },
    }),
    {
      name: 'screening-history',
    }
  )
);
