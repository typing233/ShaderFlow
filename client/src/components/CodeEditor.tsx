import React, { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

interface CodeEditorProps {
  code: string;
  onChange: (code: string) => void;
  isGenerating: boolean;
}

const GLSL_THEME: monaco.editor.IStandaloneThemeData = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'keyword.glsl', foreground: 'c586c0', fontStyle: 'bold' },
    { token: 'type.glsl', foreground: '4ec9b0' },
    { token: 'function.glsl', foreground: 'dcdcaa' },
    { token: 'variable.glsl', foreground: '9cdcfe' },
    { token: 'number.glsl', foreground: 'b5cea8' },
    { token: 'comment.glsl', foreground: '6a9955', fontStyle: 'italic' },
    { token: 'string.glsl', foreground: 'ce9178' },
  ],
  colors: {
    'editor.background': '#0a0a0f',
    'editor.foreground': '#d4d4d4',
    'editorLineNumber.foreground': '#6e7681',
    'editorCursor.foreground': '#aeb6c0',
    'editor.selectionBackground': '#264f78',
    'editor.inactiveSelectionBackground': '#2a2d2e',
  }
};

const GLSL_LANGUAGE_CONFIG: monaco.languages.ILanguageConfiguration = {
  comments: {
    lineComment: '//',
    blockComment: ['/*', '*/']
  },
  brackets: [
    ['{', '}'],
    ['[', ']'],
    ['(', ')']
  ],
  autoClosingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"' },
    { open: "'", close: "'" }
  ],
  surroundingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"' },
    { open: "'", close: "'" }
  ]
};

const GLSL_KEYWORDS = [
  'break', 'continue', 'do', 'for', 'while', 'if', 'else',
  'switch', 'case', 'default', 'return', 'discard', 'in', 'out',
  'inout', 'uniform', 'attribute', 'varying', 'const', 'precision',
  'highp', 'mediump', 'lowp', 'layout', 'smooth', 'flat', 'noperspective',
  'centroid', 'invariant', 'precise', 'struct', 'layout', 'binding',
  'location', 'index', 'component'
];

const GLSL_TYPES = [
  'void', 'bool', 'int', 'uint', 'float', 'double',
  'bvec2', 'bvec3', 'bvec4',
  'ivec2', 'ivec3', 'ivec4',
  'uvec2', 'uvec3', 'uvec4',
  'vec2', 'vec3', 'vec4',
  'dvec2', 'dvec3', 'dvec4',
  'mat2', 'mat3', 'mat4',
  'mat2x2', 'mat2x3', 'mat2x4',
  'mat3x2', 'mat3x3', 'mat3x4',
  'mat4x2', 'mat4x3', 'mat4x4',
  'dmat2', 'dmat3', 'dmat4',
  'sampler1D', 'sampler2D', 'sampler3D',
  'samplerCube', 'sampler2DShadow', 'samplerCubeShadow',
  'sampler1DArray', 'sampler2DArray',
  'sampler1DArrayShadow', 'sampler2DArrayShadow',
  'isampler1D', 'isampler2D', 'isampler3D',
  'isamplerCube', 'isampler1DArray', 'isampler2DArray',
  'usampler1D', 'usampler2D', 'usampler3D',
  'usamplerCube', 'usampler1DArray', 'usampler2DArray',
  'sampler2DMS', 'isampler2DMS', 'usampler2DMS',
  'sampler2DMSArray', 'isampler2DMSArray', 'usampler2DMSArray'
];

const GLSL_FUNCTIONS = [
  'radians', 'degrees', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan',
  'sinh', 'cosh', 'tanh', 'asinh', 'acosh', 'atanh',
  'pow', 'exp', 'log', 'exp2', 'log2', 'sqrt', 'inversesqrt',
  'abs', 'sign', 'floor', 'trunc', 'round', 'roundEven', 'ceil', 'fract',
  'mod', 'modf', 'min', 'max', 'clamp', 'mix', 'step', 'smoothstep',
  'length', 'distance', 'dot', 'cross', 'normalize', 'faceforward',
  'reflect', 'refract', 'matrixCompMult', 'outerProduct',
  'transpose', 'determinant', 'inverse',
  'lessThan', 'lessThanEqual', 'greaterThan', 'greaterThanEqual',
  'equal', 'notEqual', 'any', 'all', 'not',
  'packUnorm2x16', 'unpackUnorm2x16', 'packSnorm2x16', 'unpackSnorm2x16',
  'packUnorm4x8', 'unpackUnorm4x8', 'packSnorm4x8', 'unpackSnorm4x8',
  'packDouble2x32', 'unpackDouble2x32', 'packHalf2x16', 'unpackHalf2x16',
  'textureSize', 'texture', 'textureProj', 'textureLod',
  'textureOffset', 'texelFetch', 'texelFetchOffset',
  'textureProjOffset', 'textureLodOffset', 'textureGrad',
  'textureGradOffset', 'textureProjLod', 'textureProjLodOffset',
  'textureProjGrad', 'textureProjGradOffset',
  'atomicCounter', 'atomicCounterIncrement', 'atomicCounterDecrement',
  'imageSize', 'imageLoad', 'imageStore', 'imageAtomicAdd',
  'imageAtomicMin', 'imageAtomicMax', 'imageAtomicAnd', 'imageAtomicOr',
  'imageAtomicXor', 'imageAtomicExchange', 'imageAtomicCompSwap',
  'noise1', 'noise2', 'noise3', 'noise4',
  'fwidth', 'dFdx', 'dFdy', 'dFdxCoarse', 'dFdyCoarse',
  'dFdxFine', 'dFdyFine'
];

const GLSL_CONSTANTS = [
  'gl_Position', 'gl_PointSize', 'gl_ClipDistance', 'gl_CullDistance',
  'gl_FragColor', 'gl_FragData', 'gl_FragDepth', 'gl_FrontFacing',
  'gl_PointCoord', 'gl_SampleID', 'gl_SamplePosition', 'gl_SampleMask',
  'gl_InstanceID', 'gl_VertexID', 'gl_VertexIndex', 'gl_InstanceIndex',
  'gl_BaseVertex', 'gl_BaseInstance', 'gl_DrawID',
  'gl_GlobalInvocationID', 'gl_LocalInvocationID', 'gl_WorkGroupID',
  'gl_NumWorkGroups', 'gl_LocalInvocationIndex', 'gl_WorkGroupSize',
  'gl_NumSamples', 'gl_PrimitiveID', 'gl_Layer', 'gl_ViewportIndex',
  'true', 'false'
];

export const CodeEditor: React.FC<CodeEditorProps> = ({ code, onChange, isGenerating }) => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const handleEditorMount = (editor: monaco.editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
    setIsInitialized(true);
  };

  useEffect(() => {
    monaco.editor.defineTheme('glsl-theme', GLSL_THEME);
    monaco.languages.register({ id: 'glsl' });
    
    monaco.languages.setLanguageConfiguration('glsl', GLSL_LANGUAGE_CONFIG);
    
    monaco.languages.setMonarchTokensProvider('glsl', {
      tokenizer: {
        root: [
          [/\/\//, 'comment.glsl', '@comment'],
          [/\/\*/, 'comment.glsl', '@blockComment'],
          [/".*?"/, 'string.glsl'],
          [/'.*?'/, 'string.glsl'],
          [/\b\d+(\.\d+)?([eE][+-]?\d+)?\b/, 'number.glsl'],
          [/\b0[xX][0-9a-fA-F]+\b/, 'number.glsl'],
          [/\b\d+\.\d*([eE][+-]?\d+)?\b/, 'number.glsl'],
          [/\b\d*\.\d+([eE][+-]?\d+)?\b/, 'number.glsl'],
          [/\b\d+[uU]?l?L?\b/, 'number.glsl'],
          [new RegExp(`\\b(${GLSL_KEYWORDS.join('|')})\\b`), 'keyword.glsl'],
          [new RegExp(`\\b(${GLSL_TYPES.join('|')})\\b`), 'type.glsl'],
          [new RegExp(`\\b(${GLSL_FUNCTIONS.join('|')})\\b(?=\\s*\\()`), 'function.glsl'],
          [new RegExp(`\\b(${GLSL_CONSTANTS.join('|')})\\b`), 'variable.glsl'],
          [/\b[a-zA-Z_][a-zA-Z0-9_]*\b/, 'variable.glsl'],
          [/[+\-*/%=<>!&|^~?:]+/, 'operator'],
          [/[{}()\[\]]/, '@brackets'],
          [/[,;]/, 'delimiter'],
          [/[#][^\n]*/, 'preprocessor'],
        ],
        comment: [
          [/.*$/, 'comment.glsl', '@pop'],
        ],
        blockComment: [
          [/[^*/]+/, 'comment.glsl'],
          [/\*\//, 'comment.glsl', '@pop'],
          [/./, 'comment.glsl'],
        ]
      }
    });

    monaco.languages.registerCompletionItemProvider('glsl', {
      provideCompletionItems: (model, position) => {
        const suggestions: monaco.languages.CompletionItem[] = [];

        GLSL_KEYWORDS.forEach(keyword => {
          suggestions.push({
            label: keyword,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: keyword
          });
        });

        GLSL_TYPES.forEach(type => {
          suggestions.push({
            label: type,
            kind: monaco.languages.CompletionItemKind.Struct,
            insertText: type
          });
        });

        GLSL_FUNCTIONS.forEach(func => {
          suggestions.push({
            label: func,
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: func + '()',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            command: {
              id: 'cursorMove',
              arguments: [{ to: 'left', by: 'character', value: 1 }]
            }
          });
        });

        GLSL_CONSTANTS.forEach(constant => {
          suggestions.push({
            label: constant,
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: constant
          });
        });

        return { suggestions };
      }
    });
  }, []);

  return (
    <div className="relative w-full h-full">
      {isGenerating && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-2 px-3 py-1.5 bg-shader-accent/20 border border-shader-accent/40 rounded-full">
          <svg className="animate-spin w-4 h-4 text-shader-accent" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-xs text-shader-accent font-medium">AI 正在生成...</span>
        </div>
      )}
      <Editor
        height="100%"
        language="glsl"
        theme="glsl-theme"
        value={code}
        onChange={(value) => onChange(value || '')}
        onMount={handleEditorMount}
        options={{
          minimap: { enabled: false },
          fontSize: 13,
          fontFamily: '"Fira Code", "Source Code Pro", Consolas, monospace',
          fontLigatures: true,
          lineNumbers: 'on',
          roundedSelection: false,
          scrollBeyondLastLine: false,
          readOnly: isGenerating,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          smoothScrolling: true,
          padding: { top: 12, bottom: 12 },
          renderLineHighlight: 'all',
          renderWhitespace: 'selection',
          renderControlCharacters: false,
          wordWrap: 'on',
          wrappingIndent: 'same',
          automaticLayout: true,
          scrollbar: {
            vertical: 'visible',
            horizontal: 'visible',
            useShadows: false,
            verticalHasArrows: false,
            horizontalHasArrows: false,
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10
          }
        }}
      />
    </div>
  );
};
