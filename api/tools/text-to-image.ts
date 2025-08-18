import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text, library, style, options } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Text is required' });
    }

    console.log(`🎨 Text-to-Image Request:`, {
      text: text.substring(0, 50),
      library,
      style,
      options
    });

    let imageBuffer: Buffer;
    let mimeType = 'image/png';

    // Generate image based on selected library
    if (library === 'ultimate') {
      imageBuffer = await generateWithUltimate(text, style, options);
    } else if (library === 'text-to-image') {
      imageBuffer = await generateWithTextToImage(text, style, options);
    } else {
      return res.status(400).json({ error: 'Invalid library specified' });
    }

    // Convert to base64 data URL
    const base64Image = imageBuffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64Image}`;

    console.log(`✅ Text-to-Image Success: Generated ${imageBuffer.length} bytes`);

    return res.status(200).json({
      success: true,
      imageUrl: dataUrl,
      library,
      style,
      size: imageBuffer.length
    });

  } catch (error: any) {
    console.error('❌ Text-to-Image Error:', error);
    return res.status(500).json({ 
      error: 'Failed to generate text image',
      details: error.message
    });
  }
}

async function generateWithUltimate(text: string, style: string, options: any): Promise<Buffer> {
  try {
    // Import ultimate-text-to-image
    const { UltimateTextToImage, registerFont } = await import('ultimate-text-to-image');

    // Register Chinese font if available
    try {
      const path = require('path');
      const fs = require('fs');
      const fontPath = path.join(process.cwd(), 'data', 'NotoSansTC-Regular.ttf');
      
      // Check if font file exists
      if (fs.existsSync(fontPath)) {
        // Register the font with a specific family name
        registerFont(fontPath, { family: 'Noto Sans TC' });
        console.log('✅ Ultimate: Noto Sans TC font registered successfully');
      } else {
        console.log('⚠️ Ultimate: Font file not found at', fontPath);
      }
    } catch (fontError) {
      console.log('⚠️ Ultimate: Font registration failed:', (fontError as Error).message);
      console.log('⚠️ Ultimate: Using system fonts');
    }

    // Style configurations
    const styleConfigs = {
      default: {
        fontFamily: "Noto Sans TC, Arial, sans-serif",
        fontColor: options.fontColor || "#000000",
        backgroundColor: options.backgroundColor || "#ffffff",
        fontSize: undefined as number | undefined,
        fontWeight: undefined as string | undefined
      },
      bold: {
        fontFamily: "Noto Sans TC, Arial, sans-serif",
        fontWeight: "bold" as const,
        fontColor: "#2563eb",
        backgroundColor: "#f8fafc",
        fontSize: undefined as number | undefined
      },
      colorful: {
        fontFamily: "Noto Sans TC, Arial, sans-serif",
        fontColor: "#dc2626",
        backgroundColor: "#fef2f2",
        fontSize: undefined as number | undefined,
        fontWeight: undefined as string | undefined
      },
      minimal: {
        fontFamily: "Noto Sans TC, Arial, sans-serif",
        fontColor: "#374151",
        backgroundColor: "#ffffff",
        fontSize: undefined as number | undefined,
        fontWeight: undefined as string | undefined
      }
    };

    const config = styleConfigs[style as keyof typeof styleConfigs] || styleConfigs.default;

    // Create text-to-image instance
    const textToImage = new UltimateTextToImage(text, {
      width: options.width || 400,
      height: options.height || 200,
      fontSize: config.fontSize || options.fontSize || 24,
      fontFamily: config.fontFamily,
      fontColor: config.fontColor,
      backgroundColor: config.backgroundColor,
      align: "center",
      valign: "middle",
      margin: 20
    });

    const canvas = textToImage.render();
    return canvas.toBuffer('image/png');

  } catch (error) {
    console.error('Ultimate generation failed:', error);
    throw new Error(`Ultimate text-to-image failed: ${(error as any)?.message}`);
  }
}

async function generateWithTextToImage(text: string, style: string, options: any): Promise<Buffer> {
  try {
    // Import text-to-image
    const textToImageModule = await import('text-to-image');
    const generate = textToImageModule.generate || textToImageModule.default?.generate || textToImageModule.default;

    if (!generate) {
      throw new Error('text-to-image generate function not found');
    }

    // Style configurations with Chinese font support
    const chineseFontFamily = 'Noto Sans TC, SimSun, Microsoft YaHei, Arial Unicode MS, Arial, sans-serif';
    const styleConfigs = {
      default: {
        fontFamily: chineseFontFamily,
        textColor: options.fontColor || '#000000',
        bgColor: options.backgroundColor || '#ffffff',
        fontSize: undefined as number | undefined,
        fontWeight: undefined as string | undefined
      },
      bold: {
        fontFamily: chineseFontFamily,
        fontWeight: 'bold' as const,
        textColor: '#2563eb',
        bgColor: '#f8fafc',
        fontSize: undefined as number | undefined
      },
      colorful: {
        fontFamily: chineseFontFamily,
        textColor: '#dc2626',
        bgColor: '#fef2f2',
        fontSize: undefined as number | undefined,
        fontWeight: undefined as string | undefined
      },
      minimal: {
        fontFamily: chineseFontFamily,
        textColor: '#374151',
        bgColor: '#ffffff',
        fontSize: undefined as number | undefined,
        fontWeight: undefined as string | undefined
      }
    };

    const config = styleConfigs[style as keyof typeof styleConfigs] || styleConfigs.default;

    // Generate image
    const dataUri = await generate(text, {
      maxWidth: options.width || 400,
      fontSize: config.fontSize || options.fontSize || 24,
      fontFamily: config.fontFamily,
      fontWeight: config.fontWeight || 'normal',
      lineHeight: Math.ceil((config.fontSize || options.fontSize || 24) * 1.2),
      margin: 20,
      bgColor: config.bgColor,
      textColor: config.textColor,
      textAlign: 'center' as const
    });

    // Convert data URI to buffer
    if (!dataUri || !dataUri.startsWith('data:')) {
      throw new Error('Invalid data URI returned');
    }

    const base64Data = dataUri.split(',')[1];
    return Buffer.from(base64Data, 'base64');

  } catch (error) {
    console.error('Text-to-image generation failed:', error);
    // Try fallback with Canvas for Chinese characters
    return await generateWithCanvas(text, style, options);
  }
}

async function generateWithCanvas(text: string, style: string, options: any): Promise<Buffer> {
  try {
    const { createCanvas, registerFont } = await import('canvas');
    
    // Register Chinese font for Canvas
    try {
      const path = require('path');
      const fs = require('fs');
      const fontPath = path.join(process.cwd(), 'data', 'NotoSansTC-Regular.ttf');
      
      if (fs.existsSync(fontPath)) {
        registerFont(fontPath, { family: 'Noto Sans TC' });
        console.log('✅ Canvas: Noto Sans TC font registered');
      }
    } catch (fontError) {
      console.log('⚠️ Canvas: Font registration failed, using system fonts');
    }
    
    const width = options.width || 400;
    const height = options.height || 200;
    const fontSize = options.fontSize || 24;
    
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // Set background
    ctx.fillStyle = options.backgroundColor || '#ffffff';
    ctx.fillRect(0, 0, width, height);
    
    // Set font with Chinese fallbacks
    const chineseFonts = [
      'Noto Sans TC',
      'SimSun', 
      'Microsoft YaHei',
      'Arial Unicode MS',
      'WenQuanYi Micro Hei',
      'Droid Sans Fallback',
      'DejaVu Sans',
      'Arial',
      'sans-serif'
    ];
    
    // Try each font
    let fontSet = false;
    for (const fontFamily of chineseFonts) {
      try {
        ctx.font = `${fontSize}px "${fontFamily}"`;
        // Test if the font can render Chinese characters
        const testMetrics = ctx.measureText('中');
        if (testMetrics.width > 0) {
          console.log(`✅ Canvas: Successfully set font: ${fontFamily}`);
          fontSet = true;
          break;
        }
      } catch (fontError) {
        continue;
      }
    }
    
    if (!fontSet) {
      ctx.font = `${fontSize}px sans-serif`;
      console.log('⚠️ Canvas: Using default font');
    }
    
    // Set text properties
    ctx.fillStyle = options.fontColor || '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Draw text
    ctx.fillText(text, width / 2, height / 2);
    
    // Convert to buffer
    return canvas.toBuffer('image/png');
    
  } catch (error) {
    console.error('Canvas generation failed:', error);
    throw new Error(`Canvas text-to-image failed: ${(error as any)?.message}`);
  }
}
