import { useEffect, useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Images, Check, X, Filter, ArrowLeft, Download, Star, Trash2, Edit3, Save, FolderOpen, Clock } from 'lucide-react';
import { useHistoryStore, ScreeningRecord } from '../stores/historyStore';
import { getImages, deleteImages } from '../utils/imageStorage';
import type { HybridJudgement, QwenTaskConfig } from '../types/screening';

interface ScreeningResult {
  recordId?: string;
  results: Record<string, string>;
  structuredResults?: Record<string, HybridJudgement>;
  keepIndices: number[];
  qwenTasks?: QwenTaskConfig;
  files: string[];
  previews: string[];
}

export function ResultsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'selected' | 'discarded'>('all');
  const [screeningData, setScreeningData] = useState<ScreeningResult | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  const { records, getRecord, updateRecord, deleteRecord, searchQuery } = useHistoryStore();

  const filteredRecords = useMemo(() => {
    if (!searchQuery.trim()) return records;
    const lowerQuery = searchQuery.toLowerCase();
    return records.filter((record) =>
      record.name.toLowerCase().includes(lowerQuery) ||
      record.files.some((file) => file.toLowerCase().includes(lowerQuery))
    );
  }, [records, searchQuery]);

  useEffect(() => {
    const loadData = async () => {
      // First, determine the recordId from state or from the current record
      let recordId = location.state?.recordId as string | undefined;

      // If we have a recordId in state, load from IndexedDB
      if (recordId) {
        const data = location.state as ScreeningResult;
        const record = getRecord(recordId);

        if (record) {
          setEditName(record.name);
          try {
            const storedImages = await getImages(recordId);
            const urls = storedImages.map(img => img.url);

            setScreeningData({
              recordId,
              results: record.results,
              structuredResults: record.structuredResults,
              keepIndices: record.keepIndices,
              files: storedImages.length > 0 ? storedImages.map(img => img.filename) : record.files,
              previews: urls,
            });
            setImageUrls(urls);
            return;
          } catch (e) {
            console.warn('Failed to load images from IndexedDB:', e);
          }
        }
        // If record not found or loading failed, use state data
        setScreeningData(data);
        setImageUrls(data.previews || []);
      } else if (location.state) {
        // No recordId but have state data
        setScreeningData(location.state as ScreeningResult);
        setImageUrls((location.state as ScreeningResult).previews || []);
      } else {
        // No state at all - this shouldn't happen for a specific record view
        setScreeningData(null);
        setImageUrls([]);
      }
    };

    loadData();
  }, [location.state, getRecord]);

  const handleSaveName = () => {
    if (screeningData?.recordId && editName.trim()) {
      updateRecord(screeningData.recordId, { name: editName.trim() });
      setIsEditing(false);
    }
  };

  const handleToggleFavorite = () => {
    if (screeningData?.recordId) {
      const record = getRecord(screeningData.recordId);
      if (record) {
        updateRecord(screeningData.recordId, { isFavorite: !record.isFavorite });
      }
    }
  };

  const handleDelete = async () => {
    if (screeningData?.recordId) {
      if (confirm('确定要删除这个项目吗？')) {
        await deleteImages(screeningData.recordId);
        deleteRecord(screeningData.recordId);
        navigate('/results');
      }
    }
  };

  const handleViewRecord = (record: ScreeningRecord) => {
    navigate('/results', {
      state: {
        recordId: record.id,
        results: record.results,
        structuredResults: record.structuredResults,
        keepIndices: record.keepIndices,
        qwenTasks: record.qwenTasks,
        files: record.files,
        previews: record.previews || [],
      },
    });
  };

  const handleDeleteFromList = async (e: React.MouseEvent, recordId: string) => {
    e.stopPropagation();
    if (confirm('确定要删除这个项目吗？')) {
      await deleteImages(recordId);
      deleteRecord(recordId);
    }
  };

  const handleToggleFavoriteFromList = (e: React.MouseEvent, record: ScreeningRecord) => {
    e.stopPropagation();
    updateRecord(record.id, { isFavorite: !record.isFavorite });
  };

  const formatDate = (isoDate: string) => {
    const date = new Date(isoDate);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // If no specific record is selected, show all history records
  if (!screeningData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            返回主页
          </button>
          <h1 className="text-2xl font-bold">筛选结果</h1>
        </div>

        {filteredRecords.length === 0 ? (
          <div className="bg-dark-800 rounded-xl border border-dark-700 border-dashed p-12 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-dark-700 flex items-center justify-center mb-4">
              <FolderOpen className="w-8 h-8 text-gray-500" />
            </div>
            <div className="text-gray-400 mb-2">
              {records.length === 0 ? '还没有筛选记录' : '未找到匹配的项目'}
            </div>
            <div className="text-sm text-gray-500">
              {records.length === 0 ? '去进行第一次AI筛选吧' : '尝试更换搜索关键词'}
            </div>
            {records.length === 0 && (
              <button
                onClick={() => navigate('/screening')}
                className="mt-4 px-6 py-2 bg-accent-green rounded-lg hover:opacity-90 transition-opacity"
              >
                去筛选
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-gray-400 mb-4">共 {filteredRecords.length} 个筛选项目</div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRecords.map((record) => (
                <div
                  key={record.id}
                  onClick={() => handleViewRecord(record)}
                  className="group bg-dark-800 rounded-xl p-4 border border-dark-700 hover:border-dark-600 cursor-pointer transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {record.isFavorite && (
                          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400 flex-shrink-0" />
                        )}
                        <h3 className="font-medium truncate">{record.name}</h3>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-sm text-gray-400">
                        <Clock className="w-3 h-3" />
                        {formatDate(record.date)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleToggleFavoriteFromList(e, record)}
                        className={`p-1.5 rounded-md transition-colors ${
                          record.isFavorite
                            ? 'text-yellow-400 hover:bg-yellow-400/10'
                            : 'text-gray-400 hover:text-yellow-400 hover:bg-yellow-400/10'
                        }`}
                        title={record.isFavorite ? '取消收藏' : '收藏'}
                      >
                        <Star className={`w-4 h-4 ${record.isFavorite ? 'fill-current' : ''}`} />
                      </button>
                      <button
                        onClick={(e) => handleDeleteFromList(e, record.id)}
                        className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5">
                      <Images className="w-4 h-4 text-gray-500" />
                      <span>{record.files.length} 张</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-green-400">
                      <Check className="w-4 h-4" />
                      <span>{record.keepIndices.length} 精选</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-red-400">
                      <X className="w-4 h-4" />
                      <span>{record.files.length - record.keepIndices.length} 淘汰</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  const { results, keepIndices, files, previews, recordId } = screeningData;
  const selectedCount = keepIndices.length;
  const discardedCount = files.length - keepIndices.length;
  const record = recordId ? getRecord(recordId) : null;

  const filteredFiles = files
    .map((filename, index) => {
      const structured = screeningData.structuredResults?.[index.toString()];
      return {
        filename,
        index,
        result: results[index.toString()] || '',
        structured,
        isSelected: keepIndices.includes(index),
        preview: imageUrls[index] || previews[index] || '',
      };
    })
    .filter((file) => {
      if (filter === 'all') return true;
      if (filter === 'selected') return file.isSelected;
      if (filter === 'discarded') return !file.isSelected;
      return true;
    });

  const downloadSelected = () => {
    const selectedFiles = files
      .map((filename, index) => ({
        filename,
        index,
        result: results[index.toString()] || '',
        structured: screeningData.structuredResults?.[index.toString()],
      }))
      .filter((file) => keepIndices.includes(file.index));

    const report = selectedFiles
      .map((file) => {
        const s = file.structured;
        return [
          `【${file.filename}】`,
          s ? `模板：${s.styleTemplate}` : '',
          s ? `总分：${s.finalScore}` : '',
          s ? `标签：${s.finalLabel}` : '',
          s?.qwen?.summary ? `评语：${s.qwen.summary}` : '',
          `结果：${file.result}`,
        ]
          .filter(Boolean)
          .join('\n');
      })
      .join('\n---\n\n');

    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `筛选报告_${new Date().toLocaleDateString().replace(/\//g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header with back button and title */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/results')}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          返回列表
        </button>

        {/* Project name with edit */}
        <div className="flex items-center gap-2">
          {recordId && isEditing ? (
            <>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="bg-dark-700 px-3 py-1 rounded-lg text-white outline-none focus:ring-2 focus:ring-accent-green"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
              />
              <button
                onClick={handleSaveName}
                className="p-2 text-accent-green hover:bg-accent-green/10 rounded-lg transition-colors"
              >
                <Save className="w-5 h-5" />
              </button>
            </>
          ) : (
            <h1 className="text-2xl font-bold">
              {record?.name || '筛选结果'}
            </h1>
          )}

          {recordId && !isEditing && (
            <button
              onClick={() => {
                setEditName(record?.name || '');
                setIsEditing(true);
              }}
              className="p-2 text-gray-400 hover:text-white hover:bg-dark-700 rounded-lg transition-colors"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Favorite and Delete buttons */}
        {recordId && (
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={handleToggleFavorite}
              className={`p-2 rounded-lg transition-colors ${
                record?.isFavorite
                  ? 'text-yellow-400 bg-yellow-400/10'
                  : 'text-gray-400 hover:text-yellow-400 hover:bg-yellow-400/10'
              }`}
              title={record?.isFavorite ? '取消收藏' : '收藏'}
            >
              <Star className={`w-5 h-5 ${record?.isFavorite ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={handleDelete}
              className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
              title="删除项目"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/10">
          <Check className="w-5 h-5 text-green-400" />
          <span className="text-green-400">{selectedCount} 张精选</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10">
          <X className="w-5 h-5 text-red-400" />
          <span className="text-red-400">{discardedCount} 张淘汰</span>
        </div>
        <div className="ml-auto">
          <button
            onClick={downloadSelected}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-dark-800 border border-dark-700 hover:bg-dark-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            导出报告
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Filter className="w-5 h-5 text-gray-400" />
        <div className="flex gap-2">
          {(['all', 'selected', 'discarded'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm transition-all ${
                filter === f
                  ? 'bg-accent-green text-white'
                  : 'bg-dark-800 text-gray-400 hover:text-white'
              }`}
            >
              {f === 'all' ? `全部 (${files.length})` : f === 'selected' ? `精选 (${selectedCount})` : `淘汰 (${discardedCount})`}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredFiles.map((file) => (
          <div
            key={file.index}
            className={`bg-dark-800 rounded-xl overflow-hidden border-2 transition-all ${
              file.isSelected
                ? 'border-green-500'
                : 'border-dark-700'
            }`}
          >
            <div className="aspect-video bg-dark-700 flex items-center justify-center relative overflow-hidden">
              {file.preview ? (
                <img
                  src={file.preview}
                  alt={file.filename}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Images className="w-12 h-12 text-gray-500" />
              )}
              {file.isSelected && (
                <div className="absolute top-2 right-2 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                  <Check className="w-5 h-5 text-white" />
                </div>
              )}
              {!file.isSelected && (
                <div className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
                  <X className="w-5 h-5 text-white" />
                </div>
              )}
            </div>
            <div className="p-4">
              <div className="text-sm font-medium truncate mb-2">{file.filename}</div>

              <div className="space-y-3">
                <div className="text-xs text-gray-400 bg-dark-700 rounded-lg p-3">
                  {file.result || '无分析结果'}
                </div>

                {file.structured && (
                  <div className="text-xs bg-dark-700/60 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">模板</span>
                      <span>{file.structured.styleTemplate}</span>
                    </div>

                    {file.structured.templateClassification && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">模板置信度</span>
                        <span>{Math.round(file.structured.templateClassification.templateConfidence * 100)}%</span>
                      </div>
                    )}

                    {(() => {
                      const qt: QwenTaskConfig | undefined = record?.qwenTasks ?? screeningData?.qwenTasks;
                      const hasScoring = qt ? (qt.multiScore || qt.templateReview || qt.finalLabel) : true;
                      return hasScoring ? (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">总分</span>
                            <span>{file.structured.finalScore}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">标签</span>
                            <span>{file.structured.finalLabel}</span>
                          </div>
                        </>
                      ) : null;
                    })()}

                    {file.structured.qwen?.summary && (
                      <div className="text-gray-300 leading-relaxed">
                        {file.structured.qwen.summary}
                      </div>
                    )}

                    {file.structured.manualReviewRequired && (
                      <div className="inline-flex rounded bg-yellow-500/15 text-yellow-300 px-2 py-1">
                        建议人工复核
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredFiles.length === 0 && (
        <div className="text-center text-gray-500 py-12">
          没有符合条件的图片
        </div>
      )}
    </div>
  );
}
