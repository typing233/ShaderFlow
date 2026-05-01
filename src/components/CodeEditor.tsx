import React, { useCallback, useRef } from 'react';
import Editor, { OnMount, OnChange } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { useAppStore } from '@/store';
import { parseUniformsFromShader } from '@/lib/uniformParser';

interface CodeEditorProps {
  className?: string;
}

const GLSL_LANG_CONFIG: monaco.languages.LanguageConfiguration = {
  comments: {
    lineComment: '//',
    blockComment: ['/*', '*/'],
  },
  brackets: [
    ['{', '}'],
    ['[', ']'],
    ['(', ')'],
  ],
  autoClosingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"' },
    { open: "'", close: "'" },
  ],
  surroundingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"' },
    { open: "'", close: "'" },
  ],
};

const GLSL_TOKENS_PROVIDER: monaco.languages.IMonarchLanguage = {
  keywords: [
    'const', 'uniform', 'attribute', 'varying', 'inout', 'in', 'out',
    'float', 'int', 'void', 'bool', 'true', 'false',
    'vec2', 'vec3', 'vec4', 'bvec2', 'bvec3', 'bvec4', 'ivec2', 'ivec3', 'ivec4',
    'mat2', 'mat3', 'mat4',
    'sampler2D', 'samplerCube', 'sampler3D',
    'struct',
    'if', 'else', 'for', 'while', 'do', 'break', 'continue', 'return', 'discard',
    'precision', 'highp', 'mediump', 'lowp',
    'layout', 'location', 'flat', 'smooth', 'noperspective',
    'invariant', 'centroid', 'sample', 'patch',
    'subroutine',
  ],

  builtins: [
    'gl_Position', 'gl_PointSize', 'gl_FragCoord', 'gl_FrontFacing',
    'gl_FragColor', 'gl_FragData', 'gl_PointCoord',
    'gl_VertexID', 'gl_InstanceID', 'gl_DepthRange',
    'gl_MaxVertexAttribs', 'gl_MaxVertexUniformComponents', 'gl_MaxVaryingFloats',
    'gl_MaxVertexTextureImageUnits', 'gl_MaxCombinedTextureImageUnits',
    'gl_MaxTextureImageUnits', 'gl_MaxFragmentUniformComponents',
    'gl_MaxDrawBuffers', 'gl_MaxClipDistances',
  ],

  functions: [
    'radians', 'degrees', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan',
    'sinh', 'cosh', 'tanh', 'asinh', 'acosh', 'atanh',
    'pow', 'exp', 'log', 'exp2', 'log2', 'sqrt', 'inversesqrt',
    'abs', 'sign', 'floor', 'trunc', 'round', 'roundEven', 'ceil', 'fract', 'mod', 'modf',
    'min', 'max', 'clamp', 'mix', 'step', 'smoothstep',
    'length', 'distance', 'dot', 'cross', 'normalize', 'faceforward', 'reflect', 'refract',
    'matrixCompMult', 'outerProduct', 'transpose', 'determinant', 'inverse',
    'lessThan', 'lessThanEqual', 'greaterThan', 'greaterThanEqual', 'equal', 'notEqual',
    'any', 'all', 'not',
    'texture2D', 'texture2DProj', 'texture2DLod', 'texture2DProjLod',
    'textureCube', 'textureCubeLod',
    'dFdx', 'dFdy', 'fwidth',
  ],

  constants: [
    'PI', 'HALF_PI', 'TWO_PI', 'EPSILON',
  ],

  operators: [
    '=', '+=', '-=', '*=', '/=', '%=', '<<=', '>>=', '&=', '^=', '|=',
    '++', '--',
    '+', '-', '*', '/', '%', '<<', '>>', '&', '|', '^', '~', '!',
    '<', '>', '<=', '>=', '==', '!=', '&&', '||', '?', ':',
  ],

  symbols: /[=><!~?:&|+\-*^%]+/,

  escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,

  tokenizer: {
    root: [
      [/[a-z_$][\w$]*/, {
        cases: {
          '@keywords': 'keyword',
          '@builtins': 'variable.predefined',
          '@functions': 'function',
          '@constants': 'constant',
          '@default': 'identifier',
        },
      }],

      [/[A-Z][\w$]*/, 'type.identifier'],

      { include: '@whitespace' },

      [/[{}()[\]]/, '@brackets'],

      [/@symbols/, {
        cases: {
          '@operators': 'operator',
          '@default': '',
        },
      }],

      [/\d*\.\d+([eE][-+]?\d+)?/, 'number.float'],
      [/0[xX][0-9a-fA-F]+/, 'number.hex'],
      [/\d+/, 'number'],

      [/[;,.]/, 'delimiter'],
    ],

    comment: [
      [/[^/*]+/, 'comment'],
      [/\/\*/, 'comment', '@push'],
      ['\\*/', 'comment', '@pop'],
      [/[/*]/, 'comment'],
    ],

    whitespace: [
      [/[ \t\r\n]+/, 'white'],
      [/\/\*/, 'comment', '@comment'],
      [/\/\/.*$/, 'comment'],
    ],

    string: [
      [/[^\\']+/, 'string'],
      [/@escapes/, 'string.escape'],
      [/\\./, 'string.escape.invalid'],
      [/'/, 'string', '@pop'],
    ],

    dblString: [
      [/[^\\"]+/, 'string'],
      [/@escapes/, 'string.escape'],
      [/\\./, 'string.escape.invalid'],
      [/"/, 'string', '@pop'],
    ],
  },
};

export const CodeEditor: React.FC<CodeEditorProps> = ({ className }) => {
  const {
    shaderCode,
    updateFragmentShader,
    setUniforms,
    shaderSlots,
    activeSlotId,
    updateShaderSlot,
  } = useAppStore();
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const languageRegistered = useRef(false);

  const activeSlot = shaderSlots.find(s => s.id === activeSlotId);
  const currentShaderCode = activeSlot?.shaderCode.fragment || shaderCode.fragment;

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    if (!languageRegistered.current) {
      monaco.languages.register({ id: 'glsl' });
      monaco.languages.setLanguageConfiguration('glsl', GLSL_LANG_CONFIG);
      monaco.languages.setMonarchTokensProvider('glsl', GLSL_TOKENS_PROVIDER);
      
      monaco.editor.defineTheme('shaderflow-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: 'keyword', foreground: 'c586c0' },
          { token: 'operator', foreground: 'd4d4d4' },
          { token: 'number', foreground: 'b5cea8' },
          { token: 'function', foreground: 'dcdcaa' },
          { token: 'variable.predefined', foreground: '9cdcfe' },
          { token: 'type.identifier', foreground: '4ec9b0' },
          { token: 'constant', foreground: 'ce9178' },
          { token: 'comment', foreground: '6a9955' },
        ],
        colors: {
          'editor.background': '#0e1212',
          'editorLineNumber.foreground': '#3a4a4a',
          'editorCursor.foreground': '#5eead4',
          'editor.selectionBackground': '#2a3a3a',
          'editor.inactiveSelectionBackground': '#2a3a3a',
        },
      });

      monaco.editor.setTheme('shaderflow-dark');
      languageRegistered.current = true;
    }
  };

  const handleChange: OnChange = useCallback(
    (value) => {
      if (value === undefined) return;
      
      try {
        const parsedUniforms = parseUniformsFromShader(value);
        
        if (activeSlot) {
          updateShaderSlot(activeSlotId, {
            shaderCode: {
              ...activeSlot.shaderCode,
              fragment: value,
            },
            uniforms: parsedUniforms.length > 0 ? parsedUniforms : activeSlot.uniforms,
          });
        } else {
          updateFragmentShader(value);
          if (parsedUniforms.length > 0) {
            setUniforms(parsedUniforms);
          }
        }
      } catch {
        // ignore parse errors during editing
      }
    },
    [updateFragmentShader, setUniforms, updateShaderSlot, activeSlot, activeSlotId]
  );

  return (
    <div className={`w-full h-full ${className || ''}`}>
      <Editor
        height="100%"
        width="100%"
        language="glsl"
        theme="shaderflow-dark"
        value={currentShaderCode}
        onChange={handleChange}
        onMount={handleEditorMount}
        options={{
          minimap: { enabled: true },
          fontSize: 13,
          fontFamily: "'Fira Code', 'JetBrains Mono', monospace",
          fontLigatures: true,
          lineNumbers: 'on',
          roundedSelection: false,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          wordWrap: 'on',
          padding: { top: 16, bottom: 16 },
          smoothScrolling: true,
          cursorSmoothCaretAnimation: 'on',
          bracketPairColorization: { enabled: true },
          guides: {
            bracketPairs: true,
            indentation: true,
          },
        }}
      />
    </div>
  );
};

export default CodeEditor;
