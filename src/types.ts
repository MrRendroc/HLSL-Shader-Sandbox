export interface ShaderPreset {
  id: string;
  name: string;
  description: string;
  code: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: 'procedural' | 'raymarching' | 'fractal' | 'patterns' | 'effects';
}

export interface TexturePreset {
  id: string;
  name: string;
  type: 'noise' | 'checker' | 'organic' | 'gradient';
  label: string;
}

export interface RenderStats {
  fps: number;
  frameTime: number;
  frame: number;
  resolution: [number, number];
}

export interface CompilationError {
  line: number;
  message: string;
  type: 'error' | 'warning';
}
