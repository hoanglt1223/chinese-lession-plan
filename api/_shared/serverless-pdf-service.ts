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
          "content-type": "application/json",
        },
        body: JSON.stringify({
          text,
          method,
          fontSize,
          fontFamily,
          fontWeight,
          width: fontSize * 5,
          height: fontSize * 1.2,
          backgroundColor: "#ffffff",
          textColor: "#000000",
          padding: 20,
          lineHeight: 1.5,
          textAlign: "center",
          quality: 90,
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
      
      // Create new PDF document (A4 landscape: 297 x 210 mm)
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
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
      // Use node-fetch to get the image
      const fetch = (await import("node-fetch")).default;
      const response = await fetch(imageUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const imageBuffer = Buffer.from(arrayBuffer);
      const contentType = response.headers.get("content-type") || "image/jpeg";
      
      // Convert to base64
      const base64Image = `data:${contentType};base64,${imageBuffer.toString(
        "base64"
      )}`;
      
      return base64Image;
    } catch (error) {
      console.error("Error fetching image:", error);
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
    const pageWidth = 297; // A4 landscape width in mm
    const pageHeight = 210; // A4 landscape height in mm
    
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
    const pageWidth = 297; // A4 landscape width in mm
    const pageHeight = 210; // A4 landscape height in mm
    
    // Add template as background image (landscape orientation)
    pdf.addImage(templateImage, "JPEG", 0, 0, pageWidth, pageHeight);

    console.log(
      `🚀 Generating flashcard back for: "${card.word}" with pinyin: "${card.pinyin}"`
    );
    console.log(
      `🔥 NEW VERSION: Using 4-column Chinese API layout (removed PNG method)`
    );

    try {
      // 4-column layout to test 2 methods for both Chinese and Pinyin
      const colWidth = pageWidth / 4;
      const colHeight = pageHeight * 0.6;
    const startY = 30;

      console.log(
        `🧪 Testing all methods for: Chinese="${card.word}" Pinyin="${card.pinyin}"`
      );

             // Make all 6 API calls in parallel for maximum performance
       console.log(`⚡ Starting 4 parallel API calls...`);
       const apiCallsStartTime = Date.now();

       const [
         chineseUltimate,
         chineseTextToImage, 
         pinyinUltimate,
         pinyinTextToImage
       ] = await Promise.all([
         // CHINESE TEXT - 2 methods (columns 1-2) - using AaBiMoHengZiZhenBaoKaiShu 200px
         callChineseTextAPI(card.word || "朋友", "ultimate-text-to-image", 200, "900", "AaBiMoHengZiZhenBaoKaiShu"),
         callChineseTextAPI(card.word || "朋友", "text-to-image", 200, "900", "AaBiMoHengZiZhenBaoKaiShu"),
         
         // PINYIN TEXT - 2 methods (columns 3-4) - using Montserrat 50px
         callChineseTextAPI(card.pinyin || "péngyǒu", "ultimate-text-to-image", 50, "500", "Montserrat"),
         callChineseTextAPI(card.pinyin || "péngyǒu", "text-to-image", 50, "500", "Montserrat")
       ]);

       const apiCallsEndTime = Date.now();
       console.log(`⚡ Completed 4 parallel API calls in ${apiCallsEndTime - apiCallsStartTime}ms`);
       
       // Debug: Check which calls succeeded/failed
       console.log(`🔍 API Results - Chinese Ultimate: ${chineseUltimate?.length || 'FAILED'}, Text-to-Image: ${chineseTextToImage?.length || 'FAILED'}`);
       console.log(`🔍 API Results - Pinyin Ultimate: ${pinyinUltimate?.length || 'FAILED'}, Text-to-Image: ${pinyinTextToImage?.length || 'FAILED'}`);

      // Display all 4 columns with proper sizing for readable text
      const imageWidth = colWidth * 0.9;
      const imageHeight = 80;
      const imageY = startY + 20;

              // Helper function to safely add image to PDF
        const safeAddImage = (imageData: string, label: string, colIndex: number) => {
          try {
            if (!imageData || imageData.length < 50) {
              console.log(`⚠️ Skipping ${label}: Invalid image data`);
              return;
            }
            
            // Check if it's SVG data - jsPDF doesn't support SVG natively
            if (imageData.startsWith('data:image/svg')) {
              console.log(`⚠️ Skipping ${label}: SVG format not supported by jsPDF`);
              return;
            }
            
            // Use PNG format for all non-SVG images
            const format = 'PNG';
            
            pdf.addImage(
              imageData,
              format,
              colIndex * colWidth + (colWidth - imageWidth) / 2,
              imageY,
              imageWidth,
              imageHeight
            );
            console.log(`✅ Added ${label} to PDF (${format})`);
          } catch (error) {
            console.error(`❌ Failed to add ${label} to PDF:`, error);
          }
        };

      // Add all 4 columns safely (only working methods)
      safeAddImage(chineseUltimate, "Chinese Ultimate", 0);
      safeAddImage(chineseTextToImage, "Chinese Text-to-Image", 1);
      safeAddImage(pinyinUltimate, "Pinyin Ultimate", 2);
      safeAddImage(pinyinTextToImage, "Pinyin Text-to-Image", 3);

      // Add column divider lines
      pdf.setDrawColor(180, 180, 180);
      pdf.setLineWidth(0.3);
      for (let i = 1; i < 4; i++) {
        const x = i * colWidth;
        pdf.line(x, startY + 20, x, imageY + imageHeight + 25);
      }

      // Add section titles at top
      pdf.setFontSize(10);
      pdf.setTextColor(60, 60, 60);
      pdf.text("CHINESE CHARACTERS", pageWidth / 4, startY + 10, {
        align: "center",
      });
      pdf.text("PINYIN", (pageWidth * 3) / 4, startY + 10, { align: "center" });

      // Add method labels at bottom
      pdf.setFontSize(7);
      pdf.setTextColor(120, 120, 120);
      const labels = [
        "Ultimate",
        "Text-to-Image",
        "Ultimate",
        "Text-to-Image",
      ];

      for (let i = 0; i < labels.length; i++) {
        const x = i * colWidth + colWidth / 2;
        const y = imageY + imageHeight + 10;
        pdf.text(labels[i], x, y, { align: "center" });
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

      if (card.vietnamese) {
        pdf.setFontSize(14);
        pdf.setTextColor(0, 0, 0);
        pdf.text(card.vietnamese, pageWidth / 2, pageHeight / 2 + 20, {
          align: "center",
        });
      }
    }
  }

  // All old method implementations removed - now using external API only
  // See generateCardBackWithTemplate() for the simplified implementation
}

export const serverlessPDFService = new ServerlessPDFService(); 
