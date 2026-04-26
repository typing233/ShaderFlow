import React, { useState } from 'react';
import { X, Link, Download, Code, Image, Video, Copy, Check, Loader2 } from 'lucide-react';
import { useAppStore } from '@/store';
import { 
  generateShareLink, 
  exportCodeToFile, 
  exportJSON,
  downloadScreenshot,
  downloadVideo 
} from '@/lib/exporter';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

interface ExportPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportPanel: React.FC<ExportPanelProps> = ({ isOpen, onClose }) => {
  const { shaderCode, uniforms } = useAppStore();
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  const handleGenerateLink = async () => {
    setIsGenerating(true);
    try {
      const link = await generateShareLink(shaderCode, uniforms);
      setGeneratedLink(link);
    } catch (error) {
      console.error('生成链接失败:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = async () => {
    if (generatedLink) {
      try {
        await navigator.clipboard.writeText(generatedLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error('复制失败:', error);
      }
    }
  };

  const handleExportCode = () => {
    exportCodeToFile(shaderCode, uniforms);
    onClose();
  };

  const handleExportJSON = () => {
    exportJSON(shaderCode, uniforms);
    onClose();
  };

  const handleScreenshot = async () => {
    const canvasRef = (window as any).shaderCanvasRef;
    if (canvasRef) {
      const canvas = canvasRef.getCanvas();
      if (canvas) {
        await downloadScreenshot(canvas);
        onClose();
      }
    }
  };

  const handleRecordVideo = async () => {
    const canvasRef = (window as any).shaderCanvasRef;
    if (canvasRef) {
      const canvas = canvasRef.getCanvas();
      if (canvas) {
        setIsGenerating(true);
        try {
          await downloadVideo(canvas, 5, 30);
        } finally {
          setIsGenerating(false);
          onClose();
        }
      }
    }
  };

  React.useEffect(() => {
    if (isOpen) {
      setGeneratedLink(null);
      setCopied(false);
    }
  }, [isOpen]);

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-200',
        isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      )}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div
        className={cn(
          'relative w-full max-w-md mx-4 bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl transition-transform duration-200',
          isOpen ? 'scale-100' : 'scale-95'
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-gray-200">分享 / 导出</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Link size={18} className="text-shader-400" />
              <h3 className="text-sm font-medium text-gray-200">分享链接</h3>
            </div>

            {!generatedLink ? (
              <button
                onClick={handleGenerateLink}
                disabled={isGenerating}
                className="w-full px-4 py-3 text-sm text-gray-200 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <><Loader2 size={16} className="animate-spin" /> 生成中...</>
                ) : (
                  <>生成分享链接</>
                )}
              </button>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={generatedLink}
                  readOnly
                  className="flex-1 px-3 py-2.5 text-xs text-gray-300 bg-gray-800 border border-gray-700 rounded-lg truncate font-mono"
                />
                <button
                  onClick={handleCopyLink}
                  className={cn(
                    'px-3 py-2.5 rounded-lg transition-colors flex items-center justify-center',
                    copied
                      ? 'bg-green-600/20 text-green-400'
                      : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700'
                  )}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-gray-800">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleExportCode}
                className="flex flex-col items-center gap-2 px-4 py-4 text-sm text-gray-300 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl transition-colors"
              >
                <Code size={24} className="text-shader-400" />
                <span>导出代码</span>
              </button>

              <button
                onClick={handleExportJSON}
                className="flex flex-col items-center gap-2 px-4 py-4 text-sm text-gray-300 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl transition-colors"
              >
                <Download size={24} className="text-blue-400" />
                <span>导出项目</span>
              </button>

              <button
                onClick={handleScreenshot}
                className="flex flex-col items-center gap-2 px-4 py-4 text-sm text-gray-300 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl transition-colors"
              >
                <Image size={24} className="text-purple-400" />
                <span>截图</span>
              </button>

              <button
                onClick={handleRecordVideo}
                disabled={isGenerating}
                className="flex flex-col items-center gap-2 px-4 py-4 text-sm text-gray-300 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl transition-colors disabled:opacity-50"
              >
                {isGenerating ? (
                  <Loader2 size={24} className="text-orange-400 animate-spin" />
                ) : (
                  <Video size={24} className="text-orange-400" />
                )}
                <span>录制视频</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportPanel;
