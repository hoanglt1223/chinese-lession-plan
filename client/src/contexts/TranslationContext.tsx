import React, { createContext, useContext, ReactNode } from 'react';
import { useTranslation } from '@/hooks/useTranslation';

interface TranslationContextType {
  translations: Record<string, string>;
  isTranslating: boolean;
  translateBatch: (words: string[], priority?: 'high' | 'medium' | 'low') => Promise<void>;
  getTranslation: (word: string) => string;
  clearCache: () => void;
  
  // Specific translation getters for backwards compatibility
  getVocabularyTranslation: (word: string) => string;
  getActivityTranslation: (activity: string) => string;
  getLevelTranslation: (level: string) => string;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

interface TranslationProviderProps {
  children: ReactNode;
}

export function TranslationProvider({ children }: TranslationProviderProps) {
  const { translations, isTranslating, translateBatch, getTranslation, clearCache } = useTranslation();

  // Backwards compatible getters
  const getVocabularyTranslation = (word: string): string => getTranslation(word);
  const getActivityTranslation = (activity: string): string => getTranslation(activity);
  const getLevelTranslation = (level: string): string => getTranslation(level);

  const value: TranslationContextType = {
    translations,
    isTranslating,
    translateBatch,
    getTranslation,
    clearCache,
    getVocabularyTranslation,
    getActivityTranslation,
    getLevelTranslation,
  };

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslationContext(): TranslationContextType {
  const context = useContext(TranslationContext);
  if (context === undefined) {
    throw new Error('useTranslationContext must be used within a TranslationProvider');
  }
  return context;
}
