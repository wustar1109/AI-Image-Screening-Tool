import { useState, useEffect } from 'react';
import { Wifi, Loader2, CheckCircle, XCircle, Key, Bot, Server, Plus, Trash2, Edit2, RefreshCw, ExternalLink } from 'lucide-react';
import { useSettingsStore } from '../stores/settingsStore';
import { detectModels, DEFAULT_API_SERVICES } from '../services/apiService';

export function SettingsPage() {
  const {
    currentServiceName,
    services,
    apiKey,
    modelName,
    baseUrl,
    setCurrentService,
    addService,
    updateService,
    deleteService,
    setApiKey,
    setModelName,
    setBaseUrl,
    resetToDefaults,
  } = useSettingsStore();

  const [activeTab, setActiveTab] = useState('api');
  const [apiStatus, setApiStatus] = useState<'idle' | 'checking' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [detectedModels, setDetectedModels] = useState<string[]>([]);
  const [allModels, setAllModels] = useState<string[]>([]);
  const [showAllModels, setShowAllModels] = useState(false);
  const [isDetectingModels, setIsDetectingModels] = useState(false);

  // 编辑服务相关状态
  const [editingService, setEditingService] = useState<string | null>(null);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceBaseUrl, setNewServiceBaseUrl] = useState('');
  const [newServiceApiKey, setNewServiceApiKey] = useState('');
  const [isAddingService, setIsAddingService] = useState(false);

  const [localApiKey, setLocalApiKey] = useState(apiKey);
  const [localModelName, setLocalModelName] = useState(modelName);
  const [localBaseUrl, setLocalBaseUrl] = useState(baseUrl);

  // 同步本地状态
  useEffect(() => {
    setLocalApiKey(apiKey);
    setLocalModelName(modelName);
    setLocalBaseUrl(baseUrl);
  }, [apiKey, modelName, baseUrl]);

  const checkApiConnection = async () => {
    if (!localApiKey) {
      setErrorMessage('请输入 API Key');
      setApiStatus('error');
      return;
    }

    setApiStatus('checking');
    setErrorMessage('');

    try {
      const result = await detectModels(localBaseUrl, localApiKey, 10000);

      if (result.error) {
        setApiStatus('error');
        setErrorMessage(result.error);
      } else {
        // 保存配置
        setApiKey(localApiKey);
        setModelName(localModelName);
        setBaseUrl(localBaseUrl);
        setApiStatus('success');

        // 仅当用户未选择模型时，自动选择第一个
        if (!localModelName && result.models.length > 0) {
          setModelName(result.models[0]);
          setLocalModelName(result.models[0]);
        }
      }
    } catch (err: any) {
      setApiStatus('error');
      setErrorMessage(err.message || '连接失败，请检查配置');
    }
  };

  const handleDetectModels = async () => {
    if (!localApiKey) {
      setErrorMessage('请先输入 API Key');
      return;
    }

    setIsDetectingModels(true);
    setErrorMessage('');

    const result = await detectModels(localBaseUrl, localApiKey, 10000);

    setIsDetectingModels(false);

    if (result.error) {
      setErrorMessage(result.error);
    } else {
      setDetectedModels(result.models);
      setAllModels(result.allModels);
      if (result.models.length > 0) {
        setLocalModelName(result.models[0]);
        setModelName(result.models[0]);
      }
    }
  };

  const handleServiceSelect = (name: string) => {
    setCurrentService(name);
    setApiStatus('idle');
    setErrorMessage('');
    setDetectedModels([]);
    setAllModels([]);
    setShowAllModels(false);
  };

  const handleSaveService = () => {
    if (!newServiceName.trim()) {
      setErrorMessage('服务名称不能为空');
      return;
    }

    if (editingService) {
      // 编辑现有服务
      updateService(editingService, {
        name: newServiceName,
        apiBase: newServiceBaseUrl,
        apiKey: newServiceApiKey,
      });
      if (editingService === currentServiceName) {
        setCurrentService(newServiceName);
      }
    } else {
      // 添加新服务
      addService({
        name: newServiceName,
        apiBase: newServiceBaseUrl,
        apiKey: newServiceApiKey,
      });
    }

    setIsAddingService(false);
    setEditingService(null);
    setNewServiceName('');
    setNewServiceBaseUrl('');
    setNewServiceApiKey('');
  };

  const handleEditService = (name: string) => {
    const service = services[name];
    if (service) {
      setEditingService(name);
      setNewServiceName(service.name);
      setNewServiceBaseUrl(service.apiBase);
      setNewServiceApiKey(service.apiKey);
      setIsAddingService(true);
    }
  };

  const handleDeleteService = (name: string) => {
    if (confirm('确定要删除这个已保存的服务配置吗？')) {
      deleteService(name);
    }
  };

  const handleCancelEdit = () => {
    setIsAddingService(false);
    setEditingService(null);
    setNewServiceName('');
    setNewServiceBaseUrl('');
    setNewServiceApiKey('');
    setErrorMessage('');
  };

  const tabs = [
    { id: 'api', label: 'API设置', icon: Wifi },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">设置</h1>

      <div className="flex gap-6">
        {/* 左侧导航 */}
        <div className="w-48">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-accent-green/10 text-accent-green'
                    : 'text-gray-400 hover:bg-dark-800 hover:text-white'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* 右侧内容 */}
        <div className="flex-1 bg-dark-800 rounded-xl p-6 border border-dark-700">
          {activeTab === 'api' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Server className="w-5 h-5" />
                  API 服务配置
                </h2>
                <button
                  onClick={() => resetToDefaults()}
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  重置为默认
                </button>
              </div>

              {/* 服务选择 */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  选择 API 服务
                </label>
                <div className="flex gap-2">
                  <select
                    value={currentServiceName}
                    onChange={(e) => handleServiceSelect(e.target.value)}
                    className="flex-1 bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 focus:outline-none focus:border-accent-green"
                  >
                    {/* 合并内置服务和用户已保存的服务，用户保存的优先 */}
                    {Object.keys({ ...DEFAULT_API_SERVICES, ...services }).map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => setIsAddingService(true)}
                    className="px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg hover:bg-dark-600 transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    添加
                  </button>
                </div>

                {/* 内置服务标签 */}
                {DEFAULT_API_SERVICES[currentServiceName] && (
                  <p className="text-xs text-gray-500 mt-1">内置服务</p>
                )}
              </div>

              {/* 添加/编辑服务表单 */}
              {isAddingService && (
                <div className="p-4 bg-dark-700 rounded-lg border border-dark-600 space-y-4">
                  <h3 className="font-medium">
                    {editingService ? '编辑服务' : '添加新服务'}
                  </h3>

                  <div>
                    <label className="block text-sm text-gray-400 mb-1">服务名称</label>
                    <input
                      type="text"
                      value={newServiceName}
                      onChange={(e) => setNewServiceName(e.target.value)}
                      placeholder="我的自定义API"
                      disabled={!!DEFAULT_API_SERVICES[editingService || '']}
                      className="w-full bg-dark-600 border border-dark-500 rounded-lg px-4 py-2 focus:outline-none focus:border-accent-green disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Base URL</label>
                    <input
                      type="text"
                      value={newServiceBaseUrl}
                      onChange={(e) => setNewServiceBaseUrl(e.target.value)}
                      placeholder="https://api.example.com/v1"
                      className="w-full bg-dark-600 border border-dark-500 rounded-lg px-4 py-2 focus:outline-none focus:border-accent-green"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-1">API Key</label>
                    <input
                      type="password"
                      value={newServiceApiKey}
                      onChange={(e) => setNewServiceApiKey(e.target.value)}
                      placeholder="sk-xxxxxxxxxxxxxxxx"
                      className="w-full bg-dark-600 border border-dark-500 rounded-lg px-4 py-2 focus:outline-none focus:border-accent-green"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveService}
                      className="px-4 py-2 bg-accent-green rounded-lg hover:opacity-90 transition-opacity"
                    >
                      保存
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="px-4 py-2 bg-dark-600 rounded-lg hover:bg-dark-500 transition-colors"
                    >
                      取消
                    </button>
                  </div>
                </div>
              )}

              {/* 服务列表 */}
              {!isAddingService && (
                <div className="space-y-2">
                  <label className="block text-sm text-gray-400 mb-2">
                    已保存的服务
                  </label>
                  {Object.entries(services).map(([name, service]) => (
                    <div
                      key={name}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                        name === currentServiceName
                          ? 'bg-accent-green/10 border-accent-green'
                          : 'bg-dark-700 border-dark-600 hover:bg-dark-600'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            name === currentServiceName ? 'bg-accent-green' : 'bg-gray-500'
                          }`}
                        />
                        <div>
                          <div className="font-medium">{name}</div>
                          <div className="text-xs text-gray-500 truncate max-w-xs">
                            {service.apiBase}
                          </div>
                        </div>
                        {DEFAULT_API_SERVICES[name] && (
                          <span className="text-xs px-2 py-0.5 bg-dark-500 rounded text-gray-400">
                            内置
                          </span>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEditService(name)}
                          className="p-2 hover:bg-dark-500 rounded transition-colors"
                          title="编辑"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteService(name)}
                          className="p-2 hover:bg-red-500/20 rounded transition-colors text-red-400"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <hr className="border-dark-700" />

              {/* 当前服务配置 */}
              <div className="space-y-4">
                <h3 className="font-medium flex items-center gap-2">
                  <Server className="w-4 h-4" />
                  {currentServiceName} 配置
                </h3>

                {currentServiceName === '硅基流动 (SiliconFlow)' && (
                  <p className="text-sm text-gray-400">
                    请前往{' '}
                    <a
                      href="https://cloud.siliconflow.cn"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent-green hover:underline inline-flex items-center gap-1"
                    >
                      siliconflow.cn
                      <ExternalLink className="w-3 h-3" />
                    </a>{' '}
                    获取 API Key。
                  </p>
                )}

                <div>
                  <label className="block text-sm text-gray-400 mb-2 flex items-center gap-2">
                    <Server className="w-4 h-4" />
                    Base URL
                  </label>
                  <input
                    type="text"
                    value={localBaseUrl}
                    onChange={(e) => setLocalBaseUrl(e.target.value)}
                    placeholder="https://api.siliconflow.cn/v1"
                    className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 focus:outline-none focus:border-accent-green"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2 flex items-center gap-2">
                    <Key className="w-4 h-4" />
                    API Key
                  </label>
                  <input
                    type="password"
                    value={localApiKey}
                    onChange={(e) => setLocalApiKey(e.target.value)}
                    placeholder="sk-xxxxxxxxxxxxxxxx"
                    className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 focus:outline-none focus:border-accent-green"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm text-gray-400 flex items-center gap-2">
                      <Bot className="w-4 h-4" />
                      模型
                    </label>
                    <button
                      onClick={handleDetectModels}
                      disabled={isDetectingModels || !localApiKey}
                      className="text-sm text-accent-green hover:underline disabled:opacity-50 flex items-center gap-1"
                    >
                      {isDetectingModels ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          检测中...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-3 h-3" />
                          检测可用模型
                        </>
                      )}
                    </button>
                  </div>
                  <input
                    type="text"
                    value={localModelName}
                    onChange={(e) => setLocalModelName(e.target.value)}
                    placeholder="Pro/zai-org/GLM-5 或 deepseek-ai/DeepSeek-V3-0324"
                    className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 focus:outline-none focus:border-accent-green"
                  />
                  {detectedModels.length > 0 && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs text-gray-500">
                          {showAllModels ? `全部模型 (${allModels.length})` : `视觉/多模态模型 (${detectedModels.length})`}
                        </p>
                        {allModels.length > 0 && (
                          <button
                            onClick={() => setShowAllModels(!showAllModels)}
                            className="text-xs text-accent-green hover:underline"
                          >
                            {showAllModels ? '仅显示视觉模型' : `+${allModels.length - detectedModels.length} 非视觉模型`}
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                        {(showAllModels ? allModels : detectedModels).map((model) => (
                          <button
                            key={model}
                            onClick={() => {
                              setLocalModelName(model);
                              setModelName(model);
                            }}
                            className={`text-xs px-2 py-1 rounded transition-colors ${
                              model === localModelName
                                ? 'bg-accent-green text-white'
                                : 'bg-dark-600 hover:bg-dark-500'
                            }`}
                          >
                            {model}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    推荐模型：deepseek-ai/DeepSeek-V3、Qwen/Qwen2.5-72B-Instruct
                  </p>
                </div>

                <div className="flex items-center gap-4 pt-4">
                  <button
                    onClick={checkApiConnection}
                    disabled={apiStatus === 'checking'}
                    className="flex items-center gap-2 px-6 py-2 bg-accent-green rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {apiStatus === 'checking' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        检测中...
                      </>
                    ) : (
                      <>测试连接</>
                    )}
                  </button>

                  {apiStatus === 'success' && (
                    <div className="flex items-center gap-2 text-accent-green">
                      <CheckCircle className="w-5 h-5" />
                      <span>连接成功！</span>
                    </div>
                  )}

                  {apiStatus === 'error' && (
                    <div className="flex items-center gap-2 text-red-400">
                      <XCircle className="w-5 h-5" />
                      <span>{errorMessage || '连接失败'}</span>
                    </div>
                  )}
                </div>

                {apiKey && (
                  <div className="p-4 bg-dark-700 rounded-lg border border-dark-600">
                    <div className="text-sm text-gray-400 mb-2">当前已保存的配置:</div>
                    <div className="space-y-1 text-sm">
                      <div>
                        <span className="text-gray-400">服务:</span>{' '}
                        <span className="font-mono text-accent-green">{currentServiceName}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Base URL:</span>{' '}
                        <span className="font-mono text-accent-green">{baseUrl}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Model:</span>{' '}
                        <span className="font-mono text-accent-green">{modelName}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">API Key:</span>{' '}
                        <span className="font-mono text-accent-green">
                          {apiKey.substring(0, 8)}...{apiKey.substring(apiKey.length - 4)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
