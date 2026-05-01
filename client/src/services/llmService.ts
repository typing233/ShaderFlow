import { LLMConfig } from '../types';

export interface GenerateStreamHandler {
  onChunk: (content: string) => void;
  onComplete: () => void;
  onError: (error: string) => void;
}

export async function testConnection(config: LLMConfig): Promise<{ success: boolean; error?: string; models?: string[] }> {
  try {
    const response = await fetch('/api/llm/test-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });

    const data = await response.json();
    return data;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Connection failed'
    };
  }
}

export async function generateShader(
  prompt: string,
  config: LLMConfig,
  handlers: GenerateStreamHandler
): Promise<void> {
  const { onChunk, onComplete, onError } = handlers;

  try {
    const response = await fetch('/api/llm/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        baseUrl: config.baseUrl,
        apiKey: config.apiKey,
        modelName: config.modelName
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      onError(errorData.error || `API request failed: ${response.status}`);
      return;
    }

    if (!response.body) {
      onError('No response body');
      return;
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
            onComplete();
            return;
          }
          
          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              onChunk(parsed.content);
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    }

    onComplete();
  } catch (error) {
    onError(error instanceof Error ? error.message : 'Generation failed');
  }
}
