import { createContext, useContext, useState, ReactNode } from 'react';

interface AISettings {
  selectedModel: string;
  outputLanguage: string;
}

interface AIContextType {
  settings: AISettings;
  updateModel: (model: string) => void;
  updateLanguage: (language: string) => void;
}

const AIContext = createContext<AIContextType | undefined>(undefined);

export function AIProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AISettings>({
    selectedModel: 'gpt-5-nano',
    outputLanguage: 'auto'
  });

  const updateModel = (model: string) => {
    setSettings(prev => ({ ...prev, selectedModel: model }));
  };

  const updateLanguage = (language: string) => {
    setSettings(prev => ({ ...prev, outputLanguage: language }));
  };

  return (
    <AIContext.Provider value={{ settings, updateModel, updateLanguage }}>
      {children}
    </AIContext.Provider>
  );
}

export function useAI() {
  const context = useContext(AIContext);
  if (context === undefined) {
    throw new Error('useAI must be used within an AIProvider');
  }
  return context;
}