import React, { useState, useEffect } from 'react';
import { Play, Pause, Code2, Sliders, Sparkles, Share2, Settings, Zap } from 'lucide-react';
import { useAppStore } from '@/store';
import { parseShareLink } from '@/lib/exporter';
import { ShaderCanvas } from '@/components/ShaderCanvas';
import { CodeEditor } from '@/components/CodeEditor';
import { UniformControl } from '@/components/UniformControl';
import { AIPanel } from '@/components/AIPanel';
import { SettingsPanel } from '@/components/SettingsPanel';
import { ExportPanel } from '@/components/ExportPanel';
import { cn } from '@/lib/cn';

type ActivePanel = 'code' | 'controls' | 'ai' | null;

function App() {
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const { preview, updatePreview, setShaderCode, setUniforms } = useAppStore();

  useEffect(() => {
    const sharedData = parseShareLink();
    if (sharedData) {
      if (sharedData.shaderCode) {
        setShaderCode(sharedData.shaderCode);
      }
      if (sharedData.uniforms && sharedData.uniforms.length > 0) {
        setUniforms(sharedData.uniforms);
      }
    }
  }, [setShaderCode, setUniforms]);

  const togglePanel = (panel: ActivePanel) => {
    setActivePanel(activePanel === panel ? null : panel);
  };

  const togglePlay = () => {
    updatePreview({ isPlaying: !preview.isPlaying });
  };

  return (
    <div className="h-screen w-screen bg-gray-950 flex flex-col overflow-hidden">
      <header className="h-14 px-4 flex items-center justify-between border-b border-gray-800 bg-gray-900/90 backdrop-blur-sm z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-shader-500 to-shader-600 flex items-center justify-center">
            <Zap size={18} className="text-white" />
          </div>
          <h1 className="text-lg font-bold text-gray-100">ShaderFlow</h1>
          <span className="px-2 py-0.5 text-xs bg-shader-900/50 text-shader-400 rounded-full border border-shader-800">
            Beta
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={togglePlay}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors',
              preview.isPlaying
                ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                : 'bg-shader-500/20 text-shader-400 hover:bg-shader-500/30 border border-shader-500/30'
            )}
          >
            {preview.isPlaying ? <Pause size={16} /> : <Play size={16} />}
            <span className="hidden sm:inline">{preview.isPlaying ? '暂停' : '播放'}</span>
          </button>

          <div className="h-6 w-px bg-gray-700 mx-1" />

          <button
            onClick={() => togglePanel('ai')}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors',
              activePanel === 'ai'
                ? 'bg-shader-500/20 text-shader-400 border border-shader-500/30'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            )}
          >
            <Sparkles size={16} />
            <span className="hidden sm:inline">AI 生成</span>
          </button>

          <button
            onClick={() => togglePanel('code')}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors',
              activePanel === 'code'
                ? 'bg-shader-500/20 text-shader-400 border border-shader-500/30'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            )}
          >
            <Code2 size={16} />
            <span className="hidden sm:inline">代码</span>
          </button>

          <button
            onClick={() => togglePanel('controls')}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors',
              activePanel === 'controls'
                ? 'bg-shader-500/20 text-shader-400 border border-shader-500/30'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            )}
          >
            <Sliders size={16} />
            <span className="hidden sm:inline">参数</span>
          </button>

          <div className="h-6 w-px bg-gray-700 mx-1" />

          <button
            onClick={() => setIsExportOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
          >
            <Share2 size={16} />
            <span className="hidden sm:inline">分享</span>
          </button>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-2 p-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
            title="设置"
          >
            <Settings size={16} />
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <main
          className={cn(
            'flex-1 relative transition-all duration-300',
            activePanel && 'hidden md:block'
          )}
        >
          <ShaderCanvas className="w-full h-full" />
          
          {!preview.isPlaying && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-gray-900/80 backdrop-blur-sm rounded-lg border border-gray-700">
              <span className="text-sm text-gray-400">已暂停</span>
            </div>
          )}

          <div className="absolute bottom-4 right-4 flex items-center gap-2 text-xs text-gray-500">
            <span className="font-mono">
              {preview.resolution.width} × {preview.resolution.height}
            </span>
            <span className="w-1 h-1 rounded-full bg-gray-600" />
            <span className="font-mono">
              t = {preview.time.toFixed(2)}s
            </span>
          </div>
        </main>

        {activePanel && (
          <aside className="w-full md:w-96 lg:w-[420px] bg-gray-900/95 border-l border-gray-800 flex flex-col overflow-hidden">
            {activePanel === 'code' && (
              <CodeEditor className="flex-1" />
            )}
            {activePanel === 'controls' && (
              <UniformControl className="flex-1 overflow-y-auto" />
            )}
            {activePanel === 'ai' && (
              <AIPanel
                className="flex-1"
                onOpenSettings={() => setIsSettingsOpen(true)}
              />
            )}
          </aside>
        )}
      </div>

      {!activePanel && (
        <div className="md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-gray-900/90 backdrop-blur-sm rounded-2xl p-1.5 border border-gray-800 shadow-xl">
          <button
            onClick={() => togglePanel('ai')}
            className={cn(
              'flex flex-col items-center gap-1 px-4 py-2 rounded-xl text-xs transition-colors',
              activePanel === 'ai'
                ? 'bg-shader-500/20 text-shader-400'
                : 'text-gray-400 hover:text-gray-200'
            )}
          >
            <Sparkles size={20} />
            <span>AI</span>
          </button>
          <button
            onClick={() => togglePanel('code')}
            className={cn(
              'flex flex-col items-center gap-1 px-4 py-2 rounded-xl text-xs transition-colors',
              activePanel === 'code'
                ? 'bg-shader-500/20 text-shader-400'
                : 'text-gray-400 hover:text-gray-200'
            )}
          >
            <Code2 size={20} />
            <span>代码</span>
          </button>
          <button
            onClick={() => togglePanel('controls')}
            className={cn(
              'flex flex-col items-center gap-1 px-4 py-2 rounded-xl text-xs transition-colors',
              activePanel === 'controls'
                ? 'bg-shader-500/20 text-shader-400'
                : 'text-gray-400 hover:text-gray-200'
            )}
          >
            <Sliders size={20} />
            <span>参数</span>
          </button>
        </div>
      )}

      <SettingsPanel isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <ExportPanel isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} />
    </div>
  );
}

export default App;
