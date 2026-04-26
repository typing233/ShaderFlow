import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Bot, User, Sparkles, Settings, RotateCcw } from 'lucide-react';
import { useAppStore } from '@/store';
import { callDeepseekAPI, buildUserPrompt, DeepseekMessage } from '@/lib/deepseek';
import { parseUniformsFromAIResponse } from '@/lib/uniformParser';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

interface MessageItemProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const MessageItem: React.FC<MessageItemProps> = ({ role, content }) => {
  const isUser = role === 'user';
  
  return (
    <div className={cn(
      'flex gap-3 p-4',
      isUser ? 'bg-gray-900/50' : 'bg-gray-800/50'
    )}>
      <div className={cn(
        'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
        isUser
          ? 'bg-shader-600 text-white'
          : 'bg-gray-700 text-gray-300'
      )}>
        {isUser ? <User size={16} /> : <Bot size={16} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-gray-500 mb-1">
          {isUser ? '你' : 'AI 助手'}
        </div>
        <div className="text-sm text-gray-200 whitespace-pre-wrap break-words">
          {content}
        </div>
      </div>
    </div>
  );
};

interface AIPanelProps {
  className?: string;
  onOpenSettings: () => void;
}

export const AIPanel: React.FC<AIPanelProps> = ({ className, onOpenSettings }) => {
  const {
    messages,
    addMessage,
    clearMessages,
    settings,
    shaderCode,
    uniforms,
    updateFragmentShader,
    setUniforms,
    isGenerating,
    setIsGenerating,
    error,
    setError,
  } = useAppStore();

  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isGenerating]);

  const handleSubmit = async () => {
    if (!inputValue.trim() || isGenerating) return;

    const userInput = inputValue.trim();
    setInputValue('');

    addMessage({
      role: 'user',
      content: userInput,
    });

    setIsGenerating(true);
    setError(null);

    try {
      const conversationMessages: DeepseekMessage[] = messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));

      const prompt = buildUserPrompt(
        userInput,
        messages.length > 0 ? shaderCode.fragment : undefined,
        messages.length > 0 ? uniforms : undefined
      );

      conversationMessages.push({
        role: 'user',
        content: prompt,
      });

      const response = await callDeepseekAPI(
        conversationMessages,
        settings.apiKey,
        settings.baseUrl,
        settings.model
      );

      addMessage({
        role: 'assistant',
        content: response,
      });

      const parsed = parseUniformsFromAIResponse(response);
      if (parsed) {
        updateFragmentShader(parsed.shaderCode);
        if (parsed.uniforms.length > 0) {
          setUniforms(parsed.uniforms);
        }
      }
    } catch (err: any) {
      setError(err.message || '生成失败，请重试');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className={cn('flex flex-col h-full bg-gray-900/90', className)}>
      <div className="flex items-center justify-between p-3 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-shader-400" />
          <span className="text-sm font-medium text-gray-200">AI 生成</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={clearMessages}
            className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition-colors"
            title="清空对话"
          >
            <RotateCcw size={16} />
          </button>
          <button
            onClick={onOpenSettings}
            className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition-colors"
            title="API 设置"
          >
            <Settings size={16} />
          </button>
        </div>
      </div>

      {error && (
        <div className="px-4 py-2 bg-red-900/30 border-b border-red-800/50">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {!settings.apiKey && (
        <div className="p-4 m-3 bg-yellow-900/30 border border-yellow-800/50 rounded-lg">
          <p className="text-sm text-yellow-300 mb-2">
            请先配置 Deepseek API Key 才能使用 AI 生成功能
          </p>
          <button
            onClick={onOpenSettings}
            className="text-sm text-yellow-400 hover:text-yellow-300 underline"
          >
            前往设置
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
            <div className="w-16 h-16 rounded-full bg-shader-900/50 flex items-center justify-center mb-4">
              <Sparkles size={32} className="text-shader-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-200 mb-2">
              用自然语言描述你的视觉效果
            </h3>
            <p className="text-sm text-gray-400 max-w-xs">
              例如："创建一个流动的火焰效果" 或 "做一个星空背景，带闪烁的星星"
            </p>
            <div className="mt-6 space-y-2 w-full max-w-xs">
              {[
                '流动的彩色波纹效果',
                '像素风格的火焰动画',
                '动态渐变的星云背景',
                '数字雨效果',
              ].map((example, i) => (
                <button
                  key={i}
                  onClick={() => setInputValue(example)}
                  className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:text-gray-200 hover:bg-gray-800/50 rounded-lg transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <MessageItem
            key={message.id}
            role={message.role}
            content={message.content}
          />
        ))}

        {isGenerating && (
          <div className="flex gap-3 p-4 bg-gray-800/50">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-gray-700 text-gray-300">
              <Loader2 size={16} className="animate-spin" />
            </div>
            <div className="flex-1">
              <div className="text-xs text-gray-500 mb-1">AI 助手</div>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Loader2 size={14} className="animate-spin" />
                正在生成着色器...
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 border-t border-gray-800">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="描述你想要的视觉效果..."
              disabled={isGenerating}
              className={cn(
                'w-full px-4 py-3 text-sm text-gray-200 bg-gray-800 border border-gray-700 rounded-xl resize-none focus:outline-none focus:border-shader-500 placeholder-gray-500 transition-colors',
                isGenerating && 'opacity-50 cursor-not-allowed'
              )}
              rows={1}
              style={{ minHeight: '48px', maxHeight: '120px' }}
            />
          </div>
          <button
            onClick={handleSubmit}
            disabled={!inputValue.trim() || isGenerating}
            className={cn(
              'flex items-center justify-center w-12 h-12 rounded-xl transition-all',
              inputValue.trim() && !isGenerating
                ? 'bg-shader-500 hover:bg-shader-400 text-white'
                : 'bg-gray-800 text-gray-500 cursor-not-allowed'
            )}
          >
            {isGenerating ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Send size={20} />
            )}
          </button>
        </div>
        <p className="text-xs text-gray-600 mt-2 text-center">
          按 Enter 发送，Shift + Enter 换行
        </p>
      </div>
    </div>
  );
};

export default AIPanel;
