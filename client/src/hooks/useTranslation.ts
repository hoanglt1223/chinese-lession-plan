import { useState, useCallback, useRef } from 'react';

interface TranslationCache {
  [key: string]: string;
}

interface TranslationRequest {
  words: string[];
  priority: 'high' | 'medium' | 'low';
}

interface UseTranslationReturn {
  translations: TranslationCache;
  isTranslating: boolean;
  translateBatch: (words: string[], priority?: 'high' | 'medium' | 'low') => Promise<void>;
  getTranslation: (word: string) => string;
  clearCache: () => void;
}

export function useTranslation(): UseTranslationReturn {
  const [translations, setTranslations] = useState<TranslationCache>({});
  const [isTranslating, setIsTranslating] = useState(false);
  const pendingRequestsRef = useRef<Set<string>>(new Set());
  const requestQueueRef = useRef<TranslationRequest[]>([]);
  const processingRef = useRef(false);

  // Process queued translation requests in batches
  const processQueue = useCallback(async () => {
    if (processingRef.current || requestQueueRef.current.length === 0) {
      return;
    }

    processingRef.current = true;
    setIsTranslating(true);

    try {
      // Collect all unique words from queue
      const allWords = new Set<string>();
      requestQueueRef.current.forEach(req => {
        req.words.forEach(word => {
          if (!translations[word] && !pendingRequestsRef.current.has(word)) {
            allWords.add(word);
          }
        });
      });

      // Clear the queue
      requestQueueRef.current = [];

      if (allWords.size === 0) {
        return;
      }

      const wordsArray = Array.from(allWords);
      console.log('Batch translating:', wordsArray.length, 'words');

      // Mark words as pending to prevent duplicate requests
      wordsArray.forEach(word => pendingRequestsRef.current.add(word));

      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ words: wordsArray })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Update cache with new translations
        setTranslations(prev => ({
          ...prev,
          ...data.translations
        }));

        console.log('Received batch translations:', Object.keys(data.translations).length, 'words');
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Translation API error:', response.status, response.statusText, errorData);
      }

      // Clear pending requests
      wordsArray.forEach(word => pendingRequestsRef.current.delete(word));

    } catch (error) {
      console.error('Translation error:', error);
      // Clear all pending requests on error
      pendingRequestsRef.current.clear();
    } finally {
      setIsTranslating(false);
      processingRef.current = false;
    }
  }, [translations]);

  // Add words to translation queue and process
  const translateBatch = useCallback(async (words: string[], priority: 'high' | 'medium' | 'low' = 'medium') => {
    if (words.length === 0) return;

    // Filter out words that are already translated or pending
    const newWords = words.filter(word => 
      !translations[word] && !pendingRequestsRef.current.has(word)
    );

    if (newWords.length === 0) return;

    // Add to queue
    requestQueueRef.current.push({ words: newWords, priority });

    // Sort queue by priority (high -> medium -> low)
    requestQueueRef.current.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    // Debounce processing to batch requests
    setTimeout(() => {
      processQueue();
    }, 100);
  }, [translations, processQueue]);

  // Get translation from cache, return original word if not found
  const getTranslation = useCallback((word: string): string => {
    return translations[word] || word;
  }, [translations]);

  // Clear translation cache
  const clearCache = useCallback(() => {
    setTranslations({});
    pendingRequestsRef.current.clear();
    requestQueueRef.current = [];
  }, []);

  return {
    translations,
    isTranslating,
    translateBatch,
    getTranslation,
    clearCache
  };
}
