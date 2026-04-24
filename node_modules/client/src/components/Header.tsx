import { Search, Coins, WifiOff, Loader2, Zap } from 'lucide-react';
import { useSettingsStore } from '../stores/settingsStore';
import { useHistoryStore } from '../stores/historyStore';
import { useState, useEffect } from 'react';
import { detectModels } from '../services/apiService';

export function Header() {
  const { apiKey, modelName, baseUrl } = useSettingsStore();
  const { searchQuery, setSearchQuery } = useHistoryStore();
  const [apiStatus, setApiStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [points] = useState(0);

  useEffect(() => {
    const checkApiStatus = async () => {
      if (!apiKey) {
        setApiStatus('offline');
        return;
      }

      setApiStatus('checking');
      const result = await detectModels(baseUrl, apiKey, 5000);

      if (result.error) {
        setApiStatus('offline');
      } else {
        setApiStatus('online');
      }
    };

    checkApiStatus();
    const interval = setInterval(checkApiStatus, 30000);
    return () => clearInterval(interval);
  }, [apiKey, modelName, baseUrl]);

  return (
    <header className="h-16 bg-dark-800 border-b border-dark-700 px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Search */}
      <div className="flex-1 max-w-md">
        <div className="relative group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-accent-green transition-colors" />
          <input
            type="text"
            placeholder="搜索所有项目..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-dark-900 border border-dark-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-accent-green focus:bg-dark-800 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-300"
            >
              <span className="text-xs">清除</span>
            </button>
          )}
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Points */}
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-accent-yellow/5 border border-accent-yellow/10">
          <Coins className="w-4 h-4 text-accent-yellow" />
          <span className="font-semibold text-sm text-accent-yellow">{points}</span>
          <span className="text-xs text-gray-500">积分</span>
        </div>

        {/* API Status */}
        <div className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium border transition-colors ${
          apiStatus === 'online'
            ? 'bg-accent-green/5 border-accent-green/15 text-accent-green'
            : apiStatus === 'offline'
            ? 'bg-red-500/5 border-red-500/15 text-red-400'
            : 'bg-gray-500/5 border-gray-500/15 text-gray-400'
        }`}>
          {apiStatus === 'checking' ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : apiStatus === 'online' ? (
            <Zap className="w-3.5 h-3.5" />
          ) : (
            <WifiOff className="w-3.5 h-3.5" />
          )}
          <span>
            {apiStatus === 'online' ? 'AI 在线'
             : apiStatus === 'offline' ? 'AI 离线'
             : '检测中'}
          </span>
        </div>
      </div>
    </header>
  );
}
