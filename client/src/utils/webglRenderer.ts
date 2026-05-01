import { ShaderParam, ShaderSlot, MixerConfig } from '../types';

const DEFAULT_VERTEX_SHADER = `#version 300 es
in vec2 a_position;
out vec2 v_uv;

void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const MIXER_FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 v_uv;
uniform sampler2D u_texture1;
uniform sampler2D u_texture2;
uniform sampler2D u_maskTexture;
uniform float u_blendAmount;
uniform float u_maskIntensity;
uniform int u_useMask;

out vec4 fragColor;

void main() {
    vec4 color1 = texture(u_texture1, v_uv);
    vec4 color2 = texture(u_texture2, v_uv);
    
    float blendFactor = u_blendAmount;
    
    if (u_useMask == 1) {
        vec4 maskColor = texture(u_maskTexture, v_uv);
        float maskValue = (maskColor.r + maskColor.g + maskColor.b) / 3.0;
        blendFactor *= maskValue * u_maskIntensity;
    }
    
    vec4 result = mix(color1, color2, clamp(blendFactor, 0.0, 1.0));
    fragColor = result;
}`;

class ShaderProgram {
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram | null = null;
  private uniforms: Map<string, WebGLUniformLocation | null> = new Map();
  private vertexBuffer: WebGLBuffer | null = null;
  private positionLoc: number = -1;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    this.createVertexBuffer();
  }

  private createVertexBuffer() {
    const { gl } = this;
    this.vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        -1, -1, 1, -1, -1, 1,
        -1, 1, 1, -1, 1, 1
      ]),
      gl.STATIC_DRAW
    );
  }

  compileShader(type: number, source: string): WebGLShader | null {
    const { gl } = this;
    const shader = gl.createShader(type);
    if (!shader) return null;

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      console.error('Shader compile error:', info);
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  linkProgram(vertexSource: string, fragmentSource: string): WebGLProgram | null {
    const { gl } = this;

    const vertexShader = this.compileShader(gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fragmentSource);

    if (!vertexShader || !fragmentShader) {
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      return null;
    }

    const program = gl.createProgram();
    if (!program) {
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      return null;
    }

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program);
      console.error('Program link error:', info);
      gl.deleteProgram(program);
      return null;
    }

    return program;
  }

  init(fragmentSource: string): boolean {
    const { gl } = this;

    this.program = this.linkProgram(DEFAULT_VERTEX_SHADER, fragmentSource);
    if (!this.program) return false;

    gl.useProgram(this.program);

    this.positionLoc = gl.getAttribLocation(this.program, 'a_position');

    this.uniforms.clear();
    const uniformCount = gl.getProgramParameter(this.program, gl.ACTIVE_UNIFORMS) || 0;
    for (let i = 0; i < uniformCount; i++) {
      const info = gl.getActiveUniform(this.program, i);
      if (info) {
        const loc = gl.getUniformLocation(this.program, info.name);
        this.uniforms.set(info.name, loc);
      }
    }

    return true;
  }

  setUniform(name: string, value: any): boolean {
    const { gl, program, uniforms } = this;
    if (!program) return false;

    const loc = uniforms.get(name);
    if (!loc) return false;

    gl.useProgram(program);

    if (typeof value === 'number') {
      gl.uniform1f(loc, value);
    } else if (Array.isArray(value)) {
      switch (value.length) {
        case 2:
          gl.uniform2f(loc, value[0], value[1]);
          break;
        case 3:
          gl.uniform3f(loc, value[0], value[1], value[2]);
          break;
        case 4:
          gl.uniform4f(loc, value[0], value[1], value[2], value[3]);
          break;
      }
    } else if (typeof value === 'boolean') {
      gl.uniform1i(loc, value ? 1 : 0);
    }

    return true;
  }

  render(time: number, width: number, height: number, mouseX: number = 0, mouseY: number = 0) {
    const { gl, program, vertexBuffer, positionLoc } = this;
    if (!program || !vertexBuffer) return;

    gl.useProgram(program);

    this.setUniform('u_time', time);
    this.setUniform('u_resolution', [width, height]);
    this.setUniform('u_mouse', [mouseX, mouseY]);

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  destroy() {
    const { gl, program, vertexBuffer } = this;
    if (program) gl.deleteProgram(program);
    if (vertexBuffer) gl.deleteBuffer(vertexBuffer);
    this.program = null;
    this.vertexBuffer = null;
  }
}

class Framebuffer {
  private gl: WebGL2RenderingContext;
  private framebuffer: WebGLFramebuffer | null = null;
  private texture: WebGLTexture | null = null;
  private width: number = 0;
  private height: number = 0;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
  }

  init(width: number, height: number): boolean {
    const { gl } = this;

    this.width = width;
    this.height = height;

    this.framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);

    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture, 0);

    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
      console.error('Framebuffer is not complete');
      this.destroy();
      return false;
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return true;
  }

  resize(width: number, height: number) {
    if (this.width === width && this.height === height) return;
    this.destroy();
    this.init(width, height);
  }

  bind() {
    const { gl, framebuffer } = this;
    if (framebuffer) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    }
  }

  unbind() {
    this.gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  getTexture(): WebGLTexture | null {
    return this.texture;
  }

  getWidth(): number { return this.width; }
  getHeight(): number { return this.height; }

  destroy() {
    const { gl, framebuffer, texture } = this;
    if (framebuffer) gl.deleteFramebuffer(framebuffer);
    if (texture) gl.deleteTexture(texture);
    this.framebuffer = null;
    this.texture = null;
  }
}

export class WebGLRenderer {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext;
  private shaderPrograms: Map<string, ShaderProgram> = new Map();
  private framebuffers: Map<string, Framebuffer> = new Map();
  private mixerProgram: ShaderProgram;
  private animationId: number = 0;
  private startTime: number = performance.now();
  private mouseX: number = 0;
  private mouseY: number = 0;

  private slots: Map<string, { code: string; params: ShaderParam[] }> = new Map();
  private mixerConfig: MixerConfig = {
    blendAmount: 0.5,
    maskIntensity: 1.0,
    maskSlot: null
  };
  private isRendering: boolean = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    
    const gl = canvas.getContext('webgl2', {
      antialias: true,
      alpha: true,
      premultipliedAlpha: false,
      preserveDrawingBuffer: true
    });

    if (!gl) {
      throw new Error('WebGL 2.0 is not supported in this browser');
    }

    this.gl = gl;
    this.mixerProgram = new ShaderProgram(gl);
    this.mixerProgram.init(MIXER_FRAGMENT_SHADER);

    this.setupMouseListeners();
  }

  private setupMouseListeners() {
    const updateMouse = (e: MouseEvent | Touch) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = (e.clientX - rect.left) / rect.width;
      this.mouseY = 1 - (e.clientY - rect.top) / rect.height;
    };

    this.canvas.addEventListener('mousemove', (e) => updateMouse(e));
    this.canvas.addEventListener('touchmove', (e) => {
      if (e.touches[0]) updateMouse(e.touches[0]);
    });
  }

  setSlot(id: string, code: string, params: ShaderParam[]): boolean {
    this.slots.set(id, { code, params });

    let program = this.shaderPrograms.get(id);
    if (!program) {
      program = new ShaderProgram(this.gl);
      this.shaderPrograms.set(id, program);
    }

    const success = program.init(code);

    if (!this.framebuffers.has(id)) {
      const fb = new Framebuffer(this.gl);
      fb.init(this.canvas.width, this.canvas.height);
      this.framebuffers.set(id, fb);
    }

    return success;
  }

  removeSlot(id: string) {
    this.slots.delete(id);
    
    const program = this.shaderPrograms.get(id);
    if (program) {
      program.destroy();
      this.shaderPrograms.delete(id);
    }

    const fb = this.framebuffers.get(id);
    if (fb) {
      fb.destroy();
      this.framebuffers.delete(id);
    }
  }

  updateParam(slotId: string, paramName: string, value: any) {
    const slot = this.slots.get(slotId);
    if (!slot) return;

    for (const param of slot.params) {
      if (param.name === paramName) {
        param.value = value;
        break;
      }
    }
  }

  setMixerConfig(config: Partial<MixerConfig>) {
    this.mixerConfig = { ...this.mixerConfig, ...config };
  }

  private resize() {
    const displayWidth = this.canvas.clientWidth;
    const displayHeight = this.canvas.clientHeight;

    if (this.canvas.width !== displayWidth || this.canvas.height !== displayHeight) {
      this.canvas.width = displayWidth;
      this.canvas.height = displayHeight;
      this.gl.viewport(0, 0, displayWidth, displayHeight);

      this.framebuffers.forEach((fb) => {
        fb.resize(displayWidth, displayHeight);
      });
    }
  }

  private renderSlots(time: number) {
    const { gl } = this;
    const width = this.canvas.width;
    const height = this.canvas.height;

    this.slots.forEach((slot, id) => {
      const program = this.shaderPrograms.get(id);
      const fb = this.framebuffers.get(id);

      if (!program || !fb) return;

      fb.bind();
      gl.viewport(0, 0, fb.getWidth(), fb.getHeight());
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      slot.params.forEach((param) => {
        program.setUniform(param.name, param.value);
      });

      program.render(time, width, height, this.mouseX, this.mouseY);
      fb.unbind();
    });
  }

  private renderComposite(time: number) {
    const { gl } = this;
    const width = this.canvas.width;
    const height = this.canvas.height;

    gl.viewport(0, 0, width, height);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.clearColor(0.05, 0.05, 0.08, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const slotIds = Array.from(this.slots.keys());
    
    if (slotIds.length === 0) return;
    
    if (slotIds.length === 1) {
      const fb = this.framebuffers.get(slotIds[0]);
      if (fb) {
        this.blitFramebuffer(fb);
      }
      return;
    }

    const { blendAmount, maskIntensity, maskSlot } = this.mixerConfig;

    const slot1 = slotIds[0];
    const slot2 = slotIds[1];
    const fb1 = this.framebuffers.get(slot1);
    const fb2 = this.framebuffers.get(slot2);

    if (!fb1 || !fb2) return;

    const tex1 = fb1.getTexture();
    const tex2 = fb2.getTexture();

    if (!tex1 || !tex2) return;

    let maskTex: WebGLTexture | null = null;
    let useMask = 0;

    if (maskSlot && slotIds.includes(maskSlot)) {
      const maskFb = this.framebuffers.get(maskSlot);
      if (maskFb) {
        maskTex = maskFb.getTexture();
        useMask = maskTex ? 1 : 0;
      }
    }

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex1);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, tex2);
    gl.activeTexture(gl.TEXTURE2);
    if (maskTex) {
      gl.bindTexture(gl.TEXTURE_2D, maskTex);
    }

    this.mixerProgram.setUniform('u_texture1', 0);
    this.mixerProgram.setUniform('u_texture2', 1);
    this.mixerProgram.setUniform('u_maskTexture', 2);
    this.mixerProgram.setUniform('u_blendAmount', blendAmount);
    this.mixerProgram.setUniform('u_maskIntensity', maskIntensity);
    this.mixerProgram.setUniform('u_useMask', useMask);

    this.mixerProgram.render(time, width, height);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  private blitFramebuffer(sourceFb: Framebuffer) {
    const { gl } = this;
    const tex = sourceFb.getTexture();
    if (!tex) return;

    const simpleFS = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_tex;
out vec4 fragColor;
void main() { fragColor = texture(u_tex, v_uv); }`;

    const tempProgram = new ShaderProgram(gl);
    if (tempProgram.init(simpleFS)) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      tempProgram.setUniform('u_tex', 0);
      tempProgram.render(0, this.canvas.width, this.canvas.height);
    }
    tempProgram.destroy();
  }

  private animate = () => {
    if (!this.isRendering) return;

    this.resize();

    const time = (performance.now() - this.startTime) / 1000;

    this.renderSlots(time);
    this.renderComposite(time);

    this.animationId = requestAnimationFrame(this.animate);
  };

  start() {
    if (this.isRendering) return;
    this.isRendering = true;
    this.startTime = performance.now();
    this.animate();
  }

  stop() {
    this.isRendering = false;
    cancelAnimationFrame(this.animationId);
  }

  destroy() {
    this.stop();
    
    this.shaderPrograms.forEach((p) => p.destroy());
    this.framebuffers.forEach((fb) => fb.destroy());
    this.mixerProgram.destroy();
    
    this.shaderPrograms.clear();
    this.framebuffers.clear();
    this.slots.clear();
  }
}
