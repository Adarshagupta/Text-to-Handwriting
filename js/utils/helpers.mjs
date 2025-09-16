const pageEl = document.querySelector('.page-a');
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

function addFontFromFile(fileObj) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const newFont = new FontFace('temp-font', e.target.result);
    newFont.load().then((loadedFace) => {
      document.fonts.add(loadedFace);
      pageEl.style.fontFamily = 'temp-font';
    });
  };
  reader.readAsArrayBuffer(fileObj);
}

/**
 * @method createPDF
 * @param imgs array of images (in base64)
 * @description
 * Creates PDF from list of given images
 */
function createPDF(imgs) {
  // eslint-disable-next-line new-cap
  const doc = new jsPDF('p', 'pt', 'a4');
  const width = doc.internal.pageSize.width;
  const height = doc.internal.pageSize.height;
  for (const i in imgs) {
    doc.text(10, 20, '');
    doc.addImage(
      imgs[i],
      'JPEG',
      25,
      50,
      width - 50,
      height - 80,
      'image-' + i
    );
    if (i != imgs.length - 1) {
      doc.addPage();
    }
  }
  doc.save();
}

function formatText(e) {
  e.preventDefault();
  const text = e.clipboardData.getData('text/plain');
  document.execCommand('insertText', false, text);
}

function addPaperFromFile(file) {
  const tmppath = URL.createObjectURL(file);
  pageEl.style.backgroundImage = `url(${tmppath})`;
}

// Add new text customization functions
export function applyWordStyle(style) {
  const selection = window.getSelection();
  if (!selection.rangeCount) return;

  const range = selection.getRangeAt(0);
  const selectedText = range.toString().trim();

  if (!selectedText) return;

  const span = document.createElement('span');
  span.className = `custom-text ${style}`;
  span.textContent = selectedText;

  range.deleteContents();
  range.insertNode(span);

  // Maintain selection
  selection.removeAllRanges();
  selection.addRange(range);
}

export function initializeTextCustomization() {
  const contextMenu = document.getElementById('context-menu');
  const paperContent = document.querySelector('.paper-content');

  if (!contextMenu || !paperContent) {
    console.warn('Context menu or paper content not found');
    return;
  }

  // Show context menu on right click
  paperContent.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    if (selectedText) {
      contextMenu.style.left = `${e.pageX}px`;
      contextMenu.style.top = `${e.pageY}px`;
      contextMenu.classList.add('show');
    }
  });

  // Handle menu item clicks
  contextMenu.addEventListener('click', (e) => {
    const menuItem = e.target.closest('.menu-item');
    if (!menuItem) return;

    const style = menuItem.dataset.style;
    if (style) {
      applyWordStyle(style);
      contextMenu.classList.remove('show');
    }
  });

  // Handle keyboard shortcuts
  paperContent.addEventListener('keydown', (e) => {
    if (!(e.ctrlKey || e.metaKey)) return;

    let style = null;
    if (e.shiftKey) {
      // Shortcuts with Ctrl/Cmd + Shift
      switch (e.key.toLowerCase()) {
        case '.':
          style = 'larger';
          break; // Ctrl/Cmd + Shift + .
        case ',':
          style = 'smaller';
          break; // Ctrl/Cmd + Shift + ,
      }
    } else {
      // Regular Ctrl/Cmd shortcuts
      switch (e.key.toLowerCase()) {
        case 'b':
          style = 'bold';
          break; // Ctrl/Cmd + B
        case 'i':
          style = 'italic';
          break; // Ctrl/Cmd + I
        case 'u':
          style = 'underline';
          break; // Ctrl/Cmd + U
      }
    }

    if (style) {
      e.preventDefault();
      applyWordStyle(style);
    }
  });

  // Hide context menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!contextMenu.contains(e.target)) {
      contextMenu.classList.remove('show');
    }
  });
}

function addImageToPaperContent(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = document.createElement('img');
    img.src = e.target.result;

    // Create a container div that will hold the image
    const imageContainer = document.createElement('div');
    imageContainer.className = 'paper-image-container';

    // Create a white background div to block lines
    const whiteBg = document.createElement('div');
    whiteBg.className = 'image-background';
    imageContainer.appendChild(whiteBg);

    // Add the image to the container
    imageContainer.appendChild(img);

    // Get the paper content element
    const paperContent = document.querySelector('.page-a .paper-content');

    // Calculate optimal image size based on page width
    img.onload = () => {
      const pageWidth = paperContent.clientWidth;
      const aspectRatio = img.naturalWidth / img.naturalHeight;

      // Set maximum width to 70% of page width
      const maxWidth = Math.min(pageWidth * 0.7, img.naturalWidth);
      img.style.width = maxWidth + 'px';
      img.style.height = maxWidth / aspectRatio + 'px';

      // Size the white background
      whiteBg.style.width = maxWidth + 40 + 'px'; // Add padding
      whiteBg.style.height = maxWidth / aspectRatio + 40 + 'px'; // Add padding
    };

    // Create a paragraph to contain the image (this helps with line spacing)
    const paragraph = document.createElement('p');
    paragraph.className = 'image-paragraph';
    paragraph.appendChild(imageContainer);

    // Insert at cursor position or append to end
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (paperContent.contains(range.commonAncestorContainer)) {
        range.deleteContents();
        range.insertNode(paragraph);
      } else {
        paperContent.appendChild(paragraph);
      }
    } else {
      paperContent.appendChild(paragraph);
    }
  };
  reader.readAsDataURL(file);
}

export {
  isMobile,
  addFontFromFile,
  createPDF,
  formatText,
  addPaperFromFile,
  addImageToPaperContent
};
