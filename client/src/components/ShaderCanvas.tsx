import React, { useEffect, useRef } from 'react';
import { WebGLRenderer } from '../utils/webglRenderer';
import { ShaderSlot, MixerConfig } from '../types';

interface ShaderCanvasProps {
  slots: ShaderSlot[];
  mixerConfig: MixerConfig;
}

export const ShaderCanvas: React.FC<ShaderCanvasProps> = ({ slots, mixerConfig }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<WebGLRenderer | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!canvasRef.current && !initializedRef.current) {
      try {
        const renderer = new WebGLRenderer(canvasRef.current);
        rendererRef.current = renderer;
        renderer.start();
        initializedRef.current = true;
      } catch (error) {
        console.error('Failed to initialize WebGL renderer:', error);
      }
    }

    return () => {
      if (rendererRef.current) {
        rendererRef.current.destroy();
        rendererRef.current = null;
        initializedRef.current = false;
      }
    };
  }, []);

  useEffect(() => {
    if (!rendererRef.current) return;

    const renderer = rendererRef.current;
    const allSlotIds = new Set(slots.map(s => s.id));

    slots.forEach((slot) => {
      renderer.setSlot(slot.id, slot.code, slot.params);
    });

    renderer.setMixerConfig(mixerConfig);
  }, [slots, mixerConfig]);

  return (
    <div className="relative w-full h-full bg-shader-darker">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: 'block' }}
      />
      
      {slots.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <svg className="w-16 h-16 mx-auto text-gray-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-gray-600 text-sm">添加效果以开始</p>
          </div>
        </div>
      )}
    </div>
  );
};
