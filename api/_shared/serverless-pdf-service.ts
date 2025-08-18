import path from 'path';
import fs from 'fs/promises';

/*
 * FONT SETUP FOR ULTIMATE TEXT TO IMAGE:
 * 
 * Using existing Noto Sans TC font located at:
 * - data/NotoSansTC-Regular.ttf
 * 
 * This font supports Traditional Chinese characters and will be used by
 * Methods 1, 4, and 6 for Ultimate Text To Image rendering.
 * 
 * Methods will gracefully fallback to system fonts if the file is not found.
 */

export interface FlashcardData {
  word: string;
  pinyin: string;
  vietnamese?: string;
  content?: string;
  imageUrl?: string;
  partOfSpeech?: string;
}

export interface FlashcardPDFOptions {
  flashcards: FlashcardData[];
}

// External API function for Chinese text conversion with smart defaults
async function callChineseTextAPI(
  text: string, 
  method: 'svg' | 'text-to-image' | 'png' = 'png',
  fontSize: number = 48,
  fontWeight: "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900" | "normal" | "bold" = '700'
): Promise<string> {
  try {
    const response = await fetch('https://booking.hoangha.shop/api/convert-chinese-text', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        text,
        method,
        fontSize,
        fontFamily: 'NotoSansTC',
        fontWeight,
        width: 800,
        height: 300,
        backgroundColor: 'transparent',
        textColor: '#000000',
        padding: 30,
        lineHeight: 1.8,
        textAlign: 'center',
        quality: 100
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    // Get the response as binary data since API returns image file
    const arrayBuffer = await response.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);
    
    // Get content type from response headers or default to PNG
    const contentType = response.headers.get('content-type') || 'image/png';
    
    // Convert to data URI
    const base64 = imageBuffer.toString('base64');
    return `data:${contentType};base64,${base64}`;
    } catch (error) {
    console.error('Chinese text API call failed:', error);
    // Fallback to simple SVG generation
  const safeText = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const svg = `
      <svg width="800" height="300" xmlns="http://www.w3.org/2000/svg">
        <rect width="800" height="300" fill="#fff"/>
        <text x="50%" y="50%" font-size="${fontSize}" font-family="Noto Sans TC, Arial, sans-serif" fill="#000" text-anchor="middle" alignment-baseline="middle" dominant-baseline="middle">${safeText}</text>
    </svg>
  `;
  const base64 = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
  }
}

export class ServerlessPDFService {
  private templateFrontPath: string;
  private templateBackPath: string;

  constructor() {
    // Paths to the flashcard template images
    // In Vercel serverless environment, files from client/public/ are available in the root
    this.templateFrontPath = path.join(process.cwd(), 'client/public/templates', 'flashcard-front.png');
    this.templateBackPath = path.join(process.cwd(), 'client/public/templates', 'flashcard-back.png');
  }

  /**
   * Build an SVG string for Chinese text with optional embedded Noto Sans TC font.
   * Embedding the font ensures glyph coverage on serverless platforms lacking CJK fonts.
   */
  private async buildChineseTextSVG(text: string, opts?: { width?: number; height?: number; fontSize?: number; background?: string; textColor?: string; fontFamilyFallback?: string; }): Promise<string> {
    const width = opts?.width ?? 600; // px
    const height = opts?.height ?? 180; // px
    const fontSize = opts?.fontSize ?? 64; // px
    const background = opts?.background ?? '#ffffff';
    const textColor = opts?.textColor ?? '#111111';
    const fallback = opts?.fontFamilyFallback ?? "'Noto Sans TC', Arial, sans-serif";

    // Escape XML special chars
    const safeText = (text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Try to embed Noto Sans TC
    let embeddedStyle = '';
    try {
      const fontPath = path.join(process.cwd(), 'data', 'NotoSansTC-Regular.ttf');
      const exists = await fs
        .access(fontPath)
        .then(() => true)
        .catch(() => false);
      if (exists) {
        const fontBuf = await fs.readFile(fontPath);
        const fontBase64 = fontBuf.toString('base64');
        embeddedStyle = `<style>@font-face { font-family: 'NotoSansTC-Embedded'; src: url(data:font/truetype;base64,${fontBase64}) format('truetype'); font-weight: normal; font-style: normal; }</style>`;
      }
    } catch (e) {
      // Non-fatal; fall back to system fonts
    }

    const fontFamily = embeddedStyle ? "'NotoSansTC-Embedded'" : fallback;

    const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">\n  <defs>${embeddedStyle}</defs>\n  <rect width="100%" height="100%" fill="${background}"/>\n  <text x="50%" y="50%" font-size="${fontSize}" font-family=${fontFamily} fill="${textColor}" text-anchor="middle" dominant-baseline="middle">${safeText}</text>\n</svg>`;
    return svg;
  }

  /**
   * Convert an SVG XML string (or SVG data URI) to a PNG data URI using sharp.
   * Falls back to node-canvas if sharp fails for any reason.
   */
  private async svgToPngDataUri(svgInput: string, width?: number, height?: number): Promise<{ dataUri: string; buffer: Buffer }> {
    const isDataUri = svgInput.startsWith('data:image/svg');
    const svgBuffer = isDataUri ? Buffer.from(svgInput.split(',')[1] || '', 'base64') : Buffer.from(svgInput, 'utf8');

    // Try sharp first (fast and serverless-friendly)
    try {
      const sharpMod = (await import('sharp')) as any;
      const sharpFn = sharpMod.default || sharpMod;
      let instance = sharpFn(svgBuffer);
      if (width || height) {
        instance = instance.resize({ width, height, fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } });
      }
      const pngBuffer: Buffer = await instance.png().toBuffer();
      const dataUri = `data:image/png;base64,${pngBuffer.toString('base64')}`;
      return { dataUri, buffer: pngBuffer };
    } catch (e) {
      // Fallback to node-canvas rendering
      try {
        const canvasModule: any = await import('canvas');
        const createCanvas = canvasModule.createCanvas || canvasModule.default?.createCanvas;
        const registerFont = canvasModule.registerFont || canvasModule.default?.registerFont;
        const w = width ?? 600;
        const h = height ?? 180;
        if (registerFont) {
          try {
            const fontPath = path.join(process.cwd(), 'data', 'NotoSansTC-Regular.ttf');
            const exists = await fs
              .access(fontPath)
              .then(() => true)
              .catch(() => false);
            if (exists) registerFont(fontPath, { family: 'Noto Sans TC' });
          } catch {}
        }
        const canvas = createCanvas(w, h);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#111111';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '64px "Noto Sans TC", Arial, sans-serif';
        const text = 'SVG render failed';
        ctx.fillText(text, w / 2, h / 2);
        const buf = canvas.toBuffer('image/png');
        const du = `data:image/png;base64,${buf.toString('base64')}`;
        return { dataUri: du, buffer: buf };
      } catch (e2) {
        // Last resort tiny transparent PNG
        const tiny = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', 'base64');
        return { dataUri: `data:image/png;base64,${tiny.toString('base64')}` , buffer: tiny };
      }
    }
  }

  /**
   * Public: Generate a PNG image for the given Chinese text using external API.
   */
  public async generateChineseTextImage(
    text: string, 
    opts?: { 
      width?: number; 
      height?: number; 
      fontSize?: number; 
      fontWeight?: "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900" | "normal" | "bold";
    }
  ): Promise<{ buffer: Buffer; dataUri: string; contentType: 'image/png'; width: number; height: number; }> {
    const width = opts?.width ?? 600;
    const height = opts?.height ?? 180;
    
    try {
       // Use simplified external API for Chinese text rendering
       const svgDataUri = await callChineseTextAPI(
         text,
         'png',
         opts?.fontSize || 48,
         opts?.fontWeight || '400'
       );
      
             // The API already returns binary image data as data URI, no need to convert
       // Extract buffer from data URI for compatibility
       const base64Data = svgDataUri.split(',')[1];
       const buffer = Buffer.from(base64Data, 'base64');
       return { buffer, dataUri: svgDataUri, contentType: 'image/png', width, height };
      
    } catch (error) {
      console.error('External API failed, using fallback SVG method:', error);
      // Fallback to local SVG generation
    const svg = await this.buildChineseTextSVG(text, { width, height, fontSize: opts?.fontSize });
    const { dataUri, buffer } = await this.svgToPngDataUri(svg, width, height);
    return { buffer, dataUri, contentType: 'image/png', width, height };
    }
  }

  /**
   * Public: Generate a simple PDF where each page shows one Chinese text centered as an image.
   */
  public async generateChineseTextPDF(texts: string[] | string, opts?: { orientation?: 'portrait' | 'landscape'; unit?: 'mm' | 'pt'; format?: 'a4' | 'letter'; margin?: number; }): Promise<Buffer> {
    const list = Array.isArray(texts) ? texts : [texts];
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({ orientation: opts?.orientation ?? 'portrait', unit: opts?.unit ?? 'mm', format: opts?.format ?? 'a4' });

    const pageWidth = (pdf as any).internal.pageSize.getWidth();
    const pageHeight = (pdf as any).internal.pageSize.getHeight();
    const margin = opts?.margin ?? 20;

    let first = true;
    for (const t of list) {
      if (!first) pdf.addPage();
      first = false;
      try {
        const { dataUri } = await this.generateChineseTextImage(t, { width: 1200, height: 360 });
        const props = pdf.getImageProperties(dataUri);
        const imgRatio = props.width / props.height;
        const maxW = pageWidth - margin * 2;
        const maxH = pageHeight - margin * 2;
        let w = maxW;
        let h = w / imgRatio;
        if (h > maxH) {
          h = maxH;
          w = h * imgRatio;
        }
        const x = (pageWidth - w) / 2;
        const y = (pageHeight - h) / 2;
        pdf.addImage(dataUri, 'PNG', x, y, w, h);
      } catch (e) {
        pdf.setTextColor(200, 0, 0);
        pdf.setFontSize(12);
        pdf.text('Failed to render text', pageWidth / 2, pageHeight / 2, { align: 'center' });
      }
    }

    const uint8Array = pdf.output('arraybuffer');
    const pdfBuffer = Buffer.from(uint8Array);
    return pdfBuffer;
  }

  /**
   * Load template image and convert to base64 data URL (no caching)
   */
  private async loadTemplateImage(templateType: 'front' | 'back'): Promise<string> {
    try {
      const templatePath = templateType === 'front' ? this.templateFrontPath : this.templateBackPath;

      // Try to read the image file
      const imageBuffer = await fs.readFile(templatePath);
      
      // Convert to base64 data URL
      const base64Image = `data:image/png;base64,${imageBuffer.toString('base64')}`;
      
      return base64Image;
      
    } catch (error) {
      console.error(`Error loading ${templateType} template from ${templateType === 'front' ? this.templateFrontPath : this.templateBackPath}:`, error);
      
      // Return a simple fallback base64 image (1x1 transparent PNG)
      const fallbackImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
      console.log(`Using fallback image for ${templateType} template`);
      
      return fallbackImage;
    }
  }

  /**
   * Generate flashcard PDF using template background
   */
  async generateFlashcardPDF(options: FlashcardPDFOptions): Promise<Buffer> {
    const startTime = Date.now();
    const sessionId = Math.random().toString(36).substring(2, 15);
    console.log(`🚀 Starting fresh PDF generation at ${new Date().toISOString()} [Session: ${sessionId}]`);
    console.log(`📊 Testing ${options.flashcards.length} flashcards with ${10} different Chinese rendering methods`);
    try {
      // Load template images
      const frontTemplateImage = await this.loadTemplateImage('front');
      const backTemplateImage = await this.loadTemplateImage('back');
      
      // Use jsPDF for efficient PDF generation with template background
      const { jsPDF } = await import('jspdf');
      
      // Create new PDF document (A4 landscape: 297 x 210 mm)
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      // Set Chinese language support
      try {
        pdf.setLanguage("zh-CN");
        console.log('✅ Set PDF language to Chinese (zh-CN)');
      } catch (langError) {
        console.warn('Could not set Chinese language:', langError);
      }

      let isFirstPage = true;

      // Generate cards (front and back for each flashcard)
      for (let i = 0; i < options.flashcards.length; i++) {
        const card = options.flashcards[i];

        try {
          // Add front page
          if (!isFirstPage) {
            pdf.addPage();
          }
          
          await this.generateCardFrontWithTemplate(pdf, card, i + 1, frontTemplateImage);
          isFirstPage = false;

          // Add back page
          pdf.addPage();
          await this.generateCardBackWithTemplate(pdf, card, i + 1, backTemplateImage);

        } catch (cardError) {
          console.error(`❌ Error processing flashcard ${i + 1} (${card.word}):`, cardError instanceof Error ? cardError.message : String(cardError));
          
          // Add a fallback page to prevent completely broken PDF
          try {
            if (isFirstPage) {
              // We need at least one page for a valid PDF
              isFirstPage = false;
            } else {
              pdf.addPage();
            }
            
            // Add error page with basic template
            pdf.addImage(frontTemplateImage, 'JPEG', 0, 0, 297, 210);
            pdf.setFontSize(24);
            pdf.setTextColor(255, 0, 0); // Red text
            pdf.text('Error generating card', 297/2, 210/2, { align: 'center' });
            pdf.setFontSize(16);
            pdf.setTextColor(0, 0, 0); // Black text
            pdf.text(`Card: ${card.word}`, 297/2, 210/2 + 20, { align: 'center' });
          } catch (fallbackError) {
            console.error(`Failed to add error page for card ${i + 1}:`, fallbackError);
          }
        }
      }

      // First, validate that we have pages
      const pageCount = pdf.getNumberOfPages();
      if (pageCount === 0) {
        throw new Error('PDF has no pages');
      }
      
      // Generate PDF data - try different output methods for better compatibility
      let pdfBuffer: Buffer;
      try {
        // Method 1: Try uint8array first (more reliable)
        const uint8Array = pdf.output('arraybuffer');
        pdfBuffer = Buffer.from(uint8Array);
      } catch (bufferError) {
        console.warn('ArrayBuffer method failed, trying string method:', bufferError);
        // Method 2: Fallback to string method
        const pdfString = pdf.output('datauristring');
        const base64Data = pdfString.split(',')[1];
        if (!base64Data) {
          throw new Error('Failed to extract base64 data from PDF');
        }
        pdfBuffer = Buffer.from(base64Data, 'base64');
      }
      
      // Validate the PDF buffer
      if (!pdfBuffer || pdfBuffer.length === 0) {
        throw new Error('Generated PDF buffer is empty');
      }
      
      // Check if buffer starts with PDF header
      const pdfHeader = pdfBuffer.slice(0, 4).toString();
      if (pdfHeader !== '%PDF') {
        console.error('Invalid PDF header:', pdfHeader);
        throw new Error(`Invalid PDF header: expected '%PDF', got '${pdfHeader}'`);
      }
      
      const endTime = Date.now();
      console.log(`✅ Fresh PDF generation completed in ${endTime - startTime}ms at ${new Date().toISOString()} [Session: ${sessionId}]`);
      console.log(`📦 Generated PDF size: ${pdfBuffer.length} bytes`);
      console.log(`🔍 Canvas availability caching: DISABLED (ensures fresh testing)`);
      
      return pdfBuffer;

    } catch (error) {
      console.error('Error generating flashcard PDF:', error);
      throw new Error(`Failed to generate flashcard PDF: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Fetch image and convert to base64 for PDF embedding
   */
  private async fetchImageAsBase64(imageUrl: string): Promise<string> {
    try {
      // Use node-fetch to get the image
      const fetch = (await import('node-fetch')).default;
      const response = await fetch(imageUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const imageBuffer = Buffer.from(arrayBuffer);
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      
      // Convert to base64
      const base64Image = `data:${contentType};base64,${imageBuffer.toString('base64')}`;
      
      return base64Image;
      
    } catch (error) {
      console.error('Error fetching image:', error);
      throw error;
    }
  }

  /**
   * Generate front side using template background
   */
  private async generateCardFrontWithTemplate(pdf: any, card: FlashcardData, cardNumber: number, templateImage: string): Promise<void> {
    const pageWidth = 297; // A4 landscape width in mm
    const pageHeight = 210; // A4 landscape height in mm
    
    // Add template as background image (landscape orientation)
    pdf.addImage(templateImage, 'JPEG', 0, 0, pageWidth, pageHeight);
    
    // Set up Chinese font support (using built-in fonts with fallback)
    try {
      // Try to set a font that supports Chinese characters
      pdf.setFont("helvetica");
    } catch (error) {
      console.warn('Font setting failed, using default:', error);
    }

    // Add actual image or placeholder centered at 70% of page size
    if (card.imageUrl && !card.imageUrl.includes('placeholder') && !card.imageUrl.includes('via.placeholder')) {
      try {
        // Fetch and convert image to base64
        const base64Image = await this.fetchImageAsBase64(card.imageUrl);
        
        // Define maximum dimensions (70% of page size)
        const maxImageWidth = pageWidth * 0.7; // 70% of page width
        const maxImageHeight = pageHeight * 0.7; // 70% of page height
        
        // Get image properties to calculate aspect ratio
        const imageProperties = pdf.getImageProperties(base64Image);
        const originalWidth = imageProperties.width;
        const originalHeight = imageProperties.height;
        const aspectRatio = originalWidth / originalHeight;
        
        // Calculate final dimensions maintaining aspect ratio within 70% bounds
        let imageWidth, imageHeight;
        
        if (aspectRatio > 1) {
          // Landscape image - constrain by width
          imageWidth = Math.min(maxImageWidth, maxImageHeight * aspectRatio);
          imageHeight = imageWidth / aspectRatio;
        } else {
          // Portrait or square image - constrain by height
          imageHeight = Math.min(maxImageHeight, maxImageWidth / aspectRatio);
          imageWidth = imageHeight * aspectRatio;
        }
        
        // Ensure we don't exceed the maximum bounds
        if (imageWidth > maxImageWidth) {
          imageWidth = maxImageWidth;
          imageHeight = imageWidth / aspectRatio;
        }
        if (imageHeight > maxImageHeight) {
          imageHeight = maxImageHeight;
          imageWidth = imageHeight * aspectRatio;
        }
        
        const imageX = (pageWidth - imageWidth) / 2; // Center horizontally
        const imageY = (pageHeight - imageHeight) / 2; // Center vertically
        
        // Add the actual image
        pdf.addImage(base64Image, 'JPEG', imageX, imageY, imageWidth, imageHeight);
        
      } catch (error) {
        console.error(`❌ Failed to add image for "${card.word}":`, error);
        // Fallback to placeholder text if image fails
        pdf.setFontSize(12);
        pdf.setTextColor(200, 100, 100); // Light red text
        pdf.text('Image failed to load', pageWidth / 2, pageHeight / 2, { align: 'center' });
        pdf.setFontSize(10);
        pdf.setTextColor(150, 150, 150); // Gray text
        pdf.text(`URL: ${card.imageUrl?.substring(0, 50)}...`, pageWidth / 2, pageHeight / 2 + 15, { align: 'center' });
      }
    } else {
      // Show placeholder when no image URL provided
      pdf.setFontSize(12);
      pdf.setTextColor(120, 120, 120); // Gray text
      pdf.text('No image available', pageWidth / 2, pageHeight / 2, { align: 'center' });
      
      if (card.imageUrl) {
        pdf.setFontSize(8);
        pdf.text(`(Placeholder URL detected)`, pageWidth / 2, pageHeight / 2 + 15, { align: 'center' });
      }
    }
  }

  /**
   * Generate back side using template background - Simplified version using external API
   */
  private async generateCardBackWithTemplate(pdf: any, card: FlashcardData, cardNumber: number, templateImage: string): Promise<void> {
    const pageWidth = 297; // A4 landscape width in mm
    const pageHeight = 210; // A4 landscape height in mm
    
    // Add template as background image (landscape orientation)
    pdf.addImage(templateImage, 'JPEG', 0, 0, pageWidth, pageHeight);
    
    console.log(`🚀 Generating flashcard back for: "${card.word}" with pinyin: "${card.pinyin}"`);
    
                  try {
       // 6-column layout to test all 3 methods for both Chinese and Pinyin
       const colWidth = pageWidth / 6;
       const colHeight = pageHeight * 0.6;
    const startY = 30;
       
       console.log(`🧪 Testing all methods for: Chinese="${card.word}" Pinyin="${card.pinyin}"`);
       
       // CHINESE TEXT - 3 methods (columns 1-3)
       // Method 1: svg
       const chineseSvg = await callChineseTextAPI(
         card.word || '朋友',
         'svg',
         64,
         '800'
       );
       
       // Method 2: text-to-image  
       const chineseTextToImage = await callChineseTextAPI(
         card.word || '朋友',
         'text-to-image',
         64,
         '800'
       );
       
       // Method 3: png
       const chinesePng = await callChineseTextAPI(
         card.word || '朋友',
         'png',
         64,
         '800'
       );
       
       // PINYIN TEXT - 3 methods (columns 4-6)
       // Method 1: svg
       const pinyinSvg = await callChineseTextAPI(
         card.pinyin || 'péngyǒu',
         'svg',
         36,
         '600'
       );
       
       // Method 2: text-to-image
       const pinyinTextToImage = await callChineseTextAPI(
         card.pinyin || 'péngyǒu',
         'text-to-image',
         36,
         '600'
       );
       
       // Method 3: png
       const pinyinPng = await callChineseTextAPI(
         card.pinyin || 'péngyǒu',
         'png',
         36,
         '600'
       );
       
       // Display all 6 columns with better sizing
       const imageWidth = colWidth * 0.9;
       const imageHeight = 50;
       const imageY = startY + 30;
       
       // Column 1: Chinese SVG
       pdf.addImage(chineseSvg, 'PNG', 
         0 * colWidth + (colWidth - imageWidth) / 2, 
         imageY, 
         imageWidth, imageHeight);
       
       // Column 2: Chinese Text-to-Image
       pdf.addImage(chineseTextToImage, 'PNG', 
         1 * colWidth + (colWidth - imageWidth) / 2, 
         imageY, 
         imageWidth, imageHeight);
       
       // Column 3: Chinese PNG
       pdf.addImage(chinesePng, 'PNG', 
         2 * colWidth + (colWidth - imageWidth) / 2, 
         imageY, 
         imageWidth, imageHeight);
       
       // Column 4: Pinyin SVG
       pdf.addImage(pinyinSvg, 'PNG', 
         3 * colWidth + (colWidth - imageWidth) / 2, 
         imageY, 
         imageWidth, imageHeight);
       
       // Column 5: Pinyin Text-to-Image
       pdf.addImage(pinyinTextToImage, 'PNG', 
         4 * colWidth + (colWidth - imageWidth) / 2, 
         imageY, 
         imageWidth, imageHeight);
       
       // Column 6: Pinyin PNG
       pdf.addImage(pinyinPng, 'PNG', 
         5 * colWidth + (colWidth - imageWidth) / 2, 
         imageY, 
         imageWidth, imageHeight);
       
       // Add column divider lines
       pdf.setDrawColor(180, 180, 180);
       pdf.setLineWidth(0.3);
       for (let i = 1; i < 6; i++) {
         const x = i * colWidth;
         pdf.line(x, startY + 20, x, imageY + imageHeight + 25);
       }
       
       // Add section titles at top
       pdf.setFontSize(10);
       pdf.setTextColor(60, 60, 60);
       pdf.text('CHINESE CHARACTERS', pageWidth / 4, startY + 10, { align: 'center' });
       pdf.text('PINYIN', (pageWidth * 3) / 4, startY + 10, { align: 'center' });
       
       // Add method labels at bottom
       pdf.setFontSize(7);
       pdf.setTextColor(120, 120, 120);
       const labels = [
         'SVG', 'Text-to-Image', 'PNG',
         'SVG', 'Text-to-Image', 'PNG'
       ];
       
       for (let i = 0; i < labels.length; i++) {
         const x = i * colWidth + colWidth / 2;
         const y = imageY + imageHeight + 15;
         pdf.text(labels[i], x, y, { align: 'center' });
       }
      
      
      console.log(`✅ Successfully generated flashcard back for: ${card.word}`);
      
    } catch (error) {
      console.error(`❌ Failed to generate flashcard back for: ${card.word}`, error);
      
      // Fallback: Simple text rendering
      pdf.setFontSize(24);
      pdf.setTextColor(0, 0, 0);
      pdf.text(card.word || '朋友', pageWidth / 2, pageHeight / 2 - 20, { align: 'center' });
      
      pdf.setFontSize(16);
      pdf.setTextColor(100, 100, 100);
      pdf.text(card.pinyin || 'péngyǒu', pageWidth / 2, pageHeight / 2, { align: 'center' });
      
      if (card.vietnamese) {
        pdf.setFontSize(14);
        pdf.setTextColor(0, 0, 0);
        pdf.text(card.vietnamese, pageWidth / 2, pageHeight / 2 + 20, { align: 'center' });
      }
    }
  }

  // All old method implementations removed - now using external API only
  // See generateCardBackWithTemplate() for the simplified implementation
}

export const serverlessPDFService = new ServerlessPDFService(); 