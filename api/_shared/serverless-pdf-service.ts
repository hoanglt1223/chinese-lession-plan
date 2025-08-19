import path from "path";
import fs from "fs/promises";

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
  method: "svg" | "text-to-image" | "ultimate-text-to-image" | "png" = "ultimate-text-to-image",
  fontSize: number = 48,
  fontWeight:
    | "100"
    | "200"
    | "300"
    | "400"
    | "500"
    | "600"
    | "700"
    | "800"
    | "900"
    | "normal"
    | "bold" = "700",
  fontFamily: string = "AaBiMoHengZiZhenBaoKaiShu"
): Promise<string> {
  try {
    const response = await fetch(
      "https://booking.hoangha.shop/api/convert-chinese-text",
      {
        method: "POST",
        headers: {
          "accept": "*/*",
          "accept-language": "en,vi;q=0.9",
          "content-type": "application/json", 
          "dnt": "1",
          "origin": "https://booking.hoangha.shop",
          "priority": "u=1, i",
          "referer": "https://booking.hoangha.shop/chinese-converter",
          "sec-ch-ua": '"Not;A=Brand";v="99", "Google Chrome";v="139", "Chromium";v="139"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"Windows"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36"
        },
        body: JSON.stringify({
          text,
          method,
          fontSize,
          fontFamily,
          fontWeight,
          width: 800,
          height: 240,
          backgroundColor: "#ffffff",
          textColor: "#000000",
          padding: 0,
          lineHeight: 1.5,
          textAlign: "center",
          quality: 100,
        }),
      }
    );

    if (!response.ok) {
      // Try to get error message from JSON response like frontend code
      let errorMessage = `API request failed: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch {
        // If not JSON, use status text or default message
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    // Handle response based on content type like frontend code
    const contentType = response.headers.get("content-type") || "image/png";
    
    if (contentType.includes('application/json')) {
      // Handle JSON responses (errors or special cases)
      const jsonData = await response.json();
      throw new Error(jsonData.message || 'Unexpected JSON response from image API');
    } else {
      // Handle binary file responses (images)
      const arrayBuffer = await response.arrayBuffer();
      const imageBuffer = Buffer.from(arrayBuffer);
      
      // Convert to data URI
      const base64 = imageBuffer.toString("base64");
      return `data:${contentType};base64,${base64}`;
    }
    } catch (error) {
    console.error(`🚨 Chinese text API call failed for "${text}" (${method}):`, error);
    throw error; // Re-throw the error without fallback
  }
}

export class ServerlessPDFService {
  private templateFrontPath: string;
  private templateBackPath: string;

  constructor() {
    // Paths to the flashcard template images
    // In Vercel serverless environment, files from client/public/ are available in the root
    this.templateFrontPath = path.join(
      process.cwd(),
      "client/public/templates",
      "flashcard-front.png"
    );
    this.templateBackPath = path.join(
      process.cwd(),
      "client/public/templates",
      "flashcard-back.png"
    );
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
      fontWeight?:
        | "100"
        | "200"
        | "300"
        | "400"
        | "500"
        | "600"
        | "700"
        | "800"
        | "900"
        | "normal"
        | "bold";
    }
  ): Promise<{
    buffer: Buffer;
    dataUri: string;
    contentType: "image/png";
    width: number;
    height: number;
  }> {
    const width = opts?.width ?? 600;
    const height = opts?.height ?? 180;

    try {
             // Use simplified external API for Chinese text rendering
       const svgDataUri = await callChineseTextAPI(
         text,
         "png",
         opts?.fontSize || 48,
         opts?.fontWeight || "400",
         "AaBiMoHengZiZhenBaoKaiShu"
       );

      // The API already returns binary image data as data URI, no need to convert
      // Extract buffer from data URI for compatibility
      const base64Data = svgDataUri.split(",")[1];
      const buffer = Buffer.from(base64Data, "base64");
      return {
        buffer,
        dataUri: svgDataUri,
        contentType: "image/png",
        width,
        height,
      };
    } catch (error) {
      console.error("External API failed:", error);
      throw error; // Re-throw the error without fallback
    }
  }

  /**
   * Public: Generate a simple PDF where each page shows one Chinese text centered as an image.
   */
  public async generateChineseTextPDF(
    texts: string[] | string,
    opts?: {
      orientation?: "portrait" | "landscape";
      unit?: "mm" | "pt";
      format?: "a4" | "letter";
      margin?: number;
    }
  ): Promise<Buffer> {
    const list = Array.isArray(texts) ? texts : [texts];
    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF({
      orientation: opts?.orientation ?? "portrait",
      unit: opts?.unit ?? "mm",
      format: opts?.format ?? "a4",
    });

    const pageWidth = (pdf as any).internal.pageSize.getWidth();
    const pageHeight = (pdf as any).internal.pageSize.getHeight();
    const margin = opts?.margin ?? 20;

    let first = true;
    for (const t of list) {
      if (!first) pdf.addPage();
      first = false;
      try {
        const { dataUri } = await this.generateChineseTextImage(t, {
          width: 1200,
          height: 360,
        });
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
        pdf.addImage(dataUri, "PNG", x, y, w, h);
      } catch (e) {
        pdf.setTextColor(200, 0, 0);
        pdf.setFontSize(12);
        pdf.text("Failed to render text", pageWidth / 2, pageHeight / 2, {
          align: "center",
        });
      }
    }

    const uint8Array = pdf.output("arraybuffer");
    const pdfBuffer = Buffer.from(uint8Array);
    return pdfBuffer;
  }

  /**
   * Load template image and convert to base64 data URL (no caching)
   */
  private async loadTemplateImage(
    templateType: "front" | "back"
  ): Promise<string> {
    try {
      const templatePath =
        templateType === "front"
          ? this.templateFrontPath
          : this.templateBackPath;

      // Try to read the image file
      const imageBuffer = await fs.readFile(templatePath);
      
      // Convert to base64 data URL
      const base64Image = `data:image/png;base64,${imageBuffer.toString(
        "base64"
      )}`;
      
      return base64Image;
    } catch (error) {
      console.error(
        `Error loading ${templateType} template from ${
          templateType === "front"
            ? this.templateFrontPath
            : this.templateBackPath
        }:`,
        error
      );
      
      // Return a simple fallback base64 image (1x1 transparent PNG)
      const fallbackImage =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
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
    console.log(
      `🚀 Starting fresh PDF generation at ${new Date().toISOString()} [Session: ${sessionId}]`
    );
    console.log(
      `📊 Testing ${
        options.flashcards.length
      } flashcards with ${10} different Chinese rendering methods`
    );
    try {
      // Load template images
      const frontTemplateImage = await this.loadTemplateImage("front");
      const backTemplateImage = await this.loadTemplateImage("back");
      
      // Use jsPDF for efficient PDF generation with template background
      const { jsPDF } = await import("jspdf");
      
      // Create new PDF document (A4 at reasonable resolution)
      const pdf = new jsPDF({
        orientation: "landscape", 
        unit: "px",
        format: [1754, 1240], // Reasonable high resolution without breaking rendering
      });

      // Set Chinese language support
      try {
        pdf.setLanguage("zh-CN");
        console.log("✅ Set PDF language to Chinese (zh-CN)");
      } catch (langError) {
        console.warn("Could not set Chinese language:", langError);
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
          
          await this.generateCardFrontWithTemplate(
            pdf,
            card,
            i + 1,
            frontTemplateImage
          );
          isFirstPage = false;

          // Add back page
          pdf.addPage();
          await this.generateCardBackWithTemplate(
            pdf,
            card,
            i + 1,
            backTemplateImage
          );
        } catch (cardError) {
          console.error(
            `❌ Error processing flashcard ${i + 1} (${card.word}):`,
            cardError instanceof Error ? cardError.message : String(cardError)
          );
          
          // Add a fallback page to prevent completely broken PDF
          try {
            if (isFirstPage) {
              // We need at least one page for a valid PDF
              isFirstPage = false;
            } else {
              pdf.addPage();
            }
            
            // Add error page with basic template
            pdf.addImage(frontTemplateImage, "JPEG", 0, 0, 297, 210);
            pdf.setFontSize(24);
            pdf.setTextColor(255, 0, 0); // Red text
            pdf.text("Error generating card", 297 / 2, 210 / 2, {
              align: "center",
            });
            pdf.setFontSize(16);
            pdf.setTextColor(0, 0, 0); // Black text
            pdf.text(`Card: ${card.word}`, 297 / 2, 210 / 2 + 20, {
              align: "center",
            });
          } catch (fallbackError) {
            console.error(
              `Failed to add error page for card ${i + 1}:`,
              fallbackError
            );
          }
        }
      }

      // First, validate that we have pages
      const pageCount = pdf.getNumberOfPages();
      if (pageCount === 0) {
        throw new Error("PDF has no pages");
      }
      
      // Generate PDF data - try different output methods for better compatibility
      let pdfBuffer: Buffer;
      try {
        // Method 1: Try uint8array first (more reliable)
        const uint8Array = pdf.output("arraybuffer");
        pdfBuffer = Buffer.from(uint8Array);
      } catch (bufferError) {
        console.warn(
          "ArrayBuffer method failed, trying string method:",
          bufferError
        );
        // Method 2: Fallback to string method
        const pdfString = pdf.output("datauristring");
        const base64Data = pdfString.split(",")[1];
        if (!base64Data) {
          throw new Error("Failed to extract base64 data from PDF");
        }
        pdfBuffer = Buffer.from(base64Data, "base64");
      }
      
      // Validate the PDF buffer
      if (!pdfBuffer || pdfBuffer.length === 0) {
        throw new Error("Generated PDF buffer is empty");
      }
      
      // Check if buffer starts with PDF header
      const pdfHeader = pdfBuffer.slice(0, 4).toString();
      if (pdfHeader !== "%PDF") {
        console.error("Invalid PDF header:", pdfHeader);
        throw new Error(
          `Invalid PDF header: expected '%PDF', got '${pdfHeader}'`
        );
      }
      
      const endTime = Date.now();
      console.log(
        `✅ Fresh PDF generation completed in ${
          endTime - startTime
        }ms at ${new Date().toISOString()} [Session: ${sessionId}]`
      );
      console.log(`📦 Generated PDF size: ${pdfBuffer.length} bytes`);
      console.log(
        `🔍 Canvas availability caching: DISABLED (ensures fresh testing)`
      );
      
      return pdfBuffer;
    } catch (error) {
      console.error("Error generating flashcard PDF:", error);
      throw new Error(
        `Failed to generate flashcard PDF: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Fetch image and convert to base64 for PDF embedding
   */
  private async fetchImageAsBase64(imageUrl: string): Promise<string> {
    try {
      console.log(`🖼️  Fetching high-quality image: ${imageUrl.substring(0, 100)}...`);
      
      // Use node-fetch to get the image with enhanced headers for better quality
      const fetch = (await import("node-fetch")).default;
      const response = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'image/*, */*',
          'Accept-Encoding': 'gzip, deflate, br',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const imageBuffer = Buffer.from(arrayBuffer);
      
      // Log image quality information
      const sizeKB = Math.round(imageBuffer.length / 1024);
      console.log(`📏 Image downloaded: ${sizeKB}KB`);
      
      const contentType = response.headers.get("content-type") || "image/jpeg";
      console.log(`🎨 Image type: ${contentType}`);
      
      // Special handling for SVG content
      if (contentType.includes('svg') || imageUrl.includes('.svg')) {
        console.log(`🎯 Processing SVG image for optimal PDF quality`);
        
        // For SVG, we can also try to convert it to a high-resolution PNG for better PDF compatibility
        // For now, return as-is since jsPDF can handle SVG in some cases
        const base64Image = `data:${contentType};base64,${imageBuffer.toString("base64")}`;
        console.log(`✅ SVG image processed - vector quality maintained`);
        return base64Image;
      }
      
      // Convert to base64
      const base64Image = `data:${contentType};base64,${imageBuffer.toString(
        "base64"
      )}`;
      
      return base64Image;
    } catch (error) {
      console.error(`❌ Failed to fetch image from ${imageUrl}:`, error);
      throw error;
    }
  }

  /**
   * Generate front side using template background
   */
  private async generateCardFrontWithTemplate(
    pdf: any,
    card: FlashcardData,
    cardNumber: number,
    templateImage: string
  ): Promise<void> {
    const pageWidth = 1754; // Updated high resolution width
    const pageHeight = 1240; // Updated high resolution height
    
    // Add template as background image (landscape orientation)
    pdf.addImage(templateImage, "JPEG", 0, 0, pageWidth, pageHeight);
    
    // Set up Chinese font support (using built-in fonts with fallback)
    try {
      // Try to set a font that supports Chinese characters
      pdf.setFont("helvetica");
    } catch (error) {
      console.warn("Font setting failed, using default:", error);
    }

    // Add actual image or placeholder centered at 70% of page size
    if (
      card.imageUrl &&
      !card.imageUrl.includes("placeholder") &&
      !card.imageUrl.includes("via.placeholder")
    ) {
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
        pdf.addImage(
          base64Image,
          "JPEG",
          imageX,
          imageY,
          imageWidth,
          imageHeight
        );
      } catch (error) {
        console.error(`❌ Failed to add image for "${card.word}":`, error);
        // Fallback to placeholder text if image fails
        pdf.setFontSize(12);
        pdf.setTextColor(200, 100, 100); // Light red text
        pdf.text("Image failed to load", pageWidth / 2, pageHeight / 2, {
          align: "center",
        });
        pdf.setFontSize(10);
        pdf.setTextColor(150, 150, 150); // Gray text
        pdf.text(
          `URL: ${card.imageUrl?.substring(0, 50)}...`,
          pageWidth / 2,
          pageHeight / 2 + 15,
          { align: "center" }
        );
      }
    } else {
      // Show placeholder when no image URL provided
      pdf.setFontSize(12);
      pdf.setTextColor(120, 120, 120); // Gray text
      pdf.text("No image available", pageWidth / 2, pageHeight / 2, {
        align: "center",
      });
      
      if (card.imageUrl) {
        pdf.setFontSize(8);
        pdf.text(
          `(Placeholder URL detected)`,
          pageWidth / 2,
          pageHeight / 2 + 15,
          { align: "center" }
        );
      }
    }
  }

  /**
   * Generate back side using template background - Simplified version using external API
   */
  private async generateCardBackWithTemplate(
    pdf: any,
    card: FlashcardData,
    cardNumber: number,
    templateImage: string
  ): Promise<void> {
    const pageWidth = 1754; // Updated high resolution width
    const pageHeight = 1240; // Updated high resolution height
    
    // Add template as background image (landscape orientation)
    pdf.addImage(templateImage, "JPEG", 0, 0, pageWidth, pageHeight);

    console.log(
      `🚀 Generating flashcard back for: "${card.word}" with pinyin: "${card.pinyin}"`
    );
        console.log(
      `🔥 NEW VERSION: Using centered ultimate-text-to-image layout with transparent background, no border`
    );

    try {
      console.log(
        `🧪 Generating centered layout for: Chinese="${card.word}" Pinyin="${card.pinyin}"`
      );

      // Make only 2 API calls for text-to-image method with transparent background
      console.log(`⚡ Starting 2 parallel API calls...`);
      const apiCallsStartTime = Date.now();

      const [
        chineseTextImage,
        pinyinTextImage
      ] = await Promise.all([
        // CHINESE TEXT - ultimate-text-to-image for better quality, no border
        callChineseTextAPI(card.word || "朋友", "ultimate-text-to-image", 200, "bold", "AaBiMoHengZiZhenBaoKaiShu"),
        
        // PINYIN TEXT - ultimate-text-to-image for better quality, no border
        callChineseTextAPI(card.pinyin || "péngyǒu", "ultimate-text-to-image", 50, "300", "Montserrat")
      ]);

      const apiCallsEndTime = Date.now();
      console.log(`⚡ Completed 2 parallel API calls in ${apiCallsEndTime - apiCallsStartTime}ms`);
      
      // Debug: Check which calls succeeded/failed
      console.log(`🔍 API Results - Chinese: ${chineseTextImage?.length || 'FAILED'}, Pinyin: ${pinyinTextImage?.length || 'FAILED'}`);

      // CALCULATE ALL IMAGE DIMENSIONS FIRST TO PREVENT OVERLAP
      let chineseImageWidth = 0, chineseImageHeight = 0;
      let pinyinImageWidth = 0, pinyinImageHeight = 0;
      
      // Calculate Chinese dimensions
      if (chineseTextImage && chineseTextImage.length > 50) {
        try {
          const chineseImageProps = pdf.getImageProperties(chineseTextImage);
          if (!chineseImageProps.width || !chineseImageProps.height || chineseImageProps.width <= 0 || chineseImageProps.height <= 0) {
            throw new Error(`Invalid Chinese image properties: ${chineseImageProps.width}x${chineseImageProps.height}`);
          }
          
          const originalAspectRatio = chineseImageProps.width / chineseImageProps.height;
          console.log(`📏 Chinese DYNAMIC sizing - actual API response: ${chineseImageProps.width}x${chineseImageProps.height} (aspect ratio: ${originalAspectRatio.toFixed(3)}:1)`);
          
          const maxWidth = pageWidth * 0.8; // Max 80% of page width for larger text
          const maxHeight = pageHeight * 0.4; // Max 40% of page height for larger text
          
          const scaleX = maxWidth / chineseImageProps.width;
          const scaleY = maxHeight / chineseImageProps.height;
          const scale = Math.min(scaleX, scaleY);
          
          chineseImageWidth = chineseImageProps.width * scale;
          chineseImageHeight = chineseImageProps.height * scale;
          
          console.log(`📐 Chinese SCALED dimensions: ${Math.round(chineseImageWidth)}x${Math.round(chineseImageHeight)} (scale: ${scale.toFixed(3)})`);
        } catch (error) {
          console.error(`❌ Failed to calculate Chinese dimensions:`, error);
        }
      }
      
      // Calculate Pinyin dimensions
      if (pinyinTextImage && pinyinTextImage.length > 50) {
        try {
          const pinyinImageProps = pdf.getImageProperties(pinyinTextImage);
          if (!pinyinImageProps.width || !pinyinImageProps.height || pinyinImageProps.width <= 0 || pinyinImageProps.height <= 0) {
            throw new Error(`Invalid Pinyin image properties: ${pinyinImageProps.width}x${pinyinImageProps.height}`);
          }
          
          const originalAspectRatio = pinyinImageProps.width / pinyinImageProps.height;
          console.log(`📏 Pinyin DYNAMIC sizing - actual API response: ${pinyinImageProps.width}x${pinyinImageProps.height} (aspect ratio: ${originalAspectRatio.toFixed(3)}:1)`);
          
          const maxWidth = pageWidth * 0.9; // Max 90% of page width for full display
          const maxHeight = pageHeight * 0.25; // Max 25% of page height for larger pinyin
          
          const scaleX = maxWidth / pinyinImageProps.width;
          const scaleY = maxHeight / pinyinImageProps.height;
          const scale = Math.min(scaleX, scaleY);
          
          pinyinImageWidth = pinyinImageProps.width * scale;
          pinyinImageHeight = pinyinImageProps.height * scale;
          
          console.log(`📐 Pinyin SCALED dimensions: ${Math.round(pinyinImageWidth)}x${Math.round(pinyinImageHeight)} (scale: ${scale.toFixed(3)})`);
        } catch (error) {
          console.error(`❌ Failed to calculate Pinyin dimensions:`, error);
        }
      }
      
      // NOW CALCULATE DYNAMIC POSITIONING TO PREVENT OVERLAP
      const gap = 20; // 20px gap between Chinese and Pinyin
      const totalContentHeight = chineseImageHeight + pinyinImageHeight + gap;
      const startY = (pageHeight - totalContentHeight) / 2; // Center the combined content
      
      console.log(`🎯 ANTI-OVERLAP POSITIONING:
      - Chinese height: ${Math.round(chineseImageHeight)}px
      - Pinyin height: ${Math.round(pinyinImageHeight)}px  
      - Gap: ${gap}px
      - Total content: ${Math.round(totalContentHeight)}px
      - Start Y: ${Math.round(startY)}px`);
      
      // Add Chinese characters with calculated position
      if (chineseTextImage && chineseTextImage.length > 50 && chineseImageWidth > 0) {
        try {
          const chineseX = (pageWidth - chineseImageWidth) / 2;
          const chineseY = startY;

          pdf.addImage(
            chineseTextImage,
            "PNG",
            chineseX,
            chineseY,
            chineseImageWidth,
            chineseImageHeight
          );
          console.log(`✅ Added Chinese at (${Math.round(chineseX)}, ${Math.round(chineseY)}) size ${Math.round(chineseImageWidth)}x${Math.round(chineseImageHeight)}`);
        } catch (error) {
          console.error(`❌ Failed to add Chinese characters:`, error);
        }
      }

      // Add Pinyin below Chinese with calculated position (NO OVERLAP!)
      if (pinyinTextImage && pinyinTextImage.length > 50 && pinyinImageWidth > 0) {
        try {
          const pinyinX = (pageWidth - pinyinImageWidth) / 2;
          const pinyinY = startY + chineseImageHeight + gap; // Position directly below Chinese + gap

          pdf.addImage(
            pinyinTextImage,
            "PNG",
            pinyinX,
            pinyinY,
            pinyinImageWidth,
            pinyinImageHeight
          );
          console.log(`✅ Added Pinyin at (${Math.round(pinyinX)}, ${Math.round(pinyinY)}) size ${Math.round(pinyinImageWidth)}x${Math.round(pinyinImageHeight)}`);
        } catch (error) {
          console.error(`❌ Failed to add Pinyin:`, error);
        }
      }

      console.log(`✅ Successfully generated flashcard back for: ${card.word}`);
    } catch (error) {
      console.error(
        `❌ Failed to generate flashcard back for: ${card.word}`,
        error
      );

      // Fallback: Simple text rendering
      pdf.setFontSize(24);
      pdf.setTextColor(0, 0, 0);
      pdf.text(card.word || "朋友", pageWidth / 2, pageHeight / 2 - 20, {
        align: "center",
      });

      pdf.setFontSize(16);
      pdf.setTextColor(100, 100, 100);
      pdf.text(card.pinyin || "péngyǒu", pageWidth / 2, pageHeight / 2, {
        align: "center",
      });
    }
  }

  // All old method implementations removed - now using external API only
  // See generateCardBackWithTemplate() for the simplified implementation
}

export const serverlessPDFService = new ServerlessPDFService(); 
