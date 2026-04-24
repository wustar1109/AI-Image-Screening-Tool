import { useState, useCallback, useRef } from 'react';
import { Upload, Download, Image as ImageIcon, X, Loader2, Check } from 'lucide-react';

type ImageFormat = 'jpeg' | 'png' | 'webp';

interface ProcessedImage {
  originalName: string;
  processedUrl: string;
  originalSize: number;
  newSize: number;
}

export function BatchEditPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedImages, setProcessedImages] = useState<ProcessedImage[]>([]);
  const [resizeWidth, setResizeWidth] = useState(1920);
  const [resizeHeight, setResizeHeight] = useState(1080);
  const [maintainAspect, setMaintainAspect] = useState(true);
  const [dragActive, setDragActive] = useState(false);
  const [format, setFormat] = useState<ImageFormat>('jpeg');
  const [quality, setQuality] = useState(85);
  const [processedUrls, setProcessedUrls] = useState<string[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      (file) => file.type.startsWith('image/')
    );
    addFiles(droppedFiles);
  }, [files]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files));
    }
  };

  const addFiles = (newFiles: File[]) => {
    const imageFiles = newFiles.filter((file) => file.type.startsWith('image/'));
    setFiles((prev) => [...prev, ...imageFiles]);
    setPreviews((prev) => [
      ...prev,
      ...imageFiles.map((file) => URL.createObjectURL(file)),
    ]);
    setProcessedImages([]);
    setProcessedUrls([]);
  };

  const removeFile = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
    setProcessedImages([]);
    setProcessedUrls([]);
  };

  const processImage = async (
    file: File,
    targetWidth: number,
    targetHeight: number,
    maintainRatio: boolean,
    outputFormat: ImageFormat,
    outputQuality: number
  ): Promise<{ blob: Blob; width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        let finalWidth = targetWidth;
        let finalHeight = targetHeight;

        if (maintainRatio) {
          const aspectRatio = img.width / img.height;
          const targetAspect = targetWidth / targetHeight;

          if (aspectRatio > targetAspect) {
            finalHeight = Math.round(targetWidth / aspectRatio);
          } else {
            finalWidth = Math.round(targetHeight * aspectRatio);
          }
        }

        canvas.width = finalWidth;
        canvas.height = finalHeight;

        ctx.drawImage(img, 0, 0, finalWidth, finalHeight);

        const mimeType = `image/${outputFormat}`;
        const qualityValue = outputFormat === 'png' ? undefined : outputQuality / 100;

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve({ blob, width: finalWidth, height: finalHeight });
            } else {
              reject(new Error('Failed to create blob'));
            }
          },
          mimeType,
          qualityValue
        );
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  };

  const handleProcess = async () => {
    if (files.length === 0) return;

    setIsProcessing(true);
    setProcessedImages([]);
    setProcessedUrls([]);

    const results: ProcessedImage[] = [];
    const urls: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const { blob } = await processImage(
            file,
            resizeWidth,
            resizeHeight,
            maintainAspect,
            format,
            quality
          );

          const processedUrl = URL.createObjectURL(blob);
          urls.push(processedUrl);

          results.push({
            originalName: file.name,
            processedUrl,
            originalSize: file.size,
            newSize: blob.size,
          });
        } catch (err) {
          console.error(`Failed to process ${file.name}:`, err);
        }
      }

      setProcessedImages(results);
      setProcessedUrls(urls);
    } catch (error) {
      console.error('Processing failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = (index: number) => {
    if (processedUrls[index]) {
      const link = document.createElement('a');
      link.href = processedUrls[index];
      const ext = format === 'jpeg' ? 'jpg' : format;
      const baseName = files[index]?.name.replace(/\.[^/.]+$/, '') || 'image';
      link.download = `${baseName}_${resizeWidth}x${resizeHeight}.${ext}`;
      link.click();
    }
  };

  const handleDownloadAll = () => {
    processedUrls.forEach((url, index) => {
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = url;
        const ext = format === 'jpeg' ? 'jpg' : format;
        const baseName = files[index]?.name.replace(/\.[^/.]+$/, '') || 'image';
        link.download = `${baseName}_${resizeWidth}x${resizeHeight}.${ext}`;
        link.click();
      }, index * 200);
    });
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">批量修图</h1>
        <p className="text-gray-400">批量调整图片尺寸和格式</p>
      </div>

      <canvas ref={canvasRef} className="hidden" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="relative border-2 border-dashed rounded-xl p-8 text-center transition-colors bg-dark-800">
            <div
              onDragEnter={() => setDragActive(true)}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setDragActive(false);
                }
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className={`relative z-10 cursor-pointer ${
                dragActive ? 'border-accent-green bg-accent-green/5' : 'border-dark-600 hover:border-dark-500'
              }`}
            >
              <Upload className="w-12 h-12 mx-auto text-gray-500 mb-4" />
              <div className="text-lg font-medium mb-2">拖拽图片到此处</div>
              <div className="text-sm text-gray-400">支持批量选择</div>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
          </div>

          {previews.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-400">已选择 {files.length} 张图片</span>
                <button
                  onClick={() => {
                    previews.forEach(URL.revokeObjectURL);
                    processedUrls.forEach(URL.revokeObjectURL);
                    setFiles([]);
                    setPreviews([]);
                    setProcessedImages([]);
                    setProcessedUrls([]);
                  }}
                  className="text-sm text-red-400 hover:text-red-300"
                >
                  清空
                </button>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {previews.map((preview, index) => (
                  <div key={preview} className="relative group">
                    <img
                      src={preview}
                      alt=""
                      className="w-full aspect-square object-cover rounded-lg"
                    />
                    {processedUrls[index] && (
                      <div className="absolute top-1 left-1 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <button
                      onClick={() => removeFile(index)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {processedImages.length > 0 && (
                <div className="mt-4 p-4 bg-dark-800 rounded-lg">
                  <div className="text-sm font-medium mb-2">处理结果</div>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {processedImages.map((img, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span className="truncate flex-1 mr-2">{img.originalName}</span>
                        <span className="text-gray-400">
                          {formatSize(img.originalSize)} → {formatSize(img.newSize)}
                        </span>
                        <button
                          onClick={() => handleDownload(index)}
                          className="ml-2 text-accent-green hover:underline"
                        >
                          下载
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-dark-800 rounded-xl p-6 border border-dark-700 h-fit">
          <h3 className="font-semibold mb-4">调整设置</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">宽度 (px)</label>
              <input
                type="number"
                value={resizeWidth}
                onChange={(e) => setResizeWidth(Number(e.target.value))}
                className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">高度 (px)</label>
              <input
                type="number"
                value={resizeHeight}
                onChange={(e) => setResizeHeight(Number(e.target.value))}
                disabled={maintainAspect}
                className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 disabled:opacity-50"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={maintainAspect}
                onChange={(e) => setMaintainAspect(e.target.checked)}
                className="w-4 h-4 rounded border-dark-600 bg-dark-700"
              />
              <span className="text-sm">保持宽高比</span>
            </label>

            <div>
              <label className="block text-sm text-gray-400 mb-2">输出格式</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as ImageFormat)}
                className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2"
              >
                <option value="jpeg">JPEG</option>
                <option value="png">PNG</option>
                <option value="webp">WebP</option>
              </select>
            </div>

            {format !== 'png' && (
              <div>
                <label className="block text-sm text-gray-400 mb-2">质量 ({quality}%)</label>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            )}
          </div>

          <button
            onClick={handleProcess}
            disabled={files.length === 0 || isProcessing}
            className="w-full mt-6 py-3 bg-accent-green rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                处理中...
              </>
            ) : (
              <>
                <ImageIcon className="w-5 h-5" />
                开始处理
              </>
            )}
          </button>

          {!isProcessing && processedUrls.length > 0 && (
            <button
              onClick={handleDownloadAll}
              className="w-full mt-3 py-3 bg-dark-700 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-dark-600 transition-colors"
            >
              <Download className="w-5 h-5" />
              下载全部 ({processedUrls.length})
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
