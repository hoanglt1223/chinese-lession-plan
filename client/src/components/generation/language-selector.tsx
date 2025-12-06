import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Globe,
  Languages,
  Settings,
  Check,
  X,
  AlertCircle,
  BookOpen,
  Users,
  Star,
  TrendingUp,
  Volume2,
  Type,
  Calendar,
  MapPin
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  direction: 'ltr' | 'rtl';
  isSource?: boolean;
  isTarget?: boolean;
  proficiency?: 'beginner' | 'intermediate' | 'advanced' | 'native';
  popularity: number;
  features: {
    hasAI: boolean;
    hasTranslation: boolean;
    hasTemplates: boolean;
    hasVoiceSupport: boolean;
  };
  culturalContext?: string;
  educationalSystem?: string;
  ageGroups: string[];
  dialects?: Array<{
    code: string;
    name: string;
    region: string;
  }>;
}

interface LanguageConfig {
  sourceLanguage: string;
  targetLanguages: string[];
  translationDirection: 'source-to-target' | 'target-to-source' | 'bidirectional';
  ageGroup: string;
  educationalLevel: string;
  dialect?: string;
  culturalAdaptation: boolean;
  voiceSupport: boolean;
  fontFamily?: string;
  fontSize?: 'small' | 'medium' | 'large';
  formatting: {
    dateFormat: string;
    numberFormat: string;
    currencyFormat: string;
  };
}

interface LanguageSelectorProps {
  onLanguageChange?: (config: LanguageConfig) => void;
  initialConfig?: Partial<LanguageConfig>;
  availableLanguages?: Language[];
  showAdvanced?: boolean;
  allowMultipleTargets?: boolean;
  className?: string;
}

const supportedLanguages: Language[] = [
  {
    code: 'zh',
    name: 'Chinese',
    nativeName: '中文',
    flag: '🇨🇳',
    direction: 'ltr',
    proficiency: 'native',
    popularity: 95,
    features: {
      hasAI: true,
      hasTranslation: true,
      hasTemplates: true,
      hasVoiceSupport: true
    },
    culturalContext: 'Traditional Chinese educational system with emphasis on character learning and stroke order',
    educationalSystem: 'Chinese K-12 curriculum standards',
    ageGroups: ['preschool', 'primary', 'lower-secondary', 'upper-secondary'],
    dialects: [
      { code: 'zh-CN', name: 'Simplified Chinese', region: 'Mainland China' },
      { code: 'zh-TW', name: 'Traditional Chinese', region: 'Taiwan' },
      { code: 'zh-HK', name: 'Hong Kong Chinese', region: 'Hong Kong' }
    ]
  },
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸',
    direction: 'ltr',
    proficiency: 'native',
    popularity: 100,
    features: {
      hasAI: true,
      hasTranslation: true,
      hasTemplates: true,
      hasVoiceSupport: true
    },
    culturalContext: 'Western educational approach with emphasis on communication and critical thinking',
    educationalSystem: 'Common Core / Cambridge standards',
    ageGroups: ['preschool', 'primary', 'lower-secondary', 'upper-secondary', 'adult'],
    dialects: [
      { code: 'en-US', name: 'American English', region: 'United States' },
      { code: 'en-GB', name: 'British English', region: 'United Kingdom' },
      { code: 'en-AU', name: 'Australian English', region: 'Australia' }
    ]
  },
  {
    code: 'vi',
    name: 'Vietnamese',
    nativeName: 'Tiếng Việt',
    flag: '🇻🇳',
    direction: 'ltr',
    proficiency: 'native',
    popularity: 80,
    features: {
      hasAI: true,
      hasTranslation: true,
      hasTemplates: true,
      hasVoiceSupport: false
    },
    culturalContext: 'Vietnamese educational system with tonal language emphasis and cultural traditions',
    educationalSystem: 'Vietnamese national curriculum',
    ageGroups: ['preschool', 'primary', 'lower-secondary', 'upper-secondary'],
    dialects: [
      { code: 'vi-VN', name: 'Northern Vietnamese', region: 'Hanoi' },
      { code: 'vi-SG', name: 'Southern Vietnamese', region: 'Ho Chi Minh City' }
    ]
  },
  {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    flag: '🇪🇸',
    direction: 'ltr',
    proficiency: 'advanced',
    popularity: 90,
    features: {
      hasAI: true,
      hasTranslation: true,
      hasTemplates: false,
      hasVoiceSupport: true
    },
    culturalContext: 'Spanish educational traditions with emphasis on grammar and literature',
    educationalSystem: 'Spanish national curriculum',
    ageGroups: ['primary', 'lower-secondary', 'upper-secondary', 'adult'],
    dialects: [
      { code: 'es-ES', name: 'Castilian Spanish', region: 'Spain' },
      { code: 'es-MX', name: 'Mexican Spanish', region: 'Mexico' },
      { code: 'es-AR', name: 'Argentinian Spanish', region: 'Argentina' }
    ]
  },
  {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    flag: '🇫🇷',
    direction: 'ltr',
    proficiency: 'intermediate',
    popularity: 85,
    features: {
      hasAI: true,
      hasTranslation: true,
      hasTemplates: false,
      hasVoiceSupport: true
    },
    culturalContext: 'French educational system with emphasis on academic excellence and cultural appreciation',
    educationalSystem: 'French national education system',
    ageGroups: ['primary', 'lower-secondary', 'upper-secondary', 'adult']
  },
  {
    code: 'ja',
    name: 'Japanese',
    nativeName: '日本語',
    flag: '🇯🇵',
    direction: 'ltr',
    proficiency: 'beginner',
    popularity: 75,
    features: {
      hasAI: false,
      hasTranslation: true,
      hasTemplates: true,
      hasVoiceSupport: true
    },
    culturalContext: 'Japanese educational approach with emphasis on discipline and respect',
    educationalSystem: 'Japanese MEXT curriculum',
    ageGroups: ['preschool', 'primary', 'lower-secondary', 'upper-secondary']
  }
];

const ageGroups = [
  { value: 'preschool', label: 'Preschool (3-5 years)', description: 'Early childhood education focus' },
  { value: 'primary', label: 'Primary (6-11 years)', description: 'Elementary school curriculum' },
  { value: 'lower-secondary', label: 'Lower Secondary (12-14 years)', description: 'Middle school content' },
  { value: 'upper-secondary', label: 'Upper Secondary (15-18 years)', description: 'High school level material' },
  { value: 'adult', label: 'Adult Education', description: 'Professional and continuing education' }
];

const educationalLevels = [
  { value: 'beginner', label: 'Beginner (A1-A2)', description: 'Basic vocabulary and simple sentences' },
  { value: 'intermediate', label: 'Intermediate (B1-B2)', description: 'Complex sentences and conversations' },
  { value: 'advanced', label: 'Advanced (C1-C2)', description: 'Fluent communication and academic language' },
  { value: 'native', label: 'Native Level', description: 'Native speaker proficiency' }
];

export function LanguageSelector({
  onLanguageChange,
  initialConfig,
  availableLanguages = supportedLanguages,
  showAdvanced = true,
  allowMultipleTargets = true,
  className
}: LanguageSelectorProps) {
  const [config, setConfig] = useState<LanguageConfig>({
    sourceLanguage: initialConfig?.sourceLanguage || 'zh',
    targetLanguages: initialConfig?.targetLanguages || ['en'],
    translationDirection: initialConfig?.translationDirection || 'source-to-target',
    ageGroup: initialConfig?.ageGroup || 'primary',
    educationalLevel: initialConfig?.educationalLevel || 'intermediate',
    culturalAdaptation: initialConfig?.culturalAdaptation ?? true,
    voiceSupport: initialConfig?.voiceSupport ?? false,
    formatting: {
      dateFormat: initialConfig?.formatting?.dateFormat || 'YYYY-MM-DD',
      numberFormat: initialConfig?.formatting?.numberFormat || '1,234.56',
      currencyFormat: initialConfig?.formatting?.currencyFormat || '$1,234.56'
    }
  });

  const [selectedLanguage, setSelectedLanguage] = useState<Language | null>(
    availableLanguages.find(lang => lang.code === config.sourceLanguage) || availableLanguages[0]
  );

  const handleLanguageChange = (updates: Partial<LanguageConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    onLanguageChange?.(newConfig);
  };

  const getLanguageByCode = (code: string) => {
    return availableLanguages.find(lang => lang.code === code);
  };

  const handleSourceLanguageChange = (languageCode: string) => {
    const language = getLanguageByCode(languageCode);
    setSelectedLanguage(language || null);
    handleLanguageChange({ sourceLanguage: languageCode });
  };

  const handleTargetLanguageToggle = (languageCode: string, checked: boolean) => {
    const newTargetLanguages = checked
      ? [...config.targetLanguages, languageCode]
      : config.targetLanguages.filter(code => code !== languageCode);

    handleLanguageChange({ targetLanguages: newTargetLanguages });
  };

  const selectedTargetLanguages = useMemo(() => {
    return config.targetLanguages.map(code => getLanguageByCode(code)).filter(Boolean) as Language[];
  }, [config.targetLanguages, availableLanguages]);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Language & Cultural Settings
          </CardTitle>
          <CardDescription>
            Configure source and target languages, cultural context, and educational parameters
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Language Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Language Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Source Language */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Source Language</Label>
            <Select value={config.sourceLanguage} onValueChange={handleSourceLanguageChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select source language">
                  {selectedLanguage && (
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{selectedLanguage.flag}</span>
                      <span>{selectedLanguage.name}</span>
                      <Badge variant="outline">{selectedLanguage.nativeName}</Badge>
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {availableLanguages.map((language) => (
                  <SelectItem key={language.code} value={language.code}>
                    <div className="flex items-center gap-2">
                      <span>{language.flag}</span>
                      <span>{language.name}</span>
                      <span className="text-sm text-muted-foreground">({language.nativeName})</span>
                      {language.features.hasAI && <Badge variant="secondary" className="ml-auto">AI</Badge>}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedLanguage && (
              <Alert>
                <BookOpen className="w-4 h-4" />
                <AlertDescription>
                  <strong>Context:</strong> {selectedLanguage.culturalContext}
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Target Languages */}
          <div className="space-y-3">
            <Label className="text-base font-medium">
              Target Languages {allowMultipleTargets && `(Select multiple)`}
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {availableLanguages
                .filter(lang => lang.code !== config.sourceLanguage)
                .map((language) => (
                  <div
                    key={language.code}
                    className={cn(
                      "flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-colors",
                      config.targetLanguages.includes(language.code)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                    onClick={() => handleTargetLanguageToggle(language.code, !config.targetLanguages.includes(language.code))}
                  >
                    <Checkbox
                      checked={config.targetLanguages.includes(language.code)}
                      onChange={() => {}} // Handled by div click
                    />
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-lg">{language.flag}</span>
                      <div className="flex-1">
                        <div className="font-medium">{language.name}</div>
                        <div className="text-sm text-muted-foreground">{language.nativeName}</div>
                      </div>
                      <div className="flex gap-1">
                        {language.features.hasTranslation && <Badge variant="outline" className="text-xs">Translation</Badge>}
                        {language.features.hasTemplates && <Badge variant="outline" className="text-xs">Templates</Badge>}
                        {language.features.hasVoiceSupport && <Badge variant="outline" className="text-xs">Voice</Badge>}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Translation Direction */}
          {config.targetLanguages.length > 0 && (
            <div className="space-y-3">
              <Label className="text-base font-medium">Translation Direction</Label>
              <Select
                value={config.translationDirection}
                onValueChange={(value: any) => handleLanguageChange({ translationDirection: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="source-to-target">
                    Source → Target ({getLanguageByCode(config.sourceLanguage)?.name} → {selectedTargetLanguages.map(l => l.name).join(', ')})
                  </SelectItem>
                  {allowMultipleTargets && (
                    <SelectItem value="bidirectional">
                      Bidirectional (Both directions)
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Educational Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Educational Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Age Group */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Target Age Group</Label>
            <Select
              value={config.ageGroup}
              onValueChange={(value: any) => handleLanguageChange({ ageGroup: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ageGroups.map((group) => (
                  <SelectItem key={group.value} value={group.value}>
                    <div>
                      <div className="font-medium">{group.label}</div>
                      <div className="text-sm text-muted-foreground">{group.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Educational Level */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Proficiency Level</Label>
            <Select
              value={config.educationalLevel}
              onValueChange={(value: any) => handleLanguageChange({ educationalLevel: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {educationalLevels.map((level) => (
                  <SelectItem key={level.value} value={level.value}>
                    <div>
                      <div className="font-medium">{level.label}</div>
                      <div className="text-sm text-muted-foreground">{level.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Dialect Selection */}
          {selectedLanguage?.dialects && selectedLanguage.dialects.length > 0 && showAdvanced && (
            <div className="space-y-3">
              <Label className="text-base font-medium">Dialect/Region</Label>
              <Select
                value={config.dialect || selectedLanguage.dialects[0].code}
                onValueChange={(value: any) => handleLanguageChange({ dialect: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {selectedLanguage.dialects.map((dialect) => (
                    <SelectItem key={dialect.code} value={dialect.code}>
                      <div>
                        <div className="font-medium">{dialect.name}</div>
                        <div className="text-sm text-muted-foreground">{dialect.region}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Advanced Settings */}
      {showAdvanced && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Advanced Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Tabs defaultValue="cultural" className="w-full">
              <TabsList>
                <TabsTrigger value="cultural">Cultural</TabsTrigger>
                <TabsTrigger value="formatting">Formatting</TabsTrigger>
                <TabsTrigger value="accessibility">Accessibility</TabsTrigger>
              </TabsList>

              <TabsContent value="cultural" className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="cultural-adaptation"
                    checked={config.culturalAdaptation}
                    onCheckedChange={(checked: any) =>
                      handleLanguageChange({ culturalAdaptation: checked })
                    }
                  />
                  <Label htmlFor="cultural-adaptation">
                    Enable cultural adaptation and localization
                  </Label>
                </div>

                {config.culturalAdaptation && selectedLanguage && (
                  <Alert>
                    <Users className="w-4 h-4" />
                    <AlertDescription>
                      Content will be adapted to {selectedLanguage.name} cultural context and educational standards.
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>

              <TabsContent value="formatting" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Date Format</Label>
                    <Select
                      value={config.formatting.dateFormat}
                      onValueChange={(value: any) =>
                        handleLanguageChange({
                          formatting: { ...config.formatting, dateFormat: value }
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="YYYY-MM-DD">2024-01-15</SelectItem>
                        <SelectItem value="DD/MM/YYYY">15/01/2024</SelectItem>
                        <SelectItem value="MM/DD/YYYY">01/15/2024</SelectItem>
                        <SelectItem value="DD.MM.YYYY">15.01.2024</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Number Format</Label>
                    <Select
                      value={config.formatting.numberFormat}
                      onValueChange={(value: any) =>
                        handleLanguageChange({
                          formatting: { ...config.formatting, numberFormat: value }
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1,234.56">1,234.56</SelectItem>
                        <SelectItem value="1.234,56">1.234,56</SelectItem>
                        <SelectItem value="1 234,56">1 234,56</SelectItem>
                        <SelectItem value="1234.56">1234.56</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Currency Format</Label>
                    <Select
                      value={config.formatting.currencyFormat}
                      onValueChange={(value: any) =>
                        handleLanguageChange({
                          formatting: { ...config.formatting, currencyFormat: value }
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="$1,234.56">$1,234.56</SelectItem>
                        <SelectItem value="€1.234,56">€1.234,56</SelectItem>
                        <SelectItem value="¥1,234">¥1,234</SelectItem>
                        <SelectItem value="£1,234.56">£1,234.56</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="accessibility" className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="voice-support"
                    checked={config.voiceSupport}
                    onCheckedChange={(checked: any) =>
                      handleLanguageChange({ voiceSupport: checked })
                    }
                    disabled={!selectedTargetLanguages.some(lang => lang.features.hasVoiceSupport)}
                  />
                  <Label htmlFor="voice-support">
                    Enable voice/audio support for pronunciation
                  </Label>
                </div>

                {config.voiceSupport && (
                  <Alert>
                    <Volume2 className="w-4 h-4" />
                    <AlertDescription>
                      Audio pronunciation guides will be included where available.
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Configuration Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Label className="font-medium">Source:</Label>
                <div className="flex items-center gap-2">
                  <span>{selectedLanguage?.flag}</span>
                  <span>{selectedLanguage?.name}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Label className="font-medium">Targets:</Label>
                <div className="flex flex-wrap gap-1">
                  {selectedTargetLanguages.map((lang) => (
                    <Badge key={lang.code} variant="outline">
                      {lang.flag} {lang.name}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Label className="font-medium">Age Group:</Label>
                <Badge variant="secondary">
                  {ageGroups.find(g => g.value === config.ageGroup)?.label}
                </Badge>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Label className="font-medium">Proficiency:</Label>
                <Badge variant="secondary">
                  {educationalLevels.find(l => l.value === config.educationalLevel)?.label}
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                <Label className="font-medium">Cultural Adaptation:</Label>
                <Badge variant={config.culturalAdaptation ? "default" : "outline"}>
                  {config.culturalAdaptation ? "Enabled" : "Disabled"}
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                <Label className="font-medium">Voice Support:</Label>
                <Badge variant={config.voiceSupport ? "default" : "outline"}>
                  {config.voiceSupport ? "Enabled" : "Disabled"}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}