import { ShaderCode, UniformConfig } from '@/types';

export interface DeepseekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface DeepseekResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: DeepseekMessage;
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

const SYSTEM_PROMPT = `你是一个专业的着色器程序员，擅长使用 GLSL 编写 WebGL 片段着色器。

你的任务是根据用户的自然语言描述，生成或修改 GLSL 片段着色器代码。

## 重要规则：

1. **必须使用 GLSL ES 1.0 语法**（兼容 WebGL 1.0）
2. **必须包含**：
   - \`precision highp float;\` 作为第一行
   - \`varying vec2 vUv;\` 用于接收纹理坐标
   - 可以使用 \`uniform float time;\` 作为时间变量
   - 可以使用 \`uniform vec2 resolution;\` 作为分辨率
   - \`void main()\` 函数
   - 输出 \`gl_FragColor\`

3. **代码格式**：
   - 将着色器代码包裹在 \`\`\`glsl ... \`\`\` 标记中
   - 如果有自定义 uniform 变量，请在 JSON 中描述

4. **Uniform 变量规范**：
   - 为每个自定义 uniform 变量提供合理的默认值、范围
   - 颜色类型的 uniform 使用 vec3 或 vec4
   - 数值类型使用 float 或 int
   - 为变量提供中文标签便于用户理解

## 响应格式示例：

\`\`\`json
{
  "explanation": "这里是对效果的解释",
  "uniforms": [
    {
      "name": "color1",
      "type": "vec3",
      "defaultValue": [0.8, 0.2, 0.1],
      "min": 0.0,
      "max": 1.0,
      "label": "主色",
      "description": "color"
    },
    {
      "name": "speed",
      "type": "float",
      "defaultValue": 1.0,
      "min": 0.1,
      "max": 5.0,
      "step": 0.1,
      "label": "动画速度"
    }
  ]
}
\`\`\`

\`\`\`glsl
precision highp float;

varying vec2 vUv;
uniform float time;
uniform vec2 resolution;
uniform vec3 color1;
uniform float speed;

void main() {
  vec2 uv = vUv;
  uv.x *= resolution.x / resolution.y;
  
  float wave = sin(uv.x * 10.0 + time * speed) * 0.5 + 0.5;
  vec3 color = mix(vec3(0.0), color1, wave);
  
  gl_FragColor = vec4(color, 1.0);
}
\`\`\`

请始终遵循这个格式，确保代码可以直接在 WebGL 中运行。`;

export async function callDeepseekAPI(
  messages: DeepseekMessage[],
  apiKey: string,
  baseUrl: string = 'https://api.deepseek.com',
  model: string = 'deepseek-chat'
): Promise<string> {
  if (!apiKey) {
    throw new Error('请先配置 API Key');
  }

  const url = `${baseUrl}/v1/chat/completions`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system' as const, content: SYSTEM_PROMPT },
        ...messages,
      ],
      temperature: 0.7,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `API 请求失败: ${response.status}`);
  }

  const data: DeepseekResponse = await response.json();
  return data.choices[0]?.message?.content || '';
}

export function buildUserPrompt(
  userInput: string,
  currentShader?: string,
  currentUniforms?: UniformConfig[]
): string {
  let prompt = userInput;

  if (currentShader) {
    prompt += `\n\n---\n当前着色器代码：\n\`\`\`glsl\n${currentShader}\n\`\`\``;

    if (currentUniforms && currentUniforms.length > 0) {
      const uniformInfo = currentUniforms
        .map(
          (u) =>
            `- ${u.name} (${u.type}): ${u.label || '未命名'} - 当前值: ${JSON.stringify(u.defaultValue)}`
        )
        .join('\n');
      prompt += `\n\n当前 uniform 变量：\n${uniformInfo}`;
    }

    prompt += `\n\n请根据以上内容进行修改。如果不需要修改，请保持代码不变。`;
  }

  return prompt;
}

export function buildIterationPrompt(
  userFeedback: string,
  currentShader: string,
  currentUniforms?: UniformConfig[]
): string {
  return buildUserPrompt(
    `请根据以下反馈修改着色器：\n\n${userFeedback}`,
    currentShader,
    currentUniforms
  );
}
