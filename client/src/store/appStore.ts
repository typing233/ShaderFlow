import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AppState, ShaderSlot } from '../types';

const generateId = () => Math.random().toString(36).substring(2, 9);

const DEFAULT_SHADER_CODE = `#version 300 es
precision highp float;

uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;

uniform float u_speed; // @param min=0 max=5 step=0.1 label="Speed" default=1.0
uniform vec3 u_color; // @param label="Base Color" default=#8b5cf6

out vec4 fragColor;

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    float aspect = u_resolution.x / u_resolution.y;
    uv.x *= aspect;
    
    vec2 center = vec2(aspect * 0.5, 0.5);
    float dist = length(uv - center);
    float angle = atan(uv.y - center.y, uv.x - center.x);
    
    float swirl = angle + u_time * u_speed + dist * 2.0;
    float wave = sin(swirl * 5.0) * 0.5 + 0.5;
    
    vec3 color = u_color * (0.3 + wave * 0.7);
    color *= (1.0 - dist * 0.8);
    
    fragColor = vec4(color, 1.0);
}`;

const createDefaultSlot = (index: number): ShaderSlot => ({
  id: generateId(),
  name: `Effect ${index + 1}`,
  code: DEFAULT_SHADER_CODE,
  params: [
    {
      name: 'u_speed',
      type: 'float',
      label: 'Speed',
      value: 1.0,
      min: 0,
      max: 5,
      step: 0.1
    },
    {
      name: 'u_color',
      type: 'vec3',
      label: 'Base Color',
      value: [0.545, 0.361, 0.965]
    }
  ],
  isGenerating: false,
  blendMode: 'normal',
  opacity: 1.0,
  isMask: false
});

const initialSlots = [createDefaultSlot(0)];

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      llmConfig: {
        baseUrl: 'https://api.openai.com/v1',
        apiKey: '',
        modelName: 'gpt-4'
      },
      connectionStatus: 'idle',
      connectionError: null,
      shaderSlots: initialSlots,
      activeSlotId: initialSlots[0].id,
      mixerConfig: {
        blendAmount: 0.5,
        maskIntensity: 1.0,
        maskSlot: null
      },
      isGenerating: false,
      generationProgress: 0,
      currentPrompt: '',
      
      updateLLMConfig: (config: Partial<AppState['llmConfig']>) =>
        set((state) => ({
          llmConfig: { ...state.llmConfig, ...config }
        })),
        
      setConnectionStatus: (status: AppState['connectionStatus'], error?: string) =>
        set({ 
          connectionStatus: status, 
          connectionError: error || null 
        }),
        
      addShaderSlot: () => {
        const slots = get().shaderSlots;
        const newSlot = createDefaultSlot(slots.length);
        set((state) => ({
          shaderSlots: [...state.shaderSlots, newSlot],
          activeSlotId: newSlot.id
        }));
        return newSlot.id;
      },
      
      removeShaderSlot: (id: string) =>
        set((state) => {
          const newSlots = state.shaderSlots.filter((s) => s.id !== id);
          const newActiveId = state.activeSlotId === id 
            ? (newSlots.length > 0 ? newSlots[newSlots.length - 1].id : null)
            : state.activeSlotId;
          return {
            shaderSlots: newSlots,
            activeSlotId: newActiveId
          };
        }),
        
      updateShaderSlot: (id: string, updates: Partial<ShaderSlot>) =>
        set((state) => ({
          shaderSlots: state.shaderSlots.map((s) =>
            s.id === id ? { ...s, ...updates } : s
          )
        })),
        
      setActiveSlot: (id: string) =>
        set({ activeSlotId: id }),
        
      updateParamValue: (slotId: string, paramName: string, value: any) =>
        set((state) => ({
          shaderSlots: state.shaderSlots.map((s) =>
            s.id === slotId
              ? {
                  ...s,
                  params: s.params.map((p) =>
                    p.name === paramName ? { ...p, value } : p
                  )
                }
              : s
          )
        })),
        
      updateMixerConfig: (config: Partial<AppState['mixerConfig']>) =>
        set((state) => ({
          mixerConfig: { ...state.mixerConfig, ...config }
        })),
        
      setGenerating: (generating: boolean) =>
        set({ isGenerating: generating }),
        
      setGenerationProgress: (progress: number) =>
        set({ generationProgress: progress }),
        
      setCurrentPrompt: (prompt: string) =>
        set({ currentPrompt: prompt })
    }),
    {
      name: 'shaderflow-storage',
      partialize: (state) => ({
        llmConfig: {
          baseUrl: state.llmConfig.baseUrl,
          modelName: state.llmConfig.modelName
        }
      })
    }
  )
);
