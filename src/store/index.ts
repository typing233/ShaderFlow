import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ShaderCode, UniformConfig, Message, AppSettings, PreviewState } from '@/types';

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
  
  error: string | null;
  setError: (error: string | null) => void;
}

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

void main() {
  vec2 uv = vUv;
  uv.x *= resolution.x / resolution.y;
  
  vec3 color = vec3(
    sin(uv.x * 10.0 + time) * 0.5 + 0.5,
    sin(uv.y * 10.0 + time * 0.7) * 0.5 + 0.5,
    sin((uv.x + uv.y) * 10.0 + time * 0.3) * 0.5 + 0.5
  );
  
  gl_FragColor = vec4(color, 1.0);
}
`;

const defaultUniforms: UniformConfig[] = [
  { name: 'time', type: 'float', defaultValue: 0, min: 0, max: 100, step: 0.01, label: '时间' },
  { name: 'resolution', type: 'vec2', defaultValue: [800, 600], label: '分辨率' },
];

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      shaderCode: {
        vertex: defaultVertexShader,
        fragment: defaultFragmentShader,
      },
      setShaderCode: (code) => set({ shaderCode: code }),
      updateFragmentShader: (code) => set((state) => ({
        shaderCode: { ...state.shaderCode, fragment: code },
      })),
      
      uniforms: defaultUniforms,
      uniformValues: {
        time: 0,
        resolution: [800, 600],
      },
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
      
      error: null,
      setError: (error) => set({ error }),
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
