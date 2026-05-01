import { ShaderParam } from '../types';

const PARAM_REGEX = /uniform\s+(\w+)\s+(\w+)\s*;\s*\/\/\s*@param(.*)$/gm;
const ATTR_REGEX = /(\w+)=("[^"]*"|[^\s]+)/g;

function parseHexColor(hex: string): [number, number, number] {
  const cleanHex = hex.replace('#', '').replace(/"/g, '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
  return [r, g, b];
}

function parseValue(type: string, value: string, defaultAttr: string | undefined): any {
  if (type === 'float') {
    if (value) return parseFloat(value);
    if (defaultAttr) {
      const parsed = parseFloat(defaultAttr);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }
  if (type === 'vec2') {
    if (defaultAttr?.startsWith('#')) {
      const [r, g] = parseHexColor(defaultAttr);
      return [r, g];
    }
    return [0, 0];
  }
  if (type === 'vec3') {
    if (defaultAttr?.startsWith('#')) {
      return parseHexColor(defaultAttr);
    }
    return [0, 0, 0];
  }
  if (type === 'vec4') {
    if (defaultAttr?.startsWith('#')) {
      const [r, g, b] = parseHexColor(defaultAttr);
      return [r, g, b, 1];
    }
    return [0, 0, 0, 1];
  }
  return 0;
}

export function parseShaderParams(code: string): ShaderParam[] {
  const params: ShaderParam[] = [];
  const matches = [...code.matchAll(PARAM_REGEX)];

  for (const match of matches) {
    const [, type, name, paramStr] = match;
    
    if (!['float', 'vec2', 'vec3', 'vec4'].includes(type)) {
      continue;
    }

    const attrs: Record<string, string> = {};
    const attrMatches = [...paramStr.matchAll(ATTR_REGEX)];
    for (const [, key, val] of attrMatches) {
      attrs[key] = val.replace(/^"|"$/g, '');
    }

    const label = attrs.label || name.replace('u_', '').replace(/_/g, ' ');
    const min = attrs.min !== undefined ? parseFloat(attrs.min) : undefined;
    const max = attrs.max !== undefined ? parseFloat(attrs.max) : undefined;
    const step = attrs.step !== undefined ? parseFloat(attrs.step) : undefined;

    const value = parseValue(type as ShaderParam['type'], attrs.value, attrs.default);

    params.push({
      name,
      type: type as ShaderParam['type'],
      label,
      value,
      min,
      max,
      step,
      default: attrs.default
    });
  }

  return params;
}

export function isColorParam(param: ShaderParam): boolean {
  return param.type === 'vec3' || param.type === 'vec4';
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.round(n * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function hexToRgb(hex: string): [number, number, number] {
  return parseHexColor(hex);
}
