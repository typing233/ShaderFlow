import React, { useState } from 'react';
import { X, Key, Globe, Code, Eye, EyeOff, Zap, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useAppStore } from '@/store';
import { testConnection } from '@/lib/deepseek';
import { cn } from '@/lib/cn';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose }) => {
  const { settings, updateSettings, connectionStatus, connectionError, setConnectionStatus } = useAppStore();
  const [showApiKey, setShowApiKey] = useState(false);
  const [tempSettings, setTempSettings] = useState(settings);
  const [hasChanges, setHasChanges] = useState(false);

  const handleChange = (field: keyof typeof settings, value: string) => {
    setTempSettings((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleTestConnection = async () => {
    if (!tempSettings.apiKey) {
      return;
    }
    
    setConnectionStatus('testing');
    
    const result = await testConnection(
      tempSettings.apiKey,
      tempSettings.baseUrl,
      tempSettings.model
    );
    
    if (result.success) {
      setConnectionStatus('success');
      updateSettings(tempSettings);
    } else {
      setConnectionStatus('error', result.error);
    }
  };

  const handleSave = () => {
    updateSettings(tempSettings);
    onClose();
  };

  const handleCancel = () => {
    setTempSettings(settings);
    setHasChanges(false);
    setConnectionStatus('idle');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleCancel} />

      <div className="relative w-full max-w-lg mx-4 bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-gray-200">设置</h2>
          <button
            onClick={handleCancel}
            className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Key size={18} className="text-shader-400" />
              <h3 className="text-sm font-medium text-gray-200">API 配置</h3>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-gray-400">API Key</label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={tempSettings.apiKey}
                    onChange={(e) => handleChange('apiKey', e.target.value)}
                    placeholder="sk-..."
                    className="w-full px-4 py-3 pr-12 text-sm text-gray-200 bg-gray-800 border border-gray-700 rounded-xl focus:outline-none focus:border-shader-500 placeholder-gray-500 font-mono transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-200 transition-colors"
                  >
                    {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  支持 OpenAI 兼容格式的 API，如 Deepseek、OpenAI、Claude 等
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-400 flex items-center gap-2">
                  <Globe size={14} />
                  API 地址 (Base URL)
                </label>
                <input
                  type="text"
                  value={tempSettings.baseUrl}
                  onChange={(e) => handleChange('baseUrl', e.target.value)}
                  placeholder="https://api.deepseek.com"
                  className="w-full px-4 py-3 text-sm text-gray-200 bg-gray-800 border border-gray-700 rounded-xl focus:outline-none focus:border-shader-500 placeholder-gray-500 transition-colors"
                />
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'Deepseek', url: 'https://api.deepseek.com' },
                    { label: 'OpenAI', url: 'https://api.openai.com' },
                    { label: 'SiliconFlow', url: 'https://api.siliconflow.cn' },
                  ].map((item) => (
                    <button
                      key={item.label}
                      onClick={() => handleChange('baseUrl', item.url)}
                      className="px-2 py-1 text-xs text-gray-400 hover:text-shader-400 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-400 flex items-center gap-2">
                  <Code size={14} />
                  模型名称
                </label>
                <input
                  type="text"
                  value={tempSettings.model}
                  onChange={(e) => handleChange('model', e.target.value)}
                  placeholder="deepseek-coder, gpt-4, claude-sonnet-4-20250514 等"
                  className="w-full px-4 py-3 text-sm text-gray-200 bg-gray-800 border border-gray-700 rounded-xl focus:outline-none focus:border-shader-500 placeholder-gray-500 transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Zap size={18} className="text-shader-400" />
              <h3 className="text-sm font-medium text-gray-200">连接测试</h3>
            </div>
            
            <button
              onClick={handleTestConnection}
              disabled={connectionStatus === 'testing' || !tempSettings.apiKey}
              className={cn(
                'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all',
                connectionStatus === 'testing' || !tempSettings.apiKey
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  : 'bg-shader-500/20 text-shader-400 hover:bg-shader-500/30 border border-shader-500/30'
              )}
            >
              {connectionStatus === 'testing' ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>测试连接中...</span>
                </>
              ) : (
                <>
                  <Zap size={18} />
                  <span>测试 API 连接</span>
                </>
              )}
            </button>

            {connectionStatus === 'success' && (
              <div className="flex items-center gap-2 px-4 py-3 bg-green-500/10 border border-green-500/30 rounded-xl">
                <CheckCircle size={18} className="text-green-500" />
                <span className="text-sm text-green-400">连接成功！API 配置正确</span>
              </div>
            )}

            {connectionStatus === 'error' && connectionError && (
              <div className="flex items-start gap-2 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-sm text-red-400 font-medium">连接失败</span>
                  <p className="text-xs text-red-400/70 mt-1">{connectionError}</p>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-gray-800">
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={handleCancel}
                className="flex-1 px-4 py-2.5 text-sm text-gray-300 bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                className={cn(
                  'flex-1 px-4 py-2.5 text-sm font-medium rounded-xl transition-colors',
                  hasChanges
                    ? 'bg-shader-500 hover:bg-shader-400 text-white'
                    : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                )}
                disabled={!hasChanges}
              >
                保存设置
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
