import type { VercelRequest, VercelResponse } from '@vercel/node';

// Function to detect if text contains Chinese characters
function containsChinese(text: string): boolean {
  const chineseRegex = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/;
  return chineseRegex.test(text);
}

// Function to detect if text is primarily pinyin
function isPinyin(text: string): boolean {
  // Check for pinyin tone marks and common pinyin patterns
  const pinyinRegex = /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/;
  const hasLatinChars = /[a-zA-Z]/.test(text);
  const hasToneMarks = pinyinRegex.test(text);
  
  return hasLatinChars && (hasToneMarks || /^[a-zA-Z\s]*$/.test(text));
}

// External Chinese API function (copied from serverless-pdf-service.ts)
async function callChineseTextAPI(
  text: string,
  method: "svg" | "text-to-image" | "png" = "png",
  fontSize: number = 48,
  fontWeight: "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900" | "normal" | "bold" = "700",
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
          height: 600,
          backgroundColor: "#ffffff",
          textColor: "#000000",
          padding: 20,
          lineHeight: 1.5,
          textAlign: "left",
          quality: 90,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    // Get the response as binary data since API returns image file
    const arrayBuffer = await response.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    // Get content type from response headers or default to PNG
    const contentType = response.headers.get("content-type") || "image/png";

    // Convert to data URI
    const base64 = imageBuffer.toString("base64");
    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    console.error("Chinese text API call failed:", error);
    throw error;
  }
}

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

    // Check if text contains Chinese characters and route accordingly
    if (containsChinese(text)) {
      console.log('🈳 Detected Chinese characters, using Chinese API');
      imageBuffer = await generateWithChineseAPI(text, style, options);
    } else if (isPinyin(text)) {
      console.log('🔤 Detected Pinyin, using Chinese API with Pinyin settings');
      imageBuffer = await generateWithChineseAPI(text, style, options, true);
    } else {
      // Use Chinese API for all text types with appropriate settings
      console.log('🔤 Using Chinese API for non-Chinese text with Montserrat font');
      imageBuffer = await generateWithChineseAPI(text, style, options, true); // Use pinyin settings (Montserrat font)
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

async function generateWithChineseAPI(text: string, style: string, options: any, isPinyinText: boolean = false): Promise<Buffer> {
  try {
    // Determine font and size based on text type
    const fontFamily = isPinyinText ? "Montserrat" : "AaBiMoHengZiZhenBaoKaiShu";
    const fontSize = isPinyinText ? 50 : 200;
    const fontWeight = isPinyinText ? "500" : "700";

    console.log(`🎨 Chinese API: ${isPinyinText ? 'Pinyin' : 'Chinese'} - Font: ${fontFamily}, Size: ${fontSize}`);

    // Call external Chinese API
    const dataUri = await callChineseTextAPI(
      text,
      "png", // Always use PNG for consistency
      fontSize,
      fontWeight as any,
      fontFamily
    );

    // Extract buffer from data URI
    const base64Data = dataUri.split(',')[1];
    if (!base64Data) {
      throw new Error('No base64 data found in API response');
    }

    return Buffer.from(base64Data, 'base64');

  } catch (error) {
    console.error('Chinese API generation failed:', error);
    // Return empty buffer as final fallback
    return Buffer.from('');
  }
}
