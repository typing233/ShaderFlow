import React, { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { useAppStore } from '@/store';
import { UniformConfig, UniformType } from '@/types';

interface ShaderCanvasProps {
  className?: string;
}

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

export const ShaderCanvas: React.FC<ShaderCanvasProps> = ({ className }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const isPlayingRef = useRef<boolean>(true);

  const {
    shaderCode,
    uniforms,
    uniformValues,
    preview,
    updatePreview,
  } = useAppStore();

  const getCanvas = useCallback((): HTMLCanvasElement | null => {
    return rendererRef.current?.domElement || null;
  }, []);

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

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    meshRef.current = mesh;

    startTimeRef.current = Date.now();

    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      renderer.setSize(width, height);
      updatePreview({ resolution: { width, height } });
      
      if (materialRef.current) {
        materialRef.current.uniforms.resolution.value.set(width, height);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      container.removeChild(renderer.domElement);
    };
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

    syncAllUniforms(newMaterial, uniforms, uniformValues);
  }, [shaderCode.vertex, shaderCode.fragment]);

  useEffect(() => {
    if (!materialRef.current) return;
    syncAllUniforms(materialRef.current, uniforms, uniformValues);
  }, [uniforms, uniformValues]);

  useEffect(() => {
    isPlayingRef.current = preview.isPlaying;
  }, [preview.isPlaying]);

  useEffect(() => {
    const animate = () => {
      if (!materialRef.current || !rendererRef.current || !sceneRef.current || !cameraRef.current) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      const now = Date.now();
      const elapsed = (now - startTimeRef.current) / 1000;

      if (isPlayingRef.current) {
        const timeValue = elapsed * preview.speed;
        materialRef.current.uniforms.time.value = timeValue;
        updatePreview({ time: timeValue });
      }

      rendererRef.current.render(sceneRef.current, cameraRef.current);
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [preview.speed]);

  useEffect(() => {
    (window as any).shaderCanvasRef = { getCanvas };
    return () => {
      delete (window as any).shaderCanvasRef;
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
