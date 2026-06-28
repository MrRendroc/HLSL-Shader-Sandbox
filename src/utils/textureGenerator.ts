export function generateProceduralTexture(type: 'noise' | 'checker' | 'organic' | 'gradient', size = 256): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;

  if (type === 'noise') {
    // Generate high-quality value noise mixed with random noise
    for (let i = 0; i < data.length; i += 4) {
      const val = Math.floor(Math.random() * 256);
      data[i] = val;     // R
      data[i + 1] = val; // G
      data[i + 2] = val; // B
      data[i + 3] = 255; // A
    }
    ctx.putImageData(imgData, 0, 0);

    // Apply some slight blurring or multi-scale blending to make it more like a noise texture
    // Let's draw a few scaled layers to create value noise
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = size;
    tempCanvas.height = size;
    const tempCtx = tempCanvas.getContext('2d');
    if (tempCtx) {
      tempCtx.putImageData(imgData, 0, 0);
      ctx.globalAlpha = 0.5;
      // Draw stretched noise for a smoother cloud-like effect
      ctx.drawImage(tempCanvas, 0, 0, size / 4, size / 4, 0, 0, size, size);
      ctx.globalAlpha = 0.25;
      ctx.drawImage(tempCanvas, 0, 0, size / 8, size / 8, 0, 0, size, size);
      ctx.globalAlpha = 1.0;
    }
  } else if (type === 'checker') {
    // Sharp high-contrast checkerboard grid
    const numCells = 16;
    const cellSize = size / numCells;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const cellX = Math.floor(x / cellSize);
        const cellY = Math.floor(y / cellSize);
        const isBlack = (cellX + cellY) % 2 === 0;
        const index = (y * size + x) * 4;
        
        // Let's make it a nice retro grid color: dark slate and light blue-gray
        if (isBlack) {
          data[index] = 30;     // R
          data[index + 1] = 41;  // G
          data[index + 2] = 59;  // B
        } else {
          data[index] = 203;    // R
          data[index + 1] = 213; // G
          data[index + 2] = 225; // B
        }
        data[index + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
  } else if (type === 'organic') {
    // Generate organic sinusoidal plasma/marble pattern
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const index = (y * size + x) * 4;
        const nx = x / size - 0.5;
        const ny = y / size - 0.5;
        
        // Plasma math
        const v1 = Math.sin(nx * 10.0);
        const v2 = Math.sin(10.0 * (nx * Math.sin(2.0) + ny * Math.cos(2.0)));
        const cx = nx + 0.5 * Math.sin(iTimeFactor() / 5.0);
        const cy = ny + 0.5 * Math.cos(iTimeFactor() / 3.0);
        const v3 = Math.sin(Math.sqrt(100.0 * (cx * cx + cy * cy) + 1.0));
        
        const total = (v1 + v2 + v3) / 3.0;
        const val = Math.floor((total * 0.5 + 0.5) * 255);
        
        // Render beautiful turquoise/emerald organic marble
        data[index] = Math.floor(val * 0.2);              // R (Low red)
        data[index + 1] = Math.floor(val * 0.85);          // G (High green)
        data[index + 2] = Math.floor(val * 0.75 + 50);     // B (Vibrant blue)
        data[index + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
  } else if (type === 'gradient') {
    // Generate multi-stop linear gradient texture
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, '#f43f5e');   // Rose 500
    grad.addColorStop(0.25, '#8b5cf6'); // Violet 500
    grad.addColorStop(0.5, '#3b82f6');  // Blue 500
    grad.addColorStop(0.75, '#10b981'); // Emerald 500
    grad.addColorStop(1, '#f59e0b');   // Amber 500
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }

  return canvas;
}

// Private helper to prevent dependency on current clock during generation of static textures
function iTimeFactor() {
  return 42.0;
}
