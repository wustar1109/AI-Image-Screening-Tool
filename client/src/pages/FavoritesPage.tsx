import { useNavigate } from 'react-router-dom';
import { Star, Images, Check, X, ArrowLeft, Clock, Trash2 } from 'lucide-react';
import { useHistoryStore, ScreeningRecord } from '../stores/historyStore';
import { deleteImages } from '../utils/imageStorage';

export function FavoritesPage() {
  const navigate = useNavigate();
  const { records, updateRecord, deleteRecord } = useHistoryStore();

  const favoriteRecords = records.filter(r => r.isFavorite);

  const handleViewRecord = (record: ScreeningRecord) => {
    navigate('/results', {
      state: {
        recordId: record.id,
        results: record.results,
        keepIndices: record.keepIndices,
        files: record.files,
        previews: [],
      },
    });
  };

  const handleRemoveFavorite = (e: React.MouseEvent, recordId: string) => {
    e.stopPropagation();
    updateRecord(recordId, { isFavorite: false });
  };

  const handleDelete = async (e: React.MouseEvent, recordId: string) => {
    e.stopPropagation();
    if (confirm('确定要删除这个项目吗？')) {
      await deleteImages(recordId);
      deleteRecord(recordId);
    }
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
        <h1 className="text-2xl font-bold">我的收藏</h1>
      </div>

      {favoriteRecords.length === 0 ? (
        <div className="bg-dark-800 rounded-xl border border-dark-700 border-dashed p-12 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-dark-700 flex items-center justify-center mb-4">
            <Star className="w-8 h-8 text-gray-500" />
          </div>
          <div className="text-gray-400 mb-2">还没有收藏的项目</div>
          <div className="text-sm text-gray-500">在筛选结果或项目列表中点击星标来收藏项目</div>
          <button
            onClick={() => navigate('/results')}
            className="mt-4 px-6 py-2 bg-accent-green rounded-lg hover:opacity-90 transition-opacity"
          >
            查看全部项目
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-gray-400 mb-4">共 {favoriteRecords.length} 个收藏项目</div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {favoriteRecords.map((record) => (
              <div
                key={record.id}
                onClick={() => handleViewRecord(record)}
                className="group bg-dark-800 rounded-xl p-4 border border-dark-700 hover:border-dark-600 cursor-pointer transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400 flex-shrink-0" />
                      <h3 className="font-medium truncate">{record.name}</h3>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-400">
                      <Clock className="w-3 h-3" />
                      {formatDate(record.date)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleRemoveFavorite(e, record.id)}
                      className="p-1.5 text-gray-400 hover:text-yellow-400 hover:bg-yellow-400/10 rounded-md transition-colors"
                      title="取消收藏"
                    >
                      <Star className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, record.id)}
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