import { TexturePreset } from '../types';
import { Sliders, HelpCircle, Image as ImageIcon } from 'lucide-react';

interface TextureSelectorProps {
  channels: ('noise' | 'checker' | 'organic' | 'gradient')[];
  onChannelChange: (index: number, type: 'noise' | 'checker' | 'organic' | 'gradient') => void;
}

const TEXTURES: TexturePreset[] = [
  { id: 'noise', name: 'noise', type: 'noise', label: 'White / Value Noise' },
  { id: 'checker', name: 'checker', type: 'checker', label: 'Retro Checkerboard' },
  { id: 'organic', name: 'organic', type: 'organic', label: 'Sinusoidal Marble' },
  { id: 'gradient', name: 'gradient', type: 'gradient', label: 'Vibrant Multi-Gradient' },
];

export default function TextureSelector({
  channels,
  onChannelChange,
}: TextureSelectorProps) {
  
  // Custom classes for preview thumbnail representation
  const getThumbnailClass = (type: string) => {
    switch (type) {
      case 'noise':
        return 'bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:8px_8px] bg-slate-950 opacity-60';
      case 'checker':
        return 'bg-[linear-gradient(45deg,#334155_25%,transparent_25%),linear-gradient(-45deg,#334155_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#334155_75%),linear-gradient(-45deg,transparent_75%,#334155_75%)] bg-[size:12px_12px] bg-slate-950';
      case 'organic':
        return 'bg-gradient-to-tr from-teal-900 via-emerald-800 to-sky-900 animate-pulse';
      case 'gradient':
        return 'bg-gradient-to-tr from-rose-500 via-purple-600 to-amber-500';
      default:
        return 'bg-slate-800';
    }
  };

  return (
    <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 shadow-2xl">
      <div className="flex items-center justify-between gap-2 mb-4 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Sliders size={16} className="text-sky-400" />
          <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider select-none">
            Sampler Input Manager
          </h2>
        </div>
        <div className="group relative">
          <HelpCircle size={14} className="text-slate-500 hover:text-slate-400 cursor-help" />
          <div className="absolute right-0 top-6 w-60 p-2.5 bg-slate-900 border border-slate-800 text-[10px] text-slate-400 rounded-lg hidden group-hover:block shadow-2xl z-20 font-sans leading-relaxed">
            Configure the 4 sampler channels <code className="text-sky-400 font-mono">iChannel0</code> to <code className="text-sky-400 font-mono">iChannel3</code>. 
            Sample them in HLSL using: <br />
            <code className="text-sky-400 font-mono block mt-1">tex2D(iChannel0, uv);</code>
            <code className="text-sky-400 font-mono block">iChannel0.Sample(g_sampler, uv);</code>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {channels.map((currentType, index) => (
          <div key={index} className="bg-slate-900/60 rounded-xl p-3 border border-slate-800/80 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs font-bold text-slate-400 select-none">
                iChannel{index}
              </span>
              <ImageIcon size={12} className="text-slate-600" />
            </div>

            {/* Visual Thumbnail representative */}
            <div className={`w-full h-12 rounded-lg ${getThumbnailClass(currentType)} border border-slate-800 flex items-center justify-center`}>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-white bg-slate-950/80 px-2 py-0.5 rounded backdrop-blur">
                {currentType}
              </span>
            </div>

            {/* Selector Option */}
            <select
              value={currentType}
              onChange={(e) => onChannelChange(index, e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-300 px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-sky-500 cursor-pointer hover:bg-slate-900 hover:text-white transition"
            >
              {TEXTURES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}
