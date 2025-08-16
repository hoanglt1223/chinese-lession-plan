import { writeFile, readFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { createHash } from 'crypto';

interface CacheEntry {
  word: string;
  translation: string;
  timestamp: number;
  source: 'deepl' | 'openai';
}

interface TranslationCache {
  [key: string]: CacheEntry;
}

export class TranslationCacheService {
  private cacheFile: string;
  private cacheDir: string;
  private cache: TranslationCache = {};
  private maxAge: number = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

  constructor() {
    this.cacheDir = join(process.cwd(), 'data');
    this.cacheFile = join(this.cacheDir, 'translation-cache.json');
    this.ensureCacheDir();
    this.loadCache();
  }

  private async ensureCacheDir() {
    try {
      if (!existsSync(this.cacheDir)) {
        await mkdir(this.cacheDir, { recursive: true });
      }
    } catch (error) {
      console.error('Failed to create cache directory:', error);
    }
  }

  private async loadCache() {
    try {
      if (existsSync(this.cacheFile)) {
        const data = await readFile(this.cacheFile, 'utf-8');
        this.cache = JSON.parse(data);
        console.log(`📚 Loaded translation cache with ${Object.keys(this.cache).length} entries`);
        
        // Clean expired entries
        this.cleanExpiredEntries();
      } else {
        console.log('📚 No existing translation cache found, starting fresh');
      }
    } catch (error) {
      console.error('Failed to load translation cache:', error);
      this.cache = {};
    }
  }

  private async saveCache() {
    try {
      await this.ensureCacheDir();
      await writeFile(this.cacheFile, JSON.stringify(this.cache, null, 2), 'utf-8');
      console.log(`💾 Saved translation cache with ${Object.keys(this.cache).length} entries`);
    } catch (error) {
      console.error('Failed to save translation cache:', error);
    }
  }

  private cleanExpiredEntries() {
    const now = Date.now();
    const initialCount = Object.keys(this.cache).length;
    
    for (const [key, entry] of Object.entries(this.cache)) {
      if (now - entry.timestamp > this.maxAge) {
        delete this.cache[key];
      }
    }
    
    const finalCount = Object.keys(this.cache).length;
    if (initialCount !== finalCount) {
      console.log(`🧹 Cleaned ${initialCount - finalCount} expired cache entries`);
      this.saveCache(); // Save after cleanup
    }
  }

  private generateCacheKey(word: string, sourceLang: string = 'zh', targetLang: string = 'vi'): string {
    const keyString = `${word.toLowerCase().trim()}_${sourceLang}_${targetLang}`;
    return createHash('md5').update(keyString).digest('hex');
  }

  async get(word: string, sourceLang: string = 'zh', targetLang: string = 'vi'): Promise<string | null> {
    const key = this.generateCacheKey(word, sourceLang, targetLang);
    const entry = this.cache[key];
    
    if (!entry) {
      return null;
    }
    
    // Check if entry is expired
    if (Date.now() - entry.timestamp > this.maxAge) {
      delete this.cache[key];
      return null;
    }
    
    console.log(`🎯 Cache hit for "${word}" → "${entry.translation}" (source: ${entry.source})`);
    return entry.translation;
  }

  async set(word: string, translation: string, source: 'deepl' | 'openai' = 'deepl', sourceLang: string = 'zh', targetLang: string = 'vi'): Promise<void> {
    const key = this.generateCacheKey(word, sourceLang, targetLang);
    
    this.cache[key] = {
      word: word.trim(),
      translation: translation.trim(),
      timestamp: Date.now(),
      source
    };
    
    console.log(`💾 Cached translation: "${word}" → "${translation}" (source: ${source})`);
    
    // Save cache periodically (every 10 new entries or immediately)
    const cacheSize = Object.keys(this.cache).length;
    if (cacheSize % 10 === 0) {
      await this.saveCache();
    }
  }

  async getMultiple(words: string[], sourceLang: string = 'zh', targetLang: string = 'vi'): Promise<{ cached: Record<string, string>, missing: string[] }> {
    const cached: Record<string, string> = {};
    const missing: string[] = [];
    
    for (const word of words) {
      const translation = await this.get(word, sourceLang, targetLang);
      if (translation) {
        cached[word] = translation;
      } else {
        missing.push(word);
      }
    }
    
    console.log(`📊 Cache stats - Found: ${Object.keys(cached).length}, Missing: ${missing.length}`);
    return { cached, missing };
  }

  async setMultiple(translations: Record<string, string>, source: 'deepl' | 'openai' = 'deepl', sourceLang: string = 'zh', targetLang: string = 'vi'): Promise<void> {
    const promises = Object.entries(translations).map(([word, translation]) =>
      this.set(word, translation, source, sourceLang, targetLang)
    );
    
    await Promise.all(promises);
    await this.saveCache(); // Save after bulk operations
  }

  async getCacheStats(): Promise<{
    totalEntries: number;
    deeplEntries: number;
    openaiEntries: number;
    oldestEntry: Date | null;
    newestEntry: Date | null;
  }> {
    const entries = Object.values(this.cache);
    const deeplCount = entries.filter(e => e.source === 'deepl').length;
    const openaiCount = entries.filter(e => e.source === 'openai').length;
    
    const timestamps = entries.map(e => e.timestamp);
    const oldestTimestamp = timestamps.length > 0 ? Math.min(...timestamps) : null;
    const newestTimestamp = timestamps.length > 0 ? Math.max(...timestamps) : null;
    
    return {
      totalEntries: entries.length,
      deeplEntries: deeplCount,
      openaiEntries: openaiCount,
      oldestEntry: oldestTimestamp ? new Date(oldestTimestamp) : null,
      newestEntry: newestTimestamp ? new Date(newestTimestamp) : null
    };
  }

  // Manual cache cleanup method
  async clearExpired(): Promise<number> {
    const initialCount = Object.keys(this.cache).length;
    this.cleanExpiredEntries();
    const removedCount = initialCount - Object.keys(this.cache).length;
    
    if (removedCount > 0) {
      await this.saveCache();
    }
    
    return removedCount;
  }

  // Clear all cache
  async clearAll(): Promise<void> {
    this.cache = {};
    await this.saveCache();
    console.log('🗑️ Cleared all translation cache');
  }
}

// Export singleton instance
export const translationCache = new TranslationCacheService();
