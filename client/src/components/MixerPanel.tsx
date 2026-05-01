import React from 'react';
import { ShaderSlot, MixerConfig } from '../types';

interface MixerPanelProps {
  slots: ShaderSlot[];
  mixerConfig: MixerConfig;
  onConfigChange: (config: Partial<MixerConfig>) => void;
  onToggleMask: (slotId: string, isMask: boolean) => void;
}

export const MixerPanel: React.FC<MixerPanelProps> = ({
  slots,
  mixerConfig,
  onConfigChange,
  onToggleMask
}) => {
  if (slots.length < 2) {
    return (
      <div className="p-4 text-center text-gray-500 text-sm">
        <div className="mb-2">
          <svg className="w-8 h-8 mx-auto text-gray-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 14v6m-3-3h6M6 10h2a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2zm10 0h2a2 2 0 002-2V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 002 2zM6 20h2a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2z" />
          </svg>
        </div>
        添加至少 2 个效果以启用混合
      </div>
    );
  }

  const blendPercentage = Math.round(mixerConfig.blendAmount * 100);

  return (
    <div className="space-y-4">
      <div className="p-3 bg-shader-dark/50 rounded-lg">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-300">混合比例</span>
            <span className="text-sm text-shader-accent font-mono">{blendPercentage}%</span>
          </div>
          
          <div className="relative flex items-center gap-3">
            <span className="text-xs text-gray-500 w-16 truncate">{slots[0]?.name || 'Effect 1'}</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={mixerConfig.blendAmount}
              onChange={(e) => onConfigChange({ blendAmount: parseFloat(e.target.value) })}
              className="flex-1"
            />
            <span className="text-xs text-gray-500 w-16 truncate text-right">{slots[1]?.name || 'Effect 2'}</span>
          </div>
          
          <div className="flex justify-between text-xs text-gray-600">
            <span>← 第一个</span>
            <span>第二个 →</span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-300">蒙版效果</label>
        <div className="space-y-1">
          {slots.map((slot) => (
            <button
              key={slot.id}
              onClick={() => {
                const isCurrentlyMask = slot.isMask;
                onToggleMask(slot.id, !isCurrentlyMask);
                if (!isCurrentlyMask) {
                  onConfigChange({ maskSlot: slot.id });
                } else {
                  onConfigChange({ maskSlot: null });
                }
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all ${
                slot.isMask
                  ? 'bg-shader-accent/20 border border-shader-accent/50'
                  : 'bg-shader-dark/50 border border-shader-light/30 hover:border-shader-light/50'
              }`}
            >
              <div className="flex items-center gap-2">
                {slot.isMask && (
                  <svg className="w-4 h-4 text-shader-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                <span className={`text-sm ${slot.isMask ? 'text-shader-accent' : 'text-gray-400'}`}>
                  {slot.name}
                </span>
              </div>
              <span className="text-xs text-gray-500">
                {slot.isMask ? '作为蒙版' : '点击设为蒙版'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {mixerConfig.maskSlot && (
        <div className="p-3 bg-shader-dark/50 rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">蒙版强度</span>
            <span className="text-sm text-shader-cyan font-mono">
              {Math.round(mixerConfig.maskIntensity * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={2}
            step={0.01}
            value={mixerConfig.maskIntensity}
            onChange={(e) => onConfigChange({ maskIntensity: parseFloat(e.target.value) })}
            className="w-full"
          />
        </div>
      )}
    </div>
  );
};
