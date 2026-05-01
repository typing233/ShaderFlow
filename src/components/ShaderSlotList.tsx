import React, { useState } from 'react';
import { Layers, Plus, Trash2, Eye, EyeOff, Edit2, Check, X, ChevronRight } from 'lucide-react';
import { useAppStore } from '@/store';
import { cn } from '@/lib/cn';

interface ShaderSlotListProps {
  className?: string;
}

export const ShaderSlotList: React.FC<ShaderSlotListProps> = ({ className }) => {
  const {
    shaderSlots,
    activeSlotId,
    setActiveSlot,
    addShaderSlot,
    removeShaderSlot,
    updateShaderSlot,
    mixerConfig,
    updateMixerConfig,
    multiEffectMode,
    setMultiEffectMode,
  } = useAppStore();

  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleStartEdit = (slot: typeof shaderSlots[0]) => {
    setEditingSlotId(slot.id);
    setEditingName(slot.name);
  };

  const handleSaveEdit = (slotId: string) => {
    if (editingName.trim()) {
      updateShaderSlot(slotId, { name: editingName.trim() });
    }
    setEditingSlotId(null);
  };

  const handleCancelEdit = () => {
    setEditingSlotId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, slotId: string) => {
    if (e.key === 'Enter') {
      handleSaveEdit(slotId);
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const handleToggleVisible = (slotId: string) => {
    const slot = shaderSlots.find(s => s.id === slotId);
    if (slot) {
      updateShaderSlot(slotId, { isVisible: !slot.isVisible });
    }
  };

  const handleSetAsMask = (slotId: string) => {
    updateMixerConfig({
      maskSlotId: mixerConfig.maskSlotId === slotId ? null : slotId,
    });
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      <div className="p-3 border-b border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Layers size={16} className="text-shader-400" />
            <span className="text-sm font-medium text-gray-200">效果图层</span>
          </div>
          <button
            onClick={addShaderSlot}
            className="p-1.5 text-gray-400 hover:text-shader-400 hover:bg-gray-800 rounded-lg transition-colors"
            title="添加新效果图层"
          >
            <Plus size={16} />
          </button>
        </div>
        
        {shaderSlots.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">模式:</span>
            <div className="flex gap-1">
              <button
                onClick={() => setMultiEffectMode(false)}
                className={cn(
                  'px-2 py-1 text-xs rounded transition-colors',
                  !multiEffectMode
                    ? 'bg-shader-500/20 text-shader-400'
                    : 'bg-gray-800 text-gray-500 hover:text-gray-300'
                )}
              >
                单效果
              </button>
              <button
                onClick={() => setMultiEffectMode(true)}
                className={cn(
                  'px-2 py-1 text-xs rounded transition-colors',
                  multiEffectMode
                    ? 'bg-shader-500/20 text-shader-400'
                    : 'bg-gray-800 text-gray-500 hover:text-gray-300'
                )}
              >
                混合模式
              </button>
            </div>
          </div>
        )}
      </div>

      {shaderSlots.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <Layers size={32} className="text-gray-600 mb-3" />
          <p className="text-sm text-gray-500 mb-4">
            还没有效果图层
          </p>
          <button
            onClick={addShaderSlot}
            className="flex items-center gap-2 px-4 py-2 text-sm text-shader-400 bg-shader-900/30 rounded-lg hover:bg-shader-900/50 transition-colors"
          >
            <Plus size={16} />
            添加第一个效果
          </button>
          <p className="text-xs text-gray-600 mt-4">
            提示：在混合模式下可以叠加多个效果
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="p-3 space-y-2">
            {shaderSlots.map((slot, index) => (
              <div
                key={slot.id}
                className={cn(
                  'rounded-lg border transition-all',
                  activeSlotId === slot.id
                    ? 'bg-gray-800/80 border-shader-500/40'
                    : 'bg-gray-850/50 border-gray-700/50 hover:border-gray-600'
                )}
              >
                <div
                  className="flex items-center gap-2 p-3 cursor-pointer"
                  onClick={() => setActiveSlot(slot.id)}
                >
                  <div className={cn(
                    'w-2 h-2 rounded-full flex-shrink-0',
                    slot.isVisible ? 'bg-green-400' : 'bg-gray-600'
                  )} />
                  
                  <div className="flex-1 min-w-0">
                    {editingSlotId === slot.id ? (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, slot.id)}
                          onBlur={() => handleSaveEdit(slot.id)}
                          className="flex-1 min-w-0 text-sm text-gray-200 bg-gray-900 border border-shader-500/50 rounded px-2 py-1 focus:outline-none"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveEdit(slot.id)}
                          className="p-1 text-green-400 hover:bg-gray-700 rounded"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="p-1 text-gray-400 hover:bg-gray-700 rounded"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">#{index + 1}</span>
                        <span className="text-sm text-gray-200 truncate">
                          {slot.name}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    {multiEffectMode && mixerConfig.maskSlotId === slot.id && (
                      <span className="text-xs text-purple-400 bg-purple-900/30 px-2 py-0.5 rounded">
                        蒙版
                      </span>
                    )}
                    
                    {multiEffectMode && slot.id !== mixerConfig.maskSlotId && (
                      <button
                        onClick={() => handleSetAsMask(slot.id)}
                        className="p-1.5 text-gray-500 hover:text-purple-400 hover:bg-gray-700/50 rounded transition-colors"
                        title="设为蒙版"
                      >
                        <ChevronRight size={14} />
                      </button>
                    )}

                    {editingSlotId !== slot.id && (
                      <button
                        onClick={() => handleStartEdit(slot)}
                        className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-700/50 rounded transition-colors"
                        title="重命名"
                      >
                        <Edit2 size={14} />
                      </button>
                    )}

                    <button
                      onClick={() => handleToggleVisible(slot.id)}
                      className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-700/50 rounded transition-colors"
                      title={slot.isVisible ? '隐藏' : '显示'}
                    >
                      {slot.isVisible ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>

                    {shaderSlots.length > 1 && (
                      <button
                        onClick={() => removeShaderSlot(slot.id)}
                        className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-gray-700/50 rounded transition-colors"
                        title="删除"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {multiEffectMode && activeSlotId === slot.id && index < shaderSlots.length - 1 && (
                  <div className="px-3 pb-3 pt-0 border-t border-gray-700/30">
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-gray-500 flex-shrink-0">混合</span>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={slot.blendAmount ?? 0.5}
                        onChange={(e) => {
                          updateShaderSlot(slot.id, {
                            blendAmount: parseFloat(e.target.value),
                          });
                        }}
                        className="flex-1 h-1.5 bg-gray-700 rounded-full appearance-none cursor-pointer
                          [&::-webkit-slider-thumb]:appearance-none
                          [&::-webkit-slider-thumb]:w-3
                          [&::-webkit-slider-thumb]:h-3
                          [&::-webkit-slider-thumb]:rounded-full
                          [&::-webkit-slider-thumb]:bg-shader-400
                          [&::-webkit-slider-thumb]:cursor-pointer
                          [&::-webkit-slider-thumb]:transition-transform
                          [&::-webkit-slider-thumb]:hover:scale-110"
                      />
                      <span className="text-xs text-gray-400 w-10 text-right font-mono">
                        {Math.round((slot.blendAmount ?? 0.5) * 100)}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {multiEffectMode && shaderSlots.length > 1 && (
        <div className="p-3 border-t border-gray-800 bg-gray-900/50">
          <div className="space-y-3">
            {mixerConfig.maskSlotId && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500">蒙版强度</span>
                  <span className="text-xs text-gray-400 font-mono">
                    {Math.round(mixerConfig.maskIntensity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={mixerConfig.maskIntensity}
                  onChange={(e) => {
                    updateMixerConfig({
                      maskIntensity: parseFloat(e.target.value),
                    });
                  }}
                  className="w-full h-1.5 bg-gray-700 rounded-full appearance-none cursor-pointer
                    [&::-webkit-slider-thumb]:appearance-none
                    [&::-webkit-slider-thumb]:w-3
                    [&::-webkit-slider-thumb]:h-3
                    [&::-webkit-slider-thumb]:rounded-full
                    [&::-webkit-slider-thumb]:bg-purple-400
                    [&::-webkit-slider-thumb]:cursor-pointer"
                />
              </div>
            )}
            
            <p className="text-xs text-gray-600 text-center">
              蒙版效果: {mixerConfig.maskSlotId 
                ? shaderSlots.find(s => s.id === mixerConfig.maskSlotId)?.name || '无'
                : '未设置'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShaderSlotList;
