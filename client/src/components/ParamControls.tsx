import React from 'react';
import { ShaderParam, ShaderSlot } from '../types';
import { isColorParam, rgbToHex, hexToRgb } from '../utils/shaderParser';

interface ParamControlsProps {
  slot: ShaderSlot;
  onParamChange: (paramName: string, value: any) => void;
}

const FloatControl: React.FC<{
  param: ShaderParam;
  value: number;
  onChange: (value: number) => void;
}> = ({ param, value, onChange }) => {
  const min = param.min ?? 0;
  const max = param.max ?? 100;
  const step = param.step ?? 0.01;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm text-gray-300">{param.label}</label>
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(parseFloat(e.target.value) || min)}
          className="w-20 px-2 py-1 text-xs bg-shader-dark border border-shader-light/50 rounded text-white text-right focus:outline-none focus:border-shader-accent/70"
        />
      </div>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full"
      />
      <div className="flex justify-between text-xs text-gray-500">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
};

const ColorControl: React.FC<{
  param: ShaderParam;
  value: number[];
  onChange: (value: [number, number, number] | [number, number, number, number]) => void;
}> = ({ param, value, onChange }) => {
  const hexValue = rgbToHex(value[0], value[1], value[2]);

  const handleColorChange = (newHex: string) => {
    const [r, g, b] = hexToRgb(newHex);
    if (value.length === 4) {
      onChange([r, g, b, value[3]]);
    } else {
      onChange([r, g, b]);
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm text-gray-300">{param.label}</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={hexValue}
            onChange={(e) => handleColorChange(e.target.value)}
            className="w-8 h-8 rounded cursor-pointer"
          />
          <span className="text-xs text-gray-400 font-mono">{hexValue.toUpperCase()}</span>
        </div>
      </div>
      <div className="flex gap-2">
        {['R', 'G', 'B'].map((channel, i) => (
          <div key={channel} className="flex-1">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{channel}</span>
              <span>{Math.round(value[i] * 255)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={value[i]}
              onChange={(e) => {
                const newValue = [...value] as number[];
                newValue[i] = parseFloat(e.target.value);
                onChange(newValue as any);
              }}
              className="w-full"
              style={{
                background: `linear-gradient(to right, 
                  ${i === 0 ? '#000, #f00' : i === 1 ? '#000, #0f0' : '#000, #00f'})`
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

const Vec2Control: React.FC<{
  param: ShaderParam;
  value: [number, number];
  onChange: (value: [number, number]) => void;
}> = ({ param, value, onChange }) => {
  const min = param.min ?? 0;
  const max = param.max ?? 100;
  const step = param.step ?? 0.01;

  return (
    <div className="space-y-1.5">
      <label className="text-sm text-gray-300">{param.label}</label>
      <div className="grid grid-cols-2 gap-2">
        {['X', 'Y'].map((axis, i) => (
          <div key={axis} className="space-y-1">
            <div className="flex justify-between text-xs text-gray-500">
              <span>{axis}</span>
              <span>{value[i].toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={value[i]}
              onChange={(e) => {
                const newValue = [...value] as [number, number];
                newValue[i] = parseFloat(e.target.value);
                onChange(newValue);
              }}
              className="w-full"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

const Vec4Control: React.FC<{
  param: ShaderParam;
  value: [number, number, number, number];
  onChange: (value: [number, number, number, number]) => void;
}> = ({ param, value, onChange }) => {
  return (
    <div className="space-y-3">
      <ColorControl
        param={param}
        value={value}
        onChange={(c) => onChange(c as any)}
      />
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-gray-500">
          <span>Alpha (透明度)</span>
          <span>{Math.round(value[3] * 100)}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={value[3]}
          onChange={(e) => {
            const newValue: [number, number, number, number] = [...value.slice(0, 3), parseFloat(e.target.value)] as any;
            onChange(newValue);
          }}
          className="w-full"
        />
      </div>
    </div>
  );
};

export const ParamControls: React.FC<ParamControlsProps> = ({ slot, onParamChange }) => {
  const { params } = slot;

  if (params.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 text-sm">
        该 shader 没有可调节的参数
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {params.map((param) => {
        const handleChange = (value: any) => onParamChange(param.name, value);

        if (isColorParam(param)) {
          if (param.type === 'vec4') {
            return (
              <Vec4Control
                key={param.name}
                param={param}
                value={param.value as [number, number, number, number]}
                onChange={handleChange}
              />
            );
          }
          return (
            <ColorControl
              key={param.name}
              param={param}
              value={param.value as number[]}
              onChange={handleChange}
            />
          );
        }

        if (param.type === 'vec2') {
          return (
            <Vec2Control
              key={param.name}
              param={param}
              value={param.value as [number, number]}
              onChange={handleChange}
            />
          );
        }

        return (
          <FloatControl
            key={param.name}
            param={param}
            value={param.value as number}
            onChange={handleChange}
          />
        );
      })}
    </div>
  );
};
