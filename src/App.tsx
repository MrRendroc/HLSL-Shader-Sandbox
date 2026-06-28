import { useState, useCallback } from 'react';
import { ShaderPreset, CompilationError, RenderStats } from './types';
import { SHADER_PRESETS } from './utils/presets';
import ShaderCanvas from './components/ShaderCanvas';
import ShaderEditor from './components/ShaderEditor';
import ShaderPresets from './components/ShaderPresets';
import TextureSelector from './components/TextureSelector';
import { Cpu, BookOpen, Terminal, Zap, Code2, Layers, HelpCircle } from 'lucide-react';

export default function App() {
  const [selectedPreset, setSelectedPreset] = useState<ShaderPreset>(SHADER_PRESETS[0]);
  const [hlslCode, setHlslCode] = useState<string>(SHADER_PRESETS[0].code);
  const [textureChannels, setTextureChannels] = useState<('noise' | 'checker' | 'organic' | 'gradient')[]>([
    'noise',
    'checker',
    'organic',
    'gradient',
  ]);
  const [compileErrors, setCompileErrors] = useState<CompilationError[]>([]);
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  
  // Real-time rendering stats
  const [stats, setStats] = useState<RenderStats>({
    fps: 0,
    frameTime: 0,
    frame: 0,
    resolution: [512, 512],
  });

  const handleSelectPreset = useCallback((preset: ShaderPreset) => {
    setSelectedPreset(preset);
    setHlslCode(preset.code);
    setIsPaused(false);
  }, []);

  const handleCodeChange = useCallback((newCode: string) => {
    setHlslCode(newCode);
    setIsCompiling(true);
  }, []);

  const handleCompileStatus = useCallback((success: boolean, errors: CompilationError[]) => {
    setCompileErrors(errors);
    setIsCompiling(false);
  }, []);

  const handleStatsUpdate = useCallback((newStats: RenderStats) => {
    setStats(newStats);
  }, []);

  const handleChannelChange = useCallback((index: number, type: 'noise' | 'checker' | 'organic' | 'gradient') => {
    setTextureChannels((prev) => {
      const next = [...prev];
      next[index] = type;
      return next;
    });
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased flex flex-col">
      {/* Upper Navigation Header */}
      <header className="border-b border-slate-800 bg-slate-900/40 backdrop-blur px-6 py-4 sticky top-0 z-50 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-sky-500 via-indigo-600 to-rose-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Cpu className="text-white animate-pulse" size={22} />
          </div>
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-sky-400 via-slate-100 to-rose-400 bg-clip-text text-transparent leading-none flex items-center gap-2">
              HLSL Shader Sandbox
              <span className="text-[10px] font-mono border border-sky-500/30 text-sky-400 px-1.5 py-0.5 rounded-full bg-sky-500/10 font-bold uppercase select-none">
                WebGL2 ES
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-1 select-none">
              Type HLSL shader code, map procedural inputs, and watch graphics render in real-time.
            </p>
          </div>
        </div>

        {/* Real-time Hardware-like Stats Header Block */}
        <div className="flex items-center gap-4 bg-slate-950/80 px-4 py-2 rounded-xl border border-slate-800/80">
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider select-none">
              Render FPS
            </span>
            <span className="font-mono text-sm font-semibold text-emerald-400">
              {stats.fps} FPS
            </span>
          </div>
          <div className="h-6 w-[1px] bg-slate-800" />
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider select-none">
              Resolution
            </span>
            <span className="font-mono text-sm font-semibold text-sky-400">
              {stats.resolution[0]}x{stats.resolution[1]}
            </span>
          </div>
          <div className="h-6 w-[1px] bg-slate-800" />
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider select-none">
              Render Frame
            </span>
            <span className="font-mono text-sm font-semibold text-indigo-400">
              #{stats.frame}
            </span>
          </div>
        </div>
      </header>

      {/* Main Applet Dashboard Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 flex flex-col gap-6">
        
        {/* Workspace Side-by-Side Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
          {/* Editor block - takes 7 columns */}
          <div className="lg:col-span-7 h-[30rem] lg:h-[40rem] flex flex-col">
            <ShaderEditor
              code={hlslCode}
              onChange={handleCodeChange}
              compileErrors={compileErrors}
              isCompiling={isCompiling}
            />
          </div>

          {/* Canvas Viewport and Presets block - takes 5 columns */}
          <div className="lg:col-span-5 flex flex-col gap-6 h-[30rem] lg:h-[40rem]">
            {/* Viewport Canvas Card */}
            <div className="flex-1 min-h-0">
              <ShaderCanvas
                hlslCode={hlslCode}
                textureChannels={textureChannels}
                onCompileStatus={handleCompileStatus}
                onStatsUpdate={handleStatsUpdate}
                isPaused={isPaused}
                setIsPaused={setIsPaused}
              />
            </div>

            {/* Presets Manager Card */}
            <div className="flex-1 min-h-0">
              <ShaderPresets
                onSelectPreset={handleSelectPreset}
                selectedId={selectedPreset.id}
              />
            </div>
          </div>
        </div>

        {/* Texture Inputs Manager */}
        <TextureSelector
          channels={textureChannels}
          onChannelChange={handleChannelChange}
        />

        {/* Developer Reference Guide & HLSL cheatsheet */}
        <div className="bg-slate-950 rounded-xl border border-slate-800 p-5 shadow-2xl">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-3">
            <BookOpen size={16} className="text-indigo-400" />
            <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider select-none">
              HLSL Development Reference Guide
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Uniform Globals */}
            <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-800/50">
              <div className="flex items-center gap-1.5 text-sky-400 mb-2">
                <Layers size={14} />
                <span className="text-xs font-bold uppercase tracking-wider select-none">Implicit Uniforms</span>
              </div>
              <ul className="space-y-2 font-mono text-[11px] text-slate-300">
                <li><strong className="text-indigo-400">float3 iResolution</strong> — Screen width, height, aspect ratio</li>
                <li><strong className="text-indigo-400">float iTime</strong> — Clock time in seconds since start</li>
                <li><strong className="text-indigo-400">float iTimeDelta</strong> — Render time delta between frames</li>
                <li><strong className="text-indigo-400">int iFrame</strong> — Current cumulative frame index</li>
                <li><strong className="text-indigo-400">float4 iMouse</strong> — xy: mouse pixel, zw: click origin</li>
                <li><strong className="text-indigo-400">sampler2D iChannel0 - 3</strong> — Configurable inputs</li>
              </ul>
            </div>

            {/* Supported Intrinsics */}
            <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-800/50">
              <div className="flex items-center gap-1.5 text-indigo-400 mb-2">
                <Zap size={14} />
                <span className="text-xs font-bold uppercase tracking-wider select-none">HLSL Intrinsics</span>
              </div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1 font-mono text-[11px] text-slate-300">
                <div><code className="text-sky-400">lerp(a,b,t)</code> — Mix</div>
                <div><code className="text-sky-400">frac(x)</code> — Fraction</div>
                <div><code className="text-sky-400">saturate(x)</code> — Clamp</div>
                <div><code className="text-sky-400">fmod(x,y)</code> — Modulo</div>
                <div><code className="text-sky-400">mul(m,v)</code> — Mult</div>
                <div><code className="text-sky-400">atan2(y,x)</code> — Arctan</div>
                <div><code className="text-sky-400">rsqrt(x)</code> — InvSqrt</div>
                <div><code className="text-sky-400">rcp(x)</code> — Reciprocal</div>
                <div><code className="text-sky-400">clip(x)</code> — Discard</div>
                <div><code className="text-sky-400">mad(a,b,c)</code> — FMA</div>
              </div>
            </div>

            {/* Structure & Entry */}
            <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-800/50">
              <div className="flex items-center gap-1.5 text-rose-400 mb-2">
                <Code2 size={14} />
                <span className="text-xs font-bold uppercase tracking-wider select-none">Entry Signatures</span>
              </div>
              <p className="text-xs text-slate-400 mb-2 leading-relaxed">
                The Sandbox compiles several classic HLSL fragment signatures automatically:
              </p>
              <ul className="space-y-1.5 font-mono text-[10px] text-slate-300">
                <li className="bg-slate-950 p-1 rounded border border-slate-800">
                  <span className="text-emerald-400">float4</span> <span className="text-sky-400">mainImage</span>(<span className="text-indigo-400">float2</span> fragCoord) : <span className="text-rose-400">SV_Target</span>
                </li>
                <li className="bg-slate-950 p-1 rounded border border-slate-800">
                  <span className="text-emerald-400">void</span> <span className="text-sky-400">mainImage</span>(out <span className="text-indigo-400">float4</span> fragCol, in <span className="text-indigo-400">float2</span> fragCoord)
                </li>
                <li className="bg-slate-950 p-1 rounded border border-slate-800">
                  <span className="text-emerald-400">float4</span> <span className="text-sky-400">main</span>(<span className="text-indigo-400">float2</span> uv : <span className="text-rose-400">TEXCOORD</span>) : <span className="text-rose-400">SV_Target</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Footer bar */}
      <footer className="border-t border-slate-800/60 bg-slate-900/20 py-4 px-6 text-center text-xs text-slate-500 font-mono">
        HLSL Shader Sandbox — Transpiling HLSL to high-performance WebGL 2 in real-time.
      </footer>
    </div>
  );
}
