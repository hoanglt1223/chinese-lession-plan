
export function containsChinese(text: string): boolean {
  const chineseRegex = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/;
  return chineseRegex.test(text);
}

export function isPinyin(text: string): boolean {
  const pinyinRegex = /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/;
  const hasLatinChars = /[a-zA-Z]/.test(text);
  const hasToneMarks = pinyinRegex.test(text);
  return hasLatinChars && (hasToneMarks || /^[a-zA-Z\s]*$/.test(text));
}

export async function callChineseTextAPI(
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
          fontWeight,
          fontFamily
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    return result.data; // Assuming API returns { data: "base64..." } or similar
  } catch (error) {
    console.error("Error calling Chinese Text API:", error);
    throw error;
  }
}
