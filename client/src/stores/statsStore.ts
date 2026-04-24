import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Stats {
  totalProcessed: number;
  totalDiscarded: number;
  totalTimeSaved: number;
  totalSelected: number;
}

interface StatsState {
  stats: Stats;
  isLoading: boolean;
  fetchStats: () => void;
  updateStats: (processed: number, selected: number) => void;
  resetStats: () => void;
}

const defaultStats: Stats = {
  totalProcessed: 0,
  totalDiscarded: 0,
  totalTimeSaved: 0,
  totalSelected: 0,
};

export const useStatsStore = create<StatsState>()(
  persist(
    (set) => ({
      stats: defaultStats,
      isLoading: false,

      fetchStats: () => {
        // Stats are already loaded from localStorage via persist middleware
        set({ isLoading: false });
      },

      updateStats: (processed: number, selected: number) => {
        set((state) => ({
          stats: {
            totalProcessed: state.stats.totalProcessed + processed,
            totalDiscarded: state.stats.totalDiscarded + (processed - selected),
            totalTimeSaved: state.stats.totalTimeSaved + Math.round(processed * 5),
            totalSelected: state.stats.totalSelected + selected,
          },
        }));
      },

      resetStats: () => {
        set({ stats: defaultStats });
      },
    }),
    {
      name: 'screening-stats',
    }
  )
);
