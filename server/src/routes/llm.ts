import { Router, Request, Response } from 'express';

export const llmRouter = Router();

interface LLMConfig {
  baseUrl: string;
  apiKey: string;
  modelName: string;
}

const SYSTEM_PROMPT = `You are a GLSL shader expert. Generate only valid GLSL fragment shader code for WebGL 2.0.

Requirements:
1. Use WebGL 2.0 compatible syntax (#version 300 es)
2. Include these required uniforms:
   - uniform float u_time;
   - uniform vec2 u_resolution;
   - uniform vec2 u_mouse;
3. Define configurable parameters as uniforms with float or vec3/vec4 types.
   Use comments like // @param min=0 max=10 step=0.1 label="Speed" to define UI controls.
4. Output color to out vec4 fragColor;
5. Keep code clean and well-structured.

Example parameter format:
uniform float u_speed; // @param min=0 max=5 step=0.1 label="Speed" default=1.0
uniform vec3 u_color; // @param label="Base Color" default=#ff0000

Only output the GLSL code, no explanations or markdown.`;

llmRouter.post('/test-connection', async (req: Request, res: Response) => {
  try {
    const { baseUrl, apiKey, modelName } = req.body as LLMConfig;

    if (!baseUrl || !apiKey || !modelName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: baseUrl, apiKey, modelName'
      });
    }

    const url = baseUrl.endsWith('/') ? `${baseUrl}models` : `${baseUrl}/models`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({
        success: false,
        error: `API request failed: ${response.status} - ${errorText.substring(0, 200)}`
      });
    }

    const data = await response.json() as { data?: Array<{ id: string }> };
    const models = data.data?.map(m => m.id) || [];
    const modelExists = models.length === 0 || models.includes(modelName);

    res.json({
      success: true,
      message: 'Connection successful',
      models: models,
      modelAvailable: modelExists
    });

  } catch (error) {
    console.error('LLM test error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

llmRouter.post('/generate', async (req: Request, res: Response) => {
  try {
    const { prompt, baseUrl, apiKey, modelName } = req.body as {
      prompt: string;
      baseUrl: string;
      apiKey: string;
      modelName: string;
    };

    if (!prompt || !baseUrl || !apiKey || !modelName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    const url = baseUrl.endsWith('/') ? `${baseUrl}chat/completions` : `${baseUrl}/chat/completions`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Generate a GLSL shader for: ${prompt}` }
        ],
        stream: true
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({
        success: false,
        error: `API request failed: ${response.status} - ${errorText.substring(0, 500)}`
      });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    if (!response.body) {
      return res.end();
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            res.write('data: [DONE]\n\n');
          } else {
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                res.write(`data: ${JSON.stringify({ content })}\n\n`);
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    }

    res.end();

  } catch (error) {
    console.error('LLM generate error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
});
