import api from './client';

export interface Project {
  id: string;
  name: string;
  status: string;
  totalImages: number;
  processedCount: number;
  createdAt: string;
}

export interface Image {
  id: string;
  filename: string;
  originalName: string;
  path: string;
  score: number | null;
  category: string | null;
  aiResult: any;
}

export const projectApi = {
  list: () => api.get<Project[]>('/projects'),
  get: (id: string) => api.get<Project>(`/projects/${id}`),
  create: (name: string) => api.post<Project>('/projects', { name }),
  delete: (id: string) => api.delete(`/projects/${id}`),
  getImages: (id: string) => api.get<Image[]>(`/projects/${id}/images`),
};

export const uploadApi = {
  upload: (projectId: string, files: File[]) => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('images', file);
    });
    formData.append('projectId', projectId);
    return api.post<Image[]>('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export const screeningApi = {
  start: (projectId: string) => api.post(`/screening/${projectId}/start`),
  status: (projectId: string) => api.get(`/screening/${projectId}/status`),
};
