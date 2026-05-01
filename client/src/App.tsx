import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppStore } from './store/appStore';
import { parseShaderParams } from './utils/shaderParser';
import { generateShader, GenerateStreamHandler } from './services/llmService';
import { LLMConfigPanel } from './components/LLMConfigPanel';
import { CodeEditor } from './components/CodeEditor';
import { ParamControls } from './components/ParamControls';
import { MixerPanel } from './components/MixerPanel';
import { ShaderCanvas } from './components/ShaderCanvas';

type ActiveTab = 'params' | 'mixer' | 'code';

export const App: React.FC = () => {
  const {
    llmConfig,
    shaderSlots,
    activeSlotId,
    mixerConfig,
    isGenerating,
    currentPrompt,
    updateLLMConfig,
    addShaderSlot,
    removeShaderSlot,
    updateShaderSlot,
    setActiveSlot,
    updateParamValue,
    updateMixerConfig,
    setGenerating,
    setCurrentPrompt
  } = useAppStore();

  const [showLLMConfig, setShowLLMConfig] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('params');
  const [inputPrompt, setInputPrompt] = useState('');
  const [generationError, setGenerationError] = useState<string | null>(null);

  const activeSlot = useMemo(() => {
    return shaderSlots.find(s => s.id === activeSlotId) || shaderSlots[0] || null;
  }, [shaderSlots, activeSlotId]);

  const handleGenerate = useCallback(async () => {
    if (!inputPrompt.trim() || !activeSlot || isGenerating) return;

    if (!llmConfig.apiKey) {
      setShowLLMConfig(true);
      return;
    }

    setGenerating(true);
    setCurrentPrompt(inputPrompt);
    updateShaderSlot(activeSlot.id, { isGenerating: true, code: '' });
    setGenerationError(null);

    let accumulatedCode = '';

    const handlers: GenerateStreamHandler = {
      onChunk: (content: string) => {
        accumulatedCode += content;
        updateShaderSlot(activeSlot.id, { code: accumulatedCode });
      },
      onComplete: () => {
        const params = parseShaderParams(accumulatedCode);
        updateShaderSlot(activeSlot.id, { 
          isGenerating: false, 
          code: accumulatedCode,
          params 
        });
        setGenerating(false);
      },
      onError: (error: string) => {
        setGenerationError(error);
        setGenerating(false);
        updateShaderSlot(activeSlot.id, { isGenerating: false });
      }
    };

    await generateShader(inputPrompt, llmConfig, handlers);
  }, [inputPrompt, activeSlot, isGenerating, llmConfig, setGenerating, setCurrentPrompt, updateShaderSlot]);

  const handleCodeChange = useCallback((code: string) => {
    if (!activeSlot) return;
    updateShaderSlot(activeSlot.id, { code });
  }, [activeSlot, updateShaderSlot]);

  const handleParseParams = useCallback(() => {
    if (!activeSlot) return;
    const params = parseShaderParams(activeSlot.code);
    updateShaderSlot(activeSlot.id, { params });
  }, [activeSlot, updateShaderSlot]);

  const handleParamChange = useCallback((paramName: string, value: any) => {
    if (!activeSlot) return;
    updateParamValue(activeSlot.id, paramName, value);
  }, [activeSlot, updateParamValue]);

  const handleToggleMask = useCallback((slotId: string, isMask: boolean) => {
    shaderSlots.forEach(slot => {
      updateShaderSlot(slot.id, { isMask: slot.id === slotId ? isMask : false });
    });
  }, [shaderSlots, updateShaderSlot]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleGenerate();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleGenerate]);

  return (
    <div className="h-screen w-screen flex flex-col bg-shader-dark overflow-hidden">
      <header className="h-14 flex items-center justify-between px-4 bg-shader-gray/80 border-b border-shader-light/30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-shader-accent to-shader-cyan flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-white tracking-tight">ShaderFlow</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLLMConfig(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-300 hover:text-white hover:bg-shader-light/30 rounded-lg transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>LLM 设置</span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-64 flex flex-col bg-shader-gray/50 border-r border-shader-light/30">
          <div className="p-3 border-b border-shader-light/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">效果</span>
              <button
                onClick={addShaderSlot}
                className="p-1 hover:bg-shader-light/30 rounded transition-colors"
                title="添加新效果"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {shaderSlots.map((slot, index) => (
              <div
                key={slot.id}
                className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
                  slot.id === activeSlotId
                    ? 'bg-shader-accent/20 border border-shader-accent/40'
                    : 'hover:bg-shader-light/20 border border-transparent'
                }`}
                onClick={() => setActiveSlot(slot.id)}
              >
                <div className={`w-2 h-2 rounded-full ${
                  slot.isGenerating 
                    ? 'bg-yellow-500 animate-pulse' 
                    : slot.isMask 
                      ? 'bg-shader-cyan'
                      : slot.id === activeSlotId 
                        ? 'bg-shader-accent' 
                        : 'bg-gray-600'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm truncate ${
                    slot.id === activeSlotId ? 'text-white' : 'text-gray-300'
                  }`}>
                    {slot.name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {slot.params.length} 个参数
                  </p>
                </div>
                {shaderSlots.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeShaderSlot(slot.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-all"
                    title="删除效果"
                  >
                    <svg className="w-3.5 h-3.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="p-3 bg-shader-gray/30 border-b border-shader-light/20">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.metaKey || e.ctrlKey) && handleGenerate()}
                placeholder="描述你想要的效果，例如：紫色旋涡带发光粒子..."
                disabled={isGenerating}
                className="flex-1 px-4 py-2.5 bg-shader-dark border border-shader-light/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-shader-accent/70 focus:ring-1 focus:ring-shader-accent/50 transition-all disabled:opacity-50"
              />
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !inputPrompt.trim()}
                className="px-5 py-2.5 bg-gradient-to-r from-shader-accent to-purple-600 hover:from-purple-600 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all flex items-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>生成中...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>生成</span>
                  </>
                )}
              </button>
            </div>
            
            {generationError && (
              <div className="mt-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-sm text-red-400">生成错误: {generationError}</p>
              </div>
            )}
          </div>

          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 relative">
              {activeSlot && <ShaderCanvas slots={shaderSlots} mixerConfig={mixerConfig} />}
            </div>

            <div className="w-80 flex flex-col bg-shader-gray/50 border-l border-shader-light/30">
              <div className="flex border-b border-shader-light/30">
                {[
                  { id: 'params' as ActiveTab, label: '参数', icon: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4' },
                  { id: 'mixer' as ActiveTab, label: '混合器', icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4' },
                  { id: 'code' as ActiveTab, label: '代码', icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm transition-all ${
                      activeTab === tab.id
                        ? 'text-shader-accent border-b-2 border-shader-accent'
                        : 'text-gray-400 hover:text-gray-300'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={tab.icon} />
                    </svg>
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto">
                {activeTab === 'params' && activeSlot && (
                  <div className="p-4">
                    <ParamControls
                      slot={activeSlot}
                      onParamChange={handleParamChange}
                    />
                    
                    {activeSlot.code && (
                      <button
                        onClick={handleParseParams}
                        className="w-full mt-4 px-4 py-2 text-sm text-gray-300 bg-shader-light/30 hover:bg-shader-light/50 rounded-lg transition-colors"
                      >
                        重新解析参数
                      </button>
                    )}
                  </div>
                )}

                {activeTab === 'mixer' && (
                  <div className="p-4">
                    <MixerPanel
                      slots={shaderSlots}
                      mixerConfig={mixerConfig}
                      onConfigChange={updateMixerConfig}
                      onToggleMask={handleToggleMask}
                    />
                  </div>
                )}

                {activeTab === 'code' && activeSlot && (
                  <div className="h-full">
                    <CodeEditor
                      code={activeSlot.code}
                      onChange={handleCodeChange}
                      isGenerating={activeSlot.isGenerating}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      <LLMConfigPanel
        isOpen={showLLMConfig}
        onClose={() => setShowLLMConfig(false)}
      />
    </div>
  );
};
