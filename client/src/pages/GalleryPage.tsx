import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Images, LayoutGrid, Tag, Search, X, Sparkles,
  Settings2, Plus, Download, Trash2, Edit3, Save, FolderArchive,
} from 'lucide-react';
import JSZip from 'jszip';
import { useHistoryStore } from '../stores/historyStore';
import { useGalleryStore } from '../stores/galleryStore';
import { useTemplateStore, type TemplateConfig } from '../stores/templateStore';
import { getAllImagesGroupedByRecord } from '../utils/imageStorage';

interface GalleryImage {
  id: string;
  url: string;
  filename: string;
  recordId: string;
  recordName: string;
  template: string;
  confidence: number;
  finalScore?: number;
  finalLabel?: string;
  date: string;
}

export function GalleryPage() {
  const navigate = useNavigate();
  const { records } = useHistoryStore();
  const { activeTemplate, setActiveTemplate, searchQuery, setSearchQuery } = useGalleryStore();
  const { templates, addTemplate, updateTemplate, deleteTemplate, ensureTemplate } = useTemplateStore();
  const hasEnsuredRef = useRef<Set<string>>(new Set());

  const [imageMap, setImageMap] = useState<Record<string, { url: string; filename: string }[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Template manager form states
  const [editingTemplate, setEditingTemplate] = useState<TemplateConfig | null>(null);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDesc, setNewTemplateDesc] = useState('');

  // Load all images from IndexedDB (single scan, grouped by recordId)
  useEffect(() => {
    let cancelled = false;
    const loadAllImages = async () => {
      setLoading(true);
      try {
        const map = await getAllImagesGroupedByRecord();
        if (!cancelled) {
          setImageMap(map);
        }
      } catch {
        if (!cancelled) {
          setImageMap({});
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    loadAllImages();
    return () => { cancelled = true; };
  }, [records]);

  // Build gallery items from records
  const galleryItems = useMemo<GalleryImage[]>(() => {
    const items: GalleryImage[] = [];
    for (const record of records) {
      if (!record.structuredResults) continue;
      const images = imageMap[record.id] || [];
      for (const [indexStr, judgement] of Object.entries(record.structuredResults)) {
        const index = parseInt(indexStr);
        const img = images[index];
        if (!img) continue;
        // Ensure template exists in library
        const templateName = judgement.styleTemplate || '未分类';
        if (!hasEnsuredRef.current.has(templateName)) {
          ensureTemplate(templateName);
          hasEnsuredRef.current.add(templateName);
        }
        items.push({
          id: `${record.id}_${index}`,
          url: img.url,
          filename: img.filename,
          recordId: record.id,
          recordName: record.name,
          template: templateName,
          confidence: judgement.confidence || 0,
          finalScore: judgement.finalScore,
          finalLabel: judgement.finalLabel,
          date: record.date,
        });
      }
    }
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records, imageMap]);

  // Group by template
  const templateGroups = useMemo(() => {
    const groups = new Map<string, GalleryImage[]>();
    for (const item of galleryItems) {
      if (!groups.has(item.template)) {
        groups.set(item.template, []);
      }
      groups.get(item.template)!.push(item);
    }
    return groups;
  }, [galleryItems]);

  // Sort templates by template store order, then others
  const allTemplates = useMemo(() => {
    const templateNames = Array.from(templateGroups.keys());
    const ordered = templates
      .map((t) => t.name)
      .filter((n) => templateNames.includes(n));
    const others = templateNames
      .filter((n) => !ordered.includes(n))
      .sort((a, b) => a.localeCompare(b, 'zh-CN'));
    return [...ordered, ...others];
  }, [templateGroups, templates]);

  // Filter by active template and search
  const filteredItems = useMemo(() => {
    let items = galleryItems;
    if (activeTemplate !== 'all') {
      items = items.filter((item) => item.template === activeTemplate);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (item) =>
          item.filename.toLowerCase().includes(q) ||
          item.template.toLowerCase().includes(q) ||
          item.recordName.toLowerCase().includes(q)
      );
    }
    return items;
  }, [galleryItems, activeTemplate, searchQuery]);

  // Selection helpers
  const toggleSelect = (id: string) => {
    setSelectedImageIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const selectAllVisible = () => {
    const visibleIds = filteredItems.map((i) => i.id);
    const allSelected = visibleIds.every((id) => selectedImageIds.has(id));
    setSelectedImageIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        visibleIds.forEach((id) => next.delete(id));
      } else {
        visibleIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };
  const clearSelection = () => setSelectedImageIds(new Set());

  // Export selected images as ZIP
  const exportSelected = async () => {
    const selected = galleryItems.filter((item) => selectedImageIds.has(item.id));
    if (selected.length === 0) return;
    setExporting(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder('图库导出');
      if (!folder) return;

      for (const item of selected) {
        // Convert data URL to blob
        const res = await fetch(item.url);
        const blob = await res.blob();
        const safeName = item.filename.replace(/[^a-zA-Z0-9\u4e00-\u9fa5._-]/g, '_');
        folder.file(`${item.template}/${safeName}`, blob);
      }

      // Add report
      const report = selected
        .map((item) => [
          `【${item.filename}】`,
          `模板：${item.template}`,
          `置信度：${Math.round(item.confidence * 100)}%`,
          item.finalScore !== undefined ? `总分：${item.finalScore}` : '',
          item.finalLabel ? `标签：${item.finalLabel}` : '',
          `来源：${item.recordName}`,
        ].filter(Boolean).join(' | '))
        .join('\n');
      folder.file('导出报告.txt', report);

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `图库导出_${new Date().toLocaleDateString().replace(/\//g, '-')}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  // Export current template images
  const exportTemplate = async (templateName: string) => {
    const items = galleryItems.filter((item) => item.template === templateName);
    if (items.length === 0) return;
    setExporting(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder(templateName);
      if (!folder) return;

      for (const item of items) {
        const res = await fetch(item.url);
        const blob = await res.blob();
        const safeName = item.filename.replace(/[^a-zA-Z0-9\u4e00-\u9fa5._-]/g, '_');
        folder.file(safeName, blob);
      }

      const report = items
        .map((item) => [
          `【${item.filename}】`,
          `置信度：${Math.round(item.confidence * 100)}%`,
          item.finalScore !== undefined ? `总分：${item.finalScore}` : '',
          item.finalLabel ? `标签：${item.finalLabel}` : '',
        ].filter(Boolean).join(' | '))
        .join('\n');
      folder.file('分类报告.txt', report);

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${templateName}_${items.length}张_${new Date().toLocaleDateString().replace(/\//g, '-')}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  // Template manager handlers
  const handleAddTemplate = () => {
    const name = newTemplateName.trim();
    if (!name) return;
    const result = addTemplate(name, newTemplateDesc.trim());
    if (result) {
      setNewTemplateName('');
      setNewTemplateDesc('');
    } else {
      alert('模板名称已存在或无效');
    }
  };

  const handleUpdateTemplate = (id: string) => {
    if (!editingTemplate) return;
    const ok = updateTemplate(id, {
      name: editingTemplate.name,
      description: editingTemplate.description,
    });
    if (!ok) alert('更新失败：名称可能已存在');
    else setEditingTemplate(null);
  };

  const handleDeleteTemplate = (id: string) => {
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    if (t.isPredefined) {
      alert('预定义模板不能删除');
      return;
    }
    if (!confirm(`确定删除模板「${t.name}」吗？图库中已分类的图片不会删除，但模板标签会保留。`)) return;
    deleteTemplate(id);
  };

  const templateStats = useMemo(() => {
    const stats: Record<string, number> = {};
    for (const [template, items] of templateGroups) {
      stats[template] = items.length;
    }
    return stats;
  }, [templateGroups]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-2">分类图库</h1>
          <p className="text-gray-400">按模板主题自动分类，不匹配的模板会自动创建新主题</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTemplateManager(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-dark-700 bg-dark-800 hover:bg-dark-700 transition-all text-sm"
          >
            <Settings2 className="w-4 h-4 text-gray-400" />
            模板管理
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative group">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600 group-focus-within:text-accent-green transition-colors" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜索图片、模板或项目名称..."
          className="w-full pl-10 pr-10 py-3 bg-dark-900 rounded-lg border border-dark-700 text-white placeholder-gray-600 outline-none focus:border-accent-green focus:bg-dark-800 transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSelectionMode(!selectionMode);
              if (selectionMode) clearSelection();
            }}
            className={`px-3 py-2 rounded-lg text-sm transition-colors ${
              selectionMode
                ? 'bg-accent-green text-white'
                : 'bg-dark-800 text-gray-400 hover:text-white hover:bg-dark-700'
            }`}
          >
            {selectionMode ? '退出选择' : '批量选择'}
          </button>
          {selectionMode && (
            <>
              <button
                onClick={selectAllVisible}
                className="px-3 py-2 rounded-lg text-sm bg-dark-800 text-gray-400 hover:text-white hover:bg-dark-700 transition-colors"
              >
                全选/取消
              </button>
              <button
                onClick={clearSelection}
                className="px-3 py-2 rounded-lg text-sm bg-dark-800 text-gray-400 hover:text-white hover:bg-dark-700 transition-colors"
              >
                清空 ({selectedImageIds.size})
              </button>
              <button
                onClick={exportSelected}
                disabled={selectedImageIds.size === 0 || exporting}
                className="px-3 py-2 rounded-lg text-sm bg-accent-green text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                {exporting ? '打包中...' : `导出选中 (${selectedImageIds.size})`}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Template Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveTemplate('all')}
          className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
            activeTemplate === 'all'
              ? 'bg-accent-green text-white'
              : 'bg-dark-800 text-gray-400 hover:text-white hover:bg-dark-700 border border-dark-700'
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          全部
          <span className="text-xs opacity-70">({galleryItems.length})</span>
        </button>
        {allTemplates.map((template) => {
          const tConfig = templates.find((t) => t.name === template);
          const isAuto = tConfig?.autoCreated;
          const isPredefined = tConfig?.isPredefined;
          const isActive = activeTemplate === template;
          return (
            <button
              key={template}
              onClick={() => setActiveTemplate(template)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                isActive
                  ? 'bg-accent-green text-white'
                  : 'bg-dark-800 text-gray-400 hover:text-white hover:bg-dark-700 border border-dark-700'
              }`}
            >
              <Tag className="w-4 h-4" />
              {template}
              <span className="text-xs opacity-70">({templateStats[template] || 0})</span>
              {isAuto && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${isActive ? 'bg-white/20 text-white' : 'bg-yellow-500/20 text-yellow-300'}`}>
                  自动
                </span>
              )}
              {!isPredefined && !isAuto && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${isActive ? 'bg-white/20 text-white' : 'bg-blue-500/20 text-blue-300'}`}>
                  自定义
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Export current template button */}
      {activeTemplate !== 'all' && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportTemplate(activeTemplate)}
            disabled={exporting}
            className="px-4 py-2.5 rounded-lg border border-dark-700 bg-dark-800 hover:bg-dark-700 transition-all text-sm flex items-center gap-2"
          >
            <FolderArchive className="w-4 h-4 text-gray-400" />
            {exporting ? '打包中...' : `导出「${activeTemplate}」全部图片`}
          </button>
        </div>
      )}

      {/* Image Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-pulse text-gray-500 flex items-center gap-2">
            <Sparkles className="w-5 h-5 animate-spin text-accent-green" />
            正在加载图库...
          </div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-xl border border-dark-700 border-dashed p-16 text-center bg-dark-800">
          <div className="w-20 h-20 mx-auto rounded-xl bg-accent-green/5 flex items-center justify-center mb-5">
            <Images className="w-10 h-10 text-gray-600" />
          </div>
          <div className="text-gray-400 mb-2 font-medium">
            {galleryItems.length === 0 ? '图库为空' : '未找到匹配的图片'}
          </div>
          <div className="text-sm text-gray-600">
            {galleryItems.length === 0
              ? '先去「图片筛选」页面分析图片，分类结果将自动同步到这里'
              : '尝试更换搜索关键词或切换模板标签'}
          </div>
          {galleryItems.length === 0 && (
            <button
              onClick={() => navigate('/screening')}
              className="mt-6 px-6 py-3 bg-accent-green rounded-lg font-medium text-dark-950 hover:opacity-90 transition-opacity"
            >
              去筛选图片
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`group relative rounded-xl overflow-hidden border transition-all duration-200 cursor-pointer bg-dark-800 ${
                selectedImageIds.has(item.id)
                  ? 'border-accent-green'
                  : 'border-dark-700 hover:border-dark-600'
              }`}
            >
              {selectionMode && (
                <div
                  onClick={(e) => { e.stopPropagation(); toggleSelect(item.id); }}
                  className="absolute top-3 left-3 z-10"
                >
                  {selectedImageIds.has(item.id) ? (
                    <div className="w-6 h-6 rounded-md bg-accent-green flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-md border-2 border-gray-500 bg-dark-900" />
                  )}
                </div>
              )}
              <div
                onClick={() => {
                  if (selectionMode) toggleSelect(item.id);
                  else setSelectedImage(item);
                }}
                className="aspect-square bg-dark-900 overflow-hidden"
              >
                <img
                  src={item.url}
                  alt={item.filename}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-3">
                <div className="text-sm font-medium truncate text-gray-300">{item.filename}</div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[11px] px-2 py-0.5 bg-dark-700 rounded-md text-gray-500">
                    {item.template}
                  </span>
                  <span className="text-[11px] text-gray-600 font-medium">
                    {Math.round(item.confidence * 100)}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Image Detail Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="bg-dark-800 rounded-xl overflow-hidden max-w-3xl w-full max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-1 flex items-center justify-center bg-black/40 overflow-hidden min-h-0">
              <div className="w-full h-full p-4 flex items-center justify-center">
                <img
                  src={selectedImage.url}
                  alt={selectedImage.filename}
                  className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
                />
              </div>
            </div>
            <div className="p-6 border-t border-dark-700 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{selectedImage.filename}</h3>
                  <p className="text-sm text-gray-500 mt-1">来自：{selectedImage.recordName}</p>
                </div>
                <button
                  onClick={() => setSelectedImage(null)}
                  className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1.5 bg-accent-green/20 text-accent-green rounded-lg text-sm">
                  模板：{selectedImage.template}
                </span>
                <span className="px-3 py-1.5 bg-dark-700 rounded-lg text-sm text-gray-400">
                  置信度：{Math.round(selectedImage.confidence * 100)}%
                </span>
                {selectedImage.finalScore !== undefined && (
                  <span className="px-3 py-1.5 bg-dark-700 rounded-lg text-sm text-gray-400">
                    总分：{selectedImage.finalScore}
                  </span>
                )}
                {selectedImage.finalLabel && (
                  <span className="px-3 py-1.5 bg-dark-700 rounded-lg text-sm text-gray-400">
                    标签：{selectedImage.finalLabel}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={async () => {
                    const res = await fetch(selectedImage.url);
                    const blob = await res.blob();
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = selectedImage.filename;
                    a.click();
                    URL.revokeObjectURL(a.href);
                  }}
                  className="px-4 py-2 bg-dark-700 rounded-lg text-sm hover:bg-dark-600 transition-colors flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  下载原图
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Template Manager Modal */}
      {showTemplateManager && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setShowTemplateManager(false)}
        >
          <div
            className="bg-dark-800 rounded-xl w-full max-w-lg max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-dark-700 flex items-center justify-between">
              <h2 className="text-xl font-bold">模板管理</h2>
              <button
                onClick={() => setShowTemplateManager(false)}
                className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6 space-y-6">
              {/* Add new template */}
              <div className="bg-dark-700/50 rounded-xl p-4 space-y-3">
                <h3 className="font-medium flex items-center gap-2">
                  <Plus className="w-4 h-4 text-accent-green" />
                  新建模板
                </h3>
                <input
                  type="text"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder="模板名称"
                  className="w-full px-3 py-2 bg-dark-800 rounded-lg border border-dark-600 text-white placeholder-gray-500 outline-none focus:border-accent-green text-sm"
                />
                <input
                  type="text"
                  value={newTemplateDesc}
                  onChange={(e) => setNewTemplateDesc(e.target.value)}
                  placeholder="描述（可选）"
                  className="w-full px-3 py-2 bg-dark-800 rounded-lg border border-dark-600 text-white placeholder-gray-500 outline-none focus:border-accent-green text-sm"
                />
                <button
                  onClick={handleAddTemplate}
                  disabled={!newTemplateName.trim()}
                  className="px-4 py-2 bg-accent-green rounded-lg text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  添加模板
                </button>
              </div>

              {/* Template list */}
              <div className="space-y-2">
                <h3 className="font-medium text-sm text-gray-400">已有模板 ({templates.length}个)</h3>
                {templates.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center gap-3 p-3 bg-dark-700/50 rounded-lg"
                  >
                    {editingTemplate?.id === t.id ? (
                      <div className="flex-1 space-y-2">
                        <input
                          type="text"
                          value={editingTemplate.name}
                          onChange={(e) =>
                            setEditingTemplate({ ...editingTemplate, name: e.target.value })
                          }
                          className="w-full px-3 py-1.5 bg-dark-800 rounded-lg border border-dark-600 text-white outline-none focus:border-accent-green text-sm"
                        />
                        <input
                          type="text"
                          value={editingTemplate.description}
                          onChange={(e) =>
                            setEditingTemplate({ ...editingTemplate, description: e.target.value })
                          }
                          className="w-full px-3 py-1.5 bg-dark-800 rounded-lg border border-dark-600 text-white outline-none focus:border-accent-green text-sm"
                        />
                      </div>
                    ) : (
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{t.name}</span>
                          {t.isPredefined && (
                            <span className="text-[10px] bg-dark-600 text-gray-400 px-1.5 py-0.5 rounded">
                              预定义
                            </span>
                          )}
                          {t.autoCreated && (
                            <span className="text-[10px] bg-yellow-500/20 text-yellow-300 px-1.5 py-0.5 rounded">
                              自动
                            </span>
                          )}
                          {!t.isPredefined && !t.autoCreated && (
                            <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded">
                              自定义
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5 truncate">{t.description}</div>
                      </div>
                    )}

                    <div className="flex items-center gap-1">
                      {editingTemplate?.id === t.id ? (
                        <button
                          onClick={() => handleUpdateTemplate(t.id)}
                          className="p-1.5 text-accent-green hover:bg-accent-green/10 rounded-md transition-colors"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => setEditingTemplate({ ...t })}
                          disabled={t.isPredefined}
                          className="p-1.5 text-gray-400 hover:text-white hover:bg-dark-600 rounded-md transition-colors disabled:opacity-30"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteTemplate(t.id)}
                        disabled={t.isPredefined}
                        className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors disabled:opacity-30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
