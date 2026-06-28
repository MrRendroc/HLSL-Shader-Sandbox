import { ShaderPreset } from '../types';

export const SHADER_PRESETS: ShaderPreset[] = [
  {
    id: 'starter',
    name: 'Cosmic Plasma Wave',
    description: 'An elegant, dynamic wave of color blending cos-palettes and coordinate warping.',
    difficulty: 'beginner',
    category: 'procedural',
    code: `/*
 * Cosmic Plasma Wave - Starter Template
 * A simple starter shader displaying dynamic math-based color patterns.
 */

float4 mainImage(float2 fragCoord) : SV_Target {
    // Normalize coordinates (0.0 to 1.0)
    float2 uv = fragCoord / iResolution.xy;
    
    // Adjust aspect ratio so circles are circular
    float2 centeredUv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;

    // Create a time-varying warping effect
    float len = length(centeredUv);
    float angle = atan2(centeredUv.y, centeredUv.x);
    
    float wave1 = sin(len * 10.0 - iTime * 2.0);
    float wave2 = cos(angle * 3.0 + iTime);
    float wave3 = sin(centeredUv.x * 5.0 + centeredUv.y * 5.0 + iTime * 1.5);
    
    // Combine waves to form plasma pattern
    float pattern = saturate((wave1 + wave2 + wave3) / 3.0 + 0.5);
    
    // Generate color palette using cosine functions
    float3 col = 0.5 + 0.5 * cos(iTime + uv.xyx * 3.0 + float3(0.0, 2.0, 4.0));
    col *= pattern;
    
    // Add subtle center glow
    col += float3(0.1, 0.2, 0.4) * (1.0 / (len * 10.0 + 1.0));

    return float4(col, 1.0);
}`
  },
  {
    id: 'raymarching-sphere',
    name: 'Raymarched Metallic Sphere',
    description: 'Simple 3D Raymarching with Diffuse, Specular, and Shadow rendering.',
    difficulty: 'intermediate',
    category: 'raymarching',
    code: `/*
 * Raymarched Metallic Sphere
 * Illustrates 3D rendering in a single fragment shader using Signed Distance Fields (SDF).
 */

// Signed Distance Field (SDF) of a sphere
float sdSphere(float3 p, float r) {
    return length(p) - r;
}

// SDF of an infinite floor plane
float sdPlane(float3 p, float h) {
    return p.y - h;
}

// Scene SDF combining all elements
float map(float3 p, out int matId) {
    float d1 = sdSphere(p - float3(0.0, sin(iTime * 1.5) * 0.4 + 0.4, 0.0), 0.7);
    float d2 = sdPlane(p, -0.3);
    
    if (d1 < d2) {
        matId = 1; // Sphere material
        return d1;
    } else {
        matId = 2; // Floor material
        return d2;
    }
}

// Calculate normal vector at point p
float3 getNormal(float3 p) {
    int dummyMat;
    float2 eps = float2(0.001, 0.0);
    float d = map(p, dummyMat);
    return normalize(float3(
        map(p + eps.xyy, dummyMat) - d,
        map(p + eps.yxy, dummyMat) - d,
        map(p + eps.yyx, dummyMat) - d
    ));
}

// Calculate shadow factor from point p towards light direction ld
float getShadow(float3 p, float3 ld) {
    float shadow = 1.0;
    float t = 0.02; // Min step
    int dummyMat;
    for (int i = 0; i < 30; i++) {
        float h = map(p + ld * t, dummyMat);
        if (h < 0.001) return 0.1; // In shadow
        shadow = min(shadow, 16.0 * h / t); // Penumbra
        t += h;
        if (t > 4.0) break;
    }
    return saturate(shadow);
}

float4 mainImage(float2 fragCoord) : SV_Target {
    // Center screen coordinates
    float2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    
    // Camera setup
    float3 ro = float3(0.0, 1.0, -2.5); // Ray origin (camera position)
    float3 rd = normalize(float3(uv, 1.0)); // Ray direction
    
    // Interactive camera rotation with mouse
    if (iMouse.z > 0.0) {
        float theta = (iMouse.x / iResolution.x - 0.5) * 6.28;
        float3x3 rotY = float3x3(
            cos(theta), 0.0, sin(theta),
            0.0,        1.0, 0.0,
            -sin(theta),0.0, cos(theta)
        );
        ro = mul(rotY, ro);
        rd = mul(rotY, rd);
    }

    // Ray marching loop
    float t = 0.0;
    int matId = 0;
    int hitMat = 0;
    bool hit = false;
    float3 p = float3(0, 0, 0);

    for (int i = 0; i < 80; i++) {
        p = ro + rd * t;
        float d = map(p, matId);
        if (d < 0.001) {
            hit = true;
            hitMat = matId;
            break;
        }
        t += d;
        if (t > 15.0) break;
    }

    float3 col = float3(0.05, 0.07, 0.12); // Background color

    if (hit) {
        float3 norm = getNormal(p);
        float3 lightDir = normalize(float3(1.5, 3.0, -1.0));
        
        // Base materials
        float3 baseCol = float3(0.0, 0.0, 0.0);
        float roughness = 0.5;

        if (hitMat == 1) {
            // Shiny Metallic Red/Orange Sphere
            baseCol = float3(0.9, 0.25, 0.1);
            roughness = 0.1;
        } else if (hitMat == 2) {
            // Infinite Checkerboard floor
            float checkSize = 1.0;
            float f = frac(floor(p.x * checkSize) * 0.5 + floor(p.z * checkSize) * 0.5);
            baseCol = f > 0.0 ? float3(0.2, 0.25, 0.3) : float3(0.5, 0.55, 0.6);
            roughness = 0.9;
        }

        // Lighting model (Lambertian + Phong specular)
        float diff = saturate(dot(norm, lightDir));
        float3 viewDir = normalize(ro - p);
        float3 halfDir = normalize(lightDir + viewDir);
        float spec = pow(saturate(dot(norm, halfDir)), roughness == 0.1 ? 64.0 : 16.0);
        
        // Shadowing
        float shadow = getShadow(p + norm * 0.01, lightDir);
        
        // Ambient Occlusion approximation (simply based on floor distance/height)
        float ao = hitMat == 2 ? saturate(0.5 + 0.5 * p.y) : 1.0;
        float3 ambient = float3(0.06, 0.08, 0.14) * ao;

        col = ambient + baseCol * diff * shadow + float3(1.0, 0.95, 0.8) * spec * (roughness == 0.1 ? 0.8 : 0.1) * shadow;
        
        // Fog based on distance
        col = lerp(col, float3(0.05, 0.07, 0.12), saturate(t / 15.0));
    }

    // Gamma correction
    col = pow(col, float3(0.4545, 0.4545, 0.4545));

    return float4(col, 1.0);
}`
  },
  {
    id: 'mandelbrot',
    name: 'Interactive Mandelbrot',
    description: 'A smooth infinite zoom Mandelbrot fractal with customizable speed and color banding.',
    difficulty: 'intermediate',
    category: 'fractal',
    code: `/*
 * Interactive Mandelbrot Set
 * Uses coordinate interpolation and smooth color iteration math.
 * Click and drag on screen to explore different areas!
 */

float4 mainImage(float2 fragCoord) : SV_Target {
    // Normalize coordinates
    float2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    
    // Zoom and pan logic
    float zoom = pow(2.0, -1.0 - sin(iTime * 0.2) * 5.0); // Automatical zoom-in-out wave
    float2 center = float2(-0.743643887037158704752191506114774, 0.131825904205311970493132056385139);
    
    // If mouse clicks/drags, center on the mouse target
    if (iMouse.z > 0.0) {
        float2 mouseUv = (iMouse.xy - 0.5 * iResolution.xy) / iResolution.y;
        center = mouseUv * 2.0 - float2(0.5, 0.0);
        zoom = 0.05; // Lock zoom when exploring with mouse
    }

    // Set complex coordinate c = x + i*y
    float2 c = uv * zoom * 4.0 + center;
    float2 z = float2(0.0, 0.0);
    
    float iter = 0.0;
    const float maxIter = 150.0;
    
    // Mandelbrot escape-time formula: z_{n+1} = z_n^2 + c
    for (float i = 0.0; i < maxIter; i++) {
        if (dot(z, z) > 4.0) {
            iter = i;
            break;
        }
        // z^2 = (x^2 - y^2) + i * (2*x*y)
        z = float2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
    }
    
    float3 col = float3(0.0, 0.0, 0.0);
    
    if (iter < maxIter) {
        // Smooth coloring algorithm to prevent banding artifacts
        float log_zn = log(dot(z, z)) / 2.0;
        float nu = log(log_zn / log(2.0)) / log(2.0);
        float smoothIter = iter + 1.0 - nu;
        
        // Map iter to complex color palettes
        float factor = smoothIter / 30.0;
        col = 0.5 + 0.5 * cos(factor + float3(0.0, 0.6, 1.2));
        
        // Highlight borders with a metallic shimmer
        col *= sin(factor * 10.0) * 0.3 + 0.7;
    }

    return float4(col, 1.0);
}`
  },
  {
    id: 'retro-wave',
    name: '80s Outrun Synthwave',
    description: 'A nostalgic neon cyberwave grid with mountains and a glowing vector sun.',
    difficulty: 'advanced',
    category: 'patterns',
    code: `/*
 * 80s Outrun Synthwave Grid
 * Rendered using dynamic line calculations, perspective mapping, and neon glows.
 */

// Helper to calculate a glowing neon line
float lineGlow(float d, float thickness, float glow) {
    return thickness / (d + glow);
}

// Simple pseudo-random hash
float hash(float n) {
    return frac(sin(n) * 43758.5453123);
}

// 1D noise for mountain generation
float noise(float x) {
    float i = floor(x);
    float f = frac(x);
    f = f * f * (3.0 - 2.0 * f);
    return lerp(hash(i), hash(i + 1.0), f);
}

float4 mainImage(float2 fragCoord) : SV_Target {
    float2 uv = fragCoord / iResolution.xy;
    float2 centered = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;

    float3 col = float3(0.01, 0.0, 0.02); // Deep dark purple background
    
    // 1. Starfield / Cyber Nebula glow
    float stars = saturate(sin(hash(floor(centered.x * 120.0) + floor(centered.y * 120.0) * 91.0) * 8.0) - 0.98);
    stars *= step(centered.y, 0.05); // Only above horizon
    col += float3(stars, stars, stars) * 0.8;
    
    // Purple horizon glow
    float horizonGlow = exp(-abs(centered.y - 0.05) * 8.0);
    col += float3(0.7, 0.0, 0.8) * horizonGlow * 0.4;

    // 2. Neon Sun rendering
    float2 sunPos = float2(0.0, 0.15);
    float distToSun = length(centered - sunPos);
    
    if (distToSun < 0.28) {
        // Glowing orange-to-yellow gradient
        float3 sunCol = lerp(float3(1.0, 0.0, 0.4), float3(1.0, 0.9, 0.1), (centered.y - sunPos.y + 0.28) / 0.56);
        
        // Outrun sun horizontal slicing bars
        float barFreq = 22.0;
        float barWidth = 0.5;
        float slice = step(0.12, frac((centered.y - iTime * 0.03) * barFreq));
        
        // Progressively thicken bars near the bottom of the sun
        float bottomFactor = saturate((sunPos.y - centered.y) / 0.28);
        slice = lerp(1.0, slice, bottomFactor);
        
        col = lerp(col, sunCol, slice);
    }
    
    // Sun outer glow
    float sunGlow = exp(-distToSun * 4.0);
    col += float3(1.0, 0.3, 0.0) * sunGlow * 0.15;

    // 3. Grid perspective floor rendering
    if (centered.y < 0.03) {
        // Coordinate transformation for 3D grid perspective
        float3 p = float3(centered.x, centered.y - 0.03, 1.0);
        float3 rd = normalize(p);
        
        // Map 2D point to infinite plane coordinates
        float planeZ = -0.3 / rd.y;
        float2 planePos = rd.xz * planeZ;
        
        // Scroll grid into the screen over time
        planePos.y += iTime * 0.8;

        // Grid lines (vertical and horizontal)
        float gridLineWidth = 0.025;
        float gridCellWidth = 0.2;
        
        float vLine = abs(frac(planePos.x / gridCellWidth + 0.5) - 0.5) / (gridLineWidth * planeZ);
        float hLine = abs(frac(planePos.y / gridCellWidth + 0.5) - 0.5) / (gridLineWidth * planeZ);
        
        float gridLines = saturate(lineGlow(vLine, 0.08, 0.15) + lineGlow(hLine, 0.08, 0.15));
        
        // Fade grid into the distance
        float fade = saturate(exp((centered.y - 0.03) * 6.0));
        
        // Cyber-pink grid line coloring
        float3 gridCol = float3(0.0, 0.9, 1.0); // Cyan base
        gridCol = lerp(gridCol, float3(1.0, 0.0, 0.6), sin(planePos.y * 0.2) * 0.5 + 0.5); // Morph to neon pink
        
        col += gridCol * gridLines * fade;
    }

    // 4. Distant Cyber Mountains
    float mountainVal = noise(centered.x * 5.0) * 0.12 + noise(centered.x * 15.0) * 0.03 + 0.01;
    if (centered.y < mountainVal && centered.y >= 0.03) {
        float3 mountainCol = float3(0.05, 0.0, 0.1);
        // Highlight mountain crest with cyan glow
        float crest = exp(-abs(centered.y - mountainVal) * 50.0);
        col = lerp(col, mountainCol + float3(0.0, 0.8, 1.0) * crest * 0.5, 0.85);
    }

    // Add CRT screen curvature vignette
    float2 vignetteUv = uv * (1.0 - uv.yx);
    float vig = vignetteUv.x * vignetteUv.y * 15.0;
    col *= pow(vig, 0.25);

    return float4(col, 1.0);
}`
  },
  {
    id: 'liquid-metal',
    name: 'Liquid Plasma Metal',
    description: 'A chrome-like metallic liquid simulation using multiple octaves of sine wave warping.',
    difficulty: 'advanced',
    category: 'patterns',
    code: `/*
 * Liquid Plasma Metal
 * A highly reflective chrome effect achieved through fractal noise warping and normal calculation.
 */

// Generate complex wave pattern
float wavePattern(float3 p) {
    p.xy += sin(p.z + p.xy * 2.0 + iTime) * 0.5;
    
    // Stack multiple octaves of sine functions
    float amp = 1.0;
    float sum = 0.0;
    for (int i = 0; i < 5; i++) {
        p = float3(
            p.y + p.z + sin(p.x + iTime * 0.3),
            p.z - p.x + cos(p.y - iTime * 0.2),
            p.x + p.y + sin(p.z * 1.5 + iTime)
        );
        sum += abs(sin(p.x + p.y + p.z)) * amp;
        p *= 1.8;
        amp *= 0.55;
    }
    return sum;
}

float4 mainImage(float2 fragCoord) : SV_Target {
    float2 uv = fragCoord / iResolution.xy;
    float2 centered = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;

    // Scale coordinates
    float3 p = float3(centered * 1.8, iTime * 0.15);
    
    // Find height values for normal vector approximation
    float eps = 0.025;
    float h = wavePattern(p);
    float hX = wavePattern(p + float3(eps, 0.0, 0.0));
    float hY = wavePattern(p + float3(0.0, eps, 0.0));
    
    // Approximate surface normals (derivative-based)
    float3 normal = normalize(float3((h - hX) / eps, (h - hY) / eps, 0.8));
    
    // Lighting vectors
    float3 lightDir = normalize(float3(sin(iTime), cos(iTime * 0.5), 1.0));
    float3 viewDir = float3(0.0, 0.0, 1.0);
    
    // Diffuse + High Specular Chrome lighting
    float diff = dot(normal, lightDir) * 0.5 + 0.5;
    float3 ref = reflect(-lightDir, normal);
    float spec = pow(saturate(dot(ref, viewDir)), 16.0);
    
    // Base chrome metallic color palette
    float3 baseCol = 0.5 + 0.5 * cos(h * 3.0 + float3(0.0, 1.5, 3.0) + iTime * 0.2);
    baseCol = lerp(float3(0.85, 0.9, 0.95), baseCol, 0.4); // Bring in subtle silver reflections
    
    // Final chrome shading
    float3 finalCol = baseCol * diff + float3(1.0, 1.0, 1.0) * spec * 0.9;
    
    // Deepen crevices (Ambient Occlusion approximation)
    finalCol *= saturate(h * 1.5);
    
    // Add dynamic glowing ring highlights
    float ring = saturate(1.0 - abs(h - 0.7) * 4.0);
    finalCol += float3(0.0, 0.7, 1.0) * pow(ring, 3.0) * 0.25;

    return float4(finalCol, 1.0);
}`
  },
  {
    id: 'underwater-caustics',
    name: 'Sunlit Water Caustics',
    description: 'Procedural underwater lighting caustics overlay with subtle particle details.',
    difficulty: 'intermediate',
    category: 'procedural',
    code: `/*
 * Sunlit Water Caustics
 * A mathematically simulated underwater caustics pattern.
 */

float4 mainImage(float2 fragCoord) : SV_Target {
    float2 uv = fragCoord / iResolution.xy;
    float2 p = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;

    // Warp coordinates to simulate light refraction through ripples
    float2 uvWarped = p * 4.0;
    
    float time = iTime * 0.8;
    
    // Accumulate multiple overlapping wave directions
    float causticsVal = 0.0;
    for (int i = 0; i < 4; i++) {
        // Overlapping polar waves
        uvWarped += float2(
            sin(uvWarped.y + time + float(i)),
            cos(uvWarped.x - time + float(i))
        );
        causticsVal += 1.0 / length(float2(
            sin(uvWarped.x + time),
            cos(uvWarped.y + time)
        ));
    }
    
    causticsVal /= 4.0;
    causticsVal = saturate(pow(causticsVal, 2.5) * 0.05);

    // Dynamic water depth color gradient
    float3 waterCol = lerp(
        float3(0.02, 0.2, 0.45), // Shallow vibrant blue
        float3(0.01, 0.05, 0.18), // Deep abyssal navy
        uv.y
    );
    
    // Golden sun shafts from top of the screen
    float sunShaft = saturate(1.0 - abs(p.x - 0.2) * 0.5) * saturate(1.0 - uv.y);
    waterCol += float3(0.9, 0.85, 0.5) * sunShaft * 0.3;

    // Apply caustics lighting
    float3 causticCol = float3(0.2, 0.85, 1.0); // Bright cyan light
    float3 finalCol = waterCol + causticCol * causticsVal;
    
    // Add floating bioluminescent particles
    float r = sin(p.x * 20.0) * cos(p.y * 20.0 + iTime);
    if (r > 0.995) {
        float size = frac(r * 42.0);
        finalCol += float3(0.4, 0.9, 1.0) * (0.01 / (length(p - r * 0.1) + 0.01)) * size;
    }

    return float4(finalCol, 1.0);
}`
  }
];
