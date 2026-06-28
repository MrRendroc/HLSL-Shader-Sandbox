import { CompilationError } from '../types';

export interface TranspilationResult {
  glslCode: string;
  headerLinesCount: number;
}

export function transpileHLSLtoGLSL(hlslCode: string): TranspilationResult {
  let code = hlslCode;

  // 1. Strip HLSL semantics (e.g., : SV_Target, : TEXCOORD0, : COLOR)
  // Strip parameter semantics like: float2 uv : TEXCOORD0 -> float2 uv
  code = code.replace(/\b([A-Za-z0-9_]+)\s*:\s*(SV_Target\d*|SV_TARGET\d*|COLOR\d*|TEXCOORD\d*|SV_Position|SV_POSITION)\b/gi, '$1');
  
  // Strip function return semantics like: ) : SV_Target { -> ) {
  code = code.replace(/\)\s*:\s*(SV_Target\d*|SV_TARGET\d*|COLOR\d*|SV_Position|SV_POSITION)\s*(?=\{)/gi, ')');

  // 2. Map sampler declarations and other uniforms to comments to avoid duplicates
  code = code.replace(/\b(uniform\s+)?(sampler2D|Texture2D)\s+(iChannel[0-3])\s*;/gi, '// Uniform $2 $3;');
  code = code.replace(/\b(uniform\s+)?(float3|float2|vec3|vec2)\s+iResolution\s*;/gi, '// Uniform iResolution;');
  code = code.replace(/\b(uniform\s+)?(float|double)\s+iTime\s*;/gi, '// Uniform iTime;');
  code = code.replace(/\b(uniform\s+)?(float|double)\s+iTimeDelta\s*;/gi, '// Uniform iTimeDelta;');
  code = code.replace(/\b(uniform\s+)?(int)\s+iFrame\s*;/gi, '// Uniform iFrame;');
  code = code.replace(/\b(uniform\s+)?(float4|vec4)\s+iMouse\s*;/gi, '// Uniform iMouse;');
  code = code.replace(/\bSamplerState\s+[A-Za-z0-9_]+\s*;/gi, '// SamplerState ignored;');

  // 3. Translate HLSL specific types to GLSL ES 3.00 types
  const typeReplacements: [RegExp, string][] = [
    [/\bfloat2\b/g, 'vec2'],
    [/\bfloat3\b/g, 'vec3'],
    [/\bfloat4\b/g, 'vec4'],
    [/\bint2\b/g, 'ivec2'],
    [/\bint3\b/g, 'ivec3'],
    [/\bint4\b/g, 'ivec4'],
    [/\bbool2\b/g, 'bvec2'],
    [/\bbool3\b/g, 'bvec3'],
    [/\bbool4\b/g, 'bvec4'],
    [/\bfloat2x2\b/g, 'mat2'],
    [/\bfloat3x3\b/g, 'mat3'],
    [/\bfloat4x4\b/g, 'mat4'],
    [/\bTexture2D\b/g, 'sampler2D'],
    [/\bdouble\b/g, 'float'],
    [/\bdouble2\b/g, 'vec2'],
    [/\bdouble3\b/g, 'vec3'],
    [/\bdouble4\b/g, 'vec4'],
  ];

  for (const [regex, replacement] of typeReplacements) {
    code = code.replace(regex, replacement);
  }

  // 4. Translate Object-Oriented texture sampling
  // iChannel0.Sample(g_sampler, uv) -> texture(iChannel0, uv)
  code = code.replace(/\b([A-Za-z0-9_]+)\.Sample\s*\(\s*[A-Za-z0-9_]+\s*,\s*([^)]+)\)/g, 'texture($1, $2)');
  // iChannel0.SampleLevel(g_sampler, uv, lod) -> textureLod(iChannel0, uv, lod)
  code = code.replace(/\b([A-Za-z0-9_]+)\.SampleLevel\s*\(\s*[A-Za-z0-9_]+\s*,\s*([^,]+)\s*,\s*([^)]+)\)/g, 'textureLod($1, $2, $3)');

  // 5. Detect and rename user-defined "main" to "userMain" to prevent conflict with WebGL main()
  let hasUserMain = false;
  let hasMainImageOut = false;
  let hasMainImageReturn = false;

  // Let's analyze what entry point functions are defined
  if (/\bvoid\s+mainImage\s*\(\s*(out\s+)?vec4\s+\w+\s*,\s*(in\s+)?vec2\s+\w+\s*\)/.test(code)) {
    hasMainImageOut = true;
  } else if (/\bvec4\s+mainImage\s*\(\s*vec2\s+\w+\s*\)/.test(code)) {
    hasMainImageReturn = true;
  } else if (/\bvec4\s+main\s*\(\s*vec2\s+\w+\s*\)/.test(code)) {
    // Rename vec4 main(vec2 fragCoord) -> vec4 userMain(vec2 fragCoord)
    code = code.replace(/\b(vec4\s+)main\s*\(\s*(vec2\s+\w+\s*)\)/g, '$1userMain($2)');
    hasUserMain = true;
  } else if (/\bvec4\s+main\s*\(\s*\)/.test(code)) {
    // Rename vec4 main() -> vec4 userMain()
    code = code.replace(/\b(vec4\s+)main\s*\(\s*\)/g, '$1userMain()');
    hasUserMain = true;
  }

  // Header template containing HLSL WebGL 2 Compatibility layers
  const glslHeader = `#version 300 es
precision highp float;
precision highp int;

// Screen resolution and timing uniforms (Shadertoy standard)
uniform vec3 iResolution;
uniform float iTime;
uniform float iTimeDelta;
uniform int iFrame;
uniform vec4 iMouse;
uniform sampler2D iChannel0;
uniform sampler2D iChannel1;
uniform sampler2D iChannel2;
uniform sampler2D iChannel3;

// Output variable for WebGL 2 Fragment Shader
out vec4 fragColor;

// HLSL Compatibility layer
#define float2 vec2
#define float3 vec3
#define float4 vec4
#define int2 ivec2
#define int3 ivec3
#define int4 ivec4
#define bool2 bvec2
#define bool3 bvec3
#define bool4 bvec4
#define float2x2 mat2
#define float3x3 mat3
#define float4x4 mat4

#define tex2D(sampler, uv) texture(sampler, uv)
#define tex2Dgrad(sampler, uv, ddx, ddy) textureGrad(sampler, uv, ddx, ddy)
#define tex2Dlod(sampler, uv, lod) textureLod(sampler, uv, lod)
#define tex2Dbias(sampler, uv, bias) texture(sampler, uv, bias)

// Intrinsics definitions
float saturate(float x) { return clamp(x, 0.0, 1.0); }
vec2 saturate(vec2 x) { return clamp(x, 0.0, 1.0); }
vec3 saturate(vec3 x) { return clamp(x, 0.0, 1.0); }
vec4 saturate(vec4 x) { return clamp(x, 0.0, 1.0); }

float lerp(float a, float b, float t) { return mix(a, b, t); }
vec2 lerp(vec2 a, vec2 b, vec2 t) { return mix(a, b, t); }
vec3 lerp(vec3 a, vec3 b, vec3 t) { return mix(a, b, t); }
vec4 lerp(vec4 a, vec4 b, vec4 t) { return mix(a, b, t); }
vec2 lerp(vec2 a, vec2 b, float t) { return mix(a, b, t); }
vec3 lerp(vec3 a, vec3 b, float t) { return mix(a, b, t); }
vec4 lerp(vec4 a, vec4 b, float t) { return mix(a, b, t); }

float frac(float x) { return fract(x); }
vec2 frac(vec2 x) { return fract(x); }
vec3 frac(vec3 x) { return fract(x); }
vec4 frac(vec4 x) { return fract(x); }

float fmod(float x, float y) { return x - y * trunc(x / y); }
vec2 fmod(vec2 x, vec2 y) { return x - y * trunc(x / y); }
vec3 fmod(vec3 x, vec3 y) { return x - y * trunc(x / y); }
vec4 fmod(vec4 x, vec4 y) { return x - y * trunc(x / y); }

vec2 mul(mat2 m, vec2 v) { return m * v; }
vec2 mul(vec2 v, mat2 m) { return v * m; }
mat2 mul(mat2 m1, mat2 m2) { return m1 * m2; }
vec3 mul(mat3 m, vec3 v) { return m * v; }
vec3 mul(vec3 v, mat3 m) { return v * m; }
mat3 mul(mat3 m1, mat3 m2) { return m1 * m2; }
vec4 mul(mat4 m, vec4 v) { return m * v; }
vec4 mul(vec4 v, mat4 m) { return v * m; }
mat4 mul(mat4 m1, mat4 m2) { return m1 * m2; }

float atan2(float y, float x) { return atan(y, x); }
vec2 atan2(vec2 y, vec2 x) { return atan(y, x); }
vec3 atan2(vec3 y, vec3 x) { return atan(y, x); }
vec4 atan2(vec4 y, vec4 x) { return atan(y, x); }

float ddx(float x) { return dFdx(x); }
vec2 ddx(vec2 x) { return dFdx(x); }
vec3 ddx(vec3 x) { return dFdx(x); }
vec4 ddx(vec4 x) { return dFdx(x); }

float ddy(float x) { return dFdy(x); }
vec2 ddy(vec2 x) { return dFdy(x); }
vec3 ddy(vec3 x) { return dFdy(x); }
vec4 ddy(vec4 x) { return dFdy(x); }

float rsqrt(float x) { return inversesqrt(x); }
vec2 rsqrt(vec2 x) { return inversesqrt(x); }
vec3 rsqrt(vec3 x) { return inversesqrt(x); }
vec4 rsqrt(vec4 x) { return inversesqrt(x); }

float rcp(float x) { return 1.0 / x; }
vec2 rcp(vec2 x) { return 1.0 / x; }
vec3 rcp(vec3 x) { return 1.0 / x; }
vec4 rcp(vec4 x) { return 1.0 / x; }

void clip(float x) { if (x < 0.0) discard; }
void clip(vec2 x) { if (any(lessThan(x, vec2(0.0)))) discard; }
void clip(vec3 x) { if (any(lessThan(x, vec3(0.0)))) discard; }
void clip(vec4 x) { if (any(lessThan(x, vec4(0.0)))) discard; }

float mad(float a, float b, float c) { return a * b + c; }
vec2 mad(vec2 a, vec2 b, vec2 c) { return a * b + c; }
vec3 mad(vec3 a, vec3 b, vec3 c) { return a * b + c; }
vec4 mad(vec4 a, vec4 b, vec4 c) { return a * b + c; }

// ================== USER CODE ==================
`;

  const headerLinesCount = glslHeader.split('\n').length;

  let bridge = '\n// ================== ENTRY BRIDGE ==================\n';
  if (hasMainImageOut) {
    bridge += `void main() {
  vec4 color = vec4(0.0);
  mainImage(color, gl_FragCoord.xy);
  fragColor = color;
}`;
  } else if (hasMainImageReturn) {
    bridge += `void main() {
  fragColor = mainImage(gl_FragCoord.xy);
}`;
  } else if (hasUserMain) {
    if (hlslCode.includes('userMain()') || !hlslCode.includes('fragCoord')) {
      bridge += `void main() {
  fragColor = userMain();
}`;
    } else {
      bridge += `void main() {
  fragColor = userMain(gl_FragCoord.xy);
}`;
    }
  } else {
    // If we can't find a direct match, guess and try calling mainImage as a return, or search for custom functions
    // Default to mainImage out with fallback
    bridge += `void main() {
  vec4 color = vec4(0.0);
  // Fallback bridge
  #if defined(mainImage)
    mainImage(color, gl_FragCoord.xy);
    fragColor = color;
  #else
    fragColor = vec4(1.0, 0.0, 1.0, 1.0); // Error magenta fallback
  #endif
}`;
  }

  // Concatenate everything
  const glslCode = `${glslHeader}\n${code}\n${bridge}`;

  return {
    glslCode,
    headerLinesCount,
  };
}

export function parseWebGLErrors(errorLog: string, headerLinesCount: number): CompilationError[] {
  const errors: CompilationError[] = [];
  if (!errorLog) return errors;

  // WebGL compilation errors are typically of form:
  // ERROR: 0:42: 'mix' : no matching overloaded function found
  // or
  // ERROR: 0:42: error message here
  const lines = errorLog.split('\n');
  const errorRegex = /ERROR:\s+\d+:(\d+):(.*)/i;

  for (const line of lines) {
    const match = line.match(errorRegex);
    if (match) {
      const glslLine = parseInt(match[1], 10);
      const message = match[2].trim();
      
      // Map GLSL line back to HLSL line
      // Note: we subtract 1 since the user code starts right after the header, but lines are 1-indexed
      const hlslLine = Math.max(1, glslLine - headerLinesCount);

      errors.push({
        line: hlslLine,
        message: `WebGL Compiling Error: ${message}`,
        type: 'error',
      });
    } else if (line.trim() && !line.includes('Shader compile log:')) {
      // General error fallback
      errors.push({
        line: 1,
        message: line.trim(),
        type: 'error',
      });
    }
  }

  return errors;
}
