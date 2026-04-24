import api from './client';

export interface Stats {
  totalProcessed: number;
  totalDiscarded: number;
  totalTimeSaved: number;
  totalSelected: number;
}

export const statsApi = {
  get: () => api.get<Stats>('/stats'),
};
