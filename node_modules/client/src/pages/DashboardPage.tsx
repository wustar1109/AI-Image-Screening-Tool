import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Images, Trash2, Clock, Heart, Sparkles, Palette, Plus, Star, Trash, Edit3, Save } from 'lucide-react';
import { useStatsStore } from '../stores/statsStore';
import { useHistoryStore, ScreeningRecord } from '../stores/historyStore';
import { getAllImagesGroupedByRecord, deleteImages } from '../utils/imageStorage';

export function DashboardPage() {
  const navigate = useNavigate();
  const { stats, fetchStats } = useStatsStore();
  const { records, updateRecord, deleteRecord, searchQuery } = useHistoryStore();
  const [imageUrls, setImageUrls] = useState<Record<string, string[]>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const filteredRecords = useMemo(() => {
    if (!searchQuery.trim()) return records;
    const lowerQuery = searchQuery.toLowerCase();
    return records.filter((record) =>
      record.name.toLowerCase().includes(lowerQuery) ||
      record.files.some((file) => file.toLowerCase().includes(lowerQuery))
    );
  }, [records, searchQuery]);

  useEffect(() => {
    fetchStats();
    loadImages();
  }, [fetchStats]);

  const loadImages = async () => {
    try {
      const grouped = await getAllImagesGroupedByRecord();
      const urls: Record<string, string[]> = {};
      for (const record of records) {
        const images = grouped[record.id] || [];
        urls[record.id] = images.slice(0, 4).map((img) => img.url);
      }
      setImageUrls(urls);
    } catch {
      setImageUrls({});
    }
  };

  useEffect(() => {
    loadImages();
  }, [records]);

  const statCards = [
    {
      icon: Images,
      label: '累计处理照片',
      value: stats.totalProcessed,
      unit: '张',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      icon: Trash2,
      label: '淘汰废片',
      value: stats.totalDiscarded,
      unit: '张',
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
    },
    {
      icon: Clock,
      label: '节省选片时间',
      value: stats.totalTimeSaved,
      unit: '秒',
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
    },
    {
      icon: Heart,
      label: '精选照片',
      value: stats.totalSelected,
      unit: '张',
      color: 'text-pink-400',
      bgColor: 'bg-pink-500/10',
    },
  ];

  const formatDate = (isoDate: string) => {
    const date = new Date(isoDate);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const handleViewRecord = (recordId: string) => {
    const record = records.find(r => r.id === recordId);
    navigate('/results', {
      state: {
        recordId,
        results: record?.results || {},
        structuredResults: record?.structuredResults,
        keepIndices: record?.keepIndices || [],
        files: record?.files || [],
        previews: imageUrls[recordId] || [],
      },
    });
  };

  const handleToggleFavorite = (e: React.MouseEvent, record: ScreeningRecord) => {
    e.stopPropagation();
    updateRecord(record.id, { isFavorite: !record.isFavorite });
  };

  const handleDelete = async (e: React.MouseEvent, recordId: string) => {
    e.stopPropagation();
    e.preventDefault();
    console.log('Delete clicked for record:', recordId);
    if (confirm('确定要删除这个项目吗？')) {
      console.log('Confirmed delete for:', recordId);
      try {
        await deleteImages(recordId);
        console.log('Images deleted');
        deleteRecord(recordId);
        console.log('Record deleted');
      } catch (err) {
        console.error('Delete failed:', err);
      }
    }
  };

  const handleStartEdit = (e: React.MouseEvent, record: ScreeningRecord) => {
    e.stopPropagation();
    setEditingId(record.id);
    setEditName(record.name);
  };

  const handleSaveEdit = (e: React.MouseEvent, recordId: string) => {
    e.stopPropagation();
    if (editName.trim()) {
      updateRecord(recordId, { name: editName.trim() });
    }
    setEditingId(null);
  };

  const handleCancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-2">欢迎回来</h1>
        <p className="text-gray-400">开始你的AI图片筛选之旅</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => navigate('/screening')}
          className="group flex items-center gap-4 p-6 bg-gradient-to-r from-accent-green to-accent-green-dark rounded-xl transition-all duration-200 text-left relative overflow-hidden"
        >
          <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <div className="relative">
            <div className="text-xl font-semibold text-white">开始筛选</div>
            <div className="text-sm text-white/70">AI智能分析，一键筛选优质照片</div>
          </div>
        </button>

        <button
          onClick={() => navigate('/batch-edit')}
          className="group flex items-center gap-4 p-6 rounded-xl border border-dark-700 bg-dark-800 hover:border-dark-600 transition-all duration-200 text-left"
        >
          <div className="w-14 h-14 rounded-xl bg-accent-green/10 flex items-center justify-center group-hover:bg-accent-green/15 transition-colors">
            <Palette className="w-7 h-7 text-accent-green" />
          </div>
          <div>
            <div className="text-xl font-semibold">批量修图</div>
            <div className="text-sm text-gray-500">批量调整图片尺寸和格式</div>
          </div>
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <div
            key={card.label}
            className="relative overflow-hidden rounded-xl p-5 border border-dark-700 bg-dark-800"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className={`w-10 h-10 rounded-xl ${card.bgColor} flex items-center justify-center mb-3 relative`}>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <div className="text-2xl font-bold tracking-tight">{card.value}<span className="text-sm font-normal text-gray-500 ml-0.5">{card.unit}</span></div>
            <div className="text-sm text-gray-500 mt-1">{card.label}</div>
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">所有项目</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {/* New Project Card */}
          <button
            onClick={() => navigate('/screening')}
            className="aspect-square rounded-xl border-2 border-dashed border-dark-600 hover:border-accent-green/40 flex flex-col items-center justify-center gap-3 transition-all duration-200 group bg-dark-800 hover:bg-dark-700"
          >
            <div className="w-12 h-12 rounded-xl bg-accent-green/10 flex items-center justify-center group-hover:bg-accent-green/15 transition-all duration-200">
              <Plus className="w-6 h-6 text-accent-green" />
            </div>
            <span className="text-gray-500 text-sm group-hover:text-gray-300 transition-colors">新建项目</span>
          </button>

          {/* Project Cards */}
          {filteredRecords.map((record) => (
            <div
              key={record.id}
              onClick={() => handleViewRecord(record.id)}
              className="group relative aspect-square rounded-xl overflow-hidden border border-dark-700 cursor-pointer bg-dark-800 hover:border-dark-600"
            >
              {/* Image Grid Preview */}
              <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-0.5 p-1">
                {imageUrls[record.id]?.length > 0 ? (
                  imageUrls[record.id].slice(0, 4).map((url, idx) => (
                    <div key={idx} className="bg-dark-700 rounded-md overflow-hidden">
                      <img
                        src={url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))
                ) : (
                  Array.from({ length: 4 }).map((_, idx) => (
                    <div
                      key={idx}
                      className="bg-dark-700 rounded-md overflow-hidden"
                    >
                      <div className="w-full h-full bg-dark-700 flex items-center justify-center">
                        <Images className="w-6 h-6 text-dark-500" />
                      </div>
                    </div>
                  ))
                )}
                {/* Fill remaining slots if less than 4 images */}
                {Array.from({ length: Math.max(0, 4 - (imageUrls[record.id]?.length || 0)) }).map((_, idx) => (
                  <div
                    key={`empty-${idx}`}
                    className="bg-dark-800 rounded-md"
                  />
                ))}
              </div>

              {/* Total Count Badge */}
              <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 rounded-md text-xs text-white font-medium">
                共{record.files.length}张
              </div>

              {/* Favorite Star */}
              {record.isFavorite && (
                <div className="absolute top-2 left-2">
                  <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                </div>
              )}

              {/* Bottom Info Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                {editingId === record.id ? (
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 bg-dark-700 px-2 py-1 rounded text-sm text-white outline-none focus:ring-1 focus:ring-accent-green"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit(e as unknown as React.MouseEvent, record.id);
                        if (e.key === 'Escape') handleCancelEdit(e as unknown as React.MouseEvent);
                      }}
                    />
                    <button
                      onClick={(e) => handleSaveEdit(e, record.id)}
                      className="p-1 text-accent-green hover:bg-accent-green/20 rounded"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="p-1 text-gray-400 hover:bg-dark-700 rounded"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="text-sm font-medium text-white truncate">
                      {record.name}
                    </div>
                    <div className="text-xs text-gray-300 mt-0.5">
                      更新于{formatDate(record.date)} · {record.files.length}图片
                    </div>
                  </>
                )}
              </div>

              {/* Action Buttons (visible on hover) */}
              <div className="absolute top-2 left-0 right-12 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {editingId !== record.id && (
                  <>
                    <button
                      onClick={(e) => handleToggleFavorite(e, record)}
                      className={`p-1.5 rounded-md transition-colors ${
                        record.isFavorite
                          ? 'bg-yellow-400/80 text-yellow-900'
                          : 'bg-black/60 text-white hover:bg-black/80'
                      }`}
                      title={record.isFavorite ? '取消收藏' : '收藏'}
                    >
                      <Star className={`w-4 h-4 ${record.isFavorite ? 'fill-current' : ''}`} />
                    </button>
                    <button
                      onClick={(e) => handleStartEdit(e, record)}
                      className="p-1.5 bg-black/60 rounded-md text-white hover:bg-black/80 transition-colors"
                      title="重命名"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, record.id)}
                      className="p-1.5 bg-black/60 rounded-md text-white hover:bg-red-500/80 active:bg-red-600 transition-colors"
                      title="删除"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {records.length === 0 && (
          <p className="text-center text-gray-500 mt-4">开始你的第一次 AI 筛选吧</p>
        )}
        {records.length > 0 && filteredRecords.length === 0 && (
          <p className="text-center text-gray-500 mt-4">没有找到匹配的项目</p>
        )}
      </div>
    </div>
  );
}
