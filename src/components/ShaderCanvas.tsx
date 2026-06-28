import React, { useEffect, useRef, useState } from 'react';
import { CompilationError, RenderStats } from '../types';
import { generateProceduralTexture } from '../utils/textureGenerator';
import { transpileHLSLtoGLSL, parseWebGLErrors } from '../utils/transpiler';
import { Play, Pause, RotateCcw, Image as ImageIcon, Sparkles } from 'lucide-react';

interface ShaderCanvasProps {
  hlslCode: string;
  textureChannels: ('noise' | 'checker' | 'organic' | 'gradient')[];
  onCompileStatus: (success: boolean, errors: CompilationError[]) => void;
  onStatsUpdate: (stats: RenderStats) => void;
  isPaused: boolean;
  setIsPaused: (paused: boolean) => void;
}

export default function ShaderCanvas({
  hlslCode,
  textureChannels,
  onCompileStatus,
  onStatsUpdate,
  isPaused,
  setIsPaused,
}: ShaderCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const glRef = useRef<WebGL2RenderingContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Shader state refs
  const programRef = useRef<WebGLProgram | null>(null);
  const fallbackProgramRef = useRef<WebGLProgram | null>(null);
  const texturesRef = useRef<(WebGLTexture | null)[]>([null, null, null, null]);

  // Timing/Uniforms state refs
  const timeRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const frameRef = useRef<number>(0);
  const mouseRef = useRef<[number, number, number, number]>([0, 0, -1, -1]); // [x, y, clickX, clickY]
  const isMouseDownRef = useRef<boolean>(false);
  const resolutionRef = useRef<[number, number]>([512, 512]);

  // FPS Counter state
  const fpsLastTimeRef = useRef<number>(0);
  const fpsFrameCountRef = useRef<number>(0);

  // Initialize WebGL and set up vertex buffers
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl2');
    if (!gl) {
      console.error('WebGL 2 is not supported by your browser.');
      return;
    }
    glRef.current = gl;

    // Create a screen-filling quad
    const vertices = new Float32Array([
      -1.0, -1.0,
       1.0, -1.0,
      -1.0,  1.0,
      -1.0,  1.0,
       1.0, -1.0,
       1.0,  1.0,
    ]);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    // Compile vertex shader (static screen quad)
    const vsSource = `#version 300 es
      in vec2 position;
      out vec2 vUv;
      void main() {
        vUv = position * 0.5 + 0.5;
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;

    const vs = gl.createShader(gl.VERTEX_SHADER);
    if (vs) {
      gl.shaderSource(vs, vsSource);
      gl.compileShader(vs);
      if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
        console.error('Vertex Shader compiling error:', gl.getShaderInfoLog(vs));
      }
    }

    // Compile a robust default fallback fragment shader in case of transpilation errors
    const fsFallbackSource = `#version 300 es
      precision highp float;
      out vec4 fragColor;
      uniform vec3 iResolution;
      uniform float iTime;
      void main() {
        // Safe animated checker pattern/error screen
        vec2 uv = gl_FragCoord.xy / iResolution.xy;
        float check = step(0.5, fract(uv.x * 10.0 + iTime)) * step(0.5, fract(uv.y * 10.0));
        fragColor = vec4(mix(vec3(0.1, 0.05, 0.15), vec3(0.8, 0.0, 0.4), check), 1.0);
      }
    `;

    const fsFallback = gl.createShader(gl.FRAGMENT_SHADER);
    if (fsFallback) {
      gl.shaderSource(fsFallback, fsFallbackSource);
      gl.compileShader(fsFallback);
    }

    const fallbackProg = gl.createProgram();
    if (fallbackProg && vs && fsFallback) {
      gl.attachShader(fallbackProg, vs);
      gl.attachShader(fallbackProg, fsFallback);
      gl.linkProgram(fallbackProg);
      fallbackProgramRef.current = fallbackProg;
    }

    // Cleanup on unmount
    return () => {
      if (positionBuffer) gl.deleteBuffer(positionBuffer);
      if (vs) gl.deleteShader(vs);
      if (fsFallback) gl.deleteShader(fsFallback);
      if (fallbackProg) gl.deleteProgram(fallbackProg);
    };
  }, []);

  // Set up texture channels
  useEffect(() => {
    const gl = glRef.current;
    if (!gl) return;

    // Delete existing textures
    texturesRef.current.forEach((tex) => {
      if (tex) gl.deleteTexture(tex);
    });

    // Create 4 new textures
    const newTextures = textureChannels.map((type, index) => {
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);

      // Generate the texture canvas procedurally
      const textureCanvas = generateProceduralTexture(type, 512);

      // Upload canvas to GPU texture
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textureCanvas);

      // Setup mipmapping and sampling parameters for smooth repeating/filtering
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

      return tex;
    });

    texturesRef.current = newTextures;
  }, [textureChannels]);

  // Compile the user shader when code changes
  useEffect(() => {
    const gl = glRef.current;
    if (!gl) return;

    // Transpile HLSL to GLSL 3.00 ES
    const { glslCode, headerLinesCount } = transpileHLSLtoGLSL(hlslCode);

    // Create and compile fragment shader
    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    if (!fs) return;

    gl.shaderSource(fs, glslCode);
    gl.compileShader(fs);

    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(fs) || '';
      const errors = parseWebGLErrors(log, headerLinesCount);
      onCompileStatus(false, errors);
      gl.deleteShader(fs);
      return;
    }

    // Vertex Shader is static and cached on program, but we need to create the program
    const vsSource = `#version 300 es
      in vec2 position;
      out vec2 vUv;
      void main() {
        vUv = position * 0.5 + 0.5;
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;

    const vs = gl.createShader(gl.VERTEX_SHADER);
    if (vs) {
      gl.shaderSource(vs, vsSource);
      gl.compileShader(vs);
    }

    const prog = gl.createProgram();
    if (prog && vs && fs) {
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);

      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.error('Program linking error:', gl.getProgramInfoLog(prog));
        onCompileStatus(false, [{ line: 1, message: 'Link Error', type: 'error' }]);
        gl.deleteProgram(prog);
      } else {
        // Success! Swap in the new compiled program
        const oldProg = programRef.current;
        programRef.current = prog;
        if (oldProg) gl.deleteProgram(oldProg);
        onCompileStatus(true, []);
      }
    }

    // Clean up temporary compiled shaders (they are compiled into the linked program)
    if (vs) gl.deleteShader(vs);
    if (fs) gl.deleteShader(fs);
  }, [hlslCode, onCompileStatus]);

  // Resize handler using ResizeObserver
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const dpr = window.devicePixelRatio || 1;
        // Limit max rendering size to 1024 to keep fast frame rates
        const renderWidth = Math.min(1024, Math.floor(width * dpr));
        const renderHeight = Math.min(1024, Math.floor(height * dpr));

        canvas.width = renderWidth;
        canvas.height = renderHeight;
        resolutionRef.current = [renderWidth, renderHeight];
        
        if (glRef.current) {
          glRef.current.viewport(0, 0, renderWidth, renderHeight);
        }
      }
    });

    resizeObserver.observe(canvas.parentElement || canvas);
    return () => resizeObserver.disconnect();
  }, []);

  // Animation and drawing frame loop
  useEffect(() => {
    lastTimeRef.current = performance.now();
    fpsLastTimeRef.current = performance.now();
    fpsFrameCountRef.current = 0;

    const render = (now: number) => {
      const gl = glRef.current;
      if (!gl) {
        animationFrameRef.current = requestAnimationFrame(render);
        return;
      }

      // 1. Manage Delta Time & Uniform states
      const deltaMs = now - lastTimeRef.current;
      lastTimeRef.current = now;
      const deltaTime = deltaMs / 1000.0;

      if (!isPaused) {
        timeRef.current += deltaTime;
        frameRef.current += 1;
      }

      // Calculate FPS
      fpsFrameCountRef.current++;
      if (now - fpsLastTimeRef.current >= 1000) {
        const calculatedFps = Math.round((fpsFrameCountRef.current * 1000) / (now - fpsLastTimeRef.current));
        onStatsUpdate({
          fps: calculatedFps,
          frameTime: (now - fpsLastTimeRef.current) / fpsFrameCountRef.current,
          frame: frameRef.current,
          resolution: resolutionRef.current,
        });
        fpsFrameCountRef.current = 0;
        fpsLastTimeRef.current = now;
      }

      // 2. Select appropriate WebGL program (active or fallback)
      const prog = programRef.current || fallbackProgramRef.current;
      if (prog) {
        gl.useProgram(prog);

        // Bind uniform values
        const uRes = gl.getUniformLocation(prog, 'iResolution');
        const uTime = gl.getUniformLocation(prog, 'iTime');
        const uTimeDelta = gl.getUniformLocation(prog, 'iTimeDelta');
        const uFrame = gl.getUniformLocation(prog, 'iFrame');
        const uMouse = gl.getUniformLocation(prog, 'iMouse');

        if (uRes) gl.uniform3f(uRes, resolutionRef.current[0], resolutionRef.current[1], 1.0);
        if (uTime) gl.uniform1f(uTime, timeRef.current);
        if (uTimeDelta) gl.uniform1f(uTimeDelta, deltaTime);
        if (uFrame) gl.uniform1i(uFrame, frameRef.current);
        
        if (uMouse) {
          gl.uniform4f(
            uMouse,
            mouseRef.current[0],
            mouseRef.current[1],
            mouseRef.current[2],
            mouseRef.current[3]
          );
        }

        // Bind custom textures to sampler uniforms
        texturesRef.current.forEach((tex, i) => {
          const uChan = gl.getUniformLocation(prog, `iChannel${i}`);
          if (uChan !== null) {
            gl.activeTexture(gl.TEXTURE0 + i);
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.uniform1i(uChan, i);
          }
        });

        // Set up position attributes
        const posAttrib = gl.getAttribLocation(prog, 'position');
        if (posAttrib !== -1) {
          gl.enableVertexAttribArray(posAttrib);
          gl.vertexAttribPointer(posAttrib, 2, gl.FLOAT, false, 0, 0);
        }

        // Clear and draw screen quad
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPaused, onStatsUpdate]);

  // Handle Mouse click and drag calculations matching Shadertoy standard
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    isMouseDownRef.current = true;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    // Scale coords to actual canvas render size (pixel density aware)
    const x = ((e.clientX - rect.left) / rect.width) * resolutionRef.current[0];
    const y = ((rect.height - (e.clientY - rect.top)) / rect.height) * resolutionRef.current[1];

    mouseRef.current = [x, y, x, y];
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isMouseDownRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * resolutionRef.current[0];
    const y = ((rect.height - (e.clientY - rect.top)) / rect.height) * resolutionRef.current[1];

    // Maintain drag start coordinates in Z and W
    mouseRef.current = [x, y, mouseRef.current[2], mouseRef.current[3]];
  };

  const handleMouseUp = () => {
    isMouseDownRef.current = false;
    // Shadertoy flags release by setting Z and W to negative coordinates of original press
    mouseRef.current = [
      mouseRef.current[0],
      mouseRef.current[1],
      -Math.abs(mouseRef.current[2]),
      -Math.abs(mouseRef.current[3]),
    ];
  };

  const handleReset = () => {
    timeRef.current = 0;
    frameRef.current = 0;
    mouseRef.current = [0, 0, -1, -1];
  };

  return (
    <div className="relative w-full h-full bg-slate-950 rounded-xl overflow-hidden shadow-2xl flex flex-col border border-slate-800">
      {/* Real-time Render Canvas */}
      <div className="relative flex-1 w-full min-h-0 bg-slate-900 flex items-center justify-center">
        <canvas
          id="shader-viewport"
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="w-full h-full cursor-crosshair block select-none"
        />

        {/* Hover Controls bar */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-slate-900/90 backdrop-blur border border-slate-700/80 rounded-full flex items-center gap-4 shadow-xl z-10 transition-all hover:bg-slate-900">
          <button
            id="btn-play-pause"
            onClick={() => setIsPaused(!isPaused)}
            className="p-1.5 rounded-full hover:bg-slate-800 transition text-slate-200 hover:text-white"
            title={isPaused ? 'Play Shader' : 'Pause Shader'}
          >
            {isPaused ? <Play size={18} fill="currentColor" /> : <Pause size={18} fill="currentColor" />}
          </button>
          
          <button
            id="btn-reset-time"
            onClick={handleReset}
            className="p-1.5 rounded-full hover:bg-slate-800 transition text-slate-200 hover:text-white"
            title="Rewind Shader Time"
          >
            <RotateCcw size={18} />
          </button>

          <div className="h-4 w-[1px] bg-slate-800" />

          {/* Displays shader clock time */}
          <span className="font-mono text-xs font-semibold text-sky-400 select-none">
            {timeRef.current.toFixed(2)}s
          </span>
        </div>
      </div>

      {/* Texture slots interface bar */}
      <div className="bg-slate-900/90 border-t border-slate-800 px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <ImageIcon size={14} className="text-slate-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 select-none">
            Texture Sampler Inputs
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          {textureChannels.map((type, i) => (
            <div key={i} className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800/80">
              <span className="font-mono text-[10px] text-indigo-400 select-none">iChan{i}:</span>
              <span className="text-xs text-slate-300 select-none capitalize">{type}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
