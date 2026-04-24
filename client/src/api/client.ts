import axios from 'axios';
import { useSettingsStore } from '../stores/settingsStore';

const getBaseURL = () => {
  // 开发环境使用配置的后端地址
  if (import.meta.env.DEV) {
    return useSettingsStore.getState().baseUrl;
  }
  // 生产环境使用相对路径
  return '';
};

const api = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
