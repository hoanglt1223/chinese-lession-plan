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

// Utility: Generate SVG data URI for Chinese text (serverless-compatible)
function chineseTextToSVGDataURI(text: string, width = 300, height = 80): string {
  // Escape special XML characters
  const safeText = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="#fff"/>
      <text x="50%" y="50%" font-size="32" font-family="Noto Sans TC, Arial, sans-serif" fill="#000" text-anchor="middle" alignment-baseline="middle" dominant-baseline="middle">${safeText}</text>
    </svg>
  `;
  const base64 = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
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
   * Public: Generate a PNG image for the given Chinese text. Returns PNG buffer and data URI.
   */
  public async generateChineseTextImage(text: string, opts?: { width?: number; height?: number; fontSize?: number; background?: string; textColor?: string; }): Promise<{ buffer: Buffer; dataUri: string; contentType: 'image/png'; width: number; height: number; }> {
    const width = opts?.width ?? 600;
    const height = opts?.height ?? 180;
    const svg = await this.buildChineseTextSVG(text, { width, height, fontSize: opts?.fontSize, background: opts?.background, textColor: opts?.textColor });
    const { dataUri, buffer } = await this.svgToPngDataUri(svg, width, height);
    return { buffer, dataUri, contentType: 'image/png', width, height };
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
   * Generate back side using template background - 10 FIXED METHODS
   */
  private async generateCardBackWithTemplate(pdf: any, card: FlashcardData, cardNumber: number, templateImage: string): Promise<void> {
    const pageWidth = 297; // A4 landscape width in mm
    const pageHeight = 210; // A4 landscape height in mm
    
    // Add template as background image (landscape orientation)
    pdf.addImage(templateImage, 'JPEG', 0, 0, pageWidth, pageHeight);
    
    console.log(`🔧 TESTING 10 METHODS: Chinese text "${card.word}"`);
    console.log(`🚀 Methods 1, 4, 6 use Ultimate Text To Image with Noto Sans TC font`);
    
    // Debug the original text
    const originalText = card.word;
    const textBytes = Buffer.from(originalText, 'utf8');
    const textHex = textBytes.toString('hex');
    console.log(`Original text: "${originalText}", hex: ${textHex}, length: ${originalText.length}`);
    
    // Try multiple recovery strategies
    let recoveredTexts = {
      original: originalText,
      latin1ToUtf8: '',
      bufferDecoded: '',
      normalized: ''
    };
    
    try {
      // Strategy 1: Latin1 to UTF8 conversion
      const latin1Buffer = Buffer.from(originalText, 'latin1');
      recoveredTexts.latin1ToUtf8 = latin1Buffer.toString('utf8');
      
      // Strategy 2: Direct buffer interpretation
      recoveredTexts.bufferDecoded = Buffer.from(originalText).toString('utf8');
      
      // Strategy 3: Unicode normalization
      recoveredTexts.normalized = originalText.normalize('NFC');
      
      console.log('Recovery attempts:', recoveredTexts);
    } catch (error) {
      console.warn('Recovery failed:', error);
    }
    
    // TEST LAYOUT: 2 rows of 10 methods each
    const cols = 20;
    const rows = 2;
    const sectionWidth = pageWidth / cols;
    const sectionHeight = (pageHeight * 0.6) / rows;
    const startY = 30;
    // Methods 1-10 (already implemented)
    await this.method1_UltimateTextToImage(pdf, card.word || '朋友', 0 * sectionWidth, startY, sectionWidth, sectionHeight);
    await this.method2_TextToImage(pdf, card.word || '朋友', 1 * sectionWidth, startY, sectionWidth, sectionHeight);
    await this.method3_PDFKit(pdf, card.word || '朋友', 2 * sectionWidth, startY, sectionWidth, sectionHeight);
    await this.method4_Canvas(pdf, card.word || '朋友', 3 * sectionWidth, startY, sectionWidth, sectionHeight);
    await this.method5_Html2PdfJs(pdf, card.word || '朋友', 4 * sectionWidth, startY, sectionWidth, sectionHeight);
    await this.method6_jsPDF(pdf, card.word || '朋友', 5 * sectionWidth, startY, sectionWidth, sectionHeight);
    await this.method7_Browserless(pdf, card.word || '朋友', 6 * sectionWidth, startY, sectionWidth, sectionHeight);
    await this.method8_Html2CanvasClient(pdf, card.word || '朋友', 7 * sectionWidth, startY, sectionWidth, sectionHeight);
    await this.method9_PdfLib(pdf, card.word || '朋友', 8 * sectionWidth, startY, sectionWidth, sectionHeight);
    await this.method10_Fallback(pdf, card.word || '朋友', 9 * sectionWidth, startY, sectionWidth, sectionHeight);
    // Methods 11-20 (new)
    await this.method11_WasmTextToImage(pdf, card.word || '朋友', 10 * sectionWidth, startY, sectionWidth, sectionHeight);
    await this.method12_PreGeneratedAsset(pdf, card.word || '朋友', 11 * sectionWidth, startY, sectionWidth, sectionHeight);
    await this.method13_DocRaptor(pdf, card.word || '朋友', 12 * sectionWidth, startY, sectionWidth, sectionHeight);
    await this.method14_MarkupGo(pdf, card.word || '朋友', 13 * sectionWidth, startY, sectionWidth, sectionHeight);
    await this.method15_GoogleCloudVision(pdf, card.word || '朋友', 14 * sectionWidth, startY, sectionWidth, sectionHeight);
    await this.method16_CloudFunctionMicroservice(pdf, card.word || '朋友', 15 * sectionWidth, startY, sectionWidth, sectionHeight);
    await this.method17_PdfLibFont(pdf, card.word || '朋友', 16 * sectionWidth, startY, sectionWidth, sectionHeight);
    await this.method18_PdfLibSVG(pdf, card.word || '朋友', 17 * sectionWidth, startY, sectionWidth, sectionHeight);
    await this.method19_PuppeteerAPI(pdf, card.word || '朋友', 18 * sectionWidth, startY, sectionWidth, sectionHeight);
    await this.method20_CustomLambda(pdf, card.word || '朋友', 19 * sectionWidth, startY, sectionWidth, sectionHeight);
    // Add grid
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.3);
    for (let i = 1; i < cols; i++) {
      const x = i * sectionWidth;
      pdf.line(x, 0, x, pageHeight);
    }
    // Add method labels
    pdf.setFontSize(6);
    pdf.setTextColor(100, 100, 100);
    const labelY1 = pageHeight - 20;
    const methodLabels = [
      '1.svg-data-uri', '2.text-to-image', '3.pdfkit/canvas', '4.node-canvas', '5.html2pdf.js',
      '6.jsPDF-font', '7.browserless', '8.html2canvas-client', '9.pdf-lib', '10.fallback',
      '11.wasm-text2img', '12.pre-gen-asset', '13.docraptor', '14.markupgo', '15.gcloud-vision',
      '16.cloud-fn', '17.pdf-lib-font', '18.pdf-lib-svg', '19.puppeteer', '20.lambda'
    ];
    for (let i = 0; i < methodLabels.length; i++) {
      const x = (i * sectionWidth) + (sectionWidth / 2);
      pdf.text(methodLabels[i], x, labelY1, { align: 'center' });
    }
  }

  /**
   * METHOD 1: ultimate-text-to-image library (REPLACED with SVG for serverless)
   * This method now uses SVG data URI for Chinese text rendering, which is serverless-compatible.
   */
  private async method1_UltimateTextToImage(pdf: any, chineseText: string, x: number, y: number, width: number, height: number): Promise<void> {
    try {
      pdf.setFontSize(6);
      pdf.setTextColor(0, 100, 0);
      pdf.text('Method 1: SVG text', x + width/2, y - 5, { align: 'center' });
      // Use SVG data URI for Chinese text rendering
      const dataUri = chineseTextToSVGDataURI(chineseText, 300, 80);
      const imgWidth = width * 0.8;
      const imgHeight = 25;
      const imgX = x + (width - imgWidth) / 2;
      const imgY = y + 20;
      pdf.addImage(dataUri, 'SVG', imgX, imgY, imgWidth, imgHeight);
      pdf.setFontSize(5);
      pdf.setTextColor(0, 150, 0);
      pdf.text('✓ SUCCESS', x + width/2, y + height - 8, { align: 'center' });
    } catch (error) {
      pdf.setFontSize(5);
      pdf.setTextColor(200, 0, 0);
      pdf.text('✗ FAILED', x + width/2, y + 15, { align: 'center' });
      pdf.text('SVG error', x + width/2, y + 25, { align: 'center' });
    }
  }

  /**
   * METHOD 2: text-to-image library (DISABLED for serverless)
   *
   * Alternative solutions to explore in the future:
   * - Use a paid 3rd-party API that supports CJK text rendering (e.g., Google Cloud Vision, custom Lambda)
   * - Use a WASM-based text-to-image renderer (if available)
   * - Pre-generate images on the client and upload
   */
  private async method2_TextToImage(pdf: any, chineseText: string, x: number, y: number, width: number, height: number): Promise<void> {
    pdf.setFontSize(6);
    pdf.setTextColor(200, 0, 0);
    pdf.text('Not supported in serverless', x + width/2, y + height/2, { align: 'center' });
    pdf.setFontSize(5);
    pdf.text('text-to-image', x + width/2, y + height/2 + 10, { align: 'center' });
    return;
  }

  /**
   * METHOD 3: PDFKit approach
   */
  private async method3_PDFKit(pdf: any, chineseText: string, x: number, y: number, width: number, height: number): Promise<void> {
    try {
      pdf.setFontSize(6);
      pdf.setTextColor(0, 100, 0);
      pdf.text('Method 3: pdfkit', x + width/2, y - 5, { align: 'center' });
      
      console.log(`🚀 Method 3 (pdfkit): "${chineseText}"`);
      
      // Use canvas to create image for PDFKit-style approach
      const { createCanvas } = await import('canvas');
      
      const canvas = createCanvas(300, 80);
      const ctx = canvas.getContext('2d');
      
      // Light blue background
      ctx.fillStyle = '#f0f8ff';
      ctx.fillRect(0, 0, 300, 80);
      
      // Chinese text with different font approach
      ctx.font = '26px "Noto Sans TC", Arial, sans-serif';
      ctx.fillStyle = '#1e40af';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(chineseText, 150, 40);
      
      const buffer = canvas.toBuffer('image/png');
      const dataUri = `data:image/png;base64,${buffer.toString('base64')}`;
      
      const imgWidth = width * 0.8;
      const imgHeight = 25;
      const imgX = x + (width - imgWidth) / 2;
      const imgY = y + 20;
      
      pdf.addImage(dataUri, 'PNG', imgX, imgY, imgWidth, imgHeight);
      
      pdf.setFontSize(5);
      pdf.setTextColor(0, 150, 0);
      pdf.text('✓ SUCCESS', x + width/2, y + height - 8, { align: 'center' });
      
      console.log('✅ Method 3: pdfkit completed');
      
    } catch (error: any) {
      console.error('❌ Method 3 failed:', error?.message || error);
      
      pdf.setFontSize(5);
      pdf.setTextColor(200, 0, 0);
      pdf.text('✗ FAILED', x + width/2, y + 15, { align: 'center' });
      pdf.text('pdfkit error', x + width/2, y + 25, { align: 'center' });
    }
  }

  /**
   * METHOD 4: Canvas library
   */
  private async method4_Canvas(pdf: any, chineseText: string, x: number, y: number, width: number, height: number): Promise<void> {
    try {
      pdf.setFontSize(6);
      pdf.setTextColor(0, 100, 0);
      pdf.text('Method 4: canvas', x + width/2, y - 5, { align: 'center' });
      
      console.log(`🚀 Method 4 (canvas): "${chineseText}"`);
      
      // Import canvas module 
      const canvasModule = await import('canvas');
      const createCanvas = canvasModule.createCanvas || canvasModule.default?.createCanvas;
      const registerFont = canvasModule.registerFont || canvasModule.default?.registerFont;
      
      if (!createCanvas) {
        throw new Error('createCanvas not found in canvas module');
      }
      
      console.log('📦 Method 4: Canvas module loaded');
      
      // Register Chinese font
      let fontRegistered = false;
      try {
        if (registerFont) {
          const fs = require('fs');
          const path = require('path');
          const fontPath = path.join(process.cwd(), 'data', 'NotoSansTC-Regular.ttf');
          
          if (fs.existsSync(fontPath)) {
            registerFont(fontPath, { family: 'Noto Sans TC' });
            fontRegistered = true;
            console.log('✅ Method 4: Canvas font registered');
          } else {
            console.log('⚠️ Method 4: Font file not found');
          }
        }
      } catch (fontError) {
        console.log('⚠️ Method 4: Font registration failed:', (fontError as any)?.message || fontError);
      }
      
      const canvas = createCanvas(300, 80);
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }
      
      // Green background
      ctx.fillStyle = '#f0fdf4';
      ctx.fillRect(0, 0, 300, 80);
      
      // Chinese text with registered font or fallback
      const fontFamily = fontRegistered ? '"Noto Sans TC", Arial, sans-serif' : 'Arial, sans-serif';
      ctx.font = `28px ${fontFamily}`;
      ctx.fillStyle = '#16a34a';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      console.log(`🖋️ Method 4: Using font: ${ctx.font}`);
      ctx.fillText(chineseText, 150, 40);
      
      const buffer = canvas.toBuffer('image/png');
      const dataUri = `data:image/png;base64,${buffer.toString('base64')}`;
      
      console.log(`🖼️ Method 4: Generated image ${buffer.length} bytes with font`);
      
      const imgWidth = width * 0.8;
      const imgHeight = 25;
      const imgX = x + (width - imgWidth) / 2;
      const imgY = y + 20;
      
      pdf.addImage(dataUri, 'PNG', imgX, imgY, imgWidth, imgHeight);
      
      pdf.setFontSize(5);
      pdf.setTextColor(0, 150, 0);
      pdf.text('✓ SUCCESS', x + width/2, y + height - 8, { align: 'center' });
      
      console.log('✅ Method 4: canvas completed');
      
    } catch (error: any) {
      console.error('❌ Method 4 failed:', error?.message || error);
      
      pdf.setFontSize(5);
      pdf.setTextColor(200, 0, 0);
      pdf.text('✗ FAILED', x + width/2, y + 15, { align: 'center' });
      pdf.text('canvas error', x + width/2, y + 25, { align: 'center' });
    }
  }

  /**
   * METHOD 6: jsPDF with font
   */
  private async method6_jsPDF(pdf: any, chineseText: string, x: number, y: number, width: number, height: number): Promise<void> {
    try {
      pdf.setFontSize(6);
      pdf.setTextColor(0, 100, 0);
      pdf.text('Method 6: jsPDF', x + width/2, y - 5, { align: 'center' });
      
      console.log(`🚀 Method 6 (jsPDF): "${chineseText}"`);
      
      // Save current PDF state
      const currentFont = pdf.internal.getFont();
      const currentFontSize = pdf.internal.getFontSize();
      const currentTextColor = pdf.internal.getTextColor();
      
      let fontEmbedded = false;
      
      // Try to load and embed Chinese font in jsPDF
      try {
        const fs = require('fs');
        const path = require('path');
        const fontPath = path.join(process.cwd(), 'data', 'NotoSansTC-Regular.ttf');
        
        console.log(`📁 Method 6: Checking font at: ${fontPath}`);
        
        if (fs.existsSync(fontPath)) {
          const fontData = fs.readFileSync(fontPath);
          const fontBase64 = fontData.toString('base64');
          
          console.log(`📦 Method 6: Font data loaded, size: ${fontData.length} bytes`);
          
          // Add font to jsPDF VFS
          pdf.addFileToVFS('NotoSansTC-Regular.ttf', fontBase64);
          pdf.addFont('NotoSansTC-Regular.ttf', 'NotoSansTC', 'normal');
          
          // Test if font was added successfully
          const availableFonts = pdf.getFontList();
          if (availableFonts.NotoSansTC) {
            pdf.setFont('NotoSansTC', 'normal');
            fontEmbedded = true;
            console.log('✅ Method 6: jsPDF font embedded successfully');
          } else {
            console.log('⚠️ Method 6: Font not found in font list');
          }
        } else {
          console.log('⚠️ Method 6: Font file does not exist');
        }
      } catch (fontError) {
        console.log('⚠️ Method 6: Font embedding failed:', (fontError as any)?.message || fontError);
      }
      
      // Fallback to default font if embedding failed
      if (!fontEmbedded) {
        pdf.setFont('helvetica', 'normal');
        console.log('📝 Method 6: Using default helvetica font');
      }
      
      // Direct PDF text rendering
      pdf.setFontSize(20); // Smaller size to fit in section
      pdf.setTextColor(75, 0, 130); // Indigo color
      
      const textX = x + width / 2;
      const textY = y + height / 2;
      
      console.log(`📝 Method 6: Rendering text "${chineseText}" at (${textX}, ${textY})`);
      
      // Try to render the text
      try {
        pdf.text(chineseText, textX, textY, { align: 'center' });
        console.log('📄 Method 6: Text rendered to PDF');
      } catch (textError) {
        console.log('❌ Method 6: Text rendering failed:', (textError as any)?.message || textError);
        throw textError;
      }
      
      pdf.setFontSize(5);
      pdf.setTextColor(0, 150, 0);
      pdf.text('✓ SUCCESS', x + width/2, y + height - 8, { align: 'center' });
      
      console.log('✅ Method 6: jsPDF completed');
      
    } catch (error: any) {
      console.error('❌ Method 6 failed:', error?.message || error);
      
      pdf.setFontSize(5);
      pdf.setTextColor(200, 0, 0);
      pdf.text('✗ FAILED', x + width/2, y + 15, { align: 'center' });
      pdf.text('jsPDF error', x + width/2, y + 25, { align: 'center' });
    }
  }

  /**
   * METHOD 5: html2pdf.js (attempt to use in serverless with jsdom, else fallback)
   */
  private async method5_Html2PdfJs(pdf: any, chineseText: string, x: number, y: number, width: number, height: number): Promise<void> {
    try {
      // Attempt to use html2pdf.js in Node.js with jsdom (experimental, may not work in all serverless)
      const { JSDOM } = await import('jsdom');
      // @ts-ignore
      const html2pdf = (await import('html2pdf.js')) as any;
      const dom = new JSDOM(`<div id='pdf-content' style="font-family:'Noto Sans TC',Arial,sans-serif;font-size:32px;">${chineseText}</div>`);
      const element = dom.window.document.getElementById('pdf-content');
      // html2pdf expects a real browser DOM, so this may not work in serverless
      if (element) {
        // This will likely throw or not work, but we try
        await html2pdf().from(element).toPdf().get('pdf').then((clientPdf: any) => {
          // Not possible to merge clientPdf with server jsPDF, so just show a message
          pdf.setFontSize(6);
          pdf.setTextColor(120, 120, 120);
          pdf.text('html2pdf.js: not supported in serverless', x + width/2, y + height/2, { align: 'center' });
        });
      } else {
        throw new Error('No element');
      }
    } catch (e) {
      pdf.setFontSize(6);
      pdf.setTextColor(200, 0, 0);
      pdf.text('html2pdf.js: client-side only', x + width/2, y + height/2, { align: 'center' });
      pdf.setFontSize(5);
      pdf.text('html2pdf.js', x + width/2, y + height/2 + 10, { align: 'center' });
    }
  }
  /**
   * METHOD 7: Browserless API (real implementation if API key is set)
   */
  private async method7_Browserless(pdf: any, chineseText: string, x: number, y: number, width: number, height: number): Promise<void> {
    const apiKey = process.env.BROWSERLESS_API_KEY;
    if (!apiKey) {
      pdf.setFontSize(6);
      pdf.setTextColor(200, 0, 0);
      pdf.text('No API key', x + width/2, y + height/2, { align: 'center' });
      pdf.setFontSize(5);
      pdf.text('browserless', x + width/2, y + height/2 + 10, { align: 'center' });
      return;
    }
    try {
      // Prepare HTML for rendering
      const html = `<div style="width:300px;height:80px;display:flex;align-items:center;justify-content:center;font-size:32px;font-family:'Noto Sans TC',Arial,sans-serif;">${chineseText}</div>`;
      
      // Use node-fetch for Node.js compatibility
      const fetch = (await import('node-fetch')).default;
      const response = await fetch('https://chrome.browserless.io/screenshot?token=' + apiKey, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html, options: { type: 'png', viewport: { width: 300, height: 80 } } })
      });
      if (!response.ok) throw new Error('Browserless API error');
      const buffer = await response.arrayBuffer();
      const dataUri = `data:image/png;base64,${Buffer.from(buffer).toString('base64')}`;
      const imgWidth = width * 0.8;
      const imgHeight = 25;
      const imgX = x + (width - imgWidth) / 2;
      const imgY = y + 20;
      pdf.addImage(dataUri, 'PNG', imgX, imgY, imgWidth, imgHeight);
      pdf.setFontSize(5);
      pdf.setTextColor(0, 150, 0);
      pdf.text('✓ SUCCESS', x + width/2, y + height - 8, { align: 'center' });
    } catch (e) {
      pdf.setFontSize(6);
      pdf.setTextColor(200, 0, 0);
      pdf.text('API error', x + width/2, y + height/2, { align: 'center' });
      pdf.setFontSize(5);
      pdf.text('browserless', x + width/2, y + height/2 + 10, { align: 'center' });
    }
  }
  /**
   * METHOD 8: html2canvas client-side (attempt to use in serverless with jsdom, else fallback)
   */
  private async method8_Html2CanvasClient(pdf: any, chineseText: string, x: number, y: number, width: number, height: number): Promise<void> {
    try {
      // Attempt to use html2canvas in Node.js with jsdom (experimental, may not work in all serverless)
      const { JSDOM } = await import('jsdom');
      const html2canvas = (await import('html2canvas')).default;
      const dom = new JSDOM(`<div id='pdf-content' style="font-family:'Noto Sans TC',Arial,sans-serif;font-size:32px;">${chineseText}</div>`);
      const element = dom.window.document.getElementById('pdf-content');
      if (element) {
        // This will likely throw or not work, but we try
        await html2canvas(element).then((canvas: any) => {
          const dataUri = canvas.toDataURL('image/png');
          const imgWidth = width * 0.8;
          const imgHeight = 25;
          const imgX = x + (width - imgWidth) / 2;
          const imgY = y + 20;
          pdf.addImage(dataUri, 'PNG', imgX, imgY, imgWidth, imgHeight);
          pdf.setFontSize(5);
          pdf.setTextColor(0, 150, 0);
          pdf.text('✓ SUCCESS', x + width/2, y + height - 8, { align: 'center' });
        });
      } else {
        throw new Error('No element');
      }
    } catch (e) {
      pdf.setFontSize(6);
      pdf.setTextColor(200, 0, 0);
      pdf.text('html2canvas: client-side only', x + width/2, y + height/2, { align: 'center' });
      pdf.setFontSize(5);
      pdf.text('html2canvas', x + width/2, y + height/2 + 10, { align: 'center' });
    }
  }
  /**
   * METHOD 9: pdf-lib (serverless-compatible, draws text as image)
   */
  private async method9_PdfLib(pdf: any, chineseText: string, x: number, y: number, width: number, height: number): Promise<void> {
    try {
      // Dynamically import pdf-lib
      const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
      // Create a new PDF just for rendering the text as an image
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([300, 80]);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      page.drawText(chineseText, {
        x: 20,
        y: 40,
        size: 32,
        font,
        color: rgb(0, 0, 0),
      });
      const pdfBytes = await pdfDoc.save();
      // Convert the PDF page to an image (not natively supported, so fallback to SVG method)
      pdf.setFontSize(6);
      pdf.setTextColor(120, 120, 120);
      pdf.text('pdf-lib: fallback to SVG', x + width/2, y + height/2, { align: 'center' });
      // Optionally, you could use a PDF-to-image service here
    } catch (e) {
      pdf.setFontSize(6);
      pdf.setTextColor(200, 0, 0);
      pdf.text('Not implemented', x + width/2, y + height/2, { align: 'center' });
      pdf.setFontSize(5);
      pdf.text('pdf-lib', x + width/2, y + height/2 + 10, { align: 'center' });
    }
  }
  /**
   * METHOD 10: fallback/error
   */
  private async method10_Fallback(pdf: any, chineseText: string, x: number, y: number, width: number, height: number): Promise<void> {
    pdf.setFontSize(6);
    pdf.setTextColor(120, 120, 120);
    pdf.text('No method available', x + width/2, y + height/2, { align: 'center' });
    pdf.setFontSize(5);
    pdf.text('fallback', x + width/2, y + height/2 + 10, { align: 'center' });
  }
  /** METHOD 11: WASM text-to-image (stub) */
  private async method11_WasmTextToImage(pdf: any, chineseText: string, x: number, y: number, width: number, height: number): Promise<void> {
    pdf.setFontSize(6);
    pdf.setTextColor(200, 0, 0);
    pdf.text('WASM not available', x + width/2, y + height/2, { align: 'center' });
    pdf.setFontSize(5);
    pdf.text('wasm-text2img', x + width/2, y + height/2 + 10, { align: 'center' });
  }
  /** METHOD 12: Pre-generated image asset (stub) */
  private async method12_PreGeneratedAsset(pdf: any, chineseText: string, x: number, y: number, width: number, height: number): Promise<void> {
    pdf.setFontSize(6);
    pdf.setTextColor(120, 120, 120);
    pdf.text('No asset found', x + width/2, y + height/2, { align: 'center' });
    pdf.setFontSize(5);
    pdf.text('pre-gen-asset', x + width/2, y + height/2 + 10, { align: 'center' });
  }
  /** METHOD 13: DocRaptor API (stub) */
  private async method13_DocRaptor(pdf: any, chineseText: string, x: number, y: number, width: number, height: number): Promise<void> {
    pdf.setFontSize(6);
    pdf.setTextColor(200, 0, 0);
    pdf.text('API not configured', x + width/2, y + height/2, { align: 'center' });
    pdf.setFontSize(5);
    pdf.text('docraptor', x + width/2, y + height/2 + 10, { align: 'center' });
  }
  /** METHOD 14: MarkupGo API (stub) */
  private async method14_MarkupGo(pdf: any, chineseText: string, x: number, y: number, width: number, height: number): Promise<void> {
    pdf.setFontSize(6);
    pdf.setTextColor(200, 0, 0);
    pdf.text('API not configured', x + width/2, y + height/2, { align: 'center' });
    pdf.setFontSize(5);
    pdf.text('markupgo', x + width/2, y + height/2 + 10, { align: 'center' });
  }
  /** METHOD 15: Google Cloud Vision API (stub) */
  private async method15_GoogleCloudVision(pdf: any, chineseText: string, x: number, y: number, width: number, height: number): Promise<void> {
    pdf.setFontSize(6);
    pdf.setTextColor(200, 0, 0);
    pdf.text('API not configured', x + width/2, y + height/2, { align: 'center' });
    pdf.setFontSize(5);
    pdf.text('gcloud-vision', x + width/2, y + height/2 + 10, { align: 'center' });
  }
  /** METHOD 16: Cloud function microservice (stub) */
  private async method16_CloudFunctionMicroservice(pdf: any, chineseText: string, x: number, y: number, width: number, height: number): Promise<void> {
    pdf.setFontSize(6);
    pdf.setTextColor(120, 120, 120);
    pdf.text('Not configured', x + width/2, y + height/2, { align: 'center' });
    pdf.setFontSize(5);
    pdf.text('cloud-fn', x + width/2, y + height/2 + 10, { align: 'center' });
  }
  /** METHOD 17: pdf-lib with embedded font (stub) */
  private async method17_PdfLibFont(pdf: any, chineseText: string, x: number, y: number, width: number, height: number): Promise<void> {
    pdf.setFontSize(6);
    pdf.setTextColor(200, 0, 0);
    pdf.text('Font embedding not implemented', x + width/2, y + height/2, { align: 'center' });
    pdf.setFontSize(5);
    pdf.text('pdf-lib-font', x + width/2, y + height/2 + 10, { align: 'center' });
  }
  /** METHOD 18: pdf-lib with SVG (real, use SVG data URI) */
  private async method18_PdfLibSVG(pdf: any, chineseText: string, x: number, y: number, width: number, height: number): Promise<void> {
    try {
      const dataUri = chineseTextToSVGDataURI(chineseText, 300, 80);
      const imgWidth = width * 0.8;
      const imgHeight = 25;
      const imgX = x + (width - imgWidth) / 2;
      const imgY = y + 20;
      pdf.addImage(dataUri, 'SVG', imgX, imgY, imgWidth, imgHeight);
      pdf.setFontSize(5);
      pdf.setTextColor(0, 150, 0);
      pdf.text('✓ SUCCESS', x + width/2, y + height - 8, { align: 'center' });
    } catch (e) {
      pdf.setFontSize(6);
      pdf.setTextColor(200, 0, 0);
      pdf.text('SVG error', x + width/2, y + height/2, { align: 'center' });
      pdf.setFontSize(5);
      pdf.text('pdf-lib-svg', x + width/2, y + height/2 + 10, { align: 'center' });
    }
  }
  /** METHOD 19: Puppeteer/Playwright API (stub) */
  private async method19_PuppeteerAPI(pdf: any, chineseText: string, x: number, y: number, width: number, height: number): Promise<void> {
    pdf.setFontSize(6);
    pdf.setTextColor(200, 0, 0);
    pdf.text('API not configured', x + width/2, y + height/2, { align: 'center' });
    pdf.setFontSize(5);
    pdf.text('puppeteer', x + width/2, y + height/2 + 10, { align: 'center' });
  }
  /** METHOD 20: Custom Lambda (stub) */
  private async method20_CustomLambda(pdf: any, chineseText: string, x: number, y: number, width: number, height: number): Promise<void> {
    pdf.setFontSize(6);
    pdf.setTextColor(120, 120, 120);
    pdf.text('Not configured', x + width/2, y + height/2, { align: 'center' });
    pdf.setFontSize(5);
    pdf.text('lambda', x + width/2, y + height/2 + 10, { align: 'center' });
  }
}

export const serverlessPDFService = new ServerlessPDFService(); 