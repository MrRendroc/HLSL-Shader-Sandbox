import { useRef, useEffect, useState } from 'react';
import Editor, { Monaco, useMonaco } from '@monaco-editor/react';
import { CompilationError } from '../types';
import { Play, Check, AlertCircle, Settings, ChevronDown, ChevronUp, Copy, CheckSquare } from 'lucide-react';

interface ShaderEditorProps {
  code: string;
  onChange: (value: string) => void;
  compileErrors: CompilationError[];
  isCompiling: boolean;
}

export default function ShaderEditor({
  code,
  onChange,
  compileErrors,
  isCompiling,
}: ShaderEditorProps) {
  const [fontSize, setFontSize] = useState<number>(14);
  const [copied, setCopied] = useState<boolean>(false);
  const [showErrorPanel, setShowErrorPanel] = useState<boolean>(true);
  
  const editorRef = useRef<any>(null);
  const monaco = useMonaco();

  // Highlight compilation errors using Monaco Model Markers
  useEffect(() => {
    if (!monaco || !editorRef.current) return;

    const editor = editorRef.current;
    const model = editor.getModel();
    if (!model) return;

    if (compileErrors.length > 0) {
      const markers = compileErrors.map((err) => ({
        startLineNumber: err.line,
        startColumn: 1,
        endLineNumber: err.line,
        endColumn: 1000,
        message: err.message,
        severity: monaco.MarkerSeverity.Error,
      }));
      monaco.editor.setModelMarkers(model, 'hlsl-shader-owner', markers);
    } else {
      monaco.editor.setModelMarkers(model, 'hlsl-shader-owner', []);
    }
  }, [compileErrors, monaco]);

  const handleEditorMount = (editor: any, monacoInstance: Monaco) => {
    editorRef.current = editor;

    // Additional configuration for a highly polished code writing environment
    monacoInstance.editor.defineTheme('custom-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
        { token: 'keyword', foreground: '569CD6', fontStyle: 'bold' },
        { token: 'number', foreground: 'B5CEA8' },
        { token: 'string', foreground: 'CE9178' },
        { token: 'type', foreground: '4EC9B0' },
      ],
      colors: {
        'editor.background': '#020617', // Slate 950 matching our app background
        'editor.foreground': '#F8FAFC',
        'editorLineNumber.foreground': '#475569',
        'editorLineNumber.activeForeground': '#38BDF8',
        'editor.lineHighlightBackground': '#0F172A',
        'editorCursor.foreground': '#38BDF8',
      },
    });

    monacoInstance.editor.setTheme('custom-dark');
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const jumpToErrorLine = (lineNum: number) => {
    if (editorRef.current) {
      editorRef.current.revealLineInCenter(lineNum);
      editorRef.current.setPosition({ lineNumber: lineNum, column: 1 });
      editorRef.current.focus();
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 rounded-xl border border-slate-800 overflow-hidden shadow-2xl">
      {/* Editor Control Ribbon */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500 block" />
            <span className="w-3 h-3 rounded-full bg-amber-500 block" />
            <span className="w-3 h-3 rounded-full bg-emerald-500 block" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 select-none">
            HLSL Fragment Shader Source
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Font Size control */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-2 py-1 rounded-lg">
            <span className="text-[10px] text-slate-500 font-medium">Size</span>
            <select
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="bg-transparent text-xs text-slate-300 font-mono focus:outline-none cursor-pointer"
            >
              <option value="12">12px</option>
              <option value="13">13px</option>
              <option value="14">14px</option>
              <option value="16">16px</option>
              <option value="18">18px</option>
            </select>
          </div>

          {/* Copy code button */}
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-300 bg-slate-950 border border-slate-800 rounded-lg hover:bg-slate-800 hover:text-white transition"
            title="Copy Shader Code"
          >
            {copied ? (
              <>
                <Check size={12} className="text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy size={12} />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Editor Main Canvas */}
      <div className="flex-1 relative min-h-0">
        <Editor
          height="100%"
          language="hlsl"
          theme="vs-dark"
          value={code}
          onChange={(val) => onChange(val || '')}
          onMount={handleEditorMount}
          options={{
            fontSize,
            fontFamily: "'Fira Code', 'JetBrains Mono', 'Courier New', monospace",
            minimap: { enabled: true },
            wordWrap: 'on',
            lineNumbers: 'on',
            scrollbar: {
              vertical: 'visible',
              horizontal: 'visible',
              useShadows: false,
              verticalHasArrows: false,
              horizontalHasArrows: false,
            },
            automaticLayout: true,
            padding: { top: 12, bottom: 12 },
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            formatOnType: true,
            tabSize: 4,
          }}
          loading={
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 text-slate-400 gap-3">
              <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
              <span className="font-mono text-xs select-none">Initializing HLSL Editor...</span>
            </div>
          }
        />
      </div>

      {/* Compiler Error / Status Overlay Panel */}
      <div className="border-t border-slate-800 bg-slate-900/95 backdrop-blur-md">
        <div 
          onClick={() => compileErrors.length > 0 && setShowErrorPanel(!showErrorPanel)}
          className={`px-4 py-3 flex items-center justify-between gap-4 select-none ${compileErrors.length > 0 ? 'cursor-pointer hover:bg-slate-800/40' : ''}`}
        >
          <div className="flex items-center gap-2">
            {compileErrors.length === 0 ? (
              <div className="flex items-center gap-1.5 text-emerald-400">
                <Check size={16} className="animate-pulse" />
                <span className="text-xs font-semibold uppercase tracking-wider">Compilation Successful</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-rose-500">
                <AlertCircle size={16} />
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Compilation Failed ({compileErrors.length} {compileErrors.length === 1 ? 'Error' : 'Errors'})
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {isCompiling && (
              <div className="text-[10px] text-sky-400 font-mono animate-pulse uppercase tracking-wider">
                Compiling...
              </div>
            )}
            {compileErrors.length > 0 && (
              <button className="text-slate-400 hover:text-white transition">
                {showErrorPanel ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
              </button>
            )}
          </div>
        </div>

        {/* Display compiled errors when failed */}
        {compileErrors.length > 0 && showErrorPanel && (
          <div className="max-h-40 overflow-y-auto border-t border-slate-800 bg-slate-950 font-mono text-xs text-rose-400">
            {compileErrors.map((err, i) => (
              <div
                key={i}
                onClick={() => jumpToErrorLine(err.line)}
                className="px-4 py-2 border-b border-slate-900/50 hover:bg-rose-950/20 cursor-pointer flex items-start gap-3 transition"
              >
                <span className="text-rose-500 font-bold bg-rose-500/10 px-1.5 py-0.5 rounded select-none">
                  Line {err.line}
                </span>
                <span className="flex-1 whitespace-pre-wrap">{err.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
