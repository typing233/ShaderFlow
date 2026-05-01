import React, { useState } from 'react';
import { useAppStore } from '../store/appStore';

export const LLMConfigPanel: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { llmConfig, updateLLMConfig, connectionStatus, connectionError, setConnectionStatus } = useAppStore();
  
  const [localConfig, setLocalConfig] = useState(llmConfig);

  const handleTestConnection = async () => {
    setConnectionStatus('testing');
    
    try {
      const response = await fetch('/api/llm/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(localConfig)
      });

      const data = await response.json();
      
      if (data.success) {
        updateLLMConfig(localConfig);
        setConnectionStatus('success');
        setTimeout(() => onClose(), 1000);
      } else {
        setConnectionStatus('error', data.error || 'Connection failed');
      }
    } catch (error) {
      setConnectionStatus('error', error instanceof Error ? error.message : 'Connection failed');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 bg-shader-gray rounded-xl shadow-2xl border border-shader-light/50">
        <div className="flex items-center justify-between px-6 py-4 border-b border-shader-light/30">
          <h2 className="text-lg font-semibold text-white">LLM API 配置</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-shader-light/30 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              API Base URL
            </label>
            <input
              type="text"
              value={localConfig.baseUrl}
              onChange={(e) => setLocalConfig({ ...localConfig, baseUrl: e.target.value })}
              placeholder="https://api.openai.com/v1"
              className="w-full px-4 py-2.5 bg-shader-dark border border-shader-light/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-shader-accent/70 focus:ring-1 focus:ring-shader-accent/50 transition-all"
            />
            <p className="mt-1 text-xs text-gray-500">支持 OpenAI 兼容格式的 API 端点</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              API Key
            </label>
            <input
              type="password"
              value={localConfig.apiKey}
              onChange={(e) => setLocalConfig({ ...localConfig, apiKey: e.target.value })}
              placeholder="sk-..."
              className="w-full px-4 py-2.5 bg-shader-dark border border-shader-light/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-shader-accent/70 focus:ring-1 focus:ring-shader-accent/50 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Model Name
            </label>
            <input
              type="text"
              value={localConfig.modelName}
              onChange={(e) => setLocalConfig({ ...localConfig, modelName: e.target.value })}
              placeholder="gpt-4, claude-3-opus, etc."
              className="w-full px-4 py-2.5 bg-shader-dark border border-shader-light/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-shader-accent/70 focus:ring-1 focus:ring-shader-accent/50 transition-all"
            />
          </div>

          {connectionStatus === 'error' && connectionError && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-sm text-red-400">{connectionError}</p>
            </div>
          )}

          {connectionStatus === 'success' && (
            <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <p className="text-sm text-green-400 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                连接成功！
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-shader-light/30">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-300 bg-shader-light/30 hover:bg-shader-light/50 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleTestConnection}
            disabled={connectionStatus === 'testing'}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-shader-accent hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {connectionStatus === 'testing' ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                测试中...
              </>
            ) : '测试并保存'}
          </button>
        </div>
      </div>
    </div>
  );
};
