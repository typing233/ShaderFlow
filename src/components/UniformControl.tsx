import React, { useCallback, useMemo } from 'react';
import { UniformConfig } from '@/types';
import { useAppStore } from '@/store';
import { hexToRgb, rgbToHex } from '@/lib/uniformParser';

interface SliderControlProps {
  config: UniformConfig;
  value: number;
  onChange: (value: number) => void;
}

const SliderControl: React.FC<SliderControlProps> = ({ config, value, onChange }) => {
  const min = config.min ?? 0;
  const max = config.max ?? 100;
  const step = config.step ?? 0.01;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(parseFloat(e.target.value));
  };

  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-sm text-gray-300">{config.label || config.name}</label>
        <input
          type="number"
          value={value.toFixed(step < 0.1 ? 2 : step < 1 ? 1 : 0)}
          onChange={handleInputChange}
          min={min}
          max={max}
          step={step}
          className="w-20 text-xs bg-gray-800 border border-gray-700 rounded px-2 py-1 text-right text-gray-200 focus:outline-none focus:border-shader-500"
        />
      </div>
      <div className="relative h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="absolute left-0 top-0 h-full bg-gradient-to-r from-shader-500 to-shader-400 rounded-full"
          style={{ width: `${Math.max(0, Math.min(100, percentage))}%` }}
        />
        <input
          type="range"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={handleInputChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
    </div>
  );
};

interface VecSliderControlProps {
  config: UniformConfig;
  value: number[];
  dimension: 2 | 3 | 4;
  onChange: (value: number[]) => void;
}

const VecSliderControl: React.FC<VecSliderControlProps> = ({
  config,
  value,
  dimension,
  onChange,
}) => {
  const labels = dimension === 2 ? ['X', 'Y'] : dimension === 3 ? ['X', 'Y', 'Z'] : ['X', 'Y', 'Z', 'W'];
  const min = config.min ?? -10;
  const max = config.max ?? 10;
  const step = config.step ?? 0.01;

  const handleChange = (index: number, newValue: number) => {
    const newValues = [...value];
    newValues[index] = newValue;
    onChange(newValues);
  };

  return (
    <div className="space-y-3">
      <label className="text-sm text-gray-300">{config.label || config.name}</label>
      <div className="space-y-2">
        {value.slice(0, dimension).map((val, index) => (
          <div key={index} className="flex items-center gap-3">
            <span className="text-xs text-gray-500 w-4">{labels[index]}</span>
            <div className="relative flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <input
                type="range"
                value={val}
                min={min}
                max={max}
                step={step}
                onChange={(e) => handleChange(index, parseFloat(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
            <input
              type="number"
              value={val.toFixed(step < 0.1 ? 2 : step < 1 ? 1 : 0)}
              onChange={(e) => handleChange(index, parseFloat(e.target.value))}
              min={min}
              max={max}
              step={step}
              className="w-16 text-xs bg-gray-800 border border-gray-700 rounded px-1 py-0.5 text-right text-gray-200 focus:outline-none focus:border-shader-500"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

interface ColorPickerProps {
  config: UniformConfig;
  value: number[];
  onChange: (value: number[]) => void;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ config, value, onChange }) => {
  const hasAlpha = value.length === 4;
  const hexValue = useMemo(() => {
    return rgbToHex(value[0], value[1], value[2]);
  }, [value]);

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHex = e.target.value;
    if (/^#[0-9A-Fa-f]{6}$/.test(newHex)) {
      const rgb = hexToRgb(newHex);
      if (hasAlpha) {
        onChange([...rgb, value[3]]);
      } else {
        onChange(rgb);
      }
    }
  };

  const handleAlphaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (hasAlpha) {
      const alpha = parseFloat(e.target.value);
      onChange([value[0], value[1], value[2], alpha]);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm text-gray-300">{config.label || config.name}</label>
      <div className="flex items-center gap-3">
        <div className="relative">
          <input
            type="color"
            value={hexValue}
            onChange={(e) => {
              const rgb = hexToRgb(e.target.value);
              if (hasAlpha) {
                onChange([...rgb, value[3]]);
              } else {
                onChange(rgb);
              }
            }}
            className="w-10 h-10 rounded cursor-pointer bg-transparent border-0"
          />
        </div>
        <input
          type="text"
          value={hexValue}
          onChange={handleHexChange}
          className="flex-1 text-sm bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-gray-200 focus:outline-none focus:border-shader-500 font-mono"
        />
        {hasAlpha && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">A</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={value[3]}
              onChange={handleAlphaChange}
              className="w-20"
            />
            <span className="text-xs text-gray-400 w-8">
              {Math.round(value[3] * 100)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

interface BoolControlProps {
  config: UniformConfig;
  value: boolean;
  onChange: (value: boolean) => void;
}

const BoolControl: React.FC<BoolControlProps> = ({ config, value, onChange }) => {
  return (
    <div className="flex items-center justify-between">
      <label className="text-sm text-gray-300">{config.label || config.name}</label>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
          value ? 'bg-shader-500' : 'bg-gray-700'
        }`}
      >
        <div
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-200 ${
            value ? 'translate-x-6' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
};

interface UniformControlProps {
  className?: string;
}

export const UniformControl: React.FC<UniformControlProps> = ({ className }) => {
  const {
    uniforms,
    uniformValues,
    updateUniformValue,
    shaderSlots,
    activeSlotId,
    updateShaderSlot,
  } = useAppStore();

  const activeSlot = shaderSlots.find(s => s.id === activeSlotId);
  const currentUniforms = activeSlot?.uniforms || uniforms;
  const currentUniformValues = activeSlot?.uniformValues || uniformValues;

  const handleChange = useCallback(
    (name: string, value: number | number[] | boolean) => {
      if (activeSlot) {
        const newUniformValues = {
          ...activeSlot.uniformValues,
          [name]: value,
        };
        updateShaderSlot(activeSlotId, { uniformValues: newUniformValues });
      } else {
        updateUniformValue(name, value);
      }
    },
    [updateUniformValue, updateShaderSlot, activeSlot, activeSlotId]
  );

  const renderControl = useCallback(
    (config: UniformConfig) => {
      const value = currentUniformValues[config.name];
      if (value === undefined) return null;

      const isColor = config.description === 'color' || 
        ((config.type === 'vec3' || config.type === 'vec4') && 
         (config.label?.toLowerCase().includes('color') || 
          config.name.toLowerCase().includes('color')));

      switch (config.type) {
        case 'float':
        case 'int':
          return (
            <SliderControl
              key={config.name}
              config={config}
              value={value as number}
              onChange={(v) => handleChange(config.name, v)}
            />
          );

        case 'vec2':
          if (isColor) {
            return (
              <ColorPicker
                key={config.name}
                config={config}
                value={value as number[]}
                onChange={(v) => handleChange(config.name, v)}
              />
            );
          }
          return (
            <VecSliderControl
              key={config.name}
              config={config}
              value={value as number[]}
              dimension={2}
              onChange={(v) => handleChange(config.name, v)}
            />
          );

        case 'vec3':
        case 'vec4':
          if (isColor) {
            return (
              <ColorPicker
                key={config.name}
                config={config}
                value={value as number[]}
                onChange={(v) => handleChange(config.name, v)}
              />
            );
          }
          return (
            <VecSliderControl
              key={config.name}
              config={config}
              value={value as number[]}
              dimension={config.type === 'vec4' ? 4 : 3}
              onChange={(v) => handleChange(config.name, v)}
            />
          );

        case 'bool':
          return (
            <BoolControl
              key={config.name}
              config={config}
              value={value as boolean}
              onChange={(v) => handleChange(config.name, v)}
            />
          );

        default:
          return null;
      }
    },
    [currentUniformValues, handleChange]
  );

  const filteredUniforms = currentUniforms.filter((u) => u.name !== 'time' && u.name !== 'resolution');

  return (
    <div className={`${className || ''}`}>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-200 uppercase tracking-wide">
            控制参数
          </h3>
          {activeSlot && (
            <span className="text-xs text-shader-400 bg-shader-900/30 px-2 py-1 rounded">
              {activeSlot.name}
            </span>
          )}
          <span className="text-xs text-gray-500">{filteredUniforms.length} 个参数</span>
        </div>

        {filteredUniforms.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            暂无可调节的 uniform 变量
          </div>
        ) : (
          <div className="space-y-5">
            {filteredUniforms.map((config) => (
              <div key={config.name} className="pb-4 border-b border-gray-800 last:border-0 last:pb-0">
                {renderControl(config)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UniformControl;
