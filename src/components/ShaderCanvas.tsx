import React, { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { useAppStore } from '@/store';
import { UniformConfig, UniformType, ShaderSlot } from '@/types';

interface ShaderCanvasProps {
  className?: string;
}

interface ShaderCanvasRef {
  getCanvas: () => HTMLCanvasElement | null;
}

declare global {
  interface Window {
    shaderCanvasRef?: ShaderCanvasRef;
  }
}

const BLEND_FRAGMENT_SHADER = `
precision highp float;

uniform sampler2D uTexture1;
uniform sampler2D uTexture2;
uniform sampler2D uMaskTexture;
uniform float uBlendAmount;
uniform float uMaskIntensity;
uniform bool uUseMask;
varying vec2 vUv;

void main() {
  vec4 color1 = texture2D(uTexture1, vUv);
  vec4 color2 = texture2D(uTexture2, vUv);
  
  float blendFactor = uBlendAmount;
  
  if (uUseMask) {
    vec4 maskColor = texture2D(uMaskTexture, vUv);
    float maskValue = (maskColor.r + maskColor.g + maskColor.b) / 3.0;
    blendFactor = mix(blendFactor, maskValue * uMaskIntensity, uMaskIntensity);
  }
  
  gl_FragColor = mix(color1, color2, clamp(blendFactor, 0.0, 1.0));
}
`;

const VERTEX_SHADER = `
precision highp float;

attribute vec3 position;
attribute vec2 uv;
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

function createShaderMaterial(
  vertexShader: string,
  fragmentShader: string
): THREE.ShaderMaterial {
  return new THREE.RawShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      time: { value: 0 },
      resolution: { value: new THREE.Vector2(1, 1) },
    },
  });
}

function createBlendMaterial(): THREE.ShaderMaterial {
  return new THREE.RawShaderMaterial({
    vertexShader: VERTEX_SHADER,
    fragmentShader: BLEND_FRAGMENT_SHADER,
    uniforms: {
      uTexture1: { value: null },
      uTexture2: { value: null },
      uMaskTexture: { value: null },
      uBlendAmount: { value: 0.5 },
      uMaskIntensity: { value: 1.0 },
      uUseMask: { value: false },
    },
  });
}

function updateUniform(
  material: THREE.ShaderMaterial,
  name: string,
  type: UniformType,
  value: number | number[] | boolean
): void {
  const uniform = material.uniforms[name];
  if (!uniform) {
    material.uniforms[name] = { value: undefined };
  }

  switch (type) {
    case 'float':
    case 'int':
      material.uniforms[name].value = value as number;
      break;
    case 'bool':
      material.uniforms[name].value = value as boolean;
      break;
    case 'vec2':
      material.uniforms[name].value = new THREE.Vector2(
        ...(value as number[])
      );
      break;
    case 'vec3':
      material.uniforms[name].value = new THREE.Vector3(
        ...(value as number[])
      );
      break;
    case 'vec4':
      material.uniforms[name].value = new THREE.Vector4(
        ...(value as number[])
      );
      break;
    case 'mat2':
      material.uniforms[name].value = value as number[];
      break;
    case 'mat3':
      material.uniforms[name].value = new THREE.Matrix3().fromArray(
        value as number[]
      );
      break;
    case 'mat4':
      material.uniforms[name].value = new THREE.Matrix4().fromArray(
        value as number[]
      );
      break;
    default:
      material.uniforms[name].value = value;
  }

  material.needsUpdate = true;
}

function syncAllUniforms(
  material: THREE.ShaderMaterial,
  uniforms: UniformConfig[],
  uniformValues: Record<string, number | number[] | boolean>
): void {
  uniforms.forEach((uniform) => {
    const value = uniformValues[uniform.name];
    if (value !== undefined) {
      updateUniform(material, uniform.name, uniform.type, value);
    }
  });
}

interface SlotRenderContext {
  slotId: string;
  material: THREE.ShaderMaterial;
  renderTarget: THREE.WebGLRenderTarget;
}

export const ShaderCanvas: React.FC<ShaderCanvasProps> = ({ className }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const blendMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  const animationRef = useRef<number | null>(null);
  const shaderTimeRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(Date.now());
  const isPlayingRef = useRef<boolean>(true);
  const speedRef = useRef<number>(1);
  const lastPreviewUpdateRef = useRef<number>(0);
  const slotContextsRef = useRef<Map<string, SlotRenderContext>>(new Map());
  const intermediateRenderTargetRef = useRef<THREE.WebGLRenderTarget | null>(null);

  const {
    shaderCode,
    uniforms,
    uniformValues,
    preview,
    updatePreview,
    shaderSlots,
    multiEffectMode,
    mixerConfig,
    activeSlotId,
  } = useAppStore();

  const uniformsRef = useRef(uniforms);
  const uniformValuesRef = useRef(uniformValues);
  const shaderSlotsRef = useRef(shaderSlots);
  const multiEffectModeRef = useRef(multiEffectMode);
  const mixerConfigRef = useRef(mixerConfig);
  const activeSlotIdRef = useRef(activeSlotId);
  const shaderCodeRef = useRef(shaderCode);
  
  uniformsRef.current = uniforms;
  uniformValuesRef.current = uniformValues;
  shaderSlotsRef.current = shaderSlots;
  multiEffectModeRef.current = multiEffectMode;
  mixerConfigRef.current = mixerConfig;
  activeSlotIdRef.current = activeSlotId;
  shaderCodeRef.current = shaderCode;

  const getCanvas = useCallback((): HTMLCanvasElement | null => {
    return rendererRef.current?.domElement || null;
  }, []);

  const createRenderTarget = useCallback((width: number, height: number) => {
    return new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
    });
  }, []);

  const getOrCreateSlotContext = useCallback((
    slot: ShaderSlot,
    width: number,
    height: number
  ): SlotRenderContext => {
    let context = slotContextsRef.current.get(slot.id);
    
    if (!context) {
      const material = createShaderMaterial(
        slot.shaderCode.vertex,
        slot.shaderCode.fragment
      );
      const renderTarget = createRenderTarget(width, height);
      
      context = {
        slotId: slot.id,
        material,
        renderTarget,
      };
      slotContextsRef.current.set(slot.id, context);
    } else {
      const currentFragment = context.material.fragmentShader;
      const newFragment = slot.shaderCode.fragment;
      
      if (currentFragment !== newFragment) {
        const newMaterial = createShaderMaterial(
          slot.shaderCode.vertex,
          newFragment
        );
        
        const oldUniforms = context.material.uniforms;
        Object.keys(oldUniforms).forEach((key) => {
          if (newMaterial.uniforms[key] === undefined) {
            newMaterial.uniforms[key] = oldUniforms[key];
          }
        });
        
        context.material.dispose();
        context.material = newMaterial;
      }
    }
    
    syncAllUniforms(context.material, slot.uniforms, slot.uniformValues);
    
    return context;
  }, [createRenderTarget]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    cameraRef.current = camera;

    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = createShaderMaterial(
      shaderCode.vertex,
      shaderCode.fragment
    );
    materialRef.current = material;

    const blendMaterial = createBlendMaterial();
    blendMaterialRef.current = blendMaterial;

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    meshRef.current = mesh;

    intermediateRenderTargetRef.current = createRenderTarget(
      container.clientWidth,
      container.clientHeight
    );

    lastFrameTimeRef.current = Date.now();

    const handleResize = () => {
      if (!container || !renderer) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      renderer.setSize(width, height);
      updatePreview({ resolution: { width, height } });

      if (materialRef.current) {
        materialRef.current.uniforms.resolution.value.set(width, height);
      }

      slotContextsRef.current.forEach((context) => {
        context.renderTarget.setSize(width, height);
        context.material.uniforms.resolution.value.set(width, height);
      });

      if (intermediateRenderTargetRef.current) {
        intermediateRenderTargetRef.current.setSize(width, height);
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);
    handleResize();

    return () => {
      resizeObserver.disconnect();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      blendMaterial.dispose();
      
      slotContextsRef.current.forEach((context) => {
        context.material.dispose();
        context.renderTarget.dispose();
      });
      slotContextsRef.current.clear();
      
      if (intermediateRenderTargetRef.current) {
        intermediateRenderTargetRef.current.dispose();
      }
      
      container.removeChild(renderer.domElement);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!materialRef.current) return;

    const newMaterial = createShaderMaterial(
      shaderCode.vertex,
      shaderCode.fragment
    );

    const oldUniforms = materialRef.current.uniforms;
    Object.keys(oldUniforms).forEach((key) => {
      if (newMaterial.uniforms[key] === undefined) {
        newMaterial.uniforms[key] = oldUniforms[key];
      }
    });

    if (meshRef.current) {
      meshRef.current.material = newMaterial;
      materialRef.current.dispose();
      materialRef.current = newMaterial;
    }

    syncAllUniforms(newMaterial, uniformsRef.current, uniformValuesRef.current);
  }, [shaderCode.vertex, shaderCode.fragment]);

  useEffect(() => {
    if (!materialRef.current) return;
    syncAllUniforms(materialRef.current, uniforms, uniformValues);
  }, [uniforms, uniformValues]);

  useEffect(() => {
    isPlayingRef.current = preview.isPlaying;
  }, [preview.isPlaying]);

  useEffect(() => {
    speedRef.current = preview.speed;
  }, [preview.speed]);

  useEffect(() => {
    const animate = () => {
      if (!rendererRef.current || !sceneRef.current || !cameraRef.current || !meshRef.current) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      const now = Date.now();
      const delta = (now - lastFrameTimeRef.current) / 1000;
      lastFrameTimeRef.current = now;

      if (isPlayingRef.current) {
        shaderTimeRef.current += delta * speedRef.current;

        if (now - lastPreviewUpdateRef.current >= 100) {
          updatePreview({ time: shaderTimeRef.current });
          lastPreviewUpdateRef.current = now;
        }
      }

      const container = containerRef.current;
      const width = container?.clientWidth || 1;
      const height = container?.clientHeight || 1;
      const isMultiEffect = multiEffectModeRef.current;
      const slots = shaderSlotsRef.current.filter(s => s.isVisible);

      if (isMultiEffect && slots.length > 0) {
        const renderedContexts: SlotRenderContext[] = [];
        
        slots.forEach((slot) => {
          const context = getOrCreateSlotContext(slot, width, height);
          
          context.material.uniforms.time.value = shaderTimeRef.current;
          context.material.uniforms.resolution.value.set(width, height);
          
          const oldRenderTarget = rendererRef.current!.getRenderTarget();
          rendererRef.current!.setRenderTarget(context.renderTarget);
          
          meshRef.current!.material = context.material;
          rendererRef.current!.render(sceneRef.current!, cameraRef.current!);
          
          rendererRef.current!.setRenderTarget(oldRenderTarget);
          
          renderedContexts.push(context);
        });

        if (renderedContexts.length === 1) {
          const tex = renderedContexts[0].renderTarget.texture;
          if (materialRef.current) {
            materialRef.current.uniforms.time.value = shaderTimeRef.current;
            materialRef.current.uniforms.resolution.value.set(width, height);
          }
          
          if (blendMaterialRef.current) {
            blendMaterialRef.current.uniforms.uTexture1.value = tex;
            blendMaterialRef.current.uniforms.uTexture2.value = tex;
            blendMaterialRef.current.uniforms.uBlendAmount.value = 0;
            blendMaterialRef.current.uniforms.uUseMask.value = false;
            meshRef.current!.material = blendMaterialRef.current;
          }
        } else if (renderedContexts.length >= 2) {
          const mixer = mixerConfigRef.current;
          let currentTexture = renderedContexts[0].renderTarget.texture;
          
          for (let i = 1; i < renderedContexts.length; i++) {
            const nextContext = renderedContexts[i];
            const slot = slots.find(s => s.id === nextContext.slotId);
            const blendAmount = slot?.blendAmount ?? 0.5;
            
            if (blendMaterialRef.current) {
              blendMaterialRef.current.uniforms.uTexture1.value = currentTexture;
              blendMaterialRef.current.uniforms.uTexture2.value = nextContext.renderTarget.texture;
              blendMaterialRef.current.uniforms.uBlendAmount.value = blendAmount;
              
              if (mixer.maskSlotId && i === renderedContexts.length - 1) {
                const maskContext = slotContextsRef.current.get(mixer.maskSlotId);
                if (maskContext) {
                  blendMaterialRef.current.uniforms.uMaskTexture.value = maskContext.renderTarget.texture;
                  blendMaterialRef.current.uniforms.uMaskIntensity.value = mixer.maskIntensity;
                  blendMaterialRef.current.uniforms.uUseMask.value = true;
                } else {
                  blendMaterialRef.current.uniforms.uUseMask.value = false;
                }
              } else {
                blendMaterialRef.current.uniforms.uUseMask.value = false;
              }
              
              meshRef.current!.material = blendMaterialRef.current;
              
              const isLast = i === renderedContexts.length - 1;
              if (!isLast && intermediateRenderTargetRef.current) {
                const oldTarget = rendererRef.current!.getRenderTarget();
                rendererRef.current!.setRenderTarget(intermediateRenderTargetRef.current);
                rendererRef.current!.render(sceneRef.current!, cameraRef.current!);
                rendererRef.current!.setRenderTarget(oldTarget);
                currentTexture = intermediateRenderTargetRef.current.texture;
              }
            }
          }
        }
        
        if (renderedContexts.length >= 2) {
          rendererRef.current!.setRenderTarget(null);
          rendererRef.current!.render(sceneRef.current!, cameraRef.current!);
        } else if (renderedContexts.length === 1 && blendMaterialRef.current) {
          meshRef.current!.material = blendMaterialRef.current;
          rendererRef.current!.setRenderTarget(null);
          rendererRef.current!.render(sceneRef.current!, cameraRef.current!);
        }
      } else {
        if (materialRef.current) {
          materialRef.current.uniforms.time.value = shaderTimeRef.current;
          materialRef.current.uniforms.resolution.value.set(width, height);
        }
        meshRef.current!.material = materialRef.current;
        rendererRef.current!.setRenderTarget(null);
        rendererRef.current!.render(sceneRef.current!, cameraRef.current!);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    window.shaderCanvasRef = { getCanvas };
    return () => {
      delete window.shaderCanvasRef;
    };
  }, [getCanvas]);

  return (
    <div
      ref={containerRef}
      className={`w-full h-full bg-gray-900 ${className || ''}`}
    />
  );
};

export default ShaderCanvas;
