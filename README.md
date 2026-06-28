# HLSL Shader Sandbox

An interactive, real-time in-browser HLSL shader editor and graphics rendering sandbox built with **React**, **Vite**, **TypeScript**, and **WebGL 2**. 

HLSL Shader Sandbox bridges Direct3D high-level shading language (HLSL) with web-native WebGL 2, allowing developers and technical artists to author, experiment with, and visualize HLSL shaders directly in the browser without requiring external native tools.

---

## 🚀 Key Features

* **⚡ Real-Time HLSL to GLSL ES Transpilation**: Instant parsing and translation of HLSL fragment shader syntax into GLSL ES 3.00. Automatically maps HLSL intrinsics (`lerp`, `saturate`, `mul`, `frac`, `ddx`/`ddy`, `rcp`, `clip`) and DirectX 11 object sampling methods (`Texture2D.Sample`, `SampleLevel`) to WebGL 2 equivalents.
* **💻 Monaco Code Editor**: Feature-rich code editing powered by Monaco Editor (`@monaco-editor/react`), complete with syntax formatting, real-time compilation status, inline error diagnostics, and line highlighting.
* **🎨 Procedural Texture Engine**: 4 dedicated texture channels (`iChannel0`–`iChannel3`) powered by on-the-fly GPU/canvas procedural texture generators (perlin noise, checkerboards, organic cellular patterns, and smooth gradients).
* **📚 Curated Shader Presets**: Comprehensive preset gallery covering fundamental procedural rendering, 3D raymarching distance fields, fractal geometry, and dynamic post-processing visual effects.
* **📊 Live Telemetry HUD**: Real-time rendering performance metrics monitor including FPS counter, frame execution timing (ms), resolution scaling, and frame counters.

---

## 🤖 Gemini AI Integration & Shader Generation

The project integrates with the **Google Gemini API** (via `@google/genai`) to power intelligent shader development tools and automated preset generation:

* **Natural Language to HLSL**: Prompt Gemini to generate complex procedural HLSL shaders, mathematical algorithms, or visual effects from text descriptions.
* **Automated Preset Generation**: Leverages Gemini to synthesize structured shader presets complete with mathematical documentation, parameter tags, and difficulty classifications.
* **Code Optimization & Debugging**: Connects shader compilation diagnostics back to Gemini to provide explanations and automated code fixes for HLSL syntax or logic errors.

---

## 🛠️ Local Development Setup

Follow these steps to run the HLSL Shader Sandbox locally on your machine.

### Prerequisites
* **Node.js**: `v18.0.0` or higher
* **npm**: `v9.0.0` or higher

### Installation & Run

1. **Clone the repository**:
   ```bash
   git clone https://github.com/MrRendroc/HLSL-Shader-Sandbox.git
   cd HLSL-Shader-Sandbox
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a local `.env` file in the root directory (refer to `.env.example`):
   ```bash
   cp .env.example .env
   ```
   Add your Gemini API key:
   ```env
   GEMINI_API_KEY="your_google_gemini_api_key_here"
   ```

4. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Open your browser and navigate to `http://localhost:3000`.

5. **Build for Production**:
   ```bash
   npm run build
   ```

---

## 📁 Project Architecture

```
HLSL-Shader-Sandbox/
├── src/
│   ├── components/
│   │   ├── ShaderCanvas.tsx      # WebGL 2 rendering loop & canvas context
│   │   ├── ShaderEditor.tsx      # Monaco editor integration & diagnostics
│   │   ├── ShaderPresets.tsx     # Preset selector gallery & filters
│   │   └── TextureSelector.tsx   # Channel texture assignment controls
│   ├── utils/
│   │   ├── presets.ts            # Pre-built HLSL shader algorithms
│   │   ├── textureGenerator.ts   # Procedural texture generator utilities
│   │   └── transpiler.ts         # HLSL to GLSL ES 3.00 transpilation engine
│   ├── types.ts                  # TypeScript interface definitions
│   ├── App.tsx                   # Main layout & sandbox application shell
│   └── main.tsx                  # Application entry point
├── public/                       # Static public assets
├── .env.example                  # Environment configuration template
├── package.json                  # Dependencies & script definitions
└── vite.config.ts                # Vite build & plugin configuration
```

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.