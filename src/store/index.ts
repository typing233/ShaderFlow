import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  ShaderCode, 
  UniformConfig, 
  Message, 
  AppSettings, 
  PreviewState, 
  ShaderSlot, 
  MixerConfig,
  ConnectionStatus
} from '@/types';

interface AppState {
  shaderCode: ShaderCode;
  setShaderCode: (code: ShaderCode) => void;
  updateFragmentShader: (code: string) => void;
  
  uniforms: UniformConfig[];
  uniformValues: Record<string, number | number[] | boolean>;
  setUniforms: (uniforms: UniformConfig[]) => void;
  updateUniformValue: (name: string, value: number | number[] | boolean) => void;
  
  messages: Message[];
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  clearMessages: () => void;
  
  settings: AppSettings;
  updateSettings: (settings: Partial<AppSettings>) => void;
  
  preview: PreviewState;
  updatePreview: (preview: Partial<PreviewState>) => void;
  
  isGenerating: boolean;
  setIsGenerating: (isGenerating: boolean) => void;
  
  generationStream: string;
  setGenerationStream: (stream: string) => void;
  appendToGenerationStream: (chunk: string) => void;
  
  error: string | null;
  setError: (error: string | null) => void;

  connectionStatus: ConnectionStatus;
  connectionError: string | null;
  setConnectionStatus: (status: ConnectionStatus, error?: string) => void;

  shaderSlots: ShaderSlot[];
  activeSlotId: string;
  addShaderSlot: () => string;
  removeShaderSlot: (id: string) => void;
  updateShaderSlot: (id: string, updates: Partial<ShaderSlot>) => void;
  setActiveSlot: (id: string) => void;
  updateSlotUniformValue: (slotId: string, name: string, value: number | number[] | boolean) => void;

  mixerConfig: MixerConfig;
  updateMixerConfig: (config: Partial<MixerConfig>) => void;

  multiEffectMode: boolean;
  setMultiEffectMode: (enabled: boolean) => void;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

const defaultVertexShader = `
precision highp float;

attribute vec3 position;
attribute vec2 uv;
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

const defaultFragmentShader = `
precision highp float;

varying vec2 vUv;
uniform float time;
uniform vec2 resolution;
uniform float speed;
uniform vec3 baseColor;

void main() {
  vec2 uv = vUv;
  uv.x *= resolution.x / resolution.y;
  
  vec2 center = vec2(resolution.x / resolution.y * 0.5, 0.5);
  float dist = length(uv - center);
  float angle = atan(uv.y - center.y, uv.x - center.x);
  
  float swirl = angle + time * speed + dist * 2.0;
  float wave = sin(swirl * 5.0) * 0.5 + 0.5;
  
  vec3 color = baseColor * (0.3 + wave * 0.7);
  color *= (1.0 - dist * 0.8);
  
  gl_FragColor = vec4(color, 1.0);
}
`;

const defaultUniforms: UniformConfig[] = [
  { name: 'time', type: 'float', defaultValue: 0, min: 0, max: 100, step: 0.01, label: '时间' },
  { name: 'resolution', type: 'vec2', defaultValue: [800, 600], label: '分辨率' },
  { name: 'speed', type: 'float', defaultValue: 1.0, min: 0, max: 5, step: 0.1, label: '速度' },
  { name: 'baseColor', type: 'vec3', defaultValue: [0.545, 0.361, 0.965], min: 0, max: 1, label: '基色' },
];

function createDefaultSlot(index: number): ShaderSlot {
  return {
    id: generateId(),
    name: `效果 ${index + 1}`,
    shaderCode: {
      vertex: defaultVertexShader,
      fragment: defaultFragmentShader,
    },
    uniforms: [...defaultUniforms],
    uniformValues: {
      time: 0,
      resolution: [800, 600],
      speed: 1.0,
      baseColor: [0.545, 0.361, 0.965],
    },
    isMask: false,
    opacity: 1.0,
    blendMode: 'normal',
  };
}

const initialSlot = createDefaultSlot(0);

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      shaderCode: initialSlot.shaderCode,
      setShaderCode: (code) => set({ shaderCode: code }),
      updateFragmentShader: (code) => set((state) => ({
        shaderCode: { ...state.shaderCode, fragment: code },
      })),
      
      uniforms: initialSlot.uniforms,
      uniformValues: initialSlot.uniformValues,
      setUniforms: (uniforms) => set((state) => {
        const uniformValues: Record<string, number | number[] | boolean> = {};
        uniforms.forEach((u) => {
          uniformValues[u.name] = state.uniformValues[u.name] ?? u.defaultValue;
        });
        return { uniforms, uniformValues };
      }),
      updateUniformValue: (name, value) => set((state) => ({
        uniformValues: { ...state.uniformValues, [name]: value },
      })),
      
      messages: [],
      addMessage: (message) => set((state) => ({
        messages: [
          ...state.messages,
          {
            ...message,
            id: crypto.randomUUID(),
            timestamp: new Date(),
          },
        ],
      })),
      clearMessages: () => set({ messages: [] }),
      
      settings: {
        apiKey: '',
        model: 'deepseek-coder',
        baseUrl: 'https://api.deepseek.com',
      },
      updateSettings: (newSettings) => set((state) => ({
        settings: { ...state.settings, ...newSettings },
      })),
      
      preview: {
        isPlaying: true,
        time: 0,
        speed: 1,
        resolution: { width: 800, height: 600 },
      },
      updatePreview: (newPreview) => set((state) => ({
        preview: { ...state.preview, ...newPreview },
      })),
      
      isGenerating: false,
      setIsGenerating: (isGenerating) => set({ isGenerating }),
      
      generationStream: '',
      setGenerationStream: (stream) => set({ generationStream: stream }),
      appendToGenerationStream: (chunk) => set((state) => ({
        generationStream: state.generationStream + chunk
      })),
      
      error: null,
      setError: (error) => set({ error }),

      connectionStatus: 'idle',
      connectionError: null,
      setConnectionStatus: (status, error) => set({ 
        connectionStatus: status, 
        connectionError: error ?? null 
      }),

      shaderSlots: [initialSlot],
      activeSlotId: initialSlot.id,
      addShaderSlot: () => {
        const slots = get().shaderSlots;
        const newSlot = createDefaultSlot(slots.length);
        set((state) => ({
          shaderSlots: [...state.shaderSlots, newSlot],
          activeSlotId: newSlot.id,
          multiEffectMode: true
        }));
        return newSlot.id;
      },
      removeShaderSlot: (id) => set((state) => {
        const newSlots = state.shaderSlots.filter((s) => s.id !== id);
        const newActiveId = state.activeSlotId === id 
          ? (newSlots.length > 0 ? newSlots[newSlots.length - 1].id : '')
          : state.activeSlotId;
        const activeSlot = newSlots.find(s => s.id === newActiveId);
        return {
          shaderSlots: newSlots,
          activeSlotId: newActiveId,
          multiEffectMode: newSlots.length > 1,
          shaderCode: activeSlot?.shaderCode || state.shaderCode,
          uniforms: activeSlot?.uniforms || state.uniforms,
          uniformValues: activeSlot?.uniformValues || state.uniformValues,
        };
      }),
      updateShaderSlot: (id, updates) => set((state) => {
        const newSlots = state.shaderSlots.map((s) =>
          s.id === id ? { ...s, ...updates } : s
        );
        
        if (id === state.activeSlotId) {
          const activeSlot = newSlots.find(s => s.id === id);
          return {
            shaderSlots: newSlots,
            shaderCode: activeSlot?.shaderCode || state.shaderCode,
            uniforms: activeSlot?.uniforms || state.uniforms,
            uniformValues: activeSlot?.uniformValues || state.uniformValues,
          };
        }
        return { shaderSlots: newSlots };
      }),
      setActiveSlot: (id) => set((state) => {
        const slot = state.shaderSlots.find(s => s.id === id);
        if (!slot) return state;
        return {
          activeSlotId: id,
          shaderCode: slot.shaderCode,
          uniforms: slot.uniforms,
          uniformValues: slot.uniformValues,
        };
      }),
      updateSlotUniformValue: (slotId, name, value) => set((state) => {
        const newSlots = state.shaderSlots.map((s) => {
          if (s.id !== slotId) return s;
          const newUniformValues = { ...s.uniformValues, [name]: value };
          
          const newUniforms = s.uniforms.map(u => {
            if (u.name === name) {
              return { ...u, defaultValue: value };
            }
            return u;
          });
          
          return {
            ...s,
            uniformValues: newUniformValues,
            uniforms: newUniforms
          };
        });
        
        let result: Partial<AppState> = { shaderSlots: newSlots };
        
        if (slotId === state.activeSlotId) {
          const activeSlot = newSlots.find(s => s.id === slotId);
          if (activeSlot) {
            result = {
              ...result,
              uniformValues: activeSlot.uniformValues,
              uniforms: activeSlot.uniforms,
            };
          }
        }
        
        return result;
      }),

      mixerConfig: {
        blendAmount: 0.5,
        maskIntensity: 1.0,
        maskSlotId: null,
      },
      updateMixerConfig: (config) => set((state) => ({
        mixerConfig: { ...state.mixerConfig, ...config }
      })),

      multiEffectMode: false,
      setMultiEffectMode: (enabled) => set({ multiEffectMode: enabled }),
    }),
    {
      name: 'shaderflow-storage',
      partialize: (state) => ({
        settings: state.settings,
        messages: state.messages,
      }),
    }
  )
);
