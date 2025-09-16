let isDrawing = false;
let currentCanvas = null;
let currentContext = null;

function toggleHandwritingCreator() {
  const container = document.querySelector('.handwriting-creator-container');

  if (container.classList.contains('show')) {
    container.classList.remove('show');
    document.body.style.overflow = 'auto'; // Re-enable scrolling
  } else {
    container.classList.add('show');
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
  }
}

function initializeCanvas(canvas) {
  const ctx = canvas.getContext('2d');
  ctx.strokeStyle = '#000f55'; // Slightly blue-black like the image
  ctx.lineWidth = 1.5; // Thinner line for more natural writing
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Add baseline guide
  const baselineY = canvas.height * 0.7;
  ctx.strokeStyle = '#ddd';
  ctx.beginPath();
  ctx.moveTo(0, baselineY);
  ctx.lineTo(canvas.width, baselineY);
  ctx.stroke();

  // Reset to pen color
  ctx.strokeStyle = '#000f55';
  return ctx;
}

function startDrawing(e) {
  isDrawing = true;
  currentCanvas = e.target;
  currentContext = currentCanvas.getContext('2d');

  const rect = currentCanvas.getBoundingClientRect();
  let x;
  let y;

  if (e.type === 'mousedown') {
    x = e.clientX - rect.left;
    y = e.clientY - rect.top;
  } else if (e.type === 'touchstart') {
    x = e.touches[0].clientX - rect.left;
    y = e.touches[0].clientY - rect.top;
  }

  currentContext.beginPath();
  currentContext.moveTo(x, y);
  currentContext.lastX = x;
  currentContext.lastY = y;
}

function stopDrawing() {
  isDrawing = false;
  currentCanvas = null;
  currentContext = null;
}

function draw(e) {
  if (!isDrawing || !currentContext) return;

  const rect = currentCanvas.getBoundingClientRect();
  let x;
  let y;

  if (e.type === 'mousemove') {
    x = e.clientX - rect.left;
    y = e.clientY - rect.top;
  } else if (e.type === 'touchmove') {
    x = e.touches[0].clientX - rect.left;
    y = e.touches[0].clientY - rect.top;
  }

  // Smooth out the line with quadratic curves
  currentContext.quadraticCurveTo(
    currentContext.lastX || x,
    currentContext.lastY || y,
    x,
    y
  );
  currentContext.stroke();

  // Store the last point
  currentContext.lastX = x;
  currentContext.lastY = y;

  // Vary line width slightly for natural look
  currentContext.lineWidth = 1.2 + Math.random() * 0.6;
}

function clearCanvas(canvas) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function generateHandwritingFont() {
  const characters = {};
  document.querySelectorAll('.char-canvas').forEach((canvas) => {
    const char = canvas.getAttribute('data-char');
    characters[char] = canvas.toDataURL();
  });

  // Create a custom font object
  const customFont = {
    name: 'MyHandwriting',
    characters: characters,
    timestamp: Date.now()
  };

  // Store the font data
  localStorage.setItem('custom-handwriting-font', JSON.stringify(customFont));

  // Apply the font to the page
  applyCustomFont(customFont);

  // Close the popup
  toggleHandwritingCreator();
}

function applyCustomFont(fontData) {
  // Create a style element for the font
  const style = document.createElement('style');
  const fontFace = `
    @font-face {
      font-family: "${fontData.name}";
      src: url(${fontData.characters['A']});
    }
  `;
  style.textContent = fontFace;
  document.head.appendChild(style);

  // Set it as the current font
  document.body.style.setProperty('--handwriting-font', fontData.name);

  // Update the font selector
  const fontSelect = document.getElementById('handwriting-font');
  const option = document.createElement('option');
  option.value = fontData.name;
  option.textContent = 'My Handwriting';
  option.selected = true;
  fontSelect.appendChild(option);
}

// Image processing utilities
function getImageBrightness(imageData, x, y) {
  const index = (y * imageData.width + x) * 4;
  return (
    (imageData.data[index] +
      imageData.data[index + 1] +
      imageData.data[index + 2]) /
    3
  );
}

function findTextLines(processedCanvas) {
  const ctx = processedCanvas.getContext('2d');
  const imageData = ctx.getImageData(
    0,
    0,
    processedCanvas.width,
    processedCanvas.height
  );
  const lines = [];
  let currentLine = { start: null, end: null };

  // Scan horizontally for text lines
  for (let y = 0; y < processedCanvas.height; y++) {
    let hasInk = false;
    for (let x = 0; x < processedCanvas.width; x++) {
      if (getImageBrightness(imageData, x, y) < 200) {
        hasInk = true;
        break;
      }
    }

    if (hasInk && currentLine.start === null) {
      currentLine.start = y;
    } else if (!hasInk && currentLine.start !== null) {
      currentLine.end = y;
      lines.push({ ...currentLine });
      currentLine = { start: null, end: null };
    }
  }

  return lines;
}

function extractCharacters(processedCanvas, textLines) {
  const ctx = processedCanvas.getContext('2d');
  const characters = [];

  textLines.forEach((line) => {
    const lineHeight = line.end - line.start;
    const lineImageData = ctx.getImageData(
      0,
      line.start,
      processedCanvas.width,
      lineHeight
    );

    // Find character boundaries within line
    let inCharacter = false;
    let charStart = 0;

    for (let x = 0; x < processedCanvas.width; x++) {
      let hasInk = false;
      for (let y = 0; y < lineHeight; y++) {
        if (getImageBrightness(lineImageData, x, y) < 200) {
          hasInk = true;
          break;
        }
      }

      if (hasInk && !inCharacter) {
        inCharacter = true;
        charStart = x;
      } else if (!hasInk && inCharacter) {
        inCharacter = false;
        const charWidth = x - charStart;

        // Create character canvas
        const charCanvas = document.createElement('canvas');
        charCanvas.width = charWidth;
        charCanvas.height = lineHeight;
        const charCtx = charCanvas.getContext('2d');

        // Copy character to its own canvas
        charCtx.drawImage(
          processedCanvas,
          charStart,
          line.start,
          charWidth,
          lineHeight,
          0,
          0,
          charWidth,
          lineHeight
        );

        characters.push({
          canvas: charCanvas,
          width: charWidth,
          height: lineHeight
        });
      }
    }
  });

  return characters;
}

async function processHandwritingImage(imageData) {
  // Create a canvas to process the image
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  // Set canvas size to match image
  canvas.width = imageData.width;
  canvas.height = imageData.height;

  // Draw image to canvas
  ctx.drawImage(imageData, 0, 0);

  // Convert to grayscale and enhance contrast
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imgData.data;

  for (let i = 0; i < pixels.length; i += 4) {
    const avg = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
    // Enhance contrast
    const contrast = 1.5;
    const brightnessFactor = 0.8;
    let val = ((avg - 128) * contrast + 128) * brightnessFactor;
    val = val > 200 ? 255 : 0; // Binary threshold
    pixels[i] = pixels[i + 1] = pixels[i + 2] = val;
  }

  ctx.putImageData(imgData, 0, 0);

  // Find text lines
  const lines = findTextLines(canvas);

  // Extract individual characters
  const characters = extractCharacters(canvas, lines);

  return characters;
}

async function createFontFromImage(imageFile) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = async () => {
      try {
        // Process the image and get characters
        const characters = await processHandwritingImage(img);

        // Create font data
        const fontData = {
          name: 'ScannedHandwriting',
          characters: characters.map((char) => char.canvas.toDataURL()),
          timestamp: Date.now()
        };

        // Store and apply the font
        localStorage.setItem(
          'scanned-handwriting-font',
          JSON.stringify(fontData)
        );
        await applyScannedFont(fontData);
        resolve(fontData);
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(imageFile);
  });
}

async function applyScannedFont(fontData) {
  // Create preview container
  const previewContainer = document.getElementById('preview-container');
  previewContainer.innerHTML =
    '<h4>Extracted Characters:</h4><div class="characters-grid"></div>';
  const grid = previewContainer.querySelector('.characters-grid');

  // Display extracted characters
  fontData.characters.forEach((charDataUrl, index) => {
    const img = document.createElement('img');
    img.src = charDataUrl;
    img.style.margin = '5px';
    img.style.border = '1px solid #ccc';
    grid.appendChild(img);
  });

  // Create @font-face rule
  const style = document.createElement('style');
  style.textContent = `
    @font-face {
      font-family: "${fontData.name}";
      src: url(${fontData.characters[0]});
      font-weight: normal;
      font-style: normal;
    }
  `;
  document.head.appendChild(style);

  // Apply the font
  document.body.style.setProperty('--handwriting-font', fontData.name);

  // Update font selector
  const fontSelect = document.getElementById('handwriting-font');
  const option = document.createElement('option');
  option.value = fontData.name;
  option.textContent = 'Scanned Handwriting';
  option.selected = true;
  fontSelect.appendChild(option);
}

function initializeHandwritingCreator() {
  // Create the popup container if it doesn't exist
  let container = document.querySelector('.handwriting-creator-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'handwriting-creator-container popup-container';
    document.body.appendChild(container);
  }

  // Set up the popup content
  container.innerHTML = `
    <div class="popup-content">
      <button class="close-button">&times;</button>
      <h3>Create Font from Handwriting Image</h3>
      <p style="font-size: 0.9rem; margin: 10px 0;">
        Upload the image to create a custom handwriting font.
      </p>
      <input type="file" id="handwriting-image" accept="image/*" style="margin: 20px 0;">
      <div id="preview-container" style="margin: 20px 0;">
        <div class="characters-grid"></div>
      </div>
      <button id="create-font" class="button generate-image-button">Create Font</button>
    </div>
  `;

  // Set up event listeners
  const fileInput = document.getElementById('handwriting-image');
  const createButton = document.getElementById('create-font');
  const closeButton = container.querySelector('.close-button');

  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const preview = document.getElementById('preview-container');
        preview.innerHTML = '<div>Processing image...</div>';
        await createFontFromImage(file);
      } catch (err) {
        console.error('Error creating font:', err);
        preview.innerHTML = '<div>Error creating font. Please try again.</div>';
      }
    }
  });

  createButton.addEventListener('click', () => {
    fileInput.click();
  });

  closeButton.addEventListener('click', toggleHandwritingCreator);

  // Add click handler to the create handwriting button
  const createHandwritingButton = document.getElementById(
    'create-handwriting-button'
  );
  if (createHandwritingButton) {
    createHandwritingButton.addEventListener('click', toggleHandwritingCreator);
  }

  // Close popup when clicking outside
  container.addEventListener('click', (e) => {
    if (e.target === container) {
      toggleHandwritingCreator();
    }
  });
}

export { initializeHandwritingCreator };
