import { ShaderPreset } from '../types';
import { SHADER_PRESETS } from '../utils/presets';
import { Code, Flame, Filter, Palette, Compass } from 'lucide-react';
import { useState } from 'react';

interface ShaderPresetsProps {
  onSelectPreset: (preset: ShaderPreset) => void;
  selectedId: string;
}

export default function ShaderPresets({
  onSelectPreset,
  selectedId,
}: ShaderPresetsProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { id: 'all', label: 'All Shaders' },
    { id: 'procedural', label: 'Procedural' },
    { id: 'raymarching', label: '3D SDF Raymarch' },
    { id: 'fractal', label: 'Fractals' },
    { id: 'patterns', label: 'Math Patterns' },
  ];

  const filteredPresets = selectedCategory === 'all'
    ? SHADER_PRESETS
    : SHADER_PRESETS.filter((p) => p.category === selectedCategory);

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case 'beginner':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'intermediate':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'advanced':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  return (
    <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 shadow-2xl h-full flex flex-col">
      {/* Category Header Filtering */}
      <div className="flex flex-col gap-3 mb-4 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Compass size={16} className="text-sky-400" />
          <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider select-none">
            Curated HLSL Presets
          </h2>
        </div>
        
        {/* Category Filter Pills */}
        <div className="flex flex-wrap gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1 text-xs font-medium rounded-lg border transition select-none ${
                selectedCategory === cat.id
                  ? 'bg-sky-500/10 border-sky-500/30 text-sky-400'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable preset cards area */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[30rem] lg:max-h-[35rem]">
        {filteredPresets.map((preset) => (
          <div
            key={preset.id}
            onClick={() => onSelectPreset(preset)}
            className={`p-3 rounded-xl border transition cursor-pointer text-left flex flex-col gap-2 relative overflow-hidden ${
              selectedId === preset.id
                ? 'bg-sky-500/5 border-sky-500/40 shadow-lg shadow-sky-500/5'
                : 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-900 hover:border-slate-700'
            }`}
          >
            {/* Selected glow indicator */}
            {selectedId === preset.id && (
              <div className="absolute right-0 top-0 w-1.5 h-full bg-sky-400" />
            )}

            <div className="flex items-start justify-between gap-2">
              <h3 className={`text-sm font-semibold transition ${selectedId === preset.id ? 'text-sky-400' : 'text-slate-200'}`}>
                {preset.name}
              </h3>
              
              {/* Difficulty badge */}
              <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${getDifficultyColor(preset.difficulty)}`}>
                {preset.difficulty}
              </span>
            </div>

            <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
              {preset.description}
            </p>

            <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-900/60 text-[10px] text-slate-500 font-mono">
              <span className="capitalize">
                Category: {preset.category}
              </span>
              <span className="flex items-center gap-1 select-none">
                <Code size={10} />
                {preset.code.split('\n').length} lines
              </span>
            </div>
          </div>
        ))}

        {filteredPresets.length === 0 && (
          <div className="text-center py-8 text-slate-500 font-mono text-xs">
            No shaders found in this category.
          </div>
        )}
      </div>
    </div>
  );
}
