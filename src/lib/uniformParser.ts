import { UniformConfig, UniformType } from '@/types';

const uniformTypeMap: Record<string, UniformType> = {
  'float': 'float',
  'int': 'int',
  'bool': 'bool',
  'vec2': 'vec2',
  'vec3': 'vec3',
  'vec4': 'vec4',
  'mat2': 'mat2',
  'mat3': 'mat3',
  'mat4': 'mat4',
  'sampler2D': 'sampler2D',
};

const commonUniformLabels: Record<string, { label: string; min?: number; max?: number; step?: number }> = {
  'time': { label: '时间', min: 0, max: 100, step: 0.01 },
  'speed': { label: '速度', min: 0, max: 10, step: 0.1 },
  'resolution': { label: '分辨率' },
  'mouse': { label: '鼠标位置' },
  'color': { label: '颜色' },
  'color1': { label: '颜色 1' },
  'color2': { label: '颜色 2' },
  'color3': { label: '颜色 3' },
  'background': { label: '背景色' },
  'foreground': { label: '前景色' },
  'alpha': { label: '透明度', min: 0, max: 1, step: 0.01 },
  'opacity': { label: '不透明度', min: 0, max: 1, step: 0.01 },
  'intensity': { label: '强度', min: 0, max: 5, step: 0.1 },
  'strength': { label: '强度', min: 0, max: 5, step: 0.1 },
  'frequency': { label: '频率', min: 0.1, max: 20, step: 0.1 },
  'scale': { label: '缩放', min: 0.1, max: 10, step: 0.1 },
  'zoom': { label: '缩放', min: 0.1, max: 10, step: 0.1 },
  'rotation': { label: '旋转', min: 0, max: 360, step: 1 },
  'angle': { label: '角度', min: 0, max: 360, step: 1 },
  'offset': { label: '偏移', min: -10, max: 10, step: 0.1 },
  'threshold': { label: '阈值', min: 0, max: 1, step: 0.01 },
  'smoothness': { label: '平滑度', min: 0, max: 1, step: 0.01 },
  'blur': { label: '模糊', min: 0, max: 10, step: 0.5 },
  'noise': { label: '噪点', min: 0, max: 1, step: 0.01 },
  'distortion': { label: '扭曲', min: 0, max: 2, step: 0.01 },
  'glow': { label: '发光', min: 0, max: 5, step: 0.1 },
};

function getDefaultValue(type: UniformType): number | number[] | boolean {
  switch (type) {
    case 'float':
      return 1.0;
    case 'int':
      return 1;
    case 'bool':
      return true;
    case 'vec2':
      return [0.0, 0.0];
    case 'vec3':
      return [1.0, 1.0, 1.0];
    case 'vec4':
      return [1.0, 1.0, 1.0, 1.0];
    case 'mat2':
      return [1, 0, 0, 1];
    case 'mat3':
      return [1, 0, 0, 0, 1, 0, 0, 0, 1];
    case 'mat4':
      return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    case 'sampler2D':
      return 0;
    default:
      return 1.0;
  }
}

function isColorUniform(name: string, type: UniformType): boolean {
  const lowerName = name.toLowerCase();
  return (
    (type === 'vec3' || type === 'vec4') &&
    (lowerName.includes('color') ||
      lowerName.includes('colour') ||
      lowerName.includes('background') ||
      lowerName.includes('foreground') ||
      lowerName === 'col' ||
      lowerName === 'rgb' ||
      lowerName === 'rgba')
  );
}

export function parseUniformsFromShader(shaderCode: string): UniformConfig[] {
  const uniforms: UniformConfig[] = [];
  
  const uniformRegex = /uniform\s+(\w+)\s+(\w+)\s*;/g;
  
  let match;
  while ((match = uniformRegex.exec(shaderCode)) !== null) {
    const typeStr = match[1];
    const name = match[2];
    
    const type = uniformTypeMap[typeStr];
    if (!type) continue;
    
    const commonConfig = commonUniformLabels[name.toLowerCase()] || {};
    const isColor = isColorUniform(name, type);
    
    const config: UniformConfig = {
      name,
      type,
      defaultValue: getDefaultValue(type),
      label: commonConfig.label || name,
      ...(commonConfig.min !== undefined && { min: commonConfig.min }),
      ...(commonConfig.max !== undefined && { max: commonConfig.max }),
      ...(commonConfig.step !== undefined && { step: commonConfig.step }),
      ...(isColor && { description: 'color' }),
    };
    
    uniforms.push(config);
  }
  
  return uniforms;
}

export function parseUniformsFromAIResponse(response: string): {
  uniforms: UniformConfig[];
  shaderCode: string;
} | null {
  const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
  const codeMatch = response.match(/```(?:glsl|shader|wgsl)\s*([\s\S]*?)\s*```/);
  
  let uniforms: UniformConfig[] = [];
  let shaderCode = '';
  
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      if (parsed.uniforms && Array.isArray(parsed.uniforms)) {
        uniforms = parsed.uniforms;
      }
      if (parsed.shaderCode || parsed.fragment) {
        shaderCode = parsed.shaderCode || parsed.fragment;
      }
    } catch {
      // ignore malformed JSON
    }
  }
  
  if (codeMatch && !shaderCode) {
    shaderCode = codeMatch[1];
  }
  
  if (shaderCode) {
    if (uniforms.length === 0) {
      uniforms = parseUniformsFromShader(shaderCode);
    }
    return { uniforms, shaderCode };
  }
  
  return null;
}

export function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16) / 255,
        parseInt(result[2], 16) / 255,
        parseInt(result[3], 16) / 255,
      ]
    : [1, 1, 1];
}

export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b]
    .map((x) => {
      const hex = Math.round(x * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    })
    .join('');
}

export function hexToRgba(hex: string, alpha: number = 1): [number, number, number, number] {
  const rgb = hexToRgb(hex);
  return [...rgb, alpha] as [number, number, number, number];
}
