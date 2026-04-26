import { ShaderCode, UniformConfig } from '@/types';

export async function generateShareLink(
  shaderCode: ShaderCode,
  uniforms: UniformConfig[]
): Promise<string> {
  const data = {
    v: 1,
    shader: shaderCode,
    uniforms: uniforms.map(u => ({
      name: u.name,
      type: u.type,
      defaultValue: u.defaultValue,
      min: u.min,
      max: u.max,
      step: u.step,
      label: u.label,
    })),
  };

  const jsonString = JSON.stringify(data);
  const compressed = btoa(encodeURIComponent(jsonString));
  const baseUrl = `${window.location.origin}${window.location.pathname}`;
  
  return `${baseUrl}?s=${encodeURIComponent(compressed)}`;
}

export function parseShareLink(): {
  shaderCode?: ShaderCode;
  uniforms?: UniformConfig[];
} | null {
  const urlParams = new URLSearchParams(window.location.search);
  const compressed = urlParams.get('s');
  
  if (!compressed) return null;
  
  try {
    const decoded = decodeURIComponent(compressed);
    const jsonString = atob(decoded);
    const data = JSON.parse(jsonString);
    
    if (data.v === 1 && data.shader) {
      return {
        shaderCode: data.shader,
        uniforms: data.uniforms,
      };
    }
  } catch {
    console.error('无法解析分享链接');
  }
  
  return null;
}

export function exportCode(shaderCode: ShaderCode, uniforms?: UniformConfig[]): string {
  let output = `// ShaderFlow 导出的着色器\n`;
  output += `// 生成时间: ${new Date().toISOString()}\n\n`;
  
  if (uniforms && uniforms.length > 0) {
    output += `// Uniform 变量配置:\n`;
    uniforms.forEach((u) => {
      output += `//   - ${u.name} (${u.type}): ${u.label || u.name}\n`;
      output += `//     默认值: ${JSON.stringify(u.defaultValue)}\n`;
      if (u.min !== undefined) output += `//     范围: [${u.min}, ${u.max}]\n`;
    });
    output += `\n`;
  }
  
  output += `// === 顶点着色器 ===\n`;
  output += shaderCode.vertex;
  output += `\n\n// === 片段着色器 ===\n`;
  output += shaderCode.fragment;
  
  return output;
}

export function downloadFile(content: string, filename: string, type: string = 'text/plain'): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportCodeToFile(shaderCode: ShaderCode, uniforms?: UniformConfig[]): void {
  const content = exportCode(shaderCode, uniforms);
  downloadFile(content, 'shader.glsl', 'text/plain');
}

export function exportJSON(shaderCode: ShaderCode, uniforms?: UniformConfig[]): void {
  const data = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    shader: {
      vertex: shaderCode.vertex,
      fragment: shaderCode.fragment,
    },
    uniforms: uniforms?.map(u => ({
      name: u.name,
      type: u.type,
      defaultValue: u.defaultValue,
      min: u.min,
      max: u.max,
      step: u.step,
      label: u.label,
    })),
  };
  
  const content = JSON.stringify(data, null, 2);
  downloadFile(content, 'shaderflow-project.json', 'application/json');
}

export async function captureCanvas(canvas: HTMLCanvasElement): Promise<string> {
  return canvas.toDataURL('image/png');
}

export async function downloadScreenshot(canvas: HTMLCanvasElement): Promise<void> {
  const dataUrl = await captureCanvas(canvas);
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `shaderflow-${Date.now()}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function recordVideo(
  canvas: HTMLCanvasElement,
  duration: number = 5,
  fps: number = 30
): Promise<Blob> {
  const stream = canvas.captureStream(fps);
  const mediaRecorder = new MediaRecorder(stream, {
    mimeType: 'video/webm;codecs=vp9',
    videoBitsPerSecond: 5_000_000,
  });

  const chunks: Blob[] = [];
  
  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) {
      chunks.push(e.data);
    }
  };

  return new Promise((resolve, reject) => {
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      resolve(blob);
    };

    mediaRecorder.onerror = (e) => {
      reject(e);
    };

    mediaRecorder.start();
    
    setTimeout(() => {
      mediaRecorder.stop();
    }, duration * 1000);
  });
}

export async function downloadVideo(
  canvas: HTMLCanvasElement,
  duration: number = 5,
  fps: number = 30
): Promise<void> {
  const blob = await recordVideo(canvas, duration, fps);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `shaderflow-${Date.now()}.webm`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
