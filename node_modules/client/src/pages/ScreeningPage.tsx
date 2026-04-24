import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Sparkles, X, Loader2, FolderOpen, FileArchive, Images, AlertCircle } from 'lucide-react';
import { useSettingsStore } from '../stores/settingsStore';
import { useHistoryStore } from '../stores/historyStore';
import { useStatsStore } from '../stores/statsStore';
import { analyzeTextureDesign } from '../services/hybridScreeningService';
import type { HybridJudgement } from '../types/screening';
import { storeImages } from '../utils/imageStorage';
import { runWithConcurrency } from '../utils/promisePool';
import JSZip from 'jszip';

export function ScreeningPage() {
  const navigate = useNavigate();
  const { apiKey, modelName, baseUrl, qwenTasks, setQwenTask } = useSettingsStore();
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractProgress, setExtractProgress] = useState(0);
  const [progress, setProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentResult, setCurrentResult] = useState<string>('');
  const [results, setResults] = useState<Map<number, string>>(new Map());
  // 模板分类现在由 QwenVL 自动完成，不需要用户手动选择
  // 保留类型导入仅用于兼容
  const [structuredResults, setStructuredResults] = useState<Map<number, HybridJudgement>>(new Map());

  useEffect(() => {
    if (!apiKey) {
      setError('请先在设置页面配置 API Key');
    } else {
      setError(null);
    }
  }, [apiKey]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    await processDroppedFiles(droppedFiles);
  }, []);

  const processDroppedFiles = async (droppedFiles: File[]) => {
    const zipFiles = droppedFiles.filter(
      (file) =>
        file.type === 'application/zip' ||
        file.type === 'application/x-zip-compressed' ||
        file.name.endsWith('.zip')
    );
    const imageFiles = droppedFiles.filter((file) => file.type.startsWith('image/'));

    if (zipFiles.length > 0) {
      await extractZipFiles(zipFiles);
    }

    if (imageFiles.length > 0) {
      addFiles(imageFiles);
    }
  };

  const extractZipFiles = async (zipFiles: File[]) => {
    setIsExtracting(true);
    setExtractProgress(0);

    const allImageFiles: File[] = [];
    const zip = new JSZip();

    for (let i = 0; i < zipFiles.length; i++) {
      const zipFile = zipFiles[i];
      try {
        const zipContent = await zip.loadAsync(zipFile);
        const imageEntries = Object.values(zipContent.files).filter(
          (file) =>
            !file.dir &&
            (file.name.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i) !== null)
        );

        for (let j = 0; j < imageEntries.length; j++) {
          const entry = imageEntries[j];
          try {
            const blob = await entry.async('blob');
            const imageFile = new File([blob], entry.name.split('/').pop() || entry.name, {
              type: getMimeType(entry.name),
            });
            allImageFiles.push(imageFile);
            setExtractProgress(Math.round(((j + 1) / imageEntries.length) * 100));
          } catch (err) {
            console.error(`Failed to extract ${entry.name}:`, err);
          }
        }
      } catch (err) {
        console.error(`Failed to load zip ${zipFile.name}:`, err);
      }
    }

    if (allImageFiles.length > 0) {
      addFiles(allImageFiles);
    }

    setIsExtracting(false);
    setExtractProgress(0);
  };

  const getMimeType = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      bmp: 'image/bmp',
    };
    return mimeTypes[ext || ''] || 'image/jpeg';
  };

  const addFiles = (newFiles: File[]) => {
    const imageFiles = newFiles.filter((file) => file.type.startsWith('image/'));
    setFiles((prev) => [...prev, ...imageFiles]);
    const newPreviews = imageFiles.map((file) => URL.createObjectURL(file));
    setPreviews((prev) => [...prev, ...newPreviews]);
  };

  const removeFile = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
    const newResults = new Map(results);
    newResults.delete(index);
    setResults(newResults);
    const newStructured = new Map(structuredResults);
    newStructured.delete(index);
    setStructuredResults(newStructured);
  };

  const handleStartScreening = async () => {
    if (files.length === 0) return;
    if (!apiKey) {
      setError('请先在设置页面配置 API Key');
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setError(null);
    setCurrentResult('');
    const newResults = new Map<number, string>();
    const structuredMap = new Map<number, HybridJudgement>();
    const keepIndices: number[] = [];

    try {
      let completed = 0;
      const total = files.length;

      const tasks = files.map((file, i) => async () => {
        try {
          const judgement = await analyzeTextureDesign({
            apiBase: baseUrl,
            apiKey,
            model: modelName || 'Qwen/Qwen2.5-VL-7B-Instruct',
            imageFile: file,
            qwenTasks,
          });
          completed++;
          setProgress(Math.round((completed / total) * 100));
          setCurrentResult(judgement.summary);
          return { index: i, judgement, error: null as string | null };
        } catch (err: any) {
          completed++;
          setProgress(Math.round((completed / total) * 100));
          return { index: i, judgement: null as HybridJudgement | null, error: err?.message || '分析失败' };
        }
      });

      const taskResults = await runWithConcurrency(tasks, 2);

      for (const { index, judgement, error } of taskResults) {
        if (error) {
          newResults.set(index, `错误：${error}`);
        } else {
          newResults.set(index, judgement!.summary);
          structuredMap.set(index, judgement!);
          if (judgement!.keep) {
            keepIndices.push(index);
          }
        }
      }

      setResults(new Map(newResults));
      setStructuredResults(new Map(structuredMap));
      setProgress(100);

      // Save to history
      const { addRecord } = useHistoryStore.getState();
      const structured = Object.fromEntries(structuredMap);

      const recordId = addRecord({
        files: files.map((f) => f.name),
        previews: [],
        results: Object.fromEntries(newResults),
        structuredResults: structured,
        keepIndices,
        qwenTasks,
      });

      // Store images in IndexedDB for persistence
      await storeImages(recordId, files);

      // Update stats
      const { updateStats } = useStatsStore.getState();
      updateStats(files.length, keepIndices.length);

      // Navigate to results page with the screening results
      navigate('/results', {
        state: {
          recordId,
          results: Object.fromEntries(newResults),
          structuredResults: structured,
          keepIndices,
          qwenTasks,
          files: files.map((f) => f.name),
          previews,
        },
      });
    } catch (err: any) {
      setError(err.message || '处理失败');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">图片筛选</h1>
        <p className="text-gray-400">上传照片，让AI帮你智能筛选优质图片</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <span className="text-red-400">{error}</span>
          {!apiKey && (
            <button
              onClick={() => navigate('/settings')}
              className="ml-auto text-sm text-accent-green hover:underline"
            >
              去设置
            </button>
          )}
        </div>
      )}

      {/* Upload Section */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Drop Zone - Clickable for file selection */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`lg:col-span-3 relative border-2 border-dashed rounded-xl p-10 text-center transition-all duration-200 cursor-pointer group ${
            dragActive
              ? 'border-accent-green'
              : 'border-dark-600 hover:border-dark-500'
          } bg-dark-800`}
        >
          <div className={`w-20 h-20 mx-auto rounded-xl flex items-center justify-center mb-5 transition-all duration-200 ${
            dragActive ? 'bg-accent-green/15' : 'bg-accent-green/10 group-hover:bg-accent-green/15'
          }`}>
            <Upload className="w-9 h-9 text-accent-green" />
          </div>
          <div className="text-lg font-semibold mb-2">点击选择或拖拽图片到此处</div>
          <div className="text-sm text-gray-500">
            支持 JPG、PNG、GIF、WebP、BMP 格式
          </div>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                addFiles(Array.from(e.target.files));
                e.target.value = '';
              }
            }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>

        {/* Side Buttons */}
        <div className="space-y-3">
          <label className="flex items-center gap-3 px-4 py-3.5 rounded-lg border border-dark-700 bg-dark-800 cursor-pointer hover:bg-dark-700 transition-all duration-200 group">
            <div className="w-9 h-9 rounded-lg bg-accent-blue/10 flex items-center justify-center group-hover:bg-accent-blue/15 transition-colors">
              <Images className="w-4 h-4 text-accent-blue" />
            </div>
            <span className="text-sm">选择多张图片</span>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  addFiles(Array.from(e.target.files));
                  e.target.value = '';
                }
              }}
              className="hidden"
            />
          </label>

          <label className="flex items-center gap-3 px-4 py-3.5 rounded-lg border border-dark-700 bg-dark-800 cursor-pointer hover:bg-dark-700 transition-all duration-200 group">
            <div className="w-9 h-9 rounded-lg bg-accent-purple/10 flex items-center justify-center group-hover:bg-accent-purple/15 transition-colors">
              <FolderOpen className="w-4 h-4 text-accent-purple" />
            </div>
            <span className="text-sm">选择文件夹</span>
            <input
              type="file"
              multiple
              // @ts-ignore
              directory=""
              webkitdirectory=""
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  const imageFiles = Array.from(e.target.files).filter(
                    (file) => file.type.startsWith('image/')
                  );
                  if (imageFiles.length > 0) {
                    addFiles(imageFiles);
                  }
                  e.target.value = '';
                }
              }}
              className="hidden"
            />
          </label>

          <label className="flex items-center gap-3 px-4 py-3.5 rounded-lg border border-dark-700 bg-dark-800 cursor-pointer hover:bg-dark-700 transition-all duration-200 group">
            <div className="w-9 h-9 rounded-lg bg-accent-yellow/10 flex items-center justify-center group-hover:bg-accent-yellow/15 transition-colors">
              <FileArchive className="w-4 h-4 text-accent-yellow" />
            </div>
            <span className="text-sm">选择压缩包(ZIP)</span>
            <input
              type="file"
              accept=".zip"
              onChange={async (e) => {
                if (e.target.files && e.target.files.length > 0) {
                  const zipFiles = Array.from(e.target.files).filter(
                    (file) =>
                      file.type === 'application/zip' ||
                      file.name.endsWith('.zip')
                  );
                  if (zipFiles.length > 0) {
                    await extractZipFiles(zipFiles);
                  }
                  e.target.value = '';
                }
              }}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Drop Zone Component - for drag and drop visual */}
      {previews.length === 0 && (
        <div className="text-center text-gray-500 text-sm">
          提示：支持拖拽文件夹或 ZIP 压缩包到此处
        </div>
      )}

      {isExtracting && (
        <div className="rounded-xl p-6 border border-dark-700 bg-dark-800">
          <div className="flex items-center gap-4 mb-4">
            <Loader2 className="w-8 h-8 text-accent-green animate-spin" />
            <div>
              <div className="font-medium">正在解压压缩包...</div>
              <div className="text-sm text-gray-400">
                已提取 {extractProgress}% 的图片
              </div>
            </div>
          </div>
          <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-accent-green transition-all duration-300"
              style={{ width: `${extractProgress}%` }}
            />
          </div>
        </div>
      )}

      {previews.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">已选择 {files.length} 张图片</h2>
            <button
              onClick={() => {
                previews.forEach(URL.revokeObjectURL);
                setFiles([]);
                setPreviews([]);
                setResults(new Map());
                setStructuredResults(new Map());
              }}
              className="text-sm text-red-400 hover:text-red-300"
            >
              清空全部
            </button>
          </div>

          <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
            {previews.map((preview, index) => (
              <div key={preview} className="relative group aspect-square">
                <img
                  src={preview}
                  alt={`Preview ${index + 1}`}
                  className={`w-full h-full object-cover rounded-lg ${
                    results.has(index) ? 'ring-2 ring-accent-green' : ''
                  }`}
                />
                {results.has(index) && (
                  <div className="absolute bottom-1 left-1 right-1 text-xs bg-black/60 rounded px-1 py-0.5 truncate">
                    {index + 1}
                  </div>
                )}
                <button
                  onClick={() => removeFile(index)}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {isProcessing && (
        <div className="bg-dark-800 rounded-xl p-6 border border-dark-700">
          <div className="flex items-center gap-4 mb-4">
            <Loader2 className="w-8 h-8 text-accent-green animate-spin" />
            <div>
              <div className="font-medium">AI筛选中...</div>
              <div className="text-sm text-gray-400">
                已完成 {Math.round(progress)}% ({files.length}张中的{results.size}张)
              </div>
            </div>
          </div>
          <div className="h-2 bg-dark-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-accent-green transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          {currentResult && (
            <div className="mt-4 p-4 bg-dark-700 rounded-lg">
              <div className="text-sm text-gray-400 mb-2">最新分析结果:</div>
              <div className="text-sm whitespace-pre-wrap break-words">{currentResult}</div>
            </div>
          )}
        </div>
      )}

      {files.length > 0 && !isProcessing && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={handleStartScreening}
              className="px-6 py-3 bg-accent-green rounded-lg font-medium text-dark-950 hover:opacity-90 transition-opacity flex items-center gap-2.5"
            >
              <Sparkles className="w-5 h-5" />
              开始AI筛选 ({files.length}张)
            </button>
          </div>

          {/* QwenVL 任务开关 */}
          <div className="rounded-xl p-5 space-y-3 border border-dark-700 bg-dark-800">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-accent-green/10 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-accent-green" />
              </div>
              <h3 className="text-white font-semibold">QwenVL 任务开关</h3>
            </div>
            <p className="text-xs text-gray-500 ml-10">
              关闭不需要的任务可以节省 token 和响应时间
            </p>

            <div className="space-y-2 ml-10">
            {[
              ['templateClassification', '模板分类', '自动识别图片属于哪种风格模板'],
              ['templateReview', '模板审稿', '结构失控/伪影/焦点不清等问题检测'],
              ['multiScore', '多维评分', '结构/构图/节奏/匹配/工艺/伪影 6 维度打分'],
              ['finalLabel', '最终标签', '让 Qwen 直接推荐 A~E 标签（否则用本地规则映射）'],
              ['summaryReason', '总结原因', '输出一句话总结和 2~4 条原因'],
            ].map(([key, label, desc]) => (
              <label
                key={key}
                className="flex items-start justify-between text-sm cursor-pointer p-2.5 rounded-xl hover:bg-dark-800 transition-colors group"
              >
                <div className="flex-1 mr-3">
                  <div className="text-gray-300 group-hover:text-white transition-colors">{label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{desc}</div>
                </div>
                <input
                  type="checkbox" 
                  checked={qwenTasks[key as keyof typeof qwenTasks]}
                  onChange={(e) =>
                    setQwenTask(key as keyof typeof qwenTasks, e.target.checked)
                  }
                  className="mt-1 w-4 h-4 accent-accent-green cursor-pointer"
                />
              </label>
            ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
