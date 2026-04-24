import { create } from 'zustand';

interface GalleryStore {
  activeTemplate: string | 'all';
  searchQuery: string;
  setActiveTemplate: (template: string | 'all') => void;
  setSearchQuery: (query: string) => void;
}

export const useGalleryStore = create<GalleryStore>()((set) => ({
  activeTemplate: 'all',
  searchQuery: '',
  setActiveTemplate: (template) => set({ activeTemplate: template }),
  setSearchQuery: (query) => set({ searchQuery: query }),
}));
