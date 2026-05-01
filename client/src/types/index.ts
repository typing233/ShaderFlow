export interface LLMConfig {
  baseUrl: string;
  apiKey: string;
  modelName: string;
}

export interface ShaderParam {
  name: string;
  type: 'float' | 'vec2' | 'vec3' | 'vec4';
  label: string;
  value: number | [number, number] | [number, number, number] | [number, number, number, number];
  min?: number;
  max?: number;
  step?: number;
  default?: number | string;
}

export interface ShaderSlot {
  id: string;
  name: string;
  code: string;
  params: ShaderParam[];
  isGenerating: boolean;
  blendMode: 'normal' | 'add' | 'multiply' | 'screen';
  opacity: number;
  isMask: boolean;
}

export interface MixerConfig {
  blendAmount: number;
  maskIntensity: number;
  maskSlot: string | null;
}

export interface AppState {
  llmConfig: LLMConfig;
  connectionStatus: 'idle' | 'testing' | 'success' | 'error';
  connectionError: string | null;
  shaderSlots: ShaderSlot[];
  activeSlotId: string | null;
  mixerConfig: MixerConfig;
  isGenerating: boolean;
  generationProgress: number;
  currentPrompt: string;
}
