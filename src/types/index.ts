export type UniformType = 
  | 'float' 
  | 'int' 
  | 'bool' 
  | 'vec2' 
  | 'vec3' 
  | 'vec4' 
  | 'mat2' 
  | 'mat3' 
  | 'mat4' 
  | 'sampler2D';

export interface UniformConfig {
  name: string;
  type: UniformType;
  defaultValue: number | number[] | boolean;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  description?: string;
}

export interface UniformValue {
  name: string;
  type: UniformType;
  value: number | number[] | boolean;
}

export interface ShaderCode {
  vertex: string;
  fragment: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  shaderCode?: ShaderCode;
  uniforms?: UniformConfig[];
}

export interface AppSettings {
  apiKey: string;
  model: string;
  baseUrl: string;
}

export interface ExportFormat {
  type: 'code' | 'video' | 'link';
  content?: string;
  url?: string;
}

export interface PreviewState {
  isPlaying: boolean;
  time: number;
  speed: number;
  resolution: { width: number; height: number };
}

export interface ShaderSlot {
  id: string;
  name: string;
  shaderCode: ShaderCode;
  uniforms: UniformConfig[];
  uniformValues: Record<string, number | number[] | boolean>;
  isMask: boolean;
  opacity: number;
  blendMode: 'normal' | 'add' | 'multiply' | 'screen';
}

export interface MixerConfig {
  blendAmount: number;
  maskIntensity: number;
  maskSlotId: string | null;
}

export type ConnectionStatus = 'idle' | 'testing' | 'success' | 'error';
