import * as deepl from 'deepl-node';
import OpenAI from 'openai';

// Translation cache to avoid repeated API calls
const translationCache = new Map<string, string>();

/**
 * Unified DeepL Translation Service
 * Handles both Chinese→Vietnamese and Chinese→English translations
 */
export class DeepLTranslationService {
  private translator: deepl.Translator | null = null;
  private openai: OpenAI | null = null;
  private deepLApiKey: string | undefined;
  private openaiApiKey: string | undefined;

  constructor() {
    this.deepLApiKey = process.env.DEEPL_API_KEY;
    this.openaiApiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY;
    
    if (this.deepLApiKey) {
      this.translator = new deepl.Translator(this.deepLApiKey);
    }
    
    if (this.openaiApiKey && this.openaiApiKey !== "your-api-key-here") {
      this.openai = new OpenAI({
        apiKey: this.openaiApiKey,
      });
    }
  }

  /**
   * Translate Chinese to Vietnamese using DeepL (with OpenAI fallback)
   */
  async translateChineseToVietnamese(words: string[]): Promise<Record<string, string>> {
    const results: Record<string, string> = {};
    
    // Check cache first
    const { cached, missing } = this.checkCache(words);
    Object.assign(results, cached);
    
    if (missing.length === 0) {
      return results;
    }
    
    if (!this.deepLApiKey) {
      const openaiTranslations = await this.translateWithOpenAI(missing, 'vi');
      this.cacheResults(openaiTranslations);
      return { ...results, ...openaiTranslations };
    }

    try {
      // Translate missing words with DeepL
      const translationPromises = missing.map(async (word) => {
        try {
          const result = await this.translator!.translateText(word, 'zh', 'vi');
          return { [word]: result.text };
        } catch (error: any) {
          console.error(`❌ DeepL translation error for word "${word}":`, error.message);
          // Fall back to OpenAI for this specific word
          const fallbackTranslation = await this.translateWithOpenAI([word], 'vi');
          return fallbackTranslation;
        }
      });

      const translationResults = await Promise.all(translationPromises);
      const newTranslations: Record<string, string> = {};
      translationResults.forEach((result) => Object.assign(newTranslations, result));
      
      this.cacheResults(newTranslations);
      
      return { ...results, ...newTranslations };
    } catch (error: any) {
      console.error("💥 DeepL Vietnamese translation error:", error.message);
      const fallbackTranslations = await this.translateWithOpenAI(missing, 'vi');
      this.cacheResults(fallbackTranslations);
      return { ...results, ...fallbackTranslations };
    }
  }

  /**
   * Translate Chinese to English using DeepL (with OpenAI fallback)
   */
  async translateChineseToEnglish(text: string): Promise<string> {
    // Simple check if text is already in English
    if (/^[a-zA-Z\s\-.,!?]+$/.test(text)) {
      return text;
    }
    
    // Check cache first
    const cacheKey = `${text}_en`;
    if (translationCache.has(cacheKey)) {
      const cached = translationCache.get(cacheKey)!;
      return cached;
    }
    
    if (!this.deepLApiKey) {
      const openaiResult = await this.translateWithOpenAI([text], 'en');
      const translation = openaiResult[text] || text;
      translationCache.set(cacheKey, translation);
      return translation;
    }

    try {
      const result = await this.translator!.translateText(text, 'zh', 'en-US');
      const translation = result.text.trim();
      
      // Cache the result
      translationCache.set(cacheKey, translation);
      
      return translation;
    } catch (error: any) {
      console.error(`❌ DeepL English translation error for "${text}":`, error.message);
      
      const fallbackResult = await this.translateWithOpenAI([text], 'en');
      const translation = fallbackResult[text] || text;
      translationCache.set(cacheKey, translation);
      
      return translation;
    }
  }

  /**
   * Check cache for existing translations
   */
  private checkCache(words: string[]): { cached: Record<string, string>; missing: string[] } {
    const cached: Record<string, string> = {};
    const missing: string[] = [];
    
    words.forEach(word => {
      const cacheKey = `${word}_vi`;
      if (translationCache.has(cacheKey)) {
        cached[word] = translationCache.get(cacheKey)!;
      } else {
        missing.push(word);
      }
    });
    
    return { cached, missing };
  }

  /**
   * Cache translation results
   */
  private cacheResults(translations: Record<string, string>): void {
    Object.entries(translations).forEach(([word, translation]) => {
      const cacheKey = `${word}_vi`;
      translationCache.set(cacheKey, translation);
    });
  }

  /**
   * Fallback translation using OpenAI
   */
  private async translateWithOpenAI(words: string[], targetLanguage: 'vi' | 'en'): Promise<Record<string, string>> {
    const languageNames = { vi: 'Vietnamese', en: 'English' };
    const langName = languageNames[targetLanguage];
    
    if (!this.openai) {
      console.error('❌ OpenAI API key not configured properly');
      // Return basic fallback
      const fallback: Record<string, string> = {};
      words.forEach(word => {
        fallback[word] = targetLanguage === 'vi' ? `[Cần dịch: ${word}]` : word;
      });
      return fallback;
    }

    try {
      const examples = targetLanguage === 'vi' 
        ? '{"小鸟": "chim nhỏ", "朋友": "bạn bè", "飞": "bay", "点点头": "gật đầu"}'
        : '{"小鸟": "bird", "朋友": "friend", "飞": "fly", "学校": "school"}';
      
      const prompt = `Translate these Chinese words to ${langName}. Return only a JSON object with Chinese words as keys and ${langName} translations as values:
${words.join(', ')}

Format: {"word1": "translation1", "word2": "translation2"}

Examples: ${examples}`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-5-nano",
        messages: [
          {
            role: "system",
            content: `You are a professional Chinese-${langName} translator. Return only valid JSON with accurate ${langName} translations.${targetLanguage === 'en' ? ' Focus on simple, clear words suitable for image searches.' : ''}`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
      });

      const content = response.choices[0].message.content;
      
      if (!content) {
        throw new Error('Empty response from OpenAI');
      }

      const result = JSON.parse(content);
      return result;
    } catch (error: any) {
      console.error(`💥 OpenAI ${langName} translation fallback failed:`, error.message);
      
      // Final fallback
      const fallback: Record<string, string> = {};
      const basicTranslations: Record<string, string> = targetLanguage === 'vi' 
        ? {
            '小鸟': 'chim nhỏ',
            '朋友': 'bạn bè', 
            '飞': 'bay',
            '点点头': 'gật đầu',
            '学校': 'trường học',
            '老师': 'giáo viên',
            '学生': 'học sinh'
          }
        : {
            '小鸟': 'bird',
            '朋友': 'friend',
            '飞': 'fly',
            '点点头': 'nod',
            '学校': 'school',
            '老师': 'teacher',
            '学生': 'student'
          };
      
      words.forEach(word => {
        fallback[word] = basicTranslations[word] || (targetLanguage === 'vi' ? `[Cần dịch: ${word}]` : word);
      });
      
      return fallback;
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { totalEntries: number } {
    return {
      totalEntries: translationCache.size
    };
  }

  /**
   * Clear translation cache
   */
  clearCache(): void {
    translationCache.clear();
  }
}

// Export singleton instance
export const deeplService = new DeepLTranslationService();
