const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const imageData = ctx.createImageData(canvas.width, canvas.height);
const pixels = imageData.data;
const snapshotData = new Uint8ClampedArray(pixels.length);

let isDragging = false;
let startX = 0;
let startY = 0;
let previousX = 0;
let previousY = 0;

let currentTool = 'pencil';
let r = 0, g = 0, b = 0;
let brushSize = 2;
let isFilled = false;

function toScaledMousePos(posX, posY) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: Math.floor((posX - rect.left) * scaleX),
    y: Math.floor((posY - rect.top) * scaleY)
  };
}

// Put pixel
function putPixel(x, y, rVal, gVal, bVal, size = 1, aVal = 255) {
  x = Math.round(x);
  y = Math.round(y);
  
  const half = Math.floor(size / 2);
  for (let dy = -half; dy < size - half; dy++) {
    for (let dx = -half; dx < size - half; dx++) {
      const px = x + dx;
      const py = y + dy;

      if (px >= 0 && px < canvas.width && py >= 0 && py < canvas.height) {
        const idx = (py * canvas.width + px) * 4;
        pixels[idx] = rVal;
        pixels[idx + 1] = gVal;
        pixels[idx + 2] = bVal;
        pixels[idx + 3] = aVal;
      }
    }
  }
}

// Line drawing
function drawLine(x1, y1, x2, y2, rVal, gVal, bVal, size = 1, aVal = 255) {
  x1 = Math.round(x1);
  y1 = Math.round(y1);
  x2 = Math.round(x2);
  y2 = Math.round(y2);

  const dx = Math.abs(x2 - x1);
  const dy = Math.abs(y2 - y1);

  if (dx === 0 && dy === 0) {
    putPixel(x1, y1, rVal, gVal, bVal, size, aVal);
    return;
  }

  if (dx >= dy) {
    const stepX = x1 <= x2 ? 1 : -1;
    const m = (y2 - y1) / (x2 - x1);
    const c = y1 - m * x1;
    for (let x = x1; stepX > 0 ? x <= x2 : x >= x2; x += stepX) {
      const y = Math.round(m * x + c);
      putPixel(x, y, rVal, gVal, bVal, size, aVal);
    }
  } else {
    const stepY = y1 <= y2 ? 1 : -1;
    const m = (x2 - x1) / (y2 - y1);
    const c = x1 - m * y1;
    for (let y = y1; stepY > 0 ? y <= y2 : y >= y2; y += stepY) {
      const x = Math.round(m * y + c);
      putPixel(x, y, rVal, gVal, bVal, size, aVal);
    }
  }
}

// Rectangle outline
function drawRect(x1, y1, x2, y2, rVal, gVal, bVal, size = 1, aVal = 255) {
  drawLine(x1, y1, x2, y1, rVal, gVal, bVal, size, aVal);
  drawLine(x2, y1, x2, y2, rVal, gVal, bVal, size, aVal);
  drawLine(x2, y2, x1, y2, rVal, gVal, bVal, size, aVal);
  drawLine(x1, y2, x1, y1, rVal, gVal, bVal, size, aVal);
}

// Rectangle filled
function drawRectFilled(x1, y1, x2, y2, rVal, gVal, bVal, aVal = 255) {
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      putPixel(x, y, rVal, gVal, bVal, 1, aVal);
    }
  }
}

// Ellipse drawing
function drawEllipse(cx, cy, rx, ry, rVal, gVal, bVal, size = 1, fill = false, aVal = 255) {
  cx = Math.round(cx);
  cy = Math.round(cy);
  rx = Math.round(rx);
  ry = Math.round(ry);

  if (rx <= 0 || ry <= 0) return;

  for (let y = -ry; y <= ry; y++) {
    for (let x = -rx; x <= rx; x++) {
      const val = (x * x) / (rx * rx) + (y * y) / (ry * ry);

      if (fill) {
        if (val <= 1) {
          putPixel(cx + x, cy + y, rVal, gVal, bVal, 1, aVal);
        }
      } else {
        const delta = (size * 2.2) / Math.max(rx, ry);
        if (val <= 1 && val >= Math.max(0, 1 - delta)) {
          putPixel(cx + x, cy + y, rVal, gVal, bVal, 1, aVal);
        }
      }
    }
  }
}

// Clear canvas
function clearCanvas() {
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = 255;
    pixels[i + 1] = 255;
    pixels[i + 2] = 255;
    pixels[i + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);
}

// Mouse event listeners
canvas.addEventListener('mousedown', (event) => {
  isDragging = true;
  const { x, y } = toScaledMousePos(event.clientX, event.clientY);
  
  startX = x;
  startY = y;
  previousX = x;
  previousY = y;

  snapshotData.set(pixels);

  if (currentTool === 'pencil') {
    putPixel(x, y, r, g, b, brushSize);
    ctx.putImageData(imageData, 0, 0);
  } else if (currentTool === 'eraser') {
    putPixel(x, y, 255, 255, 255, brushSize * 2);
    ctx.putImageData(imageData, 0, 0);
  }
});

canvas.addEventListener('mousemove', (event) => {
  const { x, y } = toScaledMousePos(event.clientX, event.clientY);

  document.getElementById('statusPos').innerText = `ตำแหน่ง: X: ${x}, Y: ${y}`;

  if (!isDragging) return;

  if (currentTool === 'pencil') {
    drawLine(previousX, previousY, x, y, r, g, b, brushSize);
    ctx.putImageData(imageData, 0, 0);
  } 
  else if (currentTool === 'eraser') {
    drawLine(previousX, previousY, x, y, 255, 255, 255, brushSize * 2);
    ctx.putImageData(imageData, 0, 0);
  } 
  else if (currentTool === 'line') {
    pixels.set(snapshotData);
    drawLine(startX, startY, x, y, r, g, b, brushSize);
    ctx.putImageData(imageData, 0, 0);
  } 
  else if (currentTool === 'rectangle') {
    pixels.set(snapshotData);
    if (isFilled) {
      drawRectFilled(startX, startY, x, y, r, g, b);
    } else {
      drawRect(startX, startY, x, y, r, g, b, brushSize);
    }
    ctx.putImageData(imageData, 0, 0);
  } 
  else if (currentTool === 'ellipse') {
    pixels.set(snapshotData);
    const cx = (startX + x) / 2;
    const cy = (startY + y) / 2;
    const rx = Math.abs(x - startX) / 2;
    const ry = Math.abs(y - startY) / 2;
    drawEllipse(cx, cy, rx, ry, r, g, b, brushSize, isFilled);
    ctx.putImageData(imageData, 0, 0);
  }

  previousX = x;
  previousY = y;
});

canvas.addEventListener('mouseup', () => {
  isDragging = false;
});

canvas.addEventListener('mouseleave', () => {
  isDragging = false;
  document.getElementById('statusPos').innerText = `ตำแหน่ง: X: --, Y: --`;
});

document.getElementById('fillShape').addEventListener('change', (e) => {
  isFilled = e.target.checked;
});

// UI tool selection
function setTool(toolName) {
  currentTool = toolName;

  const buttons = document.querySelectorAll('.tool-btn');
  buttons.forEach(btn => btn.classList.remove('active'));

  let toolLabel = 'ดินสอ';
  if (toolName === 'pencil') {
    document.getElementById('btnPencil').classList.add('active');
    toolLabel = 'ดินสอ';
  } else if (toolName === 'line') {
    document.getElementById('btnLine').classList.add('active');
    toolLabel = 'เส้นตรง';
  } else if (toolName === 'rectangle') {
    document.getElementById('btnRect').classList.add('active');
    toolLabel = 'สี่เหลี่ยม';
  } else if (toolName === 'ellipse') {
    document.getElementById('btnEllipse').classList.add('active');
    toolLabel = 'วงรี';
  } else if (toolName === 'eraser') {
    document.getElementById('btnEraser').classList.add('active');
    toolLabel = 'ยางลบ';
  }

  document.getElementById('statusTool').innerText = `เครื่องมือ: ${toolLabel}`;
}

// Update brush size
function updateBrushSize(val) {
  let num = parseInt(val);
  if (isNaN(num) || num < 1) num = 1;
  if (num > 50) num = 50;

  brushSize = num;

  const statusSize = document.getElementById('statusSize');
  if (statusSize) statusSize.innerText = `ความหนา: ${brushSize}px`;
}

// Update RGB color
function updateRgbColor() {
  const rInput = document.getElementById('colorR');
  const gInput = document.getElementById('colorG');
  const bInput = document.getElementById('colorB');

  let valR = parseInt(rInput.value);
  let valG = parseInt(gInput.value);
  let valB = parseInt(bInput.value);

  if (isNaN(valR)) valR = 0;
  if (isNaN(valG)) valG = 0;
  if (isNaN(valB)) valB = 0;

  r = Math.min(255, Math.max(0, valR));
  g = Math.min(255, Math.max(0, valG));
  b = Math.min(255, Math.max(0, valB));

  const previewEl = document.getElementById('colorPreview');
  if (previewEl) {
    previewEl.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
  }
}

// Select preset RGB color
function selectRgbPreset(rVal, gVal, bVal) {
  document.getElementById('colorR').value = rVal;
  document.getElementById('colorG').value = gVal;
  document.getElementById('colorB').value = bVal;
  updateRgbColor();
}

clearCanvas();
